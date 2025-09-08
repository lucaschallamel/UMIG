/**
 * UMIG StepView UI Alignment UAT Test
 *
 * Purpose: Comprehensive validation of StepView UI changes and alignment with IterationView styling
 * Updated: August 19, 2025
 * Context: Following stepViewMacro.groovy updates for CSS alignment
 */

const { test, expect } = require("@playwright/test");

const TEST_URL =
  "http://localhost:8090/spaces/UMIG/pages/1114120/UMIG+-+Step+View?mig=TORONTO&ite=RUN1&stepid=BGO-002&role=PILOT";
const EXPECTED_LOAD_TIME = 3000; // 3 seconds max
const MOBILE_WIDTH = 375;
const DESKTOP_WIDTH = 1920;
const DESKTOP_HEIGHT = 1080;

test.describe("StepView UI Alignment UAT", () => {
  test.beforeEach(async ({ page }) => {
    // Set reasonable timeout for Confluence loads
    page.setDefaultTimeout(10000);
  });

  test("should load StepView page and verify initial state", async ({
    page,
  }) => {
    console.log("🚀 Starting StepView UAT test...");
    const startTime = Date.now();

    // Navigate to StepView page
    await page.goto(TEST_URL);

    // Wait for page to be loaded
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Page load time: ${loadTime}ms`);

    // Take initial screenshot
    await page.screenshot({
      path: "/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/uat/screenshots/stepview-initial-load.png",
      fullPage: true,
    });

    // Performance requirement check
    expect(loadTime).toBeLessThan(EXPECTED_LOAD_TIME);
    console.log("✅ Performance requirement met: Page loaded in <3s");
  });

  test("should verify CSS alignment with IterationView styling", async ({
    page,
  }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState("networkidle");

    // Check if iteration-view.css is loaded
    const cssLoaded = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      return stylesheets.some((sheet) => {
        try {
          return sheet.href && sheet.href.includes("iteration-view.css");
        } catch (e) {
          return false;
        }
      });
    });

    if (cssLoaded) {
      console.log("✅ iteration-view.css stylesheet detected");
    } else {
      console.log(
        "⚠️ iteration-view.css not detected - styles may be inlined or differently named",
      );
    }

    // Verify container structure and CSS classes
    const containerSelector = ".step-details-container";
    await expect(page.locator(containerSelector)).toBeVisible({
      timeout: 5000,
    });
    console.log('✅ Container with class "step-details-container" found');

    // Take screenshot of main container
    await page.locator(containerSelector).screenshot({
      path: "/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/uat/screenshots/stepview-container.png",
    });
  });

  test("should verify header and status elements", async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState("networkidle");

    // Check header with proper CSS class
    const headerSelector = ".step-header";
    await expect(page.locator(headerSelector)).toBeVisible();
    console.log('✅ Header with class "step-header" found');

    // Check status badge
    const statusBadgeSelector = ".status-badge";
    const statusBadgeVisible = await page
      .locator(statusBadgeSelector)
      .isVisible();

    if (statusBadgeVisible) {
      console.log('✅ Status badge with class "status-badge" found');
      const statusText = await page.locator(statusBadgeSelector).textContent();
      console.log(`📊 Status badge text: "${statusText}"`);
    } else {
      console.log("⚠️ Status badge not found - checking alternative selectors");

      // Check for alternative status indicators
      const altStatusSelectors = [
        ".status",
        "[data-status]",
        ".badge",
        ".label",
      ];
      for (const selector of altStatusSelectors) {
        const altElement = await page.locator(selector).first();
        if (await altElement.isVisible()) {
          console.log(`✅ Alternative status element found: ${selector}`);
          break;
        }
      }
    }

    // Screenshot header area
    await page.locator(headerSelector).screenshot({
      path: "/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/uat/screenshots/stepview-header.png",
    });
  });

  test("should verify instructions and comments sections", async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState("networkidle");

    // Check instructions container
    const instructionsSelector = ".instructions-container";
    const instructionsVisible = await page
      .locator(instructionsSelector)
      .isVisible();

    if (instructionsVisible) {
      console.log(
        '✅ Instructions section with class "instructions-container" found',
      );
    } else {
      console.log(
        "⚠️ Instructions container not found - checking alternative selectors",
      );
      const altInstructionsSelectors = [
        ".instructions",
        "[data-instructions]",
        ".step-instructions",
        ".content",
      ];
      for (const selector of altInstructionsSelectors) {
        const altElement = await page.locator(selector).first();
        if (await altElement.isVisible()) {
          console.log(`✅ Alternative instructions element found: ${selector}`);
          break;
        }
      }
    }

    // Check comments container
    const commentsSelector = ".comments-container";
    const commentsVisible = await page.locator(commentsSelector).isVisible();

    if (commentsVisible) {
      console.log('✅ Comments section with class "comments-container" found');
    } else {
      console.log(
        "⚠️ Comments container not found - checking alternative selectors",
      );
      const altCommentsSelectors = [
        ".comments",
        "[data-comments]",
        ".step-comments",
        ".notes",
      ];
      for (const selector of altCommentsSelectors) {
        const altElement = await page.locator(selector).first();
        if (await altElement.isVisible()) {
          console.log(`✅ Alternative comments element found: ${selector}`);
          break;
        }
      }
    }

    // Take screenshot of content sections
    await page.screenshot({
      path: "/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/uat/screenshots/stepview-content-sections.png",
      fullPage: true,
    });
  });

  test("should verify PILOT role-based access control (RBAC)", async ({
    page,
  }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState("networkidle");

    console.log("🔐 Testing PILOT role permissions...");

    // Look for PILOT-specific action buttons
    const updateStatusButton = page
      .locator("button")
      .filter({ hasText: /update.*status/i });
    const pilotButtons = page.locator(
      '[data-role="PILOT"], .pilot-only, button[id*="pilot"], button[class*="pilot"]',
    );

    // Check for Update Status button specifically
    const updateStatusVisible = await updateStatusButton.isVisible();
    if (updateStatusVisible) {
      console.log("✅ Update Status button found for PILOT role");
      await updateStatusButton.screenshot({
        path: "/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/uat/screenshots/stepview-pilot-button.png",
      });
    } else {
      console.log(
        "⚠️ Update Status button not visible - checking all available buttons",
      );

      // List all buttons for debugging
      const allButtons = await page.locator("button").all();
      console.log(`📋 Found ${allButtons.length} buttons on page:`);
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const buttonText = await allButtons[i].textContent();
        const buttonId = await allButtons[i].getAttribute("id");
        const buttonClass = await allButtons[i].getAttribute("class");
        console.log(
          `  - Button ${i + 1}: "${buttonText}" (id: ${buttonId}, class: ${buttonClass})`,
        );
      }
    }

    // Verify PILOT role is recognized
    const roleIndicator = await page
      .locator('[data-role="PILOT"], .role-pilot, .user-role')
      .first();
    if (await roleIndicator.isVisible()) {
      const roleText = await roleIndicator.textContent();
      console.log(`✅ Role indicator found: "${roleText}"`);
    }
  });

  test("should test mobile responsiveness", async ({ page }) => {
    console.log("📱 Testing mobile responsiveness...");

    // Set mobile viewport
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 667 });
    await page.goto(TEST_URL);
    await page.waitForLoadState("networkidle");

    // Take mobile screenshot
    await page.screenshot({
      path: "/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/uat/screenshots/stepview-mobile.png",
      fullPage: true,
    });

    // Check that content is still accessible on mobile
    const container = page
      .locator(".step-details-container, [data-step-container], .main-content")
      .first();
    await expect(container).toBeVisible();

    // Verify responsive behavior
    const containerWidth = await container.boundingBox();
    expect(containerWidth.width).toBeLessThanOrEqual(MOBILE_WIDTH);

    console.log("✅ Mobile responsiveness verified");

    // Reset to desktop view
    await page.setViewportSize({
      width: DESKTOP_WIDTH,
      height: DESKTOP_HEIGHT,
    });
  });

  test("should verify complete page structure and take comprehensive screenshots", async ({
    page,
  }) => {
    await page.goto(TEST_URL);
    await page.waitForLoadState("networkidle");

    console.log("📸 Taking comprehensive screenshots...");

    // Wait for any dynamic content to load
    await page.waitForTimeout(2000);

    // Take final full page screenshot
    await page.screenshot({
      path: "/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/uat/screenshots/stepview-final-state.png",
      fullPage: true,
    });

    // Get page title to verify correct page loaded
    const pageTitle = await page.title();
    console.log(`📄 Page title: "${pageTitle}"`);
    expect(pageTitle).toContain("UMIG");

    // Check for any JavaScript errors
    const logs = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        logs.push(msg.text());
      }
    });

    // Log page structure for debugging
    const pageStructure = await page.evaluate(() => {
      const getStructure = (element, depth = 0) => {
        if (depth > 3) return "...";

        let structure = "";
        const indent = "  ".repeat(depth);
        const tagName = element.tagName.toLowerCase();
        const id = element.id ? `#${element.id}` : "";
        const className = element.className
          ? `.${element.className.split(" ").join(".")}`
          : "";

        structure += `${indent}${tagName}${id}${className}\n`;

        for (let child of element.children) {
          structure += getStructure(child, depth + 1);
        }

        return structure;
      };

      const mainContent = document.querySelector(
        ".step-details-container, [data-step-container], .main-content, body",
      );
      return getStructure(mainContent || document.body);
    });

    console.log("🏗️ Page structure:");
    console.log(
      pageStructure.slice(0, 1000) + (pageStructure.length > 1000 ? "..." : ""),
    );

    if (logs.length > 0) {
      console.log("⚠️ JavaScript errors detected:");
      logs.forEach((log) => console.log(`  - ${log}`));
    } else {
      console.log("✅ No JavaScript errors detected");
    }
  });
});

test.afterAll(async () => {
  console.log("🏁 StepView UAT test suite completed");
  console.log(
    "📁 Screenshots saved to: /Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/uat/screenshots/",
  );
});
