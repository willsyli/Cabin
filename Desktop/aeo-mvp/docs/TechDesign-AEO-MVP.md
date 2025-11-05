# Technical Design — AEO MVP

## Architecture
[Claude Agent Simulator] → probes MCPs via JSON-RPC
[AEO API Server] → /probe /score /metrics /benchmark /recommendations
[DB] → probe logs + snapshots
[Next.js Dashboard] → visualizes rankings, latency, transparency, freshness

## Components
- MCP Simulator (Node): calls MCPs, parses responses, logs features.
- Scoring Service (FastAPI): computes selection_score and rationale.
- Data Layer (SQLite→Postgres): probe/results storage.
- Dashboard (Next.js): tables + charts.
- SDK (phase 2): auto /aeo/* + response envelope middleware.

## Key Endpoints
- POST /score: compute score from features.
- GET /metrics: aggregates by endpoint.
- POST /benchmark: rank multiple runs.
- GET /recommendations: rule-based guidance.

## SQL Sketch
See src/api/storage.py; swap to Postgres for prod.

## Security
HTTPS only for external MCPs, redaction of PII, env-based secrets.

## Local Dev
pip install -r requirements.txt
uvicorn src.api.main:app --reload --port 8080
cd src/dashboard && npm i && NEXT_PUBLIC_AEO_API=http://localhost:8080/metrics npm run dev
node src/mcp/probe.js --vertical hotels --save ./runs
