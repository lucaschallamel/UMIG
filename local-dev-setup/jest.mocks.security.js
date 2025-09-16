/**
 * Security Test Mock Module
 * Provides lightweight mocks for browser-specific modules that cause stack overflow
 * in security tests due to tough-cookie circular dependency issues
 *
 * This file replaces heavy modules like jsdom and tough-cookie during security testing
 * to prevent the stack overflow issue while maintaining test functionality.
 */

// Mock tough-cookie to prevent stack overflow
const toughCookieMock = {
  Cookie: class MockCookie {
    constructor(properties = {}) {
      this.key = properties.key || "";
      this.value = properties.value || "";
      this.domain = properties.domain || null;
      this.path = properties.path || "/";
      this.creation = properties.creation || new Date();
      this.lastAccessed = properties.lastAccessed || new Date();
    }

    toString() {
      return `${this.key}=${this.value}`;
    }

    validate() {
      return true;
    }
  },

  CookieJar: class MockCookieJar {
    constructor() {
      this.cookies = [];
    }

    setCookie(cookie, url, options = {}) {
      if (typeof cookie === "string") {
        cookie = new toughCookieMock.Cookie({
          key: cookie.split("=")[0],
          value: cookie.split("=")[1] || "",
        });
      }
      this.cookies.push(cookie);
      return Promise.resolve(cookie);
    }

    getCookies(url, options = {}) {
      return Promise.resolve(this.cookies);
    }

    removeAllCookies() {
      this.cookies = [];
      return Promise.resolve();
    }
  },

  parseDate: (dateString) => new Date(dateString),
  formatDate: (date) => date.toUTCString(),
  permuteDomain: (domain) => [domain],
  permutePath: (path) => [path],
};

// Mock jsdom to prevent heavy DOM initialization
const jsdomMock = {
  JSDOM: class MockJSDOM {
    constructor(
      html = "<!DOCTYPE html><html><body></body></html>",
      options = {},
    ) {
      this.window = {
        document: {
          createElement: jest.fn(() => ({
            className: "",
            innerHTML: "",
            appendChild: jest.fn(),
            remove: jest.fn(),
            querySelector: jest.fn(() => null),
            querySelectorAll: jest.fn(() => []),
            addEventListener: jest.fn(),
            style: {},
            classList: {
              add: jest.fn(),
              remove: jest.fn(),
            },
          })),
          cookie: "",
          addEventListener: jest.fn(),
          body: {
            appendChild: jest.fn(),
          },
          head: {
            appendChild: jest.fn(),
          },
        },
        location: {
          href: "https://test.example.com",
          origin: "https://test.example.com",
          protocol: "https:",
        },
        addEventListener: jest.fn(),
        performance: {
          now: jest.fn(() => Date.now()),
        },
      };

      this.window.document.defaultView = this.window;
    }

    serialize() {
      return "<!DOCTYPE html><html><body></body></html>";
    }
  },

  VirtualConsole: class MockVirtualConsole {
    constructor() {
      this.logs = [];
    }

    on(event, handler) {
      // Mock event handling
    }

    sendTo(target) {
      // Mock send functionality
    }
  },
};

// Export appropriate mock based on what's being imported
module.exports = {
  // Default export for tough-cookie
  ...toughCookieMock,

  // Default export for jsdom
  ...jsdomMock,

  // Named exports
  Cookie: toughCookieMock.Cookie,
  CookieJar: toughCookieMock.CookieJar,
  JSDOM: jsdomMock.JSDOM,
  VirtualConsole: jsdomMock.VirtualConsole,

  // Mock any other problematic dependencies
  default: {
    Cookie: toughCookieMock.Cookie,
    CookieJar: toughCookieMock.CookieJar,
    JSDOM: jsdomMock.JSDOM,
  },
};
