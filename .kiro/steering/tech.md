# UMIG Technology Stack

## Core Technologies

- **Platform**: Atlassian Confluence 9.2.7 + ScriptRunner 9.21.0
- **Backend**: Groovy 3.0.15 with static type checking
- **Frontend**: Vanilla JavaScript + Atlassian AUI components
- **Database**: PostgreSQL 14 with Liquibase migrations
- **Development**: Node.js orchestrated Podman containers

## Architecture Patterns

- **API Pattern**: CustomEndpointDelegate with versioned endpoints (v2)
- **Data Access**: Repository pattern with DatabaseUtil.withSql
- **Frontend**: SPA + REST pattern with modular JavaScript
- **Data Model**: Canonical vs Instance pattern (master templates + execution records)

## Development Environment

### Prerequisites
- Node.js v18+
- Podman and podman-compose
- PostgreSQL client tools

### Common Commands

#### Environment Management
```bash
# From local-dev-setup directory
npm start                    # Start complete development stack
npm stop                     # Stop all services
npm run restart              # Restart with data preservation
npm run restart:erase        # Restart and erase all data
npm run restart:erase:umig   # Restart and erase only UMIG database
```

#### Data Operations
```bash
npm run generate-data        # Generate synthetic data
npm run generate-data:erase  # Generate data with reset
npm run import-csv -- --file path/to/file.csv  # Import CSV data
```

#### Testing
```bash
npm test                     # Run Node.js tests
# From project root:
./src/groovy/umig/tests/run-integration-tests.sh  # Integration tests
./src/groovy/umig/tests/run-unit-tests.sh         # Unit tests
```

#### Database Management
```bash
# From local-dev-setup directory
liquibase --defaults-file=liquibase/liquibase.properties update
```

## Service URLs (Development)
- **Confluence**: http://localhost:8090
- **PostgreSQL**: localhost:5432
- **MailHog**: http://localhost:8025

## Code Standards

### Groovy Backend
- Use `@BaseScript CustomEndpointDelegate` for all APIs
- Explicit type casting required: `UUID.fromString(param as String)`
- Repository pattern mandatory: `DatabaseUtil.withSql { sql -> ... }`
- Error mapping: SQL state 23503→400, 23505→409

### JavaScript Frontend
- Vanilla JS only - no external frameworks
- Modular IIFE patterns for organization
- Atlassian AUI components for styling
- Promise-based async patterns

### Database
- All schema changes via Liquibase only
- snake_case naming convention
- Audit fields: created_by, created_at, updated_by, updated_at
- Master/instance table pattern with suffixes

## Key Configuration

### ScriptRunner Setup
- Database pool: `umig_db_pool`
- Script roots: `/var/atlassian/application-data/confluence/scripts`
- Package scanning: `umig.api.v2,umig.api.v2.web`

### Required Environment Variables
```bash
POSTGRES_DB=umig_db
UMIG_DB_NAME=umig_app_db
UMIG_DB_USER=umig_app_user
CONFLUENCE_LICENSE_KEY=<your-license>
```