/**
 * TD-005 Phase 4: Enhanced Performance Monitor (No Experimental Features)
 *
 * Advanced performance monitoring system for US-087 Phase 2 Teams Migration readiness.
 * Provides comprehensive performance tracking without relying on experimental Jest features
 * like detectLeaks, ensuring stable execution while maintaining monitoring capabilities.
 *
 * PERFORMANCE TARGETS (US-087 Phase 2):
 * - Memory usage: <512MB peak
 * - Test execution: <2000ms per test suite
 * - Component initialization: <500ms
 * - Teams migration readiness: 100% test pass rate
 *
 * @version 4.0 (TD-005 Phase 4)
 * @author gendev-test-suite-generator
 * @priority High (US-087 Migration Readiness)
 */

export class EnhancedPerformanceMonitor {
  constructor() {
    this.metrics = {
      memory: [],
      execution: [],
      components: [],
      teams: [],
    };
    this.thresholds = {
      memoryLimit: 512, // MB
      executionLimit: 2000, // ms
      componentInitLimit: 500, // ms
      passRateThreshold: 100, // %
    };
    this.monitoringActive = false;
    this.startTime = null;
  }

  /**
   * Start performance monitoring session
   */
  startMonitoring(sessionName = "default") {
    this.monitoringActive = true;
    this.startTime = Date.now();
    this.sessionName = sessionName;

    console.log(`🚀 Starting enhanced performance monitoring: ${sessionName}`);
    console.log(
      `📊 Targets: Memory <${this.thresholds.memoryLimit}MB, Execution <${this.thresholds.executionLimit}ms`,
    );

    // Initial memory baseline
    this.recordMemoryUsage("session_start");

    return this;
  }

  /**
   * Record memory usage with detailed breakdown
   */
  recordMemoryUsage(checkpoint = "checkpoint") {
    if (!this.monitoringActive) return;

    const memoryUsage = process.memoryUsage();
    const timestamp = Date.now();

    const memoryRecord = {
      checkpoint,
      timestamp,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      heapUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(1),
      heapTotalMB: (memoryUsage.heapTotal / 1024 / 1024).toFixed(1),
      externalMB: (memoryUsage.external / 1024 / 1024).toFixed(1),
      rssMB: (memoryUsage.rss / 1024 / 1024).toFixed(1),
      utilizationPercent: (
        (memoryUsage.heapUsed / (this.thresholds.memoryLimit * 1024 * 1024)) *
        100
      ).toFixed(1),
      compliant:
        memoryUsage.heapUsed < this.thresholds.memoryLimit * 1024 * 1024,
    };

    this.metrics.memory.push(memoryRecord);

    // Log memory status if over threshold
    if (!memoryRecord.compliant) {
      console.warn(
        `⚠️ Memory threshold exceeded at ${checkpoint}: ${memoryRecord.heapUsedMB}MB > ${this.thresholds.memoryLimit}MB`,
      );
    }

    return memoryRecord;
  }

  /**
   * Record test execution performance
   */
  recordExecution(testName, executionTime, passRate = null) {
    if (!this.monitoringActive) return;

    const executionRecord = {
      testName,
      executionTime,
      passRate,
      timestamp: Date.now(),
      compliant: executionTime < this.thresholds.executionLimit,
      passRateCompliant:
        passRate === null || passRate >= this.thresholds.passRateThreshold,
    };

    this.metrics.execution.push(executionRecord);

    if (!executionRecord.compliant) {
      console.warn(
        `⚠️ Execution time threshold exceeded for ${testName}: ${executionTime}ms > ${this.thresholds.executionLimit}ms`,
      );
    }

    if (passRate !== null && !executionRecord.passRateCompliant) {
      console.error(
        `❌ Pass rate below threshold for ${testName}: ${passRate}% < ${this.thresholds.passRateThreshold}%`,
      );
    }

    return executionRecord;
  }

  /**
   * Record component performance specifically for Teams migration
   */
  recordComponentPerformance(
    componentName,
    initTime,
    renderTime = null,
    operation = "init",
  ) {
    if (!this.monitoringActive) return;

    const componentRecord = {
      componentName,
      operation,
      initTime,
      renderTime,
      totalTime: initTime + (renderTime || 0),
      timestamp: Date.now(),
      initCompliant: initTime < this.thresholds.componentInitLimit,
      teamsRelated: componentName.toLowerCase().includes("teams"),
    };

    this.metrics.components.push(componentRecord);

    if (!componentRecord.initCompliant) {
      console.warn(
        `⚠️ Component init time exceeded for ${componentName}: ${initTime}ms > ${this.thresholds.componentInitLimit}ms`,
      );
    }

    return componentRecord;
  }

  /**
   * Record Teams-specific migration metrics
   */
  recordTeamsMigrationMetric(metric, value, unit = "", compliant = true) {
    if (!this.monitoringActive) return;

    const teamsRecord = {
      metric,
      value,
      unit,
      compliant,
      timestamp: Date.now(),
    };

    this.metrics.teams.push(teamsRecord);

    if (!compliant) {
      console.warn(
        `⚠️ Teams migration metric non-compliant: ${metric} = ${value}${unit}`,
      );
    }

    return teamsRecord;
  }

  /**
   * Generate performance analysis for current session
   */
  analyzePerformance() {
    if (!this.monitoringActive) {
      console.warn(
        "Performance monitoring not active. Start monitoring first.",
      );
      return null;
    }

    const sessionDuration = Date.now() - this.startTime;

    // Memory analysis
    const memoryMetrics = this.analyzeMemoryMetrics();

    // Execution analysis
    const executionMetrics = this.analyzeExecutionMetrics();

    // Component analysis
    const componentMetrics = this.analyzeComponentMetrics();

    // Teams-specific analysis
    const teamsMetrics = this.analyzeTeamsMetrics();

    const analysis = {
      session: {
        name: this.sessionName,
        duration: sessionDuration,
        startTime: this.startTime,
        endTime: Date.now(),
      },
      memory: memoryMetrics,
      execution: executionMetrics,
      components: componentMetrics,
      teams: teamsMetrics,
      us087Readiness: this.assessUS087Readiness(
        memoryMetrics,
        executionMetrics,
        componentMetrics,
        teamsMetrics,
      ),
    };

    return analysis;
  }

  /**
   * Analyze memory metrics
   */
  analyzeMemoryMetrics() {
    const memoryData = this.metrics.memory;
    if (memoryData.length === 0) return { status: "no_data" };

    const latest = memoryData[memoryData.length - 1];
    const peak = memoryData.reduce((max, record) =>
      record.heapUsed > max.heapUsed ? record : max,
    );
    const compliantRecords = memoryData.filter(
      (record) => record.compliant,
    ).length;
    const complianceRate = (compliantRecords / memoryData.length) * 100;

    return {
      status: "analyzed",
      latest: latest.heapUsedMB,
      peak: peak.heapUsedMB,
      peakTimestamp: peak.timestamp,
      complianceRate: complianceRate.toFixed(1),
      threshold: this.thresholds.memoryLimit,
      compliant:
        latest.compliant &&
        peak.heapUsed < this.thresholds.memoryLimit * 1024 * 1024,
      checkpoints: memoryData.length,
    };
  }

  /**
   * Analyze execution metrics
   */
  analyzeExecutionMetrics() {
    const executionData = this.metrics.execution;
    if (executionData.length === 0) return { status: "no_data" };

    const avgExecutionTime =
      executionData.reduce((sum, record) => sum + record.executionTime, 0) /
      executionData.length;
    const maxExecutionTime = Math.max(
      ...executionData.map((record) => record.executionTime),
    );
    const compliantExecutions = executionData.filter(
      (record) => record.compliant,
    ).length;
    const executionComplianceRate =
      (compliantExecutions / executionData.length) * 100;

    const passRateData = executionData.filter(
      (record) => record.passRate !== null,
    );
    const avgPassRate =
      passRateData.length > 0
        ? passRateData.reduce((sum, record) => sum + record.passRate, 0) /
          passRateData.length
        : null;

    return {
      status: "analyzed",
      avgExecutionTime: avgExecutionTime.toFixed(1),
      maxExecutionTime,
      executionComplianceRate: executionComplianceRate.toFixed(1),
      avgPassRate: avgPassRate ? avgPassRate.toFixed(1) : null,
      testsExecuted: executionData.length,
      threshold: this.thresholds.executionLimit,
      compliant:
        executionComplianceRate >= 90 &&
        (avgPassRate === null ||
          avgPassRate >= this.thresholds.passRateThreshold),
    };
  }

  /**
   * Analyze component metrics
   */
  analyzeComponentMetrics() {
    const componentData = this.metrics.components;
    if (componentData.length === 0) return { status: "no_data" };

    const avgInitTime =
      componentData.reduce((sum, record) => sum + record.initTime, 0) /
      componentData.length;
    const maxInitTime = Math.max(
      ...componentData.map((record) => record.initTime),
    );
    const compliantComponents = componentData.filter(
      (record) => record.initCompliant,
    ).length;
    const componentComplianceRate =
      (compliantComponents / componentData.length) * 100;
    const teamsComponents = componentData.filter(
      (record) => record.teamsRelated,
    ).length;

    return {
      status: "analyzed",
      avgInitTime: avgInitTime.toFixed(1),
      maxInitTime,
      componentComplianceRate: componentComplianceRate.toFixed(1),
      componentsAnalyzed: componentData.length,
      teamsComponents,
      threshold: this.thresholds.componentInitLimit,
      compliant: componentComplianceRate >= 90,
    };
  }

  /**
   * Analyze Teams-specific metrics
   */
  analyzeTeamsMetrics() {
    const teamsData = this.metrics.teams;
    if (teamsData.length === 0) return { status: "no_data" };

    const compliantMetrics = teamsData.filter(
      (metric) => metric.compliant,
    ).length;
    const teamsComplianceRate = (compliantMetrics / teamsData.length) * 100;

    return {
      status: "analyzed",
      metricsRecorded: teamsData.length,
      complianceRate: teamsComplianceRate.toFixed(1),
      compliant: teamsComplianceRate >= 95,
      metrics: teamsData.map((metric) => ({
        name: metric.metric,
        value: metric.value,
        compliant: metric.compliant,
      })),
    };
  }

  /**
   * Assess US-087 Phase 2 readiness
   */
  assessUS087Readiness(memory, execution, components, teams) {
    const checks = [
      {
        name: "Memory Performance",
        status: memory.compliant,
        details: `Peak: ${memory.peak}MB, Compliance: ${memory.complianceRate}%`,
      },
      {
        name: "Execution Performance",
        status: execution.compliant,
        details: `Avg: ${execution.avgExecutionTime}ms, Pass Rate: ${execution.avgPassRate || "N/A"}%`,
      },
      {
        name: "Component Performance",
        status: components.compliant,
        details: `Avg Init: ${components.avgInitTime}ms, Compliance: ${components.componentComplianceRate}%`,
      },
      {
        name: "Teams Migration Readiness",
        status: teams.compliant,
        details: `Metrics: ${teams.metricsRecorded}, Compliance: ${teams.complianceRate}%`,
      },
    ];

    const passedChecks = checks.filter((check) => check.status).length;
    const readinessPercentage = (passedChecks / checks.length) * 100;
    const ready = readinessPercentage >= 75; // 75% of checks must pass

    return {
      ready,
      readinessPercentage: readinessPercentage.toFixed(1),
      passedChecks,
      totalChecks: checks.length,
      checks,
      recommendation: ready
        ? "PROCEED with US-087 Phase 2 Teams Migration"
        : "REVIEW performance issues before proceeding with migration",
    };
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport() {
    const analysis = this.analyzePerformance();
    if (!analysis) return null;

    console.log("\n📊 Enhanced Performance Report (TD-005 Phase 4)");
    console.log("=".repeat(60));
    console.log(`📋 Session: ${analysis.session.name}`);
    console.log(
      `⏱️  Duration: ${(analysis.session.duration / 1000).toFixed(1)}s`,
    );

    // Memory Report
    console.log("\n🧠 Memory Performance:");
    console.log(`  Current: ${analysis.memory.latest}MB`);
    console.log(`  Peak: ${analysis.memory.peak}MB`);
    console.log(
      `  Compliance: ${analysis.memory.complianceRate}% (${analysis.memory.compliant ? "✅" : "❌"})`,
    );

    // Execution Report
    console.log("\n⚡ Execution Performance:");
    console.log(`  Avg Time: ${analysis.execution.avgExecutionTime}ms`);
    console.log(`  Max Time: ${analysis.execution.maxExecutionTime}ms`);
    console.log(`  Pass Rate: ${analysis.execution.avgPassRate || "N/A"}%`);
    console.log(
      `  Compliance: ${analysis.execution.executionComplianceRate}% (${analysis.execution.compliant ? "✅" : "❌"})`,
    );

    // Component Report
    console.log("\n🧩 Component Performance:");
    console.log(`  Avg Init: ${analysis.components.avgInitTime}ms`);
    console.log(`  Max Init: ${analysis.components.maxInitTime}ms`);
    console.log(`  Teams Components: ${analysis.components.teamsComponents}`);
    console.log(
      `  Compliance: ${analysis.components.componentComplianceRate}% (${analysis.components.compliant ? "✅" : "❌"})`,
    );

    // Teams Report
    console.log("\n👥 Teams Migration Readiness:");
    console.log(`  Metrics Tracked: ${analysis.teams.metricsRecorded}`);
    console.log(
      `  Compliance: ${analysis.teams.complianceRate}% (${analysis.teams.compliant ? "✅" : "❌"})`,
    );

    // US-087 Readiness
    console.log("\n🎯 US-087 Phase 2 Migration Readiness:");
    console.log(
      `  Status: ${analysis.us087Readiness.ready ? "✅ READY" : "❌ NOT READY"}`,
    );
    console.log(
      `  Score: ${analysis.us087Readiness.readinessPercentage}% (${analysis.us087Readiness.passedChecks}/${analysis.us087Readiness.totalChecks} checks passed)`,
    );
    console.log(`  Recommendation: ${analysis.us087Readiness.recommendation}`);

    // Detailed check results
    console.log("\n📝 Detailed Check Results:");
    analysis.us087Readiness.checks.forEach((check) => {
      console.log(
        `  ${check.status ? "✅" : "❌"} ${check.name}: ${check.details}`,
      );
    });

    console.log("\n" + "=".repeat(60));

    return analysis;
  }

  /**
   * Stop monitoring and generate final report
   */
  stopMonitoring() {
    if (!this.monitoringActive) {
      console.warn("Performance monitoring not active");
      return null;
    }

    this.recordMemoryUsage("session_end");
    this.monitoringActive = false;

    console.log(`🏁 Performance monitoring stopped: ${this.sessionName}`);

    return this.generateReport();
  }

  /**
   * Export metrics data for external analysis
   */
  exportMetrics() {
    return {
      memory: this.metrics.memory,
      execution: this.metrics.execution,
      components: this.metrics.components,
      teams: this.metrics.teams,
      thresholds: this.thresholds,
      session: {
        name: this.sessionName,
        startTime: this.startTime,
        active: this.monitoringActive,
      },
    };
  }
}

// Global monitor instance
export const performanceMonitor = new EnhancedPerformanceMonitor();

// Helper functions for easy integration
export function startPerformanceMonitoring(sessionName) {
  return performanceMonitor.startMonitoring(sessionName);
}

export function recordMemory(checkpoint) {
  return performanceMonitor.recordMemoryUsage(checkpoint);
}

export function recordExecution(testName, executionTime, passRate) {
  return performanceMonitor.recordExecution(testName, executionTime, passRate);
}

export function recordComponent(
  componentName,
  initTime,
  renderTime,
  operation,
) {
  return performanceMonitor.recordComponentPerformance(
    componentName,
    initTime,
    renderTime,
    operation,
  );
}

export function recordTeamsMetric(metric, value, unit, compliant) {
  return performanceMonitor.recordTeamsMigrationMetric(
    metric,
    value,
    unit,
    compliant,
  );
}

export function generatePerformanceReport() {
  return performanceMonitor.generateReport();
}

export function stopPerformanceMonitoring() {
  return performanceMonitor.stopMonitoring();
}

// Export default
export default EnhancedPerformanceMonitor;
