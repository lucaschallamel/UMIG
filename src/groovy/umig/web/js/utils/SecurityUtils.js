/**
 * SecurityUtils.js - Security utilities for UMIG Admin GUI
 * Provides XSS protection, input sanitization, and CSRF token management
 * Part of critical security remediation for US-087 Admin GUI Component Migration
 */

(function () {
  "use strict";

  class SecurityUtils {
    constructor() {
      // CSRF token management
      this.csrfToken = null;
      this.csrfTokenExpiry = null;

      // HTML sanitization configuration
      this.htmlSanitizerConfig = {
        allowedTags: ["b", "i", "em", "strong", "span", "div", "p", "br"],
        allowedAttributes: {
          span: ["class"],
          div: ["class"],
          p: ["class"],
        },
        maxLength: 10000,
      };

      // Input validation patterns
      this.validationPatterns = {
        userCode: /^[A-Z0-9]{3}$/i,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        alphanumeric: /^[a-zA-Z0-9_-]+$/,
        safeText: /^[a-zA-Z0-9\s\-_.,()]+$/,
        noScript: /^(?!.*<script).*$/i,
      };

      // Rate limiting for security operations
      this.rateLimits = new Map();
      this.maxAttempts = 5;
      this.lockoutDuration = 300000; // 5 minutes

      this.initializeCSRF();
    }

    /**
     * Sanitize HTML content to prevent XSS attacks
     * @param {string} html - HTML content to sanitize
     * @param {Object} options - Sanitization options
     * @returns {string} - Sanitized HTML content
     */
    sanitizeHTML(html, options = {}) {
      if (typeof html !== "string") {
        console.warn("[Security] Invalid HTML input type:", typeof html);
        return "";
      }

      // Length check
      const maxLength = options.maxLength || this.htmlSanitizerConfig.maxLength;
      if (html.length > maxLength) {
        console.warn(
          `[Security] HTML content exceeds maximum length: ${html.length}/${maxLength}`,
        );
        return html.substring(0, maxLength) + "...";
      }

      // Remove script tags and event handlers
      let sanitized = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/vbscript:/gi, "")
        .replace(/data:/gi, "");

      // Allow only specific tags and attributes
      const allowedTags =
        options.allowedTags || this.htmlSanitizerConfig.allowedTags;
      const allowedAttributes =
        options.allowedAttributes || this.htmlSanitizerConfig.allowedAttributes;

      // Basic tag filtering (simple implementation for enterprise security)
      const tagPattern = /<(\/?)([\w]+)([^>]*)>/gi;
      sanitized = sanitized.replace(
        tagPattern,
        (match, closing, tagName, attributes) => {
          if (!allowedTags.includes(tagName.toLowerCase())) {
            return "";
          }

          if (closing) {
            return `</${tagName}>`;
          }

          // Filter attributes
          const allowedAttrs = allowedAttributes[tagName.toLowerCase()] || [];
          if (allowedAttrs.length === 0) {
            return `<${tagName}>`;
          }

          const filteredAttributes = attributes.replace(
            /(\w+)\s*=\s*["']([^"']*)["']/gi,
            (attrMatch, attrName, attrValue) => {
              if (allowedAttrs.includes(attrName.toLowerCase())) {
                // Additional validation for class attributes
                if (attrName.toLowerCase() === "class") {
                  const safeClasses = attrValue.replace(
                    /[^a-zA-Z0-9\s\-_]/g,
                    "",
                  );
                  return `${attrName}="${safeClasses}"`;
                }
                return attrMatch;
              }
              return "";
            },
          );

          return `<${tagName}${filteredAttributes}>`;
        },
      );

      return sanitized;
    }

    /**
     * Safe alternative to innerHTML for text content
     * @param {Element} element - DOM element
     * @param {string} text - Text content to set
     */
    setTextContent(element, text) {
      if (!element) {
        console.warn("[Security] Element is null or undefined");
        return;
      }

      if (typeof text !== "string") {
        text = String(text);
      }

      // Use textContent for safety
      element.textContent = text;
    }

    /**
     * Safe alternative to innerHTML for HTML content
     * @param {Element} element - DOM element
     * @param {string} html - HTML content to set
     * @param {Object} options - Sanitization options
     */
    setSafeHTML(element, html, options = {}) {
      if (!element) {
        console.warn("[Security] Element is null or undefined");
        return;
      }

      const sanitizedHTML = this.sanitizeHTML(html, options);
      element.innerHTML = sanitizedHTML;

      // Log security action for audit trail
      console.log(
        `[Security] Safe HTML set for element: ${element.id || element.className}`,
      );
    }

    /**
     * Validate input against security patterns
     * @param {string} input - Input to validate
     * @param {string} type - Validation type
     * @param {Object} options - Additional options
     * @returns {Object} - Validation result
     */
    validateInput(input, type, options = {}) {
      const result = {
        isValid: false,
        sanitizedInput: "",
        errors: [],
      };

      if (typeof input !== "string") {
        result.errors.push("Input must be a string");
        return result;
      }

      // Length validation
      const maxLength = options.maxLength || 1000;
      if (input.length > maxLength) {
        result.errors.push(
          `Input exceeds maximum length of ${maxLength} characters`,
        );
        return result;
      }

      // Pattern validation
      const pattern = this.validationPatterns[type];
      if (!pattern) {
        result.errors.push(`Unknown validation type: ${type}`);
        return result;
      }

      if (!pattern.test(input)) {
        result.errors.push(`Input does not match required pattern for ${type}`);
        return result;
      }

      // Additional sanitization
      let sanitized = input.trim();

      // Remove any potential script content
      if (this.validationPatterns.noScript.test(sanitized)) {
        // Encode potentially dangerous characters
        sanitized = sanitized
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;");

        result.isValid = true;
        result.sanitizedInput = sanitized;
      } else {
        result.errors.push("Input contains potentially dangerous content");
      }

      return result;
    }

    /**
     * Initialize CSRF token management
     */
    initializeCSRF() {
      // Try to get CSRF token from meta tag or generate one
      const metaToken = document.querySelector('meta[name="csrf-token"]');
      if (metaToken) {
        this.csrfToken = metaToken.getAttribute("content");
      } else {
        this.generateCSRFToken();
      }
    }

    /**
     * Generate a new CSRF token
     * @returns {string} - Generated token
     */
    generateCSRFToken() {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      this.csrfToken = Array.from(array, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      this.csrfTokenExpiry = Date.now() + 3600000; // 1 hour expiry

      console.log("[Security] New CSRF token generated");
      return this.csrfToken;
    }

    /**
     * Get current CSRF token
     * @returns {string} - Current CSRF token
     */
    getCSRFToken() {
      // Check if token is expired
      if (this.csrfTokenExpiry && Date.now() > this.csrfTokenExpiry) {
        console.log("[Security] CSRF token expired, generating new one");
        this.generateCSRFToken();
      }

      return this.csrfToken;
    }

    /**
     * Validate CSRF token
     * @param {string} token - Token to validate
     * @returns {boolean} - Validation result
     */
    validateCSRFToken(token) {
      if (!token || !this.csrfToken) {
        console.warn("[Security] CSRF token validation failed: missing token");
        return false;
      }

      const isValid = token === this.csrfToken;
      if (!isValid) {
        console.warn("[Security] CSRF token validation failed: token mismatch");
      }

      return isValid;
    }

    /**
     * Rate limiting for authentication attempts
     * @param {string} identifier - User identifier
     * @returns {boolean} - Whether request is allowed
     */
    checkRateLimit(identifier) {
      const now = Date.now();
      const key = `auth_${identifier}`;

      if (!this.rateLimits.has(key)) {
        this.rateLimits.set(key, {
          attempts: 1,
          firstAttempt: now,
          lockedUntil: null,
        });
        return true;
      }

      const record = this.rateLimits.get(key);

      // Check if still locked out
      if (record.lockedUntil && now < record.lockedUntil) {
        console.warn(
          `[Security] Rate limit exceeded for ${identifier}, locked until ${new Date(record.lockedUntil)}`,
        );
        return false;
      }

      // Reset if lockout period has passed
      if (record.lockedUntil && now >= record.lockedUntil) {
        record.attempts = 1;
        record.firstAttempt = now;
        record.lockedUntil = null;
        return true;
      }

      // Check attempts within time window
      const timeSinceFirst = now - record.firstAttempt;
      if (timeSinceFirst > this.lockoutDuration) {
        // Reset counter after time window
        record.attempts = 1;
        record.firstAttempt = now;
        return true;
      }

      // Increment attempts
      record.attempts++;

      if (record.attempts > this.maxAttempts) {
        record.lockedUntil = now + this.lockoutDuration;
        console.warn(
          `[Security] Rate limit exceeded for ${identifier}, locked for ${this.lockoutDuration / 1000} seconds`,
        );
        return false;
      }

      return true;
    }

    /**
     * Clear rate limit for an identifier (for successful authentication)
     * @param {string} identifier - User identifier
     */
    clearRateLimit(identifier) {
      const key = `auth_${identifier}`;
      this.rateLimits.delete(key);
      console.log(`[Security] Rate limit cleared for ${identifier}`);
    }

    /**
     * Validate localStorage data structure
     * @param {string} key - localStorage key
     * @param {Object} schema - Expected schema
     * @returns {boolean} - Validation result
     */
    validateLocalStorageData(key, schema) {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) {
          return true; // No data is valid
        }

        const data = JSON.parse(stored);
        return this.validateDataSchema(data, schema);
      } catch (e) {
        console.warn(
          `[Security] localStorage validation failed for ${key}:`,
          e,
        );
        // Remove corrupted data
        localStorage.removeItem(key);
        return false;
      }
    }

    /**
     * Validate data against schema
     * @param {any} data - Data to validate
     * @param {Object} schema - Schema definition
     * @returns {boolean} - Validation result
     */
    validateDataSchema(data, schema) {
      if (typeof data !== typeof schema.type) {
        return false;
      }

      if (schema.type === "object" && schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (propSchema.required && !(key in data)) {
            return false;
          }
          if (key in data && !this.validateDataSchema(data[key], propSchema)) {
            return false;
          }
        }
      }

      return true;
    }

    /**
     * Security audit log entry
     * @param {string} action - Security action
     * @param {Object} details - Additional details
     */
    logSecurityEvent(action, details = {}) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...details,
      };

      console.log("[Security Audit]", logEntry);

      // In production, this would send to a security monitoring service
      // For now, we'll store in sessionStorage for debugging
      try {
        const auditLog = JSON.parse(
          sessionStorage.getItem("umig-security-audit") || "[]",
        );
        auditLog.push(logEntry);

        // Keep only last 100 entries
        if (auditLog.length > 100) {
          auditLog.splice(0, auditLog.length - 100);
        }

        sessionStorage.setItem("umig-security-audit", JSON.stringify(auditLog));
      } catch (e) {
        console.warn("[Security] Failed to log security event:", e);
      }
    }

    /**
     * Get security status report
     * @returns {Object} - Security status
     */
    getSecurityStatus() {
      const now = Date.now();
      const activeLockouts = Array.from(this.rateLimits.entries()).filter(
        ([key, record]) => record.lockedUntil && now < record.lockedUntil,
      ).length;

      return {
        timestamp: new Date().toISOString(),
        csrfTokenValid: !!this.csrfToken,
        csrfTokenExpiry: this.csrfTokenExpiry
          ? new Date(this.csrfTokenExpiry).toISOString()
          : null,
        activeLockouts,
        totalRateLimitEntries: this.rateLimits.size,
        auditLogEntries: this.getAuditLogCount(),
      };
    }

    /**
     * Get audit log count
     * @returns {number} - Number of audit log entries
     */
    getAuditLogCount() {
      try {
        const auditLog = JSON.parse(
          sessionStorage.getItem("umig-security-audit") || "[]",
        );
        return auditLog.length;
      } catch (e) {
        return 0;
      }
    }

    /**
     * Emergency security reset
     */
    emergencyReset() {
      console.warn("[Security] Emergency security reset initiated");

      this.rateLimits.clear();
      this.generateCSRFToken();

      // Clear potentially compromised data
      try {
        sessionStorage.removeItem("umig-security-audit");
        localStorage.removeItem("umig-feature-toggles");
        localStorage.removeItem("umig-performance-baselines");
      } catch (e) {
        console.warn("[Security] Error during emergency reset:", e);
      }

      this.logSecurityEvent("emergency_reset", { reason: "manual_trigger" });
    }
  }

  // Create singleton instance
  window.SecurityUtils = window.SecurityUtils || new SecurityUtils();

  // Export for module systems if available
  if (typeof module !== "undefined" && module.exports) {
    module.exports = SecurityUtils;
  }

  // Initialize security logging
  window.SecurityUtils.logSecurityEvent("security_utils_initialized");
})();
