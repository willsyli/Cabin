# AEO: Agentic Engine Optimization (MCP • Hotels)

## Run API
pip install -r requirements.txt
uvicorn src.api.main:app --reload --port 8080

## Run Dashboard
cd src/dashboard
npm install
NEXT_PUBLIC_AEO_API=http://localhost:8080/metrics npm run dev

## Run Probes
export EXPEDIA_MCP=http://localhost:3101/mcp
export BOOKING_MCP=http://localhost:3102/mcp
export TRIP_MCP=http://localhost:3103/mcp
export AEO_API=http://localhost:8080
node src/mcp/probe.js --vertical hotels --save ./runs
