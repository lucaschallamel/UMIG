# UMIG Development Commands

## Environment Management (from local-dev-setup/)
```bash
# Start development environment
npm install && npm start

# Stop services
npm stop

# Complete reset (erase all data)
npm run restart:erase

# Generate fake test data
npm run generate-data:erase
```

## Service URLs
- **Confluence**: http://localhost:8090
- **PostgreSQL**: localhost:5432 
- **MailHog** (email testing): http://localhost:8025

## Testing Commands
```bash
# Node.js tests (data utilities, integration tests)
npm test

# Groovy integration tests
./src/groovy/umig/tests/run-integration-tests.sh
```

## API Development Workflow
```bash
# Generate Postman collection from OpenAPI spec
npm run generate:postman

# Enhanced Postman collection with test data
npm run generate:postman:enhanced
```

## Database Management
- **Migrations**: Managed by Liquibase in `local-dev-setup/liquibase/`
- **Schema changes**: Add new changelogs, never modify existing ones
- **Data generation**: NodeJS scripts in `local-dev-setup/scripts/generators/`

## File Structure Navigation
- **APIs**: `src/groovy/umig/api/v2/`
- **Repositories**: `src/groovy/umig/repository/`
- **Frontend**: `src/groovy/umig/web/js/admin-gui/`
- **Tests**: `src/groovy/umig/tests/`
- **Documentation**: `docs/` (solution-architecture.md is primary reference)

## Key Reference Patterns
- **API Template**: `StepsApi.groovy`, `TeamsApi.groovy`, `LabelsApi.groovy`
- **Repository Template**: `StepRepository.groovy`, `TeamRepository.groovy`
- **Database Schema**: `local-dev-setup/liquibase/changelogs/001_unified_baseline.sql`