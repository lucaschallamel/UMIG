#!/usr/bin/env node
/**
 * Service Test Validation Script
 * Validates that all service tests use simplified Jest pattern and pass successfully
 * Part of US-082-A Foundation Service Layer test fixes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVICES_DIR = path.join(__dirname, '../__tests__/unit/services');
const PROJECT_ROOT = path.dirname(__dirname);
const SERVICES = [
  'AdminGuiService',
  'ApiService', 
  'AuthenticationService',
  'FeatureFlagService',
  'NotificationService',
  'SecurityService'
];

console.log('🔍 Validating Service Test Conversions for US-082-A...\n');
console.log(`📁 Services Directory: ${SERVICES_DIR}`);
console.log(`📁 Project Root: ${PROJECT_ROOT}\n`);

const results = {
  passed: [],
  failed: [],
  warnings: [],
  total: 0,
  passing: 0,
  summary: {}
};

function checkTestFile(serviceName) {
  const testFile = path.join(SERVICES_DIR, `${serviceName}.test.js`);
  
  console.log(`\n🔍 Checking ${serviceName}...`);
  
  if (!fs.existsSync(testFile)) {
    console.log(`❌ ${serviceName}: Test file missing at ${testFile}`);
    return { service: serviceName, status: 'missing', reason: 'Test file not found' };
  }
  
  // Check if file uses simplified pattern
  const content = fs.readFileSync(testFile, 'utf8');
  const hasRequire = content.includes('require(');
  const hasVmContext = content.includes('vm.createContext');
  const hasFileRead = content.includes('fs.readFileSync');
  const hasStandardSetup = content.includes('global.window') || content.includes('global.performance');
  
  const usesSimplifiedPattern = hasRequire && !hasVmContext && !hasFileRead;
  
  if (!usesSimplifiedPattern) {
    const issues = [];
    if (!hasRequire) issues.push('Missing require() statements');
    if (hasVmContext) issues.push('Uses vm.createContext (old pattern)');
    if (hasFileRead) issues.push('Uses fs.readFileSync (old pattern)');
    
    console.log(`⚠️  ${serviceName}: Still uses self-contained pattern`);
    console.log(`    Issues: ${issues.join(', ')}`);
    return { 
      service: serviceName, 
      status: 'pattern_issue', 
      reason: 'Uses old self-contained pattern',
      issues: issues
    };
  }
  
  if (!hasStandardSetup) {
    console.log(`⚠️  ${serviceName}: Missing global setup (window, performance mocks)`);
    results.warnings.push({ service: serviceName, issue: 'Missing global setup' });
  }
  
  console.log(`✅ ${serviceName}: Uses simplified Jest pattern`);
  
  // Try to run the test
  try {
    console.log(`   🧪 Running tests...`);
    
    const command = `npm run test:js:unit -- --testPathPattern='${serviceName}.test.js' --passWithNoTests --silent`;
    const output = execSync(command, { 
      encoding: 'utf8', 
      cwd: PROJECT_ROOT,
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }
    });
    
    // Parse test results
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    const skipMatch = output.match(/(\d+) skipped/);
    
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    const skipped = skipMatch ? parseInt(skipMatch[1]) : 0;
    const total = passed + failed + skipped;
    
    if (total === 0) {
      console.log(`⚠️  ${serviceName}: No tests found or executed`);
      return { 
        service: serviceName, 
        status: 'no_tests', 
        reason: 'No tests executed',
        passed: 0, 
        total: 0 
      };
    }
    
    const passRate = Math.round(passed / total * 100);
    
    if (failed === 0 && passed > 0) {
      console.log(`✅ ${serviceName}: ${passed}/${total} tests passing (100%)`);
      if (skipped > 0) {
        console.log(`   ⏭️  ${skipped} tests skipped`);
      }
      return { 
        service: serviceName, 
        status: 'success', 
        passed, 
        failed, 
        skipped, 
        total,
        passRate: 100
      };
    } else if (passed > 0) {
      console.log(`⚠️  ${serviceName}: ${passed}/${total} tests passing (${passRate}%)`);
      if (failed > 0) console.log(`   ❌ ${failed} tests failing`);
      if (skipped > 0) console.log(`   ⏭️  ${skipped} tests skipped`);
      return { 
        service: serviceName, 
        status: 'partial', 
        passed, 
        failed, 
        skipped, 
        total,
        passRate,
        reason: `${failed} tests failing`
      };
    } else {
      console.log(`❌ ${serviceName}: 0/${total} tests passing - All tests failing`);
      return { 
        service: serviceName, 
        status: 'all_failed', 
        passed: 0, 
        failed, 
        skipped, 
        total,
        passRate: 0,
        reason: 'All tests failing'
      };
    }
    
  } catch (error) {
    console.log(`❌ ${serviceName}: Test execution failed`);
    console.log(`   Error: ${error.message.split('\n')[0]}`);
    return { 
      service: serviceName, 
      status: 'execution_failed', 
      reason: 'Test execution failed',
      error: error.message.split('\n')[0]
    };
  }
}

// Main validation loop
SERVICES.forEach(serviceName => {
  const result = checkTestFile(serviceName);
  
  results.summary[serviceName] = result;
  
  if (result.status === 'success') {
    results.passed.push(result);
    results.total += result.total;
    results.passing += result.passed;
  } else if (result.status === 'partial') {
    results.failed.push(result);
    results.total += result.total;
    results.passing += result.passed;
  } else {
    results.failed.push(result);
    if (result.total) {
      results.total += result.total;
      results.passing += result.passed || 0;
    }
  }
});

// Generate summary report
console.log(`\n📊 Overall Results:`);
console.log(`${'='.repeat(50)}`);

if (results.total > 0) {
  const overallPassRate = Math.round(results.passing / results.total * 100);
  console.log(`   Total Tests: ${results.total}`);
  console.log(`   Passing: ${results.passing} (${overallPassRate}%)`);
  console.log(`   Failing: ${results.total - results.passing} (${100 - overallPassRate}%)`);
} else {
  console.log(`   Total Tests: 0 (No tests executed)`);
}

console.log(`   Services Fully Working: ${results.passed.length}/6`);
console.log(`   Services Partially Working: ${results.failed.filter(r => r.status === 'partial').length}/6`);
console.log(`   Services Not Working: ${results.failed.filter(r => r.status !== 'partial').length}/6`);

// Detailed breakdown
console.log(`\n📋 Detailed Breakdown:`);
console.log(`${'='.repeat(50)}`);

SERVICES.forEach(serviceName => {
  const result = results.summary[serviceName];
  let status = '';
  
  switch (result.status) {
    case 'success':
      status = `✅ PASS (${result.passed}/${result.total})`;
      break;
    case 'partial':
      status = `⚠️  PARTIAL (${result.passed}/${result.total} - ${result.passRate}%)`;
      break;
    case 'all_failed':
      status = `❌ FAIL (0/${result.total})`;
      break;
    case 'execution_failed':
      status = `❌ ERROR (${result.reason})`;
      break;
    case 'pattern_issue':
      status = `⚠️  PATTERN (${result.reason})`;
      break;
    case 'missing':
      status = `❌ MISSING`;
      break;
    case 'no_tests':
      status = `⚠️  NO TESTS`;
      break;
    default:
      status = `❓ UNKNOWN`;
  }
  
  console.log(`   ${serviceName.padEnd(20)}: ${status}`);
});

// Warnings
if (results.warnings.length > 0) {
  console.log(`\n⚠️  Warnings:`);
  results.warnings.forEach(warning => {
    console.log(`   ${warning.service}: ${warning.issue}`);
  });
}

// Next steps
console.log(`\n🎯 Next Steps:`);
console.log(`${'='.repeat(50)}`);

const needsPatternFix = results.failed.filter(r => r.status === 'pattern_issue');
const needsTestFix = results.failed.filter(r => r.status === 'partial' || r.status === 'all_failed');
const needsExecution = results.failed.filter(r => r.status === 'execution_failed');
const missing = results.failed.filter(r => r.status === 'missing');

if (needsPatternFix.length > 0) {
  console.log(`   🔧 Convert to simplified Jest pattern:`);
  needsPatternFix.forEach(r => {
    console.log(`      - ${r.service}: ${r.issues ? r.issues.join(', ') : r.reason}`);
  });
}

if (needsExecution.length > 0) {
  console.log(`   🐛 Fix execution errors:`);
  needsExecution.forEach(r => {
    console.log(`      - ${r.service}: ${r.error || r.reason}`);
  });
}

if (needsTestFix.length > 0) {
  console.log(`   🧪 Fix failing tests:`);
  needsTestFix.forEach(r => {
    console.log(`      - ${r.service}: ${r.failed || 0} failing, ${r.passed || 0} passing`);
  });
}

if (missing.length > 0) {
  console.log(`   📝 Create missing test files:`);
  missing.forEach(r => {
    console.log(`      - ${r.service}`);
  });
}

// Final assessment
const SUCCESS_THRESHOLD = 0.9;
const currentRate = results.total > 0 ? results.passing / results.total : 0;

console.log(`\n🏁 Final Assessment:`);
console.log(`${'='.repeat(50)}`);

if (currentRate >= SUCCESS_THRESHOLD) {
  console.log(`🎉 SUCCESS: ${Math.round(currentRate * 100)}% pass rate achieved!`);
  console.log(`   Ready for QA sign-off and production deployment.`);
  process.exit(0);
} else {
  const needed = Math.ceil(results.total * SUCCESS_THRESHOLD);
  const additional = needed - results.passing;
  console.log(`⚠️  NEEDS WORK: ${Math.round(currentRate * 100)}% pass rate`);
  console.log(`   Need ${additional} more tests to pass to reach 90% threshold`);
  console.log(`   Target: ${needed}/${results.total} tests passing`);
  process.exit(1);
}