# UMIG - Unified Migration Implementation Guide

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)]()
[![API](https://img.shields.io/badge/API-v2.13.0-green.svg)]()
[![Platform](https://img.shields.io/badge/Confluence-9.2.7-blue.svg)]()
[![ScriptRunner](https://img.shields.io/badge/ScriptRunner-9.21.0-green.svg)]()
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2014-blue.svg)]()
[![Status](https://img.shields.io/badge/Status-UAT%20Release-brightgreen.svg)]()

## Overview

UMIG (Unified Migration Implementation Guide) is an enterprise-grade web application for managing complex IT migration cutover events. Built as a pure ScriptRunner application for Atlassian Confluence, it transforms unstructured migration playbooks into dynamic, collaborative runsheets with real-time visibility and control.

**Version 1.0.0** released to UAT on October 7, 2025 — the first production release milestone.

## Key Features

### Hierarchical Implementation Management

- **7-Level Hierarchy**: Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions
- **Canonical vs Instance Pattern**: Reusable master templates with time-bound execution instances
- **Real-time Collaboration**: Multi-user environment with role-based access (NORMAL, PILOT, ADMIN)
- **Complete Audit Trail**: Status tracking with comprehensive commenting system

### Enterprise Architecture

- **Pure ScriptRunner Application**: Native Confluence integration without external dependencies
- **REST API v2.12.0**: 31+ endpoints with OpenAPI 3.0 specification
- **Foundation Service Layer**: 6 specialized services (11,735 lines) with 9/10 security rating
- **Repository Pattern**: Centralized data access with PostgreSQL 14 connection pooling

### Production-Ready Quality

- **450+ Tests Passing**: 100% test success rate across Groovy and JavaScript
- **9.2/10 Security Rating**: CSP, session management, CSRF protection, XSS prevention
- **<150ms Response Times**: 25% better than target with optimized database queries
- **95%+ Test Coverage**: Comprehensive validation across unit, integration, and security tests

### Developer Experience

- **Technology-Prefixed Commands**: Clear `npm run test:js` and `npm run test:groovy` separation
- **Cross-Platform Development**: Node.js orchestrated Podman containers
- **Comprehensive Documentation**: TOGAF-driven architecture with 74 ADRs
- **Data Generation Tools**: Synthetic data generators for rapid development

## Technology Stack

**Application**: v1.0.0 | **API**: v2.12.0 | **Database**: v1.0.0

### Runtime Environment

- **Platform**: Atlassian Confluence 9.2.7
- **Plugin**: ScriptRunner 9.21.0
- **Backend**: Groovy 3.0.15 with static type checking
- **Database**: PostgreSQL 14 with Liquibase migrations
- **Frontend**: Vanilla JavaScript with Atlassian AUI
- **Development**: Node.js + Podman containers

### Architecture Patterns

- **SPA + REST**: Single-page applications with RESTful backend
- **Repository Pattern**: Centralized data access layer
- **Canonical vs Instance**: Reusable templates with execution records
- **Service Layer**: 6 specialized services for security and performance
- **Zero Dependencies**: Pure vanilla JavaScript, no frameworks

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
│           │       ├── ControlsApi.groovy
│           │       ├── InstructionsApi.groovy
│           │       ├── PlansApi.groovy
│           │       ├── SequencesApi.groovy
│           │       ├── SystemConfigurationApi.groovy  # Configuration management
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
│           │   ├── ControlRepository.groovy
│           │   ├── ImplementationPlanRepository.groovy
│           │   ├── InstructionRepository.groovy
│           │   ├── LookupRepository.groovy
│           │   ├── MigrationRepository.groovy
│           │   ├── SequenceRepository.groovy
│           │   ├── StepRepository.groovy
│           │   ├── StepTypeRepository.groovy
│           │   ├── SystemConfigurationRepository.groovy # Configuration management
│           │   ├── TeamMembersRepository.groovy
│           │   ├── TeamRepository.groovy
│           │   └── UserRepository.groovy
│           ├── tests/                # Testing framework (90%+ coverage)
│           │   ├── README.md         # Testing documentation
│           │   ├── apis/             # API unit tests
│           │   │   ├── README.md     # API test documentation
│           │   │   └── stepViewApiUnitTest.groovy
│           │   ├── compatibility/    # Backward compatibility validation
│           │   ├── integration/      # Integration tests
│           │   │   ├── StepsApiIntegrationTest.groovy
│           │   │   ├── SequencesApiIntegrationTest.groovy
│           │   │   └── stepViewApiIntegrationTest.groovy
│           │   ├── performance/      # Performance validation tests
│           │   ├── unit/             # Comprehensive unit test suite
│           │   ├── upgrade/          # Upgrade validation tests (US-032)
│           │   │   ├── run-all-tests.sh          # Master test orchestration
│           │   │   ├── test-container-health.sh  # Container validation
│           │   │   ├── test-database-connectivity.sh # Database tests
│           │   │   ├── test-api-endpoints.sh     # REST API validation
│           │   │   └── test-scriptrunner.sh      # ScriptRunner tests
│           │   ├── validation/       # Database and quality validation
│           │   ├── archived-shell-scripts/ # Deprecated shell scripts (archived)
│           │   └── grab-postgres-jdbc.groovy
│           ├── utils/                # Utility classes
│           │   ├── DatabaseUtil.groovy
│           │   ├── EmailService.groovy
│           │   ├── EnhancedEmailService.groovy    # Email notification system
│           │   ├── StepNotificationIntegration.groovy # Cross-system integration
│           │   └── UrlConstructionService.groovy  # Dynamic URL generation
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
│   ├── api/                          # API documentation & OpenAPI spec
│   │   ├── README.md                 # API documentation
│   │   ├── openapi.yaml              # OpenAPI 3.0 specification (v2.13.0)
│   │   ├── redoc-static.html         # API documentation viewer
│   │   ├── examples/                 # API examples and enhanced documentation
│   │   │   ├── README.md             # Examples documentation
│   │   │   └── enhanced-examples.yaml # Enhanced API examples
│   │   └── postman/                  # Postman collection
│   │       ├── README.md             # Postman documentation
│   │       └── UMIG_API_V2_Collection.postman_collection.json
│   ├── architecture/                 # TOGAF & ArchiMate driven architecture (74 ADRs)
│   │   ├── README.md                 # Architecture documentation hub
│   │   ├── UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md  # Primary hub
│   │   ├── UMIG - TOGAF Phase B - Business Architecture.md
│   │   ├── UMIG - TOGAF Phase C - Application Architecture.md
│   │   ├── UMIG - TOGAF Phase C - Data Architecture.md
│   │   ├── UMIG - TOGAF Phase D - Technical Architecture.md
│   │   ├── UMIG - TOGAF Phase D - Security Architecture.md
│   │   ├── UMIG - TOGAF Phases E-F - Migration and Governance Document.md
│   │   ├── adr/                      # Architectural Decision Records (74 ADRs)
│   │   │   ├── ADR-001-*.md through ADR-074-*.md
│   │   │   └── template.md           # ADR template
│   │   └── templates/                # Architecture templates and standards
│   ├── dataModel/                    # Database schema & ERD
│   │   ├── UMIG_Data_Model.md        # Pure schema specification
│   │   └── UMIG_DB_Best_Practices.md # Implementation patterns and best practices
│   ├── devJournal/                   # Sprint reviews & development notes
│   │   ├── README.md                 # Development journal index
│   │   ├── devJournalEntryTemplate.md
│   │   ├── sprintReviewTemplate.md
│   │   └── [dated entries]           # Chronological development history
│   ├── development/                  # Development guides and references
│   │   ├── authentication/           # Authentication documentation
│   │   ├── guides/                   # Development guides
│   │   │   ├── README.md             # Guides index
│   │   │   ├── error-handling-guide.md      # Error handling patterns
│   │   │   ├── performance-guide.md         # Performance optimization
│   │   │   └── uat-integration-guide.md     # UAT integration guide
│   │   └── references/               # Technical references
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
│   ├── scripts/                      # Organized development scripts (Sept 18, 2025 reorganization)
│   │   ├── generators/               # Individual data generators (001-101)
│   │   ├── lib/                      # Shared utilities (db.js, utils.js)
│   │   ├── infrastructure/           # Infrastructure management scripts
│   │   │   ├── README.md             # Infrastructure script documentation
│   │   │   └── setup-groovy-jdbc.js  # Groovy JDBC setup
│   │   ├── test-runners/             # Specialized test execution scripts
│   │   │   ├── README.md             # Test runner documentation
│   │   │   └── run-groovy-test.js    # Groovy test runner
│   │   ├── utilities/                # Development utility scripts
│   │   │   ├── README.md             # Utility script documentation
│   │   │   ├── groovy-with-jdbc.js   # Groovy JDBC utilities
│   │   │   └── setup-groovy-classpath.js # Groovy classpath setup
│   │   ├── start.js, stop.js, restart.js # Environment management
│   │   ├── umig_generate_fake_data.js # Main data generation script
│   │   ├── umig_csv_importer.js      # CSV import utility
│   │   └── validate-documentation.js # Documentation validation utility
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
│   ├── infrastructure/              # Infrastructure management (US-032)
│   │   ├── README.md                # Infrastructure documentation
│   │   ├── ScriptRunnerConnectionPoolSetup.md # Connection pool configuration
│   │   ├── backup/                  # Enterprise backup/restore scripts
│   │   │   ├── backup-all.sh         # Master backup orchestration
│   │   │   ├── backup-volumes.sh     # Podman volume backups
│   │   │   ├── backup-databases.sh   # PostgreSQL backups
│   │   │   ├── restore-all.sh        # Complete restoration
│   │   │   ├── restore-volumes.sh    # Volume restoration
│   │   │   ├── restore-databases.sh  # Database restoration
│   │   │   └── verify-backup.sh      # Backup integrity verification
│   │   └── upgrade/                 # Upgrade automation tools
│   │       └── upgrade-confluence.sh # Automated Confluence upgrade
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

# TD-012 Consolidated Test Infrastructure (Sprint 7 Phase 2 Complete - September 24, 2025)
# JavaScript Testing Suite (85%+ Recovery Achievement)
npm run test:js             # All JavaScript tests (Jest framework - 85%+ recovery)
npm run test:js:unit        # JavaScript unit tests (Jest optimized)
npm run test:js:integration # JavaScript integration tests (Jest jsdom)
npm run test:js:e2e         # JavaScript end-to-end tests (Playwright integration)
npm run test:js:infrastructure # Infrastructure validation tests (rollback compatible)
npm run test:js:security    # Security test suite (component validation)
npm run test:js:components  # Component unit tests (95%+ coverage)
npm run test:js:security:pentest # Penetration testing (21 attack vectors)

# Foundation Service Layer Testing (US-082-A COMPLETE)
npm run test:js:services    # Foundation service layer tests (196/196 passing)
npm run test:js:admin-gui   # Admin GUI service tests (36/36 passing)
npm run test:js:api-client  # API client tests (45/45 passing)
npm run test:js:auth        # Authentication service tests (20/20 passing)

# Groovy Testing Suite (43 Tests - 100% Success Rate, 35% Performance Maintained)
npm run test:groovy         # All Groovy tests (43/43 passing - self-contained)
npm run test:groovy:unit    # Groovy unit tests (static type checking)
npm run test:groovy:integration # Groovy integration tests (enhanced)
npm run test:groovy:performance # Groovy performance validation (35% improvement)

# Consolidated Test Commands (TD-012 Achievement)
npm run test:all:consolidated # Consolidated comprehensive test suite
npm run test:memory:optimized # Memory-optimized test execution (<90MB usage)
npm run test:infrastructure:validation # Infrastructure validation with rollback

# Cross-Technology Testing Commands
npm run test:all:comprehensive # Complete test suite (JS + Groovy)
npm run test:all:unit        # All unit tests (JS + Groovy)
npm run test:all:integration # All integration tests (JS + Groovy)
npm run test:all:quick       # Quick validation across technologies

# Legacy Commands (maintained for backward compatibility)
npm run test:integration     # Core integration tests
npm run test:unit           # Groovy unit tests (redirects to test:groovy)
npm run test:integration:auth # Authenticated integration tests
npm run test:uat            # UAT validation tests
npm run test:iterationview  # Enhanced IterationView tests
npm run test:email-enhanced # Enhanced email notification testing (US-039)
npm run test:step-data      # Step data architecture testing (US-056 prep)
npm run test:template-service # Template service with defensive patterns
npm run test:cross-platform # Cross-platform compatibility validation

# Email testing (Enhanced - MailHog Integration + Security)
npm run mailhog:test        # Test SMTP connectivity
npm run mailhog:check       # Check message count
npm run mailhog:clear       # Clear test inbox
npm run test:us039          # US-039 enhanced email notification system
npm run test:us067          # US-067 email security test coverage
npm run test:security:email # Email security test suite (25+ attack patterns)
npm run test:security       # Full security test suite including email
npm run test:service-layer   # US-056 service layer standardization testing
npm run test:dto-integration # Step data transfer object validation
npm run test:us082a          # US-082-A foundation service layer testing (239/239 passing)
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
- `/applications` - Application management
- `/labels` - Label management with color coding
- `/migrations` - Migration selector data
- `/stepViewApi` - Step view macro data
- `/plans` - Implementation plan management
- `/sequences` - Sequence management with ordering
- `/phases` - Phase management with control point validation

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

## Current Status

### Version 1.0.0 - UAT Release (October 7, 2025)

**Production Milestone**: First official release to UAT environment

**Sprint 7 Achievements (224% Completion)**:

- 130 of 58 committed story points delivered
- Technical debt fully resolved (8 categories, 43 points)
- Enterprise infrastructure foundation established
- Build process with 84% deployment size reduction

**Sprint 8 In Progress** (Security Architecture Enhancement):

- Enhanced security architecture with ADRs 67-70
- Configuration management system
- Advanced authentication patterns
- Production hardening features

### Quality Metrics

- **Test Success Rate**: 450+ tests passing (100%)
- **Security Rating**: 9.2/10 enterprise-grade
- **Performance**: <150ms API response times
- **Coverage**: 95%+ across all test categories

For detailed development history and sprint achievements, see [CHANGELOG.md](CHANGELOG.md).

### Step View System

The **Step View** is a standalone macro for embedding individual step interfaces in Confluence pages:

- **Specification**: `docs/roadmap/step-view.md`
- **Macro Implementation**: `src/groovy/umig/macros/v1/stepViewMacro.groovy`
- **Frontend Implementation**: `src/groovy/umig/web/js/step-view.js`
- **API Backend**: `src/groovy/umig/api/v2/stepViewApi.groovy`

**Key Features**:

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

### Iteration View System

The **Iteration View** is the primary runsheet interface for cutover events:

- **Specification**: `docs/roadmap/iteration-view.md`
- **Functional Mockup**: `mock/iteration-view.html`
- **Implementation**: `src/groovy/umig/macros/v1/iterationViewMacro.groovy`
- **Dynamic Data Pattern**: Iteration View macro loads migration data dynamically via REST API

**Key Capabilities**:

- Dynamic migration selector data loading via REST API
- Hierarchical filtering across all entity levels
- Real-time collaboration features with commenting system
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
8. **Authentication Context**: Dual authentication support (ADR-043)
9. **Endpoint Registration**: Mandatory ScriptRunner UI registration (ADR-044)
10. **PostgreSQL Patterns**: Production-ready connection pooling (ADR-047)
11. **URL Construction**: Centralized URL construction service (ADR-048)
12. **Service Layer Architecture**: Unified DTO with transformation services (ADR-049)

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

1. **`docs/architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md`**: Primary architecture hub (49 ADRs organized across TOGAF Phase documents)
2. **`docs/dataModel/README.md`**: Comprehensive database schema and ERD
3. **`docs/api/openapi.yaml`**: OpenAPI 3.0 specification
4. **`docs/adr/`**: Current Architecture Decision Records

### Development Context

- **`docs/devJournal/`**: Sprint reviews and progress tracking
- **`cline-docs/`**: AI assistant context and progress
- **`docs/roadmap/`**: Development roadmap and interface specifications

## API Testing

### Session-Based Authentication

UMIG APIs require session-based authentication for external testing. For complete setup instructions:

- **Documentation**: See `local-dev-setup/SESSION_AUTH_UTILITIES.md` for cross-platform session capture utilities
- **Quick Start**: Run `npm run auth:capture-session` to extract browser session for API testing
- **Compatibility**: Works with CURL, POSTMAN, and all HTTP clients

### Postman Collection

A comprehensive Postman collection is available for testing all API endpoints:

- **Collection**: `docs/api/postman/UMIG_API_V2_Collection.postman_collection.json`
- **Authentication**: Uses session-based auth with JSESSIONID (see SESSION_AUTH_UTILITIES.md)
- **Auto-generated**: Collection is generated from OpenAPI specification with session support

### Usage

1. Login to Confluence and capture session: `npm run auth:capture-session`
2. Import collection into Postman
3. Set collection variable: `jsessionid = YOUR_SESSION_ID`
4. Run requests organized by entity tags (Users, Teams, Plans)

## Contributing

### Development Workflow

1. **Environment Setup**: `cd local-dev-setup && npm install && npm start`
2. **Database Changes**: Create Liquibase changesets in `local-dev-setup/liquibase/changelogs/`
3. **Backend Development**: Add Groovy classes in `src/groovy/umig/`
4. **Frontend Development**: Create/modify JS files in `src/groovy/umig/web/js/`
5. **Testing**: Run unit tests and integration tests
6. **Documentation**: Update relevant documentation

### Architecture Guidelines

- **Always Start**: Review `docs/architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md` for architectural context
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
