/** @type {import('jest').Config} */
const config = {
  verbose: true,
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js?(x)',
  ],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  moduleFileExtensions: ["js", "json"],
  clearMocks: true,
  resetMocks: true,
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  // setupFiles: ["<rootDir>/jest.setup.js"],
  globalSetup: './jest.global-setup.js',
  globalTeardown: './jest.global-teardown.js',
};

module.exports = config;