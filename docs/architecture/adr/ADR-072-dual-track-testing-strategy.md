# ADR-072: Dual-Track Testing Strategy - Manual Groovy + Automated Jest Integration

## Status

**Status**: Accepted
**Date**: 2025-09-30
**Author**: Development Team
**Technical Story**: Sprint 9 Testing Infrastructure Enhancement
**Related User Stories**: US-095, US-096, US-097, US-098
**Implementation Roadmap**: Sprints 9-10 (34 story points)

## Context

UMIG has accumulated comprehensive test coverage across multiple dimensions, but a critical gap exists in the automated testing of repository and service layer logic through the REST API layer. This ADR establishes a strategic dual-track approach to address the execution limitations of isolated Groovy tests while enabling full CI/CD integration.

### Current Testing Landscape

#### Track 1: Groovy Tests (Manual Execution)

**Scope**: 18 isolated comprehensive tests (820 KB total)
**Location**: `local-dev-setup/__tests__/groovy/isolated/`
**Execution Context**: ScriptRunner console only
**Coverage**: 85-90% repository method coverage
**Frequency**: Quarterly validation cycle

**Critical Limitation**: These tests **cannot execute via npm or standalone groovy CLI** because they require:

- ScriptRunner database connectivity
- Confluence runtime environment
- ScriptRunner class loader and dependencies
- PostgreSQL behavior simulation via embedded MockSql

**Categories**:

- Repository Tests (8 files): ApplicationRepository, UserRepository, StepInstanceRepository, MigrationRepository, TeamRepository, etc.
- API Tests (2 files): TeamsApiComprehensiveTest (98 KB), StepsApiComprehensiveTest (53 KB)
- Service Tests (1 file): StepDataTransformationServiceComprehensiveTest (44 KB)
- Integration Tests (1 file): Email service end-to-end testing (52 KB)
- Performance Tests (1 file): ImportLoadTests (42 KB)
- Other Tests (5 files): ImportApi, BaseEntityManager, MigrationTypes, Environments, StepView

**Root Cause**: Moving these tests from `src/groovy/umig/tests/` to isolated location was necessary to prevent ScriptRunner crashes during Confluence startup. Complex static nested class structures (up to 9 classes) and large file sizes (27-98 KB) overwhelmed ScriptRunner's class loader, causing OutOfMemoryError and system crashes.

#### Gap: No Automated CI/CD Testing

**Problem Statement**: The 18 isolated Groovy tests, while comprehensive, cannot be integrated into automated CI/CD pipelines. This creates:

- **Regression Risk**: Manual quarterly testing misses issues introduced between releases
- **Integration Blind Spots**: API layer changes not validated automatically
- **Deployment Delays**: Manual test execution required before production releases
- **Quality Feedback Lag**: Developers lack immediate feedback on API changes

### Proposed Solution: Track 2 - Jest Integration Tests

**Scope**: Comprehensive API endpoint validation via HTTP requests
**Execution**: Automated `npm run test:js:integration`
**Frequency**: Every commit via CI/CD
**Coverage Goal**: 80%+ API endpoint coverage (31/31 endpoints)
**Database Strategy**: Isolated test database (`umig_test_db`)

**Complementary Design**: Track 2 does not replace Track 1. Instead:

- **Track 1 (Groovy)**: Deep repository/service logic validation with embedded mocks
- **Track 2 (Jest)**: API endpoint validation with real database integration
- **Combined Coverage**: Comprehensive validation from unit logic to API interface

## Decision

We will implement a **Dual-Track Testing Strategy** combining manual Groovy tests for deep logic validation with automated Jest integration tests for CI/CD API coverage.

### Strategic Objectives

1. **Enable CI/CD Integration**: Automated tests run on every commit
2. **API Coverage**: Validate all 31+ REST API endpoints comprehensively
3. **Database Validation**: Test complete CRUD operations via API layer
4. **Error Handling**: Verify proper HTTP status codes and error responses
5. **Security Testing**: Validate authentication, authorization, XSS, SQL injection prevention
6. **Performance Baselines**: Establish response time thresholds and concurrent request handling

### Success Metrics

- ✅ 80%+ API endpoint coverage (25/31 minimum, targeting 31/31)
- ✅ <5 minute total test suite execution time
- ✅ Zero false positives/negatives
- ✅ Automated database state reset between test runs
- ✅ CI/CD integration with GitHub Actions
- ✅ 100% HTTP status code validation
- ✅ Response time <200ms for standard endpoints

## Implementation Architecture

### Technology Stack

**Testing Framework**: Jest 29.x with Supertest
**HTTP Client**: Supertest (API testing)
**Database Fixtures**: Custom fixture loader with PostgreSQL
**Authentication**: Basic auth with test credentials
**Environment**: Isolated test database (`umig_test_db`)

### Test Organization Structure

```
local-dev-setup/__tests__/integration/
├── api/
│   ├── users.integration.test.js
│   ├── teams.integration.test.js
│   ├── migrations.integration.test.js
│   ├── plans.integration.test.js
│   ├── sequences.integration.test.js
│   ├── phases.integration.test.js
│   ├── steps.integration.test.js
│   ├── enhanced-steps.integration.test.js
│   └── ... (31+ endpoint test files)
├── fixtures/
│   ├── users.fixture.js
│   ├── teams.fixture.js
│   ├── migrations.fixture.js
│   └── ... (entity fixtures)
├── helpers/
│   ├── api-client.js           # Supertest wrapper with auth
│   ├── database-helper.js      # Test database management
│   ├── fixture-loader.js       # Foreign key aware loading
│   └── auth-helper.js          # Authentication utilities
└── setup/
    ├── globalSetup.js          # Test suite initialization
    └── globalTeardown.js       # Cleanup and reset
```

### Database Management Strategy

#### Test Database Isolation

**Database**: `umig_test_db` (completely separate from `umig_app_db`)
**User**: `umig_test_user`
**Reset Strategy**: Drop/recreate schema before each test suite
**Credentials**: Isolated test credentials, never production

**Rationale**: Strict database isolation prevents:

- Test pollution of production/development databases
- Data corruption from failed tests
- Security vulnerabilities from credential exposure
- Performance degradation during test runs

#### Fixture Management

**Fixture Format**: JSON files with seeded minimal data
**Loading Order**: Respect foreign key dependencies (migrations → iterations → plans → sequences → phases → steps → instructions)
**Data Volume**: Minimal fixtures (5-10 records per entity) for fast execution
**Validation**: Fixtures validated against actual schema (ADR-059 compliance)

**Example Fixture**:

```javascript
// fixtures/users.fixture.js
module.exports = [
  {
    usr_id: "11111111-1111-1111-1111-111111111111",
    usr_name: "Test User 1",
    usr_email: "test1@example.com",
    usr_confluence_key: "testuser1",
    usr_is_active: true,
  },
  {
    usr_id: "22222222-2222-2222-2222-222222222222",
    usr_name: "Test User 2",
    usr_email: "test2@example.com",
    usr_confluence_key: "testuser2",
    usr_is_active: true,
  },
];
```

### Test Pattern Examples

#### Pattern 1: Basic CRUD Operations

```javascript
// users.integration.test.js
const { apiClient } = require("../helpers/api-client");
const { resetDatabase, loadFixtures } = require("../helpers/database-helper");

describe("Users API Integration Tests", () => {
  beforeEach(async () => {
    await resetDatabase();
    await loadFixtures(["users", "teams"]);
  });

  describe("POST /users", () => {
    it("should create user with valid data", async () => {
      const response = await apiClient()
        .post("/rest/scriptrunner/latest/custom/users")
        .send({
          usr_name: "John Doe",
          usr_email: "john.doe@example.com",
          usr_confluence_key: "johndoe",
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        usr_name: "John Doe",
        usr_email: "john.doe@example.com",
      });
      expect(response.body.usr_id).toBeDefined();
    });

    it("should return 400 for missing required fields", async () => {
      const response = await apiClient()
        .post("/rest/scriptrunner/latest/custom/users")
        .send({ usr_name: "John Doe" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("usr_email is required");
    });
  });

  describe("GET /users/:id", () => {
    it("should retrieve existing user", async () => {
      const fixtures = await loadFixtures(["users"]);
      const userId = fixtures.users[0].usr_id;

      const response = await apiClient().get(
        `/rest/scriptrunner/latest/custom/users/${userId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.usr_id).toBe(userId);
    });

    it("should return 404 for non-existent user", async () => {
      const response = await apiClient().get(
        "/rest/scriptrunner/latest/custom/users/00000000-0000-0000-0000-000000000000",
      );

      expect(response.status).toBe(404);
    });
  });
});
```

#### Pattern 2: Relationship Validation

```javascript
// teams.integration.test.js
describe("Teams with Members Integration Tests", () => {
  it("should handle cascading team member deletion", async () => {
    const fixtures = await loadFixtures(["users", "teams", "team_members"]);
    const teamId = fixtures.teams[0].tea_id;

    // Delete team
    await apiClient().delete(
      `/rest/scriptrunner/latest/custom/teams/${teamId}`,
    );

    // Verify team members deleted (cascade)
    const membersResponse = await apiClient().get(
      `/rest/scriptrunner/latest/custom/team-members?teamId=${teamId}`,
    );

    expect(membersResponse.body).toHaveLength(0);
  });

  it("should enforce foreign key constraints", async () => {
    const response = await apiClient()
      .post("/rest/scriptrunner/latest/custom/team-members")
      .send({
        tea_id: "00000000-0000-0000-0000-000000000000", // Non-existent team
        usr_id: "00000000-0000-0000-0000-000000000001",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Foreign key violation");
  });
});
```

#### Pattern 3: Complex Aggregation

```javascript
// enhanced-steps.integration.test.js
describe("EnhancedSteps API Integration Tests", () => {
  it("should aggregate step data with related entities", async () => {
    await loadFixtures([
      "migrations",
      "iterations",
      "plans",
      "sequences",
      "phases",
      "steps",
      "instructions",
    ]);

    const response = await apiClient().get(
      "/rest/scriptrunner/latest/custom/enhanced-steps?planId=<uuid>",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sti_id: expect.any(String),
          sti_name: expect.any(String),
          migration_name: expect.any(String),
          iteration_name: expect.any(String),
          plan_name: expect.any(String),
          sequence_name: expect.any(String),
          phase_name: expect.any(String),
          instruction_count: expect.any(Number),
        }),
      ]),
    );
  });
});
```

### CI/CD Integration

#### GitHub Actions Workflow

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop, feature/*, bugfix/*]
  pull_request:
    branches: [main, develop]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: umig_test_db
          POSTGRES_USER: umig_test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm install

      - name: Run database migrations
        run: npm run db:migrate:test

      - name: Run integration tests
        run: npm run test:js:integration
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: umig_test_db
          DB_USER: umig_test_user
          DB_PASSWORD: test_password

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/integration/lcov.info
```

## Implementation Roadmap

### Phase 1: Foundation (Sprint 9, Weeks 1-2)

**User Story**: US-095 - Jest Integration Test Infrastructure
**Points**: 8
**Duration**: 2 weeks

**Deliverables**:

1. Configure `jest.config.integration.js`
2. Implement `api-client.js` helper with Supertest
3. Create `database-helper.js` for test database management
4. Implement `fixture-loader.js` for test data with foreign key awareness
5. Setup `globalSetup`/`globalTeardown` for database isolation
6. Create 5 baseline integration tests (Users, Teams, Migrations, Status, Environments)

**Acceptance Criteria**:

- [ ] `npm run test:js:integration` executes successfully
- [ ] Tests run in isolated test database (`umig_test_db`)
- [ ] Database resets automatically before each test suite
- [ ] 5 entity endpoints have ≥80% coverage
- [ ] Test execution completes in <2 minutes

### Phase 2: Core API Coverage (Sprint 9, Weeks 3-4)

**User Story**: US-096 - Core Entity API Integration Tests
**Points**: 13
**Duration**: 2 weeks

**Deliverables**:

1. Tests for 15 additional endpoints:
   - TeamMembers, Applications, Labels
   - Plans, Sequences, Phases, Steps, Instructions
   - Iterations, MigrationTypes, IterationTypes
   - SystemConfiguration, UrlConfiguration, Controls
2. Comprehensive CRUD operation validation
3. Relationship validation (foreign keys, cascades)
4. Error scenario coverage (404, 400, 409, 500)

**Acceptance Criteria**:

- [ ] 20 total API endpoints tested (5 from Phase 1 + 15 new)
- [ ] Each endpoint has ≥5 test scenarios
- [ ] 100% HTTP status code validation
- [ ] Foreign key constraint testing
- [ ] Test execution completes in <3 minutes

### Phase 3: Advanced Features (Sprint 10, Weeks 1-2)

**User Story**: US-097 - Advanced API Integration Tests
**Points**: 8
**Duration**: 2 weeks

**Deliverables**:

1. Tests for complex endpoints:
   - EnhancedSteps (aggregated data)
   - Import/ImportQueue (file upload)
   - StepView (email generation)
   - Dashboard (aggregated metrics)
2. Multi-entity relationship validation
3. Complex query parameter testing
4. File upload/download validation

**Acceptance Criteria**:

- [ ] 25+ total API endpoints tested
- [ ] Complex aggregation queries validated
- [ ] File upload scenarios tested
- [ ] Multi-step workflows validated
- [ ] Test execution completes in <4 minutes

### Phase 4: Security & Performance (Sprint 10, Weeks 3-4)

**User Story**: US-098 - Security & Performance Integration Tests
**Points**: 5
**Duration**: 2 weeks

**Deliverables**:

1. Authentication/authorization tests
   - Valid credentials acceptance
   - Invalid credentials rejection
   - Role-based access control
2. Security validation
   - CSRF token validation
   - XSS prevention
   - SQL injection prevention
3. Performance baselines
   - Response time thresholds (<200ms)
   - Concurrent request handling
   - Large dataset pagination

**Acceptance Criteria**:

- [ ] 100% authentication scenario coverage
- [ ] Zero security vulnerabilities in automated tests
- [ ] Performance baselines established
- [ ] Load testing (10 concurrent requests)
- [ ] Test execution completes in <5 minutes

## Consequences

### Positive

- ✅ **CI/CD Automation**: Every commit validates API functionality automatically
- ✅ **Comprehensive Coverage**: 80%+ API endpoint coverage + 85-90% repository coverage (dual-track)
- ✅ **Fast Feedback Loop**: Developers receive immediate feedback on API changes
- ✅ **Regression Prevention**: Automated tests catch regressions before production
- ✅ **Database Isolation**: Test database prevents production pollution
- ✅ **Security Validation**: Automated security testing reduces vulnerability risk
- ✅ **Performance Monitoring**: Baseline establishment enables degradation detection
- ✅ **Deployment Confidence**: Comprehensive testing enables faster releases
- ✅ **Complementary Approaches**: Groovy tests validate deep logic, Jest tests validate API integration

### Negative

- ⚠️ **Maintenance Overhead**: Two parallel testing tracks require maintenance
- ⚠️ **Test Data Management**: Fixture maintenance as schema evolves
- ⚠️ **Execution Time Growth**: Risk of test suite becoming too slow (mitigated by <5 min target)
- ⚠️ **False Positive Risk**: API tests may pass while repository logic has bugs (mitigated by dual-track)
- ⚠️ **Infrastructure Complexity**: Separate test database requires additional infrastructure

### Mitigation Strategies

1. **Fixture Automation**: Automated fixture validation against schema changes
2. **Parallel Execution**: Run tests in parallel to reduce execution time
3. **Selective Testing**: Smart test selection based on changed files
4. **Comprehensive Assertions**: Detailed assertions to reduce false positives
5. **Monitoring**: Track test execution time trends and optimize slow tests
6. **Documentation**: Clear documentation of test patterns and best practices

## Related ADRs

- **[ADR-031](ADR-031-groovy-type-safety-and-filtering-patterns.md)**: Type Casting Requirements - Groovy type safety impacts test mocking
- **[ADR-042](ADR-042-dual-authentication-context-management.md)**: Dual Authentication Pattern - Test authentication strategy
- **[ADR-052](ADR-052-self-contained-test-architecture-pattern.md)**: Self-Contained Test Architecture - Groovy test isolation pattern
- **[ADR-053](ADR-053-technology-prefixed-test-commands-architecture.md)**: Technology-Prefixed Test Commands - npm test command organization
- **[ADR-057](ADR-057-javascript-module-loading-anti-pattern.md)**: JavaScript Module Loading - Frontend testing considerations
- **[ADR-058](ADR-058-global-securityutils-access-pattern.md)**: Component Security Architecture - Security testing patterns
- **[ADR-059](ADR-059-sql-schema-first-development-principle.md)**: Schema Authority Principle - Database fixture validation
- **[ADR-060](ADR-060-baseentitymanager-interface-compatibility-pattern.md)**: BaseEntityManager Pattern - Entity testing patterns

## Coverage Goals & Metrics

### Sprint 9 Target (Week 4)

- **Endpoints Covered**: 20/31 (65%)
- **Test Count**: ~150 integration tests
- **Execution Time**: <3 minutes
- **Pass Rate**: 100%
- **Coverage**: Unit tests ≥80%, Integration tests ≥70%

### Sprint 10 Target (Week 4)

- **Endpoints Covered**: 31/31 (100%)
- **Test Count**: ~250 integration tests
- **Execution Time**: <5 minutes
- **Pass Rate**: 100%
- **Coverage**: Unit tests ≥85%, Integration tests ≥80%

### Long-Term Target

- **API Coverage**: 100% endpoints (31/31)
- **Scenario Coverage**: ≥5 scenarios per endpoint
- **Error Coverage**: 100% error codes validated (400, 404, 409, 500)
- **Security Coverage**: 100% authentication/authorization scenarios
- **Performance**: Response time <200ms (95th percentile)

## Maintenance & Evolution

### Quarterly Review Cycle

**Activities**:

1. Execute all 18 isolated Groovy tests manually in ScriptRunner console
2. Review Jest integration test coverage gaps
3. Update fixtures with new entity types
4. Performance baseline adjustments
5. Security scenario expansion

**Deliverables**:

- Test execution report (pass/fail status)
- Coverage analysis
- Performance metrics
- Security validation results
- Identified gaps and improvement recommendations

### Continuous Improvement

**Monitor**:

- Test execution time trends
- Flaky test identification
- False positive/negative rates
- Coverage percentage changes
- Security vulnerability detection

**Actions**:

- Optimize slow tests
- Refactor flaky tests
- Add missing scenario coverage
- Update documentation
- Expand security test scenarios

## Risk Assessment

### Identified Risks

1. **Test Database Isolation Failure**
   - **Risk**: Tests pollute production database
   - **Mitigation**: Strict environment variable validation, separate credentials, CI/CD enforcement

2. **Fixture Data Drift**
   - **Risk**: Fixtures become outdated with schema changes
   - **Mitigation**: Automated fixture validation, migration scripts, quarterly reviews

3. **Execution Time Growth**
   - **Risk**: Test suite becomes too slow for CI/CD
   - **Mitigation**: Parallel execution, database optimization, selective test runs, <5 min hard limit

4. **False Positives**
   - **Risk**: Tests pass but API has bugs
   - **Mitigation**: Comprehensive assertion coverage, negative scenario testing, dual-track validation

5. **Groovy Test Maintenance Gap**
   - **Risk**: Quarterly manual testing misses critical issues
   - **Mitigation**: Dual-track approach ensures API layer validation every commit

## Dependencies & Prerequisites

### Technical Dependencies

- Jest 29.x
- Supertest 6.x
- PostgreSQL 14+
- Node.js 18+
- Confluence with ScriptRunner (running for API endpoints)

### Knowledge Dependencies

- API endpoint specifications (OpenAPI 2.12.0)
- Database schema (Liquibase migrations)
- Authentication mechanisms (ADR-042)
- Error handling patterns (ADR-031)
- Type casting standards (ADR-043)
- Schema authority principle (ADR-059)

### Infrastructure Dependencies

- GitHub Actions for CI/CD
- PostgreSQL test database (`umig_test_db`)
- Isolated test credentials
- npm script infrastructure

## Success Criteria

### Phase 1 Success (Sprint 9, Week 2)

- [ ] 5 API endpoints with ≥80% coverage
- [ ] Automated database reset working
- [ ] Test execution <2 minutes
- [ ] Zero CI/CD failures

### Phase 2 Success (Sprint 9, Week 4)

- [ ] 20 API endpoints with ≥80% coverage
- [ ] 100% HTTP status code validation
- [ ] Test execution <3 minutes
- [ ] GitHub Actions integration complete

### Phase 3 Success (Sprint 10, Week 2)

- [ ] 25+ API endpoints with ≥80% coverage
- [ ] Complex workflow validation
- [ ] Test execution <4 minutes
- [ ] Zero security vulnerabilities

### Phase 4 Success (Sprint 10, Week 4)

- [ ] 31 API endpoints with ≥80% coverage
- [ ] 100% authentication coverage
- [ ] Performance baselines established
- [ ] Test execution <5 minutes

## Monitoring & Reporting

### Test Execution Metrics

```javascript
class TestMetrics {
  constructor() {
    this.metrics = {
      execution: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        executionTime: 0,
        averageResponseTime: 0,
      },

      coverage: {
        endpointsCovered: 0,
        totalEndpoints: 31,
        coveragePercentage: 0,
        scenariosPerEndpoint: 0,
      },

      quality: {
        falsePositives: 0,
        falseNegatives: 0,
        flakyTests: [],
        securityVulnerabilities: 0,
      },

      performance: {
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        maxResponseTime: 0,
      },
    };
  }
}
```

### Quarterly Manual Test Report

**Template**:

```markdown
# Groovy Test Execution Report - Q[X] 2025

## Executive Summary

- Tests Executed: X/18
- Pass Rate: X%
- Critical Failures: X
- Execution Time: X hours

## Detailed Results

[Test-by-test breakdown]

## Identified Issues

[Bug reports with severity]

## Recommendations

[Improvement suggestions]
```

## Conclusion

This Dual-Track Testing Strategy provides comprehensive validation of UMIG's REST API layer while preserving the deep logic validation of isolated Groovy tests. The complementary approach enables:

- **Every Commit Validation**: Automated Jest tests catch API regressions immediately
- **Deep Logic Coverage**: Quarterly Groovy tests validate complex repository/service logic
- **CI/CD Integration**: Full automation enables rapid, confident deployments
- **Comprehensive Security**: Automated security testing reduces vulnerability risk
- **Performance Monitoring**: Baseline establishment enables degradation detection

**Key Benefits**:

- ✅ 80%+ API endpoint coverage through automated Jest tests
- ✅ 85-90% repository coverage through manual Groovy tests
- ✅ <5 minute total execution time for CI/CD compatibility
- ✅ 100% database isolation preventing production pollution
- ✅ Comprehensive security validation through automated scenarios

**Next Steps**:

1. Approve ADR-072 and allocate Sprint 9 capacity (21 points)
2. Create US-095 through US-098 user stories in backlog
3. Assign to development team with expertise in Jest, Supertest, PostgreSQL
4. Begin Phase 1 implementation (Sprint 9, Week 1)
5. Establish GitHub Actions workflow for CI/CD integration

## Amendment History

- **2025-09-30**: Initial ADR creation based on Jest Integration Test Plan and Groovy testing gap analysis
