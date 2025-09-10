# US-082-A Foundation Service Layer - Parallel Agent Coordination Handoff

## Executive Summary

**Project**: UMIG (Unified Migration Implementation Guide)  
**Sprint**: Sprint 6  
**Story**: US-082-A Foundation Service Layer (38/30 story points completed)  
**Date**: September 10, 2025  
**Location**: `/Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup`

**CRITICAL PATH**: Test infrastructure fixes blocking production deployment. Need 90%+ test pass rate for QA sign-off.

**Current Status**: 107/275 service tests passing (38.9%) - Need parallel work streams to complete today.

---

## Work Stream Assignments

### Stream A: Test Conversion Agent

**Primary Role**: Convert remaining 4 service tests from self-contained pattern to simplified Jest pattern  
**Priority**: Critical Path - Blocking production deployment  
**Expected Duration**: 4-6 hours

### Stream B: Infrastructure & Validation Agent

**Primary Role**: Fix Jest configuration issues and validate completed work  
**Priority**: Supporting Stream A with infrastructure fixes  
**Expected Duration**: 2-3 hours

---

## Current State Assessment

### ✅ Work Completed Today (Sept 10, 2025)

1. Created development journal documenting US-082-A implementation
2. Committed 50 files with 28,724 insertions (hash: 8cb504ef)
3. Updated memory bank with achievements
4. Reorganized test structure (eliminated duplication)
5. Fixed module exports for all 6 services
6. Added on()/off() compatibility methods to BaseService
7. Converted 2/6 service tests to simplified Jest pattern

### ✅ Services with Working Tests (107/275 tests passing)

- **AuthenticationService**: 68/68 tests passing (100%) ✅
- **AdminGuiService**: 36/36 tests passing (100%) ✅
- **SecurityService.simple**: 3/3 tests passing (100%) ✅

### ❌ Services Requiring Conversion (168 failing tests)

- **ApiService**: 0/54 tests passing - Complex 2000-line service
- **FeatureFlagService**: Fatal errors - Constructor/cleanup issues
- **NotificationService**: Timeout issues - 1040 lines
- **SecurityService**: 0/63 tests - Original complex test file

---

# STREAM A: Test Conversion Agent

## Primary Objective

Convert 4 remaining service test files from problematic self-contained pattern to working simplified Jest pattern.

## Work Priorities (Execute in Order)

### Priority 1: ApiService.test.js ⭐⭐⭐

**File**: `/local-dev-setup/__tests__/unit/services/ApiService.test.js`  
**Complexity**: Highest (2000+ lines, most complex service)  
**Current Status**: 0/54 tests passing  
**Impact**: Highest - Core API functionality tests

### Priority 2: SecurityService.test.js ⭐⭐⭐

**File**: `/local-dev-setup/__tests__/unit/services/SecurityService.test.js`  
**Complexity**: High (1203 lines, constructor issues)  
**Current Status**: 0/63 tests passing  
**Impact**: Critical - Security validation tests

### Priority 3: NotificationService.test.js ⭐⭐

**File**: `/local-dev-setup/__tests__/unit/services/NotificationService.test.js`  
**Complexity**: Medium (1040 lines, timeout issues)  
**Current Status**: Timeout failures  
**Impact**: Important - User notification system

### Priority 4: FeatureFlagService.test.js ⭐⭐

**File**: `/local-dev-setup/__tests__/unit/services/FeatureFlagService.test.js`  
**Complexity**: Medium (1117 lines, cleanup errors)  
**Current Status**: Fatal errors during setup  
**Impact**: Important - Feature toggle system

## Conversion Pattern Template

### ❌ OLD PATTERN (Self-Contained - Causing Issues)

```javascript
// Complex string manipulation and VM context evaluation
const fs = require("fs");
const vm = require("vm");
const path = require("path");

// Read service file as string
const serviceCode = fs.readFileSync(servicePath, "utf8");

// Create complex context and run in VM
const context = vm.createContext(globalSetup);
vm.runInContext(serviceCode, context);
```

### ✅ NEW PATTERN (Simplified Jest - Working)

```javascript
// Setup globals BEFORE requiring modules
global.window = global.window || {};
global.performance = global.performance || { now: () => Date.now() };
global.localStorage = global.localStorage || {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.crypto = global.crypto || {
  getRandomValues: (array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  subtle: {
    digest: async (algorithm, data) => {
      return new ArrayBuffer(32);
    },
  },
};

// Standard require - works with module.exports
const {
  ServiceClass,
  HelperClass,
} = require("../../../../src/groovy/umig/web/js/services/ServiceName.js");

describe("ServiceClass Tests", () => {
  let service;

  beforeEach(() => {
    service = new ServiceClass();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should instantiate correctly", () => {
    expect(service).toBeDefined();
    expect(service.name).toBe("ServiceName");
  });

  // Convert remaining tests using standard Jest patterns
});
```

## Step-by-Step Conversion Process

### Step 1: File Analysis

1. Open original test file
2. Identify test structure and key test cases
3. Note any service-specific mocking requirements
4. Identify browser APIs that need mocking

### Step 2: Create New Test File Structure

```javascript
/**
 * ServiceName Tests - Simplified Jest Pattern (TD-002)
 * Converted from self-contained pattern on 2025-09-10
 */

// Global mocks setup (customize per service)
global.window = global.window || {};
global.performance = global.performance || {
  now: jest.fn(() => Date.now()),
};
// Add service-specific globals here

const {
  ServiceClass,
  HelperClasses,
} = require("../../../../src/groovy/umig/web/js/services/ServiceName.js");

describe("ServiceName Integration Tests", () => {
  let service;

  beforeEach(() => {
    service = new ServiceClass();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup service resources
    if (service && service.cleanup) {
      service.cleanup();
    }
  });

  // Convert test cases here
});
```

### Step 3: Convert Test Cases

1. Remove VM context setup
2. Convert to standard Jest `it()` blocks
3. Use `service.` instead of `context.ServiceClass`
4. Update assertions to Jest syntax
5. Add proper async/await for promises

### Step 4: Handle Service-Specific Issues

#### For ApiService:

```javascript
// Mock fetch and XMLHttpRequest
global.fetch = jest.fn();
global.XMLHttpRequest = jest.fn(() => ({
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  readyState: 4,
  status: 200,
  responseText: '{"success": true}',
}));
```

#### For SecurityService:

```javascript
// Mock crypto APIs fully
global.crypto = {
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
    encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
    decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
  },
};
```

#### For NotificationService:

```javascript
// Mock timing functions to prevent timeouts
global.setTimeout = jest.fn((cb, delay) => {
  if (delay > 100) {
    // Execute immediately for long delays in tests
    cb();
  } else {
    return setTimeout(cb, delay);
  }
});
global.clearTimeout = jest.fn(clearTimeout);
```

#### For FeatureFlagService:

```javascript
// Mock storage and cleanup properly
global.localStorage = {
  data: {},
  getItem: jest.fn((key) => global.localStorage.data[key] || null),
  setItem: jest.fn((key, value) => {
    global.localStorage.data[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete global.localStorage.data[key];
  }),
  clear: jest.fn(() => {
    global.localStorage.data = {};
  }),
};
```

## Testing Commands for Stream A

```bash
# Test individual service after conversion
npm run test:js:unit -- --testPathPattern='services/ServiceName.test.js'

# Test all services
npm run test:js:unit -- --testPathPattern='services' --verbose

# Run with increased memory if needed
NODE_OPTIONS="--max-old-space-size=8192" npm run test:js:unit -- --testPathPattern='services'

# Run single test file with coverage
npm run test:js:unit -- --testPathPattern='services/ApiService.test.js' --coverage
```

## Success Criteria for Stream A

1. All 4 test files converted to simplified Jest pattern
2. No VM context or fs.readFileSync usage
3. Standard require() statements for module loading
4. Proper global mocking setup
5. Each converted test file should pass at least 80% of its tests

## Coordination Checkpoints

- **After each conversion**: Report to Stream B for validation
- **If any conversion fails**: Coordinate with Stream B for infrastructure fixes
- **Before final test**: Stream B validates all infrastructure is ready

---

# STREAM B: Infrastructure & Validation Agent

## Primary Objective

Fix Jest configuration issues, resolve infrastructure problems, and validate Stream A's work.

## Work Priorities

### Priority 1: Jest Configuration Fixes ⭐⭐⭐

**Issue**: Global setup and configuration issues affecting test execution  
**Files to Check/Fix**:

- `/local-dev-setup/jest.config.js`
- `/local-dev-setup/package.json` (test scripts)
- `/local-dev-setup/__tests__/setupTests.js`

### Priority 2: Memory/Performance Issues ⭐⭐

**Issue**: Large service files causing memory leaks and timeouts  
**Solutions**: Memory allocation, worker limits, timeout adjustments

### Priority 3: Validation Framework ⭐⭐

**Issue**: Need systematic validation of Stream A conversions  
**Solution**: Create validation scripts and checkpoints

### Priority 4: Documentation Updates ⭐

**Issue**: Update documentation with successful patterns  
**Solution**: Update TD-002 documentation with working patterns

## Infrastructure Fixes Required

### 1. Jest Configuration Optimization

**File**: `/local-dev-setup/jest.config.js`

```javascript
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setupTests.js"],

  // Memory and performance optimization
  maxWorkers: 1,
  workerIdleMemoryLimit: "1GB",

  // Timeout configuration
  testTimeout: 30000,

  // Module resolution
  moduleFileExtensions: ["js", "json"],

  // Coverage configuration
  collectCoverageFrom: [
    "src/groovy/umig/web/js/services/**/*.js",
    "!**/node_modules/**",
  ],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
```

### 2. Setup Test File

**File**: `/local-dev-setup/__tests__/setupTests.js`

```javascript
// Global test setup for all Jest tests
// This file is loaded before every test file

// Increase timeout for large service tests
jest.setTimeout(30000);

// Mock console methods to reduce noise
global.console = {
  ...console,
  // Suppress logs during tests unless debugging
  log: process.env.NODE_ENV === "debug" ? console.log : jest.fn(),
  warn: process.env.NODE_ENV === "debug" ? console.warn : jest.fn(),
  info: process.env.NODE_ENV === "debug" ? console.info : jest.fn(),
};

// Global browser API mocks (baseline)
global.window = global.window || {};
global.document = global.document || {
  createElement: jest.fn(() => ({})),
  getElementById: jest.fn(() => null),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
global.navigator = global.navigator || {
  userAgent: "jest-test-runner",
};

// Performance mock with incrementing now()
let performanceCounter = 0;
global.performance = global.performance || {
  now: jest.fn(() => ++performanceCounter * 16.67), // Simulate ~60fps timing
};

// Memory management
afterEach(() => {
  // Clear all timers after each test
  jest.clearAllTimers();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});
```

### 3. Package.json Script Optimization

**Add/Update scripts in package.json**:

```json
{
  "scripts": {
    "test:js:services": "NODE_OPTIONS='--max-old-space-size=8192' jest __tests__/unit/services --maxWorkers=1",
    "test:js:services:watch": "NODE_OPTIONS='--max-old-space-size=8192' jest __tests__/unit/services --maxWorkers=1 --watch",
    "test:js:services:debug": "NODE_ENV=debug NODE_OPTIONS='--max-old-space-size=8192' jest __tests__/unit/services --maxWorkers=1 --verbose",
    "validate:services": "node scripts/validate-service-tests.js"
  }
}
```

## Validation Framework

### Create Validation Script

**File**: `/local-dev-setup/scripts/validate-service-tests.js`

```javascript
#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SERVICES_DIR = path.join(__dirname, "../__tests__/unit/services");
const SERVICES = [
  "AdminGuiService",
  "ApiService",
  "AuthenticationService",
  "FeatureFlagService",
  "NotificationService",
  "SecurityService",
];

console.log("🔍 Validating Service Test Conversions...\n");

const results = {
  passed: [],
  failed: [],
  total: 0,
  passing: 0,
};

SERVICES.forEach((serviceName) => {
  const testFile = path.join(SERVICES_DIR, `${serviceName}.test.js`);

  if (!fs.existsSync(testFile)) {
    console.log(`❌ ${serviceName}: Test file missing`);
    results.failed.push({ service: serviceName, reason: "Missing test file" });
    return;
  }

  // Check if file uses simplified pattern
  const content = fs.readFileSync(testFile, "utf8");
  const usesSimplifiedPattern =
    content.includes("require(") &&
    !content.includes("vm.createContext") &&
    !content.includes("fs.readFileSync");

  if (!usesSimplifiedPattern) {
    console.log(`⚠️  ${serviceName}: Still uses self-contained pattern`);
    results.failed.push({ service: serviceName, reason: "Uses old pattern" });
    return;
  }

  try {
    // Run the test
    const output = execSync(
      `npm run test:js:unit -- --testPathPattern='${serviceName}.test.js' --passWithNoTests`,
      { encoding: "utf8", cwd: path.dirname(__dirname) },
    );

    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);

    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    const total = passed + failed;

    results.total += total;
    results.passing += passed;

    if (failed === 0 && passed > 0) {
      console.log(`✅ ${serviceName}: ${passed}/${total} tests passing (100%)`);
      results.passed.push({ service: serviceName, passed, total });
    } else {
      console.log(
        `⚠️  ${serviceName}: ${passed}/${total} tests passing (${Math.round((passed / total) * 100)}%)`,
      );
      results.failed.push({
        service: serviceName,
        passed,
        total,
        reason: "Some tests failing",
      });
    }
  } catch (error) {
    console.log(`❌ ${serviceName}: Test execution failed`);
    results.failed.push({ service: serviceName, reason: "Execution failed" });
  }
});

console.log(`\n📊 Overall Results:`);
console.log(`   Total Tests: ${results.total}`);
console.log(
  `   Passing: ${results.passing} (${Math.round((results.passing / results.total) * 100)}%)`,
);
console.log(`   Services Fully Working: ${results.passed.length}/6`);
console.log(`   Services Needing Work: ${results.failed.length}/6`);

if (results.passing / results.total >= 0.9) {
  console.log(`\n🎉 SUCCESS: 90%+ pass rate achieved - Ready for QA!`);
  process.exit(0);
} else {
  console.log(`\n⚠️  Need more work to reach 90% pass rate`);
  process.exit(1);
}
```

## Testing Commands for Stream B

```bash
# Check Jest configuration
npm run test:js:unit -- --showConfig

# Test infrastructure fixes
npm run test:js:services

# Run validation script
npm run validate:services

# Check memory usage during tests
NODE_OPTIONS="--inspect --max-old-space-size=8192" npm run test:js:services

# Debug individual service test
npm run test:js:services:debug -- --testPathPattern='ApiService.test.js'
```

## Validation Checklist for Stream B

### For Each Service Converted by Stream A:

- [ ] Test file exists and is accessible
- [ ] File uses simplified Jest pattern (no VM context)
- [ ] Global mocks are properly configured
- [ ] Service can be instantiated without errors
- [ ] At least 80% of tests pass
- [ ] No memory leaks or infinite loops
- [ ] Test execution completes within 30 seconds

### Infrastructure Validation:

- [ ] Jest configuration optimized for large services
- [ ] Memory allocation sufficient for service sizes
- [ ] Global mocks don't conflict between tests
- [ ] Test isolation working properly
- [ ] Coverage reporting functional

## Success Criteria for Stream B

1. Jest configuration optimized for service testing
2. Memory and performance issues resolved
3. Validation framework operational
4. Each service conversion validated immediately
5. Overall test pass rate ≥90%

---

# COORDINATION PROTOCOL

## Communication Checkpoints

### Checkpoint 1: Infrastructure Ready (Stream B → Stream A)

**When**: After Stream B completes Jest configuration fixes  
**Message**: "Infrastructure ready for service conversions"  
**Deliverable**: Working Jest configuration, validation script ready

### Checkpoint 2: Service Conversion Complete (Stream A → Stream B)

**When**: After each service test file conversion  
**Message**: "[ServiceName] conversion complete - ready for validation"  
**Deliverable**: Converted test file using simplified pattern

### Checkpoint 3: Validation Result (Stream B → Stream A)

**When**: After validation of each converted service  
**Message**: "[ServiceName] validation [PASSED/FAILED] - [details]"  
**Deliverable**: Test results and any fixes needed

### Checkpoint 4: Final Validation (Both Streams)

**When**: All 4 services converted and individually validated  
**Message**: "Ready for comprehensive test suite validation"  
**Deliverable**: Full test suite with 90%+ pass rate

## Shared Status Document

**File**: `/docs/US-082-A-STATUS-TRACKING.md`

Both agents should update this file with:

- Current work status
- Completed tasks
- Blocking issues
- Test results
- Next steps

## Conflict Resolution

If Stream A encounters infrastructure issues:

1. Document the specific error
2. Tag Stream B for immediate assistance
3. Continue with next service while waiting for fix

If Stream B finds issues with conversions:

1. Document specific validation failures
2. Provide suggested fixes to Stream A
3. Continue with infrastructure improvements

## Final Success Validation

**Criteria for US-082-A Completion**:

1. All 6 service test files use simplified Jest pattern
2. No VM context or complex file manipulation
3. Overall test pass rate ≥90% (248+ of 275 tests)
4. All services can be instantiated without errors
5. No memory leaks or timeout failures
6. QA validation passed

**Final Command to Verify Success**:

```bash
npm run validate:services && npm run test:js:services
```

## Emergency Escalation

If either stream encounters blocking issues that cannot be resolved within 1 hour:

1. Document the issue in detail
2. Create minimal reproduction case
3. Tag Lucas for guidance
4. Continue with remaining work items

---

# TECHNICAL CONTEXT

## Key Files and Locations

### Service Files (All Fixed with Exports ✅)

- `/src/groovy/umig/web/js/services/AdminGuiService.js` (BaseService + exports)
- `/src/groovy/umig/web/js/services/ApiService.js` (2000+ lines + exports)
- `/src/groovy/umig/web/js/services/AuthenticationService.js` (exports)
- `/src/groovy/umig/web/js/services/FeatureFlagService.js` (exports)
- `/src/groovy/umig/web/js/services/NotificationService.js` (exports)
- `/src/groovy/umig/web/js/services/SecurityService.js` (exports)

### Test Files (Stream A Focus)

- `/local-dev-setup/__tests__/unit/services/AdminGuiService.test.js` ✅
- `/local-dev-setup/__tests__/unit/services/ApiService.test.js` ❌ (Priority 1)
- `/local-dev-setup/__tests__/unit/services/AuthenticationService.test.js` ✅
- `/local-dev-setup/__tests__/unit/services/FeatureFlagService.test.js` ❌ (Priority 4)
- `/local-dev-setup/__tests__/unit/services/NotificationService.test.js` ❌ (Priority 3)
- `/local-dev-setup/__tests__/unit/services/SecurityService.test.js` ❌ (Priority 2)
- `/local-dev-setup/__tests__/unit/services/SecurityService.simple.test.js` ✅ (Template)

### Infrastructure Files (Stream B Focus)

- `/local-dev-setup/jest.config.js`
- `/local-dev-setup/__tests__/setupTests.js`
- `/local-dev-setup/package.json` (test scripts)
- `/local-dev-setup/scripts/validate-service-tests.js` (to create)

### Documentation Files

- `/docs/US-082-A-TEST-FIXES.md` (current status)
- `/docs/US-082-A-PARALLEL-AGENT-HANDOFF.md` (this file)
- `/docs/US-082-A-STATUS-TRACKING.md` (to create for coordination)

## Technical Debt Context

### TD-001: Self-Contained Test Architecture

- **Works for**: Small to medium Groovy files
- **Fails for**: Large JavaScript service files (1000-3000 lines)
- **Issue**: VM context evaluation with large files causes memory issues
- **Solution**: Use TD-002 simplified Jest pattern for services

### TD-002: Technology-Prefixed Test Infrastructure

- **Status**: Fully implemented ✅
- **Pattern**: Simplified Jest with standard require()
- **Success**: Working for AuthenticationService (68/68) and AdminGuiService (36/36)
- **Template**: SecurityService.simple.test.js

## Memory Management

Large service files require special handling:

- Node memory: `--max-old-space-size=8192`
- Jest workers: `--maxWorkers=1`
- Test timeout: 30 seconds
- Clear mocks between tests
- Force garbage collection when available

## Browser API Mocking Requirements

Different services need different mock setups:

- **All services**: window, performance, document
- **ApiService**: fetch, XMLHttpRequest
- **SecurityService**: crypto (full implementation)
- **NotificationService**: localStorage, setTimeout/clearTimeout
- **FeatureFlagService**: localStorage with persistent data
- **AuthenticationService**: Standard mocks (already working)

---

# EXPECTED TIMELINE

## Stream A (Test Conversion): 4-6 hours

- ApiService conversion: 2 hours (most complex)
- SecurityService conversion: 1.5 hours
- NotificationService conversion: 1 hour
- FeatureFlagService conversion: 1 hour
- Buffer for issues: 0.5 hours

## Stream B (Infrastructure): 2-3 hours

- Jest configuration fixes: 1 hour
- Validation framework: 1 hour
- Documentation updates: 0.5 hours
- Buffer for validation cycles: 0.5 hours

## Final Validation: 1 hour

- Complete test suite run
- Performance validation
- Documentation updates
- QA preparation

## Total: 7-10 hours (Completion by end of day Sept 10)

---

**Status**: Ready for parallel agent deployment  
**Next Action**: Deploy Stream A and Stream B agents with this handoff document  
**Success Metric**: 90%+ test pass rate (248+ of 275 tests) for QA sign-off
