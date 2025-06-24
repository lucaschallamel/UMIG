# Active Context

## Current Focus

- The project is in active development of the Implementation Plan macro backend and its supporting infrastructure, with significant progress on API endpoints and database schema.
- The backend API has been structured into logical modules for Teams, Persons, and Implementation Plans, with comprehensive CRUD operations for each entity.
- API documentation (OpenAPI specification and Postman collection) has been created and aligned with the implemented endpoints.
- The database schema has been fully synchronised with the original SQL Server specification, ensuring consistency across all tables, fields, and constraints.
- Development of robust Node.js utilities for synthetic data generation and CSV importing, complete with comprehensive testing infrastructure.
- Enhanced synthetic data generation for more realistic user and team data, with configurable role-based assignments.
- Major architectural improvement: Implemented separation between canonical implementation plans (templates) and their execution instances via new tables, enabling reusability, versioning, and robust plan-vs-actual analysis.

## Recent Changes

- Implemented a new Canonical Implementation Plan data model (ADR-015) with new tables:
  - `implementation_plans_canonical_ipc` (canonical plan templates)
  - `sequences_master_sqm` (canonical sequences/phases)
  - `chapters_master_chm` (canonical chapters)
  - `steps_master_stm` (canonical steps)
  - `instructions_master_inm` (canonical instructions)
  - `controls_master_ctl` (canonical controls/validation checks)
- Added Liquibase migration `013_create_canonical_implementation_plan_tables.sql` to implement the new schema.
- Completely refactored the monolithic `umig_generate_fake_data.js` script into a modular system with single-responsibility generator files:
  - `01_generate_core_metadata.js`
  - `02_generate_teams_apps.js`
  - `03_generate_users.js`
  - `04_generate_environments.js`
  - `05_generate_legacy_plans.js`
  - `06_generate_canonical_plans.js`
- Fixed multiple critical bugs in the legacy plan generator (`05_generate_legacy_plans.js`), resolving syntax errors and schema mismatches.
- Refactored `status_sts` table: renamed `sts_code` to `entity_type`, widened columns, prepopulated with entity-specific statuses via migration `011_refactor_status_sts.sql`.
- Added unique constraint to `stt_code` in `step_type_stt` (baseline schema).
- Added `type_color` column (hex color code, VARCHAR(7)) to `step_type_stt` via migration `012_add_type_color_to_step_type_stt.sql`.
- Updated data generation script to prepopulate `step_type_stt` with codes, names, descriptions, and color codes; uses idempotent insert logic.
- Improved `resetDatabase()` to protect reference and migration tracking tables from truncation.
- All integration and unit tests pass, confirming robust reference data and safe resets.
- Updated the `CHANGELOG.md` and all relevant documentation to reflect the new tables and migration.
- Added a detailed developer journal entry narrating the session, decisions, and technical pivots.
- All documentation is now fully aligned with the current state of the codebase and database.
- (Historique conservé) Major architectural pivot: The project moved from a standalone NodeJS/React stack to a Confluence-integrated application, using vanilla JS for the frontend and ScriptRunner (Groovy) for the backend, as mandated by enterprise constraints.
- (Historique conservé) API Development: Backend endpoints for Teams, Persons, and Implementation Plans have been implemented with a modular structure in `src/groovy/v1/` directories.
- (Historique conservé) Database connectivity: The project now uses ScriptRunner's built-in Database Connection Pool resource for PostgreSQL (ADR-010), superseding the previous approach of bundling the JDBC driver.
- (Historique conservé) REST Endpoint Configuration: Standardised the method for configuring and discovering ScriptRunner REST endpoints (ADR-011), resolving runtime errors related to file path resolution.
- (Historique conservé) Database Management: Formalised a standardised approach for database management and documentation (ADR-012), ensuring reliable migrations and clear schema documentation.
- (Historique conservé) Documentation: Created comprehensive API documentation in OpenAPI format and a Postman collection for testing. Added formal data model documentation with ERD diagrams.
- (Historique conservé) Local development environment is now robust, with Liquibase managing database migrations and clear setup instructions for developers.
- (Historique conservé) Data Utilities: Implemented robust Node.js CLI tools (`umig_generate_fake_data.js` and `umig_csv_importer.js`) for synthetic data generation and CSV importing, with comprehensive documentation and testing.
- (Historique conservé) Testing Framework: Established a Jest-based testing framework with deterministic fixtures for reproducible tests, ensuring all utilities maintain strict environment safety and error handling.
- (Historique conservé) Schema Synchronisation: Completed a thorough review and correction of the baseline PostgreSQL schema to match the original SQL Server specification, ensuring all tables, fields, and constraints are accurately represented.
- (Historique conservé) Data Model Updates: Updated key tables to match specifications:
  - `controls_ctl`: Added producer, validator and comments fields
  - `environments_env`: Removed `env_type` field
  - `environments_iterations_eit`: Added new join table with environment-iteration associations
  - `iterations_ite`: Replaced `ite_sequence` with a free-text `description`
  - `sequences_sqc`: Updated to reference `migrations_mig` instead of `iterations_ite`
  - `environments_applications_eap`: Added a `comments` field
  - `users_usr`: Split the name field into `usr_first_name`, `usr_last_name`, and added `usr_trigram` identifier
- (Historique conservé) Enhanced Data Generation: Implemented role-based user creation (NORMAL, ADMIN, PILOT) with intelligent team assignment rules:
  - All ADMIN and PILOT users are assigned exclusively to the IT_CUTOVER team
  - Every other team has at least one NORMAL user to prevent orphaned teams
  - Each user has a unique 3-letter trigram identifier
- (Historique conservé) Fixed Environment Stability: Resolved issues with Podman volume persistence that were causing migration failures on restart.
- (Historique conservé) Fixed Schema-Script Mismatch: Corrected data generation script to use the updated schema references (mig_id instead of ite_id).

## Next Steps

- Finalize ADR-015 by updating its status from "Draft" to "Accepted" or "Implemented".
- Implement backend logic and API endpoints to leverage the new canonical implementation plan tables for plan creation, editing, and versioning.
- Continue frontend development for the Implementation Plan macro UI, ensuring integration with the newly implemented backend APIs and canonical plan structures.
- Develop the Planning Feature UI for generating shareable HTML macro-plans.
- Validate all API endpoints using the Postman collection against the local development environment.
- Maintain strict documentation discipline for all future schema changes.
- Extend test fixtures and integration tests as the data model evolves, particularly for canonical implementation plans.
- Consider adding automated schema integrity checks or further integration tests as the project matures.
- Create a dedicated document that explicitly outlines the current database naming conventions and table relationships.
