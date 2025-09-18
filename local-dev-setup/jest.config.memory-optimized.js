/**
 * TD-005 Phase 2: Memory-Optimized Jest Configuration
 *
 * This configuration provides memory-optimized testing for TD-005 Phase 2
 * infrastructure restoration. Maintains Phase 1 success criteria while
 * optimizing for memory usage <512MB and execution time <2000ms.
 *
 * PERFORMANCE TARGETS:
 * - Memory usage: <512MB peak (Phase 1 SUCCESS maintained)
 * - Execution time: <2000ms for unit tests
 * - Zero hanging tests (Phase 1 SUCCESS maintained)
 * - 100% test pass rate (MAINTAIN)
 *
 * @version 2.0 (TD-005 Phase 2)
 * @author gendev-test-suite-generator
 * @priority High (Infrastructure Restoration)
 */

/** @type {import('jest').Config} */
const config = {
  displayName: "Memory-Optimized Tests (TD-005 Phase 2)",
  testEnvironment: "jsdom",

  testEnvironmentOptions: {
    url: "http://localhost:3000",
    userAgent: "jest/memory-optimized",
    // Reduced DOM features for memory optimization
    resources: "usable",
    runScripts: "dangerously",
    pretendToBeVisual: false,
  },

  // PHASE 1 SUCCESS CRITERIA MAINTAINED
  testTimeout: 15000, // Keep Phase 1 emergency timeout
  maxWorkers: 1, // CRITICAL: Single worker to prevent memory accumulation
  forceExit: true, // Force exit to prevent hanging (Phase 1 SUCCESS)
  detectOpenHandles: true, // Detect hanging processes (Phase 1 SUCCESS)
  detectLeaks: false, // Disabled for performance - handled by custom cleanup

  // Memory-optimized test matching
  testMatch: [
    "**/__tests__/unit/teams/teams-accessibility.test.js",
    "**/__tests__/unit/teams/teams-edge-cases.test.js",
    "**/__tests__/unit/teams/teams-performance.test.js",
    "**/__tests__/unit/components/**/*.test.js",
    "**/__tests__/unit/entities/**/*.test.js",
  ],

  // Enhanced setup for memory management
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.memory-optimized.js",
    "<rootDir>/__tests__/__fixes__/memory-leak-resolution.js",
  ],

  // Minimal coverage for performance
  collectCoverage: false, // Disabled during infrastructure restoration
  coverageDirectory: "coverage/memory-optimized",

  // Reduced verbosity for memory optimization
  verbose: false,
  silent: false, // Keep error reporting active

  // CRITICAL: Enhanced module mapping with Phase 1 emergency fixes
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
    "^../../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.js",
    "^../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.js",

    // PHASE 1 EMERGENCY FIXES MAINTAINED
    "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie.js",
    "^jsdom/lib/(.*)$": "<rootDir>/__tests__/__mocks__/jsdom-safe.js",

    // Additional memory optimization mappings
    "^uuid$": "<rootDir>/__tests__/__mocks__/uuid-lite.js",
    "^@faker-js/faker$": "<rootDir>/__tests__/__mocks__/faker-lite.js",
  },

  // Optimized transformation
  transform: {
    "^.+\\.js$": [
      "babel-jest",
      {
        // Memory-optimized Babel configuration
        compact: true,
        minified: false, // Keep readable for debugging
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

  // CRITICAL: Prevent infinite recursion (Phase 1 fix maintained)
  transformIgnorePatterns: ["node_modules/(?!(@faker-js/faker|uuid)/)"],

  // PHASE 1 EMERGENCY CONTROLS MAINTAINED
  globalSetup: "<rootDir>/jest.global-setup.js",
  globalTeardown: "<rootDir>/jest.global-teardown.js",

  // Memory optimization settings
  cacheDirectory: ".jest-cache-memory",
  clearMocks: true,
  resetMocks: true, // Reset mocks between tests for memory cleanup
  restoreMocks: true, // Restore original implementations

  // Module management for memory optimization
  resetModules: false, // Keep modules loaded for performance

  // Error handling optimization
  errorOnDeprecated: false, // Reduce noise during infrastructure restoration
  bail: 0, // Continue running tests even if some fail (for comprehensive validation)

  // Test runner optimization
  runner: "jest-runner",
  testRunner: "jest-circus/runner",

  // Snapshot optimization
  updateSnapshot: false, // Prevent snapshot updates during infrastructure work

  // Watch mode optimization (disabled for CI/automation)
  watchman: false,

  // Notification settings
  notify: false,
  notifyMode: "failure",

  // Performance monitoring
  logHeapUsage: true, // Monitor heap usage for TD-005 compliance

  // Custom test result processor for memory monitoring
  testResultsProcessor:
    "<rootDir>/__tests__/__fixes__/memory-test-processor.cjs",

  // Environment variables for memory optimization
  setupFiles: ["<rootDir>/__tests__/__setup__/memory-optimization-env.js"],

  // Module directories optimization
  moduleDirectories: ["node_modules", "<rootDir>/src", "<rootDir>/__tests__"],

  // Extensions optimization
  moduleFileExtensions: ["js", "json"],

  // Resolver optimization
  resolver: undefined, // Use default resolver for simplicity

  // Timeouts for specific operations
  slowTestThreshold: 5, // 5 seconds threshold for slow test warnings

  // Memory-specific configurations
  workerIdleMemoryLimit: "256MB", // Force worker restart at 256MB

  // Custom reporter for TD-005 tracking
  reporters: [
    "default",
    [
      "<rootDir>/__tests__/__fixes__/td-005-custom-reporter.cjs",
      {
        tdTask: "TD-005",
        phase: "Phase 2",
        memoryTarget: "512MB",
        executionTarget: "2000ms",
        emergencyFixes: true,
      },
    ],
  ],
};

export default config;
