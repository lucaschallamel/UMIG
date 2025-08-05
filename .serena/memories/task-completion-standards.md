# UMIG Task Completion Standards

## When a Development Task is Completed

### 1. Code Quality Validation
- **Repository Pattern**: Ensure all database access uses repository classes
- **Type Safety**: Verify explicit casting for all query parameters (ADR-031)
- **Error Handling**: Implement proper SQL state mappings and error propagation
- **Security**: Verify proper groups configuration for endpoints

### 2. Testing Requirements
```bash
# Run Node.js tests
npm test

# Run Groovy integration tests
./src/groovy/umig/tests/run-integration-tests.sh

# Verify API functionality with Postman
npm run generate:postman:enhanced
```

### 3. Documentation Updates
- Update OpenAPI specification (`docs/api/openapi.yaml`)
- Add API documentation if new endpoints created
- Update solution-architecture.md if architectural decisions made
- Document any new patterns or deviations

### 4. Database Validation
- Verify Liquibase migrations run cleanly
- Test with fresh data generation: `npm run generate-data:erase`
- Confirm no SQL injection vulnerabilities
- Validate foreign key relationships

### 5. Integration Testing
- Test hierarchical filtering patterns work correctly
- Verify API responses match expected format
- Test error conditions and edge cases
- Validate team assignment and security constraints

### 6. Performance Validation
- Confirm queries use appropriate indexes
- Test with realistic data volumes
- Verify no N+1 query problems
- Monitor response times for complex operations

## Definition of Done
- [ ] Code follows UMIG patterns (Repository, Type Safety, Error Handling)
- [ ] All tests pass (Node.js and Groovy)
- [ ] API documented in OpenAPI spec
- [ ] Integration tested with clean data
- [ ] Security review completed
- [ ] Performance validated
- [ ] Documentation updated