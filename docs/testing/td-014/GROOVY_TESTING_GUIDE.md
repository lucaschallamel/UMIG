# Groovy Testing Guide - Manual Execution in ScriptRunner

> **Architecture Decision**: This guide implements Track 1 of **[ADR-072: Dual-Track Testing Strategy](../../docs/architecture/adr/ADR-072-dual-track-testing-strategy.md)**

## Overview

This guide explains how to execute the **18 isolated Groovy tests** that have been moved to `local-dev-setup/__tests__/groovy/` to prevent ScriptRunner crashes during Confluence startup.

## ⚠️ Critical Limitation

**These tests CANNOT be executed via:**

- ❌ `npm run test:groovy:isolated` (will fail with warning)
- ❌ `npm run test:groovy:isolated:quick` (will fail with warning)
- ❌ Standalone `groovy` CLI (will hang indefinitely)

**Reason**: These tests require ScriptRunner's execution context including database connectivity, Confluence runtime environment, and ScriptRunner class loader.

## ✅ Correct Execution Method

### Manual Execution in ScriptRunner Console

**Prerequisites:**

1. Confluence with ScriptRunner installed and running
2. Admin access to Confluence
3. ScriptRunner Console access

### Step-by-Step Instructions

#### 1. Access ScriptRunner Console

1. Navigate to Confluence: http://localhost:8090
2. Login as admin (credentials: admin/123456)
3. Go to **Settings** (⚙️) → **Manage Apps**
4. In left sidebar: **ScriptRunner** → **Console**

#### 2. Copy Test File Content

Choose one of the 18 isolated tests from:

```
__tests__/groovy/isolated/
├── unit/
│   ├── api/v2/
│   │   ├── TeamsApiComprehensiveTest.groovy (98 KB)
│   │   └── StepsApiComprehensiveTest.groovy (53 KB)
│   ├── repository/
│   │   ├── UserRepositoryComprehensiveTest.groovy (73 KB)
│   │   ├── StepInstanceRepositoryComprehensiveTest.groovy (66 KB)
│   │   ├── MigrationRepositoryComprehensiveTest.groovy (59 KB)
│   │   ├── StepRepositoryComprehensiveTest.groovy (55 KB)
│   │   ├── UserBidirectionalRelationshipTest.groovy (45 KB)
│   │   ├── TeamRepositoryComprehensiveTest.groovy (27 KB)
│   │   └── StepRepositoryInstanceDTOWriteTest.groovy (30 KB)
│   ├── service/
│   │   └── StepDataTransformationServiceComprehensiveTest.groovy (44 KB)
│   ├── ImportApiComprehensiveTest.groovy (51 KB)
│   ├── BaseEntityManagerInterfaceTest.groovy (41 KB)
│   ├── MigrationTypesRepositoryTest.groovy (32 KB)
│   ├── EnvironmentsEntityManagerTest.groovy (27 KB)
│   └── StepViewApiEmailTest.groovy (25 KB)
├── integration/
│   └── comprehensive-email-test-suite.groovy (52 KB)
└── performance/
    └── ImportLoadTests.groovy (42 KB)
```

**Plus:**

```
__tests__/groovy/unit/repository/
└── ApplicationRepositoryComprehensiveTest.groovy (59 KB)
```

#### 3. Execute in ScriptRunner Console

1. Copy entire content of chosen test file
2. Paste into ScriptRunner Console editor
3. Click **Run** button
4. Review output in console

### Expected Output

**Successful test execution:**

```
✅ Test 1: PASSED - User creation with valid data
✅ Test 2: PASSED - User validation with missing email
✅ Test 3: PASSED - User update operations
...
All tests passed: 28/28
```

**Test failure (expected behavior):**

```
❌ Test 5: FAILED - Expected exception not thrown
   Expected: ConflictException
   Actual: null
```

## 📊 Testing Strategy

### Quarterly Manual Validation

**Frequency**: Every 3 months or before major releases

**Process:**

1. Execute all 18 isolated tests manually in ScriptRunner console
2. Document pass/fail results
3. Record execution time for performance tests
4. Report any failures to development team

### Coverage Targets

- **Repository Tests**: 85-90% method coverage
- **API Tests**: 80-85% endpoint coverage
- **Integration Tests**: Critical workflow validation
- **Performance Tests**: Baseline establishment

## 🔄 Dual-Track Testing Strategy

### Track 1: Manual Groovy Tests (This Guide)

**Scope**: 18 isolated comprehensive tests
**Execution**: Manual via ScriptRunner console
**Frequency**: Quarterly or pre-release
**Coverage**: Deep repository/service logic (85-90%)

### Track 2: Automated Jest Integration Tests

**Scope**: API endpoint validation
**Execution**: Automated via `npm run test:js:integration`
**Frequency**: Every commit (CI/CD)
**Coverage**: 80%+ API endpoints

See [JEST_INTEGRATION_TEST_PLAN.md](../../docs/testing/JEST_INTEGRATION_TEST_PLAN.md) for Track 2 details.

## 📁 Test Categories

### Unit Tests - Repository (8 files)

Focus on data access layer, CRUD operations, relationship management

### Unit Tests - API (2 files)

Comprehensive REST API validation, response codes, error handling

### Unit Tests - Service (1 file)

Business logic transformation, data mapping, validation rules

### Unit Tests - Other (4 files)

Entity managers, base interfaces, type repositories, email functionality

### Integration Tests (1 file)

End-to-end email service with MailHog integration

### Performance Tests (1 file)

Load testing, performance benchmarks, stress scenarios

## 🐛 Troubleshooting

### Test Hangs in ScriptRunner Console

**Symptom**: Test execution never completes, console shows spinner indefinitely

**Cause**: Database connection timeout or test waiting for external resource

**Solution**:

1. Check PostgreSQL is running: `npm run postgres:check`
2. Verify database connectivity in ScriptRunner console:
   ```groovy
   import com.adaptavist.hapi.dsl.databases.Sql
   def sql = Sql.newInstance('jdbc:postgresql://localhost:5432/umig_app_db',
       'umig_app_user', '123456', 'org.postgresql.Driver')
   sql.rows('SELECT 1 as test')
   ```
3. Restart Confluence if necessary: `npm restart`

### OutOfMemoryError During Test Execution

**Symptom**: ScriptRunner console crashes or Confluence becomes unresponsive

**Cause**: Test file too large for ScriptRunner heap space

**Solution**:

1. Split large test into smaller segments
2. Execute tests in smaller batches
3. Consider moving additional tests to isolated location

### Test Results Differ from Expected

**Symptom**: Tests pass/fail differently than in original location

**Cause**: Database state not reset between test runs

**Solution**:

1. Reset database: `npm run restart:erase` (WARNING: destroys all data)
2. Regenerate test data: `npm run generate-data`
3. Re-execute test

## 📋 Test Execution Checklist

Before quarterly validation:

- [ ] Verify Confluence/ScriptRunner running (`npm run health:check`)
- [ ] Confirm database connectivity (`npm run postgres:check`)
- [ ] Reset database to clean state (`npm run restart:erase` + `npm run generate-data`)
- [ ] Prepare test execution tracking spreadsheet
- [ ] Schedule 2-3 hour window for complete test suite

During execution:

- [ ] Execute each of 18 tests sequentially
- [ ] Record pass/fail status
- [ ] Document any error messages
- [ ] Note execution times for performance tests
- [ ] Capture screenshots of critical failures

After execution:

- [ ] Compile results report
- [ ] File issues for any failures
- [ ] Update test documentation if needed
- [ ] Share results with development team

## 📞 Support

**Issues with tests**: File GitHub issue with label `testing/groovy`
**Questions**: Contact development team via Slack #umig-dev

## 📚 Related Documentation

- **[ADR-072: Dual-Track Testing Strategy](../../docs/architecture/adr/ADR-072-dual-track-testing-strategy.md)** - Architecture decision formalizing this approach
- **[README.md](./README.md)** - Isolated tests overview
- **[QA-VALIDATION-REPORT.md](./QA-VALIDATION-REPORT.md)** - Migration validation results
- **[Jest Integration Test Plan](../../docs/testing/JEST_INTEGRATION_TEST_PLAN.md)** - Track 2 automated testing strategy
- **[ADR-052: Self-Contained Test Architecture](../../docs/architecture/adr/ADR-052-self-contained-test-architecture-pattern.md)** - Test architecture pattern

---

**Last Updated**: 2025-09-30
**Maintained By**: UMIG Development Team
**Test Count**: 18 isolated comprehensive tests
