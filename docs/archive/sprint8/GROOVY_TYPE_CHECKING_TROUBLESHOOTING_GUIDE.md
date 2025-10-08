# Groovy Type Checking Troubleshooting Guide for ScriptRunner

**Version**: 1.0 | **Created**: August 21, 2025 | **Status**: Production Ready  
**Context**: Lessons learned from resolving persistent ScriptRunner "Failed type checking" warnings

## Overview

This guide documents the real causes and proven solutions for ScriptRunner Groovy type checking warnings, based on extensive debugging sessions in the UMIG project. Initial assumptions about ScriptRunner limitations, file naming conventions, and parameter types proved incorrect - the actual issues are much more specific and solvable.

**Key Discovery**: ScriptRunner type checking is NOT a limitation. All files can pass 100% type checking with proper code patterns.

## Executive Summary

### What We Initially Thought (Incorrect Assumptions)

❌ **ScriptRunner Type Checking Limitation**: "ScriptRunner just can't do proper type checking"  
❌ **File Naming Issues**: "PascalCase vs camelCase matters for type checking"  
❌ **Parameter Type Problems**: "HttpServletRequest vs UriInfo causes type errors"

### The Real Culprits (Actual Root Causes)

✅ **Untyped Destructuring Assignments**: `def (a, b) = list` fails type checking  
✅ **Untyped Closures**: `def getClosure = { ->` needs explicit typing  
✅ **Missing Explicit Casts**: Must use `as String`, `as Integer` consistently  
✅ **Accessing Properties on Untyped Objects**: Must cast to Map first

## Common Type Checking Failure Patterns

### 1. Untyped Destructuring Assignments

**❌ FAILS Type Checking:**

```groovy
def (steps, total) = stepRepository.findStepsWithTotal(filters)
```

**✅ PASSES Type Checking:**

```groovy
// Option A: Direct assignment without destructuring
def result = stepRepository.findStepsWithTotal(filters)
def steps = result.steps
def total = result.total

// Option B: Explicit typing in destructuring
List<Map> steps
Integer total
(steps, total) = stepRepository.findStepsWithTotal(filters)

// Option C: Use return object directly
def result = stepRepository.findStepsWithTotal(filters)
return [
    steps: result.steps,
    totalCount: result.total
]
```

**Files Fixed**: InstructionsApi.groovy, StepViewApi.groovy

### 2. Untyped Closures

**❌ FAILS Type Checking:**

```groovy
def getClosure = { ->
    return someValue
}
```

**✅ PASSES Type Checking:**

```groovy
// Explicit closure typing
Closure<String> getClosure = { ->
    return someValue
}

// Or avoid closures entirely for simple cases
String getValue() {
    return someValue
}
```

**Files Fixed**: StepViewApi.groovy

### 3. Missing Explicit Casts

**❌ FAILS Type Checking:**

```groovy
params.migrationId = UUID.fromString(filters.migrationId)
params.teamId = Integer.parseInt(filters.teamId)
```

**✅ PASSES Type Checking:**

```groovy
params.migrationId = UUID.fromString(filters.migrationId as String)
params.teamId = Integer.parseInt(filters.teamId as String)
```

**Background**: Already documented in ADR-031, but critical for all type checking success.

**Files Fixed**: PhaseRepository.groovy, multiple API files

### 4. Accessing Properties on Untyped Objects

**❌ FAILS Type Checking:**

```groovy
def result = someMethod()
return result.someProperty  // Type checker doesn't know result's type
```

**✅ PASSES Type Checking:**

```groovy
// Cast to Map if returning dynamic structure
def result = someMethod() as Map
return result.someProperty

// Or use explicit typing if structure is known
SomeClass result = someMethod() as SomeClass
return result.someProperty
```

**Files Fixed**: StepsApi.groovy

### 5. List Operations Without Proper Typing

**❌ FAILS Type Checking:**

```groovy
def errors = []
errors << "Some error"  // << operator can cause type checking issues
```

**✅ PASSES Type Checking:**

```groovy
List<String> errors = []
errors.add("Some error")  // Explicit add() method

// Or with type inference
def errors = [] as List<String>
errors.add("Some error")
```

**Files Fixed**: ApiPatternValidator.groovy

### 6. String Concatenation Without Explicit toString()

**❌ FAILS Type Checking:**

```groovy
def message = "Error: " + someObject  // Type checker unsure about someObject type
```

**✅ PASSES Type Checking:**

```groovy
def message = "Error: " + someObject.toString()
```

**Files Fixed**: ApiPatternValidator.groovy

## ScriptRunner-Specific Considerations

### 1. Type Checking is Fully Supported

**Reality**: ScriptRunner with Groovy 3.0.15 supports complete static type checking when code follows proper patterns.

**Evidence**: All UMIG project files now pass 100% type checking after applying these patterns.

### 2. File Naming Conventions Don't Matter

**Reality**: Both PascalCase (`InstructionsApi.groovy`) and camelCase (`instructionsApi.groovy`) work identically for type checking.

**Evidence**: Mixed naming conventions in UMIG project all pass type checking with proper code patterns.

### 3. HttpServletRequest vs UriInfo Both Work

**Reality**: Both injection patterns work fine for type checking:

```groovy
// Both are valid
entityName(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, UriInfo uriInfo ->
entityName(httpMethod: "GET", groups: ["confluence-users"]) { HttpServletRequest request ->
```

### 4. Method Signature Consistency is Critical

**❌ FAILS Type Checking:**

```groovy
// Method expects 'status' but receives 'statusId'
def result = someMethod(filters.statusId)  // statusId parameter
someMethod(String status) { ... }         // status parameter - mismatch!
```

**✅ PASSES Type Checking:**

```groovy
// Consistent parameter naming
def result = someMethod(filters.status)
someMethod(String status) { ... }
```

**Files Fixed**: SequencesApi.groovy (status vs statusId mismatch)

## Troubleshooting Checklist

When encountering "Failed type checking" warnings, check these items in order:

### Phase 1: Destructuring and Closures

- [ ] **Check for untyped destructuring**: Look for `def (a, b) = ...` patterns
- [ ] **Check for untyped closures**: Look for `def closure = { ->` patterns
- [ ] **Convert or add explicit types**: Use direct assignment or explicit typing

### Phase 2: Type Casting

- [ ] **Check all UUID.fromString()**: Ensure `as String` casting
- [ ] **Check all Integer.parseInt()**: Ensure `as String` casting
- [ ] **Check all type conversions**: Add explicit casting throughout

### Phase 3: Object Property Access

- [ ] **Check dynamic object access**: Cast to Map if accessing dynamic properties
- [ ] **Check return type consistency**: Ensure methods return expected types
- [ ] **Check collection operations**: Use `.add()` instead of `<<` operator

### Phase 4: Method Signatures

- [ ] **Check parameter names**: Ensure calling code matches method signature
- [ ] **Check return types**: Ensure methods return what they declare
- [ ] **Check null handling**: Handle potential null values properly

### Phase 5: String Operations

- [ ] **Check concatenations**: Use `.toString()` for object concatenation
- [ ] **Check interpolation**: Ensure proper type handling in GStrings

## Proven Solutions Library

### Replace Destructuring Assignment

```groovy
// Before (fails type checking)
def (steps, total) = repository.getStepsWithCount(filters)

// After (passes type checking)
def result = repository.getStepsWithCount(filters)
def steps = result.steps
def total = result.total
```

### Replace Untyped Closures

```groovy
// Before (fails type checking)
def filterClosure = { item ->
    return item.active
}

// After (passes type checking)
boolean isActive(Map item) {
    return item.active as boolean
}

// Or with explicit closure typing
Closure<Boolean> filterClosure = { Map item ->
    return item.active as boolean
}
```

### Fix Method Parameter Mismatches

```groovy
// Before (fails type checking - parameter name mismatch)
def result = updateStatus(filters.statusId)  // Calling with statusId
updateStatus(String status) { ... }         // Method expects status

// After (passes type checking)
def result = updateStatus(filters.status)   // Consistent parameter naming
updateStatus(String status) { ... }
```

### Fix Object Property Access

```groovy
// Before (fails type checking)
def result = someMethod()
return [
    data: result.data,
    count: result.count
]

// After (passes type checking)
def result = someMethod() as Map
return [
    data: result.data,
    count: result.count
]
```

## Integration with Existing Standards

This guide complements existing UMIG documentation:

### Related to ADR-031 (Groovy Type Safety)

- **Extends**: ADR-031's explicit casting patterns
- **Adds**: ScriptRunner-specific destructuring and closure issues
- **Complements**: Database filtering patterns remain unchanged

### Related to Testing Framework

- **Validates**: All API files pass type checking before deployment
- **Integrates**: Type checking validation in NPM test commands
- **Supports**: Continuous integration quality gates

### Related to Development Standards

- **Enforces**: Repository pattern consistency
- **Maintains**: REST API standardization
- **Ensures**: Production-ready code quality

## Performance Impact

**Type Checking Benefits**:

- **Compile-time Error Detection**: Issues caught before deployment
- **IDE Support**: Better auto-completion and refactoring
- **Runtime Performance**: Optimized bytecode generation
- **Maintenance**: Easier debugging and code understanding

**No Performance Penalties**: Explicit casting and proper typing have no runtime overhead in Groovy 3.0.15.

## Tools and Validation

### IDE Configuration

```groovy
// Add to groovy files for local development
@groovy.transform.TypeChecked
class YourApiClass {
    // Your code here
}
```

### Testing Integration

```bash
# NPM commands validate type checking
npm run test:unit           # Includes type checking validation
npm run test:integration    # Includes API type validation
npm run test:all           # Complete validation including type checking
```

### Manual Validation

```bash
# ScriptRunner console validation
# Paste your groovy code and check for warnings
# All warnings should be resolved before deployment
```

## Future Prevention

### Code Review Checklist

- [ ] No untyped destructuring assignments
- [ ] All closures have explicit types or are replaced with methods
- [ ] All type conversions use explicit casting
- [ ] All object property access uses proper typing
- [ ] Method signatures match calling patterns

### Development Practices

1. **Test Early**: Check type validation during development
2. **Explicit Over Implicit**: Always prefer explicit typing
3. **Method Over Closure**: Use methods instead of closures when possible
4. **Cast Everything**: Better to over-cast than under-cast

### Team Knowledge Sharing

- **Document Patterns**: Add new patterns to this guide as discovered
- **Share Solutions**: Update troubleshooting checklist based on experience
- **Validate Continuously**: Include type checking in all quality gates

## Test Framework Specific Patterns

### Spock Framework and Static Type Checking

**Special Consideration**: Spock test specifications have unique interactions with Groovy's static compiler, especially in `then:` assertion blocks where type optimization occurs.

#### Class-Level vs Method-Level Annotations

**Problem**: `@CompileStatic(TypeCheckingMode.SKIP)` at the class level may not effectively bypass Spock's interaction with Groovy's static compiler.

**❌ INEFFECTIVE Pattern:**

```groovy
@CompileStatic(TypeCheckingMode.SKIP)  // Doesn't always work with Spock
class MyIntegrationTest extends Specification {
    def "test method"() {
        then:
        someValue >= 0  // Still causes type checking errors
    }
}
```

**✅ EFFECTIVE Pattern:**

```groovy
class MyIntegrationTest extends Specification {
    @CompileDynamic  // Target specific methods only
    def "test method with type checking issues"() {
        then:
        someValue >= 0  // Works correctly
    }

    // Other methods remain statically typed
    def "test method without issues"() {
        // No annotation needed if type checking passes
    }
}
```

#### Safe Comparison Patterns in Test Assertions

**❌ PROBLEMATIC in Spock `then:` blocks:**

```groovy
Integer emailsSent = resultMap.get('emailsSent') as Integer
emailsSent >= 0  // Type checking error
emailsSent.intValue() >= 0  // Dynamic method resolution error
```

**✅ SAFE Pattern for Spock assertions:**

```groovy
Object emailsSentObj = resultMap.get('emailsSent')
emailsSentObj != null
Integer emailsSent = emailsSentObj as Integer
emailsSent != null && emailsSent.compareTo(0) >= 0  // Use compareTo() for safe comparison
```

**Key Principles for Test Type Safety**:

- Apply `@CompileDynamic` at method level, not class level
- Use `compareTo()` instead of direct comparison operators in assertions
- Separate object extraction from type casting
- Add explicit null checks before type operations
- Avoid `.intValue()` and similar methods that cause dynamic resolution issues

## Conclusion

ScriptRunner Groovy type checking is not a limitation - it's a powerful quality assurance tool that requires specific coding patterns. The key insights are:

1. **Destructuring assignments and untyped closures** are the primary culprits
2. **Explicit casting** must be used consistently throughout
3. **Object property access** requires proper typing
4. **Method signatures** must match calling patterns exactly
5. **File naming and parameter injection styles** are NOT the issue
6. **Test frameworks** (like Spock) require special handling with method-level `@CompileDynamic` annotations

By following these patterns, all ScriptRunner Groovy files can achieve 100% type checking compliance, resulting in more robust, maintainable, and production-ready code.

---

**Related Documentation**:

- [ADR-031: Groovy Type Safety and Filtering Patterns](../adr/archive/ADR-031-groovy-type-safety-and-filtering-patterns.md)
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Complete testing framework
- [Solution Architecture](../solution-architecture.md) - System design and standards

**Files Successfully Fixed**:

_August 21, 2025 - Production Code:_

- InstructionsApi.groovy - Direct field initialization instead of destructuring
- SequencesApi.groovy - Parameter name consistency (status vs statusId)
- PhaseRepository.groovy - Explicit type casting throughout
- ApiPatternValidator.groovy - List operations and string concatenation
- StepsApi.groovy - Object property access typing
- StepViewApi.groovy - Closure typing and destructuring elimination

_September 29, 2025 - Test Code:_

- EnhancedEmailNotificationIntegrationTest.groovy - Method-level `@CompileDynamic` for Spock assertions

**Result**: 100% type checking compliance achieved across all ScriptRunner files.
