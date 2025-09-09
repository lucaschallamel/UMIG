/**
 * Performance Tests for UMIG Admin GUI
 * Tests the performance optimizations and loading strategies
 */

const { test, expect } = require("@playwright/test");

test.describe("Admin GUI Performance", () => {
  test("should suppress Confluence warnings", async ({ page }) => {
    let consoleWarnings = [];

    page.on("console", (msg) => {
      if (msg.type() === "warn") {
        consoleWarnings.push(msg.text());
      }
    });

    await page.goto(
      "/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui",
    );

    // Check that AJS.params warnings are suppressed
    const ajsWarnings = consoleWarnings.filter((w) => w.includes("AJS.params"));
    expect(ajsWarnings.length).toBe(0);
  });

  test("should load within performance target", async ({ page }) => {
    const startTime = Date.now();

    await page.goto(
      "/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui",
    );
    await page.waitForSelector('[data-umig-ready="true"]', { timeout: 5000 });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // 5 second target
  });

  test("should use browser caching with stable version", async ({ page }) => {
    // First load
    await page.goto(
      "/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui",
    );

    // Check that resources use version parameter
    const requests = [];
    page.on("request", (request) => {
      if (request.url().includes("/js/")) {
        requests.push(request.url());
      }
    });

    await page.reload();

    // Verify version parameter is consistent
    const versionedRequests = requests.filter((r) => r.includes("v=2.4.0"));
    expect(versionedRequests.length).toBeGreaterThan(0);
  });

  test("should measure actual performance metrics", async ({ page }) => {
    await page.goto(
      "/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui",
    );

    // Inject performance measurement
    const metrics = await page.evaluate(() => {
      return {
        navigationTiming:
          performance.timing.loadEventEnd - performance.timing.navigationStart,
        resourceCount: performance.getEntriesByType("resource").length,
        // Get our custom metrics if available
        customMetrics: window.UMIG_PERFORMANCE_METRICS || null,
      };
    });

    console.log("Performance Metrics:", metrics);

    // Validate metrics
    expect(metrics.navigationTiming).toBeLessThan(10000); // 10s max
    expect(metrics.resourceCount).toBeGreaterThan(0);
  });

  test("iframe isolation mode should load faster", async ({ page }) => {
    const startTime = Date.now();

    await page.goto(
      "/confluence/pages/viewpage.action?pageId=12345&umig_iframe=true#umig-admin-gui",
    );
    await page.waitForSelector("#umig-admin-iframe", { timeout: 3000 });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should be much faster in iframe mode
  });

  test("delayed loading mode should wait appropriately", async ({ page }) => {
    await page.goto(
      "/confluence/pages/viewpage.action?pageId=12345&umig_delay=true#umig-admin-gui",
    );

    // Check that loader appears first
    await expect(page.locator("#umig-delayed-loader")).toBeVisible();

    // Wait for actual content
    await page.waitForSelector("#umig-admin-gui-root", {
      state: "visible",
      timeout: 5000,
    });

    // Loader should be hidden
    await expect(page.locator("#umig-delayed-loader")).toBeHidden();
  });
});
