# UMIG Testing Framework

**Purpose**: Enterprise testing framework with self-contained architecture achieving 100% test success (43/43 Groovy, 345/345 JavaScript)

## Quick Start

```bash
# Run all tests
npm run test:all

# By technology
npm run test:groovy:all          # 43/43 Groovy tests
npm run test:js:all              # 345/345 JavaScript tests

# By type
npm run test:groovy:unit         # Unit tests with Spock
npm run test:groovy:integration  # Live database tests
npm run test:js:security         # 28 security scenarios
```

## Directory Structure

```
tests/
├── unit/                  # Spock unit tests (30 files, mocked dependencies)
│   ├── api/v2/           # REST API unit tests (12 files)
│   ├── repository/       # Repository pattern tests (9 files)
│   └── security/         # Security validation (4 files + README)
├── integration/          # Live database tests (78 files + validation standards)
│   ├── api/             # API integration tests (6 files)
│   └── repositories/    # Repository integration (1 file)
├── apis/                 # API-specific suites (8 files + development guide)
├── validation/           # Quality gates (6 files, <500ms API targets)
├── performance/          # Performance benchmarks (8 files)
├── security/             # Security testing (5 files)
├── upgrade/              # Confluence upgrade validation (12 files + README)
├── environment/          # Environment validation (6 files + README)
├── diagnostics/          # Infrastructure health (2 files + README)
├── utilities/            # Testing utilities (2 files + README)
├── e2e/                  # End-to-end tests (1 file)
├── uat/                  # User acceptance testing
└── archived-shell-scripts/  # Deprecated (9 files + README)
```

## Framework Standards

- **Groovy 3.0.15** - Required for ScriptRunner 9.21.0 compatibility
- **Spock 2.3-groovy-3.0** - MANDATORY framework version (never groovy-4.0)
- **Technology-prefixed commands** - Clear separation (test:groovy, test:js)
- **Self-contained architecture** - 35% compilation improvement, zero external dependencies
- **BaseIntegrationTest (US-037)** - 95%+ compliance target for integration tests

## Performance Targets

- **API Response**: <500ms for standard endpoints
- **Complex Queries**: <2s for 3-table joins
- **Test Coverage**: 95%+ unit, 80%+ integration
- **Security Tests**: 28 scenarios + 21 penetration tests

## Key Quality Standards

### MANDATORY: Groovy 3.0.15 Compatibility

```groovy
@Grab('org.spockframework:spock-core:2.3-groovy-3.0')  // ✅ Required
@Grab('org.postgresql:postgresql:42.7.3')               // ✅ Database
@Grab('io.rest-assured:rest-assured:5.3.2')            // ✅ API testing
```

**NEVER use**:

- `spock-core:2.3-groovy-4.0` (incompatible)
- `javax.ws.rs:javax.ws.rs-api:2.1.1` (causes Grape hang)
- Database hostname `postgres` (use `localhost`)

### Validation Standards

**Essential Reference**: [`integration/INTEGRATION_TEST_VALIDATION_STANDARDS.md`](./integration/INTEGRATION_TEST_VALIDATION_STANDARDS.md)

Framework compliance requirements:

- **US-037 BaseIntegrationTest**: 95%+ compliance target
- **Performance**: <500ms API, <2s complex queries, <60s large data
- **Coverage**: 95%+ comprehensive test coverage
- **US-034 Data Import**: Reference implementation example

## Running Tests

### Prerequisites

1. **Development stack running**: `npm start` from `local-dev-setup/`
2. **Groovy 3.0.15 installed**: Via SDKMAN (`sdk install groovy 3.0.15`)
3. **Credentials configured**: `.env` file at `local-dev-setup/.env`

### Test Execution

```bash
# Complete test suite
npm run test:all

# Technology-specific
npm run test:groovy:all        # All Groovy tests
npm run test:groovy:unit       # Unit tests only
npm run test:groovy:integration # Integration tests only

npm run test:js:all            # All JavaScript tests
npm run test:js:components     # Component tests (95%+ coverage)
npm run test:js:security       # Security scenarios

# User story validation
npm run test:us022             # US-022 specific tests
npm run test:us028             # US-028 validation
npm run test:us067             # Email security tests
```

### Quality Gates

```bash
# Integrated quality checks
cd local-dev-setup
./scripts/quality-check/phase-b-test-execution.sh

# Individual validators
groovy src/groovy/umig/tests/validation/DatabaseQualityValidator.groovy
groovy src/groovy/umig/tests/validation/US024QualityGateValidator.groovy
```

## Troubleshooting

### Common Issues

**Spock version error**: Use `spock-core:2.3-groovy-3.0` (never groovy-4.0)
**Database connection failed**: Use `localhost` not `postgres` hostname
**Grape dependency hang**: Avoid `javax.ws.rs:javax.ws.rs-api:2.1.1`
**Missing .env file**: Verify `local-dev-setup/.env` exists with credentials

### Dependency Management (Grape)

PostgreSQL JDBC driver cached at `~/.groovy/grapes/`. If missing:

```groovy
// Create grab-postgres-jdbc.groovy
@Grab('org.postgresql:postgresql:42.7.3')
import org.postgresql.Driver
println "✅ PostgreSQL JDBC driver downloaded"
```

Run: `groovy grab-postgres-jdbc.groovy`

## ADR Compliance

- **ADR-026**: Specific SQL query validation (no generic matchers)
- **ADR-031**: Explicit type casting (`UUID.fromString(id as String)`)
- **ADR-030**: Hierarchical filtering patterns
- **ADR-036**: Pure Groovy implementation (no external REST clients)

## Adding New Tests

### Unit Tests

1. Use Spock 2.3-groovy-3.0 framework
2. Mock dependencies with specific SQL validation (ADR-026)
3. Place in appropriate `unit/` subdirectory
4. Add to NPM test runners

### Integration Tests

1. Follow US-037 BaseIntegrationTest pattern
2. Use `localhost` for database connections
3. Implement proper cleanup (reverse order)
4. Reference INTEGRATION_TEST_VALIDATION_STANDARDS.md

---

**Version**: 6.0 | **Updated**: September 26, 2025 (Sprint 8)
**Test Success**: 43/43 Groovy (100%), 345/345 JavaScript (100%)
**Key Achievement**: Self-contained architecture, 35% performance improvement
