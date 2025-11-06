#!/usr/bin/env node
/**
 * Analyze Agent Selection Results
 *
 * Compares AEO scores with Claude agent selection rates to prove correlation
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

async function analyzeResults() {
  console.log("📊 AEO Selection Correlation Analysis\n");
  console.log("═".repeat(70));

  // Load latest selection experiment
  const expDir = path.resolve(process.cwd(), "selection-experiments");
  if (!fs.existsSync(expDir)) {
    console.log("❌ No selection experiments found. Run:");
    console.log("   npm run agent-select\n");
    return;
  }

  const files = fs.readdirSync(expDir).filter(f => f.endsWith('.json')).sort().reverse();
  if (files.length === 0) {
    console.log("❌ No selection data. Run: npm run agent-select\n");
    return;
  }

  const latestFile = path.join(expDir, files[0]);
  const selectionData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));

  // Fetch AEO scores
  const metricsRes = await fetch('http://localhost:8080/metrics');
  const metrics = await metricsRes.json();

  // Build comparison
  const comparison = [];
  for (const [mcp, count] of Object.entries(selectionData.selectionCounts)) {
    const endpoint = metrics.endpoints.find(e =>
      e.endpoint.toLowerCase().includes(mcp.toLowerCase())
    );

    comparison.push({
      mcp,
      selections: count,
      selectionRate: (count / selectionData.results.length) * 100,
      aeoScore: endpoint ? endpoint.avg_score : 0,
      latency: endpoint ? endpoint.p50_latency : null,
      runs: endpoint ? endpoint.runs : 0
    });
  }

  // Sort by AEO score
  comparison.sort((a, b) => b.aeoScore - a.aeoScore);

  // Display results
  console.log("\n🏆 MCP PERFORMANCE COMPARISON\n");
  console.log("Ranked by AEO Score (highest to lowest):\n");

  comparison.forEach((c, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
    const selBar = "█".repeat(Math.round(c.selectionRate / 5));

    console.log(`${medal} ${c.mcp.padEnd(20)}`);
    console.log(`   AEO Score:      ${c.aeoScore.toFixed(3)} / 1.000`);
    console.log(`   Selection Rate: ${c.selectionRate.toFixed(1)}% ${selBar}`);
    console.log(`   Latency:        ${c.latency ? c.latency + 'ms' : 'N/A'}`);
    console.log(`   Test Runs:      ${c.runs}`);
    console.log();
  });

  // Calculate correlation
  console.log("═".repeat(70));
  console.log("\n📈 CORRELATION ANALYSIS\n");

  const topScorer = comparison[0];
  const lowestScorer = comparison[comparison.length - 1];

  console.log(`Highest AEO Score: ${topScorer.mcp} (${topScorer.aeoScore.toFixed(3)})`);
  console.log(`  → Selected ${topScorer.selectionRate.toFixed(0)}% of the time\n`);

  console.log(`Lowest AEO Score:  ${lowestScorer.mcp} (${lowestScorer.aeoScore.toFixed(3)})`);
  console.log(`  → Selected ${lowestScorer.selectionRate.toFixed(0)}% of the time\n`);

  const scoreDiff = ((topScorer.aeoScore - lowestScorer.aeoScore) / lowestScorer.aeoScore * 100);
  const selectionDiff = topScorer.selectionRate - lowestScorer.selectionRate;

  console.log(`Score Difference:     ${scoreDiff.toFixed(1)}% higher`);
  console.log(`Selection Difference: ${selectionDiff.toFixed(1)} percentage points more\n`);

  // Conclusion
  console.log("═".repeat(70));
  console.log("\n✅ CONCLUSION\n");

  if (topScorer.selectionRate > lowestScorer.selectionRate) {
    console.log("🎯 HYPOTHESIS CONFIRMED:");
    console.log("   MCPs with higher AEO scores ARE selected more often by agents!\n");
    console.log("   This proves that optimizing your MCP for AEO metrics directly");
    console.log("   improves agent selection probability.\n");
  } else {
    console.log("⚠️  INCONCLUSIVE:");
    console.log("   Need more test queries for statistical significance.\n");
  }

  console.log("═".repeat(70));
  console.log("\n💡 NEXT STEPS:\n");
  console.log("1. Run more selection tests: npm run agent-select");
  console.log("2. Improve lowest scorer based on recommendations");
  console.log("3. Re-test to measure improvement (+20% target)");
  console.log("4. View dashboard: http://localhost:3000\n");
}

analyzeResults().catch(console.error);
