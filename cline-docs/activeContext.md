# Active Context

## Current Focus

The primary focus as of July 2025 is the continued application and hardening of standardised REST API implementation patterns across all existing endpoints, building upon the successful refactoring of the Teams and Users APIs. This also includes maintaining the integrity of the new iteration-centric data model, the streamlined Node.js-based local development environment, ensuring the stability and reliability of the test suite, adhering to the new generator naming conventions, and leveraging the enhanced user-team relationship and commenting features.

## Recent Changes

- **API Standardisation (ADR-023):**
  - Refactored Teams API routing logic to correctly handle nested endpoints for team membership management.
  - Improved error handling, mapping database errors to appropriate HTTP status codes (`409 Conflict`, `404 Not Found`).
  - Updated the OpenAPI specification to reflect new response codes and ensure synchronisation with implementation.
  - Regenerated Postman collection to align automated tests with the updated API contract.
  - Authored a new developer guide (`src/groovy/README.md`) detailing the new API patterns.
  - `UsersApi.groovy` completely refactored to align with the simple, stable pattern established in `TeamsApi.groovy`, resolving critical runtime and serialization errors.
  - `DELETE /users/{id}` now returns a detailed JSON object listing all blocking relationships.
  - `POST /users` endpoint now performs robust input validation.
- **Data Model Refactoring:**
  - Implemented an iteration-centric data model ("Model C"), linking migrations to master plans via the `iterations_ite` table (ADR-024).
  - Added `ctm_code` to the `controls_master_ctm` table for unique, human-readable business keys.
  - Migrated to a many-to-many user-team relationship using `teams_tms_x_users_usr` join table (ADR-022).
  - Introduced dedicated comment tables for step-level and instance-level comments (`step_pilot_comments_spc`, `step_instance_comments_sic`) (ADR-021).
- **Local Development Orchestration:**
  - Refactored the entire local development setup to use a Node.js-based orchestration layer, replacing shell scripts with Node.js equivalents and introducing a unified `umig-local` CLI (ADR-025).
- **Test Suite Stability & Reliability:**
  - Stabilised the test suite with precise SQL query mocks and improved test isolation, adhering to the new `ADR-026` standard for specific mocks.
  - Corrected module system compatibility issues and ensured comprehensive mock resets.
  - Adapted tests to respect [SEC-1] principle by using mock scripts.
  - Replaced deprecated `faker` API calls and resolved critical Jest configuration issues.
- **Generator Naming Convention:**
  - Overhauled all data generator scripts and their tests to use a consistent 3-digit numeric prefix for robust ordering and traceability.
- Updated documentation and changelog to reflect these enhancements.

## Next Steps

- Apply the new REST API implementation patterns to all other existing endpoints.
- Continue to validate and document the standards through code review and automated testing.
- Monitor for any further edge cases or inconsistencies as the standards are rolled out project-wide.
- Continuously improve onboarding materials and documentation to reflect the latest best practices and architectural decisions.
- Further develop the Confluence HTML Importer utility.
- Continue to enhance data generation scripts for realism and coverage.

## Key Considerations

- Maintain synchronisation between OpenAPI specification, implementation, and documentation.
- Ensure all new development adheres to the established patterns for consistency and maintainability.
- Validate the stability and performance of the new data model and local development setup.
- Ensure all tests remain robust and reliable, following `ADR-026`.
- Adhere to the new generator naming conventions for all new and modified data generation scripts.
