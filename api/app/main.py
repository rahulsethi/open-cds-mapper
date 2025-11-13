from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import io

from .matcher import load_ecc_df, load_cds_df, score_candidates

# Load .env (dev convenience)
load_dotenv()

app = FastAPI(title="OCMT API", version="0.3.0")

# CORS: read comma-separated origins from ALLOW_ORIGINS or default to localhost:3000
allow_origins = os.getenv("ALLOW_ORIGINS", "http://localhost:3000")
origins = [o.strip() for o in allow_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_WEIGHTS = {"name": 0.6, "fields": 0.3, "keys": 0.1}


def normalize_weights(w_name, w_fields, w_keys):
    """
    Turn raw floats (possibly None) into a valid weights dict that sums to 1.0.
    - If all None -> defaults.
    - Negative numbers -> 400.
    - If sum <= 0 after filtering -> defaults.
    """
    raw = {"name": w_name, "fields": w_fields, "keys": w_keys}

    # validate negatives
    for k, v in raw.items():
        if v is not None and v < 0:
            raise HTTPException(status_code=400, detail=f"weight '{k}' must be >= 0")

    # if all None -> defaults
    if all(v is None for v in raw.values()):
        return DEFAULT_WEIGHTS.copy()

    # replace None with 0, then normalize
    x_name = raw["name"] or 0.0
    x_fields = raw["fields"] or 0.0
    x_keys = raw["keys"] or 0.0
    s = x_name + x_fields + x_keys
    if s <= 0:
        return DEFAULT_WEIGHTS.copy()
    return {"name": x_name / s, "fields": x_fields / s, "keys": x_keys / s}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/match/")
async def match(
    ecc_csv: UploadFile = File(None, description="ECC/BW extractors CSV"),
    s4_csv: UploadFile = File(None, description="S/4 CDS CSV"),
    top_k: int = Query(3, ge=1, le=10),
    w_name: float | None = Query(None, description="Weight for name similarity"),
    w_fields: float | None = Query(None, description="Weight for field overlap"),
    w_keys: float | None = Query(None, description="Weight for key overlap"),
):
    """
    Baseline matcher with tunable weights (A9). If no files are uploaded, falls
    back to repo samples under /data for local dev.
    """
    try:
        weights = normalize_weights(w_name, w_fields, w_keys)

        if ecc_csv and s4_csv:
            ecc_bytes = io.BytesIO(await ecc_csv.read())
            s4_bytes = io.BytesIO(await s4_csv.read())
        else:
            # Local dev fallback to repo samples
            repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            ecc_path = os.path.join(repo_root, "data", "ecc_extractors.sample.csv")
            s4_path = os.path.join(repo_root, "data", "s4_cds.sample.csv")
            if not (os.path.exists(ecc_path) and os.path.exists(s4_path)):
                raise HTTPException(status_code=400, detail="No files uploaded and sample CSVs not found.")
            ecc_bytes = io.BytesIO(open(ecc_path, "rb").read())
            s4_bytes = io.BytesIO(open(s4_path, "rb").read())

        ecc_df = load_ecc_df(ecc_bytes)
        cds_df = load_cds_df(s4_bytes)

        result = score_candidates(ecc_df, cds_df, top_k=top_k, weights=weights)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"match failed: {repr(e)}")
