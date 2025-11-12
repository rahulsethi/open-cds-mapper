import io
import json
from typing import List, Dict, Any, Tuple

import pandas as pd
from rapidfuzz import fuzz

# --- Minimal synonym pack for field-name overlap (ECC -> S/4) ---
# We map ECC/BW technicals (left) to one-or-more S/4 CDS field names (right).
ECC_TO_S4_FIELD_SYNONYMS: Dict[str, List[str]] = {
    "VBELN": ["SALESDOCUMENT", "BILLINGDOCUMENT"],
    "POSNR": ["SALESDOCUMENTITEM", "BILLINGDOCUMENTITEM"],
    "MATNR": ["MATERIAL"],
    "KWMENG": ["ORDERQUANTITY"],
    "FKIMG": ["BILLEDQUANTITY"],
    "RBUKRS": ["COMPANYCODE"],
    "GJAHR": ["FISCALYEAR"],
    "BELNR": ["JOURNALENTRY"],  # simplification for demo
    "BUZEI": ["JOURNALENTRYITEM"],
    "DMBTR": ["AMOUNTINCOMPANYCODECURRENCY"],
}

def _safe_json_loads(v: Any) -> Any:
    """
    Parse JSON from CSV cell.
    If empty/NaN -> [], {} depending on first char heuristic.
    """
    if v is None:
        return []
    if isinstance(v, (list, dict)):
        return v
    s = str(v).strip()
    if not s:
        return []
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        # Last-resort fix: some editors double-escape quotes oddly.
        # Replace “” patterns conservatively and try again.
        s2 = s.replace("“", '"').replace("”", '"').replace("''", '"').replace('""', '"')
        try:
            return json.loads(s2)
        except Exception:
            # Give up: return empty to avoid crashing demo.
            return []

def _norm(s: str) -> str:
    return (s or "").strip().upper()

def _fields_set_from_ecc(fields_json: List[Dict[str, Any]]) -> Tuple[set, set]:
    """
    Returns (all_fields_set, key_fields_set) normalized for ECC using synonyms.
    """
    all_set = set()
    key_set = set()
    for f in fields_json or []:
        name = _norm(f.get("field_name", ""))
        if not name:
            continue
        mapped = ECC_TO_S4_FIELD_SYNONYMS.get(name, [name])
        for m in mapped:
            all_set.add(_norm(m))
        if f.get("is_key") is True:
            for m in mapped:
                key_set.add(_norm(m))
    return all_set, key_set

def _fields_set_from_cds(fields_json: List[Dict[str, Any]]) -> Tuple[set, set]:
    """
    Returns (all_fields_set, key_fields_set) normalized for CDS (just uppercase names).
    """
    all_set = set()
    key_set = set()
    for f in fields_json or []:
        nm = _norm(f.get("field_name", ""))
        if nm:
            all_set.add(nm)
        if f.get("is_key") is True:
            key_set.add(nm)
    return all_set, key_set

def _jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0

def _name_similarity(extr_name: str, extr_text: str, cds_name: str, cds_text: str) -> float:
    """
    Use token-set ratio on names and texts; take best.
    Normalized to 0..1
    """
    scores = [
        fuzz.token_set_ratio(extr_name or "", cds_name or ""),
        fuzz.token_set_ratio(extr_text or "", cds_text or ""),
    ]
    return max(scores) / 100.0

def load_ecc_df(file_like: io.BytesIO) -> pd.DataFrame:
    df = pd.read_csv(file_like, dtype=str, keep_default_na=False)
    # Parse JSON columns to Python lists
    df["fields_json"] = df["fields_json"].apply(_safe_json_loads)
    # Keys may be strings like ["VBELN","POSNR"]; keep as list[str]
    df["primary_keys_json"] = df["primary_keys_json"].apply(_safe_json_loads)
    return df

def load_cds_df(file_like: io.BytesIO) -> pd.DataFrame:
    df = pd.read_csv(file_like, dtype=str, keep_default_na=False)
    df["fields_json"] = df["fields_json"].apply(_safe_json_loads)
    df["annotations_json"] = df.get("annotations_json", "").apply(_safe_json_loads)
    df["primary_keys_json"] = df["primary_keys_json"].apply(_safe_json_loads)
    return df

def score_candidates(
    ecc_df: pd.DataFrame,
    cds_df: pd.DataFrame,
    top_k: int = 3,
    weights: Dict[str, float] = None,
) -> Dict[str, Any]:
    """
    For each ECC extractor, score all CDS views and return top_k.
    Score = 0.6 * name + 0.3 * field_overlap + 0.1 * key_overlap
    """
    if weights is None:
        weights = {"name": 0.6, "fields": 0.3, "keys": 0.1}

    results = []
    for _, erow in ecc_df.iterrows():
        e_name = erow.get("extractor_name", "")
        e_text = erow.get("extractor_text", "")
        e_fields_all, e_keys = _fields_set_from_ecc(erow.get("fields_json", []))

        candidates = []
        for _, crow in cds_df.iterrows():
            c_name = crow.get("cds_view_name", "")
            c_text = crow.get("cds_view_text", "")
            c_fields_all, c_keys = _fields_set_from_cds(crow.get("fields_json", []))

            name_s = _name_similarity(e_name, e_text, c_name, c_text)
            fields_s = _jaccard(e_fields_all, c_fields_all)
            keys_s = _jaccard(e_keys, c_keys)
            total = (
                weights["name"] * name_s
                + weights["fields"] * fields_s
                + weights["keys"] * keys_s
            )

            candidates.append({
                "cds_view_name": c_name,
                "cds_view_text": c_text,
                "score": round(float(total), 4),
                "name_score": round(float(name_s), 4),
                "field_overlap": round(float(fields_s), 4),
                "key_overlap": round(float(keys_s), 4),
                "shared_fields": sorted(list(e_fields_all & c_fields_all)),
                "shared_keys": sorted(list(e_keys & c_keys)),
            })

        # sort & take top_k
        candidates.sort(key=lambda x: x["score"], reverse=True)
        results.append({
            "extractor_name": e_name,
            "extractor_text": e_text,
            "candidates": candidates[: top_k],
        })

    return {
        "run_info": {
            "top_k": top_k,
            "weights": weights,
            "method": "heuristics-only (rapidfuzz + jaccard); no LLM",
        },
        "counts": {
            "extractors": int(len(ecc_df)),
            "cds_views": int(len(cds_df)),
        },
        "matches": results,
    }
