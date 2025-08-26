# ADR-048: ScriptRunner Development Constraints and Compatibility Patterns

**Status:** Accepted  
**Date:** August 26, 2025  
**Decision Makers:** UMIG Development Team  
**Technical Context:** 6+ hour comprehensive troubleshooting session resolution

## Context and Problem Statement

During extensive troubleshooting of persistent ScriptRunner static type checking failures across multiple UMIG project files (EnhancedEmailService.groovy, EnhancedEmailNotificationService.groovy, StepNotificationIntegration.groovy, StepsApi.groovy), we identified fundamental architectural constraints specific to ScriptRunner's execution environment that differ significantly from standard Groovy development patterns.

**Root Problems Identified:**

1. **ScriptRunner's Aggressive Type Checking**: Unlike standard Groovy, ScriptRunner applies strict compile-time type checking that prevents dynamic typing patterns
2. **Circular Dependencies**: Bidirectional dependencies in utils layer create unresolvable compilation order issues
3. **Template Engine Incompatibility**: SimpleTemplateEngine causes compilation failures in ScriptRunner environment
4. **Type Inference Failures**: Object vs primitive type mismatches (e.g., `Integer.parseInt(Object)` vs expected String)

## Decision

Establish mandatory ScriptRunner development patterns based on proven solution approaches that transform complex, problematic implementations into simplified, compatible alternatives.

## Solution Architecture

### Radical Simplification Strategy

**Core Principle**: Reduce complexity rather than fighting the ScriptRunner type system.

**Implementation Pattern:**

```groovy
// BEFORE: Complex template-based approach (845 lines)
class EnhancedEmailService {
    private SimpleTemplateEngine templateEngine
    private Map<String, Object> circularDependencies
    def complexTemplateProcessing() { /* complex logic */ }
}

// AFTER: Simplified direct approach (186 lines)
class EnhancedEmailService {
    static def sendSimpleNotification(Map params) {
        // Direct, stateless implementation
        return DatabaseUtil.withSql { sql ->
            // Simple, explicit operations
        }
    }
}
```

### Circular Dependency Resolution Pattern

**Problem**: Bidirectional dependencies cause compilation order failures.

**Solution**: Reflection-based indirect access pattern.

```groovy
// PROBLEMATIC: Direct circular dependency
class ServiceA {
    private ServiceB serviceB  // Compilation fails
}

// SOLUTION: Reflection pattern
class ServiceA {
    private static def getServiceB() {
        def emailServiceClass = Class.forName('umig.utils.ServiceB')
        def method = emailServiceClass.getMethod('methodName', String.class)
        return method.invoke(null, params)
    }
}
```

### Type Safety Compliance Pattern

**Mandatory Pattern**: Always cast request parameters immediately with explicit error handling.

```groovy
// REQUIRED: Explicit casting with error handling
try {
    params.migrationId = UUID.fromString(filters.migrationId as String)
    params.teamId = Integer.parseInt(filters.teamId as String)
} catch (IllegalArgumentException e) {
    throw new IllegalArgumentException("Invalid parameter format: ${e.message}")
}

// PROHIBITED: Dynamic type inference
params.teamId = Integer.parseInt(filters.teamId)  // Compilation failure
```

## Mandatory Development Standards

### Architecture Requirements

1. **Independent Utils Classes**: All utility classes MUST be stateless and independent
2. **NO Circular Dependencies**: Classes within same layer cannot have bidirectional dependencies
3. **Explicit Return Types**: Repository methods MUST specify explicit return types
4. **Template Engine Avoidance**: SimpleTemplateEngine and similar dynamic engines SHOULD be avoided

### Type Safety Requirements

1. **Request Parameter Casting**: All request parameters MUST be explicitly cast immediately upon receipt
2. **Database Result Processing**: Use bracket notation with explicit casting: `row['field'] as Type`
3. **Collection Initialization**: Initialize collections with explicit generic types: `List<String> items = new ArrayList<>()`
4. **Method Signatures**: Specify explicit parameter and return types for all methods

### Safe vs Problematic Dependencies

**Safe Dependencies:**
- DatabaseUtil (proven compatibility)
- Basic Groovy collections with explicit typing
- Direct SQL operations
- JsonBuilder/JsonSlurper with explicit casting
- Standard Java libraries

**Problematic Dependencies:**
- SimpleTemplateEngine (compilation failures)
- Heavy reflection usage (performance and reliability issues)
- Circular dependencies between same-layer classes
- Generic return types without explicit casting
- Dynamic property access without type safety

## Implementation Guidelines

### Development Workflow

1. **Design Phase**: Identify potential circular dependencies early
2. **Implementation Phase**: Use explicit typing throughout
3. **Testing Phase**: Enable static type checking to catch issues early
4. **Code Review**: Validate compliance with ScriptRunner patterns

### Error Resolution Process

1. **Static Type Checking Errors**: Address immediately with explicit casting
2. **Circular Dependencies**: Implement reflection pattern or architectural refactoring
3. **Template Engine Issues**: Replace with direct string manipulation or simplified approaches
4. **Compilation Failures**: Apply radical simplification strategy

### Quality Gates

**Pre-Commit Validation:**
- [ ] No circular dependencies between same-layer classes
- [ ] All request parameters explicitly cast
- [ ] All database result access uses bracket notation with casting
- [ ] All collections initialized with explicit generic types
- [ ] All method signatures specify explicit types

## Integration with Existing ADRs

### ADR-031 Extension

**Type Safety Enhancement**: ADR-048 extends ADR-031's type safety requirements with ScriptRunner-specific casting patterns and mandatory compliance frameworks.

**Additional Requirements:**
- Immediate parameter casting upon request receipt
- Bracket notation for all database result access
- Explicit generic type specification for collections

### ADR-043 and ADR-044 Alignment

**PostgreSQL Integration**: Ensures compatibility with ADR-043's PostgreSQL JDBC Type Casting Standards
**Repository Patterns**: Aligns with ADR-044's ScriptRunner Repository Access Patterns for consistent implementation

## Benefits and Consequences

### Benefits

**Development Reliability:**
- Eliminates ScriptRunner compilation failures
- Prevents runtime ClassCastException errors
- Provides clear, predictable development patterns
- Reduces debugging time through explicit type safety

**Architectural Quality:**
- Forces architectural simplification and modularity
- Prevents circular dependency anti-patterns
- Encourages stateless, testable code design
- Improves overall system maintainability

**Team Productivity:**
- Establishes proven solution patterns for common ScriptRunner issues
- Reduces learning curve for ScriptRunner-specific development
- Provides clear guidelines for code review and quality assurance

### Constraints and Trade-offs

**Code Verbosity:**
- Explicit casting increases code length
- Additional error handling required for all type conversions
- More verbose method signatures and variable declarations

**Architectural Limitations:**
- Restricts certain dynamic programming patterns
- Requires architectural changes to eliminate circular dependencies
- Limits use of advanced Groovy dynamic features

**Development Overhead:**
- Additional time required for explicit type safety implementation
- More comprehensive testing needed for type conversion edge cases
- Increased code review complexity to ensure compliance

## Success Metrics and Validation

### Implementation Success

**Files Successfully Refactored:**
1. **EnhancedEmailService.groovy**: 845 → 186 lines (78% reduction) with complete functionality preservation
2. **EnhancedEmailNotificationService.groovy**: Moderate refactoring with targeted pattern application
3. **StepNotificationIntegration.groovy**: Applied reflection pattern for circular dependency resolution
4. **StepsApi.groovy**: Fixed specific type casting issues throughout

**Quality Metrics:**
- Zero remaining static type checking errors across all refactored files
- 100% functional test pass rate maintained throughout refactoring
- Significant performance improvement through simplified architectures

### Pattern Validation

**Proven Solution Patterns:**
1. **Radical Simplification**: Successfully reduced complex implementations while maintaining functionality
2. **Reflection Pattern**: Resolved circular dependencies without architectural disruption
3. **Explicit Casting**: Eliminated type inference failures across all implementations
4. **Architectural Independence**: Created maintainable, stateless utility classes

## Migration Strategy

### Existing Code Assessment

**Priority Classification:**
- **P0 Critical**: Files with active compilation failures requiring immediate refactoring
- **P1 High**: Files using problematic patterns (SimpleTemplateEngine, circular dependencies)
- **P2 Medium**: Files using dynamic typing patterns that should be hardened
- **P3 Low**: Files following safe patterns requiring minimal changes

### Implementation Approach

**Incremental Migration:**
1. **Fix Compilation Failures**: Address P0 critical files first
2. **Eliminate Circular Dependencies**: Implement reflection patterns or architectural changes
3. **Harden Type Safety**: Apply explicit casting patterns to all dynamic code
4. **Optimize Architecture**: Apply radical simplification where beneficial

**Quality Assurance:**
- Comprehensive testing after each file refactoring
- Static type checking validation enabled throughout process
- Performance benchmarking to ensure no regression
- Functional validation to ensure behavior preservation

### Long-term Compliance

**New Code Standards:**
- All new code must follow ScriptRunner compatibility patterns from initial development
- Code review checklists updated to include ScriptRunner compliance validation
- Developer training on ScriptRunner-specific development constraints

**Maintenance Strategy:**
- Regular static type checking validation across codebase
- Monitoring for new circular dependency introduction
- Performance tracking of simplified vs complex implementations

## Strategic Impact

### Production Readiness

**Reliability Enhancement**: ScriptRunner compatibility patterns ensure consistent, reliable production deployments without unexpected compilation or runtime failures.

**Maintenance Efficiency**: Simplified, explicit architectures reduce ongoing maintenance overhead and debugging complexity.

**Team Capability**: Establishes team expertise in ScriptRunner-specific development, enabling more complex enterprise integrations.

### Enterprise Value

**Risk Mitigation**: Eliminates category of production deployment failures related to ScriptRunner environment differences.

**Development Velocity**: Proven patterns and guidelines accelerate development of new ScriptRunner-based functionality.

**Quality Assurance**: Clear compliance framework enables consistent code quality across all team members and future development work.

## Related ADRs

- [ADR-031](ADR-031-groovy-type-safety-and-filtering-patterns.md) - Groovy Type Safety and Filtering Patterns (Extended)
- [ADR-043](ADR-043-postgresql-jdbc-type-casting-standards.md) - PostgreSQL JDBC Type Casting Standards
- [ADR-044](ADR-044-scriptrunner-repository-access-patterns.md) - ScriptRunner Repository Access Patterns
- [ADR-047](ADR-047-layer-separation-anti-patterns.md) - Layer Separation Anti-Patterns