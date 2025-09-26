/**
 * Debug Script for DatabaseVersionManager UI Integration Issue
 *
 * This script helps diagnose why the new package generation functionality
 * is not appearing in the UI despite proper API registration.
 *
 * Issue: Component likely entering secure mode due to initialization failure
 */

// Debug functions to add to browser console
window.debugDatabaseVersionManager = {
  /**
   * Check if DatabaseVersionManager is in secure mode
   */
  checkSecureMode() {
    const dvm = window.DatabaseVersionManager;
    if (!dvm) {
      console.error("❌ DatabaseVersionManager not found on window");
      return;
    }

    console.log("🔍 DatabaseVersionManager Security Status:");
    console.log("- Secure Mode:", dvm.secureMode || false);
    console.log("- Security State:", dvm.securityState);
    console.log(
      "- Initialization Errors:",
      dvm.securityState?.initializationErrors || [],
    );

    // Test if methods are overridden
    try {
      console.log("🧪 Testing generateSQLPackage method:");
      console.log("- Method type:", typeof dvm.generateSQLPackage);
      console.log(
        "- Method source:",
        dvm.generateSQLPackage.toString().substring(0, 100) + "...",
      );
    } catch (e) {
      console.error("❌ Error testing generateSQLPackage:", e);
    }
  },

  /**
   * Check API endpoint accessibility
   */
  async testApiEndpoints() {
    console.log("🌐 Testing API Endpoints:");

    const endpoints = [
      "/rest/scriptrunner/latest/custom/databaseVersions",
      "/rest/scriptrunner/latest/custom/databaseVersions/packages/sql",
      "/rest/scriptrunner/latest/custom/databaseVersions/packages/liquibase",
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          credentials: "same-origin",
        });

        console.log(`- ${endpoint}: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const text = await response.text();
          console.log(`  Error: ${text.substring(0, 200)}`);
        }
      } catch (error) {
        console.error(`- ${endpoint}: ❌ ${error.message}`);
      }
    }
  },

  /**
   * Force reinitialize DatabaseVersionManager (dangerous - test only)
   */
  async forceReinitialize() {
    console.log("⚠️  FORCING REINITIALIZATION (TEST ONLY)");

    const dvm = window.DatabaseVersionManager;
    if (!dvm) {
      console.error("❌ DatabaseVersionManager not found");
      return;
    }

    // Reset secure mode flag
    dvm.secureMode = false;

    // Clear initialization errors
    if (dvm.securityState) {
      dvm.securityState.initializationErrors = [];
      dvm.securityState.initialized = false;
    }

    try {
      // Try to reinitialize
      await dvm.initializeAsync();
      console.log("✅ Reinitialization successful");

      // Test if methods work now
      this.testMethods();
    } catch (error) {
      console.error("❌ Reinitialization failed:", error);
    }
  },

  /**
   * Test the actual methods
   */
  async testMethods() {
    console.log("🧪 Testing Package Generation Methods:");

    const dvm = window.DatabaseVersionManager;
    if (!dvm) {
      console.error("❌ DatabaseVersionManager not found");
      return;
    }

    // Test SQL package generation
    try {
      console.log("Testing generateSQLPackage...");
      const sqlResult = await dvm.generateSQLPackage("all", "postgresql");
      console.log("✅ SQL Package generation successful:", sqlResult);
    } catch (error) {
      console.error("❌ SQL Package generation failed:", error.message);
    }

    // Test Liquibase package generation
    try {
      console.log("Testing generateLiquibasePackage...");
      const liquibaseResult = await dvm.generateLiquibasePackage("all");
      console.log(
        "✅ Liquibase Package generation successful:",
        liquibaseResult,
      );
    } catch (error) {
      console.error("❌ Liquibase Package generation failed:", error.message);
    }
  },

  /**
   * Check button event handlers
   */
  checkEventHandlers() {
    console.log("🎯 Checking Button Event Handlers:");

    const buttons = document.querySelectorAll('[data-action^="generate-"]');
    console.log(`Found ${buttons.length} generate buttons:`);

    buttons.forEach((button, index) => {
      const action = button.getAttribute("data-action");
      console.log(`- Button ${index + 1}: ${action}`);
      console.log(`  - Disabled: ${button.disabled}`);
      console.log(`  - Visible: ${button.offsetParent !== null}`);
      console.log(`  - Click handler: ${button.onclick ? "Present" : "None"}`);
    });
  },

  /**
   * Run complete diagnostic
   */
  async runDiagnostic() {
    console.log("🔍 === DatabaseVersionManager Debug Diagnostic ===");

    this.checkSecureMode();
    console.log("");

    await this.testApiEndpoints();
    console.log("");

    this.checkEventHandlers();
    console.log("");

    console.log("💡 Next Steps:");
    console.log("1. If secure mode is true, check initialization errors");
    console.log(
      "2. If API endpoints return 404, check ScriptRunner registration",
    );
    console.log(
      "3. If methods are overridden, try forceReinitialize() (test only)",
    );
    console.log("4. Check browser network tab when clicking buttons");
  },
};

console.log(
  "✅ Debug utilities loaded. Run: debugDatabaseVersionManager.runDiagnostic()",
);
