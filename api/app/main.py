from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import io

from .matcher import load_ecc_df, load_cds_df, score_candidates

# Load .env (dev convenience)
load_dotenv()

app = FastAPI(title="OCMT API", version="0.2.0")

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

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/match/")
async def match(
    ecc_csv: UploadFile = File(None, description="ECC/BW extractors CSV"),
    s4_csv: UploadFile = File(None, description="S/4 CDS CSV"),
    top_k: int = Query(3, ge=1, le=10),
):
    """
    Baseline matcher (A6): heuristics-only.
    - If files are not provided, we fall back to /data/*.sample.csv for local dev convenience.
    - Output: for each extractor, top_k CDS candidates with component scores.
    """
    try:
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

        result = score_candidates(ecc_df, cds_df, top_k=top_k)
        return result
    except HTTPException:
        raise
    except Exception as e:
        # Keep errors readable in A6; later we can add structured error codes.
        raise HTTPException(status_code=500, detail=f"match failed: {repr(e)}")
