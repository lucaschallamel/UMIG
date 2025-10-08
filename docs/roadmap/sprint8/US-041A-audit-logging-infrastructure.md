# US-041A: Comprehensive Audit Logging Infrastructure (JSON-Optimized)

## Story Metadata

**Story ID**: US-041A
**Epic**: Admin GUI Enhancement Suite
**Sprint**: Sprint 8
**Priority**: P1 (High Value Enhancement)
**Story Points**: 4-5 points (REDUCED from 6-8 - leverages existing schema)
**Status**: READY FOR SPRINT 8
**Created**: January 8, 2025
**Owner**: Backend/Infrastructure Development
**Dependencies**: None (existing audit schema already in place)
**Risk**: LOW (leverages existing database infrastructure)

**Revised From**: US-041A v1.1 - Adapted to work with existing `audit_log_aud` table using JSONB-based approach

---

## Revision Summary

**Key Discovery**: The database already contains a well-designed `audit_log_aud` table with 7 columns including a JSONB `aud_details` field. This story has been revised to leverage the existing schema and focus on JSON structure design, service layer implementation, and query optimization rather than database migrations.

**Story Point Reduction**: ~3 points saved by eliminating database schema design and migration work.

**Implementation Strategy**: JSON-first approach with complete flexibility in the `aud_details` JSONB column for entity-specific audit information.

---

## User Story Statement

**As a** system administrator and compliance officer
**I want** comprehensive audit logging for all UMIG operations using the existing database infrastructure
**So that** I can maintain full regulatory compliance, track all user actions, and investigate issues with complete traceability

### Value Statement

This story implements enterprise-grade audit logging infrastructure capturing all user actions within UMIG by leveraging the existing `audit_log_aud` table and designing flexible JSON structures for the `aud_details` JSONB column. This foundational capability enables regulatory compliance, security monitoring, and operational troubleshooting while providing administrators with complete visibility into system usage and data changes.

**Built on Existing Infrastructure**: Uses proven database schema with JSONB flexibility, established UMIG DatabaseUtil.withSql patterns, REST API architecture, and UI component frameworks for consistent, maintainable implementation.

---

## Existing Database Schema

**Table: `audit_log_aud`** (Already exists - no migrations needed!)

```sql
CREATE TABLE audit_log_aud (
    aud_id               BIGINT PRIMARY KEY DEFAULT nextval(...),
    aud_timestamp        TIMESTAMPTZ NOT NULL DEFAULT now(),
    usr_id               INTEGER REFERENCES users_usr(usr_id),
    aud_action           VARCHAR(255) NOT NULL,
    aud_entity_type      VARCHAR(50) NOT NULL,
    aud_entity_id        UUID NOT NULL,
    aud_details          JSONB
);

-- Existing indexes (already optimized!)
CREATE INDEX idx_audit_log_changed_by
    ON audit_log_aud(usr_id, aud_timestamp DESC)
    WHERE usr_id IS NOT NULL;

CREATE INDEX idx_audit_log_role_changes
    ON audit_log_aud(aud_entity_type, aud_action, aud_timestamp DESC);

CREATE INDEX idx_audit_log_user_activity
    ON audit_log_aud(usr_id, aud_entity_type, aud_timestamp DESC);

CREATE INDEX idx_audit_log_user_entity
    ON audit_log_aud(aud_entity_type, aud_entity_id, aud_timestamp DESC);
```

**What We Add**: Only GIN indexes on JSONB paths for efficient querying (non-blocking, minimal impact).

---

## Acceptance Criteria

### AC-041A.1: JSON Schema Design and Documentation

**Given** the existing audit table with flexible JSONB column
**When** designing audit capture patterns
**Then** create comprehensive JSON schema specifications:

- Standard base structure for all audit entries (request, state, context, gdpr, metadata)
- Entity-specific extensions for different entity types (users, teams, migrations, instances)
- Action-specific structures (CREATE, UPDATE, DELETE, VIEW) with appropriate detail levels
- Size management strategy to stay within 50KB JSONB limit
- GDPR compliance patterns for personal data identification
  **And** document all JSON schemas with examples and usage guidelines
  **And** provide validation patterns for JSON structure compliance
  **And** ensure queryability through well-structured JSON paths

### AC-041A.2: AuditService Implementation with JSON Builders

**Given** the JSON schema specifications
**When** implementing audit capture service
**Then** create flexible AuditService with builder pattern:

- High-level API methods for common operations (auditCreate, auditUpdate, auditDelete)
- Entity-specific builder classes for JSON structure construction
- Automatic request metadata capture (IP, user agent, session, endpoint)
- State comparison and diff generation for UPDATE operations
- GDPR data classification and tagging
  **And** implement asynchronous audit logging to prevent performance impact
  **And** provide bulk audit operations for batch scenarios
  **And** ensure type safety with Groovy static typing patterns

### AC-041A.3: Repository Layer with JSONB Queries

**Given** the AuditService and JSON structures
**When** implementing data access layer
**Then** create AuditRepository with efficient JSONB queries:

- Basic CRUD operations using DatabaseUtil.withSql pattern
- JSON path queries for filtering (GDPR entries, hierarchy queries, request metadata)
- Efficient use of existing B-tree indexes for entity/user queries
- GIN index queries for JSONB path filtering
- Pagination and sorting for large result sets
  **And** maintain query performance <3s for 100K+ audit records
  **And** implement proper error handling with SQL state mappings
  **And** provide statistical query methods for audit reporting

### AC-041A.4: GIN Index Optimization for JSONB Queries

**Given** JSONB-based audit storage requirements
**When** implementing performance optimizations
**Then** add non-blocking GIN indexes for common JSON paths:

- GDPR personal data filtering: `(aud_details -> 'gdpr')`
- Hierarchy queries: `(aud_details -> 'entitySpecific' -> 'hierarchy')`
- Request metadata queries: `(aud_details -> 'request')`
- Create indexes using CONCURRENTLY to avoid table locks
  **And** validate index effectiveness with query performance testing
  **And** document index usage patterns and query optimization strategies

### AC-041A.5: Admin GUI Audit Log Viewing Interface

**Given** captured audit logs with JSON structures
**When** administrators need to review audit trails
**Then** provide comprehensive audit viewing capabilities:

- Paginated audit log interface with search and filtering
- Filter by user, entity type, action type, date range
- Display JSON details with collapsible/expandable views
- Show request metadata, state changes, and business context
- Export functionality (CSV, JSON) with date range selection
  **And** integrate with existing Admin GUI component patterns
  **And** provide JSON pretty-print for human readability
  **And** implement real-time updates for ongoing audit monitoring

### AC-041A.6: GDPR Compliance Features

**Given** audit logging requirements for personal data
**When** implementing GDPR compliance capabilities
**Then** ensure regulatory compliance standards:

- Automatic GDPR data classification in JSON structures
- Data export functionality for "Right to Access" requests
- Anonymization patterns for "Right to Erasure" requests
- Retention policy tagging in JSON metadata
- Audit trail for GDPR-related operations
  **And** implement efficient GDPR-specific queries using GIN indexes
  **And** provide compliance reporting with standard formats
  **And** ensure meta-auditing for audit log access

### AC-041A.7: Performance and Scalability

**Given** high-volume audit logging requirements
**When** system experiences normal and peak usage
**Then** maintain performance standards:

- Asynchronous audit logging with queue management
- Bulk insert operations for batch scenarios
- Minimal API overhead (<5% on existing endpoints)
- Efficient JSON size management (compression, summarization)
- Archive/purge strategies for long-term management
  **And** handle concurrent audit operations without data corruption
  **And** provide graceful degradation if audit system unavailable
  **And** monitor and alert on audit logging system health

---

## JSON Schema Specifications

### Base Structure (All Audit Entries)

```json
{
  "request": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "sessionId": "abc-123-def-456",
    "endpoint": "/rest/scriptrunner/latest/custom/users",
    "method": "PUT",
    "timestamp": "2025-01-08T10:30:00Z"
  },
  "state": {
    "previous": {
      /* For UPDATE/DELETE: changed fields only */
    },
    "current": {
      /* For CREATE/UPDATE: new state, changed fields only */
    },
    "changes": [
      {
        "field": "usr_email",
        "from": "old@example.com",
        "to": "new@example.com",
        "type": "GDPR_RELEVANT"
      }
    ]
  },
  "context": {
    "reason": "User profile update",
    "bulkOperation": false,
    "affectedCount": 1,
    "cascadeEffects": []
  },
  "gdpr": {
    "personalData": true,
    "dataCategory": "identity|contact|behavioral",
    "retentionPolicy": "7_years",
    "expiryDate": "2032-01-08",
    "autoDelete": true
  },
  "metadata": {
    "version": "1.0",
    "schemaType": "user_update",
    "compressed": false
  }
}
```

### Entity-Specific Extensions

**Users Entity (usr)**

```json
{
  "entitySpecific": {
    "roleChanges": [
      {
        "role": "admin",
        "action": "added|removed",
        "grantedBy": "system_admin"
      }
    ],
    "permissionChanges": {
      "before": ["read", "write"],
      "after": ["read", "write", "admin"]
    },
    "profileFields": ["usr_email", "usr_first_name"],
    "securityEvents": {
      "type": "password_change|mfa_enabled|account_locked",
      "triggeredBy": "user|system|admin"
    }
  },
  "gdpr": {
    "personalData": true,
    "dataCategory": "identity",
    "rightToErasure": "pending|completed|not_applicable"
  }
}
```

**Teams Entity (tem)**

```json
{
  "entitySpecific": {
    "membershipChanges": {
      "added": [
        {
          "usr_id": "uuid",
          "usr_name": "John Doe",
          "role": "member"
        }
      ],
      "removed": [
        {
          "usr_id": "uuid",
          "usr_name": "Jane Smith",
          "reason": "team_restructure"
        }
      ],
      "roleChanged": []
    },
    "hierarchyImpact": {
      "affectedMigrations": ["uuid1", "uuid2"],
      "affectedIterations": ["uuid3"],
      "propagationScope": "immediate|deferred"
    }
  }
}
```

**PILOT Instances (plan/sequence/phase/step instances)**

```json
{
  "entitySpecific": {
    "instanceType": "plan|sequence|phase|step",
    "masterTemplate": "uuid_of_master",
    "instanceNumber": 3,
    "totalInstances": 12,
    "hierarchy": {
      "migration_id": "uuid",
      "iteration_id": "uuid",
      "parent_plan_id": "uuid",
      "parent_sequence_id": "uuid",
      "migration_name": "Data Center Migration 2025",
      "iteration_name": "Iteration 1: Wave 1"
    },
    "statusChange": {
      "from": "pending",
      "to": "in_progress",
      "timestamp": "2025-01-08T10:30:00Z",
      "changedBy": "pilot_user"
    },
    "generationContext": {
      "bulkOperation": true,
      "batchId": "uuid-batch",
      "generatedAt": "2025-01-08T10:00:00Z",
      "generatedBy": "admin_user"
    }
  }
}
```

### Action-Specific Structures

**CREATE Operation**

```json
{
  "request": {
    /* standard */
  },
  "state": {
    "current": {
      /* full new entity state */
    }
    // No 'previous' since this is creation
  },
  "context": {
    "createdBy": "user_name",
    "createdVia": "admin_gui|api|import",
    "sourceSystem": "manual|imported_from_csv",
    "validationPassed": true
  },
  "entitySpecific": {
    /* entity-specific fields */
  }
}
```

**UPDATE Operation**

```json
{
  "request": {
    /* standard */
  },
  "state": {
    "previous": {
      /* only changed fields */
    },
    "current": {
      /* only changed fields */
    },
    "changes": [
      {
        "field": "usr_email",
        "from": "old@example.com",
        "to": "new@example.com",
        "type": "GDPR_RELEVANT"
      }
    ]
  },
  "context": {
    "reason": "User profile update",
    "bulkOperation": false,
    "affectedCount": 1,
    "conflictResolution": "none|auto|manual"
  }
}
```

**DELETE Operation**

```json
{
  "request": {
    /* standard */
  },
  "state": {
    "previous": {
      /* full entity state before deletion */
    },
    "deletionType": "soft|hard",
    "cascadeDeletes": [
      {
        "entity": "team_membership",
        "count": 3
      }
    ]
  },
  "context": {
    "reason": "User requested account deletion",
    "recoverable": true|false,
    "archiveLocation": "backup_table_name"
  }
}
```

---

## Technical Implementation

### AuditService Architecture

```groovy
package umig.services.audit

import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import umig.utils.DatabaseUtil
import umig.repository.AuditRepository

/**
 * Comprehensive audit logging service using JSONB-based approach.
 * Leverages existing audit_log_aud table with flexible JSON structures.
 */
class AuditService {
    private final AuditRepository repository = new AuditRepository()
    private final Map<String, AuditDetailsBuilder> builders = [:]

    AuditService() {
        // Register entity-specific builders
        builders['users'] = new UserAuditDetailsBuilder()
        builders['teams'] = new TeamAuditDetailsBuilder()
        builders['migrations'] = new MigrationAuditDetailsBuilder()
        builders['plans'] = new InstanceAuditDetailsBuilder('plan')
        builders['sequences'] = new InstanceAuditDetailsBuilder('sequence')
        builders['phases'] = new InstanceAuditDetailsBuilder('phase')
        builders['steps'] = new InstanceAuditDetailsBuilder('step')
    }

    /**
     * Audit entity creation
     */
    void auditCreate(String entityType, UUID entityId, Map entityState,
                     Map requestContext = [:], Integer userId = null) {
        def builder = getBuilder(entityType)
        def details = builder.buildCreateDetails(entityState, requestContext)

        repository.insert(
            userId: userId,
            action: 'CREATE',
            entityType: entityType,
            entityId: entityId,
            details: details
        )
    }

    /**
     * Audit entity update with state comparison
     */
    void auditUpdate(String entityType, UUID entityId,
                     Map previousState, Map currentState,
                     Map requestContext = [:], Integer userId = null) {
        def builder = getBuilder(entityType)
        def changes = compareStates(previousState, currentState)
        def details = builder.buildUpdateDetails(previousState, currentState, changes, requestContext)

        repository.insert(
            userId: userId,
            action: 'UPDATE',
            entityType: entityType,
            entityId: entityId,
            details: details
        )
    }

    /**
     * Audit entity deletion
     */
    void auditDelete(String entityType, UUID entityId, Map previousState,
                     Map requestContext = [:], Integer userId = null) {
        def builder = getBuilder(entityType)
        def details = builder.buildDeleteDetails(previousState, requestContext)

        repository.insert(
            userId: userId,
            action: 'DELETE',
            entityType: entityType,
            entityId: entityId,
            details: details
        )
    }

    /**
     * Bulk audit operations
     */
    void auditBulkOperation(String action, String entityType,
                           List<Map> entries, Map requestContext = [:]) {
        repository.insertBatch(entries.collect { entry ->
            def builder = getBuilder(entityType)
            [
                userId: entry.userId,
                action: action,
                entityType: entityType,
                entityId: entry.entityId,
                details: builder.buildDetails(action, entry.state, requestContext)
            ]
        })
    }

    /**
     * Compare previous and current state to identify changes
     */
    private List<Map> compareStates(Map previous, Map current) {
        def changes = []
        current.each { key, newValue ->
            def oldValue = previous[key]
            if (oldValue != newValue) {
                changes << [
                    field: key,
                    from: oldValue,
                    to: newValue,
                    type: classifyField(key)
                ]
            }
        }
        return changes
    }

    /**
     * Classify field for GDPR relevance
     */
    private String classifyField(String fieldName) {
        // GDPR-relevant fields
        if (fieldName =~ /email|phone|address|ssn|dob/) {
            return 'GDPR_RELEVANT'
        }
        // Operational fields
        if (fieldName =~ /status|progress|created|updated/) {
            return 'OPERATIONAL'
        }
        return 'STANDARD'
    }

    /**
     * Get appropriate builder for entity type
     */
    private AuditDetailsBuilder getBuilder(String entityType) {
        return builders[entityType] ?: new DefaultAuditDetailsBuilder()
    }

    /**
     * GDPR compliance: Export user audit data
     */
    String exportUserAuditData(Integer userId) {
        def entries = repository.findGdprRelevantEntries(userId)
        return JsonOutput.prettyPrint(JsonOutput.toJson(entries))
    }

    /**
     * GDPR compliance: Anonymize user audit data
     */
    void anonymizeUserData(Integer userId) {
        repository.anonymizeUserEntries(userId)
    }
}
```

### AuditDetailsBuilder Pattern

```groovy
package umig.services.audit.builders

/**
 * Base interface for entity-specific audit detail builders
 */
interface AuditDetailsBuilder {
    Map buildCreateDetails(Map entityState, Map requestContext)
    Map buildUpdateDetails(Map previousState, Map currentState, List<Map> changes, Map requestContext)
    Map buildDeleteDetails(Map previousState, Map requestContext)
}

/**
 * User entity audit builder
 */
class UserAuditDetailsBuilder implements AuditDetailsBuilder {

    Map buildCreateDetails(Map entityState, Map requestContext) {
        return [
            request: buildRequestMetadata(requestContext),
            state: [
                current: filterSensitiveFields(entityState)
            ],
            context: [
                createdBy: requestContext.userName,
                createdVia: requestContext.source ?: 'admin_gui'
            ],
            entitySpecific: [
                profileFields: entityState.keySet().toList(),
                initialRoles: entityState.roles ?: []
            ],
            gdpr: [
                personalData: true,
                dataCategory: 'identity',
                retentionPolicy: '7_years'
            ],
            metadata: [
                version: '1.0',
                schemaType: 'user_create'
            ]
        ]
    }

    Map buildUpdateDetails(Map previousState, Map currentState,
                          List<Map> changes, Map requestContext) {
        return [
            request: buildRequestMetadata(requestContext),
            state: [
                previous: extractChangedFields(previousState, changes),
                current: extractChangedFields(currentState, changes),
                changes: changes
            ],
            context: [
                reason: requestContext.reason ?: 'User profile update',
                bulkOperation: false
            ],
            entitySpecific: [
                profileFields: changes.collect { it.field },
                roleChanges: extractRoleChanges(previousState, currentState)
            ],
            gdpr: [
                personalData: hasGdprChanges(changes),
                dataCategory: 'identity'
            ],
            metadata: [
                version: '1.0',
                schemaType: 'user_update'
            ]
        ]
    }

    Map buildDeleteDetails(Map previousState, Map requestContext) {
        return [
            request: buildRequestMetadata(requestContext),
            state: [
                previous: filterSensitiveFields(previousState),
                deletionType: requestContext.deletionType ?: 'soft'
            ],
            context: [
                reason: requestContext.reason ?: 'User account deletion',
                recoverable: requestContext.deletionType != 'hard'
            ],
            gdpr: [
                personalData: true,
                rightToErasure: 'completed'
            ],
            metadata: [
                version: '1.0',
                schemaType: 'user_delete'
            ]
        ]
    }

    private Map buildRequestMetadata(Map context) {
        return [
            ip: context.ipAddress ?: 'unknown',
            userAgent: context.userAgent ?: 'unknown',
            sessionId: context.sessionId,
            endpoint: context.endpoint,
            method: context.method,
            timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'")
        ]
    }

    private boolean hasGdprChanges(List<Map> changes) {
        return changes.any { it.type == 'GDPR_RELEVANT' }
    }

    private Map extractChangedFields(Map state, List<Map> changes) {
        return state.subMap(changes.collect { it.field })
    }

    private List extractRoleChanges(Map previous, Map current) {
        def prevRoles = previous.roles ?: []
        def currRoles = current.roles ?: []

        def added = currRoles - prevRoles
        def removed = prevRoles - currRoles

        def roleChanges = []
        added.each { role ->
            roleChanges << [role: role, action: 'added']
        }
        removed.each { role ->
            roleChanges << [role: role, action: 'removed']
        }
        return roleChanges
    }

    private Map filterSensitiveFields(Map state) {
        // Remove password hashes and other ultra-sensitive data
        def filtered = new HashMap(state)
        filtered.remove('usr_password_hash')
        filtered.remove('usr_salt')
        return filtered
    }
}

/**
 * Instance entity audit builder (for PILOT instances)
 */
class InstanceAuditDetailsBuilder implements AuditDetailsBuilder {
    private final String instanceType

    InstanceAuditDetailsBuilder(String instanceType) {
        this.instanceType = instanceType
    }

    Map buildCreateDetails(Map entityState, Map requestContext) {
        return [
            request: buildRequestMetadata(requestContext),
            state: [
                current: entityState
            ],
            entitySpecific: [
                instanceType: "${instanceType}_instance",
                masterTemplate: entityState.masterTemplateId,
                instanceNumber: entityState.instanceNumber,
                totalInstances: requestContext.totalInstances,
                hierarchy: buildHierarchyContext(entityState, requestContext),
                generationContext: [
                    bulkOperation: requestContext.bulkOperation ?: false,
                    batchId: requestContext.batchId,
                    generatedAt: new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'"),
                    generatedBy: requestContext.userName
                ]
            ],
            metadata: [
                version: '1.0',
                schemaType: "${instanceType}_create"
            ]
        ]
    }

    private Map buildHierarchyContext(Map entityState, Map requestContext) {
        return [
            migration_id: requestContext.migrationId?.toString(),
            iteration_id: requestContext.iterationId?.toString(),
            parent_plan_id: requestContext.parentPlanId?.toString(),
            parent_sequence_id: requestContext.parentSequenceId?.toString(),
            migration_name: requestContext.migrationName,
            iteration_name: requestContext.iterationName
        ]
    }

    private Map buildRequestMetadata(Map context) {
        return [
            ip: context.ipAddress ?: 'unknown',
            userAgent: context.userAgent ?: 'unknown',
            sessionId: context.sessionId,
            endpoint: context.endpoint,
            method: context.method,
            timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'")
        ]
    }

    // Implement other required methods...
}
```

### AuditRepository with JSONB Queries

```groovy
package umig.repository

import groovy.json.JsonOutput
import groovy.sql.Sql
import umig.utils.DatabaseUtil

/**
 * Repository for audit log operations with JSONB query support
 */
class AuditRepository {

    /**
     * Insert single audit entry
     */
    void insert(Map auditData) {
        DatabaseUtil.withSql { sql ->
            sql.execute("""
                INSERT INTO audit_log_aud (
                    usr_id, aud_action, aud_entity_type,
                    aud_entity_id, aud_details
                ) VALUES (?, ?, ?, ?, ?::jsonb)
            """, [
                auditData.userId,
                auditData.action as String,
                auditData.entityType as String,
                auditData.entityId,
                JsonOutput.toJson(auditData.details)
            ])
        }
    }

    /**
     * Bulk insert for batch operations
     */
    void insertBatch(List<Map> auditEntries) {
        DatabaseUtil.withSql { sql ->
            sql.withBatch(100, """
                INSERT INTO audit_log_aud (
                    usr_id, aud_action, aud_entity_type,
                    aud_entity_id, aud_details
                ) VALUES (?, ?, ?, ?, ?::jsonb)
            """) { ps ->
                auditEntries.each { entry ->
                    ps.addBatch(
                        entry.userId,
                        entry.action,
                        entry.entityType,
                        entry.entityId,
                        JsonOutput.toJson(entry.details)
                    )
                }
            }
        }
    }

    /**
     * Find audit entries by entity
     */
    List<Map> findByEntity(String entityType, UUID entityId,
                          Integer limit = 100, Integer offset = 0) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT * FROM audit_log_aud
                WHERE aud_entity_type = ?
                AND aud_entity_id = ?
                ORDER BY aud_timestamp DESC
                LIMIT ? OFFSET ?
            """, [entityType, entityId, limit, offset])
        }
    }

    /**
     * Find GDPR-relevant entries for user
     */
    List<Map> findGdprRelevantEntries(Integer userId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT * FROM audit_log_aud
                WHERE usr_id = ?
                AND (aud_details -> 'gdpr' ->> 'personalData')::boolean = true
                ORDER BY aud_timestamp DESC
            """, [userId])
        }
    }

    /**
     * Find instance history by migration and iteration
     * Uses JSONB hierarchy path queries
     */
    List<Map> findInstanceHistory(UUID migrationId, UUID iterationId) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT * FROM audit_log_aud
                WHERE aud_details -> 'entitySpecific' -> 'hierarchy' ->> 'migration_id' = ?
                AND aud_details -> 'entitySpecific' -> 'hierarchy' ->> 'iteration_id' = ?
                ORDER BY
                    (aud_details -> 'entitySpecific' ->> 'instanceNumber')::int,
                    aud_timestamp
            """, [migrationId.toString(), iterationId.toString()])
        }
    }

    /**
     * Find entries by request IP address
     * Uses JSONB path query on request metadata
     */
    List<Map> findByIpAddress(String ipAddress, Integer limit = 100) {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT * FROM audit_log_aud
                WHERE aud_details -> 'request' ->> 'ip' = ?
                ORDER BY aud_timestamp DESC
                LIMIT ?
            """, [ipAddress, limit])
        }
    }

    /**
     * Anonymize user audit entries for GDPR erasure
     */
    void anonymizeUserEntries(Integer userId) {
        DatabaseUtil.withSql { sql ->
            sql.executeUpdate("""
                UPDATE audit_log_aud
                SET aud_details = jsonb_set(
                    aud_details,
                    '{gdpr,anonymized}',
                    'true'::jsonb
                ) || jsonb_build_object(
                    'state', jsonb_build_object(
                        'anonymized', true,
                        'reason', 'GDPR erasure request',
                        'timestamp', now()
                    )
                )
                WHERE usr_id = ?
                AND (aud_details -> 'gdpr' ->> 'personalData')::boolean = true
            """, [userId])
        }
    }

    /**
     * Get activity statistics for user
     */
    Map getActivityStats(Integer userId, Date startDate = null, Date endDate = null) {
        DatabaseUtil.withSql { sql ->
            def whereClause = "WHERE usr_id = ?"
            def params = [userId]

            if (startDate) {
                whereClause += " AND aud_timestamp >= ?"
                params << startDate
            }
            if (endDate) {
                whereClause += " AND aud_timestamp <= ?"
                params << endDate
            }

            def results = sql.rows("""
                SELECT
                    aud_entity_type,
                    aud_action,
                    COUNT(*) as count
                FROM audit_log_aud
                ${whereClause}
                GROUP BY aud_entity_type, aud_action
                ORDER BY count DESC
            """, params)

            return results.collectEntries { row ->
                ["${row.aud_entity_type}:${row.aud_action}", row.count]
            }
        }
    }
}
```

### GIN Index Migration

```sql
-- Migration: add_audit_jsonb_gin_indexes.sql
-- Add GIN indexes for efficient JSONB path queries
-- Using CONCURRENTLY to avoid table locks

-- GDPR queries (find all entries with personal data)
CREATE INDEX CONCURRENTLY idx_audit_gdpr_personal
    ON audit_log_aud USING GIN ((aud_details -> 'gdpr'))
    WHERE (aud_details -> 'gdpr' ->> 'personalData')::boolean = true;

-- Hierarchy queries (find all PILOT instance operations)
CREATE INDEX CONCURRENTLY idx_audit_hierarchy
    ON audit_log_aud USING GIN ((aud_details -> 'entitySpecific' -> 'hierarchy'));

-- Request metadata queries (find operations from specific IP)
CREATE INDEX CONCURRENTLY idx_audit_request_metadata
    ON audit_log_aud USING GIN ((aud_details -> 'request'));

-- Update table statistics for query planner
ANALYZE audit_log_aud;
```

---

## Implementation Approach

### Phase 1: JSON Schema Design and GIN Indexes (1 point)

- Design comprehensive JSON schema specifications for all entity types
- Document JSON structures with examples and validation patterns
- Create Liquibase migration for GIN indexes (CONCURRENTLY, non-blocking)
- Validate query performance with test data and index usage
- **Deliverables**: JSON schema documentation, GIN index migration script

### Phase 2: AuditService and Builder Implementation (2 points)

- Implement AuditService with high-level API methods
- Create entity-specific builder classes (User, Team, Migration, Instance)
- Implement state comparison and diff generation logic
- Add GDPR classification and tagging functionality
- Implement asynchronous audit logging with queue management
- **Deliverables**: AuditService, builder classes, comprehensive unit tests

### Phase 3: Repository and Query Optimization (1 point)

- Implement AuditRepository with CRUD and JSONB query methods
- Create efficient queries using existing B-tree and new GIN indexes
- Add GDPR compliance methods (export, anonymize)
- Implement statistical queries for reporting
- Performance testing with 100K+ audit records
- **Deliverables**: AuditRepository, integration tests, performance benchmarks

### Phase 4: Admin GUI Integration and Testing (1 point)

- Create Admin GUI audit viewing component with JSON display
- Implement filtering, search, pagination using JSONB queries
- Add export functionality (CSV, JSON) with date range selection
- Create detailed audit record viewing with collapsible JSON
- Integration testing with existing Admin GUI patterns
- **Deliverables**: Frontend component, UI tests, user documentation

---

## Definition of Done

- [x] Existing audit_log_aud schema validated and documented
- [ ] Comprehensive JSON schema specifications created for all entity types
- [ ] GIN indexes added with CONCURRENTLY (no table locks)
- [ ] AuditService implemented with entity-specific builders
- [ ] AuditRepository implemented with JSONB query methods
- [ ] Asynchronous audit logging implemented with performance validation
- [ ] Admin GUI audit viewing interface completed and tested
- [ ] Export functionality (CSV/JSON) working with JSONB data
- [ ] GDPR compliance features validated (export, anonymize)
- [ ] Performance benchmarks met (<5% API overhead, <3s audit queries)
- [ ] 90%+ test coverage for all audit logging components
- [ ] Integration testing completed with existing API endpoints
- [ ] Documentation updated including JSON schema guide
- [ ] Security review completed for audit data access controls

---

## Success Metrics

- **JSON Schema Coverage**: 100% coverage for all 25+ entity types
- **Query Performance**: Audit searches complete in <3s for 100K+ records using GIN indexes
- **API Performance**: <5% overhead on existing API response times with async logging
- **Storage Efficiency**: Average audit entry size <5KB (well within 50KB JSONB limit)
- **GDPR Compliance**: 100% GDPR-relevant data properly tagged and queryable
- **Index Effectiveness**: 90%+ of JSONB queries using GIN indexes (no seq scans)
- **System Reliability**: 99.9% audit logging availability with graceful degradation

---

## Risks and Mitigation

### Technical Risks

- **JSONB Size Limits**: Large entities may exceed 50KB limit
  - _Mitigation_: Implement compression, summarization, and reference patterns for oversized entries
- **Query Performance**: Complex JSONB path queries may be slow
  - _Mitigation_: GIN indexes, query optimization, efficient JSON structure design
- **Schema Evolution**: JSON schema changes may break existing queries
  - _Mitigation_: Version field in metadata, backward-compatible schema changes, migration utilities

### Business Risks

- **Compliance Gaps**: Incomplete GDPR data tagging may impact compliance
  - _Mitigation_: Comprehensive testing, automated GDPR classification, audit verification
- **Storage Growth**: JSONB may use more space than normalized columns
  - _Mitigation_: Retention policies, archiving strategies, compression patterns

---

## Testing Strategy

### Unit Testing

- JSON schema validation and builder pattern functionality
- State comparison and diff generation accuracy
- GDPR classification logic correctness
- JSON size management and compression strategies
- Builder output validation for all entity types

### Integration Testing

- AuditService integration with existing APIs
- Repository JSONB query correctness and performance
- GIN index usage validation with EXPLAIN ANALYZE
- Admin GUI integration with JSONB data display
- Export functionality with large datasets

### Performance Testing

- Audit logging overhead on existing APIs (<5% target)
- JSONB query performance with 100K+ records (<3s target)
- GIN index effectiveness vs sequential scans
- Bulk operation performance with batch inserts
- Concurrent audit logging operations

### Security Testing

- Audit log access controls and RBAC enforcement
- GDPR data export completeness and accuracy
- Anonymization effectiveness for sensitive data
- JSON injection prevention in audit details

---

## Related Documentation

- **Existing Schema**: `audit_log_aud` table structure and indexes
- **JSONB Documentation**: PostgreSQL JSONB operators and GIN indexes
- **GDPR Patterns**: ADR-TBD for GDPR compliance implementation
- **API Patterns**: `src/groovy/umig/api/v2/TeamsApi.groovy` reference
- **Admin GUI Architecture**: US-031 established patterns

---

## Change Log

| Date       | Version | Changes                                                         | Author |
| ---------- | ------- | --------------------------------------------------------------- | ------ |
| 2025-10-08 | 3.0     | Consolidated as canonical version (removed REVISED designation) | System |
| 2025-01-08 | 2.0     | Revised for existing schema with JSONB focus                    | System |
| 2025-09-10 | 1.1     | Original version with full schema design                        | System |
| 2025-09-10 | 1.0     | Initial story creation from US-041 split                        | System |

---

**Story Status**: Ready for Implementation (Revised for Existing Schema)
**Next Action**: Begin JSON schema design and documentation
**Risk Level**: Low (leverages existing infrastructure, focused on service layer)
**Strategic Priority**: High (critical compliance capability with reduced implementation cost)
**Integration**: Can run parallel with US-082 epic implementation
**Cost Savings**: 3 story points saved by leveraging existing database schema
