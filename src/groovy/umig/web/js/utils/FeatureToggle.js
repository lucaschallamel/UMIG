/**
 * FeatureToggle.js - Feature flag management for US-087 Admin GUI Component Migration
 * Enables gradual rollout of new component-based architecture
 */

(function() {
    'use strict';

    class FeatureToggle {
        constructor() {
            // Feature flag configuration
            this.flags = {
                // Master toggle for entire admin GUI migration
                'admin-gui-migration': false,

                // Individual entity toggles for gradual rollout
                'teams-component': false,
                'users-component': false,
                'environments-component': false,
                'applications-component': false,
                'labels-component': false,
                'migration-types-component': false,
                'iteration-types-component': false,

                // Infrastructure features
                'performance-monitoring': true,
                'security-hardening': true,
                'relationship-caching': false,

                // Rollout percentages (for A/B testing if needed)
                'rollout-percentage': 0
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
            if (this.flags['rollout-percentage'] > 0) {
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
            console.log(`🔄 Feature toggled: ${flag} is now ${this.flags[flag] ? 'enabled' : 'disabled'}`);
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
                console.error('Rollout percentage must be between 0 and 100');
                return;
            }
            this.flags['rollout-percentage'] = percentage;
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
            return bucket < this.flags['rollout-percentage'];
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
            return sessionStorage.getItem('userId') || 'anonymous';
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
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        }

        /**
         * Load feature flag overrides from localStorage
         */
        loadOverrides() {
            try {
                // Security: Safe localStorage usage with validation
                const stored = localStorage.getItem('umig-feature-toggles');
                if (stored) {
                    // Parse and validate stored data
                    const overrides = JSON.parse(stored);
                    // Ensure overrides is an object before applying
                    if (overrides && typeof overrides === 'object') {
                        Object.assign(this.flags, overrides);
                        console.log('📂 Feature toggle overrides loaded from localStorage');
                    } else {
                        console.warn('Invalid feature toggle overrides format');
                    }
                }
            } catch (e) {
                console.warn('Failed to load feature toggle overrides:', e);
            }
        }

        /**
         * Save current feature flags to localStorage
         */
        saveOverrides() {
            try {
                localStorage.setItem('umig-feature-toggles', JSON.stringify(this.flags));
            } catch (e) {
                console.warn('Failed to save feature toggle overrides:', e);
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
                return override === 'true' || override === '1';
            }
            return null;
        }

        /**
         * Emergency rollback - disable all migration features
         */
        emergencyRollback() {
            console.warn('🚨 EMERGENCY ROLLBACK INITIATED');
            console.log('[Security] Emergency rollback triggered at', new Date().toISOString());

            // Disable all migration-related features
            this.flags['admin-gui-migration'] = false;
            this.flags['teams-component'] = false;
            this.flags['users-component'] = false;
            this.flags['environments-component'] = false;
            this.flags['applications-component'] = false;
            this.flags['labels-component'] = false;
            this.flags['migration-types-component'] = false;
            this.flags['iteration-types-component'] = false;
            this.flags['relationship-caching'] = false;
            this.flags['rollout-percentage'] = 0;

            // Keep monitoring active for debugging
            this.flags['performance-monitoring'] = true;

            // Save state
            this.saveOverrides();

            // Clear any cached data
            if (window.ComponentOrchestrator) {
                window.ComponentOrchestrator.clearAllCaches();
            }

            // Reload the page to ensure clean state
            setTimeout(() => {
                console.log('🔄 Reloading page after rollback...');
                window.location.reload();
            }, 1000);
        }

        /**
         * Status report for monitoring
         * @returns {Object}
         */
        getStatusReport() {
            const enabledCount = Object.values(this.flags).filter(v => v === true).length;
            const totalCount = Object.keys(this.flags).length;

            return {
                timestamp: new Date().toISOString(),
                enabledFeatures: enabledCount,
                totalFeatures: totalCount,
                migrationStatus: this.flags['admin-gui-migration'] ? 'active' : 'inactive',
                rolloutPercentage: this.flags['rollout-percentage'],
                flags: this.getAllFlags()
            };
        }
    }

    // Create singleton instance
    window.FeatureToggle = window.FeatureToggle || new FeatureToggle();

    // Export for module systems if available
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FeatureToggle;
    }

})();