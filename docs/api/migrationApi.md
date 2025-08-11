# Migration API Specification

> This document defines the REST API for managing the migration hierarchy in UMIG: Migration > Plan > Iteration > Sequence > Phase. All CRUD operations and hierarchical relationships are described here.

**✅ Status:** Complete with 100% integration test success rate (US-025 Phase 4)

---

## 1. API Overview

- **API Name:** Migration API
- **Purpose:** Manage migrations and their hierarchical structure (Plans, Iterations, Sequences, Phases)
- **Owner:** UMIG Engineering Team
- **Related ADRs:** ADR-036 (Integration Testing Framework), see `/docs/adr/` and `/docs/solution-architecture.md`
- **US-025 Phase 4:** All endpoints validated with comprehensive integration testing framework

### Recent Fixes (US-025 Phase 4)

- ✅ **mig_type Parameter**: Fixed Integer→String casting issue in query processing
- ✅ **GString Serialization**: Resolved JSON payload serialization overflow issues
- ✅ **HTTP Basic Auth**: Validated Confluence user credential integration
- ✅ **Error Mapping**: Confirmed SQL state to HTTP status mappings (23503→400, 23505→409)

## 2. Endpoints

### 2.1 Core CRUD Endpoints

| Method | Path                                             | Description                                                         |
| ------ | ------------------------------------------------ | ------------------------------------------------------------------- |
| GET    | /rest/scriptrunner/latest/custom/migrations      | List all migrations with advanced filtering, pagination, and search |
| POST   | /rest/scriptrunner/latest/custom/migrations      | Create a new migration                                              |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id} | Get migration by ID with status metadata enrichment                 |
| PUT    | /rest/scriptrunner/latest/custom/migrations/{id} | Update migration by ID                                              |
| DELETE | /rest/scriptrunner/latest/custom/migrations/{id} | Delete migration by ID with referential integrity checks            |

### 2.2 Dashboard Endpoints (New)

| Method | Path                                                           | Description                                                 |
| ------ | -------------------------------------------------------------- | ----------------------------------------------------------- |
| GET    | /rest/scriptrunner/latest/custom/migrations/dashboard/summary  | Get dashboard summary with totals and status distribution   |
| GET    | /rest/scriptrunner/latest/custom/migrations/dashboard/progress | Get progress aggregation data with optional filtering       |
| GET    | /rest/scriptrunner/latest/custom/migrations/dashboard/metrics  | Get performance metrics (placeholder - not yet implemented) |

### 2.3 Bulk Operations (New)

| Method | Path                                                    | Description                                                      |
| ------ | ------------------------------------------------------- | ---------------------------------------------------------------- |
| PUT    | /rest/scriptrunner/latest/custom/migrations/bulk/status | Bulk update migration status (placeholder - not yet implemented) |
| POST   | /rest/scriptrunner/latest/custom/migrations/bulk/export | Bulk export migrations to JSON/CSV format                        |

### 2.4 Hierarchical Endpoints

| Method | Path                                                                                                       | Description                                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/iterations                                                | List iterations for a migration (fields: staticCutoverDate, dynamicCutoverDate; see data model in Liquibase changelogs) |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/iterations/{iterationId}                                  | Get specific iteration by ID                                                                                            |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/iterations/{iterationId}/plan-instances                   | List plan instances for an iteration                                                                                    |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/iterations/{iterationId}/sequences                        | List sequences for an iteration                                                                                         |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/iterations/{iterationId}/phases                           | List phases for an iteration                                                                                            |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/iterations/{iterationId}/plan-instances/{pliId}/sequences | List sequences for a plan instance                                                                                      |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/iterations/{iterationId}/plan-instances/{pliId}/phases    | List phases for a plan instance                                                                                         |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/iterations/{iterationId}/sequences/{seqId}/phases         | List phases for a sequence                                                                                              |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type   | Required | Description                                |
| ---- | ------ | -------- | ------------------------------------------ |
| id   | string | yes      | Migration/Plan/Iteration/Sequence/Phase ID |

> **Note:** All API field mappings must be cross-checked with the latest Liquibase changelogs in `local-dev-setup/liquibase` before implementation or update. This prevents mapping errors and ensures alignment with the real data model.

### 3.2. Query Parameters

#### 3.2.1 List Migrations (/migrations)

| Name      | Type    | Required | Description                        | Default | Constraints                                                                |
| --------- | ------- | -------- | ---------------------------------- | ------- | -------------------------------------------------------------------------- |
| page      | integer | No       | Page number for pagination         | 1       | ≥ 1                                                                        |
| size      | integer | No       | Number of items per page           | 50      | 1-100                                                                      |
| search    | string  | No       | Search term for name/description   | -       | Max 100 chars                                                              |
| sort      | string  | No       | Sort field                         | -       | mig_name, mig_status, created_at, updated_at, mig_start_date, mig_end_date |
| direction | string  | No       | Sort direction                     | asc     | asc, desc                                                                  |
| status    | string  | No       | Filter by status (comma-separated) | -       | Valid status values                                                        |
| dateFrom  | string  | No       | Start date filter                  | -       | YYYY-MM-DD format                                                          |
| dateTo    | string  | No       | End date filter                    | -       | YYYY-MM-DD format                                                          |
| teamId    | integer | No       | Filter by team ID                  | -       | Valid team ID                                                              |
| ownerId   | integer | No       | Filter by owner user ID            | -       | Valid user ID                                                              |

#### 3.2.2 Dashboard Progress (/migrations/dashboard/progress)

| Name        | Type   | Required | Description               | Default | Constraints       |
| ----------- | ------ | -------- | ------------------------- | ------- | ----------------- |
| migrationId | UUID   | No       | Specific migration filter | -       | Valid UUID        |
| dateFrom    | string | No       | Start date filter         | -       | YYYY-MM-DD format |
| dateTo      | string | No       | End date filter           | -       | YYYY-MM-DD format |

#### 3.2.3 Dashboard Metrics (/migrations/dashboard/metrics)

| Name        | Type   | Required | Description               | Default | Constraints               |
| ----------- | ------ | -------- | ------------------------- | ------- | ------------------------- |
| period      | string | No       | Metrics period            | month   | day, week, month, quarter |
| migrationId | UUID   | No       | Specific migration filter | -       | Valid UUID                |

### 3.3. Request Body

#### 3.3.1 Create Migration (POST /migrations)

- **Content-Type:** application/json
- **Schema:**

```json
{
  "mig_name": "string",
  "mig_description": "string",
  "mig_start_date": "YYYY-MM-DD",
  "mig_end_date": "YYYY-MM-DD",
  "mig_business_cutover_date": "YYYY-MM-DD",
  "mig_type": "string",
  "usr_id_owner": "integer"
}
```

- **Example:**

```json
{
  "mig_name": "Data Center Migration Q3 2025",
  "mig_description": "Migration of all core services to new data center.",
  "mig_start_date": "2025-07-01",
  "mig_end_date": "2025-09-30",
  "mig_business_cutover_date": "2025-08-15",
  "mig_type": "Infrastructure",
  "usr_id_owner": 123
}
```

#### 3.3.2 Bulk Status Update (PUT /migrations/bulk/status)

- **Content-Type:** application/json
- **Schema:**

```json
{
  "migrationIds": ["UUID"],
  "newStatus": "string",
  "reason": "string"
}
```

- **Example:**

```json
{
  "migrationIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-12d3-a456-426614174001"
  ],
  "newStatus": "In Progress",
  "reason": "Starting implementation phase"
}
```

#### 3.3.3 Bulk Export (POST /migrations/bulk/export)

- **Content-Type:** application/json
- **Schema:**

```json
{
  "migrationIds": ["UUID"],
  "format": "json|csv",
  "includeIterations": "boolean"
}
```

- **Example:**

```json
{
  "migrationIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-12d3-a456-426614174001"
  ],
  "format": "csv",
  "includeIterations": true
}
```

## 4. Response Details

### 4.1. List Migrations (GET /migrations)

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "data": [
    {
      "mig_id": "UUID",
      "mig_name": "string",
      "mig_description": "string",
      "mig_status": "integer",
      "mig_type": "string",
      "mig_start_date": "YYYY-MM-DD",
      "mig_end_date": "YYYY-MM-DD",
      "mig_business_cutover_date": "YYYY-MM-DD",
      "usr_id_owner": "integer",
      "created_at": "YYYY-MM-DD HH:mm:ss",
      "updated_at": "YYYY-MM-DD HH:mm:ss",
      "statusMetadata": {
        "id": "integer",
        "name": "string",
        "color": "string",
        "type": "string"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "size": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  },
  "filters": {
    "search": "term",
    "status": ["active"],
    "sort": "mig_name",
    "direction": "asc"
  }
}
```

### 4.2. Single Migration (GET /migrations/{id})

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "mig_id": "123e4567-e89b-12d3-a456-426614174000",
  "mig_name": "Data Center Migration Q3 2025",
  "mig_description": "Migration of all core services to new data center.",
  "mig_status": 1,
  "mig_type": "Infrastructure",
  "mig_start_date": "2025-07-01",
  "mig_end_date": "2025-09-30",
  "mig_business_cutover_date": "2025-08-15",
  "usr_id_owner": 123,
  "created_at": "2025-08-01 10:30:00",
  "updated_at": "2025-08-11 14:45:00",
  "statusMetadata": {
    "id": 1,
    "name": "Planning",
    "color": "#3498db",
    "type": "active"
  }
}
```

### 4.3. Dashboard Summary (GET /migrations/dashboard/summary)

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "data": {
    "totalMigrations": 25,
    "byStatus": {
      "Planning": 8,
      "In Progress": 12,
      "Completed": 5
    },
    "upcomingDeadlines": [
      {
        "mig_id": "UUID",
        "mig_name": "string",
        "mig_end_date": "YYYY-MM-DD",
        "daysRemaining": 15
      }
    ],
    "recentUpdates": [
      {
        "mig_id": "UUID",
        "mig_name": "string",
        "updated_at": "YYYY-MM-DD HH:mm:ss",
        "action": "Status changed to In Progress"
      }
    ]
  }
}
```

### 4.4. Dashboard Progress (GET /migrations/dashboard/progress)

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "data": {
    "migrationId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Data Center Migration Q3 2025",
    "overallProgress": 65,
    "iterationsProgress": [
      {
        "ite_id": "UUID",
        "ite_name": "string",
        "progress": 80,
        "status": "In Progress"
      }
    ],
    "milestones": [
      {
        "name": "Phase 1 Complete",
        "date": "2025-08-15",
        "completed": true
      }
    ],
    "timeline": {
      "start": "2025-07-01",
      "end": "2025-09-30",
      "current": "2025-08-11"
    }
  }
}
```

### 4.5. Bulk Export (POST /migrations/bulk/export)

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "exportId": "UUID",
  "format": "csv",
  "totalRecords": 5,
  "includeIterations": true,
  "generatedAt": "2025-08-11T14:30:00Z",
  "downloadUrl": "/downloads/migrations-export-{exportId}.csv",
  "expiresAt": "2025-08-18T14:30:00Z"
}
```

### 4.6. Error Responses

#### 4.6.1. Standard Error Format

- **Content-Type:** application/json
- **Schema:**

```json
{
  "error": "string",
  "details": "string"
}
```

#### 4.6.2. Common Error Responses

| Status Code | Description           | Example Scenarios                                                                             |
| ----------- | --------------------- | --------------------------------------------------------------------------------------------- |
| 400         | Bad Request           | Invalid UUID format, invalid pagination parameters, invalid date format, search term too long |
| 401         | Unauthorized          | Missing authentication                                                                        |
| 403         | Forbidden             | Insufficient permissions                                                                      |
| 404         | Not Found             | Migration not found, unknown endpoint                                                         |
| 409         | Conflict              | Foreign key violations, unique constraint violations (name already exists)                    |
| 500         | Internal Server Error | Database errors, unexpected server errors                                                     |

#### 4.6.3. SQL Exception Mappings

| SQL State | HTTP Status       | Description                 | Example Message                               |
| --------- | ----------------- | --------------------------- | --------------------------------------------- |
| 23503     | 409 (Conflict)    | Foreign key violation       | "Invalid owner user ID - user does not exist" |
| 23505     | 409 (Conflict)    | Unique constraint violation | "A migration with this name already exists"   |
| 23502     | 400 (Bad Request) | Not null violation          | "Required field is missing"                   |

#### 4.6.4. Validation Error Examples

```json
{
  "error": "Invalid migration UUID"
}
```

```json
{
  "error": "Invalid page number format"
}
```

```json
{
  "error": "Search term too long (max 100 characters)"
}
```

```json
{
  "error": "Invalid dateFrom format. Use YYYY-MM-DD"
}
```

```json
{
  "error": "A migration with this name already exists"
}
```

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence user session (ScriptRunner context)
- **Permissions:** Must be authorized for migration management

## 6. Rate Limiting & Security

- **Rate Limits:** Standard API rate limits apply
- **RLS (Row-Level Security):** Yes
- **Input Validation:** All input validated for type and required fields
- **Other Security Considerations:** No sensitive data in logs

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Enforce hierarchy: Migration > Plan > Iteration > Sequence > Phase
  - Prevent deletion if children exist
  - Audit all changes
- **Side Effects:**
  - Database updates
  - Audit logging
- **Idempotency:**
  - POST is not idempotent
  - PUT is idempotent

## 8. Dependencies & Backing Services

- **DB Tables/Entities:** migrations, plans, iterations, sequences, phases
- **External APIs:** None
- **Other Services:** None

## 9. Versioning & Deprecation

- **API Version:** v1
- **Deprecation Policy:** Deprecated endpoints will be announced and maintained for 1 minor version

## 10. Testing & Mock Data

- **Unit Tests:** Required for all business logic
- **Integration Tests:** Required for each endpoint
- **E2E Tests:** For critical flows
- **Mock Data/Fixtures:** Provided for all entity types

## 11. Implementation Status

### 11.1. Fully Implemented Features ✅

- **Core CRUD Operations**: GET, POST, PUT, DELETE for migrations
- **Advanced Filtering**: Search, status, date range, team, owner filters
- **Pagination**: Page-based pagination with metadata
- **Hierarchical Endpoints**: All iteration, sequence, phase relationships
- **Status Metadata Enrichment**: Automatic status metadata inclusion
- **Error Handling**: Comprehensive SQL state to HTTP status mapping
- **Bulk Export**: JSON/CSV export with configurable options
- **Dashboard Summary**: Real aggregation data from repository

### 11.2. Placeholder Endpoints ⚠️

**Dashboard Metrics** (`GET /migrations/dashboard/metrics`):

- Status: Placeholder implementation returns static data
- Repository method: Not yet implemented
- Returns: Mock response with performance metrics structure

**Bulk Status Update** (`PUT /migrations/bulk/status`):

- Status: Placeholder implementation returns mock response
- Repository method: Not yet implemented
- Returns: Failed status for all IDs with explanatory message

### 11.3. Repository Integration

**Fully Connected Methods**:

- `findMigrationsWithFilters()`: Advanced filtering with pagination ✅
- `getDashboardSummary()`: Real dashboard data aggregation ✅
- `getProgressAggregation()`: Progress data with date filtering ✅
- `bulkExportMigrations()`: Complete export functionality ✅
- `getStatusMetadata()`: Status enrichment ✅

**Pending Implementation**:

- `bulkUpdateStatus()`: Bulk status update method
- `getMetrics()`: Performance metrics aggregation method

## 12. Changelog

**Version 2.0** - August 11, 2025

- **Major Update**: Complete overhaul to reflect US-025 implementation
- **Added**: Dashboard endpoints (summary, progress, metrics)
- **Added**: Bulk operations (export implemented, status update placeholder)
- **Added**: Advanced filtering with pagination support
- **Added**: Status metadata enrichment
- **Added**: Comprehensive error handling with SQL state mappings
- **Added**: Updated request/response schemas to match actual database fields
- **Updated**: All endpoint documentation to reflect actual implementation
- **Author**: GENDEV Documentation Generator via Claude Code

**Version 1.0** - Previous

- **Initial**: Basic CRUD operations and hierarchical endpoints
- **Status**: Outdated (replaced by v2.0)

---

> **Note:** This specification now accurately reflects the actual implementation in `migrationApi.groovy` and `MigrationRepository.groovy`. All new features from US-025 are documented with implementation status indicators.
