/**
 * SecurityUtils - Comprehensive Security Utilities
 * US-082-B Component Architecture - Security Enhancement Phase
 *
 * Provides comprehensive security utilities for the UMIG application
 * Implements XSS protection, CSRF token management, input validation, and sanitization
 *
 * Features:
 * - Advanced XSS prevention with multiple encoding strategies
 * - Double-submit CSRF token pattern with rotation
 * - Comprehensive input validation and sanitization
 * - Rate limiting helpers
 * - Secure random token generation
 * - Content Security Policy helpers
 * - Centralized security policy enforcement
 *
 * @version 2.0.0 (Production Security Implementation)
 */

// Prevent duplicate declarations in case script loads multiple times
if (typeof SecurityUtils === "undefined") {
  class SecurityUtils {
    constructor() {
      // CSRF token management
      this.csrfTokens = {
        current: null,
        previous: null,
        rotationInterval: 15 * 60 * 1000, // 15 minutes
        rotationTimer: null,
      };

      // Rate limiting storage
      this.rateLimits = new Map();

      // Rate limiting configuration
      this.rateLimitConfig = {
        windowMs: 60000, // 1 minute window
        maxRequests: 10, // Max requests per window
      };

      // Validation patterns
      this.validationPatterns = {
        email:
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
        uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        alphanumeric: /^[a-zA-Z0-9]+$/,
        alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
        safeString: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
        strongPassword:
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        phoneNumber: /^\+?[1-9]\d{1,14}$/,
        hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      };

      // Initialize
      this.initialize();
    }

    /**
     * Initialize security utilities
     */
    initialize() {
      // Generate initial CSRF token
      this.generateCSRFToken();

      // Start token rotation
      this.startCSRFTokenRotation();

      // Setup AJAX interceptors
      this.setupAJAXInterceptors();

      console.info(
        "[SecurityUtils] Initialized with enhanced security features",
      );
    }

    // ===== XSS Prevention =====

    /**
     * Comprehensive XSS sanitization
     * @param {string} input - Input to sanitize
     * @param {Object} options - Sanitization options
     * @returns {string} Sanitized string
     */
    static sanitizeXSS(input, options = {}) {
      if (!input || typeof input !== "string") {
        return "";
      }

      const config = {
        allowHTML: false,
        allowAttributes: false,
        allowScripts: false,
        encodeEntities: true,
        trimWhitespace: true,
        maxLength: null,
        ...options,
      };

      let sanitized = input;

      // Basic HTML entity encoding
      if (config.encodeEntities) {
        sanitized = sanitized
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;")
          .replace(/\//g, "&#x2F;");
      }

      // Remove script tags and javascript: protocols
      if (!config.allowScripts) {
        sanitized = sanitized
          .replace(/<script[^>]*>.*?<\/script>/gis, "")
          .replace(/javascript:/gi, "")
          .replace(/vbscript:/gi, "")
          .replace(/data:/gi, "")
          .replace(/on\w+\s*=/gi, "");
      }

      // Remove HTML tags if not allowed
      if (!config.allowHTML) {
        sanitized = sanitized.replace(/<[^>]*>/g, "");
      }

      // Remove potentially dangerous attributes
      if (!config.allowAttributes) {
        sanitized = sanitized
          .replace(/style\s*=\s*["'][^"']*["']/gi, "")
          .replace(/onclick\s*=\s*["'][^"']*["']/gi, "")
          .replace(/onload\s*=\s*["'][^"']*["']/gi, "");
      }

      // Trim whitespace
      if (config.trimWhitespace) {
        sanitized = sanitized.trim();
      }

      // Enforce maximum length
      if (config.maxLength && sanitized.length > config.maxLength) {
        sanitized = sanitized.substring(0, config.maxLength);
      }

      return sanitized;
    }

    /**
     * Sanitize for different contexts
     */
    static sanitizeForHTML(input) {
      return SecurityUtils.sanitizeXSS(input, {
        allowHTML: false,
        encodeEntities: true,
      });
    }

    static sanitizeForAttribute(input) {
      return SecurityUtils.sanitizeXSS(input, {
        allowHTML: false,
        allowAttributes: false,
        encodeEntities: true,
      });
    }

    static sanitizeForURL(input) {
      if (!input || typeof input !== "string") return "";
      try {
        return encodeURIComponent(input);
      } catch (e) {
        return "";
      }
    }

    static sanitizeForCSS(input) {
      if (!input || typeof input !== "string") return "";
      // Remove potentially dangerous CSS content
      return input
        .replace(/[<>"'`]/g, "")
        .replace(/javascript:/gi, "")
        .replace(/expression\(/gi, "");
    }

    // ===== CSRF Protection =====

    /**
     * Generate cryptographically secure CSRF token
     */
    generateCSRFToken() {
      try {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const token = btoa(String.fromCharCode(...array))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");

        // Rotate tokens
        this.csrfTokens.previous = this.csrfTokens.current;
        this.csrfTokens.current = token;

        // Store in cookie for double-submit pattern
        this.setCSRFTokenCookie(token);

        // Update meta tag
        this.updateCSRFMetaTag(token);

        return token;
      } catch (error) {
        console.error("[SecurityUtils] Failed to generate CSRF token:", error);
        // Fallback to timestamp-based token
        const fallbackToken = `csrf-${Date.now()}-${Math.random().toString(36)}`;
        this.csrfTokens.current = fallbackToken;
        return fallbackToken;
      }
    }

    /**
     * Get current CSRF token
     */
    getCSRFToken() {
      return this.csrfTokens.current;
    }

    /**
     * Validate CSRF token (double-submit pattern)
     */
    validateCSRFToken(token, cookieToken = null) {
      if (!token) {
        return { valid: false, reason: "No token provided" };
      }

      // Check against current and previous tokens (for rotation tolerance)
      const validTokens = [
        this.csrfTokens.current,
        this.csrfTokens.previous,
      ].filter(Boolean);

      if (!validTokens.includes(token)) {
        return { valid: false, reason: "Invalid token" };
      }

      // Double-submit validation if cookie token provided
      if (cookieToken !== null && token !== cookieToken) {
        return {
          valid: false,
          reason: "Token mismatch between header and cookie",
        };
      }

      return { valid: true };
    }

    /**
     * Set CSRF token cookie
     */
    setCSRFTokenCookie(token) {
      if (typeof document !== "undefined") {
        const secure = location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `XSRF-TOKEN=${token}; Path=/; SameSite=Strict${secure}; HttpOnly=false`;
      }
    }

    /**
     * Update CSRF meta tag
     */
    updateCSRFMetaTag(token) {
      if (typeof document !== "undefined") {
        let metaTag = document.querySelector('meta[name="csrf-token"]');
        if (!metaTag) {
          metaTag = document.createElement("meta");
          metaTag.name = "csrf-token";
          document.head.appendChild(metaTag);
        }
        metaTag.content = token;
      }
    }

    /**
     * Start CSRF token rotation
     */
    startCSRFTokenRotation() {
      if (this.csrfTokens.rotationTimer) {
        clearInterval(this.csrfTokens.rotationTimer);
      }

      this.csrfTokens.rotationTimer = setInterval(() => {
        this.generateCSRFToken();
        console.debug("[SecurityUtils] CSRF token rotated");

        // Emit token rotation event
        if (typeof window !== "undefined" && window.CustomEvent) {
          const event = new CustomEvent("csrf:tokenRotated", {
            detail: { newToken: this.csrfTokens.current },
          });
          window.dispatchEvent(event);
        }
      }, this.csrfTokens.rotationInterval);
    }

    /**
     * Stop CSRF token rotation
     */
    stopCSRFTokenRotation() {
      if (this.csrfTokens.rotationTimer) {
        clearInterval(this.csrfTokens.rotationTimer);
        this.csrfTokens.rotationTimer = null;
      }
    }

    // ===== Input Validation =====

    /**
     * Comprehensive input validation
     */
    static validateInput(input, validationType, options = {}) {
      const config = {
        required: false,
        minLength: null,
        maxLength: null,
        customPattern: null,
        allowedValues: null,
        sanitize: true,
        ...options,
      };

      const result = {
        isValid: true,
        sanitizedData: input,
        errors: [],
        warnings: [],
      };

      // Check if required
      if (config.required && (!input || input.toString().trim() === "")) {
        result.isValid = false;
        result.errors.push("Field is required");
        return result;
      }

      // Skip validation if input is empty and not required
      if (!input && !config.required) {
        return result;
      }

      const inputStr = input.toString();

      // Length validation
      if (config.minLength && inputStr.length < config.minLength) {
        result.isValid = false;
        result.errors.push(`Minimum length is ${config.minLength} characters`);
      }

      if (config.maxLength && inputStr.length > config.maxLength) {
        result.isValid = false;
        result.errors.push(`Maximum length is ${config.maxLength} characters`);
      }

      // Pattern validation
      const instance = new SecurityUtils();
      let pattern = null;

      if (config.customPattern) {
        pattern = config.customPattern;
      } else if (instance.validationPatterns[validationType]) {
        pattern = instance.validationPatterns[validationType];
      }

      if (pattern && !pattern.test(inputStr)) {
        result.isValid = false;
        result.errors.push(`Invalid ${validationType} format`);
      }

      // Allowed values validation
      if (config.allowedValues && !config.allowedValues.includes(input)) {
        result.isValid = false;
        result.errors.push("Value not in allowed list");
      }

      // Sanitization
      if (config.sanitize) {
        result.sanitizedData = SecurityUtils.sanitizeXSS(inputStr);
      }

      return result;
    }

    /**
     * Validate multiple inputs
     */
    static validateInputs(inputs) {
      const results = {};
      let allValid = true;

      for (const [fieldName, config] of Object.entries(inputs)) {
        const { value, validationType, options } = config;
        results[fieldName] = SecurityUtils.validateInput(
          value,
          validationType,
          options,
        );

        if (!results[fieldName].isValid) {
          allValid = false;
        }
      }

      return {
        allValid,
        fieldResults: results,
        sanitizedData: Object.fromEntries(
          Object.entries(results).map(([key, result]) => [
            key,
            result.sanitizedData,
          ]),
        ),
      };
    }

    // ===== Rate Limiting =====

    /**
     * Check rate limit for a given key
     */
    checkRateLimit(key, limit = 10, window = 60000) {
      const now = Date.now();

      if (!this.rateLimits.has(key)) {
        this.rateLimits.set(key, { count: 1, windowStart: now });
        return { allowed: true, remaining: limit - 1, resetTime: now + window };
      }

      const bucket = this.rateLimits.get(key);

      // Reset window if expired
      if (now - bucket.windowStart > window) {
        bucket.count = 1;
        bucket.windowStart = now;
        return { allowed: true, remaining: limit - 1, resetTime: now + window };
      }

      // Check if limit exceeded
      if (bucket.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: bucket.windowStart + window,
          retryAfter: bucket.windowStart + window - now,
        };
      }

      // Increment counter
      bucket.count++;
      return {
        allowed: true,
        remaining: limit - bucket.count,
        resetTime: bucket.windowStart + window,
      };
    }

    /**
     * Clear rate limit for a key
     */
    clearRateLimit(key) {
      this.rateLimits.delete(key);
    }

    /**
     * Clear all rate limits
     */
    clearAllRateLimits() {
      this.rateLimits.clear();
    }

    // ===== Secure Token Generation =====

    /**
     * Generate cryptographically secure random token
     */
    static generateSecureToken(length = 32) {
      try {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");
      } catch (error) {
        console.error(
          "[SecurityUtils] Failed to generate secure token:",
          error,
        );
        // Fallback to timestamp + random
        return `fallback-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      }
    }

    /**
     * Generate UUID v4
     */
    static generateUUID() {
      try {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);

        // Set version (4) and variant bits
        array[6] = (array[6] & 0x0f) | 0x40;
        array[8] = (array[8] & 0x3f) | 0x80;

        const hex = Array.from(array, (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
        return [
          hex.substring(0, 8),
          hex.substring(8, 12),
          hex.substring(12, 16),
          hex.substring(16, 20),
          hex.substring(20, 32),
        ].join("-");
      } catch (error) {
        console.error("[SecurityUtils] Failed to generate UUID:", error);
        // Fallback UUID
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
    }

    /**
     * Generate cryptographically secure nonce (alias for generateSecureToken)
     * @param {number} length - Length of the nonce (default: 16)
     * @returns {string} Secure nonce
     */
    static generateNonce(length = 16) {
      return SecurityUtils.generateSecureToken(length);
    }

    // ===== AJAX Security =====

    /**
     * Setup AJAX interceptors for automatic CSRF protection
     */
    setupAJAXInterceptors() {
      if (typeof window === "undefined") return;

      // Intercept fetch requests
      const originalFetch = window.fetch;
      window.fetch = (url, options = {}) => {
        // Add CSRF token for state-changing requests
        if (this.isStateChangingRequest(options.method)) {
          options.headers = {
            ...options.headers,
            "X-CSRF-Token": this.getCSRFToken(),
            "X-Requested-With": "XMLHttpRequest",
          };
        }

        return originalFetch.call(window, url, options);
      };

      // Intercept XMLHttpRequest
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (
        method,
        url,
        async,
        user,
        password,
      ) {
        this._securityUtils_method = method;
        return originalOpen.call(this, method, url, async, user, password);
      };

      XMLHttpRequest.prototype.send = function (data) {
        const instance = SecurityUtils.getInstance();
        if (
          instance &&
          instance.isStateChangingRequest(this._securityUtils_method)
        ) {
          this.setRequestHeader("X-CSRF-Token", instance.getCSRFToken());
          this.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        }
        return originalSend.call(this, data);
      };
    }

    /**
     * Check if HTTP method is state-changing
     */
    isStateChangingRequest(method) {
      const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
      return method && stateChangingMethods.includes(method.toUpperCase());
    }

    // ===== Centralized Input Sanitization =====

    /**
     * Sanitize form data
     */
    static sanitizeFormData(formData, fieldConfigs = {}) {
      const sanitized = {};
      const errors = {};

      for (const [field, value] of Object.entries(formData)) {
        const config = fieldConfigs[field] || { type: "safeString" };

        try {
          // Apply field-specific sanitization
          switch (config.type) {
            case "email":
              sanitized[field] = SecurityUtils.sanitizeXSS(value, {
                maxLength: 254,
              });
              break;
            case "password":
              // Don't sanitize passwords, but validate strength
              sanitized[field] = value;
              break;
            case "html":
              sanitized[field] = config.allowHTML
                ? SecurityUtils.sanitizeXSS(value, {
                    allowHTML: true,
                    allowScripts: false,
                  })
                : SecurityUtils.sanitizeForHTML(value);
              break;
            case "url":
              sanitized[field] = SecurityUtils.sanitizeForURL(value);
              break;
            case "number":
              const num = parseFloat(value);
              sanitized[field] = isNaN(num) ? null : num;
              break;
            case "integer":
              const int = parseInt(value, 10);
              sanitized[field] = isNaN(int) ? null : int;
              break;
            case "boolean":
              sanitized[field] = Boolean(value);
              break;
            default:
              sanitized[field] = SecurityUtils.sanitizeXSS(
                value,
                config.sanitizeOptions || {},
              );
          }

          // Apply validation if configured
          if (config.validation) {
            const validation = SecurityUtils.validateInput(
              sanitized[field],
              config.validation.type,
              config.validation.options,
            );

            if (!validation.isValid) {
              errors[field] = validation.errors;
            }
          }
        } catch (error) {
          console.error(
            `[SecurityUtils] Error sanitizing field ${field}:`,
            error,
          );
          errors[field] = ["Sanitization error"];
          sanitized[field] = "";
        }
      }

      return {
        sanitizedData: sanitized,
        errors: errors,
        hasErrors: Object.keys(errors).length > 0,
      };
    }

    /**
     * Common sanitization patterns
     */
    static sanitizationPatterns = {
      userInput: {
        type: "safeString",
        sanitizeOptions: { maxLength: 1000, trimWhitespace: true },
      },
      email: {
        type: "email",
        validation: { type: "email", options: { required: true } },
      },
      password: {
        type: "password",
        validation: { type: "strongPassword", options: { required: true } },
      },
      name: {
        type: "safeString",
        sanitizeOptions: { maxLength: 100, allowHTML: false },
      },
      description: {
        type: "html",
        allowHTML: false,
        sanitizeOptions: { maxLength: 5000 },
      },
      url: {
        type: "url",
        validation: { type: "url", options: { required: false } },
      },
      phoneNumber: {
        type: "safeString",
        validation: { type: "phoneNumber", options: { required: false } },
      },
    };

    // ===== Safe DOM Manipulation =====

    /**
     * Safely set text content with XSS protection
     * @param {HTMLElement} element - Target element
     * @param {string} text - Text content to set
     * @param {Object} options - Sanitization options
     * @returns {boolean} Success status
     */
    static setTextContent(element, text, options = {}) {
      if (!element || !element.nodeType === Node.ELEMENT_NODE) {
        console.error(
          "[SecurityUtils] Invalid element provided to setTextContent",
        );
        return false;
      }

      if (text === null || text === undefined) {
        element.textContent = "";
        return true;
      }

      // Convert to string and sanitize
      const textStr = String(text);
      const sanitized = SecurityUtils.sanitizeXSS(textStr, {
        allowHTML: false,
        encodeEntities: false, // textContent handles this automatically
        trimWhitespace: true,
        maxLength: 10000,
        ...options,
      });

      try {
        element.textContent = sanitized;

        // Log security event for audit
        SecurityUtils.logSecurityEvent("setTextContent", {
          elementTag: element.tagName,
          textLength: textStr.length,
          sanitized: sanitized !== textStr,
        });

        return true;
      } catch (error) {
        console.error("[SecurityUtils] Error in setTextContent:", error);
        // Fallback: set empty text
        element.textContent = "";
        return false;
      }
    }

    /**
     * Safely set innerHTML with allowlist-based HTML filtering
     * @param {HTMLElement} element - Target element
     * @param {string} html - HTML content to set
     * @param {Object} options - Allowlist options
     * @param {Array} options.allowedTags - Allowed HTML tags
     * @param {Object} options.allowedAttributes - Allowed attributes per tag
     * @returns {boolean} Success status
     */
    static safeSetInnerHTML(element, html, options = {}) {
      if (!element || !element.nodeType === Node.ELEMENT_NODE) {
        console.error(
          "[SecurityUtils] Invalid element provided to safeSetInnerHTML",
        );
        return false;
      }

      if (!html || typeof html !== "string") {
        element.innerHTML = "";
        return true;
      }

      const config = {
        allowedTags: ["div", "span", "p", "br", "strong", "em", "i", "b"],
        allowedAttributes: {},
        maxLength: 10000,
        ...options,
      };

      try {
        // First, sanitize the HTML string to prevent XSS
        let sanitized = SecurityUtils.sanitizeXSS(html, {
          allowHTML: true,
          allowScripts: false,
          encodeEntities: false, // We'll handle filtering instead
          maxLength: config.maxLength,
        });

        // Create a temporary container to parse and filter HTML
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = sanitized;

        // Recursively filter elements
        const filterElement = (el) => {
          const tagName = el.tagName.toLowerCase();

          // Check if tag is allowed
          if (!config.allowedTags.includes(tagName)) {
            // Replace with text content
            const textNode = document.createTextNode(el.textContent || "");
            el.parentNode.replaceChild(textNode, el);
            return;
          }

          // Filter attributes
          const allowedAttrs = config.allowedAttributes[tagName] || [];
          const attrs = Array.from(el.attributes);

          attrs.forEach((attr) => {
            if (!allowedAttrs.includes(attr.name)) {
              el.removeAttribute(attr.name);
            } else {
              // Sanitize attribute value
              el.setAttribute(
                attr.name,
                SecurityUtils.sanitizeForAttribute(attr.value),
              );
            }
          });

          // Process child elements
          Array.from(el.children).forEach((child) => filterElement(child));
        };

        // Filter all elements in temp container
        Array.from(tempDiv.children).forEach((child) => filterElement(child));

        // Set the filtered content
        element.innerHTML = tempDiv.innerHTML;

        // Log security event
        SecurityUtils.logSecurityEvent("safeSetInnerHTML", {
          elementTag: element.tagName,
          htmlLength: html.length,
          allowedTags: config.allowedTags,
          filteredContent: tempDiv.innerHTML.length !== html.length,
        });

        return true;
      } catch (error) {
        console.error("[SecurityUtils] Error in safeSetInnerHTML:", error);
        // Fallback: set as plain text
        element.textContent = html;
        return false;
      }
    }

    // ===== Singleton Pattern =====

    static instance = null;

    static getInstance() {
      if (!SecurityUtils.instance) {
        SecurityUtils.instance = new SecurityUtils();
      }
      return SecurityUtils.instance;
    }

    // ===== Security Exception Classes =====

    /**
     * Security validation exception for input validation failures
     */
    static ValidationException = class ValidationException extends Error {
      constructor(message, field = null, value = null) {
        super(message);
        this.name = "ValidationException";
        this.field = field;
        this.value = value;
        this.timestamp = new Date().toISOString();
      }
    };

    /**
     * Security exception for security policy violations
     */
    static SecurityException = class SecurityException extends Error {
      constructor(message, action = null, details = null) {
        super(message);
        this.name = "SecurityException";
        this.action = action;
        this.details = details;
        this.timestamp = new Date().toISOString();
      }
    };

    // ===== Enhanced Validation Methods =====

    /**
     * Enhanced validateInput method for object validation with security options
     * Used by BaseEntityManager and other components for comprehensive validation
     * @param {Object|string|any} data - Data to validate (object, string, or any type)
     * @param {Object} options - Security validation options
     * @param {boolean} options.preventXSS - Enable XSS prevention (default: true)
     * @param {boolean} options.preventSQLInjection - Enable SQL injection prevention (default: true)
     * @param {boolean} options.sanitizeStrings - Enable string sanitization (default: true)
     * @param {boolean} options.allowEmpty - Allow empty values (default: true)
     * @param {boolean} options.recursiveValidation - Validate nested objects (default: true)
     * @returns {Object} Validation result with isValid, sanitizedData, errors, and warnings
     */
    static validateInput(data, options = {}) {
      const config = {
        preventXSS: true,
        preventSQLInjection: true,
        sanitizeStrings: true,
        allowEmpty: true,
        recursiveValidation: true,
        maxDepth: 10,
        maxStringLength: 10000,
        ...options,
      };

      const result = {
        isValid: true,
        sanitizedData: data,
        errors: [],
        warnings: [],
      };

      try {
        // Handle null/undefined
        if (data === null || data === undefined) {
          if (config.allowEmpty) {
            return result;
          } else {
            result.isValid = false;
            result.errors.push("Data cannot be null or undefined");
            return result;
          }
        }

        // Handle different data types
        if (typeof data === "string") {
          result.sanitizedData = SecurityUtils._validateString(
            data,
            config,
            result,
          );
        } else if (typeof data === "object" && !Array.isArray(data)) {
          result.sanitizedData = SecurityUtils._validateObject(
            data,
            config,
            result,
            0,
          );
        } else if (Array.isArray(data)) {
          result.sanitizedData = SecurityUtils._validateArray(
            data,
            config,
            result,
            0,
          );
        } else {
          // For primitives (numbers, booleans), just pass through
          result.sanitizedData = data;
        }

        // Log validation event for security monitoring
        if (result.errors.length > 0 || result.warnings.length > 0) {
          SecurityUtils.logSecurityEvent("input_validation", {
            dataType: typeof data,
            hasErrors: result.errors.length > 0,
            hasWarnings: result.warnings.length > 0,
            errorCount: result.errors.length,
            warningCount: result.warnings.length,
          });
        }
      } catch (error) {
        result.isValid = false;
        result.errors.push(`Validation error: ${error.message}`);
        console.error("[SecurityUtils] validateInput error:", error);
      }

      return result;
    }

    /**
     * Validate string with security options
     * @private
     */
    static _validateString(str, config, result) {
      let sanitized = str;

      // Check string length
      if (str.length > config.maxStringLength) {
        result.warnings.push(
          `String length exceeds maximum (${config.maxStringLength})`,
        );
        sanitized = str.substring(0, config.maxStringLength);
      }

      // Apply sanitization based on config
      if (config.sanitizeStrings) {
        if (config.preventXSS) {
          sanitized = SecurityUtils.sanitizeXSS(sanitized);
        }
        if (config.preventSQLInjection) {
          sanitized = SecurityUtils._preventSQLInjection(sanitized);
        }
      }

      return sanitized;
    }

    /**
     * Validate object recursively with security options
     * @private
     */
    static _validateObject(obj, config, result, depth) {
      if (depth > config.maxDepth) {
        result.warnings.push(
          `Object depth exceeds maximum (${config.maxDepth})`,
        );
        return obj;
      }

      if (!config.recursiveValidation) {
        return obj;
      }

      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Validate the key itself
        const sanitizedKey = SecurityUtils._validateString(key, config, result);

        // Validate the value
        if (typeof value === "string") {
          sanitized[sanitizedKey] = SecurityUtils._validateString(
            value,
            config,
            result,
          );
        } else if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          sanitized[sanitizedKey] = SecurityUtils._validateObject(
            value,
            config,
            result,
            depth + 1,
          );
        } else if (Array.isArray(value)) {
          sanitized[sanitizedKey] = SecurityUtils._validateArray(
            value,
            config,
            result,
            depth + 1,
          );
        } else {
          sanitized[sanitizedKey] = value;
        }
      }

      return sanitized;
    }

    /**
     * Validate array with security options
     * @private
     */
    static _validateArray(arr, config, result, depth) {
      if (depth > config.maxDepth) {
        result.warnings.push(
          `Array depth exceeds maximum (${config.maxDepth})`,
        );
        return arr;
      }

      if (!config.recursiveValidation) {
        return arr;
      }

      return arr.map((item) => {
        if (typeof item === "string") {
          return SecurityUtils._validateString(item, config, result);
        } else if (
          typeof item === "object" &&
          item !== null &&
          !Array.isArray(item)
        ) {
          return SecurityUtils._validateObject(item, config, result, depth + 1);
        } else if (Array.isArray(item)) {
          return SecurityUtils._validateArray(item, config, result, depth + 1);
        } else {
          return item;
        }
      });
    }

    /**
     * Basic SQL injection prevention
     * @private
     */
    static _preventSQLInjection(str) {
      if (typeof str !== "string") return str;

      // Basic SQL injection patterns to neutralize
      const sqlPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
        /(;|\-\-|\/\*|\*\/)/g,
        /(\b(or|and)\s+\d+\s*=\s*\d+)/gi,
      ];

      let sanitized = str;
      sqlPatterns.forEach((pattern) => {
        sanitized = sanitized.replace(pattern, "");
      });

      return sanitized;
    }

    // ===== CSRF Header Management =====

    /**
     * Add CSRF protection headers to existing headers object
     * @param {Object} headers - Existing headers object
     * @returns {Object} Headers with CSRF protection added
     */
    static addCSRFProtection(headers = {}) {
      const instance = SecurityUtils.getInstance();
      if (!instance) {
        console.warn(
          "[SecurityUtils] No instance available for CSRF protection",
        );
        return headers;
      }

      const csrfToken = instance.getCSRFToken();
      if (!csrfToken) {
        console.warn("[SecurityUtils] No CSRF token available");
        return headers;
      }

      return {
        ...headers,
        "X-CSRF-Token": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      };
    }

    /**
     * Add CSRF protection headers to existing headers object (Instance method)
     * @param {Object} headers - Existing headers object
     * @returns {Object} Headers with CSRF protection added
     */
    addCSRFProtection(headers = {}) {
      const csrfToken = this.getCSRFToken();
      if (!csrfToken) {
        console.warn(
          "[SecurityUtils] No CSRF token available for instance method",
        );
        return headers;
      }

      return {
        ...headers,
        "X-CSRF-Token": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      };
    }

    // ===== Legacy Support =====

    /**
     * Legacy sanitizeString method for backward compatibility
     */
    static sanitizeString(str) {
      return SecurityUtils.sanitizeXSS(str);
    }

    /**
     * Legacy generateToken method for backward compatibility
     */
    static generateToken() {
      return SecurityUtils.generateSecureToken();
    }

    /**
     * Security audit log entry (Instance method)
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
     * Security audit log entry (Static method for backward compatibility)
     * @param {string} action - Security action
     * @param {Object} details - Additional details
     */
    static logSecurityEvent(action, details = {}) {
      const instance = SecurityUtils.getInstance();
      if (instance) {
        return instance.logSecurityEvent(action, details);
      } else {
        console.warn(
          "[SecurityUtils] Static logSecurityEvent called but no instance available",
        );
      }
    }

    /**
     * Cleanup resources
     */
    destroy() {
      this.stopCSRFTokenRotation();
      this.clearAllRateLimits();
      SecurityUtils.instance = null;
    }
  }

  // Initialize singleton instance
  SecurityUtils.getInstance();

  // Attach to window for browser compatibility
  if (typeof window !== "undefined") {
    window.SecurityUtils = SecurityUtils;
    // Make static methods directly callable
    if (!window.SecurityUtils.logSecurityEvent) {
      window.SecurityUtils.logSecurityEvent = SecurityUtils.logSecurityEvent;
    }
    if (!window.SecurityUtils.generateNonce) {
      window.SecurityUtils.generateNonce = SecurityUtils.generateNonce;
    }
    if (!window.SecurityUtils.generateSecureToken) {
      window.SecurityUtils.generateSecureToken =
        SecurityUtils.generateSecureToken;
    }
    if (!window.SecurityUtils.safeSetInnerHTML) {
      window.SecurityUtils.safeSetInnerHTML = SecurityUtils.safeSetInnerHTML;
    }
    if (!window.SecurityUtils.setTextContent) {
      window.SecurityUtils.setTextContent = SecurityUtils.setTextContent;
    }
    if (!window.SecurityUtils.addCSRFProtection) {
      window.SecurityUtils.addCSRFProtection = SecurityUtils.addCSRFProtection;
    }
  }
} // End of SecurityUtils undefined check
