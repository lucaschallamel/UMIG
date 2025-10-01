# Jest Integration Test Plan - Sprint 9

> **Architecture Decision**: This plan implements the testing strategy defined in **[ADR-072: Dual-Track Testing Strategy](../architecture/adr/ADR-072-dual-track-testing-strategy.md)**

## Overview

This document outlines the **Dual-Track Testing Strategy** for UMIG, addressing the execution limitations of isolated Groovy tests by implementing comprehensive automated Jest integration tests for CI/CD integration.

## Context & Problem Statement

### Current Situation

**Track 1: Groovy Tests (Manual)**

- 18 isolated comprehensive tests in `local-dev-setup/__tests__/groovy/`
- Cannot execute via npm or standalone groovy CLI
- Require ScriptRunner execution context
- Executed manually in ScriptRunner console
- Quarterly validation cycle
- 85-90% repository method coverage

**Gap**: No automated CI/CD testing for comprehensive repository/service logic

### Proposed Solution

**Track 2: Jest Integration Tests (Automated)**

- Comprehensive API endpoint validation via HTTP requests
- Automated execution: `npm run test:js:integration`
- Every commit execution via CI/CD
- 80%+ API endpoint coverage
- Database state management via test fixtures

## Strategic Objectives

### Primary Goals

1. **Enable CI/CD Integration**: Automated tests run on every commit
2. **API Coverage**: Validate all 31+ REST API endpoints
3. **Database Validation**: Test complete CRUD operations via API
4. **Error Handling**: Verify proper HTTP status codes and error responses
5. **Security Testing**: Validate authentication and authorization

### Success Metrics

- ✅ 80%+ API endpoint coverage
- ✅ <5 minute total test suite execution time
- ✅ Zero false positives/negatives
- ✅ Automated database state reset between test runs
- ✅ CI/CD integration with GitHub Actions

## Test Architecture

### Technology Stack

**Framework**: Jest 29.x with Supertest
**HTTP Client**: Supertest (API testing)
**Database Fixtures**: Custom fixture loader with PostgreSQL
**Authentication**: Basic auth with test credentials
**Environment**: Isolated test database (umig_test_db)

### Test Organization

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
│   ├── api-client.js
│   ├── database-helper.js
│   ├── fixture-loader.js
│   └── auth-helper.js
└── setup/
    ├── globalSetup.js
    └── globalTeardown.js
```

## Implementation Phases

### Phase 1: Foundation (Sprint 9, Week 1-2)

**Story**: US-095 - Jest Integration Test Infrastructure
**Points**: 8
**Duration**: 2 weeks

**Deliverables:**

1. Configure jest.config.integration.js
2. Implement api-client.js helper with Supertest
3. Create database-helper.js for test database management
4. Implement fixture-loader.js for test data
5. Setup globalSetup/globalTeardown for database isolation
6. Create 5 baseline integration tests (Users, Teams, Migrations, Status, Environments)

**Acceptance Criteria:**

- [ ] `npm run test:js:integration` executes successfully
- [ ] Tests run in isolated test database (umig_test_db)
- [ ] Database resets automatically before each test suite
- [ ] 5 entity endpoints have ≥80% coverage
- [ ] Test execution completes in <2 minutes

### Phase 2: Core API Coverage (Sprint 9, Week 3-4)

**Story**: US-096 - Core Entity API Integration Tests
**Points**: 13
**Duration**: 2 weeks

**Deliverables:**

1. Tests for 15 additional endpoints:
   - TeamMembers, Applications, Labels
   - Plans, Sequences, Phases, Steps, Instructions
   - Iterations, MigrationTypes, IterationTypes
   - SystemConfiguration, UrlConfiguration, Controls
2. Comprehensive CRUD operation validation
3. Relationship validation (foreign keys, cascades)
4. Error scenario coverage (404, 400, 409, 500)

**Acceptance Criteria:**

- [ ] 20 total API endpoints tested (5 from Phase 1 + 15 new)
- [ ] Each endpoint has ≥5 test scenarios
- [ ] 100% HTTP status code validation
- [ ] Foreign key constraint testing
- [ ] Test execution completes in <3 minutes

### Phase 3: Advanced Features (Sprint 10, Week 1-2)

**Story**: US-097 - Advanced API Integration Tests
**Points**: 8
**Duration**: 2 weeks

**Deliverables:**

1. Tests for complex endpoints:
   - EnhancedSteps (aggregated data)
   - Import/ImportQueue (file upload)
   - StepView (email generation)
   - Dashboard (aggregated metrics)
2. Multi-entity relationship validation
3. Complex query parameter testing
4. File upload/download validation

**Acceptance Criteria:**

- [ ] 25+ total API endpoints tested
- [ ] Complex aggregation queries validated
- [ ] File upload scenarios tested
- [ ] Multi-step workflows validated
- [ ] Test execution completes in <4 minutes

### Phase 4: Security & Performance (Sprint 10, Week 3-4)

**Story**: US-098 - Security & Performance Integration Tests
**Points**: 5
**Duration**: 2 weeks

**Deliverables:**

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

**Acceptance Criteria:**

- [ ] 100% authentication scenario coverage
- [ ] Zero security vulnerabilities in automated tests
- [ ] Performance baselines established
- [ ] Load testing (10 concurrent requests)
- [ ] Test execution completes in <5 minutes

## Test Patterns & Examples

### Pattern 1: Basic CRUD Operations

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

### Pattern 2: Relationship Validation

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

### Pattern 3: Complex Aggregation

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

## Database Management Strategy

### Test Database Isolation

**Database**: `umig_test_db` (separate from `umig_app_db`)
**User**: `umig_test_user`
**Reset Strategy**: Drop/recreate schema before each test suite

### Fixture Management

**Fixture Format**: JSON files with seeded data
**Loading Order**: Respect foreign key dependencies (migrations → iterations → plans → ...)
**Data Volume**: Minimal fixtures (5-10 records per entity) for fast execution

### Example Fixture

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

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop, feature/*]
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

## Coverage Goals & Metrics

### Sprint 9 Target

- **Endpoints Covered**: 20/31 (65%)
- **Test Count**: ~150 integration tests
- **Execution Time**: <3 minutes
- **Pass Rate**: 100%

### Sprint 10 Target

- **Endpoints Covered**: 31/31 (100%)
- **Test Count**: ~250 integration tests
- **Execution Time**: <5 minutes
- **Pass Rate**: 100%

### Long-Term Target

- **API Coverage**: 100% endpoints
- **Scenario Coverage**: ≥5 scenarios per endpoint
- **Error Coverage**: 100% error codes validated
- **Security Coverage**: 100% authentication/authorization scenarios

## Maintenance & Evolution

### Quarterly Review Cycle

**Activities:**

1. Review test coverage gaps
2. Update fixtures with new entity types
3. Performance baseline adjustments
4. Security scenario expansion

### Continuous Improvement

**Monitor:**

- Test execution time trends
- Flaky test identification
- False positive/negative rates
- Coverage percentage changes

**Actions:**

- Optimize slow tests
- Refactor flaky tests
- Add missing scenario coverage
- Update documentation

## Risk Assessment

### Identified Risks

1. **Test Database Isolation Failure**
   - Risk: Tests pollute production database
   - Mitigation: Strict environment variable validation, separate credentials

2. **Fixture Data Drift**
   - Risk: Fixtures become outdated with schema changes
   - Mitigation: Automated fixture validation, migration scripts

3. **Execution Time Growth**
   - Risk: Test suite becomes too slow for CI/CD
   - Mitigation: Parallel execution, database optimization, selective test runs

4. **False Positives**
   - Risk: Tests pass but API has bugs
   - Mitigation: Comprehensive assertion coverage, negative scenario testing

## Dependencies & Prerequisites

### Technical Dependencies

- Jest 29.x
- Supertest 6.x
- PostgreSQL 14+
- Node.js 18+
- Confluence with ScriptRunner (running)

### Knowledge Dependencies

- API endpoint specifications (OpenAPI 2.12.0)
- Database schema (Liquibase migrations)
- Authentication mechanisms (ADR-042)
- Error handling patterns (ADR-031)

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

## Conclusion

This Jest Integration Test Plan provides a comprehensive automated testing strategy to complement the manual Groovy tests, enabling full CI/CD integration while maintaining comprehensive coverage of UMIG's REST API layer.

**Key Benefits:**

- ✅ Automated CI/CD validation on every commit
- ✅ 80%+ API endpoint coverage
- ✅ Fast execution (<5 minutes total)
- ✅ Database isolation preventing production pollution
- ✅ Complements manual Groovy tests for complete coverage

**Next Steps:**

1. Approve plan and allocate Sprint 9 capacity
2. Create US-095 through US-098 user stories
3. Assign to development team
4. Begin Phase 1 implementation

## Related Documentation

- **[ADR-072: Dual-Track Testing Strategy](../architecture/adr/ADR-072-dual-track-testing-strategy.md)** - Architectural decision formalizing this approach
- **[Groovy Testing Guide](../../local-dev-setup/__tests__/groovy/GROOVY_TESTING_GUIDE.md)** - Manual testing procedures for Track 1

---

**Created**: 2025-09-30
**Author**: UMIG Development Team
**Status**: Proposed for Sprint 9
**Estimated Effort**: 34 story points (4 sprints)
