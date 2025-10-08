# Action 2: Entity-Specific Audit Patterns - Summary

**Date**: 2025-01-08
**Status**: ✅ COMPLETE
**Document**: `docs/architecture/audit/entity-specific-audit-patterns.md`
**Size**: ~19KB (under 20KB target)

## Deliverables Completed

### 1. Comprehensive Entity Coverage (25/25 = 100%)

**Core Entities (8)**:

- ✅ Users (usr\_\*) - GDPR critical, 800B avg
- ✅ Teams (team\_\*) - 600B avg
- ✅ TeamMembers (team*member*\*) - 300B avg, relationship entity
- ✅ Environments (env\_\*) - 500B avg, reference data
- ✅ Applications (app\_\*) - 800B avg
- ✅ Labels (label\_\*) - 400B avg, high-volume tagging
- ✅ Roles (role\_\*) - 1KB avg, security-critical
- ✅ SystemConfig (scfg\_\*) - 600B avg, configuration storage

**Master Templates (5)**:

- ✅ Migrations (mig*master*\*) - 1.2KB avg, root entity
- ✅ Iterations (itr*master*\*) - 800B avg
- ✅ Plans (pln*master*\*) - 800B avg
- ✅ Sequences (seq*master*\*) - 800B avg
- ✅ Phases (pha*master*\*) - 800B avg

**Instance Entities (5)**:

- ✅ PlanInstances (pli\_\*) - 1KB avg, execution tracking
- ✅ SequenceInstances (sqi\_\*) - 1KB avg
- ✅ PhaseInstances (phi\_\*) - 1KB avg
- ✅ StepInstances (sti\_\*) - 1.5KB avg, 8KB worst-case, HIGHEST VOLUME
- ✅ Instructions (ins\_\*) - 1KB avg, 6KB worst-case, HIGH VOLUME

**Special Entities (7)**:

- ✅ Steps (step\_\*) - 1.5KB avg, master definitions
- ✅ IterationTypes (itt\_\*) - 300B avg, reference data
- ✅ MigrationTypes (mit\_\*) - 300B avg
- ✅ StepTypes (stt\_\*) - 400B avg
- ✅ EmailTemplates (emt\_\*) - 3KB avg, 10KB worst-case
- ✅ Controls (ctl\_\*) - 1KB avg, complex relationships
- ✅ Status (status\_\*) - 300B avg, reference data

### 2. Field-Level Mappings (Complete)

**For Each Entity Type**:

- ✅ Audit inclusion/exclusion rules (10+ fields per entity avg)
- ✅ Sensitive field identification (GDPR PII marking)
- ✅ Large field truncation limits (description, notes, issues, etc.)
- ✅ Special handling requirements (UUIDs, timestamps, arrays, enums)
- ✅ Field exclusion rationale (security, frequency, low value)

**Key Patterns Identified**:

- **NEVER audit**: password_hash, session_token, api_key (security)
- **Exclude from audit**: last_updated, last_login, execution_count (too frequent)
- **Truncate at**: 1KB (descriptions), 2KB (notes/issues), 5KB (email bodies)
- **GDPR sensitive**: username, email, full_name, employee_id, assigned_to

### 3. Action-Specific Structures (32 JSON Examples)

**CREATE Actions** (8 examples):

- Full state capture for master templates
- Minimal required fields for high-volume instances
- Hierarchy context for instance entities

**UPDATE Actions** (12 examples):

- Changed fields only (before/after pairs)
- Status transitions with full hierarchy
- Large field edits with truncation
- Assignment changes with actor tracking

**DELETE Actions** (8 examples):

- Full state snapshot for templates
- Minimal context for reference data
- Relationship counts for core entities
- Child entity counts for hierarchy

**VIEW Actions** (4 examples):

- Minimal tracking (who, when, what)
- Only for sensitive entities (Users, Roles, SystemConfig)
- No state snapshot needed

### 4. Size Management Strategy

**Four-Tier System**:

- **Tier 1 (Small <500B)**: TeamMembers, Labels, Reference data - NO truncation
- **Tier 2 (Medium 500-1500B)**: Most entities - SELECTIVE truncation
- **Tier 3 (Large 1500-5KB)**: StepInstances, EmailTemplates - AGGRESSIVE truncation
- **Tier 4 (Very Large 5KB+)**: Worst-case scenarios - MAXIMUM truncation

**Truncation Limits**:

```javascript
description: 1000 chars
notes: 2000 chars
issues: 2000 chars
command_text: 2000 chars
body (email): 5000 chars
```

**Annual Storage Estimates**:

- High-volume entities: ~175MB/year (StepInstances + Instructions)
- All other entities: ~3MB/year
- **Total**: ~178MB/year for ~157K audit events

### 5. Hierarchy Tracking Patterns

**Three Context Levels**:

1. **Minimal Chain** (default, 200 bytes): migration_id + iteration_id + parent_instance_id
2. **Full Chain** (critical ops, 400 bytes): Complete path with names
3. **Bulk Summary** (mass operations): Path string + count

**When to Use Full Chain**:

- Status transitions
- Assignment changes
- Error conditions
- GDPR-sensitive operations

**Instance Entity Hierarchy**:

```
Migration → Iteration → Plan Instance → Sequence Instance →
Phase Instance → Step Instance → Instruction
```

### 6. GDPR Classification Matrix

**Data Categories Mapped**:

- **Identity Data**: username, employee_id, full_name, user_id, assigned_to, actual_executor
- **Contact Data**: email, phone, address
- **Behavioral Data**: status, notes, issues, timestamps, execution tracking
- **Administrative Data**: roles, permissions, active_status, role_in_team

**Entity Classification**:

- **Critical**: Users (identity + contact + admin data)
- **High**: TeamMembers, StepInstances (identity + behavioral data)
- **Medium**: Teams (indirect PII through membership)
- **Low**: Instructions, EmailTemplates (operational data only)

**Retention**: 7 years for all entities (standard compliance)

### 7. Implementation Configuration Tables (5 Tables)

**Table 1: Size Tier Configuration**

```javascript
ENTITY_SIZE_TIERS = {
  TIER_1_SMALL: { maxSize: 500, entities: [...6], truncationStrategy: "none" },
  TIER_2_MEDIUM: {
    maxSize: 1500,
    entities: [...15],
    truncationStrategy: "selective",
  },
  TIER_3_LARGE: {
    maxSize: 5000,
    entities: [...3],
    truncationStrategy: "aggressive",
  },
  TIER_4_VERY_LARGE: {
    maxSize: 10000,
    entities: [...3],
    truncationStrategy: "maximum",
  },
};
```

**Table 2: Field Truncation Limits**

```javascript
FIELD_TRUNCATION_LIMITS = {
  description: 1000,
  notes: 2000,
  issues: 2000,
  command_text: 2000,
  body: 5000,
  name: -1,
  email: -1,
  username: -1, // no truncation
};
```

**Table 3: Audit Exclusions**

```javascript
AUDIT_EXCLUSIONS = {
  global: ['last_updated', 'last_login', 'execution_count', ...],
  security: ['password_hash', 'session_token', 'api_key', ...]
}
```

**Table 4: Hierarchy Context Rules**

```javascript
HIERARCHY_CONTEXT_RULES = {
  fullChain: ['status_transition', 'assignment_change', 'error', 'gdpr_operation'],
  minimalChain: ['create', 'update_non_critical', 'view'],
  instanceEntities: ['plan_instances', 'sequence_instances', ...]
}
```

**Table 5: GDPR Field Classification**

```javascript
GDPR_FIELD_CLASSIFICATION = {
  identity_data: ['username', 'employee_id', 'full_name', ...],
  contact_data: ['email', 'phone', 'address'],
  behavioral_data: ['status', 'notes', 'issues', ...],
  administrative_data: ['roles', 'permissions', ...]
}
```

## Key Implementation Functions

### 1. Entity Tier Detection

```javascript
function determineEntityTier(entityType) {
  // Returns TIER_1_SMALL | TIER_2_MEDIUM | TIER_3_LARGE | TIER_4_VERY_LARGE
}
```

### 2. Field Truncation

```javascript
function truncateFieldIfNeeded(field, value, entityTier) {
  // Returns { value, truncated, originalLength, note } or original value
}
```

### 3. Hierarchy Context Selection

```javascript
function determineHierarchyContext(action, entityType, isGdprSensitive) {
  // Returns 'full' | 'minimal' | null
}
```

### 4. GDPR Classification

```javascript
function classifyGdprFields(entityState) {
  // Returns { identity_data: [], contact_data: [], behavioral_data: [], administrative_data: [] }
}
```

## Priority Implementation Order

**Phase 1: High-Volume Entities** (75% of audit events)

1. ✅ StepInstances (sti\_\*) - 50K events/year, 1.5KB avg, critical hierarchy tracking
2. ✅ Instructions (ins\_\*) - 100K events/year, 1KB avg, high truncation needs
3. ✅ Users (usr\_\*) - 200 events/year, GDPR critical, VIEW audit required
4. ✅ Teams (team\_\*) - 500 events/year, relationship tracking important

**Phase 2: Core Entities** (15% of audit events) 5. ✅ All remaining core entities (TeamMembers, Environments, Applications, Labels, Roles, SystemConfig)

**Phase 3: Master Templates & Instances** (8% of audit events) 6. ✅ All master templates (Migrations, Iterations, Plans, Sequences, Phases) 7. ✅ All instance entities (PlanInstances, SequenceInstances, PhaseInstances)

**Phase 4: Special Entities** (2% of audit events) 8. ✅ All special entities (Steps, Types, EmailTemplates, Controls, Status)

## Document Quality Metrics

| Metric                | Target       | Actual       | Status |
| --------------------- | ------------ | ------------ | ------ |
| Entity Coverage       | 25/25        | 25/25 (100%) | ✅     |
| Document Size         | <20KB        | ~19KB        | ✅     |
| JSON Examples         | 25+          | 32           | ✅     |
| Field Mappings        | Complete     | 200+ fields  | ✅     |
| Implementation Tables | 5+           | 5            | ✅     |
| GDPR Classification   | All entities | 100%         | ✅     |
| Size Estimates        | All entities | 100%         | ✅     |

## Storage Projections (Annual)

| Entity Category      | Events/Year | Avg Size   | Storage/Year | % of Total |
| -------------------- | ----------- | ---------- | ------------ | ---------- |
| StepInstances        | 50,000      | 1.5KB      | 75MB         | 42%        |
| Instructions         | 100,000     | 1KB        | 100MB        | 56%        |
| Core Entities        | 5,000       | 600B       | 3MB          | 2%         |
| Templates            | 500         | 1KB        | 0.5MB        | <1%        |
| Instances (non-step) | 2,000       | 1KB        | 2MB          | 1%         |
| **TOTAL**            | **157,500** | **1.13KB** | **~178MB**   | **100%**   |

## Next Actions

**Action 3: AuditService Implementation**

- Implement entity tier detection
- Add field truncation logic
- Integrate hierarchy context selection
- Add GDPR field classification
- Implement size limits and compression

**Action 4: Testing & Validation**

- Unit tests for each entity type
- Size limit testing (worst-case scenarios)
- GDPR compliance validation
- Performance testing (high-volume entities)
- Truncation accuracy verification

## Key Insights

1. **Volume Concentration**: 98% of audit events come from just 2 entity types (StepInstances + Instructions)
2. **Size Management Critical**: Without truncation, worst-case scenarios could reach 8-10KB per audit
3. **Hierarchy Optimization**: Using minimal chain saves 200 bytes per instance entity audit
4. **GDPR Limited**: Only 3 entities contain true PII (Users, TeamMembers, StepInstances)
5. **Reference Data Lightweight**: 7 entity types are <500 bytes and require minimal storage

## Success Criteria Met ✅

- ✅ All 25+ entity types documented with complete field mappings
- ✅ Entity-specific JSON examples for all action types (CREATE/UPDATE/DELETE/VIEW)
- ✅ Size optimization strategy with four-tier system and truncation limits
- ✅ Hierarchy tracking patterns for all instance entities
- ✅ Complete GDPR classification matrix
- ✅ Implementation-ready configuration tables and functions
- ✅ Document under 20KB target size
- ✅ High-priority entities (Users, Teams, StepInstances, Instructions) fully detailed

---

**Document Location**: `docs/architecture/audit/entity-specific-audit-patterns.md`
**Ready for**: AuditService implementation (Action 3)
