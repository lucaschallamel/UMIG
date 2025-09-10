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
      .replace(/'/g, "&#39;");
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
   * Validate integer input
   * @param {*} value - Value to validate
   * @param {Object} constraints - Validation constraints
   * @returns {number|null} Validated integer or null
   */
  static validateInteger(value, constraints = {}) {
    const num = parseInt(value, 10);

    if (isNaN(num)) {
      return null;
    }

    if (constraints.min !== undefined && num < constraints.min) {
      return null;
    }

    if (constraints.max !== undefined && num > constraints.max) {
      return null;
    }

    return num;
  }

  /**
   * Validate string input
   * @param {*} value - Value to validate
   * @param {Object} constraints - Validation constraints
   * @returns {string|null} Validated string or null
   */
  static validateString(value, constraints = {}) {
    if (value == null) {
      return constraints.allowEmpty ? "" : null;
    }

    const str = String(value);

    // Empty string handling - default doesn't allow empty unless specified
    if (str === "" && !constraints.allowEmpty) {
      return null;
    }

    if (
      constraints.minLength !== undefined &&
      str.length < constraints.minLength
    ) {
      return null;
    }

    if (
      constraints.maxLength !== undefined &&
      str.length > constraints.maxLength
    ) {
      return str.substring(0, constraints.maxLength);
    }

    if (constraints.pattern && !constraints.pattern.test(str)) {
      return null;
    }

    return str;
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
    // this.sendToSecurityMonitoring(logEntry);
  }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = SecurityUtils;
}

if (typeof window !== "undefined") {
  window.SecurityUtils = SecurityUtils;
}
