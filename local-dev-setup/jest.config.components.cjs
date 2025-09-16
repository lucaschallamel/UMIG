/**
 * Jest Configuration for Component Architecture Testing
 * Extends the base unit test configuration for component-specific testing
 *
 * @type {import('@jest/types').Config.InitialOptions}
 */

const baseUnitConfig = require("./jest.config.unit.js");

module.exports = {
  ...baseUnitConfig,
  displayName: "Component Tests",

  // Test file patterns
  testMatch: [
    "<rootDir>/__tests__/components/**/*.test.js",
    "<rootDir>/__tests__/unit/**/*component*.test.js",
    "<rootDir>/__tests__/unit/**/*Component*.test.js",
    "<rootDir>/__tests__/unit/**/*orchestrator*.test.js",
    "<rootDir>/__tests__/unit/**/*Orchestrator*.test.js",
  ],

  // Coverage specific to component files
  collectCoverageFrom: [
    "<rootDir>/../src/groovy/umig/web/js/components/**/*.js",
    "<rootDir>/../src/groovy/umig/web/js/security/**/*.js",
    "!<rootDir>/../src/groovy/umig/web/js/**/*.min.js",
  ],

  // Coverage thresholds for components
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./src/groovy/umig/web/js/components/ComponentOrchestrator.js": {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    "./src/groovy/umig/web/js/components/SecurityUtils.js": {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Additional setup for component testing
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.unit.js",
    "<rootDir>/jest.setup.components.js",
  ],
};
