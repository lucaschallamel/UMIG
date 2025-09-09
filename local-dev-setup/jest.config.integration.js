/** @type {import('jest').Config} */
const config = {
  "displayName": "Integration Tests",
  "testEnvironment": "node",
  "testMatch": [
    "**/__tests__/integration/**/*.test.js",
    "**/__tests__/repositories/**/*.test.js"
  ],
  "testPathIgnorePatterns": [
    "status-dropdown-refactoring.integration.test.js"
  ],
  "setupFilesAfterEnv": [
    "<rootDir>/jest.setup.integration.js"
  ],
  "collectCoverage": false,
  "verbose": true
};

export default config;
