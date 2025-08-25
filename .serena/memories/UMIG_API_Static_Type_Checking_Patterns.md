# UMIG API Static Type Checking Patterns and ScriptRunner Fixes

## Overview

Critical patterns discovered while fixing static type checking errors across UMIG APIs (StepsApi, InstructionsApi, ControlsApi, MigrationApi) following ADR-031 type safety requirements.

## Repository Access Pattern for ScriptRunner

**Problem**: Direct field declarations fail in private methods with `@BaseScript CustomEndpointDelegate`

```groovy
// FAILS - causes "undeclared variable" errors
final Repository repository = new Repository()
```

**Solution**: Use closure-based accessor pattern

```groovy
def getRepository = { ->
    return new Repository()
}
// Usage in methods
def repository = getRepository()
```

## Type Casting Requirements (ADR-031 Compliance)

### String Parameter Conversion

```groovy
// REQUIRED - always cast to String first
Integer.parseInt(value as String)
UUID.fromString(id as String)
```

### Repository Method Calls

```groovy
// ALL parameters need explicit casting
repository.findAll(filters as Map, pageNumber as int, pageSize as int, sortField as String, sortDirection as String)
repository.create(data as Map)
repository.update(id as UUID, data as Map)
```

### Query Parameter Extraction

```groovy
// Cast to String for assignments
String migrationId = filters.migrationId as String
String sortField = filters.sortField as String
```

### Repository Results

```groovy
// Cast results to expected types
Map result = repository.create(data) as Map
List<GroovyRowResult> rows = repository.findAll() as List<GroovyRowResult>
```

## Method Visibility in ScriptRunner

**Change private methods to def for script-level field access:**

```groovy
// OLD - causes access issues
private Response handleRequest() { ... }

// NEW - works with script fields
def handleRequest() { ... }
```

## Common Error Patterns and Fixes

### Error: Cannot find matching method Integer#parseInt(Object)

**Fix**: `Integer.parseInt(value as String)`

### Error: No such property for class Object

**Fix**: Cast result - `repository.findById(id) as Map`

### Error: Variable undeclared

**Fix**: Use closure pattern for repositories

### Error: Method signature mismatch

**Fix**: Add explicit parameter type casting in all repository calls

## Testing Validation

All patterns tested and validated across:

- StepsApi.groovy (100% static type checking passed)
- InstructionsApi.groovy (100% static type checking passed)
- ControlsApi.groovy (100% static type checking passed)
- MigrationApi.groovy (100% static type checking passed)

## Files Using These Patterns

- All API files in `/src/groovy/umig/api/v2/`
- Repository classes in `/src/groovy/umig/repository/`
- Following ADR-031 type safety standards

## Key Success Metrics

- Zero static type checking errors
- 100% ADR-031 compliance
- Maintained runtime performance
- Preserved existing functionality
