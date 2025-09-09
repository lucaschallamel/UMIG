/** @type {import('jest').Config} */
const config = {
  displayName: "Unit Tests",
  testEnvironment: "node",
  testMatch: ["**/__tests__/unit/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.unit.js"],
  collectCoverage: true,
  coverageDirectory: "coverage/unit",
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
};

export default config;
