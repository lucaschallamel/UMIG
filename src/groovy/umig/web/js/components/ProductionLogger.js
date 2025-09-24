/**
 * ProductionLogger - Safe Logging Utility for Production Environment
 * US-082-B Component Architecture - Security Enhancement Phase
 *
 * Provides a wrapper around console logging that is production-safe
 * and can be configured for different environments.
 *
 * Features:
 * - Environment-aware logging (dev/staging/production)
 * - Log level filtering (ERROR, WARN, INFO, DEBUG)
 * - Security-sensitive log sanitization
 * - Performance monitoring integration
 * - Centralized log configuration
 *
 * @version 1.0.0 (Production Security Implementation)
 */

// Prevent duplicate declarations
if (typeof ProductionLogger === "undefined") {
  class ProductionLogger {
    constructor() {
      // Environment detection
      this.environment = this.detectEnvironment();

      // Log level configuration
      this.logLevels = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3,
      };

      // Current log level based on environment
      this.currentLogLevel = this.getLogLevelForEnvironment();

      // Sensitive data patterns to filter
      this.sensitivePatterns = [
        /password/i,
        /token/i,
        /secret/i,
        /key/i,
        /auth/i,
        /session/i,
        /csrf/i,
        /bearer/i,
      ];
    }

    /**
     * Detect current environment
     */
    detectEnvironment() {
      // Check for common production indicators
      if (typeof window !== "undefined") {
        const hostname = window.location?.hostname || "";
        const protocol = window.location?.protocol || "";

        // Production patterns
        if (
          hostname.includes("confluence.") ||
          hostname.includes("atlassian.") ||
          (protocol === "https:" && !hostname.includes("localhost"))
        ) {
          return "production";
        }

        // Development patterns
        if (
          hostname.includes("localhost") ||
          hostname.includes("127.0.0.1") ||
          hostname.includes("dev.") ||
          hostname.includes("staging.")
        ) {
          return "development";
        }
      }

      // Default to production for safety
      return "production";
    }

    /**
     * Get appropriate log level for environment
     */
    getLogLevelForEnvironment() {
      switch (this.environment) {
        case "development":
          return this.logLevels.DEBUG;
        case "staging":
          return this.logLevels.INFO;
        case "production":
        default:
          return this.logLevels.WARN;
      }
    }

    /**
     * Sanitize log message to remove sensitive data
     */
    sanitizeMessage(message) {
      if (typeof message !== "string") {
        return message;
      }

      let sanitized = message;

      // Remove sensitive patterns
      this.sensitivePatterns.forEach((pattern) => {
        sanitized = sanitized.replace(pattern, "[REDACTED]");
      });

      return sanitized;
    }

    /**
     * Check if logging is enabled for given level
     */
    shouldLog(level) {
      return level <= this.currentLogLevel;
    }

    /**
     * Format log entry with timestamp and context
     */
    formatLogEntry(level, component, message, ...args) {
      const timestamp = new Date().toISOString();
      const levelName = Object.keys(this.logLevels)[level];
      const prefix = `[${timestamp}] [${levelName}] [${component}]`;

      return {
        prefix,
        message: this.sanitizeMessage(String(message)),
        args: args.map((arg) =>
          typeof arg === "string" ? this.sanitizeMessage(arg) : arg,
        ),
      };
    }

    /**
     * Error logging - always enabled
     */
    error(component, message, ...args) {
      if (this.shouldLog(this.logLevels.ERROR)) {
        const entry = this.formatLogEntry(
          this.logLevels.ERROR,
          component,
          message,
          ...args,
        );
        console.error(entry.prefix, entry.message, ...entry.args);
      }
    }

    /**
     * Warning logging - enabled in staging and production
     */
    warn(component, message, ...args) {
      if (this.shouldLog(this.logLevels.WARN)) {
        const entry = this.formatLogEntry(
          this.logLevels.WARN,
          component,
          message,
          ...args,
        );
        console.warn(entry.prefix, entry.message, ...entry.args);
      }
    }

    /**
     * Info logging - disabled in production
     */
    info(component, message, ...args) {
      if (this.shouldLog(this.logLevels.INFO)) {
        const entry = this.formatLogEntry(
          this.logLevels.INFO,
          component,
          message,
          ...args,
        );
        console.info(entry.prefix, entry.message, ...entry.args);
      }
    }

    /**
     * Debug logging - only in development
     */
    debug(component, message, ...args) {
      if (this.shouldLog(this.logLevels.DEBUG)) {
        const entry = this.formatLogEntry(
          this.logLevels.DEBUG,
          component,
          message,
          ...args,
        );
        console.log(entry.prefix, entry.message, ...entry.args);
      }
    }

    /**
     * Security-specific logging - always enabled but sanitized
     */
    security(component, event, details = {}) {
      // Security events always logged but heavily sanitized
      const sanitizedDetails = {};
      Object.keys(details).forEach((key) => {
        sanitizedDetails[key] = this.sanitizeMessage(String(details[key]));
      });

      const entry = this.formatLogEntry(
        this.logLevels.WARN,
        component,
        `Security Event: ${event}`,
        sanitizedDetails,
      );
      console.warn(entry.prefix, entry.message, ...entry.args);
    }

    /**
     * Performance logging - environment aware
     */
    performance(component, metric, value) {
      if (this.shouldLog(this.logLevels.INFO)) {
        const entry = this.formatLogEntry(
          this.logLevels.INFO,
          component,
          `Performance: ${metric}`,
          `${value}ms`,
        );
        console.log(entry.prefix, entry.message, ...entry.args);
      }
    }

    /**
     * Get current configuration
     */
    getConfig() {
      return {
        environment: this.environment,
        currentLogLevel: Object.keys(this.logLevels)[this.currentLogLevel],
        logLevels: this.logLevels,
      };
    }
  }

  // Create singleton instance
  const logger = new ProductionLogger();

  // Export to window for global access
  window.ProductionLogger = logger;

  // Also provide direct methods for convenience
  window.logError = (component, message, ...args) =>
    logger.error(component, message, ...args);
  window.logWarn = (component, message, ...args) =>
    logger.warn(component, message, ...args);
  window.logInfo = (component, message, ...args) =>
    logger.info(component, message, ...args);
  window.logDebug = (component, message, ...args) =>
    logger.debug(component, message, ...args);
  window.logSecurity = (component, event, details) =>
    logger.security(component, event, details);
  window.logPerformance = (component, metric, value) =>
    logger.performance(component, metric, value);

  // Backwards compatibility - replace console.log with debug logging
  if (typeof window.originalConsoleLog === "undefined") {
    window.originalConsoleLog = console.log;
    console.log = (...args) => {
      // In production, convert console.log to debug level (which is filtered)
      logger.debug("Console", ...args);
    };
  }
}

// Export class for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = ProductionLogger;
}
