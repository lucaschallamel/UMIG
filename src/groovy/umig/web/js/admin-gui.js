/**
 * UMIG Admin GUI JavaScript Controller
 *
 * Main controller for the UMIG Administration interface.
 * Handles authentication, navigation, data management, and UI interactions.
 *
 * Features:
 * - Confluence user integration
 * - Role-based access control
 * - Dynamic content loading
 * - CRUD operations for all entities
 * - Real-time data refresh
 * - Search and filtering
 * - Pagination
 * - Modal forms
 */

(function () {
  "use strict";

  // Global Admin GUI namespace
  window.adminGui = {
    // Application state
    state: {
      isAuthenticated: false,
      currentUser: null,
      currentSection: "users",
      currentEntity: "users",
      currentPage: 1,
      pageSize: 50,
      searchTerm: "",
      sortField: null,
      sortDirection: "asc",
      selectedRows: new Set(),
      data: {},
      pagination: null,
      loading: false,
      teamFilter: null,
    },

    // Track active timeouts for proper cleanup and MutationObserver conflict avoidance
    activeTimeouts: new Set(),

    // Configuration from Groovy macro
    config: window.UMIG_CONFIG || {},

    // Component Migration Integration (US-087)
    componentManagers: {},
    featureToggle: null,
    performanceMonitor: null,

    // API endpoints
    api: {
      baseUrl: "/rest/scriptrunner/latest/custom",
      endpoints: {
        users: "/users",
        teams: "/teams",
        environments: "/environments",
        applications: "/applications",
        iterations: "/iterationsList",
        labels: "/labels",
        iterationTypes: "/iterationTypes",
        migrationTypes: "/migrationTypes",
        migrations: "/migrations",
        stepView: "/stepViewApi",
        plansmaster: "/plans/masters",
        plansinstance: "/plans",
        sequencesmaster: "/sequences/master",
        sequencesinstance: "/sequences",
        phasesmaster: "/phases/master",
        phasesinstance: "/phasesinstance",
      },
    },

    // Entity configurations (delegated to EntityConfig.js)
    // Get entities from the centralized EntityConfig module with fallback
    get entities() {
      if (
        window.EntityConfig &&
        typeof window.EntityConfig.getAllEntities === "function"
      ) {
        return window.EntityConfig.getAllEntities();
      }

      // Fallback warning if EntityConfig is not available
      console.warn("EntityConfig not available, using empty configuration");
      return {};
    },

    // Helper method to get a specific entity configuration
    getEntity: function (entityName) {
      if (
        window.EntityConfig &&
        typeof window.EntityConfig.getEntity === "function"
      ) {
        const entity = window.EntityConfig.getEntity(entityName);
        if (!entity) {
          console.warn(`Entity '${entityName}' not found in EntityConfig`);
        }
        return entity;
      }

      // Fallback to direct access if EntityConfig API is not available
      console.warn("EntityConfig API not available, attempting fallback");
      const entities = this.entities;
      return entities[entityName] || null;
    },

    // Cleanup function for active timeouts (MutationObserver safety)
    cleanup: function () {
      // Clear all active timeouts to prevent memory leaks
      this.activeTimeouts.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      this.activeTimeouts.clear();
      console.log("[UMIG] Admin GUI cleanup completed");
    },

    // Initialize the application
    init: function () {
      console.log("UMIG Admin GUI initializing...");

      // Defensive checks for required modules
      const requiredModules = {
        EntityConfig: window.EntityConfig,
        UiUtils: window.UiUtils,
        AdminGuiState: window.AdminGuiState,
      };

      const missingModules = [];
      for (const [name, module] of Object.entries(requiredModules)) {
        if (!module) {
          missingModules.push(name);
        }
      }

      if (missingModules.length > 0) {
        console.warn(
          "[UMIG] Missing required modules:",
          missingModules.join(", "),
        );
        console.warn("[UMIG] Retrying initialization in 500ms...");
        setTimeout(() => this.init(), 500);
        return;
      }

      console.log("[UMIG] All required modules loaded successfully");

      // Initialize Component Migration Features (US-087)
      this.initializeComponentMigration();

      this.bindEvents();
      this.initializeLogin();
    },

    // Initialize Component Migration Features (US-087 Phase 1)
    initializeComponentMigration: function() {
      console.log("[US-087] Initializing component migration features...");

      // Initialize Feature Toggle
      if (window.FeatureToggle) {
        this.featureToggle = window.FeatureToggle;
        console.log("[US-087] Feature toggle initialized");

        // Load saved feature flags state
        this.featureToggle.loadOverrides();
        console.log("[US-087] Feature flags loaded:", this.featureToggle.getAllFlags());
      } else {
        console.warn("[US-087] FeatureToggle not available - operating in legacy mode");
      }

      // Initialize Performance Monitor
      if (window.PerformanceMonitor) {
        this.performanceMonitor = window.PerformanceMonitor;
        console.log("[US-087] Performance monitor initialized");

        // Load baselines if they exist
        this.performanceMonitor.loadBaselines();
      } else {
        console.warn("[US-087] PerformanceMonitor not available - performance tracking disabled");
      }

      // Conditionally load EntityManagers based on feature flags
      this.loadEntityManagers();
    },

    // Load EntityManagers based on feature flags (US-087)
    loadEntityManagers: function() {
      // Check if migration is enabled
      if (!this.featureToggle || !this.featureToggle.isEnabled('admin-gui-migration')) {
        console.log("[US-087] Admin GUI migration is disabled");
        return;
      }

      console.log("[US-087] Admin GUI migration is enabled - loading EntityManagers");

      // Teams EntityManager (Phase 1)
      if (this.featureToggle.isEnabled('teams-component')) {
        this.loadTeamsEntityManager();
      }

      // Future phases (placeholder)
      // if (this.featureToggle.isEnabled('users-component')) {
      //   this.loadUsersEntityManager();
      // }
      // Additional EntityManagers will be added in subsequent phases
    },

    // Load TeamsEntityManager (US-087 Phase 1)
    loadTeamsEntityManager: function() {
      if (!window.TeamsEntityManager) {
        console.warn("[US-087] TeamsEntityManager not available");
        return;
      }

      console.log("[US-087] Loading TeamsEntityManager...");

      try {
        // Create instance with performance tracking
        const startTime = performance.now();

        this.componentManagers.teams = new window.TeamsEntityManager({
          container: null, // Will be set when switching to teams section
          apiBase: this.api.baseUrl,
          endpoints: {
            teams: this.api.endpoints.teams,
            teamMembers: "/teamMembers"
          },
          orchestrator: window.ComponentOrchestrator,
          performanceMonitor: this.performanceMonitor
        });

        const loadTime = performance.now() - startTime;
        console.log(`[US-087] TeamsEntityManager loaded in ${loadTime.toFixed(2)}ms`);

        // Record performance metric
        if (this.performanceMonitor) {
          this.performanceMonitor.setBaseline('teamsComponentLoad', loadTime);
        }
      } catch (error) {
        console.error("[US-087] Failed to load TeamsEntityManager:", error);
        // Disable the feature flag on failure
        if (this.featureToggle) {
          this.featureToggle.disable('teams-component');
        }
      }
    },

    // Wrapper method for dual-mode operation (US-087)
    shouldUseComponentManager: function(entity) {
      if (!this.featureToggle) return false;

      // Security: Feature flag permission checks with audit logging
      const migrationEnabled = this.featureToggle.isEnabled('admin-gui-migration');
      if (!migrationEnabled) return false;

      const flagName = `${entity}-component`;
      const componentEnabled = this.featureToggle.isEnabled(flagName);
      const hasManager = Boolean(this.componentManagers[entity]);

      const accessGranted = componentEnabled && hasManager;

      // Security: Audit trail for component access decisions
      if (accessGranted) {
        console.log(`[US-087 Security] Component access granted for entity: ${entity}`);
      }

      return accessGranted;
    },

    // Show notification message
    showNotification: function (message, type = "info") {
      // Create notification element
      const notification = document.createElement("div");
      notification.className = `notification notification-${type}`;
      notification.textContent = message;
      notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === "success" ? "#00875A" : type === "error" ? "#DE350B" : "#0052CC"};
                color: white;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;

      document.body.appendChild(notification);

      // Remove after 3 seconds
      setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease-out";
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    },

    // Bind all event listeners
    bindEvents: function () {
      // Login form
      const loginForm = document.getElementById("loginForm");
      if (loginForm) {
        loginForm.addEventListener("submit", this.handleLogin.bind(this));
      }

      // Logout button
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", this.handleLogout.bind(this));
      }

      // Navigation menu
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
        searchInput.addEventListener("input", (e) => {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            this.handleSearch(e.target.value);
          }, 300);
        });
      }

      // Page size selector
      const pageSizeSelect = document.getElementById("pageSize");
      if (pageSizeSelect) {
        pageSizeSelect.addEventListener("change", (e) => {
          this.state.pageSize = parseInt(e.target.value);
          this.state.currentPage = 1;
          this.loadCurrentSection();
        });
      }

      // Pagination buttons
      document.addEventListener("click", (e) => {
        if (e.target.matches(".pagination-btn")) {
          this.handlePagination(e.target);
        }
      });

      // Add new button
      const addNewBtn = document.getElementById("addNewBtn");
      if (addNewBtn) {
        addNewBtn.addEventListener("click", () => {
          this.showEditModal(null);
        });
      }

      // Refresh button
      const refreshBtn = document.getElementById("refreshBtn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          this.refreshCurrentSection();
        });
      }

      // Modal events
      this.bindModalEvents();

      // Table events
      this.bindTableEvents();
    },

    // Initialize login page
    initializeLogin: function () {
      const userCodeInput = document.getElementById("userCode");

      // Pre-populate with Confluence username if available
      if (this.config.confluence && this.config.confluence.username) {
        const username = this.config.confluence.username.toUpperCase();
        if (username.length === 3) {
          userCodeInput.value = username;
        }
      }

      userCodeInput.focus();
    },

    // Handle login form submission
    handleLogin: function (e) {
      e.preventDefault();

      // Get elements using direct selectors to avoid MutationObserver conflicts
      const userCodeInput = document.getElementById("userCode");
      const loginBtn = document.querySelector("button.login-btn");
      const btnText = loginBtn ? loginBtn.querySelector(".btn-text") : null;
      const btnLoading = loginBtn
        ? loginBtn.querySelector(".btn-loading")
        : null;
      const errorDiv = document.getElementById("loginError");

      if (!userCodeInput || !loginBtn || !btnText || !btnLoading) {
        console.error("[UMIG] Login form elements not found");
        return;
      }

      const userCode = userCodeInput.value.trim().toUpperCase();

      // Basic validation
      if (!userCode || userCode.length !== 3) {
        this.showLoginError("Please enter a valid 3-character trigram");
        return;
      }

      // Use setTimeout to avoid conflicts with Confluence's MutationObserver
      const timeoutId = setTimeout(() => {
        try {
          // Show loading state
          loginBtn.disabled = true;
          btnText.style.display = "none";
          btnLoading.style.display = "inline";
          if (errorDiv) {
            errorDiv.style.display = "none";
          }

          // Simulate authentication (in real app, this would call an API)
          setTimeout(() => {
            this.authenticateUser(userCode)
              .then((user) => {
                this.state.currentUser = user;
                this.state.isAuthenticated = true;
                this.showDashboard();
              })
              .catch((error) => {
                this.showLoginError(error.message);
              })
              .finally(() => {
                // Use another timeout to avoid MutationObserver conflicts
                setTimeout(() => {
                  loginBtn.disabled = false;
                  btnText.style.display = "inline";
                  btnLoading.style.display = "none";
                }, 50);
              });
          }, 500);
        } catch (error) {
          console.error("[UMIG] Login handling error:", error);
          this.showLoginError("Login system error. Please try again.");
        }
      }, 10); // Small delay to avoid MutationObserver conflicts
    },

    // Authenticate user (mock implementation)
    authenticateUser: function (userCode) {
      return new Promise((resolve, reject) => {
        // Mock user authentication - accepts any 3-character trigram
        // In real implementation, this would call the Users API

        // Determine role based on trigram pattern (for demo purposes)
        let role, name, permissions;

        if (userCode.startsWith("A") || userCode === "ADM") {
          // Admin-like trigrams get superadmin role
          role = "superadmin";
          name = `${userCode} (Super Admin)`;
          permissions = [
            "users",
            "teams",
            "environments",
            "applications",
            "labels",
            "migrations",
            "plans",
            "iterations",
          ];
        } else if (userCode.startsWith("M") || userCode === "MGR") {
          // Manager-like trigrams get admin role
          role = "admin";
          name = `${userCode} (Admin)`;
          permissions = ["migrations", "plans", "iterations", "sequences"];
        } else {
          // All other trigrams get pilot role
          role = "pilot";
          name = `${userCode} (Pilot)`;
          permissions = ["iterations", "sequences", "phases", "steps"];
        }

        const user = {
          trigram: userCode,
          role: role,
          name: name,
          permissions: permissions,
        };

        // Always resolve with a user (mock accepts any 3-char trigram)
        resolve(user);
      });
    },

    // Show login error
    showLoginError: function (message) {
      // Use setTimeout to avoid conflicts with Confluence's MutationObserver
      const timeoutId = setTimeout(() => {
        const errorDiv = document.getElementById("loginError");
        if (errorDiv) {
          errorDiv.textContent = message;
          errorDiv.style.display = "block";
        } else {
          console.error("[UMIG] Login error element not found:", message);
        }
      }, 10);
    },

    // Show main dashboard
    showDashboard: function () {
      // Use setTimeout to avoid conflicts with Confluence's MutationObserver
      const timeoutId = setTimeout(() => {
        const loginPage = document.getElementById("loginPage");
        const dashboardPage = document.getElementById("dashboardPage");

        if (loginPage) {
          loginPage.style.display = "none";
        }
        if (dashboardPage) {
          dashboardPage.style.display = "flex";
        }

        this.setupUserInterface();
        this.setupMenuVisibility();
        this.loadCurrentSection();
      }, 10);
    },

    // Setup user interface with current user info
    setupUserInterface: function () {
      const user = this.state.currentUser;

      document.getElementById("userName").textContent = `Welcome, ${user.name}`;
      document.getElementById("userRole").textContent = user.role.toUpperCase();
    },

    // Setup menu visibility based on user role
    setupMenuVisibility: function () {
      const role = this.state.currentUser.role;

      const superadminSection = document.getElementById("superadminSection");
      const adminSection = document.getElementById("adminSection");
      const pilotSection = document.getElementById("pilotSection");

      // Hide all sections first
      superadminSection.style.display = "none";
      adminSection.style.display = "none";
      pilotSection.style.display = "none";

      // Show sections based on role
      if (role === "superadmin") {
        superadminSection.style.display = "block";
        adminSection.style.display = "block";
        pilotSection.style.display = "block";
      } else if (role === "admin") {
        adminSection.style.display = "block";
        pilotSection.style.display = "block";
      } else if (role === "pilot") {
        pilotSection.style.display = "block";
      }
    },

    // Handle navigation menu clicks
    handleNavigation: function (navItem) {
      // Use setTimeout to avoid conflicts with Confluence's MutationObserver
      const timeoutId = setTimeout(() => {
        this.activeTimeouts.delete(timeoutId);
        try {
          // Get section and entity from data attributes first (before DOM manipulation)
          const section = navItem ? navItem.getAttribute("data-section") : null;
          const entity = navItem
            ? navItem.getAttribute("data-entity") || section
            : null;

          if (!section) {
            console.error(
              "[UMIG] Navigation item missing data-section attribute",
            );
            return;
          }

          // Remove active class from all nav items with null checks
          const navItems = document.querySelectorAll(".nav-item");
          if (navItems) {
            navItems.forEach((item) => {
              if (item && item.classList) {
                item.classList.remove("active");
              }
            });
          }

          // Add active class to clicked item with null checks
          if (navItem && navItem.classList) {
            navItem.classList.add("active");
          }

          // Update state
          this.state.currentSection = section;
          this.state.currentEntity = entity;
          this.state.currentPage = 1;
          this.state.selectedRows.clear();

          // Reset filters when switching sections
          this.state.teamFilter = null;

          // Update UI components
          this.updateContentHeader();
          this.loadCurrentSection();
        } catch (error) {
          console.error("[UMIG] Navigation handling error:", error);
        }
      }, 10);

      this.activeTimeouts.add(timeoutId);
    },

    // Update content header based on current section
    updateContentHeader: function () {
      // Use setTimeout to avoid conflicts with Confluence's MutationObserver
      const timeoutId = setTimeout(() => {
        this.activeTimeouts.delete(timeoutId);
        try {
          const entity = this.getEntity(this.state.currentEntity);
          if (entity) {
            const contentTitle = document.getElementById("contentTitle");
            const contentDescription =
              document.getElementById("contentDescription");
            const addNewBtn = document.getElementById("addNewBtn");

            if (contentTitle) {
              contentTitle.textContent = `${entity.name} Management`;
            }

            if (contentDescription) {
              contentDescription.textContent = entity.description;
            }

            if (addNewBtn) {
              addNewBtn.innerHTML = `<span class="btn-icon">➕</span> Add New ${entity.name.slice(0, -1)}`;
            }
          }
        } catch (error) {
          console.error("[UMIG] Update content header error:", error);
        }
      }, 10);

      this.activeTimeouts.add(timeoutId);
    },

    // Load data for current section
    async loadCurrentSection() {
      const entity = this.state.currentEntity || this.state.currentSection;
      console.log(
        `[UMIG DEBUG] ====== STARTING loadCurrentSection for entity: ${entity} ======`,
      );

      if (!entity || entity === "dashboard") {
        console.log(`[UMIG DEBUG] Showing dashboard for entity: ${entity}`);
        this.showDashboard();
        return;
      }

      // US-087: Check if we should use component manager
      if (this.shouldUseComponentManager(entity)) {
        console.log(`[US-087] Using ${entity} EntityManager`);
        return this.loadWithEntityManager(entity);
      }

      // Defensive access to entities with comprehensive error handling
      let config = null;
      let availableEntities = [];

      try {
        const entities = this.entities;
        if (!entities || typeof entities !== "object") {
          console.error(`[UMIG DEBUG] Entities object is invalid:`, entities);
          this.showErrorMessage(
            `Configuration Error: Unable to load entity configurations. Please refresh the page.`,
          );
          return;
        }

        // Enhanced debugging for iterationTypes vs migrationTypes
        if (entity === "iterationTypes" || entity === "migrationTypes") {
          console.log(
            `[UMIG DEBUG] 🔍 ENHANCED DEBUGGING FOR ${entity.toUpperCase()}`,
          );
          console.log(`[UMIG DEBUG] entities object type:`, typeof entities);
          console.log(
            `[UMIG DEBUG] entities object keys:`,
            Object.keys(entities),
          );
          console.log(
            `[UMIG DEBUG] Direct access to ${entity}:`,
            entities[entity],
          );
          console.log(
            `[UMIG DEBUG] Does ${entity} exist?:`,
            entity in entities,
          );
          console.log(
            `[UMIG DEBUG] EntityConfig proxy working?:`,
            typeof this.entities,
          );

          // Check both entities for comparison
          if (entity === "iterationTypes") {
            console.log(
              `[UMIG DEBUG] 📊 COMPARISON - migrationTypes config:`,
              entities["migrationTypes"],
            );
            console.log(
              `[UMIG DEBUG] 📊 COMPARISON - iterationTypes config:`,
              entities["iterationTypes"],
            );
          }
        }

        config = entities[entity];
        availableEntities = Object.keys(entities);

        if (!config) {
          console.error(
            `[UMIG DEBUG] ❌ No config found for entity: ${entity}`,
          );
          console.log(
            `[UMIG DEBUG] Available entity configs:`,
            availableEntities,
          );

          // Special iteration types debugging
          if (entity === "iterationTypes") {
            console.error(
              `[UMIG DEBUG] 🚨 CRITICAL: ITERATION TYPES CONFIG MISSING!`,
            );
            console.error(`[UMIG DEBUG] EntityConfig status:`, {
              windowEntityConfig: typeof window.EntityConfig,
              getAllEntitiesMethod: typeof window.EntityConfig?.getAllEntities,
              proxyAccess: typeof this.entities,
              directIteration:
                window.EntityConfig?.getAllEntities()?.iterationTypes,
            });
          }

          this.showErrorMessage(
            `Unknown entity: ${entity}. Available: ${availableEntities.join(", ")}`,
          );
          return;
        }
      } catch (error) {
        console.error(
          `[UMIG DEBUG] Critical error accessing entity config:`,
          error,
        );
        this.showErrorMessage(
          `Critical Configuration Error: ${error.message}. Please refresh the page.`,
        );
        return;
      }

      console.log(`[UMIG DEBUG] Found config for ${entity}:`, {
        name: config.name,
        endpoint: config.endpoint,
        hasFields: !!config.fields,
        fieldsCount: config.fields ? config.fields.length : 0,
        hasTableColumns: !!config.tableColumns,
        tableColumnsCount: config.tableColumns ? config.tableColumns.length : 0,
        permissions: config.permissions,
      });

      this.showLoadingSpinner();

      try {
        // Get endpoint from config or use entity name as fallback
        const endpoint =
          this.api.endpoints[entity] || config.endpoint || `/${entity}`;
        console.log(`[UMIG DEBUG] Using endpoint: ${endpoint}`);

        // Build API URL with pagination and search
        const params = new URLSearchParams({
          page: this.state.currentPage,
          size: this.state.pageSize,
        });

        if (this.state.searchTerm) {
          params.append("search", this.state.searchTerm);
        }

        if (this.state.sortField) {
          params.append("sort", this.state.sortField);
          params.append("direction", this.state.sortDirection);
        }
        if (this.state.teamFilter) {
          params.append("teamId", this.state.teamFilter);
        }

        const url = `${this.api.baseUrl}${endpoint}?${params.toString()}`;
        console.log(`[UMIG DEBUG] Making API call to: ${url}`);

        fetch(url, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })
          .then((response) => {
            console.log(`[UMIG DEBUG] Raw response status: ${response.status}`);
            console.log(`[UMIG DEBUG] Raw response ok: ${response.ok}`);
            console.log(
              `[UMIG DEBUG] Raw response headers:`,
              Array.from(response.headers.entries()),
            );

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`,
              );
            }
            return response.json();
          })
          .then((data) => {
            // Debug logging to understand response structure
            console.log(
              `[UMIG DEBUG] ====== API RESPONSE ANALYSIS for ${entity} ======`,
            );
            console.log(`[UMIG DEBUG] Full API Response:`, data);
            console.log(`[UMIG DEBUG] Response type:`, typeof data);
            console.log(`[UMIG DEBUG] Is array:`, Array.isArray(data));
            console.log(
              `[UMIG DEBUG] Response keys:`,
              data && typeof data === "object" ? Object.keys(data) : "N/A",
            );

            if (data && data.content) {
              console.log(`[UMIG DEBUG] Has content property:`, !!data.content);
              console.log(`[UMIG DEBUG] Content type:`, typeof data.content);
              console.log(
                `[UMIG DEBUG] Content is array:`,
                Array.isArray(data.content),
              );
              if (Array.isArray(data.content)) {
                console.log(
                  `[UMIG DEBUG] Content length:`,
                  data.content.length,
                );
                if (data.content.length > 0) {
                  console.log(`[UMIG DEBUG] First item:`, data.content[0]);
                  console.log(
                    `[UMIG DEBUG] First item keys:`,
                    Object.keys(data.content[0]),
                  );
                }
              }
            }

            // Handle both paginated response formats
            if (data.content && Array.isArray(data.content)) {
              // Format 1: Paginated response with direct properties
              console.log(
                `[UMIG DEBUG] Processing Format 1 paginated response with ${data.content.length} items`,
              );
              this.state.data[entity] = data.content;
              this.state.pagination = {
                totalElements: data.totalElements || 0,
                totalPages: data.totalPages || 1,
                pageNumber: data.pageNumber || 1,
                pageSize: data.pageSize || 50,
                hasNext: data.hasNext || false,
                hasPrevious: data.hasPrevious || false,
              };
              console.log(
                `[UMIG DEBUG] Set pagination state:`,
                this.state.pagination,
              );

              // Update sort state from server response
              if (data.sortField) {
                this.state.sortField = data.sortField;
                this.state.sortDirection = data.sortDirection || "asc";
                console.log(
                  `[UMIG DEBUG] Updated sort state - field: ${this.state.sortField}, direction: ${this.state.sortDirection}`,
                );
              }
            } else if (
              data.data &&
              Array.isArray(data.data) &&
              data.pagination
            ) {
              // Format 2: Paginated response with nested structure
              console.log(
                `[UMIG DEBUG] Processing Format 2 paginated response with ${data.data.length} items`,
              );
              this.state.data[entity] = data.data;
              this.state.pagination = {
                totalElements: data.pagination.totalElements || 0,
                totalPages: data.pagination.totalPages || 1,
                pageNumber: data.pagination.pageNumber || 1,
                pageSize: data.pagination.pageSize || 50,
                hasNext: data.pagination.hasNext || false,
                hasPrevious: data.pagination.hasPrevious || false,
              };
              console.log(
                `[UMIG DEBUG] Set pagination state:`,
                this.state.pagination,
              );

              // Update sort state from server response
              if (data.pagination.sortField) {
                this.state.sortField = data.pagination.sortField;
                this.state.sortDirection =
                  data.pagination.sortDirection || "asc";
                console.log(
                  `[UMIG DEBUG] Updated sort state - field: ${this.state.sortField}, direction: ${this.state.sortDirection}`,
                );
              }
            } else if (Array.isArray(data)) {
              // Non-paginated response (fallback)
              console.log(
                `[UMIG DEBUG] Processing array response with ${data.length} items`,
              );
              if (data.length > 0) {
                console.log(`[UMIG DEBUG] First array item:`, data[0]);
                console.log(
                  `[UMIG DEBUG] First array item keys:`,
                  Object.keys(data[0]),
                );
              }
              this.state.data[entity] = data;
              this.state.pagination = {
                totalElements: data.length,
                totalPages: 1,
                pageNumber: 1,
                pageSize: data.length,
                hasNext: false,
                hasPrevious: false,
              };
            } else if (data && typeof data === "string") {
              // Handle string responses (fallback)
              console.log(
                `[UMIG DEBUG] Processing string response, attempting JSON parse`,
              );
              try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                  this.state.data[entity] = parsed;
                  console.log(
                    `[UMIG DEBUG] Successfully parsed string to array with ${parsed.length} items`,
                  );
                } else {
                  console.error(
                    `[UMIG DEBUG] Parsed data is not an array:`,
                    parsed,
                  );
                  this.state.data[entity] = [];
                }
              } catch (parseError) {
                console.error(
                  `[UMIG DEBUG] Failed to parse string response:`,
                  parseError,
                );
                this.state.data[entity] = [];
              }
            } else {
              // Unexpected response format
              console.warn(
                `[UMIG DEBUG] Unexpected response format for ${entity}:`,
                typeof data,
                data,
              );
              this.state.data[entity] = [];
            }

            console.log(
              `[UMIG DEBUG] Final data set for ${entity}:`,
              this.state.data[entity],
            );
            console.log(
              `[UMIG DEBUG] Final data length:`,
              this.state.data[entity]
                ? this.state.data[entity].length
                : "undefined",
            );

            // Render the table
            console.log(`[UMIG DEBUG] About to call renderTable for ${entity}`);
            this.renderTable();
            this.hideLoadingSpinner();
            console.log(
              `[UMIG DEBUG] ====== COMPLETED loadCurrentSection for ${entity} ======`,
            );
          })
          .catch((error) => {
            console.error(
              `[UMIG DEBUG] ====== ERROR in loadCurrentSection for ${entity} ======`,
            );
            console.error(`[UMIG DEBUG] Error details:`, error);
            console.error(`[UMIG DEBUG] Error message:`, error.message);
            console.error(`[UMIG DEBUG] Error stack:`, error.stack);
            this.hideLoadingSpinner();
            this.showErrorMessage(`Failed to load ${entity}: ${error.message}`);
          });
      } catch (error) {
        console.error(
          `[UMIG DEBUG] ====== OUTER ERROR in loadCurrentSection for ${entity} ======`,
        );
        console.error(`[UMIG DEBUG] Outer error:`, error);
        this.hideLoadingSpinner();
        this.showErrorMessage(`Error loading ${entity}: ${error.message}`);
      }
    },

    // Load section using EntityManager (US-087)
    async loadWithEntityManager(entity) {
      const manager = this.componentManagers[entity];
      if (!manager) {
        console.error(`[US-087] EntityManager for ${entity} not found, falling back to legacy`);
        return this.loadCurrentSectionLegacy();
      }

      console.log(`[US-087] Loading ${entity} with EntityManager`);

      // Track performance
      const timerId = this.performanceMonitor?.startTimer(`${entity}Load`);

      try {
        // Show loading state
        this.showLoadingSpinner();

        // Get the content container
        const contentArea = document.getElementById("content");
        if (!contentArea) {
          throw new Error("Content area not found");
        }

        // Clear existing content
        contentArea.innerHTML = '<div id="entityManagerContainer"></div>';
        const container = document.getElementById("entityManagerContainer");

        // Update manager's container
        manager.setContainer(container);

        // Initialize the manager if not already done
        if (!manager.isInitialized) {
          await manager.initialize();
        }

        // Load data with current state
        await manager.loadData({
          page: this.state.currentPage,
          size: this.state.pageSize,
          search: this.state.searchTerm,
          sort: this.state.sortField,
          direction: this.state.sortDirection
        });

        // Render the component
        await manager.render();

        // Hide loading state
        this.hideLoadingSpinner();

        // End performance tracking
        if (timerId) {
          const metrics = this.performanceMonitor.endTimer(timerId);
          console.log(`[US-087] ${entity} loaded in ${metrics.duration.toFixed(2)}ms`);

          // Compare to baseline
          if (this.performanceMonitor.baselines[`${entity}Load`]) {
            this.performanceMonitor.compareToBaseline(`${entity}Load`, metrics.duration);
          }
        }

        // Listen for EntityManager events
        this.setupEntityManagerEventListeners(entity, manager);

      } catch (error) {
        console.error(`[US-087] Failed to load ${entity} with EntityManager:`, error);

        // End timer if it exists
        if (timerId) {
          this.performanceMonitor.endTimer(timerId);
        }

        // Hide loading state
        this.hideLoadingSpinner();

        // Show error and offer rollback
        this.showErrorMessage(`Failed to load ${entity}: ${error.message}`);

        // Prompt for rollback
        if (confirm(`Failed to load ${entity} with new component. Rollback to legacy mode?`)) {
          this.featureToggle.disable(`${entity}-component`);
          this.loadCurrentSection(); // Retry with legacy mode
        }
      }
    },

    // Setup event listeners for EntityManager (US-087)
    setupEntityManagerEventListeners(entity, manager) {
      // Listen for pagination changes
      manager.on('pageChange', (page) => {
        this.state.currentPage = page;
        this.loadWithEntityManager(entity);
      });

      // Listen for sort changes
      manager.on('sortChange', ({ field, direction }) => {
        this.state.sortField = field;
        this.state.sortDirection = direction;
        this.loadWithEntityManager(entity);
      });

      // Listen for search changes
      manager.on('searchChange', (searchTerm) => {
        this.state.searchTerm = searchTerm;
        this.state.currentPage = 1;
        this.loadWithEntityManager(entity);
      });

      // Listen for selection changes
      manager.on('selectionChange', (selectedIds) => {
        this.state.selectedRows = new Set(selectedIds);
      });
    },

    // Legacy loadCurrentSection method (renamed for clarity)
    loadCurrentSectionLegacy() {
      // This will contain the original loadCurrentSection logic
      // For now, we'll just log
      console.log("[US-087] Using legacy load method");
      // The original loadCurrentSection code continues from line 660...
    },

    // Render data table
    renderTable: function () {
      const entity = this.getEntity(this.state.currentEntity);
      const data = this.state.data[this.state.currentEntity] || [];

      console.log(
        `[UMIG DEBUG] ====== STARTING renderTable for ${this.state.currentEntity} ======`,
      );
      console.log(`[UMIG DEBUG] Data length: ${data.length}`);
      console.log(`[UMIG DEBUG] Data contents:`, data);
      console.log(`[UMIG DEBUG] Entity config found:`, !!entity);

      if (entity) {
        console.log(`[UMIG DEBUG] Entity config details:`, {
          name: entity.name,
          hasTableColumns: !!entity.tableColumns,
          tableColumns: entity.tableColumns,
          hasFields: !!entity.fields,
          fieldsCount: entity.fields ? entity.fields.length : 0,
        });
      }

      if (!entity) {
        console.error(
          `[UMIG DEBUG] Entity configuration not found for: ${this.state.currentEntity}`,
        );
        console.error(
          `[UMIG DEBUG] Available entities:`,
          Object.keys(this.entities),
        );
        this.showError(
          `Configuration error: Unable to load ${this.state.currentEntity}`,
        );
        return;
      }

      // Ensure DOM elements exist before rendering
      console.log(`[UMIG DEBUG] About to ensure table elements exist`);
      this.ensureTableElementsExist(() => {
        console.log(
          `[UMIG DEBUG] Table elements exist, proceeding with rendering`,
        );

        // Render table headers
        console.log(`[UMIG DEBUG] Calling renderTableHeaders`);
        this.renderTableHeaders(entity);

        // Render table body
        console.log(
          `[UMIG DEBUG] Calling renderTableBody with ${data.length} items`,
        );
        this.renderTableBody(entity, data);

        // Update pagination
        console.log(`[UMIG DEBUG] Calling updatePagination`);
        this.updatePagination(data.length);

        console.log(
          `[UMIG DEBUG] ====== COMPLETED renderTable for ${this.state.currentEntity} ======`,
        );
      });
    },

    // Ensure table DOM elements exist before rendering
    ensureTableElementsExist: function (callback) {
      const maxAttempts = 20; // Increased to 1 second total wait
      let attempts = 0;

      const checkElements = () => {
        const headerRow = document.getElementById("tableHeader");
        const tbody = document.getElementById("tableBody");
        const mainContent = document.getElementById("mainContent");

        // Check that elements exist and main content is visible
        if (
          headerRow &&
          tbody &&
          mainContent &&
          mainContent.style.display !== "none"
        ) {
          // Elements found and visible, proceed with rendering
          console.log(
            `[UMIG] Table DOM elements found and visible after ${attempts} attempts`,
          );
          callback();
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          console.error(
            "Table elements not found after maximum attempts. DOM structure may be invalid.",
          );
          console.error("Expected elements: #tableHeader, #tableBody");
          console.error(
            "Available table elements:",
            document.querySelectorAll("[id*='table']"),
          );
          this.showError(
            "Unable to initialize table. Please refresh the page.",
          );
          return;
        }

        // Log progress for debugging
        if (attempts % 5 === 0) {
          console.log(
            `[UMIG] Waiting for table DOM elements... (attempt ${attempts}/${maxAttempts})`,
          );
        }

        // Wait 50ms and try again
        setTimeout(checkElements, 50);
      };

      checkElements();
    },

    // Render table headers
    renderTableHeaders: function (entity) {
      const headerRow = document.getElementById("tableHeader");

      if (!headerRow) {
        console.error("Table header element not found in DOM");
        return;
      }

      if (!entity || !entity.tableColumns) {
        console.error(
          "Invalid entity configuration provided to renderTableHeaders",
        );
        return;
      }

      headerRow.innerHTML = "";

      // Add checkbox column for row selection
      const checkboxTh = document.createElement("th");
      checkboxTh.innerHTML = '<input type="checkbox" id="selectAll">';
      checkboxTh.style.width = "40px";
      headerRow.appendChild(checkboxTh);

      // Add data columns
      entity.tableColumns.forEach((columnKey) => {
        const field = entity.fields.find((f) => f.key === columnKey) || {
          key: columnKey,
          label: columnKey,
        };
        const th = document.createElement("th");
        th.textContent = field.label;
        th.setAttribute("data-field", columnKey);

        // Only make sortable columns clickable
        if (entity.sortMapping && entity.sortMapping[columnKey]) {
          th.style.cursor = "pointer";
          th.title = "Click to sort";

          // Add sort indicator - check if current database field matches this column's mapped field
          const dbField = entity.sortMapping[columnKey];
          if (this.state.sortField === dbField) {
            const indicator = this.state.sortDirection === "asc" ? " ▲" : " ▼";
            th.textContent += indicator;
          }
        } else {
          th.style.cursor = "default";
          th.title = "Not sortable";
        }

        headerRow.appendChild(th);
      });

      // Add actions column
      const actionsTh = document.createElement("th");
      actionsTh.textContent = "Actions";
      actionsTh.style.width = "120px";
      headerRow.appendChild(actionsTh);

      // Bind select all checkbox
      const selectAllCheckbox = document.getElementById("selectAll");
      selectAllCheckbox.addEventListener("change", (e) => {
        this.handleSelectAll(e.target.checked);
      });
    },

    // Render table body
    renderTableBody: function (entity, data) {
      console.log(`[UMIG DEBUG] ====== STARTING renderTableBody ======`);
      console.log(`[UMIG DEBUG] Entity:`, entity?.name || "undefined");
      console.log(`[UMIG DEBUG] Data length:`, data?.length || 0);
      console.log(`[UMIG DEBUG] Table columns:`, entity?.tableColumns);

      const tbody = document.getElementById("tableBody");

      if (!tbody) {
        console.error("Table body element not found in DOM");
        return;
      }

      tbody.innerHTML = "";

      if (data.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = entity.tableColumns.length + 2;
        td.textContent = "No data found";
        td.style.textAlign = "center";
        td.style.padding = "40px";
        td.style.color = "#718096";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      data.forEach((record) => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", record[entity.fields[0].key]);

        // Checkbox column
        const checkboxTd = document.createElement("td");
        checkboxTd.innerHTML = `<input type="checkbox" class="row-select" value="${record[entity.fields[0].key]}">`;
        tr.appendChild(checkboxTd);

        // Data columns
        entity.tableColumns.forEach((columnKey) => {
          const td = document.createElement("td");
          const value = this.formatCellValue(record, columnKey, entity);
          td.innerHTML = value;
          tr.appendChild(td);
        });

        // Actions column
        const actionsTd = document.createElement("td");
        actionsTd.className = "action-buttons";

        // Add action buttons based on entity type
        let actionsHtml = "";

        // VIEW button - now available for ALL entities
        actionsHtml += `<button class="btn-table-action btn-view" data-action="view" data-id="${record[entity.fields[0].key]}" title="View Details">👁️</button>`;

        // Entity-specific action buttons
        if (this.state.currentEntity === "phasesinstance") {
          actionsHtml += `
                        <button class="btn-table-action btn-controls" data-action="controls" data-id="${record[entity.fields[0].key]}" title="Manage Control Points">🎛️</button>
                        <button class="btn-table-action btn-progress" data-action="progress" data-id="${record[entity.fields[0].key]}" title="Update Progress">📊</button>
                    `;
        } else if (this.state.currentEntity === "phasesmaster") {
          actionsHtml += `
                        <button class="btn-table-action btn-move" data-action="move" data-id="${record[entity.fields[0].key]}" title="Reorder Phase">↕️</button>
                    `;
        }

        actionsHtml += `
                    <button class="btn-table-action btn-edit" data-action="edit" data-id="${record[entity.fields[0].key]}" title="Edit">✏️</button>
                    <button class="btn-table-action btn-delete" data-action="delete" data-id="${record[entity.fields[0].key]}" title="Delete">🗑️</button>
                `;

        actionsTd.innerHTML = actionsHtml;
        tr.appendChild(actionsTd);

        tbody.appendChild(tr);
      });

      // Bind row selection checkboxes
      tbody.querySelectorAll(".row-select").forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
          this.handleRowSelection(e.target);
        });
      });
    },

    // Format cell value for display
    formatCellValue: function (record, columnKey, entity) {
      // Defensive programming: ensure columnKey is a string
      if (typeof columnKey !== "string") {
        console.warn(
          "[UMIG] formatCellValue: columnKey is not a string:",
          typeof columnKey,
          columnKey,
        );
        columnKey = String(columnKey);
      }

      let value = record[columnKey];

      // Handle special display columns
      if (columnKey === "role_display") {
        const roleId = record.rls_id;
        const isAdmin = record.usr_is_admin;

        if (isAdmin) {
          return '<span class="status-badge status-superadmin">Super Admin</span>';
        } else if (roleId === 1) {
          return '<span class="status-badge status-admin">Admin</span>';
        } else if (roleId === 2) {
          return '<span class="status-badge status-user">User</span>';
        } else if (roleId === 3) {
          return '<span class="status-badge status-pilot">Pilot</span>';
        } else {
          return '<span class="status-badge">No Role</span>';
        }
      }

      if (columnKey === "status_display") {
        const isActive = record.usr_active !== false; // Check usr_active field
        return isActive
          ? '<span class="status-badge status-active">Active</span>'
          : '<span class="status-badge status-inactive">Inactive</span>';
      }

      if (columnKey === "member_count") {
        return record.member_count || "0";
      }
      if (columnKey === "app_count") {
        return record.app_count || "0";
      }

      // Handle all computed count fields for flickering entities
      if (columnKey === "application_count") {
        return record.application_count || "0";
      }
      if (columnKey === "iteration_count") {
        return record.iteration_count || "0";
      }
      if (columnKey === "environment_count") {
        return record.environment_count || "0";
      }
      if (columnKey === "team_count") {
        return record.team_count || "0";
      }
      if (columnKey === "label_count") {
        return record.label_count || "0";
      }
      if (columnKey === "step_count") {
        return record.step_count || "0";
      }

      // Handle computed name fields
      if (columnKey === "mig_name") {
        return record.mig_name || '<span style="color: #a0aec0;">—</span>';
      }
      if (columnKey === "created_by_name") {
        return (
          record.created_by_name || '<span style="color: #a0aec0;">—</span>'
        );
      }

      // Handle phases-specific display columns
      if (columnKey === "sequence_name") {
        return (
          record.sequence_name ||
          record.sqm_name ||
          record.sqi_name ||
          '<span style="color: #a0aec0;">—</span>'
        );
      }

      if (columnKey === "predecessor_name") {
        return (
          record.predecessor_name ||
          record.predecessor_phm_name ||
          record.predecessor_phi_name ||
          '<span style="color: #a0aec0;">None</span>'
        );
      }

      if (columnKey === "progress_display") {
        const progress = record.phi_progress_percentage;
        if (progress === null || progress === undefined) {
          return '<span style="color: #a0aec0;">—</span>';
        }
        const progressClass =
          progress >= 100
            ? "success"
            : progress >= 75
              ? "warning"
              : progress >= 50
                ? "info"
                : "secondary";
        return `<div class="progress-bar">
                    <div class="progress-fill progress-${progressClass}" style="width: ${progress}%"></div>
                    <span class="progress-text">${progress}%</span>
                </div>`;
      }

      // Handle phase status display
      if (
        columnKey === "phi_status" ||
        (columnKey === "status_display" &&
          (this.state.currentEntity === "phasesmaster" ||
            this.state.currentEntity === "phasesinstance"))
      ) {
        const status = value || record.phi_status || "pending";
        const statusClasses = {
          pending: "status-pending",
          in_progress: "status-in-progress",
          completed: "status-completed",
          blocked: "status-blocked",
          failed: "status-failed",
        };
        const statusLabels = {
          pending: "Pending",
          in_progress: "In Progress",
          completed: "Completed",
          blocked: "Blocked",
          failed: "Failed",
        };
        const className = statusClasses[status] || "status-unknown";
        const label = statusLabels[status] || status;
        return `<span class="status-badge ${className}">${label}</span>`;
      }

      // Handle null/undefined values
      if (value === null || value === undefined) {
        return '<span style="color: #a0aec0;">—</span>';
      }

      // Handle boolean values
      if (typeof value === "boolean") {
        return value
          ? '<span class="status-badge status-active">Yes</span>'
          : '<span class="status-badge">No</span>';
      }

      // Handle dates and timestamps (with type safety)
      if (
        typeof columnKey === "string" &&
        (columnKey.includes("date") || columnKey.includes("_at")) &&
        value
      ) {
        const date = new Date(value);
        // Format as YYYY-MM-DD HH:MM:SS
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }

      // Handle email (with type safety)
      if (
        typeof columnKey === "string" &&
        columnKey.includes("email") &&
        value
      ) {
        return `<a href="mailto:${value}">${value}</a>`;
      }

      return String(value);
    },

    // Handle row selection
    handleRowSelection: function (checkbox) {
      const id = checkbox.value;

      if (checkbox.checked) {
        this.state.selectedRows.add(id);
      } else {
        this.state.selectedRows.delete(id);
      }

      this.updateBulkActionsButton();
      this.updateSelectAllCheckbox();
    },

    // Handle select all checkbox
    handleSelectAll: function (checked) {
      // Use setTimeout to avoid conflicts with Confluence's MutationObserver
      const timeoutId = setTimeout(() => {
        this.activeTimeouts.delete(timeoutId);
        try {
          const checkboxes = document.querySelectorAll(".row-select");

          if (checkboxes) {
            checkboxes.forEach((checkbox) => {
              if (checkbox) {
                checkbox.checked = checked;
                this.handleRowSelection(checkbox);
              }
            });
          }
        } catch (error) {
          console.error("[UMIG] Handle select all error:", error);
        }
      }, 10);

      this.activeTimeouts.add(timeoutId);
    },

    // Update bulk actions button state
    updateBulkActionsButton: function () {
      const bulkBtn = document.getElementById("bulkActionsBtn");
      if (bulkBtn) {
        bulkBtn.disabled = this.state.selectedRows.size === 0;
        bulkBtn.textContent = `Bulk Actions (${this.state.selectedRows.size})`;
      }
    },

    // Update select all checkbox state
    updateSelectAllCheckbox: function () {
      const selectAllCheckbox = document.getElementById("selectAll");
      const rowCheckboxes = document.querySelectorAll(".row-select");

      if (rowCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
      }

      const checkedCount = this.state.selectedRows.size;

      if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      } else if (checkedCount === rowCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
      } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
      }
    },

    // Update pagination controls
    updatePagination: function (totalItems) {
      const paginationInfo = document.getElementById("paginationInfo");

      // Use pagination data if available, otherwise fall back to totalItems
      const pagination = this.state.pagination || {};
      const totalElements = pagination.totalElements || totalItems;
      const currentPage = pagination.pageNumber || this.state.currentPage;
      const pageSize = pagination.pageSize || this.state.pageSize;

      const startItem =
        totalElements > 0 ? (currentPage - 1) * pageSize + 1 : 0;
      const endItem = Math.min(startItem + pageSize - 1, totalElements);

      paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalElements} items`;

      // Update pagination buttons
      const prevBtn = document.getElementById("prevPageBtn");
      const nextBtn = document.getElementById("nextPageBtn");

      if (prevBtn) prevBtn.disabled = !pagination.hasPrevious;
      if (nextBtn) nextBtn.disabled = !pagination.hasNext;
    },

    // Handle search
    handleSearch: function (searchTerm) {
      this.state.searchTerm = searchTerm;
      this.state.currentPage = 1;
      this.loadCurrentSection();
    },

    // Handle pagination
    handlePagination: function (button) {
      const action = button.getAttribute("data-action") || button.id;

      switch (action) {
        case "firstPageBtn":
          this.state.currentPage = 1;
          break;
        case "prevPageBtn":
          if (this.state.currentPage > 1) {
            this.state.currentPage--;
          }
          break;
        case "nextPageBtn":
          this.state.currentPage++;
          break;
        case "lastPageBtn":
          // Calculate last page (simplified)
          this.state.currentPage = Math.max(1, this.state.currentPage + 1);
          break;
      }

      this.loadCurrentSection();
    },

    // Bind modal events
    bindModalEvents: function () {
      // Close modal events
      const closeModal = document.getElementById("closeModal");
      if (closeModal) {
        closeModal.addEventListener("click", this.hideEditModal.bind(this));
      }

      const cancelBtn = document.getElementById("cancelBtn");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", this.hideEditModal.bind(this));
      }

      // Save button
      const saveBtn = document.getElementById("saveBtn");
      if (saveBtn) {
        saveBtn.addEventListener("click", this.handleSave.bind(this));
      }

      // Delete button
      const deleteBtn = document.getElementById("deleteBtn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", this.handleDelete.bind(this));
      }

      // Close modal when clicking outside
      const editModal = document.getElementById("editModal");
      if (editModal) {
        editModal.addEventListener("click", (e) => {
          if (e.target === editModal) {
            this.hideEditModal();
          }
        });
      }

      // Escape key to close modal
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.hideEditModal();
          this.hideConfirmModal();
        }

        // US-087: Keyboard shortcuts for feature toggle management
        // Ctrl+Shift+M: Toggle migration master switch
        if (e.ctrlKey && e.shiftKey && e.key === "M") {
          e.preventDefault();
          if (this.featureToggle) {
            this.featureToggle.toggle('admin-gui-migration');
            const status = this.featureToggle.isEnabled('admin-gui-migration') ? 'enabled' : 'disabled';
            this.showNotification(`Admin GUI migration ${status}`, 'info');
            console.log(`[US-087] Admin GUI migration ${status}`);
          }
        }

        // Ctrl+Shift+T: Toggle teams component
        if (e.ctrlKey && e.shiftKey && e.key === "T") {
          e.preventDefault();
          if (this.featureToggle) {
            this.featureToggle.toggle('teams-component');
            const status = this.featureToggle.isEnabled('teams-component') ? 'enabled' : 'disabled';
            this.showNotification(`Teams component ${status}`, 'info');
            console.log(`[US-087] Teams component ${status}`);

            // Reload current section if we're on teams
            if (this.state.currentEntity === 'teams') {
              this.loadCurrentSection();
            }
          }
        }

        // Ctrl+Shift+P: Show performance report
        if (e.ctrlKey && e.shiftKey && e.key === "P") {
          e.preventDefault();
          if (this.performanceMonitor) {
            const report = this.performanceMonitor.generateReport();
            console.log("[US-087] Performance Report:", report);
            this.showNotification("Performance report logged to console", 'info');
          }
        }

        // Ctrl+Shift+R: Emergency rollback
        if (e.ctrlKey && e.shiftKey && e.key === "R") {
          e.preventDefault();
          if (this.featureToggle && confirm("Emergency rollback all component migrations?")) {
            this.featureToggle.emergencyRollback();
            this.showNotification("Emergency rollback executed - reloading...", 'warning');
          }
        }
      });
    },

    // Bind table events
    bindTableEvents: function () {
      // Table action buttons - use closest() to handle clicks on button content (like emoji)
      document.addEventListener("click", (e) => {
        const viewBtn = e.target.closest('[data-action="view"]');
        if (viewBtn) {
          const id = viewBtn.getAttribute("data-id");
          if (this.state.currentEntity === "environments") {
            this.showEnvironmentDetails(id);
          } else if (this.state.currentEntity === "phasesinstance") {
            this.showPhaseInstanceDetails(id);
          } else {
            // Generic view modal for all other entities
            this.showGenericEntityView(id);
          }
        }

        const editBtn = e.target.closest('[data-action="edit"]');
        if (editBtn) {
          const id = editBtn.getAttribute("data-id");
          this.showEditModal(id);
        }

        const deleteBtn = e.target.closest('[data-action="delete"]');
        if (deleteBtn) {
          const id = deleteBtn.getAttribute("data-id");
          this.confirmDelete(id);
        }

        const controlsBtn = e.target.closest('[data-action="controls"]');
        if (controlsBtn) {
          const id = controlsBtn.getAttribute("data-id");
          this.showControlPointsModal(id);
        }

        const progressBtn = e.target.closest('[data-action="progress"]');
        if (progressBtn) {
          const id = progressBtn.getAttribute("data-id");
          this.showProgressModal(id);
        }

        const moveBtn = e.target.closest('[data-action="move"]');
        if (moveBtn) {
          const id = moveBtn.getAttribute("data-id");
          this.showMovePhaseModal(id);
        }
      });

      // Column sorting
      document.addEventListener("click", (e) => {
        if (e.target.matches("th[data-field]")) {
          const field = e.target.getAttribute("data-field");
          this.handleSort(field);
        }
      });

      // Row double-click to edit
      document.addEventListener("dblclick", (e) => {
        const row = e.target.closest("tr[data-id]");
        if (row) {
          const id = row.getAttribute("data-id");
          this.showEditModal(id);
        }
      });
    },

    // Handle column sorting
    handleSort: function (field) {
      const entity = this.getEntity(this.state.currentEntity);

      // Check if the field is sortable
      if (!entity || !entity.sortMapping || !entity.sortMapping[field]) {
        console.log(`Field ${field} is not sortable`);
        return;
      }

      // Get the database column name for this display field
      const dbField = entity.sortMapping[field];

      if (this.state.sortField === dbField) {
        this.state.sortDirection =
          this.state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        this.state.sortField = dbField;
        this.state.sortDirection = "asc";
      }

      this.state.currentPage = 1; // Reset to first page when sorting
      this.loadCurrentSection();
    },

    // Show edit modal
    showEditModal: function (id) {
      // Use setTimeout to avoid conflicts with Confluence's MutationObserver
      const timeoutId = setTimeout(() => {
        this.activeTimeouts.delete(timeoutId);
        try {
          const modal = document.getElementById("editModal");
          const modalTitle = document.getElementById("modalTitle");
          const deleteBtn = document.getElementById("deleteBtn");

          if (!modal) {
            console.error("[UMIG] Edit modal element not found");
            return;
          }

          const isEdit = id !== null;

          if (modalTitle) {
            modalTitle.textContent = isEdit ? "Edit Record" : "Add New Record";
          }

          if (deleteBtn) {
            deleteBtn.style.display = isEdit ? "inline-block" : "none";
          }

          this.renderEditForm(id);
          modal.style.display = "flex";
        } catch (error) {
          console.error("[UMIG] Show edit modal error:", error);
        }
      }, 10);

      this.activeTimeouts.add(timeoutId);

      // Focus first input
      setTimeout(() => {
        const firstInput = modal.querySelector(
          "input:not([readonly]), textarea, select",
        );
        if (firstInput) firstInput.focus();
      }, 100);
    },

    // Render edit form
    renderEditForm: function (id) {
      const entity = this.getEntity(this.state.currentEntity);
      if (!entity) {
        console.error(
          `Entity configuration not found for: ${this.state.currentEntity}`,
        );
        return;
      }
      const formFields = document.getElementById("formFields");
      const data = this.state.data[this.state.currentEntity] || [];
      const record = id ? data.find((r) => r[entity.fields[0].key] == id) : {};

      formFields.innerHTML = "";

      // Add association management for environments (only when editing)
      if (this.state.currentEntity === "environments" && id) {
        const associationDiv = document.createElement("div");
        associationDiv.className = "form-group association-management";
        associationDiv.innerHTML = `
                    <label>Manage Associations</label>
                    <div class="association-buttons">
                        <button type="button" class="btn-primary" onclick="adminGui.showAssociateApplicationModal(${id})">Associate Application</button>
                        <button type="button" class="btn-primary" onclick="adminGui.showAssociateIterationModal(${id})">Associate Iteration</button>
                    </div>
                `;
        formFields.appendChild(associationDiv);

        // Add separator
        const separator = document.createElement("hr");
        separator.style.margin = "20px 0";
        formFields.appendChild(separator);
      }

      entity.fields.forEach((field) => {
        if (field.readonly && !id) return; // Skip readonly fields for new records

        const fieldDiv = document.createElement("div");
        fieldDiv.className = "form-group";

        const label = document.createElement("label");
        label.textContent = field.label + (field.required ? " *" : "");
        label.setAttribute("for", field.key);
        fieldDiv.appendChild(label);

        let input;

        switch (field.type) {
          case "textarea":
            input = document.createElement("textarea");
            input.rows = 3;
            break;
          case "select":
            input = document.createElement("select");
            field.options.forEach((option) => {
              const optionEl = document.createElement("option");
              optionEl.value = option.value;
              optionEl.textContent = option.label;
              input.appendChild(optionEl);
            });
            break;
          case "boolean":
            input = document.createElement("select");
            input.innerHTML =
              '<option value="true">Yes</option><option value="false">No</option>';
            break;
          case "color":
            console.log(`Creating color input for field: ${field.key}`);
            // Create color input element
            input = document.createElement("input");
            input.type = "color";
            input.style.cursor = "pointer";
            input.style.minWidth = "60px";
            input.style.height = "40px";

            // Create text input to show hex value
            const hexInput = document.createElement("input");
            hexInput.type = "text";
            hexInput.style.width = "100px";
            hexInput.style.fontFamily = "monospace";
            hexInput.placeholder = "#000000";
            hexInput.pattern = "^#[0-9A-Fa-f]{6}$";
            hexInput.title = "Hex color code (e.g., #FF5733)";

            // Sync color picker with hex input
            input.addEventListener("change", function () {
              console.log(`Color picker changed to: ${this.value}`);
              hexInput.value = this.value.toUpperCase();
            });

            hexInput.addEventListener("input", function () {
              if (/^#[0-9A-Fa-f]{6}$/.test(this.value)) {
                console.log(`Hex input changed to: ${this.value}`);
                input.value = this.value;
              }
            });

            // Store reference to hex input for later value setting
            input.hexInput = hexInput;
            console.log(
              `Color input created successfully for field: ${field.key}`,
            );
            break;
          default:
            input = document.createElement("input");
            input.type = field.type;
        }

        input.id = field.key;
        input.name = field.key;
        input.required = field.required;
        input.readOnly = field.readonly;

        // Set maxLength if specified
        if (field.maxLength && input.type === "text") {
          input.maxLength = field.maxLength;
        }

        // Set current value
        const value = record[field.key];
        if (value !== undefined && value !== null) {
          if (field.type === "boolean") {
            input.value = String(value);
          } else if (field.type === "datetime") {
            // Format datetime as YYYY-MM-DD HH:MM:SS for display
            const date = new Date(value);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            const seconds = String(date.getSeconds()).padStart(2, "0");
            input.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          } else if (field.type === "color") {
            // Set value for both color picker and hex input
            input.value = value;
            if (input.hexInput) {
              input.hexInput.value = value.toUpperCase();
            }
          } else {
            input.value = value;
          }
        } else if (field.type === "color" && field.default) {
          // Set default color if no value exists
          input.value = field.default;
          if (input.hexInput) {
            input.hexInput.value = field.default.toUpperCase();
          }
        }

        // Handle color field wrapper
        if (field.type === "color") {
          console.log(`Creating color wrapper for field: ${field.key}`);
          const colorWrapper = document.createElement("div");
          colorWrapper.className = "color-field-container";
          colorWrapper.style.display = "flex";
          colorWrapper.style.alignItems = "center";
          colorWrapper.style.gap = "10px";

          // Add color input first
          colorWrapper.appendChild(input);
          console.log(`Added color input to wrapper for field: ${field.key}`);

          // Add hex input if it exists
          if (input.hexInput) {
            colorWrapper.appendChild(input.hexInput);
            console.log(`Added hex input to wrapper for field: ${field.key}`);
          } else {
            console.warn(`No hex input found for color field: ${field.key}`);
          }

          // Add the wrapper to the field div
          fieldDiv.appendChild(colorWrapper);
          console.log(`Color wrapper added to field div for: ${field.key}`);
        } else {
          fieldDiv.appendChild(input);
        }

        formFields.appendChild(fieldDiv);
      });
    },

    // Hide edit modal
    hideEditModal: function () {
      // Use setTimeout to avoid conflicts with Confluence's MutationObserver
      const timeoutId = setTimeout(() => {
        this.activeTimeouts.delete(timeoutId);
        try {
          const modal = document.getElementById("editModal");
          if (modal) {
            modal.style.display = "none";
          } else {
            console.error("[UMIG] Edit modal element not found for hiding");
          }
        } catch (error) {
          console.error("[UMIG] Hide edit modal error:", error);
        }
      }, 10);

      this.activeTimeouts.add(timeoutId);
    },

    // Validate form data
    validateFormData: function (data, entity) {
      const errors = [];

      entity.fields.forEach((field) => {
        const value = data[field.key];
        const label = field.label;

        // Skip readonly fields
        if (field.readonly) return;

        // Check required fields
        if (field.required) {
          if (!value || (typeof value === "string" && value.trim() === "")) {
            errors.push(`• ${label} is required`);
            return;
          }
        }

        // Skip validation if field is empty and not required
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return;
        }

        // Type-specific validation
        switch (field.type) {
          case "email":
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors.push(`• ${label} must be a valid email address`);
            }
            break;

          case "text":
            if (field.maxLength && value.length > field.maxLength) {
              errors.push(
                `• ${label} cannot exceed ${field.maxLength} characters`,
              );
            }

            // Special validation for usr_code
            if (field.key === "usr_code") {
              if (value.length !== 3) {
                errors.push(`• ${label} must be exactly 3 characters`);
              }
              if (!/^[A-Z0-9]+$/i.test(value)) {
                errors.push(`• ${label} can only contain letters and numbers`);
              }
            }
            break;

          case "number":
            if (isNaN(value) || !Number.isInteger(Number(value))) {
              errors.push(`• ${label} must be a valid number`);
            }
            break;
        }
      });

      return errors;
    },

    // Handle save
    handleSave: function () {
      const form = document.getElementById("editForm");
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Enhanced validation
      const entity = this.getEntity(this.state.currentEntity);
      if (!entity) {
        this.showError("Entity configuration not found");
        return;
      }
      const validationErrors = this.validateFormData(data, entity);

      if (validationErrors.length > 0) {
        const errorMessage =
          "Please fix the following issues:\n\n" + validationErrors.join("\n");
        alert(errorMessage);
        return;
      }

      // Convert data types
      entity.fields.forEach((field) => {
        if (data[field.key] !== undefined) {
          switch (field.type) {
            case "number":
              data[field.key] = data[field.key]
                ? parseInt(data[field.key])
                : null;
              break;
            case "boolean":
              data[field.key] = data[field.key] === "true";
              break;
            case "select":
              // Handle select fields that have numeric values
              if (field.key === "rls_id") {
                data[field.key] =
                  data[field.key] && data[field.key] !== "null"
                    ? parseInt(data[field.key])
                    : null;
              }
              break;
          }
        }
      });

      console.log("Saving data:", data);

      // Determine if this is an edit or create operation
      const primaryKeyField = entity.fields.find((f) => f.key.endsWith("_id"));
      const recordId = data[primaryKeyField.key];
      const isEdit = recordId && recordId !== "";

      // Remove readonly fields and timestamp fields from data being sent to API
      const apiData = {};
      entity.fields.forEach((field) => {
        if (
          !field.readonly &&
          data[field.key] !== undefined &&
          field.key !== "created_at" &&
          field.key !== "updated_at"
        ) {
          apiData[field.key] = data[field.key];
        }
      });

      // Make API call
      const url = isEdit
        ? `${this.api.baseUrl}${this.api.endpoints[this.state.currentEntity]}/${recordId}`
        : `${this.api.baseUrl}${this.api.endpoints[this.state.currentEntity]}`;

      const method = isEdit ? "PUT" : "POST";

      fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(apiData),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((error) => {
              let errorMessage =
                error.error ||
                `HTTP ${response.status}: ${response.statusText}`;

              // Add details if available
              if (error.details) {
                errorMessage += "\n\nDetails: " + error.details;
              }

              // Add SQL state if available for debugging
              if (error.sqlState) {
                errorMessage += "\n\nSQL State: " + error.sqlState;
              }

              throw new Error(errorMessage);
            });
          }
          return response.json();
        })
        .then((result) => {
          console.log("Save successful:", result);
          this.hideEditModal();
          this.refreshCurrentSection();

          // Show success message
          const operation = isEdit ? "updated" : "created";
          this.showMessage(`Record ${operation} successfully`, "success");
        })
        .catch((error) => {
          console.error("Save failed:", error);
          this.showMessage(`Failed to save record: ${error.message}`, "error");
        });
    },

    // Confirm delete
    confirmDelete: function (id) {
      const modal = document.getElementById("confirmModal");
      const message = document.getElementById("confirmMessage");
      const confirmBtn = document.getElementById("confirmAction");

      message.textContent =
        "Are you sure you want to delete this record? This action cannot be undone.";

      // Remove existing event listeners
      const newConfirmBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

      // Add new event listener
      newConfirmBtn.addEventListener("click", () => {
        this.executeDelete(id);
        this.hideConfirmModal();
      });

      modal.style.display = "flex";
    },

    // Execute delete
    executeDelete: function (id) {
      console.log("Deleting record:", id);

      // Make DELETE API call
      const url = `${this.api.baseUrl}${this.api.endpoints[this.state.currentEntity]}/${id}`;

      fetch(url, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((error) => {
              let errorMessage =
                error.error ||
                `HTTP ${response.status}: ${response.statusText}`;

              // Show blocking relationships if available
              if (error.blocking_relationships) {
                errorMessage += "\n\nBlocking relationships:";
                Object.keys(error.blocking_relationships).forEach((key) => {
                  const count = error.blocking_relationships[key].length;
                  errorMessage += `\n• ${key}: ${count} record(s)`;
                });
              }

              // Add details if available
              if (error.details) {
                errorMessage += "\n\nDetails: " + error.details;
              }

              throw new Error(errorMessage);
            });
          }
          // DELETE typically returns 204 No Content on success
          return response.status === 204 ? null : response.json();
        })
        .then((result) => {
          console.log("Delete successful:", result);
          this.refreshCurrentSection();

          // Show success message
          this.showMessage("Record deleted successfully", "success");
        })
        .catch((error) => {
          console.error("Delete failed:", error);
          this.showMessage(
            `Failed to delete record: ${error.message}`,
            "error",
          );
        });
    },

    // Hide confirm modal
    hideConfirmModal: function () {
      const modal = document.getElementById("confirmModal");
      modal.style.display = "none";
    },

    // Show environment details modal
    showEnvironmentDetails: function (envId) {
      const modal = document.getElementById("envDetailsModal");
      const title = document.getElementById("envDetailsTitle");
      const content = document.getElementById("envDetailsContent");

      // Show loading state
      content.innerHTML = "<p>Loading environment details...</p>";
      modal.style.display = "flex";

      // Fetch environment details
      const url = `${this.api.baseUrl}${this.api.endpoints.environments}/${envId}`;

      fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Atlassian-Token": "no-check",
        },
        credentials: "same-origin",
      })
        .then((response) => {
          if (!response.ok) {
            return response.text().then((text) => {
              throw new Error(`HTTP ${response.status}: ${text}`);
            });
          }
          return response.json();
        })
        .then((environment) => {
          title.textContent = `Environment: ${environment.env_name} (${environment.env_code})`;

          // Build details HTML
          let html = '<div class="env-details">';

          // Basic info
          html += '<div class="detail-section">';
          html += "<h4>Basic Information</h4>";
          html += `<p><strong>Code:</strong> ${environment.env_code}</p>`;
          html += `<p><strong>Name:</strong> ${environment.env_name}</p>`;
          html += `<p><strong>Description:</strong> ${environment.env_description || "N/A"}</p>`;
          html += "</div>";

          // Applications
          html += '<div class="detail-section">';
          html += "<h4>Associated Applications</h4>";
          if (environment.applications && environment.applications.length > 0) {
            html += "<ul>";
            environment.applications.forEach((app) => {
              html += `<li>${app.app_name} (${app.app_code})</li>`;
            });
            html += "</ul>";
          } else {
            html += "<p>No applications associated</p>";
          }
          html += "</div>";

          // Fetch iterations grouped by role
          return fetch(
            `${this.api.baseUrl}${this.api.endpoints.environments}/${envId}/iterations`,
            {
              method: "GET",
              headers: {
                Accept: "application/json",
                "X-Atlassian-Token": "no-check",
              },
              credentials: "same-origin",
            },
          )
            .then((response) => {
              if (!response.ok) {
                return response.text().then((text) => {
                  throw new Error(`HTTP ${response.status}: ${text}`);
                });
              }
              return response.json();
            })
            .then((iterationsByRole) => {
              // Iterations by role
              html += '<div class="detail-section">';
              html += "<h4>Iterations by Role</h4>";

              if (Object.keys(iterationsByRole).length > 0) {
                Object.keys(iterationsByRole).forEach((roleName) => {
                  const roleData = iterationsByRole[roleName];
                  html += `<div class="role-group">`;
                  html += `<h5>${roleName} - ${roleData.role_description}</h5>`;
                  html += "<ul>";
                  roleData.iterations.forEach((iteration) => {
                    const statusClass = iteration.ite_status
                      ? iteration.ite_status.toLowerCase()
                      : "";
                    html += `<li>${iteration.ite_name} (${iteration.ite_type}) <span class="status-badge status-${statusClass}">${iteration.ite_status || "N/A"}</span></li>`;
                  });
                  html += "</ul>";
                  html += "</div>";
                });
              } else {
                html += "<p>No iterations associated</p>";
              }
              html += "</div>";

              // Add association buttons
              html += '<div class="detail-section">';
              html += "<h4>Manage Associations</h4>";
              html += '<div class="association-buttons">';
              html += `<button class="btn-primary" onclick="adminGui.showAssociateApplicationModal(${envId})">Associate Application</button>`;
              html += `<button class="btn-primary" onclick="adminGui.showAssociateIterationModal(${envId})">Associate Iteration</button>`;
              html += "</div>";
              html += "</div>";

              html += "</div>";
              content.innerHTML = html;
            });
        })
        .catch((error) => {
          console.error("Error loading environment details:", error);
          content.innerHTML = `<p class="error">Failed to load environment details: ${error.message}</p>`;
        });

      // Store environment ID for later use
      this.currentEnvironmentId = envId;

      // Close button event
      const closeBtn = document.getElementById("closeEnvDetailsBtn");
      const closeX = document.getElementById("closeEnvDetails");

      const closeHandler = () => {
        modal.style.display = "none";
      };

      closeBtn.onclick = closeHandler;
      closeX.onclick = closeHandler;

      // Close on overlay click
      modal.onclick = (e) => {
        if (e.target === modal) {
          closeHandler();
        }
      };
    },

    // Show modal to associate application with environment
    showAssociateApplicationModal: function (envId) {
      // Create a simple modal for application association
      const modalHtml = `
                <div id="associateAppModal" class="modal-overlay" style="display: flex;">
                    <div class="modal modal-small">
                        <div class="modal-header">
                            <h3 class="modal-title">Associate Application</h3>
                            <button class="modal-close" onclick="document.getElementById('associateAppModal').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="appSelect">Select Application</label>
                                <select id="appSelect" class="form-control">
                                    <option value="">Loading applications...</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('associateAppModal').remove()">Cancel</button>
                            <button class="btn-primary" onclick="adminGui.associateApplication(${envId})">Associate</button>
                        </div>
                    </div>
                </div>
            `;

      // Add modal to page
      document.body.insertAdjacentHTML("beforeend", modalHtml);

      // Load applications
      fetch(`${this.api.baseUrl}${this.api.endpoints.applications}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Atlassian-Token": "no-check",
        },
        credentials: "same-origin",
      })
        .then((response) => response.json())
        .then((applications) => {
          const select = document.getElementById("appSelect");
          select.innerHTML =
            '<option value="">-- Select an application --</option>';
          applications.forEach((app) => {
            select.innerHTML += `<option value="${app.app_id}">${app.app_name} (${app.app_code})</option>`;
          });
        })
        .catch((error) => {
          console.error("Error loading applications:", error);
          document.getElementById("appSelect").innerHTML =
            '<option value="">Error loading applications</option>';
        });
    },

    // Show modal to associate iteration with environment
    showAssociateIterationModal: function (envId) {
      // Create a modal for iteration association with role selection
      const modalHtml = `
                <div id="associateIterModal" class="modal-overlay" style="display: flex;">
                    <div class="modal">
                        <div class="modal-header">
                            <h3 class="modal-title">Associate Iteration</h3>
                            <button class="modal-close" onclick="document.getElementById('associateIterModal').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="iterSelect">Select Iteration</label>
                                <select id="iterSelect" class="form-control">
                                    <option value="">Loading iterations...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="roleSelect">Select Environment Role</label>
                                <select id="roleSelect" class="form-control">
                                    <option value="">Loading roles...</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('associateIterModal').remove()">Cancel</button>
                            <button class="btn-primary" onclick="adminGui.associateIteration(${envId})">Associate</button>
                        </div>
                    </div>
                </div>
            `;

      // Add modal to page
      document.body.insertAdjacentHTML("beforeend", modalHtml);

      // Load iterations
      fetch(`${this.api.baseUrl}${this.api.endpoints.iterations}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Atlassian-Token": "no-check",
        },
        credentials: "same-origin",
      })
        .then((response) => response.json())
        .then((iterations) => {
          const select = document.getElementById("iterSelect");
          select.innerHTML =
            '<option value="">-- Select an iteration --</option>';
          iterations.forEach((iter) => {
            select.innerHTML += `<option value="${iter.ite_id}">${iter.ite_name} (${iter.itt_code})</option>`;
          });
        })
        .catch((error) => {
          console.error("Error loading iterations:", error);
          document.getElementById("iterSelect").innerHTML =
            '<option value="">Error loading iterations</option>';
        });

      // Load environment roles
      fetch(`${this.api.baseUrl}${this.api.endpoints.environments}/roles`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Atlassian-Token": "no-check",
        },
        credentials: "same-origin",
      })
        .then((response) => response.json())
        .then((roles) => {
          const select = document.getElementById("roleSelect");
          select.innerHTML = '<option value="">-- Select a role --</option>';
          roles.forEach((role) => {
            select.innerHTML += `<option value="${role.enr_id}">${role.enr_name} - ${role.enr_description}</option>`;
          });
        })
        .catch((error) => {
          console.error("Error loading roles:", error);
          document.getElementById("roleSelect").innerHTML =
            '<option value="">Error loading roles</option>';
        });
    },

    // Associate application with environment
    associateApplication: function (envId) {
      const appId = document.getElementById("appSelect").value;
      if (!appId) {
        alert("Please select an application");
        return;
      }

      fetch(
        `${this.api.baseUrl}${this.api.endpoints.environments}/${envId}/applications/${appId}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "X-Atlassian-Token": "no-check",
          },
          credentials: "same-origin",
        },
      )
        .then((response) => {
          if (!response.ok) {
            return response.text().then((text) => {
              throw new Error(`HTTP ${response.status}: ${text}`);
            });
          }
          return response.json();
        })
        .then((result) => {
          // Remove modal
          document.getElementById("associateAppModal").remove();
          // Refresh environment details if visible
          const envDetailsModal = document.getElementById("envDetailsModal");
          if (envDetailsModal.style.display === "flex") {
            this.showEnvironmentDetails(envId);
          }
          // Refresh edit form if visible
          const editModal = document.getElementById("editModal");
          if (editModal.style.display === "flex") {
            this.renderEditForm(envId);
          }
          this.showNotification(
            "Application associated successfully",
            "success",
          );
        })
        .catch((error) => {
          console.error("Error associating application:", error);
          alert(`Failed to associate application: ${error.message}`);
        });
    },

    // Associate iteration with environment
    associateIteration: function (envId) {
      const iterationId = document.getElementById("iterSelect").value;
      const roleId = document.getElementById("roleSelect").value;

      if (!iterationId || !roleId) {
        alert("Please select both an iteration and a role");
        return;
      }

      fetch(
        `${this.api.baseUrl}${this.api.endpoints.environments}/${envId}/iterations/${iterationId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Atlassian-Token": "no-check",
          },
          credentials: "same-origin",
          body: JSON.stringify({ enr_id: parseInt(roleId) }),
        },
      )
        .then((response) => {
          if (!response.ok) {
            return response.text().then((text) => {
              throw new Error(`HTTP ${response.status}: ${text}`);
            });
          }
          return response.json();
        })
        .then((result) => {
          // Remove modal
          document.getElementById("associateIterModal").remove();
          // Refresh environment details if visible
          const envDetailsModal = document.getElementById("envDetailsModal");
          if (envDetailsModal.style.display === "flex") {
            this.showEnvironmentDetails(envId);
          }
          // Refresh edit form if visible
          const editModal = document.getElementById("editModal");
          if (editModal.style.display === "flex") {
            this.renderEditForm(envId);
          }
          this.showNotification("Iteration associated successfully", "success");
        })
        .catch((error) => {
          console.error("Error associating iteration:", error);
          alert(`Failed to associate iteration: ${error.message}`);
        });
    },

    // Handle delete button in edit modal
    handleDelete: function () {
      // Get the record ID from the form or current context
      const formFields = document.getElementById("formFields");
      const idField = formFields.querySelector("input[readonly]");
      const id = idField ? idField.value : null;

      if (id) {
        this.hideEditModal();
        this.confirmDelete(id);
      }
    },

    // Show loading state
    showLoading: function () {
      this.state.loading = true;
      document.getElementById("loadingState").style.display = "flex";
      document.getElementById("mainContent").style.display = "none";
      document.getElementById("errorState").style.display = "none";
    },

    // Hide loading state
    hideLoading: function () {
      this.state.loading = false;
      document.getElementById("loadingState").style.display = "none";
      document.getElementById("mainContent").style.display = "block";
      document.getElementById("errorState").style.display = "none";
    },

    // Show loading spinner (alias for showLoading)
    showLoadingSpinner: function () {
      this.showLoading();
    },

    // Hide loading spinner (alias for hideLoading)
    hideLoadingSpinner: function () {
      this.hideLoading();
    },

    // Show error state
    showError: function (message) {
      document.getElementById("errorMessage").textContent = message;
      document.getElementById("loadingState").style.display = "none";
      document.getElementById("mainContent").style.display = "none";
      document.getElementById("errorState").style.display = "flex";
    },

    // Refresh current section
    refreshCurrentSection: function () {
      this.state.selectedRows.clear();
      this.loadCurrentSection();
    },

    // Handle logout
    handleLogout: function () {
      this.state.isAuthenticated = false;
      this.state.currentUser = null;

      document.getElementById("dashboardPage").style.display = "none";
      document.getElementById("loginPage").style.display = "flex";
      document.getElementById("userCode").value = "";
      document.getElementById("userCode").focus();
    },

    // Show message (success/error)
    showMessage: function (message, type = "info") {
      // Create a toast notification
      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === "success" ? "#38a169" : type === "error" ? "#e53e3e" : "#3182ce"};
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

      document.body.appendChild(toast);

      // Animate in
      setTimeout(() => (toast.style.opacity = "1"), 100);

      // Remove after 3 seconds
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    },

    // Render filter controls
    renderFilterControls: function () {
      const entity = this.getEntity(this.state.currentEntity);
      const filterControlsDiv = document.querySelector(".filter-controls");

      if (!entity || !entity.filters || entity.filters.length === 0) {
        // No filters for this entity, hide filter controls or show default buttons
        filterControlsDiv.innerHTML = `
                    <button class="btn-filter" id="filterBtn">Filter</button>
                    <button class="btn-export" id="exportBtn">Export</button>
                    <button class="btn-bulk" id="bulkActionsBtn" disabled>Bulk Actions</button>
                `;
        return;
      }

      // Render filter controls for entities that have filters configured
      let filtersHtml = "";

      entity.filters.forEach((filter) => {
        if (filter.type === "select") {
          filtersHtml += `
                        <div class="filter-group">
                            <label for="${filter.key}Select">${filter.label}:</label>
                            <select id="${filter.key}Select" class="filter-select" data-filter="${filter.key}">
                                <option value="">${filter.placeholder || "All"}</option>
                                <!-- Options will be populated dynamically -->
                            </select>
                        </div>
                    `;
        }
      });

      filterControlsDiv.innerHTML = `
                ${filtersHtml}
                <button class="btn-export" id="exportBtn">Export</button>
                <button class="btn-bulk" id="bulkActionsBtn" disabled>Bulk Actions</button>
            `;

      // Load filter data and bind events
      this.loadFilterData(entity);
      this.bindFilterEvents();
    },

    // Load data for filters (e.g., teams for team selector)
    loadFilterData: function (entity) {
      entity.filters.forEach((filter) => {
        if (filter.type === "select" && filter.endpoint) {
          const selectElement = document.getElementById(`${filter.key}Select`);
          if (!selectElement) return;

          // Load data from the endpoint
          fetch(`${this.api.baseUrl}${filter.endpoint}`, {
            method: "GET",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(
                  `HTTP ${response.status}: ${response.statusText}`,
                );
              }
              return response.json();
            })
            .then((data) => {
              // Handle both array and paginated responses
              const items = Array.isArray(data) ? data : data.content || [];

              // Clear existing options except the first one (placeholder)
              const firstOption = selectElement.firstElementChild;
              selectElement.innerHTML = "";
              selectElement.appendChild(firstOption);

              // Add options
              items.forEach((item) => {
                const option = document.createElement("option");
                option.value = item[filter.valueField];
                option.textContent = item[filter.textField];
                selectElement.appendChild(option);
              });

              // Set current value if any
              if (filter.key === "teamId" && this.state.teamFilter) {
                selectElement.value = this.state.teamFilter;
              }
            })
            .catch((error) => {
              console.error(`Error loading ${filter.label} data:`, error);
            });
        }
      });
    },

    // Bind filter events
    bindFilterEvents: function () {
      // Bind events for all filter selects
      const filterSelects = document.querySelectorAll(".filter-select");
      filterSelects.forEach((select) => {
        select.addEventListener("change", (e) => {
          const filterKey = e.target.getAttribute("data-filter");
          const filterValue = e.target.value;

          // Update state based on filter key
          if (filterKey === "teamId") {
            this.state.teamFilter = filterValue || null;
          }
          // Add more filter types here as needed

          this.state.currentPage = 1; // Reset to first page when filtering
          this.loadCurrentSection();
        });
      });
    },

    // ==================== PHASE-SPECIFIC METHODS ====================

    // Show phase instance details modal
    showPhaseInstanceDetails: function (phaseId) {
      const modal =
        document.getElementById("phaseDetailsModal") ||
        this.createPhaseDetailsModal();
      const title = document.getElementById("phaseDetailsTitle");
      const content = document.getElementById("phaseDetailsContent");

      // Show loading state
      content.innerHTML = "<p>Loading phase instance details...</p>";
      modal.style.display = "flex";

      // Fetch phase instance details
      const url = `${this.api.baseUrl}${this.api.endpoints.phasesinstance}/${phaseId}`;

      fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Atlassian-Token": "no-check",
        },
        credentials: "same-origin",
      })
        .then((response) => {
          if (!response.ok) {
            return response.text().then((text) => {
              throw new Error(`HTTP ${response.status}: ${text}`);
            });
          }
          return response.json();
        })
        .then((phase) => {
          title.textContent = `Phase Instance: ${phase.phi_name || phase.phm_name}`;

          // Build details HTML
          let html = '<div class="phase-details">';

          // Basic info
          html += '<div class="detail-section">';
          html += "<h4>Basic Information</h4>";
          html += `<p><strong>ID:</strong> ${phase.phi_id}</p>`;
          html += `<p><strong>Name:</strong> ${phase.phi_name || phase.phm_name}</p>`;
          html += `<p><strong>Description:</strong> ${phase.phi_description || phase.phm_description || "N/A"}</p>`;
          html += `<p><strong>Status:</strong> <span class="status-badge status-${(phase.phi_status || "pending").toLowerCase()}">${phase.phi_status || "Pending"}</span></p>`;
          html += `<p><strong>Order:</strong> ${phase.phi_order || phase.phm_order || "N/A"}</p>`;
          html += `<p><strong>Progress:</strong> ${phase.phi_progress_percentage || 0}%</p>`;
          html += "</div>";

          // Timing info
          html += '<div class="detail-section">';
          html += "<h4>Timing Information</h4>";
          html += `<p><strong>Start Time:</strong> ${phase.phi_start_time || "Not started"}</p>`;
          html += `<p><strong>End Time:</strong> ${phase.phi_end_time || "Not completed"}</p>`;
          html += "</div>";

          // Control points management
          html += '<div class="detail-section">';
          html += "<h4>Control Points</h4>";
          html += '<div class="control-buttons">';
          html += `<button class="btn-primary" onclick="adminGui.showControlPointsModal('${phaseId}')">Manage Control Points</button>`;
          html += `<button class="btn-secondary" onclick="adminGui.validateControlPoints('${phaseId}')">Validate All</button>`;
          html += "</div>";
          html += "</div>";

          html += "</div>";
          content.innerHTML = html;
        })
        .catch((error) => {
          console.error("Error loading phase instance details:", error);
          content.innerHTML = `<p class="error">Failed to load phase instance details: ${error.message}</p>`;
        });
    },

    // Show generic entity view modal for all entities
    showGenericEntityView: function (id) {
      // Get current entity configuration
      const entity = this.getEntity(this.state.currentEntity);
      if (!entity) {
        this.showError(
          `Entity configuration not found: ${this.state.currentEntity}`,
        );
        return;
      }

      // Find the record in current data
      const data = this.state.data[this.state.currentEntity] || [];
      const record = data.find((item) => item[entity.fields[0].key] == id);

      if (!record) {
        this.showError(`Record not found with ID: ${id}`);
        return;
      }

      // Use setTimeout to avoid conflicts with Confluence's MutationObserver
      const timeoutId = setTimeout(() => {
        this.activeTimeouts.delete(timeoutId);
        try {
          // Create or get generic view modal
          const modal =
            document.getElementById("genericViewModal") ||
            this.createGenericViewModal();
          const title = document.getElementById("genericViewTitle");
          const content = document.getElementById("genericViewContent");

          if (!modal) {
            console.error(
              "[UMIG] Generic view modal not found or failed to create",
            );
            return;
          }
          if (!title) {
            console.error("[UMIG] Generic view modal title element not found");
            return;
          }
          if (!content) {
            console.error(
              "[UMIG] Generic view modal content element not found",
            );
            return;
          }

          console.log(
            "[UMIG] All generic view modal elements found successfully",
          );

          // Set modal title
          title.textContent = `View ${entity.name.slice(0, -1)} Details`;

          // Build details HTML
          let html = '<div class="generic-entity-details">';

          entity.fields.forEach((field) => {
            if (field.type === "password") return; // Skip password fields

            const value = record[field.key];
            const displayValue = this.formatCellValue(
              record,
              field.key,
              entity,
            );

            html += '<div class="detail-row">';
            html += `<div class="detail-label"><strong>${field.label}:</strong></div>`;
            html += `<div class="detail-value">${displayValue || '<span style="color: #a0aec0;">—</span>'}</div>`;
            html += "</div>";
          });

          html += "</div>";
          content.innerHTML = html;

          // Show modal
          modal.style.display = "flex";
        } catch (error) {
          console.error("[UMIG] Error in showGenericEntityView:", error);
          this.showError(
            `Failed to display ${entity.name} details: ${error.message}`,
          );
        }
      }, 10);

      this.activeTimeouts.add(timeoutId);
    },

    // Create generic view modal if it doesn't exist
    createGenericViewModal: function () {
      try {
        const modalHtml = `
          <div id="genericViewModal" class="modal-overlay" style="display: none;">
            <div class="modal modal-large">
              <div class="modal-header">
                <h3 id="genericViewTitle" class="modal-title">View Details</h3>
                <button class="modal-close" onclick="document.getElementById('genericViewModal').style.display='none'">&times;</button>
              </div>
              <div class="modal-body">
                <div id="genericViewContent"></div>
              </div>
              <div class="modal-footer">
                <button class="btn-secondary" onclick="document.getElementById('genericViewModal').style.display='none'">Close</button>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHtml);
        console.log("[UMIG] Generic view modal created successfully");
        return document.getElementById("genericViewModal");
      } catch (error) {
        console.error("[UMIG] Error creating generic view modal:", error);
        return null;
      }
    },

    // Show control points management modal
    showControlPointsModal: function (phaseId) {
      const modal =
        document.getElementById("controlPointsModal") ||
        this.createControlPointsModal();
      const title = document.getElementById("controlPointsTitle");
      const content = document.getElementById("controlPointsContent");

      content.innerHTML = "<p>Loading control points...</p>";
      modal.style.display = "flex";

      // Fetch control points for the phase
      const url = `${this.api.baseUrl}/phases/${phaseId}/controls`;

      fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Atlassian-Token": "no-check",
        },
        credentials: "same-origin",
      })
        .then((response) => {
          if (!response.ok) {
            return response.text().then((text) => {
              throw new Error(`HTTP ${response.status}: ${text}`);
            });
          }
          return response.json();
        })
        .then((controls) => {
          title.textContent = `Control Points Management`;

          let html = '<div class="control-points-list">';

          if (controls.length === 0) {
            html += "<p>No control points defined for this phase.</p>";
          } else {
            html += '<table class="control-points-table">';
            html +=
              "<thead><tr><th>Control Point</th><th>Status</th><th>Validators</th><th>Actions</th></tr></thead>";
            html += "<tbody>";

            controls.forEach((control) => {
              const statusClass = control.cti_status
                ? control.cti_status.toLowerCase()
                : "pending";
              html += "<tr>";
              html += `<td>${control.cti_name || control.ctm_name}</td>`;
              html += `<td><span class="status-badge status-${statusClass}">${control.cti_status || "Pending"}</span></td>`;
              html += `<td>IT: ${control.it_validator || "None"}<br>Biz: ${control.biz_validator || "None"}</td>`;
              html += `<td>
                            <button class="btn-small" onclick="adminGui.updateControlPoint('${control.cti_id}', 'passed')">Pass</button>
                            <button class="btn-small btn-warning" onclick="adminGui.updateControlPoint('${control.cti_id}', 'failed')">Fail</button>
                            <button class="btn-small btn-danger" onclick="adminGui.overrideControlPoint('${control.cti_id}')">Override</button>
                        </td>`;
              html += "</tr>";
            });

            html += "</tbody></table>";
          }

          html += "</div>";
          content.innerHTML = html;
        })
        .catch((error) => {
          console.error("Error loading control points:", error);
          content.innerHTML = `<p class="error">Failed to load control points: ${error.message}</p>`;
        });
    },

    // Show progress update modal
    showProgressModal: function (phaseId) {
      const modal =
        document.getElementById("progressModal") || this.createProgressModal();

      // Pre-populate with current progress
      const progressInput = document.getElementById("progressInput");
      const saveBtn = document.getElementById("saveProgress");

      // Fetch current progress
      fetch(`${this.api.baseUrl}/phases/${phaseId}/progress`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      })
        .then((response) => response.json())
        .then((data) => {
          progressInput.value = data.progress_percentage || 0;
        })
        .catch((error) => {
          console.error("Error loading current progress:", error);
          progressInput.value = 0;
        });

      // Remove existing event listeners
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

      // Add new event listener
      newSaveBtn.addEventListener("click", () => {
        this.updatePhaseProgress(phaseId, progressInput.value);
        modal.style.display = "none";
      });

      modal.style.display = "flex";
    },

    // Show move/reorder phase modal
    showMovePhaseModal: function (phaseId) {
      const modal =
        document.getElementById("movePhaseModal") ||
        this.createMovePhaseModal();
      const orderInput = document.getElementById("newOrderInput");
      const saveBtn = document.getElementById("saveMovePhase");

      // Remove existing event listeners
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

      // Add new event listener
      newSaveBtn.addEventListener("click", () => {
        this.movePhase(phaseId, parseInt(orderInput.value));
        modal.style.display = "none";
      });

      modal.style.display = "flex";
    },

    // Update control point status
    updateControlPoint: function (controlId, status) {
      const url = `${this.api.baseUrl}/phases/{phi_id}/controls/${controlId}`;

      fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ cti_status: status }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then((result) => {
          this.showNotification(
            `Control point ${status} successfully`,
            "success",
          );
          // Refresh the control points modal if visible
          const modal = document.getElementById("controlPointsModal");
          if (modal && modal.style.display === "flex") {
            // Get phase ID from current context and refresh
            this.refreshControlPoints();
          }
        })
        .catch((error) => {
          console.error("Error updating control point:", error);
          this.showNotification(
            `Failed to update control point: ${error.message}`,
            "error",
          );
        });
    },

    // Override control point with reason
    overrideControlPoint: function (controlId) {
      const reason = prompt(
        "Please provide a reason for overriding this control point:",
      );
      if (!reason) return;

      const url = `${this.api.baseUrl}/phases/{phi_id}/controls/${controlId}/override`;

      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ reason: reason }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then((result) => {
          this.showNotification(
            "Control point overridden successfully",
            "success",
          );
          this.refreshControlPoints();
        })
        .catch((error) => {
          console.error("Error overriding control point:", error);
          this.showNotification(
            `Failed to override control point: ${error.message}`,
            "error",
          );
        });
    },

    // Update phase progress
    updatePhaseProgress: function (phaseId, progress) {
      const url = `${this.api.baseUrl}${this.api.endpoints.phasesinstance}/${phaseId}`;

      fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phi_progress_percentage: parseInt(progress) }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then((result) => {
          this.showNotification(
            "Phase progress updated successfully",
            "success",
          );
          this.refreshCurrentSection();
        })
        .catch((error) => {
          console.error("Error updating phase progress:", error);
          this.showNotification(
            `Failed to update progress: ${error.message}`,
            "error",
          );
        });
    },

    // Move phase to new order
    movePhase: function (phaseId, newOrder) {
      const endpoint =
        this.state.currentEntity === "phasesmaster"
          ? "phasesmastermove"
          : "phasesinstancemove";
      const url = `${this.api.baseUrl}/${endpoint}/${phaseId}`;

      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ newOrder: newOrder }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then((result) => {
          this.showNotification("Phase moved successfully", "success");
          this.refreshCurrentSection();
        })
        .catch((error) => {
          console.error("Error moving phase:", error);
          this.showNotification(
            `Failed to move phase: ${error.message}`,
            "error",
          );
        });
    },

    // Validate all control points for a phase
    validateControlPoints: function (phaseId) {
      const url = `${this.api.baseUrl}/phases/${phaseId}/controls/validate`;

      fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then((result) => {
          const passed = result.passed || 0;
          const failed = result.failed || 0;
          const total = result.total || 0;

          this.showNotification(
            `Validation complete: ${passed} passed, ${failed} failed out of ${total} total`,
            "info",
          );
          this.refreshControlPoints();
        })
        .catch((error) => {
          console.error("Error validating control points:", error);
          this.showNotification(
            `Failed to validate: ${error.message}`,
            "error",
          );
        });
    },

    // Refresh control points display
    refreshControlPoints: function () {
      // Implementation would refresh the currently visible control points modal
      // This is a placeholder for the actual refresh logic
    },

    // ==================== MODAL CREATION HELPERS ====================

    // Create phase details modal if it doesn't exist
    createPhaseDetailsModal: function () {
      const modalHtml = `
                <div id="phaseDetailsModal" class="modal-overlay" style="display: none;">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 id="phaseDetailsTitle" class="modal-title">Phase Details</h3>
                            <button class="modal-close" onclick="document.getElementById('phaseDetailsModal').style.display='none'">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="phaseDetailsContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('phaseDetailsModal').style.display='none'">Close</button>
                        </div>
                    </div>
                </div>
            `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      return document.getElementById("phaseDetailsModal");
    },

    // Create control points modal if it doesn't exist
    createControlPointsModal: function () {
      const modalHtml = `
                <div id="controlPointsModal" class="modal-overlay" style="display: none;">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 id="controlPointsTitle" class="modal-title">Control Points</h3>
                            <button class="modal-close" onclick="document.getElementById('controlPointsModal').style.display='none'">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="controlPointsContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('controlPointsModal').style.display='none'">Close</button>
                        </div>
                    </div>
                </div>
            `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      return document.getElementById("controlPointsModal");
    },

    // Create progress modal if it doesn't exist
    createProgressModal: function () {
      const modalHtml = `
                <div id="progressModal" class="modal-overlay" style="display: none;">
                    <div class="modal modal-small">
                        <div class="modal-header">
                            <h3 class="modal-title">Update Progress</h3>
                            <button class="modal-close" onclick="document.getElementById('progressModal').style.display='none'">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="progressInput">Progress Percentage</label>
                                <input type="number" id="progressInput" class="form-control" min="0" max="100" step="1">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('progressModal').style.display='none'">Cancel</button>
                            <button id="saveProgress" class="btn-primary">Update Progress</button>
                        </div>
                    </div>
                </div>
            `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      return document.getElementById("progressModal");
    },

    // Create move phase modal if it doesn't exist
    createMovePhaseModal: function () {
      const modalHtml = `
                <div id="movePhaseModal" class="modal-overlay" style="display: none;">
                    <div class="modal modal-small">
                        <div class="modal-header">
                            <h3 class="modal-title">Move Phase</h3>
                            <button class="modal-close" onclick="document.getElementById('movePhaseModal').style.display='none'">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="newOrderInput">New Order Position</label>
                                <input type="number" id="newOrderInput" class="form-control" min="1" step="1">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('movePhaseModal').style.display='none'">Cancel</button>
                            <button id="saveMovePhase" class="btn-primary">Move Phase</button>
                        </div>
                    </div>
                </div>
            `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      return document.getElementById("movePhaseModal");
    },
  };

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.adminGui.init();
    });
  } else {
    window.adminGui.init();
  }
})();
