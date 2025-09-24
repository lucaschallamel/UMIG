/**
 * UMIG Consolidated Jest Configuration
 *
 * This configuration replaces 8 separate Jest configs with a single multi-project setup.
 * Uses Jest's projects feature to run different test types with appropriate environments.
 *
 * Key Features:
 * - 4 project configurations instead of 8 separate files
 * - Shared setup files with proper SecurityUtils integration
 * - Memory-optimized execution with proper resource management
 * - Enhanced error handling and stack overflow prevention
 * - Backward compatibility with existing test structure
 *
 * @version 2.0.0 (Test Infrastructure Consolidation)
 * @author gendev-test-suite-generator
 * @priority Critical (Infrastructure Optimization)
 */

/** @type {import('jest').Config} */
const config = {
  displayName: "UMIG Test Suite (Consolidated)",

  // Multi-project configuration - replaces 8 separate configs
  projects: [
    // Unit Tests Project
    {
      displayName: "Unit Tests",
      testEnvironment: "jsdom",
      testEnvironmentOptions: {
        url: "http://localhost:3000",
        userAgent: "jest/unit-tests",
        resources: "usable",
        runScripts: "dangerously",
        pretendToBeVisual: false,
      },

      // Optimized timeouts and workers
      testTimeout: 15000,
      maxWorkers: "50%",
      forceExit: true,
      detectOpenHandles: true,
      detectLeaks: false, // Disabled for performance

      testMatch: [
        "**/__tests__/unit/**/*.test.js",
        "**/__tests__/entities/**/*.test.js",
        "**/__tests__/components/**/*.test.js",
        "**/__tests__/repositories/**/*.test.js",
      ],

      setupFilesAfterEnv: ["<rootDir>/jest.setup.consolidated.js"],

      collectCoverage: true,
      coverageDirectory: "coverage/unit",
      coverageReporters: ["text", "lcov", "html"],
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },

      // Enhanced module mapping with stack overflow fixes
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
        "^../../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.js",
        "^../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.js",

        // Critical fixes for stack overflow issues
        "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie-safe.js",
        "^jsdom/lib/(.*)$": "<rootDir>/__tests__/__mocks__/jsdom-safe.js",
        "^uuid$": "<rootDir>/__tests__/__mocks__/uuid-safe.js",
        "^@faker-js/faker$": "<rootDir>/__tests__/__mocks__/faker-safe.js",
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
                { targets: { node: "current" }, modules: "commonjs" },
              ],
            ],
          },
        ],
      },

      transformIgnorePatterns: ["node_modules/(?!(@faker-js/faker|uuid)/)"],

      // Global setup/teardown for process control
      globalSetup: "<rootDir>/jest.global-setup.consolidated.js",
      globalTeardown: "<rootDir>/jest.global-teardown.consolidated.js",

      // Memory optimization
      cacheDirectory: ".jest-cache-unit",
      clearMocks: true,
      resetMocks: true,
      restoreMocks: true,
      resetModules: false,

      // Performance monitoring
      logHeapUsage: true,
      workerIdleMemoryLimit: "256MB",

      verbose: true,
    },

    // Integration Tests Project
    {
      displayName: "Integration Tests",
      testEnvironment: "node", // Node environment for API/database tests

      testTimeout: 30000, // Longer timeout for integration tests
      maxWorkers: 2, // Limited workers for database connections
      forceExit: true,
      detectOpenHandles: true,
      detectLeaks: false,

      testMatch: [
        "**/__tests__/integration/**/*.test.js",
        "**/__tests__/api/**/*.test.js",
        "**/__tests__/email/**/*.test.js",
      ],

      setupFilesAfterEnv: [
        "<rootDir>/jest.setup.consolidated.js",
        "<rootDir>/jest.setup.integration.js",
      ],

      collectCoverage: false, // Disabled for integration tests performance

      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
        "^../../scripts/lib/db.js$": "<rootDir>/scripts/lib/db.js", // Real DB for integration
        "^../scripts/lib/db.js$": "<rootDir>/scripts/lib/db.js",

        // Safe mocks for problematic dependencies
        "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie-safe.js",
      },

      transform: {
        "^.+\\.js$": "babel-jest",
      },

      globalSetup: "<rootDir>/jest.global-setup.consolidated.js",
      globalTeardown: "<rootDir>/jest.global-teardown.consolidated.js",

      // Integration-specific settings
      cacheDirectory: ".jest-cache-integration",
      clearMocks: true,
      resetMocks: false, // Keep mocks between integration tests

      verbose: true,
    },

    // E2E Tests Project (Playwright)
    {
      displayName: "E2E Tests",
      runner: "@playwright/test/junit-reporter", // Custom runner for Playwright
      testEnvironment: "node",

      testTimeout: 60000, // Extended timeout for E2E tests
      maxWorkers: 1, // Single worker for E2E stability
      forceExit: true,
      detectOpenHandles: false, // Playwright manages its own processes

      testMatch: [
        "**/__tests__/e2e/**/*.test.js",
        "**/__tests__/uat/**/*.test.js",
      ],

      setupFilesAfterEnv: ["<rootDir>/jest.setup.e2e.js"],

      collectCoverage: false, // No coverage for E2E tests

      // Minimal module mapping for E2E
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },

      globalSetup: "<rootDir>/jest.global-setup.e2e.js",
      globalTeardown: "<rootDir>/jest.global-teardown.e2e.js",

      cacheDirectory: ".jest-cache-e2e",
      verbose: false, // Reduced verbosity for E2E
    },

    // Security Tests Project
    {
      displayName: "Security Tests",
      testEnvironment: "jsdom",
      testEnvironmentOptions: {
        url: "http://localhost:3000",
        userAgent: "jest/security-tests",
        resources: "usable",
        runScripts: "dangerously",
      },

      testTimeout: 30000, // Extended timeout for security tests
      maxWorkers: 1, // Single worker for security test isolation
      forceExit: true,
      detectOpenHandles: true,

      testMatch: [
        "**/__tests__/security/**/*.test.js",
        "**/__tests__/**/*.security.test.js",
        "**/__tests__/**/*.pentest.test.js",
      ],

      setupFilesAfterEnv: [
        "<rootDir>/jest.setup.consolidated.js",
        "<rootDir>/jest.setup.security.js",
      ],

      collectCoverage: true,
      coverageDirectory: "coverage/security",
      coverageReporters: ["text", "lcov"],
      coverageThreshold: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },

      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
        "^../../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.js",
        "^../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.js",

        // Enhanced security for mocks
        "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie-safe.js",
        "^jsdom/lib/(.*)$": "<rootDir>/__tests__/__mocks__/jsdom-safe.js",
      },

      transform: {
        "^.+\\.js$": "babel-jest",
      },

      globalSetup: "<rootDir>/jest.global-setup.consolidated.js",
      globalTeardown: "<rootDir>/jest.global-teardown.consolidated.js",

      cacheDirectory: ".jest-cache-security",
      clearMocks: true,
      resetMocks: true,

      verbose: true,
    },
  ],

  // Global settings for all projects
  watchman: false, // Disabled for stability
  notify: false,
  notifyMode: "failure",

  // Global reporters
  reporters: [
    "default",
    [
      "<rootDir>/__tests__/__reporters__/consolidated-reporter.js",
      {
        outputFile: "test-results/consolidated-results.json",
        memoryMonitoring: true,
        performanceTracking: true,
      },
    ],
  ],

  // Global module directories
  moduleDirectories: ["node_modules", "<rootDir>/src", "<rootDir>/__tests__"],

  // Global file extensions
  moduleFileExtensions: ["js", "json"],
};

export default config;
