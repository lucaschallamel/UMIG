# Infrastructure Diagnostics

**Purpose**: Core infrastructure validation and system health monitoring

## Files

```
diagnostics/
├── README.md                   # This file
└── testDatabaseConnection.groovy # Database connectivity validation
```

## Test Coverage

### Database Connectivity
- **PostgreSQL connection** - Verify database accessibility and health
- **Connection parameters** - Validate credentials and configuration
- **Query execution** - Test basic query capabilities
- **Performance** - Measure connection establishment time

## Usage

```bash
# Test database connectivity
groovy src/groovy/umig/tests/diagnostics/testDatabaseConnection.groovy

# Via NPM (recommended)
npm run test:diagnostics
```

### Pre-Test Validation
- Development stack running (`npm start`)
- PostgreSQL container healthy (`podman ps`)
- `.env` file configured with database credentials

## Validation Areas

- **Database accessibility** - PostgreSQL server reachability
- **Credential validation** - Authentication and authorization
- **Connection performance** - Establishment time <1s
- **Query execution** - Basic SELECT operations

## Expected Output

```
✅ Database connection successful
✅ PostgreSQL version: 14.x
✅ Connection time: <1s
✅ Query execution: OK
```

## Integration

Used for:
- Pre-development environment checks
- Deployment readiness validation
- Infrastructure troubleshooting
- Continuous health monitoring

---

**Updated**: September 26, 2025 | **Version**: 1.0
