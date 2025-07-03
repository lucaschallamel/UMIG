---
description: The standard workflow for creating or modifying Groovy REST API endpoints in this project.
---

This workflow ensures all API development adheres to the project's established, stable patterns to prevent bugs and maintain consistency.

## Key Reference Documents

**PRIMARY REFERENCE**: `/docs/solution-architecture.md` — Comprehensive solution architecture and API design standards

**SUPPORTING REFERENCES**:
- Current ADRs in `/docs/adr/` (skip `/docs/adr/archive/` - consolidated in solution-architecture.md)
- Working examples: `src/com/umig/api/v2/TeamsApi.groovy`

1. **Analyze the Existing Pattern**:
    * Before writing any code, thoroughly review a working, stable API file like `src/com/umig/api/v2/TeamsApi.groovy`.
    * Pay close attention to the structure: separate endpoint definitions for each HTTP method, simple `try-catch` blocks for error handling, and standard `javax.ws.rs.core.Response` objects.

2. **Replicate the Pattern**:
    * Create a new endpoint definition for each HTTP method (`GET`, `POST`, `PUT`, `DELETE`).
    * Do NOT use a central dispatcher, custom exception classes, or complex helper methods for error handling. Keep all logic within the endpoint method.

3. **Implement Business Logic**:
    * Write the core business logic inside a `try` block.
    * Call the appropriate `UserRepository` or `TeamRepository` methods.

4. **Handle Success Cases**:
    * For `GET`, `POST`, and `PUT`, return a `Response.ok()` or `Response.status(Response.Status.CREATED)` with a `JsonBuilder` payload.
    * **CRITICAL**: For a successful `DELETE`, always return `Response.noContent().build()`. Do NOT attempt to return a body.

5. **Handle Error Cases**:
    * Use `catch (SQLException e)` to handle specific database errors (e.g., foreign key violations `23503`, unique constraint violations `23505`).
    * Use a generic `catch (Exception e)` for all other unexpected errors.
    * In all `catch` blocks, log the error using `log.error()` or `log.warn()` and return an appropriate `Response.status(...)` with a simple JSON error message.

6. **Validate Inputs**:
    * Strictly validate all incoming data (path parameters, request bodies) at the beginning of the endpoint method.
    * Return a `400 Bad Request` for any invalid input.
