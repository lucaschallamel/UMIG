# Active Context

## 1. Current Work Focus

The project is currently in the **implementation phase**, focusing on building out the core backend APIs and frontend UI components within the Confluence-integrated architecture. Recent efforts have also concentrated on stabilising the local development environment, enhancing data generation, and formalising project-wide coding and testing standards.

## 2. Recent Changes & Decisions

*   **Architectural Confirmation:** The **Confluence-Integrated Application** model is confirmed. This leverages Atlassian ScriptRunner (Groovy) for the backend, vanilla HTML/JavaScript/CSS for the frontend (as a Confluence macro), and PostgreSQL as the database. This decision was driven by the bank's existing technology portfolio and the aggressive four-week MVP timeline.
*   **Local Development Environment Overhaul:** The entire local development setup has been refactored to use a Node.js-based orchestration layer, replacing shell scripts with a unified `umig-local` CLI. This significantly improves consistency and developer experience.
*   **Data Model Refinements:**
    *   Implemented an iteration-centric data model ("Model C"), linking migrations to master plans via the `iterations_ite` table.
    *   Added `ctm_code` to the `controls_master_ctm` table for unique, human-readable business keys.
    *   Migrated to a many-to-many user-team relationship using `teams_tms_x_users_usr` join table.
    *   Introduced dedicated comment tables for step-level and instance-level comments (`step_pilot_comments_spc`, `step_instance_comments_sic`).
*   **API Standardisation (ADR-023):** Formalised and applied robust REST API implementation patterns, including explicit routing for nested resources, idempotency for `PUT`/`DELETE` operations, and precise error handling (mapping SQL exceptions to HTTP status codes). The Teams and Users APIs have been refactored to adhere to these standards.
*   **Test Suite Stability & Reliability (ADR-026):** Stabilised the test suite with precise SQL query mocks and improved test isolation. Deprecated `faker` API calls have been replaced, and critical Jest configuration issues resolved.
*   **Generator Naming Convention:** All data generator scripts and their tests now use a consistent 3-digit numeric prefix for robust ordering and traceability.
*   **Planning Feature:** A new feature has been designed and partially implemented to allow pilots to generate a shareable HTML macro-plan for each iteration, stored in a new `chapter_schedules` table.
*   **Project Governance:** A comprehensive, MECE-structured rule system has been established in `.clinerules/rules`, covering project guidelines, core coding principles, scaffolding, Twelve-Factor App, and Microservice Architecture. All individual ADRs have been consolidated into `docs/solution-architecture.md`.

## 3. Next Steps

1.  Continue implementing the remaining backend REST API endpoints in ScriptRunner for all core entities (Plans, Chapters, Steps, Tasks, Controls, Instructions, Labels).
2.  Develop the frontend JavaScript for the main dashboard, ensuring it consumes the new APIs and provides real-time updates via AJAX polling.
3.  Build the UI for the "Planning Feature" to allow input and generation of the HTML macro-plan.
4.  Finalise the data import strategy for existing runbook data.
5.  Conduct comprehensive integration and end-to-end testing.
6.  Gather user feedback on the implemented features.

## 4. Important Patterns and Learnings

*   **Confluence-Integrated Architecture:** Leveraging ScriptRunner and Confluence's native capabilities (authentication, email) significantly accelerates development within the bank's ecosystem.
*   **Vanilla JavaScript Challenges:** Building complex UIs without a modern framework requires meticulous DOM management and state handling.
*   **Database per Service (Conceptual):** While not true microservices, the clear separation of data in PostgreSQL from Confluence's internal storage is crucial.
*   **Test-Driven Thinking:** The importance of robust, specific integration tests (ADR-026) was highlighted by "schema drift" issues.
*   **Documentation Discipline:** Maintaining synchronisation between OpenAPI specification, implementation, and all layers of documentation (ADRs, READMEs, Changelog, Dev Journals) is paramount for project continuity and onboarding.
*   **Pragmatism over Purity:** The aggressive timeline necessitates pragmatic architectural compromises (e.g., AJAX polling instead of WebSockets).
