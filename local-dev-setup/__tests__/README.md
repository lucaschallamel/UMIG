# JavaScript Testing Framework

Jest-based testing for UMIG JavaScript components with comprehensive unit, integration, E2E, and security test coverage.

## Structure

```
__tests__/
├── unit/                    # Component and utility unit tests
│   ├── components/         # UI component tests
│   ├── security/           # Security-focused unit tests
│   ├── teams/              # Team entity tests
│   ├── users/              # User entity tests
│   └── stepview/           # Step view tests
├── integration/            # API and database integration tests
│   └── admin-gui/          # Admin GUI entity migration tests
├── e2e/                    # End-to-end user workflow tests
├── security/               # Security testing (XSS, CSRF, penetration)
├── performance/            # Performance benchmarks
├── fixtures/               # Test data and mock fixtures
├── __mocks__/              # Mock implementations for testing
├── __fixes__/              # Test infrastructure fixes and utilities
├── mocks/                  # Additional mock providers
└── migrations/             # Database migration tests
```

## Contents

- **Configuration Files**: Jest configs (base, integration, components, security), setup files
- **Test Categories**: 64+ JavaScript tests covering unit, integration, E2E, components, security
- **Mock System**: Comprehensive mocking infrastructure for components, database, DOM
- **Infrastructure Fixes**: Memory management, database state, compliance validation

---

_Last Updated: 2025-10-01_
