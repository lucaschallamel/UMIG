/**
 * UMIG Test Infrastructure Consolidation - Unit Test Configuration
 *
 * Optimized for fast, isolated unit testing with aggressive mocking.
 * Replaces 12 fragmented configurations with unified approach.
 *
 * Performance Targets:
 * - Memory usage: <256MB peak
 * - Execution time: <30 seconds
 * - Pass rate: >95%
 * - Parallelization: 50% workers
 *
 * @version 1.0.0
 * @author test-infrastructure-consolidation
 * @priority Critical (TD-005 Infrastructure Resolution)
 */

/** @type {import('jest').Config} */
const config = {
  displayName: "Unit Tests (Optimized)",
  testEnvironment: "jsdom",

  testEnvironmentOptions: {
    url: "http://localhost:3000",
    userAgent: "jest/unit-optimized",
    resources: "usable",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  },

  // Optimized performance settings
  testTimeout: 10000, // 10 seconds max per test
  maxWorkers: "50%", // Parallel execution for speed
  detectOpenHandles: true,
  detectLeaks: false, // Disabled for performance
  forceExit: true,

  // Focused test matching for unit tests only
  testMatch: [
    "**/__tests__/unit/**/*.test.js",
    "**/__tests__/components/**/*.test.js",
    "**/__tests__/entities/**/*.unit.test.js",
    "**/__tests__/services/**/*.unit.test.js",
  ],

  // Exclude integration and e2e tests
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/integration/",
    "/__tests__/e2e/",
    "/__tests__/uat/",
    ".integration.test.js",
    ".e2e.test.js",
  ],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.unit.optimized.js"],

  setupFiles: ["<rootDir>/__tests__/__setup__/unit-test-environment.js"],

  // Coverage optimized for unit tests
  collectCoverage: false, // Enable only when needed
  coverageDirectory: "coverage/unit-optimized",
  coverageReporters: ["text-summary", "lcov"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Critical: SecurityUtils and dependency resolution
  moduleNameMapper: {
    // Project aliases
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
    "^@entities/(.*)$": "<rootDir>/src/groovy/umig/web/js/entities/$1",

    // Database mocks
    "^../../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.unit.js",
    "^../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.unit.js",

    // CRITICAL: SecurityUtils integration fix
    "^SecurityUtils$": "<rootDir>/__tests__/__mocks__/SecurityUtils.unit.js",
    "^.*SecurityUtils.js$":
      "<rootDir>/__tests__/__mocks__/SecurityUtils.unit.js",

    // Stack overflow prevention
    "^tough-cookie$":
      "<rootDir>/__tests__/__mocks__/tough-cookie.lightweight.js",
    "^jsdom/lib/(.*)$": "<rootDir>/__tests__/__mocks__/jsdom-safe.js",

    // Performance optimizations
    "^uuid$": "<rootDir>/__tests__/__mocks__/uuid.lightweight.js",
    "^@faker-js/faker$": "<rootDir>/__tests__/__mocks__/faker.lightweight.js",
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
  transformIgnorePatterns: ["node_modules/(?!(@faker-js/faker|uuid)/)"],

  // Memory and performance optimization
  cacheDirectory: ".jest-cache-unit",
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  resetModules: false, // Keep for performance

  // Global lifecycle management
  globalSetup: "<rootDir>/jest.global-setup.optimized.js",
  globalTeardown: "<rootDir>/jest.global-teardown.optimized.js",

  // Optimized error handling
  verbose: false, // Reduce noise
  silent: false,
  errorOnDeprecated: false,
  bail: 0, // Continue on failures for complete validation

  // Memory monitoring - SECURITY FIX: Increase memory limit from 128MB to 256MB
  logHeapUsage: true,
  workerIdleMemoryLimit: "256MB",

  // Custom reporters for monitoring
  reporters: [
    "default",
    [
      "<rootDir>/__tests__/__infrastructure__/unit-performance-reporter.cjs",
      {
        memoryTarget: "256MB",
        executionTarget: "30s",
        passRateTarget: "95%",
      },
    ],
  ],

  // Module optimization
  moduleDirectories: ["node_modules", "<rootDir>/src", "<rootDir>/__tests__"],
  moduleFileExtensions: ["js", "json"],

  // Test result processing
  testResultsProcessor:
    "<rootDir>/__tests__/__infrastructure__/unit-result-processor.cjs",

  // Snapshot management
  updateSnapshot: false,

  // Watch mode optimization
  watchman: false,
  watchPathIgnorePatterns: ["/node_modules/", "/coverage/", "/.jest-cache/"],

  // Notification settings
  notify: false,
  notifyMode: "failure-change",
};

// SECURITY FIX: Change from export default to module.exports for CommonJS compatibility
module.exports = config;
