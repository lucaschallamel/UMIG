/**
 * US-087 Confluence Macro Integration E2E Test
 *
 * End-to-end test for US-087 Phase 1 integration with Confluence macro environment.
 * This test validates the complete browser-based integration workflow.
 *
 * Run with: npm run test:js:e2e -- --testPathPattern='us-087-confluence-integration'
 */

const path = require('path');

// Browser-compatible integration script for manual testing
const confluenceMacroIntegrationScript = `
/**
 * US-087 Confluence Macro Integration Script - FIXED VERSION
 * This script can be copied and pasted into browser console for manual testing
 */

(function () {
  "use strict";

  console.log("====================================");
  console.log("US-087 Confluence Macro Integration - E2E Test Version");
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

  // Inject FeatureToggle for testing
  function injectFeatureToggle() {
    console.log("💉 Injecting FeatureToggle for testing...");

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
        console.log(\`✅ Feature enabled: \${flag}\`);
      }

      disable(flag) {
        this.flags[flag] = false;
        this.saveOverrides();
        console.log(\`🚫 Feature disabled: \${flag}\`);
      }

      toggle(flag) {
        this.flags[flag] = !this.flags[flag];
        this.saveOverrides();
        console.log(
          \`🔄 Feature toggled: \${flag} is now \${this.flags[flag] ? "enabled" : "disabled"}\`,
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
              console.log("📂 Feature toggle overrides loaded from localStorage");
            }
          }
        } catch (e) {
          console.warn("Failed to load feature toggle overrides:", e);
        }
      }

      saveOverrides() {
        try {
          localStorage.setItem("umig-feature-toggles", JSON.stringify(this.flags));
        } catch (e) {
          console.warn("Failed to save feature toggle overrides:", e);
        }
      }

      getOverride(flag) {
        const urlParams = new URLSearchParams(window.location.search);
        const override = urlParams.get(\`feature-\${flag}\`);
        if (override !== null) {
          return override === "true" || override === "1";
        }
        return null;
      }

      emergencyRollback() {
        console.warn("🚨 EMERGENCY ROLLBACK INITIATED");
        console.log("[Security] Emergency rollback triggered at", new Date().toISOString());

        // Disable all migration-related features
        Object.keys(this.flags).forEach(flag => {
          if (flag.includes('component') || flag.includes('migration')) {
            this.flags[flag] = false;
          }
        });

        // Keep monitoring active for debugging
        this.flags["performance-monitoring"] = true;
        this.saveOverrides();

        console.log("✅ Emergency rollback completed");
      }
    };

    // Create singleton instance
    window.FeatureToggle = new window.FeatureToggle();
    console.log("✅ FeatureToggle injected successfully");
  }

  // Inject PerformanceMonitor for testing
  function injectPerformanceMonitor() {
    console.log("💉 Injecting PerformanceMonitor for testing...");

    window.PerformanceMonitor = class PerformanceMonitor {
      constructor() {
        this.metrics = [];
        this.config = {
          maxMetricsSize: 1000,
          warnThreshold: 1.1,
          errorThreshold: 1.25,
          captureStackTrace: false,
        };
      }

      startOperation(name) {
        const startTime = performance.now();
        const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

        return {
          name,
          startTime,
          startMemory,
          end: () => {
            const endTime = performance.now();
            const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

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

        console.log(\`[Performance] \${metric.name}: \${metric.duration.toFixed(2)}ms\`);
      }

      generateReport() {
        const report = {
          timestamp: Date.now(),
          totalMetrics: this.metrics.length,
          memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 0,
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
          const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);

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
    };

    // Create singleton instance
    window.PerformanceMonitor = new window.PerformanceMonitor();
    console.log("✅ PerformanceMonitor injected successfully");
  }

  // Initialize migration features
  async function initializeMigrationFeatures() {
    console.log("\\n🚀 Initializing US-087 Migration Features...");

    // Create mock adminGui if not present (for testing)
    if (!window.adminGui) {
      window.adminGui = {
        currentSection: 'teams',
        loadSection: function(section) {
          console.log(\`Loading section: \${section}\`);
          this.currentSection = section;
        }
      };
      console.log("🔧 Created mock adminGui for testing");
    }

    const result = findAdminGuiContext();
    if (!result) {
      console.error("❌ Cannot find Admin GUI context");
      return false;
    }

    US087.context = result.context;
    US087.adminGui = result.adminGui;

    // Inject utilities
    if (!window.FeatureToggle) {
      injectFeatureToggle();
    }
    US087.featureToggle = window.FeatureToggle;

    if (!window.PerformanceMonitor) {
      injectPerformanceMonitor();
    }
    US087.performanceMonitor = window.PerformanceMonitor;

    // Initialize component migration
    if (US087.adminGui) {
      US087.adminGui.featureToggle = US087.featureToggle;
      US087.adminGui.performanceMonitor = US087.performanceMonitor;

      // Add shouldUseComponentManager method
      US087.adminGui.shouldUseComponentManager = function (entity) {
        const migrationEnabled = US087.featureToggle.isEnabled("admin-gui-migration");
        const componentEnabled = US087.featureToggle.isEnabled(\`\${entity}-component\`);
        return migrationEnabled && componentEnabled;
      };
      console.log("✅ Added shouldUseComponentManager method");
    }

    US087.initialized = true;
    console.log("✅ US-087 Migration Features initialized successfully");
    return true;
  }

  // Test helper functions
  window.US087TestHelpers = {
    initialize: async function () {
      console.log("Initializing US-087 features...");
      const success = await initializeMigrationFeatures();
      console.log(success ? "✅ Initialization complete!" : "❌ Initialization failed");
      return success;
    },

    toggleMigration: function () {
      const featureToggle = US087.featureToggle || (US087.adminGui && US087.adminGui.featureToggle);
      if (!featureToggle) {
        console.log("❌ Feature toggle not available - initialize first");
        return false;
      }

      const isEnabled = featureToggle.isEnabled("admin-gui-migration");
      if (isEnabled) {
        featureToggle.disable("admin-gui-migration");
        console.log("🔴 Migration disabled");
      } else {
        featureToggle.enable("admin-gui-migration");
        console.log("🟢 Migration enabled");
      }
      return !isEnabled;
    },

    toggleTeams: function () {
      const featureToggle = US087.featureToggle || (US087.adminGui && US087.adminGui.featureToggle);
      if (!featureToggle) {
        console.log("❌ Feature toggle not available - initialize first");
        return false;
      }

      const isEnabled = featureToggle.isEnabled("teams-component");
      if (isEnabled) {
        featureToggle.disable("teams-component");
        console.log("🔴 Teams component disabled");
      } else {
        featureToggle.enable("teams-component");
        console.log("🟢 Teams component enabled");
      }
      return !isEnabled;
    },

    testTeamsLoad: function () {
      if (!US087.adminGui) {
        console.log("❌ Admin GUI not available");
        return false;
      }

      const shouldUseComponent = US087.adminGui.shouldUseComponentManager("teams");
      console.log(\`Teams component manager: \${shouldUseComponent ? "YES" : "NO"}\`);

      if (typeof US087.adminGui.loadSection === "function") {
        US087.adminGui.loadSection("teams");
        console.log("✅ Teams section load triggered");
        return true;
      } else {
        console.log("⚠️ Manual navigation to Teams required");
        return false;
      }
    },

    getStatus: function() {
      return {
        initialized: US087.initialized,
        adminGui: !!US087.adminGui,
        featureToggle: !!US087.featureToggle,
        performanceMonitor: !!US087.performanceMonitor,
        migrationEnabled: US087.featureToggle ? US087.featureToggle.isEnabled("admin-gui-migration") : false,
        teamsEnabled: US087.featureToggle ? US087.featureToggle.isEnabled("teams-component") : false
      };
    }
  };

  // Auto-initialize
  console.log("\\n🤖 Auto-initializing US-087 integration...");
  initializeMigrationFeatures().then(() => {
    console.log("\\n✅ US-087 Confluence Macro Integration Ready!");
    console.log("Use window.US087TestHelpers for testing functions");
  });

  // Make functions globally available
  window.US087 = US087;
  window.initializeMigrationFeatures = initializeMigrationFeatures;

})();
`;

describe('US-087 Confluence Macro Integration E2E', () => {
  let page;

  // Mock browser environment for testing
  beforeEach(() => {
    // Reset global state
    delete global.window;
    delete global.document;
    delete global.localStorage;
    delete global.performance;
    delete global.console;

    // Setup minimal browser environment
    global.window = {
      US087: {},
      adminGui: undefined,
      FeatureToggle: undefined,
      PerformanceMonitor: undefined,
      location: { search: '' },
      localStorage: {
        store: {},
        getItem: jest.fn((key) => global.window.localStorage.store[key] || null),
        setItem: jest.fn((key, value) => {
          global.window.localStorage.store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
          delete global.window.localStorage.store[key];
        })
      },
      performance: {
        now: jest.fn(() => Date.now()),
        memory: {
          usedJSHeapSize: Math.floor(Math.random() * 1000000)
        }
      }
    };

    global.document = {
      body: {
        appendChild: jest.fn(),
        innerHTML: ''
      },
      createElement: jest.fn(() => ({
        id: '',
        innerHTML: '',
        style: { display: 'block' },
        appendChild: jest.fn(),
        querySelector: jest.fn()
      })),
      getElementById: jest.fn(),
      querySelectorAll: jest.fn(() => [])
    };

    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    global.localStorage = global.window.localStorage;
    global.performance = global.window.performance;
  });

  describe('Script Integration', () => {
    test('should execute the integration script without errors', () => {
      expect(() => {
        // Simulate script execution in browser environment
        eval(confluenceMacroIntegrationScript);
      }).not.toThrow();

      expect(global.window.US087).toBeDefined();
      expect(global.window.US087TestHelpers).toBeDefined();
    });

    test('should inject FeatureToggle class', () => {
      eval(confluenceMacroIntegrationScript);
      expect(global.window.FeatureToggle).toBeDefined();
      expect(typeof global.window.FeatureToggle).toBe('function');
    });

    test('should inject PerformanceMonitor class', () => {
      eval(confluenceMacroIntegrationScript);
      expect(global.window.PerformanceMonitor).toBeDefined();
      expect(typeof global.window.PerformanceMonitor).toBe('function');
    });
  });

  describe('Feature Toggle Functionality', () => {
    beforeEach(() => {
      eval(confluenceMacroIntegrationScript);
    });

    test('should enable and disable features correctly', () => {
      const helpers = global.window.US087TestHelpers;

      // Test migration toggle
      const migrationResult = helpers.toggleMigration();
      expect(typeof migrationResult).toBe('boolean');

      // Test teams toggle
      const teamsResult = helpers.toggleTeams();
      expect(typeof teamsResult).toBe('boolean');
    });

    test('should persist feature flags in localStorage', () => {
      const featureToggle = global.window.US087.featureToggle;

      featureToggle.enable('admin-gui-migration');
      expect(global.localStorage.setItem).toHaveBeenCalled();

      featureToggle.disable('admin-gui-migration');
      expect(global.localStorage.setItem).toHaveBeenCalledTimes(2);
    });

    test('should support emergency rollback', () => {
      const featureToggle = global.window.US087.featureToggle;

      // Enable some features
      featureToggle.enable('admin-gui-migration');
      featureToggle.enable('teams-component');

      // Perform emergency rollback
      featureToggle.emergencyRollback();

      // Verify features are disabled
      expect(featureToggle.isEnabled('admin-gui-migration')).toBe(false);
      expect(featureToggle.isEnabled('teams-component')).toBe(false);

      // Performance monitoring should remain active
      expect(featureToggle.isEnabled('performance-monitoring')).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      eval(confluenceMacroIntegrationScript);
    });

    test('should record performance metrics', () => {
      const perfMonitor = global.window.US087.performanceMonitor;

      const operation = perfMonitor.startOperation('test-operation');
      const result = operation.end();

      expect(result).toBeDefined();
      expect(result.name).toBe('test-operation');
      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
    });

    test('should generate performance reports', () => {
      const perfMonitor = global.window.US087.performanceMonitor;

      // Record some metrics
      const op1 = perfMonitor.startOperation('operation1');
      op1.end();

      const op2 = perfMonitor.startOperation('operation2');
      op2.end();

      const report = perfMonitor.generateReport();

      expect(report).toBeDefined();
      expect(report.totalMetrics).toBe(2);
      expect(report.timestamp).toBeDefined();
      expect(report.memoryUsage).toBeDefined();
    });
  });

  describe('Component Migration Logic', () => {
    beforeEach(() => {
      eval(confluenceMacroIntegrationScript);
    });

    test('should determine component manager usage correctly', () => {
      const adminGui = global.window.US087.adminGui;
      const featureToggle = global.window.US087.featureToggle;

      // Test disabled state
      expect(adminGui.shouldUseComponentManager('teams')).toBe(false);

      // Enable migration only
      featureToggle.enable('admin-gui-migration');
      expect(adminGui.shouldUseComponentManager('teams')).toBe(false);

      // Enable both migration and teams component
      featureToggle.enable('teams-component');
      expect(adminGui.shouldUseComponentManager('teams')).toBe(true);
    });

    test('should provide status information', () => {
      const helpers = global.window.US087TestHelpers;
      const status = helpers.getStatus();

      expect(status).toBeDefined();
      expect(status.initialized).toBe(true);
      expect(status.adminGui).toBe(true);
      expect(status.featureToggle).toBe(true);
      expect(status.performanceMonitor).toBe(true);
      expect(typeof status.migrationEnabled).toBe('boolean');
      expect(typeof status.teamsEnabled).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing dependencies gracefully', () => {
      // Remove dependencies
      delete global.window.localStorage;
      delete global.window.performance;

      expect(() => {
        eval(confluenceMacroIntegrationScript);
      }).not.toThrow();

      // Should still initialize core functionality
      expect(global.window.US087).toBeDefined();
      expect(global.window.FeatureToggle).toBeDefined();
    });

    test('should handle localStorage errors', () => {
      // Mock localStorage to throw errors
      global.window.localStorage.setItem = jest.fn(() => {
        throw new Error('localStorage not available');
      });

      eval(confluenceMacroIntegrationScript);
      const featureToggle = global.window.US087.featureToggle;

      // Should not throw when saving fails
      expect(() => {
        featureToggle.enable('test-feature');
      }).not.toThrow();
    });
  });

  afterEach(() => {
    // Clean up global state
    delete global.window;
    delete global.document;
    delete global.localStorage;
    delete global.performance;
    delete global.console;
  });
});

// Export the browser script for manual testing
module.exports = {
  confluenceMacroIntegrationScript,

  // Function to generate the script for copying to browser console
  getBrowserScript: () => confluenceMacroIntegrationScript,

  // Instructions for manual testing
  getManualTestingInstructions: () => \`
Manual Testing Instructions:

1. Open your browser and navigate to the Confluence Admin GUI page
2. Open the browser console (F12)
3. Copy and paste the following script:

\${confluenceMacroIntegrationScript}

4. After execution, use these commands for testing:
   - window.US087TestHelpers.initialize()
   - window.US087TestHelpers.toggleMigration()
   - window.US087TestHelpers.toggleTeams()
   - window.US087TestHelpers.testTeamsLoad()
   - window.US087TestHelpers.getStatus()

5. Verify that features toggle correctly and persist in localStorage
6. Check that performance monitoring is working
7. Test emergency rollback functionality
\`
};