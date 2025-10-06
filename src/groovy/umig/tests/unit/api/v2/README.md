# V2 API Unit Tests

Unit tests for version 2 REST API endpoints with comprehensive endpoint coverage.

## Responsibilities

- Test all V2 API endpoints in isolation
- Mock DatabaseUtil and repository layer
- Validate type casting and parameter handling (ADR-031)
- Test authorization and security controls

## Structure

```
v2/
└── [Unit tests for individual V2 API endpoints]
```

## Related

- See `../../../api/v2/` for API implementations
- See `../../../integration/api/` for API integration tests
