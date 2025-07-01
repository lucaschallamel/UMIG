# Groovy Development Guidelines for UMIG

This document provides conventions and best practices for writing Groovy code for the UMIG project, specifically for ScriptRunner REST endpoints.

## Core Principles

- **Clarity and Readability:** Code should be easy to understand. Use meaningful variable names and add comments for complex logic.
- **Robust Error Handling:** Never expose raw database or system errors to the client. Always catch exceptions and return standardized, informative JSON error messages.
- **Single Source of Truth:** The OpenAPI specification (`docs/api/openapi.yaml`) is the definitive source for all API contracts. All backend implementations must align with it.

## Standard API Implementation Patterns

The following patterns were established during the development of the Teams API and should be applied to all new and existing endpoints for consistency.

### 1. Routing for Nested Resources

To handle nested paths (e.g., `/teams/{teamId}/users/{userId}`), the script must parse the `extraPath` provided by the `getAdditionalPath(request)` method.

**Pattern:**
- Check the number of path segments (`pathParts.size()`).
- Check the value of specific segments (e.g., `pathParts[1] == 'users'`) to distinguish between operations on a parent resource versus a child resource.

**Example:**
```groovy
// Distinguishes between DELETE /teams/{id} and DELETE /teams/{id}/users/{id}
def extraPath = getAdditionalPath(request)
def pathParts = extraPath?.split('/')?.findAll { it } ?: []

if (pathParts.size() == 3 && pathParts[1] == 'users') {
    // Handle remove user from team
} else if (pathParts.size() == 1) {
    // Handle delete team
} else {
    // Return 400 Bad Request
}
```

### 2. Idempotency

- **`PUT` for Membership/Association:** Adding a resource to a collection (e.g., adding a user to a team) should be idempotent. If the association already exists, the API should return `204 No Content`. The goal is to ensure a final state, not to create a new record on every call.
- **`DELETE` for Membership/Association:** Removing a resource from a collection is also idempotent. If the association does not exist, the API should still return `204 No Content`, as the desired state (the resource is not in the collection) is met.

### 3. Error Handling and HTTP Response Codes

Always map specific database or application errors to the correct HTTP status codes as defined in `openapi.yaml`.

- **Foreign Key Violation (`SQLState '23503'`):**
  - On `DELETE`: This implies a dependency conflict. Return `409 Conflict` with a clear message (e.g., "Cannot delete team because it is still referenced by other resources.").
  - On `POST`/`PUT` (when creating an association): This implies a referenced entity was not found. Return `404 Not Found` (e.g., "User or Team not found.").

- **Unique Constraint Violation (`SQLState '23505'`):**
  - On `POST`/`PUT`: This indicates a duplicate record that violates a unique key (e.g., an email address). Return `409 Conflict` with a specific message (e.g., "A team with this email already exists.").

- **Resource Not Found:**
  - Before any `GET`, `PUT`, or `DELETE` operation on a specific resource (e.g., `/teams/{id}`), first check if the resource exists. If not, return `404 Not Found` immediately.
