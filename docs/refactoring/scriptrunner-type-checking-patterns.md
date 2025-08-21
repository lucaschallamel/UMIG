# ScriptRunner Type Checking Refactoring Patterns

**Technical Reference** | **Created**: 2025-08-21 | **Context**: UMIG ScriptRunner Static Type Checking

## Overview

This document catalogs critical refactoring patterns discovered during ScriptRunner static type checking implementation, providing concrete solutions for common type safety issues in Groovy ScriptRunner environments.

## Core Refactoring Patterns

### 1. Destructuring Assignment Pattern [DRY]

**Problem**: Multiple assignment destructuring fails static type checking

```groovy
// ANTI-PATTERN: Type checker cannot infer types
def (sttCode, stmNumberStr) = stepCode.tokenize('-')
```

**Solution**: Explicit typed variable assignment

```groovy
// PATTERN: Explicit type-safe destructuring
final List<String> parts = stepCode.tokenize('-')
final String sttCode = parts[0]
final String stmNumberStr = parts[1]

// VALIDATION: Add bounds checking for production
if (parts.size() != 2) {
    throw new IllegalArgumentException("Invalid step code format: ${stepCode}")
}
```

**Refactoring Strategy**: [SF] [RP] [REH]

- Search: `def \(.*\) = .*\.tokenize\(`
- Replace: Explicit list assignment with type checking
- Validate: Ensure bounds checking for array access

### 2. Closure Typing Pattern [CA]

**Problem**: Untyped closures cause type inference failures

```groovy
// ANTI-PATTERN: Type checker cannot infer closure signature
def getRepository = { ->
    return repositoryRegistry.getStepRepository()
}
```

**Solution**: Explicit closure typing with return type

```groovy
// PATTERN: Strongly typed closure declaration
final Closure<StepRepository> getRepository = { ->
    return repositoryRegistry.getStepRepository()
}

// ALTERNATIVE: Method reference when possible
private StepRepository getRepository() {
    return repositoryRegistry.getStepRepository()
}
```

**Refactoring Strategy**: [TDT] [CA]

- Convert closures to methods when used multiple times
- Use explicit `Closure<ReturnType>` for complex closures
- Prefer method references for better type safety

### 3. Map Access Pattern [IV]

**Problem**: Dynamic property access on untyped objects

```groovy
// ANTI-PATTERN: Dynamic property access fails type checking
def statusRecord = sql.firstRow("SELECT * FROM status")
return statusRecord.id  // Type checker error
```

**Solution**: Explicit casting with type safety

```groovy
// PATTERN: Safe map access with explicit casting
final Map<String, Object> statusRecord = sql.firstRow("SELECT * FROM status") as Map
final Integer recordId = (statusRecord?.id as Integer) ?: 0

// ALTERNATIVE: Type-safe result mapping
final Integer recordId = sql.firstRow("SELECT id FROM status") { row ->
    return row.id as Integer
}
```

**Refactoring Strategy**: [IV] [REH] [CMV]

- Always cast sql.firstRow() results to Map
- Use elvis operator for null safety
- Consider explicit column selection over SELECT \*

### 4. Collection Operations Pattern [TST]

**Problem**: Collection modification operations with type ambiguity

```groovy
// ANTI-PATTERN: Type checker cannot infer collection types
def results = []
results << processItem(item)  // Type checking fails
```

**Solution**: Explicit collection typing and operations

```groovy
// PATTERN: Strongly typed collection operations
final List<ProcessedItem> results = new ArrayList<>()
results.add(processItem(item))

// ALTERNATIVE: Functional approach with type inference
final List<ProcessedItem> results = items.collect { item ->
    return processItem(item) as ProcessedItem
}
```

**Refactoring Strategy**: [MOD] [TST]

- Initialize collections with explicit types
- Use `.add()` instead of `<<` operator for type safety
- Leverage Groovy's functional methods with explicit casting

### 5. String Conversion Pattern [CMV]

**Problem**: GString interpolation causing type mismatches

```groovy
// ANTI-PATTERN: GString vs String type conflicts
def message = "Processing ${itemCount} items"
logMessage(message)  // Expects String, gets GString
```

**Solution**: Explicit string conversion

```groovy
// PATTERN: Explicit string conversion for type safety
final String message = "Processing ${itemCount} items".toString()
logMessage(message)

// ALTERNATIVE: Use String.valueOf() for null safety
final String message = String.valueOf("Processing ${itemCount} items")
```

**Refactoring Strategy**: [CMV] [RP]

- Add `.toString()` to all GString expressions
- Use `String.valueOf()` when null values possible
- Consider string concatenation for simple cases

## Code Smell Detection [CSD]

### Type Checking Smells

**Smell 1**: Untyped variable declarations

```groovy
// SMELL
def result = processData()

// REFACTORED
final ProcessResult result = processData() as ProcessResult
```

**Smell 2**: Dynamic property access

```groovy
// SMELL
record.fieldName

// REFACTORED
(record as Map<String, Object>).fieldName as String
```

**Smell 3**: Collection type ambiguity

```groovy
// SMELL
def items = []
items << newItem

// REFACTORED
final List<ItemType> items = new ArrayList<>()
items.add(newItem as ItemType)
```

**Smell 4**: Implicit closure types

```groovy
// SMELL
def handler = { data -> process(data) }

// REFACTORED
final Closure<ProcessResult> handler = { Object data ->
    return process(data) as ProcessResult
}
```

## Automated Refactoring Strategies [ARC]

### Search and Replace Patterns

**Pattern 1**: Destructuring assignments

```bash
# Find destructuring assignments
grep -r "def (\|final (" src/ --include="*.groovy"

# Refactor to explicit list access
sed 's/def (\([^)]*\)) = \([^.]*\)\.tokenize/final List<String> parts = \2.tokenize/g'
```

**Pattern 2**: Untyped SQL result access

```bash
# Find SQL result property access
grep -r "\.firstRow.*\.\w\+" src/ --include="*.groovy"

# Requires manual refactoring due to context dependency
```

**Pattern 3**: Collection operators

```bash
# Find << operators on collections
grep -r "\w\+\s*<<\s*" src/ --include="*.groovy"

# Manual review needed for type-safe replacement
```

### IDE Refactoring Support

**IntelliJ IDEA Inspections**:

- Enable "Groovy → Static type checking"
- Use "Groovy → Untyped access" warnings
- Apply "Add explicit type" quick fixes

**Static Analysis Tools**:

- CodeNarc rules: UntypedAccess, ExplicitCallToEqualsMethod
- SpotBugs with Groovy plugin
- SonarQube Groovy rules

## Performance Implications [CA]

### Type Safety vs Performance Trade-offs

**Cast Operations**:

- Explicit casting adds minimal runtime overhead
- Type checking prevents ClassCastException at runtime
- Better performance through early error detection

**Collection Initialization**:

```groovy
// SLOWER: Dynamic typing requires runtime type resolution
def list = []

// FASTER: Static typing enables JIT optimizations
final List<String> list = new ArrayList<>()
```

**Method Dispatch**:

```groovy
// SLOWER: Dynamic method resolution
def result = object.method()

// FASTER: Static method binding when types known
final ResultType result = (object as KnownType).method() as ResultType
```

## ScriptRunner-Specific Considerations [ENV]

### ScriptRunner Runtime Context

**Binding Variables**: Always cast binding variables

```groovy
// ScriptRunner provides untyped binding
final String userKey = (binding.userKey as String) ?: ""
```

**SQL Utilities**: Use explicit typing with DatabaseUtil

```groovy
DatabaseUtil.withSql { sql ->
    final List<Map<String, Object>> rows = sql.rows("SELECT * FROM table") as List
    return rows.collect { Map<String, Object> row ->
        return new ResultObject(
            id: row.id as Integer,
            name: row.name as String
        )
    }
}
```

**REST Endpoint Parameters**: Type-safe parameter handling

```groovy
@BaseScript CustomEndpointDelegate delegate
endpoint(httpMethod: "GET") { MultivaluedMap params ->
    final String filterId = params.getFirst("filterId") as String
    final Integer pageSize = Integer.parseInt(params.getFirst("pageSize") as String ?: "10")
}
```

## Migration Checklist [AC]

### Pre-Migration Assessment

- [ ] Identify all `def` declarations without explicit types
- [ ] Locate destructuring assignments using tokenize()
- [ ] Find SQL result property access patterns
- [ ] Check collection operations using `<<` operator
- [ ] Review closure declarations for type safety

### Migration Steps

1. **Enable Static Type Checking**: Add `@groovy.transform.TypeChecked` incrementally
2. **Fix Type Declarations**: Convert `def` to explicit types
3. **Refactor Destructuring**: Use explicit list access patterns
4. **Secure Map Access**: Add casting for dynamic property access
5. **Type Collections**: Specify generic types for all collections
6. **Test Thoroughly**: Ensure runtime behavior remains unchanged

### Post-Migration Validation

- [ ] All static type checking warnings resolved
- [ ] Unit tests pass with type checking enabled
- [ ] Performance benchmarks within acceptable range
- [ ] Code coverage maintained or improved
- [ ] Documentation updated with new patterns

## Best Practices Summary [SD]

### Development Guidelines

1. **Always use explicit types** instead of `def` in new code
2. **Cast SQL results immediately** after database operations
3. **Initialize collections with generic types** for type safety
4. **Use `.toString()` explicitly** on GString expressions
5. **Prefer methods over closures** for better type inference

### Code Review Checklist

- [ ] No untyped variable declarations
- [ ] All SQL results properly cast
- [ ] Collections have explicit generic types
- [ ] String conversions are explicit
- [ ] Closure types are declared when complex

### Tooling Recommendations

- Enable IDE static type checking warnings
- Use CodeNarc for automated code quality checks
- Implement pre-commit hooks for type checking validation
- Regular static analysis in CI/CD pipeline

---

**Status**: Production-ready patterns validated in ScriptRunner 9.21.0 environment
**Coverage**: Core type checking patterns for Groovy 3.0.15 static type checking
**Maintenance**: Review patterns quarterly for ScriptRunner updates
