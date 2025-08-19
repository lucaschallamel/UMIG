#!/usr/bin/env node

/**
 * StepView Comprehensive Validation Test Runner
 * 
 * Purpose: Execute comprehensive QA validation for US-036 StepView UI Refactoring
 * Features: Prevention-focused testing with strict validation levels
 * Usage: node scripts/test-stepview-validation.js [options]
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import { program } from 'commander';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  testTimeout: 30000,
  maxRetries: 3,
  screenshotDir: '../src/groovy/umig/tests/uat/screenshots',
  logFile: 'stepview-validation-results.log',
  qualityGates: {
    unitTestCoverage: 95,
    integrationTestCoverage: 90,
    uatPassRate: 100,
    performanceThreshold: 3000, // 3 seconds
    mobileResponsiveScore: 100
  }
};

// Test execution status tracking
let testResults = {
  timestamp: new Date().toISOString(),
  phase: 'US-036 Phase 2 Validation',
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  qualityGatesPassed: 0,
  qualityGatesFailed: 0,
  details: []
};

// Command line interface
program
  .name('test-stepview-validation')
  .description('Comprehensive StepView QA validation for US-036 Phase 2')
  .version('1.0.0')
  .option('-q, --quick', 'Run quick validation (unit tests + performance only)')
  .option('-f, --full', 'Run full comprehensive validation suite')
  .option('-r, --role <role>', 'Test specific role (NORMAL|PILOT|ADMIN)')
  .option('-m, --mobile', 'Focus on mobile responsiveness testing')
  .option('-p, --performance', 'Focus on performance validation')
  .option('--no-screenshots', 'Disable screenshot capture')
  .option('--continue-on-error', 'Continue testing even if individual tests fail')
  .option('--verbose', 'Enable verbose logging')
  .parse();

const options = program.opts();

/**
 * Main validation orchestrator
 */
async function runStepViewValidation() {
  console.log(chalk.cyan.bold('🚀 StepView UI Refactoring Validation - US-036 Phase 2'));
  console.log(chalk.gray(`Started: ${new Date().toLocaleString()}`));
  console.log(chalk.gray(`Quality Focus: Prevention | Validation Level: Strict\n`));

  try {
    // Initialize validation environment
    await initializeValidationEnvironment();

    // Execute validation phases
    if (options.quick) {
      await runQuickValidation();
    } else if (options.full || !options.role && !options.mobile && !options.performance) {
      await runFullValidation();
    } else {
      await runTargetedValidation();
    }

    // Generate comprehensive report
    await generateValidationReport();

    // Evaluate quality gates
    await evaluateQualityGates();

  } catch (error) {
    console.error(chalk.red.bold('❌ Validation failed with critical error:'));
    console.error(chalk.red(error.message));
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Initialize validation environment
 */
async function initializeValidationEnvironment() {
  console.log(chalk.yellow('📋 Initializing validation environment...'));

  // Create screenshot directory
  const screenshotPath = path.resolve(CONFIG.screenshotDir);
  if (!fs.existsSync(screenshotPath)) {
    fs.mkdirSync(screenshotPath, { recursive: true });
    console.log(chalk.green(`✅ Created screenshot directory: ${screenshotPath}`));
  }

  // Validate development environment is running
  try {
    execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8090', { 
      timeout: 5000,
      stdio: 'pipe'
    });
    console.log(chalk.green('✅ Confluence development environment is running'));
  } catch (error) {
    throw new Error('Development environment not running. Please run: npm start');
  }

  // Validate database connectivity
  try {
    execSync('node scripts/test-integration.js --quick', { 
      timeout: 10000,
      stdio: 'pipe'
    });
    console.log(chalk.green('✅ Database connectivity validated'));
  } catch (error) {
    console.warn(chalk.yellow('⚠️ Database connectivity check failed - continuing with caution'));
  }

  console.log(chalk.green('✅ Validation environment ready\n'));
}

/**
 * Run quick validation (unit tests + performance)
 */
async function runQuickValidation() {
  console.log(chalk.cyan.bold('⚡ Running Quick Validation Suite'));

  await executeTestSuite('Unit Tests - Macro Generation', [
    'npm run test:stepview:unit:macro',
    'npm run test:stepview:unit:role'
  ]);

  await executeTestSuite('Performance Validation', [
    'npm run test:stepview:uat:performance'
  ]);

  testResults.totalTests += 3;
}

/**
 * Run full comprehensive validation
 */
async function runFullValidation() {
  console.log(chalk.cyan.bold('🔍 Running Comprehensive Validation Suite'));

  // Phase 1: Unit Tests
  await executeTestSuite('Unit Tests - HTML Structure', [
    'npm run test:stepview:unit:macro',
    'npm run test:stepview:unit:role'
  ]);

  // Phase 2: Integration Tests
  await executeTestSuite('Integration Tests - JavaScript Sync', [
    'npm run test:stepview:integration',
    'npm run test:stepview:integration:rbac'
  ]);

  // Phase 3: UAT Tests
  await executeTestSuite('UAT Tests - Complete UI Validation', [
    'npm run test:stepview:uat',
    'npm run test:stepview:uat:mobile'
  ]);

  testResults.totalTests += 6;
}

/**
 * Run targeted validation based on options
 */
async function runTargetedValidation() {
  console.log(chalk.cyan.bold('🎯 Running Targeted Validation'));

  if (options.role) {
    await executeRoleBasedValidation(options.role);
  }

  if (options.mobile) {
    await executeTestSuite('Mobile Responsiveness', [
      'npm run test:stepview:uat:mobile'
    ]);
    testResults.totalTests += 1;
  }

  if (options.performance) {
    await executeTestSuite('Performance Validation', [
      'npm run test:stepview:uat:performance'
    ]);
    testResults.totalTests += 1;
  }
}

/**
 * Execute role-based validation
 */
async function executeRoleBasedValidation(role) {
  console.log(chalk.magenta(`🔐 Testing Role: ${role}`));

  const testUrl = `http://localhost:8090/spaces/UMIG/pages/1114120/UMIG+-+Step+View?mig=TORONTO&ite=RUN1&stepid=AUT-001&role=${role}`;
  
  try {
    // Execute role-specific tests
    const command = `playwright test stepViewJavaScriptSyncTest.js --grep 'role-based' --env TEST_URL="${testUrl}"`;
    await executeCommand(command, `Role-based validation for ${role}`);
    
    testResults.passedTests += 1;
    testResults.details.push({
      test: `Role-based validation - ${role}`,
      status: 'PASSED',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    testResults.failedTests += 1;
    testResults.details.push({
      test: `Role-based validation - ${role}`,
      status: 'FAILED',
      error: error.message,
      timestamp: new Date().toISOString()
    });

    if (!options.continueOnError) {
      throw error;
    }
  }

  testResults.totalTests += 1;
}

/**
 * Execute a test suite with multiple commands
 */
async function executeTestSuite(suiteName, commands) {
  console.log(chalk.blue.bold(`\n📦 ${suiteName}`));
  console.log(chalk.gray('─'.repeat(50)));

  for (const command of commands) {
    try {
      await executeCommand(command, command);
      testResults.passedTests += 1;
      testResults.details.push({
        test: command,
        status: 'PASSED',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      testResults.failedTests += 1;
      testResults.details.push({
        test: command,
        status: 'FAILED',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      console.error(chalk.red(`❌ ${command} failed:`));
      console.error(chalk.red(error.message));

      if (!options.continueOnError) {
        throw error;
      }
    }
  }
}

/**
 * Execute a single command with proper error handling
 */
async function executeCommand(command, description) {
  console.log(chalk.yellow(`⚙️ ${description}...`));
  
  try {
    const result = execSync(command, {
      cwd: process.cwd(),
      timeout: CONFIG.testTimeout,
      stdio: options.verbose ? 'inherit' : 'pipe',
      encoding: 'utf8'
    });

    console.log(chalk.green(`✅ ${description} - PASSED`));
    return result;

  } catch (error) {
    console.error(chalk.red(`❌ ${description} - FAILED`));
    throw new Error(`Command failed: ${command}\nError: ${error.message}`);
  }
}

/**
 * Generate comprehensive validation report
 */
async function generateValidationReport() {
  console.log(chalk.cyan.bold('\n📊 Generating Validation Report'));

  const report = {
    ...testResults,
    qualityGates: CONFIG.qualityGates,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    },
    summary: {
      successRate: testResults.totalTests > 0 ? ((testResults.passedTests / testResults.totalTests) * 100).toFixed(1) : '0',
      totalDuration: 'TBD', // Would need to track timing
      criticalIssues: testResults.failedTests,
      recommendedActions: generateRecommendations()
    }
  };

  // Write report to file
  const reportPath = path.resolve(CONFIG.logFile);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Display summary
  console.log(chalk.green(`📋 Report saved to: ${reportPath}`));
  console.log(chalk.blue('\n📈 Validation Summary:'));
  console.log(chalk.green(`✅ Passed: ${testResults.passedTests}`));
  console.log(chalk.red(`❌ Failed: ${testResults.failedTests}`));
  console.log(chalk.gray(`⏭️ Skipped: ${testResults.skippedTests}`));
  console.log(chalk.cyan(`🎯 Success Rate: ${report.summary.successRate}%`));
}

/**
 * Evaluate quality gates and determine overall success
 */
async function evaluateQualityGates() {
  console.log(chalk.cyan.bold('\n🚪 Evaluating Quality Gates'));

  const successRate = testResults.totalTests > 0 ? (testResults.passedTests / testResults.totalTests) * 100 : 0;

  // Quality gate evaluations
  const gates = [
    {
      name: 'Test Success Rate',
      target: 100,
      actual: successRate,
      critical: true
    },
    {
      name: 'Zero Critical Failures',
      target: 0,
      actual: testResults.failedTests,
      critical: true
    },
    {
      name: 'All Role-based Tests Pass',
      target: 'PASS',
      actual: testResults.details.filter(d => d.test.includes('role-based')).every(d => d.status === 'PASSED') ? 'PASS' : 'FAIL',
      critical: true
    }
  ];

  let allGatesPassed = true;

  for (const gate of gates) {
    const passed = (typeof gate.target === 'number') 
      ? gate.actual >= gate.target 
      : gate.actual === gate.target;

    if (passed) {
      console.log(chalk.green(`✅ ${gate.name}: ${gate.actual} (target: ${gate.target})`));
      testResults.qualityGatesPassed += 1;
    } else {
      console.log(chalk.red(`❌ ${gate.name}: ${gate.actual} (target: ${gate.target})`));
      testResults.qualityGatesFailed += 1;
      if (gate.critical) {
        allGatesPassed = false;
      }
    }
  }

  // Final verdict
  console.log(chalk.cyan.bold('\n🏁 Final Validation Verdict'));
  
  if (allGatesPassed && testResults.failedTests === 0) {
    console.log(chalk.green.bold('✅ VALIDATION PASSED - Code is ready for commit'));
    console.log(chalk.green('All quality gates met. StepView changes are validated.'));
    process.exit(0);
  } else {
    console.log(chalk.red.bold('❌ VALIDATION FAILED - Do not commit broken code'));
    console.log(chalk.red('Quality gates failed. Address issues before proceeding.'));
    console.log(chalk.yellow('\nRecommended actions:'));
    generateRecommendations().forEach(action => {
      console.log(chalk.yellow(`  - ${action}`));
    });
    process.exit(1);
  }
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations() {
  const recommendations = [];

  if (testResults.failedTests > 0) {
    recommendations.push('Fix failing tests before proceeding with commit');
    recommendations.push('Review test output for specific error details');
  }

  if (testResults.details.some(d => d.test.includes('role-based') && d.status === 'FAILED')) {
    recommendations.push('Verify role-based access control implementation');
    recommendations.push('Check URL parameter override functionality');
  }

  if (testResults.details.some(d => d.test.includes('mobile') && d.status === 'FAILED')) {
    recommendations.push('Review mobile responsive design implementation');
    recommendations.push('Check CSS media queries and breakpoints');
  }

  if (testResults.details.some(d => d.test.includes('performance') && d.status === 'FAILED')) {
    recommendations.push('Optimize page load performance (target: <3s)');
    recommendations.push('Review JavaScript caching and polling configuration');
  }

  if (recommendations.length === 0) {
    recommendations.push('All tests passed - proceed with confidence');
    recommendations.push('Consider running full regression test suite');
  }

  return recommendations;
}

// Execute validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runStepViewValidation().catch(error => {
    console.error(chalk.red.bold('💥 Fatal error in validation:'));
    console.error(error);
    process.exit(1);
  });
}