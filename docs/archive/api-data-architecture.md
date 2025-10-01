# UMIG API & Data Architecture

**Version:** 2025-08-27  
**Part of:** [UMIG Solution Architecture](./solution-architecture.md)  
**Navigation:** [Architecture Foundation](./architecture-foundation.md) | [Development & Operations](./development-operations.md) | [Specialized Features](./specialized-features.md) | [Implementation Patterns](./implementation-patterns.md)

## Overview

This document defines the REST API design patterns, database architecture, and data management strategies for the UMIG project. It establishes comprehensive standards for API implementation, data modeling, and persistence layer patterns.

---

## 1. REST API Design & Implementation

### 1.1. REST API Implementation ([ADR-011], [ADR-023])

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

### 1.2. Hierarchical Filtering Pattern ([ADR-030])

**Design Principle:** Use query parameter filtering on base resources rather than complex nested URLs.

**Definition:**
Endpoints support query parameters that filter resources based on their position in the entity hierarchy. This pattern provides a consistent, scalable approach to filtering across all API endpoints.

**Implementation Patterns:**

1. **Query Parameter Approach:**
   - `/teams?migrationId={uuid}` - Teams assigned to a migration
   - `/teams?iterationId={uuid}` - Teams assigned to an iteration
   - `/teams?planId={uuid}` - Teams assigned to a plan instance
   - `/teams?sequenceId={uuid}` - Teams assigned to a sequence instance
   - `/teams?phaseId={uuid}` - Teams assigned to a phase instance

2. **Repository Pattern:**

   ```groovy
   def findByMigrationId(UUID migrationId) {
       DatabaseUtil.withSql { sql ->
           def query = '''
               SELECT DISTINCT t.*
               FROM teams t
               JOIN step_teams st ON t.tms_id = st.tms_id
               JOIN steps_instance sti ON st.sti_id = sti.sti_id
               JOIN phases_instance phi ON sti.phi_id = phi.phi_id
               JOIN sequences_instance sqi ON phi.sqi_id = sqi.sqi_id
               JOIN plans_instance pli ON sqi.pli_id = pli.pli_id
               JOIN iterations itr ON pli.itr_id = itr.itr_id
               WHERE itr.mig_id = :migrationId
           '''
           return sql.rows(query, [migrationId: migrationId])
       }
   }
   ```

3. **API Endpoint Pattern:**

   ```groovy
   if (queryParams.containsKey('migrationId')) {
       def migrationId = UUID.fromString(queryParams.getFirst('migrationId') as String)
       results = teamRepository.findByMigrationId(migrationId)
   }
   ```

**UI Integration:**

- Frontend components progressively filter options based on user selections
- Cascading refinement pattern: Migration → Iteration → Plan → Sequence → Phase
- Dynamic filter updates maintain data consistency
- Child filters automatically reset when parent selection changes

**Progressive Filtering Example:**

- Teams at migration level: 18 teams (all teams in migration)
- Teams at iteration level: 15 teams (subset of migration teams)
- Teams at plan level: 12 teams (subset of iteration teams)
- Teams at sequence level: 8 teams (subset of plan teams)
- Teams at phase level: 5 teams (subset of sequence teams)

**Benefits:**

- **API Consistency:** All resources follow the same filtering pattern
- **Performance:** Optimized queries return only relevant data
- **Flexibility:** Easy to add new filter parameters without breaking existing clients
- **Discoverability:** Clear, self-documenting query parameters
- **Maintainability:** Single endpoint per resource with consistent behavior

### 1.3. API Architecture ([ADR-017])

The project utilizes a versioned API structure (e.g., `v1`, `v2`) to allow for managed evolution of the endpoints without breaking existing clients.

#### Enhanced Error Handling Patterns

The UMIG API implements comprehensive error handling patterns derived from US-036 debugging insights:

- **SQL State to HTTP Status Mapping**: Precise error code translation ensuring proper client response handling
  - `23503` (Foreign Key Violation) → `400 Bad Request`
  - `23505` (Unique Constraint Violation) → `409 Conflict`
- **Consistent Error Response Format**: Structured error responses with user guidance for resolution
- **Authentication Validation**: Robust authentication validation with proper fallback mechanisms to prevent silent authentication failures
- **Repository Pattern Audit Column Standardization**: Consistent audit trail implementation across all data access layers ensuring comprehensive error tracking and debugging capabilities

#### Validation & Constraints

- **CustomEndpointDelegate Only:** No other REST endpoint patterns are permitted (WebWork, JAX-RS, etc.).
- **No Central Dispatchers:** Each endpoint must handle its specific HTTP method and logic directly.
- **Database Error Translation:** All database constraint violations must be translated to appropriate HTTP status codes.

---

## 2. Database Architecture & Management

### 2.1. Database Technology ([ADR-003])

- **System:** PostgreSQL (version 14 or later).
- **Rationale:** An approved, robust, and feature-rich open-source database that is well-supported by the Java ecosystem.

### 2.2. Schema Management ([ADR-008], [ADR-012])

- **Tool:** **Liquibase** is the exclusive tool for managing all database schema changes.
- **Process:**
  - All schema changes are defined in version-controlled Liquibase changelog files.
  - **Manual schema changes are strictly forbidden.**
  - An up-to-date Entity Relationship Diagram (ERD) and a database changelog must be maintained.

### 2.3. Database Connectivity ([ADR-009], [ADR-010])

- **Connection Pooling:** All database connections from the application **must** be obtained from ScriptRunner's built-in **Database Resource Pool**.
- **Driver Management:** This approach delegates JDBC driver management to ScriptRunner, eliminating the need to bundle drivers or create custom container images.

### 2.4. Database & Field Naming Conventions ([ADR-014], [ADR-015], [ADR-016], [ADR-021], [ADR-022], [ADR-024])

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

### 2.5. Key Entity Architecture

The data model follows a hierarchical structure with canonical vs instance pattern:

**Strategic Layer:**

- `migrations_mig`: Top-level strategic initiatives
- `iterations_itr`: Iterative delivery phases within migrations

**Canonical Layer (Templates):**

- `plans_master_plm`: Reusable implementation playbooks
- `sequences_master_sqm`: Logical groupings within plans
- `phases_master_phm`: Major execution phases with quality gates
- `steps_master_stm`: Granular executable tasks with environment role associations (`enr_id`)
- `instructions_master_inm`: Detailed step procedures

**Instance Layer (Execution):**

- `plans_instance_pli`: Live plan executions
- `sequences_instance_sqi`: Active sequence tracking
- `phases_instance_phi`: Phase execution with control validation
- `steps_instance_sti`: Individual step execution records with inherited environment role (`enr_id`)
- `instructions_instance_ini`: Instruction execution details

**Supporting Entities:**

- `users`: Application users with authentication integration
- `teams`: Organizational units for access control
- `app_user_teams`: Many-to-many user-team relationships
- `step_master_comments`: Comments on template steps
- `step_instance_comments`: Comments on execution steps
- `environment_roles_enr`: Environment types (DEV, TEST, PROD) for step association
- `environments_env`: Physical environments linked to roles and iterations
- `status_sts`: Centralized status management with color coding

### 2.6. Full Attribute Instantiation Pattern ([ADR-029])

The system implements complete attribute replication from master to instance tables to support runtime flexibility:

**Design Decision:**
All attributes from master tables are replicated into their corresponding instance tables, enabling:

- **Runtime Overrides:** Instance-specific modifications without affecting templates
- **Audit Trail:** Complete history of what values were used during execution
- **Change Tracking:** Ability to see how execution differed from the plan
- **Continuous Learning:** Feedback loop from instances to improve master templates

**Implementation Details:**

- Instance tables contain all master table columns plus instance-specific fields
- Default values are copied from master records during instantiation
- Override fields allow runtime modifications while preserving original values
- 30% override probability in data generation simulates real-world usage

**Example Structure:**

```sql
-- Master table
CREATE TABLE steps_master_stm (
    stm_id SERIAL PRIMARY KEY,
    stm_name VARCHAR(255),
    stm_description TEXT,
    stm_duration_minutes INTEGER,
    -- other master fields
);

-- Instance table with full replication
CREATE TABLE steps_instance_sti (
    sti_id SERIAL PRIMARY KEY,
    stm_id INTEGER REFERENCES steps_master_stm(stm_id),
    -- Replicated master fields (can be overridden)
    sti_name VARCHAR(255),
    sti_description TEXT,
    sti_duration_minutes INTEGER,
    -- Instance-specific fields
    sti_actual_duration_minutes INTEGER,
    sti_execution_status VARCHAR(50),
    -- other instance fields
);
```

**Benefits:**

- **Flexibility:** Adapt to real-time conditions without losing template integrity
- **Auditability:** Complete record of planned vs actual execution
- **Evolution:** Learn from instance variations to improve master templates
- **Independence:** Instance execution not affected by master template changes

#### Validation Rules

- **No Reserved Words:** Avoid SQL reserved words as table/column names
- **Descriptive Names:** Names must clearly indicate purpose (no cryptic abbreviations)
- **Length Limits:**
  - Table names: Maximum 63 characters (PostgreSQL limit)
  - Column names: Maximum 63 characters
- **Consistency Check:** All similar concepts use identical naming patterns across tables

### 2.7. Status Management System

The system implements a centralized status management approach to ensure consistency across all entities:

**Status Table (`status_sts`):**

- **Purpose:** Centralizes all possible status values with associated colors for UI consistency
- **Structure:**
  - `sts_id`: Primary key (SERIAL)
  - `sts_name`: Status name (e.g., 'PENDING', 'IN_PROGRESS', 'COMPLETED')
  - `sts_color`: Hex color code for UI display (e.g., '#00AA00' for green)
  - `sts_type`: Entity type the status applies to (Migration, Iteration, Plan, Sequence, Phase, Step, Control)
- **Pre-populated Values:** 24 statuses covering all entity types:
  - **Migration/Iteration/Plan/Sequence/Phase:** PLANNING, IN_PROGRESS, COMPLETED, CANCELLED (4 each)
  - **Step:** PENDING, TODO, IN_PROGRESS, COMPLETED, FAILED, BLOCKED, CANCELLED (7 total)
  - **Control:** TODO, PASSED, FAILED, CANCELLED (4 total)
  - **Note:** Instructions use boolean `ini_is_completed` field instead of status FK (by design)
- **Implementation Status (US-006b):**
  - ✅ All entity tables converted from VARCHAR(50) to INTEGER FK references
  - ✅ Foreign key constraints enforced for data integrity
  - ✅ API validation against status_sts table implemented
  - ✅ Instructions API uses boolean completion tracking (no status FK needed)
  - ✅ Repository layer validates all status changes
- **Benefits:**
  - Ensures consistent status values across all data
  - Enables dynamic UI color coding
  - Simplifies status validation
  - Facilitates future status additions without code changes
  - Referential integrity guaranteed through FK constraints

### 2.8. Step Comments & Collaboration Features ([ADR-021])

The system includes comprehensive commenting capabilities to support collaboration and audit trails:

- **Master Step Comments (`step_master_comments`):** Comments attached to template steps for ongoing documentation and improvement.
- **Instance Step Comments (`step_instance_comments`):** Comments attached to specific step executions for real-time collaboration and issue tracking.
- **Features:**
  - Structured feedback mechanisms during step execution
  - Audit trail for decision-making processes
  - Collaborative problem-solving during cutover events
  - Historical context preservation for post-event analysis

### 2.9. Role-Based Access Control System ([ADR-033])

The system implements a comprehensive three-tier role-based access control to ensure operational safety during cutover events:

#### User Role Definitions

**NORMAL (Read-Only Users):**

- View iteration runsheets and step details
- Read comments and historical data
- No modification capabilities
- Visual read-only indicators throughout UI

**PILOT (Operational Users):**

- All NORMAL capabilities plus:
- Update step statuses
- Complete/uncomplete instructions
- Add, edit, and delete comments
- Execute step actions
- View operational controls

**ADMIN (System Administrators):**

- All PILOT capabilities plus:
- Access administrative functions
- User and system management
- Configuration capabilities
- Full system control

#### Backend Implementation

**User Context API:**

```groovy
user(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // GET /user/context
    if (pathParts.size() == 1 && pathParts[0] == 'context') {
        def username = queryParams.getFirst('username')
        def user = userRepository.findUserByUsername(username as String)

        return Response.ok(new JsonBuilder([
            userId: userMap.usr_id,
            username: userMap.usr_code,
            firstName: userMap.usr_first_name,
            lastName: userMap.usr_last_name,
            isAdmin: userMap.usr_is_admin,
            roleId: userMap.rls_id,
            role: userMap.role_code ?: 'NORMAL'
        ]).toString()).build()
    }
}
```

#### Implementation Benefits

- **Operational Safety:** Prevents unauthorized changes during critical cutover events
- **Confluence Integration:** Seamless authentication using existing user accounts
- **Progressive UI:** Interface adapts intelligently based on user capabilities
- **Clear Boundaries:** Distinct separation between viewer, operator, and admin functions
- **Audit Trail:** Role-based actions are tracked for compliance and review

### 2.10. Database Connection Management ([ADR-009], [ADR-010])

Database connectivity has evolved through several iterations to achieve optimal reliability:

- **Current Approach:** All database connections **must** be obtained from ScriptRunner's built-in **Database Resource Pool** (`umig_db_pool`).
- **Historical Evolution:**
  - **Initial Approach:** Manual JDBC driver management with custom container images led to classloader conflicts.
  - **Current Solution:** Delegate driver management to ScriptRunner, eliminating the need to bundle drivers.
- **Connection Validation:** All connections should be validated using a simple `SELECT 1` ping test before use.
- **Benefits:** This approach provides stability, reduces maintenance overhead, and leverages ScriptRunner's built-in connection pooling capabilities.

### 2.11. Data Model Evolution History

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

#### Audit Fields Standardization (US-002b - August 2025)

- **Challenge:** Inconsistent audit field implementation across 25+ tables.
- **Solution:** Migration 016 standardized all tables with `created_by`, `created_at`, `updated_by`, `updated_at`.
- **Special Cases:** Handled existing fields in `labels_lbl` (INTEGER created*by), `users_usr` (existing timestamps), and `email_templates_emt` (emt*\* fields).
- **Impact:** Consistent tracking of data changes, simplified API patterns, improved compliance and debugging capabilities.

---

## 3. Data Management

### 3.1. Data Import Strategy ([ADR-028])

The system implements an efficient strategy for importing large volumes of JSON data from Confluence exports:

#### Import Architecture

- **Approach:** Use PostgreSQL's native `\copy` command with staging tables
- **Performance:** Capable of importing 500+ JSON files in under 3 minutes
- **Technology:** Shell script orchestration with SQL transformation logic

#### Implementation Pattern

1. **Staging Table:** Temporary table with single JSONB column for raw data
2. **Bulk Load:** Use `psql \copy` to load JSON files into staging table
3. **Transformation:** SQL queries to extract and transform JSON into normalized tables
4. **Validation:** Constraint checking and data integrity verification
5. **Cleanup:** Drop staging table after successful import

#### Key Benefits

- **No New Dependencies:** Uses only PostgreSQL and standard shell tools
- **Transactional:** All-or-nothing import with rollback capability
- **Idempotent:** Can be run multiple times without data corruption
- **Performance:** Orders of magnitude faster than row-by-row insertion
- **Flexibility:** JSON structure can evolve without breaking import process

#### Example Usage

```bash
# Import Confluence export files
./import-confluence-data.sh /path/to/json/files/*.json

# Import with specific target schema
./import-confluence-data.sh --schema umig_staging /path/to/exports/
```

### 3.2. Data Utilities ([ADR-013])

- **Language:** All data generation, import, and utility scripts are written in **NodeJS**.
- **Idempotency:** Data generation scripts must be idempotent and include a `--reset` flag that only truncates the tables managed by that script.
- **Rationale:** Node.js provides excellent database connectivity, JSON handling, and integration with the development environment orchestration.

---

## 4. API Reference Documentation

### 4.1. Consolidated ADR References

This API & Data Architecture consolidates the following architectural decisions:

### API Design & Implementation

- [ADR-011](../adr/archive/ADR-011-ScriptRunner-REST-Endpoint-Configuration.md) - ScriptRunner REST Endpoint Configuration
- [ADR-017](../adr/archive/ADR-017-V2-REST-API-Architecture.md) - V2 REST API Architecture
- [ADR-023](../adr/archive/ADR-023-Standardized-Rest-Api-Patterns.md) - Standardized REST API Patterns
- [ADR-030](../adr/archive/ADR-030-hierarchical-filtering-pattern.md) - Hierarchical Filtering Pattern
- [ADR-031](../adr/archive/ADR-031-groovy-type-safety-and-filtering-patterns.md) - Groovy Type Safety and Filtering Patterns
- [ADR-039](../adr/ADR-039-enhanced-error-handling-and-user-guidance.md) - Enhanced Error Handling and User Guidance
- [ADR-043](../adr/ADR-043-postgresql-jdbc-type-casting-standards.md) - PostgreSQL JDBC Type Casting Standards
- [ADR-044](../adr/ADR-044-scriptrunner-repository-access-patterns.md) - ScriptRunner Repository Access Patterns
- [ADR-047](../adr/ADR-047-layer-separation-anti-patterns.md) - Layer Separation Anti-Patterns

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
- [ADR-029](../adr/archive/ADR-029-full-attribute-instantiation-instance-tables.md) - Full Attribute Instantiation Instance Tables

### Data Import & Management

- [ADR-028](../adr/archive/ADR-028-data-import-strategy-for-confluence-json.md) - Data Import Strategy for Confluence JSON
- [ADR-013](../adr/archive/ADR-013-Data-Utilities-Language-NodeJS.md) - Data Utilities Language: NodeJS

---

## Navigation

- **Previous:** [Architecture Foundation](./architecture-foundation.md) - Core principles, system architecture, and technology stack
- **Next:** [Development & Operations](./development-operations.md) - DevOps, testing, and operational patterns
- **Related:** [Implementation Patterns](./implementation-patterns.md) - Type safety, filtering, and coding patterns
- **See Also:** [Main Architecture Index](./solution-architecture.md) - Complete architecture navigation

---

_Part of UMIG Solution Architecture Documentation_
