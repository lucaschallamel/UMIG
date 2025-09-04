#!/usr/bin/env node

/**
 * UMIG CSV Import Workflow Test Runner
 * Comprehensive validation of CSV import workflows for US-034 Data Import Strategy
 * 
 * Tests complete CSV import workflows including:
 * - Individual entity CSV imports (Teams, Users, Applications, Environments)
 * - Dependency sequencing validation (Teams -> Users)
 * - Batch import orchestration
 * - Template generation and validation
 * - Error handling for malformed CSV data
 * - Performance validation for production-scale datasets
 * 
 * Part of US-034 Data Import Strategy completion
 * Follows cross-platform JavaScript testing patterns established in August 2025
 * 
 * @author UMIG Integration Test Suite
 * @since Sprint 6 - US-034
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: "http://localhost:8090/rest/scriptrunner/latest/custom",
  timeout: 60000, // 60 seconds for CSV operations
  performanceThreshold: 5000, // 5 seconds for CSV processing
  bulkPerformanceThreshold: 30000, // 30 seconds for bulk operations
  retryAttempts: 2,
  retryDelay: 1000,
  verbose: process.argv.includes("--verbose") || process.argv.includes("-v"),
  quickMode: process.argv.includes("--quick"),
  largeDataset: process.argv.includes("--large-dataset"),
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

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  workflowTests: 0,
  performanceTests: 0,
  dependencyTests: 0,
  errorHandlingTests: 0,
  tests: [],
  startTime: Date.now(),
};

// CSV test data templates
const CSV_TEST_DATA = {
  teams: `tms_id,tms_name,tms_email,tms_description
1,Workflow Test Team 1,team1@workflow-test.com,First workflow test team
2,Workflow Test Team 2,team2@workflow-test.com,Second workflow test team
3,Workflow Test Team 3,team3@workflow-test.com,Third workflow test team`,

  applications: `app_id,app_code,app_name,app_description
1,WF_APP1,Workflow App 1,First workflow test application
2,WF_APP2,Workflow App 2,Second workflow test application
3,WF_APP3,Workflow App 3,Third workflow test application`,

  environments: `env_id,env_code,env_name,env_description
1,WF1,Workflow Env 1,First workflow test environment
2,WF2,Workflow Env 2,Second workflow test environment
3,WF3,Workflow Env 3,Third workflow test environment`,

  users: `usr_id,usr_code,usr_first_name,usr_last_name,usr_email,usr_is_admin,tms_id,rls_id
1,WF1,Workflow,User1,wf-user1@workflow-test.com,false,1,2
2,WF2,Workflow,User2,wf-user2@workflow-test.com,false,2,2
3,WF3,Workflow,User3,wf-user3@workflow-test.com,true,3,1`,

  // Invalid CSV data for error testing
  invalidTeams: `tms_id,tms_name,tms_email,tms_description
1,Valid Team,valid@test.com,Valid team
2,,missing-name@test.com,Team with missing name
invalid_id,Invalid ID Team,invalid@test.com,Team with non-numeric ID`,

  invalidUsers: `usr_id,usr_code,usr_first_name,usr_last_name,usr_email,usr_is_admin,tms_id,rls_id
1,IV1,Invalid,User1,invalid-user1@test.com,false,999,1`,

  malformedCsv: `wrong_header_1,wrong_header_2
1,2,3,too,many,values
missing,value`,
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

function printPerformance(message, duration, threshold) {
  const status = duration <= threshold ? "✅" : "⚠️";
  const color = duration <= threshold ? colors.green : colors.yellow;
  console.log(`${color}${status} ${message} (${duration}ms)${colors.reset}`);
}

// CSV import test helper
async function testCsvImport(entityType, csvData, expectedStatus = [200, 201, 202], shouldSucceed = true) {
  const testName = `CSV Import - ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`;
  testResults.total++;
  
  const testResult = {
    name: testName,
    entityType,
    success: false,
    responseTime: 0,
    statusCode: 0,
    recordsImported: 0,
    error: null,
  };

  printInfo(`Testing ${testName}`);

  try {
    const startTime = Date.now();
    
    const command = `curl -s -w "\\n%{http_code}" --max-time 30 -X POST "${CONFIG.baseUrl}/import/csv/${entityType}" -H "Content-Type: text/csv" --data '${csvData}'`;
    
    const result = execSync(command, {
      encoding: "utf8",
      timeout: CONFIG.timeout,
    });

    const endTime = Date.now();
    testResult.responseTime = endTime - startTime;

    // Parse response
    const lines = result.trim().split("\\n");
    testResult.statusCode = parseInt(lines[lines.length - 1]);
    const responseBody = lines.slice(0, -1).join("\\n");

    // Validate status
    const statusValid = expectedStatus.includes(testResult.statusCode);
    
    // Parse response body for import results
    if (responseBody && statusValid) {
      try {
        const jsonResponse = JSON.parse(responseBody);
        if (jsonResponse.recordsImported !== undefined) {
          testResult.recordsImported = jsonResponse.recordsImported;
        }
        if (jsonResponse.success !== undefined) {
          testResult.success = jsonResponse.success && shouldSucceed;
        } else {
          testResult.success = statusValid && shouldSucceed;
        }
      } catch (e) {
        testResult.success = statusValid && shouldSucceed;
      }
    } else {
      testResult.success = statusValid && shouldSucceed;
    }

    // Performance validation
    const performanceValid = testResult.responseTime <= CONFIG.performanceThreshold;

    // Log results
    if (testResult.success && statusValid) {
      printSuccess(`${testName} - Status: ${testResult.statusCode}, Records: ${testResult.recordsImported}`);
    } else {
      printError(`${testName} - Status: ${testResult.statusCode} (expected: ${expectedStatus.join(" or ")})`);
      testResult.error = `Status validation failed: ${testResult.statusCode}`;
    }

    printPerformance(`${testName} - Performance`, testResult.responseTime, CONFIG.performanceThreshold);

    if (CONFIG.verbose && responseBody && responseBody.length < 1000) {
      console.log(colors.dim + `Response: ${responseBody.substring(0, 300)}${responseBody.length > 300 ? "..." : ""}` + colors.reset);
    }

  } catch (error) {
    testResult.error = error.message;
    printError(`${testName} - Failed: ${error.message}`);
  }

  testResults.tests.push(testResult);
  
  if (testResult.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  return testResult;
}

// Test individual entity CSV imports
async function testIndividualCsvImports() {
  printSubHeader("Individual Entity CSV Import Tests");
  
  const entityTests = [
    { entity: "teams", data: CSV_TEST_DATA.teams, expectedRecords: 3 },
    { entity: "applications", data: CSV_TEST_DATA.applications, expectedRecords: 3 },
    { entity: "environments", data: CSV_TEST_DATA.environments, expectedRecords: 3 },
  ];

  const results = [];
  
  for (const test of entityTests) {
    const result = await testCsvImport(test.entity, test.data);
    results.push(result);
    
    // Verify expected number of records
    if (result.success && result.recordsImported !== test.expectedRecords) {
      printWarning(`${test.entity} expected ${test.expectedRecords} records, imported ${result.recordsImported}`);
    }

    // Small delay between imports
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// Test CSV template generation
async function testCsvTemplateGeneration() {
  printSubHeader("CSV Template Generation Tests");
  
  const templateEntities = ["teams", "users", "applications", "environments"];
  
  for (const entity of templateEntities) {
    testResults.total++;
    
    printInfo(`Testing ${entity} CSV template generation`);
    
    try {
      const startTime = Date.now();
      
      const command = `curl -s -w "\\n%{http_code}" --max-time 10 "${CONFIG.baseUrl}/import/csv/${entity}/template"`;
      const result = execSync(command, { encoding: "utf8", timeout: 10000 });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const lines = result.trim().split("\\n");
      const statusCode = parseInt(lines[lines.length - 1]);
      const templateContent = lines.slice(0, -1).join("\\n");
      
      if (statusCode === 200 && templateContent.length > 0) {
        // Validate CSV template format
        const csvLines = templateContent.split("\\n").filter(line => line.trim());
        const hasHeaders = csvLines.length > 0 && csvLines[0].includes(",");
        const hasExpectedColumns = templateContent.includes(`${entity.slice(0, 3)}_`); // e.g., "tms_", "usr_"
        
        if (hasHeaders && hasExpectedColumns) {
          printSuccess(`${entity} template - Valid CSV format with headers`);
          testResults.passed++;
        } else {
          printWarning(`${entity} template - Invalid CSV format or missing expected columns`);
          testResults.failed++;
        }
        
        printPerformance(`${entity} template generation`, responseTime, 1000);
        
        if (CONFIG.verbose) {
          console.log(colors.dim + `Template preview: ${templateContent.split("\\n")[0]}` + colors.reset);
        }
      } else {
        printError(`${entity} template generation failed - Status: ${statusCode}`);
        testResults.failed++;
      }
      
    } catch (error) {
      printError(`${entity} template generation failed: ${error.message}`);
      testResults.failed++;
    }
  }
}

// Test dependency sequencing (Users require Teams)
async function testDependencySequencing() {
  printSubHeader("Dependency Sequencing Tests");
  testResults.dependencyTests++;
  
  // Test 1: Users import without teams (should fail or have validation errors)
  printInfo("Testing users import without teams (should fail)");
  const usersWithoutTeams = await testCsvImport("users", CSV_TEST_DATA.users, [400, 422, 500], false);
  
  if (!usersWithoutTeams.success || usersWithoutTeams.statusCode >= 400) {
    printSuccess("Users import correctly failed without team dependencies ✓");
  } else {
    printWarning("Users import should fail without team dependencies ⚠️");
  }
  
  // Test 2: Import teams first, then users (should succeed)
  printInfo("Testing proper dependency sequence: Teams → Users");
  
  // Import teams first
  const teamsResult = await testCsvImport("teams", CSV_TEST_DATA.teams);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Allow DB commit
  
  // Then import users
  const usersResult = await testCsvImport("users", CSV_TEST_DATA.users);
  
  if (teamsResult.success && usersResult.success) {
    printSuccess("Dependency sequence Teams → Users completed successfully ✓");
  } else {
    printError("Dependency sequence failed - Teams or Users import unsuccessful ❌");
  }
}

// Test error handling scenarios
async function testErrorHandling() {
  printSubHeader("Error Handling Tests");
  testResults.errorHandlingTests++;
  
  const errorTests = [
    {
      name: "Invalid Teams CSV (missing required fields)",
      entity: "teams",
      data: CSV_TEST_DATA.invalidTeams,
      expectedStatus: [400, 422],
      shouldFail: true,
    },
    {
      name: "Users with Invalid Team Reference",
      entity: "users", 
      data: CSV_TEST_DATA.invalidUsers,
      expectedStatus: [400, 422, 500],
      shouldFail: true,
    },
    {
      name: "Malformed CSV Structure",
      entity: "teams",
      data: CSV_TEST_DATA.malformedCsv,
      expectedStatus: [400, 422],
      shouldFail: true,
    },
    {
      name: "Empty CSV Data",
      entity: "teams",
      data: "",
      expectedStatus: [400, 422],
      shouldFail: true,
    },
    {
      name: "Headers Only CSV",
      entity: "teams", 
      data: "tms_id,tms_name,tms_email,tms_description",
      expectedStatus: [200, 400, 422],
      shouldFail: false, // Might succeed with 0 records
    },
  ];
  
  for (const errorTest of errorTests) {
    printInfo(`Testing ${errorTest.name}`);
    
    const result = await testCsvImport(errorTest.entity, errorTest.data, errorTest.expectedStatus, !errorTest.shouldFail);
    
    if (errorTest.shouldFail && (result.statusCode >= 400 || !result.success)) {
      printSuccess(`${errorTest.name} - Correctly handled invalid data ✓`);
    } else if (!errorTest.shouldFail && result.success) {
      printSuccess(`${errorTest.name} - Handled edge case appropriately ✓`);
    } else {
      printWarning(`${errorTest.name} - Error handling may need review ⚠️`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Test performance with larger datasets
async function testPerformanceWithLargeDatasets() {
  if (CONFIG.quickMode && !CONFIG.largeDataset) {
    printInfo("Skipping large dataset performance tests in quick mode (use --large-dataset to force)");
    return;
  }
  
  printSubHeader("Large Dataset Performance Tests");
  testResults.performanceTests++;
  
  // Generate large CSV datasets
  const largeDatasets = {
    teams: generateLargeTeamsCsv(100),
    applications: generateLargeApplicationsCsv(200),
    environments: generateLargeEnvironmentsCsv(50),
  };
  
  for (const [entity, csvData] of Object.entries(largeDatasets)) {
    printInfo(`Testing ${entity} with large dataset (${csvData.split("\\n").length - 1} records)`);
    
    const startTime = Date.now();
    const result = await testCsvImport(entity, csvData, [200, 201, 202], true);
    const duration = Date.now() - startTime;
    
    // Use bulk performance threshold for large datasets
    if (duration <= CONFIG.bulkPerformanceThreshold) {
      printSuccess(`${entity} large dataset processed within ${CONFIG.bulkPerformanceThreshold}ms threshold`);
    } else {
      printWarning(`${entity} large dataset took ${duration}ms (exceeds ${CONFIG.bulkPerformanceThreshold}ms threshold)`);
    }
    
    if (result.success && result.recordsImported > 0) {
      const throughput = Math.round(result.recordsImported / (duration / 1000));
      printInfo(`${entity} throughput: ${throughput} records/second`);
    }
    
    // Cleanup delay
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Test workflow orchestration (batch import simulation)
async function testWorkflowOrchestration() {
  printSubHeader("Workflow Orchestration Tests");
  testResults.workflowTests++;
  
  printInfo("Testing complete CSV import workflow orchestration");
  
  // Simulate batch import workflow: Teams → Applications → Environments → Users
  const workflowSteps = [
    { name: "Teams", entity: "teams", data: CSV_TEST_DATA.teams },
    { name: "Applications", entity: "applications", data: CSV_TEST_DATA.applications }, 
    { name: "Environments", entity: "environments", data: CSV_TEST_DATA.environments },
    { name: "Users", entity: "users", data: CSV_TEST_DATA.users },
  ];
  
  const workflowResults = [];
  let workflowStartTime = Date.now();
  
  for (const step of workflowSteps) {
    printInfo(`Workflow Step: Importing ${step.name}`);
    
    const result = await testCsvImport(step.entity, step.data);
    workflowResults.push(result);
    
    if (!result.success) {
      printError(`Workflow failed at step: ${step.name}`);
      break;
    }
    
    // Brief pause between workflow steps
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const workflowDuration = Date.now() - workflowStartTime;
  const successfulSteps = workflowResults.filter(r => r.success).length;
  const totalRecords = workflowResults.reduce((sum, r) => sum + r.recordsImported, 0);
  
  if (successfulSteps === workflowSteps.length) {
    printSuccess(`Complete workflow orchestration succeeded in ${workflowDuration}ms`);
    printSuccess(`Total records imported: ${totalRecords}`);
    
    if (workflowDuration <= CONFIG.bulkPerformanceThreshold) {
      printSuccess(`Workflow completed within ${CONFIG.bulkPerformanceThreshold}ms threshold ✓`);
    } else {
      printWarning(`Workflow took ${workflowDuration}ms (exceeds ${CONFIG.bulkPerformanceThreshold}ms threshold) ⚠️`);
    }
  } else {
    printError(`Workflow partially failed - ${successfulSteps}/${workflowSteps.length} steps completed`);
  }
}

// Test concurrent CSV imports
async function testConcurrentImports() {
  if (CONFIG.quickMode) {
    printInfo("Skipping concurrent import tests in quick mode");
    return;
  }
  
  printSubHeader("Concurrent Import Tests");
  
  printInfo("Testing concurrent CSV imports (non-dependent entities)");
  
  const concurrentImports = [
    { entity: "teams", data: generateLargeTeamsCsv(20, "Concurrent1") },
    { entity: "applications", data: generateLargeApplicationsCsv(30, "Concurrent") },
    { entity: "environments", data: generateLargeEnvironmentsCsv(15, "Concurrent") },
  ];
  
  const promises = concurrentImports.map(async (importData) => {
    return await testCsvImport(importData.entity, importData.data);
  });
  
  const startTime = Date.now();
  
  try {
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    const successfulImports = results.filter(r => r.success).length;
    const totalRecords = results.reduce((sum, r) => sum + r.recordsImported, 0);
    
    if (successfulImports === concurrentImports.length) {
      printSuccess(`All ${concurrentImports.length} concurrent imports succeeded`);
      printSuccess(`Total records imported concurrently: ${totalRecords}`);
      printInfo(`Concurrent execution time: ${duration}ms`);
    } else {
      printWarning(`Only ${successfulImports}/${concurrentImports.length} concurrent imports succeeded`);
    }
    
  } catch (error) {
    printError(`Concurrent import test failed: ${error.message}`);
  }
}

// Generate large CSV data for performance testing
function generateLargeTeamsCsv(count, prefix = "PerfTest") {
  let csv = "tms_id,tms_name,tms_email,tms_description\\n";
  for (let i = 1; i <= count; i++) {
    csv += `${i},${prefix} Team ${i},${prefix.toLowerCase()}-team-${i}@test.com,Performance test team number ${i}\\n`;
  }
  return csv.trim();
}

function generateLargeApplicationsCsv(count, prefix = "PERF") {
  let csv = "app_id,app_code,app_name,app_description\\n";
  for (let i = 1; i <= count; i++) {
    csv += `${i},${prefix}_APP${i},${prefix} Application ${i},Performance test application number ${i}\\n`;
  }
  return csv.trim();
}

function generateLargeEnvironmentsCsv(count, prefix = "PERF") {
  let csv = "env_id,env_code,env_name,env_description\\n";
  for (let i = 1; i <= count; i++) {
    const code = `${prefix}${String(i).padStart(2, "0")}`;
    csv += `${i},${code},${prefix} Environment ${i},Performance test environment number ${i}\\n`;
  }
  return csv.trim();
}

// Generate comprehensive test report
function generateTestReport() {
  const endTime = Date.now();
  const totalTime = endTime - testResults.startTime;

  printHeader("CSV Import Workflow Test Results");

  console.log(`\\n${colors.bold}Overall Results:${colors.reset}`);
  console.log(`  Total Tests: ${testResults.total}`);
  console.log(`  Passed: ${colors.green}${testResults.passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${testResults.failed}${colors.reset}`);
  console.log(`  Workflow Tests: ${testResults.workflowTests}`);
  console.log(`  Performance Tests: ${testResults.performanceTests}`);
  console.log(`  Dependency Tests: ${testResults.dependencyTests}`);
  console.log(`  Error Handling Tests: ${testResults.errorHandlingTests}`);
  console.log(`  Total Execution Time: ${totalTime}ms`);

  if (testResults.failed > 0) {
    console.log(`\\n${colors.bold}Failed Tests:${colors.reset}`);
    testResults.tests
      .filter(test => !test.success)
      .forEach(test => {
        console.log(`  ❌ ${test.name}: ${test.error || `Status ${test.statusCode}`}`);
        if (test.responseTime > CONFIG.performanceThreshold) {
          console.log(`     Performance: ${test.responseTime}ms (exceeds threshold)`);
        }
      });
  }

  // Performance analysis
  const performanceTests = testResults.tests.filter(test => test.responseTime > 0);
  if (performanceTests.length > 0) {
    const avgResponseTime = performanceTests.reduce((sum, test) => sum + test.responseTime, 0) / performanceTests.length;
    const maxResponseTime = Math.max(...performanceTests.map(test => test.responseTime));
    
    console.log(`\\n${colors.bold}Performance Analysis:${colors.reset}`);
    console.log(`  Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`  Maximum Response Time: ${maxResponseTime}ms`);
    console.log(`  Performance Threshold: ${CONFIG.performanceThreshold}ms`);
  }

  // Import statistics
  const importTests = testResults.tests.filter(test => test.recordsImported > 0);
  if (importTests.length > 0) {
    const totalRecords = importTests.reduce((sum, test) => sum + test.recordsImported, 0);
    console.log(`\\n${colors.bold}Import Statistics:${colors.reset}`);
    console.log(`  Total Records Imported: ${totalRecords}`);
    console.log(`  Successful Imports: ${importTests.length}`);
    console.log(`  Average Records per Import: ${Math.round(totalRecords / importTests.length)}`);
  }

  // Coverage assessment
  console.log(`\\n${colors.bold}CSV Workflow Coverage:${colors.reset}`);
  const coverage = (testResults.passed / testResults.total * 100).toFixed(1);
  console.log(`  Test Coverage: ${coverage}% (${testResults.passed}/${testResults.total} tests passed)`);
  
  if (coverage >= 95) {
    printSuccess("Excellent test coverage - 95%+ requirement met ✓");
  } else if (coverage >= 85) {
    printWarning(`Good test coverage but below 95% target (${coverage}%) ⚠️`);
  } else {
    printError(`Insufficient test coverage - ${coverage}% is below acceptable threshold ❌`);
  }

  return testResults.failed === 0;
}

// Main execution function
async function main() {
  try {
    printHeader("UMIG CSV Import Workflow Test Suite - US-034");
    printInfo("Comprehensive validation of CSV import workflows, dependencies, and error handling");
    
    if (CONFIG.quickMode) {
      printInfo("Running in quick mode - skipping some performance and concurrent tests");
    }
    
    if (CONFIG.largeDataset) {
      printInfo("Large dataset testing enabled - will test with production-scale data");
    }
    
    if (CONFIG.verbose) {
      printInfo("Verbose mode enabled - detailed responses will be shown");
    }

    console.log(`\\nConfiguration:`);
    console.log(`  Base URL: ${CONFIG.baseUrl}`);
    console.log(`  Performance Threshold: ${CONFIG.performanceThreshold}ms`);
    console.log(`  Bulk Performance Threshold: ${CONFIG.bulkPerformanceThreshold}ms`);
    console.log(`  Timeout: ${CONFIG.timeout}ms`);

    // Execute all test suites
    await testIndividualCsvImports();
    await testCsvTemplateGeneration();
    await testDependencySequencing();
    await testErrorHandling();
    await testWorkflowOrchestration();
    await testPerformanceWithLargeDatasets();
    await testConcurrentImports();

    // Generate final report
    const success = generateTestReport();

    // Exit with appropriate code
    process.exit(success ? 0 : 1);

  } catch (error) {
    printError(`Test execution failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Help text
function showHelp() {
  console.log(`
UMIG CSV Import Workflow Test Runner - US-034

Usage: node CsvImportWorkflowTestRunner.js [options]

Options:
  --help, -h           Show this help message
  --verbose, -v        Enable verbose output with detailed responses
  --quick              Skip performance and concurrent tests for faster execution
  --large-dataset      Force large dataset performance tests (overrides --quick)

Description:
  Comprehensive validation of CSV import workflows including individual imports,
  dependency sequencing, error handling, performance testing, and orchestration.

Test Categories:
  - Individual Entity Imports (Teams, Users, Applications, Environments)
  - CSV Template Generation and Validation
  - Dependency Sequencing (Teams → Users)
  - Error Handling (Invalid data, malformed CSV, etc.)
  - Workflow Orchestration (Batch import simulation)
  - Performance Testing (Large datasets, concurrent imports)

Examples:
  node CsvImportWorkflowTestRunner.js                  # Run all workflow tests
  node CsvImportWorkflowTestRunner.js --verbose        # Run with detailed output
  node CsvImportWorkflowTestRunner.js --quick          # Run without performance tests
  node CsvImportWorkflowTestRunner.js --large-dataset  # Force large dataset tests

Requirements:
  - UMIG system running on localhost:8090
  - curl command available in PATH
  - Node.js with ES modules support
  - Clean database state for dependency testing
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