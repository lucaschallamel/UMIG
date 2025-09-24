/**
 * UMIG Test Infrastructure Consolidation - End-to-End Test Configuration
 *
 * Optimized for browser automation and full workflow testing.
 * Single worker execution with extended timeouts for stability.
 *
 * Performance Targets:
 * - Memory usage: <1GB peak
 * - Execution time: <5 minutes
 * - Pass rate: >85%
 * - Parallelization: Single worker (browser conflicts)
 *
 * @version 1.0.0
 * @author test-infrastructure-consolidation
 * @priority Critical (TD-005 Infrastructure Resolution)
 */

/** @type {import('jest').Config} */
const config = {
  displayName: "End-to-End Tests (Optimized)",
  testEnvironment: "node", // Node for Playwright integration

  testEnvironmentOptions: {
    // Node environment for browser automation
  },

  // E2E-specific performance settings
  testTimeout: 60000, // 60 seconds for browser operations
  maxWorkers: 1, // Single worker to prevent browser conflicts
  detectOpenHandles: true,
  detectLeaks: false,
  forceExit: true,

  // E2E test matching
  testMatch: [
    "**/__tests__/e2e/**/*.test.js",
    "**/__tests__/uat/**/*.test.js",
    "**/__tests__/workflows/**/*.test.js",
    "**/__tests__/browser/**/*.test.js",
  ],

  // Exclude other test types
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/unit/",
    "/__tests__/integration/",
    ".unit.test.js",
    ".integration.test.js",
  ],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.e2e.optimized.js"],

  setupFiles: [
    "<rootDir>/__tests__/__setup__/e2e-test-environment.js",
    "<rootDir>/__tests__/__setup__/playwright-setup.js",
  ],

  // Minimal coverage for E2E (focus on functionality)
  collectCoverage: false,
  coverageDirectory: "coverage/e2e-optimized",
  coverageReporters: ["text-summary"],

  // E2E-specific module resolution
  moduleNameMapper: {
    // Project aliases
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
    "^@entities/(.*)$": "<rootDir>/src/groovy/umig/web/js/entities/$1",
    "^@e2e/(.*)$": "<rootDir>/__tests__/e2e/$1",

    // E2E utilities
    "^@playwright/(.*)$": "<rootDir>/__tests__/__utils__/playwright/$1",
    "^@pages/(.*)$": "<rootDir>/__tests__/__utils__/page-objects/$1",

    // Browser-safe mocks
    "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie.browser.js",
    "^jsdom/lib/(.*)$": "<rootDir>/__tests__/__mocks__/jsdom-browser.js",

    // Real SecurityUtils for browser testing
    "^SecurityUtils$":
      "<rootDir>/src/groovy/umig/web/js/components/SecurityUtils.js",
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

  // Minimal transformations for E2E
  transformIgnorePatterns: ["node_modules/(?!(playwright|@playwright)/)"],

  // E2E-specific optimization
  cacheDirectory: ".jest-cache-e2e",
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  resetModules: true, // Clean state for browser tests

  // Extended lifecycle for browser setup
  globalSetup: "<rootDir>/jest.global-setup.e2e.js",
  globalTeardown: "<rootDir>/jest.global-teardown.e2e.js",

  // E2E-specific error handling
  verbose: true, // Detailed output for browser debugging
  silent: false,
  errorOnDeprecated: false,
  bail: 1, // Stop on first failure to save time

  // Memory monitoring for browser tests
  logHeapUsage: true,
  workerIdleMemoryLimit: "512MB", // Higher limit for browser overhead

  // E2E-specific reporters
  reporters: [
    "default",
    [
      "<rootDir>/__tests__/__infrastructure__/e2e-performance-reporter.cjs",
      {
        memoryTarget: "1GB",
        executionTarget: "300s",
        passRateTarget: "85%",
        browserTarget: "chrome",
        screenshotOnFailure: true,
      },
    ],
  ],

  // Module optimization for E2E
  moduleDirectories: [
    "node_modules",
    "<rootDir>/src",
    "<rootDir>/__tests__",
    "<rootDir>/__tests__/__utils__",
  ],
  moduleFileExtensions: ["js", "json"],

  // E2E result processing with screenshots
  testResultsProcessor:
    "<rootDir>/__tests__/__infrastructure__/e2e-result-processor.cjs",

  // Snapshot management for visual regression
  updateSnapshot: false,

  // Watch mode disabled for E2E
  watchman: false,
  watchPathIgnorePatterns: [
    "/node_modules/",
    "/coverage/",
    "/.jest-cache/",
    "/screenshots/",
    "/videos/",
  ],

  // Notification settings
  notify: false,
  notifyMode: "failure",

  // E2E test sequencing (critical for stateful browser tests)
  testSequencer: "<rootDir>/__tests__/__infrastructure__/e2e-test-sequencer.js",

  // Environment variables for E2E tests
  testRunner: "jest-circus/runner",

  // Retry configuration for flaky browser tests
  retry: {
    retryTimes: 2,
    retryDelay: 5000, // 5 second delay between retries
  },

  // Timeout configurations
  slowTestThreshold: 30, // 30 seconds threshold for slow test warnings

  // Custom test environment for Playwright
  preset: undefined, // Use custom setup instead

  // Browser configuration
  globals: {
    BROWSER_NAME: "chromium",
    HEADLESS: true,
    VIEWPORT: { width: 1280, height: 720 },
    TIMEOUT: 60000,
    BASE_URL: "http://localhost:8090",
  },

  // Test data management
  testDataCleanup: true,
  snapshotSerializers: [
    "<rootDir>/__tests__/__utils__/screenshot-serializer.js",
  ],
};

export default config;
