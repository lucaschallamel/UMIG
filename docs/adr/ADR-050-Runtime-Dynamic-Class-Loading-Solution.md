# ADR-050: Runtime Dynamic Class Loading Solution for Circular Dependencies

## Status

Accepted

## Context

The StepDataTransformationServiceIntegrationTest.groovy experienced a circular dependency issue preventing test execution:

1. **Compilation Problem**: Test needs DTO classes (StepInstanceDTO, StepMasterDTO, CommentDTO)
2. **Jackson Dependencies**: DTOs use Jackson annotations requiring external dependencies
3. **Class Resolution**: Groovy compiler cannot resolve these interdependencies in test context
4. **Pure Groovy Constraint**: ADR-036 prohibits build systems, must work within Pure Groovy framework
5. **Test Integrity Requirement**: Tests must break if code structure changes (not oversimplified mocks)

## Decision

Implement **Runtime Dynamic Class Loading** approach that:

1. **Compiles Without Dependencies**: Test shell compiles without compile-time DTO references
2. **Loads Classes at Runtime**: Uses `Class.forName()` and reflection to access real implementations
3. **Tests Real Code**: All tests execute against actual service and DTO implementations
4. **Structure-Sensitive**: Tests break if method signatures, properties, or class structure changes
5. **Pure Groovy Compatible**: Uses only built-in Groovy/Java reflection capabilities

## Implementation

### Core Components

1. **StepDataTransformationServiceRuntimeTest.groovy**: New runtime test implementation
2. **IntegrationTestRunner.js**: Enhanced with `--us056a` flag support
3. **package.json**: New test scripts for US-056A runtime testing

### Key Features

- **Dynamic Class Loading**: `Class.forName('umig.dto.StepInstanceDTO')`
- **Reflection-Based Testing**: Method calls via `getMethod().invoke()`
- **Builder Pattern Testing**: Tests builder via reflection (breaks if pattern changes)
- **Property Access**: Direct property access (breaks if property names change)
- **Validation Testing**: Calls validation methods via reflection
- **JSON Serialization**: Tests serialization methods via reflection

### Test Commands

```bash
# Run via npm script
npm run test:us056a

# Direct runtime test execution
npm run test:us056a:runtime

# Via IntegrationTestRunner
node scripts/test-runners/IntegrationTestRunner.js --us056a
```

## Consequences

### Positive

- ✅ **Resolves Circular Dependency**: No compile-time DTO dependencies
- ✅ **Tests Real Implementations**: No mocks or fake implementations
- ✅ **Structure-Sensitive**: Tests break with code changes (meets user requirements)
- ✅ **Pure Groovy Compatible**: No build system required (ADR-036 compliant)
- ✅ **ScriptRunner Compatible**: Works in existing runtime environment
- ✅ **Maintains Test Coverage**: All original test cases preserved

### Negative

- ⚠️ **Reflection Overhead**: Slightly more complex test code
- ⚠️ **Runtime Error Detection**: Some errors caught at runtime vs compile-time
- ⚠️ **IDE Support**: Limited IDE assistance for reflected method calls

### Neutral

- 🔄 **Test Pattern Change**: Shift from compile-time to runtime resolution
- 🔄 **Error Messages**: Different error patterns (reflection-based)

## Alternatives Considered

| Solution                    | Pure Groovy? | Tests Real Code? | Structure Sensitive? | Viable?                         |
| --------------------------- | ------------ | ---------------- | -------------------- | ------------------------------- |
| **Runtime Dynamic Loading** | ✅ Yes       | ✅ Yes           | ✅ Yes               | ✅ **CHOSEN**                   |
| Gradle/Maven Build          | ❌ No        | ✅ Yes           | ✅ Yes               | ❌ Violates ADR-036             |
| Two-Phase Compilation       | ❌ No        | ✅ Yes           | ✅ Yes               | ❌ Requires build system        |
| MetaClass Programming       | ✅ Yes       | ❌ No            | ❌ No                | ❌ Creates fake implementations |
| Interface Proxies           | ✅ Yes       | ❌ No            | ❌ No                | ❌ Creates test doubles         |
| Test-Specific Classpath     | ⚠️ Maybe     | ✅ Yes           | ✅ Yes               | ❌ Too risky/fragile            |

## Validation

The runtime approach maintains all original test requirements:

1. **Real Implementation Testing**: ✅ Tests actual StepDataTransformationService
2. **DTO Validation**: ✅ Tests real DTO creation, validation, and methods
3. **Service Methods**: ✅ Tests all transformation methods via reflection
4. **Error Handling**: ✅ Tests error scenarios with real implementations
5. **End-to-End**: ✅ Complete round-trip testing maintained
6. **Structure Sensitivity**: ✅ Tests fail if methods/properties change

## Notes

- This solution is **NOT** traditional mocking - it tests real code via runtime resolution
- Tests will **break** if class structure changes (method names, signatures, properties)
- Approach can be applied to other circular dependency scenarios in UMIG
- Performance impact negligible - reflection occurs only during test execution
- Maintains full compatibility with existing UMIG testing infrastructure

## Related

- ADR-036: Pure Groovy Testing Framework
- US-056-A: Service Layer Standardization
- User requirement: "tests that break if code structure changes"
