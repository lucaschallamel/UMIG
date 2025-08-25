/**
 * Admin GUI Controller
 *
 * Main controller that orchestrates all modules and handles high-level
 * application flow, navigation, and data management.
 */

(function () {
  "use strict";

  // Admin GUI Controller
  const AdminGuiController = {
    /**
     * Initialize the admin GUI application
     */
    init: function () {
      console.log("UMIG Admin GUI Controller initializing...");

      // Initialize all modules
      this.initializeModules();

      // Set up global references for backward compatibility
      this.setupGlobalReferences();

      // Initialize the application
      this.initializeApplication();
    },

    /**
     * Initialize all modules
     */
    initializeModules: function () {
      // Initialize modules in dependency order
      if (window.AdminGuiState) {
        window.AdminGuiState.init();
      }

      if (window.ApiClient) {
        window.ApiClient.init();
      }

      if (window.AuthenticationManager) {
        window.AuthenticationManager.init();
      }

      if (window.TableManager) {
        window.TableManager.init();
      }

      if (window.ModalManager) {
        window.ModalManager.init();
      }
    },

    /**
     * Set up global references for backward compatibility
     */
    setupGlobalReferences: function () {
      // Create global adminGui object for backward compatibility
      window.adminGui = {
        // State management
        state: window.AdminGuiState ? window.AdminGuiState.getState() : {},

        // Configuration
        config: window.UMIG_CONFIG || {},

        // API endpoints
        api: window.EntityConfig ? window.EntityConfig.getApiConfig() : {},

        // Entity configurations
        entities: window.EntityConfig
          ? window.EntityConfig.getAllEntities()
          : {},

        // Main controller methods
        init: this.init.bind(this),
        loadCurrentSection: this.loadCurrentSection.bind(this),
        refreshCurrentSection: this.refreshCurrentSection.bind(this),
        handleNavigation: this.handleNavigation.bind(this),
        handleSearch: this.handleSearch.bind(this),
        deleteEntity: this.deleteEntity.bind(this),

        // Authentication methods
        handleLogin: window.AuthenticationManager
          ? window.AuthenticationManager.handleLogin.bind(
              window.AuthenticationManager,
            )
          : null,
        handleLogout: window.AuthenticationManager
          ? window.AuthenticationManager.handleLogout.bind(
              window.AuthenticationManager,
            )
          : null,

        // Modal methods
        showEditModal: window.ModalManager
          ? window.ModalManager.showEditModal.bind(window.ModalManager)
          : null,
        showViewModal: window.ModalManager
          ? window.ModalManager.showViewModal.bind(window.ModalManager)
          : null,
        showAssociateApplicationModal: window.ModalManager
          ? window.ModalManager.showAssociateApplicationModal.bind(
              window.ModalManager,
            )
          : null,
        showAssociateIterationModal: window.ModalManager
          ? window.ModalManager.showAssociateIterationModal.bind(
              window.ModalManager,
            )
          : null,

        // Utility methods
        showNotification: window.UiUtils
          ? window.UiUtils.showNotification.bind(window.UiUtils)
          : null,

        // Backward compatibility methods
        bindEvents: this.bindEvents.bind(this),
        bindModalEvents: this.bindModalEvents.bind(this),
        bindTableEvents: this.bindTableEvents.bind(this),
      };
    },

    /**
     * Initialize the application
     */
    initializeApplication: function () {
      this.bindEvents();
      this.checkInitialState();
    },

    /**
     * Bind global events
     */
    bindEvents: function () {
      // Navigation events
      document.addEventListener("click", (e) => {
        if (e.target.matches(".nav-item")) {
          e.preventDefault();
          this.handleNavigation(e.target);
        }
      });

      // Search functionality
      const searchInput = document.getElementById("globalSearch");
      if (searchInput) {
        let searchTimeout;

        // Input event handler with minimum character threshold
        searchInput.addEventListener("input", (e) => {
          clearTimeout(searchTimeout);
          const searchTerm = e.target.value;

          // Update clear button visibility immediately
          this.updateSearchClearButton();

          // Only search if 3 or more characters, or if clearing the search
          if (searchTerm.length >= 3 || searchTerm.length === 0) {
            searchTimeout = setTimeout(() => {
              this.handleSearch(searchTerm);
            }, 300);
          }
        });

        // Enter key handler for immediate search
        searchInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const searchTerm = e.target.value;

            // Only search if 3 or more characters, or if clearing the search
            if (searchTerm.length >= 3 || searchTerm.length === 0) {
              clearTimeout(searchTimeout);
              this.handleSearch(searchTerm);
            }
          }
        });
      }

      // Search clear button functionality
      const searchClearBtn = document.getElementById("searchClearBtn");
      if (searchClearBtn) {
        searchClearBtn.addEventListener("click", () => {
          const searchInput = document.getElementById("globalSearch");
          if (searchInput) {
            searchInput.value = "";
            this.handleSearch("");
            this.updateSearchClearButton();
          }
        });
      }

      // Add new button
      const addNewBtn = document.getElementById("addNewBtn");
      if (addNewBtn) {
        addNewBtn.addEventListener("click", () => {
          if (window.ModalManager) {
            window.ModalManager.showEditModal(null);
          }
        });
      }

      // Refresh button
      const refreshBtn = document.getElementById("refreshBtn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          this.refreshCurrentSection();
        });
      }

      // Filter controls
      this.bindFilterEvents();

      // Bulk actions (only bind if bulk actions are enabled)
      if (
        window.EntityConfig &&
        window.EntityConfig.getFeatureFlag("enableBulkActions")
      ) {
        this.bindBulkActionsEvents();
      }

      // Initialize search clear button visibility
      this.updateSearchClearButton();

      // Initialize feature flag-based UI visibility
      this.updateFeatureFlagUI();
    },

    /**
     * Bind filter events
     */
    bindFilterEvents: function () {
      const filterSelects = document.querySelectorAll(".filter-select");
      filterSelects.forEach((select) => {
        select.addEventListener("change", (e) => {
          const filterKey = e.target.dataset.filter;
          const filterValue = e.target.value;

          if (window.AdminGuiState) {
            window.AdminGuiState.search.setFilter(filterKey, filterValue);
          }

          this.loadCurrentSection();
        });
      });
    },

    /**
     * Bind bulk actions events
     */
    bindBulkActionsEvents: function () {
      // Only bind if bulk actions are enabled via feature flag
      if (
        !window.EntityConfig ||
        !window.EntityConfig.getFeatureFlag("enableBulkActions")
      ) {
        return;
      }

      const bulkActionsBtn = document.getElementById("bulkActionsBtn");
      if (bulkActionsBtn) {
        bulkActionsBtn.addEventListener("click", () => {
          this.showBulkActionsMenu();
        });
      }
    },

    /**
     * Show bulk actions menu
     */
    showBulkActionsMenu: function () {
      // Early return if bulk actions are disabled
      if (
        !window.EntityConfig ||
        !window.EntityConfig.getFeatureFlag("enableBulkActions")
      ) {
        return;
      }

      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const selectedRows = state.selectedRows || new Set();
      const currentEntity = state.currentEntity || "users";

      if (selectedRows.size === 0) {
        if (window.UiUtils) {
          window.UiUtils.showNotification("No items selected", "warning");
        }
        return;
      }

      // Define bulk actions for different entities
      const bulkActions = this.getBulkActionsForEntity(currentEntity);

      if (bulkActions.length === 0) {
        if (window.UiUtils) {
          window.UiUtils.showNotification(
            "No bulk actions available for this entity",
            "info",
          );
        }
        return;
      }

      this.showBulkActionsDialog(bulkActions, selectedRows, currentEntity);
    },

    /**
     * Get bulk actions for entity
     * @param {string} entityType - Entity type
     * @returns {Array} Array of bulk actions
     */
    getBulkActionsForEntity: function (entityType) {
      // Try to get bulk actions from EntityConfig first
      if (window.EntityConfig) {
        const configActions =
          window.EntityConfig.getEntityBulkActions(entityType);
        if (configActions.length > 0) {
          return configActions;
        }
      }

      // Fallback to default actions
      const defaultActions = {
        users: [
          {
            id: "activate",
            label: "Activate Users",
            icon: "✅",
            requiresInput: false,
          },
          {
            id: "deactivate",
            label: "Deactivate Users",
            icon: "❌",
            requiresInput: false,
          },
        ],
        default: [
          {
            id: "export_selected",
            label: "Export Selected",
            icon: "📄",
            requiresInput: false,
          },
        ],
      };

      return defaultActions[entityType] || defaultActions.default;
    },

    /**
     * Show bulk actions dialog
     * @param {Array} actions - Available actions
     * @param {Set} selectedRows - Selected row IDs
     * @param {string} entityType - Entity type
     */
    showBulkActionsDialog: function (actions, selectedRows, entityType) {
      const selectedCount = selectedRows.size;

      // Create modal content
      let modalContent = `
        <div class="bulk-actions-dialog">
          <p><strong>${selectedCount} item(s) selected</strong></p>
          <div class="bulk-actions-list">
      `;

      actions.forEach((action) => {
        modalContent += `
          <div class="bulk-action-item" data-action="${action.id}">
            <span class="action-icon">${action.icon}</span>
            <span class="action-label">${action.label}</span>
          </div>
        `;
      });

      modalContent += `
          </div>
        </div>
      `;

      // Use a simple dropdown approach since showCustomDialog doesn't exist
      // Create a temporary dropdown menu
      const bulkActionsBtn = document.getElementById("bulkActionsButton");
      if (bulkActionsBtn) {
        // Remove any existing dropdown
        const existingDropdown = document.querySelector(
          ".bulk-actions-dropdown",
        );
        if (existingDropdown) {
          existingDropdown.remove();
        }

        // Create dropdown menu
        const dropdown = document.createElement("div");
        dropdown.className = "bulk-actions-dropdown aui-dropdown2";
        dropdown.style.position = "absolute";
        dropdown.style.zIndex = "1000";
        dropdown.style.background = "white";
        dropdown.style.border = "1px solid #ccc";
        dropdown.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
        dropdown.style.padding = "10px";
        dropdown.style.minWidth = "200px";

        // Position below button
        const rect = bulkActionsBtn.getBoundingClientRect();
        dropdown.style.top = rect.bottom + 5 + "px";
        dropdown.style.left = rect.left + "px";

        dropdown.innerHTML = `
          <div style="margin-bottom: 10px; font-weight: bold;">
            ${selectedCount} item(s) selected
          </div>
          ${actions
            .map(
              (action) => `
            <div class="bulk-action-option" data-action="${action.id}" 
                 style="padding: 5px 10px; cursor: pointer; hover: background-color: #f0f0f0;">
              ${action.icon} ${action.label}
            </div>
          `,
            )
            .join("")}
        `;

        document.body.appendChild(dropdown);

        // Add click handlers
        dropdown.querySelectorAll(".bulk-action-option").forEach((option) => {
          option.addEventListener("click", (e) => {
            const actionId = e.currentTarget.dataset.action;
            const action = actions.find((a) => a.id === actionId);
            if (action) {
              this.executeBulkAction(action, selectedRows, entityType);
            }
            dropdown.remove();
          });

          // Add hover effect
          option.addEventListener("mouseenter", (e) => {
            e.currentTarget.style.backgroundColor = "#f0f0f0";
          });
          option.addEventListener("mouseleave", (e) => {
            e.currentTarget.style.backgroundColor = "white";
          });
        });

        // Close dropdown on outside click
        setTimeout(() => {
          document.addEventListener("click", function closeDropdown(e) {
            if (!dropdown.contains(e.target) && e.target !== bulkActionsBtn) {
              dropdown.remove();
              document.removeEventListener("click", closeDropdown);
            }
          });
        }, 100);
      } else {
        // Fallback to basic prompt
        const actionLabels = actions
          .map((a) => `${a.icon} ${a.label}`)
          .join("\n");
        const result = confirm(
          `Select bulk action for ${selectedCount} items:\n\n${actionLabels}\n\nProceed with first action?`,
        );
        if (result && actions.length > 0) {
          this.executeBulkAction(actions[0], selectedRows, entityType);
        }
      }
    },

    /**
     * Execute bulk action
     * @param {Object} action - Action to execute
     * @param {Set} selectedRows - Selected row IDs
     * @param {string} entityType - Entity type
     */
    executeBulkAction: function (action, selectedRows, entityType) {
      const selectedCount = selectedRows.size;

      // Generate confirm message
      let confirmMessage =
        action.confirmMessage ||
        `Are you sure you want to perform "${action.label}" on ${selectedCount} selected item(s)?`;

      if (confirmMessage.includes("{count}")) {
        confirmMessage = confirmMessage.replace("{count}", selectedCount);
      }

      // Show confirmation
      if (window.UiUtils) {
        window.UiUtils.showConfirmDialog(confirmMessage, () => {
          this.performBulkAction(action, Array.from(selectedRows), entityType);
        });
      } else {
        if (confirm(confirmMessage)) {
          this.performBulkAction(action, Array.from(selectedRows), entityType);
        }
      }
    },

    /**
     * Perform the actual bulk action
     * @param {Object} action - Action to perform
     * @param {Array} selectedIds - Selected item IDs
     * @param {string} entityType - Entity type
     */
    performBulkAction: function (action, selectedIds, entityType) {
      // For now, implement basic actions
      switch (action.id) {
        case "update_status":
          this.performBulkStatusUpdate(selectedIds, entityType);
          break;
        case "export_selected":
          this.performBulkExport(selectedIds, entityType);
          break;
        case "activate":
          this.performBulkActivation(selectedIds, entityType, true);
          break;
        case "deactivate":
          this.performBulkActivation(selectedIds, entityType, false);
          break;
        default:
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              `Bulk action '${action.label}' not yet implemented`,
              "info",
            );
          }
      }
    },

    /**
     * Perform bulk status update
     * @param {Array} selectedIds - Selected item IDs
     * @param {string} entityType - Entity type
     */
    performBulkStatusUpdate: function (selectedIds, entityType) {
      // This would need to be implemented with proper API calls
      console.log("Bulk status update for", entityType, selectedIds);

      if (window.UiUtils) {
        window.UiUtils.showNotification(
          `Bulk status update initiated for ${selectedIds.length} ${entityType}`,
          "info",
        );
      }

      // Clear selection after action
      if (window.AdminGuiState) {
        window.AdminGuiState.selection.clearSelection();
      }

      // Refresh the table
      this.loadCurrentSection();
    },

    /**
     * Perform bulk export
     * @param {Array} selectedIds - Selected item IDs
     * @param {string} entityType - Entity type
     */
    performBulkExport: function (selectedIds, entityType) {
      console.log("Bulk export for", entityType, selectedIds);

      if (window.UiUtils) {
        window.UiUtils.showNotification(
          `Exporting ${selectedIds.length} ${entityType}...`,
          "info",
        );
      }

      // This would trigger a download or export process
      // For now, just log the action
    },

    /**
     * Perform bulk activation/deactivation
     * @param {Array} selectedIds - Selected item IDs
     * @param {string} entityType - Entity type
     * @param {boolean} activate - Whether to activate (true) or deactivate (false)
     */
    performBulkActivation: function (selectedIds, entityType, activate) {
      console.log(
        `Bulk ${activate ? "activation" : "deactivation"} for`,
        entityType,
        selectedIds,
      );

      if (window.UiUtils) {
        window.UiUtils.showNotification(
          `${activate ? "Activating" : "Deactivating"} ${selectedIds.length} ${entityType}...`,
          "info",
        );
      }

      // Clear selection after action
      if (window.AdminGuiState) {
        window.AdminGuiState.selection.clearSelection();
      }

      // Refresh the table
      this.loadCurrentSection();
    },

    /**
     * Check initial state and show appropriate interface
     */
    checkInitialState: function () {
      // Wait for DOM to be ready
      setTimeout(() => {
        if (window.AuthenticationManager) {
          window.AuthenticationManager.checkAuthStatus();
        } else {
          // Fallback if AuthenticationManager not available
          this.showLoginForm();
        }
      }, 100);
    },

    /**
     * Show login form (fallback)
     */
    showLoginForm: function () {
      const loginPage = document.getElementById("loginPage");
      const dashboardPage = document.getElementById("dashboardPage");

      if (loginPage) {
        loginPage.style.display = "flex";
      }
      if (dashboardPage) {
        dashboardPage.style.display = "none";
      }
    },

    /**
     * Map data-entity values to EntityConfig keys
     * @param {string} entity - Entity value from data-entity attribute
     * @returns {string} EntityConfig key
     */
    mapEntityToConfig: function (entity) {
      // Mapping for navigation data-entity to EntityConfig keys
      const entityMapping = {
        // Direct mappings (no change needed)
        users: "users",
        teams: "teams",
        environments: "environments",
        applications: "applications",
        labels: "labels",
        migrations: "migrations",

        // Instance entity mappings (navigation uses different names)
        plansinstance: "plansinstance", // FIXED: Map to plansinstance entity for PILOT section
        sequencesinstance: "sequences",
        phasesinstance: "phases",
        "steps-instance": "instructions", // Steps section shows instructions

        // Master entity mappings
        plansmaster: "plans", // Map to 'plans' which uses /plans/master endpoint for ADMIN section
        sequencesmaster: "sequencesmaster",
        phasesmaster: "phasesmaster",
        "steps-master": "steps-master",
        "controls-master": "controls-master",

        // Other entities
        iterations: "iterations",
        "controls-instance": "controls-instance",
        "audit-logs": "audit-logs",
      };

      return entityMapping[entity] || entity;
    },

    /**
     * Handle navigation
     * @param {HTMLElement} navItem - Navigation item element
     */
    handleNavigation: function (navItem) {
      const section = navItem.dataset.section;
      const entity = navItem.dataset.entity; // Get entity if specified
      if (!section) return;

      // Update active navigation
      document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.remove("active");
      });
      navItem.classList.add("active");

      // Update state
      if (window.AdminGuiState) {
        // If entity is explicitly specified, map it to correct EntityConfig key
        if (entity) {
          const entityKey = this.mapEntityToConfig(entity);
          window.AdminGuiState.updateState({
            currentSection: section,
            currentEntity: entityKey,
            currentPage: 1,
            searchTerm: "",
            sortField: null,
            sortDirection: "asc",
            selectedRows: new Set(),
            filters: {},
          });
        } else {
          window.AdminGuiState.navigation.setCurrentSection(section);
        }
      }

      // Load section
      this.loadCurrentSection();
    },

    /**
     * Handle search
     * @param {string} searchTerm - Search term
     */
    handleSearch: function (searchTerm) {
      if (window.AdminGuiState) {
        window.AdminGuiState.search.setSearchTerm(searchTerm);
      }

      this.loadCurrentSection();
    },

    /**
     * Update search clear button visibility
     */
    updateSearchClearButton: function () {
      const searchInput = document.getElementById("globalSearch");
      const searchClearBtn = document.getElementById("searchClearBtn");

      if (searchInput && searchClearBtn) {
        if (searchInput.value.length > 0) {
          searchClearBtn.style.display = "block";
        } else {
          searchClearBtn.style.display = "none";
        }
      }
    },

    /**
     * Update UI visibility based on feature flags
     */
    updateFeatureFlagUI: function () {
      if (!window.EntityConfig) {
        return;
      }

      // Show/hide Export button based on feature flag
      const exportBtn = document.getElementById("exportBtn");
      if (exportBtn) {
        if (window.EntityConfig.getFeatureFlag("enableExportButton")) {
          exportBtn.style.display = "inline-block";
        } else {
          exportBtn.style.display = "none";
        }
      }

      // Show/hide Bulk Actions button based on feature flag
      const bulkActionsBtn = document.getElementById("bulkActionsBtn");
      if (bulkActionsBtn) {
        if (window.EntityConfig.getFeatureFlag("enableBulkActions")) {
          bulkActionsBtn.style.display = "inline-block";
        } else {
          bulkActionsBtn.style.display = "none";
        }
      }
    },

    /**
     * Load current section
     */
    loadCurrentSection: function () {
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const currentEntity = state.currentEntity || "users";

      // Update content header
      this.updateContentHeader(currentEntity);

      // Load data
      this.loadEntityData(currentEntity);
    },

    /**
     * Refresh current section
     */
    refreshCurrentSection: function () {
      // Clear cache
      if (window.AdminGuiState) {
        const currentEntity = window.AdminGuiState.getState().currentEntity;
        window.AdminGuiState.cache.clearData(currentEntity);
      }

      // Reload section
      this.loadCurrentSection();
    },

    /**
     * Update content header
     * @param {string} entityType - Entity type
     */
    updateContentHeader: function (entityType) {
      const entity = window.EntityConfig
        ? window.EntityConfig.getEntity(entityType)
        : null;
      if (!entity) return;

      const titleEl = document.getElementById("contentTitle");
      const descriptionEl = document.getElementById("contentDescription");
      const addNewBtnText = document.getElementById("addNewBtnText");

      if (titleEl) {
        titleEl.textContent = entity.name;
      }
      if (descriptionEl) {
        descriptionEl.textContent = entity.description;
      }
      if (addNewBtnText) {
        // Convert "Users" to "Add New User", "Teams" to "Add New Team", etc.
        const singularName = entity.name.endsWith("s")
          ? entity.name.slice(0, -1)
          : entity.name;
        addNewBtnText.textContent = `Add New ${singularName}`;
      }
    },

    /**
     * Load entity data
     * @param {string} entityType - Entity type
     */
    loadEntityData: function (entityType) {
      const mainContent = document.getElementById("mainContent");
      if (!mainContent) return;

      console.log("Loading entity data for:", entityType);

      // Ensure we have the table container structure
      let tableContainer = mainContent.querySelector(".table-container");
      if (!tableContainer) {
        // Create the proper structure if it doesn't exist
        mainContent.innerHTML = `
                    <div class="table-container">
                        <div class="table-wrapper">
                            <table class="data-table" id="dataTable">
                                <thead id="tableHeader"></thead>
                                <tbody id="tableBody"></tbody>
                            </table>
                        </div>
                        <div class="table-footer" id="paginationContainer">
                            <div class="pagination-info">
                                <span id="paginationInfo">Loading...</span>
                            </div>
                            <div class="pagination-controls">
                                <button class="pagination-btn" id="firstPageBtn" disabled>⏮️</button>
                                <button class="pagination-btn" id="prevPageBtn" disabled>◀️</button>
                                <div class="page-numbers" id="pageNumbers"></div>
                                <button class="pagination-btn" id="nextPageBtn">▶️</button>
                                <button class="pagination-btn" id="lastPageBtn">⏭️</button>
                            </div>
                            <div class="page-size-selector">
                                <label for="pageSize">Show:</label>
                                <select id="pageSize">
                                    <option value="25">25</option>
                                    <option value="50" selected>50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                        </div>
                    </div>
                `;

        // No need to re-bind events - TableManager handles this via event delegation

        tableContainer = mainContent.querySelector(".table-container");
      }

      // Show loading state in the table wrapper
      const tableWrapper = tableContainer.querySelector(".table-wrapper");
      if (tableWrapper && window.UiUtils) {
        window.UiUtils.showLoading(tableWrapper);
      }

      // Get search parameters
      const searchParams = this.buildSearchParams();
      console.log("Search parameters:", searchParams);

      // Load data from API
      if (window.ApiClient) {
        window.ApiClient.entities
          .getAll(entityType, searchParams)
          .then((data) => {
            console.log("Raw API response for", entityType, ":", data);
            this.handleDataLoaded(data, entityType);
          })
          .catch((error) => {
            console.error("API error for", entityType, ":", error);
            this.handleDataError(error, entityType);
          });
      }
    },

    /**
     * Build search parameters
     * @returns {Object} Search parameters
     */
    buildSearchParams: function () {
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const currentEntity = state.currentEntity || "users";

      // Get entity configuration to check for defaultSort
      const entity = window.EntityConfig
        ? window.EntityConfig.getEntity(currentEntity)
        : null;

      // Apply defaultSort if no current sort is set
      let sortField = state.sortField || "";
      let sortDirection = state.sortDirection || "asc";

      if (!sortField && entity && entity.defaultSort) {
        sortField = entity.defaultSort.field;
        sortDirection = entity.defaultSort.direction || "asc";

        // Update the state with defaultSort to maintain consistency
        if (window.AdminGuiState) {
          window.AdminGuiState.updateState({
            sortField: sortField,
            sortDirection: sortDirection,
          });
        }
      }

      // API expects 'size' not 'pageSize', and 'sort'/'direction' not 'sortField'/'sortDirection'
      return {
        page: state.currentPage || 1,
        size: state.pageSize || 50, // Changed from pageSize to size
        search: state.searchTerm || "",
        sort: sortField, // Changed from sortField to sort
        direction: sortDirection,
        ...state.filters,
      };
    },

    /**
     * Handle data loaded
     * @param {Object} response - API response
     * @param {string} entityType - Entity type
     */
    handleDataLoaded: function (response, entityType) {
      console.log("API Response:", response);

      // Handle different response formats
      let data;
      let pagination = null;

      // Debug logging
      console.log("Response type:", typeof response);
      console.log("Has items?", response && response.items);
      console.log("Items is array?", response && Array.isArray(response.items));

      if (Array.isArray(response)) {
        data = response;
      } else if (response.content && Array.isArray(response.content)) {
        // Handle paginated response format (Users, Teams, etc.)
        data = response.content;
        pagination = {
          currentPage: response.pageNumber || 1,
          pageSize: response.pageSize || 50,
          totalItems: response.totalElements || 0,
          totalPages: response.totalPages || 1,
        };
      } else if (response.data && Array.isArray(response.data)) {
        data = response.data;
        pagination = response.pagination || null;
      } else if (response.results && Array.isArray(response.results)) {
        data = response.results;
        pagination = response.pagination || null;
      } else if (response.items && Array.isArray(response.items)) {
        // Handle response format from Labels API
        data = response.items;
        pagination = {
          currentPage: response.page || 1,
          pageSize: response.size || 50,
          totalItems: response.total || 0,
          totalPages: response.totalPages || 1,
        };
      } else if (typeof response === "object" && response !== null) {
        // If it's an object but not an array, wrap it in an array
        data = [response];
      } else {
        data = [];
      }

      console.log("Processed data:", data);
      console.log("Pagination:", pagination);

      // Update pagination state
      if (pagination && window.AdminGuiState) {
        window.AdminGuiState.pagination.setPagination(pagination);
      }

      // Cache data
      if (window.AdminGuiState) {
        window.AdminGuiState.cache.setData(entityType, data);
      }

      // Render table
      this.renderEntityTable(data, entityType);

      // Ensure pagination container is visible and render pagination
      setTimeout(() => {
        // Give DOM time to settle
        this.renderPagination();

        // Ensure pagination container is visible
        const paginationContainer = document.getElementById(
          "paginationContainer",
        );
        if (paginationContainer) {
          paginationContainer.style.display = "flex";
        }
      }, 100);
    },

    /**
     * Handle data error
     * @param {Error} error - Error object
     * @param {string} entityType - Entity type
     */
    handleDataError: function (error, entityType) {
      console.error("Failed to load data:", error);

      const mainContent = document.getElementById("mainContent");
      if (mainContent && window.UiUtils) {
        const self = this;
        window.UiUtils.showError(
          mainContent,
          `Failed to load ${entityType}. ${error.message}`,
          function () {
            self.loadEntityData(entityType);
          },
        );
      }
    },

    /**
     * Render entity table
     * @param {Array} data - Entity data
     * @param {string} entityType - Entity type
     */
    renderEntityTable: function (data, entityType) {
      // Find the table-container within mainContent
      const mainContent = document.getElementById("mainContent");
      if (!mainContent) return;

      // Get or create the table container
      let tableContainer = mainContent.querySelector(".table-container");
      if (!tableContainer) {
        // If table container doesn't exist, use mainContent
        tableContainer = mainContent;
      }

      if (window.TableManager) {
        window.TableManager.renderTable(data, entityType, tableContainer);
      }
    },

    /**
     * Render pagination
     */
    renderPagination: function () {
      // The pagination container should already exist in the HTML
      const paginationContainer = document.getElementById(
        "paginationContainer",
      );
      if (!paginationContainer) {
        console.warn("Pagination container not found");
        return;
      }

      if (window.TableManager) {
        window.TableManager.renderPagination(paginationContainer);
      }
    },

    /**
     * Delete entity
     * @param {string} id - Entity ID
     */
    deleteEntity: function (id) {
      const state = window.AdminGuiState ? window.AdminGuiState.getState() : {};
      const currentEntity = state.currentEntity || "users";

      if (!window.ApiClient) {
        console.error("API client not available");
        return;
      }

      window.ApiClient.entities
        .delete(currentEntity, id)
        .then(() => {
          if (window.UiUtils) {
            window.UiUtils.showNotification(
              `${currentEntity} deleted successfully`,
              "success",
            );
          }

          // Refresh table
          this.loadCurrentSection();
        })
        .catch((error) => {
          console.error("Failed to delete entity:", error);

          // Use the actual error message if available
          let errorMessage =
            error.message || `Failed to delete ${currentEntity}`;

          if (window.UiUtils) {
            window.UiUtils.showNotification(errorMessage, "error");
          }
        });
    },

    /**
     * Bind modal events (for backward compatibility)
     */
    bindModalEvents: function () {
      console.log("Modal events bound by ModalManager");
    },

    /**
     * Bind table events (for backward compatibility)
     */
    bindTableEvents: function () {
      console.log("Table events bound by TableManager");
    },

    /**
     * Get current user (for backward compatibility)
     * @returns {Object|null} Current user
     */
    getCurrentUser: function () {
      return window.AuthenticationManager
        ? window.AuthenticationManager.getCurrentUser()
        : null;
    },

    /**
     * Check if user is authenticated (for backward compatibility)
     * @returns {boolean} Authentication status
     */
    isAuthenticated: function () {
      return window.AuthenticationManager
        ? window.AuthenticationManager.isAuthenticated()
        : false;
    },

    /**
     * Check if user has permission (for backward compatibility)
     * @param {string} permission - Permission to check
     * @returns {boolean} Whether user has permission
     */
    hasPermission: function (permission) {
      return window.AuthenticationManager
        ? window.AuthenticationManager.hasPermission(permission)
        : false;
    },
  };

  // Export to global namespace
  window.AdminGuiController = AdminGuiController;

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      AdminGuiController.init();
    });
  } else {
    AdminGuiController.init();
  }
})();
