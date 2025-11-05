#!/usr/bin/env node
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const AEO_API = process.env.AEO_API || "http://localhost:8080";
const TEST_BOOKING_FLOW = process.env.TEST_BOOKING_FLOW !== "false"; // Enable by default

const targets = [
  process.env.AIRBNB_MCP,
  process.env.EXPEDIA_MCP,
  process.env.BOOKING_MCP,
  process.env.TRIP_MCP
].filter(Boolean);

// Complete booking flow: search → quote → book
const bookingFlowTemplate = {
  search: {
    method: "search_listings",
    params: {
      location: "Mexico City, MX",
      check_in: "2025-12-05",
      check_out: "2025-12-08",
      guests: 6,
      filters: { bedrooms_min: 3, price_max: 250, rating_min: 4.5, free_cancellation: true }
    }
  },
  quote: {
    method: "quote_total",
    params: {
      check_in: "2025-12-05",
      check_out: "2025-12-08",
      guests: 6
    }
  },
  book: {
    method: "create_booking",
    params: {
      check_in: "2025-12-05",
      check_out: "2025-12-08",
      guests: 6,
      guest_details: {
        name: "AEO Test User",
        email: "aeo-test@example.com",
        phone: "+1234567890"
      },
      payment_method: "test_simulation"
    }
  }
};

async function callMcp(url, method, params) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 })
    });
    const json = await r.json();
    const latency_ms = Date.now() - t0;
    return { json, latency_ms, error: null };
  } catch (error) {
    const latency_ms = Date.now() - t0;
    return { json: null, latency_ms, error: error.message };
  }
}

function featuresFrom(result, latency_ms, method = "search_listings") {
  const ok = !!result?.result?.data;
  const data = result?.result?.data || {};
  const listings = Array.isArray(data.listings) ? data.listings : [];
  const json_valid = !!data && typeof data === "object";

  // Price transparency varies by method
  let price_transparency = false;
  if (method === "search_listings") {
    price_transparency = listings.length
      ? listings.every(l => l?.fees && typeof l.total_estimate === "number")
      : false;
  } else if (method === "quote_total" || method === "create_booking") {
    price_transparency = !!data?.total && !!data?.fees;
  }

  // Completeness varies by method
  let completeness_ratio = 0.0;
  if (method === "search_listings") {
    completeness_ratio = listings.length
      ? listings.map(l => ["id","title","price","currency","location","availability","fees","photos"]
        .filter(k => l[k] !== undefined).length / 8)
        .reduce((a,b)=>a+b,0) / listings.length
      : 0.0;
  } else if (method === "quote_total") {
    const requiredFields = ["total", "fees", "currency", "breakdown"];
    completeness_ratio = requiredFields.filter(k => data[k] !== undefined).length / requiredFields.length;
  } else if (method === "create_booking") {
    const requiredFields = ["booking_id", "status", "confirmation_code", "total"];
    completeness_ratio = requiredFields.filter(k => data[k] !== undefined).length / requiredFields.length;
  }

  const updated = data?.as_of || listings[0]?.updated_at;
  const freshness_hours = updated ? (Date.now() - new Date(updated).getTime()) / 36e5 : 9999;

  return { ok, latency_ms, json_valid, price_transparency, completeness_ratio, freshness_hours };
}

async function testBookingFlow(url) {
  console.log(`\n🏨 Testing complete booking flow for: ${url}`);
  const flowResults = {
    endpoint: url,
    timestamp: new Date().toISOString(),
    steps: [],
    completion_status: {
      search_completed: false,
      quote_completed: false,
      booking_completed: false,
      overall_success: false
    }
  };

  // Step 1: Search for listings
  console.log("  📋 Step 1/3: Searching for listings...");
  const searchResult = await callMcp(url, bookingFlowTemplate.search.method, bookingFlowTemplate.search.params);
  const searchFeatures = featuresFrom(searchResult.json, searchResult.latency_ms, "search_listings");

  flowResults.steps.push({
    step: "search",
    method: bookingFlowTemplate.search.method,
    features: searchFeatures,
    raw_result: searchResult.json
  });

  if (!searchFeatures.ok || !searchResult.json?.result?.data?.listings?.length) {
    console.log("  ❌ Search failed or returned no results");
    return flowResults;
  }

  flowResults.completion_status.search_completed = true;
  const firstListing = searchResult.json.result.data.listings[0];
  const listingId = firstListing.id;
  console.log(`  ✅ Search completed. Found listing: ${listingId}`);

  // Step 2: Get quote for the first listing
  console.log("  💰 Step 2/3: Getting quote for listing...");
  const quoteParams = { ...bookingFlowTemplate.quote.params, listing_id: listingId };
  const quoteResult = await callMcp(url, bookingFlowTemplate.quote.method, quoteParams);
  const quoteFeatures = featuresFrom(quoteResult.json, quoteResult.latency_ms, "quote_total");

  flowResults.steps.push({
    step: "quote",
    method: bookingFlowTemplate.quote.method,
    features: quoteFeatures,
    raw_result: quoteResult.json
  });

  if (!quoteFeatures.ok) {
    console.log("  ❌ Quote failed");
    return flowResults;
  }

  flowResults.completion_status.quote_completed = true;
  console.log(`  ✅ Quote completed. Total: ${quoteResult.json?.result?.data?.total || "N/A"}`);

  // Step 3: Create booking (simulation only)
  if (TEST_BOOKING_FLOW) {
    console.log("  🎫 Step 3/3: Creating booking (test simulation)...");
    const bookParams = { ...bookingFlowTemplate.book.params, listing_id: listingId };
    const bookResult = await callMcp(url, bookingFlowTemplate.book.method, bookParams);
    const bookFeatures = featuresFrom(bookResult.json, bookResult.latency_ms, "create_booking");

    flowResults.steps.push({
      step: "book",
      method: bookingFlowTemplate.book.method,
      features: bookFeatures,
      raw_result: bookResult.json
    });

    if (!bookFeatures.ok) {
      console.log("  ❌ Booking creation failed");
    } else {
      flowResults.completion_status.booking_completed = true;
      console.log(`  ✅ Booking completed. ID: ${bookResult.json?.result?.data?.booking_id || "N/A"}`);
    }
  }

  // Overall success if all enabled steps completed
  flowResults.completion_status.overall_success =
    flowResults.completion_status.search_completed &&
    flowResults.completion_status.quote_completed &&
    (TEST_BOOKING_FLOW ? flowResults.completion_status.booking_completed : true);

  console.log(`  ${flowResults.completion_status.overall_success ? "✅" : "❌"} Overall flow status: ${flowResults.completion_status.overall_success ? "SUCCESS" : "FAILED"}`);

  return flowResults;
}

(async () => {
  console.log("🧪 AEO MCP Probe - Complete Booking Flow Testing\n");
  console.log(`Testing ${targets.length} endpoint(s)...`);
  console.log(`Booking flow enabled: ${TEST_BOOKING_FLOW}\n`);

  const results = [];

  for (const url of targets) {
    try {
      const flowResult = await testBookingFlow(url);
      results.push(flowResult);

      // Send each step's score to the AEO API
      for (const step of flowResult.steps) {
        try {
          const scoreRes = await fetch(`${AEO_API}/score`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              features: step.features,
              endpoint: url,
              method: step.method
            })
          });
          const scored = await scoreRes.json();
          step.scored = scored;
        } catch (error) {
          console.error(`  ⚠️  Failed to score ${step.method}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`\n❌ Error testing ${url}: ${error.message}`);
      results.push({
        endpoint: url,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Save results
  const outDir = path.resolve(process.cwd(), "runs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log(`\n📊 Results saved: ${outPath}`);
  console.log(`\n✅ Testing complete!`);

  // Summary
  const successfulFlows = results.filter(r => r.completion_status?.overall_success).length;
  console.log(`\n📈 Summary:`);
  console.log(`  Total endpoints tested: ${results.length}`);
  console.log(`  Successful complete flows: ${successfulFlows}/${results.length}`);
  console.log(`  Success rate: ${((successfulFlows / results.length) * 100).toFixed(1)}%`);
})();
