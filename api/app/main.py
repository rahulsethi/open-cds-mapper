# api/app/main.py
from __future__ import annotations

import io
from pathlib import Path
from typing import Optional, Dict, Any

import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .matcher import run_match  # existing matcher from A6/A10


# ---------- helpers ----------

def _repo_root() -> Path:
    # .../repo/api/app/main.py -> parents[2] = repo root
    return Path(__file__).resolve().parents[2]

def _api_dir() -> Path:
    # .../repo/api
    return Path(__file__).resolve().parents[1]

def _find_sample(name: str) -> Path:
    """
    Look for sample CSVs in common places:
      - <repo>/data/<name>
      - <repo>/api/data/<name>
      - CWD/data/<name>  (fallback for odd run contexts)
    """
    candidates = [
        _repo_root() / "data" / name,
        _api_dir() / "data" / name,
        Path.cwd() / "data" / name,
    ]
    for p in candidates:
        if p.exists():
            return p
    tried = " | ".join(str(p) for p in candidates)
    raise FileNotFoundError(f"Could not locate sample file '{name}'. Tried: {tried}")

def _read_upload_csv(file: UploadFile) -> pd.DataFrame:
    """
    Read an uploaded CSV (multipart/form-data) into a pandas DataFrame.
    Uses bytes buffer; avoids temp files and platform quirks.
    """
    if file is None:
        raise HTTPException(status_code=400, detail="Missing file upload.")
    # UploadFile.read() is async; but FastAPI calls this endpoint in a threadpool
    # so it's fine to use file.file.read() here to avoid 'await' in a sync def.
    raw: bytes = file.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail=f"Empty upload for '{file.filename}'.")
    try:
        return pd.read_csv(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse '{file.filename}': {e}")

def _read_sample_csv(name: str) -> pd.DataFrame:
    path = _find_sample(name)
    try:
        return pd.read_csv(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read sample '{path}': {e}")

def _normalize_weights(w: Dict[str, float]) -> Dict[str, float]:
    # Defensive normalization (server-side truth)
    name = float(w.get("name", 0.6))
    fields = float(w.get("fields", 0.3))
    keys = float(w.get("keys", 0.1))
    s = name + fields + keys
    if s <= 0:
        return {"name": 0.6, "fields": 0.3, "keys": 0.1}
    return {"name": name / s, "fields": fields / s, "keys": keys / s}


# ---------- app ----------

app = FastAPI(title="OCMT API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev-friendly; lock down for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/match/")
def match(
    # uploads (optional when use_samples=true)
    ecc_csv: Optional[UploadFile] = File(None),
    s4_csv: Optional[UploadFile] = File(None),

    # params
    top_k: int = Form(3),
    use_samples: bool = Form(False),

    # weight sliders (optional; server normalizes anyway)
    w_name: Optional[float] = Form(None),
    w_fields: Optional[float] = Form(None),
    w_keys: Optional[float] = Form(None),
):
    # Resolve inputs
    if use_samples:
        ecc_df = _read_sample_csv("ecc_extractors.sample.csv")
        s4_df  = _read_sample_csv("s4_cds.sample.csv")
    else:
        if not ecc_csv or not s4_csv:
            raise HTTPException(
                status_code=400,
                detail="Provide both CSVs or set use_samples=true."
            )
        ecc_df = _read_upload_csv(ecc_csv)
        s4_df  = _read_upload_csv(s4_csv)

    # Normalize weights
    weights = _normalize_weights({
        "name": w_name if w_name is not None else 0.6,
        "fields": w_fields if w_fields is not None else 0.3,
        "keys": w_keys if w_keys is not None else 0.1,
    })

    # Run baseline matcher (returns JSON-serializable dict)
    try:
        result = run_match(ecc_df=ecc_df, s4_df=s4_df, top_k=top_k, weights=weights)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matcher failed: {e}")

    return result
