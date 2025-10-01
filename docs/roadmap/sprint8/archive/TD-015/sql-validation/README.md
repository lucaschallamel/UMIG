# TD-015 Phase 2 SQL Validation Queries - ARCHIVED

**Archival Date**: October 1, 2025
**Original Location**: `/docs/roadmap/sprint8/TD-015-Phase2-Validation-Queries.sql`
**Reason**: Phase 2 validation completed, high-value queries migrated to automated tests

---

## Archive Contents

**File**: `TD-015-Phase2-Validation-Queries.sql` (21 KB, 565 lines)

**Purpose**: Database validation queries for TD-015 (Email Template Bug Fix) Phase 2

**Original Execution Date**: September 30, 2025

---

## Query Organization (5 Tasks)

### Task 1: Schema Validation (8 queries, lines 8-70)

- Table structure validation
- Constraint checks (CHECK, foreign keys)
- Index verification
- Column data types and nullability

**Status**: ✅ Validated September 30, 2025
**Ongoing Value**: None (schema stable, protected by ADR-059)

### Task 2: Template Type Enumeration (7 queries, lines 72-219)

- Template inventory (10 expected types)
- Type usage statistics
- WITH_URL variant validation
- Active/inactive breakdown

**Status**: ✅ Migrated to automated test
**Test**: `EmailTemplateDatabaseValidationTest.testAllExpectedTemplateTypesPresent()`

### Task 3: Content Comparison (5 queries, lines 221-385)

- Variable usage detection (22 variables)
- CSS feature detection (mobile breakpoints, Outlook support)
- HTML structure analysis

**Status**: ✅ Migrated to automated tests (2 tests)
**Tests**:

- `EmailTemplateDatabaseValidationTest.testStepStatusChangedTemplateVariables()`
- `EmailTemplateDatabaseValidationTest.testMobileResponsiveCSSFeatures()`

### Task 4: Migration Consistency (7 queries, lines 387-488)

- Liquibase changelog verification (migrations 024, 027, 034)
- Migration timeline analysis
- Duplicate detection

**Status**: ✅ Validated September 30, 2025
**Ongoing Value**: None (migrations already applied, immutable)

### Task 5: Summary Statistics (2 queries, lines 491-564)

- Overall health check (template counts, sizes)
- Canonical template comparison

**Status**: ✅ Migrated to automated test
**Test**: `EmailTemplateDatabaseValidationTest.testEmailTemplateHealthCheck()`

---

## Migration to Automated Tests

### Automated Test File

**Location**: `/src/groovy/umig/tests/integration/EmailTemplateDatabaseValidationTest.groovy`

**Test Count**: 4 automated tests

**Coverage**:

1. ✅ **Template Type Enumeration** - Validates 10 expected types present
2. ✅ **Variable Presence Validation** - Validates 22 critical variables in STEP_STATUS_CHANGED template
3. ✅ **Mobile-Responsive CSS** - Validates breakpoints, Outlook support, responsive containers
4. ✅ **Health Check** - Validates template counts, sizes, basic integrity

**Execution**:

```bash
# Run email template validation tests
groovy src/groovy/umig/tests/integration/EmailTemplateDatabaseValidationTest.groovy

# Or via npm
npm run test:groovy:integration
```

**CI/CD Integration**: Tests run on every PR to catch template regressions

---

## Query Disposition Summary

| Task                              | Queries | Migrated to Test | Archived Only     | Reason                                     |
| --------------------------------- | ------- | ---------------- | ----------------- | ------------------------------------------ |
| **Task 1: Schema Validation**     | 8       | ❌               | ✅                | One-time Phase 2 validation, schema stable |
| **Task 2: Template Enumeration**  | 7       | ✅ (1 test)      | ✅                | Template type validation automated         |
| **Task 3: Content Comparison**    | 5       | ✅ (2 tests)     | ✅                | Variable/CSS validation automated          |
| **Task 4: Migration Consistency** | 7       | ❌               | ✅                | Migrations immutable, historical only      |
| **Task 5: Summary Statistics**    | 2       | ✅ (1 test)      | ✅                | Health check automated                     |
| **TOTAL**                         | 29      | **4 tests**      | **All preserved** | Hybrid approach                            |

---

## Manual Query Execution (If Needed)

These queries can still be run manually for troubleshooting or ad-hoc analysis:

```bash
# Connect to database
PGPASSWORD=123456 psql -h localhost -U umig_app_user -d umig_app_db

# Run specific query from archived file
\i docs/roadmap/sprint8/archive/TD-015/sql-validation/TD-015-Phase2-Validation-Queries.sql
```

**⚠️ WARNING**: Queries reference September 30, 2025 state. Results will differ as templates evolve.

---

## Related Documentation

- **Master Story**: `/docs/roadmap/sprint8/TD-015-Email-Template-Fix.md`
- **Testing Reference**: `/docs/testing/TD-015-Email-Template-Testing-Reference.md`
- **Automated Tests**: `/src/groovy/umig/tests/integration/EmailTemplateDatabaseValidationTest.groovy`
- **Archive Index**: `/docs/roadmap/sprint8/archive/TD-015/README.md`

---

## Historical Context

### Phase 2 Validation Results (September 30, 2025)

- ✅ Schema validation passed (8/8 queries)
- ✅ Template type enumeration passed (10/10 expected types)
- ✅ Content comparison passed (22/22 variables validated)
- ✅ Migration consistency passed (migrations 024, 027, 034 applied)
- ✅ Summary statistics passed (10 active templates, avg 7,650 bytes)

### TD-015 Implementation Timeline

1. **Phase 1**: Template Analysis (identified 54 scriptlets per template)
2. **Phase 2**: Helper Methods Implementation (8 methods, 305 lines)
3. **Phase 3**: Database Migration (034_td015_simplify_email_templates.sql applied)
4. **Phase 4**: Variable Binding Validation (22 variables validated)
5. **Phase 5**: Automated Testing (100% tests passing)
6. **Phase 6**: Test Migration (SQL queries → automated tests) ← **This archive**

---

**Preservation Reason**: These queries represent comprehensive Phase 2 validation work and provide valuable historical context for understanding TD-015 implementation approach. While automated tests now provide ongoing regression protection, these original queries document the validation strategy and can serve as reference for future database validation needs.
