# Active Context

## Current Focus

The primary focus as of July 2025 is the continued application and hardening of standardised REST API implementation patterns across all existing endpoints, building upon the successful refactoring of the Teams API. This also includes maintaining the integrity of the new iteration-centric data model and the streamlined Node.js-based local development environment.

## Recent Changes

- **API Standardisation:**
  - Refactored Teams API routing logic to correctly handle nested endpoints for team membership management.
  - Improved error handling, mapping database errors to appropriate HTTP status codes (`409 Conflict`, `404 Not Found`).
  - Updated the OpenAPI specification to reflect new response codes and ensure synchronisation with implementation.
  - Regenerated Postman collection to align automated tests with the updated API contract.
  - Authored a new developer guide (`src/groovy/README.md`) detailing the new API patterns.
  - Established ADR-023 as the formal architectural record for REST API standards.
- **Data Model Refactoring:**
  - Implemented an iteration-centric data model ("Model C"), linking migrations to master plans via the `iterations_ite` table.
  - Documented the rationale in ADR-024.
- **Local Development Orchestration:**
  - Refactored the entire local development setup to use a Node.js-based orchestration layer, replacing shell scripts with Node.js equivalents.
  - Documented the new architecture in ADR-025.
- Updated documentation and changelog to reflect these enhancements.

## Next Steps

- Apply the new REST API implementation patterns to all other existing endpoints.
- Continue to validate and document the standards through code review and automated testing.
- Monitor for any further edge cases or inconsistencies as the standards are rolled out project-wide.
- Continuously improve onboarding materials and documentation to reflect the latest best practices and architectural decisions.

## Key Considerations

- Maintain synchronisation between OpenAPI specification, implementation, and documentation.
- Ensure all new development adheres to the established patterns for consistency and maintainability.
- Validate the stability and performance of the new data model and local development setup.
