# Groovy 3.0.15 ScriptRunner Debugging Patterns

## Critical Type Safety Requirements (ADR-031 Compliance)

### Mandatory Type Casting Patterns
```groovy
// MultivaluedMap must have generic parameters
entityName(httpMethod: "METHOD", groups: ["confluence-users"]) { 
    MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->

    // Object property access requires Map casting
    def statusRecord = repository.findStatus()
    def statusId = (statusRecord as Map).id as Integer
    
    // Method parameters need explicit type casting
    StepNotificationIntegration.updateStatus(stepId, statusId, userId as Integer)
    
    // Collections require item casting
    def statusNames = availableStatuses.collect { (it as Map).name }.join(', ')
}
```

## Common Error Patterns & Solutions

### 1. "Unexpected input: '{'" Error
- **Misleading**: Often indicates file corruption or structural issues, NOT actual syntax error
- **Solution**: Complete refactoring rather than incremental fixes
- **Root Causes**: Corrupted file content, wrong imports, missing type casting

### 2. "unable to resolve class" Error
- **Root Cause**: Incorrect package structure
- **Wrong**: `import umig.utils.UserService`
- **Correct**: `import umig.service.UserService`
- **Rule**: Services in umig.service, utilities in umig.utils - exact match required

### 3. "No such property for Object" Error
- **Root Cause**: Missing explicit Map casting
- **Solution**: Cast objects before property access: `(object as Map).property`

### 4. "Cannot find matching method" Error
- **Root Cause**: Parameter types need explicit casting
- **Solution**: Cast all method parameters: `methodCall(param as Integer)`

## Reference Implementation Template
```groovy
// Gold Standard Template for ScriptRunner REST Endpoints
entityName(httpMethod: "METHOD", groups: ["confluence-users"]) { 
    MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    
    try {
        // Parse with explicit casting
        def filters = parseAndValidateFilters(queryParams)
        def param1 = filters.param1 as String
        def param2 = filters.param2 as Integer
        
        // Repository pattern
        def repository = new EntityRepository()
        def result = repository.findEntities(filters)
        
        return Response.ok(new JsonBuilder(result).toString()).build()
    } catch (Exception e) {
        return handleError(e, "METHOD /entityName")
    }
}
```

## Debugging Strategy (Proven Approach)

1. **Pattern Comparison First**: Compare with StepsApi.groovy (gold standard)
2. **Import Verification**: Check package structure matches project layout
3. **Type Safety Application**: Apply explicit type casting everywhere
4. **Complete Refactoring**: If incremental fixes fail, refactor completely
5. **File Integrity Check**: Consider file corruption for persistent syntax errors

## Critical Success Factors

### Prevention Best Practices
- Always reference StepsApi.groovy for proven patterns
- Use explicit type casting at every boundary
- Verify imports match exact package structure
- Document type safety patterns for consistency
- Create templates to prevent repeated issues

### Key Insight from US-039 Resolution
**"The visible error message may not reflect the actual problem"**
- Surface fixes often fail with Groovy 3.0.15 + ScriptRunner
- Pattern comparison and complete refactoring more effective than incremental debugging
- ADR-031 compliance is mandatory, not optional

## Cross-References
- ADR-031 Type Safety Standards
- StepsApi.groovy (reference implementation)
- US-039 Enhanced Email Notifications (context)
- EnhancedStepsApi.groovy (resolved implementation)

## Technical Context
- **Platform**: Confluence 9.2.7 + ScriptRunner 9.21.0
- **Language**: Groovy 3.0.15 with static type checking
- **Pattern**: ScriptRunner REST endpoints with repository pattern
- **Compliance**: ADR-031 Type Safety Standards mandatory

This knowledge prevents future debugging sessions and accelerates development by providing proven patterns and debugging strategies.