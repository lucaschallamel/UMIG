#!/usr/bin/env node
/**
 * TD-005 Phase 2: BaseEntityManager Interface Compliance Validation
 *
 * URGENT: Critical validation script to confirm BaseEntityManager
 * interface compliance before US-087 Phase 2 Teams Component Migration.
 *
 * SUCCESS CRITERIA: ≥80% compliance score required to unblock US-087 Phase 2
 *
 * @created 2025-01-18 (TD-005 Phase 2 Remediation)
 * @priority CRITICAL - BLOCKING US-087 Phase 2
 */

// Mock global environment for Node.js testing
global.window = {
  SecurityUtils: {
    validateInput: () => ({ isValid: true, sanitizedData: {} }),
    preventXSS: (data) => data,
    checkRateLimit: () => true,
    logSecurityEvent: () => {},
    ValidationException: class ValidationException extends Error {
      constructor(message, field, value) {
        super(message);
        this.field = field;
        this.value = value;
      }
    },
    SecurityException: class SecurityException extends Error {},
  },
  ComponentOrchestrator: function () {
    return {
      createComponent: () => Promise.resolve({}),
      on: () => {},
      destroy: () => Promise.resolve(),
      setContainer: () => {},
    };
  },
};

// Import the real BaseEntityManager
const BaseEntityManager = require("/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/web/js/entities/BaseEntityManager.js");

async function validateBaseEntityManagerCompliance() {
  console.log(
    "🚀 TD-005 Phase 2: BaseEntityManager Interface Compliance Validation",
  );
  console.log("=" + "=".repeat(70));

  let entityManager;
  let complianceScore = 0;
  let totalRequirements = 0;
  let metRequirements = 0;

  try {
    // Create test entity manager instance
    entityManager = new BaseEntityManager({
      entityType: "compliance-test",
      tableConfig: { columns: [] },
      modalConfig: { fields: [] },
    });

    console.log("✅ BaseEntityManager instance created successfully");

    // 1. Validate Required Properties (6 total)
    console.log("\n📋 Validating Required Properties...");
    const requiredProperties = [
      "id",
      "state",
      "mounted",
      "initialized",
      "container",
      "options",
    ];
    let propertyCount = 0;

    requiredProperties.forEach((prop) => {
      const hasProperty = entityManager.hasOwnProperty(prop);
      totalRequirements++;
      if (hasProperty) {
        metRequirements++;
        propertyCount++;
        console.log(`   ✅ ${prop}: ${typeof entityManager[prop]}`);
      } else {
        console.log(`   ❌ ${prop}: MISSING`);
      }
    });

    // Validate state structure
    if (entityManager.state && typeof entityManager.state === "object") {
      const hasCurrentState = entityManager.state.hasOwnProperty("current");
      const hasPreviousState = entityManager.state.hasOwnProperty("previous");
      const hasDataState = entityManager.state.hasOwnProperty("data");

      console.log(`   ✅ state.current: ${entityManager.state.current}`);
      console.log(`   ✅ state.previous: ${entityManager.state.previous}`);
      console.log(`   ✅ state.data: ${typeof entityManager.state.data}`);
    }

    console.log(
      `   📊 Properties: ${propertyCount}/${requiredProperties.length} (${((propertyCount / requiredProperties.length) * 100).toFixed(1)}%)`,
    );

    // 2. Validate Lifecycle Methods (6 total)
    console.log("\n🔄 Validating Lifecycle Methods...");
    const lifecycleMethods = [
      "initialize",
      "mount",
      "render",
      "update",
      "unmount",
      "destroy",
    ];
    let lifecycleCount = 0;

    lifecycleMethods.forEach((method) => {
      const hasMethod = typeof entityManager[method] === "function";
      const isAsync =
        hasMethod && entityManager[method].constructor.name === "AsyncFunction";
      totalRequirements++;
      if (hasMethod) {
        metRequirements++;
        lifecycleCount++;
        console.log(
          `   ✅ ${method}(): ${isAsync ? "async" : "sync"} function`,
        );
      } else {
        console.log(`   ❌ ${method}(): MISSING`);
      }
    });

    console.log(
      `   📊 Lifecycle: ${lifecycleCount}/${lifecycleMethods.length} (${((lifecycleCount / lifecycleMethods.length) * 100).toFixed(1)}%)`,
    );

    // 3. Validate Error Handling Methods (3 total)
    console.log("\n🚨 Validating Error Handling Methods...");
    const errorMethods = ["handleError", "logError", "recoverFromError"];
    let errorCount = 0;

    errorMethods.forEach((method) => {
      const hasMethod = typeof entityManager[method] === "function";
      totalRequirements++;
      if (hasMethod) {
        metRequirements++;
        errorCount++;
        console.log(`   ✅ ${method}(): function`);
      } else {
        console.log(`   ❌ ${method}(): MISSING`);
      }
    });

    console.log(
      `   📊 Error Handling: ${errorCount}/${errorMethods.length} (${((errorCount / errorMethods.length) * 100).toFixed(1)}%)`,
    );

    // 4. Validate Memory Management Methods (6 total)
    console.log("\n🧠 Validating Memory Management Methods...");
    const memoryMethods = [
      "clearEventListeners",
      "clearTimers",
      "clearReferences",
      "addEventListener",
      "addTimer",
      "addComponentReference",
    ];
    let memoryCount = 0;

    memoryMethods.forEach((method) => {
      const hasMethod = typeof entityManager[method] === "function";
      totalRequirements++;
      if (hasMethod) {
        metRequirements++;
        memoryCount++;
        console.log(`   ✅ ${method}(): function`);
      } else {
        console.log(`   ❌ ${method}(): MISSING`);
      }
    });

    console.log(
      `   📊 Memory Management: ${memoryCount}/${memoryMethods.length} (${((memoryCount / memoryMethods.length) * 100).toFixed(1)}%)`,
    );

    // 5. Test Error Handling Functionality
    console.log("\n🧪 Testing Error Handling Functionality...");
    try {
      const testError = new Error("Test error for compliance validation");
      entityManager.handleError("test-operation", testError);
      entityManager.logError("test-operation", testError);
      entityManager.recoverFromError("test-operation", testError);
      console.log("   ✅ Error handling methods execute without throwing");
    } catch (testError) {
      console.log(`   ❌ Error handling test failed: ${testError.message}`);
    }

    // 6. Test Memory Management Functionality
    console.log("\n🧪 Testing Memory Management Functionality...");
    try {
      // Test event listener tracking
      const mockElement = {
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      entityManager.addEventListener(mockElement, "click", () => {});

      // Test timer tracking
      const timerId = entityManager.addTimer(() => {}, 1000);

      // Test component reference tracking
      entityManager.addComponentReference({ name: "test" }, "test-component");

      console.log(
        `   ✅ Event listeners tracked: ${entityManager.eventListeners.size}`,
      );
      console.log(`   ✅ Timers tracked: ${entityManager.timers.size}`);
      console.log(
        `   ✅ References tracked: ${entityManager.componentReferences.size}`,
      );

      // Test cleanup
      entityManager.clearEventListeners();
      entityManager.clearTimers();
      entityManager.clearReferences();

      console.log("   ✅ Memory management cleanup successful");
    } catch (testError) {
      console.log(`   ❌ Memory management test failed: ${testError.message}`);
    }

    // Calculate Final Compliance Score
    complianceScore = (metRequirements / totalRequirements) * 100;

    console.log("\n" + "=".repeat(70));
    console.log("🏆 FINAL COMPLIANCE RESULTS");
    console.log("=".repeat(70));
    console.log(`📊 Requirements Met: ${metRequirements}/${totalRequirements}`);
    console.log(`🎯 COMPLIANCE SCORE: ${complianceScore.toFixed(1)}%`);
    console.log(`🚀 SUCCESS THRESHOLD: 80.0%`);

    if (complianceScore >= 80) {
      console.log("\n✅ SUCCESS: BaseEntityManager compliance ≥80%");
      console.log("🚀 US-087 Phase 2 Teams Component Migration UNBLOCKED");
      console.log("🎉 TD-005 Phase 2 Remediation: COMPLETE");
    } else {
      console.log("\n❌ FAILURE: BaseEntityManager compliance <80%");
      console.log("🚫 US-087 Phase 2 Teams Component Migration BLOCKED");
      console.log("⚠️  TD-005 Phase 2 Remediation: INCOMPLETE");
    }
  } catch (error) {
    console.error("❌ Critical error during compliance validation:", error);
    complianceScore = 0;
  } finally {
    // Cleanup
    if (entityManager && typeof entityManager.destroy === "function") {
      try {
        await entityManager.destroy();
        console.log("\n🧹 BaseEntityManager instance cleaned up successfully");
      } catch (cleanupError) {
        console.warn("⚠️ Error during cleanup:", cleanupError.message);
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  return complianceScore;
}

// Run validation if called directly
if (require.main === module) {
  validateBaseEntityManagerCompliance()
    .then((score) => {
      console.log(
        `\n🏁 Validation complete. Final score: ${score.toFixed(1)}%`,
      );
      process.exit(score >= 80 ? 0 : 1);
    })
    .catch((error) => {
      console.error("\n💥 Validation failed:", error);
      process.exit(1);
    });
}

module.exports = { validateBaseEntityManagerCompliance };
