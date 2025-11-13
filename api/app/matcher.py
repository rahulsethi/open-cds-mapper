# api/app/matcher.py
from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from typing import Iterable, List, Set, Tuple, Dict, Any, Optional

import pandas as pd
from rapidfuzz import fuzz


# ---------- Data shapes ----------

@dataclass
class Record:
    """Normalized record used by the matcher."""
    name: str
    text: str
    fields: Set[str]       # canonical field names, upper-cased
    keys: Set[str]         # canonical primary key names, upper-cased


# ---------- Utilities ----------

_token_re = re.compile(r"[A-Za-z0-9]+")


def _tokenize(s: str) -> List[str]:
    return [t.upper() for t in _token_re.findall(s or "")]


def _name_similarity(a: str, b: str) -> float:
    """0..1 using rapidfuzz token_set_ratio."""
    if not a or not b:
        return 0.0
    return fuzz.token_set_ratio(a, b) / 100.0


def _jaccard(a: Set[str], b: Set[str]) -> float:
    if not a and not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def _shared_sorted(a: Set[str], b: Set[str]) -> List[str]:
    return sorted(a & b)


def _parse_json_list(cell: Any) -> List[Any]:
    """
    Be forgiving: handle empty/NaN, JSON strings, or Python-ish list strings.
    Returns [] if we can’t parse.
    """
    if cell is None:
        return []
    if isinstance(cell, float) and math.isnan(cell):
        return []
    if isinstance(cell, (list, tuple)):
        return list(cell)
    if not isinstance(cell, str):
        return []

    s = cell.strip()
    if not s:
        return []

    # Try JSON first
    try:
        return json.loads(s)
    except Exception:
        pass

    # Try Python literal (e.g., from CSV with single quotes)
    try:
        import ast
        return ast.literal_eval(s)
    except Exception:
        return []


def _extract_field_names(items: List[Any]) -> Set[str]:
    """
    Items may be list[str] or list[dict] with 'field_name' (or 'name').
    Return uppercase canonical names.
    """
    out: Set[str] = set()
    for it in items:
        if isinstance(it, str):
            out.add(it.upper())
        elif isinstance(it, dict):
            if "field_name" in it and isinstance(it["field_name"], str):
                out.add(it["field_name"].upper())
            elif "name" in it and isinstance(it["name"], str):
                out.add(it["name"].upper())
    return out


def _extract_key_names(items: List[Any]) -> Set[str]:
    """
    Keys are list[str] or list[dict] with 'field_name'/'name'.
    """
    return _extract_field_names(items)


# ---------- Loaders from DataFrames ----------

def df_to_records(
    df: pd.DataFrame,
    name_col: str,
    text_col: str,
    fields_col: str = "fields_json",
    keys_col: str = "primary_keys_json",
) -> List[Record]:
    """
    Convert a DataFrame with (name, text, fields_json, primary_keys_json) → List[Record].
    - robust to NaN/empty cells
    - tolerant of JSON or Python-literal style lists
    """
    # make sure missing columns don’t explode; use blanks
    for col in (name_col, text_col, fields_col, keys_col):
        if col not in df.columns:
            df[col] = ""

    records: List[Record] = []
    for _, row in df.iterrows():
        name = str(row[name_col] or "").strip()
        text = str(row[text_col] or "").strip()

        fields_raw = _parse_json_list(row[fields_col])
        keys_raw = _parse_json_list(row[keys_col])

        fields = _extract_field_names(fields_raw)
        keys = _extract_key_names(keys_raw)

        records.append(Record(name=name, text=text, fields=fields, keys=keys))
    return records


# ---------- Core matcher ----------

def _score_pair(
    a: Record,
    b: Record,
    w_name: float,
    w_fields: float,
    w_keys: float,
) -> Tuple[float, Dict[str, Any]]:
    name_sim = _name_similarity(a.name + " " + a.text, b.name + " " + b.text)
    f_overlap = _jaccard(a.fields, b.fields)
    k_overlap = _jaccard(a.keys, b.keys)

    score = (w_name * name_sim) + (w_fields * f_overlap) + (w_keys * k_overlap)

    explain = {
        "name_score": round(name_sim, 4),
        "field_overlap": round(f_overlap, 4),
        "key_overlap": round(k_overlap, 4),
        "matched_name_terms": sorted(set(_tokenize(a.name) + _tokenize(a.text))
                                     & set(_tokenize(b.name) + _tokenize(b.text))),
        "shared_fields": _shared_sorted(a.fields, b.fields),
        "shared_keys": _shared_sorted(a.keys, b.keys),
    }
    return score, explain


def run_match(
    extractors_df: pd.DataFrame,
    cds_df: pd.DataFrame,
    *,
    top_k: int = 3,
    weights: Dict[str, float] | None = None,
) -> Dict[str, Any]:
    """
    Main entrypoint used by FastAPI.
    - extractors_df: DataFrame with columns:
        extractor_name, extractor_text, fields_json, primary_keys_json
    - cds_df: DataFrame with columns:
        cds_view_name, cds_view_text, fields_json, primary_keys_json
    """
    if weights is None:
        weights = {"name": 0.6, "fields": 0.3, "keys": 0.1}

    # normalize weights defensively to sum 1.0
    w_name = float(weights.get("name", 0.6))
    w_fields = float(weights.get("fields", 0.3))
    w_keys = float(weights.get("keys", 0.1))
    total = w_name + w_fields + w_keys
    if total <= 0:
        w_name, w_fields, w_keys = 0.6, 0.3, 0.1
        total = 1.0
    w_name, w_fields, w_keys = (w_name / total, w_fields / total, w_keys / total)

    # convert to normalized records
    ext_list = df_to_records(
        extractors_df,
        name_col="extractor_name",
        text_col="extractor_text",
        fields_col="fields_json",
        keys_col="primary_keys_json",
    )
    cds_list = df_to_records(
        cds_df,
        name_col="cds_view_name",
        text_col="cds_view_text",
        fields_col="fields_json",
        keys_col="primary_keys_json",
    )

    # compute matches
    matches: List[Dict[str, Any]] = []
    for a in ext_list:
        scored: List[Tuple[float, Dict[str, Any], Record]] = []
        for b in cds_list:
            s, expl = _score_pair(a, b, w_name, w_fields, w_keys)
            scored.append((s, expl, b))
        scored.sort(key=lambda x: x[0], reverse=True)

        top = []
        for s, expl, b in scored[: max(top_k, 1)]:
            top.append(
                {
                    "cds_view_name": b.name,
                    "cds_view_text": b.text,
                    "score": round(s, 4),
                    **expl,
                }
            )

        matches.append(
            {
                "extractor_name": a.name,
                "extractor_text": a.text,
                "candidates": top,
            }
        )

    return {
        "run_info": {
            "top_k": max(top_k, 1),
            "weights": {"name": round(w_name, 4), "fields": round(w_fields, 4), "keys": round(w_keys, 4)},
            "method": "heuristics-only (rapidfuzz + jaccard); no LLM",
        },
        "counts": {"extractors": len(ext_list), "cds_views": len(cds_list)},
        "matches": matches,
    }
