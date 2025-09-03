# Import API v2 Specification

> Data import operations for JSON data extracted from Confluence HTML pages, supporting single file and batch import operations with comprehensive audit trails and rollback capabilities.

---

## 1. API Overview

- **API Name:** Import API v2
- **Purpose:** Handles data import operations for JSON data extracted from Confluence HTML pages. Provides functionality for single file imports, batch processing, import history tracking, and rollback capabilities for data governance and migration management.
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-026 (Database Testing Strategy), ADR-031 (Type Safety Requirements)

## 2. Endpoints

| Method | Path                                | Description                                    |
| ------ | ----------------------------------- | ---------------------------------------------- |
| POST   | /import/json                        | Import single JSON file                        |
| POST   | /import/batch                       | Import multiple JSON files as a batch         |
| GET    | /import/history                     | Get import history with optional filtering     |
| GET    | /import/batch/{batchId}             | Get details of a specific import batch        |
| GET    | /import/statistics                  | Get overall import statistics                  |
| DELETE | /import/batch/{batchId}             | Rollback a specific import batch               |
| PUT    | /import/batch/{batchId}/status      | Update import batch status                   |

## 3. Request Details

### 3.1. Path Parameters

| Name    | Type | Required | Description                           |
| ------- | ---- | -------- | ------------------------------------- |
| batchId | UUID | Yes      | Import batch identifier for operations |

### 3.2. Query Parameters

| Name   | Type    | Required | Description                                      |
| ------ | ------- | -------- | ------------------------------------------------ |
| userId | String  | No       | Filter import history by username                |
| limit  | Integer | No       | Limit number of history records (default: 50)   |

### 3.3. Request Body

#### Single JSON Import (POST /import/json)

- **Content-Type:** application/json
- **Schema:**

```json
{
  "source": "string",
  "content": "string"
}
```

- **Example:**

```json
{
  "source": "migration-data-2025.json",
  "content": "{\"steps\": [{\"title\": \"Configure Database\", \"instructions\": [{\"text\": \"Connect to production database\", \"order\": 1}]}]}"
}
```

#### Batch Import (POST /import/batch)

- **Content-Type:** application/json
- **Schema:**

```json
{
  "files": [
    {
      "filename": "string",
      "content": "string"
    }
  ]
}
```

- **Example:**

```json
{
  "files": [
    {
      "filename": "migration-phase-1.json",
      "content": "{\"steps\": [{\"title\": \"Phase 1 Setup\"}]}"
    },
    {
      "filename": "migration-phase-2.json",
      "content": "{\"steps\": [{\"title\": \"Phase 2 Execution\"}]}"
    }
  ]
}
```

#### Batch Rollback (DELETE /import/batch/{batchId})

- **Content-Type:** application/json
- **Schema:**

```json
{
  "reason": "string"
}
```

- **Example:**

```json
{
  "reason": "Data inconsistencies detected, rolling back to previous state"
}
```

#### Status Update (PUT /import/batch/{batchId}/status)

- **Content-Type:** application/json
- **Schema:**

```json
{
  "status": "string",
  "statistics": {
    "recordsProcessed": "number",
    "successCount": "number",
    "errorCount": "number"
  }
}
```

- **Example:**

```json
{
  "status": "COMPLETED",
  "statistics": {
    "recordsProcessed": 150,
    "successCount": 148,
    "errorCount": 2
  }
}
```

## 4. Response Details

### 4.1. Success Response

#### Single Import Success
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "success": "boolean",
  "source": "string",
  "batchId": "string",
  "statistics": {
    "recordsProcessed": "number",
    "successCount": "number",
    "errorCount": "number"
  },
  "errors": ["string"],
  "warnings": ["string"]
}
```

- **Example:**

```json
{
  "success": true,
  "source": "migration-data-2025.json",
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "statistics": {
    "recordsProcessed": 25,
    "successCount": 25,
    "errorCount": 0
  },
  "errors": [],
  "warnings": []
}
```

#### Batch Import Success
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "success": "boolean",
  "batchId": "string",
  "filesProcessed": "number",
  "overallStatistics": {
    "totalRecords": "number",
    "successCount": "number",
    "errorCount": "number"
  },
  "fileResults": [
    {
      "filename": "string",
      "success": "boolean",
      "statistics": {},
      "errors": ["string"]
    }
  ]
}
```

- **Example:**

```json
{
  "success": true,
  "batchId": "550e8400-e29b-41d4-a716-446655440001",
  "filesProcessed": 2,
  "overallStatistics": {
    "totalRecords": 50,
    "successCount": 48,
    "errorCount": 2
  },
  "fileResults": [
    {
      "filename": "migration-phase-1.json",
      "success": true,
      "statistics": {
        "recordsProcessed": 25,
        "successCount": 25,
        "errorCount": 0
      },
      "errors": []
    },
    {
      "filename": "migration-phase-2.json",
      "success": false,
      "statistics": {
        "recordsProcessed": 25,
        "successCount": 23,
        "errorCount": 2
      },
      "errors": ["Invalid step format in row 5", "Missing required field in row 12"]
    }
  ]
}
```

#### Import History
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "history": [
    {
      "batchId": "string",
      "source": "string",
      "importType": "string",
      "status": "string",
      "userId": "string",
      "startTime": "string",
      "endTime": "string",
      "statistics": {}
    }
  ]
}
```

- **Example:**

```json
{
  "history": [
    {
      "batchId": "550e8400-e29b-41d4-a716-446655440000",
      "source": "migration-data-2025.json",
      "importType": "JSON_IMPORT",
      "status": "COMPLETED",
      "userId": "admin",
      "startTime": "2025-01-15T10:30:00Z",
      "endTime": "2025-01-15T10:32:15Z",
      "statistics": {
        "recordsProcessed": 25,
        "successCount": 25,
        "errorCount": 0
      }
    }
  ]
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema                                    | Example                                                                    | Description                      |
| ----------- | ---------------- | ----------------------------------------- | -------------------------------------------------------------------------- | -------------------------------- |
| 400         | application/json | `{"error": "string", "details": "string"}` | `{"error": "Missing required fields: 'source' and 'content'"}`           | Bad request format or validation |
| 401         | application/json | `{"error": "string"}`                     | `{"error": "Authentication required"}`                                    | Authentication required          |
| 403         | application/json | `{"error": "string"}`                     | `{"error": "Insufficient permissions for import operations"}`             | Authorization failed             |
| 404         | application/json | `{"error": "string"}`                     | `{"error": "Import batch not found: 550e8400-e29b-41d4-a716-446655440000"}` | Resource not found              |
| 409         | application/json | `{"error": "string", "details": "string"}` | `{"error": "Duplicate data detected", "details": "Step already exists"}`  | Data conflict (SQL State 23505) |
| 500         | application/json | `{"error": "string", "details": "string"}` | `{"error": "Import failed", "details": "Database connection timeout"}`    | Internal server error           |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication
- **Permissions:**
  - GET operations: User must be member of `confluence-users` or `confluence-administrators` groups
  - POST/PUT/DELETE operations: User must be member of `confluence-administrators` group

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (data access controlled by Confluence permissions)
- **Input Validation:**
  - UUID format validation for batchId parameters
  - JSON structure validation for all payloads
  - File size limits for import content
  - Type casting validation (ADR-031) - explicit casting to UUID and Integer types
  - SQL injection prevented via prepared statements in repository layer
- **Other Security Considerations:**
  - Import operations logged for audit trail
  - Staging tables used to validate data before promotion to master tables
  - Administrator-only access for destructive operations (rollback, status updates)

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Uses staging tables (`stg_steps`, `stg_step_instructions`) for intermediate storage
  - Data validation occurs before promotion to master tables
  - Batch processing with atomic operations per batch
  - Import audit trail maintained in `import_batches` table
- **Side Effects:**
  - Creates import batch records for tracking
  - Populates staging tables during import process
  - Updates master tables after successful validation
  - Generates audit log entries for all operations
- **Idempotency:**
  - Single imports are not idempotent (will create duplicate records if repeated)
  - Batch operations create unique batch IDs for each request
  - Rollback operations are idempotent (can be called multiple times safely)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `import_batches` (primary tracking table)
  - `stg_steps` (staging table for step data)
  - `stg_step_instructions` (staging table for instruction data)
  - `steps_master` (target master table)
  - `step_instructions_master` (target master table)

- **External APIs:** None
- **Other Services:**
  - `ImportService` - Business logic for import operations
  - `ImportRepository` - Data access for import tracking
  - `StagingImportRepository` - Staging table operations
  - `DatabaseUtil` - Connection management and transaction handling
  - `UserService` - Current user identification

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment
- **Backward Compatibility:** Maintained through service layer abstraction

## 10. Testing & Mock Data

- **Unit Tests:** Repository tests cover database operations and service logic
- **Integration Tests:** Full import workflow tested including batch processing and rollback operations
- **E2E Tests:** Admin GUI integration and Postman collection validation
- **Mock Data/Fixtures:** Sample JSON import files available via `npm run generate-data:erase`

## 11. Business Logic & Validation Rules

### Single JSON Import

- **Validation Rules:**
  - `source` field is required and must be non-empty string
  - `content` field is required and must be valid JSON
  - JSON content must conform to expected migration data schema
  - User must have administrator privileges
- **Error Conditions:**
  - Invalid JSON format in content field
  - Missing required fields in JSON structure
  - Database constraint violations (unique key conflicts)
  - Staging table validation failures
- **Side Effects:**
  - Creates import batch record
  - Populates staging tables
  - Promotes validated data to master tables

### Batch Import

- **Validation Rules:**
  - `files` array is required and must contain at least one file
  - Each file must have `filename` and `content` fields
  - All content must be valid JSON
  - Total batch size limitations apply
- **Error Conditions:**
  - Empty or malformed files array
  - Individual file validation failures
  - Partial batch success handling
- **Side Effects:**
  - Creates single batch record for entire operation
  - Processes files sequentially
  - Maintains statistics for overall batch and individual files

### Import History Retrieval

- **Validation Rules:**
  - `userId` parameter must be valid username if provided
  - `limit` parameter must be positive integer (1-1000)
- **Error Conditions:**
  - Invalid limit values
  - Database query timeouts for large result sets
- **Side Effects:** None (read-only operation)

### Batch Rollback

- **Validation Rules:**
  - `batchId` must be valid UUID format
  - Batch must exist and be eligible for rollback
  - User must have administrator privileges
  - Optional `reason` field for audit purposes
- **Error Conditions:**
  - Batch not found
  - Batch already rolled back
  - Foreign key constraints preventing rollback
- **Side Effects:**
  - Removes imported data from master tables
  - Updates batch status to "ROLLED_BACK"
  - Records rollback reason in audit log

### Status Update

- **Validation Rules:**
  - `batchId` must be valid UUID format
  - `status` must be one of: COMPLETED, FAILED, IN_PROGRESS
  - `statistics` object is optional but must be valid JSON if provided
- **Error Conditions:**
  - Invalid status values
  - Batch not found
  - Status transition validation failures
- **Side Effects:**
  - Updates batch record status
  - Stores statistics for reporting
  - Triggers downstream processing based on status

## 12. Examples

### Single File Import

```bash
curl -X POST /rest/scriptrunner/latest/custom/import/json \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "source": "migration-phase-1.json",
    "content": "{\"steps\": [{\"title\": \"Database Setup\", \"instructions\": [{\"text\": \"Create database schema\", \"order\": 1}]}]}"
  }'
```

### Batch Import

```bash
curl -X POST /rest/scriptrunner/latest/custom/import/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "files": [
      {
        "filename": "phase-1.json",
        "content": "{\"steps\": [{\"title\": \"Phase 1\"}]}"
      },
      {
        "filename": "phase-2.json", 
        "content": "{\"steps\": [{\"title\": \"Phase 2\"}]}"
      }
    ]
  }'
```

### Get Import History

```bash
curl -X GET "/rest/scriptrunner/latest/custom/import/history?userId=admin&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Get Batch Details

```bash
curl -X GET /rest/scriptrunner/latest/custom/import/batch/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>"
```

### Get Import Statistics

```bash
curl -X GET /rest/scriptrunner/latest/custom/import/statistics \
  -H "Authorization: Bearer <token>"
```

### Rollback Import Batch

```bash
curl -X DELETE /rest/scriptrunner/latest/custom/import/batch/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reason": "Data validation failed after import completion"
  }'
```

### Update Batch Status

```bash
curl -X PUT /rest/scriptrunner/latest/custom/import/batch/550e8400-e29b-41d4-a716-446655440000/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "status": "COMPLETED",
    "statistics": {
      "recordsProcessed": 150,
      "successCount": 148,
      "errorCount": 2
    }
  }'
```

## 13. Notes

- **Implementation Notes:**
  - Uses lazy loading pattern for services to avoid class loading issues in ScriptRunner
  - Implements comprehensive error handling with SQL state mapping (23505 for conflicts)
  - Follows UMIG repository pattern with `DatabaseUtil.withSql` for connection management
  - Maintains backward compatibility with existing import workflows
- **Integration Considerations:**
  - Designed for integration with Admin GUI for import management
  - Supports both programmatic API access and user interface operations
  - Provides audit trail for compliance and troubleshooting
- **Performance Characteristics:**
  - Batch operations process files sequentially for data integrity
  - Staging table approach minimizes impact on production data during validation
  - History queries paginated to prevent memory issues with large result sets
  - Import operations logged at INFO level for monitoring

## 14. Related APIs

- **Steps API v2:** Import operations create and validate step data that integrates with steps management
- **Instructions API v2:** Imported instruction data flows into instruction management workflows
- **Teams API v2:** Import operations may reference team assignments and ownership
- **Users API v2:** User identification and permission validation for import operations

## 15. Change Log

- **2025-01-15:** Initial API specification created for Sprint 6 - US-034 implementation
- **2025-01-15:** Added comprehensive error handling and SQL state mapping
- **2025-01-15:** Documented staging table architecture and validation workflows
- **2025-01-15:** Added batch rollback and status update functionality

---

> **Note:** This specification documents the import API as implemented in ImportApi.groovy. Update this specification when the API changes and reference during code reviews and ADRs. The API follows UMIG patterns for authentication, error handling, and database operations established in related APIs.