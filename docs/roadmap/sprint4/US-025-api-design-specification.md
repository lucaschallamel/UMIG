# US-025: MigrationsAPI Design Specification

## API Design Overview

Based on Sprint 3 patterns analysis, this specification defines the modernized MigrationsAPI endpoints following consistent patterns established in TeamsApi.

## Core Endpoint Structure

### GET /migrations - List migrations with filtering

```
Query Parameters:
- page: Page number (default: 1, min: 1)
- size: Page size (default: 50, min: 1, max: 100)
- search: Search term for name/description (max 100 chars)
- sort: Sort field (mig_name, mig_status, created_at, updated_at, mig_start_date, mig_end_date)
- direction: Sort direction (asc/desc, default: asc)
- status: Filter by status (single or comma-separated)
- dateFrom: Filter start date (ISO format)
- dateTo: Filter end date (ISO format)
- teamId: Filter by assigned team
- ownerId: Filter by owner user ID
```

### GET /migrations/{id} - Single migration

```
Path: /migrations/{migrationId}
Response: Full migration details with statusMetadata
```

### POST /migrations - Create migration

```
Body: Migration creation data
Response: 201 Created with full migration object
Error handling: 400 for validation, 409 for conflicts
```

### PUT /migrations/{id} - Update migration

```
Path: /migrations/{migrationId}
Body: Migration update data
Response: 200 OK with updated migration object
Error handling: 400, 404, 409
```

### DELETE /migrations/{id} - Delete migration

```
Path: /migrations/{migrationId}
Response: 204 No Content
Error handling: 404, 409 for referential integrity
```

## Dashboard Endpoints

### GET /migrations/dashboard/summary - Dashboard summary

```
Response: {
  totalMigrations: number,
  byStatus: {statusName: count},
  upcomingDeadlines: [migration],
  recentUpdates: [migration]
}
```

### GET /migrations/dashboard/progress - Progress aggregation

```
Query Parameters:
- migrationId: Specific migration (optional)
- dateFrom/dateTo: Date range filter

Response: {
  migrationId: UUID,
  name: string,
  overallProgress: percentage,
  iterationsProgress: [iteration],
  milestones: [milestone],
  timeline: {start, end, current}
}
```

### GET /migrations/dashboard/metrics - Performance metrics

```
Query Parameters:
- period: day/week/month/quarter
- migrationId: Optional filter

Response: {
  period: string,
  completionRate: percentage,
  avgDuration: days,
  statusDistribution: {status: count},
  trends: [metric]
}
```

## Bulk Operations

### PUT /migrations/bulk/status - Bulk status update

```
Body: {
  migrationIds: [UUID],
  newStatus: string,
  reason: string (optional)
}
Response: {
  updated: [migrationId],
  failed: [{migrationId, error}],
  summary: {total, updated, failed}
}
```

### POST /migrations/bulk/export - Bulk export

```
Body: {
  migrationIds: [UUID],
  format: 'json'|'csv',
  includeIterations: boolean
}
Response: Export data or download link
```

## Error Response Standards

Following TeamsApi patterns:

```json
{
  "error": "Descriptive error message",
  "details": "Additional context when helpful",
  "field": "fieldName for validation errors"
}
```

HTTP Status Codes:

- 200: Success
- 201: Created
- 204: No Content (delete)
- 400: Bad Request (validation, invalid UUID)
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict (unique constraints, referential integrity)
- 500: Internal Server Error

## Response Format Standards

### Migration Object

```json
{
  "id": "UUID",
  "usr_id_owner": "integer",
  "name": "string",
  "description": "string",
  "status": "string",
  "type": "string",
  "startDate": "ISO date",
  "endDate": "ISO date",
  "businessCutoverDate": "ISO date",
  "createdBy": "string",
  "createdAt": "ISO datetime",
  "updatedBy": "string",
  "updatedAt": "ISO datetime",
  "statusMetadata": {
    "id": "integer",
    "name": "string",
    "color": "string",
    "type": "string"
  }
}
```

### Paginated Response

```json
{
  "data": [migration],
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

## Hierarchical Relationships

Maintain existing hierarchical endpoints but optimize:

```
GET /migrations/{id}/iterations
GET /migrations/{id}/iterations/{iteId}/plan-instances
GET /migrations/{id}/iterations/{iteId}/sequences
GET /migrations/{id}/iterations/{iteId}/phases
```

## Validation Rules

1. **UUID Validation**: All ID parameters must be valid UUIDs
2. **Pagination**: page ≥ 1, size 1-100
3. **Search**: Max 100 characters, SQL injection protection
4. **Date Filters**: Valid ISO format, logical date ranges
5. **Sort Fields**: Whitelist of allowed fields only
6. **Status Values**: Must exist in status_sts table

## Performance Considerations

1. **Indexing**: Ensure indexes on commonly filtered fields
2. **Pagination**: Use LIMIT/OFFSET with total count optimization
3. **Search**: Full-text search on name/description fields
4. **Caching**: Consider caching for dashboard aggregations
5. **Query Optimization**: Minimize N+1 queries in hierarchical data

## Security Considerations

1. **Authorization**: Confluence users/administrators groups
2. **Input Validation**: Sanitize all user input
3. **SQL Injection**: Use parameterized queries only
4. **Rate Limiting**: Consider for bulk operations
5. **Audit Logging**: Track all modification operations

---

**Created**: August 11, 2025  
**Updated**: August 11, 2025  
**Status**: Phase 1 - API Design Specification  
**Next**: Data model enhancement planning
