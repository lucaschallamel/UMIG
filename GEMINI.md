# UMIG Project - Gemini AI Assistant Guide

## Project Overview

UMIG (Unified Migration Implementation Guide) is a bespoke, multi-user, real-time web application designed to manage and orchestrate complex IT cutover events for data migration projects. Built as a **pure ScriptRunner application** for Atlassian Confluence, it provides a central command and control platform for managing hierarchical implementation plans.

### Core Architecture
- **Backend**: Groovy scripts using ScriptRunner for Confluence
- **Frontend**: Vanilla JavaScript SPAs with Atlassian AUI styling
- **Database**: PostgreSQL with Liquibase migrations
- **Development Environment**: Podman-based containerization
- **API**: RESTful endpoints following v2 conventions

## Tech Stack & Dependencies

### Primary Technologies
- **Confluence + ScriptRunner**: Application runtime environment
- **Groovy**: Backend development language
- **PostgreSQL 14**: Primary database
- **Liquibase**: Database migration management
- **Podman**: Containerization for local development
- **Node.js**: Data utilities and testing framework
- **Vanilla JavaScript**: Frontend development (no frameworks)

### Key Dependencies
- **@faker-js/faker**: Synthetic data generation
- **Jest**: Unit testing for Node.js utilities
- **pg**: PostgreSQL driver for Node.js
- **commander**: CLI interface for utilities

## Project Structure

```
UMIG/
├── src/                              # Main application source (REORGANIZED 2025)
│   └── groovy/                       # Groovy source code root
│       ├── README.md                 # Source code documentation
│       └── umig/                     # Main package namespace
│           ├── api/                  # REST API endpoints
│           │   ├── README.md         # API documentation
│           │   └── v2/               # Version 2 APIs
│           │       ├── EnvironmentsApi.groovy
│           │       ├── LabelsApi.groovy
│           │       ├── migrationApi.groovy
│           │       ├── PlansApi.groovy
│           │       ├── StepsApi.groovy
│           │       ├── TeamMembersApi.groovy
│           │       ├── TeamsApi.groovy
│           │       ├── UsersApi.groovy
│           │       ├── stepViewApi.groovy
│           │       └── web/          # Web-specific APIs
│           │           └── WebApi.groovy
│           ├── macros/               # ScriptRunner macros for UI
│           │   ├── README.md         # Macro documentation
│           │   ├── stepViewMacro.groovy
│           │   ├── userDetailMacro.groovy
│           │   ├── userListMacro.groovy
│           │   ├── userViewMacro.groovy
│           │   └── v1/               # Version 1 macros
│           │       └── iterationViewMacro.groovy
│           ├── repository/           # Data access layer
│           │   ├── README.md         # Repository documentation
│           │   ├── ImplementationPlanRepository.groovy
│           │   ├── InstructionRepository.groovy
│           │   ├── LabelRepository.groovy
│           │   ├── LookupRepository.groovy
│           │   ├── MigrationRepository.groovy
│           │   ├── StepRepository.groovy
│           │   ├── StepTypeRepository.groovy
│           │   ├── TeamMembersRepository.groovy
│           │   ├── TeamRepository.groovy
│           │   └── UserRepository.groovy
│           ├── tests/                # Testing infrastructure
│           │   ├── README.md         # Testing documentation
│           │   ├── apis/             # API unit tests
│           │   │   ├── README.md     # API test documentation
│           │   │   └── stepViewApiUnitTest.groovy
│           │   ├── integration/      # Integration tests
│           │   │   └── stepViewApiIntegrationTest.groovy
│           │   ├── grab-postgres-jdbc.groovy
│           │   └── run-integration-tests.sh
│           ├── utils/                # Utility classes
│           │   └── DatabaseUtil.groovy
│           └── web/                  # Frontend assets
│               ├── README.md         # Web assets documentation
│               ├── css/              # Stylesheets
│               │   ├── hello-world.css
│               │   ├── iteration-view.css
│               │   └── umig-ip-macro.css
│               └── js/               # JavaScript files
│                   ├── admin-gui/           # Modular Admin GUI components
│                   │   ├── AdminGuiController.js # Main orchestration and initialization
│                   │   ├── ApiClient.js     # API communication and error handling
│                   │   ├── AuthenticationManager.js # Login and session management
│                   │   ├── EntityConfig.js  # Entity configurations and field definitions
│                   │   ├── ModalManager.js  # Modal dialogs and form handling
│                   │   ├── TableManager.js  # Table rendering and pagination
│                   │   ├── UiUtils.js       # Utility functions and UI helpers
│                   │   └── AdminGuiState.js # State management and data caching
│                   ├── hello-world.js
│                   ├── iteration-view.js
│                   ├── step-view.js
│                   ├── umig-ip-macro.js
│                   ├── user-detail.js
│                   ├── user-list.js
│                   └── user-view.js
├── mock/                             # UI/UX mockups and prototypes
│   ├── iteration-view.html           # Iteration view HTML mockup
│   ├── styles.css                    # Mockup CSS (100% vanilla)
│   ├── script.js                     # Mockup JavaScript (zero dependencies)
│   └── README.md                     # Mockup documentation
├── docs/                             # Comprehensive documentation
│   ├── adr/                          # Architecture Decision Records
│   │   ├── ADR-027-n-tiers-model.md # N-tiers model architecture
│   │   ├── ADR-028-data-import-strategy-for-confluence-json.md # Data import strategy
│   │   ├── archive/                  # Archived ADRs (consolidated)
│   │   └── template.md               # ADR template
│   ├── api/                          # API documentation & OpenAPI spec
│   │   ├── README.md                 # API documentation
│   │   ├── openapi.yaml              # OpenAPI specification
│   │   ├── redoc-static.html         # API documentation viewer
│   │   └── postman/                  # Postman collection
│   │       ├── README.md             # Postman documentation
│   │       └── UMIG_API_V2_Collection.postman_collection.json
│   ├── dataModel/                    # Database schema & ERD
│   │   └── README.md                 # Data model documentation
│   ├── devJournal/                   # Sprint reviews & dev notes
│   │   ├── README.md                 # Development journal index
│   │   ├── devJournalEntryTemplate.md # Journal entry template
│   │   ├── sprintReviewTemplate.md   # Sprint review template
│   │   └── 20250616-00 - Initial brainstorm.md # (and other entries)
│   ├── solution-architecture.md      # Complete solution architecture
│   └── ui-ux/                        # UI/UX specifications
│       ├── ROADMAP.md                # UI/UX roadmap
│       ├── iteration-view.md         # Iteration view specification
│       ├── step-view.md              # Step view specification
│       └── template.md               # UI/UX template
├── local-dev-setup/                  # Node.js development environment
│   ├── README.md                     # Development setup documentation
│   ├── scripts/                      # Data generation and utilities
│   │   ├── generators/               # Individual data generators (001-101)
│   │   ├── lib/                      # Shared utilities (db.js, utils.js)
│   │   ├── start.js, stop.js, restart.js # Environment management
│   │   ├── umig_generate_fake_data.js # Main data generation script
│   │   └── umig_csv_importer.js      # CSV import utility
│   ├── __tests__/                    # Jest unit tests and fixtures
│   │   ├── fixtures/                 # Test data fixtures
│   │   ├── generators/               # Generator unit tests
│   │   ├── umig_csv_importer.test.js # CSV importer tests
│   │   └── umig_csv_importer.unit.test.js # CSV importer unit tests
│   ├── data/                         # Sample data files
│   │   ├── sample_team_members.csv   # Sample team member data
│   │   ├── sample_team_members_mapping.json # Team member mapping
│   │   ├── sample_teams.csv          # Sample team data
│   │   └── sample_teams_mapping.json # Team mapping
│   ├── data-utils/                   # Data utilities and importers
│   │   └── Confluence_Importer/      # Confluence data import tools
│   │       ├── README.md             # Import documentation
│   │       ├── rawData/              # Raw JSON data from Confluence
│   │       ├── Data_Integration/     # Integration scripts
│   │       ├── scrape_html.sh        # HTML scraping utility
│   │       └── test_scrape_html_oneline.sh # Test script
│   ├── coverage/                     # Test coverage reports
│   ├── liquibase/                    # Database migrations
│   │   ├── changelogs/               # SQL migration files
│   │   └── liquibase.properties      # Liquibase configuration
│   ├── confluence/                   # Container configuration
│   │   ├── Containerfile             # Confluence container build
│   │   └── README.md                 # Container documentation
│   ├── postgres/                     # Database initialization
│   │   └── init-db.sh               # Database initialization script
│   ├── jest.config.js                # Jest test configuration
│   ├── jest.global-setup.cjs         # Jest global setup
│   ├── jest.global-teardown.cjs      # Jest global teardown
│   ├── babel.config.cjs              # Babel configuration
│   ├── setup.yml                     # Setup configuration
│   ├── package.json                  # npm scripts and dependencies
│   ├── package-lock.json             # npm dependency lock
│   └── podman-compose.yml            # Container orchestration
├── tests/                            # Integration tests (Groovy)
├── megalinter-reports/               # Code quality and linting reports
│   ├── IDE-config.txt                # IDE configuration
│   ├── megalinter.log                # Linter execution log
│   ├── linters_logs/                 # Individual linter logs
│   └── updated_sources/              # Auto-fixed source files
├── CHANGELOG.md                      # Project changelog
├── GEMINI.md                         # Gemini AI assistant guide
├── LICENSE                           # Project license
├── README.md                         # Project overview
└── cline-docs/                       # AI assistant context docs
    ├── activeContext.md              # Current development context
    ├── productContext.md             # Product context and requirements
    ├── progress.md                   # Progress tracking
    ├── projectBrief.md               # Project brief
    ├── systemPatterns.md             # System patterns
    └── techContext.md                # Technical context
```

## Build & Development Commands

### Environment Management (Node.js Only - No Shell Scripts)
```bash
# From local-dev-setup/ directory - npm scripts only
cd local-dev-setup

npm install            # First-time setup
npm start              # Start complete development stack
npm stop               # Graceful shutdown of all services  
npm run restart        # Restart environment
npm run restart:erase  # Restart and erase all data volumes
npm test               # Run all tests

# Advanced data management
npm run generate-data:erase  # Generate fake data with reset
npm run generate-data        # Generate fake data without reset
```

### Data Generation & Testing
```bash
# All commands from local-dev-setup/ directory
cd local-dev-setup

# Generate synthetic data
npm run generate-data        # Generate without reset
npm run generate-data:erase  # Generate with full reset
node scripts/umig_generate_fake_data.js  # Direct script execution

# Run Node.js unit tests
npm test

# Run Groovy integration tests (from project root)
cd ..
./tests/run-integration-tests.sh
```

### Generator Execution Order (Critical)
Data generators run in numerical order (001-100) to respect foreign key dependencies:
1. **001-097**: Master data (core metadata, teams, users, plans, sequences, phases, steps, controls)
2. **098**: Instruction masters (`098_generate_instructions.js`)
3. **099**: All instance data (`099_generate_instance_data.js`) - creates complete execution hierarchy
4. **100**: Instance comments (`100_generate_step_instance_comments.js`)

**Important**: Instruction masters (098) must be created before instances (099) to enable proper field population.

### Database Operations
```bash
# Run Liquibase migrations manually
liquibase --defaults-file=liquibase/liquibase.properties update
```

## Core Data Model

### Design Philosophy: Canonical vs Instance
- **Canonical (Master) Entities**: Reusable templates/playbooks (`_master_` suffix)
- **Instance Entities**: Time-bound execution records (`_instance_` suffix)

### Entity Hierarchy (Current - Iteration-Centric Model)
1. **Strategic Layer**: `Migrations` → `Iterations` → `Plans`
2. **Canonical Layer**: `Plans` → `Sequences` → `Phases` → `Steps` → `Instructions`
3. **Quality Gates**: `Controls` defined at Phase level
4. **Instance Layer**: Mirrors canonical hierarchy with execution tracking
5. **Collaboration**: Comments at both master and instance levels

### Key Tables (Updated July 2025)
- `migrations_mig`: Strategic initiatives
- `iterations_itr`: Links migrations to plans for iterative delivery  
- `plans_master_plm`: Master playbooks
- `steps_master_stm`: Granular executable tasks
- `instructions_master_inm`: Detailed procedures
- `step_master_comments`, `step_instance_comments`: Collaboration features
- `*_instance_*`: Live execution tracking with override capabilities

### Current Data Scale (Post-Generation)
- **5 migrations** with realistic statuses and dates
- **30 iterations** following pattern: 2-4 RUNS, 1-3 DRs, exactly 1 CUTOVER per migration
- **5 canonical plans** → **13 sequences** → **43 phases** → **hundreds of steps** → **712 instructions**
- **Complete instance hierarchy**: 30 plan instances → 80 sequence instances → 271 phase instances → 1,443 step instances → 4,286 instruction instances
- **Override field population**: All instance tables properly inherit master values with 30% override probability

## Architecture Patterns

### SPA + REST Pattern (ADR020)
**All admin interfaces follow this standardized pattern:**

**Backend (Groovy)**:
```groovy
@BaseScript CustomEndpointDelegate delegate

entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Repository pattern for data access
    // Return JSON responses
    return Response.ok(payload).build()
}
```

**Frontend (Vanilla JS)**:
- Single JS file per entity (`entity-name.js`)
- Dynamic rendering of list/detail/edit views
- No page reloads, seamless navigation
- Atlassian AUI styling

### Database Access Pattern
```groovy
// Required pattern using DatabaseUtil.withSql
DatabaseUtil.withSql { sql ->
    return sql.rows('SELECT * FROM table_name')
}
```

### REST Endpoint Structure
- Base URL: `/rest/scriptrunner/latest/custom/`
- Endpoints: `/users`, `/teams`, `/environments`, `/steps`, `/labels`, `/migrations`, `/stepViewApi`
- V2 API conventions (documented in `docs/api/openapi.yaml`)

### Hierarchical Filtering Pattern (ADR-030, ADR-031)
**Consistent query parameter filtering across all resources with type safety:**

**Backend Implementation**:
```groovy
// Type-safe parameter handling with explicit casting
if (filters.migrationId) {
    query += ' AND mig.mig_id = :migrationId'
    params.migrationId = UUID.fromString(filters.migrationId as String)
}

if (filters.teamId) {
    query += ' AND stm.tms_id_owner = :teamId'  
    params.teamId = Integer.parseInt(filters.teamId as String)
}
```

**API Usage**:
- `/teams?migrationId={uuid}` - Teams in a migration
- `/labels?iterationId={uuid}` - Labels in an iteration
- `/steps?planId={uuid}&teamId={int}` - Steps in a plan by team
- `/teams?phaseId={uuid}` - Teams assigned to a phase

**Frontend Integration**:
- Complete parent-child cascade logic (Migration → Iteration → Plan → Sequence → Phase → Teams + Labels)
- Dynamic filter updates based on parent selections
- Progressive refinement with automatic reset of child filters

## Key Development Guidelines

### Groovy/ScriptRunner Requirements
1. **REST Endpoints**: Must use `CustomEndpointDelegate` pattern
2. **Database Access**: Must use `DatabaseUtil.withSql` pattern  
3. **Security**: Include `groups: ["confluence-users"]` by default
4. **Type Safety**: MANDATORY explicit casting (`as String`) for all query parameters passed to UUID.fromString() or Integer.parseInt()
5. **Field Selection**: Include ALL fields referenced in result mapping in SQL SELECT clauses
6. **Master vs Instance**: Use instance IDs (pli_id, sqi_id, phi_id) for hierarchical filtering, not master IDs
7. **Path Parameters**: Use `getAdditionalPath(request)` for URL segments

### Frontend Requirements
1. **No Frameworks**: Use vanilla JavaScript only
2. **Styling**: Atlassian AUI components and styles
3. **API Calls**: Use fetch() with robust error handling
4. **Forms**: Dynamic generation from entity fields
5. **Navigation**: Single-page application workflow

## Testing Strategy

### Unit Tests
- **Location**: `src/groovy/umig/tests/apis/` (Groovy), `local-dev-setup/__tests__/` (Node.js)
- **Purpose**: Fast, isolated component validation
- **Technology**: Groovy for backend, Jest for Node.js utilities

### Integration Tests
- **Location**: `src/groovy/umig/tests/integration/`
- **Purpose**: End-to-end validation against live environment
- **Requirements**: Running local development stack
- **Technology**: Groovy with PostgreSQL JDBC

## Configuration Files

### Environment
- **Podman Compose**: `local-dev-setup/podman-compose.yml`
- **Environment Variables**: `local-dev-setup/.env` (user-created)
- **Database**: PostgreSQL with connection pooling

### Database
- **Liquibase Config**: `local-dev-setup/liquibase/liquibase.properties`
- **Migrations**: `local-dev-setup/liquibase/changelogs/`
- **Connection Pool**: `umig_db_pool` in ScriptRunner

## Services & Ports

When development environment is running:
- **Confluence**: <http://localhost:8090>
- **PostgreSQL**: localhost:5432
- **MailHog**: <http://localhost:8025> (email testing)

## Key Documentation

### **PRIMARY REFERENCE (MANDATORY)**
- **`docs/solution-architecture.md`**: Complete solution architecture consolidating all 31 ADRs - ALWAYS REVIEW FIRST

### **Current Active ADRs**
- **`docs/adr/ADR-027-n-tiers-model.md`**: N-tiers model architecture
- **`docs/adr/ADR-028-data-import-strategy-for-confluence-json.md`**: Data import strategy
- **`docs/adr/ADR-030-hierarchical-filtering-pattern.md`**: Hierarchical filtering pattern for API and UI
- **`docs/adr/ADR-031-groovy-type-safety-and-filtering-patterns.md`**: Groovy type safety and filtering patterns

### Critical References
- **API Spec**: `docs/api/openapi.yaml` - OpenAPI specification
- **API Documentation**: `docs/api/` - Individual API documentation files
  - `UsersAPI.md` - Users API with CRUD operations and filtering
  - `TeamsAPI.md` - Teams API with hierarchical filtering
  - `LabelsAPI.md` - Labels API with hierarchical filtering
  - `API_Updates_Summary.md` - Summary of recent API changes
- **Data Model**: `docs/dataModel/README.md` - Database schema and ERD
- **Current ADRs**: `docs/adr/` (skip `docs/adr/archive/` - consolidated in solution-architecture.md)

### Development Context
- **Dev Journal**: `docs/devJournal/` - Sprint reviews and progress tracking
- **Project Context**: `cline-docs/` - AI assistant context and progress
- **UI/UX Specs**: `docs/ui-ux/` - Interface specifications

## Implementation Status (July 2025)

### ✅ Completed Features
- **Local Development Environment**: Node.js orchestrated Podman containers
- **Admin UI (SPA Pattern)**: Complete user/team/environments/applications/labels management with robust error handling
- **API Standards**: Comprehensive REST patterns (ADR-023) with specific error mappings
- **API Documentation**: Complete OpenAPI specification with accurate schemas and generated Postman collections
- **Data Generation**: Modular synthetic data generators with 3-digit prefixes and correct execution order
- **Instance Data Generation**: Full canonical→instance replication with override field population
- **Schema Corrections**: Fixed type mismatches in migration 010 for instruction instance fields
- **Testing Framework**: Stabilized with specific SQL query mocks (ADR-026) and updated test coverage
- **Architecture Documentation**: All 31 ADRs consolidated into solution-architecture.md
- **Project Reorganization**: Clean package structure with `src/groovy/umig/` namespace
- **Iteration View Complete**: Fully functional with hierarchical filtering, labels integration, and dynamic step management
- **Labels Admin GUI**: Complete CRUD interface with color picker, association management, and migration-based filtering
- **Labels API**: Complete with hierarchical filtering (ADR-030) and full CRUD operations
- **Teams API**: Enhanced with hierarchical filtering capabilities and association management
- **Users API**: Complete CRUD operations with pagination and filtering
- **Environments API**: Complete CRUD operations with application/iteration associations
- **Applications API**: Complete CRUD operations with label association management
- **Steps API**: Complete with hierarchical filtering, labels integration, and migration-based filtering
- **Migration API**: Core functionality implemented
- **Type Safety Patterns**: Established Groovy static type checking patterns (ADR-031)

### 🚧 MVP Remaining Work
- **Core REST APIs**: Plans, Sequences, Phases, Instructions endpoints using established patterns
- **Main Dashboard UI**: Real-time interface with AJAX polling
- **Planning Feature**: HTML macro-plan generation and export
- **Data Import Strategy**: Migration from existing Confluence/Draw.io/Excel sources

### STEP View System (Existing)
- Macro: `src/groovy/umig/macros/stepViewMacro.groovy`
- Frontend: `src/groovy/umig/web/js/step-view.js`
- API: `src/groovy/umig/api/v2/stepViewApi.groovy`
- Purpose: Display migration/release steps in Confluence

### Iteration View System (✅ Completed)
- Specification: `docs/ui-ux/iteration-view.md`
- Mockup: `mock/iteration-view.html` (functional prototype)
- Macro: `src/groovy/umig/macros/v1/iterationViewMacro.groovy`
- Frontend: `src/groovy/umig/web/js/iteration-view.js` and `iteration-view.css`
- API: `src/groovy/umig/api/v2/StepsApi.groovy`
- Purpose: Primary runsheet interface for cutover events with complete hierarchical filtering and labels

## Development Workflow

1. **Environment Setup**: `cd local-dev-setup && npm install && npm start`
2. **Database Changes**: Create Liquibase changesets in `local-dev-setup/liquibase/changelogs/`
3. **Backend Development**: Add Groovy classes in `src/groovy/umig/`
4. **Frontend Development**: Create/modify JS files in `src/groovy/umig/web/js/`
5. **Testing**: Run unit tests (`npm test` in local-dev-setup) and integration tests (`src/groovy/umig/tests/run-integration-tests.sh`)
6. **Documentation**: Update relevant documentation, primarily `docs/solution-architecture.md`

## Important Notes

- **No External Frameworks**: Project deliberately avoids heavy JS frameworks
- **ScriptRunner Only**: Not a traditional Confluence plugin
- **Security**: All endpoints require Confluence user authentication
- **Type Safety**: Defensive type handling for all API payloads
- **Architecture Locked**: Core decisions finalized for MVP phase

## AI Assistant Guidelines

### **CRITICAL: Always Start Here**
1. **MANDATORY FIRST STEP**: Review `/docs/solution-architecture.md` for complete architectural context
2. **Current ADRs**: Review ADR-027 (N-tiers model) and ADR-028 (data import strategy) for latest decisions
3. **Skip Archive**: Ignore `/docs/adr/archive/` - all content consolidated in solution-architecture.md

### Development Standards (Non-Negotiable)
1. **API Pattern**: Use established SPA+REST pattern - reference `src/groovy/umig/api/v2/StepsApi.groovy`, `TeamsApi.groovy`, and `LabelsApi.groovy`
2. **Database Access**: MANDATORY `DatabaseUtil.withSql` pattern - no exceptions
3. **Type Safety**: MANDATORY explicit casting (`as String`) for all query parameters - see ADR-031
4. **Filtering Logic**: Use instance IDs (pli_id, sqi_id, phi_id) for hierarchical filtering, not master IDs
5. **Field Selection**: Include ALL fields referenced in result mapping in SQL SELECT clauses
6. **Testing**: Specific SQL query mocks required (ADR-026) - prevent regressions
7. **Naming**: Strict `snake_case` database conventions with `_master_`/`_instance_` suffixes
8. **Error Handling**: Specific SQL state mappings (23503→400, 23505→409)
9. **Zero Dependencies**: All frontend code must be pure vanilla JavaScript (reference `mock/` implementation)

### Project Context (Current State)
- **Maturity**: Functional stage with iteration view complete and proven patterns established
- **Timeline**: 4-week MVP deadline - ruthless scope management required
- **Current Focus**: Implement remaining REST APIs using established hierarchical filtering and type safety patterns
- **Next Priority**: Plans, Sequences, Phases, Instructions APIs following the StepsApi.groovy pattern
- **Pattern**: Reference StepsApi.groovy, TeamsApi.groovy, and LabelsApi.groovy as implementation templates

### Recent Achievements (July 2025)
- **Iteration View Complete**: Fully functional hierarchical filtering with labels integration and dynamic step management
- **Type Safety Patterns**: Established robust Groovy static type checking patterns (ADR-031) preventing runtime errors
- **API Pattern Maturity**: Proven REST API patterns with StepsApi, TeamsApi, and LabelsApi serving as definitive templates
- **Database Filtering Mastery**: Resolved master vs instance ID filtering patterns and complete field selection requirements
- **Labels Admin GUI Complete**: Full CRUD interface with color picker, association management, and migration-based filtering
- **Labels Integration**: Complete many-to-many relationship handling with colored tag display and graceful error handling
- **API Documentation Complete**: Comprehensive OpenAPI specification with accurate schemas and generated Postman collections
- **Schema Consistency**: Resolved mismatches between API documentation and actual implementation for Users and Teams APIs
- **Admin GUI Refactoring**: Split 1,901-line monolithic admin-gui.js into 8 modular components for improved maintainability
- **JavaScript Architecture**: Established modular patterns with EntityConfig, UiUtils, AdminGuiState, ApiClient, AuthenticationManager, TableManager, ModalManager, and AdminGuiController
- **Environment Search Enhancement**: Implemented full-stack search functionality for environments with pagination, sorting, and filtering, fixing GString SQL type inference issues
- **Teams Association Management**: Complete VIEW and EDIT modals for Teams with user and application association management, including add/remove functionality
- **Applications Label Management**: Complete Labels association management in Admin GUI with add/remove functionality
- **Modal Consistency**: Standardized modal UI patterns across Teams and Environments with consistent AUI styling and Edit button functionality
- **State Management Fixes**: Resolved sort field persistence bug and confirmation dialog regressions in admin interface using custom Promise-based dialogs
- **Active User Filtering**: Added active parameter support to Users API for populating dropdown selections with active users only
- **Migration-Based Filtering**: Implemented dynamic step filtering based on selected migration in Labels edit modal

## Workflows

The project includes predefined workflows for common development tasks. These workflows are located in `.clinerules/workflows/` and can be executed by referencing their path:

### Available Workflows

1. **Memory Bank Update** (`.clinerules/workflows/memory-bank-update.md`)
   - Updates Cline memory bank files in `cline-docs/` based on recent changes
   - Uses Developer Journal entries, CHANGELOG.md, README files, and ADRs
   - Maintains consistency across activeContext.md, progress.md, systemPatterns.md, etc.

2. **API Work** (`.clinerules/workflows/api-work.md`)
   - Guides development of new API endpoints
   - Ensures consistency with established patterns

3. **API Tests & Specs Update** (`.clinerules/workflows/api-tests-specs-update.md`)
   - Updates API tests and OpenAPI specifications
   - Regenerates documentation and Postman collections

4. **Sprint Review** (`.clinerules/workflows/sprint-review.md`)
   - Creates structured sprint review documentation
   - Updates progress tracking and retrospectives

5. **Development Journal** (`.clinerules/workflows/dev-journal.md`)
   - Creates daily development journal entries
   - Documents progress, decisions, and learnings

6. **Documentation Update** (`.clinerules/workflows/doc-update.md`)
   - Updates project documentation systematically
   - Ensures consistency across all documentation files

7. **Commit** (`.clinerules/workflows/commit.md`)
   - Guides proper git commit creation
   - Ensures consistent commit message format

8. **Pull Request** (`.clinerules/workflows/pull-request.md`)
   - Creates well-structured pull requests
   - Includes proper documentation and test plans

9. **Data Model** (`.clinerules/workflows/data-model.md`)
   - Updates data model documentation
   - Ensures ERD and schema documentation consistency

10. **Kick-off** (`.clinerules/workflows/kick-off.md`)
    - Initializes new feature development
    - Sets up necessary files and documentation

### Executing Workflows

To execute a workflow with Gemini CLI, simply reference it:
- "Please run the memory bank update workflow"
- "Execute `.clinerules/workflows/memory-bank-update.md`"
- "Update the API documentation using the api-tests-specs-update workflow"

### Workflow Guidelines
- Workflows ensure consistency and completeness
- They codify best practices and project standards
- Always check workflow output for accuracy
- Workflows may reference other project files and patterns