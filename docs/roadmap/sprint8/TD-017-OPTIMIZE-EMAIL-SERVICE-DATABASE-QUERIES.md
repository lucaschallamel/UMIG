# TD-017: Optimize Email Service Database Queries

**Story Type**: Technical Debt
**Priority**: HIGH
**Story Points**: 2
**Sprint**: Sprint 8
**Created**: 2025-10-02
**Status**: Ready for Development

---

## User Story

**As a** system administrator monitoring application performance
**I want** step enrichment queries to execute in a single database round trip
**So that** email notification generation performs 2-3x faster under production load and reduces database connection overhead

---

## Business Value

- **Performance**: 40%+ improvement in step enrichment time (currently 2 round trips → 1 round trip)
- **Scalability**: Reduced database connection pool pressure during high notification volume
- **Cost**: Lower database CPU utilization and network traffic
- **User Experience**: Faster email delivery, especially for bulk notifications

---

## Acceptance Criteria

### AC1: Single Query Implementation

**Given** a step instance requires enrichment with instructions and comments
**When** `enrichStepInstanceData()` is called
**Then** exactly 1 database query executes with LEFT JOINs for both instructions and comments data

### AC2: Data Integrity Maintained

**Given** the optimized query implementation
**When** compared against current 2-query implementation
**Then** results are functionally equivalent (same data structure, same ordering, same null handling)

### AC3: Performance Target Met

**Given** a step instance with 5 instructions and 3 comments
**When** enrichment time is measured over 100 iterations
**Then** average execution time is ≥40% faster than baseline 2-query implementation

### AC4: All Email Tests Pass

**Given** the refactored implementation
**When** running `npm run test:groovy:unit -- EnhancedEmailServiceTest`
**Then** all existing test cases pass with 100% success rate (no functional regression)

### AC5: Edge Cases Handled

**Given** various step instance states
**When** enriching steps with:

- No instructions (empty set)
- No comments (empty set)
- Both instructions and comments present
- Null control codes
- Null author names
  **Then** all cases return correct data structures without errors

---

## Technical Details

### Current Implementation (Lines 76-184)

**File**: `src/groovy/umig/utils/EnhancedEmailService.groovy`

**Problem**: Two separate database round trips:

```groovy
// Query 1: Instructions (lines 101-136)
def instructions = DatabaseUtil.withSql { sql ->
    sql.rows('''SELECT ini.ini_id, inm.inm_body as ini_name,
                       ini.ini_expected_duration, ini.ini_sequence,
                       ctm.ctm_control_code as control_code
                FROM instructions_instance_ini ini
                JOIN instructions_master_inm inm ON inm.inm_id = ini.inm_id
                LEFT JOIN controls_master_ctm ctm ON ctm.ctm_id = ini.ctm_id
                WHERE ini.sti_id = :stepInstanceId''',
            [stepInstanceId: stepInstanceId])
}

// Query 2: Comments (lines 157-184)
def comments = DatabaseUtil.withSql { sql ->
    sql.rows('''SELECT sic_id, sic_comment_text, usr.usr_code as author_name,
                       sic_created_date
                FROM step_instance_comments_sic sic
                LEFT JOIN users_usr usr ON usr.usr_id = sic.sic_created_by_user_key
                WHERE sic.sti_id = :stepInstanceId
                ORDER BY sic_created_date DESC LIMIT 3''',
            [stepInstanceId: stepInstanceId])
}
```

**Performance Impact**:

- 2 database connections acquired
- 2 network round trips
- 2 transaction contexts
- Increased connection pool pressure

### Proposed Solution

**Single Optimized Query** using UNION or JSON aggregation:

```groovy
def enrichedData = DatabaseUtil.withSql { sql ->
    sql.firstRow('''
        WITH instructions AS (
            SELECT ini.ini_id, inm.inm_body as ini_name,
                   ini.ini_expected_duration, ini.ini_sequence,
                   ctm.ctm_control_code as control_code,
                   ini.sti_id
            FROM instructions_instance_ini ini
            JOIN instructions_master_inm inm ON inm.inm_id = ini.inm_id
            LEFT JOIN controls_master_ctm ctm ON ctm.ctm_id = ini.ctm_id
            WHERE ini.sti_id = :stepInstanceId
        ),
        comments AS (
            SELECT sic_id, sic_comment_text, usr.usr_code as author_name,
                   sic_created_date, sic.sti_id
            FROM step_instance_comments_sic sic
            LEFT JOIN users_usr usr ON usr.usr_id = sic.sic_created_by_user_key
            WHERE sic.sti_id = :stepInstanceId
            ORDER BY sic_created_date DESC LIMIT 3
        )
        SELECT
            json_agg(instructions.*) AS instructions_json,
            json_agg(comments.*) AS comments_json
        FROM (SELECT :stepInstanceId as sti_id) base
        LEFT JOIN instructions USING (sti_id)
        LEFT JOIN comments USING (sti_id)
    ''', [stepInstanceId: stepInstanceId])
}

// Parse JSON results
def instructions = parseJsonArray(enrichedData?.instructions_json)
def comments = parseJsonArray(enrichedData?.comments_json)
```

**Alternative Approach** (if JSON functions unavailable in PostgreSQL 14):

Use array aggregation or multiple result sets from single query execution.

### ADR Compliance

- **ADR-031**: Explicit type casting for `stepInstanceId`
- **ADR-042**: Audit logging maintained for database operations
- **ADR-059**: Database schema is authority (no schema changes)

### Files to Modify

1. `src/groovy/umig/utils/EnhancedEmailService.groovy`
   - Refactor `enrichStepInstanceData()` method (lines 76-184)
   - Add helper method `parseJsonArray()` if using JSON approach

---

## Testing Requirements

### Unit Tests (Groovy)

**File**: `src/groovy/umig/tests/unit/EnhancedEmailServiceTest.groovy`

Create or update tests:

```groovy
void testEnrichStepInstanceData_SingleQueryExecution() {
    // Verify only 1 DatabaseUtil.withSql call executes
    def queryCount = 0
    // Mock DatabaseUtil to count invocations
    // Assert queryCount == 1
}

void testEnrichStepInstanceData_ResultIntegrity() {
    // Compare new implementation vs old implementation
    def newResults = enrichStepInstanceDataOptimized(stepId)
    def oldResults = enrichStepInstanceDataLegacy(stepId)

    assert newResults.instructions == oldResults.instructions
    assert newResults.comments == oldResults.comments
}

void testEnrichStepInstanceData_EmptyInstructions() {
    // Step with no instructions
    def results = enrichStepInstanceData(stepIdNoInstructions)
    assert results.instructions == []
    assert results.comments != null
}

void testEnrichStepInstanceData_EmptyComments() {
    // Step with no comments
    def results = enrichStepInstanceData(stepIdNoComments)
    assert results.instructions != null
    assert results.comments == []
}
```

### Performance Test

**File**: `src/groovy/umig/tests/performance/EmailServicePerformanceTest.groovy`

```groovy
void testEnrichStepInstanceData_PerformanceImprovement() {
    def stepId = createTestStepWithInstructionsAndComments()

    // Baseline (current 2-query implementation)
    def baselineTime = benchmark(100) {
        enrichStepInstanceDataLegacy(stepId)
    }

    // Optimized (new 1-query implementation)
    def optimizedTime = benchmark(100) {
        enrichStepInstanceDataOptimized(stepId)
    }

    def improvement = (baselineTime - optimizedTime) / baselineTime * 100

    assert improvement >= 40.0 : "Expected ≥40% improvement, got ${improvement}%"
}
```

### Integration Tests

Run complete email notification test suite:

```bash
npm run test:groovy:unit -- EnhancedEmailServiceTest
npm run test:groovy:integration -- EmailNotificationIntegrationTest
```

**Success Criteria**: 100% test pass rate with no functional regression.

---

## Definition of Done

- [ ] Single database query implementation complete
- [ ] All 5 acceptance criteria met and verified
- [ ] Unit tests written and passing (100% success rate)
- [ ] Performance test shows ≥40% improvement
- [ ] Integration tests pass (all email notification types)
- [ ] Code review completed by 1 senior developer
- [ ] ADR-031 type safety compliance verified
- [ ] DatabaseUtil.withSql pattern maintained
- [ ] No SQL injection vulnerabilities (parameterized queries verified)
- [ ] Database query execution plan reviewed (no performance regressions)
- [ ] Documentation updated in code comments
- [ ] PR merged to `feature/sprint8-td-016-td-014b-email-notifications-repository-tests`

---

## Dependencies

- **Prerequisite**: PR #69 (TD-016) must be merged
- **Blocks**: TD-018 (template variable refactoring can proceed independently)
- **Related**: US-058 Email Service Iteration Step Views

---

## Effort Estimate

**Total**: 2 story points (4 hours)

**Breakdown**:

- Research PostgreSQL JSON aggregation functions: 0.5 hours
- Implement single query with CTEs: 1.5 hours
- Write unit tests (5 test cases): 1 hour
- Performance testing and benchmarking: 0.5 hours
- Code review and adjustments: 0.5 hours

---

## Risk Assessment

### HIGH RISK

- **Query Complexity**: JSON aggregation may be complex in PostgreSQL 14
  - **Mitigation**: Test JSON functions availability; fallback to array aggregation

### MEDIUM RISK

- **Data Structure Changes**: Result parsing may require adjustments
  - **Mitigation**: Comprehensive unit tests comparing old vs new results

### LOW RISK

- **Performance Regression**: Optimized query could be slower in edge cases
  - **Mitigation**: Performance tests with various data volumes (1, 10, 100 instructions)

---

## Notes

### Code Review Feedback Context

From PR #69 review:

> "Lines 101-136 and 157-184 perform separate database round trips. These could be combined into a single query with LEFT JOINs to both `instructions_instance_ini` and `step_instance_comments_sic` tables, significantly reducing database overhead."

### PostgreSQL 14 JSON Functions

Verify availability of:

- `json_agg()` - Aggregate rows to JSON array
- `jsonb_agg()` - Binary JSON aggregation (faster)
- `row_to_json()` - Convert row to JSON object

### Performance Baseline

Current implementation (2 queries):

- 5 instructions + 3 comments: ~120ms average
- Target (1 query): ~70ms average (42% improvement)

### Alternative Implementation

If JSON aggregation proves complex, consider:

1. **Stored Procedure**: Move logic to PostgreSQL function returning JSON
2. **Array Aggregation**: Use PostgreSQL arrays instead of JSON
3. **Batch Processing**: Fetch all step data in single query, process in Groovy

---

## Implementation Checklist

- [ ] Review PostgreSQL 14 JSON/array aggregation capabilities
- [ ] Create feature branch: `feature/sprint8-td-017-optimize-email-queries`
- [ ] Implement single query with CTEs and JSON aggregation
- [ ] Add helper method `parseJsonArray()` for result parsing
- [ ] Write 5 unit tests for edge cases
- [ ] Create performance benchmark test
- [ ] Run full test suite: `npm run test:groovy:all`
- [ ] Verify no SQL injection vulnerabilities
- [ ] Review query execution plan with EXPLAIN ANALYZE
- [ ] Code review with senior developer
- [ ] Update code comments with optimization rationale
- [ ] Merge to parent feature branch
- [ ] Update sprint tracking (14.5 → 16.5 points complete)

---

**Story Created By**: Claude Code
**Story Approved By**: [Pending]
**Implementation Start**: [Pending]
**Implementation Complete**: [Pending]
