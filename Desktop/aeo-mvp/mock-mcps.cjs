const express = require('express');

// Mock Expedia - Fast but incomplete data
const expediaApp = express();
expediaApp.use(express.json());

expediaApp.post('/api/mcp/expedia', async (req, res) => {
  const { method, params } = req.body;

  if (method === "tools/list") {
    setTimeout(() => {
      res.json({
        jsonrpc: "2.0",
        result: {
          tools: [
            { name: "listHomes", description: "Search for available homes" },
            { name: "reserveHome", description: "Book a home" }
          ]
        },
        id: req.body.id
      });
    }, 50); // Fast: 50ms
  } else if (method === "tools/call") {
    const toolName = params?.name;

    if (toolName === "listHomes") {
      setTimeout(() => {
        res.json({
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({
                homes: [
                  {
                    id: "exp-001",
                    title: "Downtown Loft",
                    price: 120,
                    currency: "USD",
                    location: "New York, NY",
                    availability: true,
                    fees: { cleaning: 25 },
                    photos: ["photo1.jpg"],
                    // Missing: description field (incomplete)
                  },
                  {
                    id: "exp-002",
                    title: "Beach Condo",
                    price: 180,
                    currency: "USD",
                    location: "Miami, FL",
                    availability: true,
                    fees: { cleaning: 30 },
                    photos: ["photo2.jpg"],
                    // Missing: description field (incomplete)
                  }
                ],
                total_estimate: 145
              })
            }]
          },
          id: req.body.id
        });
      }, 50); // Fast: 50ms
    } else if (toolName === "reserveHome") {
      setTimeout(() => {
        res.json({
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({ success: true, confirmationId: "EXP-" + Date.now() })
            }]
          },
          id: req.body.id
        });
      }, 100);
    }
  }
});

// Mock Booking.com - Slow but complete data
const bookingApp = express();
bookingApp.use(express.json());

bookingApp.post('/api/mcp/booking', async (req, res) => {
  const { method, params } = req.body;

  if (method === "tools/list") {
    setTimeout(() => {
      res.json({
        jsonrpc: "2.0",
        result: {
          tools: [
            { name: "listHomes", description: "Search for available homes" },
            { name: "reserveHome", description: "Book a home" }
          ]
        },
        id: req.body.id
      });
    }, 800); // Slow: 800ms
  } else if (method === "tools/call") {
    const toolName = params?.name;

    if (toolName === "listHomes") {
      setTimeout(() => {
        res.json({
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({
                homes: [
                  {
                    id: "bkg-001",
                    title: "Luxury Penthouse",
                    description: "Stunning views of the city skyline with modern amenities",
                    price: 300,
                    currency: "USD",
                    location: "Chicago, IL",
                    availability: true,
                    fees: { cleaning: 50, service: 25 },
                    photos: ["photo1.jpg", "photo2.jpg"],
                    updated_at: new Date().toISOString()
                  },
                  {
                    id: "bkg-002",
                    title: "Cozy Cottage",
                    description: "Perfect retreat in the mountains with fireplace",
                    price: 150,
                    currency: "USD",
                    location: "Aspen, CO",
                    availability: true,
                    fees: { cleaning: 35, service: 15 },
                    photos: ["photo3.jpg", "photo4.jpg"],
                    updated_at: new Date().toISOString()
                  }
                ],
                total_estimate: 375
              })
            }]
          },
          id: req.body.id
        });
      }, 800); // Slow: 800ms
    } else if (toolName === "reserveHome") {
      setTimeout(() => {
        res.json({
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({ success: true, confirmationId: "BKG-" + Date.now() })
            }]
          },
          id: req.body.id
        });
      }, 900);
    }
  }
});

// Mock TripAdvisor - Unreliable (sometimes fails)
const tripApp = express();
tripApp.use(express.json());

tripApp.post('/api/mcp/tripadvisor', async (req, res) => {
  const { method, params } = req.body;

  // 30% chance of failure
  if (Math.random() < 0.3) {
    return res.status(500).json({ error: "Service temporarily unavailable" });
  }

  if (method === "tools/list") {
    setTimeout(() => {
      res.json({
        jsonrpc: "2.0",
        result: {
          tools: [
            { name: "listHomes", description: "Search for available homes" },
            { name: "reserveHome", description: "Book a home" }
          ]
        },
        id: req.body.id
      });
    }, 300);
  } else if (method === "tools/call") {
    const toolName = params?.name;

    if (toolName === "listHomes") {
      setTimeout(() => {
        res.json({
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({
                homes: [
                  {
                    id: "trip-001",
                    title: "Historic Home",
                    description: "Beautiful historic property in downtown",
                    price: 200,
                    currency: "USD",
                    location: "Boston, MA",
                    availability: true,
                    fees: { cleaning: 40 },
                    photos: ["photo1.jpg"]
                  }
                ],
                total_estimate: 240
              })
            }]
          },
          id: req.body.id
        });
      }, 300);
    } else if (toolName === "reserveHome") {
      setTimeout(() => {
        res.json({
          jsonrpc: "2.0",
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({ success: true, confirmationId: "TRIP-" + Date.now() })
            }]
          },
          id: req.body.id
        });
      }, 400);
    }
  }
});

// Start all three servers
expediaApp.listen(3101, () => console.log('✈️  Expedia MCP running on port 3101 (fast but incomplete)'));
bookingApp.listen(3102, () => console.log('🏨  Booking.com MCP running on port 3102 (slow but complete)'));
tripApp.listen(3103, () => console.log('🗺️  TripAdvisor MCP running on port 3103 (unreliable)'));

console.log('\n📊 Mock MCP Performance Profiles:');
console.log('   Expedia: 50ms latency, missing descriptions (incomplete)');
console.log('   Booking.com: 800ms latency, full data (complete)');
console.log('   TripAdvisor: 300ms latency, 30% failure rate (unreliable)');
console.log('\nPress Ctrl+C to stop all servers\n');
