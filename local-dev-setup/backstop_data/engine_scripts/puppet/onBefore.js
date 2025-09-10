module.exports = async (page, scenario, vp) => {
  console.log("SCENARIO > " + scenario.label);

  // Set viewport
  await page.setViewport({
    width: vp.width,
    height: vp.height,
  });

  // Disable animations for consistent screenshots
  await page.addStyleTag({
    content: `
      *, *:before, *:after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      
      .spinner, .loading-indicator {
        animation: none !important;
      }
    `,
  });

  // Set default font for consistency
  await page.addStyleTag({
    content: `
      body, body * {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif !important;
        font-smoothing: antialiased !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
      }
    `,
  });

  // Wait for page to be fully loaded
  await page.evaluate(() => {
    return new Promise((resolve) => {
      if (document.readyState === "complete") {
        resolve();
      } else {
        window.addEventListener("load", resolve);
      }
    });
  });

  // Wait for any lazy-loaded content
  await page.waitForTimeout(500);
};
