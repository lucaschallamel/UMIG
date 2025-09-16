package umig.utils.security

import groovy.json.JsonBuilder
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.sql.SQLException
import java.util.regex.Pattern
import java.util.concurrent.ConcurrentHashMap

/**
 * Security-focused error sanitizer to prevent information disclosure
 * 
 * Features:
 * - Sanitizes database exception details and stack traces
 * - Prevents schema disclosure through error messages
 * - Maintains audit trail while providing safe client responses
 * - Configurable sanitization rules and patterns
 * - Thread-safe operations for high-concurrency environments
 * 
 * Security Principles:
 * - Never expose internal system details to clients
 * - Provide actionable error messages without technical details
 * - Log full error context server-side for debugging
 * - Use standardized error response format
 * 
 * @version 1.0.0
 * @since Security Enhancement Phase
 */
class ErrorSanitizer {
    
    private static final Logger log = LoggerFactory.getLogger(ErrorSanitizer.class)
    
    private static volatile ErrorSanitizer INSTANCE
    private static final Object LOCK = new Object()
    
    // Patterns for detecting sensitive information in error messages
    private static final List<Pattern> SENSITIVE_PATTERNS = [
        // Database-related patterns
        Pattern.compile("(?i)table\\s+[\"'`]?\\w+[\"'`]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)column\\s+[\"'`]?\\w+[\"'`]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)constraint\\s+[\"'`]?\\w+[\"'`]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)schema\\s+[\"'`]?\\w+[\"'`]?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)database\\s+[\"'`]?\\w+[\"'`]?", Pattern.CASE_INSENSITIVE),
        
        // SQL-related patterns
        Pattern.compile("(?i)SELECT\\s+.*\\s+FROM", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)INSERT\\s+INTO", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)UPDATE\\s+.*\\s+SET", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)DELETE\\s+FROM", Pattern.CASE_INSENSITIVE),
        
        // File system patterns
        Pattern.compile("(?i)[a-z]:\\\\\\\\[^\\s]+", Pattern.CASE_INSENSITIVE), // Windows paths
        Pattern.compile("(?i)/[a-z0-9_\\-/]+\\.[a-z0-9]+", Pattern.CASE_INSENSITIVE), // Unix paths
        
        // Stack trace patterns
        Pattern.compile("(?i)at\\s+[a-zA-Z0-9_.]+\\([^)]+\\)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)Caused\\s+by:", Pattern.CASE_INSENSITIVE),
        
        // Connection and host information
        Pattern.compile("(?i)host\\s*[=:]\\s*[a-zA-Z0-9.-]+", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)port\\s*[=:]\\s*\\d+", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)url\\s*[=:]\\s*[^\\s]+", Pattern.CASE_INSENSITIVE),
        
        // Version and system information
        Pattern.compile("(?i)version\\s+[0-9.]+", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)build\\s+[a-zA-Z0-9.-]+", Pattern.CASE_INSENSITIVE)
    ]
    
    // Standard error message mappings
    private static final Map<String, String> STANDARD_ERROR_MESSAGES = [
        // Database errors
        "23505": "A record with this information already exists",
        "23503": "The referenced record does not exist",
        "23502": "Required information is missing",
        "42703": "Invalid field specified",
        "42P01": "Resource not found",
        
        // Generic patterns
        "connection": "Database connection issue. Please try again later.",
        "timeout": "Operation timed out. Please try again later.",
        "permission": "Insufficient permissions to perform this operation",
        "authentication": "Authentication required. Please log in again.",
        
        // HTTP status patterns
        "400": "Invalid request format or parameters",
        "401": "Authentication required",
        "403": "Access denied",
        "404": "Resource not found",
        "409": "Resource conflict",
        "422": "Invalid data provided",
        "429": "Too many requests. Please wait before trying again.",
        "500": "Internal server error. Please try again later."
    ]
    
    private ErrorSanitizer() {
        log.info("ErrorSanitizer initialized with ${SENSITIVE_PATTERNS.size()} sanitization patterns")
    }
    
    /**
     * Get singleton instance with double-checked locking
     */
    static ErrorSanitizer getInstance() {
        if (INSTANCE == null) {
            synchronized (LOCK) {
                if (INSTANCE == null) {
                    INSTANCE = new ErrorSanitizer()
                }
            }
        }
        return INSTANCE
    }
    
    /**
     * Sanitize error response for client consumption
     * 
     * @param errorData Error data map containing error details
     * @return Sanitized JsonBuilder response safe for client consumption
     */
    JsonBuilder sanitizeError(Map errorData) {
        try {
            Map sanitizedData = sanitizeErrorData(errorData)
            return new JsonBuilder(sanitizedData)
        } catch (Exception e) {
            log.error("Error sanitizing error response", e)
            // Return minimal safe error response
            return new JsonBuilder([
                error: "Internal error",
                message: "An error occurred. Please try again later.",
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
            ])
        }
    }
    
    /**
     * Sanitize error data map
     * 
     * @param errorData Original error data
     * @return Sanitized error data safe for client consumption
     */
    private Map sanitizeErrorData(Map errorData) {
        Map sanitized = [:]
        
        // Always include timestamp for correlation
        sanitized.timestamp = new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
        
        // Sanitize main error message
        if (errorData.error) {
            sanitized.error = sanitizeMessage(errorData.error.toString())
        } else {
            sanitized.error = "Internal error"
        }
        
        // Sanitize user message
        if (errorData.message) {
            sanitized.message = sanitizeMessage(errorData.message.toString())
        } else {
            // Generate safe default message based on error type
            sanitized.message = generateSafeMessage(errorData)
        }
        
        // Include safe fields
        if (errorData.field) {
            sanitized.field = sanitizeFieldName(errorData.field.toString())
        }
        
        if (errorData.requestId) {
            sanitized.requestId = errorData.requestId.toString()
        }
        
        if (errorData.retryAfter && errorData.retryAfter instanceof Number) {
            sanitized.retryAfter = errorData.retryAfter
        }
        
        // Include validation errors if present and safe
        if (errorData.validationErrors && errorData.validationErrors instanceof Map) {
            sanitized.validationErrors = sanitizeValidationErrors(errorData.validationErrors as Map)
        }
        
        return sanitized
    }
    
    /**
     * Sanitize individual message by removing sensitive information
     */
    private String sanitizeMessage(String message) {
        if (!message) {
            return "An error occurred"
        }
        
        String sanitized = message
        
        // Apply sensitive pattern filters
        for (Pattern pattern : SENSITIVE_PATTERNS) {
            sanitized = pattern.matcher(sanitized).replaceAll("[REDACTED]")
        }
        
        // Remove any remaining technical details
        sanitized = sanitized.replaceAll(/(?i)Exception/, "error")
                            .replaceAll(/(?i)SQLException/, "database error")
                            .replaceAll(/(?i)NullPointerException/, "processing error")
                            .replaceAll(/(?i)ClassCast/, "data error")
                            .replaceAll(/(?i)NumberFormat/, "format error")
        
        // Limit message length to prevent information leakage
        if (sanitized.length() > 200) {
            sanitized = sanitized.substring(0, 200) + "..."
        }
        
        return sanitized.trim()
    }
    
    /**
     * Generate safe error message based on error context
     */
    private String generateSafeMessage(Map errorData) {
        String error = errorData.error?.toString()?.toLowerCase() ?: ""
        String originalMessage = errorData.originalMessage?.toString()?.toLowerCase() ?: ""
        String combined = "${error} ${originalMessage}".toLowerCase()
        
        // Check for known patterns and provide appropriate messages
        for (Map.Entry<String, String> entry : STANDARD_ERROR_MESSAGES.entrySet()) {
            if (combined.contains(entry.key.toLowerCase())) {
                return entry.value
            }
        }
        
        // Default safe message
        return "An error occurred while processing your request. Please try again later."
    }
    
    /**
     * Sanitize field names to prevent schema disclosure
     */
    private String sanitizeFieldName(String fieldName) {
        if (!fieldName) {
            return null
        }
        
        // Remove table prefixes and technical suffixes
        String sanitized = fieldName.replaceAll(/^[a-z]+_/, "")  // Remove table prefixes like "lbl_"
                                   .replaceAll(/_id$/, "_identifier")  // Replace ID suffixes
                                   .replaceAll(/_at$/, "_time")       // Replace timestamp suffixes
                                   .replaceAll(/_by$/, "_user")       // Replace user suffixes
        
        return sanitized
    }
    
    /**
     * Sanitize validation errors
     */
    private Map sanitizeValidationErrors(Map validationErrors) {
        Map sanitized = [:]
        
        validationErrors.each { key, value ->
            String sanitizedKey = sanitizeFieldName(key.toString())
            String sanitizedValue = sanitizeMessage(value.toString())
            sanitized[sanitizedKey] = sanitizedValue
        }
        
        return sanitized
    }
    
    /**
     * Log full error details server-side while returning sanitized client response
     * 
     * @param operation Operation that failed
     * @param originalError Original error/exception
     * @param sanitizedResponse Sanitized response being returned to client
     * @param context Additional context information
     */
    void logFullError(String operation, Throwable originalError, Map sanitizedResponse, Map context = [:]) {
        try {
            Map logData = [
                operation: operation,
                error: originalError?.class?.simpleName,
                message: originalError?.message,
                sanitizedResponse: sanitizedResponse,
                context: context,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone("UTC"))
            ]
            
            if (originalError instanceof SQLException) {
                logData.sqlState = originalError.getSQLState()
                logData.errorCode = originalError.getErrorCode()
            }
            
            log.error("Full error details for operation '${operation}': ${logData}", originalError)
            
        } catch (Exception e) {
            log.error("Failed to log full error details for operation '${operation}'", e)
        }
    }
    
    /**
     * Get sanitization statistics for monitoring
     */
    Map<String, Object> getStatistics() {
        Map<String, Object> stats = [:]
        stats.put("sensitivePatterns", SENSITIVE_PATTERNS.size() as Object)
        stats.put("standardErrorMappings", STANDARD_ERROR_MESSAGES.size() as Object)
        stats.put("version", "1.0.0" as Object)
        return stats
    }
}