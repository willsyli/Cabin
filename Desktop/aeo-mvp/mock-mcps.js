#!/usr/bin/env node
/**
 * Mock Competitor MCPs for AEO Testing
 *
 * Creates local mock MCP servers that simulate:
 * - Expedia: Fast but incomplete data (missing fees breakdown)
 * - Booking.com: Slow but complete and transparent
 * - TripAdvisor: Unreliable (50% fail rate)
 *
 * This allows benchmarking to prove AEO scores correlate with agent selection
 */

import express from 'express';

// Mock data for different MCPs
const mockHomes = {
  expedia: [
    { id: 101, name: "Expedia Downtown Suite", stars: 4.2, price: 150 },
    { id: 102, name: "Expedia Beach House", stars: 4.8, price: 280 }
  ],
  booking: [
    { id: 201, name: "Booking.com City Center", description: "Modern apartment with full amenities", stars: 4.7, price: 180 },
    { id: 202, name: "Booking.com Luxury Villa", description: "5-star villa with pool", stars: 5.0, price: 450 }
  ],
  tripadvisor: [
    { id: 301, name: "TripAdvisor Budget Room", stars: 3.5, price: 80 },
    { id: 302, name: "TripAdvisor Hostel", stars: 3.0, price: 45 }
  ]
};

// Expedia MCP: Fast but incomplete (missing descriptions)
const expediaApp = express();
expediaApp.use(express.json());

expediaApp.post('/api/mcp/expedia', async (req, res) => {
  const { method, params } = req.body;

  if (method === 'tools/call' && params?.name === 'listHomes') {
    // FAST response (50ms)
    setTimeout(() => {
      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: {
          content: [{
            type: "text",
            text: JSON.stringify(mockHomes.expedia) // Missing description field
          }]
        }
      });
    }, 50);
  } else if (method === 'tools/call' && params?.name === 'reserveHome') {
    setTimeout(() => {
      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, bookingId: 1001, message: "Booking confirmed via Expedia" })
          }]
        }
      });
    }, 80);
  } else {
    res.status(404).json({ jsonrpc: "2.0", id: req.body.id, error: { code: -32601, message: "Method not found" }});
  }
});

// Booking.com MCP: Slow but complete and transparent
const bookingApp = express();
bookingApp.use(express.json());

bookingApp.post('/api/mcp/booking', async (req, res) => {
  const { method, params } = req.body;

  if (method === 'tools/call' && params?.name === 'listHomes') {
    // SLOW response (800ms) but COMPLETE data
    setTimeout(() => {
      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: {
          content: [{
            type: "text",
            text: JSON.stringify(mockHomes.booking) // Has all fields including description
          }]
        }
      });
    }, 800);
  } else if (method === 'tools/call' && params?.name === 'reserveHome') {
    setTimeout(() => {
      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, bookingId: 2001, message: "Booking confirmed via Booking.com" })
          }]
        }
      });
    }, 900);
  } else {
    res.status(404).json({ jsonrpc: "2.0", id: req.body.id, error: { code: -32601, message: "Method not found" }});
  }
});

// TripAdvisor MCP: Unreliable (fails 50% of the time)
const tripApp = express();
tripApp.use(express.json());

tripApp.post('/api/mcp/tripadvisor', async (req, res) => {
  const { method, params } = req.body;

  // 50% failure rate
  if (Math.random() < 0.5) {
    return res.status(500).json({
      jsonrpc: "2.0",
      id: req.body.id,
      error: { code: -32603, message: "Internal server error" }
    });
  }

  if (method === 'tools/call' && params?.name === 'listHomes') {
    setTimeout(() => {
      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: {
          content: [{
            type: "text",
            text: JSON.stringify(mockHomes.tripadvisor)
          }]
        }
      });
    }, 300);
  } else if (method === 'tools/call' && params?.name === 'reserveHome') {
    setTimeout(() => {
      res.json({
        jsonrpc: "2.0",
        id: req.body.id,
        result: {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, bookingId: 3001, message: "Booking confirmed via TripAdvisor" })
          }]
        }
      });
    }, 350);
  } else {
    res.status(404).json({ jsonrpc: "2.0", id: req.body.id, error: { code: -32601, message: "Method not found" }});
  }
});

// Start all mock servers
const EXPEDIA_PORT = 3101;
const BOOKING_PORT = 3102;
const TRIP_PORT = 3103;

expediaApp.listen(EXPEDIA_PORT, () => {
  console.log(`✈️  Expedia MCP running on http://localhost:${EXPEDIA_PORT}/api/mcp/expedia`);
  console.log(`   Characteristics: FAST (50ms) but INCOMPLETE (missing descriptions)`);
});

bookingApp.listen(BOOKING_PORT, () => {
  console.log(`🏨 Booking.com MCP running on http://localhost:${BOOKING_PORT}/api/mcp/booking`);
  console.log(`   Characteristics: SLOW (800ms) but COMPLETE (all fields)`);
});

tripApp.listen(TRIP_PORT, () => {
  console.log(`🗺️  TripAdvisor MCP running on http://localhost:${TRIP_PORT}/api/mcp/tripadvisor`);
  console.log(`   Characteristics: UNRELIABLE (50% fail rate)`);
});

console.log('\n📊 Mock MCPs ready for AEO benchmarking!\n');
console.log('Run probe to test all endpoints:');
console.log('  npm run probe\n');
