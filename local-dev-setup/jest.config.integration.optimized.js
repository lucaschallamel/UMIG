/**
 * UMIG Test Infrastructure Consolidation - Integration Test Configuration
 *
 * Optimized for API, database, and cross-component integration testing.
 * Real dependencies with controlled resource usage.
 *
 * Performance Targets:
 * - Memory usage: <512MB peak
 * - Execution time: <2 minutes
 * - Pass rate: >90%
 * - Parallelization: 25% workers
 *
 * @version 1.0.0
 * @author test-infrastructure-consolidation
 * @priority Critical (TD-005 Infrastructure Resolution)
 */

/** @type {import('jest').Config} */
const config = {
  displayName: "Integration Tests (Optimized)",
  testEnvironment: "node", // Node environment for API testing

  testEnvironmentOptions: {
    // Node-specific options for integration testing
  },

  // Integration-specific performance settings
  testTimeout: 30000, // 30 seconds for complex operations
  maxWorkers: "25%", // Limited parallelism to prevent conflicts
  detectOpenHandles: true,
  detectLeaks: false,
  forceExit: true,

  // Integration test matching
  testMatch: [
    "**/__tests__/integration/**/*.test.js",
    "**/__tests__/api/**/*.test.js",
    "**/__tests__/database/**/*.test.js",
    "**/__tests__/entities/**/*.integration.test.js",
    "**/__tests__/services/**/*.integration.test.js",
    "**/__tests__/email/**/*.test.js",
  ],

  // Exclude unit and e2e tests
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/unit/",
    "/__tests__/e2e/",
    "/__tests__/uat/",
    ".unit.test.js",
    ".e2e.test.js",
  ],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.integration.optimized.js"],

  setupFiles: [
    "<rootDir>/__tests__/__setup__/integration-test-environment.js",
    "<rootDir>/__tests__/__setup__/database-integration-setup.js",
  ],

  // Coverage for integration scenarios
  collectCoverage: false, // Enable only when needed
  coverageDirectory: "coverage/integration-optimized",
  coverageReporters: ["text-summary", "json"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // Integration-specific module resolution
  moduleNameMapper: {
    // Project aliases
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
    "^@entities/(.*)$": "<rootDir>/src/groovy/umig/web/js/entities/$1",
    "^@api/(.*)$": "<rootDir>/src/groovy/umig/api/$1",

    // REAL database connections for integration
    "^../../scripts/lib/db.js$": "<rootDir>/scripts/lib/db.js",
    "^../scripts/lib/db.js$": "<rootDir>/scripts/lib/db.js",

    // CRITICAL: Real SecurityUtils for integration tests
    "^SecurityUtils$":
      "<rootDir>/src/groovy/umig/web/js/components/SecurityUtils.js",
    "^.*SecurityUtils.js$":
      "<rootDir>/src/groovy/umig/web/js/components/SecurityUtils.js",

    // Lightweight mocks for non-critical dependencies
    "^tough-cookie$":
      "<rootDir>/__tests__/__mocks__/tough-cookie.lightweight.js",
    "^jsdom/lib/(.*)$": "<rootDir>/__tests__/__mocks__/jsdom-safe.js",
  },

  transform: {
    "^.+\\.js$": [
      "babel-jest",
      {
        compact: true,
        comments: false,
        presets: [
          [
            "@babel/preset-env",
            {
              targets: { node: "current" },
              modules: "commonjs",
            },
          ],
        ],
      },
    ],
  },

  // Prevent problematic transformations
  transformIgnorePatterns: [
    "node_modules/(?!(@faker-js/faker|uuid|supertest)/)",
  ],

  // Integration-specific optimization
  cacheDirectory: ".jest-cache-integration",
  clearMocks: false, // Keep some state for integration tests
  resetMocks: false,
  restoreMocks: true,
  resetModules: false,

  // Extended lifecycle for integration setup
  globalSetup: "<rootDir>/jest.global-setup.integration.js",
  globalTeardown: "<rootDir>/jest.global-teardown.integration.js",

  // Integration-specific error handling
  verbose: true, // More details for integration issues
  silent: false,
  errorOnDeprecated: false,
  bail: 1, // Stop on first failure for faster feedback

  // Memory monitoring for integration tests
  logHeapUsage: true,
  workerIdleMemoryLimit: "256MB",

  // Integration-specific reporters
  reporters: [
    "default",
    [
      "<rootDir>/__tests__/__infrastructure__/integration-performance-reporter.cjs",
      {
        memoryTarget: "512MB",
        executionTarget: "120s",
        passRateTarget: "90%",
        databaseConnectionTarget: "10",
      },
    ],
  ],

  // Module optimization for integration
  moduleDirectories: [
    "node_modules",
    "<rootDir>/src",
    "<rootDir>/__tests__",
    "<rootDir>/scripts",
  ],
  moduleFileExtensions: ["js", "json"],

  // Integration result processing
  testResultsProcessor:
    "<rootDir>/__tests__/__infrastructure__/integration-result-processor.cjs",

  // Snapshot management
  updateSnapshot: false,

  // Watch mode for integration development
  watchman: false,
  watchPathIgnorePatterns: [
    "/node_modules/",
    "/coverage/",
    "/.jest-cache/",
    "/data/",
  ],

  // Notification settings
  notify: false,
  notifyMode: "always",

  // Test sequencing for database operations
  testSequencer:
    "<rootDir>/__tests__/__infrastructure__/integration-test-sequencer.js",

  // Environment variables for integration tests
  testEnvironment: "node",
  testRunner: "jest-circus/runner",

  // Retry configuration for flaky integration tests
  jest: {
    retryTimes: 1,
    retryDelay: 1000,
  },
};

export default config;
