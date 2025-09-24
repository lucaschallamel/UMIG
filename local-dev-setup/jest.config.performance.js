/**
 * UMIG Performance Testing Jest Configuration
 *
 * Specialized configuration for performance and load testing scenarios.
 * Designed for testing component performance, memory usage, and execution timing.
 *
 * Features:
 * - Extended timeouts for performance tests
 * - Performance monitoring and metrics collection
 * - Load testing scenarios
 * - Memory usage tracking
 * - Execution time profiling
 *
 * @version 2.0.0 (Performance Testing)
 * @author gendev-test-suite-generator
 * @priority High (Performance Validation)
 */

/** @type {import('jest').Config} */
const config = {
  displayName: "Performance Tests",
  testEnvironment: "jsdom",

  testEnvironmentOptions: {
    url: "http://localhost:3000",
    userAgent: "jest/performance-tests",
    resources: "usable",
    runScripts: "dangerously",
    pretendToBeVisual: true, // Enable for realistic performance testing

    // Enhanced DOM features for performance testing
    features: {
      FetchExternalResources: true,
      ProcessExternalResources: true,
      SkipExternalResources: false,
    },
  },

  // Extended timeouts for performance testing
  testTimeout: 60000, // 1 minute for performance tests
  maxWorkers: 2, // Limited workers for accurate performance measurement
  forceExit: true,
  detectOpenHandles: true,
  detectLeaks: true, // Enable for performance testing

  // Performance-focused test selection
  testMatch: [
    "**/__tests__/performance/**/*.test.js",
    "**/__tests__/**/*.performance.test.js",
    "**/__tests__/**/*.load.test.js",
    "**/__tests__/**/*.stress.test.js",
    "**/__tests__/unit/teams/teams-performance.test.js",
  ],

  // Performance-specific setup
  setupFilesAfterEnv: ["<rootDir>/jest.setup.performance.js"],

  // Performance coverage collection
  collectCoverage: true,
  coverageDirectory: "coverage/performance",
  coverageReporters: ["text", "lcov", "json-summary"],
  coverageThreshold: {
    global: {
      branches: 70, // Lower threshold for performance tests
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Standard module mapping for realistic performance testing
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
    "^../../scripts/lib/db.js$":
      "<rootDir>/__tests__/__mocks__/db-performance.js",
    "^../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db-performance.js",

    // Performance-realistic mocks (not ultra-lightweight)
    "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie-safe.js",
    "^jsdom/lib/(.*)$": "<rootDir>/__tests__/__mocks__/jsdom-safe.js",
    "^uuid$": "uuid", // Use real uuid for performance testing
    "^@faker-js/faker$": "@faker-js/faker", // Use real faker for data generation
  },

  // Standard transformation for realistic testing
  transform: {
    "^.+\\.js$": [
      "babel-jest",
      {
        compact: false, // Keep readable for performance debugging
        comments: true,
        presets: [
          [
            "@babel/preset-env",
            {
              targets: { node: "current" },
              modules: "commonjs",
              useBuiltIns: "usage",
              corejs: 3,
            },
          ],
        ],
        // Add performance monitoring plugins
        plugins: [
          // Custom plugin for performance tracking
        ],
      },
    ],
  },

  transformIgnorePatterns: [
    "node_modules/(?!(@faker-js/faker|uuid|tough-cookie)/)",
  ],

  // Performance-optimized global setup
  globalSetup: "<rootDir>/jest.global-setup.performance.js",
  globalTeardown: "<rootDir>/jest.global-teardown.performance.js",

  // Performance monitoring settings
  cacheDirectory: ".jest-cache-performance",
  clearMocks: false, // Keep mocks for realistic testing
  resetMocks: false,
  restoreMocks: false,
  resetModules: false,

  // Performance-specific configurations
  logHeapUsage: true,
  workerIdleMemoryLimit: "1GB", // Higher limit for performance testing

  // Error handling for performance tests
  errorOnDeprecated: false,
  bail: 0, // Continue all performance tests

  // Performance thresholds
  slowTestThreshold: 10, // 10 seconds threshold for performance tests

  // Verbose output for performance analysis
  verbose: true,

  // Performance-focused reporters
  reporters: [
    "default",
    [
      "<rootDir>/__tests__/__reporters__/performance-reporter.js",
      {
        outputFile: "test-results/performance-results.json",
        performanceThresholds: {
          componentRender: 100, // ms
          apiResponse: 500, // ms
          memoryUsage: "256MB",
          cpuUsage: 80, // percentage
        },
        benchmarkComparison: true,
        trendAnalysis: true,
      },
    ],
    // Add Jest performance timeline reporter
    [
      "jest-html-reporter",
      {
        pageTitle: "UMIG Performance Test Results",
        outputPath: "test-results/performance-report.html",
        includeFailureMsg: true,
        includeSuiteFailure: true,
        theme: "darkTheme",
      },
    ],
  ],

  // Module resolution for performance testing
  moduleDirectories: ["node_modules", "<rootDir>/src", "<rootDir>/__tests__"],
  moduleFileExtensions: ["js", "json"],

  // Environment variables for performance testing
  setupFiles: [
    "<rootDir>/__tests__/__setup__/performance-env.js",
    "<rootDir>/__tests__/__setup__/performance-monitoring.js",
  ],

  // Performance testing specific settings
  notify: false,
  watchman: false,

  // Jest runner for performance testing
  runner: "jest-runner",
  testRunner: "jest-circus/runner",

  // Snapshot settings
  updateSnapshot: false,

  // Custom test sequencer for performance tests
  testSequencer: "<rootDir>/__tests__/__sequencers__/performance-sequencer.js",

  // Performance test result processor
  testResultsProcessor:
    "<rootDir>/__tests__/__processors__/performance-processor.js",

  // Global variables for performance testing
  globals: {
    PERFORMANCE_TESTING: true,
    BENCHMARK_MODE: true,
    MEMORY_PROFILING: true,
  },
};

export default config;
