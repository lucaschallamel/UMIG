/**
 * Jest Configuration for Component Testing
 * US-082-B Component Architecture Development
 *
 * Provides isolated testing environment for UI components with:
 * - Visual regression testing support
 * - Accessibility testing integration
 * - Performance monitoring
 * - Component interaction testing
 */

module.exports = {
  displayName: "Components",
  testEnvironment: "jsdom",
  testMatch: [
    "**/__tests__/**/components/**/*.test.js",
    "**/__tests__/**/components/**/*.spec.js",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.components.cjs"],
  collectCoverageFrom: [
    "src/groovy/umig/web/js/components/**/*.js",
    "!src/groovy/umig/web/js/components/**/*.test.js",
    "!src/groovy/umig/web/js/components/**/*.spec.js",
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  moduleNameMapper: {
    "^@components/(.*)$": "<rootDir>/../src/groovy/umig/web/js/components/$1",
    "^@services/(.*)$": "<rootDir>/../src/groovy/umig/web/js/services/$1",
    "^@utils/(.*)$": "<rootDir>/../src/groovy/umig/web/js/utils/$1",
  },
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  testTimeout: 10000,
  verbose: true,
  bail: false,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
