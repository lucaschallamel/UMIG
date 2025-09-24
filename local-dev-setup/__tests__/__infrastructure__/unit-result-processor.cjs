/**
 * UMIG Test Infrastructure - Unit Result Processor
 *
 * Custom Jest result processor for unit tests that enhances test results
 * with performance metrics, memory usage data, and optimization insights.
 *
 * @version 1.0.0 (TD-012 Phase 2)
 */

const fs = require("fs");
const path = require("path");

/**
 * Process and enhance Jest test results for unit tests
 * @param {Object} results - Raw Jest test results
 * @returns {Object} Enhanced test results
 */
function processResults(results) {
  const processedResults = {
    ...results,
    unitTestMetrics: {
      timestamp: new Date().toISOString(),
      performance: analyzePerformance(results),
      memory: analyzeMemoryUsage(results),
      coverage: analyzeCoverage(results),
      recommendations: generateRecommendations(results),
    },
  };

  // Save processed results for analysis
  saveProcessedResults(processedResults);

  // Generate summary report
  generateSummaryReport(processedResults);

  return processedResults;
}

function analyzePerformance(results) {
  const testSuites = results.testResults || [];
  const performanceData = {
    totalDuration: 0,
    averageDuration: 0,
    slowSuites: [],
    fastSuites: [],
    failurePatterns: [],
  };

  testSuites.forEach((suite) => {
    const duration = suite.perfStats?.end - suite.perfStats?.start || 0;
    performanceData.totalDuration += duration;

    // Categorize by speed
    if (duration > 10000) {
      // 10+ seconds
      performanceData.slowSuites.push({
        name: suite.testFilePath,
        duration: duration,
        numTests: suite.assertionResults?.length || 0,
      });
    } else if (duration < 1000) {
      // Under 1 second
      performanceData.fastSuites.push({
        name: suite.testFilePath,
        duration: duration,
        numTests: suite.assertionResults?.length || 0,
      });
    }

    // Analyze failure patterns
    if (suite.failureMessage) {
      performanceData.failurePatterns.push({
        suite: suite.testFilePath,
        error: suite.failureMessage.split("\n")[0], // First line only
      });
    }
  });

  performanceData.averageDuration =
    testSuites.length > 0
      ? performanceData.totalDuration / testSuites.length
      : 0;

  return performanceData;
}

function analyzeMemoryUsage(results) {
  const memoryData = {
    peak: 0,
    average: 0,
    efficiency: 0,
    leakDetection: {
      potentialLeaks: [],
      recommendations: [],
    },
  };

  // Get memory usage if available
  if (process.memoryUsage) {
    const usage = process.memoryUsage();
    memoryData.peak = usage.heapUsed;
    memoryData.average = usage.heapUsed; // Approximation for current usage

    // Calculate efficiency (how well we're using available memory)
    const memoryTarget = 256 * 1024 * 1024; // 256MB target
    memoryData.efficiency = Math.max(
      0,
      ((memoryTarget - usage.heapUsed) / memoryTarget) * 100,
    );

    // Simple leak detection based on memory usage
    if (usage.heapUsed > memoryTarget * 0.8) {
      // 80% of target
      memoryData.leakDetection.potentialLeaks.push({
        type: "high-memory-usage",
        severity: "warning",
        details: `Memory usage at ${Math.round(usage.heapUsed / 1024 / 1024)}MB (${Math.round((usage.heapUsed / memoryTarget) * 100)}% of target)`,
      });
    }
  }

  return memoryData;
}

function analyzeCoverage(results) {
  const coverageData = {
    available: false,
    summary: null,
    recommendations: [],
  };

  // Check if coverage data is available
  if (results.coverageMap) {
    coverageData.available = true;

    // Basic coverage analysis
    const coverageFiles = results.coverageMap.files();
    let totalLines = 0;
    let coveredLines = 0;

    coverageFiles.forEach((file) => {
      const fileCoverage = results.coverageMap.fileCoverageFor(file);
      const lineCoverage = fileCoverage.getLineCoverage();

      Object.values(lineCoverage).forEach((coverage) => {
        totalLines++;
        if (coverage > 0) coveredLines++;
      });
    });

    coverageData.summary = {
      totalFiles: coverageFiles.length,
      totalLines: totalLines,
      coveredLines: coveredLines,
      percentage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
    };

    // Generate coverage recommendations
    if (coverageData.summary.percentage < 85) {
      coverageData.recommendations.push({
        type: "coverage-improvement",
        priority: "medium",
        message: `Coverage at ${coverageData.summary.percentage.toFixed(1)}% (target: 85%+)`,
      });
    }
  }

  return coverageData;
}

function generateRecommendations(results) {
  const recommendations = [];

  // Performance recommendations
  const performance = analyzePerformance(results);
  if (performance.slowSuites.length > 0) {
    recommendations.push({
      category: "performance",
      priority: "medium",
      title: "Optimize slow test suites",
      description: `${performance.slowSuites.length} test suites are taking >10 seconds`,
      action: "Review slow suites and consider splitting or optimizing",
      suites: performance.slowSuites.map((s) => s.name),
    });
  }

  // Memory recommendations
  const memory = analyzeMemoryUsage(results);
  if (memory.leakDetection.potentialLeaks.length > 0) {
    recommendations.push({
      category: "memory",
      priority: "high",
      title: "Address potential memory issues",
      description: "High memory usage detected",
      action: "Review memory usage patterns and cleanup procedures",
      details: memory.leakDetection.potentialLeaks,
    });
  }

  // Failure pattern recommendations
  if (performance.failurePatterns.length > 0) {
    const commonErrors = {};
    performance.failurePatterns.forEach((pattern) => {
      const errorType = pattern.error.split(":")[0] || "Unknown";
      commonErrors[errorType] = (commonErrors[errorType] || 0) + 1;
    });

    const mostCommonError = Object.entries(commonErrors).sort(
      ([, a], [, b]) => b - a,
    )[0];

    if (mostCommonError && mostCommonError[1] > 1) {
      recommendations.push({
        category: "reliability",
        priority: "high",
        title: "Address common test failures",
        description: `Multiple tests failing with: ${mostCommonError[0]}`,
        action: "Investigate and fix common failure patterns",
        occurrences: mostCommonError[1],
      });
    }
  }

  return recommendations;
}

function saveProcessedResults(processedResults) {
  try {
    const outputDir = path.join(process.cwd(), "coverage", "unit-results");
    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFile = path.join(outputDir, `unit-results-${timestamp}.json`);

    fs.writeFileSync(outputFile, JSON.stringify(processedResults, null, 2));

    // Also save as latest
    const latestFile = path.join(outputDir, "unit-results-latest.json");
    fs.writeFileSync(latestFile, JSON.stringify(processedResults, null, 2));
  } catch (error) {
    console.warn("⚠️  Could not save processed results:", error.message);
  }
}

function generateSummaryReport(processedResults) {
  const metrics = processedResults.unitTestMetrics;
  const results = processedResults;

  console.log("\n📋 Unit Test Results Summary");
  console.log("============================");

  // Basic results
  const passRate =
    (results.numPassedTests /
      (results.numPassedTests + results.numFailedTests)) *
    100;
  console.log(
    `Tests: ${results.numPassedTests + results.numFailedTests} | Passed: ${results.numPassedTests} | Failed: ${results.numFailedTests} | Pass Rate: ${passRate.toFixed(1)}%`,
  );

  // Performance metrics
  console.log(
    `Duration: ${Math.round(metrics.performance.totalDuration / 1000)}s | Average: ${Math.round(metrics.performance.averageDuration)}ms`,
  );

  // Memory metrics
  if (metrics.memory.peak > 0) {
    console.log(
      `Memory: ${Math.round(metrics.memory.peak / 1024 / 1024)}MB peak | Efficiency: ${metrics.memory.efficiency.toFixed(1)}%`,
    );
  }

  // Coverage metrics
  if (metrics.coverage.available) {
    console.log(
      `Coverage: ${metrics.coverage.summary.percentage.toFixed(1)}% (${metrics.coverage.summary.coveredLines}/${metrics.coverage.summary.totalLines} lines)`,
    );
  }

  // Recommendations
  if (metrics.recommendations.length > 0) {
    console.log("\n💡 Recommendations:");
    metrics.recommendations.forEach((rec, index) => {
      const priority =
        rec.priority === "high"
          ? "🔴"
          : rec.priority === "medium"
            ? "🟡"
            : "🟢";
      console.log(`${index + 1}. ${priority} ${rec.title}: ${rec.description}`);
    });
  }

  console.log(""); // Empty line for spacing
}

// Jest expects this function to be exported
module.exports = processResults;
