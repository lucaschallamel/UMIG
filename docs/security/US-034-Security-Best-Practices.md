# US-034 Security Best Practices & Recommendations

**Date**: September 4, 2025  
**Version**: 1.0  
**Scope**: Data Import Strategy Security

## Overview

This document outlines security best practices implemented in US-034 and provides recommendations for maintaining and enhancing security posture for data import operations.

## Critical Security Principles Implemented

### 1. Defense in Depth 🛡️

**Implementation**: Multiple security layers at every level

```groovy
// Layer 1: Input Size Validation
Map sizeValidation = validateInputSize(body, "application/json")

// Layer 2: File Extension Validation
Map extensionValidation = validateFileExtension(filename)

// Layer 3: Path Traversal Protection
Map pathValidation = validateSecurePath(entityType)

// Layer 4: Parameterized Database Queries
sql.execute("SELECT * FROM table WHERE id = ?", [id])
```

### 2. Fail-Safe Defaults 🔐

**Implementation**: Secure by default configurations

```groovy
// Restrictive limits by default
private static final int MAX_REQUEST_SIZE = 50 * 1024 * 1024  // 50MB
private static final int MAX_BATCH_SIZE = 1000                // 1000 files
private static final List<String> ALLOWED_FILE_EXTENSIONS = ['json', 'csv', 'txt']

// Whitelist approach for templates
private static final Set<String> ALLOWED_TEMPLATE_FILES = [
    'teams_template.csv',
    'users_template.csv'
] as Set<String>
```

### 3. Comprehensive Input Validation 🔍

**Implementation**: Validate all inputs at entry points

```groovy
// Size validation before processing
if (contentSize > MAX_REQUEST_SIZE) {
    logger.warn("Request size validation failed")
    return errorResponse("Request exceeds size limit", 7.5, "HIGH")
}

// Path sanitization
String sanitizedEntity = entityType.replaceAll(/[^\w\-]/, '')

// Type safety with explicit casting (ADR-031)
String userId = (userContext?.confluenceUsername as String) ?: 'system'
UUID batchId = UUID.fromString(pathParts[batchIdIndex])
```

## Security Implementation Patterns

### 1. Security Validation Method Pattern

```groovy
/**
 * Standard security validation method pattern
 * Returns comprehensive validation result with CVSS scoring
 */
private Map validateSecurityAspect(String input) {
    if (!isValid(input)) {
        logger.warn("Security validation failed: ${aspectName}")
        return [
            valid: false,
            error: "Generic error message",
            cvssScore: 8.5,
            threatLevel: "HIGH",
            actualValue: sanitizeForLogging(input),
            expectedPattern: "Safe pattern description"
        ]
    }

    logger.debug("Security validation passed: ${aspectName}")
    return [valid: true, validatedValue: input]
}
```

### 2. Secure Error Response Pattern

```groovy
/**
 * Secure error response pattern
 * Provides security context without information leakage
 */
if (!validation.valid) {
    logger.error("Security violation - ${validation.error}")
    return Response.status(Response.Status.FORBIDDEN)
        .entity(new JsonBuilder([
            error: validation.error,
            securityAlert: "Access denied due to security violation",
            cvssScore: validation.cvssScore,
            threatLevel: validation.threatLevel
        ]).toString())
        .build()
}
```

### 3. Memory-Efficient Processing Pattern

```groovy
/**
 * Memory-efficient streaming processing pattern
 * Prevents memory exhaustion attacks
 */
private List<String[]> processLargeData(String content) {
    // Size validation first
    if (content.getBytes("UTF-8").length > MAX_SIZE) {
        throw new IllegalArgumentException("Content exceeds maximum size")
    }

    List<String[]> results = new ArrayList<>()
    StringReader reader = new StringReader(content)
    BufferedReader bufferedReader = new BufferedReader(reader)

    try {
        String line
        int processedCount = 0

        while ((line = bufferedReader.readLine()) != null && processedCount < MAX_ROWS) {
            // Process in chunks
            if (processedCount % CHUNK_SIZE == 0) {
                System.gc() // Memory management
            }
            processedCount++
        }
    } finally {
        bufferedReader.close()
        reader.close()
    }

    return results
}
```

## Security Configuration Management

### 1. Centralized Security Constants

```groovy
/**
 * Centralized security configuration
 * Makes security limits easily auditable and configurable
 */
private static final class SecurityConfig {
    // Size limits
    static final int MAX_REQUEST_SIZE = 50 * 1024 * 1024    // 50MB
    static final int MAX_BATCH_SIZE = 1000                  // 1000 files
    static final int MAX_CSV_SIZE = 10 * 1024 * 1024       // 10MB
    static final int MAX_CSV_ROWS = 10000                   // 10K rows

    // File security
    static final List<String> ALLOWED_FILE_EXTENSIONS = ['json', 'csv', 'txt']
    static final String TEMPLATE_BASE_DIR = "local-dev-setup/data-utils/CSV_Templates"

    // Processing limits
    static final int CHUNK_SIZE = 1000                      // Chunk processing
}
```

### 2. CVSS Vulnerability Scoring

```groovy
/**
 * CVSS v3.1 scoring for security vulnerabilities
 * Enables proper risk assessment and prioritization
 */
private static final class CVSSScoring {
    static final double PATH_TRAVERSAL = 9.1      // Critical
    static final double FILE_UPLOAD = 8.8         // High
    static final double MEMORY_EXHAUSTION = 7.5   // High
    static final double BATCH_EXHAUSTION = 6.5    // Medium

    static String getThreatLevel(double cvssScore) {
        if (cvssScore >= 9.0) return "CRITICAL"
        if (cvssScore >= 7.0) return "HIGH"
        if (cvssScore >= 4.0) return "MEDIUM"
        return "LOW"
    }
}
```

## Security Testing Best Practices

### 1. Automated Security Validation

```groovy
/**
 * Automated security test pattern
 * Run comprehensive security tests on every change
 */
boolean testSecurityImplementation() {
    try {
        // Test each security control
        assert testInputSizeValidation()
        assert testPathTraversalProtection()
        assert testFileExtensionValidation()
        assert testBatchSizeLimits()
        assert testSqlInjectionPrevention()

        println "✅ All security tests passed"
        return true
    } catch (AssertionError e) {
        println "❌ Security test failed: ${e.message}"
        return false
    }
}
```

### 2. Security Penetration Testing Scenarios

```groovy
/**
 * Security penetration test scenarios
 * Test actual attack vectors
 */
void runPenetrationTests() {
    // Test 1: Path traversal attempts
    testPathTraversalAttempts([
        "../../../etc/passwd",
        "..\\..\\windows\\system32\\config\\sam",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    ])

    // Test 2: Oversized requests
    testOversizedRequests([
        generateLargePayload(100 * 1024 * 1024), // 100MB
        generateRepeatedData(1000000)             // 1M repetitions
    ])

    // Test 3: Malicious file extensions
    testMaliciousExtensions([
        "malware.exe",
        "script.js",
        "config.php",
        "payload.jsp"
    ])
}
```

## Monitoring & Alerting

### 1. Security Event Monitoring

```groovy
/**
 * Security event monitoring pattern
 * Track and alert on security violations
 */
private void logSecurityViolation(String violationType, Map details) {
    // Structured security logging
    Map securityEvent = [
        timestamp: new Date(),
        eventType: "SECURITY_VIOLATION",
        violationType: violationType,
        severity: details.threatLevel,
        cvssScore: details.cvssScore,
        userContext: getCurrentUserContext(),
        requestDetails: sanitizeForLogging(details),
        mitigationAction: "Request blocked"
    ]

    // Log for security monitoring
    logger.error("SECURITY VIOLATION: ${new JsonBuilder(securityEvent)}")

    // Alert for critical violations
    if (details.cvssScore >= 9.0) {
        alertSecurityTeam(securityEvent)
    }
}
```

### 2. Metrics & Dashboards

```groovy
/**
 * Security metrics collection
 * Enable security dashboard monitoring
 */
class SecurityMetrics {
    private static final AtomicLong pathTraversalAttempts = new AtomicLong()
    private static final AtomicLong oversizedRequests = new AtomicLong()
    private static final AtomicLong maliciousUploads = new AtomicLong()

    static void recordSecurityEvent(String eventType) {
        switch(eventType) {
            case "PATH_TRAVERSAL":
                pathTraversalAttempts.incrementAndGet()
                break
            case "OVERSIZED_REQUEST":
                oversizedRequests.incrementAndGet()
                break
            case "MALICIOUS_UPLOAD":
                maliciousUploads.incrementAndGet()
                break
        }
    }

    static Map getSecurityMetrics() {
        return [
            pathTraversalAttempts: pathTraversalAttempts.get(),
            oversizedRequests: oversizedRequests.get(),
            maliciousUploads: maliciousUploads.get(),
            totalSecurityEvents: getTotalEvents()
        ]
    }
}
```

## Continuous Security Improvement

### 1. Security Review Checklist

**Pre-Deployment Security Review**:

- [ ] All user inputs validated and sanitized
- [ ] File upload restrictions properly implemented
- [ ] Path traversal protection verified
- [ ] SQL injection prevention confirmed
- [ ] Memory exhaustion protection active
- [ ] Security logging comprehensive
- [ ] Error responses don't leak information
- [ ] CVSS scores documented for vulnerabilities
- [ ] Security tests passing

### 2. Regular Security Audits

**Monthly Security Tasks**:

- Review security logs for patterns
- Update CVSS scores based on new threats
- Test security controls with updated attack vectors
- Review and update security limits based on usage patterns
- Validate security alerting mechanisms

### 3. Threat Model Updates

**Quarterly Security Review**:

- Update threat model based on new attack vectors
- Review OWASP Top 10 for new threats
- Assess impact of new dependencies
- Update security training materials
- Review incident response procedures

## Security Documentation Standards

### 1. Security Comment Standards

```groovy
/**
 * SECURITY: [Threat Type] - [CVSS Score]
 * Protects against: [Specific threat description]
 * Implementation: [How protection works]
 * CVSS 3.1 Base Score: [Score] ([Vector String])
 */
private Map validateSecurityControl(String input) {
    // Security implementation
}
```

### 2. Security ADR Template

```markdown
# ADR-XXX: Security Control Implementation

## Status

[Accepted/Superseded]

## Context

[Security threat description with CVSS scoring]

## Decision

[Security control implementation approach]

## Consequences

[Security impact and trade-offs]

## Compliance

- OWASP Top 10: [Relevant items addressed]
- CVSS Score: [Vulnerability score]
- Test Coverage: [Security test implementation]
```

## Incident Response

### 1. Security Incident Classification

| Severity | CVSS Score | Response Time | Actions                                      |
| -------- | ---------- | ------------- | -------------------------------------------- |
| Critical | 9.0 - 10.0 | Immediate     | Block traffic, alert team, patch immediately |
| High     | 7.0 - 8.9  | 2 hours       | Investigate, implement mitigation, monitor   |
| Medium   | 4.0 - 6.9  | 24 hours      | Log, analyze, plan remediation               |
| Low      | 0.1 - 3.9  | Next sprint   | Document, include in next security review    |

### 2. Security Response Procedures

```groovy
/**
 * Security incident response procedure
 * Standardized response to security events
 */
void handleSecurityIncident(String incidentType, Map details) {
    double cvssScore = details.cvssScore as Double

    // Immediate response based on severity
    if (cvssScore >= 9.0) {
        blockOffendingSource(details.sourceIP)
        alertSecurityTeam("CRITICAL", details)
        createIncidentTicket("P1", details)
    } else if (cvssScore >= 7.0) {
        rateLimit(details.sourceIP)
        alertSecurityTeam("HIGH", details)
        createIncidentTicket("P2", details)
    }

    // Always log for analysis
    logSecurityIncident(incidentType, details)
}
```

---

**Document Maintained By**: UMIG Security Team  
**Last Updated**: September 4, 2025  
**Next Review**: December 2025
