/**
 * Status Color Service Module
 *
 * Provides centralized management of status colors fetched from the database.
 * Caches status colors per entity type and provides methods to format status badges
 * with dynamic background colors from the status_sts table.
 */

(function () {
  "use strict";

  const StatusColorService = {
    // Cache for status colors by entity type
    statusCache: {},

    // Cache timeout (5 minutes)
    cacheTimeout: 5 * 60 * 1000,

    // Base URL for API
    baseUrl: "/rest/scriptrunner/latest/custom",

    // Entity types that have dynamic status endpoints
    entityTypesWithEndpoints: ["Step", "Instruction"],

    // Hardcoded fallback colors for entity types without endpoints
    fallbackColors: {
      Migration: {
        PLANNING: "#FFA500",
        IN_PROGRESS: "#0066CC",
        COMPLETED: "#00AA00",
        CANCELLED: "#CC0000",
      },
      Plan: {
        PLANNING: "#FFA500",
        IN_PROGRESS: "#0066CC",
        COMPLETED: "#00AA00",
        CANCELLED: "#CC0000",
      },
      Iteration: {
        PLANNING: "#FFA500",
        IN_PROGRESS: "#0066CC",
        COMPLETED: "#00AA00",
        CANCELLED: "#CC0000",
      },
      Sequence: {
        PLANNING: "#FFA500",
        IN_PROGRESS: "#0066CC",
        COMPLETED: "#00AA00",
        CANCELLED: "#CC0000",
      },
      Phase: {
        PLANNING: "#FFA500",
        IN_PROGRESS: "#0066CC",
        COMPLETED: "#00AA00",
        CANCELLED: "#CC0000",
      },
      Control: {
        TODO: "#FFFF00",
        PASSED: "#00AA00",
        FAILED: "#FF0000",
        CANCELLED: "#CC0000",
      },
    },

    /**
     * Fetch statuses for a given entity type
     * @param {string} entityType - The entity type (Migration, Iteration, Step, etc.)
     * @returns {Promise<Array>} Array of status objects with colors
     */
    fetchStatuses: async function (entityType) {
      const cacheKey = entityType.toLowerCase();
      const now = Date.now();

      // Check cache
      if (
        this.statusCache[cacheKey] &&
        this.statusCache[cacheKey].timestamp &&
        now - this.statusCache[cacheKey].timestamp < this.cacheTimeout
      ) {
        return this.statusCache[cacheKey].data;
      }

      // Check if this entity type has a dynamic endpoint
      if (!this.entityTypesWithEndpoints.includes(entityType)) {
        // Use fallback colors for entities without endpoints
        const fallback = this.fallbackColors[entityType];
        if (fallback) {
          const statuses = Object.entries(fallback).map(([name, color]) => ({
            name: name,
            color: color,
            type: entityType,
          }));

          // Cache the fallback results
          this.statusCache[cacheKey] = {
            data: statuses,
            timestamp: now,
          };

          console.log(
            `Using fallback colors for ${entityType}:`,
            statuses.length,
            "statuses",
          );
          return statuses;
        } else {
          console.warn(
            `No fallback colors defined for entity type: ${entityType}`,
          );
          return [];
        }
      }

      try {
        // Use the unified status API with entityType parameter
        const response = await fetch(
          `${this.baseUrl}/status?entityType=${entityType}`,
        );

        if (!response.ok) {
          console.warn(
            `Failed to fetch statuses for ${entityType}:`,
            response.status,
          );
          return [];
        }

        const statuses = await response.json();

        // Cache the results
        this.statusCache[cacheKey] = {
          data: statuses,
          timestamp: now,
        };

        return statuses;
      } catch (error) {
        console.error(`Error fetching statuses for ${entityType}:`, error);
        return [];
      }
    },

    /**
     * Get status color by name and entity type
     * @param {string} statusName - The status name (e.g., "PENDING", "COMPLETED")
     * @param {string} entityType - The entity type (e.g., "Step", "Migration")
     * @returns {Promise<string|null>} The hex color code or null if not found
     */
    getStatusColor: async function (statusName, entityType = "Step") {
      if (!statusName) return null;

      const statuses = await this.fetchStatuses(entityType);
      const status = statuses.find(
        (s) => s.name === statusName || s.name === statusName.toUpperCase(),
      );

      return status ? status.color : null;
    },

    /**
     * Get all statuses for an entity type as a map
     * @param {string} entityType - The entity type
     * @returns {Promise<Object>} Map of status name to status object
     */
    getStatusMap: async function (entityType = "Step") {
      const statuses = await this.fetchStatuses(entityType);
      const map = {};

      statuses.forEach((status) => {
        map[status.name] = status;
      });

      return map;
    },

    /**
     * Format a status badge with dynamic color
     * @param {string} statusName - The status name
     * @param {string} entityType - The entity type (optional, defaults to "Step")
     * @param {string} fallbackColor - Fallback color if status not found
     * @returns {Promise<string>} HTML string with styled status badge
     */
    formatStatusBadge: async function (
      statusName,
      entityType = "Step",
      fallbackColor = "#999999",
    ) {
      if (!statusName) return "";

      const color =
        (await this.getStatusColor(statusName, entityType)) || fallbackColor;

      // Calculate contrasting text color
      const textColor = this.getContrastingTextColor(color);

      return `<span class="status-badge" style="background-color: ${color}; color: ${textColor}; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; display: inline-block;">${statusName}</span>`;
    },

    /**
     * Calculate contrasting text color (white or black) based on background
     * @param {string} hexColor - Hex color code
     * @returns {string} "#ffffff" or "#000000"
     */
    getContrastingTextColor: function (hexColor) {
      if (!hexColor) return "#ffffff";

      // Remove # if present
      const hex = hexColor.replace("#", "");

      // Convert to RGB
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      // Calculate luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Return white for dark backgrounds, black for light
      return luminance > 0.5 ? "#000000" : "#ffffff";
    },

    /**
     * Apply status colors to all elements with data-status attribute
     * @param {HTMLElement} container - Container element to search within
     * @param {string} entityType - Entity type for status lookup
     */
    applyStatusColors: async function (
      container = document,
      entityType = "Step",
    ) {
      const statusMap = await this.getStatusMap(entityType);
      const elements = container.querySelectorAll("[data-status]");

      elements.forEach((element) => {
        const statusName = element.getAttribute("data-status");
        const status =
          statusMap[statusName] || statusMap[statusName.toUpperCase()];

        if (status && status.color) {
          element.style.backgroundColor = status.color;
          element.style.color = this.getContrastingTextColor(status.color);

          // Add standard badge styling if not already styled
          if (!element.classList.contains("status-badge")) {
            element.classList.add("status-badge");
            element.style.padding = "4px 8px";
            element.style.borderRadius = "3px";
            element.style.fontSize = "11px";
            element.style.fontWeight = "600";
            element.style.display = "inline-block";
          }
        }
      });
    },

    /**
     * Clear the status cache
     */
    clearCache: function () {
      this.statusCache = {};
    },

    /**
     * Pre-load statuses for multiple entity types
     * @param {Array<string>} entityTypes - Array of entity types to preload
     */
    preloadStatuses: async function (
      entityTypes = [
        "Migration",
        "Iteration",
        "Step",
        "Phase",
        "Sequence",
        "Plan",
        "Control",
        "Instruction",
      ],
    ) {
      console.log("Preloading statuses for entity types:", entityTypes);
      const promises = entityTypes.map((type) => this.fetchStatuses(type));
      await Promise.all(promises);
      console.log("Status preloading complete");
    },
  };

  // Export to global scope
  window.StatusColorService = StatusColorService;
})();
