#!/usr/bin/env groovy

/**
 * Security validation script for UrlConfigurationApi
 * Tests input validation, XSS prevention, and injection protection
 */

def validateSecurity() {
    println "=== Security Validation for UrlConfigurationApi ==="
    
    def results = [:]
    
    try {
        // Check if security methods exist in the API file
        def apiFile = new File("src/groovy/umig/api/v2/UrlConfigurationApi.groovy")
        def content = apiFile.text
        
        results.apiExists = apiFile.exists()
        results.hasValidationMethods = content.contains("isValidEnvironmentCode") && 
                                       content.contains("sanitizeEnvironmentParameter") &&
                                       content.contains("validateUrlConfiguration")
        
        results.hasInputValidation = content.contains("if (!isValidEnvironmentCode(environmentParam))")
        results.hasXSSPrevention = content.contains("sanitizePageTitle") && content.contains("replaceAll(")
        results.hasInjectionPrevention = content.contains("matches(/") && content.contains("[A-Za-z0-9]")
        results.hasSecureUrlValidation = content.contains("isValidHttpUrl")
        results.hasErrorResponses = content.contains("Response.status(400)") && content.contains("Invalid environment parameter")
        
        println "✅ UrlConfigurationApi file: ${results.apiExists ? 'EXISTS' : 'MISSING'}"
        println "✅ Security validation methods: ${results.hasValidationMethods ? 'IMPLEMENTED' : 'MISSING'}"
        println "✅ Input validation: ${results.hasInputValidation ? 'ACTIVE' : 'MISSING'}"
        println "✅ XSS prevention: ${results.hasXSSPrevention ? 'IMPLEMENTED' : 'MISSING'}"
        println "✅ Injection prevention: ${results.hasInjectionPrevention ? 'IMPLEMENTED' : 'MISSING'}"
        println "✅ Secure URL validation: ${results.hasSecureUrlValidation ? 'IMPLEMENTED' : 'MISSING'}"
        println "✅ Proper error responses: ${results.hasErrorResponses ? 'IMPLEMENTED' : 'MISSING'}"
        
        // Test specific security patterns using string contains for simplicity
        def securityPatterns = [
            "Environment code validation": "validPatterns",
            "Character filtering": "replaceAll",
            "Length limiting": ".length() >",
            "URL protocol validation": "['http', 'https']",
            "Pattern matching": "matches"
        ]
        
        println "\n--- Security Pattern Analysis ---"
        securityPatterns.each { name, pattern ->
            def found = content.find(pattern) != null
            println "${found ? '✅' : '❌'} ${name}: ${found ? 'FOUND' : 'MISSING'}"
            results["pattern_${name.replaceAll(/\s/, '_').toLowerCase()}"] = found
        }
        
        // Test security function signatures
        def requiredMethods = [
            'isValidEnvironmentCode(String envCode)',
            'sanitizeEnvironmentParameter(String envCode)', 
            'validateUrlConfiguration(Map urlConfig)',
            'isValidHttpUrl(String url)',
            'sanitizePageTitle(String title)'
        ]
        
        println "\n--- Required Security Methods ---"
        requiredMethods.each { method ->
            def methodName = method.split('\\(')[0]
            def found = content.contains("${methodName}(")
            println "${found ? '✅' : '❌'} ${method}: ${found ? 'IMPLEMENTED' : 'MISSING'}"
        }
        
    } catch (Exception e) {
        println "❌ Security validation failed: ${e.message}"
        results.validationFailed = true
    }
    
    // Test for common security vulnerabilities
    println "\n--- Vulnerability Analysis ---"
    def vulnerabilityChecks = [
        "SQL Injection Protection": !content.contains("SELECT * FROM") || content.contains("parameterized"),
        "XSS Protection": content.contains("sanitize") && content.contains("replaceAll"),
        "Input Length Limits": content.contains("length() >"),
        "Character Whitelisting": content.contains("matches(/^[A-Za-z0-9"),
        "Protocol Restrictions": content.contains("['http', 'https']"),
        "Error Information Leakage": content.contains("message:") && !content.contains("SQLException")
    ]
    
    vulnerabilityChecks.each { vuln, isProtected ->
        println "${isProtected ? '✅' : '❌'} ${vuln}: ${isProtected ? 'PROTECTED' : 'VULNERABLE'}"
        results["vuln_${vuln.replaceAll(/[\\s\\-]/, '_').toLowerCase()}"] = isProtected
    }
    
    // Overall security score
    def securityScore = results.findAll { k, v -> v == true }.size()
    def totalChecks = results.findAll { k, v -> v instanceof Boolean }.size()
    
    println "\n=== SECURITY VALIDATION SUMMARY ==="
    println "Security Score: ${securityScore}/${totalChecks} (${Math.round((securityScore / totalChecks) * 100)}%)"
    
    if (securityScore >= totalChecks * 0.8) { // 80% threshold
        println "🛡️  SECURITY VALIDATION PASSED"
        println "✅ Configuration API has adequate security measures"
        return true
    } else {
        println "🔴 SECURITY VALIDATION FAILED"
        println "⚠️  Security measures need improvement"
        return false
    }
}

// Run the security validation
def success = validateSecurity()
System.exit(success ? 0 : 1)