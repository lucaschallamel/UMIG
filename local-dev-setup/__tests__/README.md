# UMIG JavaScript Testing Framework

**Framework**: Industry standard `__tests__/` directory structure  
**Test Runner**: Jest with Node.js  
**Last Updated**: September 8, 2025 (Testing infrastructure modernization)  
**Coverage**: Cross-platform testing with unified JavaScript/Groovy approach

## Overview

This directory contains the complete JavaScript testing framework for UMIG, organized using industry-standard patterns for improved discoverability, maintainability, and CI/CD integration. The framework supports unit tests, integration tests, end-to-end tests, and specialized testing categories.

## Directory Structure

```
__tests__/
├── e2e/                          # End-to-end user workflow tests
├── email/                        # Email system testing
│   ├── generators/               # Email template generators
│   └── templates/               # Email template validation
├── fixtures/                     # Test data and mock fixtures
│   ├── api/                     # API test fixtures
│   ├── csv/                     # CSV import test data
│   ├── email/                   # Email test fixtures
│   ├── generated/               # Generated test data
│   └── sql/                     # Database test fixtures
├── generators/                   # Data generation utilities
│   └── [11 generator files]     # Various data generators
├── integration/                  # Integration testing by domain
│   └── api/                     # API integration tests
│       ├── iterations/          # Iteration-related tests
│       ├── steps/              # Step-related integration tests
│       └── stepview/           # StepView integration tests
├── migrations/                   # Database migration tests
├── regression/                   # Regression test suite
│   ├── api/                     # API regression tests
│   └── reports/                 # Regression test reports
├── reports/                      # Test execution reports
├── uat/                         # User Acceptance Tests
│   └── csv/                     # CSV-related UAT scenarios
├── unit/                        # Unit tests by component
│   └── security/                # Security unit tests
└── [2 root test files]          # CSV importer tests
```

## Testing Categories

### 📊 Unit Tests (`unit/`)

- **Purpose**: Component-level testing in isolation
- **Scope**: Individual functions, classes, and modules
- **Examples**: Security validations, utility functions, component logic
- **Pattern**: `*.unit.test.js`

### 🔗 Integration Tests (`integration/`)

- **Purpose**: Cross-component interaction validation
- **Scope**: API endpoints, database operations, service integrations
- **Organization**: Grouped by domain (steps, iterations, stepview)
- **Pattern**: `*.integration.test.js`

### 🎭 End-to-End Tests (`e2e/`)

- **Purpose**: Complete user workflow validation
- **Scope**: Full application scenarios from UI to database
- **Examples**: Migration workflows, admin operations, user journeys
- **Pattern**: `*.e2e.test.js`

### 👥 User Acceptance Tests (`uat/`)

- **Purpose**: Business requirement validation
- **Scope**: User-facing functionality and business rules
- **Examples**: CSV import workflows, data validation scenarios
- **Pattern**: `*.uat.test.js`

### 🔄 Regression Tests (`regression/`)

- **Purpose**: Prevent reintroduction of previous bugs
- **Scope**: Previously failed scenarios, critical path protection
- **Organization**: API and report-based regression suites
- **Pattern**: `*.regression.test.js`

## Test Data Management

### 📁 Fixtures (`fixtures/`)

Central repository for test data organized by domain:

- **API Fixtures**: Mock request/response data for API testing
- **CSV Fixtures**: Sample import files for data import testing
- **Email Fixtures**: Template and content samples for email testing
- **SQL Fixtures**: Database state snapshots and query test data
- **Generated Fixtures**: Programmatically created test data

### 🔧 Generators (`generators/`)

Utilities for creating dynamic test data:

- **Data Generators**: Create realistic test data for various entities
- **CSV Generators**: Build CSV files for import testing
- **Email Generators**: Generate email templates and content
- **State Generators**: Create application state for testing scenarios

## Framework Integration

### Package.json Integration

The testing framework integrates with npm scripts:

```bash
npm test                    # Run all JavaScript tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # End-to-end tests only
npm run test:regression    # Regression suite
npm run test:uat           # User acceptance tests
```

### Jest Configuration

- **Test Discovery**: Automatic test discovery in `__tests__/` directory
- **Module Resolution**: Configured for UMIG project structure
- **Coverage Reporting**: Istanbul integration for coverage metrics
- **Parallel Execution**: Optimized for multi-core test execution

### Cross-Platform Compatibility

- **Windows/macOS/Linux**: Full cross-platform support
- **Container Support**: Docker/Podman compatible execution
- **CI/CD Integration**: GitHub Actions ready configuration

## Quality Standards

### Test Coverage Requirements

- **Unit Tests**: >90% coverage for critical business logic
- **Integration Tests**: >80% coverage for API endpoints
- **E2E Tests**: Complete coverage of critical user workflows
- **Regression Tests**: 100% coverage of previous bug scenarios

### Naming Conventions

- **Test Files**: `{component}.{type}.test.js`
- **Test Suites**: Descriptive suite names matching component purpose
- **Test Cases**: Clear, behavior-driven test descriptions
- **Mock Data**: Realistic data representing production scenarios

### Performance Targets

- **Unit Tests**: <100ms per test
- **Integration Tests**: <5s per test suite
- **E2E Tests**: <30s per complete workflow
- **Total Suite**: <10 minutes for complete test execution

## Testing Infrastructure Evolution

### Migration History (September 2025)

- **Source Migration**: 13 JavaScript test files moved from mixed Groovy directory
- **Structure Modernization**: Implemented industry standard `__tests__/` pattern
- **Hierarchical Organization**: Domain-based categorization for improved navigation
- **Tool Integration**: Enhanced Jest compatibility and npm script integration

### Framework Benefits

1. **Improved Discoverability**: Clear test categorization and location
2. **Enhanced Maintainability**: Logical organization by test type and domain
3. **Better CI/CD Integration**: Industry standard patterns enable better tooling
4. **Cross-Team Collaboration**: Familiar structure for JavaScript developers

## Integration with Groovy Testing

### Complementary Approach

- **JavaScript Tests**: Frontend logic, API integration, user workflows
- **Groovy Tests**: Backend logic, database operations, server-side validation
- **Shared Fixtures**: Common test data used across both frameworks
- **Consistent Patterns**: Aligned testing approaches where possible

### Coordination Points

- **API Testing**: Both frameworks test APIs from different perspectives
- **Database Testing**: Groovy handles database operations, JavaScript validates results
- **Integration Points**: Cross-framework integration testing for complete coverage
- **Performance Testing**: Combined approach for comprehensive performance validation

## Usage Guidelines

### For Developers

#### Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

#### Writing New Tests

1. **Choose Appropriate Directory**: Select based on test scope and purpose
2. **Follow Naming Conventions**: Use consistent file and test naming
3. **Use Existing Fixtures**: Leverage existing test data where possible
4. **Maintain Performance**: Ensure tests meet performance targets
5. **Document Complex Tests**: Include clear descriptions and rationale

### For CI/CD Integration

#### Pipeline Configuration

- **Test Execution Order**: Unit → Integration → E2E → Regression
- **Parallel Execution**: Unit and integration tests can run in parallel
- **Failure Handling**: Fast-fail on critical test failures
- **Coverage Reporting**: Generate and publish coverage reports

#### Environment Requirements

- **Node.js**: Version 16+ required for Jest compatibility
- **Database**: PostgreSQL test instance for integration tests
- **Network**: External service access for E2E tests
- **Resources**: Adequate memory and CPU for parallel execution

## Maintenance and Evolution

### Regular Maintenance Tasks

- **Fixture Updates**: Keep test data current with schema changes
- **Coverage Review**: Monitor and improve test coverage metrics
- **Performance Monitoring**: Ensure tests continue to meet performance targets
- **Tool Updates**: Keep Jest and related tools up to date

### Future Enhancements

- **Visual Testing**: Screenshot comparison for UI regression testing
- **API Contract Testing**: Schema validation for API integration tests
- **Performance Testing**: Load and stress testing integration
- **Test Data Management**: Automated test data lifecycle management

## Related Documentation

### Project Testing Strategy

- **[../../../src/groovy/umig/tests/README.md](../../../src/groovy/umig/tests/README.md)** - Groovy testing framework
- **[../../../docs/testing/](../../../docs/testing/)** - Testing documentation and guidelines
- **[../scripts/generators/README.md](../scripts/generators/README.md)** - Data generation utilities

### Development Resources

- **[../README.md](../README.md)** - Local development setup
- **[../package.json](../package.json)** - npm scripts and dependencies
- **[../../../CLAUDE.md](../../../CLAUDE.md)** - Project development patterns and standards

---

**Framework Status**: Production Ready  
**Last Updated**: September 8, 2025 (Infrastructure modernization)  
**Test Files**: 30+ files across all categories  
**Framework Maturity**: Modern, industry-standard organization with comprehensive coverage
