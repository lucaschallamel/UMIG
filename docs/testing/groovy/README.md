# Groovy Testing Documentation

**Location**: `/docs/testing/groovy/`
**Purpose**: Comprehensive documentation for all Groovy test suites in the UMIG project
**Last Updated**: 2025-10-01

## Directory Structure

```
/docs/testing/groovy/
├── README.md (this file)
├── test-execution-commands.md
├── unit/
│   └── repository/
│       └── application-repository-comprehensive-test-summary.md
├── integration/
│   └── integration-test-validation-standards.md
├── uat/
│   ├── us-036-manual-testing-checklist.md
│   └── us-036-stepview-status-display-testing-strategy.md
└── utils/
    └── integration-test-failure-analysis.md
```

## Documentation Files

### Test Execution

**File**: `test-execution-commands.md`
**Purpose**: Command reference for running Groovy tests
**Usage**: Quick reference for npm scripts and direct Groovy execution

### Unit Test Documentation

**Directory**: `unit/repository/`
**Files**:

- `application-repository-comprehensive-test-summary.md` - ApplicationRepository test suite documentation (28 tests, 93% coverage)

**Purpose**: Comprehensive test suite summaries for repository unit tests following TD-001 self-contained architecture pattern.

### Integration Test Documentation

**Directory**: `integration/`
**Files**:

- `integration-test-validation-standards.md` - Standards and validation criteria for integration tests

**Purpose**: Guidelines and standards for integration test development and execution.

### UAT Documentation

**Directory**: `uat/`
**Files**:

- `us-036-manual-testing-checklist.md` - Manual testing checklist for US-036
- `us-036-stepview-status-display-testing-strategy.md` - Testing strategy for StepView status display

**Purpose**: User Acceptance Testing documentation, test strategies, and manual testing checklists.

### Test Utilities Documentation

**Directory**: `utils/`
**Files**:

- `integration-test-failure-analysis.md` - Analysis and troubleshooting guide for integration test failures

**Purpose**: Troubleshooting guides, failure analysis, and test utility documentation.

## Test Architecture Standards

### TD-001 Self-Contained Pattern

All unit tests follow the TD-001 self-contained architecture:

- Zero external dependencies
- Embedded MockSql for database simulation
- Embedded DatabaseUtil with `withSql` pattern
- Embedded repository implementations
- No MetaClass manipulation

### ADR-031 Type Casting

All tests enforce ADR-031 explicit type casting:

- Explicit casting for all type conversions
- Parameter validation with type annotations
- Type-checked assertions throughout
- Properly typed comparisons

## Running Groovy Tests

### Via npm Scripts (Recommended)

```bash
cd local-dev-setup

# All Groovy tests
npm run test:groovy:all

# Unit tests only
npm run test:groovy:unit

# Integration tests only
npm run test:groovy:integration
```

### Direct Groovy Execution

```bash
# From project root
groovy src/groovy/umig/tests/unit/repository/ApplicationRepositoryComprehensiveTest.groovy
```

## Test Coverage Targets

- **Unit Tests**: 85-90% coverage of repository methods
- **Integration Tests**: Critical path coverage
- **UAT**: User story acceptance criteria validation

## Related Documentation

- **Test Source Code**: `/src/groovy/umig/tests/`
- **JavaScript Testing**: `/docs/testing/` (parent directory)
- **Architecture Decisions**: `/docs/architecture/adr/`
- **Sprint Documentation**: `/docs/roadmap/sprint*/`

## Maintenance

### Adding Test Documentation

1. Create test suite summary in appropriate subdirectory
2. Follow naming convention: `{component}-{test-type}-test-summary.md`
3. Update this README.md index
4. Include architecture compliance (TD-001, ADR-031)
5. Document test count, coverage, and execution instructions

### Documentation Standards

- Use lowercase with hyphens for filenames
- Include test count, coverage percentage, and architecture compliance
- Provide execution instructions for both npm and direct Groovy
- Document test data, categories, and expected output

## Status

**Current Test Count**: 31 Groovy tests (all passing - 100% success rate)
**Architecture Compliance**: TD-001 self-contained pattern
**Type Safety**: ADR-031 explicit casting enforced
**Documentation Coverage**: Repository unit tests documented
