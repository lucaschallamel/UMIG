package umig.tests.utils

import groovy.json.JsonSlurper

/**
 * HTTP Response data container for UMIG integration tests.
 * Contains all response information including timing and error details.
 * 
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Created: 2025-08-27 (US-037 Phase 4B - HttpResponse extraction)
 * Version: 1.0
 */
class HttpResponse {
    int statusCode
    String body
    long responseTimeMs
    String url
    String method
    boolean success
    Exception exception = null
    
    /**
     * Get response body as parsed JSON
     * @return Parsed JSON object or null
     */
    def getJsonBody() {
        if (body && !body.trim().isEmpty()) {
            try {
                return new JsonSlurper().parseText(body)
            } catch (Exception e) {
                return null
            }
        }
        return null
    }
    
    /**
     * Check if response indicates a successful operation
     * @return true if 2xx status code
     */
    boolean isSuccessful() {
        return statusCode >= 200 && statusCode < 300
    }
    
    /**
     * Get formatted summary for logging/debugging
     * @return Human-readable response summary
     */
    String getSummary() {
        def status = success ? "✅" : "❌"
        return "${status} ${method} ${url} - ${statusCode} (${responseTimeMs}ms)"
    }
    
    @Override
    String toString() {
        return getSummary()
    }
}