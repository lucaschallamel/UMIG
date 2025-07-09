### [Unreleased]

#### 2025-07-09 (Hierarchical Filtering for Teams and Labels)
- **Feat(API/UI):** Implemented cascading hierarchical filtering for Teams and Labels in Iteration View.
  - Enhanced TeamRepository with 5 new filtering methods (by migration, iteration, plan, sequence, and phase).
  - Created LabelRepository with hierarchical filtering capabilities for all levels.
  - Extended TeamsApi and created LabelsApi with consistent query parameter support (`?migrationId`, `?iterationId`, etc.).
  - Updated frontend to refresh Teams and Labels selectors based on hierarchical context.
- **Docs(API):** Comprehensive documentation updates:
  - Updated OpenAPI specification with new endpoints and query parameters.
  - Created detailed API specs for Teams and Labels (TeamsAPI.md, LabelsAPI.md).
  - Regenerated Postman collection to reflect new API capabilities.
- **UI(Iteration View):** Improved filter behavior with progressive refinement:
  - Migration selector now shows "SELECT A MIGRATION" as default text.
  - Iteration selector now shows "SELECT AN ITERATION" as default text.
  - All dependent filters reset on migration or iteration change.
  - Phase filter updates dynamically based on sequence selection.

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

