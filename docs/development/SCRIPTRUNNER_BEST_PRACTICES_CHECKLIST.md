# ScriptRunner Best Practices Checklist

**Version**: 1.0 | **Created**: August 26, 2025 | **Status**: Production Ready  
**Purpose**: Quick reference checklist for UMIG developers working in ScriptRunner environment  
**Foundation**: Based on breakthrough troubleshooting session and ADR-048 implementation

## Pre-Development Checklist

### ✅ Architecture Design Phase

- [ ] **Identify Dependencies**: Map all service dependencies before implementation
- [ ] **Check for Circular Dependencies**: Ensure no bidirectional dependencies in same layer
- [ ] **Plan for Simplicity**: Choose simple, explicit patterns over complex solutions
- [ ] **Review Template Usage**: Avoid SimpleTemplateEngine and similar dynamic engines
- [ ] **Design Stateless Services**: Ensure utilities are independent and stateless

### ✅ Implementation Phase

#### Type Safety (MANDATORY)
- [ ] **Cast All Request Parameters**: Use `as String`, `as Integer` immediately upon receipt
- [ ] **Add Error Handling**: Wrap all casting in try-catch blocks
- [ ] **Specify Return Types**: All methods must have explicit return types
- [ ] **Initialize Collections**: Use explicit generic types (`List<String>`, `Map<String, Object>`)
- [ ] **Database Result Casting**: Use bracket notation with casting `row['field'] as Type`

#### Code Structure
- [ ] **Avoid Destructuring**: Replace `def (a, b) = method()` with direct assignment
- [ ] **Explicit Method Signatures**: All parameters and returns must be typed
- [ ] **Use DatabaseUtil Pattern**: All database access through `DatabaseUtil.withSql`
- [ ] **Implement Direct Approaches**: Avoid complex template or reflection patterns

#### Dependency Management
- [ ] **Use Safe Dependencies**: DatabaseUtil, basic Groovy collections, standard Java libraries
- [ ] **Avoid Problematic Patterns**: SimpleTemplateEngine, heavy reflection, circular dependencies
- [ ] **Implement Reflection Pattern**: For necessary cross-service communication, use reflection

## Development Validation Checklist

### ✅ Code Quality Gates

#### Static Type Checking (MANDATORY)
- [ ] **Run Type Checking**: Ensure all files pass ScriptRunner static type checking
- [ ] **No Compilation Warnings**: Address all "Failed type checking" warnings
- [ ] **Validate Method Calls**: Ensure parameter names match method signatures exactly
- [ ] **Check Object Access**: Cast objects to proper types before property access

#### Pattern Compliance
- [ ] **No Template Engines**: Verify no usage of SimpleTemplateEngine or similar
- [ ] **No Circular Dependencies**: Confirm no bidirectional service dependencies
- [ ] **Explicit Typing Everywhere**: All variables and methods properly typed
- [ ] **Safe Collection Operations**: Use `.add()` instead of `<<` operator

### ✅ Testing Integration

#### Unit Testing
- [ ] **Type Safety Tests**: Validate all parameter casting works correctly
- [ ] **Error Handling Tests**: Verify graceful handling of invalid parameters
- [ ] **Database Integration**: Test all repository methods with proper casting
- [ ] **Service Integration**: Validate service communication patterns

#### Integration Testing
- [ ] **API Endpoint Tests**: Verify all endpoints handle parameters correctly
- [ ] **Authentication Tests**: Validate user context and permissions
- [ ] **Error Response Tests**: Ensure proper HTTP status codes and messages
- [ ] **Performance Tests**: Verify response times meet requirements (<3s)

## Troubleshooting Checklist

### ✅ Common Error Resolution

#### "Failed type checking" Errors
- [ ] **Check Destructuring**: Look for `def (a, b) = ...` patterns and replace
- [ ] **Verify Casting**: Ensure all `UUID.fromString()`, `Integer.parseInt()` use `as String`
- [ ] **Review Closures**: Replace untyped closures with explicit methods
- [ ] **Validate Object Access**: Cast objects to Map before property access

#### "Cannot resolve class" Errors
- [ ] **Check Imports**: Verify all import statements are correct
- [ ] **Identify Circular Dependencies**: Look for bidirectional service calls
- [ ] **Apply Reflection Pattern**: Use reflection for cross-service communication
- [ ] **Validate Classpath**: Ensure all required classes are available

#### Runtime ClassCastException
- [ ] **Add Parameter Casting**: Cast all parameters at method entry points
- [ ] **Review Database Results**: Ensure proper casting of SQL results
- [ ] **Check Collection Types**: Verify collection initialization with proper generics
- [ ] **Validate Method Returns**: Ensure returned objects match declared types

## Emergency Procedures

### ✅ Critical Issue Response

#### Immediate Actions
- [ ] **Apply Radical Simplification**: Reduce complex code to simple, direct patterns
- [ ] **Remove Circular Dependencies**: Break dependency cycles using reflection pattern
- [ ] **Add Explicit Casting**: Cast all parameters and returns immediately
- [ ] **Eliminate Dynamic Patterns**: Replace templates and complex logic with direct code

#### Recovery Pattern
```groovy
// Emergency simplification template
class EmergencyService {
    static def processRequest(Map params) {
        // 1. Cast all parameters immediately
        UUID id = UUID.fromString(params.id as String)
        String action = params.action as String
        
        // 2. Use DatabaseUtil for data access
        return DatabaseUtil.withSql { sql ->
            // 3. Direct, simple implementation
            def result = sql.firstRow('SELECT * FROM table WHERE id = ?', [id])
            return result ? [
                id: result.id as UUID,
                name: result.name as String,
                status: result.status as String
            ] : null
        }
    }
}
```

## Code Review Checklist

### ✅ Reviewer Validation Points

#### Architecture Review
- [ ] **No Circular Dependencies**: Confirm no bidirectional service dependencies
- [ ] **Stateless Design**: Verify utilities are independent and stateless
- [ ] **Simple Patterns**: Ensure code follows simplification over complexity principle
- [ ] **Safe Dependencies**: Confirm only approved dependencies are used

#### Type Safety Review
- [ ] **All Parameters Cast**: Verify explicit casting for all request parameters
- [ ] **Database Result Handling**: Check proper casting of all SQL results
- [ ] **Collection Initialization**: Ensure proper generic type specification
- [ ] **Method Signatures**: Validate all methods have explicit types

#### Quality Review
- [ ] **Static Type Checking**: Confirm all files pass without warnings
- [ ] **Error Handling**: Verify graceful error handling with proper messages
- [ ] **Performance**: Ensure code meets response time requirements
- [ ] **Documentation**: Check code comments and architectural documentation

## Success Metrics Validation

### ✅ Pre-Commit Validation

#### Compilation Success
- [ ] **100% Type Checking**: All files must pass ScriptRunner static type checking
- [ ] **No Compilation Errors**: Zero compilation failures in ScriptRunner environment
- [ ] **Clean Build**: All services compile without warnings or errors

#### Pattern Compliance
- [ ] **ADR-048 Compliance**: All code follows ScriptRunner development constraints
- [ ] **Architectural Standards**: Code adheres to established patterns
- [ ] **Documentation Updated**: New patterns documented for team reference

#### Testing Success
- [ ] **Unit Tests Pass**: All type safety and error handling tests pass
- [ ] **Integration Tests Pass**: All API and service integration tests pass
- [ ] **Performance Tests Meet Targets**: Response times under 3 seconds

## Team Knowledge Sharing

### ✅ Knowledge Management

#### Documentation Maintenance
- [ ] **Pattern Library Updated**: New successful patterns added to documentation
- [ ] **Troubleshooting Guide Enhanced**: New solutions added to troubleshooting framework
- [ ] **Best Practices Evolved**: Checklist updated based on team experience
- [ ] **ADR Updates**: Architectural decisions documented and reviewed

#### Team Training
- [ ] **Pattern Sharing**: New patterns shared in team meetings
- [ ] **Success Stories**: Successful implementations documented and shared
- [ ] **Failure Analysis**: Failed approaches analyzed and documented
- [ ] **Continuous Improvement**: Regular review and enhancement of practices

## Quick Reference Commands

### ✅ Validation Commands

```bash
# Test commands for validation
npm run test:unit           # Unit tests with type checking
npm run test:integration    # Integration tests with API validation
npm run test:all           # Complete test suite
npm run test:groovy        # Groovy-specific tests

# Development workflow
npm start                   # Start development environment
npm run restart:erase      # Reset environment with fresh data
npm run generate-data:erase # Generate test data
```

### ✅ ScriptRunner Console Validation

```groovy
// Quick type checking validation in ScriptRunner console
@groovy.transform.TypeChecked
def validateCode() {
    // Paste your code here to test type checking
    return "Type checking successful"
}
```

---

**Related Documentation**:
- [ScriptRunner Development Guidelines](./SCRIPTRUNNER_DEVELOPMENT_GUIDELINES.md)
- [Groovy Type Checking Troubleshooting Guide](../testing/GROOVY_TYPE_CHECKING_TROUBLESHOOTING_GUIDE.md)
- [ADR-048: ScriptRunner Development Constraints](../adr/ADR-048-scriptrunner-development-constraints-and-compatibility-patterns.md)
- [Solution Architecture](../solution-architecture.md)

**Successful Implementations** (August 26, 2025):
- EnhancedEmailService.groovy (845→186 lines, 78% reduction)
- EnhancedEmailNotificationService.groovy (reflection pattern applied)
- StepNotificationIntegration.groovy (circular dependency resolved)
- StepsApi.groovy (type casting compliance achieved)

**Team Success**: 100% ScriptRunner compatibility achieved through systematic checklist application