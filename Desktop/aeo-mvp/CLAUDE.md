# CLAUDE: MCP Probe & AEO Runner

What this agent does
1) Discover MCP manifests.
2) Run standardized hotel intents.
3) Collect feature vectors.
4) POST to AEO API /score and /benchmark.
5) Save run summary to ./runs/<timestamp>.json.

Prereqs
- ANTHROPIC_API_KEY in .env
- AEO API at http://localhost:8080
- MCP endpoints reachable: EXPEDIA_MCP, BOOKING_MCP, TRIP_MCP

Standardized hotel intents
- search_listings (CDMX, 6 guests, 3+ bedrooms, <=$250, 4.5+)
- quote_total (using first listing from search)

Success criteria
- JSON validation errors < 1 per endpoint
- P50 latency < 300ms
- Price transparency true ≥ 95%
- selection_score present for each target
