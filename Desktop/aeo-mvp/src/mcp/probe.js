#!/usr/bin/env node
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const AEO_API = process.env.AEO_API || "http://localhost:8080";
const targets = [
  process.env.AIRBNB_MCP,
  process.env.EXPEDIA_MCP,
  process.env.BOOKING_MCP,
  process.env.TRIP_MCP
].filter(Boolean);

const intents = [
  {
    method: "search_listings",
    params: {
      location: "Mexico City, MX",
      check_in: "2025-12-05",
      check_out: "2025-12-08",
      guests: 6,
      filters: { bedrooms_min: 3, price_max: 250, rating_min: 4.5, free_cancellation: true }
    }
  }
];

async function callMcp(url, method, params) {
  const t0 = Date.now();
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 })
  });
  const json = await r.json();
  const latency_ms = Date.now() - t0;
  return { json, latency_ms };
}

function featuresFrom(result, latency_ms) {
  const ok = !!result?.result?.data;
  const data = result?.result?.data || {};
  const listings = Array.isArray(data.listings) ? data.listings : [];
  const json_valid = !!data && typeof data === "object";
  const price_transparency = listings.length
    ? listings.every(l => l?.fees && typeof l.total_estimate === "number")
    : !!data?.total && !!data?.fees;
  const completeness_ratio = listings.length
    ? listings.map(l => ["id","title","price","currency","location","availability","fees","photos"]
      .filter(k => l[k] !== undefined).length / 8)
      .reduce((a,b)=>a+b,0) / listings.length
    : 0.0;
  const updated = data?.as_of || listings[0]?.updated_at;
  const freshness_hours = updated ? (Date.now() - new Date(updated).getTime()) / 36e5 : 9999;
  return { ok, latency_ms, json_valid, price_transparency, completeness_ratio, freshness_hours };
}

(async () => {
  const results = [];
  for (const url of targets) {
    for (const intent of intents) {
      const { json, latency_ms } = await callMcp(url, intent.method, intent.params);
      const features = featuresFrom(json, latency_ms);
      const scoreRes = await fetch(`${AEO_API}/score`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ features, endpoint: url, method: intent.method })
      });
      const scored = await scoreRes.json();
      results.push({ endpoint: url, method: intent.method, features, scored });
    }
  }
  const outDir = path.resolve(process.cwd(), "runs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log("Saved:", outPath);
})();
