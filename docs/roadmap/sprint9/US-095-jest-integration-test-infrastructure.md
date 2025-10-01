# US-095: Jest Integration Test Infrastructure

## Story Metadata

**Story ID**: US-095
**Epic**: Jest Integration Testing - Dual-Track Testing Strategy
**Sprint**: Sprint 9 (Week 1-2)
**Priority**: P1 (HIGH - Critical for CI/CD automation)
**Effort**: 8 points
**Status**: Ready for Development
**Timeline**: 2 weeks (Sprint 9, Week 1-2)
**Owner**: QA Engineering + Backend Development Team
**Dependencies**: None (foundation story)
**Risk**: MEDIUM (New testing infrastructure, database isolation critical)

## Problem Statement

### Current Testing Gap

UMIG currently has comprehensive Groovy integration tests (`local-dev-setup/__tests__/groovy/`) with 31/31 tests passing and 85-90% repository coverage. However, these tests:

**Critical Limitations**:

- Cannot execute via npm or standalone CLI commands
- Require manual ScriptRunner console execution
- Cannot integrate with CI/CD pipeline
- Execute on quarterly validation cycle only
- No automated validation on every commit

**Business Impact**:

- **Development Velocity**: Manual test execution slows development cycle
- **Quality Risk**: Long feedback loops delay bug detection
- **Deployment Risk**: No automated pre-deployment validation
- **Operational Cost**: Manual testing requires significant QA effort
- **Integration Risk**: No automated API contract validation

### Proposed Solution

Implement **Track 2: Jest Integration Tests** as automated complement to manual Groovy tests:

**Jest Integration Testing Infrastructure**:

- Automated API endpoint testing via HTTP requests (Supertest)
- Isolated test database (`umig_test_db`) preventing production pollution
- Automated execution: `npm run test:js:integration`
- CI/CD integration with GitHub Actions
- Database fixture management with proper foreign key ordering
- Fast execution (<2 minutes for baseline test suite)

**Strategic Value**:

- **CI/CD Enablement**: Automated tests run on every commit/PR
- **Rapid Feedback**: Developers receive test results in minutes, not days
- **Deployment Safety**: Automated pre-deployment validation prevents regressions
- **API Contract Validation**: Ensures API changes don't break consumers
- **Database Safety**: Isolated test database prevents production data corruption

## User Story

**As a** Backend Developer working on UMIG API endpoints
**I want** automated Jest integration tests that validate API endpoints via HTTP requests in isolated test database
**So that** I receive rapid feedback on every commit without manually executing Groovy tests in ScriptRunner console, enabling safe CI/CD deployment

### Value Statement

This story establishes the foundation for automated API integration testing, enabling developers to validate API changes instantly via `npm run test:js:integration`, receive automated feedback on every commit through CI/CD, and deploy with confidence knowing comprehensive API validation has occurred without requiring manual QA intervention or production database access.

## Acceptance Criteria

### AC-095.1: Jest Integration Test Configuration

**Given** Jest integration testing infrastructure is needed
**When** Jest configuration is created for integration tests
**Then** comprehensive Jest configuration is implemented including:

**Configuration Requirements**:

- Separate `jest.config.integration.js` configuration file
- Test environment: `node` (for HTTP requests via Supertest)
- Test match pattern: `**/__tests__/integration/**/*.integration.test.js`
- Test timeout: 10000ms (10 seconds for HTTP requests)
- Setup files: `globalSetup.js` and `globalTeardown.js`
- Coverage collection from API endpoints (not required for integration tests)
- Isolated test database connection configuration

**Implementation**:

```javascript
// jest.config.integration.js
module.exports = {
  displayName: "integration",
  testEnvironment: "node",
  testMatch: ["**/__tests__/integration/**/*.integration.test.js"],
  testTimeout: 10000, // 10 seconds for HTTP requests
  globalSetup: "./__tests__/integration/setup/globalSetup.js",
  globalTeardown: "./__tests__/integration/setup/globalTeardown.js",
  setupFilesAfterEnv: ["./__tests__/integration/setup/setupTests.js"],
  collectCoverage: false, // Coverage collected separately
  verbose: true,
  maxWorkers: 1, // Serial execution for database tests
  forceExit: true, // Ensure clean exit
  detectOpenHandles: true, // Debug hanging tests
};
```

**package.json Scripts**:

```json
{
  "scripts": {
    "test:js:integration": "jest --config jest.config.integration.js",
    "test:js:integration:watch": "jest --config jest.config.integration.js --watch",
    "test:js:integration:coverage": "jest --config jest.config.integration.js --coverage"
  }
}
```

**Validation Criteria**:

- [ ] `npm run test:js:integration` executes without configuration errors
- [ ] Jest loads correct test files from `__tests__/integration/`
- [ ] Global setup/teardown executes properly
- [ ] Test timeout configured appropriately for HTTP requests
- [ ] Serial execution prevents database race conditions

### AC-095.2: API Client Helper with Supertest

**Given** HTTP API testing is required
**When** API client helper is created
**Then** comprehensive API client with Supertest is implemented including:

**API Client Requirements**:

- Supertest integration for HTTP requests
- Basic authentication with test credentials from `.env`
- Base URL configuration (`http://localhost:8090`)
- Common headers (Content-Type, Accept)
- Authentication helper methods
- Request logging for debugging

**Implementation**:

```javascript
// __tests__/integration/helpers/api-client.js
const request = require("supertest");
const dotenv = require("dotenv");

// Load test environment variables
dotenv.config({ path: ".env.test" });

const BASE_URL = process.env.CONFLUENCE_BASE_URL || "http://localhost:8090";
const API_PATH = "/rest/scriptrunner/latest/custom";

class ApiClient {
  constructor() {
    this.baseUrl = BASE_URL;
    this.apiPath = API_PATH;
    this.username = process.env.CONFLUENCE_ADMIN_USERNAME || "admin";
    this.password = process.env.CONFLUENCE_ADMIN_PASSWORD || "123456";
  }

  /**
   * Create authenticated request to API endpoint
   * @param {string} method - HTTP method (get, post, put, delete)
   * @param {string} endpoint - API endpoint path (e.g., '/users')
   * @returns {object} Supertest request object
   */
  request(method, endpoint) {
    const fullPath = `${this.apiPath}${endpoint}`;

    return request(this.baseUrl)
      [method](fullPath)
      .auth(this.username, this.password)
      .set("Content-Type", "application/json")
      .set("Accept", "application/json");
  }

  /**
   * GET request to API endpoint
   */
  get(endpoint) {
    return this.request("get", endpoint);
  }

  /**
   * POST request to API endpoint
   */
  post(endpoint, data) {
    return this.request("post", endpoint).send(data);
  }

  /**
   * PUT request to API endpoint
   */
  put(endpoint, data) {
    return this.request("put", endpoint).send(data);
  }

  /**
   * DELETE request to API endpoint
   */
  delete(endpoint) {
    return this.request("delete", endpoint);
  }
}

// Export singleton instance
module.exports = new ApiClient();
```

**Usage Example**:

```javascript
const apiClient = require("../helpers/api-client");

// GET request
const response = await apiClient.get("/users");

// POST request
const createResponse = await apiClient.post("/users", {
  usr_name: "Test User",
  usr_email: "test@example.com",
});
```

**Validation Criteria**:

- [ ] API client successfully authenticates with Basic auth
- [ ] All HTTP methods (GET, POST, PUT, DELETE) work correctly
- [ ] Request headers set appropriately
- [ ] Environment variables loaded from `.env.test`
- [ ] Error responses handled gracefully

### AC-095.3: Database Helper for Test Isolation

**Given** database isolation is critical for integration tests
**When** database helper is created
**Then** comprehensive database management is implemented including:

**Database Helper Requirements**:

- PostgreSQL connection to isolated test database (`umig_test_db`)
- Database reset functionality (drop/recreate schema)
- Fixture loading with foreign key ordering
- Connection pooling management
- Transaction rollback capabilities

**Implementation**:

```javascript
// __tests__/integration/helpers/database-helper.js
const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");

class DatabaseHelper {
  constructor() {
    this.pool = null;
    this.testDbConfig = {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_TEST_NAME || "umig_test_db",
      user: process.env.DB_TEST_USER || "umig_test_user",
      password: process.env.DB_TEST_PASSWORD || "test_password",
      max: 5, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  /**
   * Initialize database connection pool
   */
  async connect() {
    if (!this.pool) {
      this.pool = new Pool(this.testDbConfig);

      // Verify connection
      await this.pool.query("SELECT 1");
      console.log("✅ Connected to test database:", this.testDbConfig.database);
    }
    return this.pool;
  }

  /**
   * Reset database to clean state
   * Drops all tables and recreates schema
   */
  async resetDatabase() {
    const pool = await this.connect();

    console.log("🔄 Resetting test database...");

    // Drop all tables with CASCADE
    await pool.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO ${this.testDbConfig.user};
      GRANT ALL ON SCHEMA public TO public;
    `);

    // Run Liquibase migrations
    const migrationsPath = path.join(__dirname, "../../../db/migrations");
    await this.runMigrations(migrationsPath);

    console.log("✅ Database reset complete");
  }

  /**
   * Load fixtures into database
   * @param {string[]} fixtureNames - Array of fixture names (e.g., ['users', 'teams'])
   */
  async loadFixtures(fixtureNames) {
    const pool = await this.connect();
    const fixtures = {};

    for (const fixtureName of fixtureNames) {
      const fixturePath = path.join(
        __dirname,
        "../fixtures",
        `${fixtureName}.fixture.js`,
      );
      const fixtureData = require(fixturePath);

      // Insert fixture data
      for (const record of fixtureData) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

        const tableName = this.getTableName(fixtureName);
        const query = `
          INSERT INTO ${tableName} (${columns.join(", ")})
          VALUES (${placeholders})
          RETURNING *
        `;

        await pool.query(query, values);
      }

      fixtures[fixtureName] = fixtureData;
    }

    return fixtures;
  }

  /**
   * Execute raw SQL query
   */
  async query(sql, params = []) {
    const pool = await this.connect();
    return pool.query(sql, params);
  }

  /**
   * Close database connection pool
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log("🔌 Disconnected from test database");
    }
  }

  /**
   * Map fixture name to table name
   */
  getTableName(fixtureName) {
    const tableMap = {
      users: "tbl_users",
      teams: "tbl_teams",
      team_members: "tbl_team_members",
      migrations: "tbl_migrations_master",
      environments: "tbl_environments",
      status: "tbl_status",
    };
    return tableMap[fixtureName] || `tbl_${fixtureName}`;
  }

  /**
   * Run database migrations
   */
  async runMigrations(migrationsPath) {
    // TODO: Implement Liquibase migration execution
    // For now, load SQL schema directly
    const schemaPath = path.join(__dirname, "../../../db/schema.sql");
    const schemaSql = await fs.readFile(schemaPath, "utf-8");
    await this.query(schemaSql);
  }
}

// Export singleton instance
module.exports = new DatabaseHelper();
```

**Validation Criteria**:

- [ ] Database connection established to `umig_test_db`
- [ ] Database reset functionality works without errors
- [ ] Migrations execute successfully
- [ ] Connection pool managed efficiently
- [ ] No connection leaks or hanging connections

### AC-095.4: Fixture Loader with Foreign Key Ordering

**Given** test data fixtures are needed
**When** fixture loader is created
**Then** comprehensive fixture management is implemented including:

**Fixture Loader Requirements**:

- JSON-based fixture files for each entity
- Automatic foreign key dependency ordering
- Minimal fixture data (5-10 records per entity)
- UUID-based primary keys
- Referential integrity validation

**Implementation**:

```javascript
// __tests__/integration/helpers/fixture-loader.js
const databaseHelper = require("./database-helper");

class FixtureLoader {
  constructor() {
    // Define loading order respecting foreign key dependencies
    this.loadOrder = [
      "users", // No dependencies
      "teams", // No dependencies
      "status", // No dependencies
      "environments", // No dependencies
      "team_members", // Depends on: users, teams
      "migrations", // Depends on: users (created_by)
      "iterations", // Depends on: migrations
      "plans", // Depends on: iterations
      "sequences", // Depends on: plans
      "phases", // Depends on: sequences
      "steps", // Depends on: phases
      "instructions", // Depends on: steps
    ];
  }

  /**
   * Load fixtures in correct dependency order
   * @param {string[]} fixtureNames - Requested fixtures
   * @returns {object} Loaded fixture data
   */
  async load(fixtureNames) {
    // Order fixtures according to dependency graph
    const orderedFixtures = this.orderByDependencies(fixtureNames);

    console.log("📦 Loading fixtures:", orderedFixtures.join(", "));

    return await databaseHelper.loadFixtures(orderedFixtures);
  }

  /**
   * Order fixture names by dependency graph
   */
  orderByDependencies(fixtureNames) {
    return this.loadOrder.filter((name) => fixtureNames.includes(name));
  }

  /**
   * Load all fixtures (for comprehensive tests)
   */
  async loadAll() {
    return await this.load(this.loadOrder);
  }

  /**
   * Validate fixture referential integrity
   */
  async validateIntegrity() {
    // Query database for foreign key violations
    const result = await databaseHelper.query(`
      SELECT conname, conrelid::regclass, confrelid::regclass
      FROM pg_constraint
      WHERE contype = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.constraint_name = conname
        AND tc.constraint_type = 'FOREIGN KEY'
      )
    `);

    if (result.rows.length > 0) {
      throw new Error(
        `Foreign key violations detected: ${JSON.stringify(result.rows)}`,
      );
    }
  }
}

// Export singleton instance
module.exports = new FixtureLoader();
```

**Example Fixture File**:

```javascript
// __tests__/integration/fixtures/users.fixture.js
module.exports = [
  {
    usr_id: "11111111-1111-1111-1111-111111111111",
    usr_name: "Test User 1",
    usr_email: "test1@example.com",
    usr_confluence_key: "testuser1",
    usr_is_active: true,
    usr_created_at: "2025-01-01T00:00:00Z",
    usr_updated_at: "2025-01-01T00:00:00Z",
  },
  {
    usr_id: "22222222-2222-2222-2222-222222222222",
    usr_name: "Test User 2",
    usr_email: "test2@example.com",
    usr_confluence_key: "testuser2",
    usr_is_active: true,
    usr_created_at: "2025-01-01T00:00:00Z",
    usr_updated_at: "2025-01-01T00:00:00Z",
  },
];
```

**Validation Criteria**:

- [ ] Fixtures load in correct dependency order
- [ ] Foreign key constraints respected
- [ ] No orphaned records created
- [ ] Fixture data validates against schema
- [ ] Minimal data for fast test execution

### AC-095.5: Global Setup and Teardown

**Given** test suite lifecycle management is needed
**When** global setup/teardown is created
**Then** comprehensive lifecycle management is implemented including:

**Setup/Teardown Requirements**:

- Database connection initialization
- Database reset before test suite
- Confluence health check
- Database cleanup after test suite
- Connection pool cleanup

**Implementation**:

```javascript
// __tests__/integration/setup/globalSetup.js
const databaseHelper = require("../helpers/database-helper");
const apiClient = require("../helpers/api-client");

module.exports = async () => {
  console.log("\n🚀 Integration Test Suite - Global Setup\n");

  try {
    // 1. Verify Confluence is running
    console.log("🔍 Checking Confluence availability...");
    try {
      await apiClient.get("/test-endpoint");
      console.log("✅ Confluence is accessible");
    } catch (error) {
      console.error("❌ Confluence not accessible:", error.message);
      throw new Error("Confluence must be running for integration tests");
    }

    // 2. Connect to test database
    console.log("🔍 Connecting to test database...");
    await databaseHelper.connect();
    console.log("✅ Test database connected");

    // 3. Reset database to clean state
    console.log("🔍 Resetting test database...");
    await databaseHelper.resetDatabase();
    console.log("✅ Test database reset complete");

    console.log("\n✅ Global setup complete - ready for tests\n");
  } catch (error) {
    console.error("\n❌ Global setup failed:", error.message);
    throw error;
  }
};
```

```javascript
// __tests__/integration/setup/globalTeardown.js
const databaseHelper = require("../helpers/database-helper");

module.exports = async () => {
  console.log("\n🧹 Integration Test Suite - Global Teardown\n");

  try {
    // Disconnect from database
    await databaseHelper.disconnect();
    console.log("✅ Database disconnected");

    console.log("\n✅ Global teardown complete\n");
  } catch (error) {
    console.error("❌ Global teardown failed:", error.message);
    // Don't throw - allow test suite to exit
  }
};
```

```javascript
// __tests__/integration/setup/setupTests.js
// Runs before each test file
const databaseHelper = require("../helpers/database-helper");

beforeEach(async () => {
  // Reset database before each test
  await databaseHelper.resetDatabase();
});

// Increase timeout for integration tests
jest.setTimeout(10000);
```

**Validation Criteria**:

- [ ] Global setup executes before test suite
- [ ] Confluence health check validates service availability
- [ ] Database reset completes successfully
- [ ] Global teardown executes after test suite
- [ ] No hanging connections after teardown

### AC-095.6: Baseline Integration Tests (5 Endpoints)

**Given** testing infrastructure is ready
**When** baseline integration tests are created
**Then** 5 comprehensive API endpoint tests are implemented including:

**Baseline Test Coverage**:

1. **Users API** (`/users`) - Core CRUD operations
2. **Teams API** (`/teams`) - Team management
3. **Migrations API** (`/migrations`) - Migration CRUD
4. **Status API** (`/status`) - Status reference data
5. **Environments API** (`/environments`) - Environment management

**Implementation Example**:

```javascript
// __tests__/integration/api/users.integration.test.js
const apiClient = require("../helpers/api-client");
const fixtureLoader = require("../helpers/fixture-loader");
const databaseHelper = require("../helpers/database-helper");

describe("Users API Integration Tests", () => {
  beforeEach(async () => {
    // Reset database before each test
    await databaseHelper.resetDatabase();
  });

  describe("POST /users", () => {
    it("should create user with valid data", async () => {
      const response = await apiClient.post("/users", {
        usr_name: "John Doe",
        usr_email: "john.doe@example.com",
        usr_confluence_key: "johndoe",
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        usr_name: "John Doe",
        usr_email: "john.doe@example.com",
        usr_confluence_key: "johndoe",
      });
      expect(response.body.usr_id).toBeDefined();
      expect(response.body.usr_is_active).toBe(true);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await apiClient.post("/users", {
        usr_name: "John Doe",
        // Missing usr_email
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("usr_email");
    });

    it("should return 409 for duplicate email", async () => {
      // Create first user
      await apiClient.post("/users", {
        usr_name: "User 1",
        usr_email: "duplicate@example.com",
        usr_confluence_key: "user1",
      });

      // Attempt to create duplicate
      const response = await apiClient.post("/users", {
        usr_name: "User 2",
        usr_email: "duplicate@example.com",
        usr_confluence_key: "user2",
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain("email");
    });
  });

  describe("GET /users/:id", () => {
    it("should retrieve existing user", async () => {
      const fixtures = await fixtureLoader.load(["users"]);
      const userId = fixtures.users[0].usr_id;

      const response = await apiClient.get(`/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.usr_id).toBe(userId);
      expect(response.body.usr_name).toBe(fixtures.users[0].usr_name);
    });

    it("should return 404 for non-existent user", async () => {
      const response = await apiClient.get(
        "/users/00000000-0000-0000-0000-000000000000",
      );

      expect(response.status).toBe(404);
    });
  });

  describe("GET /users", () => {
    it("should list all users", async () => {
      await fixtureLoader.load(["users"]);

      const response = await apiClient.get("/users");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should filter users by active status", async () => {
      await fixtureLoader.load(["users"]);

      const response = await apiClient.get("/users?isActive=true");

      expect(response.status).toBe(200);
      expect(response.body.every((user) => user.usr_is_active === true)).toBe(
        true,
      );
    });
  });

  describe("PUT /users/:id", () => {
    it("should update user with valid data", async () => {
      const fixtures = await fixtureLoader.load(["users"]);
      const userId = fixtures.users[0].usr_id;

      const response = await apiClient.put(`/users/${userId}`, {
        usr_name: "Updated Name",
      });

      expect(response.status).toBe(200);
      expect(response.body.usr_name).toBe("Updated Name");
    });
  });

  describe("DELETE /users/:id", () => {
    it("should delete user", async () => {
      const fixtures = await fixtureLoader.load(["users"]);
      const userId = fixtures.users[0].usr_id;

      const response = await apiClient.delete(`/users/${userId}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await apiClient.get(`/users/${userId}`);
      expect(getResponse.status).toBe(404);
    });
  });
});
```

**Validation Criteria**:

- [ ] 5 API endpoints have comprehensive tests
- [ ] Each endpoint has ≥5 test scenarios
- [ ] All HTTP status codes validated (200, 201, 400, 404, 409)
- [ ] CRUD operations validated for each endpoint
- [ ] Test execution completes in <2 minutes

### AC-095.7: npm Script Integration

**Given** convenient test execution is needed
**When** npm scripts are configured
**Then** comprehensive npm script integration is implemented including:

**npm Scripts**:

```json
{
  "scripts": {
    "test:js:integration": "jest --config jest.config.integration.js",
    "test:js:integration:watch": "jest --config jest.config.integration.js --watch",
    "test:js:integration:coverage": "jest --config jest.config.integration.js --coverage",
    "test:js:integration:debug": "node --inspect-brk node_modules/.bin/jest --config jest.config.integration.js --runInBand",
    "test:js:integration:users": "jest --config jest.config.integration.js users.integration.test.js"
  }
}
```

**Validation Criteria**:

- [ ] `npm run test:js:integration` executes all integration tests
- [ ] Watch mode works for development
- [ ] Debug mode enables Node.js debugging
- [ ] Single endpoint tests can be executed
- [ ] All scripts return appropriate exit codes

## Technical Implementation

### Architecture Overview

```
Integration Test Architecture:
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workflow                        │
│  npm run test:js:integration → Instant API Validation       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Jest Test Runner                          │
│  jest.config.integration.js → Node Environment              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Global Setup                              │
│  1. Verify Confluence Running                                │
│  2. Connect to umig_test_db                                  │
│  3. Reset Database Schema                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Test Execution                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ API Client   │  │ Fixture      │  │ Database     │      │
│  │ (Supertest)  │→ │ Loader       │→ │ Helper       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↓                  ↓                  ↓              │
│  ┌──────────────────────────────────────────────────┐       │
│  │ HTTP Request → Confluence → PostgreSQL           │       │
│  │ http://localhost:8090/rest/scriptrunner/...      │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Assertions & Validation                   │
│  - Status codes (200, 201, 400, 404, 409)                   │
│  - Response body structure                                   │
│  - Database state verification                               │
│  - Foreign key integrity                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Global Teardown                           │
│  - Disconnect database pool                                  │
│  - Clean up resources                                        │
└─────────────────────────────────────────────────────────────┘
```

### Database Isolation Strategy

**Test Database**: `umig_test_db` (completely separate from `umig_app_db`)
**Test User**: `umig_test_user` (limited permissions)
**Reset Strategy**: Drop/recreate schema before each test suite
**Connection Pool**: Maximum 5 connections, 30s idle timeout

**Safety Guarantees**:

- Environment variable validation prevents production database access
- Separate credentials for test database
- Schema-level isolation
- No shared connections with production

### Performance Targets

**Sprint 9 Week 2 Targets**:

- [ ] Total execution time: <2 minutes
- [ ] Database reset time: <10 seconds
- [ ] Average test execution: <500ms per test
- [ ] 5 API endpoints covered
- [ ] ~25 total test scenarios

## Dependencies and Integration Points

### Prerequisites

**Infrastructure**:

- [ ] PostgreSQL 14+ with `umig_test_db` created
- [ ] Test database user `umig_test_user` with appropriate permissions
- [ ] Confluence running on `localhost:8090`
- [ ] ScriptRunner installed and configured

**npm Packages**:

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1"
  }
}
```

**Environment Configuration**:

```bash
# .env.test
DB_HOST=localhost
DB_PORT=5432
DB_TEST_NAME=umig_test_db
DB_TEST_USER=umig_test_user
DB_TEST_PASSWORD=test_password
CONFLUENCE_BASE_URL=http://localhost:8090
CONFLUENCE_ADMIN_USERNAME=admin
CONFLUENCE_ADMIN_PASSWORD=123456
```

### Integration Points

**Relates to**:

- **US-096**: Core Entity API Integration Tests (Sprint 9, Week 3-4)
- **US-097**: Advanced API Integration Tests (Sprint 10, Week 1-2)
- **US-098**: Security & Performance Integration Tests (Sprint 10, Week 3-4)

**Builds upon**:

- Existing Groovy tests (manual validation reference)
- OpenAPI specification v2.12.0 (API contract)
- Database schema (Liquibase migrations)
- ADR-042 (dual authentication pattern)

## Risk Assessment

### Technical Risks

1. **Database Isolation Failure**
   - **Risk**: Tests accidentally access production database
   - **Impact**: CRITICAL - Data corruption
   - **Mitigation**:
     - Environment variable validation
     - Separate database credentials
     - Pre-flight database name check
   - **Likelihood**: Low | **Severity**: Critical

2. **Test Data Corruption**
   - **Risk**: Fixture loading fails with foreign key violations
   - **Impact**: HIGH - Tests fail incorrectly
   - **Mitigation**:
     - Strict dependency ordering
     - Referential integrity validation
     - Automatic rollback on failure
   - **Likelihood**: Medium | **Severity**: Medium

3. **Race Conditions**
   - **Risk**: Parallel test execution causes database conflicts
   - **Impact**: MEDIUM - Flaky tests
   - **Mitigation**:
     - Serial test execution (maxWorkers: 1)
     - Transaction isolation
     - Database locking strategies
   - **Likelihood**: Low | **Severity**: Medium

4. **Performance Degradation**
   - **Risk**: Test execution time exceeds 2 minutes
   - **Impact**: MEDIUM - Slows development feedback
   - **Mitigation**:
     - Minimal fixture data
     - Efficient database reset
     - Parallel infrastructure preparation
   - **Likelihood**: Medium | **Severity**: Low

### Business Risks

1. **Development Velocity Impact**
   - **Risk**: Test infrastructure complexity slows initial development
   - **Impact**: MEDIUM - Sprint velocity reduction
   - **Mitigation**: Experienced team members, phased implementation
   - **Likelihood**: Medium | **Severity**: Medium

2. **Maintenance Overhead**
   - **Risk**: Test infrastructure requires ongoing maintenance
   - **Impact**: LOW - Increased long-term effort
   - **Mitigation**: Clean architecture, comprehensive documentation
   - **Likelihood**: High | **Severity**: Low

## Success Metrics

### Phase 1 Success (Sprint 9, Week 2)

**Quantitative Metrics**:

- [ ] 5 API endpoints with ≥80% scenario coverage
- [ ] Test execution time <2 minutes
- [ ] 100% test pass rate
- [ ] Database reset <10 seconds
- [ ] Zero production database access incidents

**Qualitative Metrics**:

- [ ] Developers can run tests with single command
- [ ] Test failures provide actionable error messages
- [ ] Database isolation prevents production pollution
- [ ] Test infrastructure documented comprehensively
- [ ] Team confident in test reliability

### Sprint 9 Completion Criteria

- [ ] `npm run test:js:integration` executes successfully
- [ ] 5 baseline API endpoints tested comprehensively
- [ ] Database isolation verified and documented
- [ ] Global setup/teardown working correctly
- [ ] API client helper supports all HTTP methods
- [ ] Fixture loader respects foreign key dependencies
- [ ] All acceptance criteria validated
- [ ] Documentation complete and reviewed
- [ ] Code reviewed and approved
- [ ] Merged to main branch

## Quality Gates

### Code Quality

- [ ] ESLint passes with zero errors
- [ ] All helper modules have JSDoc comments
- [ ] Test files follow naming convention (`*.integration.test.js`)
- [ ] Error handling comprehensive
- [ ] Resource cleanup verified (no leaks)

### Testing Quality

- [ ] All 5 baseline endpoints have ≥5 test scenarios
- [ ] HTTP status codes validated (200, 201, 400, 404, 409)
- [ ] Request/response body validation
- [ ] Database state verification
- [ ] Foreign key integrity validation

### Documentation Quality

- [ ] README.md updated with integration test instructions
- [ ] API client helper documented
- [ ] Database helper documented
- [ ] Fixture format documented
- [ ] Troubleshooting guide created

## Implementation Notes

### Development Phases

**Week 1 (Days 1-3): Infrastructure Setup**

- Day 1: Jest configuration, npm scripts, global setup/teardown
- Day 2: API client helper, database helper
- Day 3: Fixture loader, database reset automation

**Week 1 (Days 4-5): Baseline Tests**

- Day 4: Users API tests, Teams API tests
- Day 5: Migrations API tests, Status API tests, Environments API tests

**Week 2 (Days 1-2): Validation & Documentation**

- Day 1: End-to-end validation, performance testing
- Day 2: Documentation, code review, refinement

**Week 2 (Days 3-5): Buffer & Polish**

- Day 3-5: Bug fixes, edge cases, team training

### Testing Strategy

**Test Execution Flow**:

1. Developer runs `npm run test:js:integration`
2. Global setup verifies Confluence, resets database
3. Tests execute serially (no race conditions)
4. Each test resets database to clean state
5. Assertions validate HTTP responses and database state
6. Global teardown cleans up connections

**Debugging Strategy**:

```bash
# Debug specific test
npm run test:js:integration:debug -- users.integration.test.js

# Watch mode for development
npm run test:js:integration:watch

# Verbose output
npm run test:js:integration -- --verbose
```

### Team Coordination

**Training Required**:

- Jest integration testing patterns
- Supertest API testing
- PostgreSQL fixture management
- Database isolation best practices

**Code Review Focus**:

- Database isolation verification
- Foreign key dependency ordering
- Error handling completeness
- Resource cleanup validation

## Related Documentation

- **Jest Integration Test Plan**: `docs/testing/JEST_INTEGRATION_TEST_PLAN.md`
- **OpenAPI Specification**: `docs/api/openapi.yaml` (v2.12.0)
- **Database Schema**: `db/migrations/` (Liquibase)
- **ADR-042**: Dual Authentication Pattern
- **ADR-031**: Type Safety Requirements

## Change Log

| Date       | Version | Changes                             | Author |
| ---------- | ------- | ----------------------------------- | ------ |
| 2025-10-01 | 1.0     | Initial story creation for Sprint 9 | System |

---

**Story Status**: Ready for Development
**Next Action**: Sprint 9 planning, team assignment
**Risk Level**: Medium (new infrastructure, critical database isolation)
**Strategic Priority**: High (enables CI/CD automation)
**Dependencies**: None (foundation story)

**Expected Outcomes**:

- Automated API testing via `npm run test:js:integration`
- 5 API endpoints with comprehensive test coverage
- Database isolation preventing production pollution
- <2 minute test execution time
- Foundation for US-096, US-097, US-098 implementation
