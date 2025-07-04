### [Unreleased]

#### 2025-07-04 (Iteration View Macro/API Dynamic Data)
- **Feat(Macro/API):** Iteration View macro now dynamically loads migrations from the new REST API, using a robust repository pattern and ScriptRunner-compatible DB access.
  - Created `MigrationRepository.groovy` for encapsulated migration data access.
  - Refactored `migrationApi.groovy` to call the repository and return JSON, with robust error handling.
  - Macro HTML migration selector now displays a loading placeholder and is populated client-side via JS.
  - Updated `iteration-view.js` to fetch migrations from `/rest/scriptrunner/latest/custom/migrations` and handle loading, error, and empty states gracefully.
- **Docs(API):** Added/updated API specifications for migrations in `docs/api/migrationApi.md`.
- **Pattern:** Established a reusable pattern for all future macros: UI selectors are populated via REST API and JS, not hardcoded in Groovy.

