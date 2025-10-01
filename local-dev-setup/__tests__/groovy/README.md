# Isolated Groovy Tests

> **Architecture Decision**: This testing approach is part of the **[ADR-072: Dual-Track Testing Strategy](../../docs/architecture/adr/ADR-072-dual-track-testing-strategy.md)** - Track 1 (Manual Groovy Tests)

## ⚠️ CRITICAL EXECUTION LIMITATION

**These isolated Groovy tests CANNOT be executed via npm or standalone `groovy` CLI.** They require ScriptRunner's execution context including:

- ScriptRunner database connectivity
- Confluence runtime environment
- ScriptRunner class loader and dependencies

**For execution instructions, see [GROOVY_TESTING_GUIDE.md](./GROOVY_TESTING_GUIDE.md)**

## Purpose

This directory contains Groovy tests that have been **intentionally moved out of ScriptRunner's scan path** to prevent ScriptRunner and Confluence from crashing during startup.

## Why Tests Are Isolated

ScriptRunner automatically scans all `.groovy` files in `src/groovy/umig/tests/` during Confluence startup. Some comprehensive test files with complex static nested class structures can overwhelm ScriptRunner's class loader, causing:

- OutOfMemoryError during class loading
- Confluence startup failures
- Stack crashes requiring container restarts

## Current Isolated Tests (17 files - 10.43% of total)

### Migration Strategy

**Hybrid Approach**: Only tests meeting isolation criteria (>50KB or ≥3 static nested classes) are moved here.
**Remaining in src/**: 146 tests (89.57%) stay in `src/groovy/umig/tests/` for ScriptRunner console access.

### Isolated Tests by Category

#### Unit Tests - Repository (7 files)

1. **ApplicationRepositoryComprehensiveTest.groovy** (59 KB, isolated/unit/repository/)
   - 28 tests, 85-90% coverage of ApplicationRepository
   - Originally caused ScriptRunner crashes (5 static nested classes)

2. **UserRepositoryComprehensiveTest.groovy** (73 KB, 3 static classes)
   - Comprehensive user management tests
   - BOTH criteria: file_size + static_class_count

3. **StepInstanceRepositoryComprehensiveTest.groovy** (66 KB, 1 static class)
   - Step instance CRUD and relationship tests

4. **MigrationRepositoryComprehensiveTest.groovy** (59 KB, 4 static classes)
   - Migration repository comprehensive coverage
   - BOTH criteria: file_size + static_class_count

5. **StepRepositoryComprehensiveTest.groovy** (55 KB, 1 static class)
   - Step master repository tests

6. **UserBidirectionalRelationshipTest.groovy** (45 KB, 3 static classes)
   - User relationship integrity tests

7. **TeamRepositoryComprehensiveTest.groovy** (27 KB, 4 static classes)
   - Team repository with complex nested classes

8. **StepRepositoryInstanceDTOWriteTest.groovy** (30 KB, 4 static classes)
   - Step DTO write operations

#### Unit Tests - API (2 files)

1. **TeamsApiComprehensiveTest.groovy** (98 KB, 1 static class)
   - Largest test file - Teams API comprehensive coverage

2. **StepsApiComprehensiveTest.groovy** (53 KB, 0 static classes)
   - Steps API v2 comprehensive tests

#### Unit Tests - Service (1 file)

1. **StepDataTransformationServiceComprehensiveTest.groovy** (44 KB, 6 static classes)
   - Data transformation service with complex mock infrastructure

#### Unit Tests - Other (4 files)

1. **ImportApiComprehensiveTest.groovy** (51 KB, 0 static classes)
   - Import API comprehensive coverage

2. **BaseEntityManagerInterfaceTest.groovy** (41 KB, 9 static classes)
   - Entity manager interface validation (highest static class count)

3. **MigrationTypesRepositoryTest.groovy** (32 KB, 3 static classes)
   - Migration types repository tests

4. **EnvironmentsEntityManagerTest.groovy** (27 KB, 5 static classes)
   - Environment entity manager tests

5. **StepViewApiEmailTest.groovy** (25 KB, 9 static classes)
   - StepView email functionality (high static class count)

#### Integration Tests (1 file)

1. **comprehensive-email-test-suite.groovy** (52 KB, 0 static classes)
   - End-to-end email service integration tests

#### Performance Tests (1 file)

1. **ImportLoadTests.groovy** (42 KB, 3 static classes)
   - Import performance and load testing

### How to Run

⚠️ **IMPORTANT**: These tests cannot run via npm or standalone groovy CLI.

**DO NOT USE** these commands (they will fail with warnings):

```bash
npm run test:groovy:isolated        # ❌ Will fail with execution warning
npm run test:groovy:isolated:quick  # ❌ Will fail with execution warning
groovy __tests__/groovy/isolated/unit/repository/UserRepositoryComprehensiveTest.groovy  # ❌ Will hang indefinitely
```

**CORRECT EXECUTION**: Manual testing in ScriptRunner console
See [GROOVY_TESTING_GUIDE.md](./GROOVY_TESTING_GUIDE.md) for complete instructions.

### Isolation Statistics

- **Total Size**: 820 KB (0.80 MB)
- **Average Size**: 48 KB per file
- **Largest**: TeamsApiComprehensiveTest.groovy (98 KB)
- **Most Static Classes**: BaseEntityManagerInterfaceTest.groovy & StepViewApiEmailTest.groovy (9 each)

## Architecture Pattern

These isolated tests follow **TD-001 self-contained architecture**:

- ✅ Zero external dependencies
- ✅ Embedded MockSql and DatabaseUtil
- ✅ Complete PostgreSQL behavior simulation
- ⚠️ **CANNOT** run standalone via `groovy` CLI (requires ScriptRunner context)
- ✅ Don't interfere with ScriptRunner/Confluence (isolated from scan path)

## Future Considerations

If more comprehensive tests cause similar issues, move them here following this pattern:

1. Move file from `src/groovy/umig/tests/` to `local-dev-setup/__tests__/groovy/`
2. Add npm test command in `package.json`
3. Document in this README
4. Verify ScriptRunner stability after move

## Related Documentation

- **[ADR-072](../../docs/architecture/adr/ADR-072-dual-track-testing-strategy.md)**: Dual-Track Testing Strategy (Architecture Decision)
- **[ADR-031](../../docs/architecture/adr/ADR-031-groovy-type-safety-and-filtering-patterns.md)**: Type Casting Requirements
- **[ADR-052](../../docs/architecture/adr/ADR-052-self-contained-test-architecture-pattern.md)**: Self-Contained Test Architecture Pattern
- **[Jest Integration Test Plan](../../docs/testing/JEST_INTEGRATION_TEST_PLAN.md)**: Track 2 automated testing strategy
- **Sprint 7 Phase 3**: Test Infrastructure Enhancement

---

**Last Updated**: 2025-09-30
**Maintained By**: UMIG Development Team
