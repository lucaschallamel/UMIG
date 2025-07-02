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

## Data Model

As of July 2025, the core data model has been refactored to be iteration-centric ("Model C"). This means the `iterations_ite` table now links a migration to a master plan via `plm_id`, allowing a single migration to use different plans for different iterations (e.g., a DR test versus a production run). Additionally, the `controls_master_ctm` table now includes a `ctm_code` for unique, human-readable business keys, enhancing data clarity.
- See [ADR-024: Iteration-Centric Data Model](../docs/adr/ADR-024-iteration-centric-data-model.md) for the formal architectural decision and rationale.

## Local Development Environment

The local development setup has been refactored to use a Node.js-based orchestration layer. This replaces traditional shell scripts with Node.js equivalents for starting, stopping, and managing the environment, and introduces a unified `umig-local` CLI. This change streamlines the development workflow and improves cross-platform consistency.
- See [ADR-025: Node.js-based Dev Environment Orchestration](../docs/adr/ADR-025-NodeJS-based-Dev-Environment-Orchestration.md) for the formal architectural decision and rationale.

## Testing Standards

The project's test suite has been significantly stabilised and hardened. A new standard, formalised in `ADR-026`, mandates the use of precise SQL query mocks and improved test isolation to ensure reliability and prevent regressions. Tests are adapted to respect security principles by using mock scripts instead of modifying sensitive files.
- See [ADR-026: Specific Mocks In Tests](../docs/adr/ADR-026-Specific-Mocks-In-Tests.md) for the formal architectural decision and rationale.

## Reference

- See [ADR-023: Standardized REST API Implementation Patterns](../docs/adr/ADR-023-Standardized-Rest-Api-Patterns.md) for the formal architectural decision and rationale.
