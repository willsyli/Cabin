# PRD — Agentic Engine Optimization (AEO)

## Summary
AEO provides visibility and optimization for MCP endpoints in the hotel vertical. It measures selection likelihood by agent planners, benchmarks competitors, and recommends fixes.

## Objectives & KPIs
- Selection-rate score per endpoint (0–1).
- Benchmark rank vs 3 competitors.
- ≥95% JSON validation pass rate.
- +20% score improvement post-remediation.
- 5 enterprise MCPs integrated in pilot (Q1 2026).

## Users
- MCP Engineering Teams, AI Partnership Leads, PMs/Data Analysts.

## Key Features (v1)
- Endpoint Scanner, AEO Scoring Model, Benchmark View, Probe Simulator, Recommendations Engine, Metrics API.

## Future (v2 SDK)
- Middleware for auto telemetry, recurring probes, reputation layer, Claude workbench.

## Functional Requirements
Inputs: MCP URLs / manifests. Outputs: AEO score, feature vector, rank, recs. Telemetry: latency, freshness, JSON validity, transparency, completeness. Storage: SQLite/Postgres. Frontend: Next.js.

## Non-Functional
Uptime ≥ 99%, probe latency ≤ 1s, 30d retention, versioned schemas, GDPR-safe.

## Scoring (v1)
score = 0.25*ok + 0.15*(1 - latency_norm) + 0.10*json_valid + 0.20*price_transparency + 0.20*completeness + 0.10*freshness

## Risks
Protocol churn → keep adapter; small probe set → rotate intents; closed Skills → indirect AEO via data quality/partners.

## Roadmap
M1: scoring service; M2: dashboard; M3: SDK; M4: leaderboard.
