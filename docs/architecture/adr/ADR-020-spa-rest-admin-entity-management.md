# ARD020 - Adopt SPA + REST Pattern for Admin Entity Management

**Status:** Accepted  
**Date:** 2025-06-26

## Context

The UMIG project requires scalable, maintainable, and user-friendly administrative interfaces to manage various database entities (e.g., users, roles, teams). Historically, admin UIs in Confluence ScriptRunner macros have relied on server-side rendering or macro-based navigation, which led to complex, fragmented, and hard-to-maintain code.

Recent work on the user management interface demonstrated that a Single Page Application (SPA) approach using vanilla JavaScript, combined with ScriptRunner REST endpoints, provides a superior developer and user experience. This pattern enables seamless in-place navigation, dynamic rendering of both list and detail/edit views, and robust, type-safe communication with the backend.

## Decision

- **All new admin interfaces for database entities will follow the SPA+REST pattern:**
  - **Backend:**
    - ScriptRunner REST endpoints are defined in Groovy under `src/com/umig/api/v2/EntityApi.groovy`.
    - Endpoints expose CRUD operations for each entity (e.g., `/rest/scriptrunner/latest/custom/users/{id}`).
    - Repository pattern is used for database access.
    - All data is exchanged as JSON, with defensive type handling (booleans, numbers, etc.).
  - **Frontend:**
    - A single JS file per entity (e.g., `user-list.js`) handles list, detail, and edit views in a SPA workflow.
    - UI is dynamically rendered in a single container, with no page reloads or macro HTML fetching.
    - Tables and forms are generated from the entity’s fields, ensuring maintainability and scalability.
    - Edit forms allow editing all fields except the primary key, with input types inferred by field name and type.
    - All API calls use fetch with robust error handling and correct payload typing.
  - **UX:**
    - Atlassian AUI styles are used for native look and feel.
    - Navigation is seamless (back to list/edit/save), with clear error and success messages.

## Consequences

- **Rapid scaffolding:** New admin UIs for any entity can be created by copying and adapting the SPA/REST pattern.
- **Consistency:** All admin interfaces will have a uniform look, feel, and code structure.
- **Maintainability:** Dynamic table/form rendering and type-safe payloads make it easy to add or modify fields.
- **Robustness:** Defensive type handling prevents common API and DB errors.
- **Documentation:** This ADR is referenced in the README, technical docs, and code comments.

## Alternatives Considered

- **Macro-based navigation:** Rejected due to poor UX and maintainability.
- **Server-side rendering:** Rejected for lack of SPA benefits and increased complexity.
- **Heavyweight JS frameworks:** Not adopted to maintain simplicity, performance, and minimal dependencies.

## Related Documentation

- [README.md](/README.md) — Project overview and setup
- [CHANGELOG.md](/CHANGELOG.md) — Change history
- [docs/techContext.md](/docs/techContext.md) — Technical context and rationale
- Example implementation: `src/web/js/user-list.js`, `src/com/umig/api/v2/UserApi.groovy`

---

**This ADR formalizes the adoption of the SPA + REST pattern as the default for all admin entity management in UMIG.**
