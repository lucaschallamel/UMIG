/**
 * CSPManager - Content Security Policy Management System
 * US-082-B Component Architecture - Security Enhancement Phase
 *
 * Provides comprehensive CSP management for the UMIG application
 * Implements strict security policies with development/production modes
 * Supports nonce-based script execution and dynamic policy updates
 *
 * Features:
 * - Environment-aware CSP policies (development vs production)
 * - Nonce-based script execution for inline scripts
 * - Dynamic policy injection via meta tags
 * - Strict default policies with trusted source allowlists
 * - Support for component-specific CSP requirements
 * - Violation reporting and monitoring
 */

class CSPManager {
  constructor(config = {}) {
    // Configuration
    this.config = {
      environment: "production", // 'development' or 'production'
      enableNonces: true,
      enableReporting: true,
      reportingEndpoint: "/api/csp-report",
      strictMode: true,
      ...config,
    };

    // Nonce management
    this.currentNonce = null;
    this.nonceRefreshInterval = 5 * 60 * 1000; // 5 minutes
    this.nonceTimer = null;

    // Violation tracking
    this.violations = [];
    this.maxViolations = 100;

    // Initialize
    this.initialize();
  }

  /**
   * Initialize CSP Manager
   */
  initialize() {
    // Generate initial nonce if enabled
    if (this.config.enableNonces) {
      this.generateNonce();
      this.startNonceRefresh();
    }

    // Setup violation reporting
    if (this.config.enableReporting) {
      this.setupViolationReporting();
    }

    // Apply initial CSP policies
    this.applyCSPPolicies();

    console.info(
      "[CSPManager] Initialized with environment:",
      this.config.environment,
    );
  }

  /**
   * Generate cryptographically secure nonce
   */
  generateNonce() {
    try {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      this.currentNonce = btoa(String.fromCharCode(...array))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      console.debug("[CSPManager] Generated new nonce:", this.currentNonce);
      return this.currentNonce;
    } catch (error) {
      console.error("[CSPManager] Failed to generate secure nonce:", error);
      // Fallback to timestamp-based nonce (less secure but functional)
      this.currentNonce = `fallback-${Date.now()}-${Math.random().toString(36)}`;
      return this.currentNonce;
    }
  }

  /**
   * Get current nonce
   */
  getCurrentNonce() {
    return this.currentNonce;
  }

  /**
   * Start automatic nonce refresh
   */
  startNonceRefresh() {
    if (this.nonceTimer) {
      clearInterval(this.nonceTimer);
    }

    this.nonceTimer = setInterval(() => {
      this.generateNonce();
      this.updateCSPNonce();
    }, this.nonceRefreshInterval);
  }

  /**
   * Stop nonce refresh
   */
  stopNonceRefresh() {
    if (this.nonceTimer) {
      clearInterval(this.nonceTimer);
      this.nonceTimer = null;
    }
  }

  /**
   * Get CSP policies based on environment
   */
  getCSPPolicies() {
    const baseDirectives = {
      "default-src": ["'self'"],
      "script-src": this.getScriptSources(),
      "style-src": this.getStyleSources(),
      "img-src": this.getImageSources(),
      "font-src": this.getFontSources(),
      "connect-src": this.getConnectSources(),
      "media-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "upgrade-insecure-requests": null, // No value directive
    };

    // Add reporting directive if enabled
    if (this.config.enableReporting) {
      baseDirectives["report-uri"] = [this.config.reportingEndpoint];
      baseDirectives["report-to"] = ["csp-endpoint"];
    }

    return baseDirectives;
  }

  /**
   * Get script sources based on environment and configuration
   */
  getScriptSources() {
    const sources = ["'self'"];

    // Add nonce support if enabled
    if (this.config.enableNonces && this.currentNonce) {
      sources.push(`'nonce-${this.currentNonce}'`);
    }

    if (this.config.environment === "development") {
      // Development environment - more permissive
      sources.push(
        "'unsafe-inline'", // Allow inline scripts in dev
        "'unsafe-eval'", // Allow eval() in dev (for hot reloading, etc.)
        "localhost:*",
        "127.0.0.1:*",
        "*.local",
      );
    } else {
      // Production environment - strict
      if (this.config.strictMode) {
        // Only nonce-based inline scripts allowed
        // No unsafe-inline or unsafe-eval
      } else {
        // Moderate production - allow some inline with hashes
        sources.push("'unsafe-inline'");
      }
    }

    // Add trusted CDN sources
    sources.push(
      "https://cdn.jsdelivr.net",
      "https://unpkg.com",
      "https://cdnjs.cloudflare.com",
    );

    return sources;
  }

  /**
   * Get style sources
   */
  getStyleSources() {
    const sources = ["'self'"];

    // Add nonce support if enabled
    if (this.config.enableNonces && this.currentNonce) {
      sources.push(`'nonce-${this.currentNonce}'`);
    }

    // Styles often need unsafe-inline for component styling
    sources.push("'unsafe-inline'");

    if (this.config.environment === "development") {
      sources.push("localhost:*", "127.0.0.1:*", "*.local");
    }

    // Add trusted style CDNs
    sources.push(
      "https://fonts.googleapis.com",
      "https://cdn.jsdelivr.net",
      "https://unpkg.com",
      "https://cdnjs.cloudflare.com",
    );

    return sources;
  }

  /**
   * Get image sources
   */
  getImageSources() {
    const sources = ["'self'", "data:", "blob:"];

    if (this.config.environment === "development") {
      sources.push("localhost:*", "127.0.0.1:*", "*.local");
    }

    // Add common image CDNs
    sources.push("https://images.unsplash.com", "https://via.placeholder.com");

    return sources;
  }

  /**
   * Get font sources
   */
  getFontSources() {
    const sources = ["'self'", "data:"];

    if (this.config.environment === "development") {
      sources.push("localhost:*", "127.0.0.1:*", "*.local");
    }

    // Add font CDNs
    sources.push("https://fonts.googleapis.com", "https://fonts.gstatic.com");

    return sources;
  }

  /**
   * Get connect sources (for AJAX, WebSocket, etc.)
   */
  getConnectSources() {
    const sources = ["'self'"];

    if (this.config.environment === "development") {
      sources.push(
        "localhost:*",
        "127.0.0.1:*",
        "*.local",
        "ws://localhost:*",
        "ws://127.0.0.1:*",
      );
    }

    // Add API endpoints
    if (typeof window !== "undefined" && window.location) {
      const origin = window.location.origin;
      sources.push(origin);
    }

    return sources;
  }

  /**
   * Generate CSP header value
   */
  generateCSPHeader() {
    const policies = this.getCSPPolicies();
    const directives = [];

    for (const [directive, sources] of Object.entries(policies)) {
      if (sources === null) {
        // Directive without value (like upgrade-insecure-requests)
        directives.push(directive);
      } else if (Array.isArray(sources) && sources.length > 0) {
        directives.push(`${directive} ${sources.join(" ")}`);
      }
    }

    return directives.join("; ");
  }

  /**
   * Apply CSP policies via meta tag
   */
  applyCSPPolicies() {
    if (typeof document === "undefined") {
      console.warn("[CSPManager] Cannot apply CSP in non-browser environment");
      return;
    }

    // Remove existing CSP meta tag
    const existingMeta = document.querySelector(
      'meta[http-equiv="Content-Security-Policy"]',
    );
    if (existingMeta) {
      existingMeta.remove();
    }

    // Create new CSP meta tag
    const metaTag = document.createElement("meta");
    metaTag.setAttribute("http-equiv", "Content-Security-Policy");
    metaTag.setAttribute("content", this.generateCSPHeader());

    // Insert at beginning of head
    const head = document.getElementsByTagName("head")[0];
    if (head) {
      head.insertBefore(metaTag, head.firstChild);
      console.info("[CSPManager] CSP policies applied via meta tag");
    }

    // Setup Report-To header simulation via meta tag
    if (this.config.enableReporting) {
      this.setupReportToHeader();
    }
  }

  /**
   * Setup Report-To header simulation
   */
  setupReportToHeader() {
    const reportToConfig = {
      group: "csp-endpoint",
      max_age: 86400, // 24 hours
      endpoints: [{ url: this.config.reportingEndpoint }],
    };

    // Store configuration for use by violation handler
    this.reportToConfig = reportToConfig;
    console.debug("[CSPManager] Report-To configuration prepared");
  }

  /**
   * Update CSP with new nonce
   */
  updateCSPNonce() {
    this.applyCSPPolicies();

    // Emit nonce update event for components to refresh
    if (typeof window !== "undefined" && window.CustomEvent) {
      const event = new CustomEvent("csp:nonceUpdated", {
        detail: { nonce: this.currentNonce },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Setup CSP violation reporting
   */
  setupViolationReporting() {
    if (typeof document === "undefined") return;

    // Listen for CSP violations
    document.addEventListener("securitypolicyviolation", (event) => {
      this.handleViolation(event);
    });

    console.info("[CSPManager] CSP violation reporting enabled");
  }

  /**
   * Handle CSP violation
   */
  handleViolation(event) {
    const violation = {
      timestamp: Date.now(),
      blockedURI: event.blockedURI,
      columnNumber: event.columnNumber,
      disposition: event.disposition,
      documentURI: event.documentURI,
      effectiveDirective: event.effectiveDirective,
      lineNumber: event.lineNumber,
      originalPolicy: event.originalPolicy,
      referrer: event.referrer,
      sample: event.sample,
      sourceFile: event.sourceFile,
      statusCode: event.statusCode,
      violatedDirective: event.violatedDirective,
    };

    // Add to violations list
    this.violations.push(violation);

    // Maintain maximum violations limit
    if (this.violations.length > this.maxViolations) {
      this.violations.shift();
    }

    // Log violation
    console.warn("[CSPManager] CSP Violation detected:", violation);

    // Report violation to endpoint
    if (this.config.enableReporting) {
      this.reportViolation(violation);
    }

    // Emit violation event for monitoring
    if (typeof window !== "undefined" && window.CustomEvent) {
      const event = new CustomEvent("csp:violation", {
        detail: violation,
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Report violation to endpoint
   */
  async reportViolation(violation) {
    try {
      await fetch(this.config.reportingEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "csp-report": violation,
        }),
      });
    } catch (error) {
      console.error("[CSPManager] Failed to report CSP violation:", error);
    }
  }

  /**
   * Create script element with nonce
   */
  createNoncedScript(content, type = "text/javascript") {
    if (typeof document === "undefined") {
      throw new Error(
        "Cannot create script element in non-browser environment",
      );
    }

    const script = document.createElement("script");
    script.type = type;

    if (this.config.enableNonces && this.currentNonce) {
      script.nonce = this.currentNonce;
    }

    if (content) {
      script.textContent = content;
    }

    return script;
  }

  /**
   * Create style element with nonce
   */
  createNoncedStyle(content) {
    if (typeof document === "undefined") {
      throw new Error("Cannot create style element in non-browser environment");
    }

    const style = document.createElement("style");

    if (this.config.enableNonces && this.currentNonce) {
      style.nonce = this.currentNonce;
    }

    if (content) {
      style.textContent = content;
    }

    return style;
  }

  /**
   * Execute script with nonce
   */
  executeNoncedScript(scriptContent, callback) {
    try {
      const script = this.createNoncedScript(scriptContent);

      if (callback) {
        script.onload = callback;
        script.onerror = (error) => {
          console.error("[CSPManager] Script execution error:", error);
          if (typeof callback === "function") {
            callback(error);
          }
        };
      }

      // Execute by appending to head
      const head = document.getElementsByTagName("head")[0];
      if (head) {
        head.appendChild(script);
        // Remove script after execution to keep DOM clean
        setTimeout(() => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        }, 100);
      }
    } catch (error) {
      console.error("[CSPManager] Failed to execute nonced script:", error);
      if (callback) {
        callback(error);
      }
    }
  }

  /**
   * Get violations
   */
  getViolations(limit = 10) {
    return this.violations.slice(-limit);
  }

  /**
   * Clear violations
   */
  clearViolations() {
    this.violations = [];
  }

  /**
   * Get CSP status
   */
  getStatus() {
    return {
      environment: this.config.environment,
      enableNonces: this.config.enableNonces,
      currentNonce: this.currentNonce,
      enableReporting: this.config.enableReporting,
      strictMode: this.config.strictMode,
      violationCount: this.violations.length,
      lastViolation:
        this.violations.length > 0
          ? this.violations[this.violations.length - 1]
          : null,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };

    // Re-initialize with new config
    this.applyCSPPolicies();

    if (this.config.enableNonces && !this.nonceTimer) {
      this.generateNonce();
      this.startNonceRefresh();
    } else if (!this.config.enableNonces && this.nonceTimer) {
      this.stopNonceRefresh();
    }

    console.info("[CSPManager] Configuration updated:", this.config);
  }

  /**
   * Destroy CSP Manager
   */
  destroy() {
    this.stopNonceRefresh();
    this.violations = [];

    // Remove CSP meta tag
    if (typeof document !== "undefined") {
      const existingMeta = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      if (existingMeta) {
        existingMeta.remove();
      }
    }

    console.info("[CSPManager] Destroyed");
  }
}

// Export for use in other components
if (typeof module !== "undefined" && module.exports) {
  module.exports = CSPManager;
}

// Make available globally for browser usage
if (typeof window !== "undefined") {
  window.CSPManager = CSPManager;
}
