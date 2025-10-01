# US-097: Advanced API Integration Tests

## Story Metadata

**Story ID**: US-097
**Epic**: Jest Integration Testing - Dual-Track Testing Strategy
**Sprint**: Sprint 10 (Week 1-2)
**Priority**: P2 (MEDIUM - Advanced feature validation)
**Effort**: 8 points
**Status**: Blocked by US-096
**Timeline**: 2 weeks (Sprint 10, Week 1-2)
**Owner**: QA Engineering + Backend Development Team
**Dependencies**: US-096 (Core Entity API Integration Tests)
**Risk**: MEDIUM (Complex aggregation, file uploads, multi-entity workflows)

## Problem Statement

### Current Coverage Gap

After US-096 achieves 65% API coverage (20/31 endpoints) with comprehensive CRUD and relationship validation, critical advanced functionality remains untested:

**Untested Complex Endpoints** (5-7 endpoints):

- **EnhancedSteps**: Aggregated data across 7-level hierarchy (migrations → instructions)
- **Import/ImportQueue**: File upload functionality, batch processing validation
- **StepView**: Email generation with dynamic template rendering
- **Dashboard**: Real-time metrics aggregation across multiple entities
- **AdminVersion/DatabaseVersions**: System health and version reporting
- **Relationships (TeamsRelationship/UsersRelationship)**: Complex relationship management

**Business Impact of Advanced Feature Gap**:

- **Migration Risk**: EnhancedSteps aggregation (1,443+ step instances) untested
- **Import Risk**: File upload failures could corrupt production data
- **Communication Risk**: Email generation errors affect user notifications
- **Monitoring Risk**: Dashboard metrics inaccuracy impacts decision-making
- **Deployment Risk**: No automated validation for complex multi-entity workflows

### Proposed Solution

Implement advanced integration tests for complex endpoints requiring:

**Advanced Testing Capabilities**:

- **Aggregation Validation**: Multi-table JOIN queries, nested data structures
- **File Upload Testing**: Multipart/form-data handling, validation, error scenarios
- **Workflow Validation**: Multi-step processes (import → validation → processing → completion)
- **Template Testing**: Dynamic email generation with variable substitution
- **Performance Validation**: Response times for complex queries (<200ms)

**Strategic Value**:

- **80% Total Coverage**: 25+/31 API endpoints tested (vs 65% after US-096)
- **Complex Workflow Safety**: Multi-step import processes validated
- **Aggregation Integrity**: 7-level hierarchy queries tested
- **Production Readiness**: Email templates, dashboards, imports validated
- **Performance Confidence**: Complex query response times benchmarked

## User Story

**As a** Backend Developer working on UMIG complex features (aggregations, file uploads, email generation, dashboards)
**I want** comprehensive integration tests validating EnhancedSteps aggregation, Import file uploads, StepView email generation, and Dashboard metrics
**So that** I can confidently modify complex multi-entity queries and workflows knowing response times, data accuracy, and error scenarios are automatically validated without manual testing of critical production features

### Value Statement

This story increases automated API integration testing from 65% to 80%+ coverage (25+/31 endpoints), enabling developers to validate complex aggregation queries (EnhancedSteps across 7 hierarchy levels), file upload workflows (Import/ImportQueue), email generation (StepView templates), and dashboard metrics instantly via `npm run test:js:integration`, preventing production issues in advanced features while establishing performance baselines (<200ms) for complex queries.

## Acceptance Criteria

### AC-097.1: EnhancedSteps Aggregation Testing

**Given** EnhancedSteps aggregates data across 7-level hierarchy
**When** EnhancedSteps API integration tests are created
**Then** comprehensive aggregation validation is implemented including:

**Test Scenarios**:

1. Retrieve enhanced steps with complete aggregated data
2. Validate aggregation includes: migration name, iteration name, plan name, sequence name, phase name, step details, instruction count
3. Filter enhanced steps by planId
4. Filter enhanced steps by sequenceId
5. Validate performance (<200ms for 100+ steps)
6. Validate pagination for large result sets

**Implementation**:

```javascript
// __tests__/integration/api/enhanced-steps.integration.test.js
const apiClient = require("../helpers/api-client");
const fixtureLoader = require("../helpers/fixture-loader");
const databaseHelper = require("../helpers/database-helper");

describe("EnhancedSteps API Integration Tests", () => {
  beforeEach(async () => {
    await databaseHelper.resetDatabase();
  });

  describe("GET /enhanced-steps", () => {
    it("should retrieve enhanced steps with complete aggregated data", async () => {
      // Load complete hierarchy
      await fixtureLoader.load([
        "migrations",
        "iterations",
        "plans",
        "sequences",
        "phases",
        "steps",
        "instructions",
      ]);

      const startTime = Date.now();
      const response = await apiClient.get("/enhanced-steps");
      const executionTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Validate aggregated data structure
      const enhancedStep = response.body[0];
      expect(enhancedStep).toMatchObject({
        sti_id: expect.any(String),
        sti_name: expect.any(String),
        sti_order: expect.any(Number),
        sti_type: expect.any(String),

        // Phase aggregation
        pha_id: expect.any(String),
        pha_name: expect.any(String),
        pha_order: expect.any(Number),

        // Sequence aggregation
        seq_id: expect.any(String),
        seq_name: expect.any(String),
        seq_order: expect.any(Number),

        // Plan aggregation
        pln_id: expect.any(String),
        pln_name: expect.any(String),

        // Iteration aggregation
        ite_id: expect.any(String),
        ite_name: expect.any(String),

        // Migration aggregation
        mig_id: expect.any(String),
        mig_name: expect.any(String),

        // Instruction count
        instruction_count: expect.any(Number),
      });

      // Performance validation
      expect(executionTime).toBeLessThan(200); // <200ms response time
    });

    it("should filter enhanced steps by planId", async () => {
      const fixtures = await fixtureLoader.load([
        "migrations",
        "iterations",
        "plans",
        "sequences",
        "phases",
        "steps",
        "instructions",
      ]);
      const planId = fixtures.plans[0].pln_id;

      const response = await apiClient.get(`/enhanced-steps?planId=${planId}`);

      expect(response.status).toBe(200);
      expect(response.body.every((step) => step.pln_id === planId)).toBe(true);
    });

    it("should validate instruction count accuracy", async () => {
      const fixtures = await fixtureLoader.load([
        "migrations",
        "iterations",
        "plans",
        "sequences",
        "phases",
        "steps",
        "instructions",
      ]);

      const response = await apiClient.get("/enhanced-steps");
      const enhancedStep = response.body[0];

      // Verify instruction count by querying directly
      const instructionCountResult = await databaseHelper.query(
        "SELECT COUNT(*) FROM tbl_instructions WHERE sti_id = $1",
        [enhancedStep.sti_id],
      );
      const actualCount = parseInt(instructionCountResult.rows[0].count);

      expect(enhancedStep.instruction_count).toBe(actualCount);
    });

    it("should handle pagination for large result sets", async () => {
      // Create large dataset
      await fixtureLoader.loadAll();

      const response = await apiClient.get(
        "/enhanced-steps?page=1&pageSize=50",
      );

      expect(response.status).toBe(200);
      expect(response.body.length).toBeLessThanOrEqual(50);
      expect(response.body).toHaveProperty("pagination");
      expect(response.body.pagination).toMatchObject({
        page: 1,
        pageSize: 50,
        totalCount: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it("should validate performance with 100+ steps", async () => {
      // Load fixtures with 100+ steps
      await fixtureLoader.loadAll();

      const startTime = Date.now();
      const response = await apiClient.get("/enhanced-steps");
      const executionTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(100);
      expect(executionTime).toBeLessThan(500); // <500ms for large dataset
    });
  });
});
```

**Validation Criteria**:

- [ ] Aggregation across all 7 hierarchy levels validated
- [ ] Data accuracy verified against direct database queries
- [ ] Performance <200ms for standard queries
- [ ] Performance <500ms for 100+ steps
- [ ] Pagination working correctly
- [ ] Filtering by planId, sequenceId functional

### AC-097.2: Import/ImportQueue File Upload Testing

**Given** Import functionality requires file upload validation
**When** Import/ImportQueue API integration tests are created
**Then** comprehensive file upload testing is implemented including:

**Test Scenarios**:

1. Upload valid CSV/Excel file for import
2. Validate file format (CSV, XLSX)
3. Reject invalid file formats
4. Validate file size limits
5. Process import queue asynchronously
6. Handle import errors gracefully
7. Validate import status transitions (queued → processing → completed → failed)

**Implementation**:

```javascript
// __tests__/integration/api/import.integration.test.js
const apiClient = require("../helpers/api-client");
const fixtureLoader = require("../helpers/fixture-loader");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

describe("Import/ImportQueue API Integration Tests", () => {
  beforeEach(async () => {
    await databaseHelper.resetDatabase();
  });

  describe("POST /import (file upload)", () => {
    it("should upload valid CSV file for import", async () => {
      const form = new FormData();
      const csvPath = path.join(__dirname, "../fixtures/files/valid-steps.csv");
      form.append("file", fs.createReadStream(csvPath));
      form.append("importType", "steps");

      const response = await apiClient
        .post("/import")
        .send(form)
        .set(form.getHeaders());

      expect(response.status).toBe(202); // Accepted
      expect(response.body).toMatchObject({
        importId: expect.any(String),
        status: "queued",
        fileName: "valid-steps.csv",
        importType: "steps",
      });
    });

    it("should reject invalid file format", async () => {
      const form = new FormData();
      const invalidPath = path.join(__dirname, "../fixtures/files/invalid.txt");
      form.append("file", fs.createReadStream(invalidPath));
      form.append("importType", "steps");

      const response = await apiClient
        .post("/import")
        .send(form)
        .set(form.getHeaders());

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid file format");
    });

    it("should reject files exceeding size limit", async () => {
      const form = new FormData();
      // Create oversized file (>10MB)
      const largePath = path.join(
        __dirname,
        "../fixtures/files/large-file.csv",
      );
      form.append("file", fs.createReadStream(largePath));
      form.append("importType", "steps");

      const response = await apiClient
        .post("/import")
        .send(form)
        .set(form.getHeaders());

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("File size exceeds limit");
    });
  });

  describe("GET /import-queue", () => {
    it("should retrieve import queue status", async () => {
      // Upload file
      const form = new FormData();
      const csvPath = path.join(__dirname, "../fixtures/files/valid-steps.csv");
      form.append("file", fs.createReadStream(csvPath));
      form.append("importType", "steps");

      const uploadResponse = await apiClient
        .post("/import")
        .send(form)
        .set(form.getHeaders());

      const importId = uploadResponse.body.importId;

      // Check queue status
      const response = await apiClient.get(`/import-queue/${importId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        importId: importId,
        status: expect.stringMatching(/queued|processing|completed|failed/),
        fileName: "valid-steps.csv",
        createdAt: expect.any(String),
      });
    });

    it("should validate import status transitions", async () => {
      // Upload file
      const uploadResponse = await apiClient.post("/import", {
        /* file upload */
      });
      const importId = uploadResponse.body.importId;

      // Poll status until completion
      let status = "queued";
      let attempts = 0;
      const maxAttempts = 20;

      while (
        status !== "completed" &&
        status !== "failed" &&
        attempts < maxAttempts
      ) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms
        const statusResponse = await apiClient.get(`/import-queue/${importId}`);
        status = statusResponse.body.status;
        attempts++;
      }

      expect(["completed", "failed"]).toContain(status);

      // If completed, verify imported data
      if (status === "completed") {
        const importedDataResponse = await apiClient.get(
          `/import/${importId}/data`,
        );
        expect(importedDataResponse.status).toBe(200);
        expect(importedDataResponse.body.recordsImported).toBeGreaterThan(0);
      }
    });

    it("should handle import errors gracefully", async () => {
      // Upload file with invalid data
      const form = new FormData();
      const invalidDataPath = path.join(
        __dirname,
        "../fixtures/files/invalid-data.csv",
      );
      form.append("file", fs.createReadStream(invalidDataPath));
      form.append("importType", "steps");

      const uploadResponse = await apiClient
        .post("/import")
        .send(form)
        .set(form.getHeaders());

      const importId = uploadResponse.body.importId;

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const statusResponse = await apiClient.get(`/import-queue/${importId}`);

      expect(statusResponse.body.status).toBe("failed");
      expect(statusResponse.body.errorMessage).toBeDefined();
      expect(statusResponse.body.errorDetails).toBeDefined();
    });
  });
});
```

**Validation Criteria**:

- [ ] File upload functionality tested
- [ ] File format validation working (CSV, XLSX)
- [ ] File size limits enforced
- [ ] Import queue status tracking validated
- [ ] Status transitions tested (queued → processing → completed/failed)
- [ ] Error handling comprehensive

### AC-097.3: StepView Email Generation Testing

**Given** StepView generates dynamic email templates
**When** StepView API integration tests are created
**Then** comprehensive email generation validation is implemented including:

**Test Scenarios**:

1. Generate email view for step with complete data
2. Validate template variable substitution
3. Validate HTML email rendering
4. Validate email includes: migration name, iteration, plan, sequence, phase, step, instructions
5. Handle missing optional data gracefully
6. Validate performance (<500ms for email generation)

**Implementation**:

```javascript
// __tests__/integration/api/step-view.integration.test.js
const apiClient = require("../helpers/api-client");
const fixtureLoader = require("../helpers/fixture-loader");

describe("StepView API Integration Tests", () => {
  beforeEach(async () => {
    await databaseHelper.resetDatabase();
  });

  describe("GET /step-view/:stepId", () => {
    it("should generate email view with complete data", async () => {
      const fixtures = await fixtureLoader.load([
        "migrations",
        "iterations",
        "plans",
        "sequences",
        "phases",
        "steps",
        "instructions",
        "email_templates",
      ]);
      const stepId = fixtures.steps[0].sti_id;

      const startTime = Date.now();
      const response = await apiClient.get(`/step-view/${stepId}`);
      const executionTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        stepId: stepId,
        emailHtml: expect.any(String),
        emailSubject: expect.any(String),
        templateVariables: expect.any(Object),
      });

      // Validate HTML structure
      expect(response.body.emailHtml).toContain("<!DOCTYPE html>");
      expect(response.body.emailHtml).toContain(fixtures.steps[0].sti_name);

      // Validate template variables populated
      expect(response.body.templateVariables).toMatchObject({
        migrationName: expect.any(String),
        iterationName: expect.any(String),
        planName: expect.any(String),
        sequenceName: expect.any(String),
        phaseName: expect.any(String),
        stepName: expect.any(String),
        instructions: expect.any(Array),
      });

      // Performance validation
      expect(executionTime).toBeLessThan(500); // <500ms
    });

    it("should validate template variable substitution", async () => {
      const fixtures = await fixtureLoader.load([
        "migrations",
        "iterations",
        "plans",
        "sequences",
        "phases",
        "steps",
        "instructions",
        "email_templates",
      ]);
      const stepId = fixtures.steps[0].sti_id;
      const stepName = fixtures.steps[0].sti_name;

      const response = await apiClient.get(`/step-view/${stepId}`);

      expect(response.status).toBe(200);

      // Validate variables replaced in HTML
      expect(response.body.emailHtml).toContain(stepName);
      expect(response.body.emailHtml).not.toContain("{{stepName}}");
      expect(response.body.emailHtml).not.toContain("{{migrationName}}");
    });

    it("should handle missing optional data gracefully", async () => {
      // Create step without instructions
      const fixtures = await fixtureLoader.load([
        "migrations",
        "iterations",
        "plans",
        "sequences",
        "phases",
        "steps",
        "email_templates",
      ]);
      const stepId = fixtures.steps[0].sti_id;

      const response = await apiClient.get(`/step-view/${stepId}`);

      expect(response.status).toBe(200);
      expect(response.body.templateVariables.instructions).toEqual([]);
      expect(response.body.emailHtml).toContain("No instructions available");
    });

    it("should return 404 for non-existent step", async () => {
      const response = await apiClient.get(
        "/step-view/00000000-0000-0000-0000-000000000000",
      );

      expect(response.status).toBe(404);
    });
  });
});
```

**Validation Criteria**:

- [ ] Email generation tested
- [ ] Template variable substitution validated
- [ ] HTML structure correct
- [ ] Missing data handled gracefully
- [ ] Performance <500ms
- [ ] 404 for non-existent steps

### AC-097.4: Dashboard Metrics Aggregation Testing

**Given** Dashboard aggregates real-time metrics across entities
**When** Dashboard API integration tests are created
**Then** comprehensive metrics validation is implemented including:

**Test Scenarios**:

1. Retrieve dashboard metrics with complete aggregated data
2. Validate metrics include: total migrations, active iterations, total plans, total steps, completion percentages
3. Validate real-time data accuracy
4. Validate performance (<300ms for dashboard queries)
5. Filter dashboard by migration or iteration

**Implementation**:

```javascript
// __tests__/integration/api/dashboard.integration.test.js
const apiClient = require("../helpers/api-client");
const fixtureLoader = require("../helpers/fixture-loader");

describe("Dashboard API Integration Tests", () => {
  beforeEach(async () => {
    await databaseHelper.resetDatabase();
  });

  describe("GET /dashboard", () => {
    it("should retrieve dashboard metrics with complete data", async () => {
      await fixtureLoader.loadAll();

      const startTime = Date.now();
      const response = await apiClient.get("/dashboard");
      const executionTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        totalMigrations: expect.any(Number),
        activeMigrations: expect.any(Number),
        totalIterations: expect.any(Number),
        activeIterations: expect.any(Number),
        totalPlans: expect.any(Number),
        totalSequences: expect.any(Number),
        totalPhases: expect.any(Number),
        totalSteps: expect.any(Number),
        totalInstructions: expect.any(Number),
        completionPercentage: expect.any(Number),
      });

      // Performance validation
      expect(executionTime).toBeLessThan(300); // <300ms
    });

    it("should validate metrics accuracy against database", async () => {
      await fixtureLoader.loadAll();

      const response = await apiClient.get("/dashboard");

      // Verify total migrations
      const migrationsResult = await databaseHelper.query(
        "SELECT COUNT(*) FROM tbl_migrations_master",
      );
      const totalMigrations = parseInt(migrationsResult.rows[0].count);
      expect(response.body.totalMigrations).toBe(totalMigrations);

      // Verify total steps
      const stepsResult = await databaseHelper.query(
        "SELECT COUNT(*) FROM tbl_steps_master",
      );
      const totalSteps = parseInt(stepsResult.rows[0].count);
      expect(response.body.totalSteps).toBe(totalSteps);
    });

    it("should filter dashboard by migration", async () => {
      const fixtures = await fixtureLoader.loadAll();
      const migrationId = fixtures.migrations[0].mig_id;

      const response = await apiClient.get(
        `/dashboard?migrationId=${migrationId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.totalMigrations).toBe(1);
    });
  });
});
```

**Validation Criteria**:

- [ ] Dashboard metrics aggregation tested
- [ ] Data accuracy verified
- [ ] Performance <300ms
- [ ] Filtering by migration/iteration working
- [ ] Completion percentages calculated correctly

### AC-097.5: System Health & Version Testing

**Given** System health and version information critical for monitoring
**When** AdminVersion and DatabaseVersions API tests are created
**Then** comprehensive health validation is implemented including:

**Test Scenarios**:

1. Retrieve system version information
2. Retrieve database migration versions
3. Validate Liquibase changelog tracking
4. Validate system health status

**Implementation**:

```javascript
// __tests__/integration/api/admin-version.integration.test.js
describe("AdminVersion API Integration Tests", () => {
  it("should retrieve system version information", async () => {
    const response = await apiClient.get("/admin-version");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      applicationVersion: expect.any(String),
      apiVersion: expect.any(String),
      databaseVersion: expect.any(String),
      scriptRunnerVersion: expect.any(String),
      confluenceVersion: expect.any(String),
    });
  });
});

// __tests__/integration/api/database-versions.integration.test.js
describe("DatabaseVersions API Integration Tests", () => {
  it("should retrieve database migration versions", async () => {
    const response = await apiClient.get("/database-versions");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    const version = response.body[0];
    expect(version).toMatchObject({
      changesetId: expect.any(String),
      author: expect.any(String),
      fileName: expect.any(String),
      dateExecuted: expect.any(String),
      orderExecuted: expect.any(Number),
    });
  });

  it("should validate Liquibase changelog tracking", async () => {
    const response = await apiClient.get("/database-versions");

    // Verify DATABASECHANGELOG table tracked
    const changelogResult = await databaseHelper.query(
      "SELECT COUNT(*) FROM databasechangelog",
    );
    const changelogCount = parseInt(changelogResult.rows[0].count);

    expect(response.body.length).toBe(changelogCount);
  });
});
```

**Validation Criteria**:

- [ ] System version endpoint tested
- [ ] Database versions endpoint tested
- [ ] Liquibase tracking validated
- [ ] Health status monitoring functional

### AC-097.6: Relationship Management Testing

**Given** Complex relationship APIs require validation
**When** TeamsRelationship and UsersRelationship API tests are created
**Then** comprehensive relationship management testing is implemented

**Test Scenarios**:

1. Create complex team relationships
2. Create user role assignments
3. Validate relationship constraints
4. Test relationship cascades

**Validation Criteria**:

- [ ] TeamsRelationship CRUD tested
- [ ] UsersRelationship CRUD tested
- [ ] Constraints validated
- [ ] Cascade behavior verified

### AC-097.7: Test Execution Performance

**Given** rapid feedback critical for CI/CD
**When** complete advanced test suite executes
**Then** performance targets met including:

**Performance Requirements**:

- [ ] Total execution time: <4 minutes (for 25+ endpoints)
- [ ] Complex query performance: <200ms (EnhancedSteps)
- [ ] Email generation: <500ms (StepView)
- [ ] Dashboard metrics: <300ms
- [ ] File upload: <1 second
- [ ] ~200 total test scenarios
- [ ] 100% pass rate

## Technical Implementation

### Test Organization

```
__tests__/integration/api/
├── enhanced-steps.integration.test.js       # AC-097.1
├── import.integration.test.js               # AC-097.2
├── import-queue.integration.test.js         # AC-097.2
├── step-view.integration.test.js            # AC-097.3
├── dashboard.integration.test.js            # AC-097.4
├── admin-version.integration.test.js        # AC-097.5
├── database-versions.integration.test.js    # AC-097.5
├── teams-relationship.integration.test.js   # AC-097.6
└── users-relationship.integration.test.js   # AC-097.6
```

### Fixture Files

```
__tests__/integration/fixtures/files/
├── valid-steps.csv           # Valid import file
├── valid-steps.xlsx          # Valid Excel import
├── invalid-data.csv          # Invalid data for error testing
├── invalid.txt               # Invalid format
└── large-file.csv            # Oversized file (>10MB)
```

## Dependencies and Integration Points

### Prerequisites

**Completed Stories**:

- [ ] US-095: Jest Integration Test Infrastructure
- [ ] US-096: Core Entity API Integration Tests

**Infrastructure Requirements**:

- [ ] MailHog configured for email testing
- [ ] File upload directory configured
- [ ] Database performance tuning for complex queries

### Integration Points

**Builds upon**:

- US-095/US-096 test infrastructure
- EnhancedSteps aggregation queries
- Import file processing
- Email template engine
- Dashboard metrics calculation

**Enables**:

- US-098: Security & Performance Integration Tests

## Risk Assessment

### Technical Risks

1. **Complex Query Performance**
   - **Risk**: EnhancedSteps queries exceed 200ms target
   - **Impact**: HIGH - Production performance issues
   - **Mitigation**: Database indexing, query optimization
   - **Likelihood**: Medium | **Severity**: High

2. **File Upload Complexity**
   - **Risk**: Multipart form-data testing introduces complexity
   - **Impact**: MEDIUM - Test flakiness
   - **Mitigation**: Robust fixtures, error handling
   - **Likelihood**: Medium | **Severity**: Medium

## Success Metrics

### Sprint 10 Week 2 Completion Criteria

**Coverage Metrics**:

- [ ] 25+/31 API endpoints tested (80%+ coverage)
- [ ] 200+ test scenarios implemented
- [ ] Performance baselines established
- [ ] File upload scenarios comprehensive
- [ ] Email generation validated

**Performance Metrics**:

- [ ] Test execution time <4 minutes
- [ ] Complex queries <200ms
- [ ] 100% test pass rate
- [ ] Zero flaky tests

## Quality Gates

### Code Quality

- [ ] All test files follow naming convention
- [ ] Performance benchmarks documented
- [ ] File fixtures organized
- [ ] Email template testing comprehensive

### Testing Quality

- [ ] Aggregation accuracy validated
- [ ] File upload scenarios comprehensive
- [ ] Email rendering tested
- [ ] Dashboard metrics accurate

## Implementation Notes

### Development Phases

**Week 1 (Days 1-5): Complex Queries & Aggregations**

- Day 1-2: EnhancedSteps aggregation tests (AC-097.1)
- Day 3: Dashboard metrics tests (AC-097.4)
- Day 4: System health tests (AC-097.5)
- Day 5: Relationship tests (AC-097.6)

**Week 2 (Days 1-5): File Upload & Email Generation**

- Day 1-2: Import/ImportQueue file upload tests (AC-097.2)
- Day 3: StepView email generation tests (AC-097.3)
- Day 4: Performance optimization (AC-097.7)
- Day 5: Documentation, code review

## Related Documentation

- **US-095**: Jest Integration Test Infrastructure
- **US-096**: Core Entity API Integration Tests
- **Jest Integration Test Plan**: `docs/testing/JEST_INTEGRATION_TEST_PLAN.md`
- **OpenAPI Specification**: `docs/api/openapi.yaml` (v2.12.0)

## Change Log

| Date       | Version | Changes                              | Author |
| ---------- | ------- | ------------------------------------ | ------ |
| 2025-10-01 | 1.0     | Initial story creation for Sprint 10 | System |

---

**Story Status**: Blocked by US-096
**Next Action**: Begin after US-096 completion (Sprint 10, Week 1)
**Risk Level**: Medium (complex queries, file uploads)
**Strategic Priority**: Medium (80%+ API coverage achieved)
**Dependencies**: US-095, US-096

**Expected Outcomes**:

- 80%+ API endpoint coverage (25+/31 endpoints)
- 200+ comprehensive test scenarios
- Performance baselines established
- <4 minute test execution time
- Foundation for US-098 security/performance testing
