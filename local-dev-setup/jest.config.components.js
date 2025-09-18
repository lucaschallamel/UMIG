/**
 * Jest Configuration for Component Architecture Testing
 * Extends the base unit test configuration for component-specific testing
 * TD-005 Phase 4: Component testing for US-087 Phase 2 Teams Migration
 *
 * @type {import('@jest/types').Config.InitialOptions}
 */

/** @type {import('jest').Config} */
const config = {
  displayName: "Component Tests",
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost:3000",
    userAgent: "jest/component-test-environment",
  },

  // TD-005 Phase 4: Stability optimizations
  detectLeaks: false, // Disabled experimental feature for stable execution
  maxWorkers: "50%", // Limit resource usage
  forceExit: true, // Force exit on completion
  detectOpenHandles: true, // Detect hanging processes
  testTimeout: 15000, // 15 seconds max per test

  // Test file patterns for component architecture
  testMatch: [
    "**/__tests__/components/**/*.test.js",
    "**/__tests__/unit/**/*component*.test.js",
    "**/__tests__/unit/**/*Component*.test.js",
    "**/__tests__/unit/**/*orchestrator*.test.js",
    "**/__tests__/unit/**/*Orchestrator*.test.js",
    "**/__tests__/entities/**/*.test.js",
  ],

  // Coverage specific to component files
  collectCoverage: true,
  coverageDirectory: "coverage/components",
  coverageReporters: ["text", "lcov", "html"],
  collectCoverageFrom: [
    "../src/groovy/umig/web/js/components/**/*.js",
    "../src/groovy/umig/web/js/entities/**/*.js",
    "../src/groovy/umig/web/js/security/**/*.js",
    "!../src/groovy/umig/web/js/**/*.min.js",
  ],

  // Coverage thresholds for components (US-087 Phase 2 standards)
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "../src/groovy/umig/web/js/components/ComponentOrchestrator.js": {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    "../src/groovy/umig/web/js/components/SecurityUtils.js": {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    "../src/groovy/umig/web/js/entities/*/BaseEntityManager.js": {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Enhanced module mapping for component testing
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
    "^@entities/(.*)$": "<rootDir>/src/groovy/umig/web/js/entities/$1",
    "^../../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.js",
    "^../scripts/lib/db.js$": "<rootDir>/__tests__/__mocks__/db.js",
    // TD-005 emergency fixes maintained
    "^tough-cookie$": "<rootDir>/__tests__/__mocks__/tough-cookie.js",
    "^jsdom/lib/(.*)$": "<rootDir>/__tests__/__mocks__/jsdom-safe.js",
  },

  // Additional setup for component testing
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.unit.js",
    "<rootDir>/jest.setup.components.js",
  ],

  transform: {
    "^.+\\.js$": "babel-jest",
  },

  // Component-specific transform patterns
  transformIgnorePatterns: [
    "node_modules/(?!(@faker-js/faker|uuid|tough-cookie)/)",
  ],

  // Global setup/teardown for component tests
  globalSetup: "<rootDir>/jest.global-setup.js",
  globalTeardown: "<rootDir>/jest.global-teardown.js",

  verbose: true,
};

export default config;
