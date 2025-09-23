/**
 * EmailUtils.js - Utility for rendering email addresses as interactive mailto: links
 *
 * Provides secure email link formatting with XSS protection and accessibility support.
 * Integrates with SecurityUtils for comprehensive security validation.
 *
 * @class EmailUtils
 * @version 1.0.0
 * @since 2024-09-21
 */
class EmailUtils {
  /**
   * Email validation regex pattern
   * Matches standard email formats according to RFC 5322
   */
  static EMAIL_REGEX =
    /\b[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\b/g;

  /**
   * Convert email addresses in text to secure mailto: links
   * @param {string} text - Text that may contain email addresses
   * @param {Object} options - Link configuration options
   * @param {string} options.linkClass - CSS class for the link (default: 'umig-email-link')
   * @param {string} options.target - Target attribute for link (default: null for same window)
   * @param {boolean} options.addTitle - Whether to add title attribute (default: true)
   * @param {boolean} options.addIcon - Whether to add email icon (default: false)
   * @returns {string} HTML with mailto: links
   */
  static formatEmailLinks(text, options = {}) {
    if (!text || typeof text !== "string") {
      return text || "";
    }

    const config = {
      linkClass: "umig-email-link",
      target: null, // Same window by default for mailto:
      addTitle: true,
      addIcon: false,
      ...options,
    };

    // First sanitize the input if SecurityUtils is available
    const sanitizedText = window.SecurityUtils
      ? window.SecurityUtils.sanitizeXSS(text, { allowHTML: false })
      : this.escapeHtml(text);

    // Replace email addresses with mailto: links
    return sanitizedText.replace(EmailUtils.EMAIL_REGEX, (email) => {
      // Additional validation using SecurityUtils if available
      if (window.SecurityUtils) {
        const validation = window.SecurityUtils.validateInput(email, "email");
        if (!validation.isValid) {
          return email; // Return as plain text if invalid
        }
      }

      // Create secure mailto: link
      const href = this.createSecureMailtoHref(email);
      const title = config.addTitle
        ? ` title="Send email to ${this.escapeHtml(email)}"`
        : "";
      const target = config.target
        ? ` target="${config.target}" rel="noopener noreferrer"`
        : "";
      const className = config.linkClass ? ` class="${config.linkClass}"` : "";
      const ariaLabel = ` aria-label="Send email to ${this.escapeHtml(email)}"`;

      // Optional email icon (using AUI icon if available)
      const icon = config.addIcon
        ? '<span class="aui-icon aui-icon-small aui-iconfont-email" style="margin-right: 4px;"></span>'
        : "";

      return `<a href="${href}"${title}${target}${className}${ariaLabel}>${icon}${this.escapeHtml(email)}</a>`;
    });
  }

  /**
   * Format a single email address as a mailto: link
   * @param {string} email - Email address to format
   * @param {Object} options - Link configuration options
   * @returns {string} HTML mailto: link or plain text if invalid
   */
  static formatSingleEmail(email, options = {}) {
    if (!email || typeof email !== "string") {
      return email || "";
    }

    // Trim whitespace
    email = email.trim();

    // Validate email format
    if (!this.isValidEmail(email)) {
      return this.escapeHtml(email);
    }

    // Apply formatting
    return this.formatEmailLinks(email, options);
  }

  /**
   * Check if a string is a valid email address
   * @param {string} email - String to validate
   * @returns {boolean} True if valid email format
   */
  static isValidEmail(email) {
    if (!email || typeof email !== "string") {
      return false;
    }

    // Use SecurityUtils validation if available
    if (window.SecurityUtils) {
      const validation = window.SecurityUtils.validateInput(email, "email");
      return validation.isValid;
    }

    // Fallback to regex validation
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }

  /**
   * Create a secure mailto: href value
   * @param {string} email - Email address
   * @returns {string} Secure mailto: URL
   */
  static createSecureMailtoHref(email) {
    // For mailto: links, the protocol must NOT be encoded
    // Only the email address itself needs minimal encoding
    // We don't use encodeURIComponent as it over-encodes for mailto: links
    // The @ symbol and dots should remain unencoded for mailto: to work
    const safeEmail = email
      .replace(/[<>"']/g, "") // Remove dangerous characters
      .replace(/\s/g, ""); // Remove spaces

    return `mailto:${safeEmail}`;
  }

  /**
   * Escape HTML special characters
   * Fallback method when SecurityUtils is not available
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  static escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Extract all email addresses from text
   * @param {string} text - Text to search
   * @returns {Array<string>} Array of email addresses found
   */
  static extractEmails(text) {
    if (!text || typeof text !== "string") {
      return [];
    }

    const emails = text.match(EmailUtils.EMAIL_REGEX) || [];
    return [...new Set(emails)]; // Remove duplicates
  }

  /**
   * Format multiple emails with separators
   * @param {Array<string>|string} emails - Array of emails or comma-separated string
   * @param {Object} options - Link configuration options
   * @param {string} options.separator - Separator between emails (default: ', ')
   * @returns {string} HTML with formatted email links
   */
  static formatMultipleEmails(emails, options = {}) {
    const config = {
      separator: ", ",
      ...options,
    };

    // Convert string to array if needed
    if (typeof emails === "string") {
      emails = emails.split(/[,;]\s*/).filter((e) => e.trim());
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      return "";
    }

    // Format each email and join with separator
    return emails
      .map((email) => this.formatSingleEmail(email.trim(), options))
      .join(config.separator);
  }

  /**
   * Create a mailto: link with subject and body
   * @param {string} email - Email address
   * @param {Object} params - Email parameters
   * @param {string} params.subject - Email subject
   * @param {string} params.body - Email body
   * @param {string} params.cc - CC recipients
   * @param {string} params.bcc - BCC recipients
   * @param {Object} options - Link configuration options
   * @returns {string} HTML mailto: link with parameters
   */
  static createEmailLink(email, params = {}, options = {}) {
    if (!this.isValidEmail(email)) {
      return this.escapeHtml(email);
    }

    // Build mailto: URL with parameters
    const urlParams = new URLSearchParams();
    if (params.subject) urlParams.append("subject", params.subject);
    if (params.body) urlParams.append("body", params.body);
    if (params.cc) urlParams.append("cc", params.cc);
    if (params.bcc) urlParams.append("bcc", params.bcc);

    const queryString = urlParams.toString();

    // For mailto: links, don't encode the email address itself
    // The @ and dots need to remain unencoded
    const safeEmail = email
      .replace(/[<>"']/g, "") // Remove dangerous characters
      .replace(/\s/g, ""); // Remove spaces

    const href = `mailto:${safeEmail}${queryString ? "?" + queryString : ""}`;

    // Don't use SecurityUtils.sanitizeForURL as it would encode the mailto: protocol
    const secureHref = href;

    const config = {
      linkClass: "umig-email-link",
      addTitle: true,
      ...options,
    };

    const className = config.linkClass ? ` class="${config.linkClass}"` : "";
    const title = config.addTitle
      ? ` title="Send email to ${this.escapeHtml(email)}"`
      : "";
    const ariaLabel = ` aria-label="Send email to ${this.escapeHtml(email)}"`;

    return `<a href="${secureHref}"${className}${title}${ariaLabel}>${this.escapeHtml(email)}</a>`;
  }
}

// Attach to window for global access
if (typeof window !== "undefined") {
  window.EmailUtils = EmailUtils;
}

// Export for module systems (if applicable)
if (typeof module !== "undefined" && module.exports) {
  module.exports = EmailUtils;
}
