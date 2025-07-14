### [Unreleased]

#### 2025-07-14 (Admin GUI System and Enhanced Error Handling)
- **Feat(UI):** Complete Admin GUI system implementation with SPA pattern
  - Created comprehensive administration interface for managing users, teams, applications, environments
  - Implemented full CRUD operations with modal forms and dynamic table rendering
  - Added pagination, sorting, and search functionality with real-time filtering
  - Enhanced form validation with field-specific rules and client-side validation
  - Added support for role management with proper dropdown options (Admin, User, Pilot)
- **Feat(Database):** Enhanced timestamp management and schema improvements
  - Added automatic `created_at` and `updated_at` timestamp fields to users_usr table
  - Implemented database trigger for automatic timestamp updates on record modification
  - Enhanced user data generation with proper timestamp field population
  - Added `usr_active` field support for user status management
- **Feat(API):** Comprehensive error handling and validation enhancements
  - Enhanced UsersApi with detailed SQL constraint violation reporting
  - Added field-specific error messages for NOT NULL, UNIQUE, and FOREIGN KEY violations
  - Implemented proper error response structure with details and SQL state codes
  - Enhanced DELETE operation with blocking relationship detection and reporting
- **Fix(Repository):** Resolved critical user management issues
  - Fixed missing `usr_code` field in form configuration causing NULL constraint violations
  - Enhanced UserRepository with timestamp field support and proper query selection
  - Improved data type conversion handling for select fields (rls_id integer conversion)
  - Added comprehensive field validation for user code format (3-character alphanumeric)
- **UI(Admin):** Enhanced user experience and visual feedback
  - Implemented toast notifications for success/error states with auto-dismiss
  - Added detailed error display with constraint violation specifics
  - Enhanced datetime formatting (YYYY-MM-DD HH:MM:SS) for timestamp fields
  - Improved table column sorting with proper database field mapping

#### 2025-07-10 (Hierarchical Filter Cascade and Labels Implementation)
- **Fix(API/Repository):** Resolved critical filtering and type system issues in iteration view
  - Fixed Teams filter HTTP 400 error by correcting field reference (`sti.tms_id_owner` → `stm.tms_id_owner`) and UUID parsing for INTEGER team IDs
  - Fixed Labels filter HTTP 400 error by correcting UUID parsing for INTEGER label IDs  
  - Fixed StepRepository master vs instance ID filtering (plm_id→pli_id, sqm_id→sqi_id, phm_id→phi_id)
  - Added missing `stm.stm_id` field to SELECT query to resolve "No such property" errors
  - Implemented proper Groovy static type checking with explicit casting (`filters.migrationId as String`)
- **Feat(UI):** Complete hierarchical cascade behavior and labels column
  - Implemented parent-child filter reset logic: Migration → Iteration → Plan → Sequence → Phase → Teams + Labels
  - Added Labels column to runsheet between Team and Status with colored tag display
  - Fixed JavaScript URL patterns from query parameters to nested URLs for plan/sequence/phase filtering
  - Enhanced CSS styling for label tags with proper responsive design
- **Feat(Repository):** Added labels integration with proper many-to-many relationship handling
  - Created `findLabelsByStepId()` method in StepRepository for step-label associations
  - Integrated label fetching in StepsApi with robust error handling and type conversion
  - Verified label relationships through database testing (140 step-label associations confirmed)
- **Docs(API):** Updated OpenAPI specification and regenerated Postman collection
  - Added `/steps` endpoint definition with comprehensive hierarchical filtering parameters
  - Created new schema definitions: `SequenceWithSteps`, `PhaseWithSteps`, `StepWithLabels`
  - Regenerated Postman collection from updated OpenAPI spec following api-tests-specs-update workflow

#### 2025-07-09 (GitHub Actions Integration and Steps Display)
- **CI/CD:** Added GitHub Actions workflows for Claude Code integration
  - Created claude-code-review.yml for automated code review assistance
  - Added claude.yml for PR assistant functionality
- **UI(Iteration View):** Implemented steps display with API integration
  - Added StepsApi.groovy for step data retrieval
  - Enhanced iteration view to show steps for selected phases
  - Improved API error handling and data validation

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

