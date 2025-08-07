# UMIG Project Structure

## Root Organization

```
UMIG/
├── src/groovy/umig/          # Main application source (Groovy/ScriptRunner)
├── local-dev-setup/          # Node.js development environment
├── docs/                     # Comprehensive documentation
├── mock/                     # UI/UX prototypes and mockups
├── .kiro/                    # Kiro AI assistant configuration
├── .clinerules/              # Cline AI assistant rules
└── .windsurf/                # Windsurf AI assistant rules
```

## Source Code Structure (`src/groovy/umig/`)

All backend code follows the consolidated UMIG namespace:

```
src/groovy/umig/
├── api/                      # REST API endpoints
│   └── v2/                   # Version 2 APIs (current)
│       ├── UsersApi.groovy
│       ├── TeamsApi.groovy
│       ├── EnvironmentsApi.groovy
│       ├── LabelsApi.groovy
│       ├── migrationApi.groovy
│       └── stepViewApi.groovy
├── macros/                   # ScriptRunner UI macros
│   └── v1/                   # Version 1 macros
│       └── iterationViewMacro.groovy
├── repository/               # Data access layer (Repository pattern)
│   ├── UserRepository.groovy
│   ├── TeamRepository.groovy
│   ├── EnvironmentRepository.groovy
│   ├── LabelRepository.groovy
│   ├── StepRepository.groovy
│   └── MigrationRepository.groovy
├── utils/                    # Shared utilities
│   └── DatabaseUtil.groovy  # Database connection management
├── web/                      # Frontend assets
│   ├── js/                   # JavaScript controllers
│   │   ├── admin-gui.js
│   │   ├── iteration-view.js
│   │   └── step-view.js
│   └── css/                  # Stylesheets
│       ├── iteration-view.css
│       └── umig-ip-macro.css
└── tests/                    # Testing suite
    ├── apis/                 # API unit tests
    └── integration/          # Integration tests
```

## Development Environment (`local-dev-setup/`)

Node.js orchestrated containerized development stack:

```
local-dev-setup/
├── scripts/                  # Environment management
│   ├── generators/           # Data generation (001-101)
│   ├── lib/                  # Shared utilities (db.js, utils.js)
│   ├── start.js              # Environment startup
│   ├── stop.js               # Environment shutdown
│   └── umig_generate_fake_data.js
├── __tests__/                # Jest test suite
├── liquibase/                # Database migrations
│   └── changelogs/           # SQL migration files
├── data/                     # Sample data files
├── postgres/                 # Database initialization
├── confluence/               # Container configuration
└── package.json              # npm scripts and dependencies
```

## Documentation Structure (`docs/`)

Comprehensive project documentation:

```
docs/
├── adr/                      # Architecture Decision Records
│   ├── ADR-027-n-tiers-model.md
│   ├── ADR-028-data-import-strategy.md
│   └── archive/              # Historical ADRs (26 archived)
├── api/                      # API documentation
│   ├── openapi.yaml          # OpenAPI 3.0 specification
│   ├── redoc-static.html     # API documentation viewer
│   └── postman/              # Postman collection
├── dataModel/                # Database schema documentation
├── devJournal/               # Development progress tracking
├── ui-ux/                    # Interface specifications
└── solution-architecture.md  # Consolidated architecture guide
```

## File Naming Conventions

### Groovy Files

- **APIs**: `{Entity}Api.groovy` (e.g., `UsersApi.groovy`)
- **Repositories**: `{Entity}Repository.groovy` (e.g., `UserRepository.groovy`)
- **Macros**: `{purpose}Macro.groovy` (e.g., `iterationViewMacro.groovy`)
- **Tests**: `{target}Test.groovy` or `{target}IntegrationTest.groovy`

### JavaScript Files

- **Controllers**: `{entity}-{purpose}.js` (e.g., `admin-gui.js`, `iteration-view.js`)
- **Utilities**: `{purpose}.js` (e.g., `utils.js`)

### Database Files

- **Migrations**: `{number}_{description}.sql` (e.g., `001_unified_baseline.sql`)
- **Tables**: `{entity}_{suffix}_{abbreviation}` (e.g., `users_usr`, `plans_master_plm`)

## Package Organization Rules

### Backend (Groovy)

- All code under `umig` namespace to avoid collisions
- Version-specific subdirectories for APIs and macros (`v1/`, `v2/`)
- Repository pattern for all database access
- Utilities in shared `utils/` package

### Frontend (JavaScript)

- Single JS file per major UI component
- CSS files co-located with related JS
- No external dependencies - pure vanilla JavaScript
- Atlassian AUI components for consistency

### Testing

- Unit tests co-located with source (`__tests__/` for Node.js)
- Integration tests in dedicated directories
- Specific SQL query mocks required (no generic matchers)

## Key Architectural Boundaries

### Separation of Concerns

- **Macros**: UI rendering only, no business logic
- **APIs**: Business logic and data orchestration
- **Repositories**: Database access exclusively
- **Frontend**: User interaction and display logic

### Data Flow

1. **UI** → AJAX calls → **API endpoints**
2. **API** → Repository methods → **Database**
3. **Database** ← Liquibase migrations ← **Development scripts**

### Version Management

- APIs versioned in subdirectories (`v1/`, `v2/`)
- Database schema managed through Liquibase changesets
- Frontend assets versioned alongside backend components
