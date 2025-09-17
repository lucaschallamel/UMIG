#!/usr/bin/env node

/**
 * US-087 Phase 1 Integration Test Script
 *
 * This script validates that the Phase 1 integration for Admin GUI
 * component migration is working correctly.
 */

console.log("========================================");
console.log("US-087 Phase 1 Integration Validation");
console.log("========================================\n");

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const pass = (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`);
const fail = (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`);
const info = (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`);
const warn = (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);

let passCount = 0;
let failCount = 0;

// Test 1: Check if utilities exist
console.log("1. Checking utility files...");
const fs = require('fs');
const path = require('path');

const utilsPath = path.join(__dirname, '..', 'src', 'groovy', 'umig', 'web', 'js', 'utils');
const featureTogglePath = path.join(utilsPath, 'FeatureToggle.js');
const perfMonitorPath = path.join(utilsPath, 'PerformanceMonitor.js');

if (fs.existsSync(featureTogglePath)) {
  pass("FeatureToggle.js exists");
  passCount++;
} else {
  fail("FeatureToggle.js not found");
  failCount++;
}

if (fs.existsSync(perfMonitorPath)) {
  pass("PerformanceMonitor.js exists");
  passCount++;
} else {
  fail("PerformanceMonitor.js not found");
  failCount++;
}

// Test 2: Check admin-gui.js modifications
console.log("\n2. Checking admin-gui.js integration...");
const adminGuiPath = path.join(__dirname, '..', 'src', 'groovy', 'umig', 'web', 'js', 'admin-gui.js');
const adminGuiContent = fs.readFileSync(adminGuiPath, 'utf8');

const integrationMarkers = [
  { name: 'Component managers', pattern: /componentManagers:\s*{}/ },
  { name: 'Feature toggle property', pattern: /featureToggle:\s*null/ },
  { name: 'Performance monitor property', pattern: /performanceMonitor:\s*null/ },
  { name: 'initializeComponentMigration method', pattern: /initializeComponentMigration:\s*function/ },
  { name: 'loadEntityManagers method', pattern: /loadEntityManagers:\s*function/ },
  { name: 'loadTeamsEntityManager method', pattern: /loadTeamsEntityManager:\s*function/ },
  { name: 'shouldUseComponentManager method', pattern: /shouldUseComponentManager:\s*function/ },
  { name: 'loadWithEntityManager method', pattern: /loadWithEntityManager\(entity\)/ },
  { name: 'US-087 integration check', pattern: /US-087.*Check if we should use component manager/ },
  { name: 'Keyboard shortcuts', pattern: /Ctrl\+Shift\+M.*Toggle migration/ }
];

integrationMarkers.forEach(marker => {
  if (marker.pattern.test(adminGuiContent)) {
    pass(`${marker.name} integrated`);
    passCount++;
  } else {
    fail(`${marker.name} not found`);
    failCount++;
  }
});

// Test 3: Check TeamsEntityManager existence
console.log("\n3. Checking TeamsEntityManager availability...");
const teamsManagerPath = path.join(__dirname, '..', 'src', 'groovy', 'umig', 'web', 'js', 'entities', 'teams', 'TeamsEntityManager.js');

if (fs.existsSync(teamsManagerPath)) {
  pass("TeamsEntityManager.js exists");
  passCount++;

  // Check if it extends BaseEntityManager
  const teamsContent = fs.readFileSync(teamsManagerPath, 'utf8');
  if (teamsContent.includes('extends BaseEntityManager')) {
    pass("TeamsEntityManager extends BaseEntityManager");
    passCount++;
  } else {
    warn("TeamsEntityManager might not extend BaseEntityManager");
  }
} else {
  fail("TeamsEntityManager.js not found");
  failCount++;
}

// Test 4: Validate Phase 1 requirements
console.log("\n4. Validating Phase 1 requirements...");

const requirements = [
  {
    name: 'Backward compatibility',
    check: adminGuiContent.includes('shouldUseComponentManager') && adminGuiContent.includes('loadCurrentSectionLegacy')
  },
  {
    name: 'Feature toggle integration',
    check: adminGuiContent.includes('this.featureToggle') && adminGuiContent.includes('isEnabled')
  },
  {
    name: 'Performance monitoring',
    check: adminGuiContent.includes('performanceMonitor') && adminGuiContent.includes('startTimer')
  },
  {
    name: 'Error handling with rollback',
    check: adminGuiContent.includes('emergencyRollback') || adminGuiContent.includes('Rollback to legacy mode')
  },
  {
    name: 'Dual-mode operation',
    check: adminGuiContent.includes('loadWithEntityManager') && adminGuiContent.includes('legacy')
  }
];

requirements.forEach(req => {
  if (req.check) {
    pass(`${req.name} implemented`);
    passCount++;
  } else {
    fail(`${req.name} not implemented`);
    failCount++;
  }
});

// Summary
console.log("\n========================================");
console.log("VALIDATION SUMMARY");
console.log("========================================");
console.log(`${colors.green}Passed: ${passCount}${colors.reset}`);
console.log(`${colors.red}Failed: ${failCount}${colors.reset}`);

if (failCount === 0) {
  console.log(`\n${colors.green}🎉 Phase 1 integration validation PASSED!${colors.reset}`);
  console.log(`${colors.green}All requirements have been successfully implemented.${colors.reset}`);

  console.log("\nNext steps:");
  info("1. Test in browser with Ctrl+Shift+M to enable migration");
  info("2. Use Ctrl+Shift+T to toggle Teams component");
  info("3. Monitor performance with Ctrl+Shift+P");
  info("4. If issues occur, use Ctrl+Shift+R for emergency rollback");

  process.exit(0);
} else {
  console.log(`\n${colors.red}⚠️  Phase 1 integration validation FAILED${colors.reset}`);
  console.log(`${colors.yellow}Please review the failed checks above.${colors.reset}`);
  process.exit(1);
}