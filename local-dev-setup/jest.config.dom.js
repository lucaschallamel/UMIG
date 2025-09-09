/** @type {import('jest').Config} */
const config = {
  "displayName": "DOM Tests",
  "testEnvironment": "jsdom",
  "testMatch": [
    "**/__tests__/**/dom-*.test.js"
  ],
  "setupFilesAfterEnv": [
    "<rootDir>/jest.setup.dom.js"
  ],
  "collectCoverage": false,
  "verbose": true
};

export default config;
