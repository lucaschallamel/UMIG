### [Unreleased]

### Added
- First sprint review & retrospective documented as `20250627-sprint-review.md` in `/docs/devJournal/`.
- STEP View macro & SPA MVP for migration/release steps in Confluence delivered and validated.
- SPA + REST pattern formalized (ADR020), integration testing framework established, and robust data utilities implemented.
- Sprint review workflow and persistent template added for repeatable, automated retrospectives.

#### Added
- 2025-06-27:
  - STEP View Macro & SPA MVP: Added a macro and JavaScript SPA for rendering migration/release steps in Confluence, driven by ScriptRunner REST API. The SPA fetches and displays step summary and instructions from the backend, following the SPA+REST admin UI pattern (see ADR020).
- **2025-06-26:**
  - **Adopted SPA + REST Pattern for Admin UIs:**
    - Added ADR020, formalizing the use of a dynamic SPA (Single Page Application) pattern with ScriptRunner REST endpoints for all admin entity management interfaces.
    - Implemented a full interactive user management SPA as a reference (see `user-list.js` and `UserApi.groovy`).
    - UI now dynamically renders both list and detail/edit views for users, with robust type and payload handling.
    - Edit forms are generated from all entity fields except the primary key, and payloads are correctly typed for backend compatibility.
    - This pattern is now the standard for future admin UIs (see ADR020 for rationale and details).
