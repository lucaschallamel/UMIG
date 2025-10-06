# UMIG Integration Tests

**Purpose**: Enterprise integration testing with BaseIntegrationTest (US-037) compliance and comprehensive validation standards

## Directory Structure

```
integration/
├── README.md                              # This file
├── INTEGRATION_TEST_VALIDATION_STANDARDS.md # 200+ line validation framework
├── api/                                   # API integration tests (6 files)
│   ├── InstructionsApiDeleteIntegrationTest.groovy
│   ├── SequencesApiIntegrationTest.groovy
│   ├── PhasesApiIntegrationTest.groovy
│   └── [Other API tests]
├── repositories/                          # Repository tests (1 file)
│   └── RepositoryIntegrationTest.groovy
├── AuthenticationHelper.groovy            # Secure credential management
├── AuthenticationTest.groovy              # Authentication validation
├── CrossApiIntegrationTest.groovy         # Cross-API workflows
├── MigrationsApiBulkOperationsTest.groovy # Bulk operations
├── ApplicationsApiIntegrationTest.groovy  # Application management
├── EnvironmentsApiIntegrationTest.groovy  # Environment configuration
├── TeamsApiIntegrationTest.groovy         # Team management
└── [US-034 Data Import Tests]             # Import service validation
    ├── ImportServiceIntegrationTest.groovy
    ├── ImportOrchestrationIntegrationTest.groovy
    ├── ImportProgressTrackingIntegrationTest.groovy
    ├── ImportRollbackValidationTest.groovy
    └── ImportFlowEndToEndTest.groovy
```

## Framework Standards

### BaseIntegrationTest (US-037)

- **95%+ compliance target** - Universal integration test infrastructure
- **Standardized lifecycle** - Setup, execution, teardown patterns
- **Authentication integration** - UserService with ADR-042 fallback
- **Database management** - Transaction handling, connection pooling
- **Error handling** - SQL state mapping (23503→400, 23505→409)

### Performance Standards

- **API responses**: <500ms for standard endpoints
- **Complex queries**: <2s for 3-table joins
- **Large data operations**: <60s for bulk processing
- **US-034 achievement**: 51ms (10x better than target)

## Quick Start

### Prerequisites

```bash
# 1. Start development stack
cd local-dev-setup
npm start

# 2. Verify credentials (.env file)
cat local-dev-setup/.env | grep POSTMAN_AUTH

# 3. Validate authentication
groovy src/groovy/umig/tests/integration/AuthenticationTest.groovy
```

Expected output: `✅ All authentication tests passed`

### Running Tests

```bash
# All integration tests
npm run test:groovy:integration

# Specific test files
groovy src/groovy/umig/tests/integration/CrossApiIntegrationTest.groovy
groovy src/groovy/umig/tests/integration/MigrationsApiBulkOperationsTest.groovy

# US-034 data import tests
groovy src/groovy/umig/tests/integration/ImportServiceIntegrationTest.groovy
```

## Validation Standards

**Essential Reference**: [`INTEGRATION_TEST_VALIDATION_STANDARDS.md`](./INTEGRATION_TEST_VALIDATION_STANDARDS.md)

Comprehensive 200+ line framework covering:

- **Framework compliance** - US-037 BaseIntegrationTest requirements (95%+ target)
- **Performance standards** - Production-scale validation criteria
- **Coverage requirements** - 95%+ comprehensive test coverage
- **Quality metrics** - Success criteria and validation frameworks
- **Reference implementation** - US-034 Data Import as gold standard

## Authentication Implementation

### Secure Credential Management

**AuthenticationHelper.groovy** - Zero hard-coded credentials:

```groovy
import AuthenticationHelper

// Configure authenticated connection
def connection = createAuthenticatedConnection(url, "POST", "application/json")

// Helper handles credentials from:
// 1. .env file (local-dev-setup/.env)
// 2. Environment variables (POSTMAN_AUTH_USERNAME/PASSWORD)
// 3. System properties (test.auth.username/password)
```

**Security Standards Met**:

- ✅ No hard-coded credentials
- ✅ Environment variable support
- ✅ Credential protection in logs
- ✅ HTTP Basic Auth (Base64 encoding)
- ✅ Fallback mechanisms

## Test Data Management

### Hierarchical Creation

Complete hierarchy for realistic testing:

- Migration → Iteration → Plan → Sequence → Phase → Step → Instruction

### Cleanup Pattern

Reverse order cleanup (foreign key safe):

1. Instructions (instances then masters)
2. Steps → Phases → Sequences
3. Plans → Iterations → Migrations
4. Supporting entities (teams, users, etc.)

### Test Isolation

- 'test' user marker for test data identification
- Independent test execution (no cross-contamination)
- Automated cleanup after each test

## US-034 Data Import Testing

### Performance Excellence

- **51ms** complex query execution (10x better than 500ms target)
- **95%+ BaseIntegrationTest compliance** achieved
- **Comprehensive coverage** - All import phases validated

### Import Phases Tested

- CSV_TEAMS - Team data import
- CSV_USERS - User data import
- CSV_APPLICATIONS - Application import
- CSV_ENVIRONMENTS - Environment import
- JSON_STEPS - Step structure import

### Database Validation

- Direct PostgreSQL verification
- Staging table validation
- Orchestration record verification
- Progress tracking validation

## Known Issues & Solutions

### XML Parser Conflicts (Legacy Tests)

**Issue**: LinkageError with SAXParserImpl in legacy @Grab tests

**Solution**: Test runner uses XML_PARSER_OPTS:

```bash
XML_PARSER_OPTS="-Djavax.xml.parsers.SAXParserFactory=com.sun.org.apache.xerces.internal.jaxp.SAXParserFactoryImpl"
```

**Modern Approach**: Use ADR-036 pattern (zero external dependencies)

### Database Connection

**Correct**: Use `localhost` hostname

```groovy
def dbUrl = "jdbc:postgresql://localhost:5432/umig_app_db"  // ✅
```

**Wrong**: Use `postgres` hostname (fails in tests)

## ADR Compliance

- **ADR-036**: Pure Groovy implementation (no external REST clients)
- **ADR-026**: Specific SQL query validation
- **ADR-031**: Type safety with explicit casting
- **ADR-030**: Hierarchical filtering patterns
- **ADR-042**: Dual authentication (session + fallback)

## Adding New Integration Tests

1. **Follow BaseIntegrationTest pattern** (US-037 standard)
2. **Use localhost for database** connections
3. **Implement proper cleanup** (reverse order)
4. **Reference validation standards** document
5. **Test against live database** (not mocked)
6. **Validate performance** against targets
7. **Include authentication** via AuthenticationHelper

## Troubleshooting

### Authentication Failures

```bash
# Check .env file
ls -la local-dev-setup/.env
grep POSTMAN_AUTH local-dev-setup/.env

# Test authentication
groovy src/groovy/umig/tests/integration/AuthenticationTest.groovy

# Manual verification
curl -u admin:Spaceop!13 http://localhost:8090/rest/scriptrunner/latest/custom/teams
```

### Database Connection Issues

```bash
# Check PostgreSQL container
podman ps | grep postgres
podman logs umig_postgres

# Verify connection
groovy src/groovy/umig/tests/diagnostics/testDatabaseConnection.groovy
```

---

**Version**: 2.0 | **Updated**: September 26, 2025 (Sprint 8)
**Key Features**: BaseIntegrationTest compliance, US-034 reference implementation
**Performance**: 51ms complex queries (10x target exceeded)
