# ADR-039: Enhanced Error Handling and User Guidance

## Status

**Status**: Accepted  
**Date**: 2025-08-14  
**Author**: Development Team  
**Implementation**: US-024 Steps API Refactoring - Developer Experience Enhancement

## Context

During US-024 Steps API refactoring, we identified significant developer experience issues with our current error handling approach. Generic error messages provide insufficient context for developers to understand and resolve issues effectively.

Current error handling challenges:

1. **Generic Error Messages**: Non-specific messages like "Invalid comments endpoint" provide no actionable guidance
2. **Poor Developer Experience**: Developers spend excessive time debugging simple configuration or usage errors
3. **Missing Context**: Error messages lack information about expected inputs, valid options, or corrective actions
4. **Inconsistent Error Patterns**: Different endpoints use varying error message formats and detail levels
5. **Support Burden**: High volume of support requests for issues that could be self-resolved with better error messages

Specific examples of problematic error responses:

```json
// Current problematic response
{
    "error": "Invalid comments endpoint",
    "status": 400
}

// Desired enhanced response
{
    "error": "Invalid comments endpoint configuration",
    "status": 400,
    "details": {
        "message": "Comments functionality is not available for this step type",
        "provided": "GET /steps/123/comments",
        "reason": "Step ID 123 is of type 'AUTOMATED' which does not support comments",
        "suggestions": [
            "Use steps of type 'MANUAL' or 'VERIFICATION' for comments functionality",
            "Check step type with GET /steps/123 before accessing comments",
            "See documentation: /docs/api/comments-support.md"
        ]
    }
}
```

## Decision

We will implement **Enhanced Error Handling and User Guidance** that provides specific, actionable error messages with contextual information and clear resolution guidance.

### Core Architecture

#### 1. Structured Error Response Format

**Standardized Error Object:**
```groovy
class EnhancedErrorResponse {
    String error              // Brief error description
    Integer status           // HTTP status code  
    String endpoint          // API endpoint that failed
    Map<String, Object> details = [
        message: "",         // Detailed explanation
        provided: "",        // What the user provided
        expected: "",        // What was expected
        reason: "",          // Why it failed
        suggestions: [],     // Actionable recommendations
        documentation: ""    // Link to relevant docs
    ]
}
```

#### 2. Context-Aware Error Generation

**Error Context Analysis:**
```groovy
class ErrorContextAnalyzer {
    static EnhancedErrorResponse generateContextualError(
        Exception exception,
        String endpoint,
        Map<String, Object> requestContext
    ) {
        // Analyze request context
        // Determine failure reason
        // Generate specific guidance
        // Provide actionable suggestions
    }
}
```

#### 3. Helpful Error Message Categories

**Configuration Errors:**
```groovy
"Database connection failed" → 
"Database connection failed: PostgreSQL server not accessible at localhost:5432. 
 Check that PostgreSQL is running and .env configuration is correct.
 Suggestions: [verify POSTGRES_URL, check container status, review network connectivity]"
```

**Validation Errors:**
```groovy
"Invalid parameter" → 
"Invalid step_type parameter: provided 'INVALID_TYPE', expected one of: 
 [MANUAL, AUTOMATED, VERIFICATION, APPROVAL]. 
 Suggestions: [check API documentation, validate against enum values, use GET /steps/types for valid options]"
```

**Authorization Errors:**
```groovy
"Access denied" → 
"Access denied: insufficient permissions for step modification. 
 User 'john.doe' requires 'STEP_EDIT' permission for step ID 123.
 Suggestions: [contact administrator, check user roles, verify team membership]"
```

**Business Logic Errors:**
```groovy
"Operation failed" → 
"Operation failed: cannot delete step with active dependencies. 
 Step ID 123 has 2 dependent instructions that must be handled first.
 Suggestions: [delete dependent instructions first, use cascade deletion, modify dependencies]"
```

## Decision Drivers

- **Developer Experience**: Reduce debugging time and frustration
- **Self-Service Resolution**: Enable developers to resolve issues independently
- **Support Burden Reduction**: Minimize support requests for common issues
- **API Usability**: Improve overall API usability and adoption
- **Error Transparency**: Provide clear understanding of failure causes
- **Actionable Guidance**: Include specific steps for resolution

## Considered Options

### Option 1: Generic Error Messages (Current State)
- **Description**: Continue with current minimal error message approach
- **Pros**: Simple implementation, minimal code changes
- **Cons**: Poor developer experience, high support burden, debugging complexity

### Option 2: Verbose Error Logging
- **Description**: Enhance server-side logging without changing API responses
- **Pros**: Better debugging for administrators
- **Cons**: No improvement for API consumers, developers still struggle

### Option 3: Enhanced Error Responses (CHOSEN)
- **Description**: Implement structured, contextual error responses with guidance
- **Pros**: Improved developer experience, reduced support burden, self-service resolution
- **Cons**: Implementation effort, larger response payloads

### Option 4: External Error Documentation
- **Description**: Maintain generic errors but provide comprehensive external documentation
- **Pros**: Detailed guidance available
- **Cons**: Requires context switching, difficult to maintain synchronization

## Decision Outcome

Chosen option: **"Enhanced Error Responses"**, because it provides the most direct and effective improvement to developer experience. This approach:

- Provides immediate, contextual guidance at the point of failure
- Reduces developer debugging time through specific error information
- Enables self-service resolution for common issues
- Maintains consistency across all API endpoints
- Scales naturally with application complexity

### Positive Consequences

- **Improved Developer Experience**: Clear, actionable error messages
- **Reduced Support Burden**: Fewer support requests for common issues
- **Faster Development**: Reduced debugging and troubleshooting time
- **Better API Adoption**: More usable and developer-friendly APIs
- **Enhanced Documentation**: Error messages serve as inline documentation
- **Consistent Error Patterns**: Standardized error format across all endpoints

### Negative Consequences

- **Implementation Effort**: Requires systematic enhancement of error handling
- **Response Size Increase**: Larger error response payloads
- **Maintenance Overhead**: Error messages require ongoing maintenance
- **Complexity**: More sophisticated error generation logic needed

## Implementation Details

### Phase 1: Error Response Framework

**Standardized Error Builder:**
```groovy
class EnhancedErrorBuilder {
    private String error
    private Integer status
    private String endpoint
    private Map<String, Object> details = [:]

    static EnhancedErrorBuilder create(String error, Integer status) {
        return new EnhancedErrorBuilder(error: error, status: status)
    }

    EnhancedErrorBuilder endpoint(String endpoint) {
        this.endpoint = endpoint
        return this
    }

    EnhancedErrorBuilder message(String message) {
        this.details.message = message
        return this
    }

    EnhancedErrorBuilder provided(Object provided) {
        this.details.provided = provided?.toString()
        return this
    }

    EnhancedErrorBuilder expected(Object expected) {
        this.details.expected = expected?.toString()
        return this
    }

    EnhancedErrorBuilder reason(String reason) {
        this.details.reason = reason
        return this
    }

    EnhancedErrorBuilder suggestions(List<String> suggestions) {
        this.details.suggestions = suggestions
        return this
    }

    EnhancedErrorBuilder documentation(String documentation) {
        this.details.documentation = documentation
        return this
    }

    Map<String, Object> build() {
        return [
            error: error,
            status: status,
            endpoint: endpoint,
            details: details
        ]
    }
}
```

### Phase 2: Context-Aware Error Generation

**Request Context Analysis:**
```groovy
class ErrorContextService {
    static Map<String, Object> analyzeFailureContext(
        Exception exception,
        String endpoint,
        Map<String, Object> requestParams
    ) {
        def context = [:]
        
        // Analyze exception type
        if (exception instanceof ValidationException) {
            context.category = 'VALIDATION'
            context.userInput = requestParams
        } else if (exception instanceof SQLException) {
            context.category = 'DATABASE'
            context.sqlState = exception.SQLState
        } else if (exception instanceof SecurityException) {
            context.category = 'AUTHORIZATION'
            context.requiredPermissions = extractRequiredPermissions(endpoint)
        }
        
        return context
    }
}
```

### Phase 3: Endpoint-Specific Error Enhancement

**Steps API Error Enhancement Example:**
```groovy
// Enhanced error handling for Steps API
stepsApi(httpMethod: "POST", groups: ["confluence-users"]) { request, binding ->
    try {
        def stepData = parseRequestBody(request)
        def result = stepsRepository.create(stepData)
        return Response.ok(result).build()
        
    } catch (ValidationException e) {
        def error = EnhancedErrorBuilder
            .create("Invalid step data", 400)
            .endpoint("POST /steps")
            .message("Step creation failed due to validation errors")
            .provided(e.invalidData)
            .expected("Valid step object with required fields: name, type, description")
            .reason(e.message)
            .suggestions([
                "Verify all required fields are provided",
                "Check field types match API specification",
                "Validate enum values against allowed options",
                "Use GET /steps/schema for complete validation rules"
            ])
            .documentation("/docs/api/steps-creation.md")
            .build()
            
        return Response.status(400).entity(error).build()
        
    } catch (SQLException e) {
        if (e.SQLState == "23505") { // Unique constraint violation
            def error = EnhancedErrorBuilder
                .create("Duplicate step name", 409)
                .endpoint("POST /steps")
                .message("A step with this name already exists in the current phase")
                .reason("Unique constraint violation on step_name within phase")
                .suggestions([
                    "Choose a different step name",
                    "Check existing steps with GET /phases/{id}/steps",
                    "Consider adding a numeric suffix to make name unique"
                ])
                .documentation("/docs/api/naming-conventions.md")
                .build()
                
            return Response.status(409).entity(error).build()
        }
        
        // Handle other SQL states with specific guidance
    }
}
```

### Phase 4: Documentation Integration

**Error-to-Documentation Mapping:**
```groovy
class ErrorDocumentationMapper {
    private static final Map<String, String> ERROR_DOCS = [
        "STEP_VALIDATION": "/docs/api/steps-validation.md",
        "COMMENT_SUPPORT": "/docs/api/comments-support.md",
        "PERMISSION_REQUIREMENTS": "/docs/security/permissions.md",
        "DATABASE_CONSTRAINTS": "/docs/data-model/constraints.md"
    ]
    
    static String getDocumentationLink(String errorCategory) {
        return ERROR_DOCS[errorCategory] ?: "/docs/api/general-troubleshooting.md"
    }
}
```

## Validation

Success will be measured by:

1. **Developer Feedback**: Positive feedback on error message helpfulness
2. **Support Request Reduction**: 30% decrease in basic troubleshooting requests
3. **Resolution Time**: Reduced average time to resolve common issues
4. **API Adoption**: Improved developer onboarding and API usage
5. **Error Resolution Rate**: Increased self-service error resolution

## Error Message Quality Standards

### Excellent Error Message Checklist

- [ ] **Specific**: Clearly states what went wrong
- [ ] **Contextual**: Explains why it failed given the input
- [ ] **Actionable**: Provides concrete steps to resolve
- [ ] **Educational**: Helps user understand the system better
- [ ] **Professional**: Maintains appropriate tone and language
- [ ] **Consistent**: Follows standardized format

### Example Transformations

**Before (Generic):**
```json
{"error": "Invalid request", "status": 400}
```

**After (Enhanced):**
```json
{
    "error": "Invalid step type parameter",
    "status": 400,
    "endpoint": "POST /steps",
    "details": {
        "message": "The provided step_type value is not supported",
        "provided": "CUSTOM_TYPE",
        "expected": "One of: MANUAL, AUTOMATED, VERIFICATION, APPROVAL",
        "reason": "Step type must be from predefined enumeration",
        "suggestions": [
            "Use GET /steps/types to see all valid options",
            "Check spelling and capitalization",
            "Refer to API documentation for step type descriptions"
        ],
        "documentation": "/docs/api/steps-creation.md#step-types"
    }
}
```

## Related ADRs

- **ADR-023**: Standardized REST API Patterns - Consistent error response format
- **ADR-031**: Groovy Type Safety - Type validation error handling
- **ADR-036**: Integration Testing Framework - Error scenario testing

## References

- User Story US-024: Steps API Refactoring
- Developer Experience Survey Results
- Support Request Analysis (Q2 2025)
- API Usability Testing Report

## Notes

Enhanced error handling serves as inline documentation and developer education, reducing the barrier to API adoption and usage. Key implementation principles:

1. **Fail Fast with Context**: Provide immediate, specific feedback
2. **Educate Through Errors**: Use errors as learning opportunities
3. **Guide to Resolution**: Always provide actionable next steps
4. **Maintain Consistency**: Use standardized error format across all endpoints
5. **Link to Documentation**: Connect errors to relevant documentation

This approach transforms error messages from obstacles into helpful guidance, significantly improving the developer experience while reducing support burden.