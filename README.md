# UMIG - Unified Migration Implementation Guide

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Development Status](https://img.shields.io/badge/Status-MVP%20Development-orange.svg)]()
[![ScriptRunner](https://img.shields.io/badge/ScriptRunner-Confluence-green.svg)]()
[![Database](https://img.shields.io/badge/Database-PostgreSQL-blue.svg)]()

## Project Overview

UMIG (Unified Migration Implementation Guide) is a bespoke, multi-user, real-time web application designed to manage and orchestrate complex IT cutover events for data migration projects. Built as a **pure ScriptRunner application** for Atlassian Confluence, it provides a central command and control platform for managing hierarchical implementation plans.

### Core Purpose

UMIG addresses the critical need for structured, auditable, and collaborative management of enterprise IT migrations, cutover events, and release processes. It transforms unstructured migration playbooks into dynamic, interactive runsheets that provide real-time visibility and control for all stakeholders.

### Key Features

- **Hierarchical Implementation Plans**: Structured organization of migrations → iterations → plans → sequences → phases → steps → instructions
- **Real-time Collaboration**: Multi-user environment with role-based access and team management
- **Status Tracking**: Complete audit trail of execution progress with commenting system
- **Email Notifications**: Automated notifications for step status changes with template management
- **Interactive Runsheets**: Dynamic, filterable views for live cutover event management
- **Responsive Design**: Mobile-friendly interface for field operations
- **Pure ScriptRunner Integration**: Native Confluence plugin architecture

## Architecture & Technology Stack

### Core Technologies

- **Runtime Platform**: Atlassian Confluence + ScriptRunner for Confluence
- **Backend Language**: Groovy (ScriptRunner-compatible)
- **Database**: PostgreSQL 14 with Liquibase migrations
- **Frontend**: Vanilla JavaScript with Atlassian AUI styling
- **Development Environment**: Node.js orchestrated Podman containers
- **API Architecture**: RESTful endpoints following v2 conventions

### Architecture Principles

- **Separation of Concerns**: Clean separation between macros, APIs, and data access layers
- **Canonical vs Instance Pattern**: Reusable master templates with time-bound execution instances
- **Repository Pattern**: Centralized data access with connection pooling
- **SPA + REST Pattern**: Single-page applications with RESTful backend APIs
- **Zero External Dependencies**: Pure vanilla JavaScript with no frameworks

## Project Structure

```
UMIG/
├── src/                              # Main application source (reorganized 2025)
│   └── groovy/                       # Groovy source code root
│       ├── README.md                 # Source code documentation
│       └── umig/                     # Main package namespace
│           ├── api/                  # REST API endpoints
│           │   ├── README.md         # API documentation
│           │   └── v2/               # Version 2 APIs
│           │       ├── PlansApi.groovy
│           │       ├── SequencesApi.groovy
│           │       ├── TeamMembersApi.groovy
│           │       ├── TeamsApi.groovy
│           │       ├── UsersApi.groovy
│           │       ├── migrationApi.groovy
│           │       ├── stepViewApi.groovy
│           │       └── web/          # Web-specific APIs
│           │           └── WebApi.groovy
│           ├── macros/               # ScriptRunner macros for UI
│           │   ├── README.md         # Macro documentation
│           │   └── v1/               # Version 1 macros
│           │       ├── adminGuiMacro.groovy      # Unified Admin GUI
│           │       ├── iterationViewMacro.groovy  # Iteration view for cutover management
│           │       └── stepViewMacro.groovy       # Step view functionality
│           ├── repository/           # Data access layer
│           │   ├── README.md         # Repository documentation
│           │   ├── ImplementationPlanRepository.groovy
│           │   ├── InstructionRepository.groovy
│           │   ├── LookupRepository.groovy
│           │   ├── MigrationRepository.groovy
│           │   ├── SequenceRepository.groovy
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
│           │   │   ├── SequencesApiIntegrationTest.groovy
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
│                   ├── admin-gui.js
│                   ├── hello-world.js
│                   ├── iteration-view.js
│                   ├── step-view.js
│                   └── umig-ip-macro.js
├── docs/                             # Comprehensive documentation
│   ├── adr/                          # Architecture Decision Records
│   │   ├── archive/                  # All ADRs now consolidated in solution-architecture.md
│   │   └── template.md               # ADR template
│   ├── api/                          # API documentation & OpenAPI spec
│   │   ├── README.md                 # API documentation
│   │   ├── openapi.yaml              # OpenAPI 3.0 specification
│   │   ├── redoc-static.html         # API documentation viewer
│   │   └── postman/                  # Postman collection
│   │       ├── README.md             # Postman documentation
│   │       └── UMIG_API_V2_Collection.postman_collection.json
│   ├── dataModel/                    # Database schema & ERD
│   │   └── README.md                 # Comprehensive data model documentation
│   ├── devJournal/                   # Sprint reviews & development notes
│   │   ├── README.md                 # Development journal index
│   │   ├── devJournalEntryTemplate.md
│   │   ├── sprintReviewTemplate.md
│   │   └── [dated entries]           # Chronological development history
│   ├── solution-architecture.md      # Complete solution architecture
│   └── roadmap/                      # Development roadmap and UI/UX specifications
│       ├── unified-roadmap.md        # Unified development roadmap
│       ├── iteration-view.md         # Iteration view specification
│       ├── step-view.md              # Step view specification
│       └── template.md               # UI/UX template
├── mock/                             # UI/UX mockups and prototypes
│   ├── README.md                     # Mockup documentation
│   ├── iteration-view.html           # Iteration view HTML mockup
│   ├── styles.css                    # Mockup CSS (100% vanilla)
│   └── script.js                     # Mockup JavaScript (zero dependencies)
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
│   │   ├── sample_team_members_mapping.json
│   │   ├── sample_teams.csv          # Sample team data
│   │   └── sample_teams_mapping.json
│   ├── data-utils/                   # Data utilities and importers
│   │   └── Confluence_Importer/      # Confluence data import tools
│   │       ├── README.md             # Import documentation
│   │       ├── rawData/              # Raw JSON data from Confluence
│   │       ├── Data_Integration/     # Integration scripts
│   │       ├── scrape_html.sh        # HTML scraping utility
│   │       └── test_scrape_html_oneline.sh
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
├── CHANGELOG.md                      # Project changelog
├── CLAUDE.md                         # Claude AI assistant guide
├── GEMINI.md                         # Gemini AI assistant guide
├── LICENSE                           # Project license
└── cline-docs/                       # AI assistant context docs
    ├── activeContext.md              # Current development context
    ├── productContext.md             # Product context and requirements
    ├── progress.md                   # Progress tracking
    ├── projectBrief.md               # Project brief
    ├── systemPatterns.md             # System patterns
    └── techContext.md                # Technical context
```

## Quick Start

### Prerequisites

- **Node.js v18+** and npm
- **Podman** and **podman-compose**
- **Ansible** (for environment setup)
- **Liquibase CLI** (for database migrations)

### Environment Setup

1. **Initial Setup**:
   ```bash
   cd local-dev-setup
   npm install
   ```

2. **Start Development Environment**:
   ```bash
   npm start
   ```

3. **Generate Test Data**:
   ```bash
   npm run generate-data
   ```

4. **Run Tests**:
   ```bash
   npm test
   ```

### Services & Access

When the development environment is running:

- **Confluence**: [http://localhost:8090](http://localhost:8090)
- **PostgreSQL**: localhost:5432
- **MailHog (Email Testing)**: [http://localhost:8025](http://localhost:8025)

### Initial Configuration

After starting Confluence for the first time:

#### 1. Database Connection (ScriptRunner)
1. Navigate to **Confluence Administration** → **ScriptRunner** → **Resources**
2. Add a new **Database Connection Pool**:
   - **Pool Name**: `umig_db_pool`
   - **Driver**: `org.postgresql.Driver`
   - **JDBC URL**: `jdbc:postgresql://umig_postgres:5432/umig_app_db`
   - **User**: `umig_app_user`
   - **Password**: `123456`

#### 2. Mail Server (Email Notifications)
1. Navigate to **⚙️ Settings** → **General Configuration** → **Mail Servers**
2. Add SMTP Mail Server:
   - **Name**: `MailHog Local Development`
   - **Hostname**: `umig_mailhog` (container name, not localhost)
   - **Port**: `1025`
   - **From Address**: `umig-system@localhost`
3. Send a test email and verify in MailHog at [http://localhost:8025](http://localhost:8025)

## Development Commands

### Environment Management

From the local-dev-setup directory:

```bash
# Start complete development stack
npm start

# Stop all services
npm stop

# Restart with data preservation
npm run restart

# Restart and erase all data
npm run restart:erase

# Restart and erase only UMIG database
npm run restart:erase:umig
```

### Data Generation & Testing

```bash
# Generate synthetic data (with reset)
npm run generate-data:erase

# Generate synthetic data (without reset)
npm run generate-data

# Import CSV data
npm run import-csv -- --file path/to/your/file.csv

# Run all tests
npm test

# Run Groovy integration tests (from project root)
./src/groovy/umig/tests/run-integration-tests.sh
```

### Database Operations

```bash
# Run Liquibase migrations manually
liquibase --defaults-file=liquibase/liquibase.properties update
```

## Core Data Model

### Design Philosophy

UMIG employs a **Canonical vs Instance** pattern:

- **Canonical (Master) Entities**: Reusable templates/playbooks (suffixed with `_master_`)
- **Instance Entities**: Time-bound execution records (suffixed with `_instance_`)

### Entity Hierarchy

1. **Strategic Layer**: `Migrations` → `Iterations` → `Plans`
2. **Canonical Layer**: `Plans` → `Sequences` → `Phases` → `Steps` → `Instructions`
3. **Quality Gates**: `Controls` defined at Phase level
4. **Instance Layer**: Mirrors canonical hierarchy with execution tracking
5. **Collaboration**: Comments at both master and instance levels

### Key Tables

- `migrations_mig`: Strategic initiatives
- `iterations_ite`: Links migrations to plans for iterative delivery
- `plans_master_plm`: Master playbooks
- `steps_master_stm`: Granular executable tasks
- `instructions_master_inm`: Detailed procedures
- `step_master_comments`, `step_instance_comments`: Collaboration features
- `*_instance_*`: Live execution tracking

## API Architecture

### REST Endpoint Structure

- **Base URL**: `/rest/scriptrunner/latest/custom/`
- **API Version**: v2
- **Security**: Confluence user authentication required
- **Documentation**: OpenAPI 3.0 specification in `docs/api/openapi.yaml`

### Key Endpoints

- `/users` - User management
- `/teams` - Team management
- `/environments` - Environment management
- `/migrations` - Migration selector data
- `/stepViewApi` - Step view macro data
- `/plans` - Implementation plan management

### SPA + REST Pattern

All admin interfaces follow a standardized pattern:

**Backend (Groovy)**:
```groovy
@BaseScript CustomEndpointDelegate delegate

entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Repository pattern for data access
    return Response.ok(payload).build()
}
```

**Frontend (Vanilla JS)**:
- Single JS file per entity
- Dynamic rendering of list/detail/edit views
- No page reloads, seamless navigation
- Atlassian AUI styling

## Current Development Status

### ✅ Completed Features

- **Local Development Environment**: Node.js orchestrated Podman containers
- **Admin UI (SPA Pattern)**: Complete user/team management with robust error handling
- **API Standards**: Comprehensive REST patterns with specific error mappings
- **Data Generation**: Modular synthetic data generators with complete instance data
- **Testing Framework**: Stabilized with SQL query mocks and type safety patterns
- **Architecture Documentation**: Consolidated solution architecture with implementation patterns
- **Project Reorganization**: Clean package structure with `src/groovy/umig/` namespace
- **Iteration View Implementation**: Complete hierarchical filtering and labels integration
- **Labels API**: Full CRUD operations with hierarchical filtering capabilities
- **Teams API**: Enhanced with hierarchical filtering across all levels
- **Migration API**: Core functionality with proper error handling

### ✅ Recently Completed (July 2025)
- **Plans API Implementation**: Complete CRUD operations with hierarchical filtering (July 31, 2025)
  - Full REST API endpoints for plans management
  - Type-safe parameter handling with explicit casting (ADR-031)
  - Comprehensive integration testing with ScriptRunner compatibility
  - Repository pattern implementation with PlansRepository
  - Enhanced Postman collection with authentication support
- **Role-Based Access Control System**: Comprehensive user permission management (July 16, 2025)
  - Implemented NORMAL (read-only), PILOT (operational), and ADMIN (full access) user roles
  - Confluence user context integration with automatic role detection
  - CSS-based UI element visibility control with pilot-only and admin-only classes
  - Dynamic role-based controls applied after user authentication
  - Read-only mode indicators and graceful permission degradation
- **Enhanced Iteration View Interface**: Major UI/UX overhaul with operational capabilities (July 16, 2025)
  - Dynamic status dropdown with database-driven color coding
  - Interactive instruction completion tracking with real-time checkbox controls
  - Comprehensive comment system with add, edit, delete operations
  - Step instance detail views with metadata, teams, and impact analysis
  - Enhanced step action buttons (Mark All Complete, Update Status)
  - Improved error handling and user feedback notifications
- **StatusRepository & API Extensions**: Centralized status management infrastructure (July 16, 2025)
  - Created StatusRepository for type-safe access to status_sts table
  - Extended StepsApi with step instance management, comments, and user context endpoints
  - Added UserRepository username-based lookup for Confluence integration
  - Comprehensive error handling with proper HTTP status codes
- **Centralized Status Management System**: Unified status values with color coding across all entities (July 16, 2025)
  - Created status_sts table with 31 pre-populated statuses across 7 entity types
  - Each status includes hex color code for consistent UI presentation
  - Updated all data generators to use centralized statuses instead of hard-coded values
  - Fixed iteration view status counters to accurately reflect new status system
  - Ensured data consistency across migrations, iterations, plans, sequences, phases, steps, and controls
- **Environment Role Association**: Steps can now be associated with specific environment types (July 16, 2025)
  - Added enr_id column to both steps_master_stm and steps_instance_sti tables
  - Database migration with foreign key constraints and performance indexes
  - Updated data generation scripts to randomly assign environment roles to steps
  - Enhanced step-view specification with environment role context and filtering
- **Email Notification System**: Production-ready automated notifications with template management (July 16, 2025)
  - Complete integration with Confluence native mail API and MailHog for local testing
  - Multi-team notification logic (owner + impacted teams + cutover teams)
  - Template management with HTML/text content and GString variable processing
  - Comprehensive audit logging for all email events in JSONB format
  - Automatic notifications for step opened, instruction completed, and status changes
  - Working end-to-end testing with ScriptRunner Console integration
- **Environments Management**: Complete admin GUI entity with CRUD operations and association management
  - Full repository pattern implementation with relationship counts
  - REST API endpoints with hierarchical data access
  - Enhanced UI with view details modal and association features
  - Integration with applications and iterations through role-based associations
- **Labels Management**: Complete admin GUI implementation with full CRUD functionality (July 16, 2025)
  - Comprehensive LabelRepository with dynamic update support
  - Complete REST API with CRUD and association endpoints
  - Color picker support with accessibility features
  - Migration-based filtering for step associations
  - VIEW and EDIT modals with association management
  - Real-time step dropdown filtering based on selected migration

#### Admin GUI System (July 15-16, 2025)
- **Complete Admin Interface**: Full SPA-based administration system for managing users, teams, applications, environments, and labels
- **Enhanced Association Management**: Complete many-to-many relationship management for all entities
- **Labels Management**: Full CRUD with color-coded tags, migration-scoped filtering, and dynamic step associations
- **Modal Consistency**: Standardized VIEW and EDIT modals across all entities with consistent UI patterns
- **Advanced Features**: Environment search, migration-based filtering, real-time dropdown updates
- **Custom Confirmation Dialogs**: Promise-based confirmation system replacing native dialogs for better UX
- **Active User Filtering**: Support for filtering active/inactive users in team member dropdowns

#### Iteration View Enhancements (July 10, 2025)
- **Hierarchical Filter Cascade**: Complete parent-child reset logic across Migration → Iteration → Plan → Sequence → Phase → Teams + Labels
- **Labels Column Integration**: Colored label tags displayed in runsheet between Team and Status
- **Groovy Type Safety**: Comprehensive patterns for static type checking and error prevention
- **Master vs Instance Filtering**: Proper instance ID filtering for accurate step retrieval
- **Database Relationship Handling**: Many-to-many label-step associations with graceful error handling

### 🚧 MVP Remaining Work

- **Core REST APIs**: ✅ Plans (completed), ✅ Sequences (completed), Phases, Instructions endpoints  
- **Main Dashboard UI**: Real-time interface with AJAX polling
- **Planning Feature**: HTML macro-plan generation and export
- **Data Import Strategy**: Migration from existing Confluence/Draw.io/Excel sources

### Step View System (✅ Completed - July 2025)

The **Step View** is a standalone macro for embedding individual step interfaces in Confluence pages:

- **Specification**: `docs/roadmap/step-view.md`
- **Macro Implementation**: `src/groovy/umig/macros/v1/stepViewMacro.groovy`
- **Frontend Implementation**: `src/groovy/umig/web/js/step-view.js` (890 lines)
- **API Backend**: `src/groovy/umig/api/v2/stepViewApi.groovy`

**Key Features (2025-07-17)**:
- **Three-Parameter URL Support**: `?mig=migrationName&ite=iterationName&stepid=XXX-nnn`
- **Feature Parity**: All iteration view step panel capabilities
- **Role-Based Controls**: NORMAL (read-only), PILOT (operational), ADMIN (full access)
- **Embeddable Design**: Can be inserted into any Confluence page for focused step execution
- **Real-time Updates**: Instruction completion, status changes, comment management
- **Email Notifications**: Automatic notifications on status changes

**Example Usage**:
```
http://localhost:8090/display/UMIG/UMIG+-+Step+View?mig=migrationa&ite=run1&stepid=DEC-001
```

### Current Focus: Iteration View System

The **Iteration View** is the primary runsheet interface for cutover events:

- **Specification**: `docs/roadmap/iteration-view.md`
- **Functional Mockup**: `mock/iteration-view.html`
- **Target Implementation**: `src/groovy/umig/macros/v1/iterationViewMacro.groovy`
- **Current Pattern**: Iteration View macro dynamically loads migration data from `/migrations` API

**Dynamic Data Pattern (2025-07-04)**:
- The Iteration View macro loads migration selector data dynamically via REST API
- No hardcoded options - all data loaded via REST and JavaScript
- Strict separation of concerns for maintainability and testability

## Development Guidelines

### Mandatory Patterns

1. **Database Access**: Use `DatabaseUtil.withSql` pattern exclusively
2. **API Endpoints**: Use `CustomEndpointDelegate` with proper error handling
3. **Frontend**: Pure vanilla JavaScript with Atlassian AUI styling
4. **Testing**: Specific SQL query mocks to prevent regressions
5. **Security**: Include `groups: ["confluence-users"]` on all endpoints
6. **Type Safety**: Use explicit casting (`as String`, `as UUID`) for all parameter conversions
7. **Hierarchical Filtering**: Use instance IDs (pli_id, sqi_id, phi_id) not master IDs

### Code Quality Standards

- **No External Frameworks**: Pure vanilla JavaScript only
- **Repository Pattern**: Centralized data access with complete field selection
- **Error Handling**: Specific SQL state mappings (23503→400, 23505→409)
- **Type Safety**: Mandatory explicit casting when static type checking is enabled
- **Naming Conventions**: Strict `snake_case` database conventions
- **Cascade Logic**: Parent filter changes must reset all child filters
- **Many-to-Many Handling**: Graceful error handling for optional relationships

## Testing Strategy

### Unit Tests

- **Location**: `src/groovy/umig/tests/apis/` (Groovy), `local-dev-setup/__tests__/` (Node.js)
- **Purpose**: Fast, isolated component validation
- **Technology**: Groovy for backend, Jest for Node.js utilities

### Integration Tests

- **Location**: `src/groovy/umig/tests/integration/`
- **Purpose**: End-to-end validation against live environment
- **Requirements**: Running local development stack

## Documentation

### Primary References

1. **`docs/solution-architecture.md`**: Complete solution architecture (consolidated from 26+ ADRs)
2. **`docs/dataModel/README.md`**: Comprehensive database schema and ERD
3. **`docs/api/openapi.yaml`**: OpenAPI 3.0 specification
4. **`docs/adr/`**: Current Architecture Decision Records

### Development Context

- **`docs/devJournal/`**: Sprint reviews and progress tracking
- **`cline-docs/`**: AI assistant context and progress
- **`docs/roadmap/`**: Development roadmap and interface specifications

## API Testing

### Postman Collection

A comprehensive Postman collection is available for testing all API endpoints:

- **Collection**: `docs/api/postman/UMIG_API_V2_Collection.postman_collection.json`
- **Environment Variables**: Configure `baseUrl`, `username`, `password`
- **Auto-generated**: Collection is generated from OpenAPI specification

### Usage

1. Import collection into Postman
2. Configure environment variables for local development
3. Run requests organized by entity tags (Users, Teams, Plans)

## Contributing

### Development Workflow

1. **Environment Setup**: `cd local-dev-setup && npm install && npm start`
2. **Database Changes**: Create Liquibase changesets in `local-dev-setup/liquibase/changelogs/`
3. **Backend Development**: Add Groovy classes in `src/groovy/umig/`
4. **Frontend Development**: Create/modify JS files in `src/groovy/umig/web/js/`
5. **Testing**: Run unit tests and integration tests
6. **Documentation**: Update relevant documentation

### Architecture Guidelines

- **Always Start**: Review `docs/solution-architecture.md` for architectural context
- **Follow Patterns**: Reference existing SPA+REST implementations
- **Database Access**: Use mandatory `DatabaseUtil.withSql` pattern
- **Zero Dependencies**: All frontend code must be pure vanilla JavaScript

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support & Feedback

For support, questions, or feedback:

- **Issues**: Use the project issue tracker
- **Documentation**: Comprehensive docs available in `docs/` directory
- **Development Journal**: See `docs/devJournal/` for development history

---

**UMIG** - Transforming IT migration chaos into structured, auditable, collaborative success.