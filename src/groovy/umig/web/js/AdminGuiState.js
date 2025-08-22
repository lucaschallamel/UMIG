/**
 * Admin GUI State Management Module
 *
 * Manages application state including authentication, current section,
 * pagination, search, and data caching.
 */

(function () {
  "use strict";

  // State management
  const AdminGuiState = {
    // Current application state
    state: {
      // Authentication
      isAuthenticated: false,
      currentUser: null,

      // Navigation
      currentSection: "users",
      currentEntity: "users",

      // Pagination
      currentPage: 1,
      pageSize: 50,
      totalItems: 0,
      totalPages: 0,

      // Search and filtering
      searchTerm: "",
      sortField: null,
      sortDirection: "asc",
      filters: {},

      // UI state
      selectedRows: new Set(),
      loading: false,

      // Data cache
      data: {},
      pagination: null,

      // Configuration
      config: window.UMIG_CONFIG || {},
    },

    /**
     * Initialize state
     */
    init: function () {
      this.loadFromStorage();
      this.setupAutoSave();
    },

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState: function () {
      return this.state;
    },

    /**
     * Set state property
     * @param {string} key - State key
     * @param {*} value - State value
     */
    setState: function (key, value) {
      this.state[key] = value;
      this.saveToStorage();
      this.notifyStateChange(key, value);
    },

    /**
     * Update multiple state properties
     * @param {Object} updates - Object with state updates
     */
    updateState: function (updates) {
      Object.keys(updates).forEach((key) => {
        this.state[key] = updates[key];
      });
      this.saveToStorage();
      this.notifyStateChange("multiple", updates);
    },

    /**
     * Reset state to defaults
     */
    resetState: function () {
      this.state = {
        isAuthenticated: false,
        currentUser: null,
        currentSection: "users",
        currentEntity: "users",
        currentPage: 1,
        pageSize: 50,
        totalItems: 0,
        totalPages: 0,
        searchTerm: "",
        sortField: null,
        sortDirection: "asc",
        filters: {},
        selectedRows: new Set(),
        loading: false,
        data: {},
        pagination: null,
        config: window.UMIG_CONFIG || {},
      };
      this.saveToStorage();
    },

    /**
     * Authentication state methods
     */
    authentication: {
      /**
       * Set authenticated user
       * @param {Object} user - User object
       */
      login: function (user) {
        AdminGuiState.updateState({
          isAuthenticated: true,
          currentUser: user,
        });
      },

      /**
       * Clear authentication
       */
      logout: function () {
        AdminGuiState.updateState({
          isAuthenticated: false,
          currentUser: null,
        });
      },

      /**
       * Check if user is authenticated
       * @returns {boolean} Authentication status
       */
      isAuthenticated: function () {
        return AdminGuiState.state.isAuthenticated;
      },

      /**
       * Get current user
       * @returns {Object|null} Current user
       */
      getCurrentUser: function () {
        return AdminGuiState.state.currentUser;
      },

      /**
       * Check if user has permission
       * @param {string} permission - Permission to check
       * @returns {boolean} Whether user has permission
       */
      hasPermission: function (permission) {
        const user = AdminGuiState.state.currentUser;
        if (!user) return false;

        if (user.usr_is_admin) return true;
        if (permission === "superadmin") return user.usr_is_admin;

        return true; // Default allow for now
      },
    },

    /**
     * Navigation state methods
     */
    navigation: {
      /**
       * Map navigation sections to entity configurations
       * @param {string} section - Section name from navigation
       * @returns {string} Entity configuration key
       */
      mapSectionToEntity: function (section) {
        // Mapping for navigation data-section to EntityConfig keys
        const sectionMapping = {
          // Basic entities (direct mapping)
          'users': 'users',
          'teams': 'teams',
          'environments': 'environments',
          'applications': 'applications',
          'labels': 'labels',
          
          // Migration-related entities (direct mapping)
          'migrations': 'migrations',
          
          // Instance entities (navigation uses different names)
          'plans': 'plans',
          'sequences': 'sequences',
          'phases': 'phases',
          'steps': 'instructions', // Steps section shows instructions
          
          // Master entities (for future use)
          'master-plans': 'plansmaster',
          'master-sequences': 'sequencesmaster',
          'master-phases': 'phasesmaster',
          'master-steps': 'steps-master',
          'master-controls': 'controls-master',
          
          // Other entities
          'iterations': 'iterations',
          'controls': 'controls-instance',
          'audit-logs': 'audit-logs',
        };
        
        return sectionMapping[section] || section;
      },

      /**
       * Set current section
       * @param {string} section - Section name
       */
      setCurrentSection: function (section) {
        const entityKey = this.mapSectionToEntity(section);
        AdminGuiState.updateState({
          currentSection: section,
          currentEntity: entityKey,
          currentPage: 1,
          searchTerm: "",
          sortField: null,
          sortDirection: "asc",
          selectedRows: new Set(),
          filters: {},
        });

        // Update UI after section change
        setTimeout(() => {
          if (window.TableManager && window.TableManager.updateSelectionUI) {
            window.TableManager.updateSelectionUI();
          }
        }, 100);
      },

      /**
       * Get current section
       * @returns {string} Current section
       */
      getCurrentSection: function () {
        return AdminGuiState.state.currentSection;
      },

      /**
       * Get current entity
       * @returns {string} Current entity
       */
      getCurrentEntity: function () {
        return AdminGuiState.state.currentEntity;
      },
    },

    /**
     * Pagination state methods
     */
    pagination: {
      /**
       * Set pagination data
       * @param {Object} paginationData - Pagination data from API
       */
      setPagination: function (paginationData) {
        AdminGuiState.updateState({
          currentPage: paginationData.currentPage || 1,
          pageSize: paginationData.pageSize || 50,
          totalItems: paginationData.totalItems || 0,
          totalPages: paginationData.totalPages || 0,
          pagination: paginationData,
        });
      },

      /**
       * Set current page
       * @param {number} page - Page number
       */
      setCurrentPage: function (page) {
        AdminGuiState.setState("currentPage", page);
      },

      /**
       * Set page size
       * @param {number} size - Page size
       */
      setPageSize: function (size) {
        AdminGuiState.updateState({
          pageSize: size,
          currentPage: 1,
        });
      },

      /**
       * Get pagination info
       * @returns {Object} Pagination info
       */
      getPaginationInfo: function () {
        return {
          currentPage: AdminGuiState.state.currentPage,
          pageSize: AdminGuiState.state.pageSize,
          totalItems: AdminGuiState.state.totalItems,
          totalPages: AdminGuiState.state.totalPages,
        };
      },
    },

    /**
     * Search and filtering state methods
     */
    search: {
      /**
       * Set search term
       * @param {string} term - Search term
       */
      setSearchTerm: function (term) {
        AdminGuiState.updateState({
          searchTerm: term,
          currentPage: 1,
        });
      },

      /**
       * Set sort field and direction
       * @param {string} field - Sort field
       * @param {string} direction - Sort direction
       */
      setSort: function (field, direction = "asc") {
        AdminGuiState.updateState({
          sortField: field,
          sortDirection: direction,
          currentPage: 1,
        });
      },

      /**
       * Set filter value
       * @param {string} key - Filter key
       * @param {*} value - Filter value
       */
      setFilter: function (key, value) {
        const filters = { ...AdminGuiState.state.filters };
        if (value) {
          filters[key] = value;
        } else {
          delete filters[key];
        }
        AdminGuiState.updateState({
          filters: filters,
          currentPage: 1,
        });
      },

      /**
       * Clear all filters
       */
      clearFilters: function () {
        AdminGuiState.updateState({
          filters: {},
          searchTerm: "",
          currentPage: 1,
        });
      },

      /**
       * Get current search and filter state
       * @returns {Object} Search and filter state
       */
      getSearchState: function () {
        return {
          searchTerm: AdminGuiState.state.searchTerm,
          sortField: AdminGuiState.state.sortField,
          sortDirection: AdminGuiState.state.sortDirection,
          filters: { ...AdminGuiState.state.filters },
        };
      },
    },

    /**
     * Data caching methods
     */
    cache: {
      /**
       * Set cached data
       * @param {string} key - Cache key
       * @param {*} data - Data to cache
       */
      setData: function (key, data) {
        const cache = { ...AdminGuiState.state.data };
        cache[key] = data;
        AdminGuiState.setState("data", cache);
      },

      /**
       * Get cached data
       * @param {string} key - Cache key
       * @returns {*} Cached data
       */
      getData: function (key) {
        return AdminGuiState.state.data[key];
      },

      /**
       * Clear cached data
       * @param {string} key - Cache key (optional, clears all if not provided)
       */
      clearData: function (key) {
        if (key) {
          const cache = { ...AdminGuiState.state.data };
          delete cache[key];
          AdminGuiState.setState("data", cache);
        } else {
          AdminGuiState.setState("data", {});
        }
      },
    },

    /**
     * Selection state methods
     */
    selection: {
      /**
       * Select row
       * @param {string} id - Row ID
       */
      selectRow: function (id) {
        const selected = new Set(AdminGuiState.state.selectedRows);
        selected.add(id);
        AdminGuiState.setState("selectedRows", selected);
      },

      /**
       * Deselect row
       * @param {string} id - Row ID
       */
      deselectRow: function (id) {
        const selected = new Set(AdminGuiState.state.selectedRows);
        selected.delete(id);
        AdminGuiState.setState("selectedRows", selected);
      },

      /**
       * Toggle row selection
       * @param {string} id - Row ID
       */
      toggleRow: function (id) {
        const selected = new Set(AdminGuiState.state.selectedRows);
        if (selected.has(id)) {
          selected.delete(id);
        } else {
          selected.add(id);
        }
        AdminGuiState.setState("selectedRows", selected);
      },

      /**
       * Clear all selections
       */
      clearSelection: function () {
        AdminGuiState.setState("selectedRows", new Set());
      },

      /**
       * Get selected rows
       * @returns {Array} Array of selected row IDs
       */
      getSelectedRows: function () {
        return Array.from(AdminGuiState.state.selectedRows);
      },
    },

    /**
     * Loading state methods
     */
    loading: {
      /**
       * Set loading state
       * @param {boolean} isLoading - Loading state
       */
      setLoading: function (isLoading) {
        AdminGuiState.setState("loading", isLoading);
      },

      /**
       * Get loading state
       * @returns {boolean} Loading state
       */
      isLoading: function () {
        return AdminGuiState.state.loading;
      },
    },

    /**
     * State change notification system
     */
    listeners: [],

    /**
     * Add state change listener
     * @param {Function} listener - Listener function
     */
    addListener: function (listener) {
      this.listeners.push(listener);
    },

    /**
     * Remove state change listener
     * @param {Function} listener - Listener function
     */
    removeListener: function (listener) {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    },

    /**
     * Notify state change
     * @param {string} key - Changed key
     * @param {*} value - New value
     */
    notifyStateChange: function (key, value) {
      this.listeners.forEach((listener) => {
        try {
          listener(key, value, this.state);
        } catch (error) {
          console.error("Error in state change listener:", error);
        }
      });
    },

    /**
     * Persistence methods
     */
    storageKey: "umig_admin_gui_state",

    /**
     * Load state from local storage
     */
    loadFromStorage: function () {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsedState = JSON.parse(stored);
          // Only restore certain properties
          this.state.currentSection = parsedState.currentSection || "users";
          this.state.currentEntity = parsedState.currentEntity || "users";
          this.state.pageSize = parsedState.pageSize || 50;
          this.state.sortField = parsedState.sortField || null;
          this.state.sortDirection = parsedState.sortDirection || "asc";
        }
      } catch (error) {
        console.warn("Failed to load state from storage:", error);
      }
    },

    /**
     * Save state to local storage
     */
    saveToStorage: function () {
      try {
        const stateToSave = {
          currentSection: this.state.currentSection,
          currentEntity: this.state.currentEntity,
          pageSize: this.state.pageSize,
          sortField: this.state.sortField,
          sortDirection: this.state.sortDirection,
        };
        localStorage.setItem(this.storageKey, JSON.stringify(stateToSave));
      } catch (error) {
        console.warn("Failed to save state to storage:", error);
      }
    },

    /**
     * Setup auto-save timer
     */
    setupAutoSave: function () {
      setInterval(() => {
        this.saveToStorage();
      }, 30000); // Save every 30 seconds
    },
  };

  // Export to global namespace
  window.AdminGuiState = AdminGuiState;
})();
