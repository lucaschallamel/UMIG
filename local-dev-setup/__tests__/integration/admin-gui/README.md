# Admin GUI Entity Migration Test Suite

Purpose: Comprehensive testing for Admin GUI entity migration with EntityConfig integration

## Test Coverage

- **EntityConfig integration**: Loading and configuration management
- **API endpoint resolution**: Proper routing for new entities
- **Proxy pattern functionality**: Fallback behavior and error handling
- **CRUD operations**: Complete lifecycle testing
- **UI interactions**: Form generation, validation, and user experience

## Structure

### Unit Tests (unit/admin-gui/)

- **EntityConfig.test.js** - Entity configuration completeness
- **admin-gui-proxy.test.js** - Proxy pattern and API endpoint resolution

### Integration Tests (integration/admin-gui/)

- **entity-loading.integration.test.js** - AdminGUI, EntityConfig, and UI components
- **crud-operations.integration.test.js** - CRUD operations through Admin GUI

### End-to-End Tests (e2e/)

- **admin-gui-entity-migration.e2e.test.js** - Complete user workflows

## Running Tests

```bash
# All Admin GUI entity migration tests
npm test -- --testPathPattern="admin-gui.*entity.*migration"

# Specific test categories
npm test -- local-dev-setup/__tests__/unit/admin-gui/
npm test -- local-dev-setup/__tests__/integration/admin-gui/
npm test -- local-dev-setup/__tests__/e2e/admin-gui-entity-migration.e2e.test.js

# With coverage
npm test -- --coverage --testPathPattern="admin-gui"
```

## Prerequisites

- UMIG development environment running
- Admin GUI accessible at Confluence page
- EntityConfig.js properly loaded

## Test Data

Comprehensive test data for iterationTypes and migrationTypes entities with valid configurations, defaults, and mock API responses for consistent testing.

## Key Scenarios

- EntityConfig integration validation
- Proxy pattern fallback behavior
- Form field validation in create/edit modes
- Complete user workflow testing (Create → Edit → Delete)

## Coverage Goals

- Unit Tests: > 95% code coverage
- Integration Tests: > 90% CRUD and UI coverage
- E2E Tests: > 85% user workflow coverage
- Overall: > 90% combined coverage
