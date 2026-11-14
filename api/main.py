from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from analyzer import analyze, DROPPED_SPANS
from schema import Analysis
import os
from datetime import datetime, timezone

load_dotenv()

app = FastAPI()

class AnalyzeRequest(BaseModel):
    text: str

@app.post("/analyze", response_model=Analysis)
def analyze_endpoint(req: AnalyzeRequest):
    if len(req.text) < 40 or len(req.text) > 20000:
        raise HTTPException(status_code=400, detail="Text must be between 40 and 20000 characters.")
    return analyze(req.text)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/metrics")
def metrics():
    import analyzer
    return {
        "n_examples": 0,
        "threshold": 0.5,
        "overall": {"precision": 0, "recall": 0, "f1": 0, "fp_rate": 0, "abstention_rate": 0},
        "per_technique": [],
        "inter_annotator": {"kappa": 0, "subset_size": 0},
        "quote_grounding_drops": analyzer.DROPPED_SPANS,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

# Serve the frontend ONLY if running locally (on the VPS, Caddy handles this)
web_dir = os.path.join(os.path.dirname(__file__), "..", "web")
if os.path.exists(web_dir):
    app.mount("/", StaticFiles(directory=web_dir, html=True), name="web")
