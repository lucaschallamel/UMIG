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
  collectCoverage: false,
  verbose: true,
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!((@faker-js/faker)|uuid)/)"],
};

export default config;
