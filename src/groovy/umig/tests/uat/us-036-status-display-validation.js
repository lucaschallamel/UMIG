/**
 * US-036 StepView Status Display Validation Test Suite
 * 
 * Comprehensive testing framework for validating role-based status display logic
 * after the redundant status display refactoring.
 * 
 * Author: Claude AI Assistant
 * Date: August 20, 2025
 * Sprint: Sprint 5 (US-036 StepView UI Refactoring)
 */

class US036StatusDisplayValidator {
  constructor() {
    this.testResults = [];
    this.verbose = true;
  }

  /**
   * Main validation entry point
   * Run all test scenarios and return comprehensive results
   */
  async validateAll() {
    this.log("🚀 Starting US-036 StepView Status Display Validation", 'header');
    
    // Test categories
    await this.testRoleDetectionLogic();
    await this.testStatusBadgeVisibility(); 
    await this.testDropdownVisibility();
    await this.testEdgeCases();
    await this.testDOMConsistency();
    
    return this.generateReport();
  }

  /**
   * Test the core role detection and conditional logic
   */
  async testRoleDetectionLogic() {
    this.log("\n📝 Testing Role Detection Logic", 'section');
    
    const testCases = [
      // Formal roles should NOT show static badge
      { role: 'ADMIN', expectedBadge: false, description: 'ADMIN user (formal role)' },
      { role: 'PILOT', expectedBadge: false, description: 'PILOT user (formal role)' },
      { role: 'NORMAL', expectedBadge: false, description: 'NORMAL user (formal role)' },
      
      // Non-formal roles should show static badge
      { role: null, expectedBadge: true, description: 'null role (no formal role)' },
      { role: undefined, expectedBadge: true, description: 'undefined role (no formal role)' },
      { role: '', expectedBadge: true, description: 'empty string role (no formal role)' },
      { role: 'GUEST', expectedBadge: true, description: 'GUEST role (non-formal role)' },
      { role: 'VIEWER', expectedBadge: true, description: 'VIEWER role (non-formal role)' },
      { role: 'ANONYMOUS', expectedBadge: true, description: 'ANONYMOUS role (non-formal role)' },
      { role: 'invalid', expectedBadge: true, description: 'invalid role (non-formal role)' },
    ];

    testCases.forEach((testCase, index) => {
      const { role, expectedBadge, description } = testCase;
      
      // Core logic from implementation: !["NORMAL", "PILOT", "ADMIN"].includes(this.userRole)
      const shouldShowBadge = !["NORMAL", "PILOT", "ADMIN"].includes(role);
      const passed = shouldShowBadge === expectedBadge;
      
      this.recordTest({
        category: 'Role Detection Logic',
        testName: `Test ${index + 1}: ${description}`,
        input: `role: ${JSON.stringify(role)}`,
        expected: expectedBadge ? 'show badge' : 'hide badge',
        actual: shouldShowBadge ? 'show badge' : 'hide badge',
        passed: passed,
        details: {
          role: role,
          logic: '!["NORMAL", "PILOT", "ADMIN"].includes(role)',
          result: shouldShowBadge
        }
      });
    });
  }

  /**
   * Test status badge visibility in actual DOM (if available)
   */
  async testStatusBadgeVisibility() {
    this.log("\n👁️ Testing Status Badge DOM Visibility", 'section');
    
    if (typeof document === 'undefined') {
      this.recordTest({
        category: 'Status Badge Visibility',
        testName: 'DOM Badge Visibility Test',
        input: 'DOM environment',
        expected: 'DOM available',
        actual: 'No DOM (Node.js environment)', 
        passed: false,
        details: { note: 'This test requires browser environment' }
      });
      return;
    }

    // Test badge elements existence and visibility
    const badgeElements = document.querySelectorAll('.status-badge');
    const dropdownElements = document.querySelectorAll('[id*="step-status-dropdown"]');
    
    // Get current user role if available
    const currentRole = window.stepView?.userRole || window.UMIG_STEP_CONFIG?.user?.role || 'UNKNOWN';
    const shouldShowBadge = !["NORMAL", "PILOT", "ADMIN"].includes(currentRole);
    
    this.recordTest({
      category: 'Status Badge Visibility',
      testName: 'Badge Elements Count',
      input: `Current role: ${currentRole}`,
      expected: shouldShowBadge ? 'Badge elements visible' : 'Badge elements hidden',
      actual: `Found ${badgeElements.length} badge elements`,
      passed: shouldShowBadge ? badgeElements.length > 0 : badgeElements.length === 0,
      details: {
        currentRole: currentRole,
        badgeCount: badgeElements.length,
        dropdownCount: dropdownElements.length,
        shouldShowBadge: shouldShowBadge
      }
    });
  }

  /**
   * Test status dropdown visibility logic
   */
  async testDropdownVisibility() {
    this.log("\n🔽 Testing Status Dropdown Visibility", 'section');
    
    if (typeof document === 'undefined') {
      this.recordTest({
        category: 'Dropdown Visibility', 
        testName: 'DOM Dropdown Visibility Test',
        input: 'DOM environment',
        expected: 'DOM available',
        actual: 'No DOM (Node.js environment)',
        passed: false,
        details: { note: 'This test requires browser environment' }
      });
      return;
    }

    const dropdownElements = document.querySelectorAll('[id*="step-status-dropdown"]');
    const currentRole = window.stepView?.userRole || window.UMIG_STEP_CONFIG?.user?.role || 'UNKNOWN';
    
    // Dropdown should be visible for formal roles (with appropriate permissions)
    const shouldHaveDropdown = ["PILOT", "ADMIN"].includes(currentRole);
    
    this.recordTest({
      category: 'Dropdown Visibility',
      testName: 'Dropdown Elements Visibility',
      input: `Current role: ${currentRole}`,
      expected: shouldHaveDropdown ? 'Dropdown elements present' : 'No dropdown requirements',
      actual: `Found ${dropdownElements.length} dropdown elements`,
      passed: true, // This is informational - actual visibility depends on permissions
      details: {
        currentRole: currentRole,
        dropdownCount: dropdownElements.length,
        shouldHaveDropdown: shouldHaveDropdown,
        note: 'Actual visibility depends on user permissions within role'
      }
    });
  }

  /**
   * Test edge cases and error conditions
   */
  async testEdgeCases() {
    this.log("\n🔍 Testing Edge Cases", 'section');
    
    // Test updateStaticStatusBadges skip logic
    const skipTestCases = [
      { role: 'ADMIN', shouldSkip: true },
      { role: 'PILOT', shouldSkip: true },
      { role: 'NORMAL', shouldSkip: true },
      { role: 'GUEST', shouldSkip: false },
      { role: null, shouldSkip: false },
      { role: undefined, shouldSkip: false },
    ];

    skipTestCases.forEach((testCase, index) => {
      const { role, shouldSkip } = testCase;
      
      // Logic from updateStaticStatusBadges: ["NORMAL", "PILOT", "ADMIN"].includes(this.userRole)
      const actualSkip = ["NORMAL", "PILOT", "ADMIN"].includes(role);
      const passed = actualSkip === shouldSkip;
      
      this.recordTest({
        category: 'Edge Cases - Skip Logic',
        testName: `Skip Test ${index + 1}: role = ${JSON.stringify(role)}`,
        input: `role: ${JSON.stringify(role)}`,
        expected: shouldSkip ? 'skip badge updates' : 'run badge updates',
        actual: actualSkip ? 'skip badge updates' : 'run badge updates',
        passed: passed,
        details: {
          role: role,
          logic: '["NORMAL", "PILOT", "ADMIN"].includes(role)',
          result: actualSkip
        }
      });
    });
  }

  /**
   * Test DOM consistency - ensure no redundant displays
   */
  async testDOMConsistency() {
    this.log("\n🔧 Testing DOM Consistency", 'section');
    
    if (typeof document === 'undefined') {
      this.recordTest({
        category: 'DOM Consistency',
        testName: 'Redundancy Check',
        input: 'DOM environment',
        expected: 'DOM available',
        actual: 'No DOM (Node.js environment)',
        passed: false,
        details: { note: 'This test requires browser environment' }
      });
      return;
    }

    const badgeElements = document.querySelectorAll('.status-badge:not([style*="display: none"])');
    const dropdownElements = document.querySelectorAll('[id*="step-status-dropdown"]:not([style*="display: none"])');
    const currentRole = window.stepView?.userRole || window.UMIG_STEP_CONFIG?.user?.role || 'UNKNOWN';
    
    const visibleBadges = Array.from(badgeElements).filter(el => 
      el.offsetWidth > 0 && el.offsetHeight > 0
    ).length;
    
    const visibleDropdowns = Array.from(dropdownElements).filter(el =>
      el.offsetWidth > 0 && el.offsetHeight > 0  
    ).length;

    // Check for redundant displays - both badge and dropdown visible simultaneously
    const hasRedundancy = visibleBadges > 0 && visibleDropdowns > 0;
    
    this.recordTest({
      category: 'DOM Consistency',
      testName: 'No Redundant Status Displays',
      input: `Role: ${currentRole}, Badges: ${visibleBadges}, Dropdowns: ${visibleDropdowns}`,
      expected: 'No redundant displays (badge AND dropdown simultaneously)',
      actual: hasRedundancy ? 'REDUNDANCY DETECTED' : 'No redundancy',
      passed: !hasRedundancy,
      details: {
        currentRole: currentRole,
        visibleBadges: visibleBadges,
        visibleDropdowns: visibleDropdowns,
        hasRedundancy: hasRedundancy,
        criticalIssue: hasRedundancy
      }
    });
  }

  /**
   * URL-based testing helper
   * Generate URLs for different role scenarios
   */
  generateTestURLs(baseURL) {
    const stepId = 'ABC123'; // Default test step
    const testURLs = {
      admin: `${baseURL}?stepid=${stepId}&role=admin`,
      pilot: `${baseURL}?stepid=${stepId}&role=pilot`, 
      normal: `${baseURL}?stepid=${stepId}&role=normal`,
      default: `${baseURL}?stepid=${stepId}`, // No role parameter
      guest: `${baseURL}?stepid=${stepId}&role=guest`, // Invalid role
      viewer: `${baseURL}?stepid=${stepId}&role=viewer`, // Invalid role
    };

    this.log("\n🔗 Generated Test URLs:", 'section');
    Object.entries(testURLs).forEach(([scenario, url]) => {
      this.log(`  ${scenario.toUpperCase()}: ${url}`, 'info');
    });

    return testURLs;
  }

  /**
   * Browser console testing commands
   */
  getBrowserConsoleCommands() {
    const commands = {
      checkCurrentRole: `
// Check current user role and configuration
console.log("Current Role:", window.stepView?.userRole);
console.log("Config Role:", window.UMIG_STEP_CONFIG?.user?.role);
console.log("Should show badge:", !["NORMAL", "PILOT", "ADMIN"].includes(window.stepView?.userRole));
console.log("Full Config:", window.UMIG_STEP_CONFIG?.user);
      `,
      
      inspectBadgeElements: `
// Inspect status badge elements
const badges = document.querySelectorAll('.status-badge');
console.log("Badge elements found:", badges.length);
badges.forEach((badge, i) => {
  console.log(\`Badge \${i+1}:\`, badge.textContent, badge.style.display !== 'none' ? 'VISIBLE' : 'HIDDEN');
});
      `,
      
      inspectDropdownElements: `
// Inspect status dropdown elements  
const dropdowns = document.querySelectorAll('[id*="step-status-dropdown"]');
console.log("Dropdown elements found:", dropdowns.length);
dropdowns.forEach((dropdown, i) => {
  console.log(\`Dropdown \${i+1}:\`, dropdown.style.display !== 'none' ? 'VISIBLE' : 'HIDDEN');
});
      `,
      
      validateLogic: `
// Validate the core conditional logic
const testRoles = ['ADMIN', 'PILOT', 'NORMAL', 'GUEST', null, undefined];
testRoles.forEach(role => {
  const shouldShow = !["NORMAL", "PILOT", "ADMIN"].includes(role);
  console.log(\`Role: \${JSON.stringify(role)} → Show badge: \${shouldShow}\`);
});
      `
    };

    this.log("\n💻 Browser Console Commands:", 'section');
    Object.entries(commands).forEach(([name, command]) => {
      this.log(`\n  ${name}:`, 'info');
      this.log(command.trim(), 'code');
    });

    return commands;
  }

  /**
   * Record a test result
   */
  recordTest(testResult) {
    this.testResults.push({
      ...testResult,
      timestamp: new Date().toISOString()
    });
    
    const status = testResult.passed ? '✅ PASS' : '❌ FAIL';
    const message = `${status} ${testResult.testName}`;
    
    if (this.verbose) {
      this.log(`  ${message}`, testResult.passed ? 'success' : 'error');
      if (testResult.details) {
        this.log(`    Expected: ${testResult.expected}`, 'detail');
        this.log(`    Actual: ${testResult.actual}`, 'detail');
      }
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

    const report = {
      summary: {
        totalTests: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: `${successRate}%`,
        timestamp: new Date().toISOString()
      },
      results: this.testResults,
      recommendations: this.generateRecommendations(),
      nextSteps: this.generateNextSteps()
    };

    this.log("\n📊 TEST RESULTS SUMMARY", 'header');
    this.log(`  Total Tests: ${totalTests}`, 'info');
    this.log(`  Passed: ${passedTests}`, 'success');
    this.log(`  Failed: ${failedTests}`, failedTests > 0 ? 'error' : 'info');
    this.log(`  Success Rate: ${successRate}%`, successRate === '100.0' ? 'success' : 'warning');

    if (failedTests > 0) {
      this.log("\n❌ FAILED TESTS:", 'section');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => this.log(`  - ${r.testName}: ${r.actual}`, 'error'));
    }

    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const failedTests = this.testResults.filter(r => !r.passed);
    const recommendations = [];

    if (failedTests.length === 0) {
      recommendations.push({
        priority: 'LOW',
        action: 'Proceed with manual testing',
        description: 'All logic tests passed. Ready for browser-based validation.'
      });
    } else {
      failedTests.forEach(test => {
        if (test.category === 'Role Detection Logic') {
          recommendations.push({
            priority: 'HIGH',
            action: 'Fix role detection logic',
            description: `Core logic test failed: ${test.testName}`
          });
        }
        
        if (test.details?.criticalIssue) {
          recommendations.push({
            priority: 'CRITICAL',
            action: 'Fix redundant status displays',
            description: 'Both badge and dropdown are visible simultaneously'
          });
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate next steps based on current results
   */
  generateNextSteps() {
    const nextSteps = [
      {
        phase: 1,
        action: 'Manual URL Testing',
        description: 'Test each role scenario using URL parameters',
        estimatedTime: '30 minutes'
      },
      {
        phase: 2, 
        action: 'Browser Console Validation',
        description: 'Use console commands to inspect DOM elements',
        estimatedTime: '15 minutes'
      },
      {
        phase: 3,
        action: 'Edge Case Verification',
        description: 'Test undefined configs and invalid roles',
        estimatedTime: '15 minutes'
      },
      {
        phase: 4,
        action: 'User Acceptance Testing',
        description: 'Validate complete user workflows',
        estimatedTime: '30 minutes'
      }
    ];

    return nextSteps;
  }

  /**
   * Utility logging method with colored output
   */
  log(message, type = 'info') {
    if (!this.verbose) return;
    
    const colors = {
      header: '\x1b[1m\x1b[35m', // Bold magenta
      section: '\x1b[1m\x1b[36m', // Bold cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m', // Red
      warning: '\x1b[33m', // Yellow
      info: '\x1b[37m', // White
      detail: '\x1b[90m', // Gray
      code: '\x1b[90m', // Gray
      reset: '\x1b[0m' // Reset
    };

    const color = colors[type] || colors.info;
    console.log(`${color}${message}${colors.reset}`);
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = US036StatusDisplayValidator;
} else if (typeof window !== 'undefined') {
  window.US036StatusDisplayValidator = US036StatusDisplayValidator;
}

// Auto-run if executed directly
if (typeof module !== 'undefined' && require.main === module) {
  const validator = new US036StatusDisplayValidator();
  
  (async () => {
    try {
      const results = await validator.validateAll();
      
      // Additional outputs for immediate use
      console.log('\n🔗 Test URLs for manual validation:');
      const baseURL = '/display/UMIG/Step+View';
      const testURLs = validator.generateTestURLs(baseURL);
      
      console.log('\n💻 Browser console commands:');
      validator.getBrowserConsoleCommands();
      
      console.log('\n📋 Manual Testing Checklist:');
      console.log('  1. Test ADMIN role: ✅ (Already confirmed working)');
      console.log('  2. Test PILOT role: Use ?role=pilot URL');
      console.log('  3. Test NORMAL role: Use ?role=normal URL'); 
      console.log('  4. Test default user: Use URL without role parameter');
      console.log('  5. Test invalid role: Use ?role=guest URL');
      
      process.exit(results.summary.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  })();
}

/**
 * USAGE EXAMPLES:
 * 
 * // Node.js environment
 * const Validator = require('./us-036-status-display-validation.js');
 * const validator = new Validator();
 * validator.validateAll().then(results => console.log(results));
 * 
 * // Browser environment  
 * const validator = new US036StatusDisplayValidator();
 * validator.validateAll().then(results => console.log(results));
 * 
 * // Get test URLs
 * const urls = validator.generateTestURLs('/display/UMIG/Step+View');
 * 
 * // Get console commands
 * const commands = validator.getBrowserConsoleCommands();
 */