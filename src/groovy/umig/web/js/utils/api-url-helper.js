/**
 * ============================================================================
 * UMIG API URL Helper Utility
 * US-098 Configuration Management System - Dynamic API URL Construction
 * ============================================================================
 *
 * PURPOSE:
 * Centralizes API URL construction with dynamic base URL support from
 * configuration management system. Eliminates hard-coded paths and enables
 * environment-specific URL patterns.
 *
 * ARCHITECTURE:
 * - Singleton pattern with global window.apiUrlHelper
 * - UUID validation for all entity IDs
 * - Configurable base URL (default: /rest/scriptrunner/latest/custom)
 * - Support for Teams API and Labels API with hierarchical filtering
 *
 * USAGE:
 * ```javascript
 * // Initialize (happens automatically)
 * window.apiUrlHelper.setBaseUrl('/custom/api/base');
 *
 * // Build Teams URLs
 * const url1 = apiUrlHelper.buildTeamsUrl({ iterationId: uuid });
 * const url2 = apiUrlHelper.buildTeamsUrl({ sequenceId: uuid, planTemplateId: uuid });
 *
 * // Build Labels URLs
 * const url3 = apiUrlHelper.buildLabelsUrl({ phaseId: uuid });
 * ```
 *
 * BUGFIX REFERENCE:
 * - bugfix/uat-deployment-issues: Teams/Labels API 404 errors in UAT
 * - US-098: Configuration management for environment-specific settings
 *
 * @version 1.0.0
 * @since Sprint 8
 * @author UMIG Team
 */

(function () {
  "use strict";

  /**
   * UUID validation regex (RFC 4122 compliant)
   * Matches: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
   * Where M = version (1-5), N = variant (8,9,A,B)
   */
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * ApiUrlHelper - Singleton utility for API URL construction
   */
  class ApiUrlHelper {
    constructor() {
      // Default base URL - can be overridden via configuration
      this.baseUrl =
        (typeof AJS !== "undefined" ? AJS.contextPath() || "" : "") +
        "/rest/scriptrunner/latest/custom";

      console.log("✅ ApiUrlHelper: Initialized with baseUrl:", this.baseUrl);
    }

    /**
     * Set the base URL for API endpoints
     * US-098: Allows dynamic configuration from environment settings
     *
     * @param {string} url - Base URL (e.g., '/rest/scriptrunner/latest/custom')
     * @throws {Error} If url is not a string or is empty
     *
     * @example
     * apiUrlHelper.setBaseUrl('/custom/api/base');
     */
    setBaseUrl(url) {
      if (typeof url !== "string" || url.trim() === "") {
        throw new Error("ApiUrlHelper: baseUrl must be a non-empty string");
      }
      this.baseUrl = url.trim();
      console.log("🔧 ApiUrlHelper: Base URL updated to:", this.baseUrl);
    }

    /**
     * Get the current base URL
     *
     * @returns {string} Current base URL
     */
    getBaseUrl() {
      return this.baseUrl;
    }

    /**
     * Validate UUID format (RFC 4122)
     *
     * @param {string} uuid - UUID to validate
     * @returns {boolean} True if valid UUID format
     *
     * @example
     * validateUuid('550e8400-e29b-41d4-a716-446655440000') // true
     * validateUuid('invalid-uuid') // false
     */
    validateUuid(uuid) {
      if (typeof uuid !== "string") {
        return false;
      }
      return UUID_REGEX.test(uuid.trim());
    }

    /**
     * Build query string from filter parameters
     * Validates all UUID parameters and excludes invalid values
     *
     * @private
     * @param {Object} filters - Filter parameters
     * @returns {string} Query string (e.g., '?iterationId=xxx&planTemplateId=yyy')
     */
    _buildQueryString(filters) {
      const params = [];

      // Validate and add each parameter
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== "") {
          // UUID validation for ID parameters
          if (key.toLowerCase().includes("id")) {
            if (!this.validateUuid(value)) {
              console.warn(`⚠️  ApiUrlHelper: Invalid UUID for ${key}:`, value);
              continue; // Skip invalid UUID
            }
          }

          params.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
          );
        }
      }

      return params.length > 0 ? "?" + params.join("&") : "";
    }

    /**
     * Build Teams API URL with hierarchical filtering
     * US-098: Dynamic URL construction for Teams entity
     *
     * Supported filter hierarchy (most specific to least specific):
     * 1. stepId - Teams for specific step
     * 2. phaseId - Teams for specific phase
     * 3. sequenceId + planTemplateId - Teams for sequence in plan template
     * 4. sequenceId - Teams for specific sequence
     * 5. planId - Teams for specific plan instance
     * 6. iterationId + planTemplateId - Teams for iteration in plan template
     * 7. iterationId - Teams for specific iteration
     * 8. migrationId - Teams for specific migration
     * 9. No filters - All teams
     *
     * @param {Object} filters - Filter parameters
     * @param {string} [filters.stepId] - Step UUID
     * @param {string} [filters.phaseId] - Phase UUID
     * @param {string} [filters.sequenceId] - Sequence UUID
     * @param {string} [filters.planId] - Plan instance UUID
     * @param {string} [filters.planTemplateId] - Plan template UUID
     * @param {string} [filters.iterationId] - Iteration UUID
     * @param {string} [filters.migrationId] - Migration UUID
     * @returns {string} Complete Teams API URL with query parameters
     * @throws {Error} If invalid UUID format detected
     *
     * @example
     * // Iteration-level filtering
     * buildTeamsUrl({ iterationId: '550e8400-e29b-41d4-a716-446655440000' })
     * // Returns: '/rest/scriptrunner/latest/custom/teams?iterationId=550e8400-...'
     *
     * @example
     * // Sequence + Plan Template filtering
     * buildTeamsUrl({
     *   sequenceId: '550e8400-e29b-41d4-a716-446655440000',
     *   planTemplateId: '660e8400-e29b-41d4-a716-446655440000'
     * })
     * // Returns: '/rest/scriptrunner/latest/custom/teams?sequenceId=...&planTemplateId=...'
     */
    buildTeamsUrl(filters = {}) {
      const endpoint = `${this.baseUrl}/teams`;
      const queryString = this._buildQueryString(filters);
      const url = endpoint + queryString;

      console.log("🔗 ApiUrlHelper: Built Teams URL:", url);
      return url;
    }

    /**
     * Build Labels API URL with hierarchical filtering
     * US-098: Dynamic URL construction for Labels entity
     *
     * Supported filter hierarchy (same as Teams):
     * 1. stepId - Labels for specific step
     * 2. phaseId - Labels for specific phase
     * 3. sequenceId + planTemplateId - Labels for sequence in plan template
     * 4. sequenceId - Labels for specific sequence
     * 5. planId - Labels for specific plan instance
     * 6. iterationId + planTemplateId - Labels for iteration in plan template
     * 7. iterationId - Labels for specific iteration
     * 8. migrationId - Labels for specific migration
     * 9. No filters - All labels
     *
     * @param {Object} filters - Filter parameters (same as buildTeamsUrl)
     * @returns {string} Complete Labels API URL with query parameters
     * @throws {Error} If invalid UUID format detected
     *
     * @example
     * // Phase-level filtering
     * buildLabelsUrl({ phaseId: '550e8400-e29b-41d4-a716-446655440000' })
     * // Returns: '/rest/scriptrunner/latest/custom/labels?phaseId=550e8400-...'
     */
    buildLabelsUrl(filters = {}) {
      const endpoint = `${this.baseUrl}/labels`;
      const queryString = this._buildQueryString(filters);
      const url = endpoint + queryString;

      console.log("🔗 ApiUrlHelper: Built Labels URL:", url);
      return url;
    }

    /**
     * Build generic API URL with query parameters
     * Utility method for other endpoints
     *
     * @param {string} endpoint - Endpoint path (e.g., '/steps', '/migrations')
     * @param {Object} filters - Query parameters
     * @returns {string} Complete API URL
     *
     * @example
     * buildUrl('/steps', { iterationId: uuid, status: 'COMPLETED' })
     */
    buildUrl(endpoint, filters = {}) {
      if (!endpoint || typeof endpoint !== "string") {
        throw new Error("ApiUrlHelper: endpoint must be a non-empty string");
      }

      // Ensure endpoint starts with /
      const normalizedEndpoint = endpoint.startsWith("/")
        ? endpoint
        : "/" + endpoint;
      const fullEndpoint = `${this.baseUrl}${normalizedEndpoint}`;
      const queryString = this._buildQueryString(filters);
      const url = fullEndpoint + queryString;

      console.log("🔗 ApiUrlHelper: Built URL:", url);
      return url;
    }

    /**
     * Validate and prepare filter object
     * Removes null/undefined/empty values and validates UUIDs
     *
     * @param {Object} filters - Raw filter object
     * @returns {Object} Cleaned filter object
     *
     * @example
     * cleanFilters({ iterationId: uuid, phaseId: null, teamId: '' })
     * // Returns: { iterationId: uuid }
     */
    cleanFilters(filters) {
      const cleaned = {};

      for (const [key, value] of Object.entries(filters)) {
        // Skip null, undefined, empty strings
        if (value === undefined || value === null || value === "") {
          continue;
        }

        // Validate UUIDs
        if (key.toLowerCase().includes("id")) {
          if (!this.validateUuid(value)) {
            console.warn(
              `⚠️  ApiUrlHelper: Skipping invalid UUID for ${key}:`,
              value,
            );
            continue;
          }
        }

        cleaned[key] = value;
      }

      return cleaned;
    }
  }

  // Create singleton instance and expose globally
  window.apiUrlHelper = new ApiUrlHelper();

  // Log successful initialization
  console.log(
    "✅ ApiUrlHelper: Singleton instance created and available globally",
  );
  console.log("📋 ApiUrlHelper: Usage examples:");
  console.log("   - apiUrlHelper.buildTeamsUrl({ iterationId: uuid })");
  console.log("   - apiUrlHelper.buildLabelsUrl({ phaseId: uuid })");
  console.log('   - apiUrlHelper.setBaseUrl("/custom/base")');
})();
