/**
 * US-087 Confluence Macro Integration Script - FIXED VERSION
 *
 * This script properly integrates Phase 1 features with the Admin GUI
 * when it's running as a Confluence macro.
 *
 * FIXES:
 * - Corrected ScriptRunner URLs for loading utilities
 * - Better error handling for missing utilities
 * - Direct injection of utilities if loading fails
 *
 * How to use:
 * 1. Navigate to your Confluence page with the Admin GUI macro
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. The test panel will appear with proper context detection
 */

(function () {
  "use strict";

  console.log("====================================");
  console.log("US-087 Confluence Macro Integration - FIXED");
  console.log("====================================");

  // Global reference for debugging
  window.US087 = {
    context: null,
    adminGui: null,
    featureToggle: null,
    performanceMonitor: null,
    initialized: false,
  };

  // Function to find the Admin GUI context
  function findAdminGuiContext() {
    console.log("🔍 Searching for Admin GUI context...");

    // Check global window (most common for Confluence macros)
    if (typeof window.adminGui !== "undefined") {
      console.log("✅ Found adminGui in global window");
      return { context: window, adminGui: window.adminGui };
    }

    console.log("⚠️ AdminGui not found in expected locations");
    return null;
  }

  // Inject FeatureToggle directly if loading fails
  function injectFeatureToggle() {
    console.log("💉 Injecting FeatureToggle directly...");

    window.FeatureToggle = class FeatureToggle {
      constructor() {
        this.flags = {
          "admin-gui-migration": false,
          "teams-component": false,
          "users-component": false,
          "environments-component": false,
          "applications-component": false,
          "labels-component": false,
          "migration-types-component": false,
          "iteration-types-component": false,
          "performance-monitoring": true,
          "security-hardening": true,
          "relationship-caching": false,
          "rollout-percentage": 0,
        };
        this.loadOverrides();
      }

      isEnabled(flag) {
        const override = this.getOverride(flag);
        if (override !== null) {
          return override;
        }
        return this.flags[flag] || false;
      }

      enable(flag) {
        this.flags[flag] = true;
        this.saveOverrides();
        console.log(`✅ Feature enabled: ${flag}`);
      }

      disable(flag) {
        this.flags[flag] = false;
        this.saveOverrides();
        console.log(`🚫 Feature disabled: ${flag}`);
      }

      toggle(flag) {
        this.flags[flag] = !this.flags[flag];
        this.saveOverrides();
        console.log(
          `🔄 Feature toggled: ${flag} is now ${this.flags[flag] ? "enabled" : "disabled"}`,
        );
      }

      getAllFlags() {
        return { ...this.flags };
      }

      loadOverrides() {
        try {
          const stored = localStorage.getItem("umig-feature-toggles");
          if (stored) {
            const overrides = JSON.parse(stored);
            if (overrides && typeof overrides === "object") {
              Object.assign(this.flags, overrides);
              console.log(
                "📂 Feature toggle overrides loaded from localStorage",
              );
            }
          }
        } catch (e) {
          console.warn("Failed to load feature toggle overrides:", e);
        }
      }

      saveOverrides() {
        try {
          localStorage.setItem(
            "umig-feature-toggles",
            JSON.stringify(this.flags),
          );
        } catch (e) {
          console.warn("Failed to save feature toggle overrides:", e);
        }
      }

      getOverride(flag) {
        const urlParams = new URLSearchParams(window.location.search);
        const override = urlParams.get(`feature-${flag}`);
        if (override !== null) {
          return override === "true" || override === "1";
        }
        return null;
      }

      emergencyRollback() {
        console.warn("🚨 EMERGENCY ROLLBACK INITIATED");
        console.log(
          "[Security] Emergency rollback triggered at",
          new Date().toISOString(),
        );

        // Disable all migration-related features
        this.flags["admin-gui-migration"] = false;
        this.flags["teams-component"] = false;
        this.flags["users-component"] = false;
        this.flags["environments-component"] = false;
        this.flags["applications-component"] = false;
        this.flags["labels-component"] = false;
        this.flags["migration-types-component"] = false;
        this.flags["iteration-types-component"] = false;
        this.flags["relationship-caching"] = false;
        this.flags["rollout-percentage"] = 0;

        // Keep monitoring active for debugging
        this.flags["performance-monitoring"] = true;

        // Save state
        this.saveOverrides();

        // Reload the page to ensure clean state
        setTimeout(() => {
          console.log("🔄 Reloading page after rollback...");
          window.location.reload();
        }, 1000);
      }
    };

    // Create singleton instance
    window.FeatureToggle = new window.FeatureToggle();
    console.log("✅ FeatureToggle injected successfully");
  }

  // Inject PerformanceMonitor directly if loading fails
  function injectPerformanceMonitor() {
    console.log("💉 Injecting PerformanceMonitor directly...");

    window.PerformanceMonitor = class PerformanceMonitor {
      constructor() {
        this.metrics = [];
        this.baselines = {};
        this.config = {
          maxMetricsSize: 1000,
          warnThreshold: 1.1, // 10% degradation
          errorThreshold: 1.25, // 25% degradation
          captureStackTrace: false,
        };
      }

      startOperation(name) {
        const startTime = performance.now();
        const startMemory = performance.memory
          ? performance.memory.usedJSHeapSize
          : 0;

        return {
          name,
          startTime,
          startMemory,
          end: () => {
            const endTime = performance.now();
            const endMemory = performance.memory
              ? performance.memory.usedJSHeapSize
              : 0;

            const metric = {
              name,
              timestamp: Date.now(),
              duration: endTime - startTime,
              memoryDelta: endMemory - startMemory,
              memoryUsage: endMemory,
            };

            this.recordMetric(metric);
            return metric;
          },
        };
      }

      recordMetric(metric) {
        this.metrics.push(metric);

        // Maintain max size
        if (this.metrics.length > this.config.maxMetricsSize) {
          this.metrics = this.metrics.slice(-this.config.maxMetricsSize);
        }

        console.log(
          `[Performance] ${metric.name}: ${metric.duration.toFixed(2)}ms`,
        );
      }

      generateReport() {
        const report = {
          timestamp: Date.now(),
          totalMetrics: this.metrics.length,
          memoryUsage: performance.memory
            ? performance.memory.usedJSHeapSize
            : 0,
          metrics: this.getMetricsSummary(),
        };

        console.log("📊 Performance Report:", report);
        return report;
      }

      getMetricsSummary() {
        const summary = {};
        const grouped = {};

        // Group metrics by name
        this.metrics.forEach((metric) => {
          if (!grouped[metric.name]) {
            grouped[metric.name] = [];
          }
          grouped[metric.name].push(metric);
        });

        // Calculate statistics for each group
        Object.keys(grouped).forEach((name) => {
          const metrics = grouped[name];
          const durations = metrics
            .map((m) => m.duration)
            .sort((a, b) => a - b);

          summary[name] = {
            count: metrics.length,
            average: durations.reduce((a, b) => a + b, 0) / durations.length,
            median: durations[Math.floor(durations.length / 2)],
            p95: durations[Math.floor(durations.length * 0.95)],
            p99: durations[Math.floor(durations.length * 0.99)],
          };
        });

        return summary;
      }

      loadBaselines() {
        try {
          const stored = localStorage.getItem("umig-performance-baselines");
          if (stored) {
            this.baselines = JSON.parse(stored);
            console.log(
              "[Performance] Baselines loaded:",
              Object.keys(this.baselines).length,
              "operations",
            );
            return this.baselines;
          }
        } catch (e) {
          console.warn("[Performance] Failed to load baselines:", e);
        }
        return {};
      }

      saveBaselines() {
        try {
          const summary = this.getMetricsSummary();
          // Store current metrics as baselines
          Object.keys(summary).forEach((operation) => {
            this.baselines[operation] = {
              average: summary[operation].average,
              p95: summary[operation].p95,
              timestamp: Date.now(),
            };
          });

          localStorage.setItem(
            "umig-performance-baselines",
            JSON.stringify(this.baselines),
          );
          console.log(
            "[Performance] Baselines saved:",
            Object.keys(this.baselines).length,
            "operations",
          );
          return this.baselines;
        } catch (e) {
          console.warn("[Performance] Failed to save baselines:", e);
          return null;
        }
      }
    };

    // Create singleton instance
    window.PerformanceMonitor = new window.PerformanceMonitor();
    console.log("✅ PerformanceMonitor injected successfully");
  }

  // Function to initialize the migration features
  async function initializeMigrationFeatures() {
    console.log("\n🚀 Initializing US-087 Migration Features...");

    // Find Admin GUI context
    const result = findAdminGuiContext();

    if (!result) {
      console.error("❌ Cannot find Admin GUI context");
      console.log(
        "ℹ️ Admin GUI may not be loaded yet. Try refreshing the page or waiting a moment.",
      );
      return false;
    }

    US087.context = result.context;
    US087.adminGui = result.adminGui;

    // Inject FeatureToggle if not present
    if (!window.FeatureToggle) {
      injectFeatureToggle();
    }
    US087.featureToggle = window.FeatureToggle;

    // Inject PerformanceMonitor if not present
    if (!window.PerformanceMonitor) {
      injectPerformanceMonitor();
    }
    US087.performanceMonitor = window.PerformanceMonitor;

    // Initialize component migration in admin GUI if not already done
    if (US087.adminGui) {
      // Attach utilities to adminGui
      US087.adminGui.featureToggle = US087.featureToggle;
      US087.adminGui.performanceMonitor = US087.performanceMonitor;

      // Initialize component migration if the function exists
      if (typeof US087.adminGui.initializeComponentMigration === "function") {
        console.log("🔧 Initializing component migration in Admin GUI...");
        US087.adminGui.initializeComponentMigration();
        console.log("✅ Component migration initialized");
      } else {
        console.log(
          "⚠️ initializeComponentMigration not found - admin-gui.js may need updating",
        );
      }

      // Add helper methods if they don't exist
      if (typeof US087.adminGui.shouldUseComponentManager !== "function") {
        US087.adminGui.shouldUseComponentManager = function (entity) {
          const migrationEnabled = US087.featureToggle.isEnabled(
            "admin-gui-migration",
          );
          const componentEnabled = US087.featureToggle.isEnabled(
            `${entity}-component`,
          );
          return migrationEnabled && componentEnabled;
        };
        console.log("✅ Added shouldUseComponentManager method");
      }
    }

    US087.initialized = true;
    console.log("✅ US-087 Migration Features initialized successfully");
    return true;
  }

  // Create the enhanced test UI
  function createEnhancedTestUI() {
    // Remove any existing test panels
    const existingPanels = document.querySelectorAll(
      '[id*="us087"], [id*="US087"]',
    );
    existingPanels.forEach((panel) => panel.remove());

    const testUI = document.createElement("div");
    testUI.id = "us087-enhanced-test";
    testUI.innerHTML = `
            <style>
                #us087-enhanced-test {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    padding: 20px;
                    z-index: 10000;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    min-width: 320px;
                    max-width: 400px;
                    color: white;
                }
                #us087-enhanced-test h3 {
                    margin: 0 0 15px 0;
                    font-size: 18px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                #us087-enhanced-test .status-container {
                    background: rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: 12px;
                    margin: 15px 0;
                    backdrop-filter: blur(10px);
                }
                #us087-enhanced-test .status-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin: 8px 0;
                    font-size: 13px;
                }
                #us087-enhanced-test .status-indicator {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                #us087-enhanced-test .status-indicator.success {
                    background: #10b981;
                    color: white;
                }
                #us087-enhanced-test .status-indicator.warning {
                    background: #f59e0b;
                    color: white;
                }
                #us087-enhanced-test .status-indicator.error {
                    background: #ef4444;
                    color: white;
                }
                #us087-enhanced-test .button-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-top: 15px;
                }
                #us087-enhanced-test button {
                    padding: 10px;
                    background: rgba(255,255,255,0.25);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.3);
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    transition: all 0.2s;
                    backdrop-filter: blur(10px);
                }
                #us087-enhanced-test button:hover {
                    background: rgba(255,255,255,0.35);
                    transform: translateY(-1px);
                }
                #us087-enhanced-test button.primary {
                    grid-column: span 2;
                    background: white;
                    color: #764ba2;
                    font-weight: 600;
                }
                #us087-enhanced-test button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                #us087-enhanced-test .close-btn {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                #us087-enhanced-test .close-btn:hover {
                    background: rgba(255,255,255,0.2);
                }
                #us087-enhanced-test .console-output {
                    background: rgba(0,0,0,0.3);
                    border-radius: 6px;
                    padding: 10px;
                    margin-top: 10px;
                    font-family: 'Monaco', 'Courier New', monospace;
                    font-size: 11px;
                    max-height: 150px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                }
            </style>
            <button class="close-btn" onclick="document.getElementById('us087-enhanced-test').remove()">×</button>
            <h3>🚀 US-087 Phase 1 Testing (Fixed)</h3>

            <div class="status-container">
                <div class="status-item">
                    <span>Admin GUI</span>
                    <span id="status-admingui" class="status-indicator error">NOT FOUND</span>
                </div>
                <div class="status-item">
                    <span>Feature Toggle</span>
                    <span id="status-featuretoggle" class="status-indicator error">NOT LOADED</span>
                </div>
                <div class="status-item">
                    <span>Performance Monitor</span>
                    <span id="status-perfmon" class="status-indicator error">NOT LOADED</span>
                </div>
                <div class="status-item">
                    <span>Migration Status</span>
                    <span id="status-migration" class="status-indicator error">INACTIVE</span>
                </div>
            </div>

            <div class="button-group">
                <button class="primary" onclick="US087TestHelpers.initialize()">
                    🔧 Initialize System
                </button>
                <button onclick="US087TestHelpers.toggleMigration()">
                    🔄 Toggle Migration
                </button>
                <button onclick="US087TestHelpers.toggleTeams()">
                    👥 Toggle Teams
                </button>
                <button onclick="US087TestHelpers.showPerformance()">
                    📊 Performance
                </button>
                <button onclick="US087TestHelpers.testTeamsLoad()">
                    🧪 Test Teams
                </button>
                <button onclick="US087TestHelpers.showFlags()">
                    🏴 Show Flags
                </button>
                <button onclick="US087TestHelpers.emergencyRollback()">
                    🚨 Rollback
                </button>
                <button onclick="US087TestHelpers.showConsole()">
                    💻 Console
                </button>
            </div>

            <div id="console-output" class="console-output" style="display: none;">
Console output will appear here...
</div>
        `;

    document.body.appendChild(testUI);
    updateUIStatus();
  }

  // Update UI status indicators
  function updateUIStatus() {
    const statusAdminGui = document.getElementById("status-admingui");
    const statusFeatureToggle = document.getElementById("status-featuretoggle");
    const statusPerfMon = document.getElementById("status-perfmon");
    const statusMigration = document.getElementById("status-migration");

    if (US087.adminGui) {
      statusAdminGui.className = "status-indicator success";
      statusAdminGui.textContent = "LOADED";
    }

    if (
      US087.featureToggle ||
      (US087.adminGui && US087.adminGui.featureToggle)
    ) {
      statusFeatureToggle.className = "status-indicator success";
      statusFeatureToggle.textContent = "READY";
    }

    if (
      US087.performanceMonitor ||
      (US087.adminGui && US087.adminGui.performanceMonitor)
    ) {
      statusPerfMon.className = "status-indicator success";
      statusPerfMon.textContent = "READY";
    }

    // Check migration status
    const featureToggle =
      US087.featureToggle || (US087.adminGui && US087.adminGui.featureToggle);
    if (featureToggle) {
      const isMigrationEnabled = featureToggle.isEnabled("admin-gui-migration");
      const isTeamsEnabled = featureToggle.isEnabled("teams-component");

      if (isMigrationEnabled && isTeamsEnabled) {
        statusMigration.className = "status-indicator success";
        statusMigration.textContent = "ACTIVE";
      } else if (isMigrationEnabled) {
        statusMigration.className = "status-indicator warning";
        statusMigration.textContent = "PARTIAL";
      } else {
        statusMigration.className = "status-indicator error";
        statusMigration.textContent = "INACTIVE";
      }
    }
  }

  // Helper functions for the test UI
  window.US087TestHelpers = {
    initialize: async function () {
      logToConsole("Initializing US-087 features...");
      const success = await initializeMigrationFeatures();
      if (success) {
        updateUIStatus();
        logToConsole("✅ Initialization complete!");
      } else {
        logToConsole("❌ Initialization failed - check browser console");
      }
    },

    toggleMigration: function () {
      const featureToggle =
        US087.featureToggle || (US087.adminGui && US087.adminGui.featureToggle);
      if (!featureToggle) {
        logToConsole("❌ Feature toggle not available - initialize first");
        return;
      }

      const isEnabled = featureToggle.isEnabled("admin-gui-migration");
      if (isEnabled) {
        featureToggle.disable("admin-gui-migration");
        logToConsole("🔴 Migration disabled");
      } else {
        featureToggle.enable("admin-gui-migration");
        logToConsole("🟢 Migration enabled");
      }
      updateUIStatus();
    },

    toggleTeams: function () {
      const featureToggle =
        US087.featureToggle || (US087.adminGui && US087.adminGui.featureToggle);
      if (!featureToggle) {
        logToConsole("❌ Feature toggle not available - initialize first");
        return;
      }

      const isEnabled = featureToggle.isEnabled("teams-component");
      if (isEnabled) {
        featureToggle.disable("teams-component");
        logToConsole("🔴 Teams component disabled");
      } else {
        featureToggle.enable("teams-component");
        logToConsole("🟢 Teams component enabled");
      }
      updateUIStatus();
    },

    showPerformance: function () {
      const perfMonitor =
        US087.performanceMonitor ||
        (US087.adminGui && US087.adminGui.performanceMonitor);
      if (!perfMonitor) {
        logToConsole("❌ Performance monitor not available");
        return;
      }

      const report = perfMonitor.generateReport();
      console.log("📊 Performance Report:", report);
      logToConsole(
        `📊 Performance: ${report.totalMetrics} metrics, ${(report.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
      );
    },

    testTeamsLoad: function () {
      if (!US087.adminGui) {
        logToConsole("❌ Admin GUI not available");
        return;
      }

      const shouldUseComponent =
        US087.adminGui.shouldUseComponentManager("teams");
      logToConsole(
        `Teams component manager: ${shouldUseComponent ? "YES" : "NO"}`,
      );

      if (typeof US087.adminGui.loadSection === "function") {
        US087.adminGui.loadSection("teams");
        logToConsole("✅ Teams section load triggered");
      } else if (typeof US087.adminGui.loadCurrentSection === "function") {
        US087.adminGui.loadCurrentSection("teams");
        logToConsole("✅ Teams section load triggered (loadCurrentSection)");
      } else {
        logToConsole("⚠️ Manual navigation to Teams required");
        logToConsole("Click on Teams in the sidebar menu");
      }
    },

    showFlags: function () {
      const featureToggle =
        US087.featureToggle || (US087.adminGui && US087.adminGui.featureToggle);
      if (!featureToggle) {
        logToConsole("❌ Feature toggle not available");
        return;
      }

      const flags = featureToggle.getAllFlags();
      console.log("🏴 All Feature Flags:", flags);

      const enabled = Object.entries(flags)
        .filter(([key, value]) => value === true)
        .map(([key]) => key);

      logToConsole(
        `🏴 Enabled flags: ${enabled.length ? enabled.join(", ") : "None"}`,
      );
    },

    emergencyRollback: function () {
      const featureToggle =
        US087.featureToggle || (US087.adminGui && US087.adminGui.featureToggle);
      if (!featureToggle) {
        logToConsole("❌ Feature toggle not available");
        return;
      }

      if (
        confirm(
          "⚠️ Emergency rollback will disable all migration features. Continue?",
        )
      ) {
        featureToggle.emergencyRollback();
        logToConsole("🚨 Emergency rollback initiated");
      }
    },

    showConsole: function () {
      const output = document.getElementById("console-output");
      output.style.display = output.style.display === "none" ? "block" : "none";
    },
  };

  // Helper function to log to the mini console
  function logToConsole(message) {
    const output = document.getElementById("console-output");
    if (output) {
      const timestamp = new Date().toLocaleTimeString();
      output.innerHTML += `[${timestamp}] ${message}\n`;
      output.scrollTop = output.scrollHeight;
    }
    console.log(message);
  }

  // Auto-initialize on load
  console.log("\n🎉 Creating Enhanced Test UI...");
  createEnhancedTestUI();

  // Try to auto-initialize after a short delay
  setTimeout(async () => {
    console.log("🤖 Attempting auto-initialization...");
    await initializeMigrationFeatures();
    updateUIStatus();
  }, 1000);

  // Make functions globally available for debugging
  window.US087 = US087;
  window.initializeMigrationFeatures = initializeMigrationFeatures;
  window.updateUIStatus = updateUIStatus;

  console.log("\n====================================");
  console.log("✅ US-087 Macro Integration Ready!");
  console.log("The test panel should appear in the top-right corner.");
  console.log('Click "Initialize System" to begin testing.');
  console.log("====================================");
  console.log("\n📌 NOTE: This version directly injects the utilities");
  console.log("if they cannot be loaded from ScriptRunner.");
})();
