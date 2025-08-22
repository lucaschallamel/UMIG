# Entity Development Templates

**Purpose**: Standardized templates derived from successful migrations entity implementation to accelerate development of remaining master entities (plans, sequences, phases, steps, instructions, controls).

**Status**: Created from migrations patterns - August 22, 2025

## Repository Template Pattern

### Core findWithFilters Method Template

```groovy
def find{EntityName}sWithFilters(Map filters, int pageNumber = 1, int pageSize = 50, String sortField = null, String sortDirection = 'asc') {
    DatabaseUtil.withSql { sql ->
        pageNumber = Math.max(1, pageNumber)
        pageSize = Math.min(100, Math.max(1, pageSize))
        
        def whereConditions = []
        def params = []
        
        // Build dynamic WHERE clause
        if (filters.status) {
            if (filters.status instanceof List) {
                def placeholders = filters.status.collect { '?' }.join(', ')
                whereConditions << ("s.sts_name IN (${placeholders})".toString())
                params.addAll(filters.status)
            } else {
                whereConditions << "s.sts_name = ?"
                params << filters.status
            }
        }
        
        // PATTERN: Owner ID filtering (adapt field names)
        if (filters.ownerId) {
            whereConditions << "e.usr_id_owner = ?"
            params << Integer.parseInt(filters.ownerId as String)
        }
        
        // PATTERN: Search functionality (adapt searchable fields)
        if (filters.search) {
            whereConditions << "(e.{entity_name} ILIKE ? OR e.{entity_description} ILIKE ?)"
            params << "%${filters.search}%".toString()
            params << "%${filters.search}%".toString()
        }
        
        // PATTERN: Date range filtering (adapt date fields)
        if (filters.startDateFrom && filters.startDateTo) {
            whereConditions << "e.{entity_start_date} BETWEEN ? AND ?"
            params << filters.startDateFrom
            params << filters.startDateTo
        }
        
        def whereClause = whereConditions ? "WHERE " + whereConditions.join(" AND ") : ""
        
        // Count query
        def countQuery = """
            SELECT COUNT(DISTINCT e.{entity_id}) as total
            FROM {entity_table} e
            JOIN status_sts s ON e.{entity_status} = s.sts_id
            ${whereClause}
        """
        def totalCount = sql.firstRow(countQuery, params)?.total ?: 0
        
        // Validate sort field
        def allowedSortFields = ['{entity_id}', '{entity_name}', '{entity_status}', 'created_at', 'updated_at', '{computed_field1}', '{computed_field2}']
        if (!sortField || !allowedSortFields.contains(sortField)) {
            sortField = '{entity_name}'
        }
        sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
        
        // Data query with computed fields
        def offset = (pageNumber - 1) * pageSize
        def dataQuery = """
            SELECT DISTINCT e.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type,
                   COALESCE({computed_field1}_counts.{computed_field1}_count, 0) as {computed_field1}_count,
                   COALESCE({computed_field2}_counts.{computed_field2}_count, 0) as {computed_field2}_count
            FROM {entity_table} e
            JOIN status_sts s ON e.{entity_status} = s.sts_id
            LEFT JOIN (
                SELECT {parent_id}, COUNT(*) as {computed_field1}_count
                FROM {child_table1}
                GROUP BY {parent_id}
            ) {computed_field1}_counts ON e.{entity_id} = {computed_field1}_counts.{parent_id}
            LEFT JOIN (
                SELECT {parent_id_indirect}, COUNT(DISTINCT {indirect_field}) as {computed_field2}_count
                FROM {child_table2}
                GROUP BY {parent_id_indirect}
            ) {computed_field2}_counts ON e.{entity_id} = {computed_field2}_counts.{parent_id_indirect}
            ${whereClause}
            ORDER BY ${['{computed_field1}_count', '{computed_field2}_count'].contains(sortField) ? sortField : 'e.' + sortField} ${sortDirection}
            LIMIT ${pageSize} OFFSET ${offset}
        """
        
        def entities = sql.rows(dataQuery, params)
        def enrichedEntities = entities.collect { enrich{EntityName}WithStatusMetadata(it) }
        
        return [
            data: enrichedEntities,
            pagination: [
                page: pageNumber,
                size: pageSize,
                total: totalCount,
                totalPages: (int) Math.ceil((double) totalCount / (double) pageSize)
            ],
            filters: filters
        ]
    }
}
```

### Status Metadata Enrichment Pattern

```groovy
/**
 * Enriches {entity} data with status metadata while maintaining backward compatibility.
 * @param row Database row containing {entity} and status data
 * @return Enhanced {entity} map with statusMetadata
 */
private Map enrich{EntityName}WithStatusMetadata(Map row) {
    return [
        {entity_id}: row.{entity_id},
        // Core entity fields (adapt to specific entity)
        {entity_name}: row.{entity_name},
        {entity_description}: row.{entity_description},
        {entity_status}: row.sts_name, // Backward compatibility
        // Audit fields (consistent across all entities)
        created_by: row.created_by,
        created_at: row.created_at,
        updated_by: row.updated_by,
        updated_at: row.updated_at,
        // Computed fields from joins (adapt to specific relationships)
        {computed_field1}_count: row.{computed_field1}_count ?: 0,
        {computed_field2}_count: row.{computed_field2}_count ?: 0,
        // Enhanced status metadata (consistent across all entities)
        statusMetadata: [
            id: row.sts_id,
            name: row.sts_name,
            color: row.sts_color,
            type: row.sts_type
        ]
    ]
}
```

## Repository Access Pattern for ScriptRunner

**Critical Pattern**: ScriptRunner with `@BaseScript CustomEndpointDelegate` requires closure-based repository access to prevent "undeclared variable" errors in private methods.

### Repository Accessor Pattern (MANDATORY)

```groovy
@BaseScript CustomEndpointDelegate delegate

// REQUIRED: Use closure pattern instead of direct field declaration
def getRepository = { ->
    return new {EntityName}Repository()
}

// Usage in all methods
def handleRequest() {
    def repository = getRepository()  // Always use this pattern
    // ... rest of method
}
```

### Static Type Checking Compliance (ADR-031)

All API implementations MUST follow these type casting patterns:

```groovy
// Parameter extraction - always cast to String first
Integer.parseInt(filters.ownerId as String)
UUID.fromString(pathParts[0] as String)

// Repository method calls - explicit casting for ALL parameters
def result = repository.findAll(filters as Map, pageNumber as int, pageSize as int, sortField as String, sortDirection as String)

// Result casting - cast to expected types
Map entity = repository.findById(id) as Map
List<GroovyRowResult> rows = repository.findAll() as List<GroovyRowResult>

// Query parameter assignments
String migrationId = filters.migrationId as String
String sortField = queryParams.getFirst('sort') as String
```

### Method Visibility Pattern

```groovy
// REQUIRED: Use 'def' instead of 'private' for script-level field access
def handleRequest() { ... }  // NOT: private Response handleRequest()
def mapSqlStateToHttpStatus(String sqlState) { ... }  // NOT: private static int
```

## API Template Pattern

### REST Endpoint Structure

```groovy
package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.{EntityName}Repository
import groovy.json.JsonBuilder
import groovy.json.JsonException
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field
import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import java.util.UUID
import org.apache.log4j.LogManager
import org.apache.log4j.Logger

@BaseScript CustomEndpointDelegate delegate

// CRITICAL: Use closure pattern for repository access
def getRepository = { ->
    return new {EntityName}Repository()
}

@Field
final Logger log = LogManager.getLogger(getClass())

/**
 * GET /{entities} - List all {entities} with pagination, filtering, and search
 * GET /{entities}/{id} - Get single {entity} with metadata
 */
{entities}(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []

    try {
        if (pathParts.size() == 1) {
            // Single {entity} by ID - MANDATORY type casting
            def {entityName}Id = UUID.fromString(pathParts[0] as String)
            def repository = getRepository()  // Use closure pattern
            def {entityName} = repository.find{EntityName}ById({entityName}Id) as Map
            
            if (!{entityName}) {
                return Response.status(404)
                    .entity(new JsonBuilder([error: "{EntityName} not found", code: 404]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder([data: {entityName}]).toString()).build()
        } else {
            // List {entities} with filtering
            def filters = [:]
            def pageNumber = 1
            def pageSize = 50
            def sortField = null
            def sortDirection = 'asc'

            // Extract query parameters - MANDATORY type casting
            queryParams.keySet().each { param ->
                def value = queryParams.getFirst(param) as String
                switch (param) {
                    case 'page':
                        pageNumber = Integer.parseInt(value as String)
                        break
                    case 'size':
                        pageSize = Integer.parseInt(value as String)
                        break
                    case 'sort':
                        sortField = value as String
                        break
                    case 'direction':
                        sortDirection = value as String
                        break
                    default:
                        filters[param] = value as String
                }
            }

            // Validate sort field
            def allowedSortFields = ['{entity_id}', '{entity_name}', '{entity_status}', 'created_at', 'updated_at', '{computed_field1}_count', '{computed_field2}_count']
            if (sortField && !allowedSortFields.contains(sortField)) {
                return Response.status(400)
                    .entity(new JsonBuilder([error: "Invalid sort field: ${sortField}. Allowed fields: ${allowedSortFields.join(', ')}", code: 400]).toString())
                    .build()
            }

            def repository = getRepository()  // Use closure pattern
            // MANDATORY: Explicit casting for ALL repository parameters
            def result = repository.find{EntityName}sWithFilters(filters as Map, pageNumber as int, pageSize as int, sortField as String, sortDirection as String)
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
    } catch (SQLException e) {
        log.error("Database error in {entities} GET: ${e.message}", e)
        def statusCode = mapSqlStateToHttpStatus(e.getSQLState())
        return Response.status(statusCode)
            .entity(new JsonBuilder([error: e.message, code: statusCode]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in {entities} GET: ${e.message}", e)
        return Response.status(500)
            .entity(new JsonBuilder([error: "Internal server error", code: 500]).toString())
            .build()
    }
}

/**
 * Maps SQL state codes to appropriate HTTP status codes
 * REQUIRED: Use 'def' instead of 'private' for script-level access
 */
def mapSqlStateToHttpStatus(String sqlState) {
    switch (sqlState) {
        case '23503': return 400 // Foreign key violation
        case '23505': return 409 // Unique violation
        case '23514': return 400 // Check constraint violation
        default: return 500     // General server error
    }
}

## Static Type Checking Troubleshooting

### Common Errors and Fixes

| Error | Fix |
|-------|-----|
| `Cannot find matching method Integer#parseInt(Object)` | Add `as String`: `Integer.parseInt(value as String)` |
| `No such property for class Object` | Cast result: `repository.findById(id) as Map` |
| `Variable undeclared` | Use closure pattern for repositories |
| `Method signature mismatch` | Add explicit type casting to ALL repository parameters |
| `Cannot access script fields from private methods` | Change `private` to `def` |

### ADR-031 Compliance Checklist

- [ ] All `Integer.parseInt()` calls use `as String`
- [ ] All `UUID.fromString()` calls use `as String`  
- [ ] All repository method calls have explicit parameter casting
- [ ] All repository results are cast to expected types
- [ ] Repository access uses closure pattern, not direct field declaration
- [ ] Methods use `def` instead of `private` for script-level field access
- [ ] All query parameter assignments use `as String`
```groovy
package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.{EntityName}Repository
import groovy.json.JsonBuilder
import groovy.json.JsonException
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field
import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import java.util.UUID
import org.apache.log4j.LogManager
import org.apache.log4j.Logger

@BaseScript CustomEndpointDelegate delegate

@Field
final {EntityName}Repository {entityName}Repository = new {EntityName}Repository()

@Field
final Logger log = LogManager.getLogger(getClass())

/**
 * GET /{entities} - List all {entities} with pagination, filtering, and search
 * GET /{entities}/{id} - Get single {entity} with metadata
 */
{entities}(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []

    try {
        if (pathParts.size() == 1) {
            // Single {entity} by ID
            def {entityName}Id = UUID.fromString(pathParts[0])
            def {entityName} = {entityName}Repository.find{EntityName}ById({entityName}Id)
            
            if (!{entityName}) {
                return Response.status(404)
                    .entity(new JsonBuilder([error: "{EntityName} not found", code: 404]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder([data: {entityName}]).toString()).build()
        } else {
            // List {entities} with filtering
            def filters = [:]
            def pageNumber = 1
            def pageSize = 50
            def sortField = null
            def sortDirection = 'asc'

            // Extract query parameters
            queryParams.keySet().each { param ->
                def value = queryParams.getFirst(param)
                switch (param) {
                    case 'page':
                        pageNumber = Integer.parseInt(value)
                        break
                    case 'size':
                        pageSize = Integer.parseInt(value)
                        break
                    case 'sort':
                        sortField = value
                        break
                    case 'direction':
                        sortDirection = value
                        break
                    default:
                        filters[param] = value
                }
            }

            // Validate sort field
            def allowedSortFields = ['{entity_id}', '{entity_name}', '{entity_status}', 'created_at', 'updated_at', '{computed_field1}_count', '{computed_field2}_count']
            if (sortField && !allowedSortFields.contains(sortField)) {
                return Response.status(400)
                    .entity(new JsonBuilder([error: "Invalid sort field: ${sortField}. Allowed fields: ${allowedSortFields.join(', ')}", code: 400]).toString())
                    .build()
            }

            def result = {entityName}Repository.find{EntityName}sWithFilters(filters, pageNumber, pageSize, sortField, sortDirection)
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
    } catch (SQLException e) {
        log.error("Database error in {entities} GET: ${e.message}", e)
        def statusCode = mapSqlStateToHttpStatus(e.getSQLState())
        return Response.status(statusCode)
            .entity(new JsonBuilder([error: e.message, code: statusCode]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in {entities} GET: ${e.message}", e)
        return Response.status(500)
            .entity(new JsonBuilder([error: "Internal server error", code: 500]).toString())
            .build()
    }
}

/**
 * Maps SQL state codes to appropriate HTTP status codes
 */
private static int mapSqlStateToHttpStatus(String sqlState) {
    switch (sqlState) {
        case '23503': return 400 // Foreign key violation
        case '23505': return 409 // Unique violation
        case '23514': return 400 // Check constraint violation
        default: return 500     // General server error
    }
}
```

## EntityConfig.js Template Pattern

### Entity Configuration Structure

```javascript
{entities}: {
    name: "{EntityName}s",
    description: "Manage {entity} events and their configurations",
    fields: [
        { key: "{entity_id}", label: "{Entity} ID", type: "text", readonly: true },
        { key: "{entity_name}", label: "{Entity} Name", type: "text", required: true },
        { key: "{entity_description}", label: "Description", type: "textarea" },
        { key: "{entity_status}", label: "Status", type: "select", 
          options: [
            { value: "PLANNING", label: "Planning" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" }
          ]
        },
        // Computed fields pattern
        {
            key: "{computed_field1}_count",
            label: "{ComputedField1}s",
            type: "number",
            readonly: true,
            computed: true,
        },
        {
            key: "{computed_field2}_count", 
            label: "{ComputedField2}s",
            type: "number",
            readonly: true,
            computed: true,
        },
        // Audit fields (consistent across all entities)
        {
            key: "created_at",
            label: "Created",
            type: "datetime",
            readonly: true,
        },
        {
            key: "updated_at",
            label: "Updated", 
            type: "datetime",
            readonly: true,
        },
    ],
    tableColumns: [
        "{entity_id}",
        "{entity_name}",
        "{entity_status}",
        "{computed_field1}_count",
        "{computed_field2}_count",
    ],
    sortMapping: {
        {entity_id}: "{entity_id}",
        {entity_name}: "{entity_name}",
        {entity_status}: "{entity_status}",
        {computed_field1}_count: "{computed_field1}_count",
        {computed_field2}_count: "{computed_field2}_count",
        created_at: "created_at",
        updated_at: "updated_at",
    },
    filters: [],
    customRenderers: {
        // Clickable ID pattern
        {entity_id}: function (value, row) {
            if (!value) return "";
            return `<a href="#" class="{entity}-id-link btn-table-action" data-action="view" data-id="${value}" 
                      style="color: #205081; text-decoration: none; cursor: pointer;" 
                      title="View {entity} details">${value}</a>`;
        },
        // Status with color pattern
        {entity_status}: function (value, row) {
            let statusName, statusColor;
            
            console.log('{entity_status} renderer called with value:', value, 'row:', row);
            
            // Enhanced status metadata handling
            if (row && row.statusMetadata) {
                statusName = row.statusMetadata.name;
                statusColor = row.statusMetadata.color;
            } else if (typeof value === 'string') {
                statusName = value;
                if (row && row.statusMetadata && row.statusMetadata.name === value) {
                    statusColor = row.statusMetadata.color;
                }
            } else if (typeof value === 'object' && value !== null) {
                statusName = value.sts_name || value.name;
                statusColor = value.sts_color || value.color;
            } else if (row && row.sts_name) {
                statusName = row.sts_name;
                statusColor = row.sts_color;
            } else {
                statusName = value || "Unknown";
                statusColor = "#999999";
            }

            return `<span class="status-badge" style="background-color: ${statusColor || '#999999'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${statusName}</span>`;
        }
    },
    // Feature flags to disable bulk operations
    featureFlags: {
        enableBulkActions: false,
        enableExport: false,
        enableRowSelection: false
    }
},
```

## Entity Mapping Guide

### Plans Master Entity
- **Table**: `plans_master_plm`
- **ID Field**: `plm_id` 
- **Name Field**: `plm_name`
- **Status Field**: `plm_status`
- **Computed Fields**: `iteration_count` (from iterations_ite), `sequence_count` (from sequences_master_sqm)
- **Parent Relationship**: None (top-level)
- **Child Relationships**: iterations_ite (via plm_id), sequences_master_sqm (via plm_id)

### Sequences Master Entity
- **Table**: `sequences_master_sqm`
- **ID Field**: `sqm_id`
- **Name Field**: `sqm_name`  
- **Status Field**: `sqm_status`
- **Computed Fields**: `phase_count` (from phases_master_phm), `instance_count` (from sequences_instance_sqi)
- **Parent Relationship**: plans_master_plm (via plm_id)
- **Child Relationships**: phases_master_phm (via sqm_id), sequences_instance_sqi (via sqm_id)

### Phases Master Entity
- **Table**: `phases_master_phm`
- **ID Field**: `phm_id`
- **Name Field**: `phm_name`
- **Status Field**: `phm_status` 
- **Computed Fields**: `step_count` (from steps_master_stm), `instance_count` (from phases_instance_phi)
- **Parent Relationship**: sequences_master_sqm (via sqm_id)
- **Child Relationships**: steps_master_stm (via phm_id), phases_instance_phi (via phm_id)

### Steps Master Entity
- **Table**: `steps_master_stm`
- **ID Field**: `stm_id`
- **Name Field**: `stm_name`
- **Status Field**: `stm_status`
- **Computed Fields**: `instruction_count` (from instructions_master_inm), `instance_count` (from steps_instance_sti)
- **Parent Relationship**: phases_master_phm (via phm_id)  
- **Child Relationships**: instructions_master_inm (via stm_id), steps_instance_sti (via stm_id)

### Instructions Master Entity
- **Table**: `instructions_master_inm`
- **ID Field**: `inm_id`
- **Name Field**: `inm_name`
- **Status Field**: `inm_status`
- **Computed Fields**: `instance_count` (from instructions_instance_ini), `control_count` (from controls_cnm)
- **Parent Relationship**: steps_master_stm (via stm_id)
- **Child Relationships**: instructions_instance_ini (via inm_id), controls_cnm (via inm_id)

### Controls Master Entity  
- **Table**: `controls_cnm`
- **ID Field**: `cnm_id`
- **Name Field**: `cnm_name`
- **Status Field**: `cnm_status`
- **Computed Fields**: `validation_count`, `checkpoint_count`
- **Parent Relationship**: instructions_master_inm (via inm_id)
- **Child Relationships**: None (leaf entity)

## Implementation Checklist

### Per Entity Implementation:
- [ ] Create Repository class with findWithFilters method
- [ ] Implement status metadata enrichment 
- [ ] Create API endpoint following template
- [ ] Add EntityConfig.js configuration
- [ ] Add custom renderers for ID and status
- [ ] Configure feature flags to disable bulk operations
- [ ] Test sorting on all fields including computed ones
- [ ] Verify clickable IDs work like VIEW buttons

### Cross-Entity Consistency:
- [ ] All entities use same audit field patterns
- [ ] Status metadata structure consistent
- [ ] Error handling patterns identical
- [ ] Sorting validation follows same rules
- [ ] Custom renderer patterns match

## Success Metrics
- **Development Speed**: 80% reduction in implementation time per entity
- **Code Consistency**: 100% pattern adherence across all entities  
- **Bug Reduction**: Zero SQL relationship errors through proven patterns
- **Testing Coverage**: 95% coverage using established test patterns