# UMIG Technology Stack

## Core Technologies

- **Runtime Platform**: Atlassian Confluence + ScriptRunner for Confluence
- **Backend Language**: Groovy (ScriptRunner-compatible)
- **Database**: PostgreSQL 14+ with Liquibase migrations
- **Frontend**: Vanilla JavaScript with Atlassian AUI styling
- **Development Environment**: Node.js orchestrated Podman containers

## Architecture Patterns

- **Pure ScriptRunner Application**: No external frameworks or complex build toolchains
- **Repository Pattern**: Centralized data access with connection pooling via `DatabaseUtil.withSql`
- **SPA + REST Pattern**: Single-page applications with RESTful backend APIs
- **Canonical vs Instance Pattern**: Reusable master templates with time-bound execution instances

## API Standards

- **Endpoint Pattern**: Must use `CustomEndpointDelegate` exclusively
- **Security**: All endpoints require `groups: ["confluence-users"]`
- **Error Handling**: Specific SQL state mappings (23503→400, 23505→409)
- **Response Standards**: DELETE returns 204, PUT/DELETE are idempotent

## Database Requirements

- **Schema Management**: Liquibase only - manual schema changes forbidden
- **Connection Pattern**: Use ScriptRunner's Database Resource Pool (`umig_db_pool`)
- **Naming Convention**: Strict `snake_case` for all database objects
- **Type Safety**: Explicit casting required (`as String`, `as UUID`)

## Frontend Requirements

- **Zero External Dependencies**: Pure vanilla JavaScript only
- **UI Framework**: Atlassian AUI components for consistency
- **Real-time Updates**: AJAX polling pattern (no WebSockets)
- **Custom Confirmation**: Promise-based dialogs to prevent UI flickering

## Development Commands

### Environment Management

```bash
cd local-dev-setup
npm install
npm start                    # Start complete development stack
npm stop                     # Stop all services
npm run restart              # Restart with data preservation
npm run restart:erase        # Restart and erase all data
```

### Data Operations

```bash
npm run generate-data        # Generate synthetic data
npm run generate-data:erase  # Generate with database reset
npm run import-csv           # Import CSV data
npm test                     # Run Jest tests
```

### Database Operations

```bash
liquibase --defaults-file=liquibase/liquibase.properties update
```

### Testing

```bash
# Node.js tests
npm test

# Groovy integration tests (from project root)
./src/groovy/umig/tests/run-integration-tests.sh
```

## Build System

- **No Build Process**: Direct file deployment to ScriptRunner
- **Asset Management**: JS/CSS files served directly from `src/groovy/umig/web/`
- **Version Control**: Git-based with conventional commits
- **Quality Assurance**: MegaLinter for code quality, Jest for Node.js testing

## Service URLs (Development)

- **Confluence**: http://localhost:8090
- **PostgreSQL**: localhost:5432
- **MailHog**: http://localhost:8025
- **API Base**: `/rest/scriptrunner/latest/custom/`
