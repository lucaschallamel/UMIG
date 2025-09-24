/**
 * Logger.js - Production-Safe Logging Utility
 *
 * Centralizes all logging with environment-aware behavior.
 * In production, only errors are logged. In development, all levels are logged.
 *
 * @module Logger
 */

class Logger {
  constructor(module = "UMIG") {
    this.module = module;
    this.isDevelopment = this.detectEnvironment();
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    };
    this.currentLevel = this.isDevelopment
      ? this.logLevels.DEBUG
      : this.logLevels.ERROR;
  }

  /**
   * Detects if running in development environment
   * @returns {boolean} True if in development
   */
  detectEnvironment() {
    // Check various indicators of development environment
    if (typeof window !== "undefined") {
      // Browser environment checks
      const hostname = window.location?.hostname || "";
      const isDev =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.includes(".local") ||
        window.location?.port === "8090" || // Confluence dev port
        window.UMIG_DEBUG === true ||
        window.location?.search?.includes("debug=true");
      return isDev;
    }
    // Node.js environment (for testing)
    return process.env.NODE_ENV !== "production";
  }

  /**
   * Sets the logging level
   * @param {string} level - One of DEBUG, INFO, WARN, ERROR
   */
  setLevel(level) {
    if (this.logLevels[level] !== undefined) {
      this.currentLevel = this.logLevels[level];
    }
  }

  /**
   * Formats the log message with module and timestamp
   * @param {string} level - Log level
   * @param {Array} args - Arguments to log
   * @returns {Array} Formatted arguments
   */
  format(level, args) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.module}] [${level}]`;

    if (args.length > 0 && typeof args[0] === "string") {
      args[0] = `${prefix} ${args[0]}`;
    } else {
      args.unshift(prefix);
    }

    return args;
  }

  /**
   * Sanitizes sensitive data from logs
   * @param {Array} args - Arguments to sanitize
   * @returns {Array} Sanitized arguments
   */
  sanitize(args) {
    return args.map((arg) => {
      if (typeof arg === "string") {
        // Remove potential passwords, tokens, keys
        return arg
          .replace(
            /password["\s]*[:=]["\s]*["']?[^"',\s}]+["']?/gi,
            "password=***",
          )
          .replace(/token["\s]*[:=]["\s]*["']?[^"',\s}]+["']?/gi, "token=***")
          .replace(
            /api[_-]?key["\s]*[:=]["\s]*["']?[^"',\s}]+["']?/gi,
            "api_key=***",
          )
          .replace(/secret["\s]*[:=]["\s]*["']?[^"',\s}]+["']?/gi, "secret=***")
          .replace(
            /authorization["\s]*[:=]["\s]*["']?[^"',\s}]+["']?/gi,
            "authorization=***",
          );
      } else if (typeof arg === "object" && arg !== null) {
        // Clone and sanitize object
        try {
          const cloned = JSON.parse(JSON.stringify(arg));
          const sensitiveKeys = [
            "password",
            "token",
            "apiKey",
            "api_key",
            "secret",
            "authorization",
          ];

          const sanitizeObj = (obj) => {
            for (const key in obj) {
              if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
                obj[key] = "***";
              } else if (typeof obj[key] === "object" && obj[key] !== null) {
                sanitizeObj(obj[key]);
              }
            }
          };

          sanitizeObj(cloned);
          return cloned;
        } catch (e) {
          // If can't clone, return placeholder
          return "[Complex Object]";
        }
      }
      return arg;
    });
  }

  /**
   * Debug level logging (only in development)
   */
  debug(...args) {
    if (this.currentLevel <= this.logLevels.DEBUG) {
      const formatted = this.format("DEBUG", this.sanitize([...args]));
      console.log(...formatted);
    }
  }

  /**
   * Info level logging (only in development)
   */
  info(...args) {
    if (this.currentLevel <= this.logLevels.INFO) {
      const formatted = this.format("INFO", this.sanitize([...args]));
      console.info(...formatted);
    }
  }

  /**
   * Warning level logging
   */
  warn(...args) {
    if (this.currentLevel <= this.logLevels.WARN) {
      const formatted = this.format("WARN", this.sanitize([...args]));
      console.warn(...formatted);
    }
  }

  /**
   * Error level logging (always logged)
   */
  error(...args) {
    if (this.currentLevel <= this.logLevels.ERROR) {
      const formatted = this.format("ERROR", this.sanitize([...args]));
      console.error(...formatted);
    }
  }

  /**
   * Logs performance metrics (only in development)
   */
  performance(operation, duration) {
    if (this.isDevelopment) {
      this.debug(`Performance: ${operation} took ${duration}ms`);
    }
  }

  /**
   * Logs API calls (only in development)
   */
  api(method, url, data) {
    if (this.isDevelopment) {
      this.debug(`API ${method} ${url}`, data ? this.sanitize([data])[0] : "");
    }
  }

  /**
   * Creates a child logger with a specific module name
   * @param {string} subModule - Sub-module name
   * @returns {Logger} New logger instance
   */
  child(subModule) {
    return new Logger(`${this.module}:${subModule}`);
  }

  /**
   * Groups console output (only in development)
   */
  group(label) {
    if (this.isDevelopment && console.group) {
      console.group(`[${this.module}] ${label}`);
    }
  }

  /**
   * Ends console group (only in development)
   */
  groupEnd() {
    if (this.isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  }

  /**
   * Creates a table in console (only in development)
   */
  table(data) {
    if (this.isDevelopment && console.table) {
      console.table(data);
    }
  }

  /**
   * Assertion with logging (only in development)
   */
  assert(condition, message) {
    if (this.isDevelopment && !condition) {
      this.error(`Assertion failed: ${message}`);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Factory function for creating module-specific loggers
Logger.create = function (module) {
  return new Logger(module);
};

// Make available globally
if (typeof window !== "undefined") {
  window.Logger = Logger;
  window.logger = logger;
}

// CommonJS export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Logger, logger };
}
