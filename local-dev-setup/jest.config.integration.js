/** @type {import('jest').Config} */
const config = {
  displayName: "Integration Tests",
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost:3000",
    userAgent: "jest/integration-test-environment",
  },
  testMatch: [
    "**/__tests__/integration/**/*.test.js",
    "**/__tests__/repositories/**/*.test.js",
    "**/__tests__/**/integration-*.test.js",
  ],
  testPathIgnorePatterns: ["status-dropdown-refactoring.integration.test.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.integration.js"],
  // Stability optimizations for TD-005 Phase 4
  detectLeaks: false, // Disabled experimental feature for stable execution
  maxWorkers: "50%", // Limit resource usage
  forceExit: true, // Force exit on completion
  detectOpenHandles: true, // Detect hanging processes
  collectCoverage: false,
  verbose: true,
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!((@faker-js/faker)|uuid)/)"],
};

export default config;
