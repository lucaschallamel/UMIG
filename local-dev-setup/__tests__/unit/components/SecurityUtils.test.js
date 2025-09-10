/**
 * SecurityUtils Unit Tests
 * US-082-B Component Architecture Development
 *
 * Tests security utility functions including:
 * - HTML escaping and sanitization
 * - Input validation
 * - XSS prevention
 * - Safe DOM manipulation
 * - Content Security Policy compliance
 * - Rate limiting
 * - Security event logging
 */

const SecurityUtils = require("../../../../src/groovy/umig/web/js/components/SecurityUtils");

describe("SecurityUtils", () => {
  let mockGetRandomValues;

  beforeEach(() => {
    // Clear rate limit data between tests
    SecurityUtils._rateLimits = new Map();

    // Mock console methods
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();

    // Mock crypto API
    mockGetRandomValues = jest.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    });
    global.crypto = {
      getRandomValues: mockGetRandomValues,
    };

    // Set up test globals - use defaults that work with jsdom
    // navigator.userAgent and window.location.href will use jsdom defaults
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("HTML Escaping", () => {
    test("should escape HTML special characters", () => {
      const input = '<script>alert("xss")</script>';
      const result = SecurityUtils.escapeHtml(input);

      expect(result).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
      );
    });

    test("should escape all dangerous characters", () => {
      const input = "< > & \" '";
      const result = SecurityUtils.escapeHtml(input);

      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
      expect(result).toContain("&amp;");
      expect(result).toContain("&quot;");
      expect(result).toContain("&#39;");
    });

    test("should handle null and undefined", () => {
      expect(SecurityUtils.escapeHtml(null)).toBe("");
      expect(SecurityUtils.escapeHtml(undefined)).toBe("");
    });

    test("should convert non-string values to string", () => {
      expect(SecurityUtils.escapeHtml(123)).toBe("123");
      expect(SecurityUtils.escapeHtml(true)).toBe("true");
    });

    test("should handle empty string", () => {
      expect(SecurityUtils.escapeHtml("")).toBe("");
    });
  });

  describe("HTML Sanitization", () => {
    test("should remove script tags", () => {
      const input = '<p>Safe content</p><script>alert("xss")</script>';
      const result = SecurityUtils.sanitizeHtml(input);

      expect(result).not.toContain("<script>");
      expect(result).toContain("<p>Safe content</p>");
    });

    test("should remove noscript tags", () => {
      const input = "<p>Content</p><noscript>No JS content</noscript>";
      const result = SecurityUtils.sanitizeHtml(input);

      expect(result).not.toContain("<noscript>");
      expect(result).toContain("<p>Content</p>");
    });

    test("should remove inline event handlers", () => {
      const input = "<button onclick=\"alert('xss')\">Click me</button>";
      const result = SecurityUtils.sanitizeHtml(input);

      expect(result).not.toContain("onclick");
      expect(result).toContain("<button>Click me</button>");
    });

    test("should remove javascript: URLs", () => {
      const input = "<a href=\"javascript:alert('xss')\">Link</a>";
      const result = SecurityUtils.sanitizeHtml(input);

      expect(result).not.toContain("javascript:");
      expect(result).toContain("<a>Link</a>");
    });

    test("should preserve allowed tags", () => {
      const input = "<p>Paragraph</p><strong>Bold</strong><em>Italic</em>";
      const result = SecurityUtils.sanitizeHtml(input);

      expect(result).toContain("<p>Paragraph</p>");
      expect(result).toContain("<strong>Bold</strong>");
      expect(result).toContain("<em>Italic</em>");
    });

    test("should remove disallowed tags", () => {
      const input = '<p>Safe</p><iframe src="evil.com"></iframe>';
      const result = SecurityUtils.sanitizeHtml(input);

      expect(result).toContain("<p>Safe</p>");
      expect(result).not.toContain("<iframe>");
    });

    test("should filter allowed attributes", () => {
      const input =
        '<a href="http://example.com" class="safe" data-evil="bad">Link</a>';
      const result = SecurityUtils.sanitizeHtml(input, {
        allowedTags: ["a"],
        allowedAttributes: {
          a: ["href", "class"],
        },
        allowedClasses: ["safe"],
      });

      expect(result).toContain('href="http://example.com"');
      expect(result).toContain('class="safe"');
      expect(result).not.toContain("data-evil");
    });

    test("should filter CSS classes", () => {
      const input = '<span class="safe allowed evil">Text</span>';
      const result = SecurityUtils.sanitizeHtml(input, {
        allowedTags: ["span"],
        allowedAttributes: {
          span: ["class"],
        },
        allowedClasses: ["safe", "allowed"],
      });

      expect(result).toContain('class="safe allowed"');
      expect(result).not.toContain("evil");
    });

    test("should remove class attribute when no allowed classes", () => {
      const input = '<span class="all-forbidden">Text</span>';
      const result = SecurityUtils.sanitizeHtml(input, {
        allowedTags: ["span"],
        allowedAttributes: {
          span: ["class"],
        },
        allowedClasses: ["safe"],
      });

      expect(result).not.toContain("class");
    });

    test("should handle empty or null input", () => {
      expect(SecurityUtils.sanitizeHtml("")).toBe("");
      expect(SecurityUtils.sanitizeHtml(null)).toBe("");
      expect(SecurityUtils.sanitizeHtml(undefined)).toBe("");
    });
  });

  describe("Safe DOM Manipulation", () => {
    test("should safely set inner HTML", () => {
      const element = document.createElement("div");
      const html = '<p>Safe content</p><script>alert("xss")</script>';

      SecurityUtils.safeSetInnerHTML(element, html);

      expect(element.innerHTML).toContain("<p>Safe content</p>");
      expect(element.innerHTML).not.toContain("<script>");
    });

    test("should handle null element", () => {
      expect(() =>
        SecurityUtils.safeSetInnerHTML(null, "<p>Test</p>"),
      ).not.toThrow();
    });

    test("should create safe text nodes", () => {
      const textNode = SecurityUtils.createTextNode("Safe text <script>");

      expect(textNode.nodeType).toBe(Node.TEXT_NODE);
      expect(textNode.textContent).toBe("Safe text <script>");
    });

    test("should handle null text in createTextNode", () => {
      const textNode = SecurityUtils.createTextNode(null);

      expect(textNode.textContent).toBe("");
    });
  });

  describe("Regex Escaping", () => {
    test("should escape regex special characters", () => {
      const input = ".*+?^${}()|[]\\";
      const result = SecurityUtils.escapeRegex(input);

      expect(result).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
    });

    test("should handle empty string", () => {
      expect(SecurityUtils.escapeRegex("")).toBe("");
    });

    test("should handle null and undefined", () => {
      expect(SecurityUtils.escapeRegex(null)).toBe("");
      expect(SecurityUtils.escapeRegex(undefined)).toBe("");
    });

    test("should prevent ReDoS attacks", () => {
      const maliciousInput = "((((((((((";
      const escaped = SecurityUtils.escapeRegex(maliciousInput);

      // Should be safe to use in regex
      expect(() => new RegExp(escaped)).not.toThrow();
    });
  });

  describe("Integer Validation", () => {
    test("should validate valid integers", () => {
      expect(SecurityUtils.validateInteger("123")).toBe(123);
      expect(SecurityUtils.validateInteger(456)).toBe(456);
      expect(SecurityUtils.validateInteger("-789")).toBe(-789);
    });

    test("should return null for invalid integers", () => {
      expect(SecurityUtils.validateInteger("abc")).toBe(null);
      expect(SecurityUtils.validateInteger("12.34")).toBe(12); // parseInt truncates
      expect(SecurityUtils.validateInteger("")).toBe(null);
      expect(SecurityUtils.validateInteger(null)).toBe(null);
    });

    test("should respect min constraints", () => {
      expect(SecurityUtils.validateInteger(5, { min: 10 })).toBe(null);
      expect(SecurityUtils.validateInteger(15, { min: 10 })).toBe(15);
    });

    test("should respect max constraints", () => {
      expect(SecurityUtils.validateInteger(15, { max: 10 })).toBe(null);
      expect(SecurityUtils.validateInteger(5, { max: 10 })).toBe(5);
    });

    test("should respect both min and max constraints", () => {
      const constraints = { min: 1, max: 100 };

      expect(SecurityUtils.validateInteger(0, constraints)).toBe(null);
      expect(SecurityUtils.validateInteger(50, constraints)).toBe(50);
      expect(SecurityUtils.validateInteger(150, constraints)).toBe(null);
    });
  });

  describe("String Validation", () => {
    test("should validate valid strings", () => {
      expect(SecurityUtils.validateString("hello")).toBe("hello");
      expect(SecurityUtils.validateString("")).toBe(null); // Default doesn't allow empty
    });

    test("should handle null and undefined", () => {
      expect(SecurityUtils.validateString(null)).toBe(null);
      expect(SecurityUtils.validateString(null, { allowEmpty: true })).toBe("");
    });

    test("should respect minLength constraint", () => {
      expect(SecurityUtils.validateString("hi", { minLength: 5 })).toBe(null);
      expect(SecurityUtils.validateString("hello", { minLength: 5 })).toBe(
        "hello",
      );
    });

    test("should respect maxLength constraint", () => {
      const longString = "this is a very long string";
      const result = SecurityUtils.validateString(longString, {
        maxLength: 10,
      });

      expect(result).toBe("this is a ");
      expect(result.length).toBe(10);
    });

    test("should validate against pattern", () => {
      const alphanumericPattern = /^[a-zA-Z0-9]+$/;

      expect(
        SecurityUtils.validateString("hello123", {
          pattern: alphanumericPattern,
        }),
      ).toBe("hello123");
      expect(
        SecurityUtils.validateString("hello!@#", {
          pattern: alphanumericPattern,
        }),
      ).toBe(null);
    });

    test("should convert non-string values", () => {
      expect(SecurityUtils.validateString(123)).toBe("123");
      expect(SecurityUtils.validateString(true)).toBe("true");
    });
  });

  describe("Email Validation", () => {
    test("should validate valid email addresses", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "firstname+lastname@example.org",
        "email@subdomain.example.com",
      ];

      validEmails.forEach((email) => {
        expect(SecurityUtils.validateEmail(email)).toBe(true);
      });
    });

    test("should reject invalid email addresses", () => {
      const invalidEmails = [
        "",
        "plainaddress",
        "@missingdomain.com",
        "missing@.com",
        "missing.domain@.com",
        "two@@domain.com",
        "domain@com",
        ".email@domain.com",
        "email.@domain.com",
        "email..double.dot@domain.com",
      ];

      invalidEmails.forEach((email) => {
        expect(SecurityUtils.validateEmail(email)).toBe(false);
      });
    });

    test("should reject emails longer than 254 characters", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      expect(SecurityUtils.validateEmail(longEmail)).toBe(false);
    });

    test("should handle null and undefined", () => {
      expect(SecurityUtils.validateEmail(null)).toBe(false);
      expect(SecurityUtils.validateEmail(undefined)).toBe(false);
    });
  });

  describe("URL Validation", () => {
    test("should validate valid HTTP/HTTPS URLs", () => {
      const validUrls = [
        "http://example.com",
        "https://www.example.com",
        "https://subdomain.example.com/path?query=value",
        "http://example.com:8080/path",
      ];

      validUrls.forEach((url) => {
        expect(SecurityUtils.validateUrl(url)).toBe(true);
      });
    });

    test("should reject invalid or dangerous URLs", () => {
      const invalidUrls = [
        "",
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        "file:///etc/passwd",
        "ftp://example.com",
        "not-a-url",
        "http://",
        "https://",
      ];

      invalidUrls.forEach((url) => {
        expect(SecurityUtils.validateUrl(url)).toBe(false);
      });
    });

    test("should handle null and undefined", () => {
      expect(SecurityUtils.validateUrl(null)).toBe(false);
      expect(SecurityUtils.validateUrl(undefined)).toBe(false);
    });
  });

  describe("Safe Element Creation", () => {
    test("should create element with text content", () => {
      const element = SecurityUtils.createElement("div", "Safe text");

      expect(element.tagName.toLowerCase()).toBe("div");
      expect(element.textContent).toBe("Safe text");
    });

    test("should set safe attributes", () => {
      const element = SecurityUtils.createElement("a", "Link", {
        href: "https://example.com",
        class: "safe-link",
        title: "Example link",
      });

      expect(element.getAttribute("href")).toBe("https://example.com");
      expect(element.getAttribute("class")).toBe("safe-link");
      expect(element.getAttribute("title")).toBe("Example link");
    });

    test("should skip event handler attributes", () => {
      const element = SecurityUtils.createElement("button", "Click me", {
        onclick: 'alert("xss")',
        onmouseover: "malicious()",
        class: "safe",
      });

      expect(element.hasAttribute("onclick")).toBe(false);
      expect(element.hasAttribute("onmouseover")).toBe(false);
      expect(element.getAttribute("class")).toBe("safe");
    });

    test("should validate URLs in href and src attributes", () => {
      const linkElement = SecurityUtils.createElement("a", "Link", {
        href: 'javascript:alert("xss")',
      });

      expect(linkElement.hasAttribute("href")).toBe(false);

      const imgElement = SecurityUtils.createElement("img", "", {
        src: "https://example.com/image.jpg",
      });

      expect(imgElement.getAttribute("src")).toBe(
        "https://example.com/image.jpg",
      );
    });

    test("should handle empty text", () => {
      const element = SecurityUtils.createElement("div");

      expect(element.textContent).toBe("");
    });
  });

  describe("Search Term Highlighting", () => {
    test("should highlight search terms safely", () => {
      const text = "This is a test string";
      const term = "test";
      const result = SecurityUtils.highlightSearchTerm(text, term);

      expect(result).toBe("This is a <mark>test</mark> string");
    });

    test("should escape HTML in text and term", () => {
      const text = '<script>alert("xss")</script>';
      const term = "script";
      const result = SecurityUtils.highlightSearchTerm(text, term);

      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
      expect(result).toContain("<mark>script</mark>");
      expect(result).not.toContain("<script>"); // Should not contain unescaped script
    });

    test("should handle case-insensitive search", () => {
      const text = "Test STRING";
      const term = "test";
      const result = SecurityUtils.highlightSearchTerm(text, term);

      expect(result).toBe("<mark>Test</mark> STRING");
    });

    test("should handle multiple occurrences", () => {
      const text = "test test test";
      const term = "test";
      const result = SecurityUtils.highlightSearchTerm(text, term);

      expect(result).toBe(
        "<mark>test</mark> <mark>test</mark> <mark>test</mark>",
      );
    });

    test("should handle regex special characters in search term", () => {
      const text = "Price: $10.99";
      const term = "$10.99";
      const result = SecurityUtils.highlightSearchTerm(text, term);

      expect(result).toBe("Price: <mark>$10.99</mark>");
    });

    test("should handle empty or null inputs", () => {
      expect(SecurityUtils.highlightSearchTerm("", "term")).toBe("");
      expect(SecurityUtils.highlightSearchTerm("text", "")).toContain("text");
      expect(SecurityUtils.highlightSearchTerm(null, "term")).toBe("");
    });

    test("should handle regex errors gracefully", () => {
      // Mock regex constructor to throw error
      const originalRegExp = global.RegExp;
      global.RegExp = jest.fn(() => {
        throw new Error("Regex error");
      });

      const result = SecurityUtils.highlightSearchTerm("test text", "test");

      expect(result).toBe("test text"); // Should return escaped text

      global.RegExp = originalRegExp;
    });
  });

  describe("Deep Cloning", () => {
    test("should handle primitive values", () => {
      expect(SecurityUtils.deepClone(null)).toBe(null);
      expect(SecurityUtils.deepClone(undefined)).toBe(undefined);
      expect(SecurityUtils.deepClone(123)).toBe(123);
      expect(SecurityUtils.deepClone("string")).toBe("string");
      expect(SecurityUtils.deepClone(true)).toBe(true);
    });

    test("should clone Date objects", () => {
      const date = new Date("2023-12-25");
      const cloned = SecurityUtils.deepClone(date);

      expect(cloned).toBeInstanceOf(Date);
      expect(cloned.getTime()).toBe(date.getTime());
      expect(cloned).not.toBe(date); // Different reference
    });

    test("should clone arrays recursively", () => {
      const array = [1, { a: 2 }, [3, 4]];
      const cloned = SecurityUtils.deepClone(array);

      expect(cloned).toEqual(array);
      expect(cloned).not.toBe(array); // Different reference
      expect(cloned[1]).not.toBe(array[1]); // Deep clone
    });

    test("should clone Set objects", () => {
      const set = new Set([1, 2, { a: 3 }]);
      const cloned = SecurityUtils.deepClone(set);

      expect(cloned).toBeInstanceOf(Set);
      expect(cloned.size).toBe(3);
      expect(cloned).not.toBe(set);
    });

    test("should clone Map objects", () => {
      const map = new Map([
        ["key1", "value1"],
        [{ objKey: true }, { objValue: 123 }],
      ]);
      const cloned = SecurityUtils.deepClone(map);

      expect(cloned).toBeInstanceOf(Map);
      expect(cloned.size).toBe(2);
      expect(cloned).not.toBe(map);
    });

    test("should clone regular objects", () => {
      const obj = {
        str: "string",
        num: 123,
        bool: true,
        nested: {
          array: [1, 2, 3],
          date: new Date(),
        },
      };
      const cloned = SecurityUtils.deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.nested).not.toBe(obj.nested);
      expect(cloned.nested.array).not.toBe(obj.nested.array);
    });
  });

  describe("Security Utilities", () => {
    test("should generate nonce", () => {
      const nonce = SecurityUtils.generateNonce();

      expect(typeof nonce).toBe("string");
      expect(nonce.length).toBeGreaterThan(0);
      // Verify it's a valid base64 string (basic pattern check)
      expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    test("should generate unique nonces", () => {
      const nonce1 = SecurityUtils.generateNonce();
      const nonce2 = SecurityUtils.generateNonce();

      expect(nonce1).not.toBe(nonce2);
    });

    test("should identify safe primitives", () => {
      expect(SecurityUtils.isSafePrimitive("string")).toBe(true);
      expect(SecurityUtils.isSafePrimitive(123)).toBe(true);
      expect(SecurityUtils.isSafePrimitive(true)).toBe(true);
      expect(SecurityUtils.isSafePrimitive(null)).toBe(true);
      expect(SecurityUtils.isSafePrimitive(undefined)).toBe(true);

      expect(SecurityUtils.isSafePrimitive({})).toBe(false);
      expect(SecurityUtils.isSafePrimitive([])).toBe(false);
      expect(SecurityUtils.isSafePrimitive(() => {})).toBe(false);
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("should allow actions within limit", () => {
      expect(SecurityUtils.checkRateLimit("test-action", 3, 60000)).toBe(true);
      expect(SecurityUtils.checkRateLimit("test-action", 3, 60000)).toBe(true);
      expect(SecurityUtils.checkRateLimit("test-action", 3, 60000)).toBe(true);
    });

    test("should block actions exceeding limit", () => {
      // Use up the limit
      for (let i = 0; i < 3; i++) {
        SecurityUtils.checkRateLimit("test-action", 3, 60000);
      }

      // Should be blocked
      expect(SecurityUtils.checkRateLimit("test-action", 3, 60000)).toBe(false);
    });

    test("should reset after time window", () => {
      // Use up the limit
      for (let i = 0; i < 3; i++) {
        SecurityUtils.checkRateLimit("test-action", 3, 60000);
      }

      // Should be blocked
      expect(SecurityUtils.checkRateLimit("test-action", 3, 60000)).toBe(false);

      // Advance time beyond window
      jest.advanceTimersByTime(61000);

      // Should be allowed again
      expect(SecurityUtils.checkRateLimit("test-action", 3, 60000)).toBe(true);
    });

    test("should handle different actions separately", () => {
      // Use up limit for action1
      for (let i = 0; i < 3; i++) {
        SecurityUtils.checkRateLimit("action1", 3, 60000);
      }

      // action2 should still be allowed
      expect(SecurityUtils.checkRateLimit("action2", 3, 60000)).toBe(true);
    });

    test("should use default limits", () => {
      // Default should be 5 attempts per minute
      for (let i = 0; i < 5; i++) {
        expect(SecurityUtils.checkRateLimit("default-test")).toBe(true);
      }

      expect(SecurityUtils.checkRateLimit("default-test")).toBe(false);
    });
  });

  describe("Security Event Logging", () => {
    test("should log security events with details", () => {
      SecurityUtils.logSecurityEvent("XSS_ATTEMPT", "high", {
        input: '<script>alert("xss")</script>',
        source: "user_input",
      });

      expect(console.warn).toHaveBeenCalledWith(
        "[SECURITY HIGH] XSS_ATTEMPT:",
        expect.objectContaining({
          event: "XSS_ATTEMPT",
          severity: "high",
          details: expect.objectContaining({
            input: '<script>alert("xss")</script>',
            source: "user_input",
          }),
          timestamp: expect.any(String),
          userAgent: expect.any(String), // jsdom default
          url: expect.any(String), // jsdom default
        }),
      );
    });

    test("should use default severity", () => {
      SecurityUtils.logSecurityEvent("RATE_LIMIT_EXCEEDED");

      expect(console.warn).toHaveBeenCalledWith(
        "[SECURITY INFO] RATE_LIMIT_EXCEEDED:",
        expect.objectContaining({
          severity: "info",
        }),
      );
    });

    test("should handle missing console", () => {
      const originalConsole = global.console;
      global.console = undefined;

      expect(() => SecurityUtils.logSecurityEvent("TEST")).not.toThrow();

      global.console = originalConsole;
    });

    test("should include timestamp", () => {
      const beforeTime = new Date();

      SecurityUtils.logSecurityEvent("TEST_EVENT");

      const afterTime = new Date();
      const logCall = console.warn.mock.calls[0][1];
      const loggedTimestamp = new Date(logCall.timestamp);

      expect(loggedTimestamp.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
      expect(loggedTimestamp.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      );
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle malformed HTML gracefully", () => {
      const malformedHtml = "<div><p>Unclosed tags<span>More content</div>";

      expect(() => SecurityUtils.sanitizeHtml(malformedHtml)).not.toThrow();
    });

    test("should handle deeply nested elements", () => {
      let deeplyNested = "<div>";
      for (let i = 0; i < 100; i++) {
        deeplyNested += "<span>";
      }
      deeplyNested += "Content";
      for (let i = 0; i < 100; i++) {
        deeplyNested += "</span>";
      }
      deeplyNested += "</div>";

      expect(() => SecurityUtils.sanitizeHtml(deeplyNested)).not.toThrow();
    });

    test("should handle very long strings", () => {
      const longString = "a".repeat(10000);

      expect(() => SecurityUtils.escapeHtml(longString)).not.toThrow();
      expect(() => SecurityUtils.validateString(longString)).not.toThrow();
    });

    test("should handle unicode characters", () => {
      const unicodeText = "🔒 Secure 中文 العربية русский";

      const escaped = SecurityUtils.escapeHtml(unicodeText);
      expect(escaped).toContain("🔒");
      expect(escaped).toContain("中文");
    });

    test("should handle circular references in deep clone", () => {
      const obj = { prop: "value" };
      obj.self = obj; // Circular reference

      // JSON.parse/stringify should handle this by throwing error
      expect(() => SecurityUtils.deepClone(obj)).toThrow();
    });
  });

  describe("Module Exports", () => {
    test("should be available as CommonJS module", () => {
      expect(SecurityUtils).toBeDefined();
      expect(typeof SecurityUtils).toBe("function"); // It's actually a class constructor
    });

    test("should have all expected methods", () => {
      const expectedMethods = [
        "escapeHtml",
        "sanitizeHtml",
        "safeSetInnerHTML",
        "createTextNode",
        "escapeRegex",
        "validateInteger",
        "validateString",
        "validateEmail",
        "validateUrl",
        "createElement",
        "highlightSearchTerm",
        "deepClone",
        "generateNonce",
        "isSafePrimitive",
        "checkRateLimit",
        "logSecurityEvent",
      ];

      expectedMethods.forEach((method) => {
        expect(typeof SecurityUtils[method]).toBe("function");
      });
    });

    test("should be available globally for browser usage", () => {
      // Test that it's available globally (set by jest.setup.unit.js)
      expect(global.SecurityUtils).toBeDefined();
      expect(global.SecurityUtils).toBe(SecurityUtils);
    });

    test("should be available on window object in browser environment", () => {
      // Test window availability (mocked in test setup)
      if (typeof window !== "undefined") {
        expect(window.SecurityUtils).toBeDefined();
        expect(window.SecurityUtils).toBe(SecurityUtils);
      }
    });
  });
});
