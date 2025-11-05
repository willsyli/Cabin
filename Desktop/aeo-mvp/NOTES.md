# Universal Agent Notes

Purpose: measure and improve how MCP endpoints are chosen by agent planners (AEO).

Services:
- AEO API (FastAPI)
- MCP Simulator (Node)
- Dashboard (Next.js)

Quickstart:
- cp .env.example .env
- docker-compose up --build
- API http://localhost:8080 • Dashboard http://localhost:3000

Safe to log: timings, validation flags, freshness timestamps, hashed payload fingerprints.
Never log PII or payment data.
