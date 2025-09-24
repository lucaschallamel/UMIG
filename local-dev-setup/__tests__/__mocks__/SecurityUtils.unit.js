/**
 * SecurityUtils Unit Test Mock - Simplified & Robust
 * @version 2.1.0 - Fixed export issues
 */

// Mock CSRF token
const MOCK_CSRF_TOKEN = "mock-csrf-token-unit-test-12345";

// XSS sanitization patterns
const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
];

// Export the mock directly
module.exports = {
  // XSS Protection
  sanitizeInput(input) {
    if (typeof input !== "string") return input;

    let sanitized = input;
    XSS_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "");
    });

    return sanitized
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  },

  sanitizeHTML(html) {
    if (typeof html !== "string") return html;

    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");
  },

  validateInput(input, type = "text", options = {}) {
    if (!input && !options.required) {
      return {
        isValid: true,
        valid: true,
        sanitized: input,
        value: input,
        errors: [],
      };
    }

    const sanitized = this.sanitizeInput(input);
    const valid = sanitized === input;
    const errors = [];

    if (!valid) {
      errors.push("Input contains potentially unsafe content");
    }

    // Type-specific validation
    if (type === "email" && input) {
      const emailValid = this.isValidEmail(sanitized);
      if (!emailValid) {
        errors.push("Invalid email format");
      }
    }

    if (type === "uuid" && input) {
      const uuidValid = this.isValidUUID(sanitized);
      if (!uuidValid) {
        errors.push("Invalid UUID format");
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid: isValid,
      valid: isValid, // Legacy compatibility
      sanitized: sanitized,
      value: isValid ? sanitized : input,
      originalLength: input ? input.length : 0,
      sanitizedLength: sanitized ? sanitized.length : 0,
      type: type,
      errors: errors,
    };
  },

  // Integer validation method
  validateInteger(value, options = {}) {
    const config = {
      min: null,
      max: null,
      required: true,
      ...options,
    };

    // If value is null/undefined and not required, return valid
    if ((value === null || value === undefined) && !config.required) {
      return {
        isValid: true,
        value: null,
        errors: [],
      };
    }

    // Convert to integer
    const intValue = parseInt(value, 10);
    const errors = [];

    // Check if it's a valid integer
    if (isNaN(intValue) || intValue.toString() !== value.toString()) {
      errors.push("Must be a valid integer");
    } else {
      // Check min/max constraints
      if (config.min !== null && intValue < config.min) {
        errors.push(`Must be at least ${config.min}`);
      }
      if (config.max !== null && intValue > config.max) {
        errors.push(`Must be at most ${config.max}`);
      }
    }

    return {
      isValid: errors.length === 0,
      value: errors.length === 0 ? intValue : value,
      errors: errors,
    };
  },

  // Safe HTML injection
  safeSetInnerHTML(element, html, options = {}) {
    if (!element) {
      console.warn(
        "[SecurityUtils Mock] Invalid element provided to safeSetInnerHTML",
      );
      return false;
    }

    const sanitizedHTML = this.sanitizeHTML(html);

    try {
      element.innerHTML = sanitizedHTML;
      return true;
    } catch (error) {
      console.error("[SecurityUtils Mock] Error in safeSetInnerHTML:", error);
      return false;
    }
  },

  // Set text content safely
  setTextContent(element, text) {
    if (!element) {
      console.warn(
        "[SecurityUtils Mock] Invalid element provided to setTextContent",
      );
      return false;
    }

    try {
      element.textContent = this.sanitizeInput(text);
      return true;
    } catch (error) {
      console.error("[SecurityUtils Mock] Error in setTextContent:", error);
      return false;
    }
  },

  // CSRF Protection
  generateCSRFToken() {
    return MOCK_CSRF_TOKEN;
  },

  validateCSRFToken(token) {
    return token === MOCK_CSRF_TOKEN;
  },

  getCSRFToken() {
    return MOCK_CSRF_TOKEN;
  },

  // Rate Limiting (simplified for unit tests)
  checkRateLimit(identifier, limit = 100) {
    return {
      allowed: true,
      remaining: limit,
      resetTime: Date.now() + 60000,
      identifier,
    };
  },

  // Audit Logging (no-op in unit tests)
  auditLog(action, details) {
    // No-op for tests
  },

  // Content Security Policy
  generateNonce() {
    return `nonce-mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  getCSPHeader() {
    return "default-src 'self'; script-src 'self' 'unsafe-inline'";
  },

  // Session Management (simplified)
  validateSession(sessionId) {
    return {
      valid: !!sessionId,
      sessionId,
      userId: sessionId ? "mock-user-123" : null,
      expiresAt: sessionId ? Date.now() + 3600000 : null,
    };
  },

  // Input validation helpers
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidUUID(uuid) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // Configuration management
  updateConfig(config) {
    return config;
  },

  getConfig() {
    return {
      xssProtectionEnabled: true,
      csrfProtectionEnabled: true,
      sanitizationEnabled: true,
      rateLimitingEnabled: false,
      auditLogging: false,
    };
  },

  resetState() {
    // No-op for mock
  },

  // Mock identification
  __isMock: true,
  __mockType: "SecurityUtils-unit-test",
  __version: "2.1.0",

  // Performance monitoring
  getPerformanceMetrics() {
    return {
      sanitizationCalls: 0,
      validationCalls: 0,
      csrfValidations: 0,
      rateLimitChecks: 0,
      averageResponseTime: 1,
    };
  },

  // Testing utilities
  simulateXSSAttack(payload = '<script>alert("xss")</script>') {
    return this.sanitizeInput(payload);
  },

  simulateCSRFAttack() {
    return this.validateCSRFToken("invalid-token");
  },

  simulateError(type = "validation") {
    const errors = {
      validation: new Error("Mock validation error"),
      csrf: new Error("Mock CSRF validation failed"),
      rateLimit: new Error("Mock rate limit exceeded"),
      sanitization: new Error("Mock sanitization failed"),
    };

    throw errors[type] || new Error("Mock security error");
  },
};
