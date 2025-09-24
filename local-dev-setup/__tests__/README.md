# JavaScript Testing Framework

## Overview

Jest-based testing framework for UMIG JavaScript components, entities, and integration tests. Contains test files, configuration, and utilities for comprehensive front-end testing.

## Test Categories

### JavaScript Tests

- **Unit Tests**: Component and utility unit tests
- **Integration Tests**: API and database integration tests
- **E2E Tests**: End-to-end user workflow tests
- **Component Tests**: UI component behavior tests
- **Security Tests**: XSS, CSRF, and penetration tests

### Running Tests

```bash
# JavaScript test commands
npm run test:js:unit         # Unit tests
npm run test:js:integration  # Integration tests
npm run test:js:e2e          # End-to-end tests
npm run test:js:components   # Component tests
npm run test:js:security     # Security tests
```

## Directory Structure

```
__tests__/
├── README.md                  # This file
├── setup.js                  # Global test setup
├── jest.config.js            # Base Jest configuration files
├── __fixes__/                # Test infrastructure fixes
├── unit/                     # Unit tests for components and utilities
├── integration/              # Integration tests for API and database
├── e2e/                      # End-to-end user workflow tests
├── security/                 # Security testing (XSS, CSRF, etc.)
├── performance/              # Performance benchmarks
├── components/               # Component behavior tests
└── fixtures/                 # Test data and mock fixtures
```

## Configuration Files

- **jest.config.js**: Base Jest configuration
- **jest.config.integration.js**: Integration test settings (uses jsdom)
- **jest.config.components.js**: Component test configuration
- **jest.config.security.js**: Security test settings
- **setup.js**: Global test environment setup

## Writing New Tests

1. Place tests in appropriate subdirectory based on test type
2. Follow naming convention: `ComponentName.test.js`
3. Use Jest testing patterns and assertions
4. Include setup and teardown as needed
5. Mock external dependencies appropriately

## Dependencies

- Jest for test framework
- jsdom for DOM testing in integration tests
- Mock utilities for API and database testing
- Coverage tools for test coverage reporting
