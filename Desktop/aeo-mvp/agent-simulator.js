#!/usr/bin/env node
/**
 * Claude Agent Selection Simulator
 *
 * Proves: MCPs with higher AEO scores get selected more often by agents
 *
 * How it works:
 * 1. Generate diverse hotel booking queries
 * 2. For each query, call ALL MCPs (Airbnb, Expedia, Booking, TripAdvisor)
 * 3. Ask Claude to select the BEST response
 * 4. Track which MCP wins most often
 * 5. Correlate with AEO scores
 */

import Anthropic from "@anthropic-ai/sdk";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MCP_ENDPOINTS = [
  { name: "Airbnb", url: process.env.AIRBNB_MCP },
  { name: "Expedia", url: process.env.EXPEDIA_MCP },
  { name: "Booking.com", url: process.env.BOOKING_MCP },
  { name: "TripAdvisor", url: process.env.TRIP_MCP }
].filter(mcp => mcp.url);

// Diverse test queries
const TEST_QUERIES = [
  {
    query: "Find me a hotel in Mexico City for 6 guests, checking in Dec 5, checking out Dec 8",
    destination: "Mexico City",
    checkinDate: "2025-12-05",
    checkoutDate: "2025-12-08",
    guests: 6
  },
  {
    query: "I need accommodation in Paris for 2 people, arriving Jan 15, leaving Jan 20",
    destination: "Paris",
    checkinDate: "2025-01-15",
    checkoutDate: "2025-01-20",
    guests: 2
  },
  {
    query: "Looking for a place in Tokyo for a family of 4, from Feb 10 to Feb 15",
    destination: "Tokyo",
    checkinDate: "2025-02-10",
    checkoutDate: "2025-02-15",
    guests: 4
  },
  {
    query: "Book a hotel in New York for 3 guests, check-in March 1, check-out March 5",
    destination: "New York",
    checkinDate: "2025-03-01",
    checkoutDate: "2025-03-05",
    guests: 3
  },
  {
    query: "Find accommodation in London for 8 people, arriving April 20, departing April 25",
    destination: "London",
    checkinDate: "2025-04-20",
    checkoutDate: "2025-04-25",
    guests: 8
  }
];

async function callMCP(url, toolName, toolArguments) {
  const t0 = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: toolName,
          arguments: toolArguments
        },
        id: 1
      }),
      timeout: 3000 // 3s timeout
    });

    if (!response.ok) {
      return { error: `HTTP ${response.status}`, latency_ms: Date.now() - t0 };
    }

    const json = await response.json();
    const latency_ms = Date.now() - t0;

    // Parse MCP response
    let data = null;
    if (json?.result?.content?.[0]?.text) {
      try {
        data = JSON.parse(json.result.content[0].text);
      } catch (e) {
        data = json.result.content[0].text;
      }
    }

    return { data, latency_ms, error: null };
  } catch (error) {
    return { error: error.message, latency_ms: Date.now() - t0 };
  }
}

async function askClaudeToSelect(query, mcpResponses) {
  const prompt = `You are helping a user find the best hotel booking service.

User query: "${query}"

I've called ${mcpResponses.length} different hotel booking MCPs. Here are their responses:

${mcpResponses.map((resp, i) => `
**${resp.name}** (responded in ${resp.latency_ms}ms):
${resp.error ? `ERROR: ${resp.error}` : `
Homes found: ${Array.isArray(resp.data) ? resp.data.length : 0}
${resp.data ? JSON.stringify(resp.data, null, 2) : 'No data'}
`}
`).join('\n---\n')}

Based on:
1. **Response quality** (completeness, descriptions, ratings)
2. **Speed** (latency)
3. **Reliability** (did it work?)
4. **Value** (pricing, options)

Which MCP would you choose as the BEST option for this user?

Respond with ONLY the name of the MCP you selected and a brief reason (max 50 words).
Format: "SELECTED: [MCP Name] - [reason]"`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }]
  });

  const response = message.content[0].text;

  // Parse selection
  const match = response.match(/SELECTED:\s*([^\s-]+)/i);
  const selectedMCP = match ? match[1].trim() : null;

  return {
    selection: selectedMCP,
    reasoning: response
  };
}

async function runExperiment() {
  console.log("🧪 Claude Agent Selection Simulator\n");
  console.log(`Testing ${MCP_ENDPOINTS.length} MCPs with ${TEST_QUERIES.length} diverse queries\n`);

  const results = [];
  const selectionCounts = {};

  MCP_ENDPOINTS.forEach(mcp => {
    selectionCounts[mcp.name] = 0;
  });

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const testQuery = TEST_QUERIES[i];
    console.log(`\n📋 Query ${i + 1}/${TEST_QUERIES.length}: ${testQuery.query}`);

    // Call all MCPs
    const mcpResponses = [];
    for (const mcp of MCP_ENDPOINTS) {
      console.log(`  Calling ${mcp.name}...`);
      const result = await callMCP(mcp.url, "listHomes", {
        destination: testQuery.destination,
        checkinDate: testQuery.checkinDate,
        checkoutDate: testQuery.checkoutDate,
        guests: testQuery.guests
      });

      mcpResponses.push({
        name: mcp.name,
        url: mcp.url,
        ...result
      });
    }

    // Ask Claude to select the best
    console.log(`  🤔 Asking Claude to select best MCP...`);
    const selection = await askClaudeToSelect(testQuery.query, mcpResponses);

    console.log(`  ✅ Claude selected: ${selection.selection}`);
    console.log(`     Reasoning: ${selection.reasoning.substring(0, 100)}...`);

    if (selection.selection && selectionCounts[selection.selection] !== undefined) {
      selectionCounts[selection.selection]++;
    }

    results.push({
      query: testQuery.query,
      mcpResponses,
      claudeSelection: selection
    });

    // Brief delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Calculate selection rates
  console.log("\n\n📊 RESULTS\n");
  console.log("═".repeat(60));
  console.log("MCP Selection Frequency:\n");

  const sortedSelections = Object.entries(selectionCounts)
    .sort((a, b) => b[1] - a[1]);

  sortedSelections.forEach(([mcp, count], i) => {
    const percentage = ((count / TEST_QUERIES.length) * 100).toFixed(1);
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
    console.log(`${medal} ${mcp.padEnd(20)} ${count}/${TEST_QUERIES.length} (${percentage}%)`);
  });

  // Save detailed results
  const outDir = path.resolve(process.cwd(), "selection-experiments");
  fs.mkdirSync(outDir, { recursive: true});
  const outPath = path.join(outDir, `${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ results, selectionCounts }, null, 2));

  console.log(`\n💾 Detailed results saved: ${outPath}`);

  console.log("\n\n🎯 HYPOTHESIS TEST:");
  console.log("If AEO scores correlate with selection rate, we expect:");
  console.log("  High AEO score → High selection %");
  console.log("  Low AEO score → Low selection %\n");
  console.log("Run 'npm run probe' to see AEO scores for each MCP!");
  console.log("═".repeat(60));
}

runExperiment().catch(console.error);
