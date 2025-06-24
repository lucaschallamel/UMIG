# Active Context

## Current Focus

- The project is in active development of the Implementation Plan macro backend and its supporting infrastructure, with significant progress on API endpoints and database schema.
- The backend API has been structured into logical modules for Teams, Persons, and Implementation Plans, with comprehensive CRUD operations for each entity.
- API documentation (OpenAPI specification and Postman collection) has been created and aligned with the implemented endpoints.
- The database schema has been fully synchronised with the original SQL Server specification, ensuring consistency across all tables, fields, and constraints.
- Development of robust Node.js utilities for synthetic data generation and CSV importing, complete with comprehensive testing infrastructure.
- Enhanced synthetic data generation for more realistic user and team data, with configurable role-based assignments.

## Recent Changes

- Created and documented new tables `iteration_plan_itp` (structure of iteration plans) and `iterations_tracking_itt` (tracking of step execution per iteration) via dedicated Liquibase migration (`013_create_iteration_plan_and_tracking.sql`).
- Merged the latest changes from `main` into the working branch (`data/tracking_activities`) to ensure full synchronisation with recent schema, utility, and documentation improvements.
- Updated the `CHANGELOG.md` and main `README.md` to reflect the new tables and migration.
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

- Implement backend logic and API endpoints to leverage the new `iteration_plan_itp` and `iterations_tracking_itt` tables for real-time tracking and reporting.
- Continue frontend development for the Implementation Plan macro UI, ensuring integration with the newly implemented backend APIs and new tracking features.
- Develop the Planning Feature UI for generating shareable HTML macro-plans.
- Validate all API endpoints using the Postman collection against the local development environment.
- Maintain strict documentation discipline for all future schema changes.
- Extend test fixtures and integration tests as the data model evolves, particularly for implementation plans and tracking.
- Consider adding automated schema integrity checks or further integration tests as the project matures.
