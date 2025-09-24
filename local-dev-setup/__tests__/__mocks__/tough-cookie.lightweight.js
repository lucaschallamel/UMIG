/**
 * Lightweight tough-cookie Mock - Stack Overflow Prevention
 *
 * This mock prevents the circular dependency issues that cause
 * stack overflow errors in the tough-cookie library during testing.
 *
 * Features:
 * - Prevents circular import recursion
 * - Maintains API compatibility
 * - Zero memory overhead
 * - No external dependencies
 *
 * @version 1.0.0
 * @author test-infrastructure-consolidation
 */

class MockCookie {
  constructor(options = {}) {
    this.name = options.name || "test-cookie";
    this.value = options.value || "test-value";
    this.domain = options.domain || "localhost";
    this.path = options.path || "/";
    this.expires = options.expires || null;
    this.secure = options.secure || false;
    this.httpOnly = options.httpOnly || false;
  }

  toString() {
    return `${this.name}=${this.value}`;
  }

  toJSON() {
    return {
      name: this.name,
      value: this.value,
      domain: this.domain,
      path: this.path,
      expires: this.expires,
      secure: this.secure,
      httpOnly: this.httpOnly,
    };
  }
}

class MockCookieJar {
  constructor() {
    this.cookies = [];
  }

  setCookie(cookie, url, callback) {
    if (typeof cookie === "string") {
      cookie = MockCookie.parse(cookie);
    }
    this.cookies.push(cookie);
    if (callback) callback(null, cookie);
    return Promise.resolve(cookie);
  }

  getCookies(url, callback) {
    const result = this.cookies.slice(); // Return copy to prevent mutations
    if (callback) callback(null, result);
    return Promise.resolve(result);
  }

  getCookieString(url, callback) {
    const cookieString = this.cookies.map((c) => c.toString()).join("; ");
    if (callback) callback(null, cookieString);
    return Promise.resolve(cookieString);
  }

  removeAllCookies(callback) {
    this.cookies = [];
    if (callback) callback(null);
    return Promise.resolve();
  }

  serialize(callback) {
    const serialized = JSON.stringify(this.cookies);
    if (callback) callback(null, serialized);
    return Promise.resolve(serialized);
  }

  static deserialize(serialized, callback) {
    try {
      const jar = new MockCookieJar();
      const cookies = JSON.parse(serialized);
      jar.cookies = cookies.map((c) => new MockCookie(c));
      if (callback) callback(null, jar);
      return Promise.resolve(jar);
    } catch (error) {
      if (callback) callback(error);
      return Promise.reject(error);
    }
  }
}

// Static methods for Cookie class
MockCookie.parse = (cookieString) => {
  const parts = cookieString.split(";").map((p) => p.trim());
  const [nameValue] = parts;
  const [name, value] = nameValue.split("=");

  const options = { name: name?.trim(), value: value?.trim() };

  // Parse cookie attributes
  parts.slice(1).forEach((part) => {
    const [key, val] = part.split("=");
    const attr = key?.trim().toLowerCase();

    switch (attr) {
      case "domain":
        options.domain = val?.trim();
        break;
      case "path":
        options.path = val?.trim();
        break;
      case "expires":
        options.expires = new Date(val?.trim());
        break;
      case "secure":
        options.secure = true;
        break;
      case "httponly":
        options.httpOnly = true;
        break;
    }
  });

  return new MockCookie(options);
};

MockCookie.fromJSON = (json) => {
  return new MockCookie(json);
};

// Store version to prevent caching issues
const MOCK_VERSION = "1.0.0";

// Main export object matching tough-cookie API
const toughCookieMock = {
  Cookie: MockCookie,
  CookieJar: MockCookieJar,

  // Utility functions
  parse: MockCookie.parse,
  fromJSON: MockCookie.fromJSON,

  // Constants that might be used
  PrefixSecurityEnum: {
    SILENT: "silent",
    STRICT: "strict",
    DISABLED: "disabled",
  },

  // Version info
  version: MOCK_VERSION,

  // Flag to identify this as a mock
  __isMock: true,
  __mockType: "tough-cookie-lightweight",
  __preventStackOverflow: true,
};

// Export for CommonJS
if (typeof module !== "undefined" && module.exports) {
  module.exports = toughCookieMock;
}

// Export for ES modules
export default toughCookieMock;
export const Cookie = MockCookie;
export const CookieJar = MockCookieJar;
export const parse = MockCookie.parse;
export const fromJSON = MockCookie.fromJSON;

// Prevent any circular dependencies
Object.freeze(toughCookieMock);
Object.freeze(MockCookie);
Object.freeze(MockCookieJar);
