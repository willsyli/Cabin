#!/usr/bin/env node

/**
 * Test script to demonstrate AEO scoring with sample data
 * Run: node test-scoring.js
 */

import fetch from 'node-fetch';

const AEO_API = 'http://localhost:8080';

// Sample feature sets representing different endpoint quality levels
const testCases = [
  {
    name: "Excellent Endpoint",
    endpoint: "https://agentdemo-gamma.vercel.app/api/mcp/airbnb",
    method: "search_listings",
    features: {
      ok: true,
      latency_ms: 180,
      json_valid: true,
      price_transparency: true,
      completeness_ratio: 0.95,
      freshness_hours: 6
    }
  },
  {
    name: "Good Endpoint (Slow)",
    endpoint: "competitor-a.example.com",
    method: "search_listings",
    features: {
      ok: true,
      latency_ms: 850,
      json_valid: true,
      price_transparency: true,
      completeness_ratio: 0.88,
      freshness_hours: 18
    }
  },
  {
    name: "Poor Endpoint (Missing Fees)",
    endpoint: "competitor-b.example.com",
    method: "search_listings",
    features: {
      ok: true,
      latency_ms: 320,
      json_valid: true,
      price_transparency: false,  // ❌ No itemized fees
      completeness_ratio: 0.62,
      freshness_hours: 48
    }
  },
  {
    name: "Failing Endpoint",
    endpoint: "competitor-c.example.com",
    method: "search_listings",
    features: {
      ok: false,  // ❌ Request failed
      latency_ms: 2000,
      json_valid: false,
      price_transparency: false,
      completeness_ratio: 0.0,
      freshness_hours: 9999
    }
  }
];

async function testScoring() {
  console.log('🧪 Testing AEO Scoring System\n');
  console.log('Sending test cases to', AEO_API, '\n');

  for (const test of testCases) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 ${test.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Endpoint: ${test.endpoint}`);
    console.log(`Method: ${test.method}\n`);

    try {
      const response = await fetch(`${AEO_API}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: test.features,
          endpoint: test.endpoint,
          method: test.method
        })
      });

      const result = await response.json();

      console.log('Features:');
      console.log(`  ✓ OK: ${test.features.ok}`);
      console.log(`  ⏱ Latency: ${test.features.latency_ms}ms`);
      console.log(`  📝 JSON Valid: ${test.features.json_valid}`);
      console.log(`  💰 Price Transparency: ${test.features.price_transparency}`);
      console.log(`  📋 Completeness: ${(test.features.completeness_ratio * 100).toFixed(0)}%`);
      console.log(`  🕐 Freshness: ${test.features.freshness_hours}h ago\n`);

      console.log('Score:');
      console.log(`  🎯 Selection Score: ${result.selection_score} / 1.0`);
      console.log(`  💡 Rationale: ${result.rationale}\n`);

      // Visual score bar
      const scoreBar = '█'.repeat(Math.round(result.selection_score * 20));
      const emptyBar = '░'.repeat(20 - Math.round(result.selection_score * 20));
      console.log(`  ${scoreBar}${emptyBar} ${(result.selection_score * 100).toFixed(1)}%\n`);

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
    }
  }

  // Get aggregate metrics
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📈 Aggregate Metrics`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    const metricsRes = await fetch(`${AEO_API}/metrics`);
    const metrics = await metricsRes.json();

    if (metrics.endpoints && metrics.endpoints.length > 0) {
      console.log('Endpoint Rankings:\n');
      metrics.endpoints.forEach((ep, i) => {
        const rank = i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
        console.log(`${medal} #${rank} ${ep.endpoint}`);
        console.log(`     Avg Score: ${ep.avg_score} | P50 Latency: ${ep.p50_latency}ms | Runs: ${ep.runs}\n`);
      });
    } else {
      console.log('No metrics available yet.\n');
    }
  } catch (error) {
    console.error(`❌ Error fetching metrics: ${error.message}\n`);
  }

  // Get recommendations
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`💡 Recommendations`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    const recsRes = await fetch(`${AEO_API}/recommendations?endpoint=https://agentdemo-gamma.vercel.app/api/mcp/airbnb`);
    const recs = await recsRes.json();

    console.log(`For: ${recs.endpoint}\n`);
    recs.top_recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
    console.log();
  } catch (error) {
    console.error(`❌ Error fetching recommendations: ${error.message}\n`);
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('✅ Test complete!\n');
}

// Check if API is running
async function checkAPI() {
  try {
    const response = await fetch(`${AEO_API}/healthz`);
    const health = await response.json();
    if (!health.ok) {
      throw new Error('API health check failed');
    }
    return true;
  } catch (error) {
    console.error(`❌ Cannot reach AEO API at ${AEO_API}`);
    console.error(`   Make sure the API is running:`);
    console.error(`   uvicorn src.api.main:app --reload --port 8080\n`);
    process.exit(1);
  }
}

// Run tests
(async () => {
  await checkAPI();
  await testScoring();
})();
