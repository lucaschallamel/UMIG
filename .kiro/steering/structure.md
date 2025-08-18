# UMIG Project Structure

## Root Directory Organization

```
UMIG/
├── src/groovy/umig/          # Main application source code
├── local-dev-setup/          # Development environment orchestration
├── docs/                     # Comprehensive project documentation
├── mock/                     # UI/UX prototypes and mockups
└── .kiro/                    # Kiro AI assistant configuration
```

## Source Code Structure (`src/groovy/umig/`)

```
src/groovy/umig/
├── api/v2/                   # REST API endpoints (13 APIs)
│   ├── ControlsApi.groovy
│   ├── InstructionsApi.groovy
│   ├── PlansApi.groovy
│   ├── SequencesApi.groovy
│   ├── StepsApi.groovy
│   ├── TeamMembersApi.groovy
│   ├── TeamsApi.groovy
│   ├── UsersApi.groovy
│   ├── migrationApi.groovy
│   ├── stepViewApi.groovy
│   └── web/WebApi.groovy
├── macros/v1/                # Confluence UI macros
│   ├── adminGuiMacro.groovy
│   ├── iterationViewMacro.groovy
│   └── stepViewMacro.groovy
├── repository/               # Data access layer (19 repositories)
│   ├── ControlRepository.groovy
│   ├── InstructionRepository.groovy
│   ├── StepRepository.groovy
│   ├── TeamRepository.groovy
│   └── [15 other repositories]
├── tests/                    # Testing framework
│   ├── apis/                 # API-specific tests
│   ├── integration/          # Integration tests
│   ├── unit/                 # Unit tests
│   └── validation/           # Quality validators
├── utils/                    # Shared utilities
│   └── DatabaseUtil.groovy
└── web/                      # Frontend assets
    ├── js/                   # JavaScript modules
    │   ├── admin-gui/        # Modular admin components
    │   ├── admin-gui.js
    │   ├── iteration-view.js
    │   └── step-view.js
    └── css/                  # Stylesheets
```

## Development Environment (`local-dev-setup/`)

```
local-dev-setup/
├── scripts/                  # Node.js orchestration scripts
│   ├── generators/           # Data generation (001-101 scripts)
│   ├── start.js, stop.js     # Environment management
│   └── umig_generate_fake_data.js
├── __tests__/                # Jest test suite
├── liquibase/                # Database migrations
│   └── changelogs/           # SQL migration files
├── infrastructure/           # Enterprise operations
│   ├── backup/               # Backup/restore scripts
│   └── upgrade/              # Platform upgrade tools
├── podman-compose.yml        # Container orchestration
└── package.json              # Node.js dependencies
```

## Documentation Structure (`docs/`)

```
docs/
├── solution-architecture.md  # Consolidated architecture (33 ADRs)
├── api/                      # API documentation
│   ├── openapi.yaml          # OpenAPI 3.0 specification
│   └── postman/              # Postman collections
├── adr/                      # Architecture Decision Records
├── dataModel/                # Database schema documentation
├── devJournal/               # Development history
├── roadmap/                  # Sprint planning and UI specs
└── testing/                  # Quality assurance procedures
```

## Key Architectural Patterns

### File Naming Conventions

- **APIs**: `EntityApi.groovy` (e.g., `TeamsApi.groovy`)
- **Repositories**: `EntityRepository.groovy` (e.g., `TeamRepository.groovy`)
- **Macros**: `entityMacro.groovy` (e.g., `adminGuiMacro.groovy`)
- **Tests**: `EntityTest.groovy` or `entityIntegrationTest.groovy`

### Package Organization

- **Versioned APIs**: `/api/v2/` for current REST endpoints
- **Versioned Macros**: `/macros/v1/` for UI components
- **Shared Utilities**: `/utils/` for cross-cutting concerns
- **Frontend Assets**: `/web/js/` and `/web/css/` for client-side code

### Database Schema Organization

- **Master Tables**: `entity_master_xxx` (templates/playbooks)
- **Instance Tables**: `entity_instance_xxx` (execution records)
- **Association Tables**: `entity1_entity2` (many-to-many relationships)
- **Lookup Tables**: Simple plural names (e.g., `teams`, `users`)

## Development Workflow Directories

### Active Development

- Work primarily in `src/groovy/umig/` for backend changes
- Use `local-dev-setup/` for environment and data management
- Reference `docs/api/` for API specifications

### Testing and Quality

- Unit tests in `src/groovy/umig/tests/unit/`
- Integration tests in `src/groovy/umig/tests/integration/`
- Node.js tests in `local-dev-setup/__tests__/`

### Documentation Updates

- Architecture changes in `docs/solution-architecture.md`
- API changes in `docs/api/openapi.yaml`
- Development notes in `docs/devJournal/`
