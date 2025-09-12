/**
 * SecurityUtils - Security Utility Module
 * US-082-B Component Architecture Development
 *
 * Provides security utilities for all components:
 * - HTML escaping and sanitization
 * - Input validation
 * - XSS prevention
 * - Safe DOM manipulation
 * - Content Security Policy compliance
 */

class SecurityUtils {
  /**
   * CSRF token storage and management
   * @private
   */
  static _csrfToken = null;
  static _csrfTokenExpiry = null;
  static _csrfTokenKey = "umig_csrf_token";

  /**
   * Rate limiting storage
   * @private
   */
  static _rateLimits = new Map();

  /**
   * Security exception class for enhanced error handling
   */
  static SecurityException = class extends Error {
    constructor(message, code = "SECURITY_VIOLATION", details = {}) {
      super(message);
      this.name = "SecurityException";
      this.code = code;
      this.details = details;
      this.timestamp = new Date().toISOString();
    }
  };

  /**
   * Validation exception class
   */
  static ValidationException = class extends Error {
    constructor(message, field = null, value = null) {
      super(message);
      this.name = "ValidationException";
      this.field = field;
      this.value = value;
      this.timestamp = new Date().toISOString();
    }
  };

  /**
   * Generate CSRF token with secure random values
   * @returns {string} CSRF token
   */
  static generateCSRFToken() {
    try {
      // Generate 32 bytes of random data
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);

      // Convert to base64 for transmission
      const token = btoa(String.fromCharCode.apply(null, array));

      // Set expiry to 1 hour from now
      const expiry = new Date(Date.now() + 3600000);

      // Store token and expiry
      this._csrfToken = token;
      this._csrfTokenExpiry = expiry;

      // Store in sessionStorage for persistence across requests
      try {
        sessionStorage.setItem(
          this._csrfTokenKey,
          JSON.stringify({
            token,
            expiry: expiry.toISOString(),
          }),
        );
      } catch (storageError) {
        console.warn(
          "[SecurityUtils] Failed to store CSRF token in sessionStorage:",
          storageError,
        );
      }

      this.logSecurityEvent("csrf_token_generated", "info", {
        tokenLength: token.length,
      });

      return token;
    } catch (error) {
      this.logSecurityEvent("csrf_token_generation_failed", "error", {
        error: error.message,
      });
      throw new this.SecurityException(
        "Failed to generate CSRF token",
        "CSRF_GENERATION_ERROR",
        { originalError: error },
      );
    }
  }

  /**
   * Get current CSRF token, generating if needed
   * @returns {string} CSRF token
   */
  static getCSRFToken() {
    try {
      // Check if we have a valid token in memory
      if (
        this._csrfToken &&
        this._csrfTokenExpiry &&
        new Date() < this._csrfTokenExpiry
      ) {
        return this._csrfToken;
      }

      // Try to load from sessionStorage
      try {
        const stored = sessionStorage.getItem(this._csrfTokenKey);
        if (stored) {
          const { token, expiry } = JSON.parse(stored);
          const expiryDate = new Date(expiry);

          if (new Date() < expiryDate) {
            this._csrfToken = token;
            this._csrfTokenExpiry = expiryDate;
            return token;
          }
        }
      } catch (storageError) {
        console.warn(
          "[SecurityUtils] Failed to load CSRF token from sessionStorage:",
          storageError,
        );
      }

      // Generate new token if none exists or expired
      return this.generateCSRFToken();
    } catch (error) {
      this.logSecurityEvent("csrf_token_retrieval_failed", "error", {
        error: error.message,
      });
      throw new this.SecurityException(
        "Failed to get CSRF token",
        "CSRF_RETRIEVAL_ERROR",
        { originalError: error },
      );
    }
  }

  /**
   * Validate CSRF token
   * @param {string} token - Token to validate
   * @returns {boolean} True if valid
   */
  static validateCSRFToken(token) {
    try {
      if (!token || typeof token !== "string") {
        this.logSecurityEvent("csrf_validation_failed", "warning", {
          reason: "invalid_token_format",
        });
        return false;
      }

      const currentToken = this.getCSRFToken();
      const isValid = token === currentToken;

      if (!isValid) {
        this.logSecurityEvent("csrf_validation_failed", "warning", {
          reason: "token_mismatch",
        });
      } else {
        this.logSecurityEvent("csrf_validation_success", "info");
      }

      return isValid;
    } catch (error) {
      this.logSecurityEvent("csrf_validation_error", "error", {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Add CSRF protection to fetch request headers
   * @param {Object} headers - Request headers object
   * @returns {Object} Headers with CSRF protection
   */
  static addCSRFProtection(headers = {}) {
    try {
      const token = this.getCSRFToken();
      return {
        ...headers,
        "X-CSRF-Token": token,
        "X-Requested-With": "XMLHttpRequest",
      };
    } catch (error) {
      this.logSecurityEvent("csrf_protection_failed", "error", {
        error: error.message,
      });
      throw new this.SecurityException(
        "Failed to add CSRF protection",
        "CSRF_PROTECTION_ERROR",
        { originalError: error },
      );
    }
  }

  /**
   * Escape HTML to prevent XSS attacks
   * @param {string} text - Text to escape
   * @returns {string} Escaped HTML
   */
  static escapeHtml(text) {
    if (text == null) return "";

    const str = String(text);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/\//g, "&#x2F;"); // Additional forward slash escaping
  }

  /**
   * Prevent XSS in object properties
   * @param {Object} obj - Object to sanitize
   * @returns {Object} Sanitized object
   */
  static preventXSS(obj) {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    const sanitized = {};

    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (typeof value === "string") {
        // Check for potential XSS patterns
        if (this._containsXSSPatterns(value)) {
          this.logSecurityEvent("xss_attempt_detected", "warning", {
            field: key,
            value: value.substring(0, 100), // Log first 100 chars only
          });
          sanitized[key] = this.escapeHtml(value);
        } else {
          sanitized[key] = value;
        }
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === "string" ? this.escapeHtml(item) : item,
        );
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.preventXSS(value); // Recursive sanitization
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Check for common XSS patterns
   * @param {string} str - String to check
   * @returns {boolean} True if XSS patterns detected
   * @private
   */
  static _containsXSSPatterns(str) {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
    ];

    return xssPatterns.some((pattern) => pattern.test(str));
  }

  /**
   * Comprehensive input validation
   * @param {Object} data - Data to validate
   * @param {Object} rules - Validation rules
   * @returns {Object} Validation result
   */
  static validateInput(data, rules = {}) {
    const result = {
      isValid: true,
      errors: [],
      sanitizedData: {},
    };

    if (!data || typeof data !== "object") {
      result.isValid = false;
      result.errors.push("Invalid data format");
      return result;
    }

    // Default rules for common security checks
    const defaultRules = {
      preventXSS: true,
      preventSQLInjection: true,
      validateLength: true,
      sanitizeStrings: true,
    };

    const validationRules = { ...defaultRules, ...rules };

    Object.keys(data).forEach((key) => {
      const value = data[key];

      try {
        // XSS prevention
        if (validationRules.preventXSS && typeof value === "string") {
          if (this._containsXSSPatterns(value)) {
            result.errors.push(`XSS pattern detected in field: ${key}`);
            result.isValid = false;
          }
        }

        // SQL injection prevention
        if (validationRules.preventSQLInjection && typeof value === "string") {
          if (this._containsSQLInjectionPatterns(value)) {
            result.errors.push(
              `SQL injection pattern detected in field: ${key}`,
            );
            result.isValid = false;
          }
        }

        // Length validation
        if (validationRules.validateLength && typeof value === "string") {
          if (value.length > 10000) {
            // Reasonable max length
            result.errors.push(`Field ${key} exceeds maximum length`);
            result.isValid = false;
          }
        }

        // Sanitize and add to result
        if (validationRules.sanitizeStrings && typeof value === "string") {
          result.sanitizedData[key] = this.escapeHtml(value);
        } else {
          result.sanitizedData[key] = value;
        }
      } catch (error) {
        result.errors.push(
          `Validation error for field ${key}: ${error.message}`,
        );
        result.isValid = false;
      }
    });

    if (!result.isValid) {
      this.logSecurityEvent("input_validation_failed", "warning", {
        errors: result.errors,
        fieldCount: Object.keys(data).length,
      });
    }

    return result;
  }

  /**
   * Check for SQL injection patterns
   * @param {string} str - String to check
   * @returns {boolean} True if SQL injection patterns detected
   * @private
   */
  static _containsSQLInjectionPatterns(str) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(--|#|\/\*|\*\/)/g,
      /(\bxp_\w+\b)/gi,
      /(\bsp_\w+\b)/gi,
      /(;|\|\||&&)/g,
    ];

    return sqlPatterns.some((pattern) => pattern.test(str));
  }

  /**
   * Validate specific input types with enhanced security
   * @param {*} value - Value to validate
   * @param {string} type - Validation type
   * @param {Object} constraints - Additional constraints
   * @returns {*} Validated value or throws exception
   */
  static validateInputType(value, type, constraints = {}) {
    try {
      switch (type) {
        case "alphanumeric":
          return this._validateAlphanumeric(value, constraints);
        case "email":
          return this._validateEmailSecure(value, constraints);
        case "uuid":
          return this._validateUUID(value, constraints);
        case "integer":
          return this._validateIntegerSecure(value, constraints);
        case "string":
          return this._validateStringSecure(value, constraints);
        case "url":
          return this._validateURLSecure(value, constraints);
        default:
          throw new this.ValidationException(
            `Unknown validation type: ${type}`,
          );
      }
    } catch (error) {
      if (error instanceof this.ValidationException) {
        throw error;
      }
      throw new this.ValidationException(
        `Validation failed for type ${type}: ${error.message}`,
        type,
        value,
      );
    }
  }

  /**
   * Validate alphanumeric input
   * @param {*} value - Value to validate
   * @param {Object} constraints - Validation constraints
   * @returns {string} Validated value
   * @private
   */
  static _validateAlphanumeric(value, constraints) {
    if (value == null) {
      if (constraints.allowNull) return null;
      throw new this.ValidationException("Alphanumeric value cannot be null");
    }

    const str = String(value);
    const pattern = /^[a-zA-Z0-9\s\-_]+$/;

    if (!pattern.test(str)) {
      throw new this.ValidationException(
        "Value must contain only letters, numbers, spaces, hyphens, and underscores",
        "pattern",
        value,
      );
    }

    return this._validateStringLength(str, constraints);
  }

  /**
   * Validate email with enhanced security
   * @param {*} value - Email to validate
   * @param {Object} constraints - Validation constraints
   * @returns {string} Validated email
   * @private
   */
  static _validateEmailSecure(value, constraints) {
    if (value == null) {
      if (constraints.allowNull) return null;
      throw new this.ValidationException("Email cannot be null");
    }

    const email = String(value).toLowerCase().trim();

    // Enhanced email validation
    if (!this.validateEmail(email)) {
      throw new this.ValidationException(
        "Invalid email format",
        "email",
        value,
      );
    }

    // Additional security checks
    if (email.includes("..") || email.startsWith(".") || email.endsWith(".")) {
      throw new this.ValidationException(
        "Email contains invalid characters",
        "email",
        value,
      );
    }

    return email;
  }

  /**
   * Validate UUID format
   * @param {*} value - UUID to validate
   * @param {Object} constraints - Validation constraints
   * @returns {string} Validated UUID
   * @private
   */
  static _validateUUID(value, constraints) {
    if (value == null) {
      if (constraints.allowNull) return null;
      throw new this.ValidationException("UUID cannot be null");
    }

    const str = String(value);
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(str)) {
      throw new this.ValidationException("Invalid UUID format", "uuid", value);
    }

    return str.toLowerCase();
  }

  /**
   * Validate integer with enhanced security
   * @param {*} value - Integer to validate
   * @param {Object} constraints - Validation constraints
   * @returns {number} Validated integer
   * @private
   */
  static _validateIntegerSecure(value, constraints) {
    if (value == null) {
      if (constraints.allowNull) return null;
      throw new this.ValidationException("Integer cannot be null");
    }

    const num = parseInt(value, 10);

    if (isNaN(num)) {
      throw new this.ValidationException(
        "Value is not a valid integer",
        "integer",
        value,
      );
    }

    // Check for extremely large numbers that could cause issues
    if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
      throw new this.ValidationException(
        "Integer value outside safe range",
        "integer",
        value,
      );
    }

    if (constraints.min !== undefined && num < constraints.min) {
      throw new this.ValidationException(
        `Integer value ${num} below minimum ${constraints.min}`,
        "min",
        value,
      );
    }

    if (constraints.max !== undefined && num > constraints.max) {
      throw new this.ValidationException(
        `Integer value ${num} above maximum ${constraints.max}`,
        "max",
        value,
      );
    }

    return num;
  }

  /**
   * Validate string with enhanced security
   * @param {*} value - String to validate
   * @param {Object} constraints - Validation constraints
   * @returns {string} Validated string
   * @private
   */
  static _validateStringSecure(value, constraints) {
    if (value == null) {
      if (constraints.allowNull || constraints.allowEmpty)
        return constraints.allowNull ? null : "";
      throw new this.ValidationException("String cannot be null");
    }

    let str = String(value);

    // XSS prevention
    if (this._containsXSSPatterns(str)) {
      this.logSecurityEvent("xss_in_string_validation", "warning", {
        value: str.substring(0, 100),
      });
      if (constraints.preventXSS !== false) {
        str = this.escapeHtml(str);
      }
    }

    // SQL injection prevention
    if (this._containsSQLInjectionPatterns(str)) {
      this.logSecurityEvent("sql_injection_in_string_validation", "warning", {
        value: str.substring(0, 100),
      });
      throw new this.ValidationException(
        "String contains potentially dangerous SQL patterns",
        "sql_injection",
        value,
      );
    }

    return this._validateStringLength(str, constraints);
  }

  /**
   * Validate string length
   * @param {string} str - String to validate
   * @param {Object} constraints - Length constraints
   * @returns {string} Validated string
   * @private
   */
  static _validateStringLength(str, constraints) {
    if (
      constraints.minLength !== undefined &&
      str.length < constraints.minLength
    ) {
      throw new this.ValidationException(
        `String length ${str.length} below minimum ${constraints.minLength}`,
        "minLength",
        str,
      );
    }

    if (
      constraints.maxLength !== undefined &&
      str.length > constraints.maxLength
    ) {
      if (constraints.truncate) {
        return str.substring(0, constraints.maxLength);
      }
      throw new this.ValidationException(
        `String length ${str.length} above maximum ${constraints.maxLength}`,
        "maxLength",
        str,
      );
    }

    return str;
  }

  /**
   * Validate URL with enhanced security
   * @param {*} value - URL to validate
   * @param {Object} constraints - Validation constraints
   * @returns {string} Validated URL
   * @private
   */
  static _validateURLSecure(value, constraints) {
    if (value == null) {
      if (constraints.allowNull) return null;
      throw new this.ValidationException("URL cannot be null");
    }

    const url = String(value).trim();

    if (!this.validateUrl(url)) {
      throw new this.ValidationException("Invalid URL format", "url", value);
    }

    // Additional security checks
    try {
      const urlObj = new URL(url);

      // Block dangerous protocols
      const allowedProtocols = constraints.allowedProtocols || [
        "http:",
        "https:",
      ];
      if (!allowedProtocols.includes(urlObj.protocol)) {
        throw new this.ValidationException(
          `URL protocol ${urlObj.protocol} not allowed`,
          "protocol",
          value,
        );
      }

      // Block localhost/private IPs in production
      if (constraints.blockPrivateIPs && this._isPrivateIP(urlObj.hostname)) {
        throw new this.ValidationException(
          "Private IP addresses not allowed",
          "private_ip",
          value,
        );
      }

      return url;
    } catch (error) {
      if (error instanceof this.ValidationException) {
        throw error;
      }
      throw new this.ValidationException(
        `URL validation failed: ${error.message}`,
        "url",
        value,
      );
    }
  }

  /**
   * Check if hostname is private IP
   * @param {string} hostname - Hostname to check
   * @returns {boolean} True if private IP
   * @private
   */
  static _isPrivateIP(hostname) {
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];

    return privatePatterns.some((pattern) => pattern.test(hostname));
  }

  /**
   * Validate length constraint
   * @param {string} value - Value to check
   * @param {number} minLength - Minimum length
   * @param {number} maxLength - Maximum length
   * @returns {boolean} True if valid
   */
  static validateLength(value, minLength, maxLength) {
    if (value == null) return minLength === 0;

    const len = String(value).length;
    return len >= minLength && len <= maxLength;
  }

  /**
   * Sanitize HTML content by removing dangerous elements and attributes
   * @param {string} html - HTML to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized HTML
   */
  static sanitizeHtml(html, options = {}) {
    if (!html) return "";

    const defaults = {
      allowedTags: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "span",
        "div",
        "a",
        "ul",
        "ol",
        "li",
        "mark",
        "button",
      ],
      allowedAttributes: {
        a: ["href", "title"],
        span: ["class"],
        div: ["class"],
        button: ["type", "class"],
        mark: [],
      },
      allowedClasses: ["highlight", "error", "warning", "info", "success"],
    };

    const config = { ...defaults, ...options };

    // Create a temporary container
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Remove all script tags and event handlers
    this.removeScripts(temp);
    this.removeEventHandlers(temp);

    // Clean all elements
    this.cleanElement(temp, config);

    return temp.innerHTML;
  }

  /**
   * Sanitize input to remove/escape dangerous characters
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  static sanitizeInput(input) {
    if (!input || typeof input !== "string") {
      return input;
    }

    // Remove null bytes and control characters
    let sanitized = input
      .replace(/\0/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // Escape HTML to prevent XSS
    sanitized = this.escapeHtml(sanitized);

    return sanitized;
  }

  /**
   * Remove all script tags from element
   */
  static removeScripts(element) {
    const scripts = element.querySelectorAll("script");
    scripts.forEach((script) => script.remove());

    // Also remove noscript tags
    const noscripts = element.querySelectorAll("noscript");
    noscripts.forEach((noscript) => noscript.remove());
  }

  /**
   * Remove all inline event handlers
   */
  static removeEventHandlers(element) {
    const allElements = element.querySelectorAll("*");
    allElements.forEach((el) => {
      // Remove all on* attributes
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith("on")) {
          el.removeAttribute(attr.name);
        }
      });

      // Remove javascript: URLs
      if (el.hasAttribute("href")) {
        const href = el.getAttribute("href");
        if (href && href.trim().toLowerCase().startsWith("javascript:")) {
          el.removeAttribute("href");
        }
      }
    });
  }

  /**
   * Clean element recursively based on whitelist
   */
  static cleanElement(element, config) {
    const allElements = Array.from(element.querySelectorAll("*"));

    allElements.forEach((el) => {
      const tagName = el.tagName.toLowerCase();

      // Remove element if not in allowed tags
      if (!config.allowedTags.includes(tagName)) {
        el.remove();
        return;
      }

      // Clean attributes
      Array.from(el.attributes).forEach((attr) => {
        const attrName = attr.name.toLowerCase();
        const allowedAttrs = config.allowedAttributes[tagName] || [];

        if (!allowedAttrs.includes(attrName)) {
          el.removeAttribute(attr.name);
        } else if (attrName === "class") {
          // Filter classes
          const classes = attr.value
            .split(" ")
            .filter((cls) => config.allowedClasses.includes(cls));
          if (classes.length === 0) {
            el.removeAttribute("class");
          } else {
            el.className = classes.join(" ");
          }
        }
      });
    });
  }

  /**
   * Safely set inner HTML with sanitization
   * @param {HTMLElement} element - Target element
   * @param {string} html - HTML content
   * @param {Object} options - Sanitization options
   */
  static safeSetInnerHTML(element, html, options = {}) {
    if (!element) return;

    const sanitized = this.sanitizeHtml(html, options);
    element.innerHTML = sanitized;
  }

  /**
   * Safely create text node
   * @param {string} text - Text content
   * @returns {Text} Text node
   */
  static createTextNode(text) {
    return document.createTextNode(String(text || ""));
  }

  /**
   * Escape special regex characters to prevent ReDoS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  static escapeRegex(str) {
    if (!str) return "";
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Validate integer input (legacy method for compatibility)
   * @param {*} value - Value to validate
   * @param {Object} constraints - Validation constraints
   * @returns {number|null} Validated integer or null
   */
  static validateInteger(value, constraints = {}) {
    try {
      return this._validateIntegerSecure(value, {
        ...constraints,
        allowNull: true,
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate string input (legacy method for compatibility)
   * @param {*} value - Value to validate
   * @param {Object} constraints - Validation constraints
   * @returns {string|null} Validated string or null
   */
  static validateString(value, constraints = {}) {
    try {
      return this._validateStringSecure(value, {
        ...constraints,
        allowNull: true,
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  static validateEmail(email) {
    if (!email) return false;

    // Additional checks first
    if (email.length > 254) return false; // Max email length
    if (email.startsWith(".") || email.endsWith(".")) return false;
    if (email.includes("..")) return false;
    if (!email.includes("@")) return false;

    const parts = email.split("@");
    if (parts.length !== 2) return false;

    const [local, domain] = parts;
    if (!local || !domain) return false;
    if (local.startsWith(".") || local.endsWith(".")) return false;
    if (domain.startsWith(".") || domain.endsWith(".")) return false;
    if (!domain.includes(".")) return false; // Domain must have at least one dot

    // RFC 5322 compliant regex (simplified)
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    return emailRegex.test(email);
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  static validateUrl(url) {
    if (!url) return false;

    try {
      const urlObj = new URL(url);
      // Only allow http and https protocols
      return ["http:", "https:"].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Create safe element with text content
   * @param {string} tag - HTML tag
   * @param {string} text - Text content
   * @param {Object} attributes - Element attributes
   * @returns {HTMLElement} Created element
   */
  static createElement(tag, text = "", attributes = {}) {
    const element = document.createElement(tag);

    if (text) {
      element.textContent = text;
    }

    // Safely set attributes
    Object.keys(attributes).forEach((key) => {
      if (key.startsWith("on")) {
        // Skip event handlers
        return;
      }

      if (key === "href" || key === "src") {
        // Validate URLs
        if (!this.validateUrl(attributes[key])) {
          return;
        }
      }

      element.setAttribute(key, String(attributes[key]));
    });

    return element;
  }

  /**
   * Safely highlight search terms in text
   * @param {string} text - Text to highlight
   * @param {string} term - Search term
   * @returns {string} HTML with highlighted terms
   */
  static highlightSearchTerm(text, term) {
    if (!text || !term) return this.escapeHtml(text);

    const escapedText = this.escapeHtml(text);
    const escapedTerm = this.escapeRegex(term);

    // Create safe regex
    try {
      const regex = new RegExp(`(${escapedTerm})`, "gi");
      return escapedText.replace(regex, "<mark>$1</mark>");
    } catch {
      // If regex fails, return escaped text
      return escapedText;
    }
  }

  /**
   * Deep clone object to prevent reference mutations
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.deepClone(item));
    }

    if (obj instanceof Set) {
      return new Set(Array.from(obj).map((item) => this.deepClone(item)));
    }

    if (obj instanceof Map) {
      const cloned = new Map();
      obj.forEach((value, key) => {
        cloned.set(this.deepClone(key), this.deepClone(value));
      });
      return cloned;
    }

    // Handle regular objects
    const cloned = {};
    Object.keys(obj).forEach((key) => {
      cloned[key] = this.deepClone(obj[key]);
    });

    return cloned;
  }

  /**
   * Generate nonce for CSP
   * @returns {string} Random nonce
   */
  static generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
  }

  /**
   * Check if value is safe primitive
   * @param {*} value - Value to check
   * @returns {boolean} True if safe
   */
  static isSafePrimitive(value) {
    const type = typeof value;
    return (
      type === "string" ||
      type === "number" ||
      type === "boolean" ||
      value === null ||
      value === undefined
    );
  }

  /**
   * Rate limit check for actions
   * @param {string} action - Action identifier
   * @param {number} limit - Max attempts
   * @param {number} window - Time window in ms
   * @returns {boolean} True if allowed
   */
  static checkRateLimit(action, limit = 5, window = 60000) {
    const now = Date.now();
    const key = `rateLimit_${action}`;

    // Get or create rate limit data
    if (!this._rateLimits) {
      this._rateLimits = new Map();
    }

    let data = this._rateLimits.get(key);
    if (!data) {
      data = { attempts: [], window };
      this._rateLimits.set(key, data);
    }

    // Clean old attempts
    data.attempts = data.attempts.filter((time) => now - time < window);

    // Check limit
    if (data.attempts.length >= limit) {
      this.logSecurityEvent("rate_limit_exceeded", "warning", {
        action,
        attempts: data.attempts.length,
        limit,
      });
      return false;
    }

    // Add current attempt
    data.attempts.push(now);
    return true;
  }

  /**
   * Log security event
   * @param {string} event - Event type
   * @param {string} severity - Severity level
   * @param {Object} details - Event details
   */
  static logSecurityEvent(event, severity = "info", details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      severity,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log to console in development
    if (console && console.warn) {
      console.warn(`[SECURITY ${severity.toUpperCase()}] ${event}:`, logEntry);
    }

    // In production, send to security monitoring service
    if (window.UMIGServices?.securityService) {
      window.UMIGServices.securityService.logEvent(logEntry);
    }
  }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = SecurityUtils;
}

if (typeof window !== "undefined") {
  window.SecurityUtils = SecurityUtils;
}
