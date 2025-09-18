/**
 * TD-005 Phase 2: Memory-Optimized Jest Setup
 *
 * Enhanced setup for memory-optimized testing with comprehensive cleanup
 * and monitoring. Maintains Phase 1 emergency fixes while adding Phase 2
 * memory management and infrastructure restoration capabilities.
 *
 * @version 2.0 (TD-005 Phase 2)
 * @author gendev-test-suite-generator
 * @priority High (Infrastructure Restoration)
 */

import { memoryLeakResolver } from "./__tests__/__fixes__/memory-leak-resolution.js";
import { databaseStateManager } from "./__tests__/__fixes__/database-state-manager.js";

// Global test timeout for memory optimization
jest.setTimeout(15000); // Maintain Phase 1 emergency timeout

// Memory monitoring setup
let initialMemoryUsage = null;
let testStartMemory = null;
let memoryWarningThreshold = 400 * 1024 * 1024; // 400MB warning threshold

/**
 * Enhanced beforeAll setup for memory optimization
 */
beforeAll(async () => {
  console.log("🚀 Memory-Optimized Test Suite Starting...");

  // Capture initial memory state
  if (process.memoryUsage) {
    initialMemoryUsage = process.memoryUsage();
    console.log(
      `📊 Initial Memory: ${(initialMemoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`,
    );
  }

  // Initialize database state manager
  try {
    await databaseStateManager.initialize();
    console.log("✅ Database State Manager initialized");
  } catch (error) {
    console.warn(
      "⚠️ Database State Manager initialization warning:",
      error.message,
    );
  }

  // Force initial garbage collection
  if (global.gc) {
    global.gc();
    console.log("🧹 Initial garbage collection completed");
  }

  // Set up memory monitoring interval
  global.memoryMonitorInterval = setInterval(() => {
    if (process.memoryUsage) {
      const current = process.memoryUsage();
      const currentMB = current.heapUsed / 1024 / 1024;

      if (currentMB > memoryWarningThreshold / 1024 / 1024) {
        console.warn(
          `⚠️ Memory usage high: ${currentMB.toFixed(1)}MB (threshold: ${(memoryWarningThreshold / 1024 / 1024).toFixed(1)}MB)`,
        );
      }
    }
  }, 30000); // Check every 30 seconds

  console.log("✅ Memory-Optimized Test Suite Setup Complete");
});

/**
 * Enhanced afterAll cleanup for memory optimization
 */
afterAll(async () => {
  console.log("🧹 Memory-Optimized Test Suite Cleanup Starting...");

  // Clear memory monitoring interval
  if (global.memoryMonitorInterval) {
    clearInterval(global.memoryMonitorInterval);
    global.memoryMonitorInterval = null;
  }

  // Database cleanup
  try {
    await databaseStateManager.cleanup();
    console.log("✅ Database State Manager cleaned up");
  } catch (error) {
    console.warn("⚠️ Database cleanup warning:", error.message);
  }

  // Clear all Jest mocks and timers
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.restoreAllMocks();

  // Force comprehensive garbage collection
  memoryLeakResolver.forceGarbageCollection();

  // Final memory report
  if (process.memoryUsage && initialMemoryUsage) {
    const finalMemory = process.memoryUsage();
    const memoryGrowth = finalMemory.heapUsed - initialMemoryUsage.heapUsed;
    const finalMB = finalMemory.heapUsed / 1024 / 1024;
    const growthMB = memoryGrowth / 1024 / 1024;

    console.log(
      `📊 Final Memory: ${finalMB.toFixed(1)}MB (growth: ${growthMB >= 0 ? "+" : ""}${growthMB.toFixed(1)}MB)`,
    );

    // Check TD-005 compliance
    const isCompliant = finalMemory.heapUsed < 512 * 1024 * 1024; // 512MB limit
    console.log(
      `🎯 TD-005 Compliance: ${isCompliant ? "✅ COMPLIANT" : "❌ NON-COMPLIANT"} (<512MB)`,
    );

    if (!isCompliant) {
      console.error(
        "❌ CRITICAL: Memory usage exceeds TD-005 Phase 2 requirements!",
      );
    }
  }

  console.log("✅ Memory-Optimized Test Suite Cleanup Complete");
});

/**
 * Enhanced beforeEach setup for individual tests
 */
beforeEach(async () => {
  // Capture test start memory
  if (process.memoryUsage) {
    testStartMemory = process.memoryUsage();
  }

  // Take memory snapshot
  memoryLeakResolver.takeMemorySnapshot();

  // Clear any existing mocks and timers
  jest.clearAllMocks();
  jest.clearAllTimers();

  // Force garbage collection before each test
  if (global.gc) {
    global.gc();
  }
});

/**
 * Enhanced afterEach cleanup for individual tests
 */
afterEach(async () => {
  // Get current test name for logging
  const testName = expect.getState().currentTestName || "unknown";

  try {
    // Comprehensive cleanup using memory leak resolver
    memoryLeakResolver.performComprehensiveCleanup({
      container: global.document
        ? global.document.getElementById("test-container")
        : null,
      document: global.document,
      teamsManager: global.teamsManager,
      accessibilityTester: global.accessibilityTester,
      teamBuilder: global.teamBuilder,
    });

    // Clear global test references
    global.teamsManager = null;
    global.accessibilityTester = null;
    global.teamBuilder = null;

    // Memory usage reporting
    if (process.memoryUsage && testStartMemory) {
      const currentMemory = process.memoryUsage();
      const testMemoryGrowth =
        currentMemory.heapUsed - testStartMemory.heapUsed;
      const testGrowthMB = testMemoryGrowth / 1024 / 1024;

      // Log memory growth for tests that use significant memory
      if (Math.abs(testGrowthMB) > 10) {
        // 10MB threshold
        console.log(
          `  📊 Test "${testName}" memory impact: ${testGrowthMB >= 0 ? "+" : ""}${testGrowthMB.toFixed(1)}MB`,
        );
      }

      // Warning for excessive memory growth
      if (testGrowthMB > 50) {
        // 50MB warning threshold
        console.warn(
          `  ⚠️ Test "${testName}" excessive memory growth: +${testGrowthMB.toFixed(1)}MB`,
        );
      }
    }
  } catch (error) {
    console.error(`❌ Cleanup error for test "${testName}":`, error);
    // Continue with forced cleanup even if normal cleanup fails
    memoryLeakResolver.forceGarbageCollection();
  }
});

/**
 * Global error handlers for uncaught exceptions
 */
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit process, let Jest handle it
});

process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error);
  // Don't exit process, let Jest handle it
});

/**
 * Custom matchers for memory testing
 */
expect.extend({
  toBeWithinMemoryLimit(received, limit = 512) {
    const limitBytes = limit * 1024 * 1024;
    const pass = received < limitBytes;
    const receivedMB = (received / 1024 / 1024).toFixed(1);

    if (pass) {
      return {
        message: () =>
          `Expected memory usage ${receivedMB}MB to exceed ${limit}MB`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected memory usage ${receivedMB}MB to be within ${limit}MB limit`,
        pass: false,
      };
    }
  },

  toHaveMemoryGrowthBelow(received, baseline, maxGrowthMB = 50) {
    const growth = received - baseline;
    const growthMB = growth / 1024 / 1024;
    const pass = growthMB <= maxGrowthMB;

    if (pass) {
      return {
        message: () =>
          `Expected memory growth ${growthMB.toFixed(1)}MB to exceed ${maxGrowthMB}MB`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected memory growth ${growthMB.toFixed(1)}MB to be below ${maxGrowthMB}MB`,
        pass: false,
      };
    }
  },
});

/**
 * Global test utilities for memory management
 */
global.getMemoryUsage = () => {
  if (process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      heapUsedMB: (usage.heapUsed / 1024 / 1024).toFixed(1),
      heapTotalMB: (usage.heapTotal / 1024 / 1024).toFixed(1),
      externalMB: (usage.external / 1024 / 1024).toFixed(1),
      raw: usage,
    };
  }
  return null;
};

global.forceGarbageCollection = () => {
  if (global.gc) {
    global.gc();
    return true;
  }
  return false;
};

global.checkMemoryCompliance = () => {
  if (process.memoryUsage) {
    const usage = process.memoryUsage();
    const isCompliant = usage.heapUsed < 512 * 1024 * 1024;
    return {
      compliant: isCompliant,
      usage: usage.heapUsed,
      usageMB: (usage.heapUsed / 1024 / 1024).toFixed(1),
      limit: 512,
    };
  }
  return null;
};

// Console enhancement for memory information
const originalLog = console.log;
console.log = (...args) => {
  // Add memory info to specific log messages
  if (args[0] && typeof args[0] === "string" && args[0].includes("Memory")) {
    const memInfo = global.getMemoryUsage();
    if (memInfo) {
      originalLog(...args, `[Current: ${memInfo.heapUsedMB}MB]`);
      return;
    }
  }
  originalLog(...args);
};

console.log("✅ Memory-Optimized Jest Setup Loaded");

// Export for use in tests
export { memoryLeakResolver, databaseStateManager, memoryWarningThreshold };
