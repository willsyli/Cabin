# Multi-Agent Orchestration

Planner (Claude): emits YAML plan of steps.
Executor (Claude MCP client or Node): executes JSON-RPC calls, measures latency, validates JSON, calls /score, aggregates.

Planner output example:
vertical: hotels
endpoints:
  - ${EXPEDIA_MCP}
  - ${BOOKING_MCP}
  - ${TRIP_MCP}
steps:
  - method: discover
  - method: search_listings
    params_ref: presets/hotels/cdmx_family.json
  - method: quote_total
    params_from: previous.listings[0].id
