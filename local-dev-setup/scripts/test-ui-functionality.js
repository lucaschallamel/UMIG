// Test UI Functionality - Browser Console Script
// Run this in the browser console where the DatabaseVersionManager is loaded

console.log("=== Testing US-088-B Enhanced Package Generation ===");

// Test function to verify component functionality
function testPackageGeneration() {
  console.log("\n🧪 Testing package generation functionality...");

  // Check if DatabaseVersionManager is available
  if (typeof window.DatabaseVersionManager === "undefined") {
    console.error("❌ DatabaseVersionManager not found on window object");
    return false;
  }

  const manager = window.DatabaseVersionManager;
  console.log("✅ DatabaseVersionManager found");

  // Test SQL Package Generation
  try {
    console.log("\n📦 Testing generateSQLPackage()...");
    const sqlResult = manager.generateSQLPackage();

    if (sqlResult && typeof sqlResult.then === "function") {
      // It's a promise
      sqlResult
        .then((result) => {
          console.log("✅ SQL Package generated successfully");
          console.log("- Version:", result.metadata?.version);
          console.log("- Format:", result.metadata?.format);
          console.log("- Checksum:", result.checksum);
          console.log(
            "- Script length:",
            result.deploymentScript?.length,
            "characters",
          );
        })
        .catch((err) => {
          console.error("❌ SQL Package generation failed:", err);
        });
    } else if (sqlResult) {
      console.log("✅ SQL Package generated successfully (sync)");
      console.log("- Version:", sqlResult.metadata?.version);
      console.log("- Format:", sqlResult.metadata?.format);
      console.log("- Checksum:", sqlResult.checksum);
    }
  } catch (error) {
    console.error("❌ Error testing SQL package generation:", error);
  }

  // Test Liquibase Package Generation
  try {
    console.log("\n🔧 Testing generateLiquibasePackage()...");
    const liquibaseResult = manager.generateLiquibasePackage();

    if (liquibaseResult && typeof liquibaseResult.then === "function") {
      // It's a promise
      liquibaseResult
        .then((result) => {
          console.log("✅ Liquibase Package generated successfully");
          console.log("- Version:", result.metadata?.version);
          console.log("- Format:", result.metadata?.format);
          console.log("- Checksum:", result.checksum);
          console.log(
            "- Script length:",
            result.deploymentScript?.length,
            "characters",
          );
        })
        .catch((err) => {
          console.error("❌ Liquibase Package generation failed:", err);
        });
    } else if (liquibaseResult) {
      console.log("✅ Liquibase Package generated successfully (sync)");
      console.log("- Version:", liquibaseResult.metadata?.version);
      console.log("- Format:", liquibaseResult.metadata?.format);
      console.log("- Checksum:", liquibaseResult.checksum);
    }
  } catch (error) {
    console.error("❌ Error testing Liquibase package generation:", error);
  }

  return true;
}

// Test the UI buttons if they exist
function testUIButtons() {
  console.log("\n🔘 Testing UI buttons...");

  const testContainer = document.getElementById("test-container");
  if (testContainer) {
    console.log("✅ Test container found");

    const sqlButton = testContainer.querySelector("button");
    if (sqlButton) {
      console.log("✅ Test buttons found");
      console.log("- Button text:", sqlButton.textContent);
    }
  } else {
    console.log("ℹ️ Test container not found (may not be rendered yet)");
  }
}

// Run all tests
console.log("🚀 Starting comprehensive functionality test...");
testPackageGeneration();
testUIButtons();

console.log("\n✨ Test script loaded. You can run individual functions:");
console.log("- testPackageGeneration()");
console.log("- testUIButtons()");
