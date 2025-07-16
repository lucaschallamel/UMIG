# UMIG Solution Architecture & Design

**Version:** 2025-07-16  
**Maintainers:** UMIG Project Team  
**Source ADRs:** This document consolidates 33 architectural decisions (26 archived + 7 newly consolidated: ADR-027 through ADR-033). For full historical context, see the original ADRs in `/docs/adr/archive/`.  
**Latest Updates:** N-tier architecture adoption, data import strategy, full attribute instantiation, hierarchical filtering patterns, type safety implementation, email notification architecture, role-based access control

## Consolidated ADR Reference

This document consolidates the following architectural decisions:

### Core Architecture & Technology Stack
- [ADR-001](../adr/archive/ADR-001-Confluence-Integrated-Application-Architecture.md) - Confluence-Integrated Application Architecture
- [ADR-002](../adr/archive/ADR-002-Backend-Implementation-with-Atlassian-ScriptRunner.md) - Backend Implementation with Atlassian ScriptRunner
- [ADR-003](../adr/archive/ADR-003-Database-Technology-PostgreSQL.md) - Database Technology: PostgreSQL
- [ADR-004](../adr/archive/ADR-004-Frontend-Implementation-Vanilla-JavaScript.md) - Frontend Implementation: Vanilla JavaScript
- [ADR-005](../adr/archive/ADR-005-Real-time-Update-Mechanism-AJAX-Polling.md) - Real-time Update Mechanism: AJAX Polling
- [ADR-027](../adr/archive/ADR-027-n-tiers-model.md) - N-tiers Model Architecture

### Development Environment & Operations
- [ADR-006](../adr/archive/ADR-006-Podman-and-Ansible-for-Local-Development-Environment.md) - Podman and Ansible for Local Development Environment
- [ADR-007](../adr/archive/ADR-007-local-dev-setup-plugin-installation.md) - Local Dev Setup Plugin Installation
- [ADR-013](../adr/archive/ADR-013-Data-Utilities-Language-NodeJS.md) - Data Utilities Language: NodeJS
- [ADR-025](../adr/archive/ADR-025-NodeJS-based-Dev-Environment-Orchestration.md) - NodeJS-based Dev Environment Orchestration
- [ADR-028](../adr/archive/ADR-028-data-import-strategy-for-confluence-json.md) - Data Import Strategy for Confluence JSON

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

### API Design & Implementation
- [ADR-011](../adr/archive/ADR-011-ScriptRunner-REST-Endpoint-Configuration.md) - ScriptRunner REST Endpoint Configuration
- [ADR-017](../adr/archive/ADR-017-V2-REST-API-Architecture.md) - V2 REST API Architecture
- [ADR-023](../adr/archive/ADR-023-Standardized-Rest-Api-Patterns.md) - Standardized REST API Patterns
- [ADR-030](../adr/archive/ADR-030-hierarchical-filtering-pattern.md) - Hierarchical Filtering Pattern
- [ADR-031](../adr/archive/ADR-031-groovy-type-safety-and-filtering-patterns.md) - Groovy Type Safety and Filtering Patterns

### Application Structure & UI Patterns
- [ADR-018](../adr/archive/ADR-018-Pure-ScriptRunner-Application-Structure.md) - Pure ScriptRunner Application Structure
- [ADR-020](../adr/archive/ADR-020-spa-rest-admin-entity-management.md) - SPA+REST Admin Entity Management

### Testing & Quality Assurance
- [ADR-019](../adr/archive/ADR-019-Integration-Testing-Framework.md) - Integration Testing Framework
- [ADR-026](../adr/archive/ADR-026-Specific-Mocks-In-Tests.md) - Specific Mocks in Tests

### Communication & Notifications
- [ADR-032](../adr/archive/ADR-032-email-notification-architecture.md) - Email Notification Architecture

### Security & Access Control
- [ADR-033](../adr/archive/ADR-033-role-based-access-control-implementation.md) - Role-Based Access Control Implementation

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

### 3.2. N-Tier Architecture Model ([ADR-027])

The UMIG application follows a structured N-Tier architecture to ensure clear separation of concerns and maintainability:

#### Architecture Layers

1. **UI (User Interface) Layer**
   - **Technology:** Vanilla JavaScript with Atlassian AUI components
   - **Responsibilities:** User interaction, visual presentation, client-side validation
   - **Components:** ScriptRunner macros, JavaScript controllers, CSS styling

2. **Business Process Layer**
   - **Technology:** Groovy scripts in ScriptRunner
   - **Responsibilities:** Workflow orchestration, business rules, process coordination
   - **Components:** API endpoint handlers, process orchestrators

3. **Business Objects Definition Layer**
   - **Technology:** Groovy classes and data structures
   - **Responsibilities:** Domain model definitions, business entity representations
   - **Components:** Entity classes, value objects, business rule validators

4. **Data Transformation Layer**
   - **Technology:** Groovy transformation logic
   - **Responsibilities:** Data mapping between layers, format conversions, aggregations
   - **Components:** Repository result mappers, API response builders

5. **Data Access Layer (DAL)**
   - **Technology:** Groovy repository pattern with SQL
   - **Responsibilities:** Database interactions, query optimization, connection management
   - **Components:** Repository classes, DatabaseUtil, SQL query builders

#### Benefits of N-Tier Architecture
- **Improved Structure:** Clear separation between presentation, business logic, and data access
- **Enhanced Scalability:** Each tier can be optimized independently
- **Better Reusability:** Business logic can be shared across different UI components
- **Parallel Development:** Teams can work on different tiers simultaneously
- **Easier Testing:** Each tier can be tested in isolation

### 3.3. Project Structure ([ADR-018])

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

##### Hierarchical Filtering Pattern ([ADR-030])

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
- **Association Management:** Modal-based interfaces for managing many-to-many relationships (e.g., environment-application, environment-iteration, application-label associations)
- **Custom Confirmation Dialogs:** Promise-based confirmation system replacing native `confirm()` to prevent UI flickering issues during destructive operations
- **Notification System:** User feedback through slide-in/slide-out notifications with automatic dismissal
- **Role-Based Access Control:** Navigation sections dynamically shown based on user roles (SUPERADMIN, ADMIN, PILOT)

### 5.4. Custom Confirmation Dialog Pattern
The environment management system implements a custom confirmation dialog pattern to resolve UI flickering issues that occur with the native JavaScript `confirm()` function in complex modal contexts.

#### Problem Context
During environment association management, the native `confirm()` function would flicker and disappear immediately when used within modal dialogs containing real-time updates and notification systems. This made it impossible for users to confirm destructive operations like removing associations.

#### Implementation Details
- **Problem Solved:** Native `confirm()` function causes UI flickering and timing issues when used within modal dialogs containing real-time updates
- **Solution:** Custom Promise-based confirmation dialog system that creates DOM elements dynamically
- **DOM Structure:** Fixed-position overlay with centered dialog box containing message and action buttons
- **Styling:** Inline CSS styles for maximum compatibility, avoiding external stylesheet dependencies
- **Event Handling:** Button click handlers that resolve/reject promises for seamless async/await integration
- **Cleanup:** Automatic DOM cleanup after user interaction to prevent memory leaks

#### Technical Implementation
The custom confirmation dialog is implemented as a method in the ModalManager that creates a blocking overlay:

```javascript
showSimpleConfirm: function(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const dialog = document.createElement('div');
        dialog.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; text-align: center;">
                <p>${message}</p>
                <div style="margin-top: 20px;">
                    <button id="confirmOk" style="margin-right: 10px; padding: 8px 16px; background: #0052cc; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>
                    <button id="confirmCancel" style="padding: 8px 16px; background: #f5f5f5; color: #333; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Handle button clicks
        dialog.querySelector('#confirmOk').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });
        
        dialog.querySelector('#confirmCancel').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(false);
        });
    });
}
```

#### Usage Pattern
```javascript
// Custom confirmation dialog usage
const confirmed = await this.showSimpleConfirm('Are you sure you want to remove this association?');
if (confirmed) {
    // Proceed with destructive operation
    await ApiClient.environments.disassociateApplication(envId, appId);
}
```

#### Benefits
- **Eliminates UI Flickering:** Prevents visual interruptions during confirmation workflows
- **Consistent Styling:** Maintains application UI consistency across all confirmation interactions
- **Promise-Based:** Integrates seamlessly with modern async/await patterns
- **Reliable Event Handling:** Avoids timing conflicts with notification systems and modal state management
- **High Z-Index:** Ensures dialog appears above all other elements including existing modals
- **Blocking Design:** Prevents user interaction with underlying UI until confirmation is provided

#### Field Name Transformation Pattern (July 2025)

Different API endpoints may return different field naming conventions for the same entity type. This is particularly evident in the Labels API:

##### Issue
- The generic `/labels` endpoint returns transformed field names: `{ id, name, description, color }`
- Entity-specific endpoints like `/applications/{id}/labels` return database column names: `{ lbl_id, lbl_name, lbl_color }`

##### Solution
Frontend code must handle both naming conventions when consuming API responses:

```javascript
// When populating dropdowns with all labels
this.createSelectOptions(allLabels, 'id', 'name')  // Uses transformed names

// When displaying application-specific labels
labels.forEach(label => {
    // Uses database column names
    html += `<span style="background-color: ${label.lbl_color}">${label.lbl_name}</span>`;
});
```

##### Best Practice
- Always check the actual API response format before accessing fields
- Consider standardizing API responses across all endpoints in future iterations
- Document field name transformations in API documentation

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

#### Full Attribute Instantiation Pattern ([ADR-029])

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

### 6.5. Step Comments & Collaboration Features ([ADR-021])

The system includes comprehensive commenting capabilities to support collaboration and audit trails:

- **Master Step Comments (`step_master_comments`):** Comments attached to template steps for ongoing documentation and improvement.
- **Instance Step Comments (`step_instance_comments`):** Comments attached to specific step executions for real-time collaboration and issue tracking.
- **Features:**
  - Structured feedback mechanisms during step execution
  - Audit trail for decision-making processes
  - Collaborative problem-solving during cutover events
  - Historical context preservation for post-event analysis

### 6.6. Status Management System

The system implements a centralized status management approach to ensure consistency across all entities:

**Status Table (`status_sts`):**
- **Purpose:** Centralizes all possible status values with associated colors for UI consistency
- **Structure:**
  - `sts_id`: Primary key (SERIAL)
  - `sts_name`: Status name (e.g., 'PENDING', 'IN_PROGRESS', 'COMPLETED')
  - `sts_color`: Hex color code for UI display (e.g., '#00AA00' for green)
  - `sts_type`: Entity type the status applies to (Migration, Iteration, Plan, Sequence, Phase, Step, Control)
- **Pre-populated Values:** 31 statuses covering all entity types:
  - **Migration/Iteration/Plan/Sequence/Phase:** PLANNING, IN_PROGRESS, COMPLETED, CANCELLED
  - **Step:** PENDING, TODO, IN_PROGRESS, COMPLETED, FAILED, BLOCKED, CANCELLED
  - **Control:** TODO, PASSED, FAILED, CANCELLED
- **Benefits:**
  - Ensures consistent status values across all data
  - Enables dynamic UI color coding
  - Simplifies status validation
  - Facilitates future status additions without code changes

### 6.7. Role-Based Access Control System ([ADR-033])

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

#### Frontend Implementation

**CSS Class-Based Control:**
```css
.pilot-only {
    /* Shown only to PILOT and ADMIN users */
}

.admin-only {
    /* Shown only to ADMIN users */
}

.role-disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
}
```

**JavaScript Role Detection:**
```javascript
// User context injected via Confluence macro
window.UMIG_ITERATION_CONFIG = {
    confluence: {
        username: "user@company.com",
        fullName: "John Doe",
        email: "user@company.com"
    },
    api: {
        baseUrl: "/rest/scriptrunner/latest/custom"
    }
};

// Dynamic role application
applyRoleBasedControls() {
    const role = this.userRole;
    if (role === 'NORMAL') {
        this.hideElementsWithClass('admin-only');
        this.disableElementsWithClass('pilot-only');
        this.addReadOnlyIndicators();
    } else if (role === 'PILOT') {
        this.hideElementsWithClass('admin-only');
        this.showAndEnableElementsWithClass('pilot-only');
    } else if (role === 'ADMIN') {
        this.showAndEnableElementsWithClass('admin-only');
        this.showAndEnableElementsWithClass('pilot-only');
    }
}
```

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

### 6.8. Database Connection Management ([ADR-009], [ADR-010])

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

### 7.5. Data Import Strategy ([ADR-028])

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

#### Critical Implementation Requirements

**Mandatory Type Casting:**
All ScriptRunner repository methods must use explicit type casting when static type checking is enabled. This prevents runtime `ClassCastException` errors that are difficult to debug.

#### Type-Safe Parameter Handling

1. **UUID Parameters:**
```groovy
// CORRECT - Explicit casting for type safety
if (filters.migrationId) {
    query += ' AND mig.mig_id = :migrationId'
    params.migrationId = UUID.fromString(filters.migrationId as String)
}

// INCORRECT - Will cause runtime ClassCastException
params.migrationId = UUID.fromString(filters.migrationId)  // Missing 'as String'
```

2. **Integer Parameters:**
```groovy
// CORRECT - Explicit casting for integers
if (filters.teamId) {
    query += ' AND stm.tms_id_owner = :teamId'
    params.teamId = Integer.parseInt(filters.teamId as String)
}

// INCORRECT - Type inference fails
params.teamId = Integer.parseInt(filters.teamId)  // Missing 'as String'
```

3. **Path Parameter Extraction:**
```groovy
// CORRECT - Safe path parameter handling
def pathParts = getAdditionalPath(request)?.split('/') ?: []
if (pathParts.size() >= 1) {
    def id = Integer.parseInt(pathParts[0] as String)
}
```

#### Complete Field Selection Pattern

**Critical Rule:** Always include ALL fields referenced in result mapping in the SELECT clause:

```groovy
// CORRECT - All referenced fields included
def query = '''
    SELECT stm.stm_id, stm.stm_name, stm.stm_description,
           stt.stt_code, stt.stt_name
    FROM steps_master_stm stm
    JOIN step_types_stt stt ON stm.stt_id = stt.stt_id
'''

// INCORRECT - Missing fields cause "No such property" errors
def query = '''
    SELECT stm.stm_id, stm.stm_name
    FROM steps_master_stm stm
    JOIN step_types_stt stt ON stm.stt_id = stt.stt_id
'''
// Later reference to stt.stt_code will fail
```

#### Instance vs Master ID Filtering

**Rule:** Always use instance IDs for hierarchical filtering:

```groovy
// CORRECT - Use instance IDs
query += ' AND pli.pli_id = :planId'      // plan instance ID
query += ' AND sqi.sqi_id = :sequenceId'  // sequence instance ID
query += ' AND phi.phi_id = :phaseId'     // phase instance ID

// INCORRECT - Using master IDs misses data
query += ' AND plm.plm_id = :planId'      // Wrong! Uses master ID
```

#### Error Handling Patterns

1. **Graceful Null Handling:**
```groovy
// Handle missing parameters gracefully
def migrationId = filters.migrationId ? 
    UUID.fromString(filters.migrationId as String) : null
```

2. **Type Conversion Safety:**
```groovy
try {
    params.teamId = Integer.parseInt(filters.teamId as String)
} catch (NumberFormatException e) {
    return Response.status(400).entity([
        error: "Invalid team ID format"
    ]).build()
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

## 10. Email Notification System ([ADR-032])

### 10.1. Architecture Overview

The email notification system provides automated notifications for step status changes during migration events using Confluence's native mail API.

#### System Components
- **EmailService**: Core notification service with template processing
- **EmailTemplateRepository**: Template management with CRUD operations  
- **AuditLogRepository**: Comprehensive audit logging for all email events
- **EmailTemplatesApi**: REST API for template management

#### Integration Points
- StepRepository methods trigger email notifications for status changes
- Multi-team notification (owner + impacted teams)
- MailHog integration for local development testing

### 10.2. Email Templates

#### Template Storage
Email templates are stored in `email_templates_emt` table with:
- HTML content with GString variable substitution
- Active/inactive status management
- Template types: STEP_OPENED, INSTRUCTION_COMPLETED, STEP_STATUS_CHANGED

#### Template Processing Pattern
```groovy
// Template variable preparation
def variables = [
    stepInstance: stepInstance,
    stepUrl: "${baseUrl}/display/SPACE/IterationView?stepId=${stepInstance.sti_id}",
    changedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
    changedBy: getUsernameById(sql, userId)
]

// Process template with SimpleTemplateEngine
def processedSubject = processTemplate(template.emt_subject, variables)
def processedBody = processTemplate(template.emt_body_html, variables)
```

### 10.3. Notification Triggers

#### Step Status Changes
- **STEP_OPENED**: Notifies owner + impacted teams when PILOT opens a step
- **STEP_STATUS_CHANGED**: Notifies owner + impacted teams + cutover team for status updates
- **INSTRUCTION_COMPLETED**: Notifies owner + impacted teams when instruction is completed

#### Recipient Logic
```groovy
// Multi-team notification pattern
def allTeams = new ArrayList(teams)
if (cutoverTeam) {
    allTeams.add(cutoverTeam)
}
def recipients = extractTeamEmails(allTeams)
```

### 10.4. Audit Logging

#### Comprehensive Email Audit Trail
All email events are logged to `audit_log_aud` table:
- **EMAIL_SENT**: Successful email delivery with full details
- **EMAIL_FAILED**: Failed email attempts with error messages
- **STATUS_CHANGED**: Business event logging separate from email notifications

#### JSONB Audit Details
```groovy
def details = [
    recipients: recipients,
    subject: subject,
    template_id: templateId?.toString(),
    status: 'SENT',
    notification_type: 'STEP_STATUS_CHANGED',
    step_name: stepInstance.sti_name,
    old_status: oldStatus,
    new_status: newStatus
]
```

### 10.5. Development Testing

#### MailHog Integration
- Local SMTP server (localhost:1025) for email testing
- Web interface (localhost:8025) for email verification
- Graceful fallback when MailHog is not available

#### Testing Pattern
```groovy
// ScriptRunner Console testing
def stepRepo = new StepRepository()
def result = stepRepo.openStepInstanceWithNotification(stepId, userId)
// Check result.success and result.emailsSent
```

---

This document will be updated as new architectural decisions are made. All changes should be reflected here to maintain it as the canonical source of truth for the UMIG project's architecture.
