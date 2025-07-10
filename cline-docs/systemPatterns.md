# System Patterns

## 1. System Architecture

The system is designed as a **Confluence-Integrated Application**, leveraging the Atlassian platform as the host, and structured around an **N-Tier architecture model** (ADR-027).

1. **UI (User Interface) Layer:** A custom Confluence Macro built with **HTML, JavaScript, and CSS** (ADR-004). This macro renders the entire user interface, including the live dashboard and planning views. The Iteration View macro now renders correctly with robust, environment-agnostic static asset serving.
2. **Business Process Layer:** Implemented within **Atlassian ScriptRunner** (Groovy), this layer orchestrates business workflows and processes, consuming data from the Business Objects Definition Layer and coordinating with the Data Access Layer (ADR-002, ADR-011, ADR-018).
3. **Business Objects Definition Layer:** Defines the core business entities and their validation rules, representing the state and behaviour of the business domain.
4. **Data Transformation Layer:** Handles the transformation of data between different layers, such as converting data from the format used by the data access layer to the format required by the business objects layer (e.g., DTOs).
5. **Data Access Layer (DAL):** Provides a simplified and consistent interface for accessing data from the **PostgreSQL** database (ADR-003). This layer abstracts the underlying data storage mechanism from the rest of the application.

## 2. Key Technical Decisions

* **Architectural Model:** The Confluence-Integrated model was chosen to maximise the use of the existing technology portfolio, significantly reducing development overhead for authentication, user management, and email integration, thus making the project feasible within the timeline (ADR-001). The adoption of an N-Tier architecture further enhances maintainability, scalability, and separation of concerns (ADR-027).
* **Source Tree Consolidation:** A major refactoring consolidated the UMIG source tree under the `src/groovy/umig/` namespace for clarity, future-proofing, and ScriptRunner compatibility.
* **Real-Time Updates:** The UI will achieve a near-real-time feel via **AJAX Polling**. The frontend JavaScript will poll the ScriptRunner REST endpoints at a regular interval (e.g., every 5-10 seconds) to fetch the latest state and update the DOM (ADR-005).
* **Data Model:** The core normalised relational data model is used, employing UUIDs for internal keys and storing human-readable identifiers separately (ADR-014). Key aspects include:
  * **Canonical vs. Instance:** Clear separation between reusable master plans/steps and their executable instances (ADR-015).
  * **Hierarchy:** `Migration > Iteration > Plan > Sequence > Phase > Step > Instruction`.
  * **Iteration-Centric:** Migrations are decoupled from plans; iterations link a migration run to a specific master plan (ADR-024).
  * **Many-to-Many Relationships:** Association (join) tables are used for `step_dependencies`, `step_iteration_scope`, `task_controls_link`, and `teams_tms_x_users_usr` (for user-team membership) (ADR-022).
  * **Control Status per Iteration:** The status of a `Control` is tracked per-iteration using a join table (`control_iteration_status`) that contains the status (`PASSED`, `FAILED`) as payload. Controls are logically scoped to phases (ADR-016).
  * **Comments:** Dedicated tables for step-level and instance-level comments (`step_pilot_comments_spc`, `step_instance_comments_sic`) (ADR-021).
* **Hierarchical Filtering Pattern (ADR-030, ADR-031, 2025-07-10):** Consistent query parameter filtering across all resources for intuitive navigation of complex data hierarchies:
  * **Unified Query Parameters:** All resources support filtering by hierarchy level: `?migrationId=`, `?iterationId=`, `?planId=`, `?sequenceId=`, `?phaseId=`
  * **Database-Level Filtering:** Efficient SQL queries with appropriate joins to filter data at the source
  * **Cascading UI Behaviour:** Frontend filters dynamically update based on parent selections, reducing cognitive load
  * **Progressive Refinement:** Each filter level narrows the available options in dependent filters
  * **Type-Safe Implementation:** Explicit casting patterns (`as String`) for all query parameter processing to prevent Groovy static type checking errors
  * **Master vs Instance Filtering:** Always use instance IDs (pli_id, sqi_id, phi_id) for hierarchical filtering, not master IDs
* **Dynamic Data Integration Pattern (2025-07-04):** A robust pattern for macro development where UI selectors are populated dynamically via REST APIs rather than hardcoded in Groovy:
  * **Repository Pattern:** Encapsulated database access using `DatabaseUtil.withSql` (e.g., `MigrationRepository.groovy`, `LabelRepository.groovy`, `TeamRepository.groovy`)
  * **API-Driven UI Population:** Macros provide skeleton HTML with loading states; JavaScript handles all data fetching and UI population
  * **Clean Architecture Separation:** Clear separation between data access (repository), business logic (API), and presentation (macro/JavaScript)
* **Full Attribute Instantiation Pattern (ADR-029):** Instance tables replicate all relevant master table attributes for runtime flexibility and auditability, enabling pilots to override any attribute without affecting master templates.
* **Data Generation Pipeline Pattern:** Modular generators with strict execution order dependencies, ensuring master data exists before instance creation. Enhanced with comprehensive logging and complete field inheritance.
* **Planning Feature Pattern:** A dedicated table, `chapter_schedules`, stores the planned start/end times for each chapter per iteration. A specific ScriptRunner endpoint (`/schedule/export`) is responsible for querying this data and generating a clean, portable HTML `<table>` as a shareable artifact.
* **Auditing Pattern:** An immutable `event_log` table will capture every critical action (status change, email sent, user comment). Each log entry will have a precise timestamp, event type, relational links, and a flexible JSONB field for contextual details. This pattern ensures full auditability and facilitates analytics.
* **Decoupled Orchestration Engine:** While integrated within Confluence, the core logic and data are separate. The PostgreSQL database holds the state, and ScriptRunner acts as the brain, ensuring the system is more than just a documentation add-on.
* **Standardised REST API:** A strict RESTful architecture is adopted for V2, with resource-oriented URLs, standard HTTP verbs, hierarchical paths, and robust error handling (ADR-017, ADR-023). This includes enhanced error reporting for blocking relationships and input validation.
* **Local Development Environment:** Managed by a Node.js-based orchestration layer using Podman and Ansible (ADR-025). Liquibase is used for database migrations (ADR-008).
* **Testing:** A formal integration testing framework is established to run tests against the live database (ADR-019). Specific mocks are enforced in tests to prevent regressions (ADR-026).
* **Data Import Strategy:** Bulk import of Confluence JSON exports uses `psql \copy` with a staging table, ensuring high performance and robustness for heterogeneous data (ADR-028).
* **Groovy Type Safety Pattern (ADR-031):** Mandatory patterns for preventing runtime type errors in ScriptRunner environments:
  * **Explicit Casting:** Always use `filters.migrationId as String` when passing query parameters to UUID.fromString() or Integer.parseInt()
  * **Complete Field Selection:** Include ALL fields referenced in result mapping in SQL SELECT clauses
  * **Graceful Error Handling:** Wrap many-to-many relationship queries in try-catch blocks to prevent API failures

## 3. Component Relationships

```mermaid
graph TD
    User -->|Interacts with| UI_Layer[UI Layer (Confluence Macro)]
    UI_Layer -->|AJAX Calls| Business_Process_Layer[Business Process Layer (ScriptRunner API)]
    Business_Process_Layer -->|Uses| Business_Objects_Definition_Layer[Business Objects Definition Layer]
    Business_Process_Layer -->|Transforms Data via| Data_Transformation_Layer[Data Transformation Layer]
    Data_Transformation_Layer -->|Accesses Data via| Data_Access_Layer[Data Access Layer]
    Data_Access_Layer -->|Queries| PostgreSQL_DB[PostgreSQL Database]
    Business_Process_Layer -->|Sends Email via| Exchange_Server[Enterprise Exchange Server]
```

For a detailed Entity Relationship Diagram (ERD) of the data model, refer to `docs/dataModel/README.md`.

For a detailed Entity Relationship Diagram (ERD) of the data model, refer to `docs/dataModel/README.md`.
