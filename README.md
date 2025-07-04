# UMIG Project

## Iteration View Macro/API Dynamic Data Pattern (2025-07-04)

- The Iteration View macro now loads its migration selector dynamically from the REST API endpoint `/rest/scriptrunner/latest/custom/migrations`.
- Migrations are served by a new `migrationApi.groovy` endpoint, which uses the repository pattern (`MigrationRepository.groovy`) and ScriptRunner-compatible DB access (`DatabaseUtil.withSql`).
- Macro HTML provides only a loading placeholder; JavaScript (`iteration-view.js`) fetches and renders the options, handling loading, error, and empty states.
- All new macros and dynamic UI elements should follow this pattern: no hardcoded options, all data loaded via REST and JS.
- This pattern ensures strict separation of concerns, maintainability, and testability.

See the API documentation in `docs/api/migrationApi.md` and the solution architecture for further details.

