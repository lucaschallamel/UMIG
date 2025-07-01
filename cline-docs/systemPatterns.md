# System Patterns

## Architectural Overview

UMIG employs a modular, service-oriented architecture with a strong emphasis on clarity, maintainability, and best practice adherence. The system is designed to ensure all components interact in a predictable and robust manner, with clear boundaries and responsibilities.

## REST API Implementation Standards (as of July 2025)

Following ADR-023, the project has adopted formalised patterns for all Groovy-based REST endpoints:

- **Explicit Routing for Nested Resources:** Endpoints must parse and interpret path segments to distinguish between operations on parent and child resources (e.g., `/teams/{teamId}/users/{userId}`).
- **Idempotency for PUT/DELETE:** Operations modifying associations (such as team membership) must be idempotent, returning `204 No Content` when the desired state is already achieved.
- **Robust Error Handling:** Database errors are caught and mapped to precise HTTP status codes:
  - Foreign key violation (`SQLState '23503'`): `409 Conflict` on DELETE, `404 Not Found` on POST/PUT.
  - Unique constraint violation (`SQLState '23505'`): `409 Conflict`.
  - Resource not found: `404 Not Found` before any operation on a specific resource.
- **OpenAPI as Single Source of Truth:** All API contracts are defined in `openapi.yaml`, and backend implementations must remain synchronised with this specification.
- **Documentation and Validation:** All standards are documented in developer guides and validated through code review and automated tests.

## Reference

- See [ADR-023: Standardized REST API Implementation Patterns](../docs/adr/ADR-023-Standardized-Rest-Api-Patterns.md) for the formal architectural decision and rationale.
