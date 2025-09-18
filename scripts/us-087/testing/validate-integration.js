/**
 * US-087 Integration Validation Script
 *
 * Run this AFTER running confluence-macro-integration-fixed.js
 * to verify everything is working correctly.
 */

(function () {
  console.log("\n=====================================");
  console.log("🔍 US-087 Integration Validation");
  console.log("=====================================\n");

  // Track validation results
  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  // Test 1: Check if adminGui exists
  console.log("1️⃣ Checking adminGui...");
  if (window.adminGui) {
    results.passed.push("✅ adminGui found in window");
    console.log("   ✅ adminGui is available");
  } else {
    results.failed.push("❌ adminGui not found");
    console.log("   ❌ adminGui is missing");
  }

  // Test 2: Check if FeatureToggle exists and is initialized
  console.log("\n2️⃣ Checking FeatureToggle...");
  if (window.FeatureToggle) {
    results.passed.push("✅ FeatureToggle class available");
    console.log("   ✅ FeatureToggle class exists");

    if (window.adminGui && window.adminGui.featureToggle) {
      results.passed.push("✅ FeatureToggle instance initialized");
      console.log("   ✅ FeatureToggle instance created");

      // Check if it has the expected methods
      const ft = window.adminGui.featureToggle;
      if (ft.enable && ft.disable && ft.isEnabled) {
        results.passed.push("✅ FeatureToggle methods available");
        console.log("   ✅ All methods available");
      }
    } else {
      results.warnings.push("⚠️ FeatureToggle not initialized on adminGui");
      console.log("   ⚠️ Instance not attached to adminGui");
    }
  } else {
    results.failed.push("❌ FeatureToggle class not found");
    console.log("   ❌ FeatureToggle class missing");
  }

  // Test 3: Check if PerformanceMonitor exists
  console.log("\n3️⃣ Checking PerformanceMonitor...");
  if (window.PerformanceMonitor) {
    results.passed.push("✅ PerformanceMonitor class available");
    console.log("   ✅ PerformanceMonitor class exists");

    if (window.adminGui && window.adminGui.performanceMonitor) {
      results.passed.push("✅ PerformanceMonitor instance initialized");
      console.log("   ✅ PerformanceMonitor instance created");
    } else {
      results.warnings.push(
        "⚠️ PerformanceMonitor not initialized on adminGui",
      );
      console.log("   ⚠️ Instance not attached to adminGui");
    }
  } else {
    results.failed.push("❌ PerformanceMonitor class not found");
    console.log("   ❌ PerformanceMonitor class missing");
  }

  // Test 4: Check if component migration is initialized
  console.log("\n4️⃣ Checking Component Migration...");
  if (window.adminGui && window.adminGui.shouldUseComponentManager) {
    results.passed.push("✅ Component migration function available");
    console.log("   ✅ shouldUseComponentManager function exists");

    // Test the function
    const shouldUseForTeams =
      window.adminGui.shouldUseComponentManager("teams");
    console.log(
      `   📊 Teams component manager: ${shouldUseForTeams ? "ENABLED" : "DISABLED"}`,
    );
  } else {
    results.warnings.push("⚠️ Component migration not initialized");
    console.log("   ⚠️ shouldUseComponentManager not available");
  }

  // Test 5: Check if test panel exists
  console.log("\n5️⃣ Checking Test Panel...");
  const testPanel = document.getElementById("us087-test-panel");
  if (testPanel) {
    results.passed.push("✅ Test panel is visible");
    console.log("   ✅ Test panel found in DOM");
  } else {
    results.warnings.push("⚠️ Test panel not visible");
    console.log(
      "   ⚠️ Test panel not found - may need to run integration script",
    );
  }

  // Test 6: Check localStorage for feature flags
  console.log("\n6️⃣ Checking Feature Flag Persistence...");
  try {
    const flags = localStorage.getItem("featureFlags");
    if (flags) {
      const parsed = JSON.parse(flags);
      console.log("   📦 Stored flags:", parsed);
      results.passed.push("✅ Feature flags persisted in localStorage");
    } else {
      console.log("   📭 No flags stored yet");
      results.warnings.push("⚠️ No feature flags in localStorage yet");
    }
  } catch (e) {
    results.warnings.push("⚠️ Could not read localStorage");
    console.log("   ⚠️ localStorage access issue:", e.message);
  }

  // Test 7: Try to enable a feature
  console.log("\n7️⃣ Testing Feature Toggle...");
  if (window.adminGui && window.adminGui.featureToggle) {
    try {
      // Enable migration
      window.adminGui.featureToggle.enable("admin-gui-migration");
      const isEnabled = window.adminGui.featureToggle.isEnabled(
        "admin-gui-migration",
      );

      if (isEnabled) {
        results.passed.push("✅ Feature toggle working correctly");
        console.log("   ✅ Successfully enabled admin-gui-migration");

        // Disable it again
        window.adminGui.featureToggle.disable("admin-gui-migration");
        console.log("   ✅ Successfully disabled admin-gui-migration");
      } else {
        results.failed.push("❌ Feature toggle not working");
        console.log("   ❌ Could not enable feature");
      }
    } catch (e) {
      results.failed.push("❌ Feature toggle error");
      console.log("   ❌ Error testing feature toggle:", e.message);
    }
  } else {
    console.log("   ⏭️ Skipping - feature toggle not available");
  }

  // Final Summary
  console.log("\n=====================================");
  console.log("📊 VALIDATION SUMMARY");
  console.log("=====================================");

  console.log(`\n✅ Passed: ${results.passed.length}`);
  results.passed.forEach((p) => console.log(`   ${p}`));

  if (results.warnings.length > 0) {
    console.log(`\n⚠️ Warnings: ${results.warnings.length}`);
    results.warnings.forEach((w) => console.log(`   ${w}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach((f) => console.log(`   ${f}`));
  }

  // Overall status
  console.log("\n=====================================");
  if (results.failed.length === 0) {
    console.log("🎉 VALIDATION SUCCESSFUL!");
    console.log("Your US-087 Phase 1 integration is working correctly.");
    console.log("\nNext steps:");
    console.log('1. Click "Toggle Migration" in the test panel');
    console.log('2. Click "Toggle Teams" to enable Teams component');
    console.log(
      "3. Navigate to Teams section to see the new component in action",
    );
  } else {
    console.log("⚠️ VALIDATION INCOMPLETE");
    console.log("Some components are not working correctly.");
    console.log("\nTroubleshooting:");
    console.log(
      "1. Make sure you ran confluence-macro-integration-fixed.js first",
    );
    console.log("2. Check the browser console for any errors");
    console.log("3. Try refreshing the page and running the scripts again");
  }
  console.log("=====================================\n");

  // Store results globally for debugging
  window.US087ValidationResults = results;
  console.log("💾 Results saved to window.US087ValidationResults");
})();
