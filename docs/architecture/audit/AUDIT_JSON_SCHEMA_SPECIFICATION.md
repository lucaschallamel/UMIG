# UMIG Audit Logging JSON Schema Specification

## Document Purpose

This document provides comprehensive JSON schema specifications for the `aud_details` JSONB column in the `audit_log_aud` table. It serves as the authoritative reference for implementing audit logging across all UMIG entity types and operations.

**Version**: 1.0
**Last Updated**: January 8, 2025
**Owner**: Infrastructure Team
**Related**: US-041A-REVISED

---

## Table of Contents

1. [Schema Design Principles](#schema-design-principles)
2. [Base Structure (All Entities)](#base-structure-all-entities)
3. [Entity-Specific Schemas](#entity-specific-schemas)
4. [Action-Specific Patterns](#action-specific-patterns)
5. [Size Management Strategies](#size-management-strategies)
6. [Query Patterns and Indexes](#query-patterns-and-indexes)
7. [Validation and Testing](#validation-and-testing)
8. [Evolution and Versioning](#evolution-and-versioning)

---

## Schema Design Principles

### 1. Consistency

- All audit entries share common top-level structure
- Predictable field names and types across entities
- Standard patterns for recurring concepts

### 2. Flexibility

- Entity-specific extensions in `entitySpecific` object
- Action-specific data in appropriate sections
- Extensible without breaking existing queries

### 3. Queryability

- Flat structure where possible for efficient JSON path queries
- GIN indexes on frequently queried paths
- Avoid excessive nesting (maximum 3 levels deep)

### 4. Size Management

- Store only changed fields for UPDATE operations
- Compress large payloads using summarization
- Reference external storage for oversized data

### 5. GDPR Compliance

- Explicit personal data tagging
- Clear data categorization
- Retention policy metadata

---

## Base Structure (All Entities)

**Every audit entry MUST include these top-level sections:**

```json
{
  "request": {
    "ip": "string (IP address)",
    "userAgent": "string (browser/client identifier)",
    "sessionId": "string (session identifier)",
    "endpoint": "string (API endpoint path)",
    "method": "string (HTTP method: GET|POST|PUT|DELETE)",
    "timestamp": "string (ISO 8601 timestamp)"
  },
  "state": {
    "previous": "object|null (pre-operation state)",
    "current": "object|null (post-operation state)",
    "changes": "array[object] (specific field changes)"
  },
  "context": {
    "reason": "string (operation reason/purpose)",
    "bulkOperation": "boolean (part of bulk operation)",
    "affectedCount": "integer (number of entities affected)",
    "cascadeEffects": "array[object] (downstream impacts)"
  },
  "gdpr": {
    "personalData": "boolean (contains personal data)",
    "dataCategory": "string (identity|contact|behavioral|financial|health)",
    "retentionPolicy": "string (retention period identifier)",
    "expiryDate": "string|null (ISO 8601 date)",
    "autoDelete": "boolean (auto-delete when expired)"
  },
  "metadata": {
    "version": "string (schema version, e.g., '1.0')",
    "schemaType": "string (specific schema identifier)",
    "compressed": "boolean (data compressed/summarized)"
  },
  "entitySpecific": {
    "...": "object (entity-specific fields - see entity schemas)"
  }
}
```

### Field Specifications

#### request

| Field     | Type   | Required | Description                               |
| --------- | ------ | -------- | ----------------------------------------- |
| ip        | string | Yes      | Client IP address (IPv4 or IPv6)          |
| userAgent | string | Yes      | Browser/client user agent string          |
| sessionId | string | No       | Session identifier (if available)         |
| endpoint  | string | Yes      | API endpoint path (e.g., `/custom/users`) |
| method    | string | Yes      | HTTP method (GET, POST, PUT, DELETE)      |
| timestamp | string | Yes      | Request timestamp (ISO 8601 format)       |

#### state

| Field    | Type         | Required            | Description                   |
| -------- | ------------ | ------------------- | ----------------------------- |
| previous | object\|null | No (not for CREATE) | Entity state before operation |
| current  | object\|null | No (not for DELETE) | Entity state after operation  |
| changes  | array        | No (for UPDATE)     | Specific field-level changes  |

**changes array structure**:

```json
[
  {
    "field": "string (field name)",
    "from": "any (previous value)",
    "to": "any (new value)",
    "type": "string (GDPR_RELEVANT|OPERATIONAL|STANDARD)"
  }
]
```

#### context

| Field          | Type    | Required | Description                             |
| -------------- | ------- | -------- | --------------------------------------- |
| reason         | string  | No       | Why operation was performed             |
| bulkOperation  | boolean | Yes      | Part of bulk operation (default: false) |
| affectedCount  | integer | No       | Number of entities affected             |
| cascadeEffects | array   | No       | Downstream impacts/cascade operations   |

#### gdpr

| Field           | Type    | Required | Description                                    |
| --------------- | ------- | -------- | ---------------------------------------------- |
| personalData    | boolean | Yes      | Contains personal data requiring GDPR tracking |
| dataCategory    | string  | No       | Data classification (if personalData=true)     |
| retentionPolicy | string  | No       | Retention period identifier                    |
| expiryDate      | string  | No       | Expiration date (ISO 8601)                     |
| autoDelete      | boolean | No       | Auto-delete when expired (default: false)      |

**Data Categories**:

- `identity`: Name, ID numbers, demographic data
- `contact`: Email, phone, address
- `behavioral`: Usage patterns, preferences
- `financial`: Payment, billing information
- `health`: Medical or health-related data
- `operational`: System operational data (non-personal)

#### metadata

| Field      | Type    | Required | Description                                 |
| ---------- | ------- | -------- | ------------------------------------------- |
| version    | string  | Yes      | Schema version (semantic versioning)        |
| schemaType | string  | Yes      | Specific schema identifier                  |
| compressed | boolean | No       | Data compressed/summarized (default: false) |

---

## Entity-Specific Schemas

### Users Entity (`users_usr`)

**Schema Type**: `user_create|user_update|user_delete`

```json
{
  "entitySpecific": {
    "roleChanges": [
      {
        "role": "string (role identifier: admin|pilot|viewer)",
        "action": "string (added|removed|modified)",
        "grantedBy": "string (username who granted)",
        "timestamp": "string (ISO 8601)"
      }
    ],
    "permissionChanges": {
      "before": "array[string] (previous permissions)",
      "after": "array[string] (new permissions)"
    },
    "profileFields": "array[string] (changed profile field names)",
    "securityEvents": {
      "type": "string (password_change|mfa_enabled|account_locked|password_reset)",
      "triggeredBy": "string (user|system|admin)",
      "reason": "string (optional reason)"
    }
  }
}
```

**Example - User Creation**:

```json
{
  "request": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "sessionId": "sess-abc123",
    "endpoint": "/rest/scriptrunner/latest/custom/users",
    "method": "POST",
    "timestamp": "2025-01-08T10:30:00Z"
  },
  "state": {
    "current": {
      "usr_id": 123,
      "usr_name": "john.doe",
      "usr_email": "john.doe@example.com",
      "usr_first_name": "John",
      "usr_last_name": "Doe",
      "usr_active": true
    }
  },
  "context": {
    "reason": "New team member onboarding",
    "bulkOperation": false,
    "affectedCount": 1,
    "createdVia": "admin_gui"
  },
  "gdpr": {
    "personalData": true,
    "dataCategory": "identity",
    "retentionPolicy": "7_years",
    "expiryDate": "2032-01-08",
    "autoDelete": false
  },
  "metadata": {
    "version": "1.0",
    "schemaType": "user_create",
    "compressed": false
  },
  "entitySpecific": {
    "profileFields": ["usr_email", "usr_first_name", "usr_last_name"],
    "initialRoles": ["viewer"],
    "securityEvents": {
      "type": "account_created",
      "triggeredBy": "admin"
    }
  }
}
```

**Example - User Update (Email Change)**:

```json
{
  "request": {
    /* standard */
  },
  "state": {
    "previous": {
      "usr_email": "old.email@example.com"
    },
    "current": {
      "usr_email": "new.email@example.com"
    },
    "changes": [
      {
        "field": "usr_email",
        "from": "old.email@example.com",
        "to": "new.email@example.com",
        "type": "GDPR_RELEVANT"
      }
    ]
  },
  "context": {
    "reason": "User email update request",
    "bulkOperation": false
  },
  "gdpr": {
    "personalData": true,
    "dataCategory": "contact"
  },
  "metadata": {
    "version": "1.0",
    "schemaType": "user_update"
  },
  "entitySpecific": {
    "profileFields": ["usr_email"],
    "securityEvents": {
      "type": "email_change",
      "triggeredBy": "user"
    }
  }
}
```

---

### Teams Entity (`teams_tem`)

**Schema Type**: `team_create|team_update|team_delete`

```json
{
  "entitySpecific": {
    "membershipChanges": {
      "added": [
        {
          "usr_id": "integer",
          "usr_name": "string",
          "role": "string (owner|member|viewer)",
          "addedBy": "string (username)",
          "timestamp": "string (ISO 8601)"
        }
      ],
      "removed": [
        {
          "usr_id": "integer",
          "usr_name": "string",
          "reason": "string (removed|left|inactive)",
          "removedBy": "string (username)",
          "timestamp": "string (ISO 8601)"
        }
      ],
      "roleChanged": [
        {
          "usr_id": "integer",
          "usr_name": "string",
          "previousRole": "string",
          "newRole": "string",
          "changedBy": "string (username)"
        }
      ]
    },
    "hierarchyImpact": {
      "affectedMigrations": "array[string] (migration UUIDs)",
      "affectedIterations": "array[string] (iteration UUIDs)",
      "affectedPlans": "array[string] (plan UUIDs)",
      "propagationScope": "string (immediate|deferred)",
      "estimatedImpact": "string (low|medium|high)"
    },
    "teamProperties": {
      "teamType": "string (operational|project|support)",
      "primaryResponsibility": "string (area of responsibility)",
      "contactInfo": {
        "email": "string",
        "slack": "string",
        "escalation": "string"
      }
    }
  }
}
```

**Example - Team Member Addition**:

```json
{
  "request": {
    /* standard */
  },
  "state": {
    "previous": {
      "team_members": ["user1", "user2"]
    },
    "current": {
      "team_members": ["user1", "user2", "user3"]
    },
    "changes": [
      {
        "field": "team_members",
        "from": 2,
        "to": 3,
        "type": "OPERATIONAL"
      }
    ]
  },
  "context": {
    "reason": "Team expansion for new project",
    "bulkOperation": false
  },
  "metadata": {
    "version": "1.0",
    "schemaType": "team_update"
  },
  "entitySpecific": {
    "membershipChanges": {
      "added": [
        {
          "usr_id": 789,
          "usr_name": "jane.smith",
          "role": "member",
          "addedBy": "team.lead",
          "timestamp": "2025-01-08T10:30:00Z"
        }
      ],
      "removed": [],
      "roleChanged": []
    },
    "hierarchyImpact": {
      "affectedMigrations": ["mig-uuid-1", "mig-uuid-2"],
      "propagationScope": "immediate",
      "estimatedImpact": "low"
    }
  }
}
```

---

### PILOT Instance Entities (Plans/Sequences/Phases/Steps)

**Schema Type**: `plan_create|sequence_create|phase_create|step_create` (and \_update, \_delete variants)

```json
{
  "entitySpecific": {
    "instanceType": "string (plan_instance|sequence_instance|phase_instance|step_instance)",
    "masterTemplate": "string (UUID of master template)",
    "instanceNumber": "integer (instance number in sequence)",
    "totalInstances": "integer (total instances generated)",
    "hierarchy": {
      "migration_id": "string (UUID)",
      "migration_name": "string",
      "migration_code": "string",
      "iteration_id": "string (UUID)",
      "iteration_name": "string",
      "iteration_number": "integer",
      "parent_plan_id": "string (UUID, for sequences)",
      "parent_plan_name": "string",
      "parent_sequence_id": "string (UUID, for phases)",
      "parent_sequence_name": "string",
      "parent_phase_id": "string (UUID, for steps)",
      "parent_phase_name": "string",
      "depth_level": "integer (hierarchy depth: 0=plan, 3=step)"
    },
    "statusChange": {
      "from": "string (previous status)",
      "to": "string (new status)",
      "timestamp": "string (ISO 8601)",
      "changedBy": "string (username)",
      "reason": "string (status change reason)",
      "automated": "boolean (automated vs manual change)"
    },
    "generationContext": {
      "bulkOperation": "boolean",
      "batchId": "string (UUID for bulk generation batch)",
      "generatedAt": "string (ISO 8601)",
      "generatedBy": "string (username)",
      "totalOperations": "integer",
      "estimatedDuration": "string (e.g., '30 minutes')",
      "dependencies": "array[string] (dependent entity UUIDs)",
      "validationPassed": "boolean",
      "automationUsed": "boolean"
    },
    "executionMetadata": {
      "assignedTeam": "string (team UUID)",
      "assignedUser": "string (user ID)",
      "scheduledStart": "string (ISO 8601)",
      "scheduledEnd": "string (ISO 8601)",
      "actualStart": "string (ISO 8601)",
      "actualEnd": "string (ISO 8601)",
      "progress": "integer (0-100 percentage)",
      "blockers": "array[string] (blocker descriptions)"
    }
  }
}
```

**Example - Plan Instance Creation**:

```json
{
  "request": {
    /* standard */
  },
  "state": {
    "current": {
      "pli_id": "plan-instance-uuid-123",
      "pli_name": "Application Migration - Plan 3",
      "pli_code": "PLAN-003",
      "pli_status": "pending",
      "pli_master_id": "master-plan-uuid-789"
    }
  },
  "context": {
    "reason": "Iteration instance generation",
    "bulkOperation": true,
    "affectedCount": 12,
    "generatedFrom": "master_template"
  },
  "metadata": {
    "version": "1.0",
    "schemaType": "plan_create"
  },
  "entitySpecific": {
    "instanceType": "plan_instance",
    "masterTemplate": "master-plan-uuid-789",
    "instanceNumber": 3,
    "totalInstances": 12,
    "hierarchy": {
      "migration_id": "mig-uuid-001",
      "migration_name": "Data Center Migration 2025",
      "migration_code": "DCM-2025-Q1",
      "iteration_id": "iter-uuid-001",
      "iteration_name": "Wave 1: Applications",
      "iteration_number": 1,
      "depth_level": 0
    },
    "generationContext": {
      "bulkOperation": true,
      "batchId": "batch-20250108-001",
      "generatedAt": "2025-01-08T10:00:00Z",
      "generatedBy": "admin.user",
      "totalOperations": 12,
      "estimatedDuration": "30 minutes",
      "dependencies": [],
      "validationPassed": true,
      "automationUsed": true
    },
    "executionMetadata": {
      "assignedTeam": "team-uuid-app-team",
      "scheduledStart": "2025-02-01T08:00:00Z",
      "scheduledEnd": "2025-02-01T18:00:00Z",
      "progress": 0,
      "blockers": []
    }
  }
}
```

**Example - Step Instance Status Update**:

```json
{
  "request": {
    /* standard */
  },
  "state": {
    "previous": {
      "sti_status": "pending"
    },
    "current": {
      "sti_status": "in_progress"
    },
    "changes": [
      {
        "field": "sti_status",
        "from": "pending",
        "to": "in_progress",
        "type": "OPERATIONAL"
      }
    ]
  },
  "context": {
    "reason": "Step execution started",
    "bulkOperation": false
  },
  "metadata": {
    "version": "1.0",
    "schemaType": "step_update"
  },
  "entitySpecific": {
    "instanceType": "step_instance",
    "hierarchy": {
      "migration_id": "mig-uuid-001",
      "iteration_id": "iter-uuid-001",
      "parent_plan_id": "plan-instance-uuid-123",
      "parent_sequence_id": "seq-instance-uuid-456",
      "parent_phase_id": "phase-instance-uuid-789",
      "depth_level": 3
    },
    "statusChange": {
      "from": "pending",
      "to": "in_progress",
      "timestamp": "2025-01-08T10:30:00Z",
      "changedBy": "pilot.user",
      "reason": "Starting database migration step",
      "automated": false
    },
    "executionMetadata": {
      "assignedUser": 456,
      "actualStart": "2025-01-08T10:30:00Z",
      "progress": 0
    }
  }
}
```

---

### Migrations Entity (`migrations_mig`)

**Schema Type**: `migration_create|migration_update|migration_delete`

```json
{
  "entitySpecific": {
    "migrationType": "string (datacenter|application|infrastructure)",
    "scope": {
      "environments": "array[string] (environment UUIDs)",
      "applications": "array[string] (application UUIDs)",
      "teams": "array[string] (team UUIDs)",
      "estimatedSystems": "integer"
    },
    "timeline": {
      "plannedStart": "string (ISO 8601)",
      "plannedEnd": "string (ISO 8601)",
      "actualStart": "string (ISO 8601)",
      "actualEnd": "string (ISO 8601)",
      "milestones": [
        {
          "name": "string",
          "date": "string (ISO 8601)",
          "status": "string (pending|achieved|missed)"
        }
      ]
    },
    "riskAssessment": {
      "overallRisk": "string (low|medium|high|critical)",
      "identifiedRisks": "array[object]",
      "mitigationPlans": "array[object]"
    }
  }
}
```

---

### Applications Entity (`applications_app`)

**Schema Type**: `application_create|application_update|application_delete`

```json
{
  "entitySpecific": {
    "applicationType": "string (web|mobile|desktop|service)",
    "technology": {
      "stack": "string (e.g., 'Java Spring Boot')",
      "version": "string",
      "dependencies": "array[string]"
    },
    "ownership": {
      "primaryTeam": "string (team UUID)",
      "technicalOwner": "integer (user ID)",
      "businessOwner": "integer (user ID)"
    },
    "environmentStatus": {
      "development": "string (status)",
      "staging": "string (status)",
      "production": "string (status)"
    }
  }
}
```

---

## Action-Specific Patterns

### CREATE Operations

**Characteristics**:

- No `previous` state
- Full `current` state
- Creation context in `context.createdVia`

**Standard Structure**:

```json
{
  "state": {
    "current": {
      /* full entity state */
    }
  },
  "context": {
    "createdBy": "string (username)",
    "createdVia": "string (admin_gui|api|import|automation)",
    "sourceSystem": "string (manual|imported_from_csv|automated)",
    "validationPassed": "boolean"
  }
}
```

### UPDATE Operations

**Characteristics**:

- `previous` contains only changed fields
- `current` contains only changed fields
- `changes` array with detailed field-level changes

**Standard Structure**:

```json
{
  "state": {
    "previous": {
      /* only changed fields */
    },
    "current": {
      /* only changed fields */
    },
    "changes": [
      {
        "field": "field_name",
        "from": "old_value",
        "to": "new_value",
        "type": "GDPR_RELEVANT|OPERATIONAL|STANDARD"
      }
    ]
  },
  "context": {
    "reason": "string (why update was made)",
    "bulkOperation": "boolean",
    "conflictResolution": "string (none|auto|manual)"
  }
}
```

### DELETE Operations

**Characteristics**:

- `previous` contains full entity state
- No `current` state
- Deletion metadata in context

**Standard Structure**:

```json
{
  "state": {
    "previous": {
      /* full entity state */
    },
    "deletionType": "string (soft|hard)",
    "cascadeDeletes": [
      {
        "entity": "string (entity type)",
        "count": "integer (number deleted)"
      }
    ]
  },
  "context": {
    "reason": "string (deletion reason)",
    "recoverable": "boolean",
    "archiveLocation": "string (backup location if applicable)"
  }
}
```

### VIEW/READ Operations (Optional)

**Characteristics**:

- Lightweight logging for sensitive data access
- No state changes
- Focuses on access metadata

**Standard Structure**:

```json
{
  "request": {
    /* standard */
  },
  "context": {
    "accessType": "string (read|export|download)",
    "dataScope": "string (full|partial|summary)",
    "purpose": "string (troubleshooting|reporting|audit)"
  },
  "gdpr": {
    "personalData": "boolean",
    "dataSubjectId": "integer (user ID whose data was accessed)"
  }
}
```

---

## Size Management Strategies

### 50KB JSONB Limit Management

**Problem**: JSONB column has practical limit around 50KB for performance
**Solution**: Multi-tiered approach based on entry size

#### Strategy 1: Changed Fields Only (Default for UPDATE)

```groovy
// In AuditDetailsBuilder
def buildUpdateDetails(Map previousState, Map currentState, List changes) {
    return [
        state: [
            // Only store changed fields, not full state
            previous: previousState.subMap(changes.collect { it.field }),
            current: currentState.subMap(changes.collect { it.field }),
            changes: changes
        ]
    ]
}
```

**Savings**: 70-90% size reduction for typical updates

#### Strategy 2: Summarization for Large Entities

```groovy
def compressLargePayload(Map details) {
    def json = JsonOutput.toJson(details)
    if (json.length() > 40000) { // Approaching 50KB
        return [
            compressed: true,
            summary: createSummary(details),
            fieldCount: details.state?.changes?.size() ?: 0,
            entityType: details.metadata.schemaType,
            fullStateRef: null // Can reference external storage if needed
        ]
    }
    return details
}

def createSummary(Map details) {
    return [
        changedFields: details.state?.changes?.collect { it.field } ?: [],
        changeCount: details.state?.changes?.size() ?: 0,
        hasGdprData: details.gdpr?.personalData ?: false,
        timestamp: details.request?.timestamp
    ]
}
```

**Indicator**: `metadata.compressed = true`

#### Strategy 3: External Reference Storage (Rare Cases)

For entities that genuinely need >50KB (complex hierarchies, bulk operations with many details):

```json
{
  "metadata": {
    "compressed": true,
    "externalReference": true
  },
  "summary": {
    "changeCount": 150,
    "affectedEntities": ["uuid1", "uuid2", "..."],
    "operationType": "bulk_migration_instance_generation"
  },
  "fullStateLocation": {
    "table": "audit_overflow_storage",
    "ref_id": "overflow-uuid-123"
  }
}
```

**When to Use**: Only if compressed summary still exceeds 45KB

### Monitoring and Alerts

```sql
-- Query to find large audit entries
SELECT
    aud_id,
    aud_entity_type,
    aud_action,
    pg_column_size(aud_details) as size_bytes,
    (aud_details ->> 'metadata.compressed')::boolean as is_compressed
FROM audit_log_aud
WHERE pg_column_size(aud_details) > 40000
ORDER BY size_bytes DESC
LIMIT 100;
```

---

## Query Patterns and Indexes

### Existing B-tree Indexes (Already Optimized)

```sql
-- User activity queries
SELECT * FROM audit_log_aud
WHERE usr_id = ?
ORDER BY aud_timestamp DESC;
-- Uses: idx_audit_log_user_activity

-- Entity history queries
SELECT * FROM audit_log_aud
WHERE aud_entity_type = 'users'
AND aud_entity_id = ?
ORDER BY aud_timestamp DESC;
-- Uses: idx_audit_log_user_entity

-- Role change queries
SELECT * FROM audit_log_aud
WHERE aud_entity_type = 'users'
AND aud_action = 'UPDATE'
ORDER BY aud_timestamp DESC;
-- Uses: idx_audit_log_role_changes
```

### New GIN Indexes for JSONB Paths

```sql
-- GDPR personal data queries
SELECT * FROM audit_log_aud
WHERE (aud_details -> 'gdpr' ->> 'personalData')::boolean = true
AND aud_entity_id = ?;
-- Uses: idx_audit_gdpr_personal

-- Hierarchy queries (PILOT instances)
SELECT * FROM audit_log_aud
WHERE aud_details -> 'entitySpecific' -> 'hierarchy' ->> 'migration_id' = ?
ORDER BY aud_timestamp DESC;
-- Uses: idx_audit_hierarchy

-- Request metadata queries (IP tracking)
SELECT * FROM audit_log_aud
WHERE aud_details -> 'request' ->> 'ip' = '192.168.1.100'
AND aud_timestamp > NOW() - INTERVAL '24 hours';
-- Uses: idx_audit_request_metadata
```

### Complex Query Patterns

**Find all bulk operations that failed validation**:

```sql
SELECT
    aud_entity_type,
    aud_action,
    aud_details -> 'context' ->> 'bulkOperation' as is_bulk,
    aud_details -> 'entitySpecific' -> 'generationContext' ->> 'validationPassed' as validation,
    COUNT(*) as count
FROM audit_log_aud
WHERE (aud_details -> 'context' ->> 'bulkOperation')::boolean = true
AND (aud_details -> 'entitySpecific' -> 'generationContext' ->> 'validationPassed')::boolean = false
GROUP BY aud_entity_type, aud_action, is_bulk, validation;
```

**Find all GDPR-relevant changes in last 30 days**:

```sql
SELECT
    aud_entity_type,
    aud_entity_id,
    aud_details -> 'state' -> 'changes' as changes,
    aud_timestamp
FROM audit_log_aud
WHERE (aud_details -> 'gdpr' ->> 'personalData')::boolean = true
AND aud_timestamp > NOW() - INTERVAL '30 days'
ORDER BY aud_timestamp DESC;
```

**Reconstruct instance hierarchy for migration**:

```sql
SELECT
    aud_entity_type,
    aud_entity_id,
    aud_details -> 'entitySpecific' ->> 'instanceType' as instance_type,
    (aud_details -> 'entitySpecific' ->> 'instanceNumber')::int as instance_num,
    aud_details -> 'entitySpecific' -> 'hierarchy' ->> 'parent_plan_id' as parent_plan,
    aud_action,
    aud_timestamp
FROM audit_log_aud
WHERE aud_details -> 'entitySpecific' -> 'hierarchy' ->> 'migration_id' = ?
AND aud_entity_type IN ('plans', 'sequences', 'phases', 'steps')
ORDER BY instance_type, instance_num, aud_timestamp;
```

---

## Validation and Testing

### Schema Validation

**Groovy Validation Helper**:

```groovy
class AuditSchemaValidator {

    static boolean validateBaseStructure(Map details) {
        def required = ['request', 'metadata']

        return required.every { details.containsKey(it) } &&
               validateRequest(details.request) &&
               validateMetadata(details.metadata)
    }

    static boolean validateRequest(Map request) {
        def required = ['ip', 'userAgent', 'endpoint', 'method', 'timestamp']
        return required.every { request.containsKey(it) }
    }

    static boolean validateMetadata(Map metadata) {
        def required = ['version', 'schemaType']
        return required.every { metadata.containsKey(it) }
    }

    static boolean validateGdprSection(Map gdpr) {
        if (!gdpr) return true // GDPR section is optional

        if (gdpr.personalData == true) {
            // Personal data must have category
            return gdpr.dataCategory != null
        }
        return true
    }

    static boolean validateStateChanges(Map state, String action) {
        switch (action) {
            case 'CREATE':
                return state.current != null && state.previous == null
            case 'UPDATE':
                return state.previous != null && state.current != null && state.changes != null
            case 'DELETE':
                return state.previous != null && state.current == null
            default:
                return true
        }
    }
}
```

### Unit Tests

```groovy
class AuditSchemaValidationTest {

    void testUserCreateSchema() {
        def builder = new UserAuditDetailsBuilder()
        def details = builder.buildCreateDetails(
            [usr_id: 123, usr_email: 'test@example.com'],
            [userName: 'admin', endpoint: '/users', method: 'POST']
        )

        assert AuditSchemaValidator.validateBaseStructure(details)
        assert details.metadata.schemaType == 'user_create'
        assert details.gdpr.personalData == true
        assert details.state.current != null
        assert details.state.previous == null
    }

    void testInstanceCreateSchema() {
        def builder = new InstanceAuditDetailsBuilder('plan')
        def details = builder.buildCreateDetails(
            [pli_id: UUID.randomUUID()],
            [migrationId: UUID.randomUUID(), iterationId: UUID.randomUUID()]
        )

        assert AuditSchemaValidator.validateBaseStructure(details)
        assert details.entitySpecific.instanceType == 'plan_instance'
        assert details.entitySpecific.hierarchy.migration_id != null
    }

    void testSizeLimit() {
        def largeState = createLargeEntityState(1000) // 1000 fields
        def builder = new UserAuditDetailsBuilder()
        def details = builder.buildUpdateDetails(largeState, largeState, [])

        def json = JsonOutput.toJson(details)
        assert json.length() < 50000, "Exceeded 50KB limit: ${json.length()}"
    }
}
```

---

## Evolution and Versioning

### Schema Version Strategy

**Semantic Versioning**: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (incompatible queries)
- **MINOR**: New optional fields (backward compatible)
- **PATCH**: Documentation/clarification only

**Current Version**: `1.0`

### Backward Compatibility

**Adding New Fields** (MINOR version):

```json
{
  "metadata": {
    "version": "1.1" // Incremented
  },
  "entitySpecific": {
    "newOptionalField": "value", // New field added
    "existingField": "value" // Existing fields unchanged
  }
}
```

**Query Compatibility**:

```sql
-- Old queries continue to work
SELECT * FROM audit_log_aud
WHERE aud_details -> 'entitySpecific' ->> 'existingField' = 'value';

-- New queries can use new fields
SELECT * FROM audit_log_aud
WHERE aud_details -> 'entitySpecific' ->> 'newOptionalField' IS NOT NULL;
```

### Migration Path for Breaking Changes

**If MAJOR version change required**:

1. **Dual Writing**: Write both old and new formats temporarily
2. **Backfill**: Update old entries with migration script
3. **Gradual Cutover**: Transition queries to new format
4. **Deprecation**: Remove old format support

**Example Migration**:

```groovy
class AuditSchemaV2Migration {
    void migrateV1ToV2() {
        DatabaseUtil.withSql { sql ->
            sql.eachRow("""
                SELECT aud_id, aud_details
                FROM audit_log_aud
                WHERE aud_details ->> 'metadata.version' = '1.0'
                LIMIT 1000
            """) { row ->
                def oldDetails = new JsonSlurper().parseText(row.aud_details)
                def newDetails = transformToV2(oldDetails)

                sql.executeUpdate("""
                    UPDATE audit_log_aud
                    SET aud_details = ?::jsonb
                    WHERE aud_id = ?
                """, [JsonOutput.toJson(newDetails), row.aud_id])
            }
        }
    }
}
```

---

## Appendix: Quick Reference

### Schema Type Naming Convention

**Format**: `{entity}_{action}` (lowercase, underscore-separated)

**Examples**:

- `user_create`, `user_update`, `user_delete`
- `team_create`, `team_update`, `team_delete`
- `plan_create`, `sequence_update`, `step_delete`
- `migration_create`, `application_update`

### Common JSONB Operators

| Operator | Description                   | Example                                           |
| -------- | ----------------------------- | ------------------------------------------------- |
| `->`     | Get JSON object field         | `aud_details -> 'request'`                        |
| `->>`    | Get JSON object field as text | `aud_details -> 'request' ->> 'ip'`               |
| `@>`     | Contains                      | `aud_details @> '{"gdpr":{"personalData":true}}'` |
| `?`      | Key exists                    | `aud_details -> 'entitySpecific' ? 'hierarchy'`   |
| `#>`     | Get JSON object at path       | `aud_details #> '{hierarchy,migration_id}'`       |
| `#>>`    | Get text at path              | `aud_details #>> '{hierarchy,migration_id}'`      |

### Size Estimation Guidelines

| Entity Type    | Typical Size | With History | Compressed |
| -------------- | ------------ | ------------ | ---------- |
| User           | 2-3 KB       | 1-2 KB       | 0.5 KB     |
| Team           | 3-5 KB       | 2-3 KB       | 1 KB       |
| Plan Instance  | 4-6 KB       | 2-3 KB       | 1-2 KB     |
| Step Instance  | 3-4 KB       | 1-2 KB       | 0.5-1 KB   |
| Bulk Operation | 10-20 KB     | 5-8 KB       | 2-3 KB     |

---

## Document Change Log

| Date       | Version | Changes                                    | Author |
| ---------- | ------- | ------------------------------------------ | ------ |
| 2025-01-08 | 1.0     | Initial comprehensive schema specification | System |

---

**Document Status**: Authoritative Reference
**Review Cycle**: Quarterly
**Next Review**: April 2025
**Maintainer**: Infrastructure Team
