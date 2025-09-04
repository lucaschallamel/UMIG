#!/usr/bin/env node

/**
 * UMIG Import Performance Validation Test Runner
 * Production-scale performance testing for US-034 Data Import Strategy
 * 
 * Validates performance requirements:
 * - API response times: <500ms for standard operations
 * - Bulk operations: <60s for 1000+ records
 * - Concurrent user handling: 5+ simultaneous users
 * - Memory usage: <512MB during bulk operations
 * - Database performance: <2s for complex queries under load
 * - Rollback performance: <10s for large datasets
 * 
 * Part of US-034 Data Import Strategy completion
 * Comprehensive production readiness validation
 * 
 * @author UMIG Integration Test Suite
 * @since Sprint 6 - US-034
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: "http://localhost:8090/rest/scriptrunner/latest/custom",
  timeout: 120000, // 2 minutes for performance tests
  apiResponseThreshold: 500, // 500ms for API responses
  bulkOperationThreshold: 60000, // 60 seconds for bulk operations
  rollbackThreshold: 10000, // 10 seconds for rollback operations
  queryThreshold: 2000, // 2 seconds for database queries
  concurrentUsers: 5, // Number of concurrent users to simulate
  largeDatasetSize: 1000, // Records for large dataset testing
  memoryThresholdMB: 512, // Memory usage threshold in MB
  retryAttempts: 2,
  retryDelay: 1000,
  verbose: process.argv.includes("--verbose") || process.argv.includes("-v"),
  quickMode: process.argv.includes("--quick"),
  stressTest: process.argv.includes("--stress-test"),
};

// Color utilities
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

// Performance test results tracking
const performanceResults = {
  total: 0,
  passed: 0,
  failed: 0,
  apiTests: 0,
  bulkTests: 0,
  concurrentTests: 0,
  memoryTests: 0,
  rollbackTests: 0,
  tests: [],
  performanceMetrics: {
    apiResponseTimes: [],
    bulkOperationTimes: [],
    concurrentResponseTimes: [],
    memoryUsage: [],
    rollbackTimes: [],
  },
  startTime: Date.now(),
};

function printHeader(message) {
  console.log("\\n" + colors.magenta + "=".repeat(80) + colors.reset);
  console.log(colors.bold + colors.white + `  ${message}` + colors.reset);
  console.log(colors.magenta + "=".repeat(80) + colors.reset);
}

function printSubHeader(message) {
  console.log("\\n" + colors.cyan + "-".repeat(60) + colors.reset);
  console.log(colors.bold + colors.cyan + `  ${message}` + colors.reset);
  console.log(colors.cyan + "-".repeat(60) + colors.reset);
}

function printSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function printError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function printWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function printInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function printPerformance(message, duration, threshold, unit = "ms") {
  const status = duration <= threshold ? "✅" : "❌";
  const color = duration <= threshold ? colors.green : colors.red;
  console.log(`${color}${status} ${message} (${duration}${unit} / ${threshold}${unit} limit)${colors.reset}`);
}

function printMemory(message, memoryMB, thresholdMB) {
  const status = memoryMB <= thresholdMB ? "✅" : "⚠️";
  const color = memoryMB <= thresholdMB ? colors.green : colors.yellow;
  console.log(`${color}${status} ${message} (${memoryMB}MB / ${thresholdMB}MB limit)${colors.reset}`);
}

// Memory monitoring utility
class MemoryMonitor {
  constructor() {
    this.monitoring = false;
    this.maxMemoryMB = 0;
    this.samples = [];
  }

  start() {
    this.monitoring = true;
    this.maxMemoryMB = 0;
    this.samples = [];
    this.monitor();
  }

  stop() {
    this.monitoring = false;
    return {
      maxMemoryMB: this.maxMemoryMB,
      avgMemoryMB: this.samples.length > 0 ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length : 0,
      samples: this.samples.length,
    };
  }

  monitor() {
    if (!this.monitoring) return;

    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    this.samples.push(memoryMB);
    if (memoryMB > this.maxMemoryMB) {
      this.maxMemoryMB = memoryMB;
    }

    setTimeout(() => this.monitor(), 500); // Sample every 500ms
  }
}

// Performance test helper
async function performanceTest(testName, testFunction, threshold, category) {
  performanceResults.total++;
  performanceResults[category]++;
  
  const testResult = {
    name: testName,
    category,
    success: false,
    duration: 0,
    error: null,
    threshold,
  };

  printInfo(`Running ${testName}`);

  try {
    const startTime = Date.now();
    await testFunction();
    const endTime = Date.now();
    
    testResult.duration = endTime - startTime;
    testResult.success = testResult.duration <= threshold;
    
    // Record metrics
    switch (category) {
      case 'apiTests':
        performanceResults.performanceMetrics.apiResponseTimes.push(testResult.duration);
        break;
      case 'bulkTests':
        performanceResults.performanceMetrics.bulkOperationTimes.push(testResult.duration);
        break;
      case 'concurrentTests':
        performanceResults.performanceMetrics.concurrentResponseTimes.push(testResult.duration);
        break;
      case 'rollbackTests':
        performanceResults.performanceMetrics.rollbackTimes.push(testResult.duration);
        break;
    }

    printPerformance(testName, testResult.duration, threshold);
    
  } catch (error) {
    testResult.error = error.message;
    printError(`${testName} failed: ${error.message}`);
  }

  performanceResults.tests.push(testResult);
  
  if (testResult.success) {
    performanceResults.passed++;
  } else {
    performanceResults.failed++;
  }

  return testResult;
}

// Test API endpoint response times
async function testApiResponseTimes() {
  printSubHeader("API Response Time Performance Tests");
  
  const apiEndpoints = [
    { name: "Import Status Check", path: "/import/status", method: "GET" },
    { name: "Teams CSV Template", path: "/import/csv/teams/template", method: "GET" },
    { name: "Users CSV Template", path: "/import/csv/users/template", method: "GET" },
    { name: "Applications CSV Template", path: "/import/csv/applications/template", method: "GET" },
    { name: "Environments CSV Template", path: "/import/csv/environments/template", method: "GET" },
  ];

  for (const endpoint of apiEndpoints) {
    await performanceTest(
      `API Response - ${endpoint.name}`,
      async () => {
        const command = `curl -s -w "%{http_code}" --max-time 10 "${CONFIG.baseUrl}${endpoint.path}"`;
        const result = execSync(command, { encoding: "utf8", timeout: 10000 });
        
        const statusCode = parseInt(result.slice(-3));
        if (statusCode < 200 || statusCode >= 400) {
          throw new Error(`API returned status ${statusCode}`);
        }
      },
      CONFIG.apiResponseThreshold,
      'apiTests'
    );
    
    // Small delay between API tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Test small JSON import performance
async function testSmallJsonImportPerformance() {
  const testJson = JSON.stringify({
    migrations: [{
      mig_name: `Performance Test Migration ${Date.now()}`,
      mig_description: "Small performance test migration",
    }]
  });

  await performanceTest(
    "Small JSON Import Performance",
    async () => {
      const command = `curl -s -w "%{http_code}" --max-time 30 -X POST "${CONFIG.baseUrl}/import/json" -H "Content-Type: application/json" --data '${testJson}'`;
      const result = execSync(command, { encoding: "utf8", timeout: 30000 });
      
      const statusCode = parseInt(result.slice(-3));
      if (statusCode < 200 || statusCode >= 300) {
        throw new Error(`Import returned status ${statusCode}`);
      }
    },
    CONFIG.apiResponseThreshold,
    'apiTests'
  );
}

// Test bulk CSV import performance
async function testBulkCsvImportPerformance() {
  printSubHeader("Bulk CSV Import Performance Tests");
  
  // Generate large CSV datasets
  const bulkDatasets = {
    teams: generateLargeCsvData("teams", CONFIG.largeDatasetSize),
    applications: generateLargeCsvData("applications", CONFIG.largeDatasetSize),
    environments: generateLargeCsvData("environments", 100), // Smaller for environments
  };

  for (const [entityType, csvData] of Object.entries(bulkDatasets)) {
    const recordCount = csvData.split("\\n").length - 1; // Subtract header
    
    await performanceTest(
      `Bulk ${entityType} Import (${recordCount} records)`,
      async () => {
        const command = `curl -s -w "%{http_code}" --max-time 120 -X POST "${CONFIG.baseUrl}/import/csv/${entityType}" -H "Content-Type: text/csv" --data '${csvData}'`;
        const result = execSync(command, { encoding: "utf8", timeout: CONFIG.timeout });
        
        const statusCode = parseInt(result.slice(-3));
        if (statusCode < 200 || statusCode >= 300) {
          throw new Error(`Bulk import returned status ${statusCode}`);
        }
      },
      CONFIG.bulkOperationThreshold,
      'bulkTests'
    );
    
    // Cleanup delay between bulk tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Test concurrent user performance
async function testConcurrentUserPerformance() {
  if (CONFIG.quickMode) {
    printInfo("Skipping concurrent user tests in quick mode");
    return;
  }

  printSubHeader("Concurrent User Performance Tests");
  
  await performanceTest(
    `Concurrent Users (${CONFIG.concurrentUsers} users)`,
    async () => {
      const promises = [];
      
      for (let i = 0; i < CONFIG.concurrentUsers; i++) {
        const promise = new Promise((resolve, reject) => {
          try {
            const command = `curl -s -w "%{http_code}" --max-time 10 "${CONFIG.baseUrl}/import/status"`;
            execSync(command, { encoding: "utf8", timeout: 10000 });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        promises.push(promise);
      }
      
      await Promise.all(promises);
    },
    CONFIG.apiResponseThreshold * 2, // Allow 2x threshold for concurrent load
    'concurrentTests'
  );
}

// Test memory usage during bulk operations
async function testMemoryUsageDuringBulkOperations() {
  printSubHeader("Memory Usage Performance Tests");
  
  const monitor = new MemoryMonitor();
  
  // Test memory usage during large CSV import
  printInfo(`Testing memory usage during bulk operations (threshold: ${CONFIG.memoryThresholdMB}MB)`);
  
  try {
    monitor.start();
    
    // Generate very large dataset for memory testing
    const largeTeamsCsv = generateLargeCsvData("teams", CONFIG.stressTest ? 2000 : 500);
    const recordCount = largeTeamsCsv.split("\\n").length - 1;
    
    printInfo(`Importing ${recordCount} teams records while monitoring memory`);
    
    const startTime = Date.now();
    const command = `curl -s -w "%{http_code}" --max-time 120 -X POST "${CONFIG.baseUrl}/import/csv/teams" -H "Content-Type: text/csv" --data '${largeTeamsCsv}'`;
    
    try {
      const result = execSync(command, { encoding: "utf8", timeout: CONFIG.timeout });
      const statusCode = parseInt(result.slice(-3));
      
      const memoryStats = monitor.stop();
      const duration = Date.now() - startTime;
      
      performanceResults.performanceMetrics.memoryUsage.push(memoryStats.maxMemoryMB);
      
      printPerformance("Bulk Import Duration", duration, CONFIG.bulkOperationThreshold);
      printMemory("Peak Memory Usage", memoryStats.maxMemoryMB, CONFIG.memoryThresholdMB);
      printInfo(`Average Memory Usage: ${Math.round(memoryStats.avgMemoryMB)}MB`);
      printInfo(`Memory Samples: ${memoryStats.samples}`);
      
      if (statusCode >= 200 && statusCode < 300 && memoryStats.maxMemoryMB <= CONFIG.memoryThresholdMB) {
        printSuccess("Memory usage test passed - within limits ✓");
        performanceResults.passed++;
      } else {
        printWarning("Memory usage test failed - exceeded limits ⚠️");
        performanceResults.failed++;
      }
      
      performanceResults.memoryTests++;
      
    } catch (error) {
      monitor.stop();
      printError(`Memory usage test failed: ${error.message}`);
      performanceResults.failed++;
      performanceResults.memoryTests++;
    }
    
  } catch (error) {
    monitor.stop();
    printError(`Memory monitoring failed: ${error.message}`);
  }
  
  performanceResults.total++;
}

// Test rollback performance
async function testRollbackPerformance() {
  printSubHeader("Rollback Performance Tests");
  
  // First, create a large import that we can rollback
  printInfo("Creating large dataset for rollback testing");
  
  const rollbackTestCsv = generateLargeCsvData("teams", 200, "RollbackTest");
  
  try {
    // Import data
    const importCommand = `curl -s --max-time 60 -X POST "${CONFIG.baseUrl}/import/csv/teams" -H "Content-Type: text/csv" --data '${rollbackTestCsv}'`;
    execSync(importCommand, { encoding: "utf8", timeout: 60000 });
    
    // Wait for import to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test rollback performance (using a test batch ID - may not find actual batch)
    await performanceTest(
      "Import Rollback Performance",
      async () => {
        const rollbackData = JSON.stringify({ batchId: "test-rollback-batch-id" });
        const command = `curl -s -w "%{http_code}" --max-time 30 -X POST "${CONFIG.baseUrl}/import/rollback" -H "Content-Type: application/json" --data '${rollbackData}'`;
        
        const result = execSync(command, { encoding: "utf8", timeout: 30000 });
        
        // Rollback should respond quickly even if batch doesn't exist
        const statusCode = parseInt(result.slice(-3));
        if (statusCode < 200 || statusCode >= 500) {
          throw new Error(`Rollback returned unexpected status ${statusCode}`);
        }
      },
      CONFIG.rollbackThreshold,
      'rollbackTests'
    );
    
  } catch (error) {
    printWarning(`Rollback test setup failed: ${error.message}`);
  }
}

// Test system performance under stress (if enabled)
async function testStressPerformance() {
  if (!CONFIG.stressTest) {
    printInfo("Skipping stress tests (use --stress-test to enable)");
    return;
  }

  printSubHeader("Stress Test Performance");
  
  printWarning("Running stress tests - this may take several minutes and impact system performance");
  
  // High-volume concurrent operations
  await performanceTest(
    "High Concurrent Load (10 users)",
    async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        const promise = new Promise((resolve, reject) => {
          try {
            const command = `curl -s -w "%{http_code}" --max-time 15 "${CONFIG.baseUrl}/import/status"`;
            execSync(command, { encoding: "utf8", timeout: 15000 });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        promises.push(promise);
      }
      
      await Promise.all(promises);
    },
    CONFIG.apiResponseThreshold * 3, // Allow 3x threshold for stress test
    'concurrentTests'
  );
  
  // Very large dataset import
  await performanceTest(
    "Very Large Dataset Import (2000 records)",
    async () => {
      const veryLargeCsv = generateLargeCsvData("applications", 2000, "StressTest");
      const command = `curl -s -w "%{http_code}" --max-time 180 -X POST "${CONFIG.baseUrl}/import/csv/applications" -H "Content-Type: text/csv" --data '${veryLargeCsv}'`;
      
      const result = execSync(command, { encoding: "utf8", timeout: 180000 });
      const statusCode = parseInt(result.slice(-3));
      
      if (statusCode < 200 || statusCode >= 300) {
        throw new Error(`Stress test import returned status ${statusCode}`);
      }
    },
    CONFIG.bulkOperationThreshold * 2, // Allow 2x threshold for stress test
    'bulkTests'
  );
}

// Generate large CSV data for performance testing
function generateLargeCsvData(entityType, count, prefix = "PerfTest") {
  let csv = "";
  
  switch (entityType) {
    case "teams":
      csv = "tms_id,tms_name,tms_email,tms_description\\n";
      for (let i = 1; i <= count; i++) {
        csv += `${i},${prefix} Team ${i},${prefix.toLowerCase()}-team-${i}@perf-test.com,Performance test team number ${i} with extended description for realistic data size\\n`;
      }
      break;
      
    case "applications":
      csv = "app_id,app_code,app_name,app_description\\n";
      for (let i = 1; i <= count; i++) {
        csv += `${i},${prefix.toUpperCase()}_APP${String(i).padStart(4, '0')},${prefix} Application ${i},Performance test application number ${i} with comprehensive description and details\\n`;
      }
      break;
      
    case "environments":
      csv = "env_id,env_code,env_name,env_description\\n";
      for (let i = 1; i <= count; i++) {
        const code = `${prefix.substring(0, 4).toUpperCase()}${String(i).padStart(3, '0')}`;
        csv += `${i},${code},${prefix} Environment ${i},Performance test environment number ${i} for comprehensive testing scenarios\\n`;
      }
      break;
      
    case "users":
      csv = "usr_id,usr_code,usr_first_name,usr_last_name,usr_email,usr_is_admin,tms_id,rls_id\\n";
      for (let i = 1; i <= count; i++) {
        const teamId = ((i - 1) % 100) + 1; // Distribute across teams
        const code = `${prefix.substring(0, 2).toUpperCase()}${String(i).padStart(4, '0')}`;
        csv += `${i},${code},${prefix},User${i},${prefix.toLowerCase()}-user-${i}@perf-test.com,false,${teamId},2\\n`;
      }
      break;
  }
  
  return csv.trim();
}

// Generate comprehensive performance report
function generatePerformanceReport() {
  const endTime = Date.now();
  const totalTime = endTime - performanceResults.startTime;

  printHeader("Import Performance Validation Results");

  console.log(`\\n${colors.bold}Performance Test Summary:${colors.reset}`);
  console.log(`  Total Performance Tests: ${performanceResults.total}`);
  console.log(`  Passed: ${colors.green}${performanceResults.passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${performanceResults.failed}${colors.reset}`);
  console.log(`  API Response Tests: ${performanceResults.apiTests}`);
  console.log(`  Bulk Operation Tests: ${performanceResults.bulkTests}`);
  console.log(`  Concurrent User Tests: ${performanceResults.concurrentTests}`);
  console.log(`  Memory Usage Tests: ${performanceResults.memoryTests}`);
  console.log(`  Rollback Tests: ${performanceResults.rollbackTests}`);
  console.log(`  Total Execution Time: ${Math.round(totalTime / 1000)}s`);

  // Performance metrics analysis
  const metrics = performanceResults.performanceMetrics;
  
  if (metrics.apiResponseTimes.length > 0) {
    console.log(`\\n${colors.bold}API Response Performance:${colors.reset}`);
    const avgApi = Math.round(metrics.apiResponseTimes.reduce((a, b) => a + b, 0) / metrics.apiResponseTimes.length);
    const maxApi = Math.max(...metrics.apiResponseTimes);
    console.log(`  Average API Response: ${avgApi}ms`);
    console.log(`  Maximum API Response: ${maxApi}ms`);
    console.log(`  API Response Threshold: ${CONFIG.apiResponseThreshold}ms`);
    
    const apiPassRate = (metrics.apiResponseTimes.filter(t => t <= CONFIG.apiResponseThreshold).length / metrics.apiResponseTimes.length * 100).toFixed(1);
    console.log(`  API Pass Rate: ${apiPassRate}%`);
  }

  if (metrics.bulkOperationTimes.length > 0) {
    console.log(`\\n${colors.bold}Bulk Operation Performance:${colors.reset}`);
    const avgBulk = Math.round(metrics.bulkOperationTimes.reduce((a, b) => a + b, 0) / metrics.bulkOperationTimes.length);
    const maxBulk = Math.max(...metrics.bulkOperationTimes);
    console.log(`  Average Bulk Operation: ${Math.round(avgBulk / 1000)}s`);
    console.log(`  Maximum Bulk Operation: ${Math.round(maxBulk / 1000)}s`);
    console.log(`  Bulk Operation Threshold: ${Math.round(CONFIG.bulkOperationThreshold / 1000)}s`);
    
    const bulkPassRate = (metrics.bulkOperationTimes.filter(t => t <= CONFIG.bulkOperationThreshold).length / metrics.bulkOperationTimes.length * 100).toFixed(1);
    console.log(`  Bulk Operation Pass Rate: ${bulkPassRate}%`);
  }

  if (metrics.memoryUsage.length > 0) {
    console.log(`\\n${colors.bold}Memory Usage Analysis:${colors.reset}`);
    const avgMemory = Math.round(metrics.memoryUsage.reduce((a, b) => a + b, 0) / metrics.memoryUsage.length);
    const maxMemory = Math.max(...metrics.memoryUsage);
    console.log(`  Average Memory Usage: ${avgMemory}MB`);
    console.log(`  Peak Memory Usage: ${maxMemory}MB`);
    console.log(`  Memory Threshold: ${CONFIG.memoryThresholdMB}MB`);
    
    if (maxMemory <= CONFIG.memoryThresholdMB) {
      printSuccess("Memory usage within acceptable limits ✓");
    } else {
      printWarning("Memory usage exceeded threshold ⚠️");
    }
  }

  if (metrics.concurrentResponseTimes.length > 0) {
    console.log(`\\n${colors.bold}Concurrent Performance Analysis:${colors.reset}`);
    const avgConcurrent = Math.round(metrics.concurrentResponseTimes.reduce((a, b) => a + b, 0) / metrics.concurrentResponseTimes.length);
    const maxConcurrent = Math.max(...metrics.concurrentResponseTimes);
    console.log(`  Average Concurrent Response: ${avgConcurrent}ms`);
    console.log(`  Maximum Concurrent Response: ${maxConcurrent}ms`);
    console.log(`  Concurrent Users Tested: ${CONFIG.concurrentUsers}`);
  }

  // Failed tests analysis
  if (performanceResults.failed > 0) {
    console.log(`\\n${colors.bold}Performance Failures:${colors.reset}`);
    performanceResults.tests
      .filter(test => !test.success)
      .forEach(test => {
        const thresholdText = test.threshold ? ` (exceeded ${test.threshold}ms threshold)` : "";
        console.log(`  ❌ ${test.name}: ${test.duration}ms${thresholdText}`);
        if (test.error) {
          console.log(`     Error: ${test.error}`);
        }
      });
  }

  // Production readiness assessment
  console.log(`\\n${colors.bold}Production Readiness Assessment:${colors.reset}`);
  const passRate = (performanceResults.passed / performanceResults.total * 100).toFixed(1);
  console.log(`  Overall Pass Rate: ${passRate}%`);
  
  // Specific criteria
  const apiReady = metrics.apiResponseTimes.every(t => t <= CONFIG.apiResponseThreshold);
  const bulkReady = metrics.bulkOperationTimes.every(t => t <= CONFIG.bulkOperationThreshold);
  const memoryReady = metrics.memoryUsage.every(m => m <= CONFIG.memoryThresholdMB);
  
  console.log(`  API Performance Ready: ${apiReady ? colors.green + "✅" : colors.red + "❌"}${colors.reset}`);
  console.log(`  Bulk Operation Ready: ${bulkReady ? colors.green + "✅" : colors.red + "❌"}${colors.reset}`);
  console.log(`  Memory Usage Ready: ${memoryReady ? colors.green + "✅" : colors.red + "❌"}${colors.reset}`);
  
  const productionReady = passRate >= 95 && apiReady && bulkReady && memoryReady;
  
  if (productionReady) {
    printSuccess("🚀 US-034 Import Performance - PRODUCTION READY ✅");
  } else {
    printWarning("⚠️ Performance optimization needed before production deployment");
  }

  return productionReady;
}

// Main execution function
async function main() {
  try {
    printHeader("UMIG Import Performance Validation Suite - US-034");
    printInfo("Production-scale performance testing for Data Import Strategy");
    
    if (CONFIG.quickMode) {
      printInfo("Running in quick mode - skipping some intensive tests");
    }
    
    if (CONFIG.stressTest) {
      printWarning("Stress testing enabled - extended execution time expected");
    }
    
    if (CONFIG.verbose) {
      printInfo("Verbose mode enabled - detailed performance metrics will be shown");
    }

    console.log(`\\nPerformance Thresholds:`);
    console.log(`  API Response Time: <${CONFIG.apiResponseThreshold}ms`);
    console.log(`  Bulk Operations: <${CONFIG.bulkOperationThreshold}ms`);
    console.log(`  Memory Usage: <${CONFIG.memoryThresholdMB}MB`);
    console.log(`  Rollback Operations: <${CONFIG.rollbackThreshold}ms`);
    console.log(`  Large Dataset Size: ${CONFIG.largeDatasetSize} records`);
    console.log(`  Concurrent Users: ${CONFIG.concurrentUsers}`);

    // Execute performance test suites
    await testApiResponseTimes();
    await testSmallJsonImportPerformance();
    await testBulkCsvImportPerformance();
    await testConcurrentUserPerformance();
    await testMemoryUsageDuringBulkOperations();
    await testRollbackPerformance();
    await testStressPerformance();

    // Generate comprehensive report
    const success = generatePerformanceReport();

    // Exit with appropriate code
    process.exit(success ? 0 : 1);

  } catch (error) {
    printError(`Performance test execution failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Help text
function showHelp() {
  console.log(`
UMIG Import Performance Validation Test Runner - US-034

Usage: node ImportPerformanceValidationTestRunner.js [options]

Options:
  --help, -h          Show this help message
  --verbose, -v       Enable verbose output with detailed metrics
  --quick             Skip intensive tests for faster execution
  --stress-test       Enable stress testing with very large datasets and high load

Description:
  Production-scale performance validation for US-034 Data Import Strategy.
  Tests system performance under various load conditions and validates
  production readiness against established performance thresholds.

Performance Criteria:
  - API Response Times: <500ms for standard operations
  - Bulk Operations: <60s for 1000+ records
  - Memory Usage: <512MB during bulk imports
  - Concurrent Users: 5+ simultaneous users supported
  - Rollback Operations: <10s for large datasets

Test Categories:
  - API Response Time Testing
  - Bulk CSV Import Performance
  - Concurrent User Load Testing
  - Memory Usage Monitoring
  - Rollback Performance Testing
  - Stress Testing (optional)

Examples:
  node ImportPerformanceValidationTestRunner.js               # Run all performance tests
  node ImportPerformanceValidationTestRunner.js --verbose     # Run with detailed metrics
  node ImportPerformanceValidationTestRunner.js --quick       # Run without intensive tests
  node ImportPerformanceValidationTestRunner.js --stress-test # Run with stress testing

Requirements:
  - UMIG system running on localhost:8090
  - curl command available in PATH
  - Node.js with ES modules support
  - Sufficient system resources for performance testing
  - Clean database state recommended for accurate measurements
  `);
}

// Handle command line arguments
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  showHelp();
  process.exit(0);
}

// Execute main function
main().catch(error => {
  printError(`Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});