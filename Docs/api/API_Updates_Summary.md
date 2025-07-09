# API Documentation Updates Summary

## Overview
Updated UMIG API documentation to reflect the new hierarchical filtering capabilities for Teams and Labels APIs.

## Changes Made

### 1. OpenAPI Specification (`openapi.yaml`)

#### Teams API Updates
- **Enhanced `/teams` endpoint** with hierarchical filtering query parameters:
  - `migrationId` - Filter teams by migration ID
  - `iterationId` - Filter teams by iteration ID  
  - `planId` - Filter teams by plan instance ID
  - `sequenceId` - Filter teams by sequence instance ID
  - `phaseId` - Filter teams by phase instance ID
- **Updated description** to reflect hierarchical filtering capability
- **Added 400 Bad Request** response for invalid UUID formats

#### Labels API Addition
- **Added new `/labels` endpoint** with full hierarchical filtering support
- **Created Label schema** with properties: id, name, description, color
- **Added Labels tag** to API categorization
- **Same query parameters** as Teams API for consistency

### 2. Individual API Specifications

#### Teams API (`TeamsAPI.md`)
- **Comprehensive specification** following the project template
- **Detailed query parameters** documentation
- **Request/response examples** with actual data
- **Error handling** documentation with specific error codes
- **Database relationships** explanation
- **Business logic** documentation including progressive filtering

#### Labels API (`LabelsAPI.md`)
- **Complete specification** for new Labels API
- **Detailed explanation** of STI→STM→Labels relationship path
- **Progressive filtering** documentation
- **Authentication and security** requirements
- **Database dependencies** comprehensive list

### 3. Documentation Index (`README.md`)
- **Added API Specifications section** with links to individual docs
- **Hierarchical Filtering explanation** with level-by-level breakdown
- **Progressive filtering** concept documentation
- **Cross-references** to related APIs

## Key Features Documented

### Hierarchical Filtering
- **Migration Level**: Shows teams/labels involved in entire migration
- **Iteration Level**: Shows teams/labels involved in specific iteration
- **Plan Level**: Shows teams/labels involved in specific plan instance
- **Sequence Level**: Shows teams/labels involved in specific sequence instance
- **Phase Level**: Shows teams/labels involved in specific phase instance

### Progressive Filtering Results
- **Teams**: 18 → 18 → 18 → 12 → 5 (migration to phase level)
- **Labels**: 24 → 19 → 19 → 19 → 4 → 2 (total to phase level)

### Database Relationships
- **Teams**: Uses `steps_master_stm_x_teams_tms_impacted` for team-step relationships
- **Labels**: Uses `labels_lbl_x_steps_master_stm` for label-step relationships
- **Instance Handling**: Properly documented instance→master table relationships

## Technical Details

### Field Mapping
- **Teams**: `tms_id` → `id`, `tms_name` → `name`
- **Labels**: `lbl_id` → `id`, `lbl_name` → `name`

### Error Handling
- **400 Bad Request**: Invalid UUID format
- **404 Not Found**: Entity not found
- **409 Conflict**: Resource conflict (teams only)
- **500 Internal Server Error**: Database errors

### Security
- **Authentication**: Confluence Basic Authentication
- **Authorization**: confluence-users, confluence-administrators
- **Input Validation**: UUID format validation
- **SQL Injection Prevention**: Parameterized queries

## Files Created/Updated

### Created
- `/docs/api/TeamsAPI.md` - Teams API specification
- `/docs/api/LabelsAPI.md` - Labels API specification
- `/docs/api/API_Updates_Summary.md` - This summary

### Updated
- `/docs/api/openapi.yaml` - OpenAPI specification
- `/docs/api/README.md` - API documentation index

## Validation
- ✅ **OpenAPI YAML syntax** validated successfully
- ✅ **Schema consistency** verified
- ✅ **Cross-references** validated
- ✅ **Documentation completeness** confirmed

## Next Steps
- Consider documenting remaining APIs (Migrations, Users, StepView)
- Update Postman collection to reflect new query parameters
- Add integration tests for hierarchical filtering
- Consider API versioning strategy for future changes

---

**Last Updated:** 2025-07-09  
**Author:** Claude AI Assistant