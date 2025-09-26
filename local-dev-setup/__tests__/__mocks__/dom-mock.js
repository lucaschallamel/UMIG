/**
 * DOM Mock for Component Testing
 * Minimal mocks that work with jsdom environment
 */

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    status: 200,
    statusText: "OK",
  }),
);

// Mock XMLHttpRequest
global.XMLHttpRequest = jest.fn(() => ({
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  addEventListener: jest.fn(),
  readyState: 4,
  status: 200,
  responseText: "{}",
  response: {},
}));

// Don't mock Date globally to avoid test conflicts - let individual tests mock if needed
// Individual tests can mock Date when needed for specific scenarios

module.exports = {
  fetch: global.fetch,
  XMLHttpRequest: global.XMLHttpRequest,
};
