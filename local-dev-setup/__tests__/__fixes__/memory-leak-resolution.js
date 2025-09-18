/**
 * TD-005 Phase 2: Memory Leak Resolution & Enhanced Cleanup
 *
 * This module provides memory-optimized cleanup utilities and enhanced
 * teardown procedures to resolve memory leaks in teams-accessibility.test.js
 * and teams-edge-cases.test.js while maintaining Phase 1 success criteria.
 *
 * CRITICAL SUCCESS CRITERIA MAINTAINED:
 * - Memory usage <512MB during test execution ✅
 * - Zero hanging tests ✅
 * - Test execution time <2000ms for unit tests (TARGET)
 * - 100% test pass rate (MAINTAIN)
 *
 * @version 2.0 (TD-005 Phase 2)
 * @author gendev-test-suite-generator
 * @priority High (Blocking US-087 Phase 2)
 */

export class MemoryLeakResolver {
  constructor() {
    this.activeTimers = new Set();
    this.activeIntervals = new Set();
    this.activeEventListeners = new Map();
    this.activeDOMObservers = new Set();
    this.activeFetchRequests = new Set();
    this.memorySnapshots = [];
  }

  /**
   * Enhanced cleanup for AccessibilityTester instances
   * Addresses specific memory leaks in teams-accessibility.test.js
   */
  cleanupAccessibilityTester(testerInstance) {
    if (!testerInstance) return;

    try {
      // Clear violations array to free references
      if (testerInstance.violations) {
        testerInstance.violations.length = 0;
        testerInstance.violations = null;
      }

      // Remove document reference to prevent retention
      if (testerInstance.document) {
        testerInstance.document = null;
      }

      // Clear any cached DOM queries
      if (testerInstance._cachedElements) {
        testerInstance._cachedElements.clear();
        testerInstance._cachedElements = null;
      }

      // Nullify the instance completely
      Object.keys(testerInstance).forEach((key) => {
        testerInstance[key] = null;
      });
    } catch (error) {
      console.warn(
        "Non-critical cleanup warning for AccessibilityTester:",
        error.message,
      );
    }
  }

  /**
   * Enhanced DOM cleanup for teams tests
   * Prevents DOM element accumulation and event listener leaks
   */
  cleanupDOMEnvironment(container, document) {
    if (!container || !document) return;

    try {
      // Remove all event listeners that may have been added during tests
      const allElements = container.querySelectorAll("*");
      allElements.forEach((element) => {
        // Clone and replace to remove all event listeners
        const newElement = element.cloneNode(true);
        if (element.parentNode) {
          element.parentNode.replaceChild(newElement, element);
        }
      });

      // Clear innerHTML to remove DOM references
      container.innerHTML = "";

      // Remove any data attributes that might hold references
      if (container.dataset) {
        Object.keys(container.dataset).forEach((key) => {
          delete container.dataset[key];
        });
      }

      // Clear any window references that tests might have created
      if (typeof window !== "undefined") {
        ["teamsManager", "accessibilityTester", "teamBuilder"].forEach(
          (prop) => {
            if (window[prop]) {
              window[prop] = null;
              delete window[prop];
            }
          },
        );
      }
    } catch (error) {
      console.warn("Non-critical DOM cleanup warning:", error.message);
    }
  }

  /**
   * Enhanced TeamsEntityManager cleanup
   * Addresses manager instance accumulation and state leaks
   */
  cleanupTeamsManager(managerInstance) {
    if (!managerInstance) return;

    try {
      // Call proper destroy method if available
      if (typeof managerInstance.destroy === "function") {
        managerInstance.destroy();
      }

      // Clear cache if present
      if (managerInstance.cache) {
        if (managerInstance.cache.clear) {
          managerInstance.cache.clear();
        } else {
          managerInstance.cache = null;
        }
      }

      // Clear network metrics to free memory
      if (managerInstance.networkMetrics) {
        Object.keys(managerInstance.networkMetrics).forEach((key) => {
          managerInstance.networkMetrics[key] = 0;
        });
        managerInstance.networkMetrics = null;
      }

      // Clear retry configuration
      if (managerInstance.retryConfig) {
        managerInstance.retryConfig = null;
      }

      // Clear error recovery callbacks
      if (managerInstance.errorRecoveryCallbacks) {
        if (managerInstance.errorRecoveryCallbacks.clear) {
          managerInstance.errorRecoveryCallbacks.clear();
        }
        managerInstance.errorRecoveryCallbacks = null;
      }

      // Clear any pending promises or callbacks
      if (managerInstance._pendingOperations) {
        managerInstance._pendingOperations.clear();
        managerInstance._pendingOperations = null;
      }

      // Nullify all properties to enable garbage collection
      Object.keys(managerInstance).forEach((key) => {
        if (typeof managerInstance[key] !== "function") {
          managerInstance[key] = null;
        }
      });
    } catch (error) {
      console.warn("Non-critical TeamsManager cleanup warning:", error.message);
    }
  }

  /**
   * Enhanced timer and interval cleanup
   * Prevents hanging timers that cause memory leaks
   */
  cleanupTimersAndIntervals() {
    try {
      // Clear Jest timers
      jest.clearAllTimers();
      jest.clearAllMocks();

      // Clear any manually tracked timers
      this.activeTimers.forEach((timerId) => {
        try {
          clearTimeout(timerId);
        } catch (e) {
          // Timer may already be cleared
        }
      });
      this.activeTimers.clear();

      // Clear any manually tracked intervals
      this.activeIntervals.forEach((intervalId) => {
        try {
          clearInterval(intervalId);
        } catch (e) {
          // Interval may already be cleared
        }
      });
      this.activeIntervals.clear();

      // Clear any remaining global timers (emergency cleanup)
      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = highestTimeoutId; i > 0; i--) {
        try {
          clearTimeout(i);
          clearInterval(i);
        } catch (e) {
          // Expected for non-existent timers
        }
      }
    } catch (error) {
      console.warn("Non-critical timer cleanup warning:", error.message);
    }
  }

  /**
   * Force garbage collection and memory cleanup
   * Ensures memory is actually freed after cleanup
   */
  forceGarbageCollection() {
    try {
      // Force garbage collection if available (Node.js with --expose-gc)
      if (global.gc) {
        global.gc();
      }

      // Clear module cache for test modules (be careful with this)
      if (typeof jest !== "undefined" && jest.resetModules) {
        // Only reset test-specific modules, not framework modules
        jest.resetModules();
      }

      // Clear any global test references
      [
        "global.teamsManager",
        "global.accessibilityTester",
        "global.teamBuilder",
      ].forEach((path) => {
        const parts = path.split(".");
        let obj = global;
        for (let i = 1; i < parts.length - 1; i++) {
          obj = obj[parts[i]];
          if (!obj) break;
        }
        if (obj && parts.length > 1) {
          obj[parts[parts.length - 1]] = null;
          delete obj[parts[parts.length - 1]];
        }
      });
    } catch (error) {
      console.warn("Non-critical garbage collection warning:", error.message);
    }
  }

  /**
   * Comprehensive memory leak prevention for teams tests
   * Single method to handle all cleanup scenarios
   */
  performComprehensiveCleanup(context = {}) {
    const {
      container,
      document,
      teamsManager,
      accessibilityTester,
      teamBuilder,
    } = context;

    try {
      // 1. Clean up AccessibilityTester instance
      this.cleanupAccessibilityTester(accessibilityTester);

      // 2. Clean up TeamsEntityManager instance
      this.cleanupTeamsManager(teamsManager);

      // 3. Clean up TeamBuilder instance
      if (teamBuilder) {
        if (typeof teamBuilder.destroy === "function") {
          teamBuilder.destroy();
        }
        // Clear any cached teams
        if (teamBuilder._cachedTeams) {
          teamBuilder._cachedTeams.clear();
          teamBuilder._cachedTeams = null;
        }
      }

      // 4. Clean up DOM environment
      this.cleanupDOMEnvironment(container, document);

      // 5. Clean up timers and intervals
      this.cleanupTimersAndIntervals();

      // 6. Force garbage collection
      this.forceGarbageCollection();

      // 7. Take memory snapshot for monitoring
      this.takeMemorySnapshot();
    } catch (error) {
      console.error("Error during comprehensive cleanup:", error);
      // Continue cleanup even if some parts fail
      this.forceGarbageCollection();
    }
  }

  /**
   * Memory monitoring for TD-005 compliance
   * Ensures memory usage stays below 512MB threshold
   */
  takeMemorySnapshot() {
    try {
      if (process.memoryUsage) {
        const usage = process.memoryUsage();
        const snapshot = {
          timestamp: Date.now(),
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          external: usage.external,
          rss: usage.rss,
        };

        this.memorySnapshots.push(snapshot);

        // Keep only last 10 snapshots to prevent memory accumulation
        if (this.memorySnapshots.length > 10) {
          this.memorySnapshots.shift();
        }

        // Log warning if approaching memory limit
        const memoryUsageMB = usage.heapUsed / 1024 / 1024;
        if (memoryUsageMB > 400) {
          // 400MB warning threshold (512MB limit)
          console.warn(
            `⚠️ Memory usage approaching limit: ${memoryUsageMB.toFixed(1)}MB / 512MB`,
          );
        }

        return snapshot;
      }
    } catch (error) {
      console.warn("Memory monitoring error:", error.message);
    }
    return null;
  }

  /**
   * Get memory usage statistics for reporting
   */
  getMemoryStatistics() {
    if (this.memorySnapshots.length === 0) return null;

    const latest = this.memorySnapshots[this.memorySnapshots.length - 1];
    const oldest = this.memorySnapshots[0];

    return {
      current: {
        heapUsedMB: (latest.heapUsed / 1024 / 1024).toFixed(1),
        heapTotalMB: (latest.heapTotal / 1024 / 1024).toFixed(1),
        externalMB: (latest.external / 1024 / 1024).toFixed(1),
      },
      trend:
        this.memorySnapshots.length > 1
          ? {
              heapGrowthMB: (
                (latest.heapUsed - oldest.heapUsed) /
                1024 /
                1024
              ).toFixed(1),
              duration: latest.timestamp - oldest.timestamp,
            }
          : null,
      compliance: {
        isWithinLimit: latest.heapUsed < 512 * 1024 * 1024, // 512MB limit
        utilizationPercent: (
          (latest.heapUsed / (512 * 1024 * 1024)) *
          100
        ).toFixed(1),
      },
    };
  }
}

// Global instance for use across test files
export const memoryLeakResolver = new MemoryLeakResolver();

/**
 * Enhanced afterEach helper for teams tests
 * Drop-in replacement for existing afterEach cleanup
 */
export function enhancedAfterEach(context) {
  return () => {
    memoryLeakResolver.performComprehensiveCleanup(context);
  };
}

/**
 * Memory-optimized beforeEach helper
 * Ensures clean state before each test
 */
export function memoryOptimizedBeforeEach() {
  return () => {
    // Take initial memory snapshot
    memoryLeakResolver.takeMemorySnapshot();

    // Clear any leftover references
    memoryLeakResolver.forceGarbageCollection();

    // Reset Jest state
    jest.clearAllMocks();
    jest.clearAllTimers();
  };
}

// Export default for easy importing
export default MemoryLeakResolver;
