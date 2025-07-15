# UMIG Solution Architecture & Design

**Version:** 2025-07-03  
**Maintainers:** UMIG Project Team  
**Source ADRs:** This document consolidates 26 archived ADRs. For full historical context, see the original ADRs in `/docs/adr/archive/`.

## Consolidated ADR Reference

This document consolidates the following architectural decisions:

### Core Architecture & Technology Stack
- [ADR-001](../adr/archive/ADR-001-Confluence-Integrated-Application-Architecture.md) - Confluence-Integrated Application Architecture
- [ADR-002](../adr/archive/ADR-002-Backend-Implementation-with-Atlassian-ScriptRunner.md) - Backend Implementation with Atlassian ScriptRunner
- [ADR-003](../adr/archive/ADR-003-Database-Technology-PostgreSQL.md) - Database Technology: PostgreSQL
- [ADR-004](../adr/archive/ADR-004-Frontend-Implementation-Vanilla-JavaScript.md) - Frontend Implementation: Vanilla JavaScript
- [ADR-005](../adr/archive/ADR-005-Real-time-Update-Mechanism-AJAX-Polling.md) - Real-time Update Mechanism: AJAX Polling

### Development Environment & Operations
- [ADR-006](../adr/archive/ADR-006-Podman-and-Ansible-for-Local-Development-Environment.md) - Podman and Ansible for Local Development Environment
- [ADR-007](../adr/archive/ADR-007-local-dev-setup-plugin-installation.md) - Local Dev Setup Plugin Installation
- [ADR-013](../adr/archive/ADR-013-Data-Utilities-Language-NodeJS.md) - Data Utilities Language: NodeJS
- [ADR-025](../adr/archive/ADR-025-NodeJS-based-Dev-Environment-Orchestration.md) - NodeJS-based Dev Environment Orchestration

### Database Design & Management
- [ADR-008](../adr/archive/ADR-008-Database-Migration-Strategy-with-Liquibase.md) - Database Migration Strategy with Liquibase
- [ADR-009](../adr/archive/ADR-009-Containerize-JDBC-Driver-for-Confluence.md) - Containerize JDBC Driver for Confluence
- [ADR-010](../adr/archive/ADR-010-Database-Connection-Pooling-with-ScriptRunner.md) - Database Connection Pooling with ScriptRunner
- [ADR-012](../adr/archive/ADR-012_standardized_database_management_and_documentation.md) - Standardized Database Management and Documentation
- [ADR-014](../adr/archive/ADR-014-database-naming-conventions.md) - Database Naming Conventions

### Data Model & Entity Design
- [ADR-015](../adr/archive/ADR-015-canonical-implementation-plan-model.md) - Canonical Implementation Plan Model
- [ADR-016](../adr/archive/ADR-016-control-and-instruction-model-refactoring.md) - Control and Instruction Model Refactoring
- [ADR-021](../adr/archive/ADR-021%20-%20adr-step-comments.md) - Step Comments Functionality
- [ADR-022](../adr/archive/ADR-022-user-team-nn-relationship.md) - User-Team N-N Relationship
- [ADR-024](../adr/archive/ADR-024-iteration-centric-data-model.md) - Iteration-Centric Data Model

### API Design & Implementation
- [ADR-011](../adr/archive/ADR-011-ScriptRunner-REST-Endpoint-Configuration.md) - ScriptRunner REST Endpoint Configuration
- [ADR-017](../adr/archive/ADR-017-V2-REST-API-Architecture.md) - V2 REST API Architecture
- [ADR-023](../adr/archive/ADR-023-Standardized-Rest-Api-Patterns.md) - Standardized REST API Patterns

### Application Structure & UI Patterns
- [ADR-018](../adr/archive/ADR-018-Pure-ScriptRunner-Application-Structure.md) - Pure ScriptRunner Application Structure
- [ADR-020](../adr/archive/ADR-020-spa-rest-admin-entity-management.md) - SPA+REST Admin Entity Management

### Testing & Quality Assurance
- [ADR-019](../adr/archive/ADR-019-Integration-Testing-Framework.md) - Integration Testing Framework
- [ADR-026](../adr/archive/ADR-026-Specific-Mocks-In-Tests.md) - Specific Mocks in Tests

### Current Active ADRs
- [ADR-027](ADR-027-n-tiers-model.md) - N-tiers Model Architecture
- [ADR-028](ADR-028-data-import-strategy-for-confluence-json.md) - Data Import Strategy for Confluence JSON
- [ADR-029](ADR-029-full-attribute-instantiation-instance-tables.md) - Full Attribute Instantiation Instance Tables
- [ADR-030](ADR-030-hierarchical-filtering-pattern.md) - Hierarchical Filtering Pattern
- [ADR-031](ADR-031-groovy-type-safety-and-filtering-patterns.md) - Groovy Type Safety and Filtering Patterns

---

## 1. Introduction & Scope

This document consolidates all key architectural and solution design decisions for the UMIG project. It serves as the single source of truth for the project's technical and functional architecture, superseding the individual Architectural Decision Records (ADRs) which are now archived. Its purpose is to provide a clear, comprehensive, and up-to-date reference for development, onboarding, and strategic planning.

---

## 2. Core Principles & Philosophy

The UMIG project adheres to a set of core principles that guide all development and architectural decisions:

- **Confluence-Native Integration:** The application is built as a deeply integrated Confluence application, not a standalone system, to leverage existing enterprise infrastructure, user familiarity, and collaboration features. ([ADR-001])
- **Simplicity & Maintainability:** We prioritize simple, direct, and maintainable solutions over complex ones. This is reflected in our choice of a pure ScriptRunner architecture, vanilla JavaScript, and standardized patterns. ([ADR-002], [ADR-004], [ADR-023])
- **Microservice-Inspired Modularity:** While not a full microservices environment, the architecture is modular, with clear separation between the frontend, backend API, database, and development tooling. ([ADR-018])
- **Twelve-Factor App Compliance:** The application follows the principles of the Twelve-Factor App methodology to ensure it is scalable, resilient, and portable across environments. This includes a strict separation of code and configuration, explicit dependency management, and treating logs as event streams.
- **Automation & Reproducibility:** The local development environment and data management tasks are fully automated and orchestrated with NodeJS, Podman, and Ansible to ensure consistency and reliability. ([ADR-006], [ADR-013], [ADR-025])

---

## 3. System Architecture

### 3.1. High-Level Components

The UMIG application consists of four primary, decoupled components:

1. **Frontend (UI):** A client-side application running within the user's browser, rendered inside Confluence pages. It is built with vanilla JavaScript and Atlassian User Interface (AUI) components.
2. **Backend (API):** A set of RESTful endpoints implemented as Groovy scripts within Atlassian ScriptRunner. This layer handles all business logic and data access.
3. **Database:** A PostgreSQL database that serves as the persistent data store for all application entities.
4. **Development Environment:** A containerized local development stack managed by Podman and orchestrated by NodeJS scripts.

### 3.2. Project Structure ([ADR-018])

To support this architecture, the project follows a "Pure ScriptRunner" file structure, avoiding the complexity of a formal Atlassian plugin. **Updated July 2025** to use a consolidated `umig/` namespace:

```
src/
└── groovy/
    └── umig/              # UMIG namespace for all backend code
        ├── macros/        # ScriptRunner Script Macros for UI rendering
        │   └── v1/        # Versioned macro implementations
        ├── api/           # REST API endpoint scripts
        │   ├── v1/, v2/   # Versioned API implementations
        ├── repository/    # Data access layer (repository pattern)
        ├── utils/         # Shared Groovy utilities
        ├── web/           # Frontend assets (JS/CSS) for macros
        │   ├── js/        # JavaScript assets
        │   └── css/       # CSS assets
        └── tests/         # Groovy-based tests (integration/unit)
            ├── apis/      # API endpoint tests
            └── integration/ # Integration tests
```

- **`groovy/umig/`**: All code is under the UMIG namespace for clarity, future-proofing, and avoiding name collisions.
- **`macros/`**: Groovy scripts that render container HTML and load JS/CSS assets; no business logic.
- **`api/`**: REST endpoint scripts using ScriptRunner's CustomEndpointDelegate pattern.
- **`repository/`**: Data access layer following repository pattern for testability and separation of concerns.
- **`web/`**: All frontend assets, versioned and referenced by macros.
- **`tests/`**: Comprehensive test suite for APIs and integration scenarios.

---

## 4. Backend & API Design

### 4.1. Technology Stack ([ADR-002])

- **Platform:** Atlassian ScriptRunner for Confluence.
- **Language:** Groovy.

### 4.2. REST API Implementation ([ADR-011], [ADR-023])

#### Core Requirements
- **Pattern:** All REST endpoints **must** use the `com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate` pattern. This is the **only** approved pattern and ensures stability.
- **Configuration:** Endpoints are discovered via **Script Root Scanning**. This requires two system properties to be set in `CATALINA_OPTS`:
  - `plugin.script.roots`: Points to the directory containing the script packages (e.g., `/var/atlassian/application-data/confluence/scripts`).
  - `plugin.rest.scripts.package`: A comma-delimited list of packages to scan (e.g., `com.umig.api.v1,com.umig.api.v2`).

#### File Structure Standards
- **Package Declaration:** Each endpoint file **must** declare its package at the top (mandatory for class loading).
- **Self-Contained Files:** Each endpoint is a completely self-contained `.groovy` file.
- **Path Parameters:** Use `getAdditionalPath(request)` helper method for URL segments.

#### API Design Standards ([ADR-023])
- **Endpoint Separation:** Each HTTP method **must** have separate endpoint handlers (no central dispatcher pattern).
- **Error Handling:**
  - Inline error handling using standard `try-catch` blocks within each endpoint.
  - No complex, centralized exception handlers.
  - Specific SQL state error mappings:
    - `23503`: Foreign key constraint violations → 400 Bad Request
    - `23505`: Unique constraint violations → 409 Conflict
- **Response Standards:**
  - Successful `DELETE` operations **must** return `204 No Content` (`Response.noContent().build()`)
  - `PUT` and `DELETE` operations **must** be idempotent
- **Association Endpoints:** Dedicated endpoints for managing relationships (e.g., team membership) following RESTful conventions.

#### API Patterns

##### Hierarchical Filtering Pattern
- **Definition:** Endpoints support query parameters that filter resources based on their position in the entity hierarchy.
- **Implementation:** Resources like Teams and Labels can be filtered by their relationship to entities at any level of the hierarchy:
  - `?migrationId={uuid}` - Filter by migration
  - `?iterationId={uuid}` - Filter by iteration
  - `?planId={uuid}` - Filter by plan instance
  - `?sequenceId={uuid}` - Filter by sequence instance
  - `?phaseId={uuid}` - Filter by phase instance
- **UI Integration:** Frontend components progressively filter options based on user selections, creating a cascading refinement pattern.
- **Progressive Filtering Example:**
  - Teams at migration level: 18 teams
  - Teams at sequence level: 12 teams (subset of migration teams)
  - Teams at phase level: 5 teams (subset of sequence teams)
- **Database Pattern:** Repositories implement methods that JOIN through the entity hierarchy to retrieve contextually relevant data.

#### Validation & Constraints
- **CustomEndpointDelegate Only:** No other REST endpoint patterns are permitted (WebWork, JAX-RS, etc.).
- **No Central Dispatchers:** Each endpoint must handle its specific HTTP method and logic directly.
- **Database Error Translation:** All database constraint violations must be translated to appropriate HTTP status codes.

### 4.3. API Architecture ([ADR-017])

The project utilizes a versioned API structure (e.g., `v1`, `v2`) to allow for managed evolution of the endpoints without breaking existing clients.

---

## 5. Frontend Design

### 5.1. Technology Stack ([ADR-004])

- **Framework:** Vanilla JavaScript and the Atlassian User Interface (AUI) library.
- **Rationale:** This choice prioritizes simplicity, avoids the need for complex build toolchains, and ensures seamless visual integration with Confluence.

### 5.2. UI Rendering & Updates

- **Initial Load:** UI components are rendered via ScriptRunner **Macros**, which create placeholder HTML elements and load the main JavaScript controllers.
- **Dynamic Content:** All dynamic data is fetched from the backend REST APIs via asynchronous JavaScript (AJAX).
- **Real-time Updates ([ADR-005]):** The UI uses **AJAX polling** to periodically refresh data, providing a near-real-time user experience without the complexity of WebSockets.
- **Admin Interface ([ADR-020]):** The administration and entity management sections are built as a **Single Page Application (SPA)** to provide a modern, responsive interface.

### 5.3. Admin GUI Architecture (July 2025)
- **Complete Administration System:** Comprehensive interface for managing Users, Teams, Environments, Applications, Labels, and all master/instance entities
- **SPA Pattern Implementation:** Single JavaScript controller (`admin-gui.js`) managing all entities through dynamic routing and content loading
- **Entity Configuration:** Centralized entity definitions with field specifications, validation rules, and UI behavior
- **Association Management:** Modal-based interfaces for managing many-to-many relationships (e.g., environment-application, environment-iteration associations)
- **Notification System:** User feedback through slide-in/slide-out notifications with automatic dismissal
- **Role-Based Access Control:** Navigation sections dynamically shown based on user roles (SUPERADMIN, ADMIN, PILOT)

---

## 6. Database & Data Management

### 6.1. Database Technology ([ADR-003])

- **System:** PostgreSQL (version 14 or later).
- **Rationale:** An approved, robust, and feature-rich open-source database that is well-supported by the Java ecosystem.

### 6.2. Schema Management ([ADR-008], [ADR-012])

- **Tool:** **Liquibase** is the exclusive tool for managing all database schema changes.
- **Process:**
  - All schema changes are defined in version-controlled Liquibase changelog files.
  - **Manual schema changes are strictly forbidden.**
  - An up-to-date Entity Relationship Diagram (ERD) and a database changelog must be maintained.

### 6.3. Database Connectivity ([ADR-009], [ADR-010])

- **Connection Pooling:** All database connections from the application **must** be obtained from ScriptRunner's built-in **Database Resource Pool**.
- **Driver Management:** This approach delegates JDBC driver management to ScriptRunner, eliminating the need to bundle drivers or create custom container images.

### 6.4. Database & Field Naming Conventions ([ADR-014], [ADR-015], [ADR-016], [ADR-021], [ADR-022], [ADR-024])

#### Naming Standards (Mandatory)
- **Case Convention:** All database objects (tables, columns, indexes, constraints) **must** use `snake_case`.
- **Language:** English only - no abbreviations, acronyms, or non-English terms.
- **Consistency:** Names must be consistent across the entire schema.

#### Table Naming Patterns
- **Entity Tables:** Use plural nouns (e.g., `users`, `teams`, `plans_master_plm`)
- **Suffix Conventions:**
  - `_master_` + abbreviation: Canonical/template entities (e.g., `plans_master_plm`, `steps_master_stm`)
  - `_instance_` + abbreviation: Time-bound execution records (e.g., `plans_instance_pli`, `steps_instance_sti`)
  - Standard entities: Simple plural names (e.g., `users`, `teams`, `migrations_mig`)
- **Junction Tables:** Combine entity names with connecting element (e.g., `app_user_teams`)

#### Column Naming Standards
- **Primary Keys:** Always `id` (integer, auto-increment)
- **Foreign Keys:** `{referenced_table_singular}_id` (e.g., `user_id`, `plan_master_id`)
- **Standard Fields:**
  - `created_date`: Creation timestamp (TIMESTAMP WITH TIME ZONE)
  - `updated_date`: Last modification timestamp (TIMESTAMP WITH TIME ZONE)
  - `created_by`: User who created the record (VARCHAR)
  - `updated_by`: User who last modified the record (VARCHAR)
- **Boolean Fields:** Use `is_` prefix (e.g., `is_active`, `is_completed`)
- **Status Fields:** Use `status` suffix (e.g., `execution_status`, `approval_status`)

#### Data Types & Constraints
- **Text Fields:**
  - Short text (< 255 chars): `VARCHAR(n)` with explicit length
  - Long text: `TEXT` for unlimited content (descriptions, comments, etc.)
- **Dates:** Always use `TIMESTAMP WITH TIME ZONE` for temporal data
- **Numbers:**
  - Identifiers: `INTEGER` or `BIGINT`
  - Decimals: `NUMERIC(precision, scale)` for financial/precise calculations
- **Enums:** Use `VARCHAR` with CHECK constraints rather than ENUM types

#### Index Naming Convention
- **Primary Key:** `pk_{table_name}`
- **Foreign Key:** `fk_{table_name}_{referenced_table_name}`
- **Unique Constraints:** `uq_{table_name}_{column_name(s)}`
- **General Indexes:** `idx_{table_name}_{column_name(s)}`

#### Key Entity Architecture
The data model follows a hierarchical structure with canonical vs instance pattern:

**Strategic Layer:**
- `migrations_mig`: Top-level strategic initiatives
- `iterations_itr`: Iterative delivery phases within migrations

**Canonical Layer (Templates):**
- `plans_master_plm`: Reusable implementation playbooks
- `sequences_master_sqm`: Logical groupings within plans
- `phases_master_phm`: Major execution phases with quality gates
- `steps_master_stm`: Granular executable tasks
- `instructions_master_inm`: Detailed step procedures

**Instance Layer (Execution):**
- `plans_instance_pli`: Live plan executions
- `sequences_instance_sqi`: Active sequence tracking
- `phases_instance_phi`: Phase execution with control validation
- `steps_instance_sti`: Individual step execution records
- `instructions_instance_ini`: Instruction execution details

**Supporting Entities:**
- `users`: Application users with authentication integration
- `teams`: Organizational units for access control
- `app_user_teams`: Many-to-many user-team relationships
- `step_master_comments`: Comments on template steps
- `step_instance_comments`: Comments on execution steps

#### Validation Rules
- **No Reserved Words:** Avoid SQL reserved words as table/column names
- **Descriptive Names:** Names must clearly indicate purpose (no cryptic abbreviations)
- **Length Limits:**
  - Table names: Maximum 63 characters (PostgreSQL limit)
  - Column names: Maximum 63 characters
- **Consistency Check:** All similar concepts use identical naming patterns across tables

### 6.5. Step Comments & Collaboration Features ([ADR-021])

The system includes comprehensive commenting capabilities to support collaboration and audit trails:

- **Master Step Comments (`step_master_comments`):** Comments attached to template steps for ongoing documentation and improvement.
- **Instance Step Comments (`step_instance_comments`):** Comments attached to specific step executions for real-time collaboration and issue tracking.
- **Features:**
  - Structured feedback mechanisms during step execution
  - Audit trail for decision-making processes
  - Collaborative problem-solving during cutover events
  - Historical context preservation for post-event analysis

### 6.6. Database Connection Management ([ADR-009], [ADR-010])

Database connectivity has evolved through several iterations to achieve optimal reliability:

- **Current Approach:** All database connections **must** be obtained from ScriptRunner's built-in **Database Resource Pool** (`umig_db_pool`).
- **Historical Evolution:**
  - **Initial Approach:** Manual JDBC driver management with custom container images led to classloader conflicts.
  - **Current Solution:** Delegate driver management to ScriptRunner, eliminating the need to bundle drivers.
- **Connection Validation:** All connections should be validated using a simple `SELECT 1` ping test before use.
- **Benefits:** This approach provides stability, reduces maintenance overhead, and leverages ScriptRunner's built-in connection pooling capabilities.

### 6.7. Data Model Evolution History

The data model has undergone several significant architectural changes:

#### Controls Migration ([ADR-016])
- **Original Design:** Controls were defined at the step level, creating granular but complex validation.
- **Refactored Design:** Controls moved to the phase level, providing appropriate abstraction while maintaining quality gates.
- **Impact:** Simplified control management while preserving validation effectiveness.

#### User-Team Relationships ([ADR-022])
- **Original Design:** Simple 1-to-N relationship (users belonged to one team).
- **Current Design:** N-to-N relationship via `app_user_teams` join table.
- **Rationale:** Real-world organizational structures require users to participate in multiple teams and projects.

#### Iteration-Centric Model ([ADR-024])
- **Evolution:** Decoupled migrations from plans to support iterative delivery approaches.
- **Structure:** Migrations can now contain multiple iterations, each with their own timeline and scope.
- **Benefits:** Better alignment with agile delivery methodologies and complex project phasing.

---

## 7. Development & Operations (DevOps)

### 7.1. Local Development Environment ([ADR-006], [ADR-025])

- **Containerization:** The entire local stack (Confluence, PostgreSQL, MailHog) is containerized using **Podman**.
- **Orchestration:** The environment is managed by **Podman Compose** and orchestrated by a suite of **NodeJS scripts**.
- **Management:** Developers **must** use the provided wrapper scripts (`npm run start`, `npm run stop`, etc.) to manage the environment.

### 7.2. Plugin & Dependency Management ([ADR-007])

- **ScriptRunner Installation:** The ScriptRunner for Confluence plugin **must** be installed manually from the Atlassian Marketplace via the Confluence UI after the first startup.
- **Rationale:** Automated installation approaches (marketplace URL injection, plugin copying) have proven unreliable due to:
  - Confluence startup timing dependencies
  - Marketplace authentication complexities
  - Container file system permission issues
- **Process:** Developers must manually install ScriptRunner via the Confluence UI (`http://localhost:8090`) after initial environment startup.

### 7.3. Development Environment Evolution ([ADR-025])

The development environment has evolved to prioritize reliability and developer experience:

#### Current Architecture (Node.js-based)
- **Orchestration:** Development environment is orchestrated by **Node.js scripts** using specialized libraries:
  - `execa`: For reliable subprocess execution with proper error handling
  - `commander`: For CLI interface and argument parsing
  - `chalk`: For colored console output and developer feedback
- **Management Commands:**
  - `npm run start`: Start complete development stack
  - `npm run stop`: Graceful shutdown of all services
  - `npm run restart`: Restart with optional `--reset` flag for database cleanup

#### Historical Evolution
- **Original Approach:** Shell scripts (bash/sh) for environment management
- **Migration Rationale:**
  - Improved cross-platform compatibility (Windows, macOS, Linux)
  - Better error handling and process management
  - Enhanced developer feedback and logging
  - More reliable container orchestration

### 7.4. Data Utilities ([ADR-013])

- **Language:** All data generation, import, and utility scripts are written in **NodeJS**.
- **Idempotency:** Data generation scripts must be idempotent and include a `--reset` flag that only truncates the tables managed by that script.
- **Rationale:** Node.js provides excellent database connectivity, JSON handling, and integration with the development environment orchestration.

---

## 8. Testing & Quality Assurance

### 8.1. Integration Testing ([ADR-019])

- A formal integration testing suite exists in the `/tests/integration` directory.
- These tests are written in Groovy and run against the live, containerized PostgreSQL database to validate the integration between application code and the database schema.

### 8.2. Testing Standards & Mock Requirements ([ADR-026])

#### Mock Specificity Requirements
- **Mandatory Specificity:** All test mocks (for unit and integration tests) **must** be highly specific and validate exact SQL query structure.
- **Forbidden Patterns:** Generic matchers (e.g., `string.contains('SELECT')`) are strictly prohibited.
- **Required Validation:** Mocks must validate:
  - Exact table names and aliases
  - Specific JOIN conditions and column references
  - WHERE clause predicates and parameter binding
  - ORDER BY and other SQL clauses

#### Rationale & Historical Context
- **Critical Incident:** A production regression occurred when an incorrect column name in a JOIN condition passed tests due to generic SQL validation.
- **Risk Mitigation:** Specific mocks catch SQL query regressions that generic patterns miss.
- **Trade-off Acceptance:** The brittleness of specific mocks is an accepted trade-off for correctness and regression prevention.

#### Implementation Standards
- **Test Reliability:** Tests must fail immediately when SQL structure changes, ensuring deliberate review of database access patterns.
- **Maintenance Overhead:** The additional maintenance burden of updating specific mocks is justified by the prevention of production SQL errors.
- **Coverage Requirements:** All database access points must have corresponding specific mock validations.

---

## 9. Implementation Patterns & Best Practices

### 9.1. Groovy Type Safety Patterns ([ADR-031])

#### Type-Safe Parameter Handling
All ScriptRunner repository methods must use explicit type casting when static type checking is enabled:

```groovy
// CORRECT - Explicit casting for type safety
if (filters.migrationId) {
    query += ' AND mig.mig_id = :migrationId'
    params.migrationId = UUID.fromString(filters.migrationId as String)
}

if (filters.teamId) {
    query += ' AND stm.tms_id_owner = :teamId'  
    params.teamId = Integer.parseInt(filters.teamId as String)
}
```

#### Complete Database Field Selection
All SQL queries must include ALL fields referenced in result mapping to prevent runtime errors:

```groovy
// CORRECT - includes stm.stm_id for mapping
SELECT sti.sti_id, stm.stm_id, stm.stt_code, stm.stm_number, ...

// INCORRECT - missing stm.stm_id causes "No such property" error
SELECT sti.sti_id, stm.stt_code, stm.stm_number, ...
```

### 9.2. Hierarchical Filtering Patterns ([ADR-030], [ADR-031])

#### Master vs Instance ID Filtering
Always use instance IDs for hierarchical filtering, not master IDs, to ensure correct step retrieval:

```groovy
// CORRECT - filters by instance IDs
query += ' AND pli.pli_id = :planId'     // plan instance
query += ' AND sqi.sqi_id = :sequenceId' // sequence instance  
query += ' AND phi.phi_id = :phaseId'    // phase instance

// INCORRECT - filters by master IDs (will miss steps)
query += ' AND plm.plm_id = :planId'     // plan master
```

#### Cascading Filter Reset Logic
Parent filter changes must reset all child filters in proper hierarchical sequence:

```javascript
// Migration change resets: Iteration → Plan → Sequence → Phase → Teams + Labels
onMigrationChange() {
    this.filters.iteration = '';
    this.filters.plan = '';
    this.filters.sequence = '';
    this.filters.phase = '';
    this.filters.team = '';
    this.filters.label = '';
    this.resetAllChildSelectors();
}
```

### 9.3. Many-to-Many Relationship Handling ([ADR-031])

#### Labels Integration Pattern
Handle optional many-to-many relationships gracefully without breaking API responses:

```groovy
// Graceful label fetching with error handling
def stepLabels = []
try {
    def stmId = step.stmId instanceof UUID ? step.stmId : UUID.fromString(step.stmId.toString())
    stepLabels = stepRepository.findLabelsByStepId(stmId)
} catch (Exception e) {
    stepLabels = [] // Continue with empty labels if fetching fails
}
```

### 9.4. API Error Handling Standards ([ADR-023], [ADR-031])

#### Comprehensive Error Response Patterns
```groovy
try {
    // API logic with potential type conversions
} catch (IllegalArgumentException e) {
    return Response.status(Response.Status.BAD_REQUEST)
        .entity(new JsonBuilder([error: "Invalid parameter format: ${e.message}"]).toString())
        .build()
} catch (Exception e) {
    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
        .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
        .build()
}
```

---

This document will be updated as new architectural decisions are made. All changes should be reflected here to maintain it as the canonical source of truth for the UMIG project's architecture.
