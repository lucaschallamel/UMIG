/**
 * PerformanceMonitor.js - Performance monitoring for US-087 Admin GUI Component Migration
 * Tracks performance metrics and comparisons between legacy and new components
 */

(function () {
  "use strict";

  class PerformanceMonitor {
    constructor() {
      // Performance baselines (will be established in Phase 1)
      this.baselines = {
        teamsLoad: 0,
        usersLoad: 0,
        environmentsLoad: 0,
        applicationsLoad: 0,
        labelsLoad: 0,
        migrationTypesLoad: 0,
        iterationTypesLoad: 0,
        memoryUsage: 0,
        renderTime: 0,
        apiResponseTime: 0,
      };

      // Metrics storage
      this.metrics = [];
      this.operationTimings = new Map();
      this.memorySnapshots = [];

      // Configuration
      this.config = {
        maxMetricsSize: 1000,
        samplingRate: 1.0, // 100% sampling initially
        warnThreshold: 1.1, // Warn if 10% slower than baseline
        errorThreshold: 1.25, // Error if 25% slower than baseline
        autoReport: true,
      };

      // Initialize performance observer if available
      this.initializeObserver();
    }

    /**
     * Measure an operation's performance
     * @param {string} name - Operation name
     * @param {Function} operation - Operation to measure
     * @param {Object} options - Additional options
     * @returns {*} - Operation result
     */
    async measureOperation(name, operation, options = {}) {
      const startTime = performance.now();
      const startMemory = this.captureMemoryUsage();
      const operationId = `${name}-${Date.now()}`;

      try {
        // Execute operation
        const result = await operation();

        // Capture end metrics
        const endTime = performance.now();
        const endMemory = this.captureMemoryUsage();
        const duration = endTime - startTime;

        // Record metrics
        const metrics = {
          operationId,
          name,
          duration,
          startTime: new Date(startTime).toISOString(),
          memoryDelta: endMemory - startMemory,
          success: true,
          ...options,
        };

        this.recordMetric(metrics);

        // Check against baselines
        if (options.compareToBaseline) {
          this.compareToBaseline(name, duration);
        }

        // Log if enabled
        if (this.config.autoReport) {
          this.logMetric(metrics);
        }

        return result;
      } catch (error) {
        // Record error metrics
        const endTime = performance.now();
        const duration = endTime - startTime;

        const metrics = {
          operationId,
          name,
          duration,
          startTime: new Date(startTime).toISOString(),
          success: false,
          error: error.message,
          ...options,
        };

        this.recordMetric(metrics);
        this.logError(metrics);

        throw error;
      }
    }

    /**
     * Start timing an operation
     * @param {string} name - Operation name
     * @returns {string} - Timer ID
     */
    startTimer(name) {
      const timerId = `${name}-${Date.now()}`;
      this.operationTimings.set(timerId, {
        name,
        startTime: performance.now(),
        startMemory: this.captureMemoryUsage(),
      });
      return timerId;
    }

    /**
     * End timing an operation
     * @param {string} timerId - Timer ID from startTimer
     * @returns {Object} - Timing metrics
     */
    endTimer(timerId) {
      const timing = this.operationTimings.get(timerId);
      if (!timing) {
        console.warn(`Timer ${timerId} not found`);
        return null;
      }

      const endTime = performance.now();
      const endMemory = this.captureMemoryUsage();
      const duration = endTime - timing.startTime;
      const memoryDelta = endMemory - timing.startMemory;

      const metrics = {
        operationId: timerId,
        name: timing.name,
        duration,
        memoryDelta,
        startTime: new Date(timing.startTime).toISOString(),
      };

      this.operationTimings.delete(timerId);
      this.recordMetric(metrics);

      return metrics;
    }

    /**
     * Capture current memory usage
     * @returns {number} - Memory usage in bytes
     */
    captureMemoryUsage() {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      // Fallback for browsers without memory API
      return 0;
    }

    /**
     * Set performance baseline for an operation
     * @param {string} name - Operation name
     * @param {number} value - Baseline value in milliseconds
     */
    setBaseline(name, value) {
      this.baselines[name] = value;
      console.log(`📊 Baseline set for ${name}: ${value}ms`);
    }

    /**
     * Establish baselines from current metrics
     */
    establishBaselines() {
      const operations = [
        "teamsLoad",
        "usersLoad",
        "environmentsLoad",
        "applicationsLoad",
        "labelsLoad",
        "migrationTypesLoad",
        "iterationTypesLoad",
      ];

      operations.forEach((op) => {
        const metrics = this.getMetricsForOperation(op);
        if (metrics.length > 0) {
          const average = this.calculateAverage(metrics.map((m) => m.duration));
          this.setBaseline(op, average);
        }
      });

      // Save baselines
      this.saveBaselines();
    }

    /**
     * Compare operation to baseline
     * @param {string} name - Operation name
     * @param {number} duration - Operation duration
     * @returns {Object} - Comparison result
     */
    compareToBaseline(name, duration) {
      const baseline = this.baselines[name];
      if (!baseline) {
        console.warn(`No baseline found for ${name}`);
        return null;
      }

      const ratio = duration / baseline;
      const percentChange = ((duration - baseline) / baseline) * 100;

      const comparison = {
        operation: name,
        baseline,
        actual: duration,
        ratio,
        percentChange,
        status: this.getPerformanceStatus(ratio),
      };

      // Log warning or error if threshold exceeded
      if (ratio >= this.config.errorThreshold) {
        console.error(
          `🚨 Performance degradation for ${name}: ${percentChange.toFixed(1)}% slower than baseline`,
        );
      } else if (ratio >= this.config.warnThreshold) {
        console.warn(
          `⚠️ Performance warning for ${name}: ${percentChange.toFixed(1)}% slower than baseline`,
        );
      } else if (ratio < 0.9) {
        console.log(
          `✅ Performance improvement for ${name}: ${Math.abs(percentChange).toFixed(1)}% faster than baseline`,
        );
      }

      return comparison;
    }

    /**
     * Get performance status based on ratio
     * @param {number} ratio - Performance ratio
     * @returns {string} - Status
     */
    getPerformanceStatus(ratio) {
      if (ratio >= this.config.errorThreshold) return "critical";
      if (ratio >= this.config.warnThreshold) return "warning";
      if (ratio < 0.9) return "improved";
      return "normal";
    }

    /**
     * Record a metric
     * @param {Object} metric - Metric data
     */
    recordMetric(metric) {
      // Add timestamp if not present
      metric.timestamp = metric.timestamp || new Date().toISOString();

      // Add to metrics array
      this.metrics.push(metric);

      // Trim if exceeds max size
      if (this.metrics.length > this.config.maxMetricsSize) {
        this.metrics = this.metrics.slice(-this.config.maxMetricsSize);
      }
    }

    /**
     * Get metrics for a specific operation
     * @param {string} operationName - Operation name
     * @returns {Array} - Filtered metrics
     */
    getMetricsForOperation(operationName) {
      return this.metrics.filter((m) => m.name === operationName);
    }

    /**
     * Calculate statistics for an operation
     * @param {string} operationName - Operation name
     * @returns {Object} - Statistics
     */
    calculateStatistics(operationName) {
      const metrics = this.getMetricsForOperation(operationName);
      if (metrics.length === 0) {
        return null;
      }

      const durations = metrics.map((m) => m.duration);
      const successCount = metrics.filter((m) => m.success).length;

      return {
        count: metrics.length,
        successRate: (successCount / metrics.length) * 100,
        average: this.calculateAverage(durations),
        median: this.calculateMedian(durations),
        min: Math.min(...durations),
        max: Math.max(...durations),
        standardDeviation: this.calculateStandardDeviation(durations),
        percentile95: this.calculatePercentile(durations, 95),
        percentile99: this.calculatePercentile(durations, 99),
      };
    }

    /**
     * Generate performance report
     * @returns {Object} - Performance report
     */
    generateReport() {
      const report = {
        timestamp: new Date().toISOString(),
        totalMetrics: this.metrics.length,
        operations: {},
        comparisons: {},
        memoryUsage: this.captureMemoryUsage(),
        recommendations: [],
      };

      // Calculate statistics for each operation
      const operations = [...new Set(this.metrics.map((m) => m.name))];
      operations.forEach((op) => {
        report.operations[op] = this.calculateStatistics(op);

        // Add baseline comparison if available
        if (this.baselines[op]) {
          const latest = this.getMetricsForOperation(op).slice(-10);
          const avgDuration = this.calculateAverage(
            latest.map((m) => m.duration),
          );
          report.comparisons[op] = this.compareToBaseline(op, avgDuration);
        }
      });

      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);

      return report;
    }

    /**
     * Generate recommendations based on metrics
     * @param {Object} report - Performance report
     * @returns {Array} - Recommendations
     */
    generateRecommendations(report) {
      const recommendations = [];

      Object.entries(report.comparisons).forEach(([op, comparison]) => {
        if (comparison && comparison.status === "critical") {
          recommendations.push({
            severity: "critical",
            operation: op,
            message: `${op} is ${comparison.percentChange.toFixed(1)}% slower than baseline. Immediate investigation required.`,
            action: "rollback_or_optimize",
          });
        } else if (comparison && comparison.status === "warning") {
          recommendations.push({
            severity: "warning",
            operation: op,
            message: `${op} shows performance degradation of ${comparison.percentChange.toFixed(1)}%. Monitor closely.`,
            action: "monitor_and_optimize",
          });
        }
      });

      // Check memory usage
      const currentMemory = this.captureMemoryUsage();
      if (
        this.baselines.memoryUsage &&
        currentMemory > this.baselines.memoryUsage * 1.5
      ) {
        recommendations.push({
          severity: "warning",
          category: "memory",
          message:
            "Memory usage has increased by more than 50%. Check for memory leaks.",
          action: "memory_profiling",
        });
      }

      return recommendations;
    }

    /**
     * Initialize performance observer
     */
    initializeObserver() {
      if (typeof PerformanceObserver === "undefined") {
        return;
      }

      try {
        // Observe long tasks
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              // Long task threshold
              this.recordMetric({
                name: "longTask",
                duration: entry.duration,
                startTime: entry.startTime,
                type: "performance-observer",
              });
            }
          }
        });

        longTaskObserver.observe({ entryTypes: ["longtask"] });
      } catch (e) {
        console.warn("Performance observer not available:", e);
      }
    }

    /**
     * Utility: Calculate average
     */
    calculateAverage(values) {
      if (values.length === 0) return 0;
      return values.reduce((a, b) => a + b, 0) / values.length;
    }

    /**
     * Utility: Calculate median
     */
    calculateMedian(values) {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    /**
     * Utility: Calculate standard deviation
     */
    calculateStandardDeviation(values) {
      const avg = this.calculateAverage(values);
      const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
      const avgSquaredDiff = this.calculateAverage(squaredDiffs);
      return Math.sqrt(avgSquaredDiff);
    }

    /**
     * Utility: Calculate percentile
     */
    calculatePercentile(values, percentile) {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const index = Math.ceil((percentile / 100) * sorted.length) - 1;
      return sorted[index];
    }

    /**
     * Log metric to console
     */
    logMetric(metric) {
      const emoji = metric.success ? "✅" : "❌";
      console.log(
        `${emoji} Performance [${metric.name}]: ${metric.duration.toFixed(2)}ms`,
      );
    }

    /**
     * Log error metric
     */
    logError(metric) {
      console.error(
        `❌ Performance Error [${metric.name}]:`,
        metric.error,
        `Duration: ${metric.duration.toFixed(2)}ms`,
      );
    }

    /**
     * Save baselines to localStorage
     */
    saveBaselines() {
      try {
        // Validate data before saving
        const dataToSave = {};

        for (const [key, value] of Object.entries(this.baselines)) {
          // Type validation - ensure all values are numbers
          if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
            dataToSave[key] = value;
          } else {
            console.warn(
              `[Security] Invalid baseline value for ${key}: ${value}, setting to 0`,
            );
            dataToSave[key] = 0;
          }
        }

        localStorage.setItem(
          "umig-performance-baselines",
          JSON.stringify(dataToSave),
        );
        console.log("📊 Performance baselines saved with validation");

        // Log security event
        if (window.SecurityUtils) {
          window.SecurityUtils.logSecurityEvent("performance_baselines_saved", {
            baselineCount: Object.keys(dataToSave).length,
          });
        }
      } catch (e) {
        console.warn("[Security] Failed to save performance baselines:", e);

        // Log security event
        if (window.SecurityUtils) {
          window.SecurityUtils.logSecurityEvent(
            "performance_baselines_save_error",
            { error: e.message },
          );
        }
      }
    }

    /**
     * Load baselines from localStorage
     */
    loadBaselines() {
      try {
        // Enhanced security: Validate localStorage data structure
        const schema = {
          type: "object",
          properties: {
            teamsLoad: { type: "number", required: false },
            usersLoad: { type: "number", required: false },
            environmentsLoad: { type: "number", required: false },
            applicationsLoad: { type: "number", required: false },
            labelsLoad: { type: "number", required: false },
            migrationTypesLoad: { type: "number", required: false },
            iterationTypesLoad: { type: "number", required: false },
            memoryUsage: { type: "number", required: false },
            renderTime: { type: "number", required: false },
            apiResponseTime: { type: "number", required: false },
          },
        };

        // Use SecurityUtils for validation if available
        if (window.SecurityUtils) {
          const isValid = window.SecurityUtils.validateLocalStorageData(
            "umig-performance-baselines",
            schema,
          );
          if (!isValid) {
            console.warn(
              "[Security] Invalid performance baseline data in localStorage, using defaults",
            );
            return;
          }
        }

        const stored = localStorage.getItem("umig-performance-baselines");
        if (stored) {
          // Parse and validate stored data
          const baselines = JSON.parse(stored);

          // Enhanced validation
          if (
            baselines &&
            typeof baselines === "object" &&
            !Array.isArray(baselines)
          ) {
            // Validate each baseline value
            const validatedBaselines = {};

            for (const [key, value] of Object.entries(baselines)) {
              // Only allow known baseline keys
              if (key in this.baselines) {
                // Type and range validation
                if (
                  typeof value === "number" &&
                  !isNaN(value) &&
                  isFinite(value) &&
                  value >= 0
                ) {
                  validatedBaselines[key] = value;
                } else {
                  console.warn(
                    `[Security] Invalid baseline value for ${key}: ${value}, using default`,
                  );
                  validatedBaselines[key] = this.baselines[key];
                }
              } else {
                console.warn(
                  `[Security] Unknown baseline key: ${key}, ignoring`,
                );
              }
            }

            // Apply validated baselines
            Object.assign(this.baselines, validatedBaselines);
            console.log(
              "📊 Performance baselines loaded and validated from localStorage",
            );

            // Log security event
            if (window.SecurityUtils) {
              window.SecurityUtils.logSecurityEvent(
                "performance_baselines_loaded",
                {
                  validatedCount: Object.keys(validatedBaselines).length,
                  totalCount: Object.keys(baselines).length,
                },
              );
            }
          } else {
            console.warn(
              "[Security] Invalid performance baseline format, removing corrupted data",
            );
            localStorage.removeItem("umig-performance-baselines");
          }
        }
      } catch (e) {
        console.warn("[Security] Failed to load performance baselines:", e);
        // Remove potentially corrupted data
        try {
          localStorage.removeItem("umig-performance-baselines");
        } catch (removeError) {
          console.warn(
            "[Security] Failed to remove corrupted baseline data:",
            removeError,
          );
        }

        // Log security event
        if (window.SecurityUtils) {
          window.SecurityUtils.logSecurityEvent(
            "performance_baselines_load_error",
            { error: e.message },
          );
        }
      }
    }

    /**
     * Export metrics for analysis
     * @returns {string} - JSON string of metrics
     */
    exportMetrics() {
      return JSON.stringify(
        {
          baselines: this.baselines,
          metrics: this.metrics,
          report: this.generateReport(),
        },
        null,
        2,
      );
    }

    /**
     * Clear all metrics
     */
    clearMetrics() {
      this.metrics = [];
      this.operationTimings.clear();
      this.memorySnapshots = [];
      console.log("🗑️ Performance metrics cleared");
    }
  }

  // Create singleton instance
  window.PerformanceMonitor =
    window.PerformanceMonitor || new PerformanceMonitor();

  // Export for module systems if available
  if (typeof module !== "undefined" && module.exports) {
    module.exports = PerformanceMonitor;
  }
})();
