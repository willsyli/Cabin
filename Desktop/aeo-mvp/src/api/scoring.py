def normalize_latency_ms(latency_ms: int) -> float:
    return max(0.0, min(1.0, 1.0 - (latency_ms / 2000.0)))

def score(features: dict) -> dict:
    ok                  = 1.0 if features.get("ok") else 0.0
    latency_norm        = normalize_latency_ms(int(features.get("latency_ms", 2000)))
    json_valid          = 1.0 if features.get("json_valid") else 0.0
    price_transparency  = 1.0 if features.get("price_transparency") else 0.0
    completeness        = float(features.get("completeness_ratio", 0.0))
    freshness_hours     = float(features.get("freshness_hours", 9999))
    freshness           = 1.0 if freshness_hours < 24 else 0.0

    selection_score = (
        0.25 * ok +
        0.15 * latency_norm +
        0.10 * json_valid +
        0.20 * price_transparency +
        0.20 * completeness +
        0.10 * freshness
    )

    bits = []
    if latency_norm > 0.8: bits.append("fast")
    if freshness: bits.append("fresh")
    if price_transparency: bits.append("transparent fees")
    if completeness > 0.9: bits.append("high completeness")
    rationale = ", ".join(bits) or "meets baseline"

    return {
        "selection_score": round(selection_score, 3),
        "rationale": rationale,
        "features": {
            "ok": bool(ok),
            "latency_ms": int(features.get("latency_ms", 0)),
            "json_valid": bool(features.get("json_valid", False)),
            "price_transparency": bool(features.get("price_transparency", False)),
            "completeness_ratio": round(completeness, 2),
            "freshness_hours": freshness_hours
        }
    }
