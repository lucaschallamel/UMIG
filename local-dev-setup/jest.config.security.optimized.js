/**
 * UMIG Test Infrastructure Consolidation - Security Test Configuration
 *
 * Optimized for security testing, penetration testing, and vulnerability scanning.
 * Isolated execution with enhanced logging for security audit trails.
 *
 * Performance Targets:
 * - Memory usage: <512MB peak
 * - Execution time: <3 minutes
 * - Pass rate: >95% (security is critical)
 * - Parallelization: Limited (security context isolation)
 *
 * @version 1.0.0
 * @author test-infrastructure-consolidation
 * @priority Critical (Security & Compliance)
 */

/** @type {import('jest').Config} */
const config = {
  displayName: "Security Tests (Optimized)",
  testEnvironment: "jsdom", // Security testing in DOM context

  testEnvironmentOptions: {
    url: "http://localhost:3000",
    userAgent: "jest/security-scanner",
    resources: "usable",
    runScripts: "dangerously", // Required for security testing
    pretendToBeVisual: true,
  },

  // Security-specific performance settings
  testTimeout: 45000, // 45 seconds for complex security tests
  maxWorkers: "25%", // Limited parallelism for security isolation
  detectOpenHandles: true,
  detectLeaks: true, // Enable leak detection for security tests
  forceExit: true,

  // Security test matching
  testMatch: [
    "**/__tests__/security/**/*.test.js",
    "**/__tests__/penetration/**/*.test.js",
    "**/__tests__/vulnerability/**/*.test.js",
    "**/__tests__/compliance/**/*.test.js",
    "**/__tests__/**/*.security.test.js",
    "**/__tests__/**/*.pentest.test.js",
  ],

  // Exclude non-security tests
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/unit/",
    "/__tests__/integration/",
    "/__tests__/e2e/",
    ".unit.test.js",
    ".integration.test.js",
    ".e2e.test.js",
  ],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.security.optimized.js"],

  setupFiles: [
    "<rootDir>/__tests__/__setup__/security-test-environment.js",
    "<rootDir>/__tests__/__setup__/security-context-isolation.js",
  ],

  // Enhanced coverage for security validation
  collectCoverage: true,
  coverageDirectory: "coverage/security-optimized",
  coverageReporters: ["text", "lcov", "json", "cobertura"],
  coverageThreshold: {
    global: {
      branches: 95, // High coverage for security paths
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },

  // Security-specific module resolution
  moduleNameMapper: {
    // Project aliases
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
    "^@entities/(.*)$": "<rootDir>/src/groovy/umig/web/js/entities/$1",
    "^@security/(.*)$": "<rootDir>/__tests__/__utils__/security/$1",

    // CRITICAL: Real SecurityUtils for security testing
    "^SecurityUtils$":
      "<rootDir>/src/groovy/umig/web/js/components/SecurityUtils.js",
    "^.*SecurityUtils.js$":
      "<rootDir>/src/groovy/umig/web/js/components/SecurityUtils.js",

    // Security test utilities
    "^@pentest/(.*)$": "<rootDir>/__tests__/__utils__/penetration-testing/$1",
    "^@compliance/(.*)$": "<rootDir>/__tests__/__utils__/compliance/$1",

    // Controlled mocks for security testing
    "^../../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.security.js",
    "^../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.security.js",

    // Security-hardened dependency mocks
    "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie.security.js",
    "^jsdom/lib/(.*)$": "<rootDir>/__tests__/__mocks__/jsdom-security.js",
  },

  transform: {
    "^.+\\.js$": [
      "babel-jest",
      {
        compact: false, // Keep readable for security analysis
        comments: true, // Preserve comments for security context
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

  // Minimal transformations for security testing
  transformIgnorePatterns: [
    "node_modules/(?!(@faker-js/faker|uuid|security-testing-utils)/)",
  ],

  // Security-specific optimization
  cacheDirectory: ".jest-cache-security",
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  resetModules: true, // Clean state for security isolation

  // Security-specific lifecycle management
  globalSetup: "<rootDir>/jest.global-setup.security.js",
  globalTeardown: "<rootDir>/jest.global-teardown.security.js",

  // Security-specific error handling
  verbose: true, // Detailed output for security analysis
  silent: false,
  errorOnDeprecated: true, // Strict for security compliance
  bail: 0, // Continue all security tests for complete assessment

  // Memory monitoring for security tests
  logHeapUsage: true,
  workerIdleMemoryLimit: "256MB",

  // Security-specific reporters with audit trail
  reporters: [
    "default",
    [
      "<rootDir>/__tests__/__infrastructure__/security-audit-reporter.cjs",
      {
        memoryTarget: "512MB",
        executionTarget: "180s",
        passRateTarget: "95%",
        auditTrail: true,
        securityLevel: "enterprise",
        complianceFrameworks: ["OWASP", "GDPR", "SOX"],
      },
    ],
    [
      "<rootDir>/__tests__/__infrastructure__/security-vulnerability-reporter.cjs",
      {
        outputFile: "security-scan-results.json",
        severityLevels: ["critical", "high", "medium", "low"],
        includeRemediation: true,
      },
    ],
  ],

  // Module optimization for security
  moduleDirectories: [
    "node_modules",
    "<rootDir>/src",
    "<rootDir>/__tests__",
    "<rootDir>/__tests__/__utils__/security",
  ],
  moduleFileExtensions: ["js", "json"],

  // Security result processing with detailed audit
  testResultsProcessor:
    "<rootDir>/__tests__/__infrastructure__/security-result-processor.cjs",

  // Snapshot management for security baselines
  updateSnapshot: false,
  snapshotResolver:
    "<rootDir>/__tests__/__infrastructure__/security-snapshot-resolver.js",

  // Watch mode disabled for security tests
  watchman: false,
  watchPathIgnorePatterns: [
    "/node_modules/",
    "/coverage/",
    "/.jest-cache/",
    "/security-reports/",
  ],

  // Notification settings for security alerts
  notify: true,
  notifyMode: "always",

  // Security test sequencing for attack simulation
  testSequencer:
    "<rootDir>/__tests__/__infrastructure__/security-test-sequencer.js",

  // Environment variables for security testing
  testRunner: "jest-circus/runner",

  // No retries for security tests (must pass on first try)
  retry: {
    retryTimes: 0,
  },

  // Security-specific timeouts
  slowTestThreshold: 20, // 20 seconds threshold for security test warnings

  // Custom matchers for security assertions
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.security.optimized.js",
    "<rootDir>/__tests__/__utils__/security/security-matchers.js",
  ],

  // Security test globals
  globals: {
    SECURITY_TESTING: true,
    AUDIT_TRAIL: true,
    COMPLIANCE_MODE: "strict",
    PENETRATION_TESTING: true,
    VULNERABILITY_SCANNING: true,
    SECURITY_LEVEL: "enterprise",
  },

  // Test data encryption for security tests
  testDataSecurity: {
    encryptSensitiveData: true,
    sanitizeOutputs: true,
    auditDataAccess: true,
  },

  // Security-specific serializers
  snapshotSerializers: [
    "<rootDir>/__tests__/__utils__/security/security-data-serializer.js",
  ],

  // Custom test environment extensions
  testEnvironmentExtensions: [
    "<rootDir>/__tests__/__utils__/security/security-environment-extensions.js",
  ],
};

export default config;
