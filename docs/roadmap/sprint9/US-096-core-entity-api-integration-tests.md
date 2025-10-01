# US-096: Core Entity API Integration Tests

## Story Metadata

**Story ID**: US-096
**Epic**: Jest Integration Testing - Dual-Track Testing Strategy
**Sprint**: Sprint 9 (Week 3-4)
**Priority**: P1 (HIGH - Comprehensive API coverage)
**Effort**: 13 points
**Status**: Blocked by US-095
**Timeline**: 2 weeks (Sprint 9, Week 3-4)
**Owner**: QA Engineering + Backend Development Team
**Dependencies**: US-095 (Jest Integration Test Infrastructure)
**Risk**: MEDIUM (Complex entity relationships, comprehensive coverage)

## Problem Statement

### Current Coverage Gap

After US-095 establishes baseline integration testing infrastructure for 5 core APIs (Users, Teams, Migrations, Status, Environments), significant coverage gaps remain:

**Untested Entities** (15 endpoints):

- **Team Management**: TeamMembers (user-team relationships)
- **Environment Management**: Applications (application catalog)
- **Taxonomy**: Labels (flexible tagging system)
- **Migration Hierarchy**: Plans, Sequences, Phases, Steps, Instructions (7 entities)
- **Migration Execution**: Iterations, MigrationTypes, IterationTypes
- **System Configuration**: SystemConfiguration, UrlConfiguration, Controls

**Business Impact of Coverage Gap**:

- **Deployment Risk**: Changes to 15 untested APIs could break production without detection
- **Integration Risk**: Complex relationships (migrations → iterations → plans → sequences → phases → steps → instructions) not validated
- **Regression Risk**: No automated validation prevents breaking changes
- **Maintenance Cost**: Manual testing required for 48% of API surface (15/31 endpoints)

### Proposed Solution

Implement comprehensive integration tests for remaining 15 core entity APIs, achieving:

**Core Entity Coverage**:

- **Relationship Validation**: Foreign key constraints, cascade deletes, referential integrity
- **CRUD Validation**: Complete create, read, update, delete lifecycle testing
- **Error Scenarios**: All HTTP status codes (400, 404, 409, 500) validated
- **Complex Queries**: Filtering, sorting, pagination tested comprehensively
- **Data Integrity**: Multi-entity consistency validation

**Strategic Value**:

- **65% Total Coverage**: 20/31 API endpoints tested (vs 16% after US-095)
- **Comprehensive CRUD**: Every entity lifecycle validated
- **Relationship Safety**: Foreign key violations prevented
- **Rapid Feedback**: <3 minute test execution for 20 endpoints
- **CI/CD Confidence**: Automated validation on every commit

## User Story

**As a** Backend Developer working on UMIG entity management and migration hierarchy
**I want** comprehensive integration tests covering all 15 remaining core entity APIs with full CRUD and relationship validation
**So that** I can confidently modify APIs knowing foreign key constraints, cascade behaviors, and error scenarios are automatically validated without manually testing 48% of the API surface

### Value Statement

This story expands automated API integration testing from 5 to 20 endpoints (300% coverage increase), enabling developers to validate complex entity relationships (migrations → iterations → plans → sequences → phases → steps → instructions) instantly via `npm run test:js:integration`, preventing deployment regressions in hierarchical data management while reducing manual QA effort from 48% to 35% of API surface.

## Acceptance Criteria

### AC-096.1: Team Management Integration Tests

**Given** team membership management requires relationship validation
**When** TeamMembers API integration tests are created
**Then** comprehensive relationship testing is implemented including:

**Test Scenarios**:

1. Create team member with valid user and team
2. Prevent duplicate team membership
3. Validate foreign key constraints (non-existent user/team)
4. Cascade delete when team deleted
5. List team members by team
6. Remove team member (disassociate user from team)

**Implementation**:

```javascript
// __tests__/integration/api/team-members.integration.test.js
const apiClient = require("../helpers/api-client");
const fixtureLoader = require("../helpers/fixture-loader");
const databaseHelper = require("../helpers/database-helper");

describe("TeamMembers API Integration Tests", () => {
  beforeEach(async () => {
    await databaseHelper.resetDatabase();
  });

  describe("POST /team-members", () => {
    it("should create team member with valid user and team", async () => {
      const fixtures = await fixtureLoader.load(["users", "teams"]);
      const userId = fixtures.users[0].usr_id;
      const teamId = fixtures.teams[0].tea_id;

      const response = await apiClient.post("/team-members", {
        usr_id: userId,
        tea_id: teamId,
        tme_role: "member",
      });

      expect(response.status).toBe(201);
      expect(response.body.usr_id).toBe(userId);
      expect(response.body.tea_id).toBe(teamId);
      expect(response.body.tme_role).toBe("member");
    });

    it("should return 409 for duplicate team membership", async () => {
      const fixtures = await fixtureLoader.load(["users", "teams"]);
      const userId = fixtures.users[0].usr_id;
      const teamId = fixtures.teams[0].tea_id;

      // Create first membership
      await apiClient.post("/team-members", {
        usr_id: userId,
        tea_id: teamId,
        tme_role: "member",
      });

      // Attempt duplicate
      const response = await apiClient.post("/team-members", {
        usr_id: userId,
        tea_id: teamId,
        tme_role: "lead",
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain("already a member");
    });

    it("should return 400 for non-existent user", async () => {
      const fixtures = await fixtureLoader.load(["teams"]);
      const teamId = fixtures.teams[0].tea_id;

      const response = await apiClient.post("/team-members", {
        usr_id: "00000000-0000-0000-0000-000000000000",
        tea_id: teamId,
        tme_role: "member",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Foreign key violation");
    });
  });

  describe("DELETE /teams/:teamId (cascade)", () => {
    it("should cascade delete team members when team deleted", async () => {
      const fixtures = await fixtureLoader.load([
        "users",
        "teams",
        "team_members",
      ]);
      const teamId = fixtures.teams[0].tea_id;

      // Verify team members exist
      const membersBeforeResponse = await apiClient.get(
        `/team-members?teamId=${teamId}`,
      );
      expect(membersBeforeResponse.body.length).toBeGreaterThan(0);

      // Delete team
      await apiClient.delete(`/teams/${teamId}`);

      // Verify team members deleted (cascade)
      const membersAfterResponse = await apiClient.get(
        `/team-members?teamId=${teamId}`,
      );
      expect(membersAfterResponse.body.length).toBe(0);
    });
  });

  describe("GET /team-members", () => {
    it("should filter team members by team", async () => {
      await fixtureLoader.load(["users", "teams", "team_members"]);
      const fixtures = await fixtureLoader.load(["teams"]);
      const teamId = fixtures.teams[0].tea_id;

      const response = await apiClient.get(`/team-members?teamId=${teamId}`);

      expect(response.status).toBe(200);
      expect(response.body.every((member) => member.tea_id === teamId)).toBe(
        true,
      );
    });
  });
});
```

**Validation Criteria**:

- [ ] Team member CRUD operations tested
- [ ] Foreign key constraints validated
- [ ] Cascade delete behavior verified
- [ ] Duplicate prevention tested
- [ ] Team filtering working correctly

### AC-096.2: Migration Hierarchy Integration Tests

**Given** migration hierarchy requires comprehensive relationship validation
**When** Plans, Sequences, Phases, Steps, Instructions API tests are created
**Then** complete hierarchy testing is implemented including:

**Hierarchy Structure**:

```
Migrations (US-095)
  ↓
Iterations (AC-096.4)
  ↓
Plans (AC-096.2)
  ↓
Sequences (AC-096.2)
  ↓
Phases (AC-096.2)
  ↓
Steps (AC-096.2)
  ↓
Instructions (AC-096.2)
```

**Test Coverage per Level**:

1. **Plans API**: Create plan linked to iteration, validate foreign key
2. **Sequences API**: Create sequence linked to plan, validate ordering
3. **Phases API**: Create phase linked to sequence, validate hierarchy
4. **Steps API**: Create step linked to phase, validate template vs instance
5. **Instructions API**: Create instruction linked to step, validate content

**Implementation**:

```javascript
// __tests__/integration/api/migration-hierarchy.integration.test.js
const apiClient = require("../helpers/api-client");
const fixtureLoader = require("../helpers/fixture-loader");
const databaseHelper = require("../helpers/database-helper");

describe("Migration Hierarchy Integration Tests", () => {
  beforeEach(async () => {
    await databaseHelper.resetDatabase();
  });

  describe("Plans API", () => {
    it("should create plan linked to iteration", async () => {
      const fixtures = await fixtureLoader.load(["migrations", "iterations"]);
      const iterationId = fixtures.iterations[0].ite_id;

      const response = await apiClient.post("/plans", {
        pln_name: "Test Plan",
        pln_description: "Test plan description",
        ite_id: iterationId,
        pln_type: "master",
      });

      expect(response.status).toBe(201);
      expect(response.body.pln_name).toBe("Test Plan");
      expect(response.body.ite_id).toBe(iterationId);
    });

    it("should return 400 for non-existent iteration", async () => {
      const response = await apiClient.post("/plans", {
        pln_name: "Test Plan",
        ite_id: "00000000-0000-0000-0000-000000000000",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Foreign key violation");
    });

    it("should cascade delete sequences when plan deleted", async () => {
      const fixtures = await fixtureLoader.load([
        "migrations",
        "iterations",
        "plans",
        "sequences",
      ]);
      const planId = fixtures.plans[0].pln_id;

      // Delete plan
      await apiClient.delete(`/plans/${planId}`);

      // Verify sequences deleted (cascade)
      const sequencesResponse = await apiClient.get(
        `/sequences?planId=${planId}`,
      );
      expect(sequencesResponse.body.length).toBe(0);
    });
  });

  describe("Sequences API", () => {
    it("should create sequence with correct ordering", async () => {
      const fixtures = await fixtureLoader.load([
        "migrations",
        "iterations",
        "plans",
      ]);
      const planId = fixtures.plans[0].pln_id;

      const response = await apiClient.post("/sequences", {
        seq_name: "Sequence 1",
        seq_order: 1,
        pln_id: planId,
      });

      expect(response.status).toBe(201);
      expect(response.body.seq_order).toBe(1);
    });

    it("should enforce unique sequence order within plan", async () => {
      const fixtures = await fixtureLoader.load([
        "migrations",
        "iterations",
        "plans",
      ]);
      const planId = fixtures.plans[0].pln_id;

      // Create first sequence
      await apiClient.post("/sequences", {
        seq_name: "Sequence 1",
        seq_order: 1,
        pln_id: planId,
      });

      // Attempt duplicate order
      const response = await apiClient.post("/sequences", {
        seq_name: "Sequence 2",
        seq_order: 1, // Duplicate order
        pln_id: planId,
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain("sequence order");
    });
  });

  describe("Complete Hierarchy Creation", () => {
    it("should create complete migration hierarchy", async () => {
      const fixtures = await fixtureLoader.load(["migrations", "iterations"]);
      const iterationId = fixtures.iterations[0].ite_id;

      // Create plan
      const planResponse = await apiClient.post("/plans", {
        pln_name: "Complete Plan",
        ite_id: iterationId,
      });
      const planId = planResponse.body.pln_id;

      // Create sequence
      const sequenceResponse = await apiClient.post("/sequences", {
        seq_name: "Sequence 1",
        seq_order: 1,
        pln_id: planId,
      });
      const sequenceId = sequenceResponse.body.seq_id;

      // Create phase
      const phaseResponse = await apiClient.post("/phases", {
        pha_name: "Phase 1",
        pha_order: 1,
        seq_id: sequenceId,
      });
      const phaseId = phaseResponse.body.pha_id;

      // Create step
      const stepResponse = await apiClient.post("/steps", {
        sti_name: "Step 1",
        sti_order: 1,
        pha_id: phaseId,
      });
      const stepId = stepResponse.body.sti_id;

      // Create instruction
      const instructionResponse = await apiClient.post("/instructions", {
        ins_content: "Test instruction",
        ins_order: 1,
        sti_id: stepId,
      });

      // Validate complete hierarchy
      expect(planResponse.status).toBe(201);
      expect(sequenceResponse.status).toBe(201);
      expect(phaseResponse.status).toBe(201);
      expect(stepResponse.status).toBe(201);
      expect(instructionResponse.status).toBe(201);

      // Validate relationships
      expect(sequenceResponse.body.pln_id).toBe(planId);
      expect(phaseResponse.body.seq_id).toBe(sequenceId);
      expect(stepResponse.body.pha_id).toBe(phaseId);
      expect(instructionResponse.body.sti_id).toBe(stepId);
    });
  });
});
```

**Validation Criteria**:

- [ ] All 5 hierarchy levels (Plans → Instructions) tested
- [ ] Foreign key constraints validated at each level
- [ ] Cascade delete behavior verified
- [ ] Ordering constraints tested
- [ ] Complete hierarchy creation validated

### AC-096.3: Applications and Labels Integration Tests

**Given** environment management and taxonomy require testing
**When** Applications and Labels API tests are created
**Then** comprehensive CRUD testing is implemented including:

**Test Scenarios**:

1. **Applications**: CRUD operations, environment associations
2. **Labels**: Create labels, apply to entities, prevent duplicates

**Implementation**:

```javascript
// __tests__/integration/api/applications.integration.test.js
describe("Applications API Integration Tests", () => {
  it("should create application with valid data", async () => {
    const response = await apiClient.post("/applications", {
      app_name: "JIRA",
      app_description: "Issue tracking system",
      app_url: "https://jira.example.com",
    });

    expect(response.status).toBe(201);
    expect(response.body.app_name).toBe("JIRA");
  });

  it("should associate application with environment", async () => {
    const fixtures = await fixtureLoader.load(["applications", "environments"]);
    const appId = fixtures.applications[0].app_id;
    const envId = fixtures.environments[0].env_id;

    const response = await apiClient.post("/application-environments", {
      app_id: appId,
      env_id: envId,
    });

    expect(response.status).toBe(201);
  });
});

// __tests__/integration/api/labels.integration.test.js
describe("Labels API Integration Tests", () => {
  it("should create label with valid data", async () => {
    const response = await apiClient.post("/labels", {
      lab_name: "high-priority",
      lab_color: "#FF0000",
    });

    expect(response.status).toBe(201);
    expect(response.body.lab_name).toBe("high-priority");
  });

  it("should prevent duplicate label names", async () => {
    await apiClient.post("/labels", {
      lab_name: "duplicate-label",
      lab_color: "#FF0000",
    });

    const response = await apiClient.post("/labels", {
      lab_name: "duplicate-label",
      lab_color: "#00FF00",
    });

    expect(response.status).toBe(409);
  });
});
```

**Validation Criteria**:

- [ ] Applications CRUD operations tested
- [ ] Labels CRUD operations tested
- [ ] Environment associations validated
- [ ] Duplicate prevention working
- [ ] Color validation tested

### AC-096.4: Iterations and Migration Types Integration Tests

**Given** migration execution configuration requires testing
**When** Iterations, MigrationTypes, IterationTypes API tests are created
**Then** comprehensive configuration testing is implemented including:

**Test Scenarios**:

1. **Iterations**: Create iteration linked to migration, validate dates
2. **MigrationTypes**: Reference data CRUD, unique constraints
3. **IterationTypes**: Reference data CRUD, unique constraints

**Implementation**:

```javascript
// __tests__/integration/api/iterations.integration.test.js
describe("Iterations API Integration Tests", () => {
  it("should create iteration linked to migration", async () => {
    const fixtures = await fixtureLoader.load(["migrations"]);
    const migrationId = fixtures.migrations[0].mig_id;

    const response = await apiClient.post("/iterations", {
      ite_name: "Iteration 1",
      ite_start_date: "2025-10-01",
      ite_end_date: "2025-10-15",
      mig_id: migrationId,
    });

    expect(response.status).toBe(201);
    expect(response.body.ite_name).toBe("Iteration 1");
    expect(response.body.mig_id).toBe(migrationId);
  });

  it("should validate start_date before end_date", async () => {
    const fixtures = await fixtureLoader.load(["migrations"]);
    const migrationId = fixtures.migrations[0].mig_id;

    const response = await apiClient.post("/iterations", {
      ite_name: "Invalid Iteration",
      ite_start_date: "2025-10-15",
      ite_end_date: "2025-10-01", // End before start
      mig_id: migrationId,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("end_date must be after start_date");
  });

  it("should cascade delete plans when iteration deleted", async () => {
    const fixtures = await fixtureLoader.load([
      "migrations",
      "iterations",
      "plans",
    ]);
    const iterationId = fixtures.iterations[0].ite_id;

    // Delete iteration
    await apiClient.delete(`/iterations/${iterationId}`);

    // Verify plans deleted (cascade)
    const plansResponse = await apiClient.get(
      `/plans?iterationId=${iterationId}`,
    );
    expect(plansResponse.body.length).toBe(0);
  });
});
```

**Validation Criteria**:

- [ ] Iterations CRUD operations tested
- [ ] Date validation working
- [ ] MigrationTypes reference data tested
- [ ] IterationTypes reference data tested
- [ ] Cascade behavior validated

### AC-096.5: System Configuration Integration Tests

**Given** system-wide configuration requires validation
**When** SystemConfiguration, UrlConfiguration, Controls API tests are created
**Then** comprehensive configuration testing is implemented including:

**Test Scenarios**:

1. **SystemConfiguration**: CRUD operations, validation rules
2. **UrlConfiguration**: URL validation, template testing
3. **Controls**: Admin controls CRUD, permission validation

**Implementation**:

```javascript
// __tests__/integration/api/system-configuration.integration.test.js
describe("SystemConfiguration API Integration Tests", () => {
  it("should create configuration with valid data", async () => {
    const response = await apiClient.post("/system-configuration", {
      cfg_key: "smtp_host",
      cfg_value: "smtp.example.com",
      cfg_type: "string",
    });

    expect(response.status).toBe(201);
    expect(response.body.cfg_key).toBe("smtp_host");
  });

  it("should prevent duplicate configuration keys", async () => {
    await apiClient.post("/system-configuration", {
      cfg_key: "duplicate_key",
      cfg_value: "value1",
    });

    const response = await apiClient.post("/system-configuration", {
      cfg_key: "duplicate_key",
      cfg_value: "value2",
    });

    expect(response.status).toBe(409);
  });

  it("should validate configuration value types", async () => {
    const response = await apiClient.post("/system-configuration", {
      cfg_key: "max_connections",
      cfg_value: "not_a_number",
      cfg_type: "integer",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("type mismatch");
  });
});
```

**Validation Criteria**:

- [ ] SystemConfiguration CRUD tested
- [ ] UrlConfiguration CRUD tested
- [ ] Controls CRUD tested
- [ ] Type validation working
- [ ] Duplicate prevention tested

### AC-096.6: Comprehensive Error Scenario Coverage

**Given** comprehensive error handling requires validation
**When** error scenarios are tested across all 15 endpoints
**Then** complete HTTP status code coverage is implemented including:

**Error Coverage Requirements**:

- **400 Bad Request**: Missing required fields, invalid data types, validation failures
- **404 Not Found**: Non-existent resource lookups
- **409 Conflict**: Unique constraint violations, duplicate entries
- **500 Internal Server Error**: Database errors, unexpected failures

**Implementation**:

```javascript
// __tests__/integration/api/error-scenarios.integration.test.js
describe("Comprehensive Error Scenario Coverage", () => {
  describe("400 Bad Request Scenarios", () => {
    it("should return 400 for missing required fields", async () => {
      const response = await apiClient.post("/plans", {
        pln_name: "Test Plan",
        // Missing ite_id
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("ite_id is required");
    });

    it("should return 400 for invalid UUID format", async () => {
      const response = await apiClient.get("/plans/invalid-uuid");

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid UUID");
    });
  });

  describe("404 Not Found Scenarios", () => {
    it("should return 404 for non-existent resources", async () => {
      const endpoints = [
        "/plans/00000000-0000-0000-0000-000000000000",
        "/sequences/00000000-0000-0000-0000-000000000000",
        "/phases/00000000-0000-0000-0000-000000000000",
        "/steps/00000000-0000-0000-0000-000000000000",
        "/instructions/00000000-0000-0000-0000-000000000000",
      ];

      for (const endpoint of endpoints) {
        const response = await apiClient.get(endpoint);
        expect(response.status).toBe(404);
      }
    });
  });

  describe("409 Conflict Scenarios", () => {
    it("should return 409 for unique constraint violations", async () => {
      const fixtures = await fixtureLoader.load([
        "migrations",
        "iterations",
        "plans",
      ]);
      const planId = fixtures.plans[0].pln_id;

      // Create sequence with order 1
      await apiClient.post("/sequences", {
        seq_name: "Sequence 1",
        seq_order: 1,
        pln_id: planId,
      });

      // Attempt duplicate order
      const response = await apiClient.post("/sequences", {
        seq_name: "Sequence 2",
        seq_order: 1,
        pln_id: planId,
      });

      expect(response.status).toBe(409);
    });
  });
});
```

**Validation Criteria**:

- [ ] 100% HTTP status code coverage
- [ ] All 400 scenarios tested (missing fields, invalid types)
- [ ] All 404 scenarios tested (non-existent resources)
- [ ] All 409 scenarios tested (unique constraints)
- [ ] Error messages descriptive and actionable

### AC-096.7: Test Execution Performance

**Given** rapid feedback is critical for CI/CD
**When** complete test suite executes
**Then** performance targets are met including:

**Performance Requirements**:

- [ ] Total execution time: <3 minutes (for 20 endpoints)
- [ ] Average test execution: <500ms per test
- [ ] Database reset time: <10 seconds
- [ ] ~150 total test scenarios
- [ ] 100% pass rate

**Validation Criteria**:

- [ ] Test suite completes in <3 minutes
- [ ] No flaky tests (100% consistent results)
- [ ] Database cleanup successful
- [ ] No memory leaks or connection leaks
- [ ] CI/CD ready for every commit

## Technical Implementation

### Test Organization

```
__tests__/integration/api/
├── team-members.integration.test.js       # AC-096.1
├── applications.integration.test.js       # AC-096.3
├── labels.integration.test.js             # AC-096.3
├── iterations.integration.test.js         # AC-096.4
├── migration-types.integration.test.js    # AC-096.4
├── iteration-types.integration.test.js    # AC-096.4
├── plans.integration.test.js              # AC-096.2
├── sequences.integration.test.js          # AC-096.2
├── phases.integration.test.js             # AC-096.2
├── steps.integration.test.js              # AC-096.2
├── instructions.integration.test.js       # AC-096.2
├── system-configuration.integration.test.js  # AC-096.5
├── url-configuration.integration.test.js     # AC-096.5
├── controls.integration.test.js              # AC-096.5
└── error-scenarios.integration.test.js       # AC-096.6
```

### Fixture Expansion

**New Fixtures Required**:

```javascript
// __tests__/integration/fixtures/team_members.fixture.js
// __tests__/integration/fixtures/applications.fixture.js
// __tests__/integration/fixtures/labels.fixture.js
// __tests__/integration/fixtures/iterations.fixture.js
// __tests__/integration/fixtures/plans.fixture.js
// __tests__/integration/fixtures/sequences.fixture.js
// __tests__/integration/fixtures/phases.fixture.js
// __tests__/integration/fixtures/steps.fixture.js
// __tests__/integration/fixtures/instructions.fixture.js
```

**Updated Load Order**:

```javascript
this.loadOrder = [
  "users",
  "teams",
  "status",
  "environments", // Foundation (US-095)
  "team_members",
  "applications",
  "labels", // AC-096.1, AC-096.3
  "migrations",
  "migration_types",
  "iteration_types", // AC-096.4
  "iterations", // AC-096.4
  "plans", // AC-096.2
  "sequences", // AC-096.2
  "phases", // AC-096.2
  "steps", // AC-096.2
  "instructions", // AC-096.2
  "system_configuration",
  "url_configuration",
  "controls", // AC-096.5
];
```

## Dependencies and Integration Points

### Prerequisites

**Completed Stories**:

- [ ] US-095: Jest Integration Test Infrastructure (Sprint 9, Week 1-2)

**Infrastructure Requirements**:

- [ ] All 15 API endpoints deployed to Confluence
- [ ] Database schema includes all 15 entities
- [ ] Test database isolated and functional
- [ ] Fixtures for all 15 entities created

### Integration Points

**Builds upon**:

- US-095 test infrastructure (API client, database helper, fixture loader)
- OpenAPI specification v2.12.0 (endpoint contracts)
- Database schema (foreign key relationships)

**Enables**:

- US-097: Advanced API Integration Tests (Sprint 10)
- US-099: Security & Performance Integration Tests (Sprint 10)

## Risk Assessment

### Technical Risks

1. **Complex Relationship Validation**
   - **Risk**: Hierarchy testing (7 levels) introduces complexity
   - **Impact**: HIGH - Flaky tests, maintenance burden
   - **Mitigation**: Comprehensive fixtures, clear test patterns
   - **Likelihood**: Medium | **Severity**: Medium

2. **Test Data Management**
   - **Risk**: 15 new fixture files increase maintenance overhead
   - **Impact**: MEDIUM - Fixture drift, schema changes
   - **Mitigation**: Automated fixture validation, migration scripts
   - **Likelihood**: Medium | **Severity**: Medium

3. **Performance Degradation**
   - **Risk**: 150 tests exceed 3-minute target
   - **Impact**: MEDIUM - Slow CI/CD feedback
   - **Mitigation**: Parallel execution, optimized database reset
   - **Likelihood**: Low | **Severity**: Medium

### Business Risks

1. **Implementation Complexity**
   - **Risk**: 13-point story may exceed sprint capacity
   - **Impact**: HIGH - Sprint commitment risk
   - **Mitigation**: Experienced team, phased implementation
   - **Likelihood**: Medium | **Severity**: High

## Success Metrics

### Sprint 9 Completion Criteria

**Coverage Metrics**:

- [ ] 20/31 API endpoints tested (65% coverage)
- [ ] 150+ test scenarios implemented
- [ ] 100% HTTP status code coverage
- [ ] 100% foreign key relationship validation
- [ ] 100% cascade delete behavior validation

**Performance Metrics**:

- [ ] Test execution time <3 minutes
- [ ] Database reset <10 seconds
- [ ] 100% test pass rate
- [ ] Zero flaky tests
- [ ] CI/CD integration successful

**Quality Metrics**:

- [ ] Each endpoint has ≥5 test scenarios
- [ ] Error messages actionable
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Team training complete

## Quality Gates

### Code Quality

- [ ] All 15 test files follow naming convention
- [ ] Consistent test structure across files
- [ ] Comprehensive JSDoc comments
- [ ] ESLint passes with zero errors
- [ ] Resource cleanup verified

### Testing Quality

- [ ] CRUD operations validated for all entities
- [ ] Foreign key constraints tested
- [ ] Cascade delete behavior verified
- [ ] Error scenarios comprehensive
- [ ] Relationship integrity validated

### Documentation Quality

- [ ] Test patterns documented
- [ ] Fixture format explained
- [ ] Troubleshooting guide updated
- [ ] API endpoint coverage matrix created
- [ ] Integration test README updated

## Implementation Notes

### Development Phases

**Week 3 (Days 1-5): Team Management & Configuration**

- Day 1: TeamMembers, Applications tests (AC-096.1, AC-096.3)
- Day 2: Labels, Iterations tests (AC-096.3, AC-096.4)
- Day 3: MigrationTypes, IterationTypes, SystemConfiguration (AC-096.4, AC-096.5)
- Day 4: UrlConfiguration, Controls tests (AC-096.5)
- Day 5: Buffer, refinement

**Week 4 (Days 1-5): Migration Hierarchy & Validation**

- Day 1: Plans, Sequences tests (AC-096.2)
- Day 2: Phases, Steps tests (AC-096.2)
- Day 3: Instructions, complete hierarchy validation (AC-096.2)
- Day 4: Error scenarios, performance optimization (AC-096.6, AC-096.7)
- Day 5: Documentation, code review, final validation

### Testing Strategy

**Hierarchy Testing Approach**:

1. Test each level independently (Plans, Sequences, Phases, Steps, Instructions)
2. Test complete hierarchy creation (end-to-end)
3. Test cascade delete from each level
4. Test foreign key constraints at each level
5. Test ordering and unique constraints

**Fixture Management**:

- Minimal data per entity (5-10 records)
- Reusable fixture sets for common scenarios
- Automated fixture validation on load
- Clear fixture dependency documentation

## Related Documentation

- **US-095**: Jest Integration Test Infrastructure
- **Jest Integration Test Plan**: `docs/testing/JEST_INTEGRATION_TEST_PLAN.md`
- **OpenAPI Specification**: `docs/api/openapi.yaml` (v2.12.0)
- **Database Schema**: `db/migrations/` (Liquibase)
- **Entity Relationship Diagram**: `docs/architecture/entity-relationships.md`

## Change Log

| Date       | Version | Changes                             | Author |
| ---------- | ------- | ----------------------------------- | ------ |
| 2025-10-01 | 1.0     | Initial story creation for Sprint 9 | System |

---

**Story Status**: Blocked by US-095
**Next Action**: Begin after US-095 completion (Sprint 9, Week 3)
**Risk Level**: Medium (complex relationships, comprehensive coverage)
**Strategic Priority**: High (65% API coverage achieved)
**Dependencies**: US-095 (foundation infrastructure)

**Expected Outcomes**:

- 65% API endpoint coverage (20/31 endpoints)
- 150+ comprehensive test scenarios
- Complete migration hierarchy validation
- <3 minute test execution time
- Foundation for US-097, US-099 advanced testing
