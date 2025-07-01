# ADR-023: Standardized REST API Implementation Patterns

* **Status:** Accepted
* **Date:** 2025-07-01
* **Deciders:** The Windsurf engineering team

## Context and Problem Statement

As the UMIG API grows, there is a need to establish clear, consistent, and robust patterns for implementing REST endpoints in Groovy. Early development of the Teams API revealed several areas where a lack of standardization could lead to inconsistent client experiences, poor error handling, and difficulty in maintenance. Specifically, we needed to define conventions for handling nested resources (e.g., team members), ensuring idempotent operations, and mapping database errors to appropriate HTTP status codes.

## Decision Drivers

* **Consistency:** All API endpoints should behave predictably.
* **Client Experience:** Clients should receive clear, informative error messages and standard HTTP status codes.
* **Maintainability:** Standard patterns make the codebase easier to understand, maintain, and extend.
* **Robustness:** The API must handle common errors (e.g., foreign key violations) gracefully without crashing or exposing internal details.
* **Adherence to REST Principles:** Operations should correctly use HTTP methods (e.g., `PUT` for idempotency).

## Considered Options

* **Option 1: Ad-hoc Implementation:** Allow developers to implement routing and error handling as they see fit for each endpoint. 
  * Pros: Faster initial development for a single endpoint.
  * Cons: Leads to massive inconsistency, poor client experience, high maintenance overhead, and brittle code.

* **Option 2: Formalized, Standard Patterns:** Define a clear set of patterns for common API implementation challenges and mandate their use across all endpoints.
  * Pros: Ensures consistency, improves robustness, simplifies maintenance, and provides a better client experience.
  * Cons: Requires a small upfront investment in defining and documenting the standards.

## Decision Outcome

Chosen option: **"Formalized, Standard Patterns"**, because the long-term benefits of consistency, robustness, and maintainability far outweigh the minimal upfront cost of defining these standards. This approach aligns with our project's commitment to high-quality, well-documented code.

The following patterns are now considered standard practice for all Groovy REST endpoints:

### 1. Routing for Nested Resources
To handle nested paths (e.g., `/teams/{teamId}/users/{userId}`), the script must parse the `extraPath` from the request. The number and value of path segments determine the specific resource and action being requested.

### 2. Idempotency for `PUT` and `DELETE`
Operations that modify collections (e.g., team memberships) must be idempotent.
- **`PUT`:** If the resource to be added already exists, the operation should succeed with a `204 No Content` response.
- **`DELETE`:** If the resource to be removed does not exist, the operation should succeed with a `204 No Content` response.

### 3. Standardized Error-to-HTTP-Code Mapping
Specific database errors must be caught and mapped to standard HTTP response codes.
- **Foreign Key Violation (`SQLState '23503'`) on `DELETE`:** Return `409 Conflict` to indicate the resource is still in use.
- **Foreign Key Violation (`SQLState '23503'`) on `POST`/`PUT`:** Return `404 Not Found` to indicate a referenced dependency does not exist.
- **Unique Key Violation (`SQLState '23505'`) on `POST`/`PUT`:** Return `409 Conflict` to indicate a duplicate resource.

### Positive Consequences

* All new and existing APIs will follow a consistent, predictable structure.
* The client-side experience will be improved with clear and appropriate error responses.
* Onboarding new developers will be easier as the patterns are clearly documented.
* The overall quality and robustness of the API will be significantly increased.

### Negative Consequences

* None anticipated.

## Validation

This decision will be considered successful when:
* Code reviews confirm that all new REST endpoints are adhering to these patterns.
* The number of unhandled exceptions and generic `500 Internal Server Error` responses related to these scenarios decreases.
* The API documentation (`openapi.yaml`) and implementation remain consistently synchronized.
