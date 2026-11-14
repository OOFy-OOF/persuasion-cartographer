from collections import OrderedDict, deque
from math import ceil
from threading import Lock
from time import monotonic

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import get_args
from dotenv import load_dotenv
from analyzer import analyze, metrics_snapshot
from schema import Analysis, Technique
import os

load_dotenv()

app = FastAPI()

class AnalyzeRequest(BaseModel):
    text: str = Field(max_length=20000)


class FeedbackRequest(BaseModel):
    technique: Technique


_MISATTRIBUTION_LOCK = Lock()
_MISATTRIBUTIONS = {technique: 0 for technique in get_args(Technique)}


RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 12
RATE_LIMIT_MAX_CLIENTS = 10000
_RATE_LIMIT_LOCK = Lock()
_RATE_LIMIT_REQUESTS: OrderedDict[str, deque[float]] = OrderedDict()
_RATE_LIMIT_NEXT_CLEANUP = 0.0


def _rate_limit_retry_after(client_id: str) -> int | None:
    """Return seconds until retry when the client exceeds its sliding-window limit."""
    global _RATE_LIMIT_NEXT_CLEANUP
    now = monotonic()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS

    with _RATE_LIMIT_LOCK:
        if now >= _RATE_LIMIT_NEXT_CLEANUP:
            stale_clients = []
            for known_client, timestamps in _RATE_LIMIT_REQUESTS.items():
                while timestamps and timestamps[0] <= cutoff:
                    timestamps.popleft()
                if not timestamps:
                    stale_clients.append(known_client)
            for known_client in stale_clients:
                del _RATE_LIMIT_REQUESTS[known_client]
            _RATE_LIMIT_NEXT_CLEANUP = now + RATE_LIMIT_WINDOW_SECONDS

        timestamps = _RATE_LIMIT_REQUESTS.setdefault(client_id, deque())
        while timestamps and timestamps[0] <= cutoff:
            timestamps.popleft()

        if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
            return max(1, ceil(timestamps[0] + RATE_LIMIT_WINDOW_SECONDS - now))

        timestamps.append(now)
        _RATE_LIMIT_REQUESTS.move_to_end(client_id)
        if len(_RATE_LIMIT_REQUESTS) > RATE_LIMIT_MAX_CLIENTS:
            _RATE_LIMIT_REQUESTS.popitem(last=False)
        return None

@app.post("/analyze", response_model=Analysis)
def analyze_endpoint(req: AnalyzeRequest, request: Request):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text must not be empty.")

    # Caddy overwrites X-Client-IP with the socket peer address before proxying.
    client_id = request.headers.get("x-client-ip") or (request.client.host if request.client else "unknown")
    retry_after = _rate_limit_retry_after(client_id)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Analysis limit reached. Please wait before trying again.",
            headers={"Retry-After": str(retry_after)},
        )

    return analyze(req.text)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/metrics")
def metrics():
    with _MISATTRIBUTION_LOCK:
        misattributions = _MISATTRIBUTIONS.copy()
    return {
        **metrics_snapshot(),
        "misattributions": misattributions,
        "scope": "since_api_start",
    }


@app.post("/feedback")
def submit_feedback(req: FeedbackRequest, request: Request):
    client_id = request.headers.get("x-client-ip") or (request.client.host if request.client else "unknown")
    retry_after = _rate_limit_retry_after(client_id)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Feedback limit reached. Please wait before trying again.",
            headers={"Retry-After": str(retry_after)},
        )

    with _MISATTRIBUTION_LOCK:
        _MISATTRIBUTIONS[req.technique] += 1
        count = _MISATTRIBUTIONS[req.technique]
    return {"ok": True, "technique": req.technique, "count": count}

# Serve the frontend ONLY if running locally (on the VPS, Caddy handles this)
web_dir = os.path.join(os.path.dirname(__file__), "..", "web")
if os.path.exists(web_dir):
    app.mount("/", StaticFiles(directory=web_dir, html=True), name="web")
