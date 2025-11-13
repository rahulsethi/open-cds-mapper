import io
import json
import re
from typing import Dict, List, Tuple, Any

import pandas as pd
from rapidfuzz import fuzz


TOKEN_RE = re.compile(r"[A-Za-z0-9_]+")


def _safe_json_loads(x: str, fallback):
    if pd.isna(x) or x is None or str(x).strip() == "":
        return fallback
    try:
        return json.loads(x)
    except Exception:
        return fallback


def _upperize(items) -> List[str]:
    return [str(i).strip().upper() for i in items if str(i).strip()]


def _tokenize(text: str) -> List[str]:
    if not isinstance(text, str):
        return []
    return [t.upper() for t in TOKEN_RE.findall(text)]


def load_ecc_df(buf: io.BytesIO) -> pd.DataFrame:
    """Load ECC/BW extractor CSV."""
    df = pd.read_csv(buf, dtype=str)
    # Required columns (see SCHEMAS.md)
    req = ["extractor_name", "extractor_text", "fields_json", "primary_keys_json"]
    for c in req:
        if c not in df.columns:
            raise ValueError(f"Missing required column in ECC CSV: {c}")

    df["fields"] = df["fields_json"].apply(lambda s: _upperize([f.get("field_name") for f in _safe_json_loads(s, [])]))
    df["keys"] = df["primary_keys_json"].apply(lambda s: _upperize(_safe_json_loads(s, [])))
    df["name_tokens"] = df["extractor_text"].apply(_tokenize)
    return df[["extractor_name", "extractor_text", "fields", "keys", "name_tokens"]]


def load_cds_df(buf: io.BytesIO) -> pd.DataFrame:
    """Load S/4 CDS CSV."""
    df = pd.read_csv(buf, dtype=str)
    req = ["cds_view_name", "cds_view_text", "fields_json", "primary_keys_json"]
    for c in req:
        if c not in df.columns:
            raise ValueError(f"Missing required column in S4 CSV: {c}")

    df["fields"] = df["fields_json"].apply(lambda s: _upperize([f.get("field_name") for f in _safe_json_loads(s, [])]))
    df["keys"] = df["primary_keys_json"].apply(lambda s: _upperize(_safe_json_loads(s, [])))
    df["name_tokens"] = df["cds_view_text"].apply(_tokenize)
    return df[["cds_view_name", "cds_view_text", "fields", "keys", "name_tokens"]]


def _jaccard(a: List[str], b: List[str]) -> Tuple[float, List[str], int, int]:
    sa, sb = set(a), set(b)
    if not sa and not sb:
        return 0.0, [], 0, 0
    inter = sa & sb
    union = sa | sb
    return (len(inter) / len(union)), sorted(inter), len(sa), len(sb)


def _name_similarity(a: str, b: str) -> float:
    """RapidFuzz score in [0,1]."""
    return fuzz.token_set_ratio(a or "", b or "") / 100.0


def _score_one(
    ext_row: pd.Series, cds_row: pd.Series, weights: Dict[str, float]
) -> Tuple[float, Dict[str, Any]]:
    name_score = _name_similarity(ext_row["extractor_text"], cds_row["cds_view_text"])
    field_j, shared_fields, cnt_e_fields, cnt_c_fields = _jaccard(ext_row["fields"], cds_row["fields"])
    key_j, shared_keys, cnt_e_keys, cnt_c_keys = _jaccard(ext_row["keys"], cds_row["keys"])

    parts = {
        "name": name_score * weights["name"],
        "fields": field_j * weights["fields"],
        "keys": key_j * weights["keys"],
    }
    total = parts["name"] + parts["fields"] + parts["keys"]

    # Name token overlap (just for a friendly reason string)
    tokens_inter = sorted(set(ext_row["name_tokens"]) & set(cds_row["name_tokens"]))

    explain = {
        "weights": weights,
        "score_parts": parts,
        "name_terms": tokens_inter,
        "field_overlap": {
            "shared": shared_fields,
            "extractor_total": cnt_e_fields,
            "cds_total": cnt_c_fields,
        },
        "key_overlap": {
            "shared": shared_keys,
            "extractor_total": cnt_e_keys,
            "cds_total": cnt_c_keys,
        },
    }

    return total, {
        "cds_view_name": cds_row["cds_view_name"],
        "cds_view_text": cds_row["cds_view_text"],
        "score": round(total, 4),
        "name_score": round(name_score, 4),
        "field_overlap": round(field_j, 4),
        "key_overlap": round(key_j, 4),
        "shared_fields": shared_fields,
        "shared_keys": shared_keys,
        "explain": explain,
    }


def score_candidates(
    ecc_df: pd.DataFrame, cds_df: pd.DataFrame, top_k: int, weights: Dict[str, float]
) -> Dict[str, Any]:
    """Return matches with explanations."""
    matches = []

    for _, e in ecc_df.iterrows():
        scored = []
        for _, c in cds_df.iterrows():
            s, cand = _score_one(e, c, weights)
            scored.append((s, cand))

        scored.sort(key=lambda t: t[0], reverse=True)
        top = [cand for _, cand in scored[: top_k]]

        matches.append(
            {
                "extractor_name": e["extractor_name"],
                "extractor_text": e["extractor_text"],
                "candidates": top,
            }
        )

    return {
        "run_info": {
            "top_k": top_k,
            "weights": weights,
            "method": "heuristics-only (rapidfuzz + jaccard); no LLM",
        },
        "counts": {"extractors": len(ecc_df), "cds_views": len(cds_df)},
        "matches": matches,
    }
