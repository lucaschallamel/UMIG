# Test Utilities

**Purpose**: Infrastructure utilities supporting UMIG testing framework

## Files

```
utilities/
├── README.md              # This file
└── grab-postgres-jdbc.groovy # PostgreSQL JDBC driver download utility
```

## Usage

### JDBC Driver Setup

Download PostgreSQL JDBC driver via Grape:

```bash
cd src/groovy/umig/tests/utilities
groovy grab-postgres-jdbc.groovy
```

**Output**: `✅ PostgreSQL JDBC driver downloaded via Grape.`

**Driver Location**: `~/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar`

### Common Use Cases

- **Test environment setup** - Initialize testing infrastructure
- **Dependency resolution** - Download required testing libraries
- **Database connectivity** - Configure PostgreSQL JDBC driver for integration tests
- **Development preparation** - Prepare test environment before execution

## Integration

Used by:
- Integration test suites requiring database connectivity
- NPM test runners for environment validation
- Quality gate validators needing JDBC access

---

**Updated**: September 26, 2025 | **Version**: 1.0
