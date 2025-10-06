# Repository Unit Tests

Unit tests for repository layer with mocked DatabaseUtil and SQL connections.

## Responsibilities

- Test repository CRUD operations with mocked SQL
- Validate query construction and parameter binding
- Test error handling and SQL state mapping
- Verify type casting and ADR-031 compliance

## Structure

```
repository/
└── [Repository unit tests with mocked database]
```

## Test Pattern

Uses embedded MockSql pattern (TD-001) for self-contained testing without external dependencies.

## Related

- See `../../integration/repositories/` for integration tests
- See `../../../repository/` for repository implementations
