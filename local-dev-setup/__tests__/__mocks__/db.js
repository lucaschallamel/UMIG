/**
 * Mock database client for testing
 * Replaces the real database connection to avoid ES module issues
 */

export const client = {
  release: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
};

export default client;