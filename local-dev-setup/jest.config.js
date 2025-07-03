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
  transform: {
    '^.+\.js$': 'babel-jest',
  },
  // setupFiles: ["<rootDir>/jest.setup.js"],
  globalSetup: './jest.global-setup.cjs',
  globalTeardown: './jest.global-teardown.cjs',
};

export default config;