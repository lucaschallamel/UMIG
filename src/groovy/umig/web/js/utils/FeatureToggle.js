/**
 * FeatureToggle.js - Feature flag management for US-087 Admin GUI Component Migration
 * Enables gradual rollout of new component-based architecture
 */

(function () {
  "use strict";

  class FeatureToggle {
    constructor() {
      // Feature flag configuration
      this.flags = {
        // Master toggle for entire admin GUI migration
        "admin-gui-migration": false,

        // Individual entity toggles for gradual rollout
        "teams-component": false,
        "users-component": false,
        "environments-component": false,
        "applications-component": false,
        "labels-component": false,
        "migration-types-component": false,
        "iteration-types-component": false,

        // Infrastructure features
        "performance-monitoring": true,
        "security-hardening": true,
        "relationship-caching": false,

        // Rollout percentages (for A/B testing if needed)
        "rollout-percentage": 0,
      };

      // Load overrides from localStorage if available
      this.loadOverrides();
    }

    /**
     * Check if a feature is enabled
     * @param {string} flag - Feature flag name
     * @returns {boolean} - Whether the feature is enabled
     */
    isEnabled(flag) {
      // Check for runtime overrides
      const override = this.getOverride(flag);
      if (override !== null) {
        return override;
      }

      // Check percentage-based rollout
      if (this.flags["rollout-percentage"] > 0) {
        return this.isInRolloutPercentage();
      }

      return this.flags[flag] || false;
    }

    /**
     * Enable a feature flag
     * @param {string} flag - Feature flag name
     */
    enable(flag) {
      this.flags[flag] = true;
      this.saveOverrides();
      console.log(`✅ Feature enabled: ${flag}`);
    }

    /**
     * Disable a feature flag
     * @param {string} flag - Feature flag name
     */
    disable(flag) {
      this.flags[flag] = false;
      this.saveOverrides();
      console.log(`🚫 Feature disabled: ${flag}`);
    }

    /**
     * Toggle a feature flag
     * @param {string} flag - Feature flag name
     */
    toggle(flag) {
      this.flags[flag] = !this.flags[flag];
      this.saveOverrides();
      console.log(
        `🔄 Feature toggled: ${flag} is now ${this.flags[flag] ? "enabled" : "disabled"}`,
      );
    }

    /**
     * Get all feature flags status
     * @returns {Object} - All feature flags and their states
     */
    getAllFlags() {
      return { ...this.flags };
    }

    /**
     * Set rollout percentage for gradual deployment
     * @param {number} percentage - Rollout percentage (0-100)
     */
    setRolloutPercentage(percentage) {
      if (percentage < 0 || percentage > 100) {
        console.error("Rollout percentage must be between 0 and 100");
        return;
      }
      this.flags["rollout-percentage"] = percentage;
      this.saveOverrides();
      console.log(`📊 Rollout percentage set to ${percentage}%`);
    }

    /**
     * Check if current user is in rollout percentage
     * @returns {boolean}
     */
    isInRolloutPercentage() {
      // Generate consistent hash for current user
      const userId = this.getCurrentUserId();
      const hash = this.hashCode(userId);
      const bucket = Math.abs(hash) % 100;
      return bucket < this.flags["rollout-percentage"];
    }

    /**
     * Get current user ID (for percentage-based rollout)
     * @returns {string}
     */
    getCurrentUserId() {
      // Try to get from various sources
      if (window.currentUser && window.currentUser.id) {
        return window.currentUser.id;
      }
      if (window.AJS && window.AJS.params && window.AJS.params.remoteUser) {
        return window.AJS.params.remoteUser;
      }
      // Fallback to session ID or random
      return sessionStorage.getItem("userId") || "anonymous";
    }

    /**
     * Simple hash function for consistent bucketing
     * @param {string} str - String to hash
     * @returns {number}
     */
    hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    }

    /**
     * Load feature flag overrides from localStorage with enhanced security validation
     */
    loadOverrides() {
      try {
        // Enhanced security: Validate localStorage data structure
        const schema = {
          type: "object",
          properties: {
            "admin-gui-migration": { type: "boolean", required: false },
            "teams-component": { type: "boolean", required: false },
            "users-component": { type: "boolean", required: false },
            "environments-component": { type: "boolean", required: false },
            "applications-component": { type: "boolean", required: false },
            "labels-component": { type: "boolean", required: false },
            "migration-types-component": { type: "boolean", required: false },
            "iteration-types-component": { type: "boolean", required: false },
            "performance-monitoring": { type: "boolean", required: false },
            "security-hardening": { type: "boolean", required: false },
            "relationship-caching": { type: "boolean", required: false },
            "rollout-percentage": { type: "number", required: false },
          },
        };

        // Use SecurityUtils for validation if available
        if (window.SecurityUtils) {
          const isValid = window.SecurityUtils.validateLocalStorageData(
            "umig-feature-toggles",
            schema,
          );
          if (!isValid) {
            console.warn(
              "[Security] Invalid feature toggle data in localStorage, using defaults",
            );
            return;
          }
        }

        const stored = localStorage.getItem("umig-feature-toggles");
        if (stored) {
          // Parse and validate stored data
          const overrides = JSON.parse(stored);

          // Enhanced validation
          if (
            overrides &&
            typeof overrides === "object" &&
            !Array.isArray(overrides)
          ) {
            // Validate each property
            const validatedOverrides = {};

            for (const [key, value] of Object.entries(overrides)) {
              // Only allow known feature flags
              if (key in this.flags) {
                // Type validation
                const expectedType = typeof this.flags[key];
                if (typeof value === expectedType) {
                  // Range validation for rollout percentage
                  if (key === "rollout-percentage") {
                    if (value >= 0 && value <= 100) {
                      validatedOverrides[key] = value;
                    } else {
                      console.warn(
                        `[Security] Invalid rollout percentage: ${value}, using default`,
                      );
                    }
                  } else {
                    validatedOverrides[key] = value;
                  }
                } else {
                  console.warn(
                    `[Security] Invalid type for feature flag ${key}, expected ${expectedType}, got ${typeof value}`,
                  );
                }
              } else {
                console.warn(
                  `[Security] Unknown feature flag: ${key}, ignoring`,
                );
              }
            }

            // Apply validated overrides
            Object.assign(this.flags, validatedOverrides);
            console.log(
              "📂 Feature toggle overrides loaded and validated from localStorage",
            );

            // Log security event
            if (window.SecurityUtils) {
              window.SecurityUtils.logSecurityEvent("feature_toggles_loaded", {
                validatedCount: Object.keys(validatedOverrides).length,
                totalCount: Object.keys(overrides).length,
              });
            }
          } else {
            console.warn(
              "[Security] Invalid feature toggle overrides format, removing corrupted data",
            );
            localStorage.removeItem("umig-feature-toggles");
          }
        }
      } catch (e) {
        console.warn("[Security] Failed to load feature toggle overrides:", e);
        // Remove potentially corrupted data
        try {
          localStorage.removeItem("umig-feature-toggles");
        } catch (removeError) {
          console.warn(
            "[Security] Failed to remove corrupted feature toggle data:",
            removeError,
          );
        }

        // Log security event
        if (window.SecurityUtils) {
          window.SecurityUtils.logSecurityEvent("feature_toggles_load_error", {
            error: e.message,
          });
        }
      }
    }

    /**
     * Save current feature flags to localStorage with validation
     */
    saveOverrides() {
      try {
        // Validate data before saving
        const dataToSave = {};

        for (const [key, value] of Object.entries(this.flags)) {
          // Type validation
          if (
            typeof value === "boolean" ||
            (key === "rollout-percentage" && typeof value === "number")
          ) {
            // Range validation for rollout percentage
            if (key === "rollout-percentage") {
              if (value >= 0 && value <= 100) {
                dataToSave[key] = value;
              } else {
                console.warn(
                  `[Security] Invalid rollout percentage ${value}, not saving`,
                );
                dataToSave[key] = 0; // Safe default
              }
            } else {
              dataToSave[key] = value;
            }
          } else {
            console.warn(
              `[Security] Invalid value type for ${key}: ${typeof value}`,
            );
          }
        }

        // Save validated data
        localStorage.setItem(
          "umig-feature-toggles",
          JSON.stringify(dataToSave),
        );

        // Log security event
        if (window.SecurityUtils) {
          window.SecurityUtils.logSecurityEvent("feature_toggles_saved", {
            flagCount: Object.keys(dataToSave).length,
          });
        }
      } catch (e) {
        console.warn("[Security] Failed to save feature toggle overrides:", e);

        // Log security event
        if (window.SecurityUtils) {
          window.SecurityUtils.logSecurityEvent("feature_toggles_save_error", {
            error: e.message,
          });
        }
      }
    }

    /**
     * Get override value from URL parameters
     * @param {string} flag - Feature flag name
     * @returns {boolean|null}
     */
    getOverride(flag) {
      // Check URL parameters for overrides
      const urlParams = new URLSearchParams(window.location.search);
      const override = urlParams.get(`feature-${flag}`);
      if (override !== null) {
        return override === "true" || override === "1";
      }
      return null;
    }

    /**
     * Emergency rollback - disable all migration features
     */
    emergencyRollback() {
      console.warn("🚨 EMERGENCY ROLLBACK INITIATED");
      console.log(
        "[Security] Emergency rollback triggered at",
        new Date().toISOString(),
      );

      // Disable all migration-related features
      this.flags["admin-gui-migration"] = false;
      this.flags["teams-component"] = false;
      this.flags["users-component"] = false;
      this.flags["environments-component"] = false;
      this.flags["applications-component"] = false;
      this.flags["labels-component"] = false;
      this.flags["migration-types-component"] = false;
      this.flags["iteration-types-component"] = false;
      this.flags["relationship-caching"] = false;
      this.flags["rollout-percentage"] = 0;

      // Keep monitoring active for debugging
      this.flags["performance-monitoring"] = true;

      // Save state
      this.saveOverrides();

      // Clear any cached data
      if (window.ComponentOrchestrator) {
        window.ComponentOrchestrator.clearAllCaches();
      }

      // Reload the page to ensure clean state
      setTimeout(() => {
        console.log("🔄 Reloading page after rollback...");
        window.location.reload();
      }, 1000);
    }

    /**
     * Status report for monitoring
     * @returns {Object}
     */
    getStatusReport() {
      const enabledCount = Object.values(this.flags).filter(
        (v) => v === true,
      ).length;
      const totalCount = Object.keys(this.flags).length;

      return {
        timestamp: new Date().toISOString(),
        enabledFeatures: enabledCount,
        totalFeatures: totalCount,
        migrationStatus: this.flags["admin-gui-migration"]
          ? "active"
          : "inactive",
        rolloutPercentage: this.flags["rollout-percentage"],
        flags: this.getAllFlags(),
      };
    }
  }

  // Create singleton instance
  window.FeatureToggle = window.FeatureToggle || new FeatureToggle();

  // Export for module systems if available
  if (typeof module !== "undefined" && module.exports) {
    module.exports = FeatureToggle;
  }
})();
