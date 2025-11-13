# api/app/main.py
from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Optional, Dict, Any

import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .matcher import run_match

# Load .env (optional)
load_dotenv()

app = FastAPI(title="OCMT API", version="0.4.0")

app = FastAPI(title="OCMT API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOW_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_WEIGHTS = {"name": 0.6, "fields": 0.3, "keys": 0.1}


def normalize_weights(w_name, w_fields, w_keys):
    raw = {"name": w_name, "fields": w_fields, "keys": w_keys}
    for k, v in raw.items():
        if v is not None and v < 0:
            raise HTTPException(status_code=400, detail=f"weight '{k}' must be >= 0")
    if all(v is None for v in raw.values()):
        return DEFAULT_WEIGHTS.copy()
    x_name = raw["name"] or 0.0
    x_fields = raw["fields"] or 0.0
    x_keys = raw["keys"] or 0.0
    s = x_name + x_fields + x_keys
    if s <= 0:
        return DEFAULT_WEIGHTS.copy()
    return {"name": x_name / s, "fields": x_fields / s, "keys": x_keys / s}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/match/")
async def match_route(
    # Either upload two CSVs…
    ecc_csv: Optional[UploadFile] = File(default=None),
    s4_csv: Optional[UploadFile] = File(default=None),
    # …or tick the sample switch
    use_samples: bool = Form(default=False),
    # knobs
    top_k: int = Form(default=3),
    name_weight: Optional[float] = Form(default=None),
    fields_weight: Optional[float] = Form(default=None),
    keys_weight: Optional[float] = Form(default=None),
):
    """
    Accepts either (a) two CSV uploads or (b) use_samples=true to load bundled demos.
    Weights are optional — default to 0.6/0.3/0.1 and normalized server-side.
    """
    # Load dataframes
    if use_samples:
        ecc_df, s4_df = _load_sample_csvs()
    else:
        if not ecc_csv or not s4_csv:
            raise HTTPException(status_code=400, detail="Provide both CSVs or set use_samples=true.")
        ecc_df = _load_csv_upload(ecc_csv)
        s4_df = _load_csv_upload(s4_csv)

    weights = _read_weights(name_weight, fields_weight, keys_weight)

    # Ensure expected columns exist (harmless if already present)
    for col in ["extractor_name", "extractor_text", "fields_json", "primary_keys_json"]:
        if col not in ecc_df.columns:
            ecc_df[col] = ""
    for col in ["cds_view_name", "cds_view_text", "fields_json", "primary_keys_json"]:
        if col not in s4_df.columns:
            s4_df[col] = ""

    result = run_match(ecc_df, s4_df, top_k=top_k, weights=weights)
    return result
