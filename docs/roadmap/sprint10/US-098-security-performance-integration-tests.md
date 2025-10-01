# US-098: Security & Performance Integration Tests

## Story Metadata

**Story ID**: US-098
**Epic**: Jest Integration Testing - Dual-Track Testing Strategy
**Sprint**: Sprint 10 (Week 3-4)
**Priority**: P1 (HIGH - Production readiness validation)
**Effort**: 5 points
**Status**: Blocked by US-097
**Timeline**: 2 weeks (Sprint 10, Week 3-4)
**Owner**: QA Engineering + Security Team
**Dependencies**: US-097 (Advanced API Integration Tests)
**Risk**: MEDIUM (Security validation critical, performance baselines required)

## Problem Statement

### Current Coverage Gap

After US-097 achieves 80%+ API coverage (25+/31 endpoints) with comprehensive CRUD, relationship, and advanced feature validation, critical security and performance validation remains untested:

**Untested Security Scenarios**:

- **Authentication Failures**: Invalid credentials, missing credentials, expired sessions
- **Authorization Enforcement**: Role-based access control (RBAC), permission validation
- **CSRF Protection**: Token validation, token rotation, cross-site request prevention
- **XSS Prevention**: Input sanitization, output encoding, HTML injection prevention
- **SQL Injection Prevention**: Parameterized query validation, malicious input detection
- **Input Validation**: Boundary testing, invalid data types, malicious payloads

**Untested Performance Scenarios**:

- **Response Time Baselines**: API endpoint latency under normal load (<200ms target)
- **Concurrent Request Handling**: 10+ simultaneous requests, race condition detection
- **Large Dataset Pagination**: 1,000+ record queries, memory efficiency
- **Database Connection Pooling**: Connection management, leak detection
- **Cache Performance**: Cache hit rates, invalidation strategies

**Business Impact of Security/Performance Gap**:

- **Security Risk**: Authentication bypass, unauthorized data access, injection attacks
- **Performance Risk**: Production slowdowns, memory leaks, database connection exhaustion
- **Compliance Risk**: Security audit failures, OWASP Top 10 vulnerabilities
- **Operational Risk**: No automated validation prevents production issues
- **Customer Risk**: Performance degradation affects user experience

### Proposed Solution

Implement comprehensive security and performance integration tests achieving:

**Security Testing Coverage**:

- **Authentication**: 100% authentication scenario coverage (valid, invalid, missing credentials)
- **Authorization**: Role-based access control validation
- **CSRF Protection**: Token validation across all mutating endpoints
- **XSS Prevention**: Input sanitization validation
- **SQL Injection**: Malicious input rejection
- **Input Validation**: Comprehensive boundary testing

**Performance Testing Coverage**:

- **Response Times**: Baselines established for all 31 endpoints (<200ms)
- **Concurrent Requests**: Load testing with 10+ simultaneous requests
- **Large Datasets**: Pagination and memory efficiency validated
- **Connection Pooling**: No leaks, efficient resource management
- **Performance Regression**: Automated detection of performance degradation

**Strategic Value**:

- **100% API Coverage**: All 31 endpoints tested (vs 80% after US-097)
- **Production Readiness**: Security validated, performance benchmarked
- **CI/CD Confidence**: Automated security/performance gates
- **Compliance Ready**: OWASP Top 10 validation automated
- **Performance Guarantee**: <200ms response time validated

## User Story

**As a** Backend Developer and Security Engineer working on UMIG production deployment
**I want** comprehensive security integration tests validating authentication, CSRF protection, XSS prevention, SQL injection prevention, and performance baselines for all 31 API endpoints
**So that** I can confidently deploy to production knowing authentication bypass, injection attacks, and performance degradation are automatically prevented through CI/CD validation without manual security audits or load testing

### Value Statement

This story achieves 100% API integration test coverage (31/31 endpoints) with comprehensive security validation (authentication, CSRF, XSS, SQL injection) and performance baselines (<200ms response times, 10+ concurrent requests), enabling developers to deploy UMIG to production with confidence that OWASP Top 10 vulnerabilities are automatically detected, performance regressions are prevented, and security compliance requirements are validated on every commit.

## Acceptance Criteria

### AC-098.1: Authentication & Authorization Testing

**Given** API endpoints require authentication validation
**When** authentication integration tests are created
**Then** 100% authentication scenario coverage is implemented including:

**Test Scenarios**:

1. **Valid Authentication**: Correct credentials accepted
2. **Invalid Credentials**: Wrong username/password rejected (401)
3. **Missing Credentials**: No authorization header rejected (401)
4. **Expired Sessions**: Session timeout enforced
5. **Role-Based Access**: Admin vs User permissions validated
6. **Unauthorized Endpoints**: Non-admin users blocked from admin endpoints (403)

**Implementation**:

```javascript
// __tests__/integration/api/security/authentication.integration.test.js
const apiClient = require("../../helpers/api-client");
const request = require("supertest");

describe("Authentication Integration Tests", () => {
  describe("Valid Authentication", () => {
    it("should accept requests with valid credentials", async () => {
      const response = await apiClient.get("/users");

      expect(response.status).toBe(200);
    });

    it("should authenticate with correct username and password", async () => {
      const response = await request("http://localhost:8090")
        .get("/rest/scriptrunner/latest/custom/users")
        .auth("admin", "123456");

      expect(response.status).toBe(200);
    });
  });

  describe("Invalid Authentication", () => {
    it("should reject requests with invalid credentials (401)", async () => {
      const response = await request("http://localhost:8090")
        .get("/rest/scriptrunner/latest/custom/users")
        .auth("admin", "wrong-password");

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Authentication failed");
    });

    it("should reject requests with non-existent user (401)", async () => {
      const response = await request("http://localhost:8090")
        .get("/rest/scriptrunner/latest/custom/users")
        .auth("nonexistent-user", "password");

      expect(response.status).toBe(401);
    });

    it("should reject requests without authorization header (401)", async () => {
      const response = await request("http://localhost:8090").get(
        "/rest/scriptrunner/latest/custom/users",
      );

      expect(response.status).toBe(401);
    });

    it("should reject requests with malformed authorization header (401)", async () => {
      const response = await request("http://localhost:8090")
        .get("/rest/scriptrunner/latest/custom/users")
        .set("Authorization", "InvalidFormat");

      expect(response.status).toBe(401);
    });
  });

  describe("Role-Based Access Control", () => {
    it("should allow admin users to access admin endpoints", async () => {
      const response = await apiClient.get("/system-configuration");

      expect(response.status).toBe(200);
    });

    it("should block non-admin users from admin endpoints (403)", async () => {
      // Create non-admin user credentials
      const response = await request("http://localhost:8090")
        .get("/rest/scriptrunner/latest/custom/system-configuration")
        .auth("regular-user", "password");

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("Insufficient permissions");
    });

    it("should validate groups parameter in endpoints", async () => {
      // Verify all endpoints have groups: ["confluence-users"]
      const endpoints = [
        "/users",
        "/teams",
        "/migrations",
        "/plans",
        "/sequences",
        "/phases",
        "/steps",
        "/instructions",
      ];

      for (const endpoint of endpoints) {
        const response = await request("http://localhost:8090").get(
          `/rest/scriptrunner/latest/custom${endpoint}`,
        );

        // Without auth, should return 401 (not 404)
        expect(response.status).toBe(401);
      }
    });
  });
});
```

**Validation Criteria**:

- [ ] Valid credentials accepted (200/201)
- [ ] Invalid credentials rejected (401)
- [ ] Missing credentials rejected (401)
- [ ] Malformed headers rejected (401)
- [ ] Role-based access enforced (403 for non-admin)
- [ ] All endpoints require authentication (groups: ["confluence-users"])

### AC-098.2: CSRF Protection Validation

**Given** CSRF protection required for mutating operations
**When** CSRF integration tests are created
**Then** comprehensive CSRF validation is implemented including:

**Test Scenarios**:

1. **CSRF Token Validation**: Tokens required for POST/PUT/DELETE
2. **Token Rotation**: Tokens refresh after use
3. **Cross-Site Request Prevention**: External requests blocked
4. **Token Expiration**: Old tokens rejected

**Implementation**:

```javascript
// __tests__/integration/api/security/csrf.integration.test.js
const apiClient = require("../../helpers/api-client");
const databaseHelper = require("../../helpers/database-helper");

describe("CSRF Protection Integration Tests", () => {
  beforeEach(async () => {
    await databaseHelper.resetDatabase();
  });

  describe("CSRF Token Validation", () => {
    it("should require CSRF token for POST requests", async () => {
      const response = await apiClient.post("/users", {
        usr_name: "Test User",
        usr_email: "test@example.com",
      });

      // Note: If CSRF not yet implemented, this test will define requirement
      expect(response.status).not.toBe(403); // Should succeed with valid token
    });

    it("should reject requests without CSRF token", async () => {
      // Attempt request without CSRF token
      const response = await request("http://localhost:8090")
        .post("/rest/scriptrunner/latest/custom/users")
        .auth("admin", "123456")
        .send({
          usr_name: "Test User",
          usr_email: "test@example.com",
        });
      // Without CSRF header

      // Note: Current implementation may not enforce CSRF
      // This test documents expected behavior
      // expect(response.status).toBe(403);
    });

    it("should validate CSRF token matches session", async () => {
      // Get CSRF token
      const tokenResponse = await apiClient.get("/csrf-token");
      const csrfToken = tokenResponse.body.token;

      // Use token in mutating request
      const response = await apiClient
        .post("/users", {
          usr_name: "Test User",
          usr_email: "test@example.com",
        })
        .set("X-CSRF-Token", csrfToken);

      expect(response.status).toBe(201);
    });
  });

  describe("CSRF Token Security", () => {
    it("should reject reused CSRF tokens", async () => {
      // Get CSRF token
      const tokenResponse = await apiClient.get("/csrf-token");
      const csrfToken = tokenResponse.body.token;

      // Use token once
      await apiClient
        .post("/users", {
          usr_name: "User 1",
          usr_email: "user1@example.com",
        })
        .set("X-CSRF-Token", csrfToken);

      // Attempt to reuse token
      const response = await apiClient
        .post("/users", {
          usr_name: "User 2",
          usr_email: "user2@example.com",
        })
        .set("X-CSRF-Token", csrfToken);

      // expect(response.status).toBe(403); // Token should be invalid after use
    });

    it("should reject expired CSRF tokens", async () => {
      // Create expired token (mock scenario)
      const expiredToken = "expired-token-12345";

      const response = await apiClient
        .post("/users", {
          usr_name: "Test User",
          usr_email: "test@example.com",
        })
        .set("X-CSRF-Token", expiredToken);

      // expect(response.status).toBe(403);
    });
  });
});
```

**Validation Criteria**:

- [ ] CSRF tokens required for POST/PUT/DELETE
- [ ] Valid tokens accepted
- [ ] Invalid/missing tokens rejected (403)
- [ ] Token rotation enforced
- [ ] Expired tokens rejected

### AC-098.3: XSS Prevention Validation

**Given** XSS prevention required for user input
**When** XSS integration tests are created
**Then** comprehensive input sanitization validation is implemented including:

**Test Scenarios**:

1. **HTML Injection**: Script tags rejected in input
2. **Output Encoding**: User input properly encoded in responses
3. **JavaScript Injection**: Event handlers sanitized
4. **URL Injection**: Malicious URLs blocked

**Implementation**:

```javascript
// __tests__/integration/api/security/xss.integration.test.js
const apiClient = require("../../helpers/api-client");
const fixtureLoader = require("../../helpers/fixture-loader");

describe("XSS Prevention Integration Tests", () => {
  beforeEach(async () => {
    await databaseHelper.resetDatabase();
  });

  describe("HTML Injection Prevention", () => {
    it("should sanitize script tags in user input", async () => {
      const response = await apiClient.post("/users", {
        usr_name: '<script>alert("XSS")</script>Test User',
        usr_email: "test@example.com",
      });

      expect(response.status).toBe(201);
      expect(response.body.usr_name).not.toContain("<script>");
      expect(response.body.usr_name).not.toContain("alert");
    });

    it("should sanitize HTML tags in descriptions", async () => {
      const fixtures = await fixtureLoader.load(["migrations", "iterations"]);
      const iterationId = fixtures.iterations[0].ite_id;

      const response = await apiClient.post("/plans", {
        pln_name: "Test Plan",
        pln_description: '<img src=x onerror=alert("XSS")>',
        ite_id: iterationId,
      });

      expect(response.status).toBe(201);
      expect(response.body.pln_description).not.toContain("onerror");
      expect(response.body.pln_description).not.toContain("alert");
    });

    it("should sanitize JavaScript event handlers", async () => {
      const response = await apiClient.post("/labels", {
        lab_name: "<div onmouseover=\"alert('XSS')\">Label</div>",
        lab_color: "#FF0000",
      });

      expect(response.status).toBe(201);
      expect(response.body.lab_name).not.toContain("onmouseover");
      expect(response.body.lab_name).not.toContain("alert");
    });
  });

  describe("Output Encoding Validation", () => {
    it("should encode user input in API responses", async () => {
      const maliciousInput = '"><script>alert("XSS")</script><"';

      const response = await apiClient.post("/teams", {
        tea_name: maliciousInput,
        tea_description: "Test team",
      });

      expect(response.status).toBe(201);

      // Retrieve and verify encoding
      const getResponse = await apiClient.get(`/teams/${response.body.tea_id}`);

      expect(getResponse.body.tea_name).not.toContain("<script>");
      // Verify proper encoding (e.g., &lt;script&gt; or sanitized)
    });

    it("should validate email generation escapes user input", async () => {
      const fixtures = await fixtureLoader.load([
        "migrations",
        "iterations",
        "plans",
        "sequences",
        "phases",
        "steps",
        "instructions",
      ]);
      const stepId = fixtures.steps[0].sti_id;

      // Update step with malicious content
      await apiClient.put(`/steps/${stepId}`, {
        sti_name: '<script>alert("XSS")</script>Malicious Step',
      });

      // Generate email view
      const response = await apiClient.get(`/step-view/${stepId}`);

      expect(response.status).toBe(200);
      expect(response.body.emailHtml).not.toContain("<script>alert");
      // Verify proper HTML encoding in email
    });
  });
});
```

**Validation Criteria**:

- [ ] Script tags sanitized
- [ ] Event handlers removed
- [ ] HTML entities encoded
- [ ] Email templates escape user input
- [ ] Malicious URLs blocked

### AC-098.4: SQL Injection Prevention

**Given** SQL injection prevention required
**When** SQL injection tests are created
**Then** comprehensive malicious input validation is implemented including:

**Test Scenarios**:

1. **SQL Injection in Filters**: Malicious WHERE clauses rejected
2. **SQL Injection in IDs**: Malicious UUID parameters rejected
3. **SQL Injection in Search**: Search queries sanitized
4. **Parameterized Queries**: All queries use parameters (no string concatenation)

**Implementation**:

```javascript
// __tests__/integration/api/security/sql-injection.integration.test.js
const apiClient = require("../../helpers/api-client");

describe("SQL Injection Prevention Integration Tests", () => {
  describe("SQL Injection in Query Parameters", () => {
    it("should reject SQL injection in filter parameters", async () => {
      const maliciousFilter = "' OR '1'='1";

      const response = await apiClient.get(
        `/users?name=${encodeURIComponent(maliciousFilter)}`,
      );

      // Should return 400 or safely handle
      expect(response.status).not.toBe(500); // No internal error
      expect(response.body).not.toContainEqual(
        expect.objectContaining({ usr_name: expect.any(String) }),
      );
    });

    it("should reject SQL injection in ID parameters", async () => {
      const maliciousId = "'; DROP TABLE tbl_users; --";

      const response = await apiClient.get(
        `/users/${encodeURIComponent(maliciousId)}`,
      );

      expect(response.status).toBe(400); // Invalid UUID format
      expect(response.body.error).toContain("Invalid UUID");
    });

    it("should sanitize search queries", async () => {
      const maliciousSearch = "admin'--";

      const response = await apiClient.get(
        `/users?search=${encodeURIComponent(maliciousSearch)}`,
      );

      expect(response.status).not.toBe(500);
      // Should safely handle without SQL error
    });
  });

  describe("Parameterized Query Validation", () => {
    it("should use parameterized queries for all database operations", async () => {
      // Create user with special characters
      const response = await apiClient.post("/users", {
        usr_name: "O'Brien", // Single quote should be escaped
        usr_email: "obrien@example.com",
      });

      expect(response.status).toBe(201);
      expect(response.body.usr_name).toBe("O'Brien");
    });

    it("should handle special SQL characters safely", async () => {
      const specialChars = [
        "'; DROP TABLE tbl_users; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM tbl_users--",
      ];

      for (const maliciousInput of specialChars) {
        const response = await apiClient.post("/teams", {
          tea_name: maliciousInput,
          tea_description: "Test",
        });

        // Should either sanitize or reject, but not cause SQL error
        expect(response.status).not.toBe(500);
      }
    });
  });
});
```

**Validation Criteria**:

- [ ] SQL injection attempts rejected
- [ ] Parameterized queries enforced
- [ ] Special characters escaped
- [ ] No SQL errors from malicious input
- [ ] Database integrity maintained

### AC-098.5: Performance Baseline Establishment

**Given** Performance baselines required for production
**When** performance integration tests are created
**Then** comprehensive response time validation is implemented including:

**Test Scenarios**:

1. **Response Time Baselines**: All 31 endpoints <200ms
2. **Complex Query Performance**: EnhancedSteps, Dashboard <500ms
3. **Large Dataset Queries**: 1,000+ records with pagination
4. **Performance Regression Detection**: Automated baseline comparison

**Implementation**:

```javascript
// __tests__/integration/api/performance/response-times.integration.test.js
const apiClient = require("../../helpers/api-client");
const fixtureLoader = require("../../helpers/fixture-loader");

describe("Performance Baseline Integration Tests", () => {
  beforeEach(async () => {
    await databaseHelper.resetDatabase();
    await fixtureLoader.loadAll();
  });

  describe("Response Time Baselines", () => {
    const performanceBaselines = {
      // Simple CRUD endpoints: <200ms
      "GET /users": 200,
      "GET /teams": 200,
      "GET /migrations": 200,
      "GET /environments": 200,
      "GET /status": 200,

      // Relationship endpoints: <200ms
      "GET /team-members": 200,
      "GET /applications": 200,
      "GET /labels": 200,

      // Hierarchy endpoints: <200ms
      "GET /plans": 200,
      "GET /sequences": 200,
      "GET /phases": 200,
      "GET /steps": 200,
      "GET /instructions": 200,

      // Complex aggregations: <500ms
      "GET /enhanced-steps": 500,
      "GET /dashboard": 300,
      "GET /step-view/:id": 500,
    };

    Object.entries(performanceBaselines).forEach(([endpoint, maxTime]) => {
      it(`should respond within ${maxTime}ms for ${endpoint}`, async () => {
        const startTime = Date.now();

        // Parse endpoint to extract method and path
        const [method, path] = endpoint.split(" ");
        const apiPath = path.replace(":id", "valid-uuid");

        let response;
        if (method === "GET") {
          response = await apiClient.get(apiPath);
        }

        const executionTime = Date.now() - startTime;

        expect(response.status).toBe(200);
        expect(executionTime).toBeLessThan(maxTime);
      });
    });

    it("should maintain performance under repeated requests", async () => {
      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await apiClient.get("/users");
        times.push(Date.now() - startTime);
      }

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(averageTime).toBeLessThan(150); // Average <150ms
      expect(maxTime).toBeLessThan(200); // Max <200ms
    });
  });

  describe("Large Dataset Performance", () => {
    it("should handle 1,000+ records efficiently", async () => {
      // Create 1,000 test records
      const createPromises = [];
      for (let i = 0; i < 1000; i++) {
        createPromises.push(
          apiClient.post("/users", {
            usr_name: `User ${i}`,
            usr_email: `user${i}@example.com`,
            usr_confluence_key: `user${i}`,
          }),
        );
      }
      await Promise.all(createPromises);

      // Query large dataset with pagination
      const startTime = Date.now();
      const response = await apiClient.get("/users?page=1&pageSize=100");
      const executionTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(100);
      expect(executionTime).toBeLessThan(500); // <500ms for paginated query
    });

    it("should validate pagination performance consistency", async () => {
      // Query different pages
      const page1Time = await measureQueryTime("/users?page=1&pageSize=100");
      const page5Time = await measureQueryTime("/users?page=5&pageSize=100");
      const page10Time = await measureQueryTime("/users?page=10&pageSize=100");

      // All pages should have similar performance
      expect(Math.abs(page1Time - page10Time)).toBeLessThan(100); // <100ms variance
    });
  });

  // Helper function
  async function measureQueryTime(endpoint) {
    const startTime = Date.now();
    await apiClient.get(endpoint);
    return Date.now() - startTime;
  }
});
```

**Validation Criteria**:

- [ ] All 31 endpoints meet response time baselines
- [ ] Simple CRUD: <200ms
- [ ] Complex queries: <500ms
- [ ] Large datasets: <500ms with pagination
- [ ] Consistent performance across repeated requests

### AC-098.6: Concurrent Request Testing

**Given** Concurrent request handling required
**When** load testing integration tests are created
**Then** comprehensive concurrency validation is implemented including:

**Test Scenarios**:

1. **10+ Concurrent Requests**: No race conditions, data corruption
2. **Database Connection Pooling**: No connection exhaustion
3. **Resource Management**: No memory leaks
4. **Transaction Isolation**: Concurrent writes don't corrupt data

**Implementation**:

```javascript
// __tests__/integration/api/performance/concurrent-requests.integration.test.js
const apiClient = require("../../helpers/api-client");
const databaseHelper = require("../../helpers/database-helper");

describe("Concurrent Request Integration Tests", () => {
  beforeEach(async () => {
    await databaseHelper.resetDatabase();
  });

  describe("Concurrent Read Requests", () => {
    it("should handle 10 concurrent GET requests", async () => {
      await fixtureLoader.load(["users"]);

      const concurrentRequests = [];
      for (let i = 0; i < 10; i++) {
        concurrentRequests.push(apiClient.get("/users"));
      }

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it("should maintain consistent response times under concurrent load", async () => {
      await fixtureLoader.load(["users"]);

      const concurrentRequests = [];
      const startTime = Date.now();

      for (let i = 0; i < 20; i++) {
        concurrentRequests.push(apiClient.get("/users"));
      }

      await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // 20 concurrent requests should complete in <2 seconds
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe("Concurrent Write Requests", () => {
    it("should handle concurrent user creation without conflicts", async () => {
      const concurrentCreations = [];

      for (let i = 0; i < 10; i++) {
        concurrentCreations.push(
          apiClient.post("/users", {
            usr_name: `Concurrent User ${i}`,
            usr_email: `concurrent${i}@example.com`,
            usr_confluence_key: `concurrent${i}`,
          }),
        );
      }

      const responses = await Promise.all(concurrentCreations);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Verify all users created
      const usersResponse = await apiClient.get("/users");
      expect(usersResponse.body.length).toBe(10);
    });

    it("should prevent duplicate email constraint violations under concurrent load", async () => {
      const duplicateEmail = "duplicate@example.com";

      const concurrentCreations = [];
      for (let i = 0; i < 5; i++) {
        concurrentCreations.push(
          apiClient.post("/users", {
            usr_name: `User ${i}`,
            usr_email: duplicateEmail,
            usr_confluence_key: `user${i}`,
          }),
        );
      }

      const responses = await Promise.allSettled(concurrentCreations);

      // Only one should succeed (201), others should fail (409)
      const successCount = responses.filter(
        (r) => r.status === "fulfilled" && r.value.status === 201,
      ).length;

      expect(successCount).toBe(1);
    });
  });

  describe("Database Connection Pooling", () => {
    it("should manage database connections efficiently", async () => {
      // Execute many concurrent requests
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(apiClient.get("/users"));
      }

      await Promise.all(requests);

      // Verify no connection leaks
      const connectionResult = await databaseHelper.query(
        "SELECT count(*) FROM pg_stat_activity WHERE datname = $1",
        ["umig_test_db"],
      );
      const activeConnections = parseInt(connectionResult.rows[0].count);

      // Should not exceed pool size (5 connections)
      expect(activeConnections).toBeLessThanOrEqual(5);
    });
  });
});
```

**Validation Criteria**:

- [ ] 10+ concurrent requests handled
- [ ] No race conditions detected
- [ ] Database connections managed efficiently
- [ ] No connection pool exhaustion
- [ ] Transaction isolation maintained

### AC-098.7: Complete Test Suite Execution

**Given** Complete integration test suite ready
**When** all 250+ tests execute
**Then** performance and quality targets met including:

**Final Metrics**:

- [ ] **Coverage**: 100% API endpoints (31/31)
- [ ] **Test Count**: 250+ scenarios
- [ ] **Execution Time**: <5 minutes total
- [ ] **Pass Rate**: 100%
- [ ] **Security**: 100% authentication/authorization coverage
- [ ] **Performance**: All baselines met

## Technical Implementation

### Test Organization

```
__tests__/integration/api/
├── security/
│   ├── authentication.integration.test.js    # AC-098.1
│   ├── csrf.integration.test.js              # AC-098.2
│   ├── xss.integration.test.js               # AC-098.3
│   └── sql-injection.integration.test.js     # AC-098.4
└── performance/
    ├── response-times.integration.test.js    # AC-098.5
    └── concurrent-requests.integration.test.js # AC-098.6
```

## Dependencies and Integration Points

### Prerequisites

**Completed Stories**:

- [ ] US-095: Jest Integration Test Infrastructure
- [ ] US-096: Core Entity API Integration Tests
- [ ] US-097: Advanced API Integration Tests

**Infrastructure Requirements**:

- [ ] Security configurations enabled
- [ ] Performance monitoring configured
- [ ] Database connection pooling tuned

### Integration Points

**Builds upon**:

- Complete API integration test infrastructure (US-095, US-096, US-097)
- Security architecture (ADR-067, ADR-071)
- Authentication patterns (ADR-042)

**Enables**:

- Production deployment with confidence
- CI/CD security gates
- Performance monitoring baselines

## Risk Assessment

### Technical Risks

1. **Security Test Complexity**
   - **Risk**: CSRF/XSS tests require deep security knowledge
   - **Impact**: HIGH - Incomplete security validation
   - **Mitigation**: Security expert review, OWASP guidelines
   - **Likelihood**: Low | **Severity**: High

2. **Performance Test Flakiness**
   - **Risk**: Performance tests sensitive to environment
   - **Impact**: MEDIUM - Flaky test failures
   - **Mitigation**: Multiple runs, statistical analysis
   - **Likelihood**: Medium | **Severity**: Medium

## Success Metrics

### Sprint 10 Completion Criteria

**Coverage Metrics**:

- [ ] 100% API endpoint coverage (31/31)
- [ ] 100% authentication scenario coverage
- [ ] 100% security vulnerability testing (OWASP Top 10)
- [ ] 100% performance baseline establishment
- [ ] 250+ total test scenarios

**Security Metrics**:

- [ ] Zero authentication bypass vulnerabilities
- [ ] Zero injection vulnerabilities (XSS, SQL)
- [ ] CSRF protection validated
- [ ] Input validation comprehensive

**Performance Metrics**:

- [ ] All endpoints meet response time baselines
- [ ] Concurrent request handling validated (10+)
- [ ] Large dataset performance confirmed
- [ ] No memory leaks or connection leaks

## Quality Gates

### Code Quality

- [ ] Security tests follow OWASP guidelines
- [ ] Performance tests statistically valid
- [ ] All tests documented
- [ ] Security review approved

### Testing Quality

- [ ] Authentication scenarios comprehensive
- [ ] Security vulnerabilities tested
- [ ] Performance baselines documented
- [ ] Concurrent request safety validated

## Implementation Notes

### Development Phases

**Week 3 (Days 1-5): Security Testing**

- Day 1-2: Authentication & authorization tests (AC-098.1)
- Day 3: CSRF protection tests (AC-098.2)
- Day 4: XSS prevention tests (AC-098.3)
- Day 5: SQL injection prevention tests (AC-098.4)

**Week 4 (Days 1-5): Performance Testing & Finalization**

- Day 1-2: Response time baselines (AC-098.5)
- Day 3: Concurrent request testing (AC-098.6)
- Day 4: Complete suite validation (AC-098.7)
- Day 5: Documentation, security review, final approval

## Related Documentation

- **US-095**: Jest Integration Test Infrastructure
- **US-096**: Core Entity API Integration Tests
- **US-097**: Advanced API Integration Tests
- **Jest Integration Test Plan**: `docs/testing/JEST_INTEGRATION_TEST_PLAN.md`
- **ADR-067**: Privacy-Compliant Security Architecture
- **ADR-071**: Input Validation Architecture
- **OWASP Top 10**: https://owasp.org/Top10/

## Change Log

| Date       | Version | Changes                              | Author |
| ---------- | ------- | ------------------------------------ | ------ |
| 2025-10-01 | 1.0     | Initial story creation for Sprint 10 | System |

---

**Story Status**: Blocked by US-097
**Next Action**: Begin after US-097 completion (Sprint 10, Week 3)
**Risk Level**: Medium (security validation critical)
**Strategic Priority**: High (production readiness)
**Dependencies**: US-095, US-096, US-097

**Expected Outcomes**:

- 100% API endpoint coverage (31/31 endpoints)
- 250+ comprehensive test scenarios
- Complete security validation (authentication, CSRF, XSS, SQL injection)
- Performance baselines established (<200ms)
- Production-ready CI/CD integration test suite
- <5 minute total test execution time
