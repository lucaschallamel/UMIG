// Unit Test Setup - No external dependencies
console.log("🧪 Setting up Unit Test environment...");

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
  }),
);

// Global test utilities for unit tests
global.testUtils = {
  createMockResponse: (data, status = 200) => ({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }),

  createMockRequest: (params = {}, body = {}) => ({
    params,
    body,
    headers: {},
    query: params,
  }),

  createMockDatabaseRow: (overrides = {}) => ({
    id: "test-uuid-123",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  mockConsole: () => {
    const originalConsole = global.console;
    global.console = {
      ...console,
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    return () => {
      global.console = originalConsole;
    };
  },
};

// Mock process.env for consistent testing
process.env = {
  ...process.env,
  NODE_ENV: "test",
  DB_HOST: "localhost",
  DB_PORT: "5432",
  DB_NAME: "umig_test",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
};

// Setup error handling for unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

console.log("✅ Unit test environment ready");
