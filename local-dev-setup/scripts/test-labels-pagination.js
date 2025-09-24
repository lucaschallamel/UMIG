#!/usr/bin/env node

/**
 * Test Labels API Pagination
 * Diagnose the pagination count discrepancy (20 vs 30 records)
 */

import fetch from "node:fetch";
import { execSync } from "child_process";

const BASE_URL = "http://localhost:8090/rest/scriptrunner/latest/custom";

async function testLabelsPagination() {
  console.log("🧪 Testing Labels API Pagination...\n");

  try {
    // Test 1: Default call (no parameters)
    console.log("📋 Test 1: Default API call");
    const response1 = await fetch(`${BASE_URL}/labels`, {
      method: "GET",
      headers: {
        Authorization:
          "Basic " + Buffer.from("admin:123456").toString("base64"),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (response1.ok) {
      const data1 = await response1.json();
      console.log(
        "✅ Response structure:",
        JSON.stringify(
          {
            hasItems: !!data1.items,
            hasData: !!data1.data,
            isArray: Array.isArray(data1),
            itemsLength: data1.items?.length,
            dataLength: data1.data?.length,
            arrayLength: Array.isArray(data1) ? data1.length : null,
            total: data1.total,
            page: data1.page,
            size: data1.size,
            totalPages: data1.totalPages,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        "❌ Default call failed:",
        response1.status,
        response1.statusText,
      );
    }

    // Test 2: Explicit pagination call
    console.log("\n📋 Test 2: Explicit pagination (page=1, size=50)");
    const response2 = await fetch(`${BASE_URL}/labels?page=1&size=50`, {
      method: "GET",
      headers: {
        Authorization:
          "Basic " + Buffer.from("admin:123456").toString("base64"),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (response2.ok) {
      const data2 = await response2.json();
      console.log(
        "✅ Paginated response:",
        JSON.stringify(
          {
            itemsCount: data2.items?.length,
            total: data2.total,
            page: data2.page,
            size: data2.size,
            totalPages: data2.totalPages,
            firstFewItems: data2.items
              ?.slice(0, 3)
              .map((item) => ({ id: item.id, name: item.name })),
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        "❌ Paginated call failed:",
        response2.status,
        response2.statusText,
      );
    }

    // Test 3: Check database directly
    console.log("\n📋 Test 3: Direct database count");
    try {
      const dbCount = execSync(
        'PGPASSWORD="123456" psql -h localhost -p 5432 -U "umig_app_user" -d "umig_app_db" -t -c "SELECT COUNT(*) FROM labels_lbl;"',
        { encoding: "utf-8" },
      );
      console.log("✅ Database count:", parseInt(dbCount.trim()));
    } catch (error) {
      console.log("❌ Database check failed:", error.message);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testLabelsPagination().catch(console.error);
