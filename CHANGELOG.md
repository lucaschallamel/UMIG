### [Unreleased]

#### 2025-07-03 (Source Tree Consolidation)
- **Refactor(Structure):** Major consolidation of the UMIG source tree under `src/groovy/umig/` namespace for clarity and future-proofing.
  - Moved all macros from `src/macros/` to `src/groovy/umig/macros/`
  - Moved all API endpoints from `src/com/umig/api/` to `src/groovy/umig/api/`
  - Moved all repositories from `src/com/umig/repository/` to `src/groovy/umig/repository/`
  - Moved all web assets from `src/web/` to `src/groovy/umig/web/`
  - Moved all tests from `tests/` to `src/groovy/umig/tests/`
- **Docs(Structure):** Updated `src/groovy/README.md` to provide high-level source tree overview with folder map and key principles.
- **Docs(READMEs):** Created comprehensive README files for each subfolder:
  - `macros/README.md`: Macro responsibilities, naming conventions, asset loading patterns
  - `api/README.md`: REST API conventions, versioning, OpenAPI alignment
  - `repository/README.md`: Repository pattern rationale and usage
  - `web/README.md`: Frontend asset management and serving strategies
- **Docs(Architecture):** Updated `docs/solution-architecture.md` to reflect the new consolidated structure and versioning approach.
- **Impact:** Maintains separation of concerns while improving project organization, ScriptRunner compatibility, and developer onboarding experience.

#### 2025-07-02 (Architecture Documentation Consolidation)
- **Docs(Architecture):** Consolidated all 26 individual ADRs into a single, comprehensive `docs/solution-architecture.md` document. This document is now the single source of truth for all architectural decisions.
- **Docs(Archive):** Archived all original ADR files into the `docs/adr/archive/` directory to preserve historical context.
- **Docs(Architecture):** Enhanced the new consolidated document with a hyperlinked table of contents and more detailed implementation standards for clarity and ease of use.

#### 2025-07-02 (Data Integration)
- **Fix: Robustified Confluence HTML → PostgreSQL import pipeline.**
  - Updated `scrape_html.sh` and added `scrape_html_oneline.sh` to ensure generated JSON is compact (one-line per object) and PostgreSQL-compatible.
  - Strengthened escaping of double quotes in text fields to prevent JSON syntax errors during import.
  - Documented the full diagnostic and correction process in the Developer Journal (`20250702-01.md`).
  - Added new ADR describing the import strategy for Confluence JSON data.

#### 2025-07-01 (API)
- **Feature: Enhanced Teams API for Membership Management.**
  - Implemented robust routing in `TeamsApi.groovy` to correctly handle nested endpoints for adding (`PUT /teams/{id}/users/{userId}`) and removing (`DELETE /teams/{id}/users/{userId}`) users from teams.
  - Improved error handling to return `409 Conflict` when attempting to delete a team that is still referenced by other resources.
- **Documentation: Synchronized API documentation with implementation.**
  - Updated `openapi.yaml` to include the `409 Conflict` response for the team deletion endpoint.
  - Regenerated the Postman collection from the OpenAPI specification to ensure tests are aligned with the current API contract.
  - Formalized API implementation standards in a new developer guide (`src/groovy/README.md`) and a new architectural record (`ADR-023-Standardized-Rest-Api-Patterns.md`).

#### 2025-07-02 (Teams API Robustness & Membership Endpoints)
- Enhancement(API): PUT and DELETE for `/teams/{teamId}/users/{userId}` now enforce robust existence checks for both team and user, prevent duplicate associations, and return clear RESTful responses for all cases.
- Refactor(API): TeamRepository and UserRepository updated for explicit existence checks and robust error reporting.
- Docs: Updated API and subfolder READMEs to document new behaviors and error responses.

#### 2025-07-02 (Users API Robustness & Error Reporting)
- **Enhancement(API):** DELETE `/users/{id}` now returns a detailed JSON object listing all blocking relationships (across all foreign key constraints) that prevent deletion. No associations are deleted unless the user is deleted.
- **Refactor(API):** `UserRepository.deleteUser` now only attempts to delete the user row; all referential integrity is enforced by the database.
- **Enhancement(API):** POST `/users` endpoint now performs robust input validation and returns specific, actionable error messages for missing fields, type errors, unknown fields, and constraint violations.
- **Docs:** Updated API documentation and error examples for new behaviors.

#### 2025-07-02 (API Stability and Pattern Standardization)
- **Refactor(API):** Completely rewrote the `UsersApi.groovy` to align with the simple, stable pattern established in `TeamsApi.groovy`. This resolves critical runtime and serialization errors.
- **Fix(API):** Corrected the `DELETE /users/{id}` endpoint to return a `204 No Content` response, fixing a persistent serialization bug and adhering to REST standards.
- **Docs(Architecture):** Consolidated and updated `ADR-023` with mandatory, specific implementation patterns for API stability, based on lessons from the `UsersApi` refactor.
- **Docs(Workflow):** Created a new `api-work.md` workflow to guide developers in creating and modifying API endpoints according to the updated standard in `ADR-023`.

#### 2025-07-02 (Faker Deprecation & Test Suite Fixes)
- **Fix(Data Generation):** Replaced all deprecated `faker.datatype.number()` calls with `faker.number.int()` in the synthetic data generators, eliminating all related warnings during script execution.
- **Fix(Testing):** Corrected a critical Jest configuration issue by adding proper module mocks to `__tests__/generators/101_generate_instructions.test.js`, resolving a `SyntaxError` and allowing the test suite to run successfully.
- **Chore(Code Quality):** Added a clarifying code comment to `007_generate_controls.js` to note that `faker.datatype.boolean()` is not deprecated, improving code maintainability.

#### 2025-07-02 (Generator Naming Convention Overhaul)
- **Refactor:** All data generator scripts and their tests now use a 3-digit numeric prefix (e.g., `001_generate_core_metadata.js`, `099_generate_instance_data.js`) to ensure robust ordering and traceability.
- **Chore:** Updated all test imports to match new generator filenames.
- **Docs:** Documented the naming convention in the main README and subfolder READMEs.

#### 2025-07-02 (Test Stability & Reliability)
- **Fix(Testing):** Stabilized the test suite for `99_generate_instance_data.js` with precise SQL query mocks and improved test isolation.
- **Fix(Testing):** Corrected `umig_csv_importer.test.js` to handle module system compatibility issues without modifying the source script.
- **Refactor(Testing):** Enhanced spy implementation for `eraseInstanceDataTables` to properly observe without replacing implementation.
- **Chore(Testing):** Added comprehensive mock reset in `beforeEach` blocks to ensure test isolation and prevent cross-test contamination.
- **Test:** Adapted tests to respect [SEC-1] principle by using a mock script instead of modifying `.env` files.

#### 2025-07-02 (Data Model & Generation)
- **Feat(Data Model):** Added `ctm_code` to the `controls_master_ctm` table to serve as a unique, human-readable business key (e.g., C0001).
- **Fix(Data Generation):** Updated the controls generator (`09_generate_controls.js`) and its corresponding test to create and validate the new `ctm_code` field, resolving the `NOT NULL` constraint violation.
- **Docs:** Updated the data model documentation and ERD in `docs/dataModel/README.md` to include the new `ctm_code` column.

#### 2025-07-02 (Data Generation & Testing)
- **Refactor:** Overhauled the migrations data generator (`05_generate_migrations.js`) to correctly implement the **Migrations → Plans → Iterations** data hierarchy as defined in `ADR-024`.
- **Fix:** Corrected a critical bug where the migrations generator was improperly truncating canonical plan tables, causing them to be empty.
- **Test:** Hardened the migrations generator test suite (`05_generate_migrations.test.js`) with specific, resilient mocks to align with `ADR-026`. The tests now explicitly verify that the correct number and type of iterations (RUN, DR, CUTOVER) are generated for each plan.

#### 2025-07-02 (Testing & Maintenance)
- **Fix:** Corrected a regression in the user data generator (`03_generate_users.js`) where an incorrect column name was used in a SQL query.
- **Test:** Hardened the user generator test suite (`03_generate_users.test.js`) with highly specific mocks to prevent similar regressions.
- **Docs:** Established a new testing standard in `ADR-026-Specific-Mocks-In-Tests.md` to enforce specific mocks.
- **Chore:** Realigned the numbering of data generator test files to match their corresponding scripts for better project structure.

#### 2025-07-02 (Local Development)
- **Breaking Change: Refactored the entire local development setup to use a Node.js-based orchestration layer.**
  - Replaced all shell scripts (`start.sh`, `stop.sh`, `restart.sh`) with Node.js equivalents in `local-dev-setup/scripts/`.
  - Introduced a unified `umig-local` CLI with subcommands (`start`, `stop`, `restart`, `logs`, `status`, `db`, `clean`), replacing the collection of disparate shell scripts.
  - Added proper error handling and improved log output formatting across all scripts.
  - Standardized the approach for setting environment variables and container configuration.
  - **Updated Documentation:** The README.md now contains comprehensive installation and usage instructions for the new CLI.

### [1.2.0] - 2025-06-28

#### Added
- **Migration+Release Step Extraction Utility (`umig_extract_steps.js`):**
  - Added a Node.js utility script to extract steps from Google Docs Export HTML into structured JSON for loading into the UMIG database.
  - The utility automates the extraction of step content, instructions, and metadata from formatted documents.
  - This eliminates manual copy-pasting and ensures consistent data structure.
  - See the README for usage instructions and supported document formats.
  - **Note:** This initial version is focused on core extraction capabilities, with more advanced features planned.

### [1.1.0] - 2025-06-27

#### Fixed
- **Emergency Fix:** Corrected the CSP headers to allow ScriptRunner REST API to communicate with the frontend SPA macros. This resolves the CORS errors and "Failed to fetch" issues reported by users.
- **Security Vulnerability Patched:** Resolved a critical vulnerability in the authentication flow that allowed privilege escalation through manipulated JWT tokens. All users should update immediately.

#### Changed
- **Data Model Stability (ADR-025):** Formalized our commitment to data model stability in ADR-025. The database schema is now considered production-ready and stable.
- **SPA + REST Pattern (ADR-020):** Standardized all admin UIs to use the SPA + REST pattern, with detailed implementation guidelines documented in ADR-020.
- **SQL Query Formatting:** Adopted consistent SQL formatting across all database interactions. All SQL queries now follow the same capitalization, indentation, and line-break standards.
- **Improved Migrations:** Enhanced the migration naming scheme and documentation. Each migration now includes a detailed comment block explaining its purpose and impact.

#### Added
- **Migration+Release Step Extraction Utility (Beta):**
  - Added an experimental Node.js utility script (`umig_extract_steps.js`) for extracting migration step data from Google Docs exports.
  - Currently supports basic extraction of step numbers, titles, and descriptions.
  - Usage instructions are available in the accompanying README.
  - The utility is in-progress: core extraction logic is present, but further field extraction, error handling, and test integration are pending.

### Added
- **Formalized Project Governance and AI Rules:** Established a comprehensive, MECE-structured rule system in `.clinerules/rules` covering Project Guidelines, Core Coding Principles, Scaffolding, Twelve-Factor App, and Microservice Architecture. All rules were refined to ensure consistency and remove redundancy. A detailed, consolidated `global_rules.md` was also created for Windsurf AI to provide a centralized, actionable guide for development.
- First sprint review & retrospective documented as `20250627-sprint-review.md` in `/docs/devJournal/`.
- STEP View macro & SPA MVP for migration/release steps in Confluence delivered and validated.
- SPA + REST pattern formalized (ADR020), integration testing framework established, and robust data utilities implemented.
- Sprint review workflow and persistent template added for repeatable, automated retrospectives.

#### Added
- 2025-06-27:
  - STEP View Macro & SPA MVP: Added a macro and JavaScript SPA for rendering migration/release steps in Confluence, driven by ScriptRunner REST API. The SPA fetches and displays step summary and instructions from the backend, following the SPA+REST admin UI pattern (see ADR020).
- **2025-06-26:**
  - **Adopted SPA + REST Pattern for Admin UIs:**
    - Added ADR020, formalizing the use of a dynamic SPA (Single Page Application) pattern with ScriptRunner REST endpoints for all admin entity management interfaces.
    - Implemented a full interactive user management SPA as a reference (see `user-list.js` and `UserApi.groovy`).
    - UI now dynamically renders both list and detail/edit views for users, with robust type and payload handling.
    - Edit forms are generated from all entity fields except the primary key, and payloads are correctly typed for backend compatibility.
    - This pattern is now the standard for future admin UIs (see ADR020 for rationale and details).