# Sequences API Specification

> Comprehensive API specification for Sequences management in the UMIG project. Sequences represent ordered execution units within plans, supporting dependency management and predecessor relationships.

---

## 1. API Overview
- **API Name:** Sequences API v2
- **Purpose:** Manage migration execution sequences with ordering, dependencies, and hierarchical filtering
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-030 (Hierarchical Filtering), ADR-031 (Type Safety)

## 2. Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /sequences/master | List all master sequence templates |
| POST | /sequences/master | Create new master sequence template |
| GET | /sequences/master/{id} | Get specific master sequence template |
| PUT | /sequences/master/{id} | Update master sequence template |
| DELETE | /sequences/master/{id} | Soft delete master sequence template |
| PUT | /sequences/master/{id}/order | Update sequence order within plan |
| GET | /sequences | List sequence instances with hierarchical filtering |
| POST | /sequences/instance | Create sequence instance from master template |
| GET | /sequences/instance/{id} | Get specific sequence instance |
| PUT | /sequences/instance/{id} | Update sequence instance |
| DELETE | /sequences/instance/{id} | Delete sequence instance |
| PUT | /sequences/instance/{id}/status | Update sequence instance status |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | UUID | Yes | Sequence identifier (master or instance ID) |

### 3.2. Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| migrationId | UUID | No | Filter sequences by migration (hierarchical) |
| iterationId | UUID | No | Filter sequences by iteration (hierarchical) |
| planId | UUID | No | Filter sequences by plan instance (hierarchical) |
| teamId | Integer | No | Filter sequences by owning team |
| status | String | No | Filter sequences by status name |

### 3.3. Request Body

#### Master Sequence Creation
- **Content-Type:** application/json
- **Schema:**
```json
{
  "plm_id": "uuid",
  "tms_id": "integer",
  "sqm_name": "string",
  "sqm_description": "string (optional)",
  "sqm_order": "integer (optional)",
  "sqm_status": "integer (FK to status_sts)",
  "predecessor_sqm_id": "uuid (optional)"
}
```
- **Example:**
```json
{
  "plm_id": "123e4567-e89b-12d3-a456-426614174000",
  "tms_id": 1,
  "sqm_name": "Pre-Migration Validation",
  "sqm_description": "Validate system readiness before migration",
  "sqm_order": 1,
  "sqm_status": "ACTIVE",
  "predecessor_sqm_id": null
}
```

#### Sequence Instance Creation
- **Content-Type:** application/json
- **Schema:**
```json
{
  "sqm_id": "uuid",
  "pli_id": "uuid",
  "usr_id_owner": "integer",
  "sqi_name": "string (optional)",
  "sqi_description": "string (optional)"
}
```
- **Example:**
```json
{
  "sqm_id": "123e4567-e89b-12d3-a456-426614174000",
  "pli_id": "987fcdeb-51a2-43d1-9c45-123456789abc",
  "usr_id_owner": 5,
  "sqi_name": "Q1 Pre-Migration Validation",
  "sqi_description": "First quarter validation sequence"
}
```

#### Sequence Order Update
- **Content-Type:** application/json
- **Schema:**
```json
{
  "sqm_order": "integer"
}
```
- **Example:**
```json
{
  "sqm_order": 3
}
```

## 4. Response Details

### 4.1. Success Response - Master Sequence
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
{
  "sqm_id": "uuid",
  "plm_id": "uuid",
  "plm_name": "string",
  "tms_id": "integer",
  "tms_name": "string",
  "sqm_name": "string",
  "sqm_description": "string",
  "sqm_order": "integer",
  "sqm_status": "integer (FK to status_sts)",
  "sts_id": "integer",
  "sts_name": "string",
  "sts_color": "string",
  "predecessor_sqm_id": "uuid",
  "predecessor_name": "string",
  "created_by": "string",
  "created_at": "datetime",
  "updated_by": "string",
  "updated_at": "datetime"
}
```
- **Example:**
```json
{
  "sqm_id": "123e4567-e89b-12d3-a456-426614174000",
  "plm_id": "987fcdeb-51a2-43d1-9c45-123456789abc",
  "plm_name": "Application Migration Plan",
  "tms_id": 1,
  "tms_name": "Infrastructure Team",
  "sqm_name": "Pre-Migration Validation",
  "sqm_description": "Validate system readiness before migration",
  "sqm_order": 1,
  "sqm_status": "ACTIVE",
  "sts_id": 2,
  "sts_name": "Active",
  "sts_color": "#28a745",
  "predecessor_sqm_id": null,
  "predecessor_name": null,
  "created_by": "admin",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_by": "admin",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### 4.2. Success Response - Sequence Instance
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
{
  "sqi_id": "uuid",
  "sqm_id": "uuid",
  "sqm_name": "string",
  "pli_id": "uuid",
  "pli_name": "string",
  "ite_id": "uuid",
  "itr_name": "string",
  "mig_id": "uuid",
  "mig_name": "string",
  "sqi_name": "string",
  "sqi_description": "string",
  "sqi_order": "integer",
  "sqi_status": "integer (FK to status_sts)",
  "sts_id": "integer",
  "sts_name": "string",
  "sts_color": "string",
  "usr_id_owner": "integer",
  "owner_name": "string",
  "tms_id": "integer",
  "tms_name": "string",
  "created_by": "string",
  "created_at": "datetime",
  "updated_by": "string",
  "updated_at": "datetime"
}
```

### 4.3. Error Responses

| Status Code | Content-Type | Schema | Example | Description |
|-------------|--------------|--------|---------|-------------|
| 400 | application/json | Error | `{"error": "Invalid sequence ID format"}` | Bad request - invalid parameters |
| 404 | application/json | Error | `{"error": "Sequence not found"}` | Resource not found |
| 409 | application/json | Error | `{"error": "Sequence with this name already exists"}` | Conflict - duplicate name |
| 500 | application/json | Error | `{"error": "Internal server error"}` | Server error |

## 5. Authentication & Authorization
- **Required?** Yes
- **Mechanism:** Confluence session-based authentication
- **Permissions:** 
  - Read operations: `confluence-users`
  - Create/Update operations: `confluence-users`
  - Delete operations: `confluence-administrators`

## 6. Rate Limiting & Security
- **Rate Limits:** Standard Confluence limits apply
- **RLS (Row-Level Security):** No
- **Input Validation:** All UUID and integer parameters validated with explicit casting
- **Other Security Considerations:** SQL injection prevention through parameterized queries

## 7. Business Logic & Side Effects
- **Key Logic:** 
  - Master sequences serve as templates for creating instances
  - Sequences maintain execution order within plans via `sqm_order` field
  - Predecessor relationships create execution dependencies
  - Sequence instances inherit order and properties from master
  - Master sequences cannot be deleted if active instances exist
- **Side Effects:**
  - Creating instances generates phases hierarchically
  - Order changes affect sequence execution flow
  - Status changes may affect dependent phases
- **Idempotency:** PUT operations are idempotent for status and field updates

## 8. Dependencies & Backing Services
- **DB Tables/Entities:** 
  - `sequences_master` - Master sequence templates
  - `sequences_instance` - Sequence instances
  - `plans_master` - Parent plan templates
  - `plans_instance` - Parent plan instances
  - `teams_master` - Team ownership
  - `statuses` - Status lookup
  - `users` - User information
  - `iterations` - Iteration associations
- **External APIs:** None
- **Other Services:** Email notification service for status changes

## 9. Versioning & Deprecation
- **API Version:** v2
- **Deprecation Policy:** 6-month notice for breaking changes

## 10. Testing & Mock Data
- **Unit Tests:** Covered in API integration test suite
- **Integration Tests:** Via PlansApi test coverage (sequences created with plans)
- **E2E Tests:** Via Postman collection
- **Mock Data/Fixtures:** Generated through data generation scripts (001-100)

## 11. Hierarchical Filtering

The Sequences API supports progressive hierarchical filtering:

### Migration Level
```
GET /sequences?migrationId=123e4567-e89b-12d3-a456-426614174000
```
Returns all sequence instances within the specified migration.

### Iteration Level  
```
GET /sequences?iterationId=987fcdeb-51a2-43d1-9c45-123456789abc
```
Returns all sequence instances within the specified iteration.

### Plan Level
```
GET /sequences?planId=456e7890-e89b-12d3-a456-426614174000
```
Returns all sequence instances within the specified plan instance.

### Combined Filtering
```
GET /sequences?migrationId={mig-id}&teamId=1&status=ACTIVE
```
Returns sequence instances matching all specified criteria.

## 12. Ordering and Dependencies

### Sequence Ordering
Sequences within a plan are ordered using the `sqm_order` field:
- Order determines execution sequence within a plan
- Lower numbers execute first (1, 2, 3, ...)
- Order can be updated via `PUT /sequences/master/{id}/order`

### Predecessor Relationships
Sequences can have predecessor dependencies:
- `predecessor_sqm_id` links to another sequence that must complete first
- Creates execution dependency chains
- Prevents parallel execution of dependent sequences

### Example Dependency Chain
```
Sequence 1: Pre-Migration Validation (order: 1, predecessor: null)
Sequence 2: Application Shutdown (order: 2, predecessor: Sequence 1)  
Sequence 3: Data Migration (order: 3, predecessor: Sequence 2)
Sequence 4: Application Startup (order: 4, predecessor: Sequence 3)
```

## 13. Changelog
- **2025-01-15:** Created comprehensive API specification with audit fields and dependency documentation
- **2024-12-15:** Initial implementation of Sequences API v2 with ordering support
- **Author:** Claude AI Assistant (UMIG Documentation Update)

---

> **Note:** This specification reflects the current production state of the Sequences API. All audit fields (created_by, created_at, updated_by, updated_at) are now standardized across all entities per US-002b implementation. The API supports complex dependency management and ordering for sophisticated migration execution control.