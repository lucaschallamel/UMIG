# Import API v2 Specification

**Version**: 2.0.0  
**Date**: September 3, 2025  
**Status**: Production Ready  
**Base URL**: `/rest/scriptrunner/latest/custom/import`

## Overview

The Import API v2 provides comprehensive data import capabilities for the UMIG system, supporting both CSV-based base entity imports and JSON-based hierarchical migration data imports. The API is designed to handle large-scale migration data with batch processing, progress tracking, rollback capabilities, and full audit trail support.

## Authentication & Authorization

**Required Authentication**: Confluence session-based authentication  
**User Groups**:

- **Base Operations**: `confluence-users` (read operations)
- **Import Operations**: `confluence-administrators` (create, update, delete operations)

**Security Model**: All import operations require administrator privileges to prevent unauthorized data modifications.

## Base Endpoints Summary

| Method | Endpoint                         | Purpose                               | Auth Level |
| ------ | -------------------------------- | ------------------------------------- | ---------- |
| POST   | `/import/json`                   | Single JSON file import               | Admin      |
| POST   | `/import/batch`                  | Multiple JSON files batch import      | Admin      |
| POST   | `/import/csv/teams`              | Import teams from CSV                 | Admin      |
| POST   | `/import/csv/users`              | Import users from CSV                 | Admin      |
| POST   | `/import/csv/applications`       | Import applications from CSV          | Admin      |
| POST   | `/import/csv/environments`       | Import environments from CSV          | Admin      |
| POST   | `/import/csv/all`                | Import all base entities in sequence  | Admin      |
| POST   | `/import/csv/master-plan`        | Import master plan from CSV (planned) | Admin      |
| POST   | `/import/master-plan`            | Create master plan configuration      | Admin      |
| POST   | `/import/rollback/{batchId}`     | Rollback import batch                 | Admin      |
| GET    | `/import/history`                | Retrieve import history               | User       |
| GET    | `/import/batch/{batchId}`        | Get batch details                     | User       |
| GET    | `/import/statistics`             | Get import statistics                 | User       |
| GET    | `/import/templates/{entity}`     | Download CSV templates                | Admin      |
| DELETE | `/import/batch/{batchId}`        | Delete import batch                   | Admin      |
| PUT    | `/import/batch/{batchId}/status` | Update batch status                   | Admin      |

---

## 1. API Overview

- **API Name:** Import API v2
- **Purpose:** Handles data import operations for JSON data extracted from Confluence HTML pages and CSV imports for base entities (teams, users, applications, environments). Provides functionality for single file imports, batch processing, import history tracking, rollback capabilities, CSV template downloads, and master plan configuration for data governance and migration management.
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-026 (Database Testing Strategy), ADR-031 (Type Safety Requirements)
- **Implementation Status:** ✅ **IMPLEMENTED** - All endpoints operational with comprehensive error handling

## 2. Endpoints

| Method | Path                           | Description                                | Status                     |
| ------ | ------------------------------ | ------------------------------------------ | -------------------------- |
| POST   | /import/json                   | Import single JSON file                    | ✅ Implemented             |
| POST   | /import/batch                  | Import multiple JSON files as a batch      | ✅ Implemented             |
| POST   | /import/csv/teams              | Import teams from CSV                      | ✅ Implemented             |
| POST   | /import/csv/users              | Import users from CSV                      | ✅ Implemented             |
| POST   | /import/csv/applications       | Import applications from CSV               | ✅ Implemented             |
| POST   | /import/csv/environments       | Import environments from CSV               | ✅ Implemented             |
| POST   | /import/csv/all                | Import all base entities in proper order   | ✅ Implemented             |
| POST   | /import/csv/master-plan        | Import master plan CSV                     | ⚠️ **501 NOT_IMPLEMENTED** |
| POST   | /import/master-plan            | Create master plan configuration           | ✅ Implemented             |
| POST   | /import/rollback/{batchId}     | Rollback import batch with audit trail     | ✅ Implemented             |
| GET    | /import/history                | Get import history with optional filtering | ✅ Implemented             |
| GET    | /import/batch/{batchId}        | Get details of a specific import batch     | ✅ Implemented             |
| GET    | /import/statistics             | Get overall import statistics              | ✅ Implemented             |
| GET    | /import/templates/{entity}     | Download CSV templates for base entities   | ✅ Implemented             |
| DELETE | /import/batch/{batchId}        | Rollback a specific import batch           | ✅ Implemented             |
| PUT    | /import/batch/{batchId}/status | Update import batch status                 | ✅ Implemented             |

## 3. Request Details

### 3.1. Path Parameters

| Name    | Type   | Required | Description                                                              |
| ------- | ------ | -------- | ------------------------------------------------------------------------ |
| batchId | UUID   | Yes      | Import batch identifier for operations                                   |
| entity  | String | Yes      | Entity type for CSV templates (teams, users, applications, environments) |

### 3.2. Query Parameters

| Name   | Type    | Required | Description                                   |
| ------ | ------- | -------- | --------------------------------------------- |
| userId | String  | No       | Filter import history by username             |
| limit  | Integer | No       | Limit number of history records (default: 50) |

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

#### CSV Import (POST /import/csv/{entity})

- **Content-Type:** text/csv OR application/json (for 'all' entity type)
- **Schema for single entity:** Raw CSV content as request body
- **Schema for 'all' entity type:**

```json
{
  "teams": "string (CSV content)",
  "users": "string (CSV content)",
  "applications": "string (CSV content)",
  "environments": "string (CSV content)"
}
```

- **Example CSV content:**

```csv
team_name,team_description,team_lead
"Infrastructure Team","Manages servers and infrastructure","john.doe"
"Development Team","Application development","jane.smith"
```

- **Example for 'all' entity type:**

```json
{
  "teams": "team_name,team_description,team_lead\n\"Infrastructure Team\",\"Manages servers\",\"john.doe\"",
  "users": "username,display_name,email,role\n\"john.doe\",\"John Doe\",\"john@company.com\",\"admin\"",
  "applications": "app_name,app_description,app_owner\n\"Web Portal\",\"Main application\",\"dev-team\"",
  "environments": "env_name,env_description,env_type\n\"Production\",\"Live environment\",\"PROD\""
}
```

#### Master Plan Configuration (POST /import/master-plan)

- **Content-Type:** application/json
- **Schema:**

```json
{
  "planName": "string",
  "description": "string (optional)",
  "userId": "string (optional, defaults to current user)"
}
```

- **Example:**

```json
{
  "planName": "Migration Plan Alpha",
  "description": "High-level description of the migration plan",
  "userId": "admin"
}
```

#### Rollback Request (POST /import/rollback/{batchId})

- **Content-Type:** application/json
- **Schema:**

```json
{
  "reason": "string (optional)"
}
```

- **Example:**

```json
{
  "reason": "Data validation failed after import completion"
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
      "errors": [
        "Invalid step format in row 5",
        "Missing required field in row 12"
      ]
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

#### CSV Import Success Response

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "success": "boolean",
  "source": "string",
  "recordsProcessed": "number",
  "recordsImported": "number",
  "recordsSkipped": "number",
  "errors": ["string"]
}
```

- **Example:**

```json
{
  "success": true,
  "source": "teams_import.csv",
  "recordsProcessed": 15,
  "recordsImported": 13,
  "recordsSkipped": 2,
  "errors": []
}
```

#### Master Plan Configuration Success Response

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "success": "boolean",
  "planId": "string (UUID)",
  "message": "string",
  "batchId": "string (UUID)",
  "planName": "string",
  "description": "string",
  "createdBy": "string"
}
```

- **Example:**

```json
{
  "success": true,
  "planId": "550e8400-e29b-41d4-a716-446655440012",
  "message": "Master Plan configuration created successfully",
  "batchId": "550e8400-e29b-41d4-a716-446655440013",
  "planName": "Migration Plan Alpha",
  "description": "High-level description of the migration plan",
  "createdBy": "admin"
}
```

#### CSV Template Download Response

- **Status Code:** 200 OK
- **Content-Type:** text/csv; charset=utf-8
- **Headers:**
  - `Content-Disposition: attachment; filename="{entity}_template.csv"`
  - `Cache-Control: no-cache, no-store, must-revalidate`
- **Body:** Raw CSV template file content

#### Enhanced Rollback Success Response

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "success": "boolean",
  "message": "string",
  "batchId": "string (UUID)",
  "rollbackActions": ["string"],
  "reason": "string",
  "rolledBackBy": "string",
  "rollbackDate": "string"
}
```

- **Example:**

```json
{
  "success": true,
  "message": "Import batch successfully rolled back",
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "rollbackActions": [
    "Deleted 25 staging steps",
    "Deleted 75 staging instructions"
  ],
  "reason": "Data validation failed after import completion",
  "rolledBackBy": "admin",
  "rollbackDate": "2025-09-03T14:30:15.123Z"
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema                                     | Example                                                                                                                                       | Description                           |
| ----------- | ---------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 400         | application/json | `{"error": "string", "details": "string"}` | `{"error": "Missing required fields: 'source' and 'content'"}`                                                                                | Bad request format or validation      |
| 401         | application/json | `{"error": "string"}`                      | `{"error": "Authentication required"}`                                                                                                        | Authentication required               |
| 403         | application/json | `{"error": "string"}`                      | `{"error": "Insufficient permissions for import operations"}`                                                                                 | Authorization failed                  |
| 404         | application/json | `{"error": "string"}`                      | `{"error": "Import batch not found: 550e8400-e29b-41d4-a716-446655440000"}`                                                                   | Resource not found                    |
| 409         | application/json | `{"error": "string", "details": "string"}` | `{"error": "Duplicate data detected", "details": "Step already exists"}`                                                                      | Data conflict (SQL State 23505)       |
| **501**     | application/json | `{"error": "string", "details": "string"}` | `{"error": "Master plan CSV import is not yet implemented", "details": "The importMasterPlans method needs to be added to CsvImportService"}` | **Not Implemented** - Feature pending |
| 500         | application/json | `{"error": "string", "details": "string"}` | `{"error": "Import failed", "details": "Database connection timeout"}`                                                                        | Internal server error                 |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (ScriptRunner Integration)
- **Permissions:**
  - **GET operations** (history, batch details, statistics, templates): User must be member of `confluence-users` OR `confluence-administrators` groups
  - **POST/PUT/DELETE operations** (all import operations, batch status updates, rollbacks): User must be member of `confluence-administrators` group
- **User Context**: Automatically retrieved via `UserService.getCurrentUserContext()` for audit trail
- **Type Safety**: All user IDs explicitly cast to String for ADR-031 compliance

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

### JSON Import Operations

- **Key Logic:**
  - Uses staging tables (`stg_steps`, `stg_step_instructions`) for intermediate storage
  - Validates JSON structure and step_type must be exactly 3 characters
  - Data validation occurs before promotion to master tables
  - Batch processing with atomic operations per batch
  - Import audit trail maintained in `tbl_import_batches` table
- **Side Effects:**
  - Creates import batch records for tracking
  - Populates staging tables during import process
  - Updates master tables after successful validation
  - Generates audit log entries for all operations

### CSV Import Operations

- **Key Logic:**
  - Native Groovy CSV parsing compatible with ScriptRunner environment
  - Handles quoted fields, escaped quotes, and embedded commas
  - Supports individual entity imports (teams, users, applications, environments)
  - Batch 'all' entity import processes in proper dependency order
  - Import statistics tracking (processed, imported, skipped counts)
- **Side Effects:**
  - Direct insertion into master entity tables
  - Creates import batch records for audit trail
  - Generates detailed import statistics and error reporting

### Master Plan Configuration

- **Key Logic:**
  - Creates master plan entries in `tbl_plans_master` table
  - Associates import batch for audit tracking
  - Plan names must be unique (enforced by database constraints)
- **Side Effects:**
  - Creates new plan master record with UUID
  - Associates import batch for tracking
  - Updates batch status to COMPLETED upon success

### Rollback Operations

- **Enhanced Logic:**
  - Comprehensive audit trail with rollback actions tracking
  - Transaction-based rollback for data consistency
  - Deletion from staging tables with cascade handling
  - Status update to ROLLED_BACK with rollback metadata
- **Side Effects:**
  - Removes imported data from staging tables
  - Updates batch status with rollback information
  - Creates audit log entries with rollback details
  - Records rollback actions for operational transparency

- **Idempotency:**
  - Single imports are not idempotent (will create duplicate records if repeated)
  - Batch operations create unique batch IDs for each request
  - Rollback operations are idempotent (can be called multiple times safely)
  - CSV template downloads are idempotent (cacheable)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `tbl_import_batches` (primary tracking table with batch metadata)
  - `tbl_import_audit_log` (comprehensive audit trail)
  - `stg_steps` (staging table for step data)
  - `stg_step_instructions` (staging table for instruction data)
  - `tbl_steps_master` (target master table for steps)
  - `tbl_step_instructions_master` (target master table for instructions)
  - `tbl_plans_master` (master plan configuration table)
  - `tbl_teams_master` (teams entity table)
  - `tbl_users_master` (users entity table)
  - `tbl_applications_master` (applications entity table)
  - `tbl_environments_master` (environments entity table)

- **External APIs:** None
- **Other Services:**
  - `ImportService` - Business logic for JSON import operations
  - `CsvImportService` - Business logic for CSV base entity imports
  - `ImportRepository` - Data access for import tracking and audit trail
  - `StagingImportRepository` - Staging table operations
  - `DatabaseUtil` - Connection management and transaction handling
  - `UserService` - Current user identification and context

- **File System Dependencies:**
  - CSV templates located at: `local-dev-setup/data-utils/CSV_Templates/`
  - Template files: `teams_template.csv`, `users_template.csv`, `applications_template.csv`, `environments_template.csv`

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

### CSV Entity Import

```bash
# Import teams from CSV
curl -X POST /rest/scriptrunner/latest/custom/import/csv/teams \
  -H "Content-Type: text/csv" \
  -H "Authorization: Bearer <token>" \
  --data-binary @teams_import.csv

# Import all base entities
curl -X POST /rest/scriptrunner/latest/custom/import/csv/all \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "teams": "team_name,team_description,team_lead\n\"Infrastructure Team\",\"Manages servers\",\"john.doe\"",
    "users": "username,display_name,email,role\n\"john.doe\",\"John Doe\",\"john@company.com\",\"admin\"",
    "applications": "app_name,app_description,app_owner\n\"Web Portal\",\"Main application\",\"dev-team\"",
    "environments": "env_name,env_description,env_type\n\"Production\",\"Live environment\",\"PROD\""
  }'
```

### Master Plan Configuration

```bash
curl -X POST /rest/scriptrunner/latest/custom/import/master-plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "planName": "Migration Plan Alpha",
    "description": "High-level description of the migration plan",
    "userId": "admin"
  }'
```

### CSV Template Download

```bash
# Download teams CSV template
curl -X GET /rest/scriptrunner/latest/custom/import/templates/teams \
  -H "Authorization: Bearer <token>" \
  -o teams_template.csv

# Download all templates
for entity in teams users applications environments; do
  curl -X GET "/rest/scriptrunner/latest/custom/import/templates/${entity}" \
    -H "Authorization: Bearer <token>" \
    -o "${entity}_template.csv"
done
```

### Enhanced Rollback with Audit Trail

```bash
curl -X POST /rest/scriptrunner/latest/custom/import/rollback/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reason": "Data validation failed after import completion"
  }'
```

## 13. Notes

- **Implementation Notes:**
  - ✅ **Fully Implemented** - All endpoint handlers operational with comprehensive error handling
  - Uses lazy loading pattern for services to avoid class loading issues in ScriptRunner
  - Implements comprehensive error handling with SQL state mapping (23505 for conflicts, 23503 for foreign keys)
  - Follows UMIG repository pattern with `DatabaseUtil.withSql` for connection management
  - **Type Safety (ADR-031)**: All parameters explicitly cast to proper types (UUID, String, Integer)
  - **501 NOT_IMPLEMENTED**: CSV master-plan import returns HTTP 501 until `importMasterPlans` method implemented in CsvImportService
  - Native Groovy CSV parsing for ScriptRunner compatibility (no external dependencies)
  - Maintains backward compatibility with existing import workflows

- **Integration Considerations:**
  - Designed for integration with Admin GUI for import management
  - Supports both programmatic API access and user interface operations
  - CSV template system provides downloadable templates from file system
  - Comprehensive audit trail for compliance and troubleshooting
  - Master plan configuration integrates with existing plan management workflows

- **Performance Characteristics:**
  - Batch operations process files sequentially for data integrity
  - Staging table approach minimizes impact on production data during validation
  - History queries paginated to prevent memory issues with large result sets
  - Import operations logged at INFO level for monitoring
  - CSV template downloads cached with proper HTTP headers
  - Transaction-based rollback operations for consistency

- **Error Handling Features:**
  - SQL state-specific error responses (23505→409 Conflict, 23503→400 Bad Request)
  - Comprehensive validation with detailed error messages
  - Rollback operations include detailed action tracking
  - Audit trail captures all user actions and system responses

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
- **2025-09-03:** ✅ **COMPLETE IMPLEMENTATION UPDATE**
  - Updated to reflect actual implemented API state
  - Added CSV import endpoints for base entities (teams, users, applications, environments)
  - Documented master plan configuration endpoint
  - Added CSV template download functionality
  - Enhanced rollback operations with comprehensive audit trail
  - Documented 501 NOT_IMPLEMENTED status for CSV master-plan import
  - Updated error handling with specific SQL state mappings (23505, 23503)
  - Enhanced type safety documentation per ADR-031
  - Added comprehensive examples for all implemented endpoints
  - Updated authentication and authorization details
  - Documented file system dependencies for CSV templates

---

> **Note:** This specification documents the Import API v2 as fully implemented in ImportApi.groovy (Sprint 6 - US-034). All endpoints are operational except CSV master-plan import which returns HTTP 501. The API follows UMIG patterns for authentication, error handling, type safety (ADR-031), and database operations. Update this specification when new features are added or when the CSV master-plan import is implemented.
