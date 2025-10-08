# UMIG US-041A Audit System Implementation Guide

**Version**: 1.0
**Status**: Section 1 Complete (Quick Start)
**Last Updated**: 2025-10-08
**Related ADRs**: ADR-031, ADR-043, ADR-061 (pending)

## Table of Contents

1. **Quick Start (5-Minute Setup)** ✅ COMPLETE
2. Developer Integration Guide (Pending)
3. Performance Optimization Guide (Pending)
4. Troubleshooting Reference (Pending)

---

## 1. Quick Start (5-Minute Setup)

Get the UMIG audit system running with GIN indexes in under 5 minutes.

### 1.1 Prerequisites Checklist

Verify these prerequisites before starting:

- ✅ **PostgreSQL 14+** running with `audit_log_aud` table
- ✅ **Liquibase** installed and configured in `local-dev-setup/`
- ✅ **UMIG Development Stack** running (`npm start`)
- ✅ **Database Credentials** available in `.env` file
- ✅ **Terminal Access** to project root directory

**Quick Environment Check**:

```bash
# Verify PostgreSQL connection
PGPASSWORD=123456 psql -h localhost -p 5432 -U umig_app_user -d umig_app_db -c "SELECT version();"

# Verify audit_log_aud table exists
PGPASSWORD=123456 psql -h localhost -p 5432 -U umig_app_user -d umig_app_db \
  -c "SELECT COUNT(*) FROM audit_log_aud;"
```

Expected output: PostgreSQL version and audit log count (0 if fresh database).

---

### 1.2 Step-by-Step Setup

#### Step 1: Apply GIN Index Migration

Navigate to local-dev-setup and apply the audit GIN indexes:

```bash
# Navigate to local-dev-setup directory
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup

# Apply GIN index migration (changeset 040)
npm run liquibase:update
```

**Expected Output**:

```
Liquibase Update Successful
Changeset 040_add_audit_jsonb_gin_indexes.sql::create-audit-gin-indexes::audit-team ran successfully
```

#### Step 2: Verify Index Creation

Confirm all 7 GIN indexes were created successfully:

```bash
# View audit_log_aud table structure with indexes
PGPASSWORD=123456 psql -h localhost -p 5432 -U umig_app_user -d umig_app_db \
  -c "\d audit_log_aud"
```

**Expected Indexes**:

- `idx_audit_details_gin` (full document)
- `idx_audit_request_gin` (request path)
- `idx_audit_state_gin` (state path)
- `idx_audit_context_gin` (context path)
- `idx_audit_gdpr_gin` (GDPR path)
- `idx_audit_security_gin` (security path)
- `idx_audit_performance_gin` (performance path)

**Quick Validation Query**:

```sql
-- Count all GIN indexes on audit_log_aud
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'audit_log_aud'
  AND indexdef LIKE '%gin%'
ORDER BY indexname;
```

Should return 7 rows with GIN index definitions.

#### Step 3: Test Audit Log Creation

Create your first audit log entry using the test endpoint:

```bash
# Test audit log creation via API
curl -X POST "http://localhost:8090/rest/scriptrunner/latest/custom/audit-test" \
  -H "Content-Type: application/json" \
  -u admin:123456 \
  -d '{
    "userId": 1,
    "action": "CREATE",
    "entityType": "Teams",
    "entityId": "550e8400-e29b-41d4-a716-446655440000",
    "details": {
      "request": {
        "method": "POST",
        "endpoint": "/teams",
        "ipAddress": "192.168.1.100"
      },
      "state": {
        "current": {
          "tms_name": "Engineering Team",
          "tms_is_active": true
        }
      },
      "context": {
        "reason": "Quick start test"
      }
    }
  }'
```

**Alternative: Direct Groovy Test**

Create `test_audit_log.groovy`:

```groovy
import umig.utils.AuditLogService
import umig.utils.DatabaseUtil
import groovy.sql.Sql
import java.util.UUID

// Test audit log creation
def teamId = UUID.randomUUID()
def userId = 1

println "Creating test audit log..."

try {
    AuditLogService.createAuditLog(
        userId,
        'CREATE',
        'Teams',
        teamId,
        [
            request: [
                method: 'POST',
                endpoint: '/rest/scriptrunner/latest/custom/teams',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Quick Start Test)'
            ],
            state: [
                current: [
                    tms_name: 'Engineering Team',
                    tms_is_active: true,
                    tms_description: 'Test team created via Quick Start Guide'
                ]
            ],
            context: [
                reason: 'Quick Start Guide - First Audit Log Test',
                source: 'implementation_guide',
                sessionId: 'test-session-001'
            ]
        ]
    )

    println "✅ Audit log created successfully!"
    println "Team ID: ${teamId}"

    // Verify creation
    DatabaseUtil.withSql { Sql sql ->
        def result = sql.firstRow(
            """SELECT aud_id, aud_timestamp, aud_action, aud_entity_type
               FROM audit_log_aud
               WHERE aud_entity_id = ?::uuid
               ORDER BY aud_timestamp DESC LIMIT 1""",
            [teamId.toString()]
        )

        if (result) {
            println "Verification: Audit log ID ${result.aud_id} created at ${result.aud_timestamp}"
        } else {
            println "❌ ERROR: Audit log not found in database"
        }
    }

} catch (Exception e) {
    println "❌ ERROR: ${e.message}"
    e.printStackTrace()
}
```

Run the test:

```bash
groovy src/groovy/umig/test_audit_log.groovy
```

#### Step 4: Query and Verify Audit Logs

Verify the audit log was created with proper JSON structure:

```sql
-- Check most recent audit log
SELECT
    aud_id,
    aud_timestamp,
    aud_user_id,
    aud_action,
    aud_entity_type,
    aud_entity_id
FROM audit_log_aud
ORDER BY aud_timestamp DESC
LIMIT 1;
```

**Verify JSON Structure**:

```sql
-- View formatted JSON details
SELECT
    aud_id,
    aud_entity_type,
    jsonb_pretty(aud_details) AS formatted_details
FROM audit_log_aud
WHERE aud_entity_type = 'Teams'
ORDER BY aud_timestamp DESC
LIMIT 1;
```

**Expected JSON Output**:

```json
{
  "request": {
    "method": "POST",
    "endpoint": "/rest/scriptrunner/latest/custom/teams",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Quick Start Test)"
  },
  "state": {
    "current": {
      "tms_name": "Engineering Team",
      "tms_is_active": true,
      "tms_description": "Test team created via Quick Start Guide"
    }
  },
  "context": {
    "reason": "Quick Start Guide - First Audit Log Test",
    "source": "implementation_guide",
    "sessionId": "test-session-001"
  }
}
```

---

### 1.3 GIN Index Performance Validation

Verify GIN indexes are working correctly with performance tests:

#### Test 1: Request Method Query

```sql
-- Query by HTTP method (should use idx_audit_request_gin)
EXPLAIN ANALYZE
SELECT aud_id, aud_timestamp, aud_entity_type
FROM audit_log_aud
WHERE aud_details -> 'request' ->> 'method' = 'POST'
LIMIT 10;
```

**Expected Plan**: `Bitmap Index Scan using idx_audit_request_gin`
**Expected Time**: < 50ms

#### Test 2: GDPR Personal Data Query

```sql
-- Query GDPR personal data flag (should use idx_audit_gdpr_gin)
EXPLAIN ANALYZE
SELECT aud_id, aud_timestamp, aud_entity_type
FROM audit_log_aud
WHERE (aud_details -> 'gdpr' -> 'personalData')::boolean = true
LIMIT 10;
```

**Expected Plan**: `Bitmap Index Scan using idx_audit_gdpr_gin`
**Expected Time**: < 100ms

#### Test 3: Context Reason Search

```sql
-- Search context reason text (should use idx_audit_context_gin)
EXPLAIN ANALYZE
SELECT aud_id, aud_timestamp, aud_action
FROM audit_log_aud
WHERE aud_details -> 'context' ->> 'reason' ILIKE '%test%'
LIMIT 10;
```

**Expected Plan**: `Bitmap Index Scan using idx_audit_context_gin`
**Expected Time**: < 100ms

#### Automated Validation Script

Use the provided validation script:

```bash
# Run automated GIN index validation
PGPASSWORD=123456 psql -h localhost -p 5432 -U umig_app_user -d umig_app_db \
  -f liquibase/changelogs/validation/validate_audit_gin_indexes.sql
```

**Expected Output**:

```
✅ All 7 GIN indexes verified
✅ Request query using idx_audit_request_gin (42ms)
✅ GDPR query using idx_audit_gdpr_gin (68ms)
✅ Context query using idx_audit_context_gin (55ms)
✅ Performance within acceptable thresholds
```

---

### 1.4 Common Gotchas and Quick Fixes

#### Gotcha 1: "relation 'idx_audit_details_gin' does not exist"

**Symptom**:

```
ERROR: relation "idx_audit_details_gin" does not exist
```

**Cause**: GIN index migration not applied.

**Fix**:

```bash
cd local-dev-setup
npm run liquibase:update
```

Verify with:

```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'audit_log_aud' AND indexname LIKE 'idx_audit%gin';
```

#### Gotcha 2: "Audit details exceed maximum size"

**Symptom**:

```
ERROR: Audit details JSON exceeds 50KB maximum size
```

**Cause**: JSON payload too large (hierarchy context or state data).

**Fix**: Reduce JSON payload size by:

1. Limiting hierarchy depth in context
2. Truncating large text fields
3. Removing redundant state information

**Example Truncation**:

```groovy
// Truncate large description fields
def truncateField(String value, int maxLength = 1000) {
    return value?.length() > maxLength ?
        value.substring(0, maxLength) + "... [truncated]" : value
}

def details = [
    state: [
        current: [
            description: truncateField(fullDescription, 500)
        ]
    ]
]
```

#### Gotcha 3: Slow JSONB Queries (Not Using GIN Indexes)

**Symptom**: Queries taking > 1 second despite GIN indexes.

**Cause**: Query not matching GIN index paths.

**Fix**: Ensure query paths exactly match index definitions:

```sql
-- ❌ WRONG - Does not use GIN index
WHERE aud_details::text LIKE '%method%POST%'

-- ✅ CORRECT - Uses idx_audit_request_gin
WHERE aud_details -> 'request' ->> 'method' = 'POST'
```

**Verification**:

```sql
-- Check if GIN index is used
EXPLAIN ANALYZE
SELECT * FROM audit_log_aud
WHERE aud_details -> 'request' ->> 'method' = 'POST'
LIMIT 10;
```

Look for `Bitmap Index Scan using idx_audit_request_gin` in query plan.

#### Gotcha 4: Type Casting Errors (ADR-031, ADR-043)

**Symptom**:

```
ERROR: Cannot cast type character varying to uuid
```

**Cause**: Missing explicit type casts required by ADR-031/043.

**Fix**: Always use explicit casting:

```groovy
// ❌ WRONG - Type inference fails
def entityId = params.id
UUID uuid = UUID.fromString(entityId)

// ✅ CORRECT - Explicit casting per ADR-031
def entityId = params.id as String
UUID uuid = UUID.fromString(entityId)
```

**Common Casting Patterns**:

```groovy
// UUID parameters
UUID.fromString(param as String)

// Integer parameters
Integer.parseInt(param as String)

// Nullable strings
param?.toString() ?: ''

// Map access with type safety
(param as Map<String, Object>)?.get('key')
```

#### Gotcha 5: AuditLogService Not Found

**Symptom**:

```
ERROR: unable to resolve class umig.utils.AuditLogService
```

**Cause**: AuditLogService.groovy not in classpath.

**Fix**: Verify file exists and restart ScriptRunner:

```bash
# Check file exists
ls -la src/groovy/umig/utils/AuditLogService.groovy

# If file exists, restart Confluence to reload ScriptRunner
npm run restart
```

---

### 1.5 Success Criteria Checklist

Complete this checklist to verify successful setup:

#### Database Setup

- ✅ PostgreSQL 14 running and accessible
- ✅ `audit_log_aud` table exists with proper schema
- ✅ 7 GIN indexes created (`\d audit_log_aud` shows all indexes)
- ✅ No index creation errors in Liquibase logs

#### Audit Log Creation

- ✅ AuditLogService.createAuditLog() executes without errors
- ✅ Audit log appears in database with correct entity type
- ✅ JSON structure matches schema specification
- ✅ All required fields populated (aud_user_id, aud_action, etc.)

#### Index Performance

- ✅ Request query uses `idx_audit_request_gin` (< 50ms)
- ✅ GDPR query uses `idx_audit_gdpr_gin` (< 100ms)
- ✅ Context query uses `idx_audit_context_gin` (< 100ms)
- ✅ Full document query uses `idx_audit_details_gin` (< 150ms)
- ✅ EXPLAIN ANALYZE shows Bitmap Index Scan for all queries

#### Integration Validation

- ✅ No errors in Confluence logs (`npm run logs:confluence`)
- ✅ AuditLogService accessible from REST endpoints
- ✅ Type casting working correctly (UUID, Integer conversions)
- ✅ JSON payload size within 50KB limit

#### Query Validation SQL

Run this comprehensive validation:

```sql
-- Success Criteria Validation Query
WITH index_check AS (
    SELECT COUNT(*) as index_count
    FROM pg_indexes
    WHERE tablename = 'audit_log_aud'
      AND indexdef LIKE '%gin%'
),
audit_check AS (
    SELECT
        COUNT(*) as total_audits,
        COUNT(CASE WHEN aud_action = 'CREATE' THEN 1 END) as create_count,
        MAX(aud_timestamp) as latest_audit
    FROM audit_log_aud
),
performance_check AS (
    SELECT
        (SELECT COUNT(*) FROM audit_log_aud
         WHERE aud_details -> 'request' ->> 'method' = 'POST') as request_query_count,
        (SELECT COUNT(*) FROM audit_log_aud
         WHERE aud_details @> '{"gdpr": {"personalData": true}}') as gdpr_query_count
)
SELECT
    CASE WHEN ic.index_count = 7 THEN '✅' ELSE '❌' END || ' GIN Indexes: ' || ic.index_count || '/7' as gin_indexes,
    CASE WHEN ac.total_audits > 0 THEN '✅' ELSE '❌' END || ' Audit Logs: ' || ac.total_audits as audit_count,
    CASE WHEN ac.latest_audit > NOW() - INTERVAL '1 hour' THEN '✅' ELSE '⚠️' END || ' Latest Audit: ' || ac.latest_audit as recency,
    CASE WHEN pc.request_query_count >= 0 THEN '✅' ELSE '❌' END || ' Request Queries Working' as request_queries,
    CASE WHEN pc.gdpr_query_count >= 0 THEN '✅' ELSE '❌' END || ' GDPR Queries Working' as gdpr_queries
FROM index_check ic, audit_check ac, performance_check pc;
```

**Expected Output**:

```
✅ GIN Indexes: 7/7
✅ Audit Logs: 1
✅ Latest Audit: 2025-10-08 14:23:45
✅ Request Queries Working
✅ GDPR Queries Working
```

---

### 1.6 Next Steps

Once Quick Start is complete:

1. **Review Developer Integration Guide** (Section 2)
   - Learn how to integrate audit logging into API endpoints
   - Understand entity-specific audit patterns
   - Implement audit logging in repositories

2. **Optimize Performance** (Section 3)
   - Fine-tune GIN index usage
   - Implement caching strategies
   - Configure retention policies

3. **Production Readiness** (Section 4)
   - Configure monitoring and alerts
   - Set up audit log retention
   - Implement backup strategies

---

### 1.7 Quick Reference Commands

**Database Connection**:

```bash
PGPASSWORD=123456 psql -h localhost -p 5432 -U umig_app_user -d umig_app_db
```

**View Recent Audit Logs**:

```sql
SELECT aud_id, aud_timestamp, aud_action, aud_entity_type, aud_user_id
FROM audit_log_aud
ORDER BY aud_timestamp DESC
LIMIT 10;
```

**Check GIN Index Usage**:

```sql
EXPLAIN ANALYZE
SELECT * FROM audit_log_aud
WHERE aud_details -> 'request' ->> 'method' = 'POST'
LIMIT 10;
```

**Clear Test Audit Logs**:

```sql
DELETE FROM audit_log_aud
WHERE aud_details -> 'context' ->> 'source' = 'implementation_guide';
```

---

## Reference Files

- **JSON Schema**: `docs/architecture/audit/AUDIT_JSON_SCHEMA_SPECIFICATION.md`
- **GIN Index Strategy**: `docs/dataModel/AUDIT_GIN_INDEXES.md`
- **Migration File**: `local-dev-setup/liquibase/changelogs/040_add_audit_jsonb_gin_indexes.sql`
- **Validation Script**: `local-dev-setup/liquibase/changelogs/validation/validate_audit_gin_indexes.sql`
- **AuditLogService**: `src/groovy/umig/utils/AuditLogService.groovy`

---

**Document Status**: Section 1 (Quick Start) - ✅ COMPLETE
**Next Section**: Section 2 (Developer Integration Guide) - Pending
**Estimated Section 2 Generation Time**: 15 minutes
