# Repository Integration Tests

Integration tests for repository layer with real PostgreSQL database connections.

## Responsibilities

- Test repository CRUD operations with real database
- Validate transaction management and rollback
- Test complex queries and join operations
- Verify constraint enforcement and error handling

## Structure

```
repositories/
└── [Repository integration test suites]
```

## Related

- See `../../unit/repository/` for repository unit tests
- See `../../../repository/` for repository implementations
