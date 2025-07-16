### [Unreleased]

#### 2025-07-16 (Labels Admin GUI Implementation)
- **Feat(Labels):** Complete Labels admin interface with full CRUD functionality
  - Added Labels to admin navigation with proper data source configuration
  - Implemented comprehensive LabelRepository with CRUD operations and dynamic update support
  - Created Labels VIEW modal with Edit button and association displays
  - Developed Labels EDIT modal with association management for applications and steps
  - Added color picker support with accessibility features (contrast color calculation)
  - Implemented migration-based filtering for steps dropdown in Labels EDIT modal
  - Added help text and dynamic loading indicators for better UX
- **Feat(API):** Extended LabelsApi with complete CRUD and association endpoints
  - Added POST /labels endpoint for creating new labels
  - Added PUT /labels/{id} endpoint for updating labels including migration changes
  - Added DELETE /labels/{id} endpoint for deleting labels
  - Added GET /labels/{id}/steps endpoint for retrieving label-associated steps
  - Added POST /labels/{labelId}/applications/{applicationId} for adding application associations
  - Added DELETE /labels/{labelId}/applications/{applicationId} for removing application associations
  - Added POST /labels/{labelId}/steps/{stepId} for adding step associations
  - Added DELETE /labels/{labelId}/steps/{stepId} for removing step associations
- **Enhancement(Steps API):** Added migration-based filtering support
  - Extended GET /steps/master endpoint to accept migrationId query parameter
  - Added findMasterStepsByMigrationId method to StepRepository
  - Ensures steps dropdown only shows steps belonging to selected migration
- **Fix(Type Safety):** Resolved multiple Groovy static type checking issues
  - Fixed explicit type casting for List operations in LabelsApi
  - Corrected Math.ceil() usage with BigDecimal to Double conversion
  - Ensured proper parameter type handling throughout the codebase
- **Enhancement(Frontend):** Improved Labels management user experience
  - Added ApiClient methods for all label operations and associations
  - Implemented dynamic step filtering based on selected migration
  - Added onMigrationChange handler for real-time dropdown updates
  - Enhanced error handling with specific error messages
  - Added loading states and disabled states for better feedback

#### 2025-07-15 (Applications Label Management)
- **Feat(Applications):** Complete Labels association management in Admin GUI
  - Added label_count column to Applications listing showing association counts
  - Implemented Labels display in VIEW modal with colored tag visualization
  - Added Labels section to EDIT modal with full CRUD functionality
  - Created add/remove functionality for Application-Label associations
  - Enhanced ApiClient with labels methods (getLabels, associateLabel, disassociateLabel)
  - Updated EntityConfig to include label_count in tableColumns and sortMapping
- **Feat(API):** Extended ApplicationsApi with label association endpoints
  - Added GET /applications/{id}/labels endpoint for retrieving application labels
  - Added PUT /applications/{appId}/labels/{labelId} for creating label associations
  - Added DELETE /applications/{appId}/labels/{labelId} for removing label associations
  - Enhanced ApplicationRepository with findApplicationLabels, associateLabel, disassociateLabel methods
  - Added label_count to findAllApplicationsWithCounts query with LEFT JOIN on labels_lbl_x_applications_app
- **Fix(Frontend):** Resolved label dropdown population issue
  - Fixed field name mismatch between Labels API (id, name) and application-specific endpoints (lbl_id, lbl_name)
  - Updated createSelectOptions call in renderApplicationLabelsEdit to use correct field names
  - Labels now properly display with their associated colors in both VIEW and EDIT modals

#### 2025-07-15 (Teams Association Management and Modal Consistency)
- **Feat(Teams):** Complete Teams association management in Admin GUI
  - Implemented Teams VIEW modal with user and application associations display
  - Added Teams EDIT modal with comprehensive association management capabilities
  - Created add/remove functionality for Team-User associations with proper validation
  - Implemented add/remove functionality for Team-Application associations
  - Added `createUserSelectOptions` method for proper user name display in dropdowns
  - Enhanced ApiClient with teams association methods (getMembers, addMember, removeMember, addApplication, removeApplication)
- **Feat(API):** Extended TeamsApi with association endpoints
  - Added GET /teams/{id}/applications endpoint for retrieving team applications
  - Added PUT /teams/{teamId}/applications/{applicationId} for adding application associations
  - Added DELETE /teams/{teamId}/applications/{applicationId} for removing application associations
  - Enhanced TeamRepository with findTeamApplications, addApplicationToTeam, removeApplicationFromTeam methods
  - Fixed SQL queries to avoid referencing non-existent audit fields in teams_tms_x_applications_app table
- **Enhancement(Environment Search):** Implemented full-stack environment search functionality
  - Added search, pagination, and sorting support to EnvironmentsApi with GString SQL fix
  - Created findAllEnvironmentsWithCounts method in EnvironmentRepository with parameterized queries
  - Fixed EntityConfig environments entity to include empty filters array for search enablement
  - Resolved GString SQL type inference error by using string concatenation instead of interpolation
- **Fix(State Management):** Resolved multiple state persistence and UI issues
  - Fixed sort field persistence bug where sort parameters persisted across entity switches
  - Updated AdminGuiState.setCurrentSection to reset sortField and sortDirection
  - Fixed confirmation dialog regression by replacing native confirm() with custom showSimpleConfirm
  - Updated removeIterationAssociation and removeIteration to use Promise-based confirmation
- **Enhancement(Users API):** Added active user filtering support
  - Extended Users API with active parameter for filtering active/inactive users
  - Updated UserRepository.findAllUsers to support activeFilter parameter
  - Added proper type validation for active parameter (true/false only)
- **UI(Modal Consistency):** Standardized modal patterns across Teams and Environments
  - Aligned Teams modal CSS styling with Environment modal structure using env-details classes
  - Added "Edit Environment" button to Environment VIEW modal for consistency with Teams modal
  - Fixed modal display method from showModal to document.body.insertAdjacentHTML
  - Implemented consistent modal footer layout and button positioning
- **Fix(Teams Modal):** Resolved Teams modal creation and display issues
  - Fixed showTeamEditModal to handle both create and edit modes properly
  - Added proper null handling for new team creation vs existing team editing
  - Fixed saveTeam method to use create() for new teams and update() for existing teams
  - Resolved modal not displaying by using correct DOM insertion method

#### 2025-07-15 (Custom Confirmation Dialog Pattern for Environment Management)
- **Fix(UI):** Resolved critical confirmation dialog flickering issue in environment association management
  - Implemented custom Promise-based confirmation dialog system replacing native `confirm()` function
  - Fixed issue where native confirm dialogs would flicker and disappear immediately in modal contexts
  - Created DOM-based confirmation overlay with high z-index (9999) to ensure visibility above existing modals
  - Added proper event handling with button click handlers that resolve/reject promises
  - Implemented automatic DOM cleanup after user interaction to prevent memory leaks
- **Enhancement(UX):** Improved user experience for destructive operations
  - Users can now reliably confirm removal of environment-application and environment-iteration associations
  - Consistent styling with application theme using inline CSS for maximum compatibility
  - Blocking design prevents user interaction with underlying UI until confirmation is provided
- **Pattern(Architecture):** Established reusable confirmation dialog pattern for complex modal workflows
  - Added technical implementation details to solution architecture documentation
  - Created template for handling browser dialog interference in SPA applications
  - Documented benefits including elimination of UI flickering and reliable event handling

#### 2025-01-15 (API Documentation and OpenAPI Updates)
- **Docs(API):** Created comprehensive UsersAPI.md specification
  - Documented all 5 endpoints with detailed request/response schemas
  - Added query parameter documentation for pagination, filtering, and sorting
  - Included error response details with SQL state codes and examples
  - Added implementation notes on type safety, pagination, and search functionality
- **Fix(OpenAPI):** Updated OpenAPI specification for accuracy
  - Fixed User schema to use integer IDs and correct field names (usr_first_name, usr_last_name)
  - Added missing UserInput schema for create/update operations
  - Fixed Team schema to use correct database field names (tms_id, tms_name, tms_email)
  - Updated all team-related endpoints to use integer IDs instead of UUIDs
- **Docs(API):** Updated TeamsAPI.md for consistency
  - Changed path parameter types from UUID to integer
  - Updated request/response schemas to use database field names
  - Fixed example responses to show correct field structure
- **Feat(Testing):** Regenerated Postman collection
  - Updated collection includes all Users API endpoints
  - Team endpoints now use correct field names and ID types
  - All request bodies match the actual database schema

#### 2025-07-15 (Admin GUI Bug Fixes and UX Improvements)
- **Fix(UI):** Resolved multiple critical issues in Admin GUI functionality
  - Fixed View modal to display ALL user attributes instead of just ID/timestamps
  - Corrected Edit modal error messages - now shows "Update" errors instead of "Create"
  - Resolved 500 Internal Server Error on user updates by implementing proper type conversion
  - Fixed missing primary key field (usr_id) in edit forms causing update failures
- **Fix(Styling):** Restored colored role and status badges
  - Recreated missing CSS styles for role badges (Super Admin, Admin, User, Pilot, No Role)
  - Added status badges (Active/Inactive) with proper color coding
  - Implemented rounded corners and consistent styling across all badges
- **Fix(Pagination):** Fixed missing pagination controls and page size selector
  - Resolved DOM structure issues where pagination was being overwritten
  - Fixed page size dropdown (25/50/100) to properly communicate with API
  - Corrected API parameter naming (pageSize → size) to match backend expectations
  - Preserved pagination HTML structure during table updates
- **Fix(Authentication):** Resolved login flow errors
  - Fixed "Cannot read properties of undefined (reading 'baseUrl')" error
  - Added proper context binding for ApiClient methods
  - Implemented initialization delay to ensure modules are ready
- **Fix(Error Handling):** Enhanced error messaging throughout the system
  - Delete operations now show specific API error messages instead of generic text
  - Example: "Cannot delete user with ID 56 as they are still referenced by other resources"
  - Fixed JSON parsing errors on successful DELETE operations (204 No Content)
  - Added proper handling for empty response bodies
- **Refactor(JavaScript):** Major refactoring of admin-gui.js into modular components
  - Split 1,901-line file into 8 focused modules:
    - EntityConfig.js: Entity configurations and field definitions
    - UiUtils.js: Utility functions and UI helpers
    - AdminGuiState.js: State management and data caching
    - ApiClient.js: API communication and error handling
    - AuthenticationManager.js: Login and session management
    - TableManager.js: Table rendering and pagination
    - ModalManager.js: Modal dialogs and form handling
    - AdminGuiController.js: Main orchestration and initialization
  - Improved maintainability and code organization
  - Enhanced error handling and type safety throughout

#### 2025-07-15 (Environments Management for Admin GUI - Enhanced)
- **Feat(Repository):** Created comprehensive EnvironmentRepository for environment data management
  - Implemented full CRUD operations for environments with proper error handling
  - Added methods to retrieve application and iteration counts with SQL aggregation
  - Created association/disassociation methods for managing environment relationships
  - Implemented `getIterationsByEnvironmentGroupedByRole()` for role-based iteration grouping
  - Added blocking relationship checks for safe deletion with detailed reporting
  - Fixed SQL query to use correct `itt_code` column for iteration types
- **Feat(API):** Created EnvironmentsApi REST endpoint following v2 API patterns
  - GET /environments - List all environments with application/iteration counts and pagination support
  - GET /environments/{id} - Retrieve single environment with full relationship details
  - GET /environments/{id}/iterations - Get iterations grouped by environment role
  - GET /environments/roles - List all available environment roles
  - POST/PUT/DELETE operations with proper constraint violation handling
  - Association endpoints for managing application and iteration relationships
  - Fixed static type checking issues by removing @Field annotations and logging
  - Added ApplicationsApi for listing applications in association dialogs
- **Feat(UI):** Enhanced Admin GUI with complete environments management
  - Added environments entity configuration with proper field definitions and sorting mappings
  - Implemented view details modal showing applications and iterations grouped by role
  - Added association management features with modal dialogs:
    - Associate Application button with dropdown selection
    - Associate Iteration button with role selection
  - Created notification system with slide-in/slide-out animations
  - Enhanced CSS with better selected menu state visibility (white text)
  - Added comprehensive error handling and user feedback
  - Integrated with existing SPA navigation and dynamic content loading patterns
- **Feat(Admin):** Completed third major entity management screen
  - Environments join Users and Teams as fully implemented admin entities
  - Consistent UI/UX patterns across all management screens
  - Feature parity with CRUD operations, pagination, search, sorting, and associations
  - Added support for many-to-many relationship management through intuitive UI

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

