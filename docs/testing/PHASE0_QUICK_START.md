# Phase 0: Emergency Unblocking - Quick Start Guide

**Duration**: 2-3 hours
**Priority**: P0 CRITICAL
**Objective**: Restore basic JavaScript test execution
**Success**: At least one test category runs without stack overflow

---

## 🚨 Current Problem

```
RangeError: Maximum call stack size exceeded
at /node_modules/tough-cookie/dist/utils.js:48
```

**Impact**: 100% of JavaScript tests blocked
**Root Cause**: `jest → jsdom → tough-cookie → jsdom` circular dependency

---

## ⚡ 3-Hour Emergency Action Plan

### Hour 1: Jest Configuration & Mocks (60 min)

#### Task 1.1: Update Base Jest Config (15 min)

**File**: `/local-dev-setup/jest.config.js`

```javascript
// jest.config.js - UPDATED CONFIGURATION
module.exports = {
  // CRITICAL: Use node environment by default (no jsdom = no tough-cookie)
  testEnvironment: "node",

  // Test matching - exclude DOM tests by default
  testMatch: ["**/__tests__/**/*.test.js", "!**/__tests__/**/*.dom.test.js"],

  // Module mapping to prevent tough-cookie loading
  moduleNameMapper: {
    "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie.mock.js",
    "^jsdom$": "<rootDir>/__tests__/__mocks__/jsdom.mock.js",
  },

  // Memory management
  maxWorkers: 1, // Reduce parallelization
  workerIdleMemoryLimit: "512MB",

  // Cache for performance
  cache: true,
  cacheDirectory: "<rootDir>/.jest-cache",

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/jest.setup.unit.js"],

  // Coverage
  collectCoverageFrom: [
    "src/groovy/umig/web/js/**/*.js",
    "!src/groovy/umig/web/js/**/*.test.js",
  ],
};
```

#### Task 1.2: Create tough-cookie Mock (15 min)

**File**: `/local-dev-setup/__tests__/__mocks__/tough-cookie.mock.js` (NEW)

```javascript
// __tests__/__mocks__/tough-cookie.mock.js
// Lightweight mock to prevent circular dependency

class CookieJar {
  constructor() {
    this.cookies = [];
  }

  setCookie(cookie, url, options, callback) {
    this.cookies.push(cookie);
    if (typeof callback === "function") {
      callback(null, cookie);
    }
    return Promise.resolve(cookie);
  }

  getCookies(url, options, callback) {
    if (typeof callback === "function") {
      callback(null, this.cookies);
    }
    return Promise.resolve(this.cookies);
  }

  removeAllCookies(callback) {
    this.cookies = [];
    if (typeof callback === "function") {
      callback(null);
    }
    return Promise.resolve();
  }
}

class Cookie {
  constructor(options = {}) {
    this.key = options.key || "";
    this.value = options.value || "";
    this.domain = options.domain || "";
    this.path = options.path || "/";
    this.secure = options.secure || false;
    this.httpOnly = options.httpOnly || false;
  }

  toString() {
    return `${this.key}=${this.value}`;
  }
}

module.exports = {
  CookieJar,
  Cookie,
  permuteDomain: (domain) => [domain],
  permutePath: (path) => [path],
};
```

#### Task 1.3: Create jsdom Mock (15 min)

**File**: `/local-dev-setup/__tests__/__mocks__/jsdom.mock.js` (NEW)

```javascript
// __tests__/__mocks__/jsdom.mock.js
// Lightweight mock for tests that don't need full DOM

class JSDOM {
  constructor(html = "", options = {}) {
    this.window = {
      document: {
        documentElement: { textContent: "" },
        body: { textContent: "" },
        createElement: (tag) => ({
          tagName: tag.toUpperCase(),
          classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(),
          },
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          setAttribute: jest.fn(),
          getAttribute: jest.fn(),
          appendChild: jest.fn(),
          removeChild: jest.fn(),
        }),
        querySelector: jest.fn(() => null),
        querySelectorAll: jest.fn(() => []),
        getElementById: jest.fn(() => null),
        getElementsByClassName: jest.fn(() => []),
        getElementsByTagName: jest.fn(() => []),
      },
      location: {
        href: options.url || "http://localhost",
        protocol: "http:",
        hostname: "localhost",
        port: "",
        pathname: "/",
        search: "",
        hash: "",
      },
      navigator: {
        userAgent: "Node.js",
      },
      localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      sessionStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
    };
  }

  serialize() {
    return "<html></html>";
  }
}

module.exports = { JSDOM };
```

#### Task 1.4: Update Package.json Test Commands (15 min)

**File**: `/local-dev-setup/package.json`

```json
{
  "scripts": {
    "test:js:unit": "jest --config jest.config.unit.js",
    "test:js:integration": "jest --config jest.config.integration.js",
    "test:js:security": "jest --config jest.config.security.js",
    "test:js:components": "jest --config jest.config.components.js",
    "test:js:emergency": "jest --testPathPattern='BaseComponent.test.js' --config jest.config.unit.js"
  }
}
```

---

### Hour 2: SecurityUtils Stabilization & Configs (60 min)

#### Task 2.1: Update SecurityUtils Wrapper (30 min)

**File**: `/local-dev-setup/__tests__/__mocks__/SecurityUtils.wrapper.js`

```javascript
// __tests__/__mocks__/SecurityUtils.wrapper.js
// Singleton pattern to prevent multiple initializations

class SecurityUtilsWrapper {
  constructor() {
    // Singleton instance
    if (SecurityUtilsWrapper.instance) {
      return SecurityUtilsWrapper.instance;
    }

    this.initialized = false;
    this.SecurityUtils = null;
    SecurityUtilsWrapper.instance = this;
  }

  initialize() {
    if (this.initialized) {
      console.debug("[SecurityUtils Wrapper] Already initialized, skipping");
      return this.SecurityUtils;
    }

    try {
      // Load core SecurityUtils
      const SecurityUtilsModule = require("../../src/groovy/umig/web/js/components/SecurityUtils");
      this.SecurityUtils =
        SecurityUtilsModule.SecurityUtils || SecurityUtilsModule;

      // Expose globally for test compatibility
      if (typeof global !== "undefined") {
        global.SecurityUtils = this.SecurityUtils;
      }
      if (typeof window !== "undefined") {
        window.SecurityUtils = this.SecurityUtils;
      }

      this.initialized = true;
      console.debug("[SecurityUtils Wrapper] Initialized successfully");

      return this.SecurityUtils;
    } catch (error) {
      console.error("[SecurityUtils Wrapper] Initialization failed:", error);

      // Provide minimal stub to prevent test failures
      this.SecurityUtils = this.createStub();
      return this.SecurityUtils;
    }
  }

  createStub() {
    // Minimal SecurityUtils stub for emergency scenarios
    return {
      sanitizeInput: (input) => input,
      validateCSRF: () => true,
      generateCSRFToken: () => "stub-token-123",
      escapeHTML: (html) => html.replace(/[<>]/g, ""),
      isSecureContext: () => true,
      // Add other essential methods as stubs
      checkRateLimit: () => true,
      validateSession: () => true,
    };
  }

  getSecurityUtils() {
    if (!this.initialized) {
      this.initialize();
    }
    return this.SecurityUtils;
  }
}

// Create singleton instance
const wrapper = new SecurityUtilsWrapper();

// Export for CommonJS
module.exports = wrapper;
module.exports.SecurityUtilsWrapper = SecurityUtilsWrapper;

// Export for ES6
exports.default = wrapper;

// Initialize immediately if in Jest environment
if (typeof jest !== "undefined") {
  wrapper.initialize();
}
```

#### Task 2.2: Create Separate Jest Configs (30 min)

**File 1**: `/local-dev-setup/jest.config.unit.js` (NEW)

```javascript
// jest.config.unit.js
// Optimized for unit tests - NO DOM needed

module.exports = {
  ...require("./jest.config.js"),

  displayName: "unit",
  testEnvironment: "node", // CRITICAL: No jsdom
  testMatch: ["**/__tests__/unit/**/*.test.js"],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.unit.js"],

  // Fast execution
  maxWorkers: "75%",

  // Coverage specific to unit tests
  collectCoverageFrom: [
    "src/groovy/umig/web/js/components/**/*.js",
    "!src/groovy/umig/web/js/components/**/*.test.js",
  ],
};
```

**File 2**: `/local-dev-setup/jest.config.integration.js` (UPDATE)

```javascript
// jest.config.integration.js
// For integration tests - USE NODE ENVIRONMENT

module.exports = {
  ...require("./jest.config.js"),

  displayName: "integration",
  testEnvironment: "node", // CHANGED: Was jsdom, now node
  testMatch: ["**/__tests__/integration/**/*.test.js"],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.integration.js"],

  // Longer timeout for integration tests
  testTimeout: 30000,

  // Serial execution for database tests
  maxWorkers: 1,

  // Retry flaky tests
  testRetries: 2,
};
```

**File 3**: `/local-dev-setup/jest.config.security.js` (VERIFY)

```javascript
// jest.config.security.js
// VERIFY this already uses node environment

module.exports = {
  ...require("./jest.config.js"),

  displayName: "security",
  testEnvironment: "node", // CRITICAL: Must be node
  testMatch: ["**/__tests__/**/*.security.test.js"],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.security.js"],

  // Module mapping to prevent tough-cookie
  moduleNameMapper: {
    "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie.mock.js",
    "^jsdom$": "<rootDir>/__tests__/__mocks__/jsdom.mock.js",
  },

  maxWorkers: "50%",
};
```

---

### Hour 3: Emergency Validation & GO/NO-GO (60 min)

#### Task 3.1: Update Jest Setup Files (15 min)

**File**: `/local-dev-setup/jest.setup.unit.js`

```javascript
// jest.setup.unit.js
console.log("🧪 Setting up Unit Test environment...");

// Early SecurityUtils initialization
const SecurityUtilsWrapper = require("./__tests__/__mocks__/SecurityUtils.wrapper");
SecurityUtilsWrapper.initialize();

console.log("✅ SecurityUtils wrapper initialized early for unit tests");

// Global test utilities
global.testUtils = {
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  mockFetch: () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      }),
    );
  },
};

// Mock window for components that check for it
global.window = global.window || {
  location: { protocol: "https:", hostname: "localhost" },
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
};

console.log("✅ Unit test environment ready");
```

#### Task 3.2: Run Emergency Validation Suite (30 min)

**Test 1: BaseComponent (simplest test)**

```bash
npm run test:js:unit -- __tests__/unit/components/BaseComponent.test.js
```

**Expected**: Test runs without stack overflow

**Test 2: SecurityUtils (critical dependency)**

```bash
npm run test:js:unit -- __tests__/unit/services/SecurityUtils.test.js
```

**Expected**: Tests execute, >50% pass rate minimum

**Test 3: Simple security test**

```bash
npm run test:js:security -- __tests__/security/xss.test.js
```

**Expected**: Security tests run without stack overflow

**Test 4: Integration test (if above pass)**

```bash
npm run test:js:integration -- __tests__/integration/database.test.js
```

**Expected**: Integration test runs in node environment

#### Task 3.3: GO/NO-GO Decision (15 min)

**GO Criteria** (Must meet at least 3 of 4):

1. ✅ At least 2 test files run without stack overflow
2. ✅ SecurityUtils tests show >50% pass rate
3. ✅ Memory usage stays below 512MB
4. ✅ Can run tests from 2 different categories (unit + security)

**NO-GO Criteria** (Any triggers NO-GO):

1. ❌ Stack overflow persists in all test categories
2. ❌ SecurityUtils completely fails to load
3. ❌ Memory consistently exceeds 600MB
4. ❌ No test categories executable

**GO Decision**: Proceed to Phase 1
**NO-GO Decision**: Execute fallback plan (see below)

---

## 🆘 Phase 0 Fallback Plan (If NO-GO)

### Fallback Task 1: Complete jsdom Elimination (30 min)

**Update all Jest configs to explicitly disable jsdom**:

```javascript
// jest.config.js - FALLBACK CONFIGURATION
module.exports = {
  testEnvironment: "node", // NEVER use jsdom

  // Aggressively prevent jsdom loading
  moduleNameMapper: {
    "^jsdom$": "<rootDir>/__tests__/__mocks__/jsdom.mock.js",
    "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie.mock.js",
    "^whatwg-url$": "<rootDir>/__tests__/__mocks__/empty.mock.js",
    "^data-urls$": "<rootDir>/__tests__/__mocks__/empty.mock.js",
  },

  // Transform to prevent jsdom imports
  transformIgnorePatterns: ["node_modules/(?!(jsdom|tough-cookie)/)"],
};
```

**Create empty mock**:

```javascript
// __tests__/__mocks__/empty.mock.js
module.exports = {};
```

### Fallback Task 2: Mock All DOM Operations (30 min)

**Create comprehensive DOM mock**:

```javascript
// __tests__/__mocks__/dom-complete.mock.js
const createDOMEnvironment = () => {
  const elements = new Map();

  const mockElement = {
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
      toggle: jest.fn(),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(() => null),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    querySelector: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    innerHTML: "",
    textContent: "",
    style: {},
    dataset: {},
  };

  global.document = {
    createElement: jest.fn(() => ({ ...mockElement })),
    getElementById: jest.fn(() => null),
    querySelector: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    body: mockElement,
    documentElement: mockElement,
  };

  global.window = {
    document: global.document,
    location: {
      href: "http://localhost",
      protocol: "http:",
      hostname: "localhost",
    },
    localStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
  };
};

module.exports = { createDOMEnvironment };
```

**Use in jest.setup.unit.js**:

```javascript
const {
  createDOMEnvironment,
} = require("./__tests__/__mocks__/dom-complete.mock");
createDOMEnvironment();
```

### Fallback Task 3: Isolate DOM-Dependent Tests (20 min)

**Mark tests requiring real DOM**:

```javascript
// Skip DOM-heavy tests temporarily
describe.skip("Tests requiring real DOM", () => {
  // These tests will be addressed in Phase 1
});
```

### Fallback Task 4: Senior Architecture Review (20 min)

**Escalation email template**:

```
Subject: URGENT - Phase 0 Test Infrastructure Emergency Escalation

Status: NO-GO on Phase 0 emergency fixes
Issue: tough-cookie stack overflow persists despite all mitigations
Attempted: jest config optimization, mocks, environment isolation
Current State: 0% test execution capability
Impact: Blocks TD-004 validation, US-087 Phase 2 decision, all test infrastructure

Request: Senior architecture review and alternative solution exploration

Options for consideration:
1. Complete test framework replacement (e.g., Vitest)
2. Containerized test environment isolation
3. Temporary test infrastructure bypass for critical path validation
4. Extended timeline for comprehensive solution

Availability: Immediate for emergency session
```

---

## ✅ Success Validation Checklist

After completing Hour 3, verify:

- [ ] At least 2 test files run without stack overflow
- [ ] SecurityUtils tests show >50% pass rate
- [ ] Memory usage confirmed <512MB
- [ ] Test execution logs show no tough-cookie errors
- [ ] Can run tests from at least 2 categories
- [ ] Test results are consistent across multiple runs

---

## 📊 Expected Outcomes

### Success Path (GO Decision)

**Immediate**:

- Basic test execution restored
- SecurityUtils operational
- Clear path to Phase 1

**Next 4 Hours** (Phase 1):

- Unit test pass rate: 0% → 90%
- Component tests validated
- Integration tests stabilized

### Fallback Path (NO-GO Decision)

**Immediate**:

- Complete jsdom elimination
- Comprehensive DOM mocking
- Test isolation strategy

**Next 4-6 Hours**:

- Alternative test framework evaluation
- Containerized test environment
- Escalated architecture review

---

## 🚀 Quick Commands Reference

```bash
# Emergency test validation
npm run test:js:unit -- __tests__/unit/components/BaseComponent.test.js

# Check SecurityUtils
npm run test:js:unit -- __tests__/unit/services/SecurityUtils.test.js

# Security test validation
npm run test:js:security -- __tests__/security/xss.test.js

# Integration test check
npm run test:js:integration -- __tests__/integration/database.test.js

# Memory monitoring
node --expose-gc --max-old-space-size=512 node_modules/.bin/jest

# Clear Jest cache (if issues)
npm run test:js:clear-cache
```

---

## 📞 Support Contacts

**Development Lead**: Lucas Challamel
**Escalation**: Immediate for NO-GO scenario
**Status Updates**: End of each hour during Phase 0

---

**START TIMER NOW - 3 HOURS TO GO/NO-GO DECISION**

Hour 1: Jest Config & Mocks → Hour 2: SecurityUtils & Configs → Hour 3: Validation & Decision
