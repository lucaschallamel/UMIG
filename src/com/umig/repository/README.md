# Repository Coding Patterns (UMIG)

This document describes the repository pattern used for all database access in UMIG.

## General Principles
- **One repository class per entity** (e.g., `UserRepository.groovy`).
- **Type-safe SQL:** Use parameterized queries to avoid SQL injection and ensure type safety.
- **Return Maps:** Methods should return Maps or Lists of Maps representing DB rows.
- **No business logic:** Repositories only handle DB access, not business rules.
- **Error handling:** Throw explicit exceptions for not found or failed updates.
- **Naming:** Methods should be named for their intent: `findUserById`, `findAllUsers`, `updateUser`, etc.

## Example
```groovy
class UserRepository {
    def findUserById(int userId) { ... }
    def updateUser(int userId, Map payload) { ... }
}
```

## See Also
- [API Coding Patterns](../api/README.md)
- [ADR020 - SPA+REST Pattern](../../../docs/adr/ARD020-spa-rest-admin-entity-management.md)
