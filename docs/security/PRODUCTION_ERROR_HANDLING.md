# Production Error Handling Security Guidelines

## Stack Trace Sanitization Pattern

**CRITICAL**: Stack traces MUST be sanitized in production to prevent information disclosure vulnerabilities.

### Implementation Pattern

```javascript
/**
 * Secure error response generator
 * @param {Error} error - Original error
 * @param {string} context - Error context
 * @param {Object} metadata - Additional metadata
 * @param {boolean} isDevelopment - Environment flag
 * @returns {Object} Sanitized error response
 */
function createSecureErrorResponse(
  error,
  context,
  metadata = {},
  isDevelopment = false,
) {
  const baseResponse = {
    timestamp: Date.now(),
    context,
    error: error.message || "An error occurred",
    errorId: generateErrorId(), // For tracking without exposing internals
    metadata: sanitizeMetadata(metadata),
  };

  // SECURITY: Only include stack traces in development
  if (isDevelopment && process.env.NODE_ENV === "development") {
    baseResponse.stack = error.stack || "";
    baseResponse.fullError = error;
  } else {
    // Production: Log full details server-side, return sanitized response
    console.error(`Error ${baseResponse.errorId}:`, {
      stack: error.stack,
      fullError: error,
      context,
      metadata,
    });
  }

  return baseResponse;
}

/**
 * Sanitize metadata to remove sensitive information
 */
function sanitizeMetadata(metadata) {
  const sanitized = { ...metadata };

  // Remove sensitive fields
  const sensitiveFields = ["password", "token", "key", "secret", "credential"];
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });

  return sanitized;
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId() {
  return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### Environment Detection

```javascript
/**
 * Detect if running in development environment
 */
function isDevelopmentEnvironment() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.CONFLUENCE_DEV === "true" ||
    window.location.hostname === "localhost" ||
    window.location.hostname.includes("dev")
  );
}
```
