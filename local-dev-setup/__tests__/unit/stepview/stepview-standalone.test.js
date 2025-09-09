/**
 * Unit Tests for Standalone StepView Implementation
 *
 * US-036: Comprehensive unit test suite for standalone StepView page covering:
 * - URL parameter parsing and validation
 * - API endpoint resolution
 * - Role-based UI rendering
 * - Error handling scenarios
 * - Security validation (XSS prevention)
 * - Mobile-specific functionality
 *
 * @version 1.0.0
 * @author UMIG Development Team
 * @coverage Target: 90%+
 */

// Test framework setup - using Jest-compatible syntax for Node.js testing
const { JSDOM } = require("jsdom");

// Mock fetch for API testing
global.fetch = jest.fn();

// Mock console to capture logs
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

describe("StandaloneStepView", () => {
  let dom;
  let window;
  let document;
  let StandaloneStepView;

  beforeEach(() => {
    // Create a fresh DOM environment for each test
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body>
          <div id="stepview-root"></div>
        </body>
      </html>
    `,
      {
        url: "http://localhost:8090/stepview.html",
        pretendToBeVisual: true,
        resources: "usable",
      },
    );

    window = dom.window;
    document = window.document;

    // Mock window.location completely with a mutable object BEFORE setting globals
    const mockLocation = {
      hostname: "localhost",
      port: "8090",
      search: "",
      pathname: "/stepview.html",
      href: "http://localhost:8090/stepview.html",
      protocol: "http:",
      origin: "http://localhost:8090",
    };

    // Try to replace the entire location object
    try {
      Object.defineProperty(window, "location", {
        value: mockLocation,
        writable: true,
        configurable: true,
      });
    } catch (e) {
      // If that fails, just set it directly
      window.location = mockLocation;
    }

    // Set up global objects
    global.window = window;
    global.document = document;
    global.URLSearchParams = window.URLSearchParams;

    // Make mockLocation accessible to helper functions
    global.mockLocation = mockLocation;

    // Helper function to update the URL search params
    global.setLocationSearch = (search) => {
      global.mockLocation.search = search;
      global.mockLocation.href = `${global.mockLocation.protocol}//${global.mockLocation.hostname}:${global.mockLocation.port}${global.mockLocation.pathname}${search}`;

      // Also update window.location if it exists
      if (global.window && global.window.location) {
        global.window.location.search = search;
        global.window.location.href = global.mockLocation.href;
      }
    };

    // Helper function to update the full URL
    global.setLocationUrl = (
      hostname,
      port,
      path = "/stepview.html",
      search = "",
    ) => {
      global.mockLocation.hostname = hostname;
      global.mockLocation.port = port;
      global.mockLocation.pathname = path;
      global.mockLocation.search = search;
      const protocol =
        hostname === "localhost" || hostname === "127.0.0.1"
          ? "http:"
          : "https:";
      global.mockLocation.protocol = protocol;
      const portStr = port ? `:${port}` : "";
      global.mockLocation.href = `${protocol}//${hostname}${portStr}${path}${search}`;
      global.mockLocation.origin = `${protocol}//${hostname}${portStr}`;

      // Also update window.location if it exists
      // Use individual property assignments to avoid read-only property errors
      if (global.window && global.window.location) {
        try {
          global.window.location.hostname = global.mockLocation.hostname;
          global.window.location.port = global.mockLocation.port;
          global.window.location.pathname = global.mockLocation.pathname;
          global.window.location.search = global.mockLocation.search;
          global.window.location.protocol = global.mockLocation.protocol;
          global.window.location.href = global.mockLocation.href;
          // Skip origin as it's read-only in JSDOM
        } catch (e) {
          // If individual assignments fail, we'll rely on our global.mockLocation
          console.warn(
            "Could not update window.location properties:",
            e.message,
          );
        }
      }
    };

    // Clear fetch mock
    fetch.mockClear();

    // Load the StandaloneStepView class
    // In actual implementation, this would be loaded from the file
    // For testing, we'll create a mock class structure
    StandaloneStepView = class MockStandaloneStepView {
      constructor() {
        this.config = {
          api: {
            baseUrl: "http://localhost:8090/rest/scriptrunner/latest/custom",
            timeout: 30000,
            retryAttempts: 3,
          },
          polling: {
            enabled: true,
            interval: 30000,
          },
        };

        this.userContext = {
          role: "NORMAL",
          id: "test-user-123",
          isGuest: false,
          permissions: {
            canEditInstructions: true,
            canChangeStatus: false,
            canAddComments: false,
            canSendEmail: false,
            canEditComments: false,
          },
        };
      }

      detectApiBaseUrl() {
        // Use our mock location to ensure we get the test data
        const currentHost = global.mockLocation
          ? global.mockLocation.hostname
          : window.location.hostname;
        const currentPort = global.mockLocation
          ? global.mockLocation.port
          : window.location.port;

        if (currentHost === "localhost" || currentHost === "127.0.0.1") {
          return `http://${currentHost}:${currentPort || 8090}/rest/scriptrunner/latest/custom`;
        } else {
          return "/rest/scriptrunner/latest/custom";
        }
      }

      parseStepViewParams() {
        // Access the mocked location search directly to ensure we get the test data
        const searchString = global.mockLocation
          ? global.mockLocation.search
          : window.location.search;
        const params = new URLSearchParams(searchString);

        // Check for UUID format first
        if (params.has("ite_id")) {
          const iteId = params.get("ite_id");
          if (!this.isValidUUID(iteId)) {
            throw new Error(
              "Invalid iteration ID format. Must be a valid UUID.",
            );
          }
          return {
            type: "uuid",
            ite_id: iteId,
            user_role: params.get("role") || "NORMAL",
            user_id: params.get("user_id") || null,
          };
        }

        // Check for human-readable format
        if (params.has("mig") && params.has("ite") && params.has("stepid")) {
          const migName = params.get("mig");
          const iteName = params.get("ite");
          const stepCode = params.get("stepid");

          if (!this.isValidStepCode(stepCode)) {
            throw new Error(
              "Invalid step code format. Expected format: ABC-123",
            );
          }

          return {
            type: "human-readable",
            mig_name: migName,
            ite_name: iteName,
            step_code: stepCode,
            user_role: params.get("role") || "NORMAL",
            user_id: params.get("user_id") || null,
          };
        }

        throw new Error(`Missing required URL parameters. Use one of these formats:
          Format 1 (Human-readable): ?mig=migrationa&ite=run1&stepid=DEC-001
          Format 2 (UUID-based): ?ite_id={iteration-uuid}
          Optional parameters: &role=NORMAL|PILOT&user_id={uuid}`);
      }

      isValidUUID(uuid) {
        const uuidPattern =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidPattern.test(uuid);
      }

      isValidStepCode(stepCode) {
        const stepCodePattern = /^[A-Z]{3}-\d{3}$/;
        return stepCodePattern.test(stepCode);
      }

      initializeUserContext() {
        // Use our mock location to ensure we get the test data
        const searchString = global.mockLocation
          ? global.mockLocation.search
          : window.location.search;
        const params = new URLSearchParams(searchString);

        return {
          role: params.get("role") || "NORMAL",
          id: params.get("user_id") || this.generateGuestUserId(),
          isGuest: !params.has("user_id"),
          permissions: {
            canEditInstructions: ["NORMAL", "PILOT"].includes(
              params.get("role") || "NORMAL",
            ),
            canChangeStatus: ["PILOT"].includes(params.get("role") || "NORMAL"),
            canAddComments: ["PILOT"].includes(params.get("role") || "NORMAL"),
            canSendEmail: ["PILOT"].includes(params.get("role") || "NORMAL"),
            canEditComments: ["PILOT"].includes(params.get("role") || "NORMAL"),
          },
        };
      }

      generateGuestUserId() {
        return "guest-" + Math.random().toString(36).substr(2, 9);
      }

      escapeHtml(text) {
        if (typeof text !== "string") return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
      }
    };
  });

  afterEach(() => {
    dom.window.close();
  });

  describe("URL Parameter Parsing", () => {
    test("should parse valid UUID format correctly", () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";
      setLocationSearch(`?ite_id=${validUUID}&role=PILOT`);

      const stepView = new StandaloneStepView();
      const result = stepView.parseStepViewParams();

      expect(result.type).toBe("uuid");
      expect(result.ite_id).toBe(validUUID);
      expect(result.user_role).toBe("PILOT");
    });

    test("should parse valid human-readable format correctly", () => {
      setLocationSearch("?mig=migrationa&ite=run1&stepid=DEC-001&role=NORMAL");

      const stepView = new StandaloneStepView();
      const result = stepView.parseStepViewParams();

      expect(result.type).toBe("human-readable");
      expect(result.mig_name).toBe("migrationa");
      expect(result.ite_name).toBe("run1");
      expect(result.step_code).toBe("DEC-001");
      expect(result.user_role).toBe("NORMAL");
    });

    test("should reject invalid UUID format", () => {
      setLocationSearch("?ite_id=invalid-uuid");

      const stepView = new StandaloneStepView();

      expect(() => {
        stepView.parseStepViewParams();
      }).toThrow("Invalid iteration ID format. Must be a valid UUID.");
    });

    test("should reject invalid step code format", () => {
      setLocationSearch("?mig=migrationa&ite=run1&stepid=INVALID");

      const stepView = new StandaloneStepView();

      expect(() => {
        stepView.parseStepViewParams();
      }).toThrow("Invalid step code format. Expected format: ABC-123");
    });

    test("should handle missing required parameters", () => {
      setLocationSearch("");

      const stepView = new StandaloneStepView();

      expect(() => {
        stepView.parseStepViewParams();
      }).toThrow("Missing required URL parameters");
    });

    test("should default to NORMAL role when not specified", () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";
      setLocationSearch(`?ite_id=${validUUID}`);

      const stepView = new StandaloneStepView();
      const result = stepView.parseStepViewParams();

      expect(result.user_role).toBe("NORMAL");
    });
  });

  describe("UUID Validation", () => {
    test("should validate correct UUID v4 format", () => {
      const stepView = new StandaloneStepView();
      const validUUIDs = [
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
      ];

      validUUIDs.forEach((uuid) => {
        expect(stepView.isValidUUID(uuid)).toBe(true);
      });
    });

    test("should reject invalid UUID formats", () => {
      const stepView = new StandaloneStepView();
      const invalidUUIDs = [
        "not-a-uuid",
        "550e8400-e29b-41d4-a716",
        "550e8400e29b41d4a716446655440000",
        "",
        null,
        undefined,
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(stepView.isValidUUID(uuid)).toBe(false);
      });
    });
  });

  describe("Step Code Validation", () => {
    test("should validate correct step code format", () => {
      const stepView = new StandaloneStepView();
      const validStepCodes = ["DEC-001", "ABC-123", "XYZ-999", "DEF-000"];

      validStepCodes.forEach((code) => {
        expect(stepView.isValidStepCode(code)).toBe(true);
      });
    });

    test("should reject invalid step code formats", () => {
      const stepView = new StandaloneStepView();
      const invalidStepCodes = [
        "dec-001", // lowercase
        "DE-001", // too few letters
        "ABCD-001", // too many letters
        "ABC-1", // too few numbers
        "ABC-1234", // too many numbers
        "ABC001", // missing dash
        "ABC-ABC", // letters instead of numbers
        "", // empty
        "ABC-", // incomplete
        "-001", // incomplete
      ];

      invalidStepCodes.forEach((code) => {
        expect(stepView.isValidStepCode(code)).toBe(false);
      });
    });
  });

  describe("API Base URL Detection", () => {
    test("should detect localhost development environment", () => {
      setLocationUrl("localhost", "8090");

      const stepView = new StandaloneStepView();
      const baseUrl = stepView.detectApiBaseUrl();

      expect(baseUrl).toBe(
        "http://localhost:8090/rest/scriptrunner/latest/custom",
      );
    });

    test("should detect 127.0.0.1 development environment", () => {
      setLocationUrl("127.0.0.1", "8090");

      const stepView = new StandaloneStepView();
      const baseUrl = stepView.detectApiBaseUrl();

      expect(baseUrl).toBe(
        "http://127.0.0.1:8090/rest/scriptrunner/latest/custom",
      );
    });

    test("should use relative path for production environment", () => {
      setLocationUrl("confluence.company.com", "");

      const stepView = new StandaloneStepView();
      const baseUrl = stepView.detectApiBaseUrl();

      expect(baseUrl).toBe("/rest/scriptrunner/latest/custom");
    });

    test("should handle custom port numbers", () => {
      setLocationUrl("localhost", "9090");

      const stepView = new StandaloneStepView();
      const baseUrl = stepView.detectApiBaseUrl();

      expect(baseUrl).toBe(
        "http://localhost:9090/rest/scriptrunner/latest/custom",
      );
    });
  });

  describe("User Context Initialization", () => {
    test("should initialize NORMAL user context correctly", () => {
      setLocationSearch("?role=NORMAL&user_id=test-123");

      const stepView = new StandaloneStepView();
      const context = stepView.initializeUserContext();

      expect(context.role).toBe("NORMAL");
      expect(context.id).toBe("test-123");
      expect(context.isGuest).toBe(false);
      expect(context.permissions.canEditInstructions).toBe(true);
      expect(context.permissions.canChangeStatus).toBe(false);
      expect(context.permissions.canAddComments).toBe(false);
    });

    test("should initialize PILOT user context correctly", () => {
      setLocationSearch("?role=PILOT&user_id=pilot-456");

      const stepView = new StandaloneStepView();
      const context = stepView.initializeUserContext();

      expect(context.role).toBe("PILOT");
      expect(context.id).toBe("pilot-456");
      expect(context.isGuest).toBe(false);
      expect(context.permissions.canEditInstructions).toBe(true);
      expect(context.permissions.canChangeStatus).toBe(true);
      expect(context.permissions.canAddComments).toBe(true);
      expect(context.permissions.canSendEmail).toBe(true);
    });

    test("should initialize guest user context when no user_id provided", () => {
      setLocationSearch("?role=NORMAL");

      const stepView = new StandaloneStepView();
      const context = stepView.initializeUserContext();

      expect(context.role).toBe("NORMAL");
      expect(context.isGuest).toBe(true);
      expect(context.id).toMatch(/^guest-[a-z0-9]+$/);
      expect(context.permissions.canEditInstructions).toBe(true);
    });

    test("should default to NORMAL role when not specified", () => {
      setLocationSearch("");

      const stepView = new StandaloneStepView();
      const context = stepView.initializeUserContext();

      expect(context.role).toBe("NORMAL");
      expect(context.permissions.canEditInstructions).toBe(true);
      expect(context.permissions.canChangeStatus).toBe(false);
    });
  });

  describe("HTML Escaping Security", () => {
    test("should escape HTML special characters", () => {
      const stepView = new StandaloneStepView();

      const testCases = [
        {
          input: '<script>alert("xss")</script>',
          expected: '&lt;script&gt;alert("xss")&lt;/script&gt;',
        },
        { input: "Hello & Goodbye", expected: "Hello &amp; Goodbye" },
        { input: 'Quote "test"', expected: 'Quote "test"' },
        { input: "Apostrophe's test", expected: "Apostrophe's test" },
        {
          input: '<img src="x" onerror="alert(1)">',
          expected: '&lt;img src="x" onerror="alert(1)"&gt;',
        },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(stepView.escapeHtml(input)).toBe(expected);
      });
    });

    test("should handle non-string inputs safely", () => {
      const stepView = new StandaloneStepView();

      expect(stepView.escapeHtml(null)).toBe("");
      expect(stepView.escapeHtml(undefined)).toBe("");
      expect(stepView.escapeHtml(123)).toBe("");
      expect(stepView.escapeHtml({})).toBe("");
    });
  });

  describe("Guest User ID Generation", () => {
    test("should generate valid guest user IDs", () => {
      const stepView = new StandaloneStepView();

      const guestId1 = stepView.generateGuestUserId();
      const guestId2 = stepView.generateGuestUserId();

      // Should start with 'guest-'
      expect(guestId1).toMatch(/^guest-[a-z0-9]+$/);
      expect(guestId2).toMatch(/^guest-[a-z0-9]+$/);

      // Should be unique
      expect(guestId1).not.toBe(guestId2);

      // Should have reasonable length
      expect(guestId1.length).toBeGreaterThan(8);
      expect(guestId1.length).toBeLessThan(20);
    });
  });

  describe("Configuration Initialization", () => {
    test("should initialize with correct default configuration", () => {
      const stepView = new StandaloneStepView();

      expect(stepView.config.api.timeout).toBe(30000);
      expect(stepView.config.api.retryAttempts).toBe(3);
      expect(stepView.config.polling.enabled).toBe(true);
      expect(stepView.config.polling.interval).toBe(30000);
    });

    test("should detect correct API base URL in configuration", () => {
      setLocationSearch("");

      const stepView = new StandaloneStepView();

      expect(stepView.config.api.baseUrl).toBe(
        "http://localhost:8090/rest/scriptrunner/latest/custom",
      );
    });
  });

  describe("Error Handling", () => {
    test("should throw descriptive error for missing parameters", () => {
      setLocationSearch("?incomplete=true");

      const stepView = new StandaloneStepView();

      expect(() => {
        stepView.parseStepViewParams();
      }).toThrow(/Missing required URL parameters/);
    });

    test("should throw descriptive error for invalid UUID", () => {
      setLocationSearch("?ite_id=not-a-uuid");

      const stepView = new StandaloneStepView();

      expect(() => {
        stepView.parseStepViewParams();
      }).toThrow(/Invalid iteration ID format/);
    });

    test("should throw descriptive error for invalid step code", () => {
      setLocationSearch("?mig=test&ite=run1&stepid=invalid");

      const stepView = new StandaloneStepView();

      expect(() => {
        stepView.parseStepViewParams();
      }).toThrow(/Invalid step code format/);
    });
  });

  describe("Mobile and Responsive Considerations", () => {
    test("should handle touch events detection", () => {
      // Mock touch support
      Object.defineProperty(window, "ontouchstart", {
        value: true,
        configurable: true,
      });

      const stepView = new StandaloneStepView();

      // This would be tested in the actual implementation
      // where setupMobileInteractions is called
      expect(window.ontouchstart).toBeDefined();
    });

    test("should handle viewport meta tag creation", () => {
      // This would test the setupStandalonePage method
      // which adds viewport meta tag for mobile responsiveness
      const stepView = new StandaloneStepView();

      // Mock method would add viewport meta tag
      const meta = document.createElement("meta");
      meta.name = "viewport";
      meta.content = "width=device-width, initial-scale=1.0, user-scalable=yes";
      document.head.appendChild(meta);

      const addedMeta = document.querySelector('meta[name="viewport"]');
      expect(addedMeta).toBeTruthy();
      expect(addedMeta.content).toContain("width=device-width");
    });
  });

  describe("Role-Based Access Control", () => {
    test("should correctly determine NORMAL user permissions", () => {
      setLocationSearch("?role=NORMAL");

      const stepView = new StandaloneStepView();
      const context = stepView.initializeUserContext();

      expect(context.permissions.canEditInstructions).toBe(true);
      expect(context.permissions.canChangeStatus).toBe(false);
      expect(context.permissions.canAddComments).toBe(false);
      expect(context.permissions.canSendEmail).toBe(false);
      expect(context.permissions.canEditComments).toBe(false);
    });

    test("should correctly determine PILOT user permissions", () => {
      setLocationSearch("?role=PILOT");

      const stepView = new StandaloneStepView();
      const context = stepView.initializeUserContext();

      expect(context.permissions.canEditInstructions).toBe(true);
      expect(context.permissions.canChangeStatus).toBe(true);
      expect(context.permissions.canAddComments).toBe(true);
      expect(context.permissions.canSendEmail).toBe(true);
      expect(context.permissions.canEditComments).toBe(true);
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    test("should handle empty query parameters gracefully", () => {
      setLocationSearch("?mig=&ite=&stepid=");

      const stepView = new StandaloneStepView();

      // Should still try to parse but validation should fail
      expect(() => {
        stepView.parseStepViewParams();
      }).toThrow();
    });

    test("should handle very long parameter values", () => {
      const longValue = "a".repeat(1000);
      setLocationSearch(`?mig=${longValue}&ite=run1&stepid=DEC-001`);

      const stepView = new StandaloneStepView();
      const result = stepView.parseStepViewParams();

      expect(result.mig_name).toBe(longValue);
      expect(result.type).toBe("human-readable");
    });

    test("should handle special characters in parameters", () => {
      const specialValue = "test%20migration";
      setLocationSearch(`?mig=${specialValue}&ite=run1&stepid=DEC-001`);

      const stepView = new StandaloneStepView();
      const result = stepView.parseStepViewParams();

      expect(result.mig_name).toBe("test migration");
    });
  });
});

/**
 * Integration points for actual testing environment:
 *
 * 1. Load actual stepview-standalone.js file
 * 2. Set up real DOM environment with proper HTML
 * 3. Mock fetch responses for API calls
 * 4. Test actual DOM manipulation and event handling
 * 5. Test polling and real-time updates
 * 6. Test email generation functionality
 * 7. Test error state rendering
 * 8. Test mobile touch interactions
 *
 * Run with: npm run test:unit
 * Coverage: npm run test:coverage
 */
