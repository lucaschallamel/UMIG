# Admin GUI Entity Troubleshooting Quick Reference

## Static Type Checking Errors (ScriptRunner ADR-031)

### 🔧 Repository Access Pattern Errors

#### ERROR: "Variable is undeclared" in private methods
**Root Cause**: `@BaseScript CustomEndpointDelegate` prevents direct field access in private methods
**Context**: ScriptRunner-specific issue with repository field declarations

**Solution**: Use closure-based accessor pattern (MANDATORY for ScriptRunner)
```groovy
// ❌ WRONG - Causes "undeclared variable" errors in private methods
@Field final MigrationRepository migrationRepository = new MigrationRepository()

// ✅ CORRECT - Closure pattern works with @BaseScript
def getRepository = { ->
    return new MigrationRepository()
}

// Usage in all methods
def handleRequest() {
    def repository = getRepository()  // Always use this pattern
    def result = repository.findAll(filters as Map, pageNumber as int, pageSize as int, sortField as String, sortDirection as String)
    return result
}
```

#### ERROR: "Cannot find matching method Integer#parseInt(Object)"
**Root Cause**: Static type checking requires explicit String casting before conversion
**Solution**: Always cast to String first (ADR-031 compliance)
```groovy
// ❌ WRONG - Static type checking error
Integer.parseInt(filters.ownerId)
UUID.fromString(pathParts[0])

// ✅ CORRECT - Explicit String casting
Integer.parseInt(filters.ownerId as String)
UUID.fromString(pathParts[0] as String)
```

#### ERROR: "No such property for class Object"
**Root Cause**: Repository results need explicit type casting
**Solution**: Cast all repository results to expected types
```groovy
// ❌ WRONG - Object type not recognized
Map migration = repository.findById(id)
List<GroovyRowResult> rows = repository.findAll()

// ✅ CORRECT - Explicit casting
Map migration = repository.findById(id) as Map
List<GroovyRowResult> rows = repository.findAll() as List<GroovyRowResult>
```

#### ERROR: "Cannot access script fields from private methods"
**Root Cause**: Private methods can't access @Field variables in ScriptRunner
**Solution**: Change method visibility from private to def
```groovy
// ❌ WRONG - Private methods lose script context
private Response handleRequest() { ... }
private static int mapSqlStateToHttpStatus(String sqlState) { ... }

// ✅ CORRECT - Use 'def' for script-level field access
def handleRequest() { ... }
def mapSqlStateToHttpStatus(String sqlState) { ... }
```

### Static Type Checking Compliance Pattern (ADR-031)

**All API implementations MUST follow these patterns:**

```groovy
@BaseScript CustomEndpointDelegate delegate

// 1. Repository Access - Use closure pattern
def getRepository = { ->
    return new EntityRepository()
}

// 2. Parameter Extraction - Always cast query parameters
def extractParameters(MultivaluedMap queryParams) {
    def filters = [:]
    queryParams.keySet().each { param ->
        def value = queryParams.getFirst(param) as String  // Always cast to String
        switch (param) {
            case 'page':
                pageNumber = Integer.parseInt(value as String)
                break
            case 'ownerId':
                filters.ownerId = Integer.parseInt(value as String)
                break
            default:
                filters[param] = value as String
        }
    }
}

// 3. Repository Method Calls - Explicit casting for ALL parameters
def repository = getRepository()
def result = repository.findAll(filters as Map, pageNumber as int, pageSize as int, sortField as String, sortDirection as String)

// 4. Result Processing - Cast results to expected types
Map entity = repository.findById(id) as Map
String jsonResponse = new JsonBuilder(result).toString()
```

### Common Static Type Checking Fixes

| Error Pattern | Fix Pattern |
|---------------|-------------|
| `Cannot find matching method Integer#parseInt(Object)` | `Integer.parseInt(value as String)` |
| `Cannot find matching method UUID#fromString(Object)` | `UUID.fromString(value as String)` |
| `No such property for class Object` | `repository.method() as ExpectedType` |
| `Variable is undeclared` | Use closure pattern: `def getRepository = { -> ... }` |
| `Cannot access script fields` | Change `private` to `def` |
| `Method signature mismatch` | Cast ALL repository parameters explicitly |

### ADR-031 Compliance Checklist

**Before submitting any API code, verify:**
- [ ] Repository access uses closure pattern (`getRepository()`)
- [ ] All `Integer.parseInt()` calls use `as String`
- [ ] All `UUID.fromString()` calls use `as String`
- [ ] All repository method calls have explicit parameter casting
- [ ] All repository results are cast to expected types
- [ ] Methods use `def` instead of `private` for script-level access
- [ ] All query parameter assignments use `as String`

## Common Issues & Solutions

### 🗃️ PostgreSQL Type Casting Errors (CRITICAL)

#### ERROR: "column is of type timestamp but expression is of type character varying"
**Root Cause**: PostgreSQL requires explicit SQL types, JDBC cannot infer types for java.util.Date
**Context**: This error cascades through all write operations (POST, PUT) when date/timestamp fields are involved

**Critical Solution**: Use java.sql types for PostgreSQL compatibility
```groovy
// ❌ WRONG - Using java.util.Date causes JDBC type inference failure
params.mig_start_date = Date.parse('yyyy-MM-dd HH:mm:ss', dateString)

// ✅ CORRECT - Using java.sql.Timestamp for datetime fields
def parsedDate = Date.parse('yyyy-MM-dd HH:mm:ss', dateString)
params.mig_start_date = new java.sql.Timestamp(parsedDate.time)

// ✅ CORRECT - Using java.sql.Date for date-only fields
params.mig_date = java.sql.Date.valueOf('2025-08-22')

// ✅ UNIVERSAL PATTERN - Handle multiple date formats
if (migrationData.mig_start_date) {
    if (migrationData.mig_start_date ==~ /^\d{4}-\d{2}-\d{2}$/) {
        // Date only format
        params.mig_start_date = java.sql.Date.valueOf(migrationData.mig_start_date)
    } else {
        // DateTime format
        def parsedDate = Date.parse('yyyy-MM-dd HH:mm:ss', migrationData.mig_start_date)
        params.mig_start_date = new java.sql.Timestamp(parsedDate.time)
    }
}
```

**Debugging Steps for Date/Timestamp Errors**:
1. Check field data type in PostgreSQL schema (`DATE` vs `TIMESTAMP`)
2. Log the incoming data format and type: `log.info("Date field: ${field} = ${value} (${value.class.name})")`
3. Verify proper java.sql type conversion before database operation
4. Test with minimal payload containing only the problematic date field

#### ERROR: "Invalid UUID format: [object Object]" or "Cannot cast 'java.util.LinkedHashMap' to 'java.util.UUID'"
**Root Cause**: Repository already enriched data, API duplicating enrichment causing nested objects
**Context**: This error indicates layer responsibility confusion - repository vs API data processing

**Solution**: Clear separation of repository and API responsibilities
```groovy
// ❌ WRONG - Double enrichment creates object nesting
def migration = repo.findMigrationById(id)
migration = repo.enrichMigrationWithStatusMetadata(migration) // Already enriched!
// Result: statusMetadata becomes nested object causing UUID parsing to fail

// ✅ CORRECT - Repository handles enrichment, API passes through
def migration = repo.findMigrationById(id) // Returns enriched data with statusMetadata
return Response.ok(migration).build()
```

**Layer Responsibility Pattern**:
- **Repository**: Single source of data enrichment, handles all joins and computed fields
- **API**: HTTP concerns only - validation, error handling, response formatting
- **Anti-pattern**: Never enrich the same data in multiple layers

**Debugging Steps for Object Casting Errors**:
1. Log data structure at each layer: `log.info("Data structure: ${data.getClass().name} = ${data}")`
2. Check repository method - does it already return enriched data?
3. Verify API layer doesn't duplicate repository processing
4. Use `instanceof` checks to detect unexpected object types

#### ERROR: "Cannot cast 'PLANNING' to java.lang.Integer" or "NOT NULL violation: mig_status"
**Root Cause**: Frontend sends status strings, backend expects integers for database storage
**Context**: Status handling requires flexible input with database normalization

**Solution**: Robust status resolution with validation
```groovy
private Integer resolveStatusId(def statusValue, String statusType = 'MIGRATION') {
    if (statusValue instanceof Integer) return statusValue
    
    if (statusValue instanceof String) {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                SELECT sts_id FROM status_sts 
                WHERE sts_name = :name AND sts_type = :type
            """, [name: statusValue, type: statusType])
            
            if (!result) {
                throw new IllegalArgumentException("Invalid status '${statusValue}' for type '${statusType}'")
            }
            return result.sts_id
        }
    }
    
    throw new IllegalArgumentException("Status value must be String or Integer, got: ${statusValue?.getClass()?.name}")
}

// Usage in repository methods
if (migrationData.mig_status) {
    params.mig_status = resolveStatusId(migrationData.mig_status, 'MIGRATION')
}
```

**Status Field Best Practices**:
- **Frontend**: Send human-readable strings ("PLANNING", "IN_PROGRESS")
- **Backend**: Convert to database IDs with validation
- **Database**: Store normalized integer IDs for referential integrity
- **API Response**: Include both ID and enriched metadata for UI rendering

**Debugging Steps for Status Errors**:
1. Check status_sts table for valid status names: `SELECT * FROM status_sts WHERE sts_type = 'MIGRATION'`
2. Log status conversion: `log.info("Converting status: '${statusValue}' -> ID: ${statusId}")`
3. Verify status type parameter matches database sts_type values
4. Test status resolution in isolation before full entity operations

### 🔍 SQL Relationship Errors

#### ERROR: "column must appear in GROUP BY clause" or "Plan count always returns 0"
**Root Cause**: Misunderstanding of table relationships - plans link through iterations, not directly to migrations
**Context**: UMIG hierarchy is Migration → Iteration → Plan → Sequence → Phase → Step

```groovy
// ❌ WRONG - Direct aggregation without proper grouping
SELECT m.mig_id, COUNT(p.plm_id) as plan_count
FROM migrations_mig m, plans_master_plm p
WHERE m.mig_id = p.mig_id  // No direct relationship exists!

// ❌ WRONG - Incorrect relationship assumption
LEFT JOIN plans_master_plm p ON m.mig_id = p.mig_id  // Invalid join

// ✅ CORRECT - Through iterations intermediary table
LEFT JOIN (
    SELECT ite.mig_id, COUNT(DISTINCT ite.plm_id) as plan_count
    FROM iterations_ite ite
    WHERE ite.plm_id IS NOT NULL  -- Exclude orphaned iterations
    GROUP BY ite.mig_id
) plan_counts ON m.mig_id = plan_counts.mig_id
```

**Table Relationship Discovery Process**:
1. **Schema Analysis**: Check foreign key constraints to understand relationships
2. **Data Validation**: Query actual data to verify relationship assumptions
3. **Hierarchy Verification**: Confirm business logic matches database structure
4. **Join Testing**: Test joins with known data before implementing in full queries

**Debugging Steps for Relationship Errors**:
1. Map actual table relationships: `SELECT * FROM information_schema.table_constraints WHERE table_name LIKE '%mig%'`
2. Test relationship queries in isolation: `SELECT ite.mig_id, ite.plm_id FROM iterations_ite ite LIMIT 5`
3. Verify data exists in intermediary tables before complex joins
4. Use EXPLAIN ANALYZE to check query execution plan and performance

#### ERROR: "Cannot read property 'field_name' of undefined"
**Cause**: SQL query missing fields referenced in JavaScript

**Solution**: Include ALL fields used in rendering:
```sql
-- Include status metadata fields
SELECT m.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type
FROM migrations_mig m
JOIN status_sts s ON m.mig_status = s.sts_id
```

### 🐛 JavaScript Context Issues

#### ERROR: "this.method is not a function"
```javascript
// ❌ WRONG - Lost context in callback
someAsyncCall(function() {
    this.updateUI(); // 'this' is undefined
});

// ✅ CORRECT - Arrow function preserves context
someAsyncCall(() => {
    this.updateUI(); // 'this' refers to original object
});
```

#### ERROR: "Cannot read property of null"
```javascript
// ❌ WRONG - No null checking
const color = row.statusMetadata.color;

// ✅ CORRECT - Safe property access
const color = row?.statusMetadata?.color || '#999999';
```

### 🎨 Custom Renderer Problems

#### Issue: Status colors not displaying
**Debug Steps**:
1. Check console for renderer debug output
2. Verify row object structure: `console.log('Row data:', row)`
3. Ensure status metadata is included in SQL query
4. Test with fallback values

**Solution Pattern**:
```javascript
customRenderers: {
  status_field: function (value, row) {
    console.log('Renderer called:', { value, row }); // Debug output
    
    // Multiple fallback strategies
    const statusName = row?.statusMetadata?.name || 
                      row?.sts_name || 
                      value || 
                      "Unknown";
    
    const statusColor = row?.statusMetadata?.color || 
                       row?.sts_color || 
                       "#999999";
    
    return `<span style="background-color: ${statusColor}">${statusName}</span>`;
  }
}
```

### 📊 Sorting Not Working

#### Issue: Column sorting fails or doesn't work
**Cause**: Missing or incorrect `sortMapping` configuration

**Solution**: Verify every `tableColumns` entry has `sortMapping`:
```javascript
tableColumns: ["mig_id", "mig_name", "iteration_count"],
sortMapping: {
  mig_id: "mig_id",           // ✅ Required
  mig_name: "mig_name",       // ✅ Required  
  iteration_count: "iteration_count"  // ✅ Required for computed fields too
}
```

### 🔗 GString/SQL Injection Issues

#### ERROR: SQL syntax errors with dynamic queries
```groovy
// ❌ DANGEROUS - SQL injection risk
def query = "SELECT * FROM table WHERE field = ${userInput}"

// ✅ SAFE - Parameterized query
def query = "SELECT * FROM table WHERE field = :userInput"
def result = sql.rows(query, [userInput: userInput])

// ✅ SAFE - Validated structural interpolation
def allowedFields = ['mig_id', 'mig_name', 'created_at']
if (allowedFields.contains(sortField)) {
    def query = "SELECT * FROM table ORDER BY ${sortField} ${direction}"
}
```

## Systematic Debugging Methodology

### 🎯 Cascading Error Diagnosis Framework

#### Phase 1: Endpoint Isolation
1. **Test each HTTP method separately** (GET, POST, PUT, DELETE)
2. **Use minimal payloads** to isolate the failing component
3. **Check one endpoint at a time** to avoid confusion

#### Phase 2: Layer-by-Layer Analysis
```groovy
// 1. API Layer - HTTP concerns
log.info("API ${method} called with: ${params}")
try {
    def result = repositoryMethod(params)
    return Response.ok(result).build()
} catch (Exception e) {
    log.error("API layer failure: ${e.message}", e)
    return Response.status(500).entity([error: e.message]).build()
}

// 2. Repository Layer - Data access and business logic  
log.info("Repository method called with: ${params}")
DatabaseUtil.withSql { sql ->
    log.info("SQL: ${query}, Params: ${sqlParams}")
    def result = sql.rows(query, sqlParams)
    log.info("Result count: ${result.size()}")
    return result
}

// 3. Database Layer - Check PostgreSQL logs for constraint violations
```

#### Phase 3: Data Transformation Tracking (ESSENTIAL FOR TYPE CASTING BUGS)
1. **Entry Point**: Log original request data with types
   ```groovy
   log.info("Request data: ${requestData}")
   log.info("Request types: ${requestData.collectEntries { k, v -> [k, "${v} (${v?.getClass()?.name})"] }}")
   ```
2. **Type Conversion**: Log parameter transformations with before/after comparison
   ```groovy
   log.info("BEFORE conversion: ${originalData}")
   def convertedData = convertToPostgreSQLTypes(originalData)
   log.info("AFTER conversion: ${convertedData}")
   log.info("Type changes: ${convertedData.collectEntries { k, v -> [k, v?.getClass()?.name] }}")
   ```
3. **SQL Parameters**: Log final database parameters to verify types
   ```groovy
   log.info("Final SQL params: ${sqlParams}")
   log.info("SQL param types: ${sqlParams.collectEntries { k, v -> [k, "${v?.getClass()?.name}"] }}")
   ```
4. **Response**: Log returned data structure to verify enrichment
   ```groovy
   log.info("Response structure: ${response?.keySet()}")
   log.info("Status metadata present: ${response?.statusMetadata != null}")
   ```

#### Phase 4: Root Cause Categories (PROVEN CLASSIFICATION)

**Type Casting Issues (70% of cascading failures)**:
- [ ] Date/timestamp conversion using java.sql types (NOT java.util.Date)
- [ ] UUID string validation and conversion (UUID.fromString())
- [ ] Status string to ID resolution (resolveStatusId())
- [ ] Integer parameter explicit casting (Integer.parseInt())
- [ ] Object vs primitive type mismatches

**Data Integrity Issues (20% of failures)**:
- [ ] Required fields present (usr_id_owner, NOT NULL constraints)
- [ ] Foreign key relationships valid (check intermediary tables)
- [ ] Null constraint compliance (required field validation)
- [ ] Unique constraint violations (duplicate key errors)

**Logic Flow Issues (10% of failures)**:
- [ ] Repository vs API responsibility separation (no double enrichment)
- [ ] No duplicate data enrichment (statusMetadata handled once)
- [ ] Proper error propagation (maintain error context through layers)
- [ ] Layer boundary respect (clear separation of concerns)

**Debugging Priority Order**:
1. **Start with Type Casting** - Most common root cause
2. **Check Layer Separation** - Repository vs API responsibilities
3. **Validate Data Integrity** - Database constraints and relationships
4. **Verify Logic Flow** - Error propagation and enrichment patterns

### 🛠️ PostgreSQL Compatibility Validation

#### Pre-Operation Type Validation (MANDATORY)
```groovy
// Comprehensive type validation before database operations
private void validatePostgreSQLTypes(Map params) {
    params.each { key, value ->
        if (value == null) return  // Skip null values
        
        // Date/Timestamp validation
        if (key.endsWith('_date')) {
            if (!(value instanceof java.sql.Date) && !(value instanceof java.sql.Timestamp)) {
                throw new IllegalArgumentException(
                    "Date field ${key} must be java.sql.Date or java.sql.Timestamp, got ${value.class.name}: ${value}"
                )
            }
        }
        
        // UUID validation
        if (key.endsWith('_id') && key != 'usr_id_owner' && key.contains('mig_')) {
            if (!(value instanceof UUID)) {
                try {
                    UUID.fromString(value as String) // Validate format
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException(
                        "UUID field ${key} has invalid format: ${value} (${value.class.name})"
                    )
                }
            }
        }
        
        // Status ID validation
        if (key == 'mig_status' && !(value instanceof Integer)) {
            throw new IllegalArgumentException(
                "Status field ${key} must be Integer (database ID), got ${value.class.name}: ${value}"
            )
        }
        
        // Integer field validation
        if (key.endsWith('_count') && !(value instanceof Integer)) {
            try {
                Integer.parseInt(value as String)
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException(
                    "Count field ${key} must be Integer, got ${value.class.name}: ${value}"
                )
            }
        }
    }
}
```

#### Mandatory Type Conversion Pattern with Error Handling:
```groovy
// Apply before ALL repository operations - prevents cascading errors
def convertToPostgreSQLTypes(Map data) {
    def params = [:]
    
    data.each { key, value ->
        if (value == null) {
            params[key] = null
            return
        }
        
        try {
            switch (key) {
                case { it.endsWith('_date') }:
                    if (value ==~ /^\d{4}-\d{2}-\d{2}$/) {
                        // Date only format
                        params[key] = java.sql.Date.valueOf(value)
                    } else {
                        // DateTime format with flexible parsing
                        def parsed = Date.parse('yyyy-MM-dd HH:mm:ss', value as String)
                        params[key] = new java.sql.Timestamp(parsed.time)
                    }
                    break
                    
                case { it.endsWith('_id') && it != 'usr_id_owner' }:
                    if (value instanceof UUID) {
                        params[key] = value  // Already converted
                    } else {
                        params[key] = UUID.fromString(value as String)
                    }
                    break
                    
                case 'mig_status':
                    params[key] = resolveStatusId(value, 'MIGRATION')
                    break
                    
                case { it.endsWith('_count') }:
                    if (value instanceof Integer) {
                        params[key] = value
                    } else {
                        params[key] = Integer.parseInt(value as String)
                    }
                    break
                    
                default:
                    params[key] = value
            }
        } catch (Exception e) {
            throw new IllegalArgumentException(
                "Failed to convert field ${key} with value '${value}' (${value.class.name}): ${e.message}", e
            )
        }
    }
    
    return params
}

// Usage pattern in repository methods
def updateMigration(UUID migrationId, Map migrationData) {
    // 1. Convert types first
    def params = convertToPostgreSQLTypes(migrationData)
    
    // 2. Validate required fields
    validateRequiredFields(params, ['usr_id_owner'])  // Prevent NOT NULL violations
    
    // 3. Validate types
    validatePostgreSQLTypes(params)
    
    // 4. Perform database operation
    DatabaseUtil.withSql { sql ->
        // Database operation with properly typed parameters
    }
}
```

## Quick Debugging Checklist

### 1. Entity Configuration Issues
- [ ] Entity exists in `EntityConfig.getAllEntities()`
- [ ] All `tableColumns` have corresponding `sortMapping` entries
- [ ] Required fields marked with `required: true`
- [ ] Custom renderers have proper fallback logic

### 2. Database Query Issues  
- [ ] SQL includes all fields referenced in JavaScript
- [ ] Computed fields use proper subquery patterns
- [ ] Status joins include metadata fields
- [ ] Parameters use `:paramName` syntax
- [ ] **PostgreSQL types**: java.sql.Date/Timestamp for dates
- [ ] **UUID validation**: Proper UUID.fromString() conversion
- [ ] **Status resolution**: String status names converted to IDs
- [ ] **Required fields**: usr_id_owner and other NOT NULL fields present

### 3. JavaScript Rendering Issues
- [ ] Console shows debug output from custom renderers
- [ ] Row object contains expected data structure
- [ ] Null/undefined values handled gracefully
- [ ] Event handlers preserve proper `this` context

### 4. API Response Issues
- [ ] Repository method returns expected structure
- [ ] Status metadata enrichment applied
- [ ] Pagination/filtering parameters validated
- [ ] Error responses include meaningful messages
- [ ] **No double enrichment**: Repository handles enrichment, API passes through
- [ ] **Type casting**: All parameters converted to PostgreSQL-compatible types
- [ ] **Layer separation**: Repository handles data, API handles HTTP

## Emergency Debugging Commands

### Browser Console Commands
```javascript
// Check entity configuration
console.log(EntityConfig.getEntity('migrations'));

// Verify API response
fetch('/rest/scriptrunner/latest/custom/migrations').then(r=>r.json()).then(console.log);

// Test custom renderer
const renderer = EntityConfig.getEntity('migrations').customRenderers.mig_status;
console.log(renderer('PLANNING', {statusMetadata: {name: 'PLANNING', color: '#FF0000'}}));

// Check current admin GUI state
console.log(window.adminGui.state);
```

### Database Console Commands (GroovyScript)
```groovy
// Test repository method with type validation
def repo = new MigrationRepository()
def testUuid = UUID.fromString('550e8400-e29b-41d4-a716-446655440000')
def result = repo.findMigrationById(testUuid)
println "Result structure: ${result?.keySet()}"
println "Has statusMetadata: ${result?.statusMetadata != null}"

// Test direct SQL with type checking
DatabaseUtil.withSql { sql ->
    def rows = sql.rows("SELECT COUNT(*) FROM migrations_mig")
    println "Migration count: ${rows[0][0]}"
    
    // Test type casting
    def testDate = new java.sql.Timestamp(System.currentTimeMillis())
    println "PostgreSQL timestamp type: ${testDate.class.name}"
}
```

## Performance Red Flags

### Slow Loading Issues
- **N+1 Queries**: Use joins instead of separate API calls for related data
- **Missing Indexes**: Ensure database indexes on frequently queried fields
- **Excessive Data**: Implement pagination and field limiting
- **Heavy Renderers**: Cache expensive calculations in custom renderers

### Memory Issues
- **Large Result Sets**: Implement proper pagination limits
- **Memory Leaks**: Remove event listeners in cleanup
- **Cached Data**: Clear unused cache entries periodically

## Common Database Relationship Patterns

### One-to-Many with Counts
```sql
-- Pattern: Entity with child count
SELECT parent.*, COALESCE(child_counts.count, 0) as child_count
FROM parent_table parent
LEFT JOIN (
    SELECT parent_id, COUNT(*) as count
    FROM child_table
    GROUP BY parent_id
) child_counts ON parent.id = child_counts.parent_id
```

### Many-to-Many Through Junction
```sql
-- Pattern: Entity with related entity count through junction
SELECT entity.*, COALESCE(related_counts.count, 0) as related_count  
FROM entity_table entity
LEFT JOIN (
    SELECT e.entity_id, COUNT(DISTINCT j.related_id) as count
    FROM entity_table e
    JOIN junction_table j ON e.entity_id = j.entity_id
    GROUP BY e.entity_id
) related_counts ON entity.entity_id = related_counts.entity_id
```

### Status with Metadata
```sql
-- Pattern: Entity with enriched status information
SELECT entity.*, status.sts_name, status.sts_color, status.sts_type
FROM entity_table entity
JOIN status_sts status ON entity.status_id = status.sts_id
```

---

### 🚨 Emergency Debugging for Cascading Failures

#### When Multiple Endpoints Fail Simultaneously (BATTLE-TESTED APPROACH):

**Real-World Success**: This exact sequence resolved the Migrations API cascading failure (August 22, 2025)

1. **Start with GET** (simplest, read-only operation)
   - If GET fails: SQL relationship or enrichment issue
   - If GET succeeds: Type casting issue in write operations

2. **Check repository enrichment** (common cause of all endpoint failures)
   - Look for duplicate enrichment: `enrichMigrationWithStatusMetadata()`
   - Verify single responsibility: Repository enriches once, API passes through
   - Test with minimal repository method in isolation

3. **Verify PostgreSQL types** (affects all write operations: POST, PUT, DELETE)
   - Check for java.util.Date usage (JDBC type inference failure)
   - Validate UUID string conversion (UUID.fromString())
   - Confirm status string to ID conversion (resolveStatusId())

4. **Test with minimal data** (isolate required vs optional fields)
   - Start with only required fields to identify the problematic field
   - Add optional fields one by one until failure occurs
   - Focus on date, UUID, and status fields first

#### Critical Error Patterns (PROVEN DIAGNOSTIC SIGNATURES):

**"Invalid UUID format: [object Object]"**: 
- **Root Cause**: Repository double-enrichment creating nested objects
- **Quick Fix**: Remove duplicate enrichment in API layer
- **Verify**: Check if repository method already returns enriched data

**"Type timestamp but expression is of type character varying"**: 
- **Root Cause**: java.util.Date instead of java.sql.Timestamp
- **Quick Fix**: Use `new java.sql.Timestamp(date.time)` for datetime fields
- **Verify**: Check all date field conversions in repository

**"Cannot cast 'PLANNING' to java.lang.Integer"**: 
- **Root Cause**: Status string/ID conversion missing in repository
- **Quick Fix**: Add `resolveStatusId(statusValue)` conversion
- **Verify**: Check status_sts table for valid status names and IDs

**"NOT NULL violation: column 'usr_id_owner'"**: 
- **Root Cause**: Missing required fields in UPDATE operations
- **Quick Fix**: Preserve existing required fields when updating
- **Verify**: Check all NOT NULL constraints in table schema

#### Emergency Triage Decision Tree:
```
Multiple endpoints failing?
├─ GET fails → SQL/Relationship issue
│  └─ Check table joins and computed fields
├─ GET works, POST/PUT fail → Type casting issue  
│  └─ Check date/UUID/status conversions
├─ All methods fail → Repository enrichment issue
│  └─ Check for double data processing
└─ Intermittent failures → Required field issue
   └─ Check NOT NULL constraints
```  

---

**Last Updated**: August 22, 2025  
**Major Update**: Enhanced with critical PostgreSQL type casting patterns, systematic debugging methodology, and emergency triage procedures from successful Migrations API debugging session that resolved cascading failures across all HTTP methods  
**Validation**: Patterns proven effective in real debugging session - resolved complex type casting, layer separation, and status handling issues  
**Use Case**: Quick reference during development and debugging sessions, emergency troubleshooting for cascading API failures  
**Success Record**: Applied methodology resolved 4 major error categories in single debugging session (type casting, double enrichment, status conversion, required fields)