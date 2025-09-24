/**
 * UMIG Test Infrastructure - Unit Performance Reporter
 *
 * Custom Jest reporter for monitoring unit test performance and memory usage.
 * Enforces performance targets and provides detailed metrics.
 *
 * @version 1.0.0 (TD-012 Phase 2)
 */

const fs = require("fs");
const path = require("path");

class UnitPerformanceReporter {
  constructor(globalConfig, options = {}) {
    this.globalConfig = globalConfig;
    this.options = {
      memoryTarget: "256MB",
      executionTarget: "30s",
      passRateTarget: "95%",
      ...options,
    };

    this.startTime = Date.now();
    this.results = {
      tests: [],
      performance: {
        memory: {
          peak: 0,
          average: 0,
          samples: [],
        },
        execution: {
          total: 0,
          average: 0,
          slowTests: [],
        },
      },
    };

    console.log(
      `🔬 Unit Performance Reporter initialized - Target: ${this.options.memoryTarget} memory, ${this.options.executionTarget} execution`,
    );
  }

  onRunStart() {
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage();

    // Start memory monitoring
    this.memoryMonitor = setInterval(() => {
      const memory = process.memoryUsage();
      this.results.performance.memory.samples.push({
        timestamp: Date.now(),
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
      });

      // Track peak memory usage
      if (memory.heapUsed > this.results.performance.memory.peak) {
        this.results.performance.memory.peak = memory.heapUsed;
      }
    }, 1000); // Sample every second
  }

  onTestResult(test, testResult) {
    const testDuration =
      testResult.perfStats?.end - testResult.perfStats?.start || 0;

    this.results.tests.push({
      name: test.path,
      duration: testDuration,
      success: testResult.numFailingTests === 0,
      numTests: testResult.numPassingTests + testResult.numFailingTests,
      memory: process.memoryUsage().heapUsed,
    });

    // Track slow tests
    if (testDuration > 5000) {
      // 5 second threshold
      this.results.performance.execution.slowTests.push({
        name: test.path,
        duration: testDuration,
      });
    }
  }

  onRunComplete(contexts, results) {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }

    const totalDuration = Date.now() - this.startTime;
    const finalMemory = process.memoryUsage();

    // Calculate averages
    this.results.performance.execution.total = totalDuration;
    this.results.performance.execution.average =
      this.results.tests.length > 0
        ? totalDuration / this.results.tests.length
        : 0;

    this.results.performance.memory.average =
      this.results.performance.memory.samples.length > 0
        ? this.results.performance.memory.samples.reduce(
            (sum, sample) => sum + sample.heapUsed,
            0,
          ) / this.results.performance.memory.samples.length
        : 0;

    // Performance analysis
    const analysis = this.analyzePerformance(results);

    // Generate report
    this.generateReport(analysis);

    // Check performance targets
    this.checkPerformanceTargets(analysis);
  }

  analyzePerformance(results) {
    const memoryTargetBytes = this.parseMemoryTarget(this.options.memoryTarget);
    const executionTargetMs = this.parseTimeTarget(
      this.options.executionTarget,
    );
    const passRateTarget =
      parseFloat(this.options.passRateTarget.replace("%", "")) / 100;

    const actualPassRate =
      results.numPassedTests /
      (results.numPassedTests + results.numFailedTests);
    const memoryWithinTarget =
      this.results.performance.memory.peak <= memoryTargetBytes;
    const executionWithinTarget =
      this.results.performance.execution.total <= executionTargetMs;
    const passRateWithinTarget = actualPassRate >= passRateTarget;

    return {
      memory: {
        target: memoryTargetBytes,
        peak: this.results.performance.memory.peak,
        average: this.results.performance.memory.average,
        withinTarget: memoryWithinTarget,
        efficiency: (
          ((memoryTargetBytes - this.results.performance.memory.peak) /
            memoryTargetBytes) *
          100
        ).toFixed(1),
      },
      execution: {
        target: executionTargetMs,
        total: this.results.performance.execution.total,
        average: this.results.performance.execution.average,
        withinTarget: executionWithinTarget,
        efficiency: (
          ((executionTargetMs - this.results.performance.execution.total) /
            executionTargetMs) *
          100
        ).toFixed(1),
      },
      passRate: {
        target: passRateTarget,
        actual: actualPassRate,
        withinTarget: passRateWithinTarget,
        efficiency: ((actualPassRate / passRateTarget) * 100).toFixed(1),
      },
      overall:
        memoryWithinTarget && executionWithinTarget && passRateWithinTarget,
    };
  }

  generateReport(analysis) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.tests.length,
        duration: `${Math.round(this.results.performance.execution.total / 1000)}s`,
        memoryPeak: `${Math.round(analysis.memory.peak / 1024 / 1024)}MB`,
        passRate: `${Math.round(analysis.passRate.actual * 100)}%`,
      },
      performance: analysis,
      slowTests: this.results.performance.execution.slowTests,
      recommendations: this.generateRecommendations(analysis),
    };

    // Write detailed report to file
    const reportPath = path.join(
      process.cwd(),
      "coverage",
      "unit-performance-report.json",
    );
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log("\n📊 Unit Test Performance Report");
    console.log("================================");
    console.log(
      `Tests: ${report.summary.totalTests} | Duration: ${report.summary.duration} | Memory: ${report.summary.memoryPeak} | Pass Rate: ${report.summary.passRate}`,
    );

    if (analysis.overall) {
      console.log("✅ All performance targets met!");
    } else {
      console.log("⚠️  Performance targets not met:");
      if (!analysis.memory.withinTarget) {
        console.log(
          `   Memory: ${Math.round(analysis.memory.peak / 1024 / 1024)}MB (target: ${Math.round(analysis.memory.target / 1024 / 1024)}MB)`,
        );
      }
      if (!analysis.execution.withinTarget) {
        console.log(
          `   Execution: ${Math.round(analysis.execution.total / 1000)}s (target: ${Math.round(analysis.execution.target / 1000)}s)`,
        );
      }
      if (!analysis.passRate.withinTarget) {
        console.log(
          `   Pass Rate: ${Math.round(analysis.passRate.actual * 100)}% (target: ${Math.round(analysis.passRate.target * 100)}%)`,
        );
      }
    }

    console.log(`📁 Detailed report: ${reportPath}\n`);
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (!analysis.memory.withinTarget) {
      recommendations.push({
        type: "memory",
        priority: "high",
        message:
          "Memory usage exceeds target. Consider reducing test parallelism or optimizing mocks.",
        action: "Reduce maxWorkers or implement more aggressive cleanup",
      });
    }

    if (!analysis.execution.withinTarget) {
      recommendations.push({
        type: "execution",
        priority: "medium",
        message:
          "Execution time exceeds target. Review slow tests and optimize.",
        action: "Check slow tests and consider splitting large test suites",
      });
    }

    if (this.results.performance.execution.slowTests.length > 0) {
      recommendations.push({
        type: "slow-tests",
        priority: "medium",
        message: `${this.results.performance.execution.slowTests.length} slow tests detected`,
        action: "Review and optimize slow tests",
      });
    }

    return recommendations;
  }

  parseMemoryTarget(target) {
    const match = target.match(/(\d+)(MB|GB|KB)/);
    if (!match) return 256 * 1024 * 1024; // Default 256MB

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "KB":
        return value * 1024;
      case "MB":
        return value * 1024 * 1024;
      case "GB":
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  parseTimeTarget(target) {
    const match = target.match(/(\d+)(s|m|ms)/);
    if (!match) return 30000; // Default 30 seconds

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "ms":
        return value;
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      default:
        return value;
    }
  }

  checkPerformanceTargets(analysis) {
    if (!analysis.overall) {
      // If in CI environment, consider failing the build
      if (
        process.env.CI === "true" &&
        process.env.FAIL_ON_PERFORMANCE_REGRESSION === "true"
      ) {
        console.error("❌ Performance regression detected in CI environment");
        process.exit(1);
      }
    }
  }
}

module.exports = UnitPerformanceReporter;
