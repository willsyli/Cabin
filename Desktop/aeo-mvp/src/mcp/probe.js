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

// Complete booking flow: search → reserve
// Airbnb agent uses: listHomes and reserveHome
const bookingFlowTemplate = {
  search: {
    method: "listHomes",
    params: {
      destination: "Mexico City",
      checkinDate: "2025-12-05",
      checkoutDate: "2025-12-08",
      guests: 6
    }
  },
  book: {
    method: "reserveHome",
    params: {
      startDate: "2025-12-05",
      endDate: "2025-12-08",
      creditCardNumber: "4111111111111111",
      expirationDate: "12/26",
      ccv: "123",
      firstName: "AEO",
      lastName: "TestUser",
      address: "123 Test St, Test City, TC 12345",
      phoneNumber: "+1234567890"
    }
  }
};

async function callMcp(url, toolName, toolArguments) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
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
      })
    });
    const json = await r.json();
    const latency_ms = Date.now() - t0;
    return { json, latency_ms, error: null };
  } catch (error) {
    const latency_ms = Date.now() - t0;
    return { json: null, latency_ms, error: error.message };
  }
}

function featuresFrom(result, latency_ms, method = "listHomes") {
  // Handle Airbnb agent response structure
  const ok = !!result?.result?.content?.[0]?.text || !!result?.result;

  let data = null;
  let listings = [];

  // Airbnb returns results in content[0].text as JSON string
  if (result?.result?.content?.[0]?.text) {
    try {
      data = JSON.parse(result.result.content[0].text);
      listings = Array.isArray(data) ? data : [];
    } catch (e) {
      data = result.result.content[0].text;
    }
  } else if (result?.result) {
    data = result.result;
  }

  const json_valid = !!data && (typeof data === "object" || typeof data === "string");

  // Price transparency varies by method
  let price_transparency = false;
  if (method === "listHomes") {
    // Airbnb listings include: id, name, description, stars, price
    price_transparency = listings.length
      ? listings.every(l => typeof l?.price === "number")
      : false;
  } else if (method === "reserveHome") {
    // Reservation response: {success, bookingId, message}
    price_transparency = !!data?.success;
  }

  // Completeness varies by method
  let completeness_ratio = 0.0;
  if (method === "listHomes") {
    // Required fields for Airbnb: id, name, description, stars, price
    completeness_ratio = listings.length
      ? listings.map(l => ["id","name","description","stars","price"]
        .filter(k => l[k] !== undefined && l[k] !== null).length / 5)
        .reduce((a,b)=>a+b,0) / listings.length
      : 0.0;
  } else if (method === "reserveHome") {
    // Required fields for reservation: success, bookingId, message
    const requiredFields = ["success", "bookingId", "message"];
    completeness_ratio = requiredFields.filter(k => data?.[k] !== undefined).length / requiredFields.length;
  }

  // Freshness - assume current for demo data
  const freshness_hours = 0; // Airbnb demo doesn't include timestamps

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
      booking_completed: false,
      overall_success: false
    }
  };

  // Step 1: List homes
  console.log("  📋 Step 1/2: Listing available homes...");
  const searchResult = await callMcp(url, bookingFlowTemplate.search.method, bookingFlowTemplate.search.params);
  const searchFeatures = featuresFrom(searchResult.json, searchResult.latency_ms, "listHomes");

  flowResults.steps.push({
    step: "search",
    method: bookingFlowTemplate.search.method,
    features: searchFeatures,
    raw_result: searchResult.json
  });

  // Parse Airbnb response (returns JSON in content[0].text)
  let homes = [];
  let firstHome = null;

  if (searchResult.json?.result?.content?.[0]?.text) {
    try {
      homes = JSON.parse(searchResult.json.result.content[0].text);
      if (Array.isArray(homes) && homes.length > 0) {
        firstHome = homes[0];
      }
    } catch (e) {
      console.log(`  ❌ Failed to parse homes response: ${e.message}`);
    }
  }

  if (!searchFeatures.ok || !firstHome) {
    console.log("  ❌ Search failed or returned no results");
    return flowResults;
  }

  flowResults.completion_status.search_completed = true;
  console.log(`  ✅ Search completed. Found ${homes.length} home(s). First home: ${firstHome.name} (ID: ${firstHome.id}, Price: $${firstHome.price})`);

  // Step 2: Reserve home (if enabled)
  if (TEST_BOOKING_FLOW) {
    console.log("  🎫 Step 2/2: Reserving home (test simulation)...");
    const bookParams = { ...bookingFlowTemplate.book.params, homeId: firstHome.id };
    const bookResult = await callMcp(url, bookingFlowTemplate.book.method, bookParams);
    const bookFeatures = featuresFrom(bookResult.json, bookResult.latency_ms, "reserveHome");

    flowResults.steps.push({
      step: "book",
      method: bookingFlowTemplate.book.method,
      features: bookFeatures,
      raw_result: bookResult.json
    });

    // Parse reservation response
    let reservation = null;
    if (bookResult.json?.result?.content?.[0]?.text) {
      try {
        reservation = JSON.parse(bookResult.json.result.content[0].text);
      } catch (e) {
        console.log(`  ❌ Failed to parse reservation response: ${e.message}`);
      }
    }

    if (!bookFeatures.ok || !reservation?.success) {
      console.log(`  ❌ Booking failed: ${reservation?.message || "Unknown error"}`);
    } else {
      flowResults.completion_status.booking_completed = true;
      console.log(`  ✅ Booking completed. Booking ID: ${reservation.bookingId}, Message: ${reservation.message}`);
    }
  }

  // Overall success if all enabled steps completed
  flowResults.completion_status.overall_success =
    flowResults.completion_status.search_completed &&
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
