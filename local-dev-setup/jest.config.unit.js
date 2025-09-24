/** @type {import('jest').Config} */
const config = {
  displayName: "Unit Tests",
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost:3000",
    userAgent: "jest/test-environment",
  },
  // CRITICAL: Add timeout and process controls (TD-005 Phase 1)
  testTimeout: 15000, // 15 seconds max per test
  maxWorkers: "50%", // Limit resource usage
  forceExit: true, // Force exit on completion
  detectOpenHandles: true, // Detect hanging processes
  detectLeaks: false, // Disabled experimental feature for stable execution (TD-005 Phase 4)

  testMatch: [
    "**/__tests__/unit/**/*.test.js",
    "**/__tests__/entities/**/*.test.js",
    "**/__tests__/components/**/*.test.js",
    "**/__tests__/infrastructure/**/*.test.js",
    "**/__tests__/repositories/**/*.test.js",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.unit.js"],
  collectCoverage: true,
  coverageDirectory: "coverage/unit",
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,

  // CRITICAL: Enhanced module mapping with dependency isolation
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
    "^../../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.js",
    "^../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.js",
    // CRITICAL: Use SecurityUtils unified wrapper for TD-012 CommonJS/ES6 compatibility fix
    "^../src/groovy/umig/web/js/components/SecurityUtils$":
      "<rootDir>/__tests__/__mocks__/SecurityUtils.wrapper.js",
    "^../src/groovy/umig/web/js/components/SecurityUtils.js$":
      "<rootDir>/__tests__/__mocks__/SecurityUtils.wrapper.js",
    // Direct SecurityUtils path mapping for absolute imports
    "^.*/SecurityUtils$":
      "<rootDir>/__tests__/__mocks__/SecurityUtils.wrapper.js",
    "^.*/SecurityUtils.js$":
      "<rootDir>/__tests__/__mocks__/SecurityUtils.wrapper.js",
    // EMERGENCY: Isolate problematic dependencies
    "^tough-cookie$":
      "<rootDir>/__tests__/__mocks__/tough-cookie.lightweight.js",
    "^jsdom/lib/(.*)$": "<rootDir>/__tests__/__mocks__/jsdom-safe.js",
  },

  transform: {
    "^.+\\.js$": "babel-jest",
  },

  // CRITICAL: Prevent infinite recursion in dependencies
  transformIgnorePatterns: [
    "node_modules/(?!(@faker-js/faker|uuid|tough-cookie)/)",
  ],

  // EMERGENCY: Add global setup/teardown for process control
  globalSetup: "<rootDir>/jest.global-setup.js",
  globalTeardown: "<rootDir>/jest.global-teardown.js",
};

export default config;
