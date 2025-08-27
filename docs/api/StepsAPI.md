# Steps API Specification

## 1. API Overview

- **API Name:** Steps API v2.2.0
- **Purpose:** Comprehensive management of step entities within the UMIG (Unified Migration Implementation Guide) system. Steps are the fundamental execution units within migration phases, representing discrete tasks that teams perform during cutover events. The API supports both master step templates and step instances, hierarchical filtering, status management, and integrated notification systems.
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-026 (SQL Query Mocking), ADR-030 (Hierarchical Filtering), ADR-031 (Type Safety), ADR-037 (Integration Testing Framework), ADR-038 (Quality Assurance Standards), ADR-039 (Notification Service Integration), ADR-040 (System Performance Benchmarking)

### Architecture Overview

The Steps API follows UMIG's established patterns:

- **Repository Pattern**: All data access through `StepRepository` with comprehensive methods
- **Type Safety**: Explicit casting for all query parameters (ADR-031)
- **Hierarchical Filtering**: Support for migration, iteration, plan, sequence, and phase-level filtering (ADR-030)
- **Master/Instance Model**: Template-based approach with execution instances
- **Error Handling**: SQL state mapping (23503→400, 23505→409)
- **Notification Integration**: Email notifications for status changes and step actions

### Entity Relationships

```
Migration → Iteration → Plan Instance → Sequence Instance → Phase Instance → Step Instance
                                                                                 ↑
Step Master ─────────────────────────────────────────────────────────────────┘
     ↑
Instruction Master → Instruction Instance (attached to Step Instance)
```

### Base URL Structure

All endpoints are relative to the ScriptRunner custom REST base:

```
{confluence-base-url}/rest/scriptrunner/latest/custom/steps
```

## 2. Endpoints

| Method | Path                                                            | Description                                    |
| ------ | --------------------------------------------------------------- | ---------------------------------------------- |
| GET    | /steps                                                          | Get Step Instances with Hierarchical Filtering |
| GET    | /steps/master                                                   | Get Master Steps with Admin GUI Support        |
| GET    | /steps/master/{id}                                              | Get Single Master Step                         |
| POST   | /steps/master                                                   | Create New Master Step                         |
| PUT    | /steps/master/{id}                                              | Update Existing Master Step                    |
| GET    | /steps/instance/{stepInstanceId}                                | Get Step Instance Details                      |
| GET    | /steps/summary                                                  | Get Dashboard Summary Metrics                  |
| GET    | /steps/progress                                                 | Get Progress Tracking Data                     |
| GET    | /steps/export                                                   | Export Steps Data                              |
| PUT    | /steps/{stepInstanceId}/status                                  | Update Step Status                             |
| PUT    | /steps/bulk/status                                              | Bulk Status Updates                            |
| PUT    | /steps/bulk/assign                                              | Bulk Team Assignments                          |
| PUT    | /steps/bulk/reorder                                             | Bulk Step Reordering                           |
| POST   | /steps/{stepInstanceId}/open                                    | Mark Step as Opened                            |
| POST   | /steps/{stepInstanceId}/instructions/{instructionId}/complete   | Complete Instruction                           |
| POST   | /steps/{stepInstanceId}/instructions/{instructionId}/incomplete | Mark Instruction as Incomplete                 |
| GET    | /statuses/step                                                  | Get Step Status Options                        |
| GET    | /statuses/{type}                                                | Get Status Options by Entity Type              |
| GET    | /statuses                                                       | Get All Status Options                         |
| GET    | /steps/{stepInstanceId}/comments                                | Get Step Comments                              |
| POST   | /steps/{stepInstanceId}/comments                                | Create Step Comment                            |
| PUT    | /comments/{commentId}                                           | Update Comment                                 |
| DELETE | /comments/{commentId}                                           | Delete Comment                                 |

## 3. Request Details

### 3.1. Path Parameters

| Name           | Type        | Required | Description                     |
| -------------- | ----------- | -------- | ------------------------------- |
| stepInstanceId | UUID/String | Yes      | Step instance UUID or step code |
| id             | UUID        | Yes      | Master step UUID                |
| instructionId  | UUID        | Yes      | Instruction instance UUID       |
| commentId      | Integer     | Yes      | Comment ID                      |
| type           | String      | Yes      | Entity type for status queries  |

### 3.2. Query Parameters

| Name        | Type    | Required | Description                                      |
| ----------- | ------- | -------- | ------------------------------------------------ |
| migrationId | UUID    | No       | Filter by migration UUID                         |
| iterationId | UUID    | No       | Filter by iteration UUID                         |
| planId      | UUID    | No       | Filter by plan instance UUID                     |
| sequenceId  | UUID    | No       | Filter by sequence instance UUID                 |
| phaseId     | UUID    | No       | Filter by phase instance UUID                    |
| teamId      | Integer | No       | Filter by team ID                                |
| labelId     | UUID    | No       | Filter by label UUID                             |
| page        | Integer | No       | Page number for pagination (default: 1)          |
| size        | Integer | No       | Number of items per page (default: 50)           |
| sort        | String  | No       | Field to sort by                                 |
| direction   | String  | No       | Sort direction (asc/desc, default: asc)          |
| format      | String  | No       | Export format ("json" or "csv", default: "json") |

### 3.3. Request Body

#### Status Update Request

- **Content-Type:** application/json
- **Schema:**

```json
{
  "statusId": "integer (preferred)",
  "status": "string (legacy support)",
  "userId": "integer (required)"
}
```

#### Bulk Operations Request

- **Content-Type:** application/json
- **Schema:**

```json
{
  "stepIds": ["array of UUIDs"],
  "statusId": "integer (for status updates)",
  "teamId": "integer (for assignments)",
  "userId": "integer (required)"
}
```

#### Master Step Create Request

- **Content-Type:** application/json
- **Schema:**

```json
{
  "phm_id": "string (UUID, required)",
  "tms_id_owner": "integer (required)",
  "stt_code": "string (required)",
  "stm_number": "integer (required)",
  "stm_name": "string (required)",
  "stm_description": "string (optional)",
  "stm_duration_minutes": "integer (optional)",
  "enr_id_target": "integer (required)",
  "enr_id": "integer (optional)",
  "stm_id_predecessor": "string (UUID, optional)"
}
```

#### Master Step Update Request

- **Content-Type:** application/json
- **Schema:**

```json
{
  "phm_id": "string (UUID, optional)",
  "tms_id_owner": "integer (optional)",
  "stt_code": "string (optional)",
  "stm_number": "integer (optional)",
  "stm_name": "string (optional)",
  "stm_description": "string (optional)",
  "stm_duration_minutes": "integer (optional)",
  "enr_id_target": "integer (optional)",
  "enr_id": "integer (optional)",
  "stm_id_predecessor": "string (UUID, optional)"
}
```

#### Comment Request

- **Content-Type:** application/json
- **Schema:**

```json
{
  "body": "string (required)",
  "userId": "integer (required)"
}
```

## 4. Response Details

### 4.1. Success Response

#### Hierarchical Step Instances (GET /steps)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "id": "string",
    "name": "string",
    "number": "integer",
    "phases": [
      {
        "id": "string",
        "name": "string",
        "number": "integer",
        "steps": [
          {
            "id": "string",
            "code": "string",
            "name": "string",
            "status": "string",
            "durationMinutes": "integer",
            "ownerTeamId": "integer",
            "ownerTeamName": "string",
            "labels": ["array of label objects"]
          }
        ]
      }
    ]
  }
]
```

#### Paginated Master Steps (GET /steps/master)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "content": ["array of master step objects"],
  "totalElements": "integer",
  "totalPages": "integer",
  "pageNumber": "integer",
  "pageSize": "integer",
  "hasNext": "boolean",
  "hasPrevious": "boolean"
}
```

#### Master Step Response (Create/Update)

- **Status Code:** 201 Created (for POST), 200 OK (for PUT)
- **Content-Type:** application/json
- **Schema:**

```json
{
  "stm_id": "string (UUID)",
  "phm_id": "string (UUID)",
  "tms_id_owner": "integer",
  "stt_code": "string",
  "stm_number": "integer",
  "stm_name": "string",
  "stm_description": "string",
  "stm_duration_minutes": "integer",
  "enr_id_target": "integer",
  "enr_id": "integer",
  "stm_id_predecessor": "string (UUID)",
  "created_by": "string",
  "created_at": "string (ISO datetime)",
  "updated_by": "string",
  "updated_at": "string (ISO datetime)",
  "phm_name": "string",
  "sqm_name": "string",
  "plm_name": "string",
  "owner_team_name": "string",
  "instruction_count": "integer",
  "instance_count": "integer"
}
```

#### Status Update Response

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "success": "boolean",
  "message": "string",
  "stepInstanceId": "string",
  "newStatus": "string",
  "emailsSent": "integer"
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema              | Example                                                                                                                                                     | Description                                                   |
| ----------- | ---------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 400         | application/json | {"error": "string"} | {"error": "Invalid step ID format"}, {"error": "Missing required fields: phm_id, tms_id_owner, stt_code, stm_number, stm_name, enr_id_target are required"} | Invalid UUID format, missing required fields                  |
| 404         | application/json | {"error": "string"} | {"error": "Step instance not found for ID: {id}"}, {"error": "Step not found with ID: {stepId}"}                                                            | Step instance, master step, instruction, or comment not found |
| 409         | application/json | {"error": "string"} | {"error": "Duplicate entry"}, {"error": "A step with the same phase, type, and number already exists"}                                                      | Unique constraint violation (23505)                           |
| 500         | application/json | {"error": "string"} | {"error": "Failed to retrieve master step: {error_message}"}, {"error": "An unexpected error occurred"}                                                     | Database or server errors                                     |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (groups: ["confluence-users", "confluence-administrators"])
- **Permissions:** User must be member of confluence-users or confluence-administrators group
- **Required Headers:**
  - `Authorization`: Confluence session or basic auth
  - `Content-Type`: `application/json` (for POST/PUT requests)

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** Implemented through team assignments and Confluence group membership
- **Input Validation:**
  - UUID format validation for all ID parameters
  - Status value validation against allowed values
  - Comment content sanitization
  - Type casting validation (ADR-031)
  - SQL injection prevented via parameterized queries
- **Other Security Considerations:**
  - User IDs validated against active Confluence users
  - Email notifications only sent to authorized stakeholders
  - Database connection pooling with proper cleanup

## 7. Business Logic & Side Effects

- **Key Logic:**
  - **Hierarchical Filtering**: Uses instance→master table relationships for progressive filtering
  - **Status Management**: Status changes trigger email notifications to stakeholders
  - **Instruction Integration**: Step instances contain instruction instances that can be managed independently
  - **Label Support**: Steps can have multiple labels for categorization and filtering
  - **Team Assignment**: Steps are assigned to teams via ownerTeamId relationship

- **Side Effects:**
  - **Status Updates**: Trigger email notifications via EmailService
  - **Step Opening**: Sends notifications to assigned team members
  - **Instruction Completion**: Triggers notifications and updates step completion progress
  - **Comment Creation**: Creates audit trail for step execution

- **Idempotency:**
  - **GET Operations**: Fully idempotent
  - **PUT Status Updates**: Idempotent (repeated status updates with same value are safe)
  - **POST Actions**: Not idempotent (repeated opens/completions may send duplicate notifications)

## 8. Dependencies & Backing Services

### Database Tables/Entities

- **Primary Tables:**
  - `steps_master_stm` (step templates)
  - `steps_instance_sti` (step execution instances)
  - `instructions_master_inm` & `instructions_instance_ini` (instruction relationships)
  - `comments_com` (step comments)

- **Reference Tables:**
  - `teams_tms` (team assignments)
  - `labels_lab` (step labeling)
  - `status_sts` (status options)

- **Hierarchy Tables:**
  - `phases_master_phm` & `phases_instance_phi`
  - `sequences_master_sqm` & `sequences_instance_sqi`
  - `plans_master_plm` & `plans_instance_pli`
  - `iterations_ite` & `migrations_mig`

### External Services

- **EmailService**: For status change and action notifications
- **DatabaseUtil**: For connection management and transaction handling
- **UserRepository**: For user validation and lookup
- **StatusRepository**: For dynamic status management

## 9. Versioning & Deprecation

- **API Version**: V2 (current version 2.2.0)
- **Backward Compatibility**: Supports step code lookups for legacy compatibility
- **Deprecation Policy**: Breaking changes will require version increment following project deprecation guidelines
- **Breaking Changes**: Status value changes require careful migration

## 10. Testing & Mock Data

- **Unit Tests:** Repository tests cover data access operations (`StepRepositoryTest`)
- **Integration Tests:** Full CRUD operations tested in integration test suite via npm commands
- **E2E Tests:** Tested via Admin GUI and comprehensive API endpoint validation
- **Mock Data/Fixtures:**
  - Available via `npm run generate-data:erase`
  - Synthetic data via data generators (001-100)
  - Realistic step templates and instances with full hierarchy relationships
  - Comment and label test data

## 11. Business Logic & Validation Rules

### Step Status Updates

- Valid status values: PENDING, TODO, IN_PROGRESS, COMPLETED, FAILED, BLOCKED, CANCELLED
- Status changes trigger email notifications to assigned team members
- Status updates require valid userId for audit trail
- Supports both statusId (preferred) and legacy status string formats

### Step Instance Management

- Step instances inherit properties from master step templates
- Step instances are bound to specific phase instances within the hierarchy
- Each step instance can have multiple instructions and comments
- Label assignments support multiple labels per step for categorization

### Bulk Operations

- Bulk status updates process multiple steps atomically where possible
- Failed individual operations within bulk requests are reported separately
- Bulk operations maintain audit trail with user attribution
- Team assignments validate team existence before assignment

### Hierarchical Filtering

- Filtering respects the migration hierarchy (Migration → Iteration → Plan → Sequence → Phase → Step)
- Multiple filter criteria are combined with AND logic
- Instance IDs are preferred over master IDs for filtering
- All referenced fields must be included in SELECT queries for result mapping

### Comment Management

- Comments use RESTful sub-resource pattern: `/steps/{stepInstanceId}/comments`
- Direct comment operations available at `/comments/{id}` for efficiency
- Comment creation and updates require user authentication
- Enhanced error handling provides usage guidance for incorrect endpoint patterns

## 12. Examples

### Get Steps for Runsheet Display

```bash
curl -X GET "/rest/scriptrunner/latest/custom/steps?iterationId=iter-001&teamId=15" \
  -H "Authorization: Basic [credentials]"
```

### Update Step Status

```bash
curl -X PUT "/rest/scriptrunner/latest/custom/steps/step-inst-001/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic [credentials]" \
  -d '{"statusId": 2, "userId": 1001}'
```

### Complete Instruction

```bash
curl -X POST "/rest/scriptrunner/latest/custom/steps/step-inst-001/instructions/inst-inst-001/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic [credentials]" \
  -d '{"userId": 1001}'
```

### Create Step Comment

```bash
curl -X POST "/rest/scriptrunner/latest/custom/steps/step-inst-001/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic [credentials]" \
  -d '{"body": "Database connection verified successfully", "userId": 1001}'
```

### Bulk Status Update

```bash
curl -X PUT "/rest/scriptrunner/latest/custom/steps/bulk/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic [credentials]" \
  -d '{"stepIds": ["step-inst-001", "step-inst-002"], "statusId": 3, "userId": 1001}'
```

### Export Steps Data

```bash
curl -X GET "/rest/scriptrunner/latest/custom/steps/export?migrationId=mig-001&format=csv" \
  -H "Authorization: Basic [credentials]"
```

### Create Master Step

```bash
curl -X POST "/rest/scriptrunner/latest/custom/steps/master" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic [credentials]" \
  -d '{
    "phm_id": "f9aa535d-4d8b-447c-9d89-16494f678702",
    "tms_id_owner": 15,
    "stt_code": "APP",
    "stm_number": 101,
    "stm_name": "Deploy Application Components",
    "stm_description": "Deploy all application components to target environment",
    "stm_duration_minutes": 45,
    "enr_id_target": 3
  }'
```

### Update Master Step

```bash
curl -X PUT "/rest/scriptrunner/latest/custom/steps/master/f9aa535d-4d8b-447c-9d89-16494f678702" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic [credentials]" \
  -d '{
    "stm_name": "Deploy Application Components - Updated",
    "stm_description": "Deploy and validate all application components to target environment",
    "stm_duration_minutes": 60,
    "tms_id_owner": 18
  }'
```

## 13. Notes

- **Performance Optimization**: Use hierarchical filtering to reduce payload sizes. Filter at appropriate hierarchy level rather than over-fetching.
- **Notification Management**: Status updates and step actions trigger email notifications. Monitor emailsSent counts in responses.
- **Frontend Integration**: Grouped response format optimizes frontend rendering for runsheet displays.
- **Caching Strategy**: Master steps and status options can be cached due to low change frequency. Step instance data requires real-time updates.
- **Error Handling**: Enhanced error messages provide specific usage instructions for incorrect endpoint patterns, particularly for comments endpoints.
- **State Management**: Track step progress using summary and progress endpoints for dashboard displays.

## 14. Related APIs

- **Instructions API**: Step instances contain instruction instances that can be managed through Steps API or directly through Instructions API
- **Teams API**: Steps are assigned to teams via ownerTeamId field, team information retrieved through Teams API
- **Labels API**: Steps can have multiple labels attached, label data managed through Labels API
- **Phases API**: Steps exist within phase instances, phase hierarchy accessed through Phases API
- **Plans API**: Hierarchical filtering includes plan instances accessed through Plans API
- **Sequences API**: Steps are organized within sequences, sequence data available through Sequences API
- **Status API**: Dynamic status management with color coding accessed through embedded status endpoints

## 15. Change Log

### Version 2.3.0 (August 27, 2025 - Master Steps Management)

- **Master Steps CRUD Operations**: Added POST `/steps/master` endpoint for creating new master step templates
- **Master Steps Updates**: Added PUT `/steps/master/{id}` endpoint for updating existing master step templates
- **Admin GUI Integration**: New endpoints support full CREATE and EDIT functionality for Master Steps in Admin GUI
- **Comprehensive Validation**: Required fields validation with specific error messages for foreign key violations
- **Audit Trail Support**: Automatic audit field handling (created_by, updated_by, timestamps)
- **SQL State Error Mapping**: Enhanced error responses with specific messages for common database constraint violations
- **Response Structure**: Complete master step details with computed fields (instruction_count, instance_count)
- **Hierarchical Context**: Response includes phase, sequence, and plan names for full hierarchical context

### Version 2.2.0 (August 25, 2025 - US-031)

- **Added Bulk Operations**: New bulk endpoints for status updates, team assignments, and step reordering
- **Enhanced Admin GUI Support**: Master steps endpoint now supports pagination, filtering, and sorting
- **Dashboard Metrics**: Added `/steps/summary` endpoint for dashboard summary metrics
- **Progress Tracking**: Added `/steps/progress` endpoint for detailed progress tracking
- **Export Functionality**: Added `/steps/export` endpoint with JSON and CSV support
- **Modern Status Management**: Enhanced status handling with database-validated `statusId` field and legacy `status` support
- **UserService Integration**: Improved user context handling with intelligent fallback mechanisms
- **Enhanced Error Handling**: More sophisticated error responses with context and SQL state mapping
- **Performance Improvements**: Added enhanced method with pagination support and filtering optimizations

### Version 2.1.1 (August 14, 2025 - US-024)

- **Enhanced Comments Error Handling**: Comments endpoints now return helpful error messages instead of generic responses
- **Improved User Guidance**: Error responses include specific usage instructions and practical examples
- **RESTful Pattern Documentation**: Clear documentation of the sub-resource pattern for comments (`/steps/{id}/comments`)
- **Enhanced API Usability**: Direct comment operations (`/comments/{id}`) documented with usage guidance
- **Backward Compatibility Maintained**: All existing functionality preserved while improving user experience

### Version 2.1.0 (August 7, 2025)

- Enhanced step instance details endpoint with instruction integration
- Added support for step code lookup (backward compatibility)
- Improved error handling for invalid step references
- Added comprehensive label support in filtered results

### Version 2.0.0 (July 15, 2025)

- Complete Steps API implementation with hierarchical filtering
- Integrated notification system for status changes and actions
- Added instruction completion endpoints within step context
- Implemented comprehensive comments management
- Added dynamic status management with color coding
- Enhanced error handling with SQL state mapping

### Version 1.0.0 (June 1, 2025)

- Initial Steps API implementation
- Basic CRUD operations for step instances
- Master step template management
- Simple filtering capabilities

---

> **Note:** This specification should be updated whenever the API changes. Reference this document in code reviews, integration planning, and frontend development. For implementation details, see `/src/groovy/umig/api/v2/StepsApi.groovy` and `/src/groovy/umig/repository/StepRepository.groovy`.
