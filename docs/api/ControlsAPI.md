# Controls API Specification

> Comprehensive API specification for Controls management in the UMIG project. Controls represent validation checkpoints and critical control points within phases, supporting both master templates and instances for specific phase implementations.

---

## 1. API Overview

- **API Name:** Controls API v2
- **Purpose:** Manage migration control points with validation tracking, override capabilities, and progress calculation
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-030 (Hierarchical Filtering), ADR-031 (Type Safety)

## 2. Endpoints

| Method | Path                              | Description                                        |
| ------ | --------------------------------- | -------------------------------------------------- |
| GET    | /controls/master                  | List all master control templates                  |
| POST   | /controls/master                  | Create new master control template                 |
| GET    | /controls/master/{id}             | Get specific master control template               |
| PUT    | /controls/master/{id}             | Update master control template                     |
| DELETE | /controls/master/{id}             | Delete master control template                     |
| PUT    | /controls/master/reorder          | Reorder master controls within phase               |
| POST   | /controls/master/bulk             | Create multiple master controls                    |
| GET    | /controls                         | List control instances with hierarchical filtering |
| POST   | /controls/instance                | Create control instance from master template       |
| POST   | /controls/master/{id}/instantiate | Create instance from specific master control       |
| GET    | /controls/instance/{id}           | Get specific control instance                      |
| PUT    | /controls/instance/{id}           | Update control instance                            |
| DELETE | /controls/instance/{id}           | Delete control instance                            |
| PUT    | /controls/instance/{id}/status    | Update control instance status                     |
| PUT    | /controls/instance/{id}/validate  | Validate control with IT/Business approval         |
| PUT    | /controls/instance/{id}/override  | Override control with justification                |
| POST   | /controls/instance/bulk           | Create multiple control instances                  |
| PUT    | /controls/instance/bulk/validate  | Validate all controls in a phase                   |
| GET    | /controls/{phaseId}/progress      | Calculate control progress for phase               |

## 3. Request Details

### 3.1. Path Parameters

| Name    | Type | Required | Description                                |
| ------- | ---- | -------- | ------------------------------------------ |
| id      | UUID | Yes      | Control identifier (master or instance ID) |
| phaseId | UUID | Yes      | Phase instance ID for progress calculation |

### 3.2. Query Parameters

| Name               | Type    | Required | Description                                         |
| ------------------ | ------- | -------- | --------------------------------------------------- |
| migrationId        | UUID    | No       | Filter controls by migration (hierarchical)         |
| iterationId        | UUID    | No       | Filter controls by iteration (hierarchical)         |
| planInstanceId     | UUID    | No       | Filter controls by plan instance (hierarchical)     |
| sequenceInstanceId | UUID    | No       | Filter controls by sequence instance (hierarchical) |
| phaseInstanceId    | UUID    | No       | Filter controls by phase instance (hierarchical)    |
| phaseId            | UUID    | No       | Filter master controls by master phase              |
| teamId             | Integer | No       | Filter controls by owning team                      |
| statusId           | Integer | No       | Filter controls by status                           |
| page               | Integer | No       | Page number for pagination (default: 1)             |
| size               | Integer | No       | Page size for pagination (default: 50)              |
| sort               | String  | No       | Sort field (default: ctm_code)                      |
| direction          | String  | No       | Sort direction: asc or desc (default: asc)          |

#### Allowed Sort Fields for Master Controls

The following fields are supported for sorting master controls via the `sort` parameter:

| Field Name       | Description                                          |
| ---------------- | ---------------------------------------------------- |
| ctm_id           | Master control ID (UUID)                             |
| ctm_code         | Control code identifier (default sort field)         |
| ctm_name         | Control name                                         |
| ctm_description  | Control description                                  |
| ctm_type         | Control type (VALIDATION, CHECK, APPROVAL)           |
| ctm_is_critical  | Critical control flag                                |
| ctm_order        | Display order within phase                           |
| created_at       | Creation timestamp                                   |
| updated_at       | Last update timestamp                                |
| instance_count   | Number of instances created from this master control |
| validation_count | Number of validated instances                        |
| plm_name         | Plan master name (hierarchy field)                   |
| sqm_name         | Sequence master name (hierarchy field)               |
| phm_name         | Phase master name (hierarchy field)                  |
| tms_name         | Team name (hierarchy field)                          |

**Default Sort:** If no `sort` parameter is provided, results are sorted by `ctm_code` in ascending order, which serves as the primary display field for Admin GUI integration.

### 3.3. Request Body

#### Master Control Creation

- **Content-Type:** application/json
- **Schema:**

```json
{
  "phm_id": "uuid",
  "ctm_name": "string",
  "ctm_description": "string (optional)",
  "ctm_type": "string (optional)",
  "ctm_is_critical": "boolean (optional)",
  "ctm_code": "string (optional)",
  "ctm_order": "integer (optional)"
}
```

- **Example:**

```json
{
  "phm_id": "123e4567-e89b-12d3-a456-426614174000",
  "ctm_name": "Database Backup Verification",
  "ctm_description": "Verify all critical databases are backed up before cutover",
  "ctm_type": "VALIDATION",
  "ctm_is_critical": true,
  "ctm_code": "DB_BACKUP_CHECK",
  "ctm_order": 1
}
```

#### Master Control Update

- **Content-Type:** application/json
- **Schema:**

```json
{
  "ctm_name": "string (optional)",
  "ctm_description": "string (optional)",
  "ctm_type": "string (optional)",
  "ctm_is_critical": "boolean (optional)",
  "ctm_code": "string (optional)",
  "ctm_order": "integer (optional)",
  "phm_id": "uuid (optional)"
}
```

- **Example:**

```json
{
  "ctm_name": "Updated Database Backup Verification",
  "ctm_description": "Enhanced verification process for all critical databases",
  "ctm_type": "VALIDATION",
  "ctm_is_critical": true,
  "ctm_code": "DB_BACKUP_CHECK_V2",
  "ctm_order": 2,
  "phm_id": "456e7890-e12b-34c5-b678-901234567def"
}
```

**Note:** The `phm_id` field enables Admin GUI EDIT mode support by allowing phase association updates. When `phm_id` is updated, the plan and sequence relationships are automatically resolved through database JOINs, as only the Phase Master ID is stored directly in the controls_master_ctm table.

#### Control Instance Creation

- **Content-Type:** application/json
- **Schema:**

```json
{
  "ctm_id": "uuid",
  "phi_id": "uuid",
  "cti_name": "string (optional)",
  "cti_description": "string (optional)",
  "cti_status": "integer (optional, FK to status_sts)",
  "cti_order": "integer (optional)",
  "cti_type": "string (optional)",
  "cti_is_critical": "boolean (optional)",
  "cti_code": "string (optional)",
  "usr_id_it_validator": "integer (optional)",
  "usr_id_biz_validator": "integer (optional)"
}
```

- **Example:**

```json
{
  "ctm_id": "123e4567-e89b-12d3-a456-426614174000",
  "phi_id": "987fcdeb-51a2-43d1-9c45-123456789abc",
  "cti_name": "Production DB Backup Check",
  "cti_description": "Verify production database backup completed successfully",
  "cti_status": "PENDING",
  "usr_id_it_validator": 5,
  "usr_id_biz_validator": 8
}
```

#### Master Control Reordering

- **Content-Type:** application/json
- **Schema:**

```json
{
  "phm_id": "uuid",
  "control_order": ["uuid"]
}
```

- **Example:**

```json
{
  "phm_id": "123e4567-e89b-12d3-a456-426614174000",
  "control_order": [
    "456e7890-e12b-34c5-b678-901234567def",
    "789fabcd-e34f-56a7-c890-123456789012"
  ]
}
```

#### Control Validation

- **Content-Type:** application/json
- **Schema:**

```json
{
  "cti_status": "integer (FK to status_sts)",
  "usr_id_it_validator": "integer (optional)",
  "usr_id_biz_validator": "integer (optional)"
}
```

- **Example:**

```json
{
  "cti_status": "VALIDATED",
  "usr_id_it_validator": 5,
  "usr_id_biz_validator": 8
}
```

#### Control Override

- **Content-Type:** application/json
- **Schema:**

```json
{
  "reason": "string",
  "overrideBy": "string"
}
```

- **Example:**

```json
{
  "reason": "Emergency cutover - business approved risk exception",
  "overrideBy": "john.smith@company.com"
}
```

## 4. Response Details

### 4.1. Success Response - Master Control

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "ctm_id": "uuid",
  "phm_id": "uuid",
  "ctm_order": "integer",
  "ctm_name": "string",
  "ctm_description": "string",
  "ctm_type": "string",
  "ctm_is_critical": "boolean",
  "ctm_code": "string",
  "created_by": "string",
  "created_at": "datetime",
  "updated_by": "string",
  "updated_at": "datetime",
  "phm_name": "string",
  "phase_description": "string",
  "sqm_id": "uuid",
  "sqm_name": "string",
  "sequence_description": "string",
  "plm_id": "uuid",
  "plm_name": "string",
  "plan_description": "string",
  "tms_id": "integer",
  "tms_name": "string"
}
```

- **Example:**

```json
{
  "ctm_id": "123e4567-e89b-12d3-a456-426614174000",
  "phm_id": "987fcdeb-51a2-43d1-9c45-123456789abc",
  "ctm_order": 1,
  "ctm_name": "Database Backup Verification",
  "ctm_description": "Verify all critical databases are backed up before cutover",
  "ctm_type": "VALIDATION",
  "ctm_is_critical": true,
  "ctm_code": "DB_BACKUP_CHECK",
  "created_by": "admin",
  "created_at": "2025-07-15T10:30:00Z",
  "updated_by": "admin",
  "updated_at": "2025-07-15T10:30:00Z",
  "phm_name": "Pre-Cutover Validation",
  "phase_description": "Critical validation phase before production cutover",
  "sqm_id": "456e7890-e12b-34c5-b678-901234567def",
  "sqm_name": "Database Migration",
  "sequence_description": "Complete database migration sequence",
  "plm_id": "789fabcd-e34f-56a7-c890-123456789012",
  "plm_name": "Q1 Migration Plan",
  "plan_description": "First quarter migration execution plan",
  "tms_id": 1,
  "tms_name": "Database Team"
}
```

### 4.2. Success Response - Control Instance

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "cti_id": "uuid",
  "ctm_id": "uuid",
  "phi_id": "uuid",
  "cti_order": "integer",
  "cti_name": "string",
  "cti_description": "string",
  "cti_type": "string",
  "cti_is_critical": "boolean",
  "cti_code": "string",
  "cti_status": "integer (FK to status_sts)",
  "usr_id_it_validator": "integer",
  "usr_id_biz_validator": "integer",
  "created_by": "string",
  "created_at": "datetime",
  "updated_by": "string",
  "updated_at": "datetime",
  "ctm_name": "string",
  "master_description": "string",
  "phi_name": "string",
  "phase_description": "string",
  "sqi_id": "uuid",
  "sequence_name": "string",
  "pli_id": "uuid",
  "plan_name": "string",
  "ite_id": "uuid",
  "iteration_name": "string",
  "mig_id": "uuid",
  "migration_name": "string",
  "it_validator_name": "string",
  "biz_validator_name": "string"
}
```

### 4.3. Success Response - Progress Calculation

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "phi_id": "uuid",
  "phase_name": "string",
  "total_controls": "integer",
  "validated_controls": "integer",
  "pending_controls": "integer",
  "overridden_controls": "integer",
  "critical_controls": "integer",
  "critical_validated": "integer",
  "progress_percentage": "number",
  "critical_progress_percentage": "number",
  "validation_status": "string"
}
```

- **Example:**

```json
{
  "phi_id": "123e4567-e89b-12d3-a456-426614174000",
  "phase_name": "Pre-Cutover Validation",
  "total_controls": 8,
  "validated_controls": 6,
  "pending_controls": 2,
  "overridden_controls": 0,
  "critical_controls": 3,
  "critical_validated": 2,
  "progress_percentage": 75.0,
  "critical_progress_percentage": 66.7,
  "validation_status": "IN_PROGRESS"
}
```

### 4.4. Success Response - Bulk Operations

- **Status Code:** 201
- **Content-Type:** application/json
- **Schema:**

```json
{
  "created": ["object"],
  "failures": [
    {
      "index": "integer",
      "error": "string"
    }
  ],
  "summary": {
    "total_requested": "integer",
    "created_count": "integer",
    "failed_count": "integer"
  }
}
```

### 4.5. Error Responses

| Status Code | Content-Type     | Schema | Example                                         | Description                           |
| ----------- | ---------------- | ------ | ----------------------------------------------- | ------------------------------------- |
| 400         | application/json | Error  | `{"error": "phm_id and ctm_name are required"}` | Bad request - missing required fields |
| 404         | application/json | Error  | `{"error": "Master control not found"}`         | Resource not found                    |
| 409         | application/json | Error  | `{"error": "Unique constraint violation"}`      | Conflict - duplicate entry            |
| 500         | application/json | Error  | `{"error": "Internal server error"}`            | Server error                          |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence session-based authentication
- **Permissions:**
  - Read operations: `confluence-users`
  - Create/Update operations: `confluence-users`
  - Delete operations: `confluence-users`
  - Override operations: `confluence-users` (with audit trail)

## 6. Rate Limiting & Security

- **Rate Limits:** Standard Confluence limits apply
- **RLS (Row-Level Security):** No
- **Input Validation:** All UUID and integer parameters validated with explicit casting
- **Other Security Considerations:**
  - SQL injection prevention through parameterized queries
  - Control override operations are fully audited
  - Validation tracking maintains accountability

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Master controls serve as templates for creating instances
  - Control instances inherit properties from master but can override specific fields
  - Critical controls must be explicitly validated or overridden
  - Validation requires both IT and Business validator assignments
  - Override operations require justification and are permanently audited
- **Side Effects:**
  - Status changes trigger audit field updates
  - Validation updates affect phase progress calculations
  - Override operations create permanent audit records
- **Idempotency:** PUT operations are idempotent for status and field updates

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `controls_master_ctm` - Master control templates
  - `controls_instance_cti` - Control instances
  - `phases_master_phm` - Phase master associations
  - `phases_instance_phi` - Phase instance associations
  - `users` - Validator information
  - `statuses` - Status lookup
- **External APIs:** None
- **Other Services:** Email notification service for validation status changes

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** 6-month notice for breaking changes

## 10. Testing & Mock Data

- **Unit Tests:** `ControlsApiUnitTest.groovy`, `ControlsApiUnitTestSimple.groovy`
- **Integration Tests:** Covered in API integration test suite
- **E2E Tests:** Via Postman collection
- **Mock Data/Fixtures:** Generated through data generation scripts (001-100)

## 11. Hierarchical Filtering

The Controls API supports progressive hierarchical filtering:

### Migration Level

```
GET /controls?migrationId=123e4567-e89b-12d3-a456-426614174000
```

Returns all control instances within the specified migration.

### Iteration Level

```
GET /controls?iterationId=987fcdeb-51a2-43d1-9c45-123456789abc
```

Returns all control instances within the specified iteration.

### Plan Instance Level

```
GET /controls?planInstanceId=456e7890-e12b-34c5-b678-901234567def
```

Returns all control instances within the specified plan instance.

### Sequence Instance Level

```
GET /controls?sequenceInstanceId=789fabcd-e34f-56a7-c890-123456789012
```

Returns all control instances within the specified sequence instance.

### Phase Instance Level

```
GET /controls?phaseInstanceId=012345ab-cdef-6789-0123-456789abcdef
```

Returns all control instances within the specified phase instance.

### Combined Filtering

```
GET /controls?migrationId={mig-id}&teamId=1&statusId=2
```

Returns control instances matching all specified criteria.

## 12. Control Validation Workflow

### Standard Validation Process

1. **Control Created:** Status = `PENDING`
2. **IT Validation:** Update with `usr_id_it_validator`
3. **Business Validation:** Update with `usr_id_biz_validator`
4. **Complete Validation:** Status = `VALIDATED`

### Override Process

1. **Override Request:** Submit with justification reason
2. **Audit Creation:** Permanent record of override
3. **Status Update:** Status = `OVERRIDDEN`
4. **Progress Impact:** Overridden controls count toward completion

### Bulk Validation

```
PUT /controls/instance/bulk/validate
{
  "phi_id": "123e4567-e89b-12d3-a456-426614174000",
  "cti_status": "VALIDATED",
  "usr_id_it_validator": 5,
  "usr_id_biz_validator": 8
}
```

Validates all controls within a phase instance simultaneously.

## 13. Progress Calculation Rules

### Progress Metrics

- **Overall Progress:** (Validated + Overridden) / Total Controls
- **Critical Progress:** (Critical Validated + Critical Overridden) / Critical Controls
- **Validation Status:**
  - `COMPLETE`: All controls validated/overridden
  - `IN_PROGRESS`: Some controls pending
  - `NOT_STARTED`: No controls validated

### Phase Readiness

- Critical controls must be 100% validated/overridden
- Non-critical controls contribute to overall progress
- Override justifications are preserved for audit

## 14. Implementation Patterns

### 14.1. Response Building Pattern

All successful API responses use the standardized `buildSuccessResponse` helper method:

```groovy
private Response buildSuccessResponse(Object data, Response.Status status = Response.Status.OK) {
    return Response.status(status)
        .entity(new JsonBuilder(data).toString())
        .build()
}
```

This ensures consistent JSON formatting across all endpoints.

### 14.2. Filter Validation Pattern

The repository uses centralized filter validation for performance optimization:

```groovy
private Map validateFilters(Map filters) {
    return filters.findAll { k, v -> v != null }.collectEntries { k, v ->
        switch(k) {
            case ~/.*Id$/:
                // Intelligent type detection for ID fields
                return [k, k in ['teamId', 'statusId'] ?
                    Integer.parseInt(v as String) :
                    UUID.fromString(v as String)]
            default:
                return [k, v as String]
        }
    }
}
```

This reduces redundant type casting and improves query performance.

## 15. Changelog

- **2025-08-25:** Enhanced Admin GUI integration - Added hierarchy fields (plm_name, sqm_name, phm_name, tms_name) to sortable fields for master controls. Added phm_id parameter support in PUT endpoint for Phase Master association updates. Added comprehensive sorting documentation with 16 supported sort fields.
- **2025-08-06:** Added performance optimizations (validateFilters, buildSuccessResponse) and edge case tests
- **2025-07-15:** Created comprehensive API specification with validation workflows
- **2025-08-01:** Initial implementation of Controls API v2
- **Author:** Claude AI Assistant (UMIG Documentation Update)

---

> **Note:** This specification reflects the current production state of the Controls API. The validation and override capabilities provide critical checkpoints for migration execution with full accountability and audit trail support per US-004 implementation requirements.
