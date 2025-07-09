# Active Context

## 1. Current Work Focus

The project is currently in the **implementation phase**, focusing on building out the core backend APIs and frontend UI components within the Confluence-integrated architecture. Recent efforts have concentrated on **hierarchical filtering implementation for the Iteration View** and **completing the Labels and enhanced Teams APIs**. Key achievements include implementing cascading filters that dynamically update based on parent selections, establishing consistent query parameter patterns across all resources, and creating comprehensive API documentation for the new filtering capabilities.

## 2. Recent Changes & Decisions

* **Hierarchical Filtering Pattern (2025-07-09, ADR-030):** Implemented comprehensive hierarchical filtering across Teams and Labels APIs:
  * **Consistent Query Parameters:** All resources now support filtering by hierarchy level (`?migrationId=`, `?iterationId=`, `?planId=`, `?sequenceId=`, `?phaseId=`)
  * **Repository Pattern Extension:** Created `LabelRepository.groovy` and enhanced `TeamRepository.groovy` with hierarchical filtering methods
  * **Cascading Filter Behaviour:** Frontend filters dynamically update based on parent selections, providing progressive refinement
  * **API Documentation:** Created detailed API specifications (TeamsAPI.md, LabelsAPI.md) and updated OpenAPI spec
* **Architectural Confirmation:** The **Confluence-Integrated Application** model is confirmed, leveraging Atlassian ScriptRunner (Groovy) for the backend, vanilla HTML/JavaScript/CSS for the frontend (as a Confluence macro), and PostgreSQL as the database. The project explicitly adopts an **N-Tier architecture** model for improved structure and clarity (ADR-027).
* **Dynamic Data Integration Pattern (2025-07-04):** Established a robust pattern for macro development where UI selectors are populated dynamically via REST APIs rather than hardcoded in Groovy. This includes:
  * **Repository Pattern Implementation:** Created `MigrationRepository.groovy` for encapsulated database access using `DatabaseUtil.withSql`
  * **API-Driven UI Population:** The Iteration View macro now loads migration data dynamically from `/rest/scriptrunner/latest/custom/migrations`
  * **Clean Architecture Separation:** Clear separation between data access (repository), business logic (API), and presentation (macro/JavaScript)
* **Instance Data Generation Pipeline Refactor (2025-07-04):** Resolved critical issues with instance data inheritance:
  * **Generator Execution Order:** Renamed `101_generate_instructions.js` to `098_generate_instructions.js` to ensure master data exists before instance creation
  * **Full Attribute Instantiation:** Implemented complete field inheritance from master to instance records, following ADR-029 principles
  * **Schema Consistency:** Fixed type mismatches (e.g., `instructions_instance_ini.tms_id` changed from UUID to INTEGER)
  * **Enhanced Logging:** Added comprehensive debug logging for troubleshooting data generation issues
* **Data Model Refinements:**
  * Full Attribute Instantiation for Instance Tables (ADR-029): Instance tables now replicate all relevant master table attributes for runtime flexibility and auditability
  * Iteration-centric data model linking migrations to master plans via the `iterations_ite` table (ADR-024)
  * Many-to-many user-team relationship using `teams_tms_x_users_usr` join table (ADR-022)
  * Dedicated comment tables for step-level and instance-level comments (ADR-021)
* **Data Import Strategy:** Formalised strategy for Confluence JSON exports using `psql \copy` with staging tables for high-performance, dependency-free data ingestion (ADR-028)
* **Source Tree Consolidation:** Major refactoring consolidated the UMIG source tree under the `src/groovy/umig/` namespace for clarity and ScriptRunner compatibility
* **Local Development Environment:** Node.js-based orchestration layer with unified `umig-local` CLI (ADR-025)
* **API Standardisation:** Robust REST API implementation patterns with precise error handling and SQL exception mapping (ADR-023)
* **Test Suite Stability:** Stabilised with precise SQL query mocks and improved test isolation (ADR-026)
* **Project Governance:** Comprehensive rule system in `.clinerules/rules` with consolidated solution architecture documentation

## 3. Next Steps

1. **Complete Iteration View Implementation:** Finalise the ScriptRunner macro integration with full filtering capabilities and step management features.
2. **Core API Development:** Implement remaining backend REST API endpoints for Plans, Sequences, Phases, Steps, Instructions, and Controls using the established hierarchical filtering pattern.
3. **Frontend Enhancement:** Extend the Iteration View JavaScript to handle step details, status updates, and real-time data refresh.
4. **Integration Testing:** Add comprehensive tests for the hierarchical filtering functionality across all affected APIs.
5. **Planning Feature Implementation:** Build the UI for the "Planning Feature" to allow input and generation of the HTML macro-plan.
6. **Real-time Dashboard:** Develop the frontend JavaScript for the main dashboard with AJAX polling for real-time updates.
7. **Data Import Finalisation:** Complete the data import strategy for migrating existing runbook data from Confluence/Draw.io/Excel sources.
8. **Performance Testing:** Validate the performance of hierarchical queries under load conditions.
9. **End-to-End Testing:** Conduct comprehensive testing with real user scenarios and data.

## 4. Important Patterns and Learnings

* **Hierarchical Filtering Pattern:** The implementation of ADR-030 demonstrates how consistent query parameter filtering across all resources provides an intuitive and performant way to navigate complex data hierarchies.
* **Dynamic Data Integration Pattern:** The successful implementation of the Iteration View macro established a reusable pattern where UI selectors are populated dynamically via REST APIs rather than hardcoded in Groovy, promoting maintainability and testability.
* **Repository Pattern Benefits:** The `MigrationRepository.groovy`, `LabelRepository.groovy`, and enhanced `TeamRepository.groovy` implementations demonstrated the value of encapsulating database access, providing clean separation of concerns and consistent error handling patterns.
* **Cascading Filter UX:** The frontend implementation showed that progressive refinement through cascading filters significantly improves user experience by reducing cognitive load and preventing invalid selections.
* **API Documentation Discipline:** Creating detailed API specifications alongside implementation ensures consistency and facilitates future development and integration.
* **Instance Data Inheritance Complexity:** The data generation pipeline refactor highlighted the critical importance of proper execution order and complete field inheritance between master and instance records for data integrity.
* **Clean Architecture in ScriptRunner:** Successfully implemented clean architecture principles within ScriptRunner constraints, demonstrating that proper separation of concerns is achievable even in plugin environments.
* **Generator Execution Dependencies:** The experience with the instructions generator running after instance generation underscored the importance of carefully managing dependencies in data generation pipelines.
* **Schema Consistency Requirements:** Type mismatches between master and instance tables can cause subtle runtime failures, emphasising the need for rigorous schema validation and testing.
* **Confluence-Integrated Architecture:** Leveraging ScriptRunner and Confluence's native capabilities significantly accelerates development within the bank's ecosystem.
* **Vanilla JavaScript Challenges:** Building complex UIs without modern frameworks requires meticulous DOM management and state handling, but the dynamic data loading pattern provides a solid foundation.
* **Test-Driven Thinking:** Robust, specific integration tests (ADR-019, ADR-026) are crucial for preventing regressions, particularly with complex data generation and inheritance patterns.
* **Documentation Discipline:** Maintaining synchronisation between OpenAPI specification, implementation, and all documentation layers is paramount for project continuity.
* **N-Tier Architecture:** The N-Tier architecture model (ADR-027) provides improved structure and clarity for the growing codebase.
* **Pragmatic Data Import:** The Confluence JSON import strategy (ADR-028) demonstrates that high-performance, dependency-free solutions are achievable with careful architectural choices.
