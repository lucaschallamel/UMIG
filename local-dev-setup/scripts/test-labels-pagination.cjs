#!/usr/bin/env node

/**
 * Test Labels API Pagination
 * Diagnose the pagination count discrepancy (20 vs 30 records)
 */

const { execSync } = require("child_process");

const BASE_URL = "http://localhost:8090/rest/scriptrunner/latest/custom";

async function testLabelsPagination() {
  console.log("🧪 Testing Labels API Pagination...\n");

  try {
    // Test 1: Default call (no parameters)
    console.log("📋 Test 1: Default API call");

    const curlCmd1 = `curl -s -u "admin:123456" "${BASE_URL}/labels"`;
    const response1 = execSync(curlCmd1, { encoding: "utf-8" });

    try {
      const data1 = JSON.parse(response1);
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
    } catch (parseError) {
      console.log("❌ Failed to parse response:", response1.substring(0, 200));
    }

    // Test 2: Explicit pagination call
    console.log("\n📋 Test 2: Explicit pagination (page=1, size=50)");

    const curlCmd2 = `curl -s -u "admin:123456" "${BASE_URL}/labels?page=1&size=50"`;
    const response2 = execSync(curlCmd2, { encoding: "utf-8" });

    try {
      const data2 = JSON.parse(response2);
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
    } catch (parseError) {
      console.log(
        "❌ Failed to parse pagination response:",
        response2.substring(0, 200),
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
