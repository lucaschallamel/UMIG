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
  * Teams and Users APIs are robust, fully standardised, and aligned with formal REST API implementation patterns (ADR-017, ADR-023), with consistent API routing, error handling, and idempotency.
  * The SPA + REST pattern for admin UIs (ADR-020) has been formalised and implemented for user management.
  * STEP View macro & SPA MVP for migration/release steps in Confluence delivered and validated.
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
  * Confluence HTML importer utility initiated.
  * Data import strategy for Confluence JSON defined (ADR-028).

## 2. What's Left to Build (MVP Scope)

* **Backend Development (ScriptRunner):**
  * Implement remaining core REST endpoints for Plans, Chapters, Steps, Tasks, Controls, Instructions, and Labels.
  * Finalise backend logic for the Planning Feature, including the HTML export endpoint.
  * Integrate email notification sending via the enterprise Exchange server.
* **Frontend Development (Confluence Macro):**
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

- The codebase is consistent, maintainable, and well-documented.
- The foundation for future API and feature development is solid, with clear patterns for further standardisation and enhancement.
- The project has reached a proof-of-concept stage with a fully working SPA+REST integration and admin UI pattern.

## 4. Known Issues & Risks

* **Risk:** The four-week delivery timeline is extremely aggressive and leaves little room for unforeseen issues. The scope of the MVP must be ruthlessly managed.
* **Risk:** Development with "vanilla" JavaScript is more time-consuming than with modern frameworks and requires meticulous attention to maintainability.
* **Risk:** Potential performance bottlenecks in ScriptRunner under heavy load during a cutover weekend must be considered and thoroughly tested.
* **Risk:** The system’s dependency on Confluence availability and performance is a potential single point of failure.
* **To Do:** A detailed data import/migration plan from existing sources into the new PostgreSQL schema is still required.

## 5. Evolution of Project Decisions

- The adoption of formalised REST API patterns (ADR-023), the iteration-centric data model (ADR-024), the Node.js-based local development orchestration (ADR-025), the new testing standards (ADR-026), the many-to-many user-team relationship (ADR-022), and the introduction of commenting features (ADR-021) mark significant steps in the project's maturity, setting precedents for future architectural and process improvements.
- The pivot to a Confluence-Integrated Application architecture (ADR-001) was a critical decision to align with the bank's existing technology portfolio and meet the aggressive timeline.
- The project is moving towards an N-Tier architecture model (ADR-027).
