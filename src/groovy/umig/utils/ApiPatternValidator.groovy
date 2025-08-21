package umig.utils

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import java.util.regex.Pattern

/**
 * Automated Pattern Validation for UMIG API Consistency
 * Ensures all APIs follow the proven PlansApi pattern established in US-001
 */
class ApiPatternValidator {
    
    private static final List<String> REQUIRED_HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE']
    private static final List<String> REQUIRED_ENDPOINT_PATTERNS = [
        '/master',           // Master entity operations
        '/master/{id}',      // Specific master entity
        '/instance/{id}',    // Specific instance entity
        '/{id}/status'       // Status update operations
    ]
    
    /**
     * Validates API implementation against established patterns
     * @param apiFilePath Path to the API groovy file
     * @return ValidationResult with compliance status and recommendations
     */
    static Map validateApiPattern(String apiFilePath) {
        Map<String, Object> validationResult = [
            compliant: true,
            score: 0,
            maxScore: 0,
            issues: [],
            recommendations: [],
            patterns: [:]
        ]
        
        try {
            def apiContent = new File(apiFilePath).text
            
            // 1. Validate HTTP Method Coverage
            validateHttpMethods(apiContent, validationResult)
            
            // 2. Validate Endpoint Structure  
            validateEndpointStructure(apiContent, validationResult)
            
            // 3. Validate Repository Pattern Usage
            validateRepositoryPattern(apiContent, validationResult)
            
            // 4. Validate Error Handling
            validateErrorHandling(apiContent, validationResult)
            
            // 5. Validate Type Safety (ADR-031)
            validateTypeSafety(apiContent, validationResult)
            
            // 6. Validate Security Groups
            validateSecurityGroups(apiContent, validationResult)
            
            // Calculate compliance score
            Map<String, Boolean> patterns = validationResult.patterns as Map<String, Boolean>
            validationResult.score = patterns.values().sum { it ? 1 : 0 } as Integer
            Integer score = validationResult.score as Integer
            Integer maxScore = validationResult.maxScore as Integer
            BigDecimal threshold = maxScore * 0.9
            validationResult.compliant = (score >= threshold)
            
        } catch (Exception e) {
            validationResult.compliant = false
            List<String> issues = validationResult.issues as List<String>
            issues.add("Failed to validate API: ${e.message}".toString())
        }
        
        return validationResult
    }
    
    private static void validateHttpMethods(String apiContent, Map validationResult) {
        Integer currentMaxScore = validationResult.maxScore as Integer
        validationResult.maxScore = currentMaxScore + 4
        
        REQUIRED_HTTP_METHODS.each { method ->
            def pattern = Pattern.compile("${Pattern.quote(method.toLowerCase())}\\s*:\\s*[\"']${method}[\"']")
            if (pattern.matcher(apiContent).find()) {
                validationResult.patterns["${method}_method"] = true
            } else {
                validationResult.patterns["${method}_method"] = false
                List<String> issues = validationResult.issues as List<String>
                issues.add("Missing ${method} method implementation".toString())
                List<String> recommendations = validationResult.recommendations as List<String>
                recommendations.add("Add ${method} method following PlansApi pattern".toString())
            }
        }
    }
    
    private static void validateEndpointStructure(String apiContent, Map validationResult) {
        Integer currentMaxScore = validationResult.maxScore as Integer
        validationResult.maxScore = currentMaxScore + 6
        
        // Check for path parsing
        if (apiContent.contains("getAdditionalPath(request)?.tokenize('/')")) {
            validationResult.patterns["path_parsing"] = true
        } else {
            validationResult.patterns["path_parsing"] = false
            List<String> issues = validationResult.issues as List<String>
            issues << "Missing standard path parsing logic"
            List<String> recommendations = validationResult.recommendations as List<String>
            recommendations << "Implement getAdditionalPath(request)?.tokenize('/') pattern"
        }
        
        // Check for master/instance pattern
        if (apiContent.contains("pathParts[0] == 'master'") && apiContent.contains("pathParts[0] == 'instance'")) {
            validationResult.patterns["master_instance_pattern"] = true
        } else {
            validationResult.patterns["master_instance_pattern"] = false
            List<String> issues = validationResult.issues as List<String>
            issues.add("Missing master/instance endpoint pattern")
            List<String> recommendations = validationResult.recommendations as List<String>
            recommendations.add("Implement master/instance URL pattern like PlansApi")
        }
        
        // Check for consolidated API approach
        if (apiContent.contains("consolidated") || (apiContent.contains("/master") && apiContent.contains("/instance"))) {
            validationResult.patterns["consolidated_approach"] = true
        } else {
            validationResult.patterns["consolidated_approach"] = false
            List<String> issues = validationResult.issues as List<String>
            issues.add("Not following consolidated API approach")
            List<String> recommendations = validationResult.recommendations as List<String>
            recommendations.add("Implement consolidated master/instance pattern")
        }
        
        // Check for status update pattern
        if (apiContent.contains("/status") && apiContent.contains("pathParts[1] == 'status'")) {
            validationResult.patterns["status_update_pattern"] = true
        } else {
            validationResult.patterns["status_update_pattern"] = false
            (validationResult.issues as List<String>).add("Missing status update endpoint pattern")
            List<String> recommendations = validationResult.recommendations as List<String>
            recommendations.add("Add /{id}/status endpoint for status updates")
        }
        
        // Check for filtering support
        if (apiContent.contains("queryParams.getFirst") && apiContent.contains("filters")) {
            validationResult.patterns["filtering_support"] = true
        } else {
            validationResult.patterns["filtering_support"] = false
            (validationResult.issues as List<String>).add("Missing hierarchical filtering support")
            List<String> recommendations = validationResult.recommendations as List<String>
            recommendations.add("Implement query parameter filtering like PlansApi")
        }
        
        // Check for proper JSON responses
        if (apiContent.contains("new JsonBuilder") && apiContent.contains("application/json")) {
            validationResult.patterns["json_responses"] = true
        } else {
            validationResult.patterns["json_responses"] = false
            (validationResult.issues as List<String>).add("Missing proper JSON response formatting")
            List<String> recommendations = validationResult.recommendations as List<String>
            recommendations.add("Use JsonBuilder with application/json headers")
        }
    }
    
    private static void validateRepositoryPattern(String apiContent, Map validationResult) {
        Integer currentMaxScore = validationResult.maxScore as Integer
        validationResult.maxScore = currentMaxScore + 3
        
        // Check for lazy repository loading (ScriptRunner pattern)
        if (apiContent.contains("def get") && apiContent.contains("Repository()") && 
            apiContent.contains("this.class.classLoader.loadClass")) {
            validationResult.patterns["lazy_repository_loading"] = true
        } else {
            validationResult.patterns["lazy_repository_loading"] = false
            (validationResult.issues as List<String>).add("Missing lazy repository loading pattern")
            (validationResult.recommendations as List<String>).add("Implement lazy repository loading for ScriptRunner compatibility")
        }
        
        // Check for repository method usage
        if (apiContent.contains("Repository.find") || apiContent.contains("Repository.create") || 
            apiContent.contains("Repository.update")) {
            validationResult.patterns["repository_methods"] = true
        } else {
            validationResult.patterns["repository_methods"] = false
            (validationResult.issues as List<String>).add("Missing repository method calls")
            (validationResult.recommendations as List<String>).add("Use repository methods for data access")
        }
        
        // Check for transaction handling
        if (apiContent.contains("withTransaction") || apiContent.contains("DatabaseUtil.withSql")) {
            validationResult.patterns["transaction_handling"] = true
        } else {
            validationResult.patterns["transaction_handling"] = false
            (validationResult.issues as List<String>).add("Missing transaction handling")
            (validationResult.recommendations as List<String>).add("Use DatabaseUtil.withSql for transaction safety")
        }
    }
    
    private static void validateErrorHandling(String apiContent, Map validationResult) {
        Integer currentMaxScore = validationResult.maxScore as Integer
        validationResult.maxScore = currentMaxScore + 4
        
        // Check for try-catch blocks
        if (apiContent.contains("try {") && apiContent.contains("} catch")) {
            validationResult.patterns["exception_handling"] = true
        } else {
            validationResult.patterns["exception_handling"] = false
            (validationResult.issues as List<String>).add("Missing exception handling")
            (validationResult.recommendations as List<String>).add("Add try-catch blocks for all operations")
        }
        
        // Check for proper HTTP status codes
        if (apiContent.contains("Response.status(404)") && apiContent.contains("Response.status(500)")) {
            validationResult.patterns["http_status_codes"] = true
        } else {
            validationResult.patterns["http_status_codes"] = false
            (validationResult.issues as List<String>).add("Missing proper HTTP status codes")
            (validationResult.recommendations as List<String>).add("Use appropriate HTTP status codes (404, 500, etc.)")
        }
        
        // Check for error message structure
        if (apiContent.contains("error:") && apiContent.contains("details:")) {
            validationResult.patterns["error_message_structure"] = true
        } else {
            validationResult.patterns["error_message_structure"] = false
            (validationResult.issues as List<String>).add("Missing structured error messages")
            (validationResult.recommendations as List<String>).add("Use structured error responses with error and details fields")
        }
        
        // Check for logging
        if (apiContent.contains("log.error")) {
            validationResult.patterns["error_logging"] = true
        } else {
            validationResult.patterns["error_logging"] = false
            (validationResult.issues as List<String>).add("Missing error logging")
            (validationResult.recommendations as List<String>).add("Add log.error statements for exception handling")
        }
    }
    
    private static void validateTypeSafety(String apiContent, Map validationResult) {
        Integer currentMaxScore = validationResult.maxScore as Integer
        validationResult.maxScore = currentMaxScore + 3
        
        // Check for UUID casting (ADR-031)
        if (apiContent.contains("UUID.fromString") && apiContent.contains("as String")) {
            validationResult.patterns["uuid_type_safety"] = true
        } else {
            validationResult.patterns["uuid_type_safety"] = false
            (validationResult.issues as List<String>).add("Missing UUID type safety casting")
            (validationResult.recommendations as List<String>).add("Use UUID.fromString(param as String) for all UUID parameters")
        }
        
        // Check for Integer casting
        if (apiContent.contains("Integer.parseInt") && apiContent.contains("as String")) {
            validationResult.patterns["integer_type_safety"] = true
        } else {
            validationResult.patterns["integer_type_safety"] = false
            (validationResult.issues as List<String>).add("Missing Integer type safety casting")
            (validationResult.recommendations as List<String>).add("Use Integer.parseInt(param as String) for integer parameters")
        }
        
        // Check for explicit casting pattern
        if (apiContent.contains("as String") || apiContent.contains("as Integer")) {
            validationResult.patterns["explicit_casting"] = true
        } else {
            validationResult.patterns["explicit_casting"] = false
            (validationResult.issues as List<String>).add("Missing explicit type casting")
            (validationResult.recommendations as List<String>).add("Use explicit casting (as String, as Integer) for all parameters")
        }
    }
    
    private static void validateSecurityGroups(String apiContent, Map validationResult) {
        Integer currentMaxScore = validationResult.maxScore as Integer
        validationResult.maxScore = currentMaxScore + 2
        
        // Check for security groups
        if (apiContent.contains('groups: ["confluence-users"]')) {
            validationResult.patterns["user_security_groups"] = true
        } else {
            validationResult.patterns["user_security_groups"] = false
            (validationResult.issues as List<String>).add("Missing user security groups")
            (validationResult.recommendations as List<String>).add('Add groups: ["confluence-users"] to all user endpoints')
        }
        
        // Check for admin security groups
        if (apiContent.contains('groups: ["confluence-administrators"]')) {
            validationResult.patterns["admin_security_groups"] = true
        } else {
            validationResult.patterns["admin_security_groups"] = false
            (validationResult.issues as List<String>).add("Missing admin security groups for DELETE operations")
            (validationResult.recommendations as List<String>).add('Add groups: ["confluence-administrators"] to DELETE endpoints')
        }
    }
    
    /**
     * Generates a compliance report for multiple APIs
     */
    static Map generateComplianceReport(List<String> apiFiles) {
        Map<String, Object> report = [
            totalAPIs: apiFiles.size(),
            compliantAPIs: 0,
            averageScore: 0,
            overallIssues: [],
            apiResults: [:]
        ]
        
        Integer totalScore = 0
        
        apiFiles.each { apiFile ->
            Map validation = validateApiPattern(apiFile)
            report.apiResults[apiFile] = validation
            
            if (validation.compliant) {
                Integer currentCompliant = report.compliantAPIs as Integer
                report.compliantAPIs = currentCompliant + 1
            }
            
            Integer validationScore = validation.score as Integer
            Integer validationMaxScore = validation.maxScore as Integer
            BigDecimal scorePercentage = (validationScore / validationMaxScore) * 100
            totalScore = totalScore + scorePercentage.intValue()
            List<String> overallIssues = report.overallIssues as List<String>
            List<String> validationIssues = validation.issues as List<String>
            overallIssues.addAll(validationIssues)
        }
        
        BigDecimal avgScore = totalScore / apiFiles.size()
        report.averageScore = Math.round(avgScore.doubleValue())
        Integer compliantAPIs = report.compliantAPIs as Integer
        Integer totalAPIs = report.totalAPIs as Integer
        BigDecimal compliancePercentage = (compliantAPIs / totalAPIs) * 100
        report.complianceRate = Math.round(compliancePercentage.doubleValue())
        
        return report
    }
    
    /**
     * Validates API during development - quick check
     */
    static boolean quickValidation(String apiContent) {
        def requiredPatterns = [
            "getAdditionalPath(request)",
            "DatabaseUtil.withSql",
            "JsonBuilder",
            "UUID.fromString",
            "try {",
            "log.error"
        ]
        
        return requiredPatterns.every { pattern ->
            apiContent.contains(pattern)
        }
    }
}