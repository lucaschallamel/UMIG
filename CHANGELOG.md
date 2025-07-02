### [Unreleased]

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