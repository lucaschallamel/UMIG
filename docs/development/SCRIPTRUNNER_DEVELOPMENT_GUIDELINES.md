# ScriptRunner Development Guidelines for UMIG Project

**Version**: 2.0 | **Created**: August 26, 2025 | **Status**: Production Ready  
**Context**: Based on comprehensive 6+ hour troubleshooting session breakthrough patterns and ADR-048 implementation  
**Foundation**: Built on proven solutions from EnhancedEmailService.groovy radical simplification (845→186 lines) and systematic compatibility framework

## Executive Summary

This document establishes mandatory development patterns for UMIG project's ScriptRunner environment, based on breakthrough insights from resolving persistent static type checking failures across 4 critical files. The key discovery: **ScriptRunner compatibility requires architectural simplification, not complex workarounds**.

### Critical Success Metrics Achieved
- ✅ 4 files successfully fixed with 100% type checking compliance
- ✅ 78% code reduction while maintaining full functionality  
- ✅ Zero compilation errors after systematic pattern application
- ✅ Proven architectural patterns documented for reuse

## Core Development Principles

### 1. Radical Simplification Strategy (Primary Pattern)

**Principle**: Reduce complexity rather than fighting the ScriptRunner type system.

**Implementation Framework**:

```groovy
// ❌ AVOID: Complex template-based patterns
class ComplexService {
    private SimpleTemplateEngine templateEngine
    private Map<String, Object> dependencies
    def complexProcessing() {
        // 845 lines of complex logic
    }
}

// ✅ APPLY: Direct, stateless implementation
class SimplifiedService {
    static def processDirectly(Map params) {
        return DatabaseUtil.withSql { sql ->
            // Direct, explicit operations
        }
    }
}
```

**Success Evidence**: EnhancedEmailService.groovy reduced from 845 to 186 lines with zero functionality loss.

### 2. Circular Dependency Prevention (Architectural Pattern)

**Problem**: Bidirectional dependencies cause compilation order failures in ScriptRunner.

**Solution**: Use reflection-based indirect access pattern.

```groovy
// ❌ PROBLEMATIC: Direct circular dependency
class ServiceA {
    private ServiceB serviceB  // Compilation failure
}

// ✅ SOLUTION: Reflection pattern
class ServiceA {
    private getServiceB() {
        return Class.forName('umig.utils.ServiceB')
    }
    
    def useServiceB() {
        def serviceBClass = getServiceB()
        def method = serviceBClass.getMethod('methodName', String.class)
        return method.invoke(null, parameters)
    }
}
```

**Pattern Application**: Successfully applied in EnhancedEmailNotificationService.groovy and StepNotificationIntegration.groovy.

### 3. Type Safety Compliance (Mandatory Pattern)

**Requirement**: All request parameters MUST be explicitly cast immediately with error handling.

```groovy
// ✅ MANDATORY: Explicit casting with error handling
try {
    params.migrationId = UUID.fromString(filters.migrationId as String)
    params.teamId = Integer.parseInt(filters.teamId as String)
    params.active = Boolean.parseBoolean(filters.active as String)
} catch (IllegalArgumentException e) {
    throw new IllegalArgumentException("Invalid parameter format: ${e.message}")
}

// ❌ PROHIBITED: Dynamic type inference
params.teamId = Integer.parseInt(filters.teamId)  // Compilation failure
```

**Integration**: Extends ADR-031 with ScriptRunner-specific requirements.

### 4. Safe vs Problematic Dependencies (Architectural Guide)

#### ✅ Safe Dependencies (Proven Compatibility)
- **DatabaseUtil** (ScriptRunner provided)
- **Basic Groovy collections** with explicit typing
- **Direct SQL operations**
- **JsonBuilder/JsonSlurper** with explicit casting
- **Standard Java libraries**

#### ❌ Problematic Dependencies (Avoid or Use Carefully)
- **SimpleTemplateEngine** (causes compilation failures)
- **Heavy reflection usage** (performance and reliability issues)
- **Circular dependencies** between same-layer classes
- **Generic return types** without explicit casting
- **Dynamic property access** without type safety

## Mandatory Development Standards

### Architecture Requirements

1. **Independent Utils Classes**: All utility classes MUST be stateless and independent
2. **NO Circular Dependencies**: Classes within same layer cannot have bidirectional dependencies
3. **Explicit Return Types**: Repository methods MUST specify explicit return types
4. **Template Engine Avoidance**: Avoid SimpleTemplateEngine and similar dynamic engines

### Type Safety Requirements (ADR-031 + ADR-048)

1. **Request Parameter Casting**: All request parameters MUST be explicitly cast immediately upon receipt
2. **Database Result Processing**: Use bracket notation with explicit casting: `row['field'] as Type`
3. **Collection Initialization**: Initialize collections with explicit generic types
4. **Method Signatures**: Specify explicit parameter and return types for all methods

### Code Quality Gates (Pre-Commit Validation)

**Mandatory Validation Checklist**:
- [ ] No circular dependencies between same-layer classes
- [ ] All request parameters explicitly cast
- [ ] All database result access uses bracket notation with casting
- [ ] All collections initialized with explicit generic types
- [ ] All method signatures specify explicit types
- [ ] Static type checking passes without warnings

## Implementation Patterns Library

### Pattern 1: Replacing Complex Template Processing

```groovy
// Before: Template-based approach (problematic)
def templateEngine = new SimpleTemplateEngine()
def template = templateEngine.createTemplate(templateContent)
def binding = [user: user, step: step]
def result = template.make(binding).toString()

// After: Direct string building (compatible)
def content = buildEmailContent(user, step)
static String buildEmailContent(Map user, Map step) {
    return """
    <html>
        <body>
            <h1>Step Update: ${step.name}</h1>
            <p>User: ${user.displayName}</p>
            <p>Status: ${step.status}</p>
        </body>
    </html>
    """
}
```

### Pattern 2: Breaking Circular Dependencies

```groovy
// Before: Circular service calls (problematic)
class EmailService {
    private NotificationService notificationService
    def sendEmail() {
        notificationService.processNotification()
    }
}
class NotificationService {
    private EmailService emailService  // Circular dependency
}

// After: Reflection-based delegation (compatible)
class EmailService {
    static def sendEmail(List recipients, String subject, String body) {
        // Direct implementation without dependencies
        return DatabaseUtil.withSql { sql ->
            // Send email logic here
        }
    }
}
class NotificationService {
    def processNotification() {
        def emailServiceClass = Class.forName('umig.utils.EmailService')
        def sendEmailMethod = emailServiceClass.getMethod('sendEmail', List.class, String.class, String.class)
        return sendEmailMethod.invoke(null, recipients, subject, body)
    }
}
```

### Pattern 3: Safe Collection Operations

```groovy
// Before: Generic collections (problematic)
def errors = []
errors << "Some error"
def result = errors.join(", ")

// After: Explicit typing (compatible)
List<String> errors = new ArrayList<String>()
errors.add("Some error")
String result = errors.join(", ")
```

### Pattern 4: Database Interaction Patterns

```groovy
// Safe DatabaseUtil pattern
static Map<String, Object> findById(UUID id) {
    return DatabaseUtil.withSql { sql ->
        def result = sql.firstRow(
            'SELECT id, name, status FROM table WHERE id = ?', 
            [id]
        )
        return result ? [
            id: result.id as UUID,
            name: result.name as String,
            status: result.status as String
        ] : null
    }
}
```

## Troubleshooting Framework

### Error Resolution Process

1. **Static Type Checking Errors**: Address immediately with explicit casting
2. **Circular Dependencies**: Implement reflection pattern or architectural refactoring
3. **Template Engine Issues**: Replace with direct string manipulation
4. **Compilation Failures**: Apply radical simplification strategy

### Diagnostic Checklist (by Error Type)

#### "Failed type checking" Errors
- [ ] Check for untyped destructuring assignments
- [ ] Verify all UUID.fromString() calls use `as String` casting
- [ ] Ensure all Integer.parseInt() calls use `as String` casting
- [ ] Review object property access patterns
- [ ] Validate method parameter names match calling patterns

#### "Cannot resolve class" Errors
- [ ] Check for circular dependencies
- [ ] Verify import statements
- [ ] Validate classpath availability
- [ ] Consider reflection pattern for cross-dependencies

#### Runtime ClassCastException
- [ ] Add explicit casting at parameter boundaries
- [ ] Review database result handling
- [ ] Check collection type specifications

## Integration with Existing Standards

### ADR Compliance

- **ADR-031**: Extended with ScriptRunner-specific casting patterns
- **ADR-043**: PostgreSQL JDBC type casting compatibility maintained
- **ADR-044**: Repository access patterns enhanced for ScriptRunner
- **ADR-048**: Complete ScriptRunner development constraints framework

### Testing Integration

```bash
# Validation commands
npm run test:unit           # Includes type checking validation
npm run test:integration    # API type validation
npm run test:all           # Complete validation including type checking
```

### Development Workflow Integration

```groovy
// Local development type checking
@groovy.transform.TypeChecked  // Add for development validation
class YourServiceClass {
    // Implementation with explicit typing
}
```

## Performance and Security Considerations

### Performance Benefits
- **Compile-time Error Detection**: Issues caught before deployment
- **Runtime Performance**: Optimized bytecode generation
- **Maintenance**: Easier debugging and code understanding
- **No Performance Penalties**: Explicit casting has no runtime overhead

### Security Patterns
- **Input Validation**: All parameters validated at entry points
- **SQL Injection Prevention**: Parameterized queries mandatory
- **Type Safety**: Prevents ClassCastException vulnerabilities
- **Error Handling**: Graceful degradation with proper error messages

## Future Prevention Strategies

### Code Review Standards
- [ ] No untyped destructuring assignments
- [ ] All closures have explicit types or are replaced with methods
- [ ] All type conversions use explicit casting
- [ ] Method signatures match calling patterns exactly
- [ ] No circular dependencies in same layer

### Development Practices

1. **Test Early**: Validate type checking during development
2. **Explicit Over Implicit**: Always prefer explicit typing
3. **Method Over Closure**: Use methods instead of closures when possible
4. **Stateless Design**: Prefer stateless utility classes
5. **Simple Solutions**: Choose simplicity over complexity

### Team Knowledge Sharing

- **Pattern Documentation**: Add new patterns to this guide as discovered
- **Solution Sharing**: Update troubleshooting framework based on experience
- **Continuous Validation**: Include type checking in all quality gates

## Emergency Procedures

### Critical Issue Resolution

**For persistent compilation failures**:

1. **Immediate Action**: Apply radical simplification strategy
2. **Architectural Review**: Identify circular dependencies
3. **Pattern Application**: Use proven reflection patterns
4. **Validation**: Ensure type safety compliance

### Recovery Patterns

```groovy
// Emergency simplification template
class EmergencySimplifiedService {
    static def processRequest(Map params) {
        // Validate and cast all parameters immediately
        UUID id = UUID.fromString(params.id as String)
        String action = params.action as String
        
        // Use DatabaseUtil for all data access
        return DatabaseUtil.withSql { sql ->
            // Direct, simple implementation
            return sql.firstRow('SELECT * FROM table WHERE id = ?', [id])
        }
    }
}
```

## Success Metrics and Validation

### Quality Gates
- **100% Static Type Checking**: All files must pass without warnings
- **Zero Circular Dependencies**: Architectural validation required
- **Explicit Casting Coverage**: All parameter boundaries covered
- **Performance Maintenance**: No degradation from simplification

### Continuous Improvement
- **Pattern Evolution**: Document new successful patterns
- **Failure Analysis**: Learn from any compilation issues
- **Performance Monitoring**: Ensure simplification maintains performance
- **Team Feedback**: Incorporate developer experience improvements

## Conclusion

ScriptRunner development in the UMIG project requires adherence to specific architectural patterns that prioritize simplicity, explicit typing, and independence. The key insights from our breakthrough troubleshooting session are:

1. **Simplicity Wins**: Radical simplification outperforms complex workarounds
2. **Architecture Matters**: Circular dependencies must be eliminated at design time
3. **Type Safety is Mandatory**: All parameters require explicit casting
4. **Dependencies Should Be Minimal**: Use safe, proven dependencies only

By following these guidelines, all UMIG developers can achieve 100% ScriptRunner compatibility while maintaining high code quality, performance, and maintainability.

---

**Related Documentation**:
- [ADR-048: ScriptRunner Development Constraints and Compatibility Patterns](../adr/ADR-048-scriptrunner-development-constraints-and-compatibility-patterns.md)
- [Groovy Type Checking Troubleshooting Guide](../testing/GROOVY_TYPE_CHECKING_TROUBLESHOOTING_GUIDE.md)
- [Solution Architecture](../solution-architecture.md)
- [Database Best Practices](../dataModel/UMIG_DB_Best_Practices.md)

**Files Successfully Refactored** (August 26, 2025):
- EnhancedEmailService.groovy - 845→186 lines (78% reduction)
- EnhancedEmailNotificationService.groovy - Reflection pattern applied
- StepNotificationIntegration.groovy - Circular dependency resolved
- StepsApi.groovy - Type casting compliance achieved

**Result**: 100% ScriptRunner compatibility achieved with architectural simplification approach.