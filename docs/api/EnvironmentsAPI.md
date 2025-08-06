# Environments API Documentation

## Overview

The Environments API provides comprehensive management of environments and their associations with applications and iterations. This API follows the established v2 patterns with robust error handling and hierarchical relationships.

## Endpoints

### 1. List All Environments
**GET** `/rest/scriptrunner/latest/custom/environments`

Returns all environments with associated application and iteration counts. Supports pagination, sorting, and search for the admin GUI.

**Query Parameters:**
- `page` (optional): Page number for pagination (minimum: 1)
- `size` (optional): Page size for pagination (1-1000)
- `search` (optional): Search term to filter environments
- `sort` (optional): Field to sort by
- `direction` (optional): Sort direction (`asc` or `desc`)

**Response:** Array of `EnvironmentWithCounts` or `PaginatedEnvironments`

### 2. Get Environment Roles
**GET** `/rest/scriptrunner/latest/custom/environments/roles`

Returns all available environment roles (e.g., SOURCE, TARGET).

**Response:** Array of `EnvironmentRole`

### 3. Get Environment by ID
**GET** `/rest/scriptrunner/latest/custom/environments/{id}`

Returns a single environment with full details including associated applications and iterations.

**Path Parameters:**
- `id`: Environment ID (integer)

**Response:** `EnvironmentDetails`

### 4. Create Environment
**POST** `/rest/scriptrunner/latest/custom/environments`

Creates a new environment.

**Request Body:** `EnvironmentCreateRequest`
```json
{
  "env_code": "DEV",
  "env_name": "Development Environment",
  "env_description": "Primary development environment"
}
```

**Response:** `Environment` (201 Created)

### 5. Update Environment
**PUT** `/rest/scriptrunner/latest/custom/environments/{id}`

Updates an existing environment.

**Path Parameters:**
- `id`: Environment ID (integer)

**Request Body:** `EnvironmentCreateRequest`

**Response:** `EnvironmentDetails` (200 OK)

### 6. Delete Environment
**DELETE** `/rest/scriptrunner/latest/custom/environments/{id}`

Deletes an environment. Will fail if the environment has existing relationships.

**Path Parameters:**
- `id`: Environment ID (integer)

**Response:** 204 No Content or 409 Conflict with `BlockingRelationshipsError`

### 7. Get Environment Iterations by Role
**GET** `/rest/scriptrunner/latest/custom/environments/{id}/iterations`

Returns iterations associated with an environment, grouped by their environment role.

**Path Parameters:**
- `id`: Environment ID (integer)

**Response:** Object with role names as keys and `RoleIterations` as values

### 8. Associate Application
**POST** `/rest/scriptrunner/latest/custom/environments/{id}/applications/{appId}`

Creates an association between an environment and an application.

**Path Parameters:**
- `id`: Environment ID (integer)
- `appId`: Application ID (integer)

**Response:** `SuccessMessage` (200 OK)

### 9. Remove Application Association
**DELETE** `/rest/scriptrunner/latest/custom/environments/{id}/applications/{appId}`

Removes the association between an environment and an application.

**Path Parameters:**
- `id`: Environment ID (integer)
- `appId`: Application ID (integer)

**Response:** 204 No Content

### 10. Associate Iteration
**POST** `/rest/scriptrunner/latest/custom/environments/{id}/iterations/{iteId}`

Creates an association between an environment and an iteration with a specific role.

**Path Parameters:**
- `id`: Environment ID (integer)
- `iteId`: Iteration ID (UUID)

**Request Body:**
```json
{
  "enr_id": 1
}
```

**Response:** `SuccessMessage` (200 OK)

### 11. Remove Iteration Association
**DELETE** `/rest/scriptrunner/latest/custom/environments/{id}/iterations/{iteId}`

Removes the association between an environment and an iteration.

**Path Parameters:**
- `id`: Environment ID (integer)
- `iteId`: Iteration ID (UUID)

**Response:** 204 No Content

## Error Handling

The API follows standard HTTP status codes and returns detailed error messages:

- **400 Bad Request**: Invalid input parameters or type errors
- **404 Not Found**: Resource not found
- **409 Conflict**: Operation conflicts with existing data (e.g., duplicate entries, deletion blocked by relationships)
- **500 Internal Server Error**: Unexpected server errors

### Blocking Relationships Error

When attempting to delete an environment that has existing relationships:

```json
{
  "error": "Cannot delete environment with ID 1 due to existing relationships",
  "blocking_relationships": {
    "applications": [
      {"app_id": 1, "app_name": "Application 1"}
    ],
    "iterations": [
      {"ite_id": "uuid-here", "ite_name": "Iteration 1"}
    ]
  }
}
```

## Implementation Details

- **Repository**: `EnvironmentRepository.groovy` handles all database operations
- **API**: `EnvironmentsApi.groovy` implements REST endpoints following v2 patterns
- **Type Safety**: All UUID and integer parameters use explicit casting
- **Relationships**: Many-to-many relationships with applications and iterations
- **Roles**: Iterations are associated with environments through specific roles

## Related Tables

- `environments_env`: Main environments table
- `environment_roles_enr`: Environment role definitions
- `environments_env_x_applications_app`: Environment-application associations
- `environments_env_x_iterations_ite`: Environment-iteration associations with roles