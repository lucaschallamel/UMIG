/**
 * UMIG Memory-Optimized Jest Configuration
 *
 * Ultra-lightweight configuration designed for memory-constrained environments.
 * Targets <512MB memory usage with <2000ms execution time.
 *
 * Optimizations:
 * - Single worker execution
 * - Minimal DOM features
 * - Disabled coverage collection
 * - Lightweight mocks
 * - Aggressive garbage collection
 *
 * @version 2.0.0 (Memory Optimization)
 * @author gendev-test-suite-generator
 * @priority High (Resource Management)
 */

/** @type {import('jest').Config} */
const config = {
  displayName: "Memory-Optimized Tests",
  testEnvironment: "jsdom",

  testEnvironmentOptions: {
    url: "http://localhost:3000",
    userAgent: "jest/memory-optimized",
    resources: "usable",
    runScripts: "outside-only", // Reduced script execution
    pretendToBeVisual: false,

    // Minimal DOM features for memory efficiency
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: false,
      SkipExternalResources: true,
    },
  },

  // Aggressive memory management
  testTimeout: 10000, // Shorter timeout
  maxWorkers: 1, // Single worker only
  forceExit: true,
  detectOpenHandles: true,
  detectLeaks: false,

  // Focused test selection for quick validation
  testMatch: [
    "**/__tests__/unit/components/BaseComponent.test.js",
    "**/__tests__/unit/components/SecurityUtils.test.js",
    "**/__tests__/unit/entities/teams/teams-accessibility.test.js",
    "**/__tests__/unit/entities/teams/teams-edge-cases.test.js",
    "**/__tests__/integration/auth/user-context.integration.test.js",
  ],

  // Lightweight setup
  setupFilesAfterEnv: ["<rootDir>/jest.setup.memory.js"],

  // No coverage collection for performance
  collectCoverage: false,

  // Minimal verbosity
  verbose: false,
  silent: false,

  // Enhanced module mapping with ultra-lightweight mocks
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
    "^../../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db-lite.js",
    "^../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db-lite.js",

    // Ultra-lightweight dependency mocks
    "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie-lite.js",
    "^jsdom/lib/(.*)$": "<rootDir>/__tests__/__mocks__/jsdom-lite.js",
    "^uuid$": "<rootDir>/__tests__/__mocks__/uuid-lite.js",
    "^@faker-js/faker$": "<rootDir>/__tests__/__mocks__/faker-lite.js",
    "^nodemailer$": "<rootDir>/__tests__/__mocks__/nodemailer-lite.js",
    "^pg$": "<rootDir>/__tests__/__mocks__/pg-lite.js",
  },

  // Optimized transformation
  transform: {
    "^.+\\.js$": [
      "babel-jest",
      {
        compact: true,
        minified: false,
        comments: false,
        presets: [
          [
            "@babel/preset-env",
            {
              targets: { node: "current" },
              modules: "commonjs",
              useBuiltIns: false, // Reduce polyfills
            },
          ],
        ],
      },
    ],
  },

  // Minimal transformation
  transformIgnorePatterns: [
    "node_modules/(?!(uuid)/)", // Only transform uuid
  ],

  // Memory-optimized global setup
  globalSetup: "<rootDir>/jest.global-setup.memory.js",
  globalTeardown: "<rootDir>/jest.global-teardown.memory.js",

  // Aggressive cache and memory settings
  cacheDirectory: ".jest-cache-memory",
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  resetModules: true, // Reset modules for memory cleanup

  // Memory-specific configurations
  workerIdleMemoryLimit: "128MB", // Very low limit
  logHeapUsage: true,

  // Error handling optimization
  errorOnDeprecated: false,
  bail: 3, // Stop after 3 failures to save resources

  // Performance settings
  slowTestThreshold: 2, // 2 seconds threshold

  // Custom reporter for memory monitoring
  reporters: [
    "default",
    [
      "<rootDir>/__tests__/__reporters__/memory-reporter.js",
      {
        memoryTarget: "512MB",
        executionTarget: "2000ms",
        heapMonitoring: true,
        gcForcing: true,
      },
    ],
  ],

  // Minimal module resolution
  moduleDirectories: ["node_modules"],
  moduleFileExtensions: ["js"],

  // Environment variables for memory optimization
  setupFiles: ["<rootDir>/__tests__/__setup__/memory-env.js"],

  // Notification settings
  notify: false,
  watchman: false,

  // Jest runner optimization
  runner: "jest-runner",
  testRunner: "jest-circus/runner",

  // Disable experimental features
  updateSnapshot: false,
};

export default config;
