# Active Context

## Current Focus

The primary focus as of July 2025 is the hardening and standardisation of the Teams API, with an emphasis on robust routing, precise error handling, and the adoption of formalised REST API implementation patterns across the platform.

## Recent Changes

- Refactored Teams API routing logic to correctly handle nested endpoints for team membership management.
- Improved error handling, mapping database errors to appropriate HTTP status codes (`409 Conflict`, `404 Not Found`).
- Updated the OpenAPI specification to reflect new response codes and ensure synchronisation with implementation.
- Regenerated Postman collection to align automated tests with the updated API contract.
- Authored a new developer guide (`src/groovy/README.md`) detailing the new API patterns.
- Established ADR-023 as the formal architectural record for REST API standards.
- Updated documentation and changelog to reflect these enhancements.

## Next Steps

- Apply the new REST API implementation patterns to all other existing endpoints.
- Continue to validate and document the standards through code review and automated testing.
- Monitor for any further edge cases or inconsistencies as the standards are rolled out project-wide.

## Key Considerations

- Maintain synchronisation between OpenAPI specification, implementation, and documentation.
- Ensure all new development adheres to the established patterns for consistency and maintainability.
