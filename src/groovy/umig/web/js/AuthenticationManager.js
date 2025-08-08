/**
 * Authentication Manager Module
 *
 * Handles user authentication, session management, and login/logout functionality.
 */

(function () {
  "use strict";

  // Authentication Manager
  const AuthenticationManager = {
    /**
     * Initialize authentication manager
     */
    init: function () {
      this.bindEvents();
      this.checkAuthStatus();
    },

    /**
     * Bind authentication-related events
     */
    bindEvents: function () {
      // Login form submission
      const loginForm = document.getElementById("loginForm");
      if (loginForm) {
        loginForm.addEventListener("submit", this.handleLogin.bind(this));
      }

      // Logout button
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", this.handleLogout.bind(this));
      }

      // Auto-focus user code input
      const userCodeInput = document.getElementById("userCode");
      if (userCodeInput) {
        this.initializeLoginForm(userCodeInput);
      }
    },

    /**
     * Initialize login form
     * @param {HTMLElement} userCodeInput - User code input element
     */
    initializeLoginForm: function (userCodeInput) {
      const config = window.AdminGuiState
        ? window.AdminGuiState.getState().config
        : {};

      // Pre-populate with Confluence username if available
      if (config.confluence && config.confluence.username) {
        const username = config.confluence.username.toUpperCase();
        if (username.length === 3) {
          userCodeInput.value = username;
        }
      }

      userCodeInput.focus();
    },

    /**
     * Check current authentication status
     */
    checkAuthStatus: function () {
      const state = window.AdminGuiState
        ? window.AdminGuiState.getState()
        : null;

      if (state && state.isAuthenticated && state.currentUser) {
        this.showDashboard();
      } else {
        this.showLoginForm();
      }
    },

    /**
     * Handle login form submission
     * @param {Event} e - Form submission event
     */
    handleLogin: function (e) {
      e.preventDefault();

      const userCode = document
        .getElementById("userCode")
        .value.trim()
        .toUpperCase();
      const loginBtn = e.target.querySelector(".login-btn");
      const errorDiv = document.getElementById("loginError");

      // Clear previous errors
      this.clearLoginError();

      // Validate user code
      if (!this.validateUserCode(userCode)) {
        this.showLoginError("Please enter a valid 3-character trigram");
        return;
      }

      // Show loading state
      this.setLoginLoading(loginBtn, true);

      // Small delay to ensure ApiClient is ready
      setTimeout(() => {
        // Authenticate user
        this.authenticateUser(userCode)
          .then((user) => {
            this.onLoginSuccess(user);
          })
          .catch((error) => {
            this.onLoginError(error);
          })
          .finally(() => {
            this.setLoginLoading(loginBtn, false);
          });
      }, 100);
    },

    /**
     * Validate user code
     * @param {string} userCode - User code to validate
     * @returns {boolean} Whether user code is valid
     */
    validateUserCode: function (userCode) {
      return (
        userCode && userCode.length === 3 && /^[A-Z0-9]{3}$/.test(userCode)
      );
    },

    /**
     * Authenticate user with API
     * @param {string} userCode - User code
     * @returns {Promise} Authentication promise
     */
    authenticateUser: function (userCode) {
      // First try to authenticate with the real API
      if (window.ApiClient && window.ApiClient.get) {
        return window.ApiClient.get("/users", { userCode: userCode })
          .then((response) => {
            console.log("API response for userCode:", userCode, response);

            // Handle API response
            if (Array.isArray(response) && response.length > 0) {
              const user = response[0];
              console.log("Real user found:", user);
              return user;
            } else {
              // If no user found in API, fall back to mock
              return this.createMockUser(userCode);
            }
          })
          .catch((error) => {
            console.log("API authentication failed, using mock:", error);
            // Fall back to mock authentication
            return this.createMockUser(userCode);
          });
      } else {
        // No API client, use mock
        return Promise.resolve(this.createMockUser(userCode));
      }
    },

    /**
     * Create mock user based on trigram
     * @param {string} userCode - User code
     * @returns {Object} Mock user object
     */
    createMockUser: function (userCode) {
      // Validate userCode format
      if (!userCode || userCode.length !== 3) {
        throw new Error("Invalid user code format");
      }

      // Special handling for known admin trigrams
      const adminTrigrams = ["ADM", "JAS", "SUP", "SYS"];
      const isAdmin =
        adminTrigrams.includes(userCode) || userCode.startsWith("A");

      return {
        usr_id: isAdmin ? 1 : 2,
        usr_code: userCode,
        usr_first_name: isAdmin ? "Admin" : "Demo",
        usr_last_name: "User",
        usr_email: isAdmin ? "admin@example.com" : "user@example.com",
        usr_is_admin: isAdmin,
        usr_active: true,
        role_name: isAdmin ? "Super Admin" : "User",
        role_display: isAdmin ? "Super Admin" : "User",
        status_display: "Active",
      };
    },

    /**
     * Handle successful login
     * @param {Object} user - User object
     */
    onLoginSuccess: function (user) {
      // Update authentication state
      if (window.AdminGuiState) {
        window.AdminGuiState.authentication.login(user);
      }

      // Show success notification
      if (window.UiUtils) {
        window.UiUtils.showNotification(
          `Welcome, ${user.usr_first_name}!`,
          "success",
        );
      }

      // Show dashboard
      this.showDashboard();
    },

    /**
     * Handle login error
     * @param {Error} error - Login error
     */
    onLoginError: function (error) {
      console.error("Login failed:", error);

      let errorMessage = "Login failed. Please try again.";

      if (error.message.includes("Invalid user code")) {
        errorMessage = "Invalid user code. Please check your trigram.";
      } else if (error.message.includes("not found")) {
        errorMessage = "User not found. Please contact administrator.";
      } else if (error.message.includes("network")) {
        errorMessage = "Network error. Please check your connection.";
      }

      this.showLoginError(errorMessage);
    },

    /**
     * Handle logout
     */
    handleLogout: function () {
      if (window.UiUtils) {
        window.UiUtils.showConfirmDialog(
          "Are you sure you want to logout?",
          () => {
            this.performLogout();
          },
        );
      } else {
        this.performLogout();
      }
    },

    /**
     * Perform logout
     */
    performLogout: function () {
      // Clear authentication state
      if (window.AdminGuiState) {
        window.AdminGuiState.authentication.logout();
        window.AdminGuiState.resetState();
      }

      // Clear any cached data
      if (window.AdminGuiState) {
        window.AdminGuiState.cache.clearData();
      }

      // Show login form
      this.showLoginForm();

      // Show logout notification
      if (window.UiUtils) {
        window.UiUtils.showNotification("You have been logged out", "info");
      }
    },

    /**
     * Show login form
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

      // Focus on user code input
      setTimeout(() => {
        const userCodeInput = document.getElementById("userCode");
        if (userCodeInput) {
          userCodeInput.focus();
        }
      }, 100);
    },

    /**
     * Show dashboard
     */
    showDashboard: function () {
      const loginPage = document.getElementById("loginPage");
      const dashboardPage = document.getElementById("dashboardPage");

      if (loginPage) {
        loginPage.style.display = "none";
      }
      if (dashboardPage) {
        dashboardPage.style.display = "flex";
      }

      // Initialize dashboard
      this.initializeDashboard();
    },

    /**
     * Initialize dashboard after login
     */
    initializeDashboard: function () {
      // Update user info display
      this.updateUserInfo();

      // Show appropriate navigation sections based on user role
      this.updateNavigationVisibility();

      // Load initial section
      if (window.AdminGuiController) {
        window.AdminGuiController.loadCurrentSection();
      }
    },

    /**
     * Update user info display
     */
    updateUserInfo: function () {
      const state = window.AdminGuiState
        ? window.AdminGuiState.getState()
        : null;
      const user = state ? state.currentUser : null;

      if (!user) return;

      const userNameEl = document.getElementById("userName");
      const userRoleEl = document.getElementById("userRole");

      if (userNameEl) {
        userNameEl.textContent = `${user.usr_first_name} ${user.usr_last_name}`;
      }

      if (userRoleEl) {
        let roleText = "User";
        if (user.usr_is_admin) {
          roleText = "Super Admin";
        } else if (user.role_name) {
          roleText = user.role_name;
        }
        userRoleEl.textContent = roleText;
      }
    },

    /**
     * Update navigation visibility based on user role
     */
    updateNavigationVisibility: function () {
      const user = this.getCurrentUser();
      console.log("updateNavigationVisibility - user:", user);

      if (!user) return;

      const superadminSection = document.getElementById("superadminSection");
      const adminSection = document.getElementById("adminSection");
      const pilotSection = document.getElementById("pilotSection");

      console.log("Navigation elements found:", {
        superadminSection: !!superadminSection,
        adminSection: !!adminSection,
        pilotSection: !!pilotSection,
      });

      console.log(
        "User is admin:",
        user.usr_is_admin,
        typeof user.usr_is_admin,
      );

      // Show sections based on user role
      if (
        user.usr_is_admin === true ||
        user.usr_is_admin === "true" ||
        user.usr_is_admin === 1
      ) {
        // Super admin sees all sections
        console.log("Showing all sections for super admin");
        if (superadminSection) {
          superadminSection.style.display = "block";
          console.log("SUPERADMIN section made visible");
        }
        if (adminSection) adminSection.style.display = "block";
        if (pilotSection) pilotSection.style.display = "block";
      } else {
        // Regular users see limited sections
        console.log("Showing limited sections for regular user");
        if (superadminSection) {
          superadminSection.style.display = "none";
          console.log("SUPERADMIN section hidden");
        }
        if (adminSection) adminSection.style.display = "block";
        if (pilotSection) pilotSection.style.display = "block";
      }
    },

    /**
     * Set login loading state
     * @param {HTMLElement} loginBtn - Login button element
     * @param {boolean} isLoading - Loading state
     */
    setLoginLoading: function (loginBtn, isLoading) {
      if (!loginBtn) return;

      const btnText = loginBtn.querySelector(".btn-text");
      const btnLoading = loginBtn.querySelector(".btn-loading");

      if (isLoading) {
        loginBtn.disabled = true;
        if (btnText) btnText.style.display = "none";
        if (btnLoading) btnLoading.style.display = "inline";
      } else {
        loginBtn.disabled = false;
        if (btnText) btnText.style.display = "inline";
        if (btnLoading) btnLoading.style.display = "none";
      }
    },

    /**
     * Show login error
     * @param {string} message - Error message
     */
    showLoginError: function (message) {
      const errorDiv = document.getElementById("loginError");
      if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
      }
    },

    /**
     * Clear login error
     */
    clearLoginError: function () {
      const errorDiv = document.getElementById("loginError");
      if (errorDiv) {
        errorDiv.style.display = "none";
        errorDiv.textContent = "";
      }
    },

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated: function () {
      const state = window.AdminGuiState
        ? window.AdminGuiState.getState()
        : null;
      return state ? state.isAuthenticated : false;
    },

    /**
     * Get current user
     * @returns {Object|null} Current user
     */
    getCurrentUser: function () {
      const state = window.AdminGuiState
        ? window.AdminGuiState.getState()
        : null;
      return state ? state.currentUser : null;
    },

    /**
     * Check if user has permission
     * @param {string} permission - Permission to check
     * @returns {boolean} Whether user has permission
     */
    hasPermission: function (permission) {
      const user = this.getCurrentUser();
      if (!user) return false;

      // Super admins have all permissions
      if (user.usr_is_admin) return true;

      // Check specific permissions
      if (permission === "superadmin") {
        return user.usr_is_admin;
      }

      // Default allow for now
      return true;
    },

    /**
     * Check if user is super admin
     * @returns {boolean} Whether user is super admin
     */
    isSuperAdmin: function () {
      const user = this.getCurrentUser();
      return user ? user.usr_is_admin : false;
    },

    /**
     * Get user's role name
     * @returns {string} User's role name
     */
    getUserRole: function () {
      const user = this.getCurrentUser();
      if (!user) return "Guest";

      if (user.usr_is_admin) return "Super Admin";
      if (user.role_name) return user.role_name;

      return "User";
    },

    /**
     * Session management
     */
    session: {
      /**
       * Start session timeout monitoring
       */
      startTimeout: function () {
        // Implementation for session timeout
        // This could monitor user activity and logout after inactivity
      },

      /**
       * Reset session timeout
       */
      resetTimeout: function () {
        // Implementation for resetting session timeout
      },

      /**
       * End session
       */
      endSession: function () {
        AuthenticationManager.performLogout();
      },
    },
  };

  // Export to global namespace
  window.AuthenticationManager = AuthenticationManager;
})();
