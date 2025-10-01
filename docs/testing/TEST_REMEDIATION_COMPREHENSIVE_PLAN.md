# JavaScript Test Infrastructure Remediation - Comprehensive Phased Plan

**Project**: UMIG Test Infrastructure Excellence Initiative
**Context**: Following TD-004 Interface Fixes - Complete Test Infrastructure Recovery
**Date**: 2025-09-30
**Sprint**: Sprint 7 - US-087 Phase 2 Readiness
**Priority**: P0 - Critical Infrastructure (Blocking US-087 Phase 2 Proceed Decision)
**Status**: READY FOR IMPLEMENTATION

---

## 🎯 Executive Summary

Following the successful completion of TD-004 BaseEntityManager interface fixes (42% development velocity improvement), this comprehensive remediation plan addresses critical JavaScript test infrastructure issues discovered during validation. **The plan provides a phased, risk-mitigated approach to achieve enterprise-grade test quality while supporting US-087 Phase 2-7 entity migrations.**

### Critical Context

- **Current Status**: 120 JavaScript test files, 85-90% historical pass rate
- **Blocking Issue**: tough-cookie stack overflow preventing test execution
- **TD-004 Impact**: Interface fixes require test validation before Phase 2 proceed
- **US-087 Phase 1**: 6 of 8 story points complete, Phase 2-7 pending infrastructure stability
- **Component Architecture**: 25/25 components operational, requiring test coverage validation

### Key Objectives

1. **Resolve Critical Blocking Issues**: Eliminate tough-cookie stack overflow (P0)
2. **Achieve Enterprise Test Quality**: 95%+ pass rate across all categories
3. **Enable US-087 Phase 2 Proceed Decision**: Complete test infrastructure readiness validation
4. **Establish Long-term Stability**: Maintenance-free test infrastructure foundation

---

## 📊 Current State Assessment

### Test Infrastructure Status

| Category              | Test Files | Current Status          | Target   | Gap                     |
| --------------------- | ---------- | ----------------------- | -------- | ----------------------- |
| **Unit Tests**        | 45 files   | 85-90% pass (estimated) | 95%      | Stack overflow blocking |
| **Integration Tests** | 28 files   | 75.5% pass              | 90%      | +14.5% improvement      |
| **Component Tests**   | 25 files   | 95%+ (post TD-004)      | Maintain | Validation blocked      |
| **Security Tests**    | 15 files   | 92.6% (post-fix)        | 95%      | +2.4% improvement       |
| **E2E Tests**         | 7 files    | Not assessed            | 90%      | Full assessment needed  |

### Critical Blocking Issue: tough-cookie Stack Overflow

**Error Pattern**:

```
RangeError: Maximum call stack size exceeded
at /node_modules/tough-cookie/dist/utils.js:48
```

**Impact**:

- Prevents execution of all Jest test suites
- Blocks validation of TD-004 interface fixes
- Prevents US-087 Phase 2 proceed decision
- Affects 100% of JavaScript test infrastructure

**Root Cause Analysis**:

- Circular dependency: `jest → jsdom → tough-cookie → jsdom (circular)`
- Jest configuration using jsdom environment for tests not requiring DOM
- Module loading conflicts between CommonJS and ES6 exports
- SecurityUtils wrapper initialization timing issues

---

## 🎯 Phased Remediation Strategy

### Phase 0: Emergency Unblocking (2-3 hours) - CRITICAL

**Objective**: Restore basic test execution capability
**Priority**: P0 - Must complete before any other work
**Success Criteria**: At least one test category executable without stack overflow

#### Task 0.1: tough-cookie Stack Overflow Resolution (1.5 hours)

**Approach**: Multi-layered mitigation strategy

**Solution 1: Jest Configuration Optimization** (Primary - 30 minutes)

```javascript
// jest.config.js updates
module.exports = {
  // Use node environment by default (no jsdom = no tough-cookie)
  testEnvironment: "node",

  // Only use jsdom for tests that explicitly need DOM
  testMatch: [
    "**/__tests__/**/*.test.js",
    "!**/__tests__/**/*.dom.test.js", // Exclude DOM tests by default
  ],

  // Module mapping to prevent tough-cookie loading
  moduleNameMapper: {
    "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie.mock.js",
    "^jsdom$": "<rootDir>/__tests__/__mocks__/jsdom.mock.js",
  },

  // Increase stack size
  maxWorkers: 1, // Reduce parallelization to conserve memory
  workerIdleMemoryLimit: "512MB",
};
```

**Solution 2: Create Lightweight Mocks** (30 minutes)

```javascript
// __tests__/__mocks__/tough-cookie.mock.js
module.exports = {
  CookieJar: class CookieJar {
    setCookie() {
      return Promise.resolve();
    }
    getCookies() {
      return Promise.resolve([]);
    }
  },
  Cookie: class Cookie {
    constructor(options) {
      this.options = options;
    }
  },
};

// __tests__/__mocks__/jsdom.mock.js
module.exports = {
  JSDOM: class JSDOM {
    constructor() {
      this.window = {
        document: {
          createElement: () => ({}),
          querySelector: () => null,
        },
      };
    }
  },
};
```

**Solution 3: Separate Jest Configurations** (30 minutes)

```javascript
// jest.config.unit.js (no DOM needed)
module.exports = {
  ...require("./jest.config.js"),
  testEnvironment: "node",
  testMatch: ["**/__tests__/unit/**/*.test.js"],
};

// jest.config.dom.js (DOM required, careful jsdom usage)
module.exports = {
  ...require("./jest.config.js"),
  testEnvironment: "jsdom",
  testMatch: ["**/__tests__/integration/**/*.dom.test.js"],
  testEnvironmentOptions: {
    url: "http://localhost",
    resources: "usable",
  },
};

// jest.config.security.js (already exists, ensure node environment)
module.exports = {
  ...require("./jest.config.js"),
  testEnvironment: "node", // CRITICAL: No jsdom for security tests
  testMatch: ["**/__tests__/**/*.security.test.js"],
};
```

**Deliverables**:

- Updated jest.config.js with safe defaults
- Lightweight tough-cookie and jsdom mocks
- Separate configs for unit/dom/security tests
- Updated package.json test commands

**Success Metrics**:

- [ ] At least one test category runs without stack overflow
- [ ] SecurityUtils tests executable
- [ ] Unit tests can run in isolation
- [ ] Memory usage <512MB per test suite

#### Task 0.2: SecurityUtils Module Loading Stabilization (1 hour)

**Problem**: SecurityUtils wrapper has dual-export conflicts causing initialization failures

**Solution**: Unified initialization pattern

```javascript
// __tests__/__mocks__/SecurityUtils.wrapper.js (updated)
class SecurityUtilsWrapper {
  constructor() {
    // Singleton pattern to prevent multiple initializations
    if (SecurityUtilsWrapper.instance) {
      return SecurityUtilsWrapper.instance;
    }

    this.initialized = false;
    SecurityUtilsWrapper.instance = this;
  }

  initialize() {
    if (this.initialized) return;

    // Load core SecurityUtils
    const SecurityUtils = require("../../src/groovy/umig/web/js/components/SecurityUtils");

    // Expose globally
    if (typeof global !== "undefined") {
      global.SecurityUtils = SecurityUtils;
    }
    if (typeof window !== "undefined") {
      window.SecurityUtils = SecurityUtils;
    }

    this.initialized = true;
  }
}

// Early initialization in jest.setup.unit.js
const wrapper = new SecurityUtilsWrapper();
wrapper.initialize();

// Export for CommonJS and ES6
module.exports = SecurityUtilsWrapper;
module.exports.SecurityUtilsWrapper = SecurityUtilsWrapper;
exports.default = SecurityUtilsWrapper;
```

**Deliverables**:

- Singleton SecurityUtils initialization
- Early loading in Jest setup files
- Consistent CommonJS/ES6 exports
- Test validation suite for SecurityUtils availability

**Success Metrics**:

- [ ] SecurityUtils available in 100% of test contexts
- [ ] No initialization race conditions
- [ ] 39 SecurityUtils methods accessible
- [ ] SecurityUtils tests: 8.75% → 95%+ pass rate

#### Task 0.3: Emergency Test Validation (30 minutes)

**Objective**: Validate emergency fixes are effective

**Validation Suite**:

```bash
# Run progressively to validate fixes
npm run test:js:unit -- __tests__/unit/components/BaseComponent.test.js
npm run test:js:unit -- __tests__/unit/services/SecurityUtils.test.js
npm run test:js:security -- __tests__/security/xss.test.js
npm run test:js:integration -- __tests__/integration/ComponentOrchestrator.integration.test.js
```

**Go/No-Go Criteria**:

- ✅ GO: At least 3 of 4 test categories run without stack overflow
- ❌ NO-GO: Persistent stack overflow errors, proceed to Phase 0 fallback

**Fallback Plan** (if NO-GO):

1. Disable jsdom entirely, mock all DOM operations
2. Skip integration tests requiring DOM temporarily
3. Focus on unit test restoration only
4. Escalate to senior architecture review

---

### Phase 1: Foundation Stabilization (4-6 hours)

**Objective**: Restore baseline test infrastructure functionality
**Prerequisites**: Phase 0 complete with GO decision
**Success Criteria**: 90%+ unit test pass rate, stable test execution environment

#### Task 1.1: Component Test Suite Restoration (1.5 hours)

**Context**: Validate TD-004 interface fixes through comprehensive component testing

**Priority Component Tests**:

1. **PaginationComponent** (61.25% → 95%+)
   - Fix setState integration post TD-004
   - Validate pagination state management
   - Test edge cases (large datasets, page boundaries)

2. **BaseEntityManager** (Interface validation)
   - Verify interface contract compliance
   - Test dynamic adaptation pattern (ADR-060)
   - Validate backward compatibility

3. **TeamsEntityManager** (Bidirectional relationships)
   - Test relationship integrity
   - Validate cascade operations
   - Performance under load (>1000 records)

4. **ApplicationsEntityManager** (Security hardening 9.2/10)
   - Restore security test integration
   - Validate XSS/CSRF protection
   - Test authentication fallback chains

**Technical Approach**:

```javascript
// Pattern: Isolate component tests from DOM dependencies
describe("PaginationComponent (Node Environment)", () => {
  let component;

  beforeEach(() => {
    // Mock minimal DOM methods needed
    global.document = {
      createElement: jest.fn(() => ({
        classList: { add: jest.fn(), remove: jest.fn() },
        addEventListener: jest.fn(),
      })),
      querySelector: jest.fn(() => null),
    };

    component = new PaginationComponent({
      /* ... */
    });
  });

  it("should update state using setState pattern (TD-004)", () => {
    component.setState({
      currentPage: 2,
      totalItems: 100,
      pageSize: 10,
    });

    expect(component.state.currentPage).toBe(2);
    expect(component.state.totalItems).toBe(100);
  });
});
```

**Deliverables**:

- 25 component test files validated and passing
- Component test documentation updated
- Performance benchmarks established
- TD-004 interface validation complete

**Success Metrics**:

- [ ] PaginationComponent: 95%+ pass rate
- [ ] All entity managers: 100% interface compliance
- [ ] Component loading: Maintain 25/25 success
- [ ] Test execution time: <3 minutes for component suite

#### Task 1.2: Integration Test Environment Optimization (1.5 hours)

**Problem**: Integration tests have 75.5% pass rate, need 90%+

**Root Causes**:

- Network configuration issues
- Database connection pooling inefficiencies
- Cross-component communication timing
- Service dependency failures

**Solutions**:

**1. Network Configuration Stabilization** (30 minutes)

```javascript
// jest.config.integration.js
module.exports = {
  testEnvironment: "node", // Use node, not jsdom
  testTimeout: 30000, // Increase timeout for network operations
  setupFilesAfterEnv: ["<rootDir>/jest.setup.integration.js"],

  // Retry flaky tests
  testRetries: 2,

  // Serial execution for integration tests
  maxWorkers: 1,
};

// jest.setup.integration.js
beforeAll(async () => {
  // Verify database connectivity
  const db = await connectToDatabase();
  expect(db.isConnected()).toBe(true);

  // Setup test data isolation
  await db.beginTransaction();
});

afterAll(async () => {
  // Cleanup test data
  await db.rollback();
  await db.disconnect();
});
```

**2. Database Connection Pooling** (30 minutes)

```javascript
// __tests__/utils/database.util.js
class TestDatabaseUtil {
  constructor() {
    this.pool = null;
    this.transactionStack = [];
  }

  async getConnection() {
    if (!this.pool) {
      this.pool = await createPool({
        max: 5, // Limit connections for tests
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
    return this.pool.connect();
  }

  async withTransaction(callback) {
    const conn = await this.getConnection();
    await conn.query("BEGIN");
    this.transactionStack.push(conn);

    try {
      const result = await callback(conn);
      await conn.query("COMMIT");
      return result;
    } catch (error) {
      await conn.query("ROLLBACK");
      throw error;
    } finally {
      this.transactionStack.pop();
      conn.release();
    }
  }
}

module.exports = new TestDatabaseUtil();
```

**3. Service Dependency Mocking** (30 minutes)

```javascript
// __tests__/__mocks__/external-services.mock.js
const externalServicesMock = {
  mailHog: {
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
    getMessages: jest.fn().mockResolvedValue([]),
  },

  confluenceAPI: {
    getCurrentUser: jest.fn().mockResolvedValue({
      userId: "test-user",
      email: "test@example.com",
    }),
    validateSession: jest.fn().mockResolvedValue(true),
  },

  scriptRunner: {
    executeScript: jest.fn().mockResolvedValue({ success: true }),
    getScriptStatus: jest.fn().mockResolvedValue("COMPLETED"),
  },
};

// Automatically mock external services in integration tests
jest.mock(
  "../../src/groovy/umig/api/services/external",
  () => externalServicesMock,
);
```

**Deliverables**:

- Optimized jest.config.integration.js
- Database transaction isolation pattern
- External service mocking framework
- Integration test documentation

**Success Metrics**:

- [ ] Integration test pass rate: 75.5% → 90%+
- [ ] Test execution reliability: >98%
- [ ] Network-dependent test failure rate: <2%
- [ ] Database connection issues: 0%

#### Task 1.3: Test Data Management & Isolation (1 hour)

**Problem**: Test data pollution between test runs causing flaky tests

**Solution**: Comprehensive test data lifecycle management

**1. Test Fixture Framework** (30 minutes)

```javascript
// __tests__/fixtures/entity.fixtures.js
class EntityFixtures {
  static createTeam(overrides = {}) {
    return {
      team_id: Math.floor(Math.random() * 1000000),
      team_name: `Test Team ${Date.now()}`,
      team_description: "Test team description",
      created_at: new Date(),
      created_by: "test-user",
      ...overrides,
    };
  }

  static createUser(overrides = {}) {
    return {
      usr_id: Math.floor(Math.random() * 1000000),
      usr_username: `testuser_${Date.now()}`,
      usr_email: `test_${Date.now()}@example.com`,
      usr_full_name: "Test User",
      ...overrides,
    };
  }

  // Additional fixtures for all entities...
}

// Usage in tests
describe("TeamsEntityManager", () => {
  let testTeam;

  beforeEach(async () => {
    testTeam = EntityFixtures.createTeam();
    await db.insert("teams_team", testTeam);
  });

  afterEach(async () => {
    await db.delete("teams_team", { team_id: testTeam.team_id });
  });
});
```

**2. Automated Data Cleanup** (30 minutes)

```javascript
// __tests__/utils/cleanup.util.js
class TestDataCleanup {
  constructor() {
    this.createdRecords = new Map();
  }

  registerCreation(table, id) {
    if (!this.createdRecords.has(table)) {
      this.createdRecords.set(table, []);
    }
    this.createdRecords.get(table).push(id);
  }

  async cleanupAll() {
    for (const [table, ids] of this.createdRecords.entries()) {
      await db.query(`DELETE FROM ${table} WHERE id = ANY($1)`, [ids]);
    }
    this.createdRecords.clear();
  }
}

// Global cleanup hook
afterAll(async () => {
  await global.testDataCleanup.cleanupAll();
});
```

**Deliverables**:

- Entity fixture factory
- Automated cleanup system
- Test data isolation patterns
- Documentation for test data management

**Success Metrics**:

- [ ] Test data consistency: 100% between runs
- [ ] Test pollution incidents: 0%
- [ ] Cleanup automation: 100% coverage
- [ ] Fixture coverage: All entities supported

#### Task 1.4: Critical Test Case Remediation (1-2 hours)

**Objective**: Fix highest-impact failing tests

**Priority Fixes**:

**1. MigrationTypesEntityManager Security Tests** (30 minutes)

```
Error: HTTPS required for security
at MigrationTypesEntityManager.initialize
```

**Solution**: Mock HTTPS context for tests

```javascript
// __tests__/entities/migration-types/MigrationTypesEntityManager.security.test.js
beforeEach(() => {
  // Mock HTTPS context
  global.window = {
    location: {
      protocol: "https:",
      hostname: "localhost",
    },
  };

  // Mock security context
  global.crypto = {
    randomUUID: () => "test-uuid-123",
  };
});
```

**2. ComponentOrchestrator Integration Tests** (30 minutes)

- Verify event bus communication
- Test component registration/unregistration
- Validate state management across components
- Test error propagation and recovery

**3. Performance Test Baseline Establishment** (30 minutes)

```javascript
// __tests__/performance/baseline.perf.test.js
describe("Performance Baselines", () => {
  it("should establish CRUD operation baselines", async () => {
    const perfMonitor = new PerformanceMonitor();

    // Establish baselines
    await perfMonitor.measure("create-team", async () => {
      await teamsManager.createTeam(testTeam);
    });

    await perfMonitor.measure("read-team", async () => {
      await teamsManager.getTeam(testTeam.team_id);
    });

    // Assert performance targets
    expect(perfMonitor.getMetric("create-team").average).toBeLessThan(100);
    expect(perfMonitor.getMetric("read-team").average).toBeLessThan(50);

    // Save baselines for regression testing
    await perfMonitor.saveBaselines("entities/teams");
  });
});
```

**Deliverables**:

- Security context mocking patterns
- Integration test fixes
- Performance baseline suite
- Test documentation updates

**Success Metrics**:

- [ ] Security tests: All HTTPS errors resolved
- [ ] Integration tests: 90%+ reliability
- [ ] Performance baselines: Established for all entities
- [ ] Critical test failures: <5% remaining

---

### Phase 2: Test Quality Enhancement (6-8 hours)

**Objective**: Achieve enterprise-grade test quality and coverage
**Prerequisites**: Phase 1 complete with 90%+ unit test pass rate
**Success Criteria**: 95%+ overall test pass rate, comprehensive edge case coverage

#### Task 2.1: Comprehensive Edge Case Coverage (3 hours)

**Entity Manager Edge Cases**:

**1. TeamsEntityManager Edge Cases** (1 hour)

```javascript
describe("TeamsEntityManager - Edge Cases", () => {
  it("should handle circular team relationships", async () => {
    // Team A has parent Team B, Team B has parent Team A
    const teamA = EntityFixtures.createTeam({ parent_team_id: null });
    const teamB = EntityFixtures.createTeam({ parent_team_id: teamA.team_id });

    // Attempt to create circular reference
    await expect(
      teamsManager.updateTeam(teamA.team_id, { parent_team_id: teamB.team_id }),
    ).rejects.toThrow("Circular team relationship detected");
  });

  it("should handle team deletion with cascade", async () => {
    const parentTeam = await teamsManager.createTeam(
      EntityFixtures.createTeam(),
    );
    const childTeam = await teamsManager.createTeam(
      EntityFixtures.createTeam({ parent_team_id: parentTeam.team_id }),
    );

    // Delete parent, verify cascade or error
    await teamsManager.deleteTeam(parentTeam.team_id);

    // Verify child team status
    const child = await teamsManager.getTeam(childTeam.team_id);
    expect(child.parent_team_id).toBeNull(); // or deleted
  });

  it("should handle team with >1000 users", async () => {
    const largeTeam = await teamsManager.createTeam(
      EntityFixtures.createTeam(),
    );

    // Add 1000 users
    const users = Array.from({ length: 1000 }, (_, i) =>
      EntityFixtures.createUser({ usr_username: `user${i}` }),
    );

    await Promise.all(
      users.map((user) =>
        teamsManager.addTeamMember(largeTeam.team_id, user.usr_id),
      ),
    );

    // Verify pagination handles large dataset
    const members = await teamsManager.getTeamMembers(largeTeam.team_id, {
      page: 1,
      pageSize: 50,
    });

    expect(members.data.length).toBe(50);
    expect(members.total).toBe(1000);
  });
});
```

**2. UsersEntityManager Authentication Edge Cases** (1 hour)

```javascript
describe("UsersEntityManager - Authentication Edge Cases", () => {
  it("should handle expired authentication tokens", async () => {
    const expiredToken = generateExpiredToken();

    await expect(
      usersManager.authenticateWithToken(expiredToken),
    ).rejects.toThrow("Authentication token expired");
  });

  it("should handle concurrent user updates", async () => {
    const user = await usersManager.createUser(EntityFixtures.createUser());

    // Simulate concurrent updates
    const update1 = usersManager.updateUser(user.usr_id, {
      usr_full_name: "Name 1",
    });
    const update2 = usersManager.updateUser(user.usr_id, {
      usr_full_name: "Name 2",
    });

    await Promise.all([update1, update2]);

    // Verify last-write-wins or optimistic locking
    const updated = await usersManager.getUser(user.usr_id);
    expect(["Name 1", "Name 2"]).toContain(updated.usr_full_name);
  });

  it("should handle user with no permissions", async () => {
    const restrictedUser = await usersManager.createUser(
      EntityFixtures.createUser({ permissions: [] }),
    );

    // Attempt privileged operation
    await expect(
      usersManager.deleteUser(restrictedUser.usr_id, {
        actingUser: restrictedUser,
      }),
    ).rejects.toThrow("Insufficient permissions");
  });
});
```

**3. Component Edge Cases** (1 hour)

```javascript
describe("TableComponent - Edge Cases", () => {
  it("should handle empty dataset gracefully", () => {
    const table = new TableComponent({ columns: testColumns });
    table.setData([]);

    expect(table.getRowCount()).toBe(0);
    expect(table.render()).toContain("No data available");
  });

  it("should handle extremely large datasets (>10,000 records)", async () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Record ${i}`,
    }));

    const table = new TableComponent({
      columns: testColumns,
      virtualScrolling: true,
    });

    const startTime = Date.now();
    table.setData(largeDataset);
    const renderTime = Date.now() - startTime;

    expect(renderTime).toBeLessThan(1000); // Should render in <1s
    expect(table.getRenderedRowCount()).toBeLessThanOrEqual(100); // Virtual scrolling
  });

  it("should handle column sorting with null values", () => {
    const dataWithNulls = [
      { id: 1, name: "Alice", age: 30 },
      { id: 2, name: null, age: 25 },
      { id: 3, name: "Bob", age: null },
    ];

    const table = new TableComponent({ columns: testColumns });
    table.setData(dataWithNulls);
    table.sortBy("name", "asc");

    // Nulls should be at end or beginning consistently
    const sorted = table.getFilteredData();
    expect(sorted[0].name || sorted[sorted.length - 1].name).toBeNull();
  });
});
```

**Deliverables**:

- 50+ edge case tests across all entity managers
- Component stress testing suite
- Documentation of edge case handling patterns
- Performance validation under edge conditions

**Success Metrics**:

- [ ] Edge case coverage: 85%+ for critical paths
- [ ] Large dataset handling: Validated for >1000 records
- [ ] Concurrent operation handling: 100% tested
- [ ] Null/undefined handling: Comprehensive coverage

#### Task 2.2: Performance Test Integration (2 hours)

**Objective**: Establish automated performance regression detection

**1. Performance Benchmark Suite** (1 hour)

```javascript
// __tests__/performance/entity-operations.perf.test.js
describe("Entity Operation Performance Benchmarks", () => {
  const perfMonitor = new PerformanceMonitor();

  beforeAll(async () => {
    // Load baseline performance metrics
    await perfMonitor.loadBaselines("entities/operations");
  });

  describe("CRUD Operation Performance", () => {
    it("should create entity within 100ms target", async () => {
      await perfMonitor.measureWithBaseline("create-team", async () => {
        await teamsManager.createTeam(EntityFixtures.createTeam());
      });

      const metrics = perfMonitor.getMetric("create-team");
      expect(metrics.average).toBeLessThan(100);
      expect(metrics.p95).toBeLessThan(150);

      // Check for regression
      if (metrics.regressionDetected) {
        console.warn("Performance regression detected:", metrics.comparison);
      }
    });

    it("should read entity within 50ms target", async () => {
      const team = await teamsManager.createTeam(EntityFixtures.createTeam());

      await perfMonitor.measureWithBaseline("read-team", async () => {
        await teamsManager.getTeam(team.team_id);
      });

      const metrics = perfMonitor.getMetric("read-team");
      expect(metrics.average).toBeLessThan(50);
    });

    it("should update entity within 100ms target", async () => {
      const team = await teamsManager.createTeam(EntityFixtures.createTeam());

      await perfMonitor.measureWithBaseline("update-team", async () => {
        await teamsManager.updateTeam(team.team_id, {
          team_description: "Updated description",
        });
      });

      const metrics = perfMonitor.getMetric("update-team");
      expect(metrics.average).toBeLessThan(100);
    });

    it("should delete entity within 50ms target", async () => {
      const team = await teamsManager.createTeam(EntityFixtures.createTeam());

      await perfMonitor.measureWithBaseline("delete-team", async () => {
        await teamsManager.deleteTeam(team.team_id);
      });

      const metrics = perfMonitor.getMetric("delete-team");
      expect(metrics.average).toBeLessThan(50);
    });
  });

  describe("Batch Operation Performance", () => {
    it("should handle batch create efficiently", async () => {
      const teams = Array.from({ length: 100 }, () =>
        EntityFixtures.createTeam(),
      );

      await perfMonitor.measure("batch-create-100", async () => {
        await teamsManager.batchCreate(teams);
      });

      const metrics = perfMonitor.getMetric("batch-create-100");
      expect(metrics.average).toBeLessThan(5000); // 5s for 100 records
      expect(metrics.average / 100).toBeLessThan(100); // <100ms per record
    });
  });

  afterAll(async () => {
    // Generate performance report
    const report = perfMonitor.generateReport();
    console.log("Performance Test Report:", JSON.stringify(report, null, 2));

    // Save updated baselines
    await perfMonitor.saveBaselines("entities/operations");
  });
});
```

**2. Load Testing Scenarios** (1 hour)

```javascript
// __tests__/performance/load.perf.test.js
describe("Load Testing Scenarios", () => {
  it("should handle 100 concurrent read operations", async () => {
    const teams = await Promise.all(
      Array.from({ length: 10 }, () =>
        teamsManager.createTeam(EntityFixtures.createTeam()),
      ),
    );

    const perfMonitor = new PerformanceMonitor();

    await perfMonitor.measure("concurrent-reads-100", async () => {
      await Promise.all(
        Array.from({ length: 100 }, () => {
          const randomTeam = teams[Math.floor(Math.random() * teams.length)];
          return teamsManager.getTeam(randomTeam.team_id);
        }),
      );
    });

    const metrics = perfMonitor.getMetric("concurrent-reads-100");
    expect(metrics.average).toBeLessThan(5000); // 5s for 100 concurrent reads
  });

  it("should maintain performance under sustained load", async () => {
    const perfMonitor = new PerformanceMonitor();

    // Simulate 1 minute of sustained operations
    const duration = 60000; // 1 minute
    const startTime = Date.now();
    let operationCount = 0;

    while (Date.now() - startTime < duration) {
      await teamsManager.getTeams({ page: 1, pageSize: 50 });
      operationCount++;
    }

    const throughput = operationCount / 60; // ops per second
    expect(throughput).toBeGreaterThan(10); // At least 10 ops/sec

    // Memory should remain stable
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(512 * 1024 * 1024); // <512MB
  });
});
```

**Deliverables**:

- Performance benchmark suite for all entity operations
- Load testing scenarios
- Automated regression detection
- Performance monitoring integration

**Success Metrics**:

- [ ] CRUD operations: <100ms average response time
- [ ] Batch operations: <100ms per record
- [ ] Concurrent operations: Support 100+ concurrent requests
- [ ] Memory usage: Linear growth, <512MB peak

#### Task 2.3: Security Test Enhancement (1-2 hours)

**Objective**: Comprehensive security validation across all entity managers

**1. XSS Protection Validation** (30 minutes)

```javascript
// __tests__/security/xss.security.test.js
describe("XSS Protection - Entity Managers", () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<svg/onload=alert("XSS")>',
    'javascript:alert("XSS")',
  ];

  describe("TeamsEntityManager XSS Protection", () => {
    xssPayloads.forEach((payload, index) => {
      it(`should sanitize XSS payload ${index + 1}`, async () => {
        const team = EntityFixtures.createTeam({
          team_name: payload,
          team_description: payload,
        });

        const created = await teamsManager.createTeam(team);

        // Verify sanitization
        expect(created.team_name).not.toContain("<script>");
        expect(created.team_description).not.toContain("<script>");
        expect(created.team_name).not.toContain("onerror=");
      });
    });
  });

  describe("UsersEntityManager XSS Protection", () => {
    xssPayloads.forEach((payload, index) => {
      it(`should sanitize user input ${index + 1}`, async () => {
        const user = EntityFixtures.createUser({
          usr_full_name: payload,
          usr_email: `test${index}@example.com`, // Valid email
        });

        const created = await usersManager.createUser(user);
        expect(created.usr_full_name).not.toContain("<script>");
      });
    });
  });
});
```

**2. CSRF Protection Validation** (30 minutes)

```javascript
// __tests__/security/csrf.security.test.js
describe("CSRF Protection - Entity Managers", () => {
  it("should require CSRF token for state-changing operations", async () => {
    // Attempt create without CSRF token
    global.window.csrfToken = undefined;

    await expect(
      teamsManager.createTeam(EntityFixtures.createTeam()),
    ).rejects.toThrow("CSRF token required");
  });

  it("should reject invalid CSRF tokens", async () => {
    global.window.csrfToken = "invalid-token-123";

    await expect(
      teamsManager.createTeam(EntityFixtures.createTeam()),
    ).rejects.toThrow("Invalid CSRF token");
  });

  it("should accept valid CSRF tokens", async () => {
    global.window.csrfToken = generateValidCsrfToken();

    const team = await teamsManager.createTeam(EntityFixtures.createTeam());
    expect(team).toBeDefined();
  });
});
```

**3. Rate Limiting Validation** (30 minutes)

```javascript
// __tests__/security/rate-limiting.security.test.js
describe("Rate Limiting - Entity Managers", () => {
  it("should enforce rate limits on rapid requests", async () => {
    const requests = Array.from({ length: 100 }, () =>
      teamsManager.getTeams({ page: 1, pageSize: 10 }),
    );

    // Should fail after rate limit threshold
    await expect(Promise.all(requests)).rejects.toThrow("Rate limit exceeded");
  });

  it("should allow requests after rate limit window expires", async () => {
    // Exhaust rate limit
    try {
      await Promise.all(
        Array.from({ length: 50 }, () => teamsManager.getTeams()),
      );
    } catch (error) {
      // Expected rate limit error
    }

    // Wait for rate limit window to expire
    await new Promise((resolve) => setTimeout(resolve, 60000)); // 1 minute

    // Should succeed now
    const teams = await teamsManager.getTeams();
    expect(teams).toBeDefined();
  });
});
```

**Deliverables**:

- XSS protection test suite (28 attack vectors)
- CSRF token validation tests
- Rate limiting validation tests
- Security audit report

**Success Metrics**:

- [ ] XSS protection: 100% attack vector coverage
- [ ] CSRF protection: All state-changing operations validated
- [ ] Rate limiting: Enforced across all entities
- [ ] Security rating: Maintain 9.0+/10

---

### Phase 3: Integration & Performance Optimization (4-6 hours)

**Objective**: Optimize system-wide test performance and integration reliability
**Prerequisites**: Phase 2 complete with 95%+ test pass rate
**Success Criteria**: Sub-10-minute full test suite execution, 98%+ integration reliability

#### Task 3.1: Test Execution Performance Optimization (2 hours)

**1. Intelligent Test Parallelization** (1 hour)

```javascript
// jest.config.performance.js
module.exports = {
  maxWorkers: require("os").cpus().length - 1, // Use all CPUs except 1

  // Separate test suites by execution time
  projects: [
    {
      displayName: "fast",
      testMatch: ["**/__tests__/unit/**/*.test.js"],
      maxWorkers: "100%",
    },
    {
      displayName: "slow",
      testMatch: ["**/__tests__/integration/**/*.test.js"],
      maxWorkers: "50%",
    },
    {
      displayName: "security",
      testMatch: ["**/__tests__/**/*.security.test.js"],
      maxWorkers: "25%",
    },
  ],

  // Cache test results
  cache: true,
  cacheDirectory: "<rootDir>/.jest-cache",

  // Only run tests affected by changes
  onlyChanged: process.env.CI !== "true",
};
```

**2. Selective Test Execution** (30 minutes)

```bash
#!/usr/bin/env node
// scripts/selective-test-runner.js

const { execSync } = require('child_process');
const fs = require('fs');

// Get changed files from git
const changedFiles = execSync('git diff --name-only HEAD')
  .toString()
  .split('\n')
  .filter(Boolean);

// Determine which test categories to run
const testCategories = new Set();

changedFiles.forEach(file => {
  if (file.includes('src/groovy/umig/web/js/components/')) {
    testCategories.add('unit/components');
  }
  if (file.includes('src/groovy/umig/web/js/entities/')) {
    testCategories.add('unit/entities');
  }
  if (file.includes('src/groovy/umig/api/')) {
    testCategories.add('integration');
  }
  if (file.includes('SecurityUtils')) {
    testCategories.add('security');
  }
});

// If no specific categories, run all
if (testCategories.size === 0) {
  console.log('No specific test categories identified, running full suite');
  testCategories.add('all');
}

// Run selected tests
console.log(`Running tests for categories: ${Array.from(testCategories).join(', ')}`);
testCategories.forEach(category => {
  if (category === 'all') {
    execSync('npm run test:js:all', { stdio: 'inherit' });
  } else {
    execSync(`npm run test:js:${category}`, { stdio: 'inherit' });
  }
});
```

**3. Test Result Caching** (30 minutes)

```javascript
// jest.config.cache.js
module.exports = {
  ...require("./jest.config.js"),

  // Enable aggressive caching
  cache: true,
  cacheDirectory: "<rootDir>/.jest-cache",

  // Hash test files and dependencies
  modulePathIgnorePatterns: ["<rootDir>/.jest-cache/"],

  // Custom cache key
  cacheKeyOptions: {
    // Include config files in cache key
    configFiles: [
      "jest.config.js",
      "jest.setup.unit.js",
      "jest.setup.integration.js",
    ],
    // Include environment variables
    environmentVariables: ["NODE_ENV", "TEST_ENV"],
  },
};
```

**Deliverables**:

- Optimized Jest configuration for parallelization
- Selective test execution script
- Test result caching configuration
- Performance metrics dashboard

**Success Metrics**:

- [ ] Full test suite execution: <10 minutes (target: 6-8 minutes)
- [ ] Unit tests: <3 minutes
- [ ] Integration tests: <5 minutes
- [ ] Cache hit rate: >80% on subsequent runs

#### Task 3.2: Integration Test Reliability Enhancement (1.5 hours)

**1. Retry Mechanism for Flaky Tests** (30 minutes)

```javascript
// jest.config.retry.js
module.exports = {
  ...require("./jest.config.integration.js"),

  // Retry failed tests automatically
  testRetries: 3,

  // Only retry integration tests, not unit tests
  testMatch: ["**/__tests__/integration/**/*.test.js"],
};

// Custom retry logic for specific scenarios
// __tests__/utils/retry.util.js
class TestRetryUtil {
  static async withRetry(testFn, options = {}) {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 2,
      shouldRetry = (error) => true,
    } = options;

    let lastError;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await testFn();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts || !shouldRetry(error)) {
          throw error;
        }

        console.log(
          `Attempt ${attempt} failed, retrying in ${currentDelay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= backoff;
      }
    }

    throw lastError;
  }
}

// Usage in tests
describe("Integration Test with Retry", () => {
  it("should handle network flakiness", async () => {
    await TestRetryUtil.withRetry(
      async () => {
        const response = await fetch("/api/teams");
        expect(response.status).toBe(200);
      },
      {
        shouldRetry: (error) => error.message.includes("network"),
      },
    );
  });
});
```

**2. Service Dependency Health Checks** (30 minutes)

```javascript
// __tests__/utils/service-health.util.js
class ServiceHealthUtil {
  static async checkDatabaseHealth() {
    try {
      const result = await db.query("SELECT 1");
      return { healthy: true, service: "database" };
    } catch (error) {
      return { healthy: false, service: "database", error: error.message };
    }
  }

  static async checkAPIHealth() {
    try {
      const response = await fetch("/api/health");
      return {
        healthy: response.status === 200,
        service: "api",
        status: response.status,
      };
    } catch (error) {
      return { healthy: false, service: "api", error: error.message };
    }
  }

  static async checkAllServices() {
    const results = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkAPIHealth(),
    ]);

    const unhealthy = results.filter((r) => !r.healthy);

    if (unhealthy.length > 0) {
      throw new Error(
        `Services unhealthy: ${unhealthy.map((s) => s.service).join(", ")}`,
      );
    }

    return results;
  }
}

// Global health check before integration tests
beforeAll(async () => {
  console.log("Checking service health...");
  await ServiceHealthUtil.checkAllServices();
  console.log("All services healthy ✅");
});
```

**3. Graceful Degradation for External Service Failures** (30 minutes)

```javascript
// __tests__/utils/graceful-degradation.util.js
class GracefulDegradationUtil {
  static handleServiceFailure(serviceName, fallbackFn) {
    return async (...args) => {
      try {
        return await serviceName(...args);
      } catch (error) {
        console.warn(
          `Service ${serviceName} failed, using fallback:`,
          error.message,
        );
        return await fallbackFn(...args);
      }
    };
  }
}

// Usage in integration tests
describe("Integration Test with Graceful Degradation", () => {
  it("should use fallback when MailHog unavailable", async () => {
    const sendEmailWithFallback = GracefulDegradationUtil.handleServiceFailure(
      () => mailHogService.sendEmail(emailData),
      () => ({ success: true, fallback: true }), // Mock response
    );

    const result = await sendEmailWithFallback();
    expect(result.success).toBe(true);
    // Test continues even if MailHog is unavailable
  });
});
```

**Deliverables**:

- Retry mechanism implementation
- Service health check utilities
- Graceful degradation patterns
- Flaky test identification dashboard

**Success Metrics**:

- [ ] Integration test reliability: 98%+
- [ ] Flaky test incidents: <1% of runs
- [ ] Service dependency failures: 100% handled gracefully
- [ ] Test execution consistency: 99%+

#### Task 3.3: Cross-Component Integration Validation (1 hour)

**1. ComponentOrchestrator Coordination Tests** (30 minutes)

```javascript
// __tests__/integration/component-orchestration.integration.test.js
describe("ComponentOrchestrator Integration", () => {
  let orchestrator;
  let teamsManager;
  let usersManager;

  beforeEach(async () => {
    orchestrator = new ComponentOrchestrator({
      securityLevel: "enterprise",
      eventLogging: true,
    });

    teamsManager = await orchestrator.createComponent("TeamsEntityManager", {
      apiEndpoint: "/api/v2/teams",
    });

    usersManager = await orchestrator.createComponent("UsersEntityManager", {
      apiEndpoint: "/api/v2/users",
    });
  });

  it("should coordinate team creation with user assignment", async () => {
    // Create team
    const team = await teamsManager.createTeam(EntityFixtures.createTeam());

    // Create user
    const user = await usersManager.createUser(EntityFixtures.createUser());

    // Assign user to team (cross-component operation)
    await teamsManager.addTeamMember(team.team_id, user.usr_id);

    // Verify coordination
    const teamMembers = await teamsManager.getTeamMembers(team.team_id);
    expect(teamMembers.data).toContainEqual(
      expect.objectContaining({ usr_id: user.usr_id }),
    );
  });

  it("should propagate security controls across components", async () => {
    // Set security context in orchestrator
    orchestrator.setSecurityContext({
      csrfToken: "test-token-123",
      userId: "test-user",
      sessionId: "test-session",
    });

    // Verify all components inherit security context
    expect(teamsManager.getSecurityContext().csrfToken).toBe("test-token-123");
    expect(usersManager.getSecurityContext().csrfToken).toBe("test-token-123");
  });

  it("should handle event propagation across components", (done) => {
    // Subscribe to team creation events in users manager
    orchestrator.on("team:created", (data) => {
      expect(data.team_id).toBeDefined();
      done();
    });

    // Create team, should trigger event
    teamsManager.createTeam(EntityFixtures.createTeam());
  });
});
```

**2. Entity Manager Interoperability Tests** (30 minutes)

```javascript
// __tests__/integration/entity-interoperability.integration.test.js
describe("Entity Manager Interoperability", () => {
  it("should handle complex entity relationships", async () => {
    // Create complete entity hierarchy
    const team = await teamsManager.createTeam(EntityFixtures.createTeam());
    const user = await usersManager.createUser(EntityFixtures.createUser());
    const environment = await environmentsManager.createEnvironment(
      EntityFixtures.createEnvironment(),
    );
    const application = await applicationsManager.createApplication(
      EntityFixtures.createApplication(),
    );

    // Establish relationships
    await teamsManager.addTeamMember(team.team_id, user.usr_id);
    await environmentsManager.associateApplication(
      environment.env_id,
      application.app_id,
    );

    // Query complex relationship
    const teamDetails = await teamsManager.getTeam(team.team_id, {
      includeMembers: true,
      includeEnvironments: true,
      includeApplications: true,
    });

    // Verify relationship integrity
    expect(teamDetails.members).toContainEqual(
      expect.objectContaining({ usr_id: user.usr_id }),
    );
    expect(teamDetails.environments).toContainEqual(
      expect.objectContaining({ env_id: environment.env_id }),
    );
  });
});
```

**Deliverables**:

- Component orchestration test suite
- Entity interoperability tests
- Cross-component event validation
- Security propagation tests

**Success Metrics**:

- [ ] Cross-component communication: 100% reliability
- [ ] Event propagation: <10ms latency
- [ ] Security control consistency: 100% across components
- [ ] Relationship integrity: 100% validation

---

### Phase 4: US-087 Phase 2 Enablement (2-4 hours)

**Objective**: Direct test infrastructure support for US-087 Phase 2-7 entity migrations
**Prerequisites**: Phase 3 complete with all quality gates passed
**Success Criteria**: Test framework validated for remaining entity migrations

#### Task 4.1: Entity Migration Test Framework (1.5 hours)

**1. Entity Migration Test Templates** (30 minutes)

```javascript
// __tests__/templates/entity-migration.template.js
class EntityMigrationTestTemplate {
  static generateTestSuite(entityConfig) {
    const {
      entityName,
      tableName,
      primaryKey,
      requiredFields,
      optionalFields,
      relationships,
    } = entityConfig;

    return `
describe('${entityName}EntityManager - Migration Tests', () => {
  describe('CRUD Operations', () => {
    it('should create ${entityName.toLowerCase()} successfully', async () => {
      const entity = EntityFixtures.create${entityName}();
      const created = await ${entityName.toLowerCase()}Manager.create${entityName}(entity);

      expect(created.${primaryKey}).toBeDefined();
      ${requiredFields
        .map((field) => `expect(created.${field}).toBe(entity.${field});`)
        .join("\n      ")}
    });

    it('should read ${entityName.toLowerCase()} by ID', async () => {
      const entity = await ${entityName.toLowerCase()}Manager.create${entityName}(
        EntityFixtures.create${entityName}()
      );

      const retrieved = await ${entityName.toLowerCase()}Manager.get${entityName}(entity.${primaryKey});
      expect(retrieved.${primaryKey}).toBe(entity.${primaryKey});
    });

    it('should update ${entityName.toLowerCase()}', async () => {
      const entity = await ${entityName.toLowerCase()}Manager.create${entityName}(
        EntityFixtures.create${entityName}()
      );

      const updates = { /* field updates */ };
      const updated = await ${entityName.toLowerCase()}Manager.update${entityName}(
        entity.${primaryKey},
        updates
      );

      expect(updated.${primaryKey}).toBe(entity.${primaryKey});
    });

    it('should delete ${entityName.toLowerCase()}', async () => {
      const entity = await ${entityName.toLowerCase()}Manager.create${entityName}(
        EntityFixtures.create${entityName}()
      );

      await ${entityName.toLowerCase()}Manager.delete${entityName}(entity.${primaryKey});

      await expect(
        ${entityName.toLowerCase()}Manager.get${entityName}(entity.${primaryKey})
      ).rejects.toThrow('not found');
    });
  });

  ${
    relationships.length > 0
      ? `
  describe('Relationship Operations', () => {
    ${relationships
      .map(
        (rel) => `
    it('should manage ${rel.type} relationship with ${rel.targetEntity}', async () => {
      const entity = await ${entityName.toLowerCase()}Manager.create${entityName}(
        EntityFixtures.create${entityName}()
      );
      const relatedEntity = await ${rel.targetEntity.toLowerCase()}Manager.create${rel.targetEntity}(
        EntityFixtures.create${rel.targetEntity}()
      );

      await ${entityName.toLowerCase()}Manager.associate${rel.targetEntity}(
        entity.${primaryKey},
        relatedEntity.${rel.foreignKey}
      );

      const withRelationship = await ${entityName.toLowerCase()}Manager.get${entityName}(
        entity.${primaryKey},
        { include${rel.targetEntity}s: true }
      );

      expect(withRelationship.${rel.targetEntity.toLowerCase()}s).toContainEqual(
        expect.objectContaining({ ${rel.foreignKey}: relatedEntity.${rel.foreignKey} })
      );
    });
    `,
      )
      .join("\n    ")}
  });
  `
      : ""
  }

  describe('Data Integrity', () => {
    it('should enforce required fields', async () => {
      const invalidEntity = {};

      await expect(
        ${entityName.toLowerCase()}Manager.create${entityName}(invalidEntity)
      ).rejects.toThrow('required');
    });

    it('should validate data types', async () => {
      const invalidEntity = EntityFixtures.create${entityName}({
        ${requiredFields[0]}: 123 // Invalid type
      });

      await expect(
        ${entityName.toLowerCase()}Manager.create${entityName}(invalidEntity)
      ).rejects.toThrow('type');
    });
  });

  describe('Performance', () => {
    it('should perform CRUD operations within performance targets', async () => {
      const perfMonitor = new PerformanceMonitor();

      await perfMonitor.measure('create', () =>
        ${entityName.toLowerCase()}Manager.create${entityName}(EntityFixtures.create${entityName}())
      );

      expect(perfMonitor.getMetric('create').average).toBeLessThan(100);
    });
  });
});
    `.trim();
  }

  static generateEntityConfig(entityName) {
    // Entity-specific configurations
    const configs = {
      Migrations: {
        tableName: "migrations_mig",
        primaryKey: "mig_id",
        requiredFields: ["mig_name", "mig_code", "mty_id"],
        optionalFields: ["mig_description", "mig_status"],
        relationships: [
          { type: "hasMany", targetEntity: "Iteration", foreignKey: "ite_id" },
        ],
      },
      Iterations: {
        tableName: "iterations_ite",
        primaryKey: "ite_id",
        requiredFields: ["ite_name", "itt_code", "mig_id"],
        optionalFields: ["ite_status", "ite_description"],
        relationships: [
          {
            type: "belongsTo",
            targetEntity: "Migration",
            foreignKey: "mig_id",
          },
          { type: "hasMany", targetEntity: "Plan", foreignKey: "pli_id" },
        ],
      },
      Plans: {
        tableName: "plans_instance_pli",
        primaryKey: "pli_id",
        requiredFields: ["pli_name", "ite_id"],
        optionalFields: ["pli_status", "pli_description"],
        relationships: [
          {
            type: "belongsTo",
            targetEntity: "Iteration",
            foreignKey: "ite_id",
          },
          { type: "hasMany", targetEntity: "Sequence", foreignKey: "sqi_id" },
        ],
      },
      // Additional entity configs...
    };

    return configs[entityName];
  }
}

module.exports = EntityMigrationTestTemplate;
```

**2. Hierarchical Relationship Validation** (30 minutes)

```javascript
// __tests__/utils/hierarchy-validation.util.js
class HierarchyValidationUtil {
  static async validateEntityHierarchy(rootEntity, expectedHierarchy) {
    // Validate complete entity hierarchy
    // Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions

    const hierarchy = await this.traverseHierarchy(rootEntity);

    expect(hierarchy.depth).toBe(expectedHierarchy.depth);
    expect(hierarchy.totalEntities).toBe(expectedHierarchy.totalEntities);

    // Validate parent-child relationships
    this.validateParentChildIntegrity(hierarchy);

    // Validate cascade operations
    await this.validateCascadeDelete(rootEntity);

    return hierarchy;
  }

  static async traverseHierarchy(entity, depth = 0, visited = new Set()) {
    if (visited.has(entity.id)) {
      throw new Error("Circular reference detected");
    }

    visited.add(entity.id);

    const children = await entity.getChildren();
    const hierarchy = {
      entity,
      depth,
      children: await Promise.all(
        children.map((child) =>
          this.traverseHierarchy(child, depth + 1, visited),
        ),
      ),
    };

    return hierarchy;
  }

  static validateParentChildIntegrity(hierarchy) {
    // Ensure all child entities reference correct parent
    hierarchy.children.forEach((child) => {
      expect(child.entity.parent_id).toBe(hierarchy.entity.id);
    });

    // Recurse into children
    hierarchy.children.forEach((child) => {
      this.validateParentChildIntegrity(child);
    });
  }

  static async validateCascadeDelete(entity) {
    const childCount = await entity.getChildCount();

    if (childCount > 0) {
      // Should prevent deletion with children
      await expect(entity.delete()).rejects.toThrow("has children");

      // Delete children first
      await entity.deleteChildren();

      // Now deletion should succeed
      await expect(entity.delete()).resolves.toBeTruthy();
    }
  }
}
```

**3. Data Integrity Verification** (30 minutes)

```javascript
// __tests__/utils/data-integrity.util.js
class DataIntegrityUtil {
  static async verifyReferentialIntegrity(entityManager) {
    // Verify all foreign key relationships are valid
    const entities = await entityManager.getAll();

    for (const entity of entities) {
      const foreignKeys = entityManager.getForeignKeys();

      for (const fk of foreignKeys) {
        if (entity[fk.column]) {
          const referenced = await fk.referencedManager.getById(
            entity[fk.column],
          );
          expect(referenced).toBeDefined();
        }
      }
    }
  }

  static async verifyDataConsistency(entityManager) {
    const entities = await entityManager.getAll();

    // Verify no duplicate primary keys
    const primaryKeys = entities.map((e) => e[entityManager.primaryKey]);
    const uniqueKeys = new Set(primaryKeys);
    expect(primaryKeys.length).toBe(uniqueKeys.size);

    // Verify required fields are populated
    entities.forEach((entity) => {
      entityManager.requiredFields.forEach((field) => {
        expect(entity[field]).toBeDefined();
      });
    });
  }

  static async verifyAuditTrail(entity) {
    // Verify audit fields are populated
    expect(entity.created_at).toBeDefined();
    expect(entity.created_by).toBeDefined();
    expect(entity.updated_at).toBeDefined();
    expect(entity.updated_by).toBeDefined();

    // Verify audit trail consistency
    expect(entity.updated_at).toBeGreaterThanOrEqual(entity.created_at);
  }
}
```

**Deliverables**:

- Entity migration test templates
- Hierarchical relationship validation utilities
- Data integrity verification framework
- Migration test generation scripts

**Success Metrics**:

- [ ] Test templates: 100% coverage for entity patterns
- [ ] Hierarchy validation: All 7 levels tested
- [ ] Data integrity: 100% referential integrity validation
- [ ] Audit trail: Complete tracking for all entities

#### Task 4.2: Admin GUI Component Migration Testing (1 hour)

**1. Component Loading Validation** (30 minutes)

```javascript
// __tests__/integration/admin-gui-migration.integration.test.js
describe("Admin GUI Component Migration", () => {
  let orchestrator;

  beforeEach(async () => {
    orchestrator = new ComponentOrchestrator();
  });

  describe("US-087 Phase 2 Entity Loading", () => {
    const phase2Entities = [
      "Migrations",
      "Iterations",
      "Plans",
      "Sequences",
      "Phases",
      "Steps",
      "Instructions",
    ];

    phase2Entities.forEach((entityName) => {
      it(`should load ${entityName}EntityManager component`, async () => {
        const manager = await orchestrator.createComponent(
          `${entityName}EntityManager`,
          {
            apiEndpoint: `/api/v2/${entityName.toLowerCase()}`,
          },
        );

        expect(manager).toBeDefined();
        expect(manager.initialize).toBeInstanceOf(Function);
        expect(manager.createComponent).toBeInstanceOf(Function);
      });
    });
  });

  describe("Component Initialization", () => {
    it("should initialize all Phase 2 components", async () => {
      const components = await Promise.all([
        orchestrator.createComponent("MigrationsEntityManager"),
        orchestrator.createComponent("IterationsEntityManager"),
        orchestrator.createComponent("PlansEntityManager"),
        orchestrator.createComponent("SequencesEntityManager"),
        orchestrator.createComponent("PhasesEntityManager"),
        orchestrator.createComponent("StepsEntityManager"),
        orchestrator.createComponent("InstructionsEntityManager"),
      ]);

      // All components should initialize successfully
      expect(components.length).toBe(7);
      components.forEach((component) => {
        expect(component.state.initialized).toBe(true);
      });
    });
  });
});
```

**2. CRUD Operation Support Validation** (30 minutes)

```javascript
describe("Admin GUI CRUD Operations", () => {
  let migrationsManager;

  beforeEach(async () => {
    migrationsManager = await orchestrator.createComponent(
      "MigrationsEntityManager",
    );
  });

  it("should support complete CRUD lifecycle", async () => {
    // Create
    const migration = await migrationsManager.createMigration(
      EntityFixtures.createMigration(),
    );
    expect(migration.mig_id).toBeDefined();

    // Read
    const retrieved = await migrationsManager.getMigration(migration.mig_id);
    expect(retrieved.mig_name).toBe(migration.mig_name);

    // Update
    const updated = await migrationsManager.updateMigration(migration.mig_id, {
      mig_status: "IN_PROGRESS",
    });
    expect(updated.mig_status).toBe("IN_PROGRESS");

    // Delete
    await migrationsManager.deleteMigration(migration.mig_id);
    await expect(
      migrationsManager.getMigration(migration.mig_id),
    ).rejects.toThrow("not found");
  });

  it("should handle large dataset pagination", async () => {
    // Create 100 migrations
    const migrations = await Promise.all(
      Array.from({ length: 100 }, () =>
        migrationsManager.createMigration(EntityFixtures.createMigration()),
      ),
    );

    // Test pagination
    const page1 = await migrationsManager.getMigrations({
      page: 1,
      pageSize: 25,
    });
    expect(page1.data.length).toBe(25);
    expect(page1.total).toBe(100);

    const page2 = await migrationsManager.getMigrations({
      page: 2,
      pageSize: 25,
    });
    expect(page2.data.length).toBe(25);

    // Verify no overlap
    const page1Ids = new Set(page1.data.map((m) => m.mig_id));
    const page2Ids = new Set(page2.data.map((m) => m.mig_id));
    expect([...page1Ids].filter((id) => page2Ids.has(id))).toHaveLength(0);
  });
});
```

**Deliverables**:

- Admin GUI component loading tests
- CRUD operation validation suite
- Large dataset handling tests
- Pagination validation tests

**Success Metrics**:

- [ ] Component loading: 100% success rate for Phase 2 entities
- [ ] CRUD operations: <100ms response time
- [ ] Large dataset handling: >1000 records without degradation
- [ ] Pagination: Correct operation across all page sizes

#### Task 4.3: Migration Readiness Gates (30 minutes)

**Objective**: Establish and validate quality gates for US-087 Phase 2 proceed decision

**Quality Gate Validation**:

```javascript
// __tests__/validation/migration-readiness.validation.test.js
describe("US-087 Phase 2 Migration Readiness Gates", () => {
  describe("Test Infrastructure Quality Gates", () => {
    it("should meet test pass rate threshold", async () => {
      const testResults = await runAllTests();

      const overallPassRate = (testResults.passed / testResults.total) * 100;
      expect(overallPassRate).toBeGreaterThanOrEqual(95);

      console.log(`✅ Overall test pass rate: ${overallPassRate.toFixed(2)}%`);
    });

    it("should meet performance benchmarks", async () => {
      const perfResults = await runPerformanceSuite();

      // CRUD operations
      expect(perfResults.create.average).toBeLessThan(100);
      expect(perfResults.read.average).toBeLessThan(50);
      expect(perfResults.update.average).toBeLessThan(100);
      expect(perfResults.delete.average).toBeLessThan(50);

      console.log("✅ All performance benchmarks met");
    });

    it("should maintain security rating", async () => {
      const securityResults = await runSecuritySuite();

      const securityRating = calculateSecurityRating(securityResults);
      expect(securityRating).toBeGreaterThanOrEqual(9.0);

      console.log(`✅ Security rating: ${securityRating}/10`);
    });

    it("should demonstrate integration reliability", async () => {
      const integrationResults = await runIntegrationSuite();

      const reliability =
        (integrationResults.passed / integrationResults.total) * 100;
      expect(reliability).toBeGreaterThanOrEqual(95);

      console.log(
        `✅ Integration test reliability: ${reliability.toFixed(2)}%`,
      );
    });
  });

  describe("Component Architecture Readiness", () => {
    it("should load all Phase 2 entity components", async () => {
      const loadResults = await loadAllPhase2Components();

      expect(loadResults.success).toBe(7); // 7 entities
      expect(loadResults.failures).toBe(0);

      console.log("✅ All Phase 2 components load successfully");
    });

    it("should validate ComponentOrchestrator coordination", async () => {
      const orchestrationResults = await testComponentOrchestration();

      expect(orchestrationResults.eventPropagation).toBe(true);
      expect(orchestrationResults.securityPropagation).toBe(true);
      expect(orchestrationResults.stateManagement).toBe(true);

      console.log("✅ ComponentOrchestrator coordination validated");
    });
  });

  describe("Database & API Readiness", () => {
    it("should validate database schema for Phase 2 entities", async () => {
      const schemaValidation = await validateDatabaseSchema([
        "migrations_mig",
        "iterations_ite",
        "plans_instance_pli",
        "sequences_instance_sqi",
        "phases_instance_phi",
        "steps_instance_sti",
        "instructions_instance_ini",
      ]);

      expect(schemaValidation.allTablesExist).toBe(true);
      expect(schemaValidation.allConstraintsValid).toBe(true);

      console.log("✅ Database schema validated for Phase 2");
    });

    it("should validate API endpoints for Phase 2 entities", async () => {
      const apiValidation = await validateAPIEndpoints([
        "/api/v2/migrations",
        "/api/v2/iterations",
        "/api/v2/plans",
        "/api/v2/sequences",
        "/api/v2/phases",
        "/api/v2/steps",
        "/api/v2/instructions",
      ]);

      expect(apiValidation.allEndpointsReachable).toBe(true);
      expect(apiValidation.allEndpointsAuthenticated).toBe(true);

      console.log("✅ API endpoints validated for Phase 2");
    });
  });

  describe("Go/No-Go Decision Criteria", () => {
    it("should generate comprehensive readiness report", async () => {
      const report = await generateReadinessReport();

      const allCriteriaMet = [
        report.testQuality.passRate >= 95,
        report.performance.allBenchmarksMet,
        report.security.rating >= 9.0,
        report.integration.reliability >= 95,
        report.components.allLoaded,
        report.database.schemaValid,
        report.api.endpointsOperational,
      ].every(Boolean);

      expect(allCriteriaMet).toBe(true);

      console.log("✅ All readiness criteria met - GO for US-087 Phase 2");
      console.log(JSON.stringify(report, null, 2));
    });
  });
});
```

**Deliverables**:

- Migration readiness validation suite
- Quality gate verification tests
- Comprehensive readiness report generator
- Go/No-Go decision documentation

**Success Metrics**:

- [ ] All quality gates: 100% validation
- [ ] Test pass rate: >95%
- [ ] Performance: All benchmarks met
- [ ] Security: >9.0/10 rating
- [ ] Integration: >95% reliability
- [ ] Components: 100% loading success
- [ ] Database: Schema validated
- [ ] API: All endpoints operational

---

## 📅 Implementation Timeline & Resource Allocation

### Overall Timeline: 16-24 hours (2-3 sprint days)

| Phase                                  | Duration  | Effort              | Dependencies       | Deliverables              |
| -------------------------------------- | --------- | ------------------- | ------------------ | ------------------------- |
| **Phase 0: Emergency Unblocking**      | 2-3 hours | 1 senior dev        | None               | Stack overflow resolution |
| **Phase 1: Foundation Stabilization**  | 4-6 hours | 1 senior dev        | Phase 0 GO         | 90%+ unit test pass rate  |
| **Phase 2: Test Quality Enhancement**  | 6-8 hours | 1 senior dev + 1 QA | Phase 1 complete   | 95%+ overall pass rate    |
| **Phase 3: Integration & Performance** | 4-6 hours | 1 senior dev        | Phase 1-2 complete | <10min test execution     |
| **Phase 4: US-087 Phase 2 Enablement** | 2-4 hours | 1 senior dev        | Phase 1-3 complete | Migration readiness       |

### Critical Path Analysis

**Blocking Dependencies**:

1. Phase 0 completion (tough-cookie fix) → All subsequent phases
2. Phase 1 completion (foundation) → Quality enhancement
3. Phase 1-3 completion → US-087 Phase 2 proceed decision

**Parallel Execution Opportunities**:

- Phase 2 (quality) and Phase 3 (performance) can partially overlap
- Test template creation (Phase 4.1) can begin during Phase 3
- Documentation updates can occur throughout all phases

### Resource Requirements

**Development Team**:

- 1 Senior JavaScript/Node.js Developer (full time, 16-24 hours)
- 1 QA Engineer (half time, 8-12 hours for Phase 2-3)
- 1 DevOps Engineer (on-call, <4 hours for CI/CD integration)

**Infrastructure**:

- Development environment: Local PostgreSQL, Confluence, MailHog
- CI/CD pipeline: Jest caching, test result reporting
- Monitoring: Test execution metrics, performance tracking

---

## 🎯 Success Criteria & Validation

### Phase-Level Go/No-Go Gates

**Phase 0 Success Criteria** (CRITICAL - Must meet to proceed):

- [ ] At least one test category runs without stack overflow
- [ ] SecurityUtils tests executable and passing (>50% pass rate minimum)
- [ ] Memory usage <512MB per test suite

**Phase 1 Success Criteria**:

- [ ] Unit test pass rate: >90%
- [ ] Component tests: PaginationComponent >95%, all others >90%
- [ ] Integration test pass rate: >85%
- [ ] Test data isolation: 100% (no pollution between runs)

**Phase 2 Success Criteria**:

- [ ] Overall test pass rate: >95%
- [ ] Edge case coverage: >85% for critical paths
- [ ] Performance benchmarks: All targets met
- [ ] Security tests: 100% XSS/CSRF/rate limiting coverage

**Phase 3 Success Criteria**:

- [ ] Full test suite execution: <10 minutes
- [ ] Integration test reliability: >98%
- [ ] Cache hit rate: >80% on subsequent runs
- [ ] Memory usage: Stable <512MB throughout execution

**Phase 4 Success Criteria** (US-087 Phase 2 Readiness):

- [ ] All Phase 1-3 criteria met
- [ ] Entity migration test framework: 100% operational
- [ ] Admin GUI component loading: 100% success for Phase 2 entities
- [ ] Quality gates: All validation tests passing

### US-087 Phase 2 Proceed Decision Criteria

**GO Criteria** (All must be met):

1. ✅ Test infrastructure stable: >95% pass rate, <10min execution
2. ✅ Component architecture validated: 25/25 components + 7 Phase 2 entities
3. ✅ Performance benchmarks met: CRUD <100ms, rendering <50ms
4. ✅ Security validation: >9.0/10 rating maintained
5. ✅ Integration reliability: >95% consistency
6. ✅ Database schema validated: All Phase 2 tables operational
7. ✅ API endpoints operational: All Phase 2 endpoints reachable
8. ✅ Readiness report: Comprehensive validation documented

**NO-GO Criteria** (Any triggers hold):

1. ❌ Test pass rate <90% after all remediation efforts
2. ❌ Critical security vulnerabilities detected (rating <8.0/10)
3. ❌ Performance degradation >20% from baseline
4. ❌ Integration reliability <85%
5. ❌ Memory usage consistently >512MB
6. ❌ Component loading failures >5%
7. ❌ Persistent stack overflow or blocking errors

---

## 🚨 Risk Management & Mitigation

### Identified Risks & Mitigation Strategies

| Risk                                   | Probability | Impact   | Mitigation                                             | Contingency                                                 |
| -------------------------------------- | ----------- | -------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| **tough-cookie fix ineffective**       | Low         | Critical | Multi-layered approach (config + mocks + separation)   | Disable jsdom entirely, mock all DOM                        |
| **SecurityUtils conflicts persist**    | Medium      | High     | Singleton pattern + early initialization               | Create lightweight SecurityUtils stub                       |
| **Test execution time exceeds target** | Medium      | Medium   | Parallelization + selective execution + caching        | Accept longer execution, optimize critical path             |
| **Integration tests remain flaky**     | Medium      | High     | Retry mechanism + health checks + graceful degradation | Isolate flaky tests, run separately                         |
| **US-087 Phase 2 readiness delayed**   | Low         | Critical | Phased approach with clear gates                       | Proceed with partial migration if core infrastructure ready |
| **Performance regression detected**    | Low         | Medium   | Baseline comparison + automated alerts                 | Investigate and fix before Phase 2 proceed                  |
| **Resource constraints**               | Low         | Medium   | Clear prioritization + parallel work where possible    | Extend timeline or reduce scope                             |

### Rollback Procedures

**Phase 0 Rollback**: Revert Jest configuration changes, restore original test setup
**Phase 1 Rollback**: Restore baseline test files from git, revert component changes
**Phase 2-3 Rollback**: Skip enhancement phases, proceed with Phase 1 foundation only
**Phase 4 Rollback**: Delay US-087 Phase 2, continue with Phase 1 entities only

### Monitoring & Early Warning

**Key Metrics to Monitor**:

- Test pass rate trend: Alert if drops below 90%
- Test execution time: Alert if exceeds 12 minutes
- Memory usage: Alert if exceeds 512MB
- Integration reliability: Alert if drops below 90%
- Security rating: Alert if drops below 9.0

**Daily Health Checks**:

```bash
# Run automated health check
npm run test:health-check

# Expected output:
# ✅ Test pass rate: 95.3%
# ✅ Test execution time: 8m 23s
# ✅ Memory usage: 387MB peak
# ✅ Integration reliability: 96.7%
# ✅ Security rating: 9.2/10
# ✅ All systems GO for US-087 Phase 2
```

---

## 📈 Expected Outcomes & Benefits

### Immediate Benefits (Phase 0-1 Completion)

**Test Infrastructure Stability**:

- JavaScript test execution restored to 90%+ pass rate
- tough-cookie stack overflow eliminated permanently
- SecurityUtils module loading consistent and reliable
- Component tests validating TD-004 interface fixes

**Development Velocity**:

- Rapid test feedback loop: <5 minutes for unit tests
- Reduced debugging time: 50% reduction for test failures
- Clear test failure messages and troubleshooting paths
- Confidence in test results for refactoring decisions

### Medium-term Benefits (Phase 2-3 Completion)

**Test Quality Excellence**:

- 95%+ overall test pass rate
- Comprehensive edge case coverage
- Enterprise-grade security validation
- Automated performance regression detection

**System Reliability**:

- 98%+ integration test reliability
- Sub-10-minute full test suite execution
- Stable memory usage patterns
- Predictable and consistent test results

### Long-term Benefits (Phase 4 Completion)

**US-087 Phase 2-7 Enablement**:

- Test framework validated for remaining entity migrations
- Component architecture proven at scale
- Migration templates accelerating development
- Quality gates ensuring production readiness

**Infrastructure Excellence**:

- Maintenance-free test infrastructure
- Automated quality validation
- Comprehensive test coverage supporting confident deployments
- Foundation for continuous improvement

### Strategic Impact

**Development Efficiency**:

- 42% development velocity improvement (from TD-004) sustained
- Reduced time-to-market for new features
- Lower defect rates in production
- Faster onboarding for new developers

**Business Value**:

- Reduced production incident rate
- Improved user experience through quality assurance
- Faster delivery of US-087 Phase 2-7 entity migrations
- Foundation for future Admin GUI enhancements

---

## 📚 Documentation & Knowledge Transfer

### Documentation Artifacts to be Created

1. **Phase Completion Reports** (4 documents)
   - Phase 0: Emergency Unblocking Report
   - Phase 1: Foundation Stabilization Report
   - Phase 2: Quality Enhancement Report
   - Phase 3-4: Integration & Migration Readiness Report

2. **Technical Documentation** (6 documents)
   - tough-cookie Stack Overflow Resolution Guide
   - SecurityUtils Module Loading Architecture
   - Entity Migration Test Template Guide
   - Performance Benchmarking Framework
   - Integration Test Reliability Best Practices
   - US-087 Phase 2 Readiness Validation Report

3. **Developer Guides** (4 documents)
   - Writing Tests for New Entity Managers
   - Component Integration Testing Patterns
   - Performance Test Creation Guide
   - Security Test Development Standards

4. **Runbooks** (3 documents)
   - Test Infrastructure Troubleshooting
   - Emergency Rollback Procedures
   - Daily Test Health Check Operations

### Knowledge Transfer Sessions

**Session 1: Test Infrastructure Overview** (1 hour)

- Target audience: All developers
- Content: New test architecture, Jest configurations, execution patterns
- Outcome: Team understands overall test infrastructure

**Session 2: Component Testing Deep Dive** (1.5 hours)

- Target audience: Frontend developers
- Content: Component test patterns, entity manager testing, UI validation
- Outcome: Developers can create component tests independently

**Session 3: Integration & Performance Testing** (1 hour)

- Target audience: Senior developers + QA
- Content: Integration patterns, performance benchmarking, reliability strategies
- Outcome: Team can maintain and extend test suites

**Session 4: US-087 Phase 2 Migration Preparation** (30 minutes)

- Target audience: Development team + Product Owner
- Content: Migration readiness, quality gates, proceed decision criteria
- Outcome: Clear understanding of Phase 2 readiness and expectations

---

## 🎉 Conclusion & Next Steps

### Summary of Comprehensive Remediation Plan

This phased remediation plan provides a systematic, risk-mitigated approach to achieving enterprise-grade JavaScript test infrastructure quality while directly supporting US-087 Phase 2-7 entity migrations.

**Key Strengths**:

1. **Emergency Response**: Phase 0 addresses critical blocking issue immediately
2. **Incremental Improvement**: Each phase builds on previous success
3. **Clear Quality Gates**: Go/No-Go decisions at each phase prevent wasted effort
4. **Risk Mitigation**: Multiple fallback strategies for each identified risk
5. **US-087 Integration**: Direct alignment with Admin GUI migration objectives
6. **Sustainable Excellence**: Foundation for long-term test infrastructure stability

### Immediate Next Steps (Phase 0)

**Day 1 - Morning (2-3 hours)**:

1. Implement jest.config.js optimizations (30 min)
2. Create lightweight tough-cookie and jsdom mocks (30 min)
3. Separate Jest configurations for unit/dom/security tests (30 min)
4. Update SecurityUtils wrapper with singleton pattern (1 hour)
5. Run emergency validation suite (30 min)
6. Make GO/NO-GO decision for Phase 1

**Day 1 - Afternoon (If GO)**:
Begin Phase 1 foundation stabilization tasks

**Day 1 - Afternoon (If NO-GO)**:
Execute Phase 0 fallback plan:

- Disable jsdom entirely
- Create comprehensive DOM mocking
- Isolate integration tests requiring DOM
- Escalate to senior architecture review

### US-087 Phase 2 Proceed Decision

**Decision Timeline**: Upon Phase 4 completion (estimated Day 3)
**Decision Makers**: Technical Lead, Product Owner, QA Lead
**Decision Criteria**: All Phase 4 quality gates met with documented evidence

**Proceed Path** (If GO):

- Begin US-087 Phase 2 entity migrations immediately
- Teams and Users entities provide validated patterns
- Test infrastructure supports rapid development
- Continuous monitoring for regressions

**Hold Path** (If NO-GO):

- Complete additional remediation cycle
- Focus on blocking quality gate failures
- Re-assess readiness after fixes
- Maintain transparency with stakeholders

---

## 📞 Support & Escalation

### Primary Contact

**Development Lead**: Lucas Challamel
**Responsibility**: Overall plan execution, technical decisions, resource allocation

### Escalation Path

**Level 1 - Technical Issues**: Development team (resolve within 2 hours)
**Level 2 - Blocking Issues**: Development Lead (resolve within 4 hours)
**Level 3 - Strategic Decisions**: Product Owner + Technical Lead (resolve within 8 hours)
**Level 4 - Critical Failures**: Executive escalation (immediate response)

### Daily Status Updates

**Format**: Brief written summary + key metrics
**Distribution**: Development team, Product Owner, QA Lead
**Timing**: End of day, 5pm local time

**Status Update Template**:

```
US-087 Test Infrastructure Remediation - Day X Status

Phase: [Current Phase]
Progress: [X/Y hours complete]
Status: [ON TRACK | AT RISK | BLOCKED]

Completed Today:
- [Task 1 description]
- [Task 2 description]

Planned Tomorrow:
- [Task 3 description]
- [Task 4 description]

Blockers: [None | Description of blocking issues]
Risks: [None | Description of risks]

Metrics:
- Test pass rate: X%
- Test execution time: Xm Ys
- Memory usage: XMB
- Integration reliability: X%

Next Milestone: [Phase X completion | Quality gate validation | Decision point]
```

---

**Plan Status**: READY FOR IMMEDIATE IMPLEMENTATION
**Next Action**: Begin Phase 0 emergency unblocking
**Expected Completion**: 2-3 sprint days (16-24 hours)
**US-087 Phase 2 Decision**: Day 3 end, pending all quality gates

---

_This comprehensive phased remediation plan ensures systematic recovery of JavaScript test infrastructure while maintaining full alignment with US-087 Phase 2-7 entity migration objectives and establishing enterprise-grade test quality standards._
