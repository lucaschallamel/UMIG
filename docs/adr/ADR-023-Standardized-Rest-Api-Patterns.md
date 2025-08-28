# ADR-023: Standardized REST API Implementation Patterns

- **Status:** Accepted
- **Date:** 2025-07-02
- **Deciders:** The Windsurf engineering team

## Context and Problem Statement

As the UMIG API grows, there is a need to establish clear, consistent, and robust patterns for implementing REST endpoints in Groovy. Early development of the Teams API revealed several areas where a lack of standardization could lead to inconsistent client experiences, poor error handling, and difficulty in maintenance. A subsequent refactoring of the Users API highlighted critical platform-specific limitations within the ScriptRunner environment, revealing that overly complex abstractions lead to instability.

This ADR defines the standard patterns required to ensure API stability, consistency, and maintainability.

## Decision Drivers

- **Stability:** The highest priority is ensuring the API is stable and functional within the ScriptRunner environment.
- **Consistency:** All API endpoints should behave predictably.
- **Client Experience:** Clients should receive clear, informative error messages and standard HTTP status codes.
- **Maintainability:** Standard patterns make the codebase easier to understand, maintain, and extend.
- **Robustness:** The API must handle common errors (e.g., foreign key violations) gracefully without crashing or exposing internal details.

## Considered Options

- **Option 1: Ad-hoc Implementation:** Allow developers to implement routing and error handling as they see fit for each endpoint.
  - Pros: Faster initial development for a single endpoint.
  - Cons: Leads to massive inconsistency, poor client experience, high maintenance overhead, and brittle, unstable code.

- **Option 2: Formalized, Standard Patterns:** Define a clear set of patterns for common API implementation challenges and mandate their use across all endpoints.
  - Pros: Ensures consistency, improves robustness, simplifies maintenance, and provides a better client experience.
  - Cons: Requires a small upfront investment in defining and documenting the standards.

## Decision Outcome

Chosen option: **"Formalized, Standard Patterns"**, because the long-term benefits of a stable, consistent, and maintainable API far outweigh the minimal overhead of adhering to standards.

The following patterns are now considered **mandatory** for all Groovy REST endpoints:

### 1. Implementation Pattern: Simple and Direct

To ensure stability in the ScriptRunner environment, the implementation must be simple and direct.

#### Association Endpoints (e.g., Team Membership)

- Always check for existence of both sides of the association (e.g., both team and user) before acting.
- Prevent duplicate associations in join tables.
- Return 204 on successful deletion, 404 if the association did not exist, and clear error messages for all cases.

- **Separate Endpoints per Method:** Each HTTP verb (`GET`, `POST`, `PUT`, `DELETE`) for a given resource must be implemented in its own separate endpoint definition (e.g., `users(httpMethod: "GET", ...)`).
- **No Central Dispatcher:** Do not use a `switch` statement or other logic to route requests internally based on `request.method`.
- **Inline Error Handling:** Each endpoint method must contain its own `try-catch` blocks for handling `SQLException` and generic `Exception`. Do not use centralized error-handling helper methods or custom exception classes.
- **Avoid Unsupported Features:** Do not use advanced Groovy features (e.g., `@CompileStatic`) that have not been proven to be stable on the target platform.

### 2. Routing for Nested Resources

To handle nested paths (e.g., `/teams/{teamId}/users/{userId}`), the script must parse the `extraPath` from the request. The number and value of path segments determine the specific resource and action being requested.

### 3. Idempotency and Correct Responses

Operations must be idempotent and return correct HTTP responses.

- **`PUT`:** If the resource to be added already exists, the operation should succeed with a `204 No Content` or `200 OK` response.
- **`DELETE`:** A successful `DELETE` operation **must** return `204 No Content`. If the resource to be removed does not exist, the operation should still be considered a success and return `204 No Content`. This is non-negotiable.

### 4. Standardized Error-to-HTTP-Code Mapping

Specific database errors must be caught and mapped to standard HTTP response codes.

- **Foreign Key Violation (`SQLState '23503'`) on `DELETE`:** Return `409 Conflict` and include a detailed JSON object listing all blocking relationships (across all foreign key constraints) that prevent deletion. No associations are deleted unless the user is deleted.
- **Foreign Key Violation (`SQLState '23503'`) on `POST`/`PUT`:** Return `404 Not Found` to indicate a referenced dependency does not exist.
- **Unique Key Violation (`SQLState '23505'`) on `POST`/`PUT`:** Return `409 Conflict` to indicate a duplicate resource.
- **POST endpoints must perform robust input validation and return field-specific error messages for missing fields, type errors, unknown fields, and constraint violations.**

### Positive Consequences

- All new and existing APIs will follow a consistent, predictable, and stable structure.
- The client-side experience will be improved with clear and appropriate error responses.
- Onboarding new developers will be easier as the patterns are clearly documented.
- The overall quality and robustness of the API will be significantly increased.

### Negative Consequences

- A minor amount of code duplication in `try-catch` blocks is accepted as a trade-off for stability.

## Validation

This decision will be considered successful when:

- Code reviews confirm that all new REST endpoints are adhering to these patterns.
- The number of unhandled exceptions and generic `500 Internal Server Error` responses related to these scenarios decreases.
- The API documentation (`openapi.yaml`) and implementation remain consistently synchronized.
