# JavaScript Testing Framework

Purpose: Jest-based testing for UMIG JavaScript components and APIs

## Test Categories

- **Unit Tests**: Component and utility unit tests
- **Integration Tests**: API and database integration tests
- **E2E Tests**: End-to-end user workflow tests
- **Component Tests**: UI component behavior tests
- **Security Tests**: XSS, CSRF, and penetration tests

## Commands

```bash
npm run test:js:unit         # Unit tests
npm run test:js:integration  # Integration tests
npm run test:js:e2e          # End-to-end tests
npm run test:js:components   # Component tests
npm run test:js:security     # Security tests
```

## Structure

- **unit/** - Component and utility unit tests
- **integration/** - API and database integration tests
- **e2e/** - End-to-end user workflow tests
- **security/** - Security testing (XSS, CSRF, etc.)
- **performance/** - Performance benchmarks
- **components/** - Component behavior tests
- **fixtures/** - Test data and mock fixtures
- \***\*fixes**/\*\* - Test infrastructure fixes

## Configuration Files

- **jest.config.js** - Base Jest configuration
- **jest.config.integration.js** - Integration test settings (jsdom)
- **jest.config.components.js** - Component test configuration
- **jest.config.security.js** - Security test settings
- **setup.js** - Global test environment setup

## Writing Tests

1. Place tests in appropriate subdirectory
2. Use naming convention: `ComponentName.test.js`
3. Follow Jest patterns and assertions
4. Include setup and teardown as needed
5. Mock external dependencies

## Dependencies

- Jest for test framework
- jsdom for DOM testing in integration tests
- Mock utilities for API and database testing
- Coverage tools for test coverage reporting
