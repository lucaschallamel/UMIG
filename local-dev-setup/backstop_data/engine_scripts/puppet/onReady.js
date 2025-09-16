module.exports = async (page, scenario, vp) => {
  console.log("SCENARIO > " + scenario.label + " > onReady");

  // Wait for components to be fully initialized
  await page.evaluate(() => {
    return new Promise((resolve) => {
      // Check if UMIG components are loaded
      const checkComponents = () => {
        const components = document.querySelectorAll("[data-component-id]");
        const initialized = Array.from(components).every(
          (comp) =>
            comp.classList.contains("initialized") ||
            comp.dataset.initialized === "true",
        );

        if (initialized || Date.now() - startTime > 5000) {
          resolve();
        } else {
          setTimeout(checkComponents, 100);
        }
      };

      const startTime = Date.now();
      checkComponents();
    });
  });

  // Remove focus rings and hover states for consistent screenshots
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = `
      *:focus {
        outline: none !important;
        box-shadow: none !important;
      }
      
      *:hover {
        transform: none !important;
        transition: none !important;
      }
      
      .hover, .focus, .active {
        background-color: initial !important;
        color: initial !important;
        border-color: initial !important;
      }
    `;
    document.head.appendChild(style);
  });

  // Additional wait for any async operations
  await page.waitForTimeout(100);
};
