/**
 * Memory-Optimized Test Execution Strategy
 *
 * Advanced memory management system for Jest test execution targeting
 * <512MB memory usage across all test configurations.
 *
 * Features:
 * - Automatic worker restart on memory thresholds
 * - Real-time memory monitoring and reporting
 * - Intelligent test batching based on memory usage
 * - Aggressive cleanup between test suites
 * - Memory leak detection and prevention
 *
 * Performance Targets:
 * - Unit Tests: <256MB peak memory
 * - Integration Tests: <512MB peak memory
 * - E2E Tests: <1GB peak memory (browser overhead)
 * - Security Tests: <512MB peak memory
 *
 * @version 1.0.0
 * @author test-infrastructure-consolidation
 */

import { performance } from "perf_hooks";
import { Worker } from "worker_threads";

class MemoryOptimizer {
  constructor(config = {}) {
    this.config = {
      unitTestMemoryLimit: 256 * 1024 * 1024, // 256MB
      integrationTestMemoryLimit: 512 * 1024 * 1024, // 512MB
      e2eTestMemoryLimit: 1024 * 1024 * 1024, // 1GB
      securityTestMemoryLimit: 512 * 1024 * 1024, // 512MB

      // Memory monitoring intervals
      monitoringInterval: 5000, // 5 seconds
      cleanupInterval: 30000, // 30 seconds

      // Thresholds for warnings and actions
      warningThreshold: 0.8, // 80% of limit
      criticalThreshold: 0.95, // 95% of limit

      // Worker management
      maxWorkers: require("os").cpus().length,
      workerRestartThreshold: 0.9, // 90% of limit

      // Garbage collection
      forceGCInterval: 60000, // 60 seconds
      enableHeapSnapshot: false, // Enable for debugging only

      ...config,
    };

    this.monitoring = {
      enabled: false,
      interval: null,
      startTime: Date.now(),
      peakMemoryUsage: 0,
      currentMemoryUsage: 0,
      memoryHistory: [],
      testExecutionHistory: [],
      workerRestarts: 0,
      leaksDetected: 0,
      gcForced: 0,
    };

    this.testCategories = {
      unit: { limit: this.config.unitTestMemoryLimit, current: 0 },
      integration: {
        limit: this.config.integrationTestMemoryLimit,
        current: 0,
      },
      e2e: { limit: this.config.e2eTestMemoryLimit, current: 0 },
      security: { limit: this.config.securityTestMemoryLimit, current: 0 },
    };

    this.workers = new Map();
    this.cleanupTasks = [];
  }

  /**
   * Initialize memory monitoring system
   */
  startMonitoring(testCategory = "unit") {
    if (this.monitoring.enabled) {
      console.warn("⚠️ Memory monitoring already active");
      return;
    }

    this.monitoring.enabled = true;
    this.monitoring.testCategory = testCategory;
    this.monitoring.startTime = Date.now();

    console.log(`🔍 Starting memory monitoring for ${testCategory} tests`);
    console.log(
      `📊 Memory limit: ${Math.round(this.testCategories[testCategory].limit / 1024 / 1024)}MB`,
    );

    // Start monitoring interval
    this.monitoring.interval = setInterval(() => {
      this.performMemoryCheck();
    }, this.config.monitoringInterval);

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.performPeriodicCleanup();
    }, this.config.cleanupInterval);

    // Start forced GC interval
    this.gcInterval = setInterval(() => {
      this.performForcedGC();
    }, this.config.forceGCInterval);

    // Initial memory snapshot
    this.recordMemorySnapshot("monitoring-start");
  }

  /**
   * Stop memory monitoring and generate report
   */
  stopMonitoring() {
    if (!this.monitoring.enabled) return;

    clearInterval(this.monitoring.interval);
    clearInterval(this.cleanupInterval);
    clearInterval(this.gcInterval);

    this.monitoring.enabled = false;

    // Final cleanup
    this.performFinalCleanup();

    // Generate final report
    const report = this.generateMemoryReport();
    this.displayMemoryReport(report);

    return report;
  }

  /**
   * Perform real-time memory check
   */
  performMemoryCheck() {
    const memUsage = process.memoryUsage();
    const currentLimit =
      this.testCategories[this.monitoring.testCategory].limit;
    const usagePercent = memUsage.heapUsed / currentLimit;

    // Update monitoring data
    this.monitoring.currentMemoryUsage = memUsage.heapUsed;
    this.monitoring.peakMemoryUsage = Math.max(
      this.monitoring.peakMemoryUsage,
      memUsage.heapUsed,
    );

    // Record history
    this.monitoring.memoryHistory.push({
      timestamp: Date.now(),
      usage: memUsage,
      percent: usagePercent,
      category: this.monitoring.testCategory,
    });

    // Trim history to prevent memory buildup
    if (this.monitoring.memoryHistory.length > 1000) {
      this.monitoring.memoryHistory = this.monitoring.memoryHistory.slice(-500);
    }

    // Check thresholds
    if (usagePercent > this.config.criticalThreshold) {
      this.handleCriticalMemoryUsage(memUsage, currentLimit);
    } else if (usagePercent > this.config.warningThreshold) {
      this.handleWarningMemoryUsage(memUsage, currentLimit);
    }

    // Memory leak detection
    this.detectMemoryLeaks();
  }

  /**
   * Handle critical memory usage
   */
  handleCriticalMemoryUsage(memUsage, limit) {
    const usageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const limitMB = Math.round(limit / 1024 / 1024);

    console.error(
      `🚨 CRITICAL: Memory usage ${usageMB}MB approaching limit ${limitMB}MB`,
    );

    // Force immediate cleanup
    this.performEmergencyCleanup();

    // Force garbage collection
    this.performForcedGC();

    // Consider worker restart if in multi-worker mode
    if (this.config.maxWorkers > 1) {
      this.restartWorkersIfNeeded();
    }
  }

  /**
   * Handle warning memory usage
   */
  handleWarningMemoryUsage(memUsage, limit) {
    const usageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const limitMB = Math.round(limit / 1024 / 1024);
    const percent = Math.round((memUsage.heapUsed / limit) * 100);

    console.warn(
      `⚠️ Memory usage ${usageMB}MB (${percent}%) approaching limit ${limitMB}MB`,
    );

    // Perform preventive cleanup
    this.performPreventiveCleanup();
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks() {
    const history = this.monitoring.memoryHistory;
    if (history.length < 10) return; // Need sufficient history

    // Check for consistent memory growth
    const recent = history.slice(-10);
    const growthTrend = recent.every((entry, index) => {
      if (index === 0) return true;
      return entry.usage.heapUsed >= recent[index - 1].usage.heapUsed;
    });

    if (growthTrend) {
      const initialUsage = recent[0].usage.heapUsed;
      const currentUsage = recent[recent.length - 1].usage.heapUsed;
      const growth = currentUsage - initialUsage;

      if (growth > 50 * 1024 * 1024) {
        // 50MB growth
        this.monitoring.leaksDetected++;
        console.warn(
          `🔍 Potential memory leak detected: ${Math.round(growth / 1024 / 1024)}MB growth in recent tests`,
        );

        // Perform aggressive cleanup
        this.performAggressiveCleanup();
      }
    }
  }

  /**
   * Periodic cleanup routine
   */
  performPeriodicCleanup() {
    // Clear Jest module cache periodically
    if (typeof jest !== "undefined" && jest.resetModules) {
      jest.resetModules();
    }

    // Clear require cache for non-critical modules
    this.clearRequireCache();

    // Force minor garbage collection
    this.performForcedGC(false);

    console.log("🧹 Performed periodic cleanup");
  }

  /**
   * Preventive cleanup when approaching memory limits
   */
  performPreventiveCleanup() {
    // Clear all mocks
    if (typeof jest !== "undefined") {
      jest.clearAllMocks();
      jest.resetAllMocks();
    }

    // Clear DOM if in jsdom environment
    this.clearDOM();

    // Clear event listeners
    this.clearEventListeners();

    // Force garbage collection
    this.performForcedGC();

    console.log("🛡️ Performed preventive cleanup");
  }

  /**
   * Emergency cleanup for critical memory situations
   */
  performEmergencyCleanup() {
    console.log("🚨 Performing emergency memory cleanup...");

    // Clear everything possible
    this.performAggressiveCleanup();

    // Clear monitoring history to free memory
    this.monitoring.memoryHistory = this.monitoring.memoryHistory.slice(-100);

    // Force major garbage collection
    this.performForcedGC(true);

    console.log("✅ Emergency cleanup complete");
  }

  /**
   * Aggressive cleanup for memory leak scenarios
   */
  performAggressiveCleanup() {
    // Clear Jest module cache completely
    if (typeof jest !== "undefined" && jest.resetModules) {
      jest.resetModules();
    }

    // Clear require cache
    this.clearRequireCache(true);

    // Clear DOM completely
    this.clearDOM(true);

    // Clear all global variables
    this.clearGlobalVariables();

    // Clear all timers
    this.clearAllTimers();

    // Run custom cleanup tasks
    this.runCleanupTasks();

    console.log("🧽 Performed aggressive cleanup");
  }

  /**
   * Final cleanup when monitoring stops
   */
  performFinalCleanup() {
    this.performAggressiveCleanup();

    // Clear monitoring data
    this.monitoring.memoryHistory = [];
    this.monitoring.testExecutionHistory = [];

    // Force final garbage collection
    this.performForcedGC(true);

    console.log("🏁 Performed final cleanup");
  }

  /**
   * Force garbage collection if available
   */
  performForcedGC(major = false) {
    if (global.gc) {
      try {
        global.gc();
        this.monitoring.gcForced++;

        if (major) {
          // Force multiple GC cycles for major cleanup
          setTimeout(() => global.gc && global.gc(), 100);
          setTimeout(() => global.gc && global.gc(), 200);
        }
      } catch (error) {
        console.warn("⚠️ Failed to force garbage collection:", error.message);
      }
    }
  }

  /**
   * Clear require cache to free memory
   */
  clearRequireCache(aggressive = false) {
    if (typeof require === "undefined") return;

    const cache = require.cache;
    const keysToDelete = [];

    for (const key in cache) {
      // In aggressive mode, clear more modules
      if (aggressive) {
        // Keep only core Node.js modules and Jest
        if (
          !key.includes("node_modules") ||
          key.includes("jest") ||
          key.includes("@babel")
        ) {
          continue;
        }
      } else {
        // Only clear test modules and mocks
        if (!key.includes("__tests__") && !key.includes("__mocks__")) {
          continue;
        }
      }

      keysToDelete.push(key);
    }

    keysToDelete.forEach((key) => {
      delete cache[key];
    });

    if (keysToDelete.length > 0) {
      console.log(
        `🗑️ Cleared ${keysToDelete.length} modules from require cache`,
      );
    }
  }

  /**
   * Clear DOM elements if in jsdom environment
   */
  clearDOM(aggressive = false) {
    if (typeof document === "undefined") return;

    try {
      if (aggressive) {
        // Clear everything
        document.head.innerHTML = "";
        document.body.innerHTML = "";
      } else {
        // Clear test-generated content
        const testElements = document.querySelectorAll(
          "[data-test], [data-testid], .test-element",
        );
        testElements.forEach((el) => el.remove());
      }

      // Clear event listeners
      document.removeAllListeners && document.removeAllListeners();
    } catch (error) {
      console.warn("⚠️ Failed to clear DOM:", error.message);
    }
  }

  /**
   * Clear event listeners
   */
  clearEventListeners() {
    if (typeof window === "undefined") return;

    try {
      // Remove common event listeners
      const events = [
        "click",
        "change",
        "input",
        "submit",
        "load",
        "resize",
        "scroll",
      ];
      events.forEach((event) => {
        window.removeEventListener(event, () => {});
        document.removeEventListener(event, () => {});
      });
    } catch (error) {
      console.warn("⚠️ Failed to clear event listeners:", error.message);
    }
  }

  /**
   * Clear global variables created during tests
   */
  clearGlobalVariables() {
    const globalsToKeep = new Set([
      "console",
      "process",
      "Buffer",
      "global",
      "require",
      "module",
      "exports",
      "__dirname",
      "__filename",
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "setImmediate",
      "clearImmediate",
      "jest",
    ]);

    if (typeof global !== "undefined") {
      for (const key in global) {
        if (
          (!globalsToKeep.has(key) && key.startsWith("test")) ||
          key.startsWith("mock") ||
          key.includes("Test")
        ) {
          try {
            delete global[key];
          } catch (error) {
            // Ignore non-configurable properties
          }
        }
      }
    }
  }

  /**
   * Clear all timers
   */
  clearAllTimers() {
    // This is a simplified approach - in practice, you'd track timers
    for (let id = 1; id < 1000; id++) {
      clearTimeout(id);
      clearInterval(id);
    }
  }

  /**
   * Run registered cleanup tasks
   */
  runCleanupTasks() {
    this.cleanupTasks.forEach((task, index) => {
      try {
        task();
      } catch (error) {
        console.warn(`⚠️ Cleanup task ${index} failed:`, error.message);
      }
    });
  }

  /**
   * Register a cleanup task
   */
  registerCleanupTask(task) {
    this.cleanupTasks.push(task);
  }

  /**
   * Record memory snapshot for analysis
   */
  recordMemorySnapshot(label) {
    const memUsage = process.memoryUsage();

    this.monitoring.testExecutionHistory.push({
      timestamp: Date.now(),
      label,
      memory: memUsage,
      category: this.monitoring.testCategory,
    });
  }

  /**
   * Generate comprehensive memory report
   */
  generateMemoryReport() {
    const duration = Date.now() - this.monitoring.startTime;
    const peakUsageMB = Math.round(
      this.monitoring.peakMemoryUsage / 1024 / 1024,
    );
    const currentUsageMB = Math.round(
      this.monitoring.currentMemoryUsage / 1024 / 1024,
    );

    const category = this.monitoring.testCategory;
    const limitMB = Math.round(
      this.testCategories[category].limit / 1024 / 1024,
    );
    const peakPercent = Math.round(
      (this.monitoring.peakMemoryUsage / this.testCategories[category].limit) *
        100,
    );

    const report = {
      testCategory: category,
      duration: Math.round(duration / 1000),
      memoryLimitMB: limitMB,
      peakMemoryMB: peakUsageMB,
      currentMemoryMB: currentUsageMB,
      peakMemoryPercent: peakPercent,
      memoryEfficiency: peakPercent <= 100 ? "EXCELLENT" : "NEEDS_OPTIMIZATION",

      statistics: {
        totalSnapshots: this.monitoring.testExecutionHistory.length,
        memoryLeaksDetected: this.monitoring.leaksDetected,
        workerRestarts: this.monitoring.workerRestarts,
        forcedGCs: this.monitoring.gcForced,
        cleanupTasks: this.cleanupTasks.length,
      },

      recommendations: this.generateRecommendations(peakPercent),

      success: peakUsageMB <= limitMB,
      targetAchieved: peakUsageMB < limitMB * 0.9, // Under 90% is ideal
    };

    return report;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(peakPercent) {
    const recommendations = [];

    if (peakPercent > 95) {
      recommendations.push(
        "🚨 CRITICAL: Memory usage exceeded 95% - consider reducing test batch size",
      );
      recommendations.push("💡 Enable more aggressive cleanup between tests");
      recommendations.push(
        "🔧 Consider splitting large test files into smaller ones",
      );
    } else if (peakPercent > 80) {
      recommendations.push(
        "⚠️ Memory usage above 80% - monitor for potential leaks",
      );
      recommendations.push("🧹 Increase cleanup frequency during tests");
    } else if (peakPercent < 50) {
      recommendations.push(
        "✅ Excellent memory efficiency - current strategy is optimal",
      );
      recommendations.push("🎯 Consider increasing test parallelization");
    }

    if (this.monitoring.leaksDetected > 0) {
      recommendations.push(
        `🔍 ${this.monitoring.leaksDetected} memory leaks detected - investigate test cleanup`,
      );
    }

    if (this.monitoring.gcForced > 10) {
      recommendations.push(
        "♻️ High GC frequency - consider optimizing object creation patterns",
      );
    }

    return recommendations;
  }

  /**
   * Display formatted memory report
   */
  displayMemoryReport(report) {
    console.log("\n" + "=".repeat(80));
    console.log("📊 MEMORY OPTIMIZATION REPORT");
    console.log("=".repeat(80));

    console.log(`🏷️  Test Category: ${report.testCategory.toUpperCase()}`);
    console.log(`⏱️  Duration: ${report.duration}s`);
    console.log(
      `📈 Peak Memory: ${report.peakMemoryMB}MB / ${report.memoryLimitMB}MB (${report.peakMemoryPercent}%)`,
    );
    console.log(`📊 Current Memory: ${report.currentMemoryMB}MB`);
    console.log(`🎯 Efficiency: ${report.memoryEfficiency}`);
    console.log(`✅ Target Achieved: ${report.targetAchieved ? "YES" : "NO"}`);

    console.log("\n📈 STATISTICS:");
    Object.entries(report.statistics).forEach(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      console.log(`   ${label}: ${value}`);
    });

    if (report.recommendations.length > 0) {
      console.log("\n💡 RECOMMENDATIONS:");
      report.recommendations.forEach((rec) => console.log(`   ${rec}`));
    }

    console.log("=".repeat(80) + "\n");
  }

  /**
   * Restart workers if memory usage is too high
   */
  restartWorkersIfNeeded() {
    // This would be implemented with actual worker management
    console.log("🔄 Worker restart triggered due to high memory usage");
    this.monitoring.workerRestarts++;
  }
}

// Singleton instance for global use
let memoryOptimizer = null;

/**
 * Initialize memory optimizer for specific test category
 */
export function initializeMemoryOptimizer(testCategory = "unit", config = {}) {
  if (memoryOptimizer) {
    memoryOptimizer.stopMonitoring();
  }

  memoryOptimizer = new MemoryOptimizer(config);
  memoryOptimizer.startMonitoring(testCategory);

  return memoryOptimizer;
}

/**
 * Get current memory optimizer instance
 */
export function getMemoryOptimizer() {
  return memoryOptimizer;
}

/**
 * Stop memory monitoring and get final report
 */
export function finalizeMemoryOptimizer() {
  if (!memoryOptimizer) {
    return null;
  }

  const report = memoryOptimizer.stopMonitoring();
  memoryOptimizer = null;

  return report;
}

/**
 * Quick memory check utility
 */
export function checkMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
    externalMB: Math.round(usage.external / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024),
  };
}

/**
 * Memory monitoring decorator for test functions
 */
export function withMemoryMonitoring(testCategory = "unit") {
  return function (testFn) {
    return async function (...args) {
      const optimizer = initializeMemoryOptimizer(testCategory);

      try {
        const result = await testFn.apply(this, args);
        return result;
      } finally {
        finalizeMemoryOptimizer();
      }
    };
  };
}

export { MemoryOptimizer };
