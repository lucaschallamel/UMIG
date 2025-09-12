/** @type {import('jest').Config} */
const config = {
  displayName: "Unit Tests",
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost:3000",
    userAgent: "jest/test-environment"
  },
  testMatch: [
    "**/__tests__/unit/**/*.test.js",
    "**/__tests__/entities/**/*.test.js",
    "**/__tests__/components/**/*.test.js"
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.unit.js"],
  collectCoverage: true,
  coverageDirectory: "coverage/unit",
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1"
  },
  transform: {
    "^.+\\.js$": "babel-jest"
  },
  transformIgnorePatterns: [
    "node_modules/(?!((@faker-js/faker)|uuid)/)"
  ],
};

export default config;
