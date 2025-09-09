# Admin GUI Entity Migration Test Suite

This test suite provides comprehensive coverage for the Admin GUI entity migration changes, specifically focusing on the integration of `iterationTypes` and `migrationTypes` entities with the EntityConfig system.

## Overview

The test suite validates:
- **EntityConfig integration**: Loading and configuration management
- **API endpoint resolution**: Proper routing for new entities
- **Proxy pattern functionality**: Fallback behavior and error handling
- **CRUD operations**: Complete lifecycle testing
- **UI interactions**: Form generation, validation, and user experience
- **Cross-browser compatibility**: Responsive design and accessibility

## Test Structure

### Unit Tests (`/unit/admin-gui/`)

#### `EntityConfig.test.js`
- **Purpose**: Tests EntityConfig module availability and entity retrieval
- **Coverage**:
  - Entity configuration completeness for iterationTypes and migrationTypes
  - Field validation and default value verification
  - Configuration structure integrity
  - Entity retrieval with proper error handling

#### `admin-gui-proxy.test.js`
- **Purpose**: Tests the proxy pattern and API endpoint resolution
- **Coverage**:
  - API endpoint configuration for new entities
  - Proxy pattern with EntityConfig available/unavailable
  - Fallback behavior and warning messages
  - Backward compatibility with existing endpoints

### Integration Tests (`/integration/admin-gui/`)

#### `entity-loading.integration.test.js`
- **Purpose**: Tests integration between AdminGUI, EntityConfig, and UI components
- **Coverage**:
  - Section navigation and loading performance
  - Table rendering with correct columns
  - Error handling for API failures
  - State management during navigation

#### `crud-operations.integration.test.js`
- **Purpose**: Tests CRUD operations through the Admin GUI interface
- **Coverage**:
  - Form generation from EntityConfig
  - Field validation (required, maxLength, type)
  - Create, Edit, Delete operations
  - Readonly field behavior (itt_code in edit mode)
  - Default value population
  - Server error handling

### End-to-End Tests (`/e2e/`)

#### `admin-gui-entity-migration.e2e.test.js`
- **Purpose**: Tests complete user workflows and user experience
- **Coverage**:
  - Complete lifecycle: Create → Edit → Delete
  - Form validation and error recovery
  - Keyboard navigation and accessibility
  - Responsive design across screen sizes
  - Performance testing
  - Cross-browser compatibility

## Test Configuration

### `admin-gui-entity-migration.config.js`
Provides centralized configuration including:
- **Test Data**: Valid and invalid data sets for both entities
- **Mock Configurations**: EntityConfig mocks and API handlers
- **Utilities**: Helper functions for common test operations
- **Environment Configuration**: Development and CI settings

## Key Test Scenarios

### 1. EntityConfig Integration
```javascript
// Validates EntityConfig is properly loaded and entities are accessible
test('should retrieve iterationTypes entity with complete configuration', () => {
  const iterationTypes = EntityConfig.getEntity('iterationTypes');
  expect(iterationTypes.name).toBe('Iteration Types');
  expect(iterationTypes.fields.length).toBeGreaterThan(0);
});
```

### 2. Proxy Pattern Fallback
```javascript
// Tests fallback behavior when EntityConfig is unavailable
test('should show fallback warning when EntityConfig is unavailable', () => {
  delete window.EntityConfig;
  const entities = AdminGUI.entities;
  expect(mockConsole.warn).toHaveBeenCalledWith('EntityConfig not available, using empty configuration');
});
```

### 3. Form Field Validation
```javascript
// Validates field behavior differences between create and edit modes
test('itt_code field should be readonly in EDIT mode', () => {
  const result = ModalManager.buildFormField(field, data, false); // Edit mode
  expect(result).toContain('disabled');
  expect(result).toContain('readonly-field');
});
```

### 4. Complete User Workflow
```javascript
// Tests full CRUD lifecycle with proper state management
test('should complete full lifecycle: Create → Edit → Delete', async ({ page }) => {
  // Create new item
  await page.fill('#itt_code', 'E2ETEST');
  await page.click('.modal .btn-primary');
  
  // Edit the item
  await page.click('.btn-edit');
  await page.fill('#itt_name', 'Updated Name');
  await page.click('.modal .btn-primary');
  
  // Delete the item
  await page.click('.btn-delete');
});
```

## Running the Tests

### Prerequisites
- UMIG development environment running
- Admin GUI accessible at `/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui`
- EntityConfig.js properly loaded

### Execute Tests

```bash
# Run all Admin GUI entity migration tests
npm test -- --testPathPattern="admin-gui.*entity.*migration"

# Run specific test categories
npm test -- local-dev-setup/__tests__/unit/admin-gui/
npm test -- local-dev-setup/__tests__/integration/admin-gui/
npm test -- local-dev-setup/__tests__/e2e/admin-gui-entity-migration.e2e.test.js

# Run with coverage
npm test -- --coverage --testPathPattern="admin-gui"
```

### CI/CD Integration

Tests are designed to run in CI environments with:
- Headless browser support
- Increased timeouts for slower environments
- Retry logic for flaky network conditions
- Mock API responses for consistent testing

## Test Data Management

### Iteration Types Test Data
```javascript
ITERATION_TYPES_TEST_DATA = {
  valid: {
    itt_code: 'TESTIT',
    itt_name: 'Test Iteration Type',
    itt_description: 'Test description',
    itt_color: '#FF5722',
    itt_active: true
  },
  defaults: {
    itt_color: '#6B73FF',
    itt_icon: 'play-circle',
    itt_display_order: 0
  }
}
```

### Migration Types Test Data
```javascript
MIGRATION_TYPES_TEST_DATA = {
  valid: {
    mtm_code: 'TESTMT',
    mtm_name: 'Test Migration Type',
    mtm_color: '#9C27B0',
    mtm_active: true
  },
  defaults: {
    mtm_color: '#6B73FF',
    mtm_icon: 'migration',
    mtm_display_order: 0
  }
}
```

## Mock API Responses

The test suite uses comprehensive API mocking to ensure:
- Consistent test data across runs
- Proper error condition testing
- No dependency on actual backend services
- Fast test execution

### Example Mock Handler
```javascript
const mockHandler = TestUtils.createMockApiHandler('iterationTypes', testData);
await page.route('**/iterationTypes', mockHandler);
```

## Error Testing

The suite includes extensive error testing:
- **Network failures**: API endpoints returning errors
- **Validation errors**: Invalid form data submission
- **Missing dependencies**: EntityConfig unavailable
- **Browser compatibility**: JavaScript error handling

## Performance Testing

Performance tests validate:
- Section loading times (< 3 seconds)
- Rapid navigation handling (< 30 seconds for 15 switches)
- Modal operations efficiency (< 10 seconds for 3 cycles)
- Memory management during extended use

## Accessibility Testing

Accessibility tests ensure:
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management in modals
- Screen reader compatibility
- Color contrast compliance

## Maintenance Guidelines

### Adding New Entity Tests
1. Extend `TEST_CONFIG` with new entity test data
2. Add entity configuration to `createMockEntityConfig()`
3. Create entity-specific test scenarios
4. Update integration and E2E tests

### Updating Field Configurations
1. Modify field definitions in `createMockEntityConfig()`
2. Update corresponding test data structures
3. Adjust validation test expectations
4. Verify form generation tests

### Handling Breaking Changes
1. Update mock configurations to match new EntityConfig structure
2. Adjust API endpoint expectations
3. Modify form field validation rules
4. Update E2E workflow expectations

## Troubleshooting

### Common Issues

1. **EntityConfig not loading**: Check file paths and loading order
2. **API endpoint mismatches**: Verify endpoint configurations match backend
3. **Form validation failures**: Ensure field configurations are up-to-date
4. **Modal timing issues**: Increase timeouts in slower environments

### Debug Mode

Enable debug logging:
```javascript
// Set environment variable
DEBUG=true npm test

// Or modify test configuration
const TEST_CONFIG = {
  debug: true,
  verbose: true
};
```

## Coverage Goals

- **Unit Tests**: > 95% code coverage for EntityConfig and proxy logic
- **Integration Tests**: > 90% coverage for CRUD operations and UI integration
- **E2E Tests**: > 85% coverage for user workflows and error scenarios
- **Overall**: > 90% combined coverage for Admin GUI entity migration features

This comprehensive test suite ensures the Admin GUI entity migration changes are robust, reliable, and provide an excellent user experience across all supported browsers and devices.