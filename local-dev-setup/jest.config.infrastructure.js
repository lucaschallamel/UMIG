/**
 * Jest Configuration for Infrastructure Tests
 *
 * Focused on database connectivity, system health, and infrastructure validation.
 * Converted scripts from scripts/ directory and new infrastructure validation tests.
 */

export default {
  displayName: "Infrastructure Tests",
  testMatch: ["**/__tests__/infrastructure/**/*.test.js"],
  testEnvironment: "node",
  testTimeout: 30000, // Longer timeout for database/network operations
  coveragePathIgnorePatterns: [
    "node_modules/",
    "__tests__/fixtures/",
    "__tests__/mocks/",
    "coverage/",
  ],
  reporters: ["default"],
  transform: {
    "^.+\\.js$": "babel-jest",
  },
};
