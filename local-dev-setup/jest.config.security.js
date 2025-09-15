/** @type {import('jest').Config} */
const config = {
  displayName: "Security Tests",
  testEnvironment: "node", // Use node environment to avoid jsdom/tough-cookie stack overflow
  testEnvironmentOptions: {
    // Minimal environment options for security tests
  },
  testMatch: [
    "**/__tests__/entities/**/*.security.test.js",
    "**/__tests__/unit/**/*.security.test.js",
    "**/__tests__/unit/**/*.pentest.test.js",
    "**/__tests__/security/**/*.test.js",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.security.js"],
  collectCoverage: true,
  coverageDirectory: "coverage/security",
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
  testTimeout: 30000, // Extended timeout for security tests
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!((@faker-js/faker)|uuid)/)"],
  // Additional security test specific configurations
  globals: {
    __SECURITY_TEST_ENV__: true,
    __NODE_ENV__: "test",
  },
  // Module name mapping - consolidated to avoid duplicates
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/groovy/umig/web/js/components/$1",
    // Avoid loading browser-specific modules that cause tough-cookie conflicts
    "^jsdom$": "<rootDir>/jest.mocks.security.js",
    "^tough-cookie$": "<rootDir>/jest.mocks.security.js",
  },
};

export default config;
