# Progress

## 1. What Works / Completed

* **Phase 0: Discovery & Design**
  * Initial requirements gathered and problems with existing system documented.
  * High-level architectural plan and data model designed.
  * Final architectural direction (Confluence-Integrated Application) selected and ratified, with the technology stack finalised (ADR-001, ADR-002, ADR-003, ADR-004, ADR-005).
  * Design for the new "Planning Feature" completed and integrated.
* **Local Development Environment:**
  * Streamlined with a Node.js-based orchestration layer and a unified `umig-local` CLI (ADR-025).
  * Automated database migrations with Liquibase are fully integrated and stable (ADR-008).
  * ScriptRunner database connection pooling is configured and reliable (ADR-010).
  * JDBC driver issues resolved by using ScriptRunner's native connection (ADR-009).
* **Data Model:**
  * Core data model refactored to an iteration-centric design (ADR-024), enhancing flexibility.
  * `controls_master_ctm` table includes `ctm_code` for improved data clarity.
  * User-team membership migrated to a many-to-many relationship (ADR-022).
  * Dedicated comment tables for step-level and instance-level comments introduced (ADR-021).
  * Controls elevated to phase level and instructions streamlined (ADR-016).
  * Canonical implementation plan model established (ADR-015).
  * Standardised database management and documentation (ADR-012) and naming conventions (ADR-014).
* **API & Frontend Patterns:**
  * Teams and Users APIs are robust, fully standardised, and aligned with formal REST API implementation patterns (ADR-017, ADR-023), with consistent API routing, error handling, and idempotency. Enhanced error reporting for blocking relationships and input validation is now in place.
  * **Hierarchical Filtering Pattern (2025-07-09, ADR-030):** Implemented comprehensive hierarchical filtering across multiple APIs:
    * Created `LabelsApi.groovy` with full hierarchical filtering capabilities
    * Enhanced `TeamsApi.groovy` with query parameter filtering for all hierarchy levels
    * Established consistent pattern: `?migrationId=`, `?iterationId=`, `?planId=`, `?sequenceId=`, `?phaseId=`
    * Frontend filters cascade dynamically based on parent selections
    * Comprehensive API documentation created (TeamsAPI.md, LabelsAPI.md, API_Updates_Summary.md)
  * The SPA + REST pattern for admin UIs (ADR-020) has been formalised and implemented for user management.
  * **Dynamic Data Integration Pattern (2025-07-04):** The Iteration View macro now implements a robust pattern where UI selectors are populated dynamically via REST APIs rather than hardcoded in Groovy. This includes:
    * `MigrationRepository.groovy` implementing the repository pattern for encapsulated database access
    * Migration API endpoint (`/migrations`) providing properly mapped JSON data with robust error handling
    * Client-side JavaScript handling dynamic population, loading states, and error conditions
  * Pure ScriptRunner application structure defined (ADR-018).
* **Testing & Quality:**
  * Test suite significantly stabilised and hardened through precise SQL query mocks and improved test isolation (ADR-026).
  * Deprecated `faker` API calls replaced, and critical Jest configuration issues resolved.
  * Formal integration testing framework established (ADR-019).
* **Documentation & Governance:**
  * OpenAPI specification, implementation, and documentation are synchronised.
  * Comprehensive, MECE-structured rule system established in `.clinerules/rules`.
  * All individual ADRs consolidated into `docs/solution-architecture.md`.
  * Developer guides and architectural records provide clear reference.
  * Sprint review and retrospective workflow established.
* **Data Utilities:**
  * Node.js adopted for data utilities (ADR-013).
  * **Instance Data Generation Pipeline Refactored (2025-07-04):** Resolved critical issues with instance data inheritance:
    * Generator execution order corrected (instructions generator renamed from `101` to `098` to run before instance generation)
    * Full attribute instantiation implemented following ADR-029 principles
    * Schema consistency issues resolved (e.g., `instructions_instance_ini.tms_id` type corrected)
    * Enhanced logging and debugging capabilities added
  * Confluence HTML importer utility initiated, with the pipeline hardened to handle real-world, heterogeneous data.
  * Data import strategy for Confluence JSON defined, leveraging `psql \copy` for high performance and minimal dependencies (ADR-028).

## 2. What's Left to Build (MVP Scope)

* **Backend Development (ScriptRunner):**
  * Continue implementing remaining core REST endpoints for Plans, Sequences, Phases, Steps, Instructions, and Controls (Labels API now complete).
  * Apply hierarchical filtering pattern to remaining APIs.
  * Finalise backend logic for the Planning Feature, including the HTML export endpoint.
  * Integrate email notification sending via the enterprise Exchange server.
* **Frontend Development (Confluence Macro):**
  * Complete the Iteration View macro with full filtering and step management capabilities.
  * Build the main dashboard UI for viewing the runbook, consuming the new APIs and providing real-time updates via AJAX polling.
  * Develop the UI for the "Planning Feature" to allow input and generation of the HTML macro-plan.
  * Implement UI components for changing status, adding comments, and interacting with controls for all entities.
* **Data Management:**
  * Finalise the data import strategy and process for migrating existing runbook data from Confluence/Draw.io/Excel into the new PostgreSQL schema.
* **Deployment & Testing:**
  * Deploy the macro and scripts to a staging Confluence instance.
  * Conduct comprehensive integration and end-to-end testing for all features.
  * Gather user feedback on the implemented features.

## 3. Current Status

- The codebase is consistent, maintainable, and well-documented, with a consolidated source tree under `src/groovy/umig/`.
- The foundation for future API and feature development is solid, with clear patterns for further standardisation and enhancement.
- The project has reached a proof-of-concept stage with a fully working SPA+REST integration and admin UI pattern, and the Iteration View macro is now functional with hierarchical filtering.
- Teams and Labels APIs are complete with comprehensive hierarchical filtering capabilities, setting the pattern for remaining API development.

## 4. Known Issues & Risks

* **Risk:** The four-week delivery timeline is extremely aggressive and leaves little room for unforeseen issues. The scope of the MVP must be ruthlessly managed.
* **Risk:** Development with "vanilla" JavaScript is more time-consuming than with modern frameworks, though the established dynamic data integration pattern provides a solid foundation for consistent development.
* **Risk:** Potential performance bottlenecks in ScriptRunner under heavy load during a cutover weekend must be considered and thoroughly tested.
* **Risk:** The system's dependency on Confluence availability and performance is a potential single point of failure.
* **Resolved:** Instance data generation pipeline issues have been resolved with proper execution order and complete field inheritance.
* **To Do:** A detailed data import/migration plan from existing sources into the new PostgreSQL schema is still required, though the technical strategy is now defined (ADR-028).

## 5. Evolution of Project Decisions

- **Hierarchical Filtering Pattern (ADR-030, 2025-07-09):** The implementation of consistent query parameter filtering across all resources demonstrates the project's commitment to intuitive, performant navigation of complex data hierarchies. This pattern will be applied to all remaining APIs.
- **Dynamic Data Integration Pattern (2025-07-04):** The successful implementation of the repository pattern and API-driven UI population for the Iteration View macro establishes a reusable pattern for all future macro development, promoting clean architecture principles within ScriptRunner constraints.
- **Full Attribute Instantiation (ADR-029, 2025-07-04):** The decision to replicate all relevant master table attributes into instance tables provides runtime flexibility and auditability, supporting the project's requirements for iterative execution and continuous improvement.
- **Data Generation Pipeline Maturity:** The refactoring of the instance data generation pipeline demonstrates the project's evolution towards more robust, dependency-aware data management practices.
- The adoption of formalised REST API patterns (ADR-023), the iteration-centric data model (ADR-024), the Node.js-based local development orchestration (ADR-025), the new testing standards (ADR-026), the many-to-many user-team relationship (ADR-022), and the introduction of commenting features (ADR-021) mark significant steps in the project's maturity.
- The pivot to a Confluence-Integrated Application architecture (ADR-001) was a critical decision to align with the bank's existing technology portfolio and meet the aggressive timeline.
- The N-Tier architecture model (ADR-027) enhances structure and maintainability as the codebase grows.
- The source tree consolidation under `src/groovy/umig/` provides improved organisation and future-proofing.
- The data import strategy (ADR-028) demonstrates pragmatic architectural choices that achieve high performance without introducing dependencies.
