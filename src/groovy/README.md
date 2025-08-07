# UMIG ScriptRunner Source Tree Overview

This document describes the structure and conventions for all Groovy backend code and frontend assets used by ScriptRunner in the UMIG project.

## Folder Map

| Folder                     | Purpose                                |
| -------------------------- | -------------------------------------- |
| `umig/macros/`             | UI macro scripts (container only)      |
| `umig/api/`                | REST API endpoint scripts              |
| `umig/repository/`         | Data access layer (repository pattern) |
| `umig/utils/`              | Shared Groovy utilities                |
| `umig/web/js/`, `web/css/` | Frontend JS/CSS assets for macros      |
| `umig/tests/`              | Groovy-based tests (integration/unit)  |

All folders are under the `umig/` namespace for clarity, future-proofing, and to avoid name collisions. This structure supports ScriptRunner's scan path and project scalability ([CA], [SF], [ISA]).

## Key Principles

- **Separation of Concerns:** Macros only render containers/load assets; business logic is in APIs and repositories.
- **Versioning:** Use `v1/`, `v2/` subfolders for breaking changes in macros/APIs.
- **Repository Pattern:** All DB access is via repository classes for testability and clarity.
- **Frontend Assets:** All JS/CSS is versioned and referenced by macros; see `web/README.md` for serving details.
- **Testing:** See `tests/README.md` for how to add/run tests and manage dependencies.

## References

- See `/docs/solution-architecture.md` and ADRs for architectural decisions.
- See each subfolder's README for detailed usage and conventions.
  a new record on every call.
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
