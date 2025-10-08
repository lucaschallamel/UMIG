# API Examples

This directory contains enhanced examples and test data for the UMIG API V2.

## Available Resources

### Enhanced Examples

**File**: `enhanced-examples.yaml`
**Purpose**: Comprehensive OpenAPI examples with UMIG domain data

- 50+ practical examples covering all major endpoints
- Real-world scenarios (migrations, iterations, teams, steps)
- Error response examples with troubleshooting guidance
- Integration patterns and workflow examples
- UAT test scenarios and validation rules

## Example Categories

### 1. Migrations API Examples

- Production cutover iterations
- Pilot phase iterations
- Simple and complex migration scenarios
- Multi-system enterprise migrations

### 2. Teams API Examples

- Technical implementation teams
- Business stakeholder teams
- Team assignment and management patterns

### 3. Steps API Examples

- Bulk status updates for milestone completion
- Rollback scenarios for failed deployments
- Step-by-step workflow execution

### 4. Filtering Examples

- Hierarchical filtering (migration → iteration → plan → sequence → phase → step)
- Team-based filtering for workload management
- Date range filtering for reporting and analytics

### 5. Error Response Examples

- Input validation errors
- Foreign key constraint violations
- Duplicate resource errors
- Authentication and authorization errors

## Integration with OpenAPI

These examples are referenced in the main OpenAPI specification (`/docs/api/openapi.yaml`) and provide:

- Request/response format validation
- Type safety verification
- Real-world usage patterns
- Error handling scenarios

## Usage

### For Developers

```yaml
# Reference examples in your code
- See request/response formats
- Understand data validation rules
- Learn error handling patterns
```

### For QA Teams

```bash
# Use examples for test case generation
- Copy request payloads for testing
- Verify response formats
- Validate error scenarios
```

### For Integration Partners

```javascript
// Examples show best practices
- Proper authentication headers
- Request body structure
- Expected response handling
```

## Validation

Examples are validated using the automated validation script:

```bash
node /local-dev-setup/scripts/validate-documentation.js
```

## Related Documentation

- **OpenAPI Specification**: `/docs/api/openapi.yaml`
- **API Endpoints**: `/docs/api/*.md` files
- **Error Handling Guide**: `/docs/development/guides/error-handling-guide.md`
- **Performance Guide**: `/docs/development/guides/performance-guide.md`

**Last Updated**: October 8, 2025
**Sprint**: Sprint 5 (US-030)
**Status**: UAT Ready
