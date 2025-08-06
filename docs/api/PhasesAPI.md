# Phases API Specification

> Comprehensive API specification for Phases management in the UMIG project. Phases represent major execution phases with quality gates, control points, and dependency management within migration sequences.

---

## 1. API Overview
- **API Name:** Phases API v2
- **Purpose:** Manage migration execution phases with control point validation, ordering, progress tracking, and hierarchical filtering
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-030 (Hierarchical Filtering), ADR-031 (Type Safety)

## 1.1. Business Value

The Phases API provides critical quality gate management for migration execution:

- **Control Points:** Automated validation checkpoints ensuring migration quality
- **Progress Tracking:** Real-time visibility into phase completion status
- **Dependency Management:** Predecessor relationships ensuring proper execution order
- **Override Capability:** Emergency override for blocked control points with audit trail
- **Hierarchical Filtering:** Deep filtering through migration → iteration → plan → sequence → phase hierarchy

## 2. Endpoints

| Method | Path | Description |
|--------|------|-------------|
| **Master Phase Management** | | |
| GET | `/phases/master` | Get all master phases with optional filtering |
| GET | `/phases/master/{phm_id}` | Get a specific master phase by ID |
| POST | `/phases/master` | Create a new master phase |
| PUT | `/phases/master/{phm_id}` | Update an existing master phase |
| DELETE | `/phases/master/{phm_id}` | Delete a master phase |
| **Instance Phase Operations** | | |
| GET | `/phases/instance` | Get all phase instances with hierarchical filtering |
| GET | `/phases/instance/{phi_id}` | Get a specific phase instance by ID |
| POST | `/phases/instance` | Create a phase instance from master phase |
| PUT | `/phases/instance/{phi_id}` | Update an existing phase instance |
| DELETE | `/phases/instance/{phi_id}` | Delete a phase instance |
| **Control Points** | | |
| GET | `/phases/{phi_id}/controls` | Get control points for a phase instance |
| POST | `/phases/{phi_id}/controls/validate` | Validate all control points for a phase |
| PUT | `/phases/{phi_id}/controls/{cti_id}` | Update control point status |
| POST | `/phases/{phi_id}/controls/{cti_id}/override` | Override control point with reason |
| **Ordering** | | |
| PUT | `/phases/master/reorder` | Bulk reorder master phases within sequence |
| PUT | `/phases/instance/reorder` | Bulk reorder phase instances within sequence |
| POST | `/phases/master/{phm_id}/move` | Move master phase to new position |
| POST | `/phases/instance/{phi_id}/move` | Move phase instance to new position |
| **Progress** | | |
| GET | `/phases/{phi_id}/progress` | Get progress percentage for phase instance |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| phm_id | UUID | Yes (for master endpoints) | Master Phase ID |
| phi_id | UUID | Yes (for instance endpoints) | Phase Instance ID |
| cti_id | UUID | Yes (for control endpoints) | Control Point Instance ID |

### 3.2. Query Parameters

#### GET /phases/master
| Name | Type | Required | Description |
|------|------|----------|-------------|
| sequenceId | UUID | No | Filter master phases by sequence master ID |

#### GET /phases/instance
| Name | Type | Required | Description |
|------|------|----------|-------------|
| migrationId | UUID | No | Filter phase instances by migration ID |
| iterationId | UUID | No | Filter phase instances by iteration ID |
| planInstanceId | UUID | No | Filter phase instances by plan instance ID |
| sequenceInstanceId | UUID | No | Filter phase instances by sequence instance ID |
| teamId | Integer | No | Filter phase instances by team ID |
| statusId | Integer | No | Filter phase instances by status ID |

### 3.3. Request Body Schemas

#### POST /phases/master - Create Master Phase
- **Content-Type:** application/json
- **Schema:**
```json
{
  "sqm_id": "UUID string (required)",
  "phm_name": "string (required)",
  "phm_description": "string (optional)",
  "phm_order": "integer (optional)",
  "predecessor_phm_id": "UUID string (optional)"
}
```
- **Example:**
```json
{
  "sqm_id": "123e4567-e89b-12d3-a456-426614174000",
  "phm_name": "Pre-Migration Verification",
  "phm_description": "Verify all systems are ready for migration",
  "phm_order": 1,
  "predecessor_phm_id": null
}
```

#### PUT /phases/master/{phm_id} - Update Master Phase
- **Content-Type:** application/json
- **Schema:**
```json
{
  "phm_name": "string (optional)",
  "phm_description": "string (optional)",
  "predecessor_phm_id": "UUID string (optional)"
}
```
- **Example:**
```json
{
  "phm_name": "Pre-Migration Validation and Verification",
  "phm_description": "Comprehensive verification of all systems before migration"
}
```

#### POST /phases/instance - Create Phase Instance
- **Content-Type:** application/json
- **Schema:**
```json
{
  "phm_id": "UUID string (required)",
  "sqi_id": "UUID string (required)",
  "phi_name": "string (optional, overrides master)",
  "phi_description": "string (optional, overrides master)",
  "phi_status": "integer (optional, FK to status_sts)",
  "phi_order": "integer (optional)",
  "predecessor_phi_id": "UUID string (optional)"
}
```
- **Example:**
```json
{
  "phm_id": "123e4567-e89b-12d3-a456-426614174000",
  "sqi_id": "456e7890-e89b-12d3-a456-426614174001",
  "phi_name": "Production Pre-Migration Verification",
  "phi_status": 5,
  "phi_order": 1
}
```

#### PUT /phases/instance/{phi_id} - Update Phase Instance
- **Content-Type:** application/json
- **Schema:**
```json
{
  "phi_name": "string (optional)",
  "phi_description": "string (optional)",
  "phi_status": "integer (optional, FK to status_sts)",
  "phi_order": "integer (optional)",
  "predecessor_phi_id": "UUID string (optional)",
  "phi_start_time": "timestamp (optional)",
  "phi_end_time": "timestamp (optional)"
}
```
- **Example:**
```json
{
  "phi_status": 6,
  "phi_start_time": "2025-08-04T10:00:00Z"
}
```

#### PUT /phases/{phi_id}/controls/{cti_id} - Update Control Point
- **Content-Type:** application/json
- **Schema:**
```json
{
  "cti_status": "integer (optional, FK to status_sts)",
  "usr_id_it_validator": "integer (optional)",
  "usr_id_biz_validator": "integer (optional)"
}
```
- **Example:**
```json
{
  "cti_status": "validated",
  "usr_id_it_validator": 1001,
  "usr_id_biz_validator": 1002
}
```

#### POST /phases/{phi_id}/controls/{cti_id}/override - Override Control Point
- **Content-Type:** application/json
- **Schema:**
```json
{
  "reason": "string (optional, default: 'Override requested')",
  "overrideBy": "string (optional, default: 'system')"
}
```
- **Example:**
```json
{
  "reason": "Emergency override due to critical system requirements",
  "overrideBy": "john.doe@company.com"
}
```

#### PUT /phases/master/reorder - Bulk Reorder Master Phases
- **Content-Type:** application/json
- **Schema:**
```json
{
  "sequenceId": "UUID string (required)",
  "phaseOrderMap": {
    "phase_uuid_1": "integer",
    "phase_uuid_2": "integer"
  }
}
```
- **Example:**
```json
{
  "sequenceId": "123e4567-e89b-12d3-a456-426614174000",
  "phaseOrderMap": {
    "456e7890-e89b-12d3-a456-426614174001": 1,
    "789e0123-e89b-12d3-a456-426614174002": 2,
    "012e3456-e89b-12d3-a456-426614174003": 3
  }
}
```

#### PUT /phases/instance/reorder - Bulk Reorder Phase Instances
- **Content-Type:** application/json
- **Schema:**
```json
{
  "sequenceInstanceId": "UUID string (required)",
  "phaseOrderMap": {
    "phase_instance_uuid_1": "integer",
    "phase_instance_uuid_2": "integer"
  }
}
```

#### POST /phases/master/{phm_id}/move - Move Master Phase
- **Content-Type:** application/json
- **Schema:**
```json
{
  "newOrder": "integer (required)"
}
```
- **Example:**
```json
{
  "newOrder": 3
}
```

#### POST /phases/instance/{phi_id}/move - Move Phase Instance
- **Content-Type:** application/json
- **Schema:**
```json
{
  "newOrder": "integer (required)"
}
```

## 4. Response Details

### 4.1. Success Responses

#### GET /phases/master - List Master Phases
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
[
  {
    "phm_id": "UUID string",
    "sqm_id": "UUID string",
    "phm_name": "string",
    "phm_description": "string",
    "phm_order": "integer",
    "predecessor_phm_id": "UUID string or null",
    "created_at": "ISO 8601 timestamp",
    "created_by": "integer"
  }
]
```

#### GET /phases/master/{phm_id} - Get Master Phase Details
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
{
  "phm_id": "UUID string",
  "sqm_id": "UUID string",
  "phm_name": "string",
  "phm_description": "string",
  "phm_order": "integer",
  "predecessor_phm_id": "UUID string or null",
  "created_at": "ISO 8601 timestamp",
  "created_by": "integer",
  "updated_at": "ISO 8601 timestamp",
  "updated_by": "integer"
}
```

#### GET /phases/instance - List Phase Instances
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
[
  {
    "phi_id": "UUID string",
    "phm_id": "UUID string",
    "sqi_id": "UUID string",
    "phi_name": "string",
    "phi_description": "string",
    "phi_status": "integer (FK to status_sts)",
    "phi_order": "integer",
    "predecessor_phi_id": "UUID string or null",
    "phi_start_time": "ISO 8601 timestamp or null",
    "phi_end_time": "ISO 8601 timestamp or null",
    "created_at": "ISO 8601 timestamp",
    "created_by": "integer"
  }
]
```

#### GET /phases/instance/{phi_id} - Get Phase Instance Details
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
{
  "phi_id": "UUID string",
  "phm_id": "UUID string",
  "sqi_id": "UUID string",
  "phi_name": "string",
  "phi_description": "string",
  "phi_status": "integer (FK to status_sts)",
  "phi_order": "integer",
  "predecessor_phi_id": "UUID string or null",
  "phi_start_time": "ISO 8601 timestamp or null",
  "phi_end_time": "ISO 8601 timestamp or null",
  "created_at": "ISO 8601 timestamp",
  "created_by": "integer",
  "updated_at": "ISO 8601 timestamp",
  "updated_by": "integer"
}
```

#### GET /phases/{phi_id}/controls - Get Control Points
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
[
  {
    "cti_id": "UUID string",
    "phi_id": "UUID string",
    "cti_name": "string",
    "cti_description": "string",
    "cti_status": "integer (FK to status_sts)",
    "cti_type": "string",
    "usr_id_it_validator": "integer or null",
    "usr_id_biz_validator": "integer or null",
    "is_overridden": "boolean",
    "override_reason": "string or null",
    "override_by": "string or null",
    "override_at": "ISO 8601 timestamp or null"
  }
]
```

#### POST /phases/{phi_id}/controls/validate - Validate Control Points
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
{
  "phi_id": "UUID string",
  "validation_status": "string",
  "total_controls": "integer",
  "validated_controls": "integer",
  "failed_controls": "integer",
  "control_details": [
    {
      "cti_id": "UUID string",
      "cti_name": "string",
      "status": "string",
      "validation_result": "string"
    }
  ]
}
```

#### GET /phases/{phi_id}/progress - Get Phase Progress
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
{
  "phi_id": "UUID string",
  "progress_percentage": "number"
}
```

#### POST /phases/master - Create Master Phase
- **Status Code:** 201
- **Content-Type:** application/json
- **Schema:** Same as GET /phases/master/{phm_id}

#### POST /phases/instance - Create Phase Instance
- **Status Code:** 201
- **Content-Type:** application/json
- **Schema:** Same as GET /phases/instance/{phi_id}

#### PUT /phases/master/{phm_id} - Update Master Phase
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:** Same as GET /phases/master/{phm_id}

#### PUT /phases/instance/{phi_id} - Update Phase Instance
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:** Same as GET /phases/instance/{phi_id}

#### DELETE /phases/master/{phm_id} - Delete Master Phase
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
{
  "success": true,
  "message": "Master phase deleted successfully"
}
```

#### DELETE /phases/instance/{phi_id} - Delete Phase Instance
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
{
  "success": true,
  "message": "Phase instance deleted successfully"
}
```

#### PUT /phases/{phi_id}/controls/{cti_id} - Update Control Point
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
{
  "success": true,
  "message": "Control point updated successfully"
}
```

#### POST /phases/{phi_id}/controls/{cti_id}/override - Override Control Point
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
{
  "success": true,
  "message": "Control point overridden successfully"
}
```

#### Reordering and Movement Operations
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
{
  "success": true,
  "message": "Operation completed successfully"
}
```

### 4.2. Error Responses

| Status Code | Content-Type | Schema | Example | Description |
|-------------|--------------|--------|---------|-------------|
| 400 | application/json | {"error": "string"} | {"error": "Invalid UUID format"} | Invalid UUID format, missing required fields, or invalid data format |
| 404 | application/json | {"error": "string"} | {"error": "Master phase not found"} | Resource not found |
| 409 | application/json | {"error": "string"} | {"error": "Cannot delete phase with dependencies"} | Constraint violation, deletion conflicts |
| 500 | application/json | {"error": "string"} | {"error": "Database error"} | Internal server error |

## 5. Authentication & Authorization
- **Required?** Yes
- **Mechanism:** Confluence Basic Authentication
- **Permissions:** confluence-users
- **Groups:** confluence-users group membership required for all endpoints

## 6. Rate Limiting & Security
- **Rate Limits:** None specified
- **RLS (Row-Level Security):** No
- **Input Validation:** 
  - UUID format validation for all ID parameters
  - Type safety with explicit casting (ADR-031)
  - JSON format validation for request bodies
- **Other Security Considerations:** 
  - SQL injection prevention via parameterized queries
  - Foreign key constraint validation
  - Cascade deletion protection

## 7. Hierarchical Filtering (ADR-030)

The Phases API supports deep hierarchical filtering using instance IDs:

### 7.1. Filtering Strategy
- **Use Instance IDs:** Always filter using `pli_id`, `sqi_id`, `phi_id` (NOT master IDs)
- **Cascading Filters:** Each level filters down the hierarchy
- **Complete Context:** Include ALL fields referenced in result mapping

### 7.2. Filter Combinations
```bash
# Filter phases by migration
GET /phases/instance?migrationId=123e4567-e89b-12d3-a456-426614174000

# Filter phases by specific iteration within migration
GET /phases/instance?migrationId=123e4567-e89b-12d3-a456-426614174000&iterationId=987fcdeb-51a2-43d1-9c45-123456789abc

# Filter phases by plan instance
GET /phases/instance?planInstanceId=456e7890-e12c-23d4-b567-537625285111

# Filter phases by sequence instance  
GET /phases/instance?sequenceInstanceId=789abc12-f34e-45f6-c890-648736396222

# Combined filtering with team and status
GET /phases/instance?planInstanceId=456e7890-e12c-23d4-b567-537625285111&teamId=5&statusId=2
```

## 8. Control Point Workflow

Control points provide automated quality gates for phase execution:

### 8.1. Control Point States
- **PENDING:** Awaiting validation
- **VALIDATED:** Successfully validated by required validators
- **FAILED:** Validation failed, blocking phase progress
- **OVERRIDDEN:** Manually overridden with documented reason

### 8.2. Validation Types
- **AUTOMATED:** System-validated through automated checks
- **MANUAL_IT:** Requires IT team manual validation
- **MANUAL_BUSINESS:** Requires business team manual validation
- **DUAL_APPROVAL:** Requires both IT and business validation

### 8.3. Override Process
1. **Attempt Validation:** POST `/phases/{phi_id}/controls/validate`
2. **Identify Blockers:** Review failed control points in response
3. **Request Override:** POST `/phases/{phi_id}/controls/{cti_id}/override` with detailed reason
4. **Audit Trail:** All overrides logged with timestamp, user, and reason

### 8.4. Workflow Examples

#### Standard Validation Flow
```bash
# 1. Get control points for phase
GET /phases/789abc12-f34e-45f6-c890-648736396222/controls

# 2. Validate all control points
POST /phases/789abc12-f34e-45f6-c890-648736396222/controls/validate

# 3. Update specific control point status
PUT /phases/789abc12-f34e-45f6-c890-648736396222/controls/456def78-g90h-56i7-j234-859647518333
{
  "cti_status": "VALIDATED",
  "usr_id_it_validator": 5
}
```

#### Emergency Override Flow
```bash
# 1. Attempt validation (fails due to blocking control)
POST /phases/789abc12-f34e-45f6-c890-648736396222/controls/validate

# 2. Override blocking control with detailed reason
POST /phases/789abc12-f34e-45f6-c890-648736396222/controls/456def78-g90h-56i7-j234-859647518333/override
{
  "reason": "Critical security patch deployment - monitoring validation bypassed with CTO approval",
  "overrideBy": "jane.smith@company.com"
}
```

## 9. Integration with Sequences API

### 9.1. Relationship
- **Parent-Child:** Phases belong to sequence instances via `sqi_id`
- **Filtering Integration:** Use sequence instance IDs for hierarchical filtering
- **Dependency Chain:** Sequences → Phases → Steps hierarchy

### 9.2. Cross-API Operations
```bash
# 1. Get sequence instance
GET /sequences-instance/987fcdeb-51a2-43d1-9c45-123456789abc

# 2. Get phases within sequence
GET /phases/instance?sequenceInstanceId=987fcdeb-51a2-43d1-9c45-123456789abc

# 3. Create new phase instance for sequence
POST /phases/instance
{
  "phm_id": "master-phase-uuid",
  "sqi_id": "987fcdeb-51a2-43d1-9c45-123456789abc"
}
```

## 10. Type Safety Requirements (ADR-031)

All endpoints implement explicit type casting for parameters:

### 10.1. UUID Parameters
```groovy
def phaseId = UUID.fromString(pathParts[0] as String)
def sequenceId = UUID.fromString(requestData.sequenceId as String)
```

### 10.2. Integer Parameters
```groovy
def teamId = Integer.parseInt(filters.teamId as String)
def newOrder = Integer.parseInt(requestData.newOrder as String)
```

### 10.3. String Parameters
```groovy
def phaseName = requestData.phm_name as String
def description = requestData.phm_description as String
```

## 11. Business Logic & Side Effects

### 11.1. Key Business Logic

#### Master Phase Management
- **Hierarchy**: Master phases belong to sequence masters (sqm_id)
- **Ordering**: phm_order field maintains sequence within a sequence master
- **Predecessors**: predecessor_phm_id creates dependency chains
- **Templates**: Master phases serve as templates for instance creation

#### Phase Instance Operations
- **Instance Creation**: Created from master phases with optional field overrides
- **Hierarchical Filtering**: Progressive filtering through migration → iteration → plan instance → sequence instance → phase instance hierarchy
- **Status Management**: Instance-specific status tracking (pending, in_progress, completed, etc.)
- **Timing**: Start/end time tracking for execution monitoring

#### Control Points Management
- **Validation Gates**: Control points act as validation gates for phase progression
- **Dual Validation**: Both IT and business validator assignments
- **Override Capability**: Emergency override with reason and audit trail
- **Status Tracking**: Individual control point status management

#### Ordering Operations
- **Bulk Reordering**: Efficient reordering of multiple phases within scope
- **Individual Moves**: Single phase repositioning with automatic order adjustment
- **Dependency Preservation**: Ordering operations respect predecessor relationships
- **Scope Isolation**: Ordering operations isolated to specific sequence (master or instance)

#### Progress Tracking
- **Calculation**: Progress based on completed steps within phase
- **Real-time**: Dynamic calculation based on current step statuses
- **Percentage**: Returns 0-100 percentage completion

### 11.2. Side Effects
- **Database State**: All POST/PUT/DELETE operations modify database state
- **Cascade Operations**: Deletions may trigger cascade operations on dependent entities
- **Order Adjustment**: Move operations may adjust order of other phases
- **Audit Trail**: All modifications create audit trail entries
- **Control Validation**: Control point updates may trigger phase status changes

### 11.3. Idempotency
- **GET Operations**: Yes - safe and idempotent
- **PUT Operations**: Yes - same data produces same result
- **POST Operations**: No - creates new resources
- **DELETE Operations**: Yes - subsequent deletes on non-existent resources return appropriate responses
- **Reorder Operations**: Yes - same order map produces same result

## 12. Ordering and Dependencies

### 12.1. Order Management
- **Phase Order:** Sequential execution within sequences (`phm_order`, `phi_order`)
- **Predecessor Relationships:** Optional predecessor dependencies
- **Bulk Reordering:** Efficient reordering of multiple phases
- **Individual Moves:** Single phase repositioning

### 12.2. Dependency Rules
- **Predecessor Validation:** Cannot start phase until predecessor completes
- **Circular Dependency Prevention:** System prevents circular predecessor chains
- **Order Consistency:** Order values maintained consistently during reordering

### 12.3. Reordering Examples

#### Bulk Reorder Master Phases
```bash
PUT /phases/master/reorder
{
  "sequenceId": "987fcdeb-51a2-43d1-9c45-123456789abc",
  "phaseOrderMap": {
    "123e4567-e89b-12d3-a456-426614174001": 1,
    "123e4567-e89b-12d3-a456-426614174002": 2,
    "123e4567-e89b-12d3-a456-426614174003": 3
  }
}
```

#### Move Single Phase Instance
```bash
POST /phases/instance/789abc12-f34e-45f6-c890-648736396222/move
{
  "newOrder": 3
}
```

## 13. Progress Tracking

### 13.1. Progress Calculation
Phase progress is calculated based on:
- **Control Point Status:** Percentage of validated control points
- **Step Completion:** Percentage of completed steps within phase
- **Time Progress:** Actual vs. planned execution time

### 13.2. Progress API Usage
```bash
# Get current phase progress
GET /phases/789abc12-f34e-45f6-c890-648736396222/progress

# Response
{
  "phi_id": "789abc12-f34e-45f6-c890-648736396222",
  "progress_percentage": 75.5
}
```

## 14. Error Handling

### 14.1. SQL Error Mapping
- **23503 (Foreign Key):** 400 Bad Request - Invalid reference
- **23505 (Unique Violation):** 409 Conflict - Duplicate entry
- **23514 (Check Constraint):** 400 Bad Request - Invalid data

### 14.2. Common Error Scenarios
- **Invalid UUID:** 400 Bad Request with format error
- **Missing Dependencies:** 404 Not Found for referenced entities
- **Constraint Violations:** 409 Conflict for business rule violations

## 15. Best Practices

### 15.1. API Usage
1. **Always use instance IDs** for hierarchical filtering
2. **Validate control points** before phase progression
3. **Document override reasons** thoroughly for audit compliance
4. **Use bulk operations** for multiple phase reordering
5. **Check progress regularly** during phase execution

### 15.2. Error Recovery
1. **Retry transient errors** with exponential backoff
2. **Validate prerequisites** before creating phase instances
3. **Handle constraint violations** gracefully with user feedback
4. **Log override actions** for compliance and troubleshooting

### 15.3. Performance Optimization
1. **Use specific filters** to reduce data transfer
2. **Batch control point updates** when possible
3. **Cache master phase data** for repeated instance creation
4. **Monitor progress endpoints** for real-time dashboards

## 16. Dependencies & Backing Services

### 16.1. Database Tables/Entities
**Primary Tables:**
- `phases_master_phm` - Master phase templates
- `phases_instance_phi` - Phase instances

**Relationship Tables:**
- `sequences_master_sqm` - Parent sequence masters
- `sequences_instance_sqi` - Parent sequence instances
- `control_points_instance_cti` - Control points for phases
- `steps_instance_sti` - Step instances within phases

**Hierarchy Tables:**
- `plans_instance_pli` - Plan instances (parent of sequence instances)
- `plans_master_plm` - Plan masters (parent of sequence masters)
- `iterations_ite` - Iterations (parent of plan instances)
- `migrations_mig` - Migrations (top-level hierarchy)

**Support Tables:**
- `users_usr` - User validation assignments
- `teams_tem` - Team assignments
- `statuses` - Status definitions

### 16.2. External Services
- **DatabaseUtil**: Connection management and transaction handling
- **PhaseRepository**: Data access layer abstraction
- **None**: No external API dependencies

## 17. Versioning & Deprecation
- **API Version:** V2
- **Backward Compatibility:** Maintains compatibility with established V2 patterns
- **Deprecation Policy:** Follow project deprecation guidelines
- **Migration Path:** Direct upgrade from any V1 phase-related endpoints

## 18. Testing & Mock Data

### 18.1. Testing Strategy
- **Unit Tests:** Repository layer testing with SQL mocks
- **Integration Tests:** End-to-end API testing with test database
- **Error Scenarios:** Comprehensive error condition testing
- **Performance Tests:** Load testing for bulk operations

### 18.2. Mock Data
- **Synthetic Data**: Data generators create realistic phase hierarchies
- **Test Scenarios**: 
  - 5 migrations with 30 iterations
  - 5 plan instances per iteration
  - 13 sequences per plan → 43 phases per sequence
  - Control points and validation scenarios
- **Ordering Tests**: Various phase ordering configurations
- **Control Tests**: Different control point states and validation scenarios

## 19. Performance Considerations

### 19.1. Query Optimization
- **Hierarchical Filtering**: Optimized query paths for filtering operations
- **Bulk Operations**: Efficient batch processing for reordering operations
- **Index Usage**: Proper indexing on UUID foreign keys and order fields

### 19.2. Scalability
- **Pagination**: Consider implementing pagination for large phase lists
- **Caching**: Repository-level caching for frequently accessed master phases
- **Batch Size**: Optimal batch sizes for bulk reordering operations

### 19.3. Resource Management
- **Connection Pooling**: DatabaseUtil manages connection lifecycle
- **Transaction Scope**: Appropriate transaction boundaries for operations
- **Memory Usage**: Efficient handling of large phase hierarchies

## 20. Integration Patterns

### 20.1. Frontend Integration
- **CRUD Operations**: Standard Create, Read, Update, Delete patterns
- **Real-time Updates**: Phase status changes trigger UI refreshes
- **Drag-and-Drop**: Reordering operations support UI drag-and-drop
- **Progress Visualization**: Progress endpoints support progress bars and dashboards

### 20.2. Workflow Integration
- **Status Transitions**: Phase status changes trigger workflow events
- **Control Validation**: Control point validation integrates with approval workflows
- **Notification**: Phase completion triggers notification workflows
- **Audit Integration**: All operations integrate with audit logging

## 21. Changelog

- **Date:** 2025-08-04
- **Change:** Enhanced comprehensive Phases API documentation with 19 endpoints
- **Author:** GENDEV Documentation Generator
- **Version:** 2.0.0
- **Details:** Added business value section, hierarchical filtering guide, control point workflow, Sequences API integration, type safety requirements, ordering examples, progress tracking, error handling, best practices, and comprehensive examples

- **Date:** 2025-08-04
- **Change:** Original comprehensive Phases API documentation created
- **Author:** Claude AI Assistant
- **Version:** 1.0.0
- **Details:** Complete 19-endpoint specification with master/instance operations, control points, ordering, and progress tracking

- **Date:** 2025-08-04
- **Change:** Documented master phase management (5 endpoints)
- **Details:** GET, POST, PUT, DELETE operations for master phases with sequence filtering
- **Author:** Claude AI Assistant

- **Date:** 2025-08-04
- **Change:** Documented instance phase operations (5 endpoints)
- **Details:** Full CRUD operations with hierarchical filtering support
- **Author:** Claude AI Assistant

- **Date:** 2025-08-04
- **Change:** Documented control points management (4 endpoints)
- **Details:** Control point retrieval, validation, updates, and override capabilities
- **Author:** Claude AI Assistant

- **Date:** 2025-08-04
- **Change:** Documented ordering operations (4 endpoints)
- **Details:** Bulk reordering and individual move operations for both master and instance phases
- **Author:** Claude AI Assistant

- **Date:** 2025-08-04
- **Change:** Documented progress tracking (1 endpoint)
- **Details:** Phase progress calculation based on step completion
- **Author:** Claude AI Assistant

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and ADRs.