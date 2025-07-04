# Active Context

## 1. Current Work Focus

The project is currently in the **implementation phase**, focusing on building out the core backend APIs and frontend UI components within the Confluence-integrated architecture. Recent efforts have also concentrated on stabilising the local development environment, enhancing data generation, and formalising project-wide coding and testing standards. A key achievement has been the successful integration and robust static asset serving for the Iteration View macro, alongside significant hardening of the Confluence JSON data import pipeline.

## 2. Recent Changes & Decisions

* **Architectural Confirmation:** The **Confluence-Integrated Application** model is confirmed. This leverages Atlassian ScriptRunner (Groovy) for the backend, vanilla HTML/JavaScript/CSS for the frontend (as a Confluence macro), and PostgreSQL as the database. This decision was driven by the bank's existing technology portfolio and the aggressive four-week MVP timeline. The project is now explicitly adopting an **N-Tier architecture** model for improved structure and clarity (ADR-027).
* **Source Tree Consolidation:** A major refactoring consolidated the UMIG source tree under the `src/groovy/umig/` namespace, improving clarity, future-proofing, and ScriptRunner compatibility.
* **Local Development Environment Overhaul:** The entire local development setup has been refactored to use a Node.js-based orchestration layer, replacing shell scripts with a unified `umig-local` CLI. This significantly improves consistency and developer experience (ADR-025).
* **Data Model Refinements:**
  * Implemented an iteration-centric data model ("Model C"), linking migrations to master plans via the `iterations_ite` table (ADR-024).
  * Added `ctm_code` to the `controls_master_ctm` table for unique, human-readable business keys.
  * Migrated to a many-to-many user-team relationship using `teams_tms_x_users_usr` join table (ADR-022).
  * Introduced dedicated comment tables for step-level and instance-level comments (`step_pilot_comments_spc`, `step_instance_comments_sic`) (ADR-021).
  * Refactored controls to be at the phase level and streamlined instructions (ADR-016).
* **API Standardisation & Robustness:** Formalised and applied robust REST API implementation patterns, including explicit routing for nested resources, idempotency for `PUT`/`DELETE` operations, and precise error handling (mapping SQL exceptions to HTTP status codes) (ADR-023). The Teams and Users APIs have been refactored to adhere to these standards, with enhanced error reporting for blocking relationships and input validation.
* **Test Suite Stability & Reliability:** Stabilised the test suite with precise SQL query mocks and improved test isolation (ADR-026). Deprecated `faker` API calls have been replaced, and critical Jest configuration issues resolved.
* **Generator Naming Convention:** All data generator scripts and their tests now use a consistent 3-digit numeric prefix for robust ordering and traceability.
* **Confluence JSON Data Import Pipeline Hardening:** The import pipeline for Confluence JSON exports has been robustified to handle real-world, heterogeneous data. This includes refactoring staging table schemas to `TEXT` types, creating `scrape_html_oneline.sh` for single-line, PostgreSQL-compatible JSON, and hardening escaping and diagnostics. The strategy for this import is now formally defined (ADR-028).
* **Project Governance:** A comprehensive, MECE-structured rule system has been established in `.clinerules/rules`, covering project guidelines, core coding principles, scaffolding, Twelve-Factor App, and Microservice Architecture. All individual ADRs have been consolidated into `docs/solution-architecture.md`.

## 3. Next Steps

1. Continue wiring up the Iteration View macro frontend to backend APIs for dynamic data.
2. Add further integration tests for the macro and import pipeline.
3. Refine onboarding documentation and ADRs as new patterns are adopted.
4. Continue implementing the remaining backend REST API endpoints in ScriptRunner for all core entities (Plans, Sequences, Phases, Steps, Instructions, Controls, Labels).
5. Develop the frontend JavaScript for the main dashboard, ensuring it consumes the new APIs and provides real-time updates via AJAX polling.
6. Build the UI for the "Planning Feature" to allow input and generation of the HTML macro-plan.
7. Finalise the data import strategy for existing runbook data.
8. Conduct comprehensive integration and end-to-end testing.
9. Gather user feedback on the implemented features.

## 4. Important Patterns and Learnings

* **Confluence-Integrated Architecture:** Leveraging ScriptRunner and Confluence's native capabilities (authentication, email) significantly accelerates development within the bank's ecosystem.
* **Vanilla JavaScript Challenges:** Building complex UIs without a modern framework requires meticulous DOM management and state handling.
* **Database per Service (Conceptual):** While not true microservices, the clear separation of data in PostgreSQL from Confluence's internal storage is crucial.
* **Test-Driven Thinking:** The importance of robust, specific integration tests (ADR-019, ADR-026) was highlighted by "schema drift" issues.
* **Documentation Discipline:** Maintaining synchronisation between OpenAPI specification, implementation, and all layers of documentation (ADRs, READMEs, Changelog, Dev Journals) is paramount for project continuity and onboarding.
* **Pragmatism over Purity:** The aggressive timeline necessitates pragmatic architectural compromises (e.g., AJAX polling instead of WebSockets).
* **N-Tier Architecture:** The project is moving towards an N-Tier architecture model for improved structure and clarity (ADR-027).
* **Robust Data Import:** The experience with Confluence JSON imports underscored the need for highly resilient parsing and data type handling, especially when dealing with heterogeneous real-world data.
