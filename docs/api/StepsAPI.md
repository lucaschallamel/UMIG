# Steps API Specification

**Version:** 2.0.0  
**API Version:** v2  
**Last Updated:** August 7, 2025

## Overview

The Steps API provides comprehensive management of step entities within the UMIG (Unified Migration Implementation Guide) system. Steps are the fundamental execution units within migration phases, representing discrete tasks that teams perform during cutover events. The API supports both master step templates and step instances, hierarchical filtering, status management, and integrated notification systems.

## Architecture Overview

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

## Authentication & Authorization

All endpoints require Confluence authentication with group membership:

```groovy
groups: ["confluence-users", "confluence-administrators"]
```

**Required Headers:**

- `Authorization`: Confluence session or basic auth
- `Content-Type`: `application/json` (for POST/PUT requests)

## Base URL Structure

All endpoints are relative to the ScriptRunner custom REST base:

```
{confluence-base-url}/rest/scriptrunner/latest/custom/steps
```

## API Endpoints

### 1. Step Instance Management

#### GET /steps - Get Step Instances with Hierarchical Filtering

Retrieves step instances with optional hierarchical filtering for the runsheet interface. Results are grouped by sequence and phase for frontend consumption.

**Query Parameters:**

- `migrationId` (optional): Filter by migration UUID
- `iterationId` (optional): Filter by iteration UUID
- `planId` (optional): Filter by plan instance UUID
- `sequenceId` (optional): Filter by sequence instance UUID
- `phaseId` (optional): Filter by phase instance UUID
- `teamId` (optional): Filter by team ID
- `labelId` (optional): Filter by label UUID

**Example Request:**

```bash
GET /steps?iterationId=iter-001&teamId=15
```

**Example Response:**

```json
[
  {
    "id": "seq-inst-001",
    "name": "Pre-Migration Sequence",
    "number": 1,
    "phases": [
      {
        "id": "phase-inst-001",
        "name": "Environment Preparation",
        "number": 1,
        "steps": [
          {
            "id": "step-inst-001",
            "code": "ENV-001",
            "name": "Verify database connectivity",
            "status": "COMPLETED",
            "durationMinutes": 30,
            "ownerTeamId": 15,
            "ownerTeamName": "Database Team",
            "labels": [
              {
                "id": "label-001",
                "name": "Critical",
                "color": "#ff0000"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

#### GET /steps/master - Get Master Steps for Dropdowns

Retrieves master step templates formatted for dropdown selections.

**Query Parameters:**

- `migrationId` (optional): Filter by migration UUID

**Example Response:**

```json
[
  {
    "stm_id": "master-step-001",
    "stt_code": "ENV",
    "stm_step_number": 1,
    "stm_title": "Verify database connectivity",
    "stm_description": "Ensure database is accessible and responding",
    "stt_name": "Environment",
    "step_code": "ENV-001",
    "display_name": "ENV-001: Verify database connectivity"
  }
]
```

#### GET /steps/instance/{stepInstanceId} - Get Step Instance Details

Retrieves detailed information for a specific step instance, including associated instructions.

**Parameters:**

- `stepInstanceId`: Step instance UUID or step code (path parameter)

**Example Request:**

```bash
GET /steps/instance/step-inst-001
# OR
GET /steps/instance/ENV-001
```

**Example Response:**

```json
{
  "id": "step-inst-001",
  "code": "ENV-001",
  "name": "Verify database connectivity",
  "description": "Ensure database is accessible and responding",
  "status": "IN_PROGRESS",
  "durationMinutes": 30,
  "estimatedStartTime": "2025-08-07T09:00:00Z",
  "estimatedEndTime": "2025-08-07T09:30:00Z",
  "actualStartTime": "2025-08-07T09:05:00Z",
  "actualEndTime": null,
  "ownerTeamId": 15,
  "ownerTeamName": "Database Team",
  "sequenceId": "seq-inst-001",
  "sequenceName": "Pre-Migration Sequence",
  "sequenceNumber": 1,
  "phaseId": "phase-inst-001",
  "phaseName": "Environment Preparation",
  "phaseNumber": 1,
  "instructions": [
    {
      "id": "inst-inst-001",
      "name": "Test connection string",
      "content": "Run: telnet db-server 1521",
      "order": 1,
      "isCompleted": true
    }
  ],
  "labels": [
    {
      "id": "label-001",
      "name": "Critical",
      "color": "#ff0000"
    }
  ]
}
```

### 2. Step Status Management

#### PUT /steps/{stepInstanceId}/status - Update Step Status

Updates the status of a step instance and sends notifications to relevant stakeholders.

**Request Body:**

```json
{
  "status": "IN_PROGRESS",
  "userId": 1001
}
```

**Valid Status Values:**

- `PENDING` - Step is pending execution
- `TODO` - Step is ready to be executed
- `IN_PROGRESS` - Step is currently being executed
- `COMPLETED` - Step has been completed successfully
- `FAILED` - Step execution failed
- `BLOCKED` - Step is blocked by dependencies
- `CANCELLED` - Step execution was cancelled

**Example Request:**

```bash
PUT /steps/step-inst-001/status
Content-Type: application/json

{
  "status": "COMPLETED",
  "userId": 1001
}
```

**Example Response:**

```json
{
  "success": true,
  "message": "Step status updated successfully",
  "stepInstanceId": "step-inst-001",
  "newStatus": "COMPLETED",
  "emailsSent": 3
}
```

### 3. Step Actions

#### POST /steps/{stepInstanceId}/open - Mark Step as Opened

Marks a step as opened by PILOT and sends notifications to the assigned team.

**Request Body:**

```json
{
  "userId": 1001
}
```

**Example Response:**

```json
{
  "success": true,
  "message": "Step opened successfully",
  "stepInstanceId": "step-inst-001",
  "emailsSent": 2
}
```

#### POST /steps/{stepInstanceId}/instructions/{instructionId}/complete - Complete Instruction

Marks a specific instruction within a step as completed and sends notifications.

**Request Body:**

```json
{
  "userId": 1001
}
```

**Example Response:**

```json
{
  "success": true,
  "message": "Instruction completed successfully",
  "instructionId": "inst-inst-001",
  "stepInstanceId": "step-inst-001",
  "emailsSent": 1
}
```

#### POST /steps/{stepInstanceId}/instructions/{instructionId}/incomplete - Mark Instruction as Incomplete

Reverts an instruction completion status and sends notifications.

**Request Body:**

```json
{
  "userId": 1001
}
```

**Example Response:**

```json
{
  "success": true,
  "message": "Instruction marked as incomplete",
  "emailsSent": 1
}
```

### 4. Status Management

#### GET /statuses/step - Get Step Status Options

Retrieves all available status options for step entities, used for populating status dropdowns with color coding.

**Example Response:**

```json
[
  {
    "sts_id": 1,
    "sts_code": "PENDING",
    "sts_name": "Pending",
    "sts_color": "#ffc107",
    "sts_type": "Step"
  },
  {
    "sts_id": 2,
    "sts_code": "IN_PROGRESS",
    "sts_name": "In Progress",
    "sts_color": "#007bff",
    "sts_type": "Step"
  }
]
```

#### GET /statuses/{type} - Get Status Options by Entity Type

Retrieves status options for any entity type in the system.

**Parameters:**

- `type`: Entity type (e.g., "step", "phase", "sequence")

#### GET /statuses - Get All Status Options

Retrieves all status options across all entity types.

### 5. Comments Management

#### GET /steps/{stepInstanceId}/comments - Get Step Comments

Retrieves all comments associated with a step instance.

**Example Response:**

```json
[
  {
    "id": 1,
    "body": "Database connection verified successfully",
    "userId": 1001,
    "userName": "John Smith",
    "createdAt": "2025-08-07T09:15:00Z",
    "updatedAt": "2025-08-07T09:15:00Z"
  }
]
```

#### POST /steps/{stepInstanceId}/comments - Create Step Comment

Creates a new comment on a step instance.

**Request Body:**

```json
{
  "body": "Encountered timeout issue, retrying connection",
  "userId": 1001
}
```

**Example Response:**

```json
{
  "success": true,
  "commentId": 2,
  "createdAt": "2025-08-07T09:20:00Z"
}
```

#### PUT /comments/{commentId} - Update Comment

Updates an existing comment.

**Request Body:**

```json
{
  "body": "Updated comment text",
  "userId": 1001
}
```

**Example Response:**

```json
{
  "success": true,
  "message": "Comment updated successfully"
}
```

#### DELETE /comments/{commentId} - Delete Comment

Deletes a comment.

**Example Response:**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## Hierarchical Filtering Examples

### Filter by Migration

```bash
GET /steps?migrationId=mig-001
```

### Filter by Iteration and Team

```bash
GET /steps?iterationId=iter-001&teamId=15
```

### Filter by Phase

```bash
GET /steps?phaseId=phase-inst-001
```

### Progressive Filtering

Start broad and narrow down:

```bash
# 1. Get all steps for a migration
GET /steps?migrationId=mig-001

# 2. Focus on specific iteration
GET /steps?iterationId=iter-001

# 3. Drill down to sequence level
GET /steps?sequenceId=seq-inst-001

# 4. Focus on specific team
GET /steps?sequenceId=seq-inst-001&teamId=15
```

## Error Handling

### HTTP Status Codes

- **200 OK**: Successful operation
- **201 Created**: Resource created successfully
- **204 No Content**: Successful deletion (no response body)
- **400 Bad Request**: Invalid input, UUID format, or SQL constraint violation (23503)
- **404 Not Found**: Step instance, instruction, or comment not found
- **409 Conflict**: Duplicate entry or unique constraint violation (23505)
- **500 Internal Server Error**: Unexpected server error

### Error Response Format

```json
{
  "error": "Invalid step instance ID format"
}
```

### Common Error Scenarios

#### 1. Invalid UUID Format (400)

```json
{
  "error": "Invalid step instance ID format"
}
```

#### 2. Step Not Found (404)

```json
{
  "error": "Step instance not found for ID: step-inst-999"
}
```

#### 3. Invalid Status (400)

```json
{
  "error": "Invalid status. Must be one of: PENDING, TODO, IN_PROGRESS, COMPLETED, FAILED, BLOCKED, CANCELLED"
}
```

#### 4. Missing Required Field (400)

```json
{
  "error": "Missing required field: status"
}
```

## Integration with Other APIs

### Related APIs

- **Instructions API**: Step instances contain instruction instances
- **Teams API**: Steps are assigned to teams via ownerTeamId
- **Labels API**: Steps can have multiple labels attached
- **Phases API**: Steps exist within phase instances
- **Plans API**: Hierarchical filtering includes plan instances

### Cross-API Workflows

#### Complete Step Workflow

1. GET step instance details: `/steps/instance/{stepInstanceId}`
2. Mark instructions complete: `POST /steps/{stepInstanceId}/instructions/{instructionId}/complete`
3. Update step status: `PUT /steps/{stepInstanceId}/status`
4. Add completion comment: `POST /steps/{stepInstanceId}/comments`

#### Runsheet Display Workflow

1. GET filtered steps: `/steps?iterationId={id}&teamId={id}`
2. Display grouped by sequence/phase structure
3. Show step status with color coding from `/statuses/step`
4. Allow status updates and instruction completion

## Integration Examples

### Frontend Integration (JavaScript)

```javascript
class StepsAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async getStepsForRunsheet(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${this.baseUrl}/steps?${params}`);
    return response.json();
  }

  async getStepDetails(stepInstanceId) {
    const response = await fetch(
      `${this.baseUrl}/steps/instance/${stepInstanceId}`,
    );
    return response.json();
  }

  async updateStepStatus(stepInstanceId, status, userId) {
    const response = await fetch(
      `${this.baseUrl}/steps/${stepInstanceId}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, userId }),
      },
    );
    return response.json();
  }

  async openStep(stepInstanceId, userId) {
    const response = await fetch(
      `${this.baseUrl}/steps/${stepInstanceId}/open`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      },
    );
    return response.json();
  }

  async completeInstruction(stepInstanceId, instructionId, userId) {
    const response = await fetch(
      `${this.baseUrl}/steps/${stepInstanceId}/instructions/${instructionId}/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      },
    );
    return response.json();
  }

  async getMasterSteps(migrationId = null) {
    const params = migrationId ? `?migrationId=${migrationId}` : "";
    const response = await fetch(`${this.baseUrl}/steps/master${params}`);
    return response.json();
  }

  async getStepStatuses() {
    const response = await fetch(`${this.baseUrl}/statuses/step`);
    return response.json();
  }

  async getComments(stepInstanceId) {
    const response = await fetch(
      `${this.baseUrl}/steps/${stepInstanceId}/comments`,
    );
    return response.json();
  }

  async createComment(stepInstanceId, body, userId) {
    const response = await fetch(
      `${this.baseUrl}/steps/${stepInstanceId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, userId }),
      },
    );
    return response.json();
  }
}

// Usage
const api = new StepsAPI("/rest/scriptrunner/latest/custom");

// Get steps for runsheet
const steps = await api.getStepsForRunsheet({
  iterationId: "iter-001",
  teamId: 15,
});

// Update step status
await api.updateStepStatus("step-inst-001", "COMPLETED", 1001);

// Complete instruction
await api.completeInstruction("step-inst-001", "inst-inst-001", 1001);

// Get master steps for dropdown
const masterSteps = await api.getMasterSteps("mig-001");
```

### Groovy Integration (Backend)

```groovy
// Example service layer usage
@Service
class StepService {

    StepRepository stepRepository = new StepRepository()

    def completeStepWithNotifications(UUID stepInstanceId, Integer userId) {
        // Update step status to completed
        def statusResult = stepRepository.updateStepInstanceStatusWithNotification(
            stepInstanceId, 'COMPLETED', userId
        )

        if (statusResult.success) {
            // Get step details for logging
            def stepDetails = stepRepository.findStepInstanceDetailsById(stepInstanceId)

            log.info("Step completed: ${stepDetails.name} by user ${userId}")

            return [
                success: true,
                message: "Step completed successfully",
                emailsSent: statusResult.emailsSent
            ]
        }

        return statusResult
    }

    def getRunsheetData(Map filters) {
        return stepRepository.findFilteredStepInstances(filters)
    }
}
```

## Best Practices

### 1. Performance Optimization

**Use Hierarchical Filtering:**

```javascript
// ✅ Good: Filter at the appropriate level
GET /steps?phaseId=phase-001

// ❌ Avoid: Over-fetching then filtering client-side
GET /steps // then filter locally
```

**Batch Status Updates:**

```javascript
// ✅ Good: Update multiple steps efficiently
await Promise.all([
  api.updateStepStatus("step-1", "COMPLETED", userId),
  api.updateStepStatus("step-2", "COMPLETED", userId),
]);

// ❌ Avoid: Sequential updates
for (const step of steps) {
  await api.updateStepStatus(step.id, "COMPLETED", userId);
}
```

### 2. Error Handling

**Implement Proper Error Handling:**

```javascript
try {
  await api.updateStepStatus(stepId, "COMPLETED", userId);
} catch (error) {
  if (error.status === 404) {
    console.error("Step not found:", stepId);
  } else if (error.status === 400) {
    console.error("Invalid status or request:", error.message);
  }
}
```

### 3. State Management

**Track Step Status Changes:**

```javascript
// Monitor step progress in runsheet
const steps = await api.getStepsForRunsheet({ iterationId: "iter-001" });
const completedSteps = steps
  .flatMap((seq) => seq.phases.flatMap((phase) => phase.steps))
  .filter((step) => step.status === "COMPLETED");

const progress = (completedSteps.length / totalSteps) * 100;
```

### 4. Notification Management

**Handle Notification Results:**

```javascript
const result = await api.updateStepStatus(stepId, "COMPLETED", userId);
if (result.emailsSent > 0) {
  console.log(
    `Status update notifications sent to ${result.emailsSent} recipients`,
  );
}
```

## Business Logic & Side Effects

### Key Logic

- **Hierarchical Filtering**: Uses instance→master table relationships for progressive filtering
- **Status Management**: Status changes trigger email notifications to stakeholders
- **Instruction Integration**: Step instances contain instruction instances that can be managed independently
- **Label Support**: Steps can have multiple labels for categorization and filtering
- **Team Assignment**: Steps are assigned to teams via ownerTeamId relationship

### Side Effects

- **Status Updates**: Trigger email notifications via EmailService
- **Step Opening**: Sends notifications to assigned team members
- **Instruction Completion**: Triggers notifications and updates step completion progress
- **Comment Creation**: Creates audit trail for step execution

### Idempotency

- **GET Operations**: Fully idempotent
- **PUT Status Updates**: Idempotent (repeated status updates with same value are safe)
- **POST Actions**: Not idempotent (repeated opens/completions may send duplicate notifications)

## Dependencies & Backing Services

### Database Tables/Entities

- **Primary Tables**:
  - `steps_master_stm` (step templates)
  - `steps_instance_sti` (step execution instances)
  - `instructions_master_inm` & `instructions_instance_ini` (instruction relationships)
  - `comments_com` (step comments)
- **Reference Tables**:
  - `teams_tms` (team assignments)
  - `labels_lab` (step labeling)
  - `status_sts` (status options)
- **Hierarchy Tables**:
  - `phases_master_phm` & `phases_instance_phi`
  - `sequences_master_sqm` & `sequences_instance_sqi`
  - `plans_master_plm` & `plans_instance_pli`
  - `iterations_ite` & `migrations_mig`

### External Services

- **EmailService**: For status change and action notifications
- **DatabaseUtil**: For connection management and transaction handling
- **UserRepository**: For user validation and lookup
- **StatusRepository**: For dynamic status management

## Testing & Mock Data

### Unit Testing

```groovy
class StepRepositoryTest {
    @Test
    void testFindStepInstanceDetailsById() {
        def stepId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000")
        def result = stepRepository.findStepInstanceDetailsById(stepId)

        assert result != null
        assert result.name == "Test Step"
        assert result.instructions != null
    }
}
```

### Integration Testing

```bash
# Test complete workflow
curl -X GET "/steps?iterationId=iter-001&teamId=15"

curl -X GET "/steps/instance/step-inst-001"

curl -X PUT "/steps/step-inst-001/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS", "userId": 1001}'

curl -X POST "/steps/step-inst-001/open" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1001}'
```

### Mock Data

- Synthetic data via data generators (001-100)
- Realistic step templates and instances
- Test data includes full hierarchy relationships
- Comment and label test data

## Performance Considerations

### Query Optimization

- Step instances are typically queried by hierarchy filters (indexed)
- Large runsheet queries may require pagination
- Label fetching is optimized with batch queries

### Caching Strategy

- Master steps can be cached (low change frequency)
- Status options are cached globally
- Step instance data requires real-time updates

### Scalability Notes

- API supports filtering to reduce payload sizes
- Grouped response format optimizes frontend rendering
- Notification system handles bulk operations efficiently

## Security Notes

### Authentication & Authorization

- All endpoints require Confluence group membership
- User IDs are validated against active Confluence users
- Row-level security through team assignments

### Input Validation

- UUID format validation for all ID parameters
- Status value validation against allowed values
- Comment content sanitization

### SQL Security

- Parameterized queries prevent SQL injection
- Type safety with explicit casting (ADR-031)
- Database connection pooling with proper cleanup

## Versioning & Deprecation

- **API Version**: V2 (current)
- **Backward Compatibility**: Supports step code lookups for legacy compatibility
- **Deprecation Policy**: Follow project deprecation guidelines
- **Breaking Changes**: Status value changes require careful migration

## Changelog

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
