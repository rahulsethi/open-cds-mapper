from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load .env if present (dev convenience)
load_dotenv()

app = FastAPI(title="OCMT API", version="0.1.0")

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
async def match_placeholder():
    # A4: placeholder only — no matcher logic yet
    return {"detail": "matcher not implemented yet"}
