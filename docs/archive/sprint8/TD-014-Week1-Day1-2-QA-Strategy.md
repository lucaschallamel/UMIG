# TD-014 Week 1 Day 1-2: Import Infrastructure Testing - QA Strategy

**Document Version**: 1.0
**Sprint**: 8 (TD-014 Phase 3B-1)
**Story Points**: 2.0 (ImportApi: 1.0, ImportQueueApi: 1.0)
**Target Tests**: 55-65 comprehensive tests
**Coverage Target**: 90-95% API layer coverage
**Created**: 2025-09-30

---

## Executive Summary

This QA strategy provides comprehensive testing guidance for **Week 1 Day 1-2** of TD-014, focusing on Import Infrastructure APIs (ImportApi and ImportQueueApi). These APIs are critical for US-034 database-backed import orchestration, featuring concurrent import coordination, queue management, and resource locking.

**Success Criteria**:

- 55-65 tests passing (100% pass rate)
- Import workflow validation complete
- Queue state machine validated
- Performance benchmarks established for import operations
- 90-95% API layer coverage achieved

---

## 1. Component Overview & Architecture

### 1.1 ImportApi - Data Import Operations

**Location**: `/src/groovy/umig/api/v2/ImportApi.groovy` (1,151 lines)
**Purpose**: Handles data import operations for JSON/CSV extracted from Confluence HTML
**Security Rating**: CVSS 3.1 Base Scores: 7.5 (Input Size), 8.8 (File Extension), 9.1 (Path Traversal)

**Key Features**:

- JSON/CSV data import with batch processing
- Security validation (input size, file extension, path traversal protection)
- Import history and statistics tracking
- Batch rollback capabilities
- Template download with secure path construction
- Master plan configuration creation

**Critical Patterns**:

- Lazy load services to avoid class loading issues
- Security validation before parsing (US-034 critical fixes)
- ADR-031 explicit type casting compliance
- SQL state mapping (23505→409 conflict, 23503→400 FK violation)
- Dual authentication with UserService fallback (ADR-042)

**Security Validations** (TD-014 Critical):

1. `validateInputSize()` - Prevents memory exhaustion (CVSS 7.5)
2. `validateBatchSize()` - Prevents resource exhaustion (CVSS 6.5)
3. `validateFileExtension()` - Prevents malicious uploads (CVSS 8.8)
4. `validateSecurePath()` - Prevents path traversal (CVSS 9.1)

### 1.2 ImportQueueApi - Queue Management & Coordination

**Location**: `/src/groovy/umig/api/v2/ImportQueueApi.groovy` (441 lines)
**Purpose**: US-034 database-backed queue management and resource monitoring
**Integration**: 7 new database tables from US-034 Phase 2

**Key Features**:

- Import queue status and submission
- Import request tracking and cancellation
- Schedule management (create, list, update)
- Resource monitoring (locks, utilization, statistics)
- System recommendations generation

**Database Tables** (US-034):

- `tbl_import_queue_management` - Request queuing
- `tbl_import_resource_locks` - Resource coordination
- `tbl_scheduled_imports` - Import scheduling
- `tbl_import_priority_configs` - Priority rules
- `tbl_import_resource_requirements` - Resource allocation
- `tbl_import_execution_history` - Audit trail
- `tbl_import_queue_statistics` - Performance metrics

### 1.3 ImportOrchestrationService - Coordination Engine

**Location**: `/src/groovy/umig/service/ImportOrchestrationService.groovy` (1,060 lines)
**Purpose**: Complete workflow coordination for US-034 Data Import Strategy

**Orchestration Features**:

- 5-phase import execution (BASE_ENTITIES → JSON_PROCESSING → MASTER_PROMOTION → VALIDATION → CLEANUP)
- Concurrent coordination with Semaphore (3 concurrent imports max)
- Entity-level locking with ReentrantLock
- Database-backed queue management via ImportQueueManagementRepository
- Resource locking via ImportResourceLockRepository
- Progress tracking with in-memory cache + database persistence
- Automatic error recovery and resume capabilities
- Rollback support at orchestration level

**Critical Patterns for Testing**:

- Database-backed coordination (replaced in-memory coordination)
- Fair locking with ReentrantLock(true)
- Semaphore-based concurrency limits
- Resource requirement estimation
- Import duration estimation
- Memory utilization monitoring
- Active orchestration tracking with AtomicInteger

---

## 2. Test Scenario Matrix

### 2.1 ImportApi Test Scenarios (30-35 tests)

#### Category 1: CRUD Operations (8-10 tests) - Priority P1

| Test ID    | Scenario                 | Input                               | Expected Output                          | Priority | Notes                 |
| ---------- | ------------------------ | ----------------------------------- | ---------------------------------------- | -------- | --------------------- |
| IA-CRUD-01 | Import single JSON file  | Valid JSON content, source filename | Success response, batch ID, statistics   | P1       | Happy path validation |
| IA-CRUD-02 | Import batch JSON files  | Array of JSON files (5 files)       | Batch result with success/failure counts | P1       | Batch processing      |
| IA-CRUD-03 | Import CSV teams         | Valid teams CSV content             | Success with team count statistics       | P1       | Base entity import    |
| IA-CRUD-04 | Import CSV users         | Valid users CSV content             | Success with user count statistics       | P1       | Base entity import    |
| IA-CRUD-05 | Import CSV applications  | Valid applications CSV content      | Success with application count           | P1       | Base entity import    |
| IA-CRUD-06 | Import CSV environments  | Valid environments CSV content      | Success with environment count           | P1       | Base entity import    |
| IA-CRUD-07 | Import all base entities | JSON with all CSV data              | Ordered import with statistics           | P1       | Complete workflow     |
| IA-CRUD-08 | Create master plan       | Plan name, description              | Plan ID, batch ID, success               | P1       | Configuration entity  |
| IA-CRUD-09 | Get import history       | User ID, limit parameters           | List of import batches                   | P2       | Audit trail           |
| IA-CRUD-10 | Get import statistics    | No parameters                       | Aggregate statistics                     | P2       | Metrics validation    |

#### Category 2: Data Validation (10-12 tests) - Priority P1 (Security Critical)

| Test ID   | Scenario                               | Input                 | Expected Output                       | Priority | CVSS Score |
| --------- | -------------------------------------- | --------------------- | ------------------------------------- | -------- | ---------- |
| IA-VAL-01 | Input size validation - within limit   | 10MB JSON content     | Validation passes                     | P1       | 7.5        |
| IA-VAL-02 | Input size validation - exceeds limit  | 55MB JSON content     | 400 Bad Request with CVSS alert       | P1       | 7.5        |
| IA-VAL-03 | Batch size validation - within limit   | 100 files in batch    | Validation passes                     | P1       | 6.5        |
| IA-VAL-04 | Batch size validation - exceeds limit  | 1500 files in batch   | 400 Bad Request with threat alert     | P1       | 6.5        |
| IA-VAL-05 | File extension validation - allowed    | filename.json         | Validation passes                     | P1       | 8.8        |
| IA-VAL-06 | File extension validation - disallowed | malicious.exe         | 400 Bad Request with security alert   | P1       | 8.8        |
| IA-VAL-07 | Path traversal prevention - safe path  | "teams" entity type   | Secure path constructed               | P1       | 9.1        |
| IA-VAL-08 | Path traversal prevention - attack     | "../../../etc/passwd" | 403 Forbidden with CRITICAL alert     | P1       | 9.1        |
| IA-VAL-09 | Malformed JSON handling                | Invalid JSON syntax   | 400 Bad Request with parse error      | P1       | N/A        |
| IA-VAL-10 | Empty content handling                 | Empty string body     | 400 Bad Request with validation error | P1       | N/A        |
| IA-VAL-11 | Missing required fields                | JSON without 'source' | 400 Bad Request with field error      | P1       | N/A        |
| IA-VAL-12 | SQL injection attempt                  | SQL in JSON content   | Sanitized and rejected                | P1       | Critical   |

#### Category 3: Error Recovery (5-7 tests) - Priority P2

| Test ID   | Scenario                    | Input                          | Expected Output                    | Priority | Notes                  |
| --------- | --------------------------- | ------------------------------ | ---------------------------------- | -------- | ---------------------- |
| IA-ERR-01 | Rollback import batch       | Valid batch ID, reason         | Success with rollback actions list | P2       | Critical recovery      |
| IA-ERR-02 | Rollback non-existent batch | Invalid batch ID               | 404 Not Found                      | P2       | Error handling         |
| IA-ERR-03 | Duplicate data handling     | Duplicate plan name            | 409 Conflict (SQL state 23505)     | P2       | SQL state mapping      |
| IA-ERR-04 | Foreign key violation       | Invalid FK reference           | 400 Bad Request (SQL state 23503)  | P2       | SQL state mapping      |
| IA-ERR-05 | Database connection failure | DB unavailable                 | 500 Internal Server Error          | P2       | Infrastructure failure |
| IA-ERR-06 | Transaction rollback        | Exception mid-transaction      | All-or-nothing commit              | P2       | ACID compliance        |
| IA-ERR-07 | Partial batch failure       | 3 success, 2 failures in batch | Mixed result with detailed errors  | P2       | Batch resilience       |

#### Category 4: Performance & Large Data (4-5 tests) - Priority P2

| Test ID    | Scenario                      | Input                  | Expected Output                | Priority | Notes               |
| ---------- | ----------------------------- | ---------------------- | ------------------------------ | -------- | ------------------- |
| IA-PERF-01 | Large JSON file handling      | 45MB JSON file         | Success with memory monitoring | P2       | Memory management   |
| IA-PERF-02 | Batch processing performance  | 500 files batch        | Completion within timeout      | P2       | Throughput testing  |
| IA-PERF-03 | Concurrent import stress      | 5 simultaneous imports | All complete without errors    | P2       | Concurrency testing |
| IA-PERF-04 | Memory leak detection         | 100 sequential imports | No memory growth               | P2       | Resource cleanup    |
| IA-PERF-05 | Template download performance | 4 template requests    | <500ms per request             | P2       | Response time       |

#### Category 5: Authentication & Authorization (3-4 tests) - Priority P2

| Test ID    | Scenario                | Input                       | Expected Output          | Priority | Notes               |
| ---------- | ----------------------- | --------------------------- | ------------------------ | -------- | ------------------- |
| IA-AUTH-01 | User context extraction | Valid session               | Correct userId extracted | P2       | ADR-042 validation  |
| IA-AUTH-02 | Fallback authentication | No session context          | Uses 'system' userId     | P2       | Dual auth pattern   |
| IA-AUTH-03 | Admin-only operations   | Non-admin user for rollback | 403 Forbidden            | P2       | Authorization check |
| IA-AUTH-04 | Audit trail logging     | Any import operation        | User ID logged correctly | P2       | Compliance          |

### 2.2 ImportQueueApi Test Scenarios (25-30 tests)

#### Category 1: Queue Management (8-10 tests) - Priority P1

| Test ID     | Scenario                  | Input                              | Expected Output                  | Priority | Notes               |
| ----------- | ------------------------- | ---------------------------------- | -------------------------------- | -------- | ------------------- |
| IQ-QUEUE-01 | Get queue status          | No parameters                      | Queue statistics, active imports | P1       | System status       |
| IQ-QUEUE-02 | Submit import to queue    | Valid configuration, priority      | Request ID, queue position       | P1       | Queue submission    |
| IQ-QUEUE-03 | Priority queue ordering   | 3 requests with priorities 1, 5, 9 | Executed in priority order       | P1       | Priority handling   |
| IQ-QUEUE-04 | Queue capacity check      | Queue at max capacity              | Request rejected or queued       | P1       | Resource limits     |
| IQ-QUEUE-05 | Concurrent import limit   | 4 simultaneous submissions         | Max 3 active, 1 queued           | P1       | Concurrency control |
| IQ-QUEUE-06 | Queue position tracking   | Submit request, check position     | Accurate position updates        | P1       | Progress tracking   |
| IQ-QUEUE-07 | Estimated wait time       | Request at position 5              | Realistic time estimate          | P2       | User experience     |
| IQ-QUEUE-08 | Queue statistics accuracy | Multiple operations                | Accurate counts and metrics      | P2       | Monitoring          |
| IQ-QUEUE-09 | Queue cleanup             | Completed requests                 | Old requests archived            | P2       | Maintenance         |
| IQ-QUEUE-10 | Queue overflow handling   | >100 requests queued               | Graceful degradation             | P2       | Stress testing      |

#### Category 2: State Management (7-9 tests) - Priority P1

| Test ID     | Scenario                   | Input                      | Expected Output           | Priority | Notes             |
| ----------- | -------------------------- | -------------------------- | ------------------------- | -------- | ----------------- |
| IQ-STATE-01 | Request state transition   | QUEUED → IN_PROGRESS       | State updated correctly   | P1       | State machine     |
| IQ-STATE-02 | Completion state update    | IN_PROGRESS → COMPLETED    | Final state persisted     | P1       | Terminal state    |
| IQ-STATE-03 | Failure state handling     | IN_PROGRESS → FAILED       | Error details captured    | P1       | Error state       |
| IQ-STATE-04 | Cancelled state            | QUEUED → CANCELLED         | Cleanup performed         | P1       | User cancellation |
| IQ-STATE-05 | Invalid state transition   | COMPLETED → QUEUED         | Transition rejected       | P1       | State validation  |
| IQ-STATE-06 | Status query by request ID | Valid request ID           | Current status returned   | P1       | Status tracking   |
| IQ-STATE-07 | Status history tracking    | Request lifecycle          | Complete audit trail      | P2       | Compliance        |
| IQ-STATE-08 | State persistence          | Server restart mid-request | State recovered correctly | P2       | Durability        |
| IQ-STATE-09 | Concurrent state updates   | 2 updates to same request  | Consistent final state    | P2       | Consistency       |

#### Category 3: Resource Locking (5-7 tests) - Priority P1

| Test ID    | Scenario                   | Input                        | Expected Output            | Priority | Notes               |
| ---------- | -------------------------- | ---------------------------- | -------------------------- | -------- | ------------------- |
| IQ-LOCK-01 | Acquire resource lock      | Request with resource needs  | Lock acquired successfully | P1       | Basic locking       |
| IQ-LOCK-02 | Lock contention handling   | 2 requests for same resource | Sequential execution       | P1       | Mutual exclusion    |
| IQ-LOCK-03 | Lock timeout               | Lock held >5 minutes         | Timeout warning/cleanup    | P1       | Deadlock prevention |
| IQ-LOCK-04 | Lock release on completion | Request completes            | Lock released immediately  | P1       | Resource cleanup    |
| IQ-LOCK-05 | Lock release on failure    | Request fails                | Lock released immediately  | P1       | Error cleanup       |
| IQ-LOCK-06 | Multi-resource locking     | Request needs 3 resources    | All locked or none         | P2       | Atomic locking      |
| IQ-LOCK-07 | Active locks monitoring    | No parameters                | List of active locks       | P2       | System visibility   |

#### Category 4: Schedule Management (4-6 tests) - Priority P2

| Test ID     | Scenario                   | Input                       | Expected Output             | Priority | Notes                |
| ----------- | -------------------------- | --------------------------- | --------------------------- | -------- | -------------------- |
| IQ-SCHED-01 | Create one-time schedule   | Name, time, configuration   | Schedule ID, next execution | P2       | Basic scheduling     |
| IQ-SCHED-02 | Create recurring schedule  | Cron pattern, configuration | Schedule with recurrence    | P2       | Advanced scheduling  |
| IQ-SCHED-03 | List user schedules        | User ID, active filter      | User's active schedules     | P2       | Schedule query       |
| IQ-SCHED-04 | Schedule execution trigger | Scheduled time reached      | Import queued automatically | P2       | Automation           |
| IQ-SCHED-05 | Schedule cancellation      | Valid schedule ID           | Schedule deactivated        | P2       | Lifecycle management |
| IQ-SCHED-06 | Schedule statistics        | No parameters               | Schedule metrics            | P2       | Monitoring           |

#### Category 5: Resource Monitoring (5-7 tests) - Priority P2

| Test ID   | Scenario                    | Input                   | Expected Output           | Priority | Notes                  |
| --------- | --------------------------- | ----------------------- | ------------------------- | -------- | ---------------------- |
| IQ-MON-01 | System resource status      | No parameters           | Memory, CPU, locks status | P2       | Health check           |
| IQ-MON-02 | Resource recommendations    | High load scenario      | Warning recommendations   | P2       | Proactive alerts       |
| IQ-MON-03 | Memory utilization tracking | Multiple imports        | Accurate memory metrics   | P2       | Resource tracking      |
| IQ-MON-04 | Active imports count        | No parameters           | Correct active count      | P2       | Concurrency monitoring |
| IQ-MON-05 | Resource threshold alerts   | >85% memory usage       | Alert triggered           | P2       | Threshold monitoring   |
| IQ-MON-06 | Historical resource usage   | Time range query        | Usage trends              | P2       | Capacity planning      |
| IQ-MON-07 | Resource leak detection     | Long-running monitoring | No resource leaks         | P2       | Quality assurance      |

---

## 3. Test Data Requirements & Mock Data Strategy

### 3.1 JSON Test Data Templates

```json
// Valid JSON Step Data (IA-CRUD-01)
{
  "source": "Migration_Alpha_Steps.json",
  "content": "{\"steps\": [{\"id\": \"S001\", \"name\": \"Database Backup\", \"description\": \"Perform full database backup\", \"sequence\": 1}]}"
}

// Batch JSON Files (IA-CRUD-02)
{
  "files": [
    {"filename": "steps_phase1.json", "content": "{...}"},
    {"filename": "steps_phase2.json", "content": "{...}"},
    {"filename": "steps_phase3.json", "content": "{...}"}
  ]
}

// Oversized Content (IA-VAL-02) - Security Testing
{
  "source": "large_file.json",
  "content": "<generate 55MB of JSON content programmatically>"
}

// Path Traversal Attack (IA-VAL-08) - Security Testing
{
  "source": "../../../etc/passwd.json",
  "content": "{\"malicious\": true}"
}
```

### 3.2 CSV Test Data Templates

```csv
# Teams Template (IA-CRUD-03)
team_id,team_name,team_description,team_lead,team_status
T001,Database Team,Core database operations,john.doe,ACTIVE
T002,Application Team,Application development,jane.smith,ACTIVE

# Users Template (IA-CRUD-04)
user_id,username,email,full_name,role,team_id,status
U001,john.doe,john.doe@company.com,John Doe,DBA,T001,ACTIVE
U002,jane.smith,jane.smith@company.com,Jane Smith,DEV,T002,ACTIVE

# Malformed CSV (IA-VAL-09)
team_id,team_name,incomplete_row
T001,Test Team
```

### 3.3 Queue Management Test Data

```json
// Queue Submission (IQ-QUEUE-02)
{
  "importType": "COMPLETE_IMPORT",
  "priority": 5,
  "userId": "test.user",
  "configuration": {
    "baseEntities": {
      "teams": "...CSV content...",
      "users": "...CSV content..."
    },
    "options": {
      "rollback_on_failure": true,
      "cleanup_staging": false
    }
  }
}

// Priority Queue Test (IQ-QUEUE-03)
[
  {"priority": 1, "userId": "urgent.user", "configuration": {...}},
  {"priority": 5, "userId": "normal.user", "configuration": {...}},
  {"priority": 9, "userId": "low.user", "configuration": {...}}
]

// Schedule Creation (IQ-SCHED-01)
{
  "scheduleName": "Daily Data Sync",
  "description": "Automated daily import",
  "scheduledTime": 1704067200000,
  "recurring": true,
  "recurringPattern": "0 2 * * *",
  "importConfiguration": {...},
  "userId": "scheduler.user",
  "priority": 3
}
```

### 3.4 Mock Data Generation Strategy

**MockSql Pattern** (TD-001 Self-Contained):

```groovy
static class EmbeddedMockSql {
    private static List<Map<String, Object>> executionHistory = []
    private static Map<UUID, Map> importBatches = [:]
    private static Map<UUID, Map> queueRequests = [:]

    List<Map> rows(String query, List params = []) {
        executionHistory << [query: query, params: params, timestamp: new Date()]

        // Pattern matching for different query types
        if (query.contains('tbl_import_batches')) {
            return mockImportBatchData(params)
        } else if (query.contains('tbl_import_queue_management')) {
            return mockQueueData(params)
        } else if (query.contains('tbl_import_resource_locks')) {
            return mockResourceLockData(params)
        }

        return []
    }

    private List<Map> mockImportBatchData(List params) {
        // Generate realistic import batch records
        return [
            [
                imb_id: UUID.randomUUID(),
                imb_source_identifier: 'Migration_Alpha_Steps.json',
                imb_import_type: 'JSON_STEP_DATA',
                imb_status: 'COMPLETED',
                imb_user_id: 'test.user',
                imb_created_date: new Timestamp(System.currentTimeMillis()),
                imb_statistics: '{"recordsImported": 150, "recordsFailed": 0}'
            ]
        ]
    }

    private List<Map> mockQueueData(List params) {
        // Generate realistic queue management records
        return [
            [
                iqm_request_id: UUID.randomUUID(),
                iqm_import_type: 'COMPLETE_IMPORT',
                iqm_status: 'QUEUED',
                iqm_priority: 5,
                iqm_queue_position: 2,
                iqm_estimated_wait_minutes: 15,
                iqm_submitted_by: 'test.user',
                iqm_submitted_at: new Timestamp(System.currentTimeMillis())
            ]
        ]
    }
}
```

### 3.5 Test Data Volume Recommendations

| Test Category      | Small Dataset        | Medium Dataset           | Large Dataset            |
| ------------------ | -------------------- | ------------------------ | ------------------------ |
| JSON Files         | 1-5 files, <1MB each | 10-50 files, 1-10MB each | 100+ files, 10-45MB each |
| CSV Records        | 10-50 rows           | 100-500 rows             | 1,000+ rows              |
| Batch Size         | 5-10 files           | 50-100 files             | 500-1,000 files          |
| Queue Depth        | 1-5 requests         | 10-20 requests           | 50-100 requests          |
| Concurrent Imports | 2-3 simultaneous     | 5-10 simultaneous        | 20+ simultaneous         |

---

## 4. Coverage Analysis Approach

### 4.1 Coverage Target: 90-95% API Layer

**Calculation Method**:

```
API Coverage = (Tested Code Lines / Total Executable Lines) × 100
Target: 90-95% per API
```

**ImportApi Coverage Breakdown**:

- Total Lines: 1,151
- Executable Lines (estimated): ~850 (excludes comments, blank lines)
- Target Tested Lines: 765-810 lines (90-95%)

**ImportQueueApi Coverage Breakdown**:

- Total Lines: 441
- Executable Lines (estimated): ~320
- Target Tested Lines: 288-304 lines (90-95%)

### 4.2 Critical Code Path Coverage

**Must Cover (100%)**:

1. Security validation methods (validateInputSize, validateBatchSize, validateFileExtension, validateSecurePath)
2. CRUD operations for all entity types (teams, users, applications, environments)
3. Queue submission and state management
4. Resource lock acquisition and release
5. Error handling with SQL state mapping
6. Authentication context extraction (ADR-042)

**Should Cover (90%)**:

1. Import history and statistics retrieval
2. Schedule management (create, list, cancel)
3. Resource monitoring and recommendations
4. Batch processing with mixed success/failure
5. Rollback operations

**Nice to Cover (80%)**:

1. Edge cases in template download
2. Performance optimization paths
3. Rare error scenarios

### 4.3 Coverage Measurement Commands

```bash
# Generate coverage report for ImportApi tests
npm run test:groovy:unit -- --filter="ImportApiComprehensiveTest.groovy" --coverage

# Generate coverage report for ImportQueueApi tests
npm run test:groovy:unit -- --filter="ImportQueueApiComprehensiveTest.groovy" --coverage

# Combined coverage report
npm run test:groovy:coverage:phase3b -- --day1-2
```

### 4.4 Coverage Gaps Analysis

**Expected Gaps (acceptable <10%)**:

1. Database failure recovery paths (difficult to mock reliably)
2. Complex concurrent scenarios (timing-dependent)
3. External system integration (MailHog, Confluence session)
4. Performance edge cases (memory exhaustion scenarios)

**Mitigation Strategy for Gaps**:

- Document uncovered paths in test comments
- Add integration tests for database failure scenarios
- Use performance tests for concurrent stress testing
- Manual testing for external integrations

---

## 5. Risk Identification & Mitigation

### 5.1 Testing Risks

| Risk                                | Probability | Impact | Mitigation Strategy                                                         |
| ----------------------------------- | ----------- | ------ | --------------------------------------------------------------------------- |
| **Security validation complexity**  | High        | High   | Prioritize P1 security tests first; leverage existing US-034 security fixes |
| **Concurrent coordination testing** | High        | Medium | Use embedded MockSql with thread-safe structures; test sequential first     |
| **Database-backed queue mocking**   | Medium      | High   | Implement comprehensive MockSql patterns for 7 new tables                   |
| **Large data generation**           | Medium      | Medium | Pre-generate test data files; use memory-efficient streaming                |
| **Test data setup complexity**      | Medium      | Low    | Reuse TD-013 data builder patterns; create shared fixtures                  |
| **Mock state management**           | Medium      | Medium | Implement state tracking in EmbeddedMockSql; validate state transitions     |
| **Type casting errors**             | Low         | High   | Follow ADR-031 explicitly; code review type casts                           |
| **SQL state mapping**               | Low         | Medium | Reference existing InstructionsApiComprehensiveTest patterns                |

### 5.2 Operational Risks

| Risk                                       | Probability | Impact | Mitigation Strategy                                          |
| ------------------------------------------ | ----------- | ------ | ------------------------------------------------------------ |
| **Test execution time exceeds 2 hours**    | Medium      | Medium | Parallelize independent tests; optimize mock data generation |
| **Memory usage exceeds 512MB**             | Low         | High   | Monitor memory per test; implement cleanup in tearDown()     |
| **Compilation errors due to type casting** | Medium      | Medium | Incremental compilation testing; early code review           |
| **Mock SQL behavior inconsistency**        | Low         | High   | Comprehensive mock validation; test mock behavior separately |

### 5.3 Risk Mitigation Timeline

**Day 1 Morning** (4 hours):

- ✅ Implement security validation tests (IA-VAL-01 through IA-VAL-12) - **P1 Critical**
- ✅ Validate MockSql patterns for import batches
- ✅ Establish baseline test structure

**Day 1 Afternoon** (4 hours):

- ✅ Implement CRUD operation tests (IA-CRUD-01 through IA-CRUD-10)
- ✅ Validate type casting compliance (ADR-031)
- ✅ Run initial test suite (target: 20-25 tests passing)

**Day 2 Morning** (4 hours):

- ✅ Implement queue management tests (IQ-QUEUE-01 through IQ-QUEUE-10)
- ✅ Implement state management tests (IQ-STATE-01 through IQ-STATE-09)
- ✅ Validate concurrent coordination patterns

**Day 2 Afternoon** (4 hours):

- ✅ Implement error recovery and performance tests
- ✅ Complete resource locking tests
- ✅ Run full test suite (target: 55-65 tests passing)
- ✅ Coverage analysis and gap documentation

---

## 6. Quality Gates for Day 1-2 Exit Criteria

### 6.1 Quantitative Metrics

| Metric               | Target        | Measurement Method                  | Pass Criteria      |
| -------------------- | ------------- | ----------------------------------- | ------------------ |
| **Test Count**       | 55-65 tests   | Count passing tests in test suite   | ≥55 tests passing  |
| **Test Pass Rate**   | 100%          | (Passing tests / Total tests) × 100 | 100% pass rate     |
| **Coverage**         | 90-95%        | Code coverage analysis tool         | ≥90% coverage      |
| **Compilation Time** | <10s per file | Maven/Gradle build time             | <10s per test file |
| **Execution Time**   | <5 min total  | Test suite runtime                  | <5 minutes total   |
| **Memory Usage**     | <512MB peak   | JVM monitoring                      | <512MB peak usage  |

### 6.2 Qualitative Metrics

| Metric                  | Target       | Validation Method                   | Pass Criteria              |
| ----------------------- | ------------ | ----------------------------------- | -------------------------- |
| **ADR-031 Compliance**  | 100%         | Code review for explicit casting    | All type casts explicit    |
| **TD-001 Pattern**      | 100%         | Verify self-contained architecture  | Zero external dependencies |
| **Security Testing**    | All P1 tests | Validate all 4 security validations | All security tests pass    |
| **SQL State Mapping**   | 100%         | Verify 23505→409, 23503→400         | Correct HTTP status codes  |
| **Import Workflow**     | Complete     | End-to-end import validation        | Full workflow validated    |
| **Queue State Machine** | Validated    | All state transitions tested        | State machine validated    |

### 6.3 Exit Gate Checklist

**Day 1 Exit (End of Day 1)**:

- [ ] 30-35 tests passing (IA-CRUD + IA-VAL + IA-ERR)
- [ ] Security validation tests complete (P1 critical)
- [ ] ImportApi CRUD operations validated
- [ ] Error recovery patterns tested
- [ ] Code review completed for Day 1 tests
- [ ] Zero compilation errors
- [ ] ADR-031 compliance validated

**Day 2 Exit (End of Day 2)**:

- [ ] 55-65 tests passing (100% of target)
- [ ] 100% test pass rate (zero failures)
- [ ] Queue management validated (IQ-QUEUE)
- [ ] State management validated (IQ-STATE)
- [ ] Resource locking validated (IQ-LOCK)
- [ ] Performance benchmarks established
- [ ] Coverage analysis completed (90-95%)
- [ ] Code review completed for Day 2 tests
- [ ] Documentation updated with test patterns
- [ ] Integration with CI/CD validated

### 6.4 Go/No-Go Decision Criteria

**GO** (Proceed to Day 3-4):

- All quantitative metrics meet targets
- All P1 tests passing
- Critical security tests validated
- Code review sign-off obtained
- No blocking issues identified

**NO-GO** (Extend Day 1-2):

- Test pass rate <95%
- Coverage <85%
- Critical P1 tests failing
- Compilation errors present
- Memory leaks detected

---

## 7. Test Implementation Guidelines

### 7.1 Test File Structure (TD-001 Compliance)

```groovy
package umig.tests.unit

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import java.util.UUID
import java.sql.Timestamp
import org.slf4j.Logger
import org.slf4j.LoggerFactory

/**
 * ImportApi Comprehensive Test Suite - TD-014 Week 1 Day 1-2
 *
 * Coverage: 90-95% of ImportApi.groovy (1,151 lines)
 * Test Count: 30-35 comprehensive tests
 * Pattern: TD-001 Self-Contained Architecture
 * Type Safety: ADR-031 Explicit Casting
 *
 * Test Categories:
 * 1. CRUD Operations (8-10 tests)
 * 2. Data Validation (10-12 tests) - Security Critical
 * 3. Error Recovery (5-7 tests)
 * 4. Performance & Large Data (4-5 tests)
 * 5. Authentication & Authorization (3-4 tests)
 */
class ImportApiComprehensiveTest {

    // Logger for test execution tracking
    private static final Logger logger = LoggerFactory.getLogger(ImportApiComprehensiveTest.class)

    // Test configuration constants (ADR-031 explicit typing)
    private static final int MAX_REQUEST_SIZE = 50 * 1024 * 1024 // 50MB
    private static final int MAX_BATCH_SIZE = 1000
    private static final List<String> ALLOWED_FILE_EXTENSIONS = ['json', 'csv', 'txt']

    // ====== TD-001 SELF-CONTAINED ARCHITECTURE - EMBEDDED DEPENDENCIES ======

    /**
     * Embedded MockSql - Zero external dependencies
     * Implements realistic SQL behavior with state tracking
     */
    static class EmbeddedMockSql {
        private static List<Map<String, Object>> executionHistory = []
        private static Map<UUID, Map> importBatches = [:]
        private static Map<UUID, Map> importItems = [:]
        private static Map<String, Map> userData = [:]

        // SQL query execution with pattern matching
        List<Map> rows(String query, List params = []) {
            executionHistory << [
                query: query,
                params: params,
                timestamp: new Timestamp(System.currentTimeMillis()),
                type: 'SELECT'
            ]

            // Pattern matching for different table queries
            if (query.contains('tbl_import_batches')) {
                return mockImportBatchesQuery(query, params)
            } else if (query.contains('tbl_import_queue_management')) {
                return mockQueueManagementQuery(query, params)
            } else if (query.contains('tbl_import_resource_locks')) {
                return mockResourceLocksQuery(query, params)
            } else if (query.contains('stg_steps')) {
                return mockStagingStepsQuery(query, params)
            }

            return []
        }

        // SQL insert/update/delete execution
        int executeUpdate(String query, List params = []) {
            executionHistory << [
                query: query,
                params: params,
                timestamp: new Timestamp(System.currentTimeMillis()),
                type: determineQueryType(query)
            ]

            // Handle different DML operations
            if (query.toUpperCase().contains('INSERT')) {
                return handleInsert(query, params)
            } else if (query.toUpperCase().contains('UPDATE')) {
                return handleUpdate(query, params)
            } else if (query.toUpperCase().contains('DELETE')) {
                return handleDelete(query, params)
            }

            return 1 // Default success
        }

        // Transaction support
        void withTransaction(Closure closure) {
            try {
                closure.call()
            } catch (Exception e) {
                logger.error("Transaction rolled back: ${e.message}")
                throw e
            }
        }

        // Mock data generators
        private List<Map> mockImportBatchesQuery(String query, List params) {
            // Generate realistic import batch records
            if (params && params[0] instanceof UUID) {
                UUID batchId = params[0] as UUID
                Map batch = importBatches[batchId]
                return batch ? [batch] : []
            }

            // Return all batches for history queries
            return importBatches.values().toList()
        }

        private List<Map> mockQueueManagementQuery(String query, List params) {
            // Generate realistic queue management records
            return [
                [
                    iqm_request_id: UUID.randomUUID(),
                    iqm_import_type: 'COMPLETE_IMPORT',
                    iqm_status: 'QUEUED',
                    iqm_priority: 5,
                    iqm_queue_position: 1,
                    iqm_estimated_wait_minutes: 10,
                    iqm_submitted_by: 'test.user',
                    iqm_submitted_at: new Timestamp(System.currentTimeMillis())
                ]
            ]
        }

        private int handleInsert(String query, List params) {
            // Simulate SQL constraint violations for testing
            if (query.contains('tbl_plans_master')) {
                String planName = params[1] as String
                if (planName == 'DUPLICATE_PLAN') {
                    throw new java.sql.SQLException("Duplicate key", "23505")
                }
            }

            // Store batch data for retrieval
            if (query.contains('tbl_import_batches')) {
                UUID batchId = params[0] as UUID
                importBatches[batchId] = [
                    imb_id: batchId,
                    imb_source_identifier: params[1],
                    imb_import_type: params[2],
                    imb_user_id: params[3],
                    imb_status: 'PENDING',
                    imb_created_date: new Timestamp(System.currentTimeMillis())
                ]
            }

            return 1 // Success
        }

        // State cleanup
        static void clearExecutionHistory() {
            executionHistory.clear()
            importBatches.clear()
            importItems.clear()
            userData.clear()
        }

        // Query type determination
        private String determineQueryType(String query) {
            String upperQuery = query.toUpperCase().trim()
            if (upperQuery.startsWith('INSERT')) return 'INSERT'
            if (upperQuery.startsWith('UPDATE')) return 'UPDATE'
            if (upperQuery.startsWith('DELETE')) return 'DELETE'
            return 'UNKNOWN'
        }
    }

    /**
     * Embedded DatabaseUtil - Provides DatabaseUtil.withSql pattern
     */
    static class DatabaseUtil {
        static Object withSql(Closure closure) {
            def mockSql = new EmbeddedMockSql()
            return closure.call(mockSql)
        }
    }

    /**
     * Embedded UserService - Provides authentication context (ADR-042)
     */
    static class UserService {
        static Map getCurrentUserContext() {
            return [
                confluenceUsername: 'test.user',
                confluenceUserKey: 'test-user-key',
                isAdmin: true
            ]
        }
    }

    /**
     * Embedded ImportService Mock
     */
    static class ImportService {
        def importRepository = new ImportRepository()

        Map importJsonData(String content, String source, String userId) {
            return [
                success: true,
                batchId: UUID.randomUUID().toString(),
                recordsImported: 150,
                recordsFailed: 0,
                source: source,
                userId: userId
            ]
        }

        Map importBatch(List<Map> files, String userId) {
            return [
                successCount: files.size(),
                failureCount: 0,
                results: files.collect { file ->
                    [
                        success: true,
                        filename: file.filename,
                        recordsImported: 50
                    ]
                }
            ]
        }
    }

    // Test lifecycle management
    private ImportApiMock apiMock

    void setUp() {
        apiMock = new ImportApiMock() as ImportApiMock
        EmbeddedMockSql.clearExecutionHistory()
        logger.info("Test setup completed")
    }

    void tearDown() {
        EmbeddedMockSql.clearExecutionHistory()
        logger.info("Test teardown completed")
    }

    // ====== TEST IMPLEMENTATIONS ======

    /**
     * IA-CRUD-01: Import single JSON file - Happy path validation
     */
    void testImportSingleJsonFile() {
        // Arrange
        Map requestData = [
            source: 'Migration_Alpha_Steps.json',
            content: '{"steps": [{"id": "S001", "name": "Database Backup"}]}'
        ]
        String body = new JsonBuilder(requestData).toString()

        // Act
        Map response = apiMock.importJsonEndpoint(body)

        // Assert
        assert response.success as Boolean
        assert response.batchId != null
        assert (response.recordsImported as Integer) == 150
        logger.info("IA-CRUD-01: PASSED - Single JSON import successful")
    }

    /**
     * IA-VAL-02: Input size validation - Exceeds 50MB limit (CVSS 7.5)
     */
    void testInputSizeExceedsLimit() {
        // Arrange - Generate 55MB of content
        String largeContent = 'x' * (55 * 1024 * 1024)
        Map requestData = [source: 'large.json', content: largeContent]
        String body = new JsonBuilder(requestData).toString()

        // Act
        Map response = apiMock.importJsonEndpoint(body)

        // Assert
        assert !(response.success as Boolean)
        assert response.error.toString().contains('exceeds maximum')
        assert (response.cvssScore as Double) == 7.5
        assert response.threatLevel == 'HIGH'
        logger.info("IA-VAL-02: PASSED - Input size validation enforced")
    }

    /**
     * IA-VAL-08: Path traversal prevention - Attack blocked (CVSS 9.1)
     */
    void testPathTraversalAttackBlocked() {
        // Arrange - Malicious path traversal attempt
        String maliciousPath = '../../../etc/passwd'

        // Act
        Map validationResult = apiMock.validateSecurePath(maliciousPath)

        // Assert
        assert !(validationResult.valid as Boolean)
        assert validationResult.error.toString().contains('Invalid characters')
        assert (validationResult.cvssScore as Double) == 9.1
        assert validationResult.threatLevel == 'CRITICAL'
        logger.info("IA-VAL-08: PASSED - Path traversal attack blocked")
    }

    // ... Additional 27-32 test methods following same pattern ...

    /**
     * Main test execution method
     */
    static void main(String[] args) {
        def test = new ImportApiComprehensiveTest()

        println "=".repeat(80)
        println "TD-014 Week 1 Day 1-2: ImportApi Comprehensive Test Suite"
        println "Target: 30-35 tests | Coverage: 90-95%"
        println "=".repeat(80)

        // Execute all tests
        int passed = 0
        int failed = 0
        List<String> failedTests = []

        test.metaClass.methods.findAll { it.name.startsWith('test') }.each { method ->
            try {
                test.setUp()
                method.invoke(test)
                passed++
                println "✓ ${method.name} PASSED"
            } catch (Exception e) {
                failed++
                failedTests << method.name
                println "✗ ${method.name} FAILED: ${e.message}"
            } finally {
                test.tearDown()
            }
        }

        // Test summary
        println "\n" + "=".repeat(80)
        println "TEST SUMMARY"
        println "=".repeat(80)
        println "Total Tests: ${passed + failed}"
        println "Passed: ${passed}"
        println "Failed: ${failed}"
        println "Pass Rate: ${String.format('%.1f', (passed / (passed + failed)) * 100)}%"

        if (failed > 0) {
            println "\nFailed Tests:"
            failedTests.each { println "  - ${it}" }
        }

        // Exit with appropriate code
        System.exit(failed > 0 ? 1 : 0)
    }
}
```

### 7.2 Type Safety Checklist (ADR-031)

**Mandatory Explicit Casts**:

```groovy
// ✅ CORRECT - Explicit casting
UUID batchId = UUID.fromString(params[0] as String)
Integer priority = Integer.parseInt(queryParam as String)
String userId = (requestData.userId as String) ?: 'system'
Boolean success = result.success as Boolean

// ❌ WRONG - Implicit casting (will cause compilation errors)
UUID batchId = UUID.fromString(params[0])
Integer priority = Integer.parseInt(queryParam)
```

### 7.3 SQL State Mapping Validation

**Required Error Scenarios**:

```groovy
// 23505 → 409 Conflict (Unique constraint violation)
void testDuplicatePlanName() {
    // Trigger duplicate key error
    Map result = apiMock.createMasterPlan('DUPLICATE_PLAN', 'Test')

    assert result.httpStatus == 409
    assert result.error.contains('already exists')
}

// 23503 → 400 Bad Request (Foreign key violation)
void testForeignKeyViolation() {
    // Reference non-existent entity
    Map result = apiMock.createWithInvalidFK('INVALID_FK')

    assert result.httpStatus == 400
    assert result.error.contains('constraint violation')
}
```

---

## 8. Performance Benchmarks

### 8.1 Target Performance Metrics

| Operation                 | Target Response Time | Max Memory | Target Throughput    |
| ------------------------- | -------------------- | ---------- | -------------------- |
| Single JSON Import        | <2 seconds           | <50MB      | N/A                  |
| Batch Import (100 files)  | <30 seconds          | <200MB     | >3 files/second      |
| CSV Import (1000 rows)    | <5 seconds           | <30MB      | >200 rows/second     |
| Queue Submission          | <500ms               | <10MB      | >20 requests/second  |
| Queue Status Query        | <200ms               | <5MB       | >50 queries/second   |
| Resource Lock Acquisition | <100ms               | <1MB       | >100 locks/second    |
| Template Download         | <500ms               | <5MB       | >10 downloads/second |

### 8.2 Performance Test Implementation

```groovy
/**
 * IA-PERF-01: Large JSON file handling - 45MB JSON file
 */
void testLargeJsonFilePerformance() {
    // Arrange
    long startTime = System.currentTimeMillis()
    long initialMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()

    // Generate 45MB JSON content
    String largeContent = generateLargeJsonContent(45 * 1024 * 1024)
    Map requestData = [source: 'large.json', content: largeContent]
    String body = new JsonBuilder(requestData).toString()

    // Act
    Map response = apiMock.importJsonEndpoint(body)

    long endTime = System.currentTimeMillis()
    long finalMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()

    // Assert
    assert response.success as Boolean
    long duration = endTime - startTime
    long memoryUsed = finalMemory - initialMemory

    // Performance assertions
    assert duration < 10000 // <10 seconds
    assert memoryUsed < (200 * 1024 * 1024) // <200MB

    logger.info("IA-PERF-01: Duration: ${duration}ms, Memory: ${memoryUsed / (1024 * 1024)}MB")
}

/**
 * IA-PERF-03: Concurrent import stress - 5 simultaneous imports
 */
void testConcurrentImportStress() {
    // Arrange
    List<Thread> threads = []
    List<Map> results = []

    // Act - Submit 5 concurrent imports
    (1..5).each { i ->
        Thread thread = Thread.start {
            Map requestData = [
                source: "concurrent_${i}.json",
                content: '{"steps": []}'
            ]
            String body = new JsonBuilder(requestData).toString()
            Map response = apiMock.importJsonEndpoint(body)
            synchronized(results) {
                results << response
            }
        }
        threads << thread
    }

    // Wait for all threads to complete (max 60 seconds)
    threads.each { it.join(60000) }

    // Assert
    assert results.size() == 5
    assert results.every { (it.success as Boolean) }

    logger.info("IA-PERF-03: All 5 concurrent imports completed successfully")
}
```

### 8.3 Memory Leak Detection

```groovy
void testMemoryLeakDetection() {
    // Baseline memory
    System.gc()
    Thread.sleep(1000)
    long baselineMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()

    // Execute 100 sequential imports
    (1..100).each { i ->
        Map requestData = [source: "test_${i}.json", content: '{"steps": []}']
        String body = new JsonBuilder(requestData).toString()
        apiMock.importJsonEndpoint(body)
    }

    // Check final memory
    System.gc()
    Thread.sleep(1000)
    long finalMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()

    // Memory growth should be minimal (<10%)
    double memoryGrowth = ((finalMemory - baselineMemory) / baselineMemory) * 100
    assert memoryGrowth < 10.0

    logger.info("Memory growth after 100 imports: ${String.format('%.2f', memoryGrowth)}%")
}
```

---

## 9. Success Metrics & Reporting

### 9.1 Daily Progress Tracking

**Day 1 Progress Report Template**:

```
TD-014 Week 1 Day 1 Progress Report
===================================
Date: <date>
Developer: <name>
Status: ON TRACK | AT RISK | BLOCKED

Test Implementation Status:
✓ IA-CRUD-01 through IA-CRUD-10: <count> tests implemented
✓ IA-VAL-01 through IA-VAL-12: <count> tests implemented
✓ IA-ERR-01 through IA-ERR-07: <count> tests implemented
⏳ IA-PERF-01 through IA-PERF-05: <count> tests pending
⏳ IA-AUTH-01 through IA-AUTH-04: <count> tests pending

Total Tests Implemented: <count> / 35
Pass Rate: <percentage>%
Coverage Achieved: <percentage>%

Blockers:
- <blocker 1>
- <blocker 2>

Next Steps:
- <action 1>
- <action 2>
```

### 9.2 Day 2 Exit Report Template

```
TD-014 Week 1 Day 1-2 Exit Report
=================================
Completion Date: <date>
Team: <names>
Status: ✅ PASSED | ❌ FAILED

Quantitative Metrics:
✓ Test Count: <actual> / 65 target (PASS/FAIL)
✓ Pass Rate: <percentage>% / 100% target (PASS/FAIL)
✓ Coverage: <percentage>% / 90-95% target (PASS/FAIL)
✓ Compilation Time: <seconds>s / 10s per file (PASS/FAIL)
✓ Execution Time: <minutes>m / 5m total (PASS/FAIL)
✓ Memory Usage: <MB>MB / 512MB peak (PASS/FAIL)

Qualitative Metrics:
✓ ADR-031 Compliance: 100% (VERIFIED)
✓ TD-001 Pattern: 100% (VERIFIED)
✓ Security Testing: All P1 tests passing (VERIFIED)
✓ SQL State Mapping: Correct HTTP status codes (VERIFIED)
✓ Import Workflow: Complete validation (VERIFIED)
✓ Queue State Machine: All transitions tested (VERIFIED)

Test Breakdown:
ImportApi Tests:
  - CRUD Operations: <count> tests
  - Data Validation: <count> tests
  - Error Recovery: <count> tests
  - Performance: <count> tests
  - Authentication: <count> tests
  Total ImportApi: <count> tests

ImportQueueApi Tests:
  - Queue Management: <count> tests
  - State Management: <count> tests
  - Resource Locking: <count> tests
  - Schedule Management: <count> tests
  - Resource Monitoring: <count> tests
  Total ImportQueueApi: <count> tests

Coverage Analysis:
ImportApi: <percentage>% (target: 90-95%)
ImportQueueApi: <percentage>% (target: 90-95%)
Combined: <percentage>% (target: 90-95%)

Coverage Gaps (Acceptable <10%):
- <gap 1>: <reason>
- <gap 2>: <reason>

Performance Benchmarks:
- Single JSON Import: <time>ms (target: <2s)
- Batch Import (100 files): <time>s (target: <30s)
- Queue Submission: <time>ms (target: <500ms)
- Resource Lock: <time>ms (target: <100ms)

Code Review:
✓ Day 1 Tests: Reviewed by <reviewer> on <date>
✓ Day 2 Tests: Reviewed by <reviewer> on <date>
✓ ADR-031 Validation: Completed
✓ Security Review: Completed

Documentation:
✓ Test patterns documented
✓ Coverage gaps documented
✓ Performance benchmarks documented
✓ Known issues documented

Decision: GO / NO-GO for Day 3-4
Reason: <justification>

Approved By: <name>, <date>
```

### 9.3 Success Criteria Validation

**Automated Validation Script**:

```bash
#!/bin/bash
# TD-014 Week 1 Day 1-2 Success Validation

echo "TD-014 Week 1 Day 1-2 Success Validation"
echo "========================================"

# Run tests and capture results
npm run test:groovy:unit -- --filter="ImportApiComprehensiveTest.groovy" > import_api_results.txt
npm run test:groovy:unit -- --filter="ImportQueueApiComprehensiveTest.groovy" > import_queue_results.txt

# Parse test counts
IMPORT_API_TESTS=$(grep -c "PASSED" import_api_results.txt)
IMPORT_QUEUE_TESTS=$(grep -c "PASSED" import_queue_results.txt)
TOTAL_TESTS=$((IMPORT_API_TESTS + IMPORT_QUEUE_TESTS))

echo "Total Tests: $TOTAL_TESTS"
echo "Target: 55-65 tests"

# Validate test count
if [ $TOTAL_TESTS -ge 55 ] && [ $TOTAL_TESTS -le 65 ]; then
    echo "✓ Test count: PASSED"
else
    echo "✗ Test count: FAILED (actual: $TOTAL_TESTS, expected: 55-65)"
    exit 1
fi

# Check pass rate
FAILED_TESTS=$(grep -c "FAILED" import_api_results.txt import_queue_results.txt)
if [ $FAILED_TESTS -eq 0 ]; then
    echo "✓ Pass rate: 100% PASSED"
else
    echo "✗ Pass rate: FAILED ($FAILED_TESTS failures detected)"
    exit 1
fi

# Generate coverage report
npm run test:groovy:coverage:phase3b -- --day1-2 > coverage_report.txt
COVERAGE=$(grep "Total Coverage:" coverage_report.txt | awk '{print $3}' | sed 's/%//')

echo "Coverage: ${COVERAGE}%"
echo "Target: 90-95%"

if (( $(echo "$COVERAGE >= 90" | bc -l) )) && (( $(echo "$COVERAGE <= 95" | bc -l) )); then
    echo "✓ Coverage: PASSED"
else
    echo "✗ Coverage: FAILED (actual: ${COVERAGE}%, expected: 90-95%)"
    exit 1
fi

echo ""
echo "========================================"
echo "✓ ALL SUCCESS CRITERIA MET"
echo "========================================"
exit 0
```

---

## 10. Appendix

### A. Test Execution Commands

```bash
# Run ImportApi tests only
npm run test:groovy:unit -- --filter="ImportApiComprehensiveTest.groovy"

# Run ImportQueueApi tests only
npm run test:groovy:unit -- --filter="ImportQueueApiComprehensiveTest.groovy"

# Run both Day 1-2 tests
npm run test:groovy:unit -- --filter="Import*ApiComprehensiveTest.groovy"

# Run with coverage
npm run test:groovy:coverage:phase3b -- --day1-2

# Run specific test method
groovy src/groovy/umig/tests/unit/ImportApiComprehensiveTest.groovy testImportSingleJsonFile

# Run with verbose logging
npm run test:groovy:unit -- --filter="ImportApiComprehensiveTest.groovy" --verbose

# Run with performance profiling
npm run test:groovy:unit -- --filter="ImportApiComprehensiveTest.groovy" --profile
```

### B. Debugging Commands

```bash
# Check test compilation
groovy -cp "lib/*" src/groovy/umig/tests/unit/ImportApiComprehensiveTest.groovy --compile-only

# Run single test with stack trace
groovy src/groovy/umig/tests/unit/ImportApiComprehensiveTest.groovy testImportSingleJsonFile --stacktrace

# Memory profiling
groovy -Xmx1024m -XX:+PrintGCDetails src/groovy/umig/tests/unit/ImportApiComprehensiveTest.groovy

# Type checking validation
groovy --configscript=groovy-static-config.groovy src/groovy/umig/tests/unit/ImportApiComprehensiveTest.groovy
```

### C. Reference Documentation

**TD-014 Main Story**:

- `/docs/roadmap/sprint8/TD-014-groovy-test-coverage-enterprise.md`

**Related Stories**:

- **US-034**: Data Import Strategy (Database-backed coordination)
- **TD-013**: Testing Infrastructure Phase 3A (Proven patterns)
- **TD-001**: Self-Contained Test Architecture (35% compilation improvement)

**Architecture Decision Records**:

- **ADR-031**: Explicit Type Casting (MANDATORY)
- **ADR-036**: Pure Groovy Testing (No external frameworks)
- **ADR-042**: Dual Authentication (UserService fallback)

**Test Examples**:

- `/src/groovy/umig/tests/unit/InstructionsApiComprehensiveTest.groovy` (SQL state mapping)
- `/src/groovy/umig/tests/unit/StepRepositoryComprehensiveTest.groovy` (TD-001 pattern)

### D. Security CVSS Scores Reference

| Validation Type           | CVSS Score | Severity | Impact                   |
| ------------------------- | ---------- | -------- | ------------------------ |
| Input Size Validation     | 7.5        | HIGH     | Memory exhaustion DoS    |
| Batch Size Validation     | 6.5        | MEDIUM   | Resource exhaustion      |
| File Extension Validation | 8.8        | HIGH     | Malicious file upload    |
| Path Traversal Validation | 9.1        | CRITICAL | Unauthorized file access |

**CVSS 3.1 Base Score Formula**:

```
CVSS = f(AV, AC, PR, UI, S, C, I, A)
Where:
  AV = Attack Vector (Network/Adjacent/Local/Physical)
  AC = Attack Complexity (Low/High)
  PR = Privileges Required (None/Low/High)
  UI = User Interaction (None/Required)
  S  = Scope (Unchanged/Changed)
  C  = Confidentiality Impact (None/Low/High)
  I  = Integrity Impact (None/Low/High)
  A  = Availability Impact (None/Low/High)
```

### E. Contact Information

**TD-014 Team**:

- **QA Lead**: <name>
- **Tech Lead**: <name>
- **Architecture Review**: <name>
- **Security Review**: <name>

**Escalation Path**:

1. Development Team → Tech Lead
2. Tech Lead → Architecture Team
3. Architecture Team → Engineering Manager

---

**Document Status**: ✅ COMPLETE
**Review Date**: 2025-09-30
**Next Review**: End of Day 2 (Implementation complete)
**Approval**: Pending Sprint 8 Planning

---

_This comprehensive QA strategy provides complete guidance for TD-014 Week 1 Day 1-2 Import Infrastructure Testing, ensuring enterprise-grade test coverage with 100% semantic preservation and production-ready quality standards._
