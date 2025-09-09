# Solution Building Block Templatemarkdown# Solution Building Block: [SBB-XXX-NNN]

**Classification:** [Core Pattern | Data Access Pattern | Service Pattern | UI Pattern]  
**Technology Stack:** [List specific technologies, versions]  
**Implements ABB:** [ABB-XXX-NNN] ([ABB Name])  
**Version:** 1.0  
**Status:** [Draft | Review | Approved | Deprecated]  
**Date:** [YYYY-MM-DD]

## Specification

| Attribute              | Value                                                   |
| ---------------------- | ------------------------------------------------------- |
| **Purpose**            | [Clear statement of what this SBB does]                 |
| **Scope**              | [Where this SBB is used within the system]              |
| **Dependencies**       | [List of other SBBs, libraries, or components required] |
| **Performance Target** | [Specific measurable performance requirement]           |
| **Resource Usage**     | [Memory, CPU, network requirements]                     |

## Technical Implementation

### Core Implementation

````groovy// Primary implementation code
// Include actual working code that demonstrates the pattern
@CompileStatic  // If applicable
class [ClassName] {// Implementation details}

### Configuration Requirements

```groovy// Configuration setup if needed
def config = [
// Configuration parameters
]

### Usage Example

```groovy// Show how to use this SBB
def example = new ClassName
example.performOperation()

## Interfaces

### Required Interfaces (What this SBB needs)

| Interface | Purpose | Provider |
|-----------|---------|----------|
| [Interface name] | [Why needed] | [Which component provides] |

### Provided Interfaces (What this SBB offers)

| Method/Function | Parameters | Returns | Description |
|-----------------|------------|---------|-------------|
| `methodName()` | `Type param` | `ReturnType` | [What it does] |

## Quality Requirements

| Requirement | Target | Measurement | Validation |
|-------------|--------|-------------|------------|
| **Reliability** | [Target] | [How measured] | [How validated] |
| **Performance** | [Target] | [How measured] | [How validated] |
| **Maintainability** | [Target] | [How measured] | [How validated] |
| **Security** | [Target] | [How measured] | [How validated] |

## Implementation Constraints

- [Constraint 1: Technical limitation or requirement]
- [Constraint 2: Platform-specific consideration]
- [Constraint 3: Integration requirement]

## Testing Requirements

### Unit Tests

```groovy// Test specification or example
class [ClassName]Test {
@Test
void testCoreFunction() {
// Test implementation
}
}

### Integration Points

- [Integration test requirement 1]
- [Integration test requirement 2]

## Known Issues & Limitations

| Issue | Impact | Workaround | Fix Plan |
|-------|--------|------------|----------|
| [Issue description] | [Impact level] | [Temporary solution] | [Planned resolution] |

## Related Building Blocks

- **Depends On:** [List of SBBs this depends on]
- **Used By:** [List of SBBs that use this]
- **Similar To:** [Related patterns or alternatives]

## Compliance & Standards

- **ADR Compliance:** [List relevant ADRs, e.g., ADR-031, ADR-043]
- **Pattern Compliance:** [Design patterns followed]
- **Security Standards:** [Security requirements met]

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [Author] | Initial version |

## Approval

- **Technical Review:** [Name, Date]
- **Architecture Review:** [Name, Date]
- **Security Review:** [Name, Date]
````
