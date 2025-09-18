/**
 * StatusProvider.js - Frontend caching and utility for status data
 *
 * Part of TD-003: Eliminate Hardcoded Status Values
 * Provides cached access to status data from the backend StatusApi
 *
 * Features:
 * - Client-side caching with TTL matching backend (5 minutes)
 * - Fallback to hardcoded values if API fails (for reliability)
 * - Dropdown option generation for AUI selects
 * - ETag support for cache validation
 * - Enterprise-grade security features (XSS prevention, input validation, CSRF protection)
 *
 * Security Enhancements:
 * - Input sanitization and validation for all user-controlled data
 * - XSS prevention for DOM manipulation operations
 * - Entity type validation against whitelist
 * - CSRF token integration for API requests
 * - Sanitized error logging to prevent information disclosure
 *
 * @since Sprint 7
 * @author UMIG Development Team
 * @version 2.0 (Security Enhanced)
 */

(function(window) {
    'use strict';

    /**
     * StatusProvider singleton for managing status data
     */
    class StatusProvider {
        constructor() {
            // Cache configuration - matches backend TTL
            this.CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
            this.cache = new Map();
            this.etags = new Map();

            // API endpoint
            this.API_BASE = window.contextPath + '/rest/scriptrunner/latest/custom';
            this.STATUS_ENDPOINT = this.API_BASE + '/status';

            // Security configuration
            this.ALLOWED_ENTITY_TYPES = [
                'Step', 'Phase', 'Sequence', 'Iteration', 'Plan', 'Migration', 'Control'
            ];

            // Security utilities reference
            this.securityUtils = typeof SecurityUtils !== 'undefined' ? SecurityUtils : null;
            if (!this.securityUtils) {
                console.warn('[StatusProvider] SecurityUtils not available - using fallback security measures');
            }

            // Fallback status values (for reliability if API fails)
            // These will be replaced by dynamic values from the database
            this.FALLBACK_STATUSES = {
                Step: [
                    { value: 'PENDING', text: 'Pending', cssClass: 'status-pending' },
                    { value: 'TODO', text: 'To Do', cssClass: 'status-todo' },
                    { value: 'IN_PROGRESS', text: 'In Progress', cssClass: 'status-in-progress' },
                    { value: 'COMPLETED', text: 'Completed', cssClass: 'status-completed' },
                    { value: 'FAILED', text: 'Failed', cssClass: 'status-failed' },
                    { value: 'BLOCKED', text: 'Blocked', cssClass: 'status-blocked' },
                    { value: 'CANCELLED', text: 'Cancelled', cssClass: 'status-cancelled' }
                ],
                Phase: [
                    { value: 'PLANNING', text: 'Planning', cssClass: 'status-planning' },
                    { value: 'IN_PROGRESS', text: 'In Progress', cssClass: 'status-in-progress' },
                    { value: 'COMPLETED', text: 'Completed', cssClass: 'status-completed' },
                    { value: 'CANCELLED', text: 'Cancelled', cssClass: 'status-cancelled' }
                ],
                Sequence: [
                    { value: 'PLANNING', text: 'Planning', cssClass: 'status-planning' },
                    { value: 'IN_PROGRESS', text: 'In Progress', cssClass: 'status-in-progress' },
                    { value: 'COMPLETED', text: 'Completed', cssClass: 'status-completed' },
                    { value: 'CANCELLED', text: 'Cancelled', cssClass: 'status-cancelled' }
                ],
                Iteration: [
                    { value: 'PLANNING', text: 'Planning', cssClass: 'status-planning' },
                    { value: 'IN_PROGRESS', text: 'In Progress', cssClass: 'status-in-progress' },
                    { value: 'COMPLETED', text: 'Completed', cssClass: 'status-completed' },
                    { value: 'CANCELLED', text: 'Cancelled', cssClass: 'status-cancelled' }
                ],
                Plan: [
                    { value: 'PLANNING', text: 'Planning', cssClass: 'status-planning' },
                    { value: 'IN_PROGRESS', text: 'In Progress', cssClass: 'status-in-progress' },
                    { value: 'COMPLETED', text: 'Completed', cssClass: 'status-completed' },
                    { value: 'CANCELLED', text: 'Cancelled', cssClass: 'status-cancelled' }
                ],
                Migration: [
                    { value: 'PLANNING', text: 'Planning', cssClass: 'status-planning' },
                    { value: 'IN_PROGRESS', text: 'In Progress', cssClass: 'status-in-progress' },
                    { value: 'COMPLETED', text: 'Completed', cssClass: 'status-completed' },
                    { value: 'CANCELLED', text: 'Cancelled', cssClass: 'status-cancelled' }
                ],
                Control: [
                    { value: 'TODO', text: 'To Do', cssClass: 'status-todo' },
                    { value: 'PASSED', text: 'Passed', cssClass: 'status-passed' },
                    { value: 'FAILED', text: 'Failed', cssClass: 'status-failed' },
                    { value: 'CANCELLED', text: 'Cancelled', cssClass: 'status-cancelled' }
                ]
            };
        }

        /**
         * Get status data for a specific entity type
         * @param {string} entityType - The entity type (Step, Phase, etc.)
         * @returns {Promise<Array>} Array of status objects
         */
        async getStatuses(entityType) {
            // Input validation and sanitization
            const validationResult = this.validateEntityType(entityType);
            if (!validationResult.isValid) {
                this.logSecurityEvent('invalid_entity_type', {
                    entityType: this.sanitizeForLogging(entityType),
                    errors: validationResult.errors
                });
                return [];
            }

            const sanitizedEntityType = validationResult.sanitizedData;

            // Check cache first
            const cacheKey = `statuses_${sanitizedEntityType}`;
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                console.debug(`StatusProvider: Cache hit for ${this.sanitizeForLogging(sanitizedEntityType)}`);
                return cached;
            }

            try {
                // Fetch from API
                console.debug(`StatusProvider: Cache miss for ${this.sanitizeForLogging(sanitizedEntityType)}, fetching from API`);
                const response = await this.fetchFromApi(sanitizedEntityType);

                if (response && response.statuses) {
                    // Cache the data
                    this.setCachedData(cacheKey, response.statuses);

                    // Store ETag if present (sanitized)
                    if (response.etag && typeof response.etag === 'string') {
                        this.etags.set(sanitizedEntityType, this.sanitizeString(response.etag));
                    }

                    return response.statuses;
                }
            } catch (error) {
                this.logSecurityEvent('api_fetch_error', {
                    entityType: sanitizedEntityType,
                    error: this.sanitizeErrorForLogging(error)
                });
            }

            // Return fallback values if API fails
            console.warn(`StatusProvider: Using fallback statuses for ${this.sanitizeForLogging(sanitizedEntityType)}`);
            return this.getFallbackStatuses(sanitizedEntityType);
        }

        /**
         * Get dropdown options for a specific entity type
         * @param {string} entityType - The entity type
         * @returns {Promise<Array>} Array of dropdown option objects
         */
        async getDropdownOptions(entityType) {
            // Input validation and sanitization
            const validationResult = this.validateEntityType(entityType);
            if (!validationResult.isValid) {
                this.logSecurityEvent('invalid_entity_type_dropdown', {
                    entityType: this.sanitizeForLogging(entityType),
                    errors: validationResult.errors
                });
                return [];
            }

            const sanitizedEntityType = validationResult.sanitizedData;

            // Check cache first
            const cacheKey = `dropdown_${sanitizedEntityType}`;
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                console.debug(`StatusProvider: Cache hit for dropdown options ${this.sanitizeForLogging(sanitizedEntityType)}`);
                return cached;
            }

            try {
                // Fetch from API
                const response = await this.fetchFromApi(sanitizedEntityType);

                if (response && response.dropdownOptions) {
                    // Cache the data
                    this.setCachedData(cacheKey, response.dropdownOptions);
                    return response.dropdownOptions;
                }

                // Generate dropdown options from statuses if not provided
                if (response && response.statuses) {
                    const options = this.generateDropdownOptions(response.statuses);
                    this.setCachedData(cacheKey, options);
                    return options;
                }
            } catch (error) {
                this.logSecurityEvent('dropdown_fetch_error', {
                    entityType: sanitizedEntityType,
                    error: this.sanitizeErrorForLogging(error)
                });
            }

            // Return fallback dropdown options
            return this.FALLBACK_STATUSES[sanitizedEntityType] || [];
        }

        /**
         * Get all statuses grouped by entity type
         * @returns {Promise<Object>} Object with entity types as keys
         */
        async getAllStatuses() {
            // Check cache first
            const cacheKey = 'all_statuses';
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                console.debug('StatusProvider: Cache hit for all statuses');
                return cached;
            }

            try {
                // Fetch all statuses from API
                const response = await this.fetchFromApi(null);

                if (response && response.statusesByType) {
                    // Cache the data
                    this.setCachedData(cacheKey, response.statusesByType);
                    return response.statusesByType;
                }
            } catch (error) {
                this.logSecurityEvent('all_statuses_fetch_error', {
                    error: this.sanitizeErrorForLogging(error)
                });
            }

            // Return all fallback statuses
            console.warn('StatusProvider: Using all fallback statuses');
            return this.FALLBACK_STATUSES;
        }

        /**
         * Fetch status data from the API
         * @private
         * @param {string|null} entityType - Entity type or null for all
         * @returns {Promise<Object>} API response
         */
        async fetchFromApi(entityType) {
            const url = entityType
                ? `${this.STATUS_ENDPOINT}?entityType=${encodeURIComponent(entityType)}`
                : this.STATUS_ENDPOINT;

            let headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            };

            // Add CSRF protection if SecurityUtils is available
            if (this.securityUtils && this.securityUtils.addCSRFProtection) {
                headers = this.securityUtils.addCSRFProtection(headers);
            }

            // Add ETag for cache validation (sanitized)
            const storedEtag = this.etags.get(entityType || 'all');
            if (storedEtag && typeof storedEtag === 'string') {
                headers['If-None-Match'] = this.sanitizeString(storedEtag);
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                credentials: 'same-origin'
            });

            // Handle 304 Not Modified
            if (response.status === 304) {
                console.debug('StatusProvider: Data not modified (304), using cached version');
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Store new ETag if present (sanitized)
            const newEtag = response.headers.get('ETag');
            if (newEtag && typeof newEtag === 'string') {
                this.etags.set(entityType || 'all', this.sanitizeString(newEtag));
            }

            return data;
        }

        /**
         * Generate dropdown options from status data
         * @private
         * @param {Array} statuses - Array of status objects
         * @returns {Array} Array of dropdown options
         */
        generateDropdownOptions(statuses) {
            if (!Array.isArray(statuses)) {
                console.warn('StatusProvider: Invalid statuses array provided to generateDropdownOptions');
                return [];
            }

            return statuses.map(status => {
                if (!status || typeof status !== 'object') {
                    console.warn('StatusProvider: Invalid status object in generateDropdownOptions');
                    return null;
                }

                return {
                    value: this.sanitizeString(status.name),
                    text: this.formatStatusDisplay(status.name),
                    cssClass: this.sanitizeCSS(this.getStatusCssClass(status.name)),
                    color: this.sanitizeColor(status.color)
                };
            }).filter(Boolean); // Remove null entries
        }

        /**
         * Format status name for display
         * @private
         * @param {string} statusName - Status name (e.g., 'IN_PROGRESS')
         * @returns {string} Formatted display text
         */
        formatStatusDisplay(statusName) {
            if (!statusName) return '';

            // Special cases
            if (statusName === 'TODO') return 'To Do';
            if (statusName === 'IN_PROGRESS') return 'In Progress';

            // Convert SNAKE_CASE to Title Case
            return statusName
                .toLowerCase()
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        /**
         * Get CSS class for status styling
         * @private
         * @param {string} statusName - Status name
         * @returns {string} CSS class name
         */
        getStatusCssClass(statusName) {
            if (!statusName || typeof statusName !== 'string') return 'status-unknown';
            const sanitized = this.sanitizeString(statusName);
            return `status-${sanitized.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '')}`;
        }

        /**
         * Get cached data if still valid
         * @private
         * @param {string} key - Cache key
         * @returns {*} Cached data or null
         */
        getCachedData(key) {
            const cached = this.cache.get(key);
            if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
                return cached.data;
            }
            // Remove expired cache entry
            if (cached) {
                this.cache.delete(key);
            }
            return null;
        }

        /**
         * Set cached data
         * @private
         * @param {string} key - Cache key
         * @param {*} data - Data to cache
         */
        setCachedData(key, data) {
            this.cache.set(key, {
                data: data,
                timestamp: Date.now()
            });
        }

        /**
         * Get fallback statuses for an entity type
         * @private
         * @param {string} entityType - Entity type
         * @returns {Array} Fallback status array
         */
        getFallbackStatuses(entityType) {
            // Validate entity type before accessing fallback data
            const validationResult = this.validateEntityType(entityType);
            if (!validationResult.isValid) {
                console.warn('StatusProvider: Invalid entity type for fallback statuses');
                return [];
            }

            const sanitizedEntityType = validationResult.sanitizedData;
            const fallbackOptions = this.FALLBACK_STATUSES[sanitizedEntityType];
            if (!fallbackOptions) {
                console.warn(`StatusProvider: No fallback statuses for entity type ${this.sanitizeForLogging(sanitizedEntityType)}`);
                return [];
            }

            // Convert dropdown format to status format
            return fallbackOptions.map(option => ({
                name: this.sanitizeString(option.value),
                type: sanitizedEntityType,
                // Generate mock ID for compatibility
                id: this.generateMockId(option.value, sanitizedEntityType)
            }));
        }

        /**
         * Generate a mock ID for fallback statuses
         * @private
         * @param {string} statusName - Status name
         * @param {string} entityType - Entity type
         * @returns {number} Mock ID
         */
        generateMockId(statusName, entityType) {
            // Sanitize inputs before hashing
            const sanitizedStatus = this.sanitizeString(statusName) || 'unknown';
            const sanitizedEntity = this.sanitizeString(entityType) || 'unknown';

            // Simple hash function to generate consistent IDs
            let hash = 0;
            const str = `${sanitizedEntity}_${sanitizedStatus}`;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash) % 1000; // Keep it under 1000 for mock IDs
        }

        /**
         * Clear the cache (admin functionality)
         */
        clearCache() {
            this.cache.clear();
            this.etags.clear();
            console.info('StatusProvider: Cache cleared');
        }

        /**
         * Get cache statistics
         * @returns {Object} Cache statistics
         */
        getCacheStatistics() {
            const now = Date.now();
            let activeEntries = 0;
            let expiredEntries = 0;

            this.cache.forEach((value, key) => {
                if (now - value.timestamp < this.CACHE_TTL_MS) {
                    activeEntries++;
                } else {
                    expiredEntries++;
                }
            });

            return {
                totalEntries: this.cache.size,
                activeEntries: activeEntries,
                expiredEntries: expiredEntries,
                etagCount: this.etags.size,
                cacheTTLMs: this.CACHE_TTL_MS
            };
        }

        /**
         * Populate a select element with status options
         * @param {HTMLSelectElement} selectElement - The select element to populate
         * @param {string} entityType - Entity type for statuses
         * @param {string} currentValue - Current selected value (optional)
         * @returns {Promise<void>}
         */
        async populateStatusDropdown(selectElement, entityType, currentValue) {
            // Validate inputs
            if (!selectElement || !selectElement.nodeType || selectElement.tagName !== 'SELECT') {
                console.error('StatusProvider: Valid select element is required');
                return;
            }

            const validationResult = this.validateEntityType(entityType);
            if (!validationResult.isValid) {
                this.logSecurityEvent('invalid_dropdown_population', {
                    entityType: this.sanitizeForLogging(entityType),
                    errors: validationResult.errors
                });
                return;
            }

            const sanitizedEntityType = validationResult.sanitizedData;
            const sanitizedCurrentValue = currentValue ? this.sanitizeString(currentValue) : null;

            try {
                // Get dropdown options
                const options = await this.getDropdownOptions(sanitizedEntityType);

                // Clear existing options (except placeholder if exists)
                const placeholder = selectElement.querySelector('option[value=""]');
                selectElement.innerHTML = '';
                if (placeholder) {
                    selectElement.appendChild(placeholder);
                }

                // Add status options with XSS prevention
                options.forEach(option => {
                    if (!option || typeof option !== 'object') {
                        console.warn('StatusProvider: Invalid option object in dropdown population');
                        return;
                    }

                    const optionElement = document.createElement('option');

                    // Set value with sanitization
                    optionElement.value = this.sanitizeString(option.value) || '';

                    // Set text content safely (XSS prevention)
                    if (this.securityUtils && this.securityUtils.setTextContent) {
                        this.securityUtils.setTextContent(optionElement, option.text);
                    } else {
                        optionElement.textContent = this.sanitizeString(option.text) || '';
                    }

                    // Set CSS class with sanitization (XSS prevention)
                    const sanitizedCssClass = this.sanitizeCSS(option.cssClass);
                    if (sanitizedCssClass) {
                        optionElement.className = sanitizedCssClass;
                    }

                    // Set color with sanitization (XSS prevention)
                    if (option.color) {
                        const sanitizedColor = this.sanitizeColor(option.color);
                        if (sanitizedColor) {
                            optionElement.style.color = sanitizedColor;
                        }
                    }

                    if (sanitizedCurrentValue && option.value === sanitizedCurrentValue) {
                        optionElement.selected = true;
                    }

                    selectElement.appendChild(optionElement);
                });

                console.debug(`StatusProvider: Populated dropdown with ${options.length} options for ${this.sanitizeForLogging(sanitizedEntityType)}`);
            } catch (error) {
                this.logSecurityEvent('dropdown_population_error', {
                    entityType: sanitizedEntityType,
                    error: this.sanitizeErrorForLogging(error)
                });

                // Use fallback options if API fails
                const fallbackOptions = this.FALLBACK_STATUSES[sanitizedEntityType] || [];
                fallbackOptions.forEach(option => {
                    if (!option || typeof option !== 'object') {
                        return;
                    }

                    const optionElement = document.createElement('option');
                    optionElement.value = this.sanitizeString(option.value) || '';

                    if (this.securityUtils && this.securityUtils.setTextContent) {
                        this.securityUtils.setTextContent(optionElement, option.text);
                    } else {
                        optionElement.textContent = this.sanitizeString(option.text) || '';
                    }

                    const sanitizedCssClass = this.sanitizeCSS(option.cssClass);
                    if (sanitizedCssClass) {
                        optionElement.className = sanitizedCssClass;
                    }

                    if (sanitizedCurrentValue && option.value === sanitizedCurrentValue) {
                        optionElement.selected = true;
                    }

                    selectElement.appendChild(optionElement);
                });
            }
        }

        // ===== SECURITY METHODS =====

        /**
         * Validate entity type against whitelist
         * @param {string} entityType - Entity type to validate
         * @returns {Object} Validation result with isValid, sanitizedData, and errors
         */
        validateEntityType(entityType) {
            const result = {
                isValid: false,
                sanitizedData: null,
                errors: []
            };

            if (!entityType) {
                result.errors.push('Entity type is required');
                return result;
            }

            if (typeof entityType !== 'string') {
                result.errors.push('Entity type must be a string');
                return result;
            }

            // Sanitize input
            const sanitized = this.sanitizeString(entityType);

            // Check against whitelist
            if (!this.ALLOWED_ENTITY_TYPES.includes(sanitized)) {
                result.errors.push(`Invalid entity type. Must be one of: ${this.ALLOWED_ENTITY_TYPES.join(', ')}`);
                return result;
            }

            result.isValid = true;
            result.sanitizedData = sanitized;
            return result;
        }

        /**
         * Sanitize string input for XSS prevention
         * @param {string} input - Input to sanitize
         * @returns {string} Sanitized string
         */
        sanitizeString(input) {
            if (input === null || input === undefined) {
                return '';
            }

            if (typeof input !== 'string') {
                input = String(input);
            }

            // Use SecurityUtils if available, otherwise fallback
            if (this.securityUtils && this.securityUtils.sanitizeXSS) {
                return this.securityUtils.sanitizeXSS(input);
            }

            // Fallback sanitization
            return input
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;')
                .trim();
        }

        /**
         * Sanitize CSS class names and styles
         * @param {string} cssValue - CSS value to sanitize
         * @returns {string} Sanitized CSS value
         */
        sanitizeCSS(cssValue) {
            if (!cssValue || typeof cssValue !== 'string') {
                return '';
            }

            // Use SecurityUtils if available
            if (this.securityUtils && this.securityUtils.sanitizeForCSS) {
                return this.securityUtils.sanitizeForCSS(cssValue);
            }

            // Fallback CSS sanitization
            return cssValue
                .replace(/[<>"'`]/g, '')
                .replace(/javascript:/gi, '')
                .replace(/expression\(/gi, '')
                .replace(/url\(/gi, '')
                .replace(/import/gi, '')
                .trim();
        }

        /**
         * Sanitize color values (hex, rgb, named colors)
         * @param {string} color - Color value to sanitize
         * @returns {string} Sanitized color value or empty string if invalid
         */
        sanitizeColor(color) {
            if (!color || typeof color !== 'string') {
                return '';
            }

            const trimmed = color.trim();

            // Hex colors (#fff, #ffffff)
            if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(trimmed)) {
                return trimmed;
            }

            // RGB/RGBA colors
            if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[01]?(\.\d+)?\s*)?\)$/.test(trimmed)) {
                return trimmed;
            }

            // Named colors (basic whitelist)
            const allowedColors = [
                'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown',
                'black', 'white', 'gray', 'grey', 'transparent', 'inherit', 'initial'
            ];

            if (allowedColors.includes(trimmed.toLowerCase())) {
                return trimmed.toLowerCase();
            }

            // If color doesn't match any safe pattern, return empty string
            return '';
        }

        /**
         * Sanitize data for logging to prevent information disclosure
         * @param {any} data - Data to sanitize for logging
         * @returns {string} Sanitized log-safe string
         */
        sanitizeForLogging(data) {
            if (data === null || data === undefined) {
                return '[null/undefined]';
            }

            if (typeof data === 'string') {
                // Truncate long strings and remove sensitive patterns
                return data
                    .substring(0, 100)
                    .replace(/password|token|secret|key|auth/gi, '[REDACTED]')
                    .replace(/[<>"'`]/g, '');
            }

            if (typeof data === 'object') {
                return '[object]';
            }

            return String(data).substring(0, 100);
        }

        /**
         * Sanitize error objects for logging
         * @param {Error} error - Error to sanitize
         * @returns {string} Sanitized error message
         */
        sanitizeErrorForLogging(error) {
            if (!error) {
                return '[no error]';
            }

            if (error.message) {
                return this.sanitizeForLogging(error.message);
            }

            return '[error without message]';
        }

        /**
         * Log security events for audit purposes
         * @param {string} event - Event type
         * @param {Object} details - Event details (will be sanitized)
         */
        logSecurityEvent(event, details = {}) {
            // Use SecurityUtils logging if available
            if (this.securityUtils && this.securityUtils.logSecurityEvent) {
                this.securityUtils.logSecurityEvent(`StatusProvider:${event}`, details);
                return;
            }

            // Fallback logging
            const sanitizedDetails = {};
            for (const [key, value] of Object.entries(details)) {
                sanitizedDetails[key] = this.sanitizeForLogging(value);
            }

            console.warn(`[StatusProvider Security] ${event}:`, sanitizedDetails);
        }
    }

    // Create singleton instance
    const statusProvider = new StatusProvider();

    // Export to window for global access
    window.StatusProvider = statusProvider;

    // Also export the class for testing purposes
    window.StatusProviderClass = StatusProvider;

    console.info('StatusProvider initialized - TD-003 Phase 1');

})(window);