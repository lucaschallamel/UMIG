/** @type {import('jest').Config} */
const config = {
  displayName: "Email Tests",
  testEnvironment: "node",
  testMatch: ["**/__tests__/email/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.email.js"],
  collectCoverage: false,
  verbose: true,
};

export default config;
