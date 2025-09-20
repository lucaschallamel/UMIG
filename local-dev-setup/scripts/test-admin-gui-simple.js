#!/usr/bin/env node

import { chromium } from "playwright";

async function testAdminGUI() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Enable verbose console logging
  page.on("console", (msg) => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`Page error: ${err}`));

  try {
    // Navigate directly to admin GUI REST endpoint
    console.log("Navigating to admin GUI REST endpoint...");
    const response = await page.goto(
      "http://localhost:8090/rest/scriptrunner/latest/custom/adminGui",
      {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      },
    );

    console.log(`Response status: ${response.status()}`);
    console.log(`Response URL: ${response.url()}`);

    // Wait a bit for JavaScript to load
    await page.waitForTimeout(5000);

    // Check what's available in window
    const windowInfo = await page.evaluate(() => {
      return {
        adminGui: typeof window.adminGui,
        moduleLoader: typeof window.moduleLoader,
        SecurityUtils: typeof window.SecurityUtils,
        jQuery: typeof window.jQuery,
        AJS: typeof window.AJS,
        title: document.title,
        bodyHTML: document.body
          ? document.body.innerHTML.substring(0, 500)
          : "No body",
      };
    });

    console.log("\nWindow object status:");
    console.log(JSON.stringify(windowInfo, null, 2));

    // Check for scripts loaded
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("script[src]")).map(
        (s) => s.src,
      );
    });

    console.log("\nLoaded scripts:");
    scripts.forEach((s) => console.log(`  - ${s}`));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    console.log("\nPress Enter to close browser...");
    await new Promise((resolve) => process.stdin.once("data", resolve));
    await browser.close();
  }
}

testAdminGUI().catch(console.error);
