# AEO MVP - Agentic Engine Optimization

**Measure, benchmark, and optimize your MCP endpoints for maximum agent selection probability.**

## 🎯 What is AEO?

AEO (Agentic Engine Optimization) is the practice of optimizing API endpoints and data services to maximize their selection likelihood by AI agent planners. This MVP focuses on the hotel/travel vertical, testing MCP (Model Context Protocol) endpoints through complete booking flows.

## ✨ Features

### 🔬 Complete Booking Flow Testing
- **Search** → Find listings matching criteria
- **Quote** → Get detailed pricing for specific listing
- **Book** → Complete reservation (test simulation)

Each step is scored independently on:
- ⏱️ **Latency** (< 300ms target)
- 💰 **Price Transparency** (itemized fees, totals)
- 📋 **Data Completeness** (all required fields)
- 🕐 **Freshness** (< 24h data age)
- ✅ **Reliability** (successful responses)

### 📊 Real-Time Dashboard
- Live endpoint rankings
- Visual score breakdowns
- Completion rate tracking
- Auto-refresh every 5 seconds

### 🎯 Scoring Algorithm
```
selection_score =
  0.25 × ok              (successful response)
  0.15 × latency_norm    (speed)
  0.10 × json_valid      (valid structure)
  0.20 × price_transparency
  0.20 × completeness
  0.10 × freshness
```

**Score Range**: 0.0 - 1.0 (higher = more likely to be selected by agents)

## 🚀 Quick Start

### Installation

```bash
# Install Node dependencies
npm install

# Install Python dependencies
pip3 install -r requirements.txt

# Configure .env with your endpoint
# AIRBNB_MCP=https://your-endpoint.com/api/mcp/airbnb
```

### Run the System

**Terminal 1 - API Server:**
```bash
python3 -m uvicorn src.api.main:app --reload --port 8080
```

**Terminal 2 - Test Probe:**
```bash
npm run probe
```

**Terminal 3 - Dashboard (Optional):**
```bash
cd src/dashboard
npm install
npm run dev
# Visit http://localhost:3000
```

## 📖 Usage

### Test Complete Booking Flow

```bash
# Test search → quote → book
npm run probe

# View results
cat runs/$(ls -t runs | head -1) | jq
```

### View Metrics

```bash
# Get aggregated metrics
curl http://localhost:8080/metrics | jq

# Get recommendations
curl "http://localhost:8080/recommendations?endpoint=YOUR_ENDPOINT" | jq

# Or run demo test
node test-scoring.js
```

### Configuration

Edit `.env`:
```bash
# Your MCP endpoints
AIRBNB_MCP=https://agentdemo-gamma.vercel.app/api/mcp/airbnb
EXPEDIA_MCP=http://localhost:3101/mcp
BOOKING_MCP=http://localhost:3102/mcp

# Disable booking step (only test search + quote)
TEST_BOOKING_FLOW=false
```

## 🔌 Claude Desktop Integration

**Edit**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

Restart Claude Desktop to use your MCP!

## 📊 Understanding Results

### Score Ranges
- 🟢 **Excellent (0.9+)**: Fast, complete, transparent
- 🟡 **Good (0.7-0.9)**: Minor improvements needed
- 🔴 **Poor (< 0.7)**: Needs optimization

### Example Output
```
🧪 AEO MCP Probe - Complete Booking Flow Testing

🏨 Testing complete booking flow for: https://agentdemo-gamma.vercel.app/api/mcp/airbnb
  📋 Step 1/3: Searching for listings...
  ✅ Search completed. Found listing: mx-cdmx-12345
  💰 Step 2/3: Getting quote for listing...
  ✅ Quote completed. Total: 720.50
  🎫 Step 3/3: Creating booking (test simulation)...
  ✅ Booking completed. ID: bk_test_67890
  ✅ Overall flow status: SUCCESS

📈 Summary:
  Total endpoints tested: 1
  Successful complete flows: 1/1
  Success rate: 100.0%
```

## 📁 Project Structure

```
aeo-mvp/
├── src/
│   ├── api/              # FastAPI backend
│   │   ├── main.py       # API endpoints
│   │   ├── scoring.py    # Scoring algorithm
│   │   └── storage.py    # Metrics storage
│   ├── mcp/
│   │   └── probe.js      # Complete flow testing
│   └── dashboard/        # Next.js frontend
├── simple-mcp-client.js  # Claude Desktop bridge
├── test-scoring.js       # Demo test
├── .env                  # Configuration
└── runs/                 # Test results
```

## 🎯 Success Criteria

For an endpoint to be "agent-optimized":

- ✅ Selection Score > 0.80
- ✅ P50 Latency < 300ms
- ✅ Price Transparency = 100%
- ✅ Data Completeness > 90%
- ✅ Complete Flow Success > 95%

## 📚 Learn More

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [PRD](./docs/PRD-AEO-MVP.md) - Product requirements
- [Technical Design](./docs/TechDesign-AEO-MVP.md) - Architecture
- [MCP Docs](https://modelcontextprotocol.io) - MCP specification

---

**Built for the era of AI agents.** 🤖✨
