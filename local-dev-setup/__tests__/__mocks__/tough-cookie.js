/**
 * Emergency Mock for tough-cookie to prevent infinite recursion
 * Addresses critical test hanging issues (TD-005 Phase 1)
 *
 * This mock prevents the infinite recursion that was causing tests to hang
 * and provides a simple, predictable interface for cookie operations.
 */

export class Cookie {
  constructor(properties = {}) {
    this.key = properties.key || "";
    this.value = properties.value || "";
    this.domain = properties.domain || null;
    this.path = properties.path || "/";
    this.secure = properties.secure || false;
    this.httpOnly = properties.httpOnly || false;
    this.expires = properties.expires || null;
    this.maxAge = properties.maxAge || null;
    this.sameSite = properties.sameSite || "none";
  }

  toString() {
    return `${this.key}=${this.value}`;
  }

  toJSON() {
    return {
      key: this.key,
      value: this.value,
      domain: this.domain,
      path: this.path,
      secure: this.secure,
      httpOnly: this.httpOnly,
      expires: this.expires,
      maxAge: this.maxAge,
      sameSite: this.sameSite,
    };
  }

  // Static parse method
  static parse(str) {
    if (!str || typeof str !== "string") {
      return new Cookie();
    }

    const parts = str.split(";").map((part) => part.trim());
    const [key, value] = parts[0].split("=");
    return new Cookie({ key: key || "", value: value || "" });
  }
}

export class CookieJar {
  constructor() {
    this.cookies = [];
  }

  setCookie(cookie, url, callback) {
    try {
      if (typeof cookie === "string") {
        cookie = Cookie.parse(cookie);
      }

      // Simple validation to prevent issues
      if (cookie && cookie.key) {
        this.cookies.push(cookie);
      }

      if (callback) {
        callback(null);
      }
      return Promise.resolve();
    } catch (error) {
      if (callback) {
        callback(error);
      }
      return Promise.reject(error);
    }
  }

  getCookies(url, callback) {
    try {
      // Simple domain matching to prevent infinite loops
      const result = this.cookies.filter((cookie) => {
        // Always return true for test environment to avoid complex matching logic
        return cookie && cookie.key;
      });

      if (callback) {
        callback(null, result);
      }
      return Promise.resolve(result);
    } catch (error) {
      if (callback) {
        callback(error);
      }
      return Promise.reject(error);
    }
  }

  // Additional methods for compatibility
  getCookiesSync(url) {
    return this.cookies.filter((cookie) => cookie && cookie.key);
  }

  setCookieSync(cookie, url) {
    if (typeof cookie === "string") {
      cookie = Cookie.parse(cookie);
    }
    if (cookie && cookie.key) {
      this.cookies.push(cookie);
    }
    return true;
  }

  removeAllCookiesSync() {
    this.cookies = [];
    return true;
  }
}

// Default export for CommonJS compatibility
export default { Cookie, CookieJar };

// Named exports for ES modules
export { Cookie as cookie, CookieJar as cookieJar };
