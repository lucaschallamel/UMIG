# Instructions API Developer Guide

**Version:** 1.0.0  
**API Version:** v2  
**Last Updated:** August 5, 2025

## Overview

The Instructions API provides comprehensive management of instruction templates and instances within the UMIG (Unified Migration Implementation Guide) system. Instructions are detailed procedural steps within migration phases that teams execute during cutover events.

## Architecture Overview

The Instructions API follows UMIG's established patterns:

- **Repository Pattern**: All data access through `InstructionRepository` with 19 methods
- **Type Safety**: Explicit casting for all query parameters (ADR-031)
- **Hierarchical Filtering**: Support for step, plan, sequence, and phase-level filtering (ADR-030)
- **Master/Instance Model**: Template-based approach with execution instances
- **Error Handling**: SQL state mapping (23503→400, 23505→409)

### Entity Relationships

```
Migration → Iteration → Plan Instance → Sequence Instance → Phase Instance → Step Instance → Instruction Instance
                                                                                              ↑
Step Master → Instruction Master ──────────────────────────────────────────────────────────┘
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
{confluence-base-url}/rest/scriptrunner/latest/custom/instructions
```

## API Endpoints

### 1. Master Instructions Management

#### GET /instructions - Get Master Instructions with Filtering

Retrieves master instruction templates with optional hierarchical filtering.

**Parameters:**
- `stepId` (optional): Filter by step master UUID
- `planId` (optional): Filter by plan instance UUID  
- `sequenceId` (optional): Filter by sequence instance UUID
- `phaseId` (optional): Filter by phase instance UUID

**Example Request:**
```bash
GET /instructions?stepId=123e4567-e89b-12d3-a456-426614174000
```

**Example Response:**
```json
[
  {
    "id": "789e0123-e89b-12d3-a456-426614174001",
    "stepMasterId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Verify database connection",
    "description": "Ensure database connectivity before migration",
    "content": "1. Test connection string\n2. Verify credentials\n3. Check network connectivity",
    "instructionOrder": 1,
    "teamId": 42,
    "teamName": "Database Team",
    "controlId": "abc12345-e89b-12d3-a456-426614174002",
    "controlName": "DB_CONNECTIVITY_CHECK",
    "createdAt": "2025-01-20T10:30:00Z",
    "createdBy": 1001,
    "updatedAt": "2025-01-22T14:15:00Z",
    "updatedBy": 1002
  }
]
```

#### POST /instructions/master - Create Master Instruction

Creates a new master instruction template.

**Request Body:**
```json
{
  "stepMasterId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Deploy application code",
  "description": "Deploy the latest application version",
  "content": "1. Stop application services\n2. Deploy new code\n3. Run database migrations\n4. Start services\n5. Verify deployment",
  "instructionOrder": 3,
  "teamId": 15,
  "controlId": "def67890-e89b-12d3-a456-426614174003",
  "createdBy": 1001
}
```

**Response (201 Created):**
```json
{
  "id": "new12345-e89b-12d3-a456-426614174004",
  "stepMasterId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Deploy application code",
  "description": "Deploy the latest application version",
  "content": "1. Stop application services\n2. Deploy new code\n3. Run database migrations\n4. Start services\n5. Verify deployment",
  "instructionOrder": 3,
  "teamId": 15,
  "teamName": "DevOps Team",
  "controlId": "def67890-e89b-12d3-a456-426614174003",
  "controlName": "DEPLOYMENT_CONTROL",
  "createdAt": "2025-08-05T09:45:00Z",
  "createdBy": 1001,
  "updatedAt": "2025-08-05T09:45:00Z",
  "updatedBy": null
}
```

#### GET /instructions/master/{instructionId} - Get Master Instruction

Retrieves a specific master instruction by ID.

**Parameters:**
- `instructionId`: Master instruction UUID (path parameter)

**Response (200 OK):** Single master instruction object (same format as above)

#### PUT /instructions/master/{instructionId} - Update Master Instruction

Updates an existing master instruction template.

**Request Body:** (all fields optional)
```json
{
  "name": "Updated instruction name",
  "description": "Updated description",
  "content": "Updated content with new steps",
  "instructionOrder": 5,
  "teamId": 20,
  "controlId": "updated-control-id",
  "updatedBy": 1002
}
```

#### DELETE /instructions/master/{instructionId} - Delete Master Instruction

Deletes a master instruction and all its instances (cascade deletion).

**Parameters:**
- `instructionId`: Master instruction UUID (path parameter)

**Response (204 No Content):** No response body

**Error Responses:**
- **400 Bad Request**: Foreign key constraint violation
- **404 Not Found**: Master instruction not found

**Example Request:**
```bash
DELETE /instructions/master/789e0123-e89b-12d3-a456-426614174001
```

#### POST /instructions/master/{stepId}/reorder - Reorder Instructions

Updates the order of master instructions within a step.

**Request Body:**
```json
{
  "orderData": [
    {"instructionId": "inst-1", "order": 1},
    {"instructionId": "inst-2", "order": 2},
    {"instructionId": "inst-3", "order": 3}
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Instructions reordered successfully",
  "updatedCount": 3
}
```

### 2. Instruction Instances Management

#### GET /instructions/instance/{stepInstanceId} - Get Instruction Instances

Retrieves all instruction instances for a specific step instance.

**Parameters:**
- `stepInstanceId`: Step instance UUID (path parameter)

**Example Response:**
```json
[
  {
    "id": "inst-instance-1",
    "name": "Verify database connection",
    "description": "Ensure database connectivity before migration",
    "content": "1. Test connection string\n2. Verify credentials\n3. Check network connectivity",
    "status": "COMPLETED",
    "number": 1,
    "isCompleted": true
  },
  {
    "id": "inst-instance-2", 
    "name": "Deploy application code",
    "description": "Deploy the latest application version",
    "content": "1. Stop application services\n2. Deploy new code\n3. Run database migrations\n4. Start services\n5. Verify deployment",
    "status": "IN_PROGRESS",
    "number": 2,
    "isCompleted": false
  }
]
```

#### POST /instructions/instance/{stepInstanceId} - Create Instruction Instances

Creates instruction instances from master templates for a step instance.

**Request Body:**
```json
{
  "masterInstructionIds": [
    "master-1",
    "master-2", 
    "master-3"
  ]
}
```

**Response (201 Created):** Array of created instruction instances

#### GET /instructions/instance/{instructionInstanceId} - Get Instruction Instance

Retrieves a specific instruction instance by ID.

**Response (200 OK):** Single instruction instance object

#### DELETE /instructions/instance/{instructionInstanceId} - Delete Instruction Instance

Deletes a specific instruction instance.

**Parameters:**
- `instructionInstanceId`: Instruction instance UUID (path parameter)

**Response (204 No Content):** No response body

**Error Responses:**
- **400 Bad Request**: Invalid UUID format or foreign key constraint violation
- **404 Not Found**: Instruction instance not found

**Example Request:**
```bash
DELETE /instructions/instance/inst-instance-001
```

### 3. Completion Management

#### POST /instructions/instance/{instructionInstanceId}/complete - Complete Instruction

Marks an instruction instance as completed.

**Request Body:**
```json
{
  "userId": 1001
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Instruction completed successfully",
  "instructionId": "inst-instance-1",
  "stepInstanceId": "step-instance-1",
  "emailsSent": 2
}
```

#### POST /instructions/instance/{instructionInstanceId}/uncomplete - Uncomplete Instruction

Reverts an instruction completion status.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Instruction marked as not completed",
  "instructionInstanceId": "inst-instance-1"
}
```

#### POST /instructions/bulk/complete - Bulk Complete Instructions

Marks multiple instruction instances as completed.

**Request Body:**
```json
{
  "instructionInstanceIds": [
    "inst-instance-1",
    "inst-instance-2",
    "inst-instance-3"
  ],
  "userId": 1001
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bulk completion successful",
  "completedCount": 3,
  "failedCount": 0,
  "emailsSent": 6
}
```

#### DELETE /instructions/bulk - Bulk Delete Instructions

Deletes multiple instruction instances in a single operation.

**Request Body:**
```json
{
  "instructionInstanceIds": [
    "inst-instance-1",
    "inst-instance-2",
    "inst-instance-3"
  ]
}
```

**Response (200 OK):**
```json
{
  "deleted": 3,
  "failed": 0,
  "errors": []
}
```

**Response with partial failures (200 OK):**
```json
{
  "deleted": 2,
  "failed": 1,
  "errors": [
    {
      "id": "inst-instance-3",
      "reason": "Instruction instance not found"
    }
  ]
}
```

**Error Responses:**
- **400 Bad Request**: Missing required field `instructionInstanceIds`

### 4. Analytics Endpoints

#### GET /instructions/analytics/progress - Progress Analytics

Retrieves instruction completion progress statistics.

**Parameters:**
- `migrationId` (optional): Filter by migration UUID
- `iterationId` (optional): Filter by iteration UUID
- `teamId` (optional): Filter by team ID

**Example Response:**
```json
{
  "totalInstructions": 150,
  "completedInstructions": 95,
  "completionPercentage": 63.33,
  "teamBreakdown": [
    {
      "teamId": 1,
      "teamName": "Database Team", 
      "totalInstructions": 45,
      "completedInstructions": 40,
      "completionPercentage": 88.89
    },
    {
      "teamId": 2,
      "teamName": "DevOps Team",
      "totalInstructions": 35,
      "completedInstructions": 25,
      "completionPercentage": 71.43
    }
  ],
  "phaseBreakdown": [
    {
      "phaseId": "phase-1",
      "phaseName": "Pre-Migration",
      "totalInstructions": 50,
      "completedInstructions": 48,
      "completionPercentage": 96.0
    }
  ]
}
```

#### GET /instructions/analytics/completion - Completion Timeline

Retrieves instruction completion timeline data.

**Parameters:**
- `iterationId` (optional): Filter by iteration UUID
- `teamId` (optional): Filter by team ID

**Example Response:**
```json
{
  "timelineData": [
    {
      "date": "2025-01-20",
      "count": 15,
      "cumulativeCount": 15
    },
    {
      "date": "2025-01-21",
      "count": 28,
      "cumulativeCount": 43
    }
  ],
  "averageCompletionTime": 2.5,
  "peakCompletionDays": ["2025-01-21", "2025-01-22"],
  "teamPerformance": [
    {
      "teamId": 1,
      "teamName": "Database Team",
      "averageCompletionTime": 1.8,
      "totalCompleted": 40
    }
  ]
}
```

## Hierarchical Filtering Examples

### Filter by Step
```bash
GET /instructions?stepId=123e4567-e89b-12d3-a456-426614174000
```

### Filter by Plan Instance
```bash
GET /instructions?planId=plan-inst-001
```

### Filter by Sequence and Phase
```bash 
GET /instructions?sequenceId=seq-inst-001&phaseId=phase-inst-001
```

### Progressive Filtering
Start broad and narrow down:
```bash
# 1. Get all instructions for a migration
GET /instructions/analytics/progress?migrationId=mig-001

# 2. Focus on specific iteration  
GET /instructions/analytics/progress?iterationId=iter-001

# 3. Drill down to team level
GET /instructions/analytics/progress?iterationId=iter-001&teamId=15
```

## Bulk Operations Workflow

### Bulk Completion Pattern
```javascript
// 1. Get instruction instances for a step
const response = await fetch('/instructions/instance/step-inst-001');
const instructions = await response.json();

// 2. Filter uncompleted instructions
const uncompletedIds = instructions
  .filter(inst => !inst.isCompleted)
  .map(inst => inst.id);

// 3. Bulk complete
await fetch('/instructions/bulk/complete', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    instructionInstanceIds: uncompletedIds,
    userId: 1001
  })
});
```

## Error Handling Patterns

### HTTP Status Codes

- **200 OK**: Successful operation
- **201 Created**: Resource created successfully
- **204 No Content**: Successful deletion (no response body)
- **400 Bad Request**: Invalid input or SQL constraint violation (23503)
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate entry or unique constraint violation (23505)
- **500 Internal Server Error**: Unexpected server error

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid instruction order: must be positive integer",
    "details": {
      "field": "instructionOrder",
      "value": -1
    }
  }
}
```

### Common Error Scenarios

#### 1. Invalid UUID Format
```json
{
  "error": {
    "code": "INVALID_UUID",
    "message": "Invalid UUID format for instructionId"
  }
}
```

#### 2. Foreign Key Violation (400)
```json
{
  "error": {
    "code": "FOREIGN_KEY_VIOLATION", 
    "message": "Referenced step master does not exist",
    "sqlState": "23503"
  }
}
```

#### 3. Unique Constraint Violation (409)
```json
{
  "error": {
    "code": "DUPLICATE_ENTRY",
    "message": "Instruction order already exists for this step",
    "sqlState": "23505"
  }
}
```

#### 4. Negative Duration Validation (400)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Duration minutes cannot be negative",
    "details": {
      "field": "inmDurationMinutes",
      "value": -30
    }
  }
}
```

## Best Practices

### 1. Performance Optimization

**Use Hierarchical Filtering:**
```javascript
// ✅ Good: Filter at the appropriate level
GET /instructions?phaseId=phase-001

// ❌ Avoid: Over-fetching then filtering client-side
GET /instructions // then filter locally
```

**Batch Operations:**
```javascript
// ✅ Good: Use bulk operations
POST /instructions/bulk/complete
DELETE /instructions/bulk

// ❌ Avoid: Individual calls in loop
instructions.forEach(inst => POST /instructions/instance/${inst.id}/complete)
instructions.forEach(inst => DELETE /instructions/instance/${inst.id})
```

**Cascade Deletion:**
```javascript
// ✅ Good: Delete master to cascade all instances
DELETE /instructions/master/${masterId}

// ❌ Avoid: Manually deleting each instance first
instances.forEach(inst => DELETE /instructions/instance/${inst.id})
DELETE /instructions/master/${masterId}
```

### 2. Error Handling

**Implement Proper Error Handling:**
```javascript
try {
  const response = await fetch('/instructions/master', {
    method: 'POST',
    body: JSON.stringify(instructionData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (response.status === 409) {
      // Handle duplicate instruction order
      console.error('Instruction order conflict:', error.message);
    } else if (response.status === 400) {
      // Handle validation errors
      console.error('Invalid input:', error.message);
    }
  }
} catch (err) {
  console.error('Network error:', err);
}
```

### 3. State Management

**Track Completion State:**
```javascript
// Monitor completion progress
const progress = await fetch('/instructions/analytics/progress?iterationId=iter-001');
const stats = await progress.json();

if (stats.completionPercentage >= 100) {
  // All instructions completed - proceed to next phase
}
```

### 4. Type Safety (Groovy Backend)

The API implementation uses explicit type casting for query parameters:

```groovy
// ✅ Correct pattern used in implementation
params.migrationId = UUID.fromString(filters.migrationId as String)
params.teamId = Integer.parseInt(filters.teamId as String)

// ❌ Avoid implicit conversion
params.migrationId = filters.migrationId // Type safety issue
```

## Integration Examples

### Frontend Integration (JavaScript)

```javascript
class InstructionsAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  
  async getMasterInstructions(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${this.baseUrl}/instructions?${params}`);
    return response.json();
  }
  
  async completeInstruction(instructionInstanceId, userId) {
    const response = await fetch(`${this.baseUrl}/instructions/instance/${instructionInstanceId}/complete`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({userId})
    });
    return response.json();
  }
  
  async getProgressAnalytics(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${this.baseUrl}/instructions/analytics/progress?${params}`);
    return response.json();
  }
  
  async deleteInstance(instructionInstanceId) {
    const response = await fetch(`${this.baseUrl}/instructions/instance/${instructionInstanceId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    return response.status === 204;
  }
  
  async deleteMaster(masterId) {
    const response = await fetch(`${this.baseUrl}/instructions/master/${masterId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    return response.status === 204;
  }
  
  async bulkDelete(instructionInstanceIds) {
    const response = await fetch(`${this.baseUrl}/instructions/bulk`, {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({instructionInstanceIds})
    });
    return response.json();
  }
}

// Usage
const api = new InstructionsAPI('/rest/scriptrunner/latest/custom');

// Get instructions for a specific step
const instructions = await api.getMasterInstructions({
  stepId: 'step-master-001'
});

// Complete an instruction
await api.completeInstruction('inst-instance-001', 1001);

// Get progress analytics
const progress = await api.getProgressAnalytics({
  iterationId: 'iter-001'
});

// Delete a single instruction instance
await api.deleteInstance('inst-instance-001');

// Delete a master instruction (cascades to instances)
await api.deleteMaster('master-001');

// Bulk delete multiple instances
const result = await api.bulkDelete([
  'inst-instance-001',
  'inst-instance-002',
  'inst-instance-003'
]);
console.log(`Deleted: ${result.deleted}, Failed: ${result.failed}`);
```

### Groovy Integration (Backend)

```groovy
// Example service layer usage
@Service
class InstructionService {
    
    InstructionRepository instructionRepository = new InstructionRepository()
    
    def completeInstructionsForStep(UUID stepInstanceId, Integer userId) {
        // Get all incomplete instructions for step
        def instructions = instructionRepository.findInstanceInstructionsByStepInstanceId(stepInstanceId)
        def incompleteIds = instructions
            .findAll { !it.ini_is_completed }
            .collect { UUID.fromString(it.ini_id as String) }
        
        if (incompleteIds) {
            // Bulk complete
            return instructionRepository.bulkCompleteInstructions(incompleteIds, userId)
        }
        return [success: true, completedCount: 0]
    }
}
```

## Testing Strategies

### Unit Testing
```groovy
class InstructionRepositoryTest {
    @Test
    void testCreateMasterInstruction() {
        def params = [
            stepMasterId: UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
            name: "Test Instruction",
            content: "Test content",
            instructionOrder: 1,
            createdBy: 1001
        ]
        
        def result = instructionRepository.createMasterInstruction(params)
        
        assert result.success == true
        assert result.instruction.name == "Test Instruction"
    }
}
```

### Integration Testing
```bash
# Test complete workflow
curl -X POST "/instructions/master" \
  -H "Content-Type: application/json" \
  -d '{"stepMasterId": "step-001", "name": "Test", "content": "Content", "instructionOrder": 1, "createdBy": 1001}'

curl -X GET "/instructions?stepId=step-001"

curl -X POST "/instructions/instance/step-inst-001" \  
  -H "Content-Type: application/json" \
  -d '{"masterInstructionIds": ["master-001"]}'

curl -X POST "/instructions/instance/inst-inst-001/complete" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1001}'
```

## Migration & Deployment Notes

### Database Dependencies
- Requires tables: `instructions_master_inm`, `instructions_instance_ini`
- Depends on: `steps_master_stm`, `steps_instance_sti`, `teams_tea`, `controls_master_ctm`
- Audit fields: All tables include `created_at`, `created_by`, `updated_at`, `updated_by`

### Performance Considerations
- Instructions are typically queried by step instance (indexed)
- Completion analytics may require optimization for large datasets
- Consider pagination for endpoints returning large result sets

### Security Notes
- All endpoints require Confluence group membership
- User IDs are validated against active Confluence users
- SQL injection prevention through parameterized queries

## Changelog

### Version 1.1.0 (January 25, 2025)
- Added DELETE endpoints for instruction management
  - DELETE /instructions/master/{id} - Delete master with cascade
  - DELETE /instructions/instance/{id} - Delete single instance
  - DELETE /instructions/bulk - Bulk delete instances
- Added negative duration validation for create/update operations
- Improved code organization with extracted handler methods
- Enhanced security with AuthenticationService integration
- Updated error responses to use 204 No Content for deletions

### Version 1.0.0 (August 5, 2025)
- Initial Instructions API implementation  
- 14 REST endpoints covering full CRUD operations
- Master/instance pattern with completion tracking
- Hierarchical filtering support
- Bulk operations for efficiency
- Analytics endpoints for progress tracking
- Comprehensive error handling with SQL state mapping

## Support & Resources

- **OpenAPI Specification**: `/docs/api/openapi.yaml`
- **Source Code**: `/src/groovy/umig/api/v2/InstructionsApi.groovy`
- **Repository**: `/src/groovy/umig/repository/InstructionRepository.groovy`
- **Test Suite**: `/src/groovy/umig/tests/integration/InstructionsApiTest.groovy`
- **Architecture**: `/docs/solution-architecture.md` (ADR-030, ADR-031)