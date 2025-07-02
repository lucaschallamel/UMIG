# System Patterns

## Architectural Overview

UMIG employs a modular, service-oriented architecture with a strong emphasis on clarity, maintainability, and best practice adherence. The system is designed to ensure all components interact in a predictable and robust manner, with clear boundaries and responsibilities.

## REST API Implementation Standards (as of July 2025)

Following ADR-023, the project has adopted formalised patterns for all Groovy-based REST endpoints:

- **Implementation Pattern: Simple and Direct:** Each HTTP verb for a given resource is implemented in its own separate endpoint definition. Inline `try-catch` blocks are used for error handling, avoiding centralized helper methods or custom exception classes.
- **Explicit Routing for Nested Resources:** Endpoints must parse and interpret path segments to distinguish between operations on parent and child resources (e.g., `/teams/{teamId}/users/{userId}`).
- **Idempotency for PUT/DELETE:** Operations modifying associations (such as team membership) must be idempotent, returning `204 No Content` when the desired state is already achieved. If a resource to be removed does not exist, `204 No Content` is still returned.
- **Robust Error Handling:** Database errors are caught and mapped to precise HTTP status codes:
  - Foreign key violation (`SQLState '23503'`): `409 Conflict` on DELETE (with blocking relationships), `404 Not Found` on POST/PUT.
  - Unique constraint violation (`SQLState '23505'`): `409 Conflict`.
  - Resource not found: `404 Not Found` before any operation on a specific resource.
  - `POST` endpoints perform robust input validation and return field-specific error messages.
- **OpenAPI as Single Source of Truth:** All API contracts are defined in `openapi.yaml`, and backend implementations must remain synchronised with this specification.
- **Documentation and Validation:** All standards are documented in developer guides and validated through code review and automated tests.

## Data Model

As of July 2025, the core data model has been refactored to be iteration-centric ("Model C") (ADR-024). This means the `iterations_ite` table now links a migration to a master plan via `plm_id`, allowing a single migration to use different plans for different iterations (e.g., a DR test versus a production run). Additionally, the `controls_master_ctm` table now includes a `ctm_code` for unique, human-readable business keys, enhancing data clarity. The user-team membership has been migrated to a many-to-many relationship using the `teams_tms_x_users_usr` join table (ADR-022). Dedicated comment tables for step-level and instance-level comments (`step_pilot_comments_spc`, `step_instance_comments_sic`) have also been introduced (ADR-021).
- See [ADR-024: Iteration-Centric Data Model](../docs/adr/ADR-024-iteration-centric-data-model.md) for the formal architectural decision and rationale.
- See [ADR-022: Migration to Many-to-Many User-Team Relationship](../docs/adr/ADR-022-user-team-nn-relationship.md) for the formal architectural decision and rationale.
- See [ADR-021: Introduction of Step-Level and Instance-Level Comments](../docs/adr/ADR-021%20-%20adr-step-comments.md) for the formal architectural decision and rationale.

## Local Development Environment

The local development setup has been refactored to use a Node.js-based orchestration layer (ADR-025). This replaces traditional shell scripts with Node.js equivalents for starting, stopping, and managing the environment, and introduces a unified `umig-local` CLI. This change streamlines the development workflow and improves cross-platform consistency.
- See [ADR-025: Node.js-based Dev Environment Orchestration](../docs/adr/ADR-025-NodeJS-based-Dev-Environment-Orchestration.md) for the formal architectural decision and rationale.

## Testing Standards

The project's test suite has been significantly stabilised and hardened. A new standard, formalised in `ADR-026`, mandates the use of precise SQL query mocks and improved test isolation to ensure reliability and prevent regressions. Tests are adapted to respect security principles by using mock scripts instead of modifying sensitive files. Additionally, deprecated `faker` API calls have been replaced, and critical Jest configuration issues have been resolved, ensuring the test suite runs successfully without warnings.
- See [ADR-026: Specific Mocks In Tests](../docs/adr/ADR-026-Specific-Mocks-In-Tests.md) for the formal architectural decision and rationale.

## Data Generation Standards

All data generator scripts and their corresponding tests now adhere to a consistent 3-digit numeric prefix naming convention (e.g., `001_generate_core_metadata.js`, `099_generate_instance_data.js`). This ensures robust ordering, traceability, and simplified maintenance for all data generation processes.

## Reference

- See [ADR-023: Standardized REST API Implementation Patterns](../docs/adr/ADR-023-Standardized-Rest-Api-Patterns.md) for the formal architectural decision and rationale.
