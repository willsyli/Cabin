from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
from .scoring import score
from .storage import add_probe, metrics_snapshot

app = FastAPI(title="AEO API", version="0.1")

# Add CORS middleware to allow dashboard to fetch data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Features(BaseModel):
    ok: bool
    latency_ms: int
    json_valid: bool
    price_transparency: bool
    completeness_ratio: float
    freshness_hours: float

class ScoreReq(BaseModel):
    features: Features
    endpoint: Optional[str] = None
    method: Optional[str] = None

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/score")
def score_endpoint(body: ScoreReq):
    s = score(body.features.dict())
    if body.endpoint and body.method:
        add_probe(body.endpoint, body.method, s)
    return s

@app.get("/metrics")
def metrics():
    return {"endpoints": metrics_snapshot()}

class BenchmarkReq(BaseModel):
    runs: List[Dict]

@app.post("/benchmark")
def benchmark(body: BenchmarkReq):
    ranked = []
    for r in body.runs:
        s = score(r["features"])
        add_probe(r.get("endpoint", "unknown"), r.get("method", "unknown"), s)
        ranked.append({"endpoint": r["endpoint"], "method": r["method"], **s})
    ranked.sort(key=lambda x: x["selection_score"], reverse=True)
    return {"ranked": ranked}

@app.get("/recommendations")
def recommendations(endpoint: str):
    return {
        "endpoint": endpoint,
        "top_recommendations": [
            "Ensure itemized fees and provide total_estimate",
            "Keep inventory freshness under 24h (set updated_at / as_of)",
            "Aim for P50 search latency < 300ms",
            "Fill required fields: id,title,price,currency,location,availability,fees,photos"
        ]
    }
