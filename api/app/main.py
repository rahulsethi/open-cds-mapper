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

ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "http://localhost:3000")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")  # placeholder for later

app = FastAPI(title="OCMT API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOW_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


# ---------- Helpers ----------

ROOT = Path(__file__).resolve().parents[2]  # project root
DATA_DIR = ROOT / "data"


def _load_csv_upload(upload: UploadFile) -> pd.DataFrame:
    data = upload.file.read()
    return pd.read_csv(
        io.BytesIO(data),
        dtype=str,
        keep_default_na=False,
        na_filter=False,
        engine="python",
    )


def _load_sample_csvs() -> tuple[pd.DataFrame, pd.DataFrame]:
    ecc = pd.read_csv(
        DATA_DIR / "ecc_extractors.sample.csv",
        dtype=str,
        keep_default_na=False,
        na_filter=False,
        engine="python",
    )
    s4 = pd.read_csv(
        DATA_DIR / "s4_cds.sample.csv",
        dtype=str,
        keep_default_na=False,
        na_filter=False,
        engine="python",
    )
    return ecc, s4


def _read_weights(
    name_weight: Optional[float],
    fields_weight: Optional[float],
    keys_weight: Optional[float],
) -> Dict[str, float]:
    # Default weights
    w = {
        "name": 0.6,
        "fields": 0.3,
        "keys": 0.1,
    }
    if name_weight is not None:
        w["name"] = float(name_weight)
    if fields_weight is not None:
        w["fields"] = float(fields_weight)
    if keys_weight is not None:
        w["keys"] = float(keys_weight)
    # Normalize inside matcher too, but we keep this reasonable
    return w


# ---------- Routes ----------

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
