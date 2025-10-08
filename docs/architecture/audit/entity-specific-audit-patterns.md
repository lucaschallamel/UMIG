# UMIG Entity-Specific Audit Patterns

**Version**: 1.0.0
**Date**: 2025-01-08
**Status**: Draft
**Related**: ADR-080 (Audit Framework), base-audit-schema.json

## Purpose

This document defines entity-specific audit patterns for all 25+ UMIG entity types, including:

- Field-level audit inclusion/exclusion rules
- Action-specific state structures (CREATE, UPDATE, DELETE, VIEW)
- Size optimization strategies
- GDPR classification and sensitive data handling
- Hierarchy tracking for instance entities

## Overview

### Entity Categories

1. **Core Entities** (8): Users, Teams, TeamMembers, Environments, Applications, Labels, Roles, SystemConfig
2. **Master Templates** (5): Migrations, Iterations, Plans, Sequences, Phases
3. **Instance Entities** (5): PlanInstances, SequenceInstances, PhaseInstances, StepInstances, Instructions
4. **Special Entities** (7): Steps, IterationTypes, MigrationTypes, EmailTemplates, StepTypes, Controls, Status

### Size Tiers

| Tier           | Size Range     | Entities                                            | Strategy              |
| -------------- | -------------- | --------------------------------------------------- | --------------------- |
| 1 - Small      | <500 bytes     | TeamMembers, Labels, Reference data (Types, Status) | Full state capture    |
| 2 - Medium     | 500-1500 bytes | Most core/master entities                           | Standard capture      |
| 3 - Large      | 1500-5KB       | StepInstances, EmailTemplates                       | Selective truncation  |
| 4 - Very Large | 5KB+           | StepInstances with extensive notes                  | Aggressive truncation |

---

## High-Priority Entities

### 1. Users Entity (usr\_\*)

**Classification**: GDPR Critical, Core Entity
**Average Size**: 800 bytes | **Worst-Case**: 1.2KB
**Volume**: Medium (100-1000 users)

#### Field Patterns

| Field         | Audit?   | Sensitive | Large | Special Handling | Reason                  |
| ------------- | -------- | --------- | ----- | ---------------- | ----------------------- |
| user_id       | ✅ Yes   | No        | No    | UUID             | Primary key             |
| username      | ✅ Yes   | ✅ PII    | No    | -                | Identity data (GDPR)    |
| email         | ✅ Yes   | ✅ PII    | No    | -                | Contact data (GDPR)     |
| full_name     | ✅ Yes   | ✅ PII    | No    | -                | Identity data (GDPR)    |
| employee_id   | ✅ Yes   | ✅ PII    | No    | -                | Identity data (GDPR)    |
| active_status | ✅ Yes   | No        | No    | Boolean          | Account status          |
| roles         | ✅ Yes   | No        | No    | Array            | Security-relevant       |
| created_at    | ✅ Yes   | No        | No    | Timestamp        | Audit trail             |
| last_login    | ❌ No    | No        | No    | -                | Too frequent, low value |
| password_hash | ❌ NEVER | ✅ Secret | No    | -                | Security risk           |
| session_token | ❌ NEVER | ✅ Secret | No    | -                | Security risk           |

#### GDPR Classification

| Data Category  | Fields                           | Legal Basis         | Retention |
| -------------- | -------------------------------- | ------------------- | --------- |
| Identity       | username, employee_id, full_name | Legitimate interest | 7 years   |
| Contact        | email                            | Legitimate interest | 7 years   |
| Administrative | roles, active_status             | Legitimate interest | 7 years   |

#### Action Patterns

**CREATE** - Full State

```json
{
  "entity_type": "users",
  "entity_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "CREATE",
  "state": {
    "username": "jsmith",
    "email": "john.smith@company.com",
    "full_name": "John Smith",
    "employee_id": "EMP12345",
    "active_status": true,
    "roles": ["user", "team_lead"],
    "created_at": "2024-01-15T10:30:00Z"
  },
  "size_bytes": 287
}
```

**UPDATE** - Changed Fields Only

```json
{
  "entity_type": "users",
  "entity_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "UPDATE",
  "changed_fields": ["roles", "active_status"],
  "before": {
    "roles": ["user"],
    "active_status": true
  },
  "after": {
    "roles": ["user", "admin"],
    "active_status": true
  },
  "size_bytes": 198
}
```

**DELETE** - Full State Snapshot

```json
{
  "entity_type": "users",
  "entity_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "DELETE",
  "state": {
    "username": "jsmith",
    "email": "john.smith@company.com",
    "full_name": "John Smith",
    "employee_id": "EMP12345",
    "roles": ["user", "admin"],
    "active_status": false,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "related_entities": {
    "team_memberships": 3,
    "step_assignments": 12
  },
  "size_bytes": 342
}
```

**VIEW** - Minimal Tracking

```json
{
  "entity_type": "users",
  "entity_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "VIEW",
  "fields_viewed": ["email", "roles"],
  "size_bytes": 87
}
```

---

### 2. Teams Entity (team\_\*)

**Classification**: Medium Volume, Organizational Data
**Average Size**: 600 bytes | **Worst-Case**: 2.5KB
**Volume**: Medium (50-500 teams)

#### Field Patterns

| Field         | Audit? | Sensitive | Large  | Special Handling | Reason            |
| ------------- | ------ | --------- | ------ | ---------------- | ----------------- |
| team_id       | ✅ Yes | No        | No     | UUID             | Primary key       |
| name          | ✅ Yes | No        | No     | -                | Team identifier   |
| description   | ✅ Yes | No        | ✅ Yes | Truncate >1KB    | May contain names |
| created_by    | ✅ Yes | No        | No     | UUID ref         | Audit trail       |
| created_at    | ✅ Yes | No        | No     | Timestamp        | Audit trail       |
| member_count  | ❌ No  | No        | No     | -                | Calculated field  |
| last_activity | ❌ No  | No        | No     | -                | Too frequent      |

#### GDPR Classification

| Data Category  | Fields                          | Legal Basis         | Retention |
| -------------- | ------------------------------- | ------------------- | --------- |
| Organizational | name, description               | Legitimate interest | 7 years   |
| Indirect PII   | description (may contain names) | Legitimate interest | 7 years   |

#### Action Patterns

**CREATE** - Full State

```json
{
  "entity_type": "teams",
  "entity_id": "660e8400-e29b-41d4-a716-446655440001",
  "action": "CREATE",
  "state": {
    "name": "Database Team",
    "description": "Responsible for PostgreSQL migrations and data integrity",
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T11:00:00Z"
  },
  "size_bytes": 234
}
```

**UPDATE** - Description Edit with Truncation

```json
{
  "entity_type": "teams",
  "entity_id": "660e8400-e29b-41d4-a716-446655440001",
  "action": "UPDATE",
  "changed_fields": ["description"],
  "before": {
    "description": "Responsible for PostgreSQL migrations..."
  },
  "after": {
    "description": "Responsible for PostgreSQL and Oracle migrations, data integrity, backup strategies... [TRUNCATED: 487 chars → 200 chars]"
  },
  "truncation_applied": true,
  "size_bytes": 276
}
```

**DELETE** - With Relationship Context

```json
{
  "entity_type": "teams",
  "entity_id": "660e8400-e29b-41d4-a716-446655440001",
  "action": "DELETE",
  "state": {
    "name": "Database Team",
    "description": "Responsible for PostgreSQL migrations...",
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T11:00:00Z"
  },
  "related_entities": {
    "team_members": 8,
    "applications": 5,
    "step_assignments": 23
  },
  "size_bytes": 389
}
```

---

### 3. StepInstances Entity (sti\_\*)

**Classification**: Highest Volume, Instance Entity
**Average Size**: 1.5KB | **Worst-Case**: 8KB
**Volume**: Very High (5000-50000 instances)

#### Field Patterns

| Field             | Audit? | Sensitive | Large  | Special Handling | Reason             |
| ----------------- | ------ | --------- | ------ | ---------------- | ------------------ |
| step_instance_id  | ✅ Yes | No        | No     | UUID             | Primary key        |
| phase_instance_id | ✅ Yes | No        | No     | UUID ref         | Hierarchy          |
| step_master_id    | ✅ Yes | No        | No     | UUID ref         | Template reference |
| status            | ✅ Yes | No        | No     | -                | Workflow tracking  |
| assigned_to       | ✅ Yes | ✅ PII    | No     | UUID ref         | User assignment    |
| actual_executor   | ✅ Yes | ✅ PII    | No     | UUID ref         | User assignment    |
| scheduled_start   | ✅ Yes | No        | No     | Timestamp        | Execution window   |
| scheduled_end     | ✅ Yes | No        | No     | Timestamp        | Execution window   |
| actual_start      | ✅ Yes | No        | No     | Timestamp        | Execution tracking |
| actual_end        | ✅ Yes | No        | No     | Timestamp        | Execution tracking |
| notes             | ✅ Yes | No        | ✅ Yes | Truncate >2KB    | Execution details  |
| issues            | ✅ Yes | No        | ✅ Yes | Truncate >2KB    | Problem tracking   |
| order_in_phase    | ✅ Yes | No        | No     | Integer          | Sequence tracking  |
| last_updated      | ❌ No  | No        | No     | -                | Too frequent       |

#### GDPR Classification

| Data Category | Fields                            | Legal Basis         | Retention |
| ------------- | --------------------------------- | ------------------- | --------- |
| Behavioral    | status, timestamps, notes, issues | Legitimate interest | 7 years   |
| Identity      | assigned_to, actual_executor      | Legitimate interest | 7 years   |

#### Hierarchy Tracking

**Minimal Chain** (Default - 200 bytes)

```json
{
  "hierarchy_context": {
    "migration_id": "770e8400-e29b-41d4-a716-446655440002",
    "iteration_id": "880e8400-e29b-41d4-a716-446655440003",
    "parent_instance_id": "990e8400-e29b-41d4-a716-446655440004"
  }
}
```

**Full Chain** (Critical Operations - 400 bytes)

```json
{
  "hierarchy_context": {
    "migration": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Q4_2024_Migration"
    },
    "iteration": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "name": "Iteration_3"
    },
    "plan_instance": {
      "id": "aa0e8400-e29b-41d4-a716-446655440004",
      "name": "Plan_A"
    },
    "sequence_instance": {
      "id": "bb0e8400-e29b-41d4-a716-446655440005",
      "order": 1
    },
    "phase_instance": {
      "id": "cc0e8400-e29b-41d4-a716-446655440006",
      "order": 2
    }
  }
}
```

#### Action Patterns

**CREATE** - With Minimal Hierarchy

```json
{
  "entity_type": "step_instances",
  "entity_id": "dd0e8400-e29b-41d4-a716-446655440007",
  "action": "CREATE",
  "state": {
    "phase_instance_id": "cc0e8400-e29b-41d4-a716-446655440006",
    "step_master_id": "ee0e8400-e29b-41d4-a716-446655440008",
    "status": "NOT_STARTED",
    "assigned_to": "550e8400-e29b-41d4-a716-446655440000",
    "scheduled_start": "2024-01-20T14:00:00Z",
    "scheduled_end": "2024-01-20T16:00:00Z",
    "order_in_phase": 3
  },
  "hierarchy_context": {
    "migration_id": "770e8400-e29b-41d4-a716-446655440002",
    "iteration_id": "880e8400-e29b-41d4-a716-446655440003",
    "parent_instance_id": "cc0e8400-e29b-41d4-a716-446655440006"
  },
  "size_bytes": 512
}
```

**UPDATE** - Status Transition with Full Hierarchy

```json
{
  "entity_type": "step_instances",
  "entity_id": "dd0e8400-e29b-41d4-a716-446655440007",
  "action": "UPDATE",
  "changed_fields": ["status", "actual_start", "actual_executor"],
  "before": {
    "status": "NOT_STARTED",
    "actual_start": null,
    "actual_executor": null
  },
  "after": {
    "status": "IN_PROGRESS",
    "actual_start": "2024-01-20T14:05:00Z",
    "actual_executor": "ff0e8400-e29b-41d4-a716-446655440009"
  },
  "hierarchy_context": {
    "migration": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Q4_2024_Migration"
    },
    "iteration": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "name": "Iteration_3"
    },
    "phase_instance": {
      "id": "cc0e8400-e29b-41d4-a716-446655440006",
      "order": 2
    }
  },
  "size_bytes": 687
}
```

**UPDATE** - Large Notes with Truncation

```json
{
  "entity_type": "step_instances",
  "entity_id": "dd0e8400-e29b-41d4-a716-446655440007",
  "action": "UPDATE",
  "changed_fields": ["notes", "issues"],
  "before": {
    "notes": "Initial configuration...",
    "issues": null
  },
  "after": {
    "notes": "Database connection failed initially due to firewall rules. Opened ports 5432-5434. Retried connection successfully. Verified data integrity with checksums... [TRUNCATED: 3247 chars → 2000 chars]",
    "issues": "Firewall blocking PostgreSQL port. Required emergency change request CR-2024-0567 for production access... [TRUNCATED: 1876 chars → 2000 chars]"
  },
  "truncation_applied": true,
  "hierarchy_context": {
    "migration_id": "770e8400-e29b-41d4-a716-446655440002",
    "iteration_id": "880e8400-e29b-41d4-a716-446655440003",
    "parent_instance_id": "cc0e8400-e29b-41d4-a716-446655440006"
  },
  "size_bytes": 4543
}
```

**DELETE** - With Context Preservation

```json
{
  "entity_type": "step_instances",
  "entity_id": "dd0e8400-e29b-41d4-a716-446655440007",
  "action": "DELETE",
  "state": {
    "status": "COMPLETED",
    "assigned_to": "550e8400-e29b-41d4-a716-446655440000",
    "actual_executor": "ff0e8400-e29b-41d4-a716-446655440009",
    "actual_start": "2024-01-20T14:05:00Z",
    "actual_end": "2024-01-20T15:47:00Z",
    "notes": "Database migration completed successfully... [TRUNCATED]"
  },
  "hierarchy_context": {
    "migration": { "id": "...", "name": "Q4_2024_Migration" },
    "iteration": { "id": "...", "name": "Iteration_3" },
    "phase_instance": { "id": "...", "order": 2 }
  },
  "related_entities": {
    "instructions": 8
  },
  "size_bytes": 876
}
```

---

### 4. Instructions Entity (ins\_\*)

**Classification**: High Volume, Task-Level Entity
**Average Size**: 1KB | **Worst-Case**: 6KB
**Volume**: Very High (20000-200000 instructions)

#### Field Patterns

| Field            | Audit? | Sensitive | Large  | Special Handling | Reason              |
| ---------------- | ------ | --------- | ------ | ---------------- | ------------------- |
| instruction_id   | ✅ Yes | No        | No     | UUID             | Primary key         |
| step_instance_id | ✅ Yes | No        | No     | UUID ref         | Parent relationship |
| description      | ✅ Yes | No        | ✅ Yes | Truncate >3KB    | Task details        |
| command_text     | ✅ Yes | No        | ✅ Yes | Truncate >2KB    | Technical commands  |
| order_in_step    | ✅ Yes | No        | No     | Integer          | Sequence tracking   |
| is_automated     | ✅ Yes | No        | No     | Boolean          | Execution method    |
| execution_count  | ❌ No  | No        | No     | -                | Too frequent        |
| last_executed    | ❌ No  | No        | No     | -                | Too frequent        |

#### GDPR Classification

| Data Category | Fields                           | Legal Basis         | Retention |
| ------------- | -------------------------------- | ------------------- | --------- |
| Operational   | description, command_text, order | Legitimate interest | 7 years   |
| None          | No personal data typically       | -                   | -         |

#### Action Patterns

**CREATE** - Full State

```json
{
  "entity_type": "instructions",
  "entity_id": "010e8400-e29b-41d4-a716-446655440010",
  "action": "CREATE",
  "state": {
    "step_instance_id": "dd0e8400-e29b-41d4-a716-446655440007",
    "description": "Execute database schema migration script for users table",
    "command_text": "psql -U umig_app -d umig_app_db -f migrations/V1.2.3__add_user_columns.sql",
    "order_in_step": 1,
    "is_automated": true
  },
  "size_bytes": 342
}
```

**UPDATE** - Command Edit with Truncation

```json
{
  "entity_type": "instructions",
  "entity_id": "010e8400-e29b-41d4-a716-446655440010",
  "action": "UPDATE",
  "changed_fields": ["command_text"],
  "before": {
    "command_text": "psql -U umig_app -d umig_app_db -f migrations/V1.2.3__add_user_columns.sql"
  },
  "after": {
    "command_text": "psql -U umig_app -d umig_app_db -f migrations/V1.2.3__add_user_columns.sql --set ON_ERROR_STOP=1 --set VERBOSITY=verbose --log-file=/var/log/migrations/V1.2.3.log --echo-queries... [TRUNCATED: 2456 chars → 2000 chars]"
  },
  "truncation_applied": true,
  "size_bytes": 2287
}
```

**DELETE** - Minimal Context

```json
{
  "entity_type": "instructions",
  "entity_id": "010e8400-e29b-41d4-a716-446655440010",
  "action": "DELETE",
  "state": {
    "step_instance_id": "dd0e8400-e29b-41d4-a716-446655440007",
    "description": "Execute database schema migration...",
    "order_in_step": 1,
    "is_automated": true
  },
  "size_bytes": 198
}
```

---

## Core Entities (Remaining)

### 5. TeamMembers Entity (team*member*\*)

**Classification**: Tier 1 (Small), Relationship Entity
**Average Size**: 300 bytes | **Worst-Case**: 400 bytes
**Volume**: High (500-5000 memberships)

#### Field Patterns

| Field          | Audit? | Sensitive | Large | Special Handling | Reason           |
| -------------- | ------ | --------- | ----- | ---------------- | ---------------- |
| team_member_id | ✅ Yes | No        | No    | UUID             | Primary key      |
| team_id        | ✅ Yes | No        | No    | UUID ref         | Relationship     |
| user_id        | ✅ Yes | ✅ PII    | No    | UUID ref         | User reference   |
| role_in_team   | ✅ Yes | No        | No    | -                | Team role        |
| joined_at      | ✅ Yes | No        | No    | Timestamp        | Membership start |

#### GDPR Classification

| Data Category  | Fields                | Legal Basis         | Retention |
| -------------- | --------------------- | ------------------- | --------- |
| Organizational | team_id, role_in_team | Legitimate interest | 7 years   |
| Identity       | user_id               | Legitimate interest | 7 years   |

#### Action Pattern Example

```json
{
  "entity_type": "team_members",
  "entity_id": "020e8400-e29b-41d4-a716-446655440011",
  "action": "CREATE",
  "state": {
    "team_id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "role_in_team": "MEMBER",
    "joined_at": "2024-01-16T09:00:00Z"
  },
  "size_bytes": 243
}
```

---

### 6. Environments Entity (env\_\*)

**Classification**: Tier 1 (Small), Reference Data
**Average Size**: 500 bytes | **Worst-Case**: 700 bytes
**Volume**: Low (10-50 environments)

#### Field Patterns

| Field          | Audit? | Sensitive | Large | Special Handling | Reason              |
| -------------- | ------ | --------- | ----- | ---------------- | ------------------- |
| environment_id | ✅ Yes | No        | No    | UUID             | Primary key         |
| name           | ✅ Yes | No        | No    | -                | Environment name    |
| type           | ✅ Yes | No        | No    | Enum             | DEV/UAT/PROD        |
| status         | ✅ Yes | No        | No    | Enum             | Active/inactive     |
| description    | ✅ Yes | No        | No    | -                | Environment details |

#### Action Pattern Example

```json
{
  "entity_type": "environments",
  "entity_id": "030e8400-e29b-41d4-a716-446655440012",
  "action": "CREATE",
  "state": {
    "name": "Production East",
    "type": "PROD",
    "status": "ACTIVE",
    "description": "Primary production environment - East Coast datacenter"
  },
  "size_bytes": 287
}
```

---

### 7. Applications Entity (app\_\*)

**Classification**: Tier 2 (Medium), Core Entity
**Average Size**: 800 bytes | **Worst-Case**: 1.5KB
**Volume**: Medium (50-500 applications)

#### Field Patterns

| Field          | Audit? | Sensitive | Large  | Special Handling | Reason              |
| -------------- | ------ | --------- | ------ | ---------------- | ------------------- |
| application_id | ✅ Yes | No        | No     | UUID             | Primary key         |
| name           | ✅ Yes | No        | No     | -                | Application name    |
| code           | ✅ Yes | No        | No     | -                | Short code          |
| description    | ✅ Yes | No        | ✅ Yes | Truncate >1KB    | Application details |
| environments   | ✅ Yes | No        | No     | Array            | Environment list    |

#### Action Pattern Example

```json
{
  "entity_type": "applications",
  "entity_id": "040e8400-e29b-41d4-a716-446655440013",
  "action": "CREATE",
  "state": {
    "name": "Customer Portal",
    "code": "CUST_PORTAL",
    "description": "Web-based customer self-service portal",
    "environments": ["030e8400-e29b-41d4-a716-446655440012"]
  },
  "size_bytes": 312
}
```

---

### 8. Labels Entity (label\_\*)

**Classification**: Tier 1 (Small), Tagging System
**Average Size**: 400 bytes | **Worst-Case**: 600 bytes
**Volume**: High (200-2000 labels)

#### Field Patterns

| Field               | Audit? | Sensitive | Large | Special Handling | Reason         |
| ------------------- | ------ | --------- | ----- | ---------------- | -------------- |
| label_id            | ✅ Yes | No        | No    | UUID             | Primary key    |
| name                | ✅ Yes | No        | No    | -                | Label text     |
| color               | ✅ Yes | No        | No    | -                | Display color  |
| type                | ✅ Yes | No        | No    | Enum             | Label category |
| entity_associations | ❌ No  | No        | No    | -                | Too frequent   |

#### Action Pattern Example

```json
{
  "entity_type": "labels",
  "entity_id": "050e8400-e29b-41d4-a716-446655440014",
  "action": "CREATE",
  "state": {
    "name": "High Priority",
    "color": "#FF0000",
    "type": "PRIORITY"
  },
  "size_bytes": 187
}
```

---

### 9. Roles Entity (role\_\*)

**Classification**: Tier 2 (Medium), Security-Critical
**Average Size**: 1KB | **Worst-Case**: 2KB
**Volume**: Low (10-50 roles)

#### Field Patterns

| Field       | Audit? | Sensitive | Large | Special Handling | Reason          |
| ----------- | ------ | --------- | ----- | ---------------- | --------------- |
| role_id     | ✅ Yes | No        | No    | UUID             | Primary key     |
| name        | ✅ Yes | No        | No    | -                | Role name       |
| permissions | ✅ Yes | No        | No    | Array            | Permission list |
| description | ✅ Yes | No        | No    | -                | Role purpose    |

#### Action Pattern Example

```json
{
  "entity_type": "roles",
  "entity_id": "060e8400-e29b-41d4-a716-446655440015",
  "action": "UPDATE",
  "changed_fields": ["permissions"],
  "before": {
    "permissions": ["read_migrations", "update_steps"]
  },
  "after": {
    "permissions": ["read_migrations", "update_steps", "delete_instructions"]
  },
  "size_bytes": 312
}
```

---

### 10. SystemConfig Entity (scfg\_\*)

**Classification**: Tier 2 (Medium), Configuration
**Average Size**: 600 bytes | **Worst-Case**: 2KB
**Volume**: Low (50-200 settings)

#### Field Patterns

| Field     | Audit? | Sensitive | Large  | Special Handling | Reason              |
| --------- | ------ | --------- | ------ | ---------------- | ------------------- |
| config_id | ✅ Yes | No        | No     | UUID             | Primary key         |
| key       | ✅ Yes | No        | No     | -                | Configuration key   |
| value     | ✅ Yes | ⚠️ Maybe  | ✅ Yes | Truncate >1KB    | May contain secrets |
| type      | ✅ Yes | No        | No     | Enum             | Value type          |

#### Action Pattern Example

```json
{
  "entity_type": "system_config",
  "entity_id": "070e8400-e29b-41d4-a716-446655440016",
  "action": "UPDATE",
  "changed_fields": ["value"],
  "before": {
    "key": "email.smtp.host",
    "value": "mail.oldserver.com"
  },
  "after": {
    "key": "email.smtp.host",
    "value": "mail.newserver.com"
  },
  "size_bytes": 234
}
```

---

## Master Template Entities

### 11. Migrations Entity (mig*master*\*)

**Classification**: Tier 2 (Medium), Root Entity
**Average Size**: 1.2KB | **Worst-Case**: 2KB
**Volume**: Low (5-50 migrations)

#### Field Patterns

| Field             | Audit? | Sensitive | Large  | Special Handling | Reason            |
| ----------------- | ------ | --------- | ------ | ---------------- | ----------------- |
| migration_id      | ✅ Yes | No        | No     | UUID             | Primary key       |
| name              | ✅ Yes | No        | No     | -                | Migration name    |
| description       | ✅ Yes | No        | ✅ Yes | Truncate >1KB    | Migration details |
| migration_type_id | ✅ Yes | No        | No     | UUID ref         | Type reference    |
| start_date        | ✅ Yes | No        | No     | Timestamp        | Timeline          |
| end_date          | ✅ Yes | No        | No     | Timestamp        | Timeline          |
| status            | ✅ Yes | No        | No     | Enum             | Lifecycle status  |

#### Action Pattern Example

```json
{
  "entity_type": "migrations",
  "entity_id": "770e8400-e29b-41d4-a716-446655440002",
  "action": "CREATE",
  "state": {
    "name": "Q4_2024_Migration",
    "description": "Quarterly database and application migration for Q4 2024",
    "migration_type_id": "080e8400-e29b-41d4-a716-446655440017",
    "start_date": "2024-10-01T00:00:00Z",
    "end_date": "2024-12-31T23:59:59Z",
    "status": "PLANNING"
  },
  "size_bytes": 412
}
```

---

### 12-15. Iterations, Plans, Sequences, Phases (itr*master*_, pln*master*_, seq*master*_, pha*master*_)

**Classification**: Tier 2 (Medium), Template Entities
**Average Size**: 800 bytes each | **Worst-Case**: 1.5KB each
**Volume**: Low to Medium (varies by hierarchy level)

#### Common Field Pattern (All Four Entities)

| Field        | Audit? | Sensitive | Large  | Special Handling | Reason            |
| ------------ | ------ | --------- | ------ | ---------------- | ----------------- |
| {entity}\_id | ✅ Yes | No        | No     | UUID             | Primary key       |
| parent_id    | ✅ Yes | No        | No     | UUID ref         | Hierarchy parent  |
| name         | ✅ Yes | No        | No     | -                | Entity name       |
| description  | ✅ Yes | No        | ✅ Yes | Truncate >1KB    | Entity details    |
| order        | ✅ Yes | No        | No     | Integer          | Sequence position |

#### Example: Iterations

```json
{
  "entity_type": "iterations",
  "entity_id": "880e8400-e29b-41d4-a716-446655440003",
  "action": "CREATE",
  "state": {
    "migration_id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "Iteration_3",
    "description": "Third iteration focusing on production databases",
    "order": 3,
    "start_date": "2024-11-15T00:00:00Z",
    "end_date": "2024-11-30T23:59:59Z"
  },
  "size_bytes": 378
}
```

---

## Instance Entities (Remaining)

### 16-18. PlanInstances, SequenceInstances, PhaseInstances (pli*\*, sqi*_, phi\__)

**Classification**: Tier 2 (Medium), Instance Tracking
**Average Size**: 1KB each | **Worst-Case**: 2KB each
**Volume**: Medium to High (varies by execution scale)

#### Common Field Pattern

| Field                 | Audit? | Sensitive | Large | Special Handling | Reason             |
| --------------------- | ------ | --------- | ----- | ---------------- | ------------------ |
| {entity}\_instance_id | ✅ Yes | No        | No    | UUID             | Primary key        |
| {parent}\_instance_id | ✅ Yes | No        | No    | UUID ref         | Parent instance    |
| {entity}\_master_id   | ✅ Yes | No        | No    | UUID ref         | Template reference |
| status                | ✅ Yes | No        | No    | Enum             | Execution status   |
| actual_start          | ✅ Yes | No        | No    | Timestamp        | Execution tracking |
| actual_end            | ✅ Yes | No        | No    | Timestamp        | Execution tracking |

#### Example: PhaseInstances

```json
{
  "entity_type": "phase_instances",
  "entity_id": "cc0e8400-e29b-41d4-a716-446655440006",
  "action": "UPDATE",
  "changed_fields": ["status", "actual_start"],
  "before": {
    "status": "NOT_STARTED",
    "actual_start": null
  },
  "after": {
    "status": "IN_PROGRESS",
    "actual_start": "2024-11-20T08:00:00Z"
  },
  "hierarchy_context": {
    "migration_id": "770e8400-e29b-41d4-a716-446655440002",
    "iteration_id": "880e8400-e29b-41d4-a716-446655440003",
    "parent_instance_id": "bb0e8400-e29b-41d4-a716-446655440005"
  },
  "size_bytes": 456
}
```

---

## Special Entities

### 19. Steps Entity (step\_\*)

**Classification**: Tier 2-3 (Medium-Large), Master Definitions
**Average Size**: 1.5KB | **Worst-Case**: 3KB
**Volume**: Medium (100-1000 steps)

#### Field Patterns

| Field           | Audit? | Sensitive | Large  | Special Handling | Reason                |
| --------------- | ------ | --------- | ------ | ---------------- | --------------------- |
| step_id         | ✅ Yes | No        | No     | UUID             | Primary key           |
| phase_master_id | ✅ Yes | No        | No     | UUID ref         | Phase reference       |
| name            | ✅ Yes | No        | No     | -                | Step name             |
| description     | ✅ Yes | No        | ✅ Yes | Truncate >1KB    | Step details          |
| step_type_id    | ✅ Yes | No        | No     | UUID ref         | Type reference        |
| controls        | ✅ Yes | No        | No     | Array            | Control relationships |

#### Action Pattern Example

```json
{
  "entity_type": "steps",
  "entity_id": "ee0e8400-e29b-41d4-a716-446655440008",
  "action": "CREATE",
  "state": {
    "phase_master_id": "090e8400-e29b-41d4-a716-446655440018",
    "name": "Database Schema Validation",
    "description": "Validate schema consistency across environments",
    "step_type_id": "0a0e8400-e29b-41d4-a716-446655440019",
    "controls": [
      "0b0e8400-e29b-41d4-a716-446655440020",
      "0c0e8400-e29b-41d4-a716-446655440021"
    ],
    "order": 5
  },
  "size_bytes": 487
}
```

---

### 20-22. IterationTypes, MigrationTypes, StepTypes (itt*\*, mit*_, stt\__)

**Classification**: Tier 1 (Small), Reference Data
**Average Size**: 300 bytes each | **Worst-Case**: 500 bytes each
**Volume**: Very Low (5-20 each)

#### Common Pattern Example

```json
{
  "entity_type": "migration_types",
  "entity_id": "080e8400-e29b-41d4-a716-446655440017",
  "action": "CREATE",
  "state": {
    "name": "Database Migration",
    "description": "Migration involving database schema or data changes"
  },
  "size_bytes": 187
}
```

---

### 23. EmailTemplates Entity (emt\_\*)

**Classification**: Tier 3-4 (Large-Very Large), Template Storage
**Average Size**: 3KB | **Worst-Case**: 10KB
**Volume**: Low (20-100 templates)

#### Field Patterns

| Field       | Audit? | Sensitive | Large  | Special Handling | Reason            |
| ----------- | ------ | --------- | ------ | ---------------- | ----------------- |
| template_id | ✅ Yes | No        | No     | UUID             | Primary key       |
| name        | ✅ Yes | No        | No     | -                | Template name     |
| subject     | ✅ Yes | No        | No     | -                | Email subject     |
| body        | ✅ Yes | No        | ✅ YES | Truncate >5KB    | Template HTML     |
| type        | ✅ Yes | No        | No     | Enum             | Template category |

#### Action Pattern with Aggressive Truncation

```json
{
  "entity_type": "email_templates",
  "entity_id": "0d0e8400-e29b-41d4-a716-446655440022",
  "action": "UPDATE",
  "changed_fields": ["body"],
  "before": {
    "body": "<!DOCTYPE html><html>... [TRUNCATED: 8234 chars → 5000 chars]"
  },
  "after": {
    "body": "<!DOCTYPE html><html>... [TRUNCATED: 9876 chars → 5000 chars]"
  },
  "truncation_applied": true,
  "size_bytes": 10234
}
```

---

### 24. Controls Entity (ctl\_\*)

**Classification**: Tier 2 (Medium), Complex Relationships
**Average Size**: 1KB | **Worst-Case**: 2KB
**Volume**: Medium (50-500 controls)

#### Field Patterns

| Field               | Audit? | Sensitive | Large  | Special Handling | Reason          |
| ------------------- | ------ | --------- | ------ | ---------------- | --------------- |
| control_id          | ✅ Yes | No        | No     | UUID             | Primary key     |
| name                | ✅ Yes | No        | No     | -                | Control name    |
| description         | ✅ Yes | No        | ✅ Yes | Truncate >1KB    | Control details |
| phase_relationships | ✅ Yes | No        | No     | Array            | Phase mappings  |

#### Action Pattern Example

```json
{
  "entity_type": "controls",
  "entity_id": "0b0e8400-e29b-41d4-a716-446655440020",
  "action": "CREATE",
  "state": {
    "name": "Database Backup Verification",
    "description": "Verify all backups are current before proceeding",
    "phase_relationships": [
      {
        "phase_id": "090e8400-e29b-41d4-a716-446655440018",
        "order": 1
      }
    ]
  },
  "size_bytes": 312
}
```

---

### 25. Status Entity (status\_\*)

**Classification**: Tier 1 (Small), Reference Data
**Average Size**: 300 bytes | **Worst-Case**: 400 bytes
**Volume**: Very Low (10-30 statuses)

#### Action Pattern Example

```json
{
  "entity_type": "status",
  "entity_id": "0e0e8400-e29b-41d4-a716-446655440023",
  "action": "CREATE",
  "state": {
    "name": "IN_PROGRESS",
    "description": "Entity is currently being executed",
    "applies_to": ["step_instances", "phase_instances"]
  },
  "size_bytes": 234
}
```

---

## GDPR Classification Matrix

| Entity Type   | Identity Data                       | Contact Data | Behavioral Data              | Administrative Data     | Retention |
| ------------- | ----------------------------------- | ------------ | ---------------------------- | ----------------------- | --------- |
| Users         | ✅ username, employee_id, full_name | ✅ email     | -                            | ✅ roles, active_status | 7 years   |
| Teams         | -                                   | -            | -                            | ✅ membership           | 7 years   |
| TeamMembers   | ✅ user_id                          | -            | -                            | ✅ role_in_team         | 7 years   |
| StepInstances | ✅ assigned_to, executor            | -            | ✅ status, timestamps, notes | -                       | 7 years   |
| Instructions  | -                                   | -            | ✅ execution tracking        | -                       | 7 years   |
| All Others    | -                                   | -            | -                            | -                       | 7 years   |

---

## Entity Configuration Tables

### Size Tier Configuration

```javascript
const ENTITY_SIZE_TIERS = {
  TIER_1_SMALL: {
    maxSize: 500,
    entities: [
      "team_members",
      "labels",
      "iteration_types",
      "migration_types",
      "step_types",
      "status",
    ],
    truncationStrategy: "none",
  },
  TIER_2_MEDIUM: {
    maxSize: 1500,
    entities: [
      "users",
      "teams",
      "environments",
      "applications",
      "roles",
      "system_config",
      "migrations",
      "iterations",
      "plans",
      "sequences",
      "phases",
      "plan_instances",
      "sequence_instances",
      "phase_instances",
      "controls",
    ],
    truncationStrategy: "selective",
  },
  TIER_3_LARGE: {
    maxSize: 5000,
    entities: ["step_instances", "steps", "email_templates"],
    truncationStrategy: "aggressive",
  },
  TIER_4_VERY_LARGE: {
    maxSize: 10000,
    entities: ["step_instances", "instructions", "email_templates"],
    truncationStrategy: "maximum",
  },
};
```

### Field Truncation Configuration

```javascript
const FIELD_TRUNCATION_LIMITS = {
  // Standard fields
  description: 1000,
  notes: 2000,
  issues: 2000,

  // Technical fields
  command_text: 2000,

  // Template fields
  body: 5000,

  // Small fields (no truncation)
  name: -1,
  email: -1,
  username: -1,
};
```

### Audit Exclusion Configuration

```javascript
const AUDIT_EXCLUSIONS = {
  global: [
    "last_updated",
    "last_login",
    "execution_count",
    "last_executed",
    "last_activity",
    "member_count",
    "entity_associations",
  ],
  security: ["password_hash", "session_token", "api_key", "secret_key"],
};
```

### Hierarchy Context Configuration

```javascript
const HIERARCHY_CONTEXT_RULES = {
  // Use full chain for critical operations
  fullChain: [
    "status_transition",
    "assignment_change",
    "error",
    "gdpr_operation",
  ],

  // Use minimal chain for routine operations
  minimalChain: ["create", "update_non_critical", "view"],

  // Instance entities requiring hierarchy
  instanceEntities: [
    "plan_instances",
    "sequence_instances",
    "phase_instances",
    "step_instances",
    "instructions",
  ],
};
```

### GDPR Field Classification

```javascript
const GDPR_FIELD_CLASSIFICATION = {
  identity_data: [
    "username",
    "employee_id",
    "full_name",
    "user_id",
    "assigned_to",
    "actual_executor",
  ],
  contact_data: ["email", "phone", "address"],
  behavioral_data: [
    "status",
    "notes",
    "issues",
    "timestamps",
    "execution_tracking",
  ],
  administrative_data: [
    "roles",
    "permissions",
    "active_status",
    "role_in_team",
  ],
};
```

---

## Implementation Guidelines

### 1. Entity Detection

```javascript
function determineEntityTier(entityType) {
  for (const [tier, config] of Object.entries(ENTITY_SIZE_TIERS)) {
    if (config.entities.includes(entityType)) {
      return config;
    }
  }
  return ENTITY_SIZE_TIERS.TIER_2_MEDIUM; // Default
}
```

### 2. Field Truncation Logic

```javascript
function truncateFieldIfNeeded(field, value, entityTier) {
  const limit = FIELD_TRUNCATION_LIMITS[field];
  if (limit === -1 || !value) return value;

  if (entityTier.truncationStrategy === "none") return value;

  if (value.length > limit) {
    return {
      value: value.substring(0, limit),
      truncated: true,
      originalLength: value.length,
      note: `[TRUNCATED: ${value.length} chars → ${limit} chars]`,
    };
  }

  return value;
}
```

### 3. Hierarchy Context Selection

```javascript
function determineHierarchyContext(action, entityType, isGdprSensitive) {
  const requiresFullChain =
    HIERARCHY_CONTEXT_RULES.fullChain.includes(action) || isGdprSensitive;

  const isInstanceEntity =
    HIERARCHY_CONTEXT_RULES.instanceEntities.includes(entityType);

  if (!isInstanceEntity) return null;

  return requiresFullChain ? "full" : "minimal";
}
```

### 4. GDPR Classification

```javascript
function classifyGdprFields(entityState) {
  const classification = {
    identity_data: [],
    contact_data: [],
    behavioral_data: [],
    administrative_data: [],
  };

  for (const [field, value] of Object.entries(entityState)) {
    for (const [category, fields] of Object.entries(
      GDPR_FIELD_CLASSIFICATION,
    )) {
      if (fields.includes(field)) {
        classification[category].push(field);
      }
    }
  }

  return classification;
}
```

---

## Size Estimates Summary

| Entity Type    | Tier | Average | Worst-Case | Annual Volume         | Annual Storage  |
| -------------- | ---- | ------- | ---------- | --------------------- | --------------- |
| Users          | 2    | 800B    | 1.2KB      | 200 changes           | 160KB           |
| Teams          | 2    | 600B    | 2.5KB      | 500 changes           | 300KB           |
| TeamMembers    | 1    | 300B    | 400B       | 2000 changes          | 600KB           |
| StepInstances  | 3-4  | 1.5KB   | 8KB        | 50000 changes         | 75MB            |
| Instructions   | 3-4  | 1KB     | 6KB        | 100000 changes        | 100MB           |
| EmailTemplates | 3-4  | 3KB     | 10KB       | 100 changes           | 300KB           |
| All Others     | 1-2  | 500B    | 1.5KB      | 5000 changes          | 2.5MB           |
| **Total**      | -    | -       | -          | **~157K events/year** | **~178MB/year** |

---

## Revision History

| Version | Date       | Author | Changes                               |
| ------- | ---------- | ------ | ------------------------------------- |
| 1.0.0   | 2025-01-08 | System | Initial comprehensive entity patterns |

---

**Document Size**: ~19KB
**Entity Coverage**: 25/25 (100%)
**Example Count**: 32 JSON examples
**Configuration Tables**: 5 implementation tables
