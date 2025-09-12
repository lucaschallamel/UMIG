# Entity Test Specification Template

**Version**: 1.0  
**Based on**: Teams entity testing success (A grade - 94/100)  
**Target Coverage**: 95% functional, 85% integration, 88% accessibility, 85% cross-browser, 92% performance  

## Template Overview

This specification template replicates the successful testing patterns from the Teams entity to ensure consistent high-quality testing across all UMIG entities.

### Testing Achievements to Replicate

- **95% functional coverage** with comprehensive test suite
- **8.8/10 security rating** with 28 security scenarios  
- **88% accessibility coverage** (WCAG 2.1 AA)
- **85% integration coverage** with real API testing
- **85% cross-browser coverage**
- **92% performance coverage** with regression tracking

## Entity Test File Structure Template

For each entity, create the following test file structure in `local-dev-setup/__tests__/`:

```
{entity}/
├── {entity}.unit.test.js              # Core functionality tests
├── {entity}.integration.test.js       # API integration tests  
├── {entity}.security.test.js          # Security scenarios (target: 8.8/10)
├── {entity}.performance.test.js       # Performance & regression tests
├── {entity}.accessibility.test.js     # WCAG 2.1 AA compliance
├── {entity}.edge-cases.test.js        # Boundary conditions & error handling
├── {entity}.cross-browser.test.js     # Browser compatibility
└── builders/
    └── {Entity}Builder.js             # Test data builder pattern
```

## Test Coverage Targets by Category

### 1. Functional Coverage (Target: 95%)

**Core Test Categories:**
- CRUD operations (Create, Read, Update, Delete)
- Validation logic (business rules, constraints)
- State management and transitions
- Data transformation and formatting
- Error handling and recovery
- Edge cases and boundary conditions

**Test Structure Pattern:**
```javascript
describe('{Entity} Functional Tests', () => {
    let {entity}Builder;
    let apiClient;
    
    beforeEach(() => {
        {entity}Builder = new {Entity}Builder();
        apiClient = new ApiTestClient();
    });
    
    afterEach(async () => {
        await apiClient.cleanup();
    });
    
    // Test categories here...
});
```

### 2. Security Coverage (Target: 8.8/10, 28+ scenarios)

**Security Test Categories:**
- Authentication bypass attempts
- Authorization privilege escalation
- SQL injection protection
- XSS prevention
- CSRF token validation
- Input sanitization
- Rate limiting enforcement
- Data exposure prevention
- Session management security
- API parameter tampering

**Security Test Pattern:**
```javascript
describe('{Entity} Security Tests', () => {
    const securityTester = new SecurityTester();
    
    test('prevents SQL injection in search parameters', async () => {
        const maliciousInput = "'; DROP TABLE {table}; --";
        const result = await securityTester.testSqlInjection(
            '{entity}Search', 
            { query: maliciousInput }
        );
        expect(result.isVulnerable).toBe(false);
        expect(result.sanitizedInput).not.toContain('DROP TABLE');
    });
    
    // Additional security tests...
});
```

### 3. Performance Coverage (Target: 92%)

**Performance Test Categories:**
- Response time benchmarks
- Memory usage monitoring
- Database query optimization
- Concurrent user simulation
- Load testing scenarios
- Regression tracking
- Resource utilization
- Caching effectiveness

**Performance Test Pattern:**
```javascript
describe('{Entity} Performance Tests', () => {
    const performanceTracker = new PerformanceRegressionTracker();
    
    test('API response time under load', async () => {
        const benchmark = await performanceTracker.measureApiResponse(
            '{entity}List',
            { concurrency: 10, duration: 30000 }
        );
        
        expect(benchmark.averageResponseTime).toBeLessThan(500);
        expect(benchmark.p95ResponseTime).toBeLessThan(1000);
        
        await performanceTracker.recordBenchmark('{entity}', benchmark);
    });
});
```

### 4. Accessibility Coverage (Target: 88% WCAG 2.1 AA)

**Accessibility Test Categories:**
- Keyboard navigation
- Screen reader compatibility
- Color contrast validation
- Focus management
- ARIA label correctness
- Form accessibility
- Error message accessibility
- Semantic HTML structure

**Accessibility Test Pattern:**
```javascript
describe('{Entity} Accessibility Tests', () => {
    const accessibilityTester = new AccessibilityTester();
    
    test('keyboard navigation works correctly', async () => {
        await accessibilityTester.loadComponent('{entity}Component');
        const keyboardTest = await accessibilityTester.testKeyboardNavigation();
        
        expect(keyboardTest.canNavigateToAllElements).toBe(true);
        expect(keyboardTest.trapsFocusInModals).toBe(true);
        expect(keyboardTest.wcagLevel).toBe('AA');
    });
});
```

### 5. Integration Coverage (Target: 85%)

**Integration Test Categories:**
- Real API endpoint testing
- Database integration
- External service integration
- Inter-entity relationships
- Data consistency validation
- Transaction handling
- Error propagation
- State synchronization

**Integration Test Pattern:**
```javascript
describe('{Entity} Integration Tests', () => {
    let testDatabase;
    
    beforeAll(async () => {
        testDatabase = await TestDatabaseManager.createCleanInstance();
    });
    
    afterAll(async () => {
        await TestDatabaseManager.cleanup(testDatabase);
    });
    
    test('creates entity with proper database constraints', async () => {
        const {entity}Data = {entity}Builder.withValidData().build();
        
        const response = await apiClient.post('/{entity}s', {entity}Data);
        expect(response.status).toBe(201);
        
        const dbRecord = await testDatabase.findById(response.data.id);
        expect(dbRecord).toMatchObject({entity}Data);
    });
});
```

## Entity-Specific Test Builder Templates

### Builder Pattern Template

```javascript
class {Entity}Builder {
    constructor() {
        this.data = this.getDefaultData();
        this.relationships = {};
    }
    
    getDefaultData() {
        return {
            // Entity-specific default fields
        };
    }
    
    // Fluent builder methods
    withValidData() {
        this.data = { ...this.data, ...this.getValidTestData() };
        return this;
    }
    
    withInvalidData() {
        this.data = { ...this.data, ...this.getInvalidTestData() };
        return this;
    }
    
    withRelationship(relationshipName, relatedEntity) {
        this.relationships[relationshipName] = relatedEntity;
        return this;
    }
    
    build() {
        return {
            ...this.data,
            ...this.relationships
        };
    }
    
    // Entity-specific builder methods
    // (See individual entity specifications below)
}
```

## Entity-Specific Adaptations

### 1. Users Entity

**Unique Test Considerations:**
- Authentication mechanisms
- Password security
- Session management
- Role-based access control
- Multi-factor authentication
- Account lockout policies

**Specialized Builder Methods:**
```javascript
withRole(role) { /* role assignment */ }
withAuthenticationMethod(method) { /* auth method */ }
withExpiredSession() { /* session expiry */ }
withLockedAccount() { /* account lockout */ }
withMfaEnabled() { /* multi-factor auth */ }
```

### 2. Environments Entity

**Unique Test Considerations:**
- Configuration validation
- Deployment target verification
- Environment isolation
- Resource allocation
- Network connectivity
- Security policies

**Specialized Builder Methods:**
```javascript
withConfiguration(config) { /* env config */ }
withDeploymentTarget(target) { /* deployment */ }
withResourceLimits(limits) { /* resources */ }
withSecurityPolicy(policy) { /* security */ }
withNetworkConfig(network) { /* networking */ }
```

### 3. Applications Entity

**Unique Test Considerations:**
- Dependency management
- Version compatibility
- Service discovery
- Health monitoring
- Scaling policies
- Integration points

**Specialized Builder Methods:**
```javascript
withDependencies(deps) { /* dependencies */ }
withVersion(version) { /* versioning */ }
withHealthCheck(check) { /* health monitoring */ }
withScalingPolicy(policy) { /* auto-scaling */ }
withIntegrations(integrations) { /* service integration */ }
```

### 4. Labels Entity

**Unique Test Considerations:**
- Categorization logic
- Search optimization
- Bulk operations
- Hierarchical relationships
- Tag management
- Performance with large datasets

**Specialized Builder Methods:**
```javascript
withCategory(category) { /* categorization */ }
withHierarchy(parent, children) { /* hierarchy */ }
withBulkLabels(count) { /* bulk operations */ }
withSearchIndex() { /* search optimization */ }
withColor(color) { /* visual organization */ }
```

### 5. Migration Types Entity

**Unique Test Considerations:**
- Workflow state validation
- Transition rules
- Approval processes
- Rollback procedures
- Audit trail
- Template management

**Specialized Builder Methods:**
```javascript
withWorkflowStates(states) { /* workflow */ }
withTransitionRules(rules) { /* transitions */ }
withApprovalProcess(process) { /* approvals */ }
withRollbackStrategy(strategy) { /* rollback */ }
withTemplate(template) { /* templates */ }
```

### 6. Iteration Types Entity

**Unique Test Considerations:**
- Template inheritance
- Scheduling constraints
- Resource allocation
- Timeline validation
- Dependency ordering
- Execution patterns

**Specialized Builder Methods:**
```javascript
withTemplate(template) { /* template base */ }
withSchedule(schedule) { /* timing constraints */ }
withResourceRequirements(resources) { /* resource needs */ }
withDependencyOrder(order) { /* execution order */ }
withExecutionPattern(pattern) { /* execution type */ }
```

## Test Infrastructure Integration

### 1. Existing Test Framework Integration

```javascript
// Leverage existing test utilities
import { TestDatabaseManager } from '../infrastructure/TestDatabaseManager';
import { ApiTestClient } from '../infrastructure/ApiTestClient';
import { SecurityTester } from '../infrastructure/SecurityTester';
import { PerformanceRegressionTracker } from '../infrastructure/PerformanceRegressionTracker';
import { AccessibilityTester } from '../infrastructure/AccessibilityTester';
```

### 2. Test Data Management

```javascript
// Clean test data setup and teardown
class EntityTestManager {
    static async setupTestData(entityType) {
        // Create clean test database state
        // Setup required relationships
        // Initialize test builders
    }
    
    static async cleanupTestData(entityType) {
        // Remove test data
        // Reset database state
        // Clear caches
    }
}
```

### 3. Parallel Test Execution

```javascript
// Jest configuration for parallel execution
module.exports = {
    testEnvironment: 'node',
    maxWorkers: 4,
    testTimeout: 30000,
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testMatch: [
        '**/__tests__/**/*.test.js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js'
    ],
    coverageThreshold: {
        global: {
            branches: 85,
            functions: 90,
            lines: 95,
            statements: 95
        }
    }
};
```

## Quality Gates and Success Metrics

### Automated Quality Checks

```javascript
// Quality gate validation
class TestQualityGate {
    static validateCoverage(entityName, testResults) {
        const requirements = {
            functional: 95,
            integration: 85,
            accessibility: 88,
            crossBrowser: 85,
            performance: 92,
            security: 8.8
        };
        
        return this.checkRequirements(testResults, requirements);
    }
    
    static generateReport(entityName, results) {
        // Generate comprehensive test report
        // Compare against Teams entity baseline
        // Provide improvement recommendations
    }
}
```

### Continuous Integration Integration

```bash
# Add to package.json scripts
"test:entity:{entity}": "jest --testPathPattern='{entity}' --coverage",
"test:entity:{entity}:watch": "jest --testPathPattern='{entity}' --watch",
"test:quality:gate": "node scripts/validate-test-quality.js"
```

## Implementation Checklist

For each entity, ensure:

- [ ] All 7 test files created with appropriate structure
- [ ] Entity-specific Builder class implemented
- [ ] 95%+ functional test coverage achieved
- [ ] 28+ security test scenarios implemented
- [ ] Performance regression tracking configured
- [ ] WCAG 2.1 AA accessibility tests passing
- [ ] Cross-browser compatibility validated
- [ ] Integration tests with real API endpoints
- [ ] Quality gates passing
- [ ] CI/CD integration configured

## Success Validation

To validate successful implementation:

1. **Run comprehensive test suite**: `npm run test:entity:{entity}`
2. **Check coverage reports**: Ensure all targets met
3. **Validate quality gates**: All metrics above thresholds
4. **Performance baseline**: Establish and track benchmarks
5. **Security assessment**: Achieve 8.8/10+ rating
6. **Accessibility audit**: Pass WCAG 2.1 AA requirements

This template ensures consistent, high-quality testing across all UMIG entities while allowing for entity-specific adaptations and requirements.

## Critical Test Infrastructure Requirements

**MANDATORY INFRASTRUCTURE PATTERNS** - These issues prevented ANY test execution during Teams migration (0% → 78-80% success rate):

### ⚠️ CRITICAL: Test Execution Prerequisites

Before implementing any entity tests, ensure ALL infrastructure patterns are in place:

#### 1. Variable Scoping Pattern (MANDATORY)
```javascript
// CORRECT - declare at module level (outside describe blocks)
let performanceResults;
let container;
let orchestrator;
let mockComponents;
let testData;

// WRONG - inside describe blocks causes scoping failures
describe('Entity Tests', () => {
    let performanceResults; // CAUSES TEST FAILURES
});
```

#### 2. Node.js Polyfills Setup (MANDATORY)
```javascript
// jest.setup.unit.js - REQUIRED for TextEncoder/TextDecoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Without this: "ReferenceError: TextEncoder is not defined"
```

#### 3. JSDOM Container Pattern (MANDATORY)
```javascript
// REQUIRED defensive container creation
beforeEach(() => {
    container = document.getElementById('test-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);
    }
    container.innerHTML = ''; // Clean state each test
});

// Without this: "Cannot read properties of null (container)"
```

#### 4. Complete Service Mocking (MANDATORY)
```javascript
// REQUIRED - full UMIGServices mock setup
beforeEach(() => {
    window.UMIGServices = {
        notificationService: { 
            show: jest.fn().mockResolvedValue(true),
            hide: jest.fn(),
            showError: jest.fn(),
            showSuccess: jest.fn()
        },
        featureFlagService: { 
            isEnabled: jest.fn().mockReturnValue(true),
            getVariant: jest.fn().mockReturnValue('default')
        },
        userService: { 
            getCurrentUser: jest.fn().mockReturnValue({ 
                id: 'test-user',
                name: 'Test User' 
            })
        }
    };
});

// Without this: "UMIGServices is not defined" crashes
```

#### 5. Mock Component Integration (MANDATORY)
```javascript
// REQUIRED - complete mock components with ALL properties
const createMockComponent = (type, additionalProps = {}) => ({
    id: `mock-${type}`,
    type: type,
    migrationMode: true, // CRITICAL - prevents migration check failures
    data: [], // CRITICAL - prevents data access errors
    isInitialized: false,
    isMounted: false,
    initialize: jest.fn().mockResolvedValue(true),
    mount: jest.fn().mockImplementation(function() { this.isMounted = true; }),
    render: jest.fn(),
    update: jest.fn(),
    unmount: jest.fn().mockImplementation(function() { this.isMounted = false; }),
    destroy: jest.fn(),
    emit: jest.fn(), // CRITICAL for event system
    on: jest.fn(),
    off: jest.fn(),
    ...additionalProps
});

// Without migrationMode/data: Components fail initialization
```

#### 6. Jest Configuration (MANDATORY)
```javascript
// jest.config.unit.js - REQUIRED testMatch patterns
module.exports = {
    testMatch: [
        '**/__tests__/**/*.(test|spec).js',
        '**/*.(test|spec).js',
        '**/__tests__/entities/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/components/**/*.(test|spec).js', // CRITICAL
        '**/__tests__/security/**/*.(test|spec).js' // CRITICAL
    ],
    testEnvironment: 'jsdom', // CRITICAL for DOM access
    setupFilesAfterEnv: ['<rootDir>/jest.setup.unit.js'] // CRITICAL for polyfills
};

// Without entities/** pattern: Jest cannot find entity tests
```

#### 7. Event Handling Pattern (MANDATORY)
```javascript
// REQUIRED - manual event emission for reliable testing
test('component event handling', async () => {
    const component = createMockComponent('entity');
    orchestrator.registerComponent(component);
    
    // Manual emission - avoids async timing issues
    component.emit('dataLoaded', { 
        entityType: 'test',
        data: testData 
    });
    
    // Immediate verification - no waiting for events
    expect(orchestrator.handleEvent).toHaveBeenCalledWith(
        'dataLoaded', 
        expect.objectContaining({ data: testData })
    );
});

// Async events often hang tests - use manual emission
```

### Infrastructure Failure Modes That Prevent Test Execution

1. **Variable Scoping Issues**: Tests crash accessing undefined shared variables
2. **Missing Node.js Polyfills**: TextEncoder errors prevent test startup completely  
3. **DOM Initialization Failures**: Null containers crash component mounting
4. **Incomplete Service Mocks**: Undefined UMIGServices crashes test setup
5. **Mock Component Problems**: Missing properties cause initialization failures
6. **Test Discovery Issues**: Jest cannot find test files in entities/ directories
7. **Event Timing Problems**: Tests hang indefinitely waiting for async events

### Pre-Implementation Validation Checklist

**Before writing ANY entity tests, verify ALL patterns are implemented:**

- [ ] ✅ All shared test variables declared at module level (not in describe blocks)
- [ ] ✅ TextEncoder/TextDecoder polyfills added to jest.setup.unit.js
- [ ] ✅ Defensive container creation pattern in all beforeEach hooks
- [ ] ✅ Complete UMIGServices mock with all required service methods
- [ ] ✅ Mock components include migrationMode, data, and emit properties
- [ ] ✅ Jest testMatch patterns include entities/** directories
- [ ] ✅ Event handling uses manual emission pattern (not async waiting)
- [ ] ✅ JSDOM environment configured in Jest configuration

### Results Achieved with Infrastructure Fixes
- **Before**: 0% test execution (complete infrastructure failure)
- **After**: 78-80% test pass rate (infrastructure functional)
- **Critical**: Infrastructure patterns are prerequisites to ANY testing

**WARNING**: Without these infrastructure patterns, tests will not execute at all. Apply ALL patterns before attempting entity test implementation.