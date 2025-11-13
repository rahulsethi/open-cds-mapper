from __future__ import annotations

import json
import math
import re
from typing import Any, Dict, List, Set, Tuple

import pandas as pd
from rapidfuzz import fuzz


STOPWORDS = {
    "the",
    "a",
    "an",
    "of",
    "for",
    "and",
    "to",
    "by",
    "on",
    "in",
    "data",
    "table",
    "item",
    "document",
    "doc",
    "gl",
    "fi",
    "sd",
    "bf",
    "bil",
    "bf",
    "is",
    "bf",
}


def _norm_token(t: str) -> str:
    t = re.sub(r"[^A-Za-z0-9]+", " ", t or "").strip().upper()
    return t


def _tokenize(text: str) -> Set[str]:
    base = _norm_token(text)
    tokens = {tok for tok in base.split() if len(tok) >= 3 and tok.lower() not in STOPWORDS}
    return tokens


def _parse_json_array(cell: Any) -> List[dict]:
    """
    Safely parse a cell that should contain JSON array text.
    Returns [] on failure.
    """
    if cell is None or (isinstance(cell, float) and math.isnan(cell)):
        return []
    if isinstance(cell, list):
        return cell
    try:
        return json.loads(str(cell))
    except Exception:
        return []


def _field_names_from_fields_json(cell: Any) -> Set[str]:
    arr = _parse_json_array(cell)
    names: Set[str] = set()
    for obj in arr:
        # Try common shapes
        if isinstance(obj, dict):
            name = obj.get("field_name") or obj.get("name") or obj.get("FIELD_NAME")
            if name:
                names.add(_norm_token(str(name)))
    return names


def _keys_from_primary_keys_json(cell: Any) -> Set[str]:
    arr = _parse_json_array(cell)
    keys: Set[str] = set()
    for obj in arr:
        if isinstance(obj, dict):
            # sometimes stored as {"field_name": "...", ...}
            name = obj.get("field_name") or obj.get("name")
            if name:
                keys.add(_norm_token(str(name)))
        else:
            # sometimes stored as simple strings
            keys.add(_norm_token(str(obj)))
    return keys


def _jaccard(a: Set[str], b: Set[str]) -> float:
    if not a and not b:
        return 0.0
    u = a | b
    if not u:
        return 0.0
    i = a & b
    return round(len(i) / len(u), 4)


def _name_similarity(ex_text: str, cds_text: str) -> Tuple[float, List[str]]:
    """
    Token-set similarity for names/texts (0..1), plus the matched tokens.
    """
    tokens_a = _tokenize(ex_text)
    tokens_b = _tokenize(cds_text)
    # use RapidFuzz for fuzzy token-set ratio (0..100)
    score = fuzz.token_set_ratio(" ".join(tokens_a), " ".join(tokens_b)) / 100.0
    shared = sorted(list(tokens_a & tokens_b))
    return round(score, 4), shared


def compute_matches(
    ecc_df: pd.DataFrame,
    s4_df: pd.DataFrame,
    top_k: int,
    weights: Dict[str, float],
) -> Dict[str, Any]:
    """
    Produce the match payload for the UI.
    Expects required columns to be present/validated by caller:
      ECC: extractor_name, extractor_text, fields_json, primary_keys_json
      S4:  cds_view_name, cds_view_text, fields_json, primary_keys_json
    """
    # Pre-extract CDS sets for speed
    cds_rows: List[Dict[str, Any]] = []
    for _, r in s4_df.iterrows():
        cds_fields = _field_names_from_fields_json(r.get("fields_json"))
        cds_keys = _keys_from_primary_keys_json(r.get("primary_keys_json"))
        cds_rows.append(
            {
                "cds_view_name": str(r.get("cds_view_name") or ""),
                "cds_view_text": str(r.get("cds_view_text") or ""),
                "fields": cds_fields,
                "keys": cds_keys,
            }
        )

    results: List[Dict[str, Any]] = []

    for _, ex in ecc_df.iterrows():
        ex_fields = _field_names_from_fields_json(ex.get("fields_json"))
        ex_keys = _keys_from_primary_keys_json(ex.get("primary_keys_json"))

        ex_name = str(ex.get("extractor_name") or "")
        ex_text = str(ex.get("extractor_text") or "")
        ex_label = ex_text or ex_name

        candidates: List[Dict[str, Any]] = []
        for cds in cds_rows:
            name_score, name_terms = _name_similarity(ex_label, cds["cds_view_text"] or cds["cds_view_name"])
            field_overlap = _jaccard(ex_fields, cds["fields"])
            key_overlap = _jaccard(ex_keys, cds["keys"])

            score = (
                weights["name"] * name_score
                + weights["fields"] * field_overlap
                + weights["keys"] * key_overlap
            )

            candidates.append(
                {
                    "cds_view_name": cds["cds_view_name"],
                    "cds_view_text": cds["cds_view_text"],
                    "score": round(score, 4),
                    "name_score": name_score,
                    "field_overlap": field_overlap,
                    "key_overlap": key_overlap,
                    "matched_name_terms": name_terms,
                    "shared_fields": sorted(list(ex_fields & cds["fields"])),
                    "shared_keys": sorted(list(ex_keys & cds["keys"])),
                }
            )

        # sort & keep top_k
        candidates.sort(key=lambda c: c["score"], reverse=True)
        results.append(
            {
                "extractor_name": ex_name,
                "extractor_text": ex_text,
                "candidates": candidates[: max(1, top_k)],
            }
        )

    payload = {
        "matches": results,
    }
    return payload


def run_match(
    ecc_df: pd.DataFrame,
    s4_df: pd.DataFrame,
    *,
    top_k: int = 3,
    weights: Dict[str, float] | None = None,
) -> Dict[str, Any]:
    weights = weights or {"name": 0.6, "fields": 0.3, "keys": 0.1}
    # normalize
    s = sum(weights.values()) or 1.0
    weights = {k: float(v) / s for k, v in weights.items()}

    payload = compute_matches(ecc_df, s4_df, top_k, weights)
    payload["run_info"] = {
        "top_k": top_k,
        "weights": weights,
        "method": "heuristics-only (rapidfuzz + jaccard); no LLM",
    }
    payload["counts"] = {"extractors": int(len(ecc_df)), "cds_views": int(len(s4_df))}
    return payload
