### [Unreleased]

#### 2025-07-04 (Data Generation Pipeline Refactor)
- **Fix(Data Generation):** Resolved instance data inheritance issues by refactoring the data generation pipeline.
  - Reordered generators: renamed `101_generate_instructions.js` to `098_generate_instructions.js` to ensure master data exists before instance creation.
  - Fixed schema type mismatch in `instructions_instance_ini.tms_id` (changed from UUID to INTEGER).
  - Enhanced instance generator to properly inherit all master fields unless explicitly overridden.
  - Added debug logging to verify complete data inheritance and instance creation.
- **Test(Generators):** Updated all test suites to reflect new generator order and inheritance patterns.
- **Docs(ADR):** Documented the architectural decision for full attribute instantiation in instance tables.

#### 2025-07-04 (Iteration View Macro/API Dynamic Data)
- **Feat(Macro/API):** Iteration View macro now dynamically loads migrations from the new REST API, using a robust repository pattern and ScriptRunner-compatible DB access.
  - Created `MigrationRepository.groovy` for encapsulated migration data access.
  - Refactored `migrationApi.groovy` to call the repository and return JSON, with robust error handling.
  - Macro HTML migration selector now displays a loading placeholder and is populated client-side via JS.
  - Updated `iteration-view.js` to fetch migrations from `/rest/scriptrunner/latest/custom/migrations` and handle loading, error, and empty states gracefully.
- **Docs(API):** Added/updated API specifications for migrations in `docs/api/migrationApi.md`.
- **Pattern:** Established a reusable pattern for all future macros: UI selectors are populated via REST API and JS, not hardcoded in Groovy.

