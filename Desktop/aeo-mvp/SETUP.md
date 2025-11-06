# AEO MVP Setup Guide

This guide will help you set up and test your Airbnb MCP endpoint with the AEO (Agentic Engine Optimization) system.

## 🎯 What This Does

The AEO system:
1. **Tests** your MCP endpoint against standardized hotel search intents
2. **Scores** performance based on latency, data quality, transparency, and completeness
3. **Benchmarks** your endpoint against competitors
4. **Provides recommendations** for optimization

## 📋 Prerequisites

- **Node.js** (v18+)
- **Python** (3.9+)
- **Your Airbnb MCP Endpoint**: `https://agentdemo-gamma.vercel.app/api/mcp/airbnb`

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

Edit `.env` and add your Airbnb MCP endpoint:

```bash
AIRBNB_MCP=https://agentdemo-gamma.vercel.app/api/mcp/airbnb
AEO_API=http://localhost:8080
```

### 3. Start the AEO API Server

```bash
# Start the FastAPI server
uvicorn src.api.main:app --reload --port 8080
```

The API will be available at `http://localhost:8080`

Test it: `curl http://localhost:8080/healthz`

### 4. Run the Probe

```bash
# Run the MCP probe to test your endpoint
npm run probe
```

This will:
- Call your Airbnb MCP endpoint with standardized search queries
- Extract feature vectors (latency, completeness, transparency)
- Send features to the AEO API for scoring
- Save results to `./runs/<timestamp>.json`

### 5. View Results

```bash
# Get aggregated metrics
curl http://localhost:8080/metrics

# Get recommendations for your endpoint
curl "http://localhost:8080/recommendations?endpoint=https://agentdemo-gamma.vercel.app/api/mcp/airbnb"
```

## 🔌 Claude Desktop Integration

To use your Airbnb MCP endpoint directly in Claude Desktop:

### 1. Update Claude Desktop Config

Edit your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "airbnb": {
      "command": "node",
      "args": [
        "/absolute/path/to/aeo-mvp/simple-mcp-client.js",
        "https://agentdemo-gamma.vercel.app/api/mcp/airbnb"
      ],
      "env": {}
    }
  }
}
```

**Important**: Replace `/absolute/path/to/aeo-mvp/` with the actual full path on your system.

### 2. Restart Claude Desktop

After updating the config, restart Claude Desktop. You should now see the Airbnb MCP tools available in Claude.

## 📊 Understanding the Scores

The AEO scoring formula:

```
selection_score =
  0.25 × ok              (endpoint responds successfully)
  0.15 × latency_norm    (P50 latency < 300ms target)
  0.10 × json_valid      (valid JSON response)
  0.20 × price_transparency (itemized fees + total)
  0.20 × completeness    (required fields present)
  0.10 × freshness       (data < 24h old)
```

**Score Range**: 0.0 to 1.0 (higher is better)

### Success Criteria

- ✅ **Selection Score** > 0.80
- ✅ **P50 Latency** < 300ms
- ✅ **Price Transparency** = 100%
- ✅ **Completeness** > 90%
- ✅ **JSON Valid** = 100%

## 🧪 Test Queries

The probe uses standardized hotel search intents:

```javascript
{
  method: "search_listings",
  params: {
    location: "Mexico City, MX",
    check_in: "2025-12-05",
    check_out: "2025-12-08",
    guests: 6,
    filters: {
      bedrooms_min: 3,
      price_max: 250,
      rating_min: 4.5,
      free_cancellation: true
    }
  }
}
```

## 📁 Project Structure

```
aeo-mvp/
├── simple-mcp-client.js    # Bridge for Claude Desktop → remote MCP
├── src/
│   ├── api/
│   │   ├── main.py         # FastAPI endpoints
│   │   ├── scoring.py      # AEO scoring algorithm
│   │   └── storage.py      # In-memory metrics storage
│   └── mcp/
│       └── probe.js        # MCP endpoint testing tool
├── runs/                   # Probe results (JSON)
├── .env                    # Configuration
└── package.json
```

## 🔍 API Endpoints

### POST `/score`
Score a single feature vector
```bash
curl -X POST http://localhost:8080/score \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "ok": true,
      "latency_ms": 250,
      "json_valid": true,
      "price_transparency": true,
      "completeness_ratio": 0.95,
      "freshness_hours": 12
    },
    "endpoint": "https://agentdemo-gamma.vercel.app/api/mcp/airbnb",
    "method": "search_listings"
  }'
```

### GET `/metrics`
View aggregated metrics across all probes

### POST `/benchmark`
Compare multiple endpoints

### GET `/recommendations`
Get optimization recommendations

## 🐛 Troubleshooting

### Probe can't reach endpoint
- Check that your endpoint is publicly accessible
- Verify the URL in `.env` is correct
- Test manually: `curl -X POST <your-endpoint> -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"search_listings","params":{},"id":1}'`

### Claude Desktop not seeing MCP tools
- Verify the path in `claude_desktop_config.json` is absolute (not relative)
- Check that `simple-mcp-client.js` is executable
- Look at Claude Desktop logs for errors

### Scoring seems incorrect
- Review the feature extraction logic in `src/mcp/probe.js:38-54`
- Check that your MCP response matches the expected schema
- Add logging to see what features are extracted

## 📈 Next Steps

1. **Dashboard**: Build the Next.js dashboard (`src/dashboard/`)
2. **More Intents**: Add `quote_total`, `check_availability` probes
3. **Benchmarking**: Test against competitor endpoints (Expedia, Booking)
4. **Recommendations Engine**: Enhance based on actual performance patterns
5. **Production DB**: Migrate from in-memory to SQLite/Postgres

## 🤝 Support

For issues or questions:
- Check the logs: `tail -f api.log`
- Review probe output: `cat runs/<latest>.json | jq`
- Verify endpoint health: `curl <your-endpoint>`

## 📝 Example Output

When the probe runs successfully, you'll see:

```json
{
  "endpoint": "https://agentdemo-gamma.vercel.app/api/mcp/airbnb",
  "method": "search_listings",
  "features": {
    "ok": true,
    "latency_ms": 245,
    "json_valid": true,
    "price_transparency": true,
    "completeness_ratio": 0.92,
    "freshness_hours": 8.5
  },
  "scored": {
    "selection_score": 0.847,
    "rationale": "fast, fresh, transparent fees, high completeness",
    "features": { ... }
  }
}
```

This score (0.847) indicates a high-quality MCP endpoint likely to be selected by agent planners!
