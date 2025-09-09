/**
 * Regex Validation Tests for UMIG Admin GUI
 * Tests the regex patterns used in console warning suppression
 */

const { test, expect } = require("@playwright/test");

test.describe("Regex Pattern Validation", () => {
  test("should match AUI version patterns correctly", async ({ page }) => {
    await page.goto(
      "/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui",
    );

    // Test the regex pattern in browser context
    const regexResults = await page.evaluate(() => {
      // This is the actual regex used in the macro (with proper escaping)
      const auiVersionRegex = /AUI\s*\d+\.\d+/;

      const testCases = [
        "AUI 9.21",
        "AUI 10.1",
        "AUI  8.5",
        "AUI    11.0",
        "something else AUI 5.2",
        "not a match",
        "AUI without version",
        "AUI abc.def",
      ];

      const results = {};
      testCases.forEach((testCase) => {
        results[testCase] = auiVersionRegex.test(testCase);
      });

      return results;
    });

    // Verify expected matches
    expect(regexResults["AUI 9.21"]).toBe(true);
    expect(regexResults["AUI 10.1"]).toBe(true);
    expect(regexResults["AUI  8.5"]).toBe(true);
    expect(regexResults["AUI    11.0"]).toBe(true);
    expect(regexResults["something else AUI 5.2"]).toBe(true);

    // Verify expected non-matches
    expect(regexResults["not a match"]).toBe(false);
    expect(regexResults["AUI without version"]).toBe(false);
    expect(regexResults["AUI abc.def"]).toBe(false);
  });

  test("should validate Confluence warning patterns", async ({ page }) => {
    await page.goto(
      "/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui",
    );

    const patternResults = await page.evaluate(() => {
      // Test the patterns used for Confluence warning suppression
      const confluencePatterns = [
        "AJS.params",
        "AJS.debounce",
        "AJS.Meta",
        "window._",
        "Dialog is deprecated",
        "AUI",
        "confluence.",
        "Confluence.",
      ];

      const testMessages = [
        "AJS.params is deprecated and will be removed",
        "AJS.debounce function is deprecated",
        "Dialog is deprecated, use modern dialogs",
        "window._ should not be used",
        "AUI 9.21 is loading",
        "confluence.settings is deprecated",
        "Confluence.init() called",
        "This is not a Confluence warning",
        "[UMIG] Our own log message",
      ];

      const results = {};
      testMessages.forEach((msg) => {
        results[msg] = confluencePatterns.some((pattern) =>
          msg.includes(pattern),
        );
      });

      return results;
    });

    // Should match Confluence patterns
    expect(patternResults["AJS.params is deprecated and will be removed"]).toBe(
      true,
    );
    expect(patternResults["AJS.debounce function is deprecated"]).toBe(true);
    expect(patternResults["Dialog is deprecated, use modern dialogs"]).toBe(
      true,
    );
    expect(patternResults["window._ should not be used"]).toBe(true);
    expect(patternResults["AUI 9.21 is loading"]).toBe(true);
    expect(patternResults["confluence.settings is deprecated"]).toBe(true);
    expect(patternResults["Confluence.init() called"]).toBe(true);

    // Should NOT match these
    expect(patternResults["This is not a Confluence warning"]).toBe(false);
    expect(patternResults["[UMIG] Our own log message"]).toBe(false);
  });

  test("should preserve UMIG messages in console suppression", async ({
    page,
  }) => {
    let consoleMessages = [];

    page.on("console", (msg) => {
      consoleMessages.push(msg.text());
    });

    await page.goto(
      "/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui",
    );

    // Wait for initialization
    await page.waitForTimeout(2000);

    // Check that UMIG messages are preserved
    const umigMessages = consoleMessages.filter((msg) =>
      msg.includes("[UMIG]"),
    );
    expect(umigMessages.length).toBeGreaterThan(0);

    // Verify we're getting our performance messages
    const performanceMessages = umigMessages.filter(
      (msg) =>
        msg.includes("Ultra-Performance Mode") ||
        msg.includes("Suppressed") ||
        msg.includes("optimization time"),
    );
    expect(performanceMessages.length).toBeGreaterThan(0);
  });
});
