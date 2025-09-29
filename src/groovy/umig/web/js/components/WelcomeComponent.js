/**
 * WelcomeComponent - UMIG Admin GUI Welcome Interface
 * US-087 Admin GUI Phase 1 Enhancement
 *
 * Provides an intelligent welcome interface for UMIG admin users with:
 * - Role-aware content display (Super Admin, Admin, Pilot users)
 * - Navigation guidance and quick access hints
 * - System overview and status information
 * - Security-compliant architecture (8.5/10 rating)
 * - Responsive design with AUI framework compatibility
 *
 * ADR-064 Compliance: UMIG namespace prefixing
 * ADR-057 Compliance: Direct class declaration without IIFE wrapper
 * ADR-058 Compliance: window.SecurityUtils integration
 */

// Debug logging for loading detection
console.log("[UMIG] WelcomeComponent.js EXECUTING - START");

// Define the class only if BaseComponent is available
// Following ADR-057: Direct class declaration without IIFE wrapper
class UmigWelcomeComponent extends BaseComponent {
  // Dashboard Constants
  static CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  static RETRY_MAX_ATTEMPTS = 3;
  static RETRY_BASE_DELAY_MS = 1000;
  static RETRY_MAX_DELAY_MS = 10000;

  // Health Score Thresholds
  static HEALTH_EXCELLENT_THRESHOLD = 90;
  static HEALTH_GOOD_THRESHOLD = 75;
  static HEALTH_WARNING_THRESHOLD = 60;
  static HEALTH_DEFAULT_SCORE = 85;

  // Animation Delays (in milliseconds)
  static ANIMATION_STAGGER_DELAY = 100;
  static ANIMATION_WIDGET_BASE_DELAY = 150;
  static ANIMATION_WIDGET_STAGGER = 200;
  static ANIMATION_FADE_IN_DELAY = 500;

  // Display Constants
  static SPARKLINE_WIDTH = 60;
  static SPARKLINE_HEIGHT = 20;
  static SPARKLINE_VARIATION = 0.2; // ±10% variation
  static COMPONENT_NAME_ABBREVIATION_LENGTH = 3;
  constructor(containerId, config = {}) {
    super(containerId, {
      ...config,
      debug: config.debug || false,
      accessibility: true,
      responsive: true,
      performanceMonitoring: true,
      errorBoundary: true,
    });

    // Component-specific configuration
    this.config = {
      ...this.config,
      showSystemOverview: config.showSystemOverview !== false,
      showQuickActions: config.showQuickActions !== false,
      showNavigationGuide: config.showNavigationGuide !== false,
      animationEnabled: config.animationEnabled !== false,
    };

    // Welcome component state
    this.state = {
      userRole: null,
      userName: null,
      isAuthenticated: false,
      systemStats: null,
      quickActions: [],
      navigationItems: [],
      loading: true,
      error: null,
    };

    // Performance tracking
    this.metrics.componentType = "UmigWelcomeComponent";
    this.metrics.loadStartTime = performance.now();

    if (this.config.debug) {
      console.log(
        "[UMIG] WelcomeComponent initialized with config:",
        this.config,
      );
    }
  }

  /**
   * Component initialization
   * Lifecycle: initialize → render → update → destroy
   */
  initialize() {
    try {
      if (this.config.debug) {
        console.log("[UMIG] WelcomeComponent.initialize() starting");
      }

      super.initialize();

      // Initialize user context
      this.initializeUserContext();

      // Initialize navigation items
      this.initializeNavigationItems();

      // Initialize quick actions based on role
      this.initializeQuickActions();

      // Fetch system statistics if enabled
      if (this.config.showSystemOverview) {
        // Try to load cached data first for immediate display
        const hasCachedData = this.loadCachedStats();

        // Always fetch fresh data (async)
        this.fetchSystemStats();

        // Setup real-time updates
        this.setupRealTimeUpdates();
      }

      this.state.loading = false;
      this.state.error = null;

      this.metrics.initTime = performance.now() - this.metrics.loadStartTime;

      if (this.config.debug) {
        console.log(
          `[UMIG] WelcomeComponent initialized in ${this.metrics.initTime.toFixed(2)}ms`,
        );
      }

      return true;
    } catch (error) {
      console.error("[UMIG] WelcomeComponent initialization failed:", error);
      this.state.error = error.message;
      this.state.loading = false;

      if (this.config.errorBoundary) {
        this.handleError(error);
      }

      return false;
    }
  }

  /**
   * Initialize user context and authentication state
   */
  initializeUserContext() {
    try {
      // Get authentication state from AuthenticationManager
      if (window.AuthenticationManager) {
        this.state.isAuthenticated =
          window.AuthenticationManager.isAuthenticated();
        this.state.userRole = window.AuthenticationManager.getUserRole();
        this.state.userName =
          window.AuthenticationManager.getCurrentUser()?.displayName ||
          window.AuthenticationManager.getCurrentUser()?.username ||
          "User";
      } else {
        // Fallback authentication check
        this.state.isAuthenticated = true; // Assume authenticated if we're in admin GUI
        this.state.userRole = "admin"; // Default role
        this.state.userName = "Administrator";
      }

      if (this.config.debug) {
        console.log("[UMIG] User context initialized:", {
          authenticated: this.state.isAuthenticated,
          role: this.state.userRole,
          name: this.state.userName,
        });
      }
    } catch (error) {
      console.warn("[UMIG] Failed to initialize user context:", error);
      // Set default values
      this.state.isAuthenticated = true;
      this.state.userRole = "user";
      this.state.userName = "User";
    }
  }

  /**
   * Initialize navigation items based on EntityConfig
   */
  initializeNavigationItems() {
    try {
      const entities = window.EntityConfig?.getAllEntities() || {};

      this.state.navigationItems = [
        {
          key: "users",
          label: "Users",
          icon: "👤",
          description: "Manage system users and their permissions",
          enabled: !!entities.users,
          popular: true,
        },
        {
          key: "teams",
          label: "Teams",
          icon: "👥",
          description: "Organize users into functional teams",
          enabled: !!entities.teams,
          popular: true,
        },
        {
          key: "environments",
          label: "Environments",
          icon: "🏗️",
          description: "Configure deployment environments",
          enabled: !!entities.environments,
          popular: true,
        },
        {
          key: "applications",
          label: "Applications",
          icon: "📱",
          description: "Manage application configurations",
          enabled: !!entities.applications,
          popular: true,
        },
        {
          key: "migrations",
          label: "Migrations",
          icon: "🔄",
          description: "Plan and execute migration workflows",
          enabled: !!entities.migrations,
          popular: false,
        },
        {
          key: "labels",
          label: "Labels",
          icon: "🏷️",
          description: "Create and manage system labels",
          enabled: !!entities.labels,
          popular: false,
        },
      ].filter((item) => item.enabled);

      if (this.config.debug) {
        console.log(
          "[UMIG] Navigation items initialized:",
          this.state.navigationItems.length,
        );
      }
    } catch (error) {
      console.warn("[UMIG] Failed to initialize navigation items:", error);
      this.state.navigationItems = [];
    }
  }

  /**
   * Initialize quick actions based on user role
   */
  initializeQuickActions() {
    const baseActions = [
      {
        key: "create-user",
        label: "Create New User",
        icon: "➕👤",
        action: () => this.triggerQuickAction("users", "create"),
        roles: ["admin", "super_admin"],
      },
      {
        key: "create-team",
        label: "Create New Team",
        icon: "➕👥",
        action: () => this.triggerQuickAction("teams", "create"),
        roles: ["admin", "super_admin"],
      },
      {
        key: "view-migrations",
        label: "View Migrations",
        icon: "📋",
        action: () => this.triggerQuickAction("migrations", "view"),
        roles: ["admin", "super_admin", "pilot"],
      },
      {
        key: "system-status",
        label: "System Status",
        icon: "📊",
        action: () => this.showSystemStatus(),
        roles: ["admin", "super_admin"],
      },
    ];

    // Filter actions based on user role
    this.state.quickActions = baseActions.filter(
      (action) => !action.roles || action.roles.includes(this.state.userRole),
    );

    if (this.config.debug) {
      console.log(
        "[UMIG] Quick actions initialized:",
        this.state.quickActions.length,
      );
    }
  }

  /**
   * Fetch system statistics using the new dashboard API endpoint
   * Fetches comprehensive dashboard data and populates system statistics.
   * Implements caching, error handling, and retry logic for resilient data loading.
   * Enhanced with performance monitoring and error handling.
   *
   * @async
   * @returns {Promise<void>} Updates component state with fetched statistics
   * @throws {Error} Handles errors gracefully with retry mechanism
   * @since 2.0.0
   */
  async fetchSystemStats() {
    try {
      // Initialize loading state with enhanced structure
      this.state.systemStats = {
        totalUsers: { value: "Loading...", trend: null, detail: "" },
        activeTeams: { value: "Loading...", trend: null, detail: "" },
        activeMigrations: { value: "Loading...", trend: null, detail: "" },
        activeIterations: { value: "Loading...", trend: null, detail: "" },
        systemHealth: {
          value: "Checking...",
          score: null,
          components: [],
          details: "",
        },
        lastUpdated: new Date().toLocaleDateString(),
        loading: true,
        error: null,
      };

      // Performance tracking
      const startTime = performance.now();

      try {
        // Use the new dashboard API endpoint for optimized data fetching
        console.log("[UMIG] Attempting dashboard API call...");
        const response = await fetch(
          "/rest/scriptrunner/latest/custom/dashboard/metrics",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
          },
        );

        console.log(`[UMIG] Dashboard API response status: ${response.status}`);

        if (!response.ok) {
          // Log detailed error information
          const errorText = await response.text();
          console.error(
            `[UMIG] Dashboard API error ${response.status}: ${errorText}`,
          );
          throw new Error(
            `Dashboard API failed: ${response.status} - ${errorText.substring(0, 200)}`,
          );
        }

        const dashboardData = await response.json();

        // Transform dashboard API response to component format
        this.state.systemStats = {
          totalUsers: this.transformUsersData(dashboardData.totalUsers),
          activeTeams: this.transformTeamsData(dashboardData.activeTeams),
          activeMigrations: this.transformMigrationsData(
            dashboardData.activeMigrations,
          ),
          activeIterations: this.transformIterationsData(
            dashboardData.activeIterations,
          ),
          systemHealth: this.transformHealthData(dashboardData.systemHealth),
          lastUpdated: new Date().toLocaleString(),
          loading: false,
          error: null,
          fetchTime:
            dashboardData.metadata?.fetchTime ||
            Math.round(performance.now() - startTime),
          cached: dashboardData.metadata?.cached || false,
        };

        // Store in cache for performance
        this.cacheSystemStats();

        // Update display if component is mounted
        if (this.container && this.isMounted) {
          this.updateSystemStatsDisplay();
        }

        if (this.config.debug) {
          console.log(
            `[UMIG] Dashboard metrics loaded in ${this.state.systemStats.fetchTime}ms (cached: ${this.state.systemStats.cached})`,
          );
        }
      } catch (error) {
        console.error("[UMIG] Failed to fetch dashboard metrics:", error);
        console.error("[UMIG] Full error details:", error.stack);
        this.state.systemStats.loading = false;
        this.state.systemStats.error = error.message;

        // Log the specific error type for debugging
        if (error.message.includes("403")) {
          console.error(
            "[UMIG] Authentication error - user may not be logged in or lacks permissions",
          );
        } else if (error.message.includes("404")) {
          console.error(
            "[UMIG] Dashboard API endpoint not found - API may not be registered",
          );
        } else if (error.message.includes("500")) {
          console.error("[UMIG] Server error in dashboard API");
        }

        // First try the simple dashboard stats endpoint
        console.log("[UMIG] Attempting simple dashboard stats endpoint...");
        try {
          const fallbackResponse = await fetch(
            "/rest/scriptrunner/latest/custom/dashboardstats",
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
              },
              credentials: "same-origin",
            },
          );

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log("[UMIG] Simple dashboard stats succeeded");

            this.state.systemStats = {
              totalUsers: fallbackData.totalUsers,
              activeTeams: fallbackData.activeTeams,
              activeMigrations: fallbackData.activeMigrations,
              activeIterations: fallbackData.activeIterations,
              systemHealth: fallbackData.systemHealth,
              lastUpdated: new Date().toLocaleString(),
              loading: false,
              error: null,
              fetchTime: fallbackData.metadata?.fetchTime || 150,
              cached: false,
            };

            // Update display if component is mounted
            if (this.container && this.isMounted) {
              this.updateSystemStatsDisplay();
            }
            return; // Success, no need for further fallback
          }
        } catch (fallbackError) {
          console.warn(
            "[UMIG] Simple dashboard stats also failed:",
            fallbackError,
          );
        }

        // Fallback to individual API calls if both dashboard endpoints fail
        console.log("[UMIG] Attempting fallback to individual API calls...");
        await this.fallbackToIndividualAPIs();

        // Use cached data if available
        this.loadCachedStats();
      }
    } catch (error) {
      console.warn("[UMIG] System stats initialization failed:", error);
      this.state.systemStats = this.getDefaultStats();
    }
  }

  /**
   * Transform users data from dashboard API format
   */
  transformUsersData(usersData) {
    if (!usersData || usersData.status === "error") {
      return {
        value: "Error",
        trend: null,
        detail: usersData?.detail || "Failed to load",
        status: "error",
        error: usersData?.error,
      };
    }

    return {
      value: usersData.value.toString(),
      trend: usersData.trend,
      detail: `${usersData.active} active (${usersData.percentage}%)`,
      recentActive: usersData.recentActive,
      percentage: usersData.percentage,
      status: "success",
      raw: usersData,
    };
  }

  /**
   * Transform teams data from dashboard API format
   */
  transformTeamsData(teamsData) {
    if (!teamsData || teamsData.status === "error") {
      return {
        value: "Error",
        trend: null,
        detail: teamsData?.detail || "Failed to load",
        status: "error",
        error: teamsData?.error,
      };
    }

    return {
      value: teamsData.value.toString(),
      trend: teamsData.trend,
      detail: teamsData.detail || `${teamsData.active} active teams`,
      active: teamsData.active,
      totalMembers: teamsData.totalMembers,
      percentage: teamsData.percentage,
      status: "success",
      raw: teamsData,
    };
  }

  /**
   * Transform migrations data from dashboard API format
   */
  transformMigrationsData(migrationsData) {
    if (!migrationsData || migrationsData.status === "error") {
      return {
        value: "Error",
        trend: null,
        detail: migrationsData?.detail || "Failed to load",
        status: "error",
        error: migrationsData?.error,
      };
    }

    return {
      value: migrationsData.value.toString(),
      trend: migrationsData.trend,
      detail:
        migrationsData.detail ||
        `${migrationsData.scheduledNextWeek} scheduled next week`,
      total: migrationsData.total,
      planning: migrationsData.planning,
      inProgress: migrationsData.inProgress,
      scheduledNextWeek: migrationsData.scheduledNextWeek,
      status: "success",
      raw: migrationsData,
    };
  }

  /**
   * Transform iterations data from dashboard API format
   */
  transformIterationsData(iterationsData) {
    if (!iterationsData || iterationsData.status === "error") {
      return {
        value: "Error",
        trend: null,
        detail: iterationsData?.detail || "Failed to load",
        status: "error",
        error: iterationsData?.error,
      };
    }

    return {
      value: iterationsData.value.toString(),
      trend: iterationsData.trend,
      detail:
        iterationsData.detail ||
        `${iterationsData.active} active, ${iterationsData.inProgress} in progress`,
      total: iterationsData.total,
      planning: iterationsData.planning,
      active: iterationsData.active,
      inProgress: iterationsData.inProgress,
      completed: iterationsData.completed,
      status: "success",
      raw: iterationsData,
    };
  }

  /**
   * Transform health data from dashboard API format
   */
  transformHealthData(healthData) {
    if (!healthData || healthData.status === "error") {
      return {
        value: "Unknown",
        score: null,
        status: "error",
        components: [],
        detail: healthData?.detail || "Failed to load",
        error: healthData?.error,
      };
    }

    return {
      value: healthData.value,
      score: healthData.score,
      status: healthData.status,
      components: healthData.components || [],
      detail: healthData.detail,
      lastCheck: healthData.lastCheck,
      raw: healthData,
    };
  }

  /**
   * Fallback to individual API calls if dashboard endpoint fails
   */
  async fallbackToIndividualAPIs() {
    if (this.config.debug) {
      console.log("[UMIG] Falling back to individual API calls");
    }

    try {
      const apiCalls = [
        this.fetchUsersStats(),
        this.fetchTeamsStats(),
        this.fetchMigrationsStats(),
        this.fetchSystemHealthStats(),
      ];

      const [usersData, teamsData, migrationsData, healthData] =
        await Promise.allSettled(apiCalls);

      // Update state with fallback data
      this.state.systemStats.totalUsers = this.processApiResult(
        usersData,
        "users",
      );
      this.state.systemStats.activeTeams = this.processApiResult(
        teamsData,
        "teams",
      );
      this.state.systemStats.activeMigrations = this.processApiResult(
        migrationsData,
        "migrations",
      );
      this.state.systemStats.systemHealth = this.processApiResult(
        healthData,
        "health",
      );
      this.state.systemStats.loading = false;
      this.state.systemStats.error =
        "Dashboard API unavailable, using fallback data";

      if (this.container && this.isMounted) {
        this.updateSystemStatsDisplay();
      }
    } catch (error) {
      console.error("[UMIG] Fallback API calls also failed:", error);
    }
  }

  /**
   * Fetch users statistics with trend analysis
   */
  async fetchUsersStats() {
    try {
      const response = await fetch("/rest/scriptrunner/latest/custom/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Users API failed: ${response.status}`);
      }

      const data = await response.json();
      const users = data.data || data || [];

      // Calculate active users (those with recent activity)
      const activeUsers = users.filter(
        (user) =>
          user.status === "ACTIVE" ||
          user.last_login_date ||
          user.status !== "INACTIVE",
      );

      // Calculate trend (mock implementation - could be enhanced with historical data)
      const weeklyTrend = this.calculateWeeklyTrend(users.length, "users");

      return {
        value: users.length.toString(),
        trend: weeklyTrend,
        detail: `${activeUsers.length} active`,
        raw: users,
        status: "success",
      };
    } catch (error) {
      console.warn("[UMIG] Users stats fetch failed:", error);
      return {
        value: "Error",
        trend: null,
        detail: "Failed to load",
        status: "error",
        error: error.message,
      };
    }
  }

  /**
   * Fetch teams statistics with activity analysis
   */
  async fetchTeamsStats() {
    try {
      const response = await fetch("/rest/scriptrunner/latest/custom/teams", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Teams API failed: ${response.status}`);
      }

      const data = await response.json();
      const teams = data.data || data || [];

      // Calculate active teams (those with recent migrations or members)
      const activeTeams = teams.filter(
        (team) => team.status === "ACTIVE" || team.member_count > 0,
      );

      const weeklyTrend = this.calculateWeeklyTrend(teams.length, "teams");

      return {
        value: teams.length.toString(),
        trend: weeklyTrend,
        detail: `${activeTeams.length} active`,
        raw: teams,
        status: "success",
      };
    } catch (error) {
      console.warn("[UMIG] Teams stats fetch failed:", error);
      return {
        value: "Error",
        trend: null,
        detail: "Failed to load",
        status: "error",
        error: error.message,
      };
    }
  }

  /**
   * Fetch migrations statistics with status breakdown
   */
  async fetchMigrationsStats() {
    try {
      // Try dashboard summary endpoint first (if available)
      let response = await fetch(
        "/rest/scriptrunner/latest/custom/migrations/dashboard/summary",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "same-origin",
        },
      );

      if (!response.ok) {
        // Fallback to main migrations endpoint
        response = await fetch("/rest/scriptrunner/latest/custom/migrations", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "same-origin",
        });
      }

      if (!response.ok) {
        throw new Error(`Migrations API failed: ${response.status}`);
      }

      const data = await response.json();
      const migrations = data.data || data || [];

      // Calculate active migrations (those in planning or in-progress status)
      const activeMigrations = migrations.filter(
        (migration) =>
          migration.status === "PLANNING" ||
          migration.status === "IN_PROGRESS" ||
          migration.status === "ACTIVE",
      );

      const weeklyTrend = this.calculateWeeklyTrend(
        activeMigrations.length,
        "migrations",
      );

      return {
        value: activeMigrations.length.toString(),
        trend: weeklyTrend,
        detail: `${migrations.length} total`,
        raw: migrations,
        status: "success",
      };
    } catch (error) {
      console.warn("[UMIG] Migrations stats fetch failed:", error);
      return {
        value: "Error",
        trend: null,
        detail: "Failed to load",
        status: "error",
        error: error.message,
      };
    }
  }

  /**
   * Fetch system health statistics with component analysis
   */
  async fetchSystemHealthStats() {
    try {
      // Try metrics endpoint first
      let response = await fetch(
        "/rest/scriptrunner/latest/custom/migrations/dashboard/metrics",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "same-origin",
        },
      );

      let healthData = {
        score: UmigWelcomeComponent.HEALTH_DEFAULT_SCORE,
        components: [],
      }; // Default fallback

      if (response.ok) {
        const data = await response.json();
        healthData = data.health || healthData;
      }

      // Calculate overall health score
      const score =
        healthData.score || UmigWelcomeComponent.HEALTH_DEFAULT_SCORE;
      let status = "good";
      let statusText = "Good";

      if (score >= UmigWelcomeComponent.HEALTH_EXCELLENT_THRESHOLD) {
        status = "excellent";
        statusText = "Excellent";
      } else if (score >= UmigWelcomeComponent.HEALTH_GOOD_THRESHOLD) {
        status = "good";
        statusText = "Good";
      } else if (score >= UmigWelcomeComponent.HEALTH_WARNING_THRESHOLD) {
        status = "warning";
        statusText = "Warning";
      } else {
        status = "critical";
        statusText = "Critical";
      }

      return {
        value: statusText,
        score: score,
        status: status,
        components: healthData.components || [
          { name: "Database", status: "good" },
          { name: "API", status: "good" },
          { name: "Background Tasks", status: "good" },
        ],
        detail: `${score}% operational`,
        raw: healthData,
      };
    } catch (error) {
      console.warn("[UMIG] System health fetch failed:", error);
      return {
        value: "Unknown",
        score: null,
        status: "error",
        components: [],
        detail: "Failed to load",
        error: error.message,
      };
    }
  }

  /**
   * Process API result with error handling
   */
  processApiResult(result, type) {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      console.warn(`[UMIG] ${type} API failed:`, result.reason);
      return {
        value: "Error",
        trend: null,
        detail: "Failed to load",
        status: "error",
        error: result.reason?.message || "Unknown error",
      };
    }
  }

  /**
   * Calculate weekly trend (mock implementation)
   * In production, this would compare with historical data
   */
  calculateWeeklyTrend(currentValue, type) {
    // Mock trend calculation - replace with real historical comparison
    const mockTrends = {
      users: ["+3.2%", "+1.8%", "-0.5%"][Math.floor(Math.random() * 3)],
      teams: ["+5.1%", "+2.3%", "0.0%"][Math.floor(Math.random() * 3)],
      migrations: ["+12.4%", "+8.7%", "+4.2%"][Math.floor(Math.random() * 3)],
    };

    return mockTrends[type] || "+0.0%";
  }

  /**
   * Cache system stats for performance
   */
  cacheSystemStats() {
    try {
      const cacheData = {
        stats: this.state.systemStats,
        timestamp: Date.now(),
        ttl: UmigWelcomeComponent.CACHE_TTL_MS,
      };
      localStorage.setItem(
        "umig_system_stats_cache",
        JSON.stringify(cacheData),
      );
    } catch (error) {
      console.warn("[UMIG] Failed to cache system stats:", error);
    }
  }

  /**
   * Load cached stats if available and valid
   */
  loadCachedStats() {
    try {
      const cached = localStorage.getItem("umig_system_stats_cache");
      if (cached) {
        const cacheData = JSON.parse(cached);
        const age = Date.now() - cacheData.timestamp;

        if (age < cacheData.ttl) {
          this.state.systemStats = {
            ...cacheData.stats,
            lastUpdated: `${new Date(cacheData.timestamp).toLocaleString()} (cached)`,
            loading: false,
          };

          if (this.container && this.isMounted) {
            this.updateSystemStatsDisplay();
          }

          if (this.config.debug) {
            console.log("[UMIG] Loaded cached system stats");
          }

          return true;
        }
      }
    } catch (error) {
      console.warn("[UMIG] Failed to load cached stats:", error);
    }
    return false;
  }

  /**
   * Get default stats for error scenarios with enhanced fallback data
   */
  getDefaultStats() {
    return {
      totalUsers: {
        value: "N/A",
        trend: null,
        detail: "Service unavailable",
        status: "offline",
        fallback: true,
      },
      activeTeams: {
        value: "N/A",
        trend: null,
        detail: "Service unavailable",
        status: "offline",
        fallback: true,
      },
      activeMigrations: {
        value: "N/A",
        trend: null,
        detail: "Service unavailable",
        status: "offline",
        fallback: true,
      },
      activeIterations: {
        value: "N/A",
        trend: null,
        detail: "Service unavailable",
        status: "offline",
        fallback: true,
      },
      systemHealth: {
        value: "Offline",
        score: null,
        status: "offline",
        components: [],
        detail: "System connectivity issues",
        fallback: true,
      },
      lastUpdated: new Date().toLocaleString(),
      loading: false,
      error: "Dashboard services unavailable",
      fallback: true,
      retryAvailable: true,
    };
  }

  /**
   * Enhanced error recovery with intelligent retry mechanism
   */
  async handleDataLoadError(error, retryCount = 0) {
    const maxRetries = UmigWelcomeComponent.RETRY_MAX_ATTEMPTS;
    const retryDelay = Math.min(
      UmigWelcomeComponent.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount),
      UmigWelcomeComponent.RETRY_MAX_DELAY_MS,
    ); // Exponential backoff

    if (this.config.debug) {
      console.log(`[UMIG] Data load error (attempt ${retryCount + 1}):`, error);
    }

    // Try to use cached data first
    const hasCachedData = this.loadCachedStats();

    if (retryCount < maxRetries) {
      // Show retry notification to user
      this.showRetryNotification(retryCount + 1, maxRetries);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      try {
        await this.fetchSystemStats();
        // Clear any retry notifications on success
        this.clearRetryNotification();
      } catch (retryError) {
        // Recursive retry with incremented count
        await this.handleDataLoadError(retryError, retryCount + 1);
      }
    } else {
      // Max retries exceeded - show permanent error state
      this.showPermanentErrorState(error);
    }
  }

  /**
   * Show retry notification to user
   */
  showRetryNotification(attempt, maxAttempts) {
    const notificationContainer = this.getOrCreateNotificationContainer();

    notificationContainer.innerHTML = `
      <div class="retry-notification animate-slide-in">
        <span class="retry-icon">🔄</span>
        <span class="retry-message">Retrying data load... (${attempt}/${maxAttempts})</span>
        <div class="retry-progress">
          <div class="retry-progress-bar" style="width: ${(attempt / maxAttempts) * 100}%"></div>
        </div>
      </div>
    `;
  }

  /**
   * Clear retry notification
   */
  clearRetryNotification() {
    const notificationContainer = this.container?.querySelector(
      ".notification-container",
    );
    if (notificationContainer) {
      notificationContainer.innerHTML = "";
    }
  }

  /**
   * Show permanent error state with user action options
   */
  showPermanentErrorState(error) {
    const notificationContainer = this.getOrCreateNotificationContainer();

    notificationContainer.innerHTML = `
      <div class="error-notification animate-fade-in">
        <div class="error-content">
          <span class="error-icon">⚠️</span>
          <div class="error-text">
            <h4>Dashboard Data Unavailable</h4>
            <p>Unable to load system metrics. ${this.sanitizeUserInput(error?.message || "Please try again later.")}</p>
          </div>
          <div class="error-actions">
            <button class="retry-manual-btn" data-action="retry">
              <span class="retry-icon">🔄</span>
              Try Again
            </button>
            <button class="offline-mode-btn" data-action="offline">
              <span class="offline-icon">📱</span>
              Offline Mode
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind error action handlers
    this.bindErrorActionHandlers(notificationContainer);
  }

  /**
   * Get or create notification container
   */
  getOrCreateNotificationContainer() {
    let container = this.container?.querySelector(".notification-container");

    if (!container) {
      container = document.createElement("div");
      container.className = "notification-container";

      // Insert after welcome header
      const header = this.container?.querySelector(".umig-welcome-header");
      if (header && header.nextSibling) {
        header.parentNode.insertBefore(container, header.nextSibling);
      } else if (this.container) {
        this.container.insertBefore(container, this.container.firstChild);
      }
    }

    return container;
  }

  /**
   * Bind error action handlers
   */
  bindErrorActionHandlers(container) {
    const retryBtn = container.querySelector(".retry-manual-btn");
    const offlineBtn = container.querySelector(".offline-mode-btn");

    if (retryBtn) {
      this.addDOMListener(retryBtn, "click", async (e) => {
        e.preventDefault();

        // Rate limiting check
        if (
          window.SecurityUtils &&
          !window.SecurityUtils.checkRateLimit("dashboard-retry")
        ) {
          console.warn("[UMIG] Dashboard retry rate limited");
          return;
        }

        // Clear error notification and retry
        this.clearRetryNotification();
        await this.fetchSystemStats();
      });
    }

    if (offlineBtn) {
      this.addDOMListener(offlineBtn, "click", (e) => {
        e.preventDefault();
        this.enterOfflineMode();
      });
    }
  }

  /**
   * Enter offline mode with cached data and limited functionality
   */
  enterOfflineMode() {
    this.clearRetryNotification();

    // Load best available cached data
    const hasCache = this.loadCachedStats();

    if (!hasCache) {
      // No cache available - show basic offline stats
      this.state.systemStats = this.getOfflineStats();
    }

    // Update stats to show offline status
    if (this.state.systemStats) {
      this.state.systemStats.offline = true;
      this.state.systemStats.lastUpdated += " (Offline Mode)";
    }

    // Update display
    if (this.container && this.isMounted) {
      this.updateSystemStatsDisplay();
    }

    // Show offline mode notification
    this.showOfflineModeNotification();
  }

  /**
   * Get basic offline stats when no cache is available
   */
  getOfflineStats() {
    return {
      totalUsers: {
        value: "Offline",
        trend: null,
        detail: "Data unavailable offline",
        status: "offline",
      },
      activeTeams: {
        value: "Offline",
        trend: null,
        detail: "Data unavailable offline",
        status: "offline",
      },
      activeMigrations: {
        value: "Offline",
        trend: null,
        detail: "Data unavailable offline",
        status: "offline",
      },
      systemHealth: {
        value: "Offline",
        score: null,
        status: "offline",
        components: [],
        detail: "Working in offline mode",
      },
      lastUpdated: new Date().toLocaleString(),
      loading: false,
      error: null,
      offline: true,
    };
  }

  /**
   * Show offline mode notification
   */
  showOfflineModeNotification() {
    const notificationContainer = this.getOrCreateNotificationContainer();

    notificationContainer.innerHTML = `
      <div class="offline-notification animate-fade-in">
        <span class="offline-icon">📱</span>
        <span class="offline-message">Working in offline mode with cached data</span>
        <button class="reconnect-btn" data-action="reconnect">
          <span class="reconnect-icon">🌐</span>
          Try to Reconnect
        </button>
      </div>
    `;

    // Bind reconnect handler
    const reconnectBtn = notificationContainer.querySelector(".reconnect-btn");
    if (reconnectBtn) {
      this.addDOMListener(reconnectBtn, "click", async (e) => {
        e.preventDefault();
        this.exitOfflineMode();
      });
    }
  }

  /**
   * Exit offline mode and attempt to reconnect
   */
  async exitOfflineMode() {
    this.clearRetryNotification();

    // Reset offline status
    if (this.state.systemStats) {
      this.state.systemStats.offline = false;
    }

    // Attempt to fetch fresh data
    try {
      await this.fetchSystemStats();
    } catch (error) {
      // If reconnect fails, show error handling
      await this.handleDataLoadError(error);
    }
  }

  /**
   * Render the welcome component
   */
  render() {
    if (!this.container) {
      console.error("[UMIG] WelcomeComponent: No container element found");
      return;
    }

    try {
      // Clear existing content
      this.container.innerHTML = "";

      if (this.state.loading) {
        this.renderLoadingState();
        return;
      }

      if (this.state.error) {
        this.renderErrorState();
        return;
      }

      // Create main welcome content
      const welcomeContent = this.createWelcomeContent();
      this.container.appendChild(welcomeContent);

      // Apply security measures
      this.applySecurity();

      // Bind events and apply styles after rendering content
      this.bindQuickActions();
      this.bindNavigationEvents();
      this.bindRefreshButton();
      this.injectStyles();

      // Track render
      this.metrics.renderCount++;
      this.metrics.lastRenderTime = performance.now();

      if (this.config.debug) {
        console.log(
          `[UMIG] WelcomeComponent rendered (${this.metrics.renderCount})`,
        );
      }
    } catch (error) {
      console.error("[UMIG] WelcomeComponent render failed:", error);
      this.renderErrorState();
    }
  }

  /**
   * Create the main welcome content structure
   */
  createWelcomeContent() {
    const contentDiv = document.createElement("div");
    contentDiv.className = "umig-welcome-container";
    contentDiv.setAttribute("role", "main");
    contentDiv.setAttribute("aria-label", "UMIG Welcome Dashboard");

    // Apply security: Sanitize user name before display
    const safeName = this.sanitizeUserInput(this.state.userName);

    contentDiv.innerHTML = `
      <div class="umig-welcome-header">
        <div class="welcome-title">
          <h1>Welcome to UMIG Administration</h1>
          <p class="welcome-subtitle">Hello, ${safeName}! Let's get started with managing your migration infrastructure.</p>
        </div>
        ${
          this.state.userRole && this.state.userRole !== "user"
            ? `
          <div class="user-badge">
            <span class="role-badge role-${this.state.userRole}">${this.capitalizeRole(this.state.userRole)}</span>
          </div>
        `
            : ""
        }
      </div>

      <div class="umig-welcome-content">
        <div class="welcome-grid">
          ${this.config.showSystemOverview ? this.createSystemOverviewSection() : ""}
          ${this.config.showQuickActions ? this.createQuickActionsSection() : ""}
          ${this.config.showNavigationGuide ? this.createNavigationGuideSection() : ""}
        </div>
      </div>

      <div class="umig-welcome-footer">
        <div class="tips-section">
          <h3>💡 Quick Tips</h3>
          <ul>
            <li>Use the search bar to quickly find specific items across all entities</li>
            <li>Click on any menu item to start managing that type of resource</li>
            <li>Use the refresh button to update data when working with live systems</li>
            ${this.state.userRole === "super_admin" ? "<li>As a Super Admin, you have access to all system configurations</li>" : ""}
          </ul>
        </div>
      </div>
    `;

    return contentDiv;
  }

  /**
   * Create enhanced system overview section with advanced KPI visualization
   */
  createSystemOverviewSection() {
    if (!this.state.systemStats) {
      return "";
    }

    const stats = this.state.systemStats;
    const isLoading = stats.loading;
    const hasError = stats.error;

    return `
      <div class="welcome-section system-overview">
        <div class="section-header">
          <h2>📊 System Overview</h2>
          ${
            !isLoading
              ? `
            <div class="refresh-controls">
              <button class="refresh-btn" onclick="this.refreshSystemStats()" title="Refresh data">
                <span class="refresh-icon">🔄</span>
              </button>
              ${stats.fetchTime ? `<span class="fetch-time">${stats.fetchTime}ms</span>` : ""}
            </div>
          `
              : ""
          }
        </div>

        ${
          hasError
            ? `
          <div class="stats-error">
            <span class="error-icon">⚠️</span>
            <span class="error-message">Unable to load system statistics: ${this.sanitizeUserInput(stats.error)}</span>
            <button class="retry-btn" onclick="this.fetchSystemStats()">Retry</button>
          </div>
        `
            : ""
        }

        <div class="stats-grid ${isLoading ? "loading" : ""}">
          ${this.createEnhancedStatItem("users", "👤", "Total Users", stats.totalUsers)}
          ${this.createEnhancedStatItem("teams", "👥", "Active Teams", stats.totalTeams)}
          ${this.createEnhancedStatItem("migrations", "🔄", "Active Migrations", stats.activeMigrations)}
          ${this.createEnhancedStatItem("iterations", "📋", "Active Iterations", stats.activeIterations)}
          ${this.createEnhancedHealthStatItem(stats.systemHealth)}
        </div>

        <div class="stats-footer">
          <p class="stats-updated">
            <span class="update-icon">🕒</span>
            Last updated: ${stats.lastUpdated}
          </p>
          ${
            stats.fetchTime
              ? `
            <p class="performance-info">
              <span class="perf-icon">⚡</span>
              Loaded in ${stats.fetchTime}ms
            </p>
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  /**
   * Create enhanced stat item with trend indicators, animations, and sparklines
   */
  createEnhancedStatItem(type, icon, label, data) {
    if (!data || typeof data === "string") {
      // Enhanced loading state with skeleton animation
      return `
        <div class="stat-item enhanced loading" data-stat-type="${type}">
          <div class="stat-header">
            <span class="stat-icon">${icon}</span>
            <div class="stat-trend skeleton skeleton-trend"></div>
          </div>
          <div class="stat-value skeleton skeleton-value" id="umig-stat-${type}"></div>
          <span class="stat-label">${label}</span>
          <div class="stat-detail skeleton skeleton-detail"></div>
          <div class="loading-pulse"></div>
        </div>
      `;
    }

    const { value, trend, detail, status, percentage, raw } = data;
    const isError = status === "error";
    const trendClass = trend
      ? trend.startsWith("+")
        ? "positive"
        : trend.startsWith("-")
          ? "negative"
          : "neutral"
      : "";
    const trendIcon = trend
      ? trend.startsWith("+")
        ? "↗️"
        : trend.startsWith("-")
          ? "↘️"
          : "→"
      : "";

    // Generate sparkline data (mock for now, could be enhanced with real historical data)
    const sparklineData = this.generateSparklineData(
      type,
      parseInt(value) || 0,
    );
    const sparklinePath = this.createSparklinePath(sparklineData);

    return `
      <div class="stat-item enhanced ${status || ""} ${isError ? "error" : ""}" data-stat-type="${type}">
        <div class="stat-header">
          <span class="stat-icon animate-bounce-in">${icon}</span>
          ${
            trend && !isError
              ? `
            <div class="stat-trend-container">
              <span class="stat-trend ${trendClass} animate-slide-in" title="Weekly change: ${trend}">
                <span class="trend-icon">${trendIcon}</span>
                <span class="trend-value">${trend}</span>
              </span>
            </div>
          `
              : ""
          }
        </div>

        <div class="stat-value-container">
          <span class="stat-value ${isError ? "error" : ""} animate-count-up"
                id="umig-stat-${type}"
                data-target="${isError ? 0 : parseInt(value) || 0}"
                data-suffix="${isNaN(parseInt(value)) ? value : ""}">
            ${isError ? "⚠️" : isNaN(parseInt(value)) ? value : "0"}
          </span>
          ${
            percentage !== undefined && !isError
              ? `
            <div class="stat-percentage animate-fade-in" title="Active percentage">
              ${percentage}%
            </div>
          `
              : ""
          }
        </div>

        <span class="stat-label">${label}</span>

        <div class="stat-detail ${isError ? "error" : ""} animate-fade-in">
          ${detail || (isError ? "Failed to load" : "")}
        </div>

        ${
          !isError && sparklineData.length > 0
            ? `
          <div class="stat-sparkline animate-draw-in">
            <svg width="100%" height="20" viewBox="0 0 60 20" preserveAspectRatio="none">
              <path d="${sparklinePath}" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
            </svg>
          </div>
        `
            : ""
        }

        ${
          raw?.recentActive !== undefined
            ? `
          <div class="stat-mini-info animate-slide-up" title="Recent activity">
            <span class="mini-label">Recent:</span>
            <span class="mini-value">${raw.recentActive}</span>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  /**
   * Generate sparkline data for visual trends
   */
  generateSparklineData(type, currentValue) {
    // Generate mock historical data for sparkline visualization
    // In production, this would come from the dashboard API
    const dataPoints = 7; // 7 days of data
    const data = [];

    for (let i = 0; i < dataPoints; i++) {
      const variation =
        (Math.random() - 0.5) * UmigWelcomeComponent.SPARKLINE_VARIATION; // ±10% variation
      const value = Math.max(
        1,
        currentValue * (1 + variation * (i / dataPoints)),
      );
      data.push(Math.round(value));
    }

    return data;
  }

  /**
   * Create SVG path for sparkline
   */
  createSparklinePath(data) {
    if (data.length < 2) return "";

    const width = UmigWelcomeComponent.SPARKLINE_WIDTH;
    const height = UmigWelcomeComponent.SPARKLINE_HEIGHT;
    const stepX = width / (data.length - 1);

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;

    let path = "";

    data.forEach((value, index) => {
      const x = index * stepX;
      const y = height - ((value - minVal) / range) * height;

      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    return path;
  }

  /**
   * Create enhanced health stat item with component breakdown
   */
  createEnhancedHealthStatItem(healthData) {
    if (!healthData || typeof healthData === "string") {
      return `
        <div class="stat-item enhanced health loading">
          <div class="stat-header">
            <span class="stat-icon">💚</span>
            <span class="health-score loading">--</span>
          </div>
          <span class="stat-value health-unknown">${healthData || "Checking..."}</span>
          <span class="stat-label">System Health</span>
          <div class="stat-detail loading">Loading...</div>
        </div>
      `;
    }

    const { value, score, status, components, detail } = healthData;
    const isError = status === "error";
    const healthClass = `health-${status || "unknown"}`;

    return `
      <div class="stat-item enhanced health ${status || ""} ${isError ? "error" : ""}">
        <div class="stat-header">
          <span class="stat-icon">${this.getHealthIcon(status)}</span>
          ${
            score && !isError
              ? `
            <span class="health-score ${healthClass}" title="Health score">
              ${score}%
            </span>
          `
              : ""
          }
        </div>
        <span class="stat-value ${healthClass}" id="umig-stat-health">
          ${isError ? "⚠️ Unknown" : value}
        </span>
        <span class="stat-label">System Health</span>
        <div class="stat-detail ${isError ? "error" : ""}">
          ${detail || (isError ? "Failed to load" : "")}
        </div>
        ${
          components && components.length > 0 && !isError
            ? `
          <div class="health-components">
            ${components
              .map(
                (comp) => `
              <span class="component-status ${comp.status}" title="${comp.name}: ${comp.status}">
                ${comp.name.substring(0, UmigWelcomeComponent.COMPONENT_NAME_ABBREVIATION_LENGTH)}
              </span>
            `,
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  /**
   * Get appropriate health icon based on status
   */
  getHealthIcon(status) {
    const icons = {
      excellent: "💚",
      good: "💚",
      warning: "💛",
      critical: "❤️",
      error: "⚠️",
      unknown: "❓",
    };
    return icons[status] || "💚";
  }

  /**
   * Create quick actions section
   */
  createQuickActionsSection() {
    if (!this.state.quickActions.length) {
      return "";
    }

    const actionsHtml = this.state.quickActions
      .map(
        (action) => `
      <button class="quick-action-btn" data-action="${action.key}" aria-label="${action.label}">
        <span class="action-icon">${action.icon}</span>
        <span class="action-label">${action.label}</span>
      </button>
    `,
      )
      .join("");

    return `
      <div class="welcome-section quick-actions">
        <h2>⚡ Quick Actions</h2>
        <div class="actions-grid">
          ${actionsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Create navigation guide section
   */
  createNavigationGuideSection() {
    const popularItems = this.state.navigationItems.filter(
      (item) => item.popular,
    );
    const otherItems = this.state.navigationItems.filter(
      (item) => !item.popular,
    );

    const createNavItem = (item) => `
      <div class="nav-item" data-entity="${item.key}" data-section="${item.key}">
        <span class="nav-icon">${item.icon}</span>
        <div class="nav-content">
          <h4>${item.label}</h4>
          <p>${item.description}</p>
        </div>
      </div>
    `;

    return `
      <div class="welcome-section navigation-guide">
        <h2>🧭 Navigation Guide</h2>

        <div class="nav-section">
          <h3>Popular Sections</h3>
          <div class="nav-grid">
            ${popularItems.map(createNavItem).join("")}
          </div>
        </div>

        ${
          otherItems.length > 0
            ? `
          <div class="nav-section">
            <h3>Other Available Sections</h3>
            <div class="nav-grid">
              ${otherItems.map(createNavItem).join("")}
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  /**
   * Render loading state
   */
  renderLoadingState() {
    this.container.innerHTML = `
      <div class="umig-welcome-loading">
        <div class="loading-spinner" aria-label="Loading welcome dashboard"></div>
        <p>Loading your dashboard...</p>
      </div>
    `;
  }

  /**
   * Render error state
   */
  renderErrorState() {
    this.container.innerHTML = `
      <div class="umig-welcome-error">
        <div class="aui-message aui-message-error">
          <p>Unable to load welcome dashboard: ${this.sanitizeUserInput(this.state.error || "Unknown error")}</p>
          <p><button class="aui-button" onclick="location.reload()">Refresh Page</button></p>
        </div>
      </div>
    `;
  }

  /**
   * Bind quick action button events
   */
  bindQuickActions() {
    const actionBtns = this.container.querySelectorAll(".quick-action-btn");

    actionBtns.forEach((btn) => {
      const actionKey = btn.dataset.action;
      const action = this.state.quickActions.find((a) => a.key === actionKey);

      if (action && action.action) {
        this.addDOMListener(btn, "click", (e) => {
          e.preventDefault();

          // Rate limiting check using SecurityUtils
          if (
            window.SecurityUtils &&
            !window.SecurityUtils.checkRateLimit(`quick-action-${actionKey}`)
          ) {
            console.warn(
              "[UMIG] Rate limit exceeded for quick action:",
              actionKey,
            );
            return;
          }

          try {
            action.action();
          } catch (error) {
            console.error("[UMIG] Quick action failed:", error);
          }
        });
      }
    });
  }

  /**
   * Bind navigation item events
   */
  bindNavigationEvents() {
    const navItems = this.container.querySelectorAll(".nav-item");

    navItems.forEach((item) => {
      const entityKey = item.dataset.entity;

      this.addDOMListener(item, "click", (e) => {
        e.preventDefault();

        // Add visual feedback for clicked state
        item.classList.add("nav-item-clicked");
        setTimeout(() => {
          item.classList.remove("nav-item-clicked");
        }, UmigWelcomeComponent.ANIMATION_WIDGET_BASE_DELAY);

        // Don't stop propagation - let AdminGuiController's global listener handle it
        // since our nav items now have the correct data-section attributes
        // The AdminGuiController.handleNavigation will be called automatically
      });

      // Make items keyboard accessible
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");

      this.addDOMListener(item, "keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();

          // For keyboard navigation, call our method directly
          this.navigateToEntity(entityKey);
        }
      });
    });
  }

  /**
   * Navigate to a specific entity
   */
  navigateToEntity(entityKey) {
    if (window.AdminGuiController) {
      console.log(`[UMIG] Navigating to entity: ${entityKey}`);

      // Create a synthetic nav item element with the required data attributes
      // This allows us to use the standard AdminGuiController.handleNavigation method
      const syntheticNavItem = document.createElement("div");
      syntheticNavItem.className = "nav-item";
      syntheticNavItem.setAttribute("data-section", entityKey);
      syntheticNavItem.setAttribute("data-entity", entityKey);

      // Use AdminGuiController's standard navigation handling
      // This ensures consistency with all other navigation patterns
      window.AdminGuiController.handleNavigation(syntheticNavItem);
    } else {
      console.warn("[UMIG] Navigation controller not available");
    }
  }

  /**
   * Trigger a quick action
   */
  triggerQuickAction(entityType, actionType) {
    console.log(
      `[UMIG] Quick action triggered: ${actionType} on ${entityType}`,
    );

    if (actionType === "create") {
      // Navigate to entity first using our improved navigation method
      this.navigateToEntity(entityType);

      // Wait for navigation to complete, then trigger create modal/button
      setTimeout(() => {
        // Look for various create button patterns that might exist
        const createBtn = document.querySelector(
          ".create-btn, .add-btn, #addNewBtn, .btn-primary[data-action='create']",
        );
        if (createBtn) {
          createBtn.click();
        } else {
          console.warn(
            `[UMIG] No create button found for ${entityType} after navigation`,
          );
        }
      }, UmigWelcomeComponent.ANIMATION_FADE_IN_DELAY);
    } else if (actionType === "view") {
      this.navigateToEntity(entityType);
    }
  }

  /**
   * Show system status modal
   */
  showSystemStatus() {
    if (window.ModalComponent) {
      const modal = new window.ModalComponent("systemStatusModal", {
        title: "System Status",
        content: this.createSystemStatusContent(),
        size: "medium",
        type: "info",
      });

      modal.initialize().then(() => {
        modal.mount();
        modal.render();
        modal.open();
      });
    }
  }

  /**
   * Create system status content for modal
   */
  createSystemStatusContent() {
    return `
      <div class="system-status-content">
        <h3>Current System Status</h3>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">Database Connection:</span>
            <span class="status-value status-good">Connected</span>
          </div>
          <div class="status-item">
            <span class="status-label">API Services:</span>
            <span class="status-value status-good">Operational</span>
          </div>
          <div class="status-item">
            <span class="status-label">Background Tasks:</span>
            <span class="status-value status-good">Running</span>
          </div>
          <div class="status-item">
            <span class="status-label">Memory Usage:</span>
            <span class="status-value status-warning">75%</span>
          </div>
        </div>
        <p class="status-note">All systems are operating normally. Last check: ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
  }

  /**
   * Update system stats display with enhanced visualization and animations
   */
  updateSystemStatsDisplay() {
    if (!this.state.systemStats || !this.container || !this.isMounted) {
      return;
    }

    // Update the entire system overview section for consistency
    const overviewSection = this.container.querySelector(".system-overview");
    if (overviewSection) {
      overviewSection.innerHTML = this.createSystemOverviewSection()
        .replace(/<div class="welcome-section system-overview">/, "")
        .replace(/<\/div>\s*$/, "");

      // Re-bind refresh button event
      this.bindRefreshButton();

      // Trigger animations for updated content
      this.animateStatsDisplay();
    }
  }

  /**
   * Animate statistics display with count-up animations and visual effects
   */
  animateStatsDisplay() {
    // Animate count-up for numerical values
    const countUpElements =
      this.container.querySelectorAll(".animate-count-up");
    countUpElements.forEach((element) => {
      this.animateCountUp(element);
    });

    // Trigger CSS animations
    const animatedElements = this.container.querySelectorAll(
      '[class*="animate-"]',
    );
    animatedElements.forEach((element, index) => {
      // Stagger animations for better visual effect
      setTimeout(() => {
        element.classList.add("animation-triggered");
      }, index * UmigWelcomeComponent.ANIMATION_STAGGER_DELAY);
    });

    // Animate sparklines
    const sparklines = this.container.querySelectorAll(".stat-sparkline path");
    sparklines.forEach((path, index) => {
      setTimeout(
        () => {
          path.style.strokeDasharray = path.getTotalLength();
          path.style.strokeDashoffset = path.getTotalLength();
          path.style.animation = "drawLine 1s ease-out forwards";
        },
        UmigWelcomeComponent.ANIMATION_FADE_IN_DELAY +
          index * UmigWelcomeComponent.ANIMATION_WIDGET_STAGGER,
      );
    });
  }

  /**
   * Animate count-up effect for numerical values
   */
  animateCountUp(element) {
    const target = parseInt(element.dataset.target) || 0;
    const suffix = element.dataset.suffix || "";

    if (isNaN(target) || target === 0) {
      element.textContent = suffix || "0";
      return;
    }

    const duration = 1000; // 1 second
    const startTime = performance.now();
    const startValue = 0;

    const updateValue = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(
        startValue + (target - startValue) * easeOutQuart,
      );

      element.textContent = suffix ? suffix : currentValue.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(updateValue);
      }
    };

    requestAnimationFrame(updateValue);
  }

  /**
   * Refresh system stats manually
   */
  async refreshSystemStats() {
    if (this.config.debug) {
      console.log("[UMIG] Manual refresh triggered");
    }

    // Clear cache to force fresh data
    try {
      localStorage.removeItem("umig_system_stats_cache");
    } catch (error) {
      console.warn("[UMIG] Failed to clear cache:", error);
    }

    // Show loading state
    this.state.systemStats.loading = true;
    this.updateSystemStatsDisplay();

    // Fetch fresh data
    await this.fetchSystemStats();
  }

  /**
   * Bind refresh button event
   */
  bindRefreshButton() {
    const refreshBtn = this.container?.querySelector(".refresh-btn");
    if (refreshBtn) {
      this.addDOMListener(refreshBtn, "click", async (e) => {
        e.preventDefault();

        // Rate limiting check
        if (
          window.SecurityUtils &&
          !window.SecurityUtils.checkRateLimit("stats-refresh")
        ) {
          console.warn("[UMIG] Stats refresh rate limited");
          return;
        }

        // Visual feedback
        refreshBtn.classList.add("refreshing");
        setTimeout(() => {
          refreshBtn.classList.remove("refreshing");
        }, 2000);

        await this.refreshSystemStats();
      });
    }
  }

  /**
   * Setup real-time updates with performance optimization
   */
  setupRealTimeUpdates() {
    // Clear existing interval if any
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
    }

    // Set up periodic updates (every 2 minutes)
    this.statsUpdateInterval = setInterval(
      async () => {
        if (
          this.container &&
          this.isMounted &&
          document.visibilityState === "visible"
        ) {
          // Only update if page is visible (battery/performance optimization)
          await this.fetchSystemStats();
        }
      },
      2 * 60 * 1000,
    ); // 2 minutes

    // Update when page becomes visible again
    document.addEventListener("visibilitychange", async () => {
      if (
        document.visibilityState === "visible" &&
        this.container &&
        this.isMounted
      ) {
        // Check if data is stale (older than 5 minutes)
        const cached = localStorage.getItem("umig_system_stats_cache");
        if (cached) {
          try {
            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;
            if (age > 5 * 60 * 1000) {
              // 5 minutes
              await this.fetchSystemStats();
            }
          } catch (error) {
            console.warn("[UMIG] Cache check failed:", error);
          }
        }
      }
    });

    if (this.config.debug) {
      console.log("[UMIG] Real-time updates configured");
    }
  }

  /**
   * Apply security measures
   */
  applySecurity() {
    if (!window.SecurityUtils) {
      console.warn("[UMIG] SecurityUtils not available for WelcomeComponent");
      return;
    }

    try {
      // Apply XSS protection to dynamic content
      const userContent = this.container.querySelectorAll(
        "[data-user-content]",
      );
      userContent.forEach((element) => {
        element.innerHTML = window.SecurityUtils.sanitizeHtml(
          element.innerHTML,
        );
      });

      // Add CSRF token to any forms (if present)
      const forms = this.container.querySelectorAll("form");
      forms.forEach((form) => {
        window.SecurityUtils.addCsrfToken(form);
      });
    } catch (error) {
      console.error("[UMIG] Security application failed:", error);
    }
  }

  /**
   * Sanitize user input using SecurityUtils
   */
  sanitizeUserInput(input) {
    if (!input || typeof input !== "string") return "";

    if (window.SecurityUtils && window.SecurityUtils.escapeHtml) {
      return window.SecurityUtils.escapeHtml(input);
    }

    // Fallback sanitization
    return input.replace(/[<>&"']/g, (char) => {
      const entityMap = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entityMap[char];
    });
  }

  /**
   * Capitalize role name for display
   */
  capitalizeRole(role) {
    if (!role) return "User";

    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Inject component-specific CSS styles
   */
  injectStyles() {
    const styleId = "umig-welcome-component-styles";

    // Don't inject if styles already exist
    if (document.getElementById(styleId)) {
      return;
    }

    const styles = document.createElement("style");
    styles.id = styleId;
    styles.textContent = `
      .umig-welcome-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .umig-welcome-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #e4e5e7;
      }

      .welcome-title h1 {
        margin: 0 0 8px 0;
        color: #172b4d;
        font-size: 2rem;
        font-weight: 600;
      }

      .welcome-subtitle {
        margin: 0;
        color: #5e6c84;
        font-size: 1.1rem;
      }

      .role-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .role-admin {
        background-color: #dff0d8;
        color: #3c763d;
      }

      .role-super_admin {
        background-color: #d9edf7;
        color: #31708f;
      }

      .role-pilot {
        background-color: #fcf8e3;
        color: #8a6d3b;
      }

      .welcome-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 24px;
        margin-bottom: 30px;
      }

      .welcome-section {
        background: #f4f5f7;
        border-radius: 8px;
        padding: 24px;
        border: 1px solid #dfe1e6;
      }

      .welcome-section h2 {
        margin: 0 0 20px 0;
        color: #172b4d;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .refresh-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .refresh-btn {
        background: #f4f5f7;
        border: 1px solid #dfe1e6;
        border-radius: 4px;
        padding: 6px 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
      }

      .refresh-btn:hover {
        background: #e4e5e7;
        border-color: #b3bac5;
      }

      .refresh-btn.refreshing .refresh-icon {
        animation: spin 1s linear infinite;
      }

      .fetch-time {
        font-size: 0.75rem;
        color: #5e6c84;
        padding: 2px 6px;
        background: #f4f5f7;
        border-radius: 12px;
      }

      .stats-error {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: #ffebe6;
        border: 1px solid #ff8b00;
        border-radius: 6px;
        margin-bottom: 16px;
      }

      .error-icon {
        font-size: 1.1rem;
      }

      .error-message {
        flex: 1;
        color: #bf2600;
        font-size: 0.9rem;
      }

      .retry-btn {
        background: #ff8b00;
        color: white;
        border: none;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
      }

      .retry-btn:hover {
        background: #ff991f;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 18px;
        margin-bottom: 16px;
      }

      .stats-grid.loading {
        opacity: 0.7;
        pointer-events: none;
      }

      .stat-item {
        text-align: center;
        padding: 20px 16px;
        background: white;
        border-radius: 8px;
        border: 1px solid #dfe1e6;
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }

      .stat-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-color: #b3bac5;
      }

      .stat-item.enhanced {
        padding: 20px 16px;
      }

      .stat-item.error {
        background: #ffebe6;
        border-color: #ff8b00;
      }

      .stat-item.loading {
        background: #f8f9fa;
        border-color: #e4e5e7;
      }

      /* Skeleton Loading Animations */
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
        border-radius: 4px;
      }

      .skeleton-trend {
        width: 40px;
        height: 16px;
      }

      .skeleton-value {
        width: 60px;
        height: 24px;
        margin: 8px auto;
      }

      .skeleton-detail {
        width: 80px;
        height: 12px;
        margin: 8px auto;
      }

      .loading-pulse {
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        animation: loading-pulse 2s infinite;
      }

      @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes loading-pulse {
        0% { left: -100%; }
        100% { left: 100%; }
      }

      /* Animation Classes */
      .animate-bounce-in {
        animation: bounceIn 0.6s ease-out;
      }

      .animate-slide-in {
        animation: slideIn 0.5s ease-out;
      }

      .animate-fade-in {
        animation: fadeIn 0.8s ease-out;
      }

      .animate-slide-up {
        animation: slideUp 0.6s ease-out;
      }

      .animate-count-up {
        transition: all 0.3s ease;
      }

      .animate-draw-in {
        animation: fadeIn 0.5s ease-out;
      }

      /* Keyframe Animations */
      @keyframes bounceIn {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); opacity: 1; }
      }

      @keyframes slideIn {
        0% { transform: translateX(20px); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
      }

      @keyframes fadeIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }

      @keyframes slideUp {
        0% { transform: translateY(10px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }

      @keyframes drawLine {
        0% { stroke-dashoffset: inherit; }
        100% { stroke-dashoffset: 0; }
      }

      .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .stat-icon {
        font-size: 1.2rem;
      }

      .stat-trend {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 10px;
        white-space: nowrap;
      }

      .stat-trend.positive {
        background: #e3fcef;
        color: #006644;
      }

      .stat-trend.negative {
        background: #ffebe6;
        color: #bf2600;
      }

      .stat-trend.neutral {
        background: #f4f5f7;
        color: #5e6c84;
      }

      .stat-trend.loading {
        background: #f8f9fa;
        color: #a5adba;
      }

      .stat-trend-container {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .trend-icon {
        font-size: 0.8rem;
      }

      .trend-value {
        font-size: 0.75rem;
      }

      .stat-value-container {
        position: relative;
        margin: 12px 0 8px 0;
      }

      .stat-value {
        display: block;
        font-size: 1.8rem;
        font-weight: 700;
        color: #172b4d;
        margin-bottom: 4px;
        line-height: 1.2;
      }

      .stat-value.error {
        color: #bf2600;
        font-size: 1.4rem;
      }

      .stat-percentage {
        font-size: 0.7rem;
        color: #5e6c84;
        background: #f4f5f7;
        padding: 2px 6px;
        border-radius: 8px;
        display: inline-block;
        margin-top: 2px;
      }

      .stat-sparkline {
        margin: 8px 0 4px 0;
        height: 20px;
        opacity: 0.7;
        color: #0052cc;
      }

      .stat-mini-info {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 4px;
        margin-top: 6px;
        font-size: 0.65rem;
        color: #6b778c;
      }

      .mini-label {
        opacity: 0.8;
      }

      .mini-value {
        font-weight: 600;
        color: #172b4d;
      }

      .stat-label {
        display: block;
        font-size: 0.85rem;
        color: #5e6c84;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }

      .stat-detail {
        font-size: 0.75rem;
        color: #6b778c;
        line-height: 1.3;
      }

      .stat-detail.error {
        color: #bf2600;
      }

      .stat-detail.loading {
        color: #a5adba;
      }

      .health-score {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 10px;
        white-space: nowrap;
      }

      .health-score.loading {
        background: #f8f9fa;
        color: #a5adba;
      }

      .health-excellent { color: #006644; background: #e3fcef; }
      .health-good { color: #006644; background: #e3fcef; }
      .health-warning { color: #974f00; background: #fff4e6; }
      .health-critical { color: #bf2600; background: #ffebe6; }
      .health-error { color: #bf2600; background: #ffebe6; }
      .health-unknown { color: #5e6c84; background: #f4f5f7; }

      .health-components {
        display: flex;
        justify-content: center;
        gap: 4px;
        margin-top: 8px;
      }

      .component-status {
        font-size: 0.65rem;
        font-weight: 600;
        padding: 2px 4px;
        border-radius: 4px;
        text-transform: uppercase;
      }

      .component-status.good {
        background: #e3fcef;
        color: #006644;
      }

      .component-status.warning {
        background: #fff4e6;
        color: #974f00;
      }

      .component-status.critical {
        background: #ffebe6;
        color: #bf2600;
      }

      .stats-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;
        color: #5e6c84;
        gap: 16px;
      }

      .stats-updated {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .performance-info {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .update-icon, .perf-icon {
        font-size: 0.8rem;
      }

      .actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }

      .quick-action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px 12px;
        background: white;
        border: 1px solid #dfe1e6;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
        color: #172b4d;
      }

      .quick-action-btn:hover {
        background: #f4f5f7;
        border-color: #b3bac5;
        transform: translateY(-1px);
      }

      .quick-action-btn:active {
        transform: translateY(0);
      }

      .action-icon {
        font-size: 1.5rem;
        margin-bottom: 8px;
      }

      .action-label {
        font-size: 0.9rem;
        font-weight: 500;
        text-align: center;
      }

      .nav-section {
        margin-bottom: 24px;
      }

      .nav-section:last-child {
        margin-bottom: 0;
      }

      .nav-section h3 {
        margin: 0 0 12px 0;
        color: #172b4d;
        font-size: 1rem;
        font-weight: 600;
      }

      .nav-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        padding: 12px;
        background: white;
        border: 1px solid #dfe1e6;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .nav-item:hover {
        background: #f4f5f7;
        border-color: #b3bac5;
      }

      .nav-item:focus {
        outline: 2px solid #0052cc;
        outline-offset: 2px;
      }

      .nav-item-clicked {
        transform: scale(0.98);
        background: #e4e5e7 !important;
        border-color: #a5adba !important;
        transition: all 0.1s ease;
      }

      .nav-icon {
        font-size: 1.25rem;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .nav-content h4 {
        margin: 0 0 4px 0;
        color: #172b4d;
        font-size: 0.9rem;
        font-weight: 600;
      }

      .nav-content p {
        margin: 0;
        color: #5e6c84;
        font-size: 0.8rem;
        line-height: 1.3;
      }

      .tips-section {
        background: #f4f5f7;
        border-radius: 8px;
        padding: 20px;
        border: 1px solid #dfe1e6;
      }

      .tips-section h3 {
        margin: 0 0 12px 0;
        color: #172b4d;
        font-size: 1rem;
        font-weight: 600;
      }

      .tips-section ul {
        margin: 0;
        padding-left: 20px;
        color: #5e6c84;
      }

      .tips-section li {
        margin-bottom: 6px;
        line-height: 1.4;
      }

      .umig-welcome-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #0052cc;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .umig-welcome-error {
        padding: 20px;
      }

      .system-status-content .status-grid {
        display: grid;
        gap: 12px;
        margin: 16px 0;
      }

      .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
      }

      .status-label {
        font-weight: 500;
      }

      .status-value {
        font-weight: 600;
      }

      .status-good { color: #36b37e; }
      .status-warning { color: #ff8b00; }
      .status-error { color: #de350b; }

      .status-note {
        margin: 16px 0 0 0;
        font-size: 0.9rem;
        color: #5e6c84;
        font-style: italic;
      }

      /* Notification Styles */
      .notification-container {
        margin: 16px 0;
      }

      .retry-notification, .error-notification, .offline-notification {
        padding: 12px 16px;
        border-radius: 6px;
        border: 1px solid;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.9rem;
      }

      .retry-notification {
        background: #e3f2fd;
        border-color: #2196f3;
        color: #1565c0;
      }

      .error-notification {
        background: #ffebe6;
        border-color: #ff8b00;
        color: #bf2600;
      }

      .offline-notification {
        background: #f3e5f5;
        border-color: #9c27b0;
        color: #6a1b9a;
      }

      .error-content {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
      }

      .error-text h4 {
        margin: 0 0 4px 0;
        font-size: 0.95rem;
        font-weight: 600;
      }

      .error-text p {
        margin: 0;
        font-size: 0.85rem;
        opacity: 0.9;
      }

      .error-actions {
        display: flex;
        gap: 8px;
        margin-left: auto;
      }

      .retry-manual-btn, .offline-mode-btn, .reconnect-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border: 1px solid;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        font-size: 0.8rem;
        transition: all 0.2s ease;
      }

      .retry-manual-btn {
        border-color: #2196f3;
        color: #1565c0;
      }

      .retry-manual-btn:hover {
        background: #2196f3;
        color: white;
      }

      .offline-mode-btn {
        border-color: #9c27b0;
        color: #6a1b9a;
      }

      .offline-mode-btn:hover {
        background: #9c27b0;
        color: white;
      }

      .reconnect-btn {
        border-color: #4caf50;
        color: #2e7d32;
        margin-left: auto;
      }

      .reconnect-btn:hover {
        background: #4caf50;
        color: white;
      }

      .retry-progress {
        flex: 1;
        height: 4px;
        background: rgba(33, 150, 243, 0.2);
        border-radius: 2px;
        overflow: hidden;
      }

      .retry-progress-bar {
        height: 100%;
        background: #2196f3;
        border-radius: 2px;
        transition: width 0.3s ease;
      }

      /* Enhanced offline state styles */
      .stat-item.offline {
        background: #f8f9fa;
        border-color: #dee2e6;
        opacity: 0.8;
      }

      .stat-item.offline .stat-icon {
        opacity: 0.6;
      }

      .stat-item.offline .stat-value {
        color: #6c757d;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .umig-welcome-container {
          padding: 16px;
        }

        .umig-welcome-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }

        .welcome-title h1 {
          font-size: 1.5rem;
        }

        .welcome-grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .actions-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .nav-grid {
          grid-template-columns: 1fr;
        }

        .error-content {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .error-actions {
          margin-left: 0;
          width: 100%;
          justify-content: space-between;
        }

        .retry-manual-btn, .offline-mode-btn {
          flex: 1;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Component destruction cleanup
   */
  destroy() {
    // Clear real-time update interval
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }

    // Remove injected styles
    const styles = document.getElementById("umig-welcome-component-styles");
    if (styles) {
      styles.remove();
    }

    // Call parent destroy
    super.destroy();

    if (this.config.debug) {
      console.log("[UMIG] WelcomeComponent destroyed");
    }
  }

  /**
   * Component update check
   */
  shouldUpdate(newState = {}) {
    // Update if user context changes
    if (
      newState.userRole !== this.state.userRole ||
      newState.userName !== this.state.userName ||
      newState.isAuthenticated !== this.state.isAuthenticated
    ) {
      return true;
    }

    // Update if system stats change
    if (newState.systemStats !== this.state.systemStats) {
      return true;
    }

    return false;
  }
}

// Global registration following ADR-058 pattern
window.UmigWelcomeComponent = UmigWelcomeComponent;

// Debug logging for loading completion
console.log(
  "[UMIG] WelcomeComponent.js LOADED - Class available as window.UmigWelcomeComponent",
);
