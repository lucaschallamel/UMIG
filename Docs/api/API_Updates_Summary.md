# API Updates Summary

This document provides a concise overview of recent API updates and changes to the UMIG API v2.

## Recent Updates

### 2025-07-15: Environments API
- **New API**: Complete environments management system
- **Endpoints Added**:
  - `GET /environments` - List all environments with counts (supports pagination, search, sort)
  - `GET /environments/roles` - Get all environment roles
  - `GET /environments/{id}` - Get environment details
  - `POST /environments` - Create new environment
  - `PUT /environments/{id}` - Update environment
  - `DELETE /environments/{id}` - Delete environment (with blocking relationship checks)
  - `GET /environments/{id}/iterations` - Get iterations grouped by role
  - `POST /environments/{id}/applications/{appId}` - Associate application
  - `DELETE /environments/{id}/applications/{appId}` - Remove application association
  - `POST /environments/{id}/iterations/{iteId}` - Associate iteration with role
  - `DELETE /environments/{id}/iterations/{iteId}` - Remove iteration association
- **Features**:
  - Complete CRUD operations for environments
  - Many-to-many relationship management with applications and iterations
  - Environment role support for iterations
  - Comprehensive error handling with blocking relationship detection
  - Admin GUI integration with counts display
- **Implementation**: See `EnvironmentsApi.groovy` and `EnvironmentRepository.groovy`

### 2025-07-10: Teams API Hierarchical Filtering
- **Endpoint**: `GET /teams`
- **New Feature**: Added hierarchical filtering support
- **Query Parameters Added**:
  - `?migrationId={uuid}` - Filter teams by migration
  - `?iterationId={uuid}` - Filter teams by iteration
  - `?planId={uuid}` - Filter teams by plan instance
  - `?sequenceId={uuid}` - Filter teams by sequence instance
  - `?phaseId={uuid}` - Filter teams by phase instance
- **Implementation**: See `TeamsApi.groovy` for reference implementation
- **Pattern**: Following ADR-030 hierarchical filtering pattern

### 2025-07-10: Labels API Hierarchical Filtering
- **Endpoint**: `GET /labels`
- **New Feature**: Added hierarchical filtering support
- **Query Parameters Added**:
  - `?migrationId={uuid}` - Filter labels by migration
  - `?iterationId={uuid}` - Filter labels by iteration
  - `?planId={uuid}` - Filter labels by plan instance
  - `?sequenceId={uuid}` - Filter labels by sequence instance
  - `?phaseId={uuid}` - Filter labels by phase instance
- **Implementation**: See `LabelsApi.groovy` for reference implementation
- **Pattern**: Following ADR-030 hierarchical filtering pattern

## Technical Standards

### Type Safety (ADR-031)
- **Mandatory**: Explicit casting for all query parameters
- **UUID Parameters**: `UUID.fromString(param as String)`
- **Integer Parameters**: `Integer.parseInt(param as String)`
- **Null Handling**: Check for null before casting

### Error Handling
- **400 Bad Request**: Invalid parameters, type errors, missing required fields
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate entries, deletion blocked by relationships
- **500 Internal Server Error**: Database errors

### Database Access
- **Pattern**: Repository pattern with `DatabaseUtil.withSql`
- **Instance IDs**: Use instance IDs (pli_id, sqi_id, phi_id) for filtering
- **Field Selection**: Include ALL fields referenced in result mapping

## Files Created/Updated

### 2025-07-15 Updates
- **Created**: `/docs/api/EnvironmentsAPI.md` - Environments API specification
- **Created**: `/src/groovy/umig/api/v2/EnvironmentsApi.groovy` - API implementation
- **Created**: `/src/groovy/umig/repository/EnvironmentRepository.groovy` - Data access layer
- **Updated**: `/docs/api/openapi.yaml` - Added Environments endpoints and schemas
- **Updated**: `/docs/api/postman/UMIG_API_V2_Collection.postman_collection.json` - Regenerated

### 2025-07-10 Updates
- **Created**: `/docs/api/TeamsAPI.md` - Teams API specification
- **Created**: `/docs/api/LabelsAPI.md` - Labels API specification
- **Updated**: `/docs/api/openapi.yaml` - OpenAPI specification
- **Updated**: `/docs/api/README.md` - API documentation index

## Validation Checklist
- ✅ **OpenAPI YAML syntax** validated successfully
- ✅ **Schema consistency** verified
- ✅ **Postman collection** regenerated from OpenAPI spec
- ✅ **Documentation completeness** confirmed
- ✅ **Type safety patterns** followed (ADR-031)

## Next Steps
- Consider documenting remaining APIs (Plans, Sequences, Phases, Instructions)
- Add integration tests for new Environments API
- Update developer journal with implementation details
- Review and test all environment management features in admin GUI

---

**Last Updated:** 2025-07-15  
**Author:** Claude AI Assistant