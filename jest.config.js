/** @type {import('jest').Config} */
const config = {
  verbose: true,
  // Set the root directory to the 'data-utils' sub-project
  rootDir: './local-dev-setup/data-utils',
  // Use the node environment for testing
  testEnvironment: 'node',
  // Automatically find test files in the __tests__ directory
  testMatch: [
    '**/__tests__/**/*.test.js?(x)',
  ],
};

module.exports = config;
