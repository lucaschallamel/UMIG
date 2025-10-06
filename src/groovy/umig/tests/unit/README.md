# Unit Tests (Root)

Root-level unit tests for utilities, services, and standalone components.

## Responsibilities

- Test individual components in isolation
- Provide comprehensive test coverage for business logic
- Validate error handling and edge cases
- Execute fast, self-contained test suites

## Structure

```
unit/
├── api/            # API unit tests
├── migration/      # Migration-specific unit tests
├── mock/           # Mock implementations for testing
├── repository/     # Repository unit tests
├── security/       # Security unit tests
├── service/        # Service layer unit tests
└── [Root-level unit tests for utilities and standalone components]
```

## Test Files

Includes comprehensive test coverage for:

- Configuration services and system settings
- Email services and template rendering
- Audit logging and field utilities
- Control repository and API operations
- Database version management

## Related

- See subdirectories for component-specific unit tests
- See `../integration/` for integration test suites
