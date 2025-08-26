/**
 * URL Constructor Utility - Client-side URL construction using server configuration
 * 
 * This utility fetches URL configuration from the server's UrlConstructionService
 * and provides methods for constructing StepView URLs with proper fallback handling.
 * 
 * @author UMIG Project Team
 * @since 2025-08-26
 */

class UrlConstructor {
    constructor() {
        this.config = null;
        this.fallbackConfig = null;
        this.initialized = false;
        this.initPromise = null;
    }

    /**
     * Initialize the URL constructor by fetching configuration from server
     * @param {Object} fallbackConfig - Fallback configuration to use if server fails
     * @returns {Promise<boolean>} - True if server config loaded, false if using fallback
     */
    async initialize(fallbackConfig = null) {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._performInitialization(fallbackConfig);
        return this.initPromise;
    }

    async _performInitialization(fallbackConfig) {
        this.fallbackConfig = fallbackConfig;
        
        try {
            console.log('🔧 UrlConstructor: Fetching configuration from server...');
            
            const response = await fetch('/rest/scriptrunner/latest/custom/urlConfiguration', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.config = await response.json();
            this.initialized = true;
            
            console.log('✅ UrlConstructor: Server configuration loaded successfully');
            console.log(`🌐 Environment: ${this.config.environment}`);
            console.log(`🔗 Base URL: ${this.config.baseUrl}`);
            
            return true;
            
        } catch (error) {
            console.warn('⚠️ UrlConstructor: Failed to fetch server configuration, using fallback');
            console.warn('❌ Error details:', error.message);
            
            if (this.fallbackConfig) {
                this.config = this.fallbackConfig;
                this.initialized = true;
                console.log('🔄 UrlConstructor: Fallback configuration loaded');
                console.log(`🌐 Fallback Environment: ${this.config.environment}`);
                console.log(`🔗 Fallback Base URL: ${this.config.baseUrl}`);
                return false;
            } else {
                console.error('❌ UrlConstructor: No fallback configuration provided, URL construction will fail');
                throw error;
            }
        }
    }

    /**
     * Construct a StepView URL with the given parameters
     * @param {Object} params - URL parameters
     * @param {string} params.migrationCode - Migration code (e.g., "TORONTO")
     * @param {string} params.iterationCode - Iteration code (e.g., "run1")
     * @param {string} params.stepCode - Step code (e.g., "STT-001")
     * @returns {string} - Complete URL for StepView
     */
    buildStepViewUrl({ migrationCode, iterationCode, stepCode }) {
        if (!this.initialized || !this.config) {
            console.error('❌ UrlConstructor: Not initialized. Call initialize() first.');
            return null;
        }

        try {
            // Use the URL template from configuration or build it
            let baseUrl;
            if (this.config.urlTemplate) {
                baseUrl = this.config.urlTemplate;
            } else {
                // Build URL from components
                baseUrl = `${this.config.baseUrl}/spaces/${this.config.spaceKey}/pages/${this.config.pageId}/${encodeURIComponent(this.config.pageTitle)}`;
            }

            // Add query parameters
            const queryParams = new URLSearchParams();
            if (migrationCode) queryParams.set('mig', migrationCode);
            if (iterationCode) queryParams.set('ite', iterationCode);
            if (stepCode) queryParams.set('stepid', stepCode);

            const fullUrl = `${baseUrl}?${queryParams.toString()}`;
            
            console.log('🔗 UrlConstructor: Built URL:', fullUrl);
            return fullUrl;
            
        } catch (error) {
            console.error('❌ UrlConstructor: Failed to build URL:', error.message);
            return null;
        }
    }

    /**
     * Get the current configuration (for debugging purposes)
     * @returns {Object} - Current configuration object
     */
    getConfiguration() {
        return this.config;
    }

    /**
     * Check if the constructor is using fallback configuration
     * @returns {boolean} - True if using fallback, false if using server config
     */
    isUsingFallback() {
        return this.config === this.fallbackConfig;
    }

    /**
     * Refresh configuration from server
     * @returns {Promise<boolean>} - True if refresh successful, false if fallback used
     */
    async refresh() {
        this.initialized = false;
        this.initPromise = null;
        this.config = null;
        return this.initialize(this.fallbackConfig);
    }

    /**
     * Get health information about the URL constructor
     * @returns {Object} - Health status and configuration info
     */
    getHealthInfo() {
        return {
            initialized: this.initialized,
            hasConfig: !!this.config,
            usingFallback: this.isUsingFallback(),
            environment: this.config?.environment || 'unknown',
            baseUrl: this.config?.baseUrl || 'unknown',
            lastInitialized: this.initialized ? new Date().toISOString() : null
        };
    }
}

// Create singleton instance
const urlConstructor = new UrlConstructor();

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
    // Node.js / CommonJS
    module.exports = { UrlConstructor, urlConstructor };
} else {
    // Browser / Global
    window.UrlConstructor = UrlConstructor;
    window.urlConstructor = urlConstructor;
}

// Auto-initialize if UMIG_STEP_CONFIG is available
if (typeof window !== 'undefined' && window.UMIG_STEP_CONFIG) {
    document.addEventListener('DOMContentLoaded', async function() {
        try {
            const fallback = window.UMIG_STEP_CONFIG.fallbackUrlConfig;
            const success = await urlConstructor.initialize(fallback);
            
            // Store configuration in the global config
            window.UMIG_STEP_CONFIG.urlConfig = urlConstructor.getConfiguration();
            
            console.log('🚀 UrlConstructor: Auto-initialization complete');
            console.log('📊 Status:', urlConstructor.getHealthInfo());
            
            if (!success) {
                console.warn('⚠️ StepView: Using fallback URL configuration. Check server connectivity and system_configuration_scf table.');
            }
            
        } catch (error) {
            console.error('❌ UrlConstructor: Auto-initialization failed:', error.message);
        }
    });
}