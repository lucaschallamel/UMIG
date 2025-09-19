/**
 * Safe JSDOM Mock to prevent library conflicts
 * Part of TD-005 Phase 1 Emergency Stabilization
 *
 * This mock provides a safe interface for JSDOM internals
 * that may cause conflicts during test execution.
 */

// Simple mock for JSDOM internal libraries that may cause issues
export default {
  // Mock any problematic JSDOM internals here
  safe: true,
  testEnvironment: "jsdom-safe-mock",
};

// Named exports for specific JSDOM lib functions if needed
export const safeMock = {
  initialized: true,
  type: "jsdom-safe",
};
