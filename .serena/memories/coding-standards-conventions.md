# UMIG Coding Standards & Conventions

## Database Conventions (ADR-014)
- **Naming**: snake_case with prefixes (tms_ for teams, usr_ for users, etc.)
- **Pattern**: `{entity}_{suffix}_{field}` (e.g., `teams_tms`, `users_usr`)
- **Master/Instance**: `_master_` vs `_instance_` suffixes (e.g., `steps_master_stm`, `steps_instance_sti`)
- **Primary Keys**: UUID with entity prefix (e.g., `stm_id`, `sti_id`)
- **Audit Fields**: created_at, updated_at, created_by, updated_by (ADR-035)

## Database Access Patterns (MANDATORY)
```groovy
// ONLY acceptable pattern - DatabaseUtil.withSql
DatabaseUtil.withSql { sql ->
    return sql.rows('SELECT * FROM table_name WHERE id = :id', [id: id])
}
```

## Type Safety Requirements (ADR-031)
```groovy
// MANDATORY explicit casting for all query parameters
params.migrationId = UUID.fromString(filters.migrationId as String)
params.teamId = Integer.parseInt(filters.teamId as String)
```

## REST API Patterns (ADR-023)
```groovy
@BaseScript CustomEndpointDelegate delegate
entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Repository pattern usage
    return Response.ok(payload).build()
}
```

## Repository Pattern
- All database access through repository classes
- Methods return Maps or Lists of Maps
- Repository methods handle all SQL construction
- APIs call repositories, never direct SQL

## Error Handling
- SQL state mappings: 23503→400 (foreign key), 23505→409 (unique constraint)
- Robust error propagation through all layers
- Consistent error response format

## Security
- Default groups: `["confluence-users"]` for all endpoints
- Admin operations: `["confluence-administrators"]`
- No direct user input in SQL (parameterized queries only)

## Frontend Standards
- Pure vanilla JavaScript (no frameworks)
- AUI components for UI consistency
- Modular structure in `admin-gui/` components
- AJAX polling for real-time updates