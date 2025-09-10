/**
 * Simple test to verify SecurityService can be loaded
 */

// Mock window and performance globals before requiring the module
global.window = global.window || {};
global.performance = global.performance || { now: () => Date.now() };

describe("SecurityService Module Loading", () => {
  it("should be able to require SecurityService module", () => {
    const securityModule = require("../../../../src/groovy/umig/web/js/services/SecurityService.js");

    expect(securityModule).toBeDefined();
    expect(securityModule.SecurityService).toBeDefined();
    expect(securityModule.RateLimitEntry).toBeDefined();
    expect(securityModule.SecurityEvent).toBeDefined();
    expect(securityModule.InputValidator).toBeDefined();
  });

  it("should be able to instantiate SecurityService", () => {
    const {
      SecurityService,
    } = require("../../../../src/groovy/umig/web/js/services/SecurityService.js");

    const service = new SecurityService();
    expect(service).toBeDefined();
    expect(service.name).toBe("SecurityService");
  });
});
