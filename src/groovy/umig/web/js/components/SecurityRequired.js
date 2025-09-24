/**
 * SecurityRequired.js - Mandatory Security Wrapper for UMIG Components
 *
 * This module ensures SecurityUtils is available and provides safe HTML manipulation
 * without dangerous fallbacks. If SecurityUtils is not available, operations fail safely.
 *
 * @module SecurityRequired
 * @requires SecurityUtils
 */

class SecurityRequired {
  constructor() {
    this.validateSecurityUtils();
  }

  /**
   * Validates that SecurityUtils is available
   * @throws {Error} If SecurityUtils is not available
   */
  validateSecurityUtils() {
    if (
      !window.SecurityUtils ||
      typeof window.SecurityUtils.safeSetInnerHTML !== "function"
    ) {
      throw new Error(
        "[SECURITY] SecurityUtils.safeSetInnerHTML is required but not available. Cannot proceed without XSS protection.",
      );
    }
  }

  /**
   * Safely sets innerHTML content with XSS protection
   * NO FALLBACK - Fails safely if SecurityUtils is not available
   *
   * @param {HTMLElement} element - The element to set content on
   * @param {string} content - The HTML content to set
   * @param {Object} options - Sanitization options
   * @returns {boolean} True if successful, throws error otherwise
   */
  safeSetHTML(element, content, options = {}) {
    if (!element) {
      console.error("[SecurityRequired] Cannot set HTML on null element");
      return false;
    }

    if (!window.SecurityUtils || !window.SecurityUtils.safeSetInnerHTML) {
      // NO FALLBACK - This is a security requirement
      console.error(
        "[SecurityRequired] SecurityUtils not available - refusing to set unsafe HTML",
      );
      // Set safe text content instead of HTML
      element.textContent =
        "[Security Error: Cannot render content without XSS protection]";
      return false;
    }

    try {
      // Use SecurityUtils for safe HTML insertion
      window.SecurityUtils.safeSetInnerHTML(element, content, options);
      return true;
    } catch (error) {
      console.error(
        "[SecurityRequired] Error during safe HTML insertion:",
        error,
      );
      element.textContent = "[Error: Failed to render content safely]";
      return false;
    }
  }

  /**
   * Get sanitization options for form content
   */
  getFormSanitizationOptions() {
    return {
      allowedTags: [
        "div",
        "label",
        "input",
        "select",
        "option",
        "textarea",
        "span",
        "p",
        "br",
        "button",
        "fieldset",
        "legend",
      ],
      allowedAttributes: {
        div: ["class", "style", "id", "data-field"],
        label: ["class", "for"],
        input: [
          "type",
          "name",
          "value",
          "placeholder",
          "required",
          "disabled",
          "class",
          "id",
          "checked",
          "min",
          "max",
          "pattern",
          "data-field",
        ],
        select: ["name", "required", "disabled", "class", "id", "data-field"],
        option: ["value", "selected"],
        textarea: [
          "name",
          "placeholder",
          "required",
          "disabled",
          "class",
          "id",
          "rows",
          "cols",
        ],
        button: ["type", "class", "data-action", "disabled"],
        fieldset: ["class"],
        legend: ["class"],
      },
    };
  }

  /**
   * Get sanitization options for general content
   */
  getContentSanitizationOptions() {
    return {
      allowedTags: [
        "div",
        "p",
        "span",
        "br",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "strong",
        "em",
        "a",
        "img",
        "pre",
        "code",
        "blockquote",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ],
      allowedAttributes: {
        div: ["class", "style", "id"],
        span: ["class", "style", "title"],
        a: ["href", "target", "rel", "class"],
        img: ["src", "alt", "class", "style", "width", "height"],
        pre: ["class"],
        code: ["class"],
        table: ["class"],
        "*": ["data-*"], // Allow data attributes on all elements
      },
    };
  }

  /**
   * Get sanitization options for button content
   */
  getButtonSanitizationOptions() {
    return {
      allowedTags: ["button", "span", "i"],
      allowedAttributes: {
        button: ["class", "data-action", "disabled", "type", "data-button-id"],
        span: ["class"],
        i: ["class"], // For icon fonts
      },
    };
  }

  /**
   * Get sanitization options for modal structure
   */
  getModalStructureSanitizationOptions() {
    return {
      allowedTags: [
        "div",
        "header",
        "section",
        "footer",
        "button",
        "span",
        "h1",
        "h2",
        "h3",
      ],
      allowedAttributes: {
        div: [
          "class",
          "style",
          "id",
          "role",
          "aria-labelledby",
          "aria-describedby",
          "aria-hidden",
          "data-close-on-overlay",
          "hidden",
        ],
        header: ["class", "id"],
        section: ["class", "id"],
        footer: ["class", "id"],
        button: ["class", "data-action", "type", "aria-label"],
        span: ["class"],
        h1: ["class", "id"],
        h2: ["class", "id"],
        h3: ["class", "id"],
      },
    };
  }

  /**
   * Get sanitization options for tab content
   */
  getTabSanitizationOptions() {
    return {
      allowedTags: ["ul", "li", "a", "div", "span"],
      allowedAttributes: {
        ul: ["class", "role"],
        li: ["class", "role", "data-tab-id"],
        a: [
          "href",
          "class",
          "data-tab-id",
          "role",
          "aria-selected",
          "aria-controls",
        ],
        div: ["class", "id", "role", "aria-labelledby"],
        span: ["class"],
      },
    };
  }
}

// Export as singleton
const securityRequired = new SecurityRequired();

// Make available globally for components
if (typeof window !== "undefined") {
  window.SecurityRequired = securityRequired;
}

// CommonJS export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = securityRequired;
}
