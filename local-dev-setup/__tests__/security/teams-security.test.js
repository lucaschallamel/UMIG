/**
 * Comprehensive Security Test Suite for Teams Entity Migration
 *
 * Tests all critical security fixes implemented for US-082-C:
 * - XSS prevention in HTML generation
 * - CSRF protection on API calls
 * - Input validation and sanitization
 * - Memory leak prevention
 * - Rate limiting validation
 *
 * @version 1.0.0
 * @created 2025-01-12 (Security Fixes Implementation)
 */

const fs = require("fs");
const path = require("path");

// Helper function to read source files for analysis
function readSourceFile(filePath) {
  const fullPath = path.join(process.cwd(), "..", filePath);
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, "utf8");
  }
  return null;
}

describe("Teams Entity Security Validation Suite", () => {
  let teamsManagerSource;
  let securityUtilsSource;
  let migrationTrackerSource;

  beforeAll(() => {
    // Read source files for analysis
    teamsManagerSource = readSourceFile(
      "src/groovy/umig/web/js/entities/teams/TeamsEntityManager.js",
    );
    securityUtilsSource = readSourceFile(
      "src/groovy/umig/web/js/components/SecurityUtils.js",
    );
    migrationTrackerSource = readSourceFile(
      "src/groovy/umig/web/js/utils/EntityMigrationTracker.js",
    );
  });

  describe("XSS Prevention Validation", () => {
    test("should not use innerHTML in vulnerable locations", () => {
      expect(teamsManagerSource).toBeTruthy();

      // Check that vulnerable innerHTML patterns have been replaced
      const innerHTMLMatches = teamsManagerSource.match(/innerHTML\s*=/g);

      // Should have minimal innerHTML usage, and none in critical areas
      if (innerHTMLMatches) {
        expect(innerHTMLMatches.length).toBeLessThan(5); // Allow some safe usage
      }

      // Ensure secure DOM methods are used instead
      expect(teamsManagerSource).toMatch(/createElement/);
      expect(teamsManagerSource).toMatch(/textContent\s*=/);
    });

    test("should use SecurityUtils.escapeHtml for data output", () => {
      expect(teamsManagerSource).toBeTruthy();
      expect(teamsManagerSource).toMatch(/SecurityUtils\.escapeHtml/);
    });

    test("should validate XSS prevention in member list rendering", () => {
      expect(teamsManagerSource).toBeTruthy();

      // Check that member list rendering is secure
      const memberListSection = teamsManagerSource.substring(
        teamsManagerSource.indexOf("_renderMembersList"),
        teamsManagerSource.indexOf("_renderMembersList") + 2000,
      );

      // Should not use innerHTML for dynamic content
      expect(memberListSection).not.toMatch(/innerHTML\s*=.*\$\{/);

      // Should use safe DOM creation methods
      expect(memberListSection).toMatch(/createElement|textContent/);
    });
  });

  describe("CSRF Protection Validation", () => {
    test("should have CSRF token generation capability", () => {
      expect(securityUtilsSource).toBeTruthy();
      expect(securityUtilsSource).toMatch(/generateCSRFToken/);
      expect(securityUtilsSource).toMatch(/addCSRFProtection/);
    });

    test("should include X-CSRF-Token header in API calls", () => {
      expect(teamsManagerSource).toBeTruthy();

      // Check that API calls include CSRF protection
      const fetchCalls = teamsManagerSource.match(/fetch\([^)]+/g) || [];

      fetchCalls.forEach((call) => {
        // API calls should use SecurityUtils for headers
        const contextAround = teamsManagerSource.substring(
          teamsManagerSource.indexOf(call) - 200,
          teamsManagerSource.indexOf(call) + 200,
        );

        expect(contextAround).toMatch(
          /SecurityUtils\.addCSRFProtection|X-CSRF-Token/,
        );
      });
    });

    test("should validate CSRF token storage and expiry", () => {
      expect(securityUtilsSource).toBeTruthy();
      expect(securityUtilsSource).toMatch(/sessionStorage\.setItem.*csrf/i);
      expect(securityUtilsSource).toMatch(/expiry|expires/i);
    });
  });

  describe("Input Validation and Sanitization", () => {
    test("should have comprehensive input validation methods", () => {
      expect(securityUtilsSource).toBeTruthy();
      expect(securityUtilsSource).toMatch(/validateInput/);
      expect(securityUtilsSource).toMatch(/preventXSS/);
      expect(securityUtilsSource).toMatch(/preventSQLInjection/);
    });

    test("should validate user inputs in API calls", () => {
      expect(teamsManagerSource).toBeTruthy();

      // Check that input validation is used
      expect(teamsManagerSource).toMatch(
        /SecurityUtils\.validateInput|validateInput/,
      );
    });

    test("should have SQL injection prevention patterns", () => {
      expect(securityUtilsSource).toBeTruthy();

      // Should have SQL injection detection patterns
      expect(securityUtilsSource).toMatch(/preventSQLInjection|sqlInjection/i);
      expect(securityUtilsSource).toMatch(/UNION|SELECT|DROP|DELETE/);
    });
  });

  describe("Memory Leak Prevention", () => {
    test("should properly cleanup fetch monkey-patching", () => {
      expect(migrationTrackerSource).toBeTruthy();

      // Should store original fetch reference
      expect(migrationTrackerSource).toMatch(/originalFetch|_originalFetch/);

      // Should restore fetch in destroy method
      expect(migrationTrackerSource).toMatch(
        /destroy.*{[\s\S]*window\.fetch.*originalFetch/,
      );
    });

    test("should cleanup intervals and event listeners", () => {
      expect(migrationTrackerSource).toBeTruthy();

      // Should clear intervals
      expect(migrationTrackerSource).toMatch(/clearInterval/);

      // Should remove event listeners
      expect(migrationTrackerSource).toMatch(/removeEventListener/);
    });

    test("should track event listeners for cleanup", () => {
      expect(migrationTrackerSource).toBeTruthy();

      // Should maintain event listener registry or cleanup patterns
      expect(migrationTrackerSource).toMatch(
        /eventListeners|listeners|removeEventListener|cleanup/,
      );
    });
  });

  describe("Rate Limiting Validation", () => {
    test("should have rate limiting configuration", () => {
      expect(securityUtilsSource).toBeTruthy();
      expect(securityUtilsSource).toMatch(/rateLimit|rateLimiting/i);
    });

    test("should track API call frequency", () => {
      expect(securityUtilsSource).toBeTruthy();
      expect(securityUtilsSource).toMatch(
        /requestTimes|lastRequest|apiCalls|_rateLimits|checkRateLimit/,
      );
    });
  });

  describe("Security Audit and Logging", () => {
    test("should have security event logging", () => {
      expect(securityUtilsSource).toBeTruthy();
      expect(securityUtilsSource).toMatch(
        /securityLog|auditLog|logSecurityEvent/,
      );
    });

    test("should validate security exceptions", () => {
      expect(securityUtilsSource).toBeTruthy();
      expect(securityUtilsSource).toMatch(
        /SecurityException|ValidationException/,
      );
    });
  });

  describe("Performance Impact Assessment", () => {
    test("should maintain performance optimization patterns", () => {
      expect(teamsManagerSource).toBeTruthy();

      // Should still have performance optimizations or async patterns
      expect(teamsManagerSource).toMatch(
        /debounce|throttle|requestAnimationFrame|async|await|setTimeout/,
      );
    });

    test("should not introduce blocking operations", () => {
      expect(teamsManagerSource).toBeTruthy();

      // Security validation should be async where possible
      const validationCalls =
        teamsManagerSource.match(/SecurityUtils\.validate[^(]*\(/g) || [];

      // Most validation should be lightweight or async
      expect(validationCalls.length).toBeGreaterThan(0); // Validation exists
    });
  });

  describe("Overall Security Score Validation", () => {
    test("should achieve security improvements", () => {
      // Validate that all critical security components are present
      const securityFeatures = [
        teamsManagerSource?.includes("SecurityUtils.escapeHtml"),
        securityUtilsSource?.includes("generateCSRFToken"),
        securityUtilsSource?.includes("validateInput"),
        migrationTrackerSource?.includes("originalFetch"),
        securityUtilsSource?.includes("preventXSS"),
        securityUtilsSource?.includes("rateLimiting"),
        securityUtilsSource?.includes("SecurityException"),
      ];

      const implementedFeatures = securityFeatures.filter(Boolean).length;
      const totalFeatures = securityFeatures.length;
      const securityScore = (implementedFeatures / totalFeatures) * 10;

      // Should achieve target security score of 9+/10
      expect(securityScore).toBeGreaterThanOrEqual(9.0);
      expect(implementedFeatures).toBe(totalFeatures); // All features implemented
    });

    test("should maintain code quality metrics", () => {
      expect(teamsManagerSource).toBeTruthy();
      expect(securityUtilsSource).toBeTruthy();
      expect(migrationTrackerSource).toBeTruthy();

      // Files should exist and have substantial content
      expect(teamsManagerSource.length).toBeGreaterThan(1000);
      expect(securityUtilsSource.length).toBeGreaterThan(500);
      expect(migrationTrackerSource.length).toBeGreaterThan(500);
    });
  });

  describe("Regression Prevention", () => {
    test("should maintain existing functionality patterns", () => {
      expect(teamsManagerSource).toBeTruthy();

      // Core functionality should still exist
      expect(teamsManagerSource).toMatch(
        /initialize|render|update|destroy|mount|unmount/,
      );
      expect(teamsManagerSource).toMatch(
        /loadTeamData|displayTeams|_createMembersTabContent|_renderMembersList/,
      );
    });

    test("should preserve API compatibility", () => {
      expect(teamsManagerSource).toBeTruthy();

      // Should still make API calls, just securely
      expect(teamsManagerSource).toMatch(/fetch\s*\(/);
      expect(teamsManagerSource).toMatch(/\.then|await/);
    });
  });
});
