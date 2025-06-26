# API Coding Patterns (UMIG)

This document outlines the required coding patterns and conventions for all REST API endpoints in the UMIG project, as formalized in [ADR020](../../../../docs/adr/ARD020-spa-rest-admin-entity-management.md).

## General Principles
- **Use ScriptRunner REST endpoints** for all API exposure (`CustomEndpointDelegate`).
- **One Groovy file per entity** (e.g., `UserApi.groovy`, `TeamApi.groovy`).
- **Repository Pattern:** All DB access must go through repository classes in `../repository/`.
- **CRUD Methods:** Each API should expose standard CRUD endpoints (GET, POST, PUT, DELETE) as appropriate.
- **Return JSON:** All endpoints must return JSON responses with appropriate status codes and error messages.
- **Type Safety:** Explicitly handle booleans, numbers, and nulls. Coerce types defensively before DB writes.
- **Error Handling:** Use consistent error response structure: `{ "error": "message" }`.
- **Documentation:** Document endpoint paths, parameters, and expected payloads in OpenAPI format if possible.

## Example Structure
```groovy
// src/com/umig/api/v2/UserApi.groovy
import com.umig.repository.UserRepository

user(httpMethod: "GET") { req ->
    def id = getAdditionalPath(req)?.getAt(0)
    // ... fetch user, return JSON
}

user(httpMethod: "PUT") { req ->
    // ... parse body, type check, update user
}
```

## See Also
- [Repository Pattern Guidelines](../repository/README.md)
- [Frontend SPA Pattern](../../../web/README.md)
- [ADR020 - SPA+REST Pattern](../../../../docs/adr/ARD020-spa-rest-admin-entity-management.md)
