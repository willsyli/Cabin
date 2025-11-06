from datetime import datetime
from typing import List, Dict

PROBES: List[Dict] = []

def add_probe(endpoint: str, method: str, scored: Dict):
    PROBES.append({
        "ts": datetime.utcnow().isoformat(),
        "endpoint": endpoint,
        "method": method,
        **scored
    })

def metrics_snapshot():
    agg = {}
    for p in PROBES:
        e = p["endpoint"]
        agg.setdefault(e, {"count":0, "scores":[], "latencies":[]})
        agg[e]["count"] += 1
        agg[e]["scores"].append(p["selection_score"])
        agg[e]["latencies"].append(p["features"]["latency_ms"])
    out = []
    for e,v in agg.items():
        scores = v["scores"]; lats = v["latencies"]
        out.append({
            "endpoint": e,
            "runs": v["count"],
            "avg_score": round(sum(scores)/len(scores),3) if scores else 0.0,
            "p50_latency": sorted(lats)[len(lats)//2] if lats else None
        })
    return sorted(out, key=lambda x: x["avg_score"], reverse=True)
