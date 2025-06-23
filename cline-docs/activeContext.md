# Active Context

## Current Focus

- The project is in active development of the Implementation Plan macro backend and its supporting infrastructure, with significant progress on API endpoints and database schema.
- The backend API has been structured into logical modules for Teams, Persons, and Implementation Plans, with comprehensive CRUD operations for each entity.
- API documentation (OpenAPI specification and Postman collection) has been created and aligned with the implemented endpoints.
- The database schema has been fully synchronised with the original SQL Server specification, ensuring consistency across all tables, fields, and constraints.
- Development of robust Node.js utilities for synthetic data generation and CSV importing, complete with comprehensive testing infrastructure.

## Recent Changes

- Major architectural pivot: The project moved from a standalone NodeJS/React stack to a Confluence-integrated application, using vanilla JS for the frontend and ScriptRunner (Groovy) for the backend, as mandated by enterprise constraints.
- API Development: Backend endpoints for Teams, Persons, and Implementation Plans have been implemented with a modular structure in `src/groovy/v1/` directories.
- Database connectivity: The project now uses ScriptRunner's built-in Database Connection Pool resource for PostgreSQL (ADR-010), superseding the previous approach of bundling the JDBC driver.
- REST Endpoint Configuration: Standardised the method for configuring and discovering ScriptRunner REST endpoints (ADR-011), resolving runtime errors related to file path resolution.
- Database Management: Formalised a standardised approach for database management and documentation (ADR-012), ensuring reliable migrations and clear schema documentation.
- Documentation: Created comprehensive API documentation in OpenAPI format and a Postman collection for testing. Added formal data model documentation with ERD diagrams.
- Local development environment is now robust, with Liquibase managing database migrations and clear setup instructions for developers.
- Data Utilities: Implemented robust Node.js CLI tools (`umig_generate_fake_data.js` and `umig_csv_importer.js`) for synthetic data generation and CSV importing, with comprehensive documentation and testing.
- Testing Framework: Established a Jest-based testing framework with deterministic fixtures for reproducible tests, ensuring all utilities maintain strict environment safety and error handling.
- Schema Synchronisation: Completed a thorough review and correction of the baseline PostgreSQL schema to match the original SQL Server specification, ensuring all tables, fields, and constraints are accurately represented.
- Data Model Updates: Updated key tables to match specifications:
  - `controls_ctl`: Added producer, validator and comments fields
  - `environments_env`: Removed `env_type` field
  - `environments_iterations_eit`: Added new join table with environment-iteration associations
  - `iterations_ite`: Replaced `ite_sequence` with a free-text `description`
  - `sequences_sqc`: Updated to reference `migrations_mig` instead of `iterations_ite`
  - `environments_applications_eap`: Added a `comments` field
  - `users_usr`: Split the name field into `usr_first_name`, `usr_last_name`, and added `usr_trigram` identifier

## Next Steps

- Continue frontend development for the Implementation Plan macro UI, ensuring integration with the newly implemented backend APIs.
- Implement the hierarchical data structure (Macro-Phase > Chapter > Step > Task) and related database tables.
- Develop the Planning Feature UI for generating shareable HTML macro-plans.
- Validate all API endpoints using the Postman collection against the local development environment.
- Maintain strict documentation discipline for all future schema changes.
- Extend test fixtures and integration tests as the data model evolves, particularly for implementation plans.
- Consider adding automated schema integrity checks or further integration tests as the project matures.
