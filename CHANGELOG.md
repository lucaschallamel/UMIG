### [Unreleased]
#### Added
- **2025-06-26:**
    - **Adopted SPA + REST Pattern for Admin UIs:**
        - Added ADR020, formalizing the use of a dynamic SPA (Single Page Application) pattern with ScriptRunner REST endpoints for all admin entity management interfaces.
        - Implemented a full interactive user management SPA as a reference (see `user-list.js` and `UserApi.groovy`).
        - UI now dynamically renders both list and detail/edit views for users, with robust type and payload handling.
        - Edit forms are generated from all entity fields except the primary key, and payloads are correctly typed for backend compatibility.
        - This pattern is now the standard for future admin UIs (see ADR020 for rationale and details).
