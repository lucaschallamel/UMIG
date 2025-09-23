/**
 * EntityManager E2E Component Test Suite
 *
 * Comprehensive end-to-end testing for all EntityManager components
 * validating component loading, data rendering, and CRUD operations.
 *
 * Supports: US-087 Phase 2 (Admin GUI Component Migration)
 * Tests: Teams, Users, Environments, Applications, Labels, MigrationTypes, IterationTypes
 */

const puppeteer = require("puppeteer");

// Test configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:8090";
const USERNAME = process.env.CONFLUENCE_USER || "admin";
const PASSWORD = process.env.CONFLUENCE_PASSWORD || "admin";
const HEADLESS_MODE = process.env.HEADLESS === "true";
const TEST_TIMEOUT = 30000; // 30 seconds

// EntityManagers to test with their expected behaviors
const ENTITY_CONFIGURATIONS = [
  {
    name: "teams",
    displayName: "Teams",
    hasTable: true,
    hasCreateButton: true,
    expectedColumns: ["Name", "Email", "Active", "Actions"],
    priority: "HIGH", // Core entity
  },
  {
    name: "users",
    displayName: "Users",
    hasTable: true,
    hasCreateButton: true,
    expectedColumns: ["Username", "Role", "Team", "Active", "Actions"],
    priority: "HIGH", // Core entity
  },
  {
    name: "environments",
    displayName: "Environments",
    hasTable: true,
    hasCreateButton: true,
    expectedColumns: ["Name", "Type", "Status", "Actions"],
    priority: "HIGH", // Core entity
  },
  {
    name: "applications",
    displayName: "Applications",
    hasTable: true,
    hasCreateButton: true,
    expectedColumns: ["Name", "Version", "Owner", "Actions"],
    priority: "HIGH", // Core entity
  },
  {
    name: "labels",
    displayName: "Labels",
    hasTable: true,
    hasCreateButton: true,
    expectedColumns: ["Name", "Type", "Color", "Actions"],
    priority: "MEDIUM",
  },
  {
    name: "migrationTypes",
    displayName: "Migration Types",
    hasTable: true,
    hasCreateButton: false, // Configuration entity
    expectedColumns: ["Code", "Name", "Description", "Active"],
    priority: "LOW",
  },
  {
    name: "iterationTypes",
    displayName: "Iteration Types",
    hasTable: true,
    hasCreateButton: false, // Configuration entity
    expectedColumns: ["Code", "Name", "Workflow", "Active"],
    priority: "LOW",
  },
];

describe("EntityManager E2E Component Tests", () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: HEADLESS_MODE,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      defaultViewport: {
        width: 1280,
        height: 800,
      },
    });
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    page = await browser.newPage();

    // Capture console logs for debugging
    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("[US-087]") ||
        text.includes("EntityManager") ||
        text.includes("ERROR")
      ) {
        console.log(`Browser Console: ${text}`);
      }
    });

    // Capture page errors
    page.on("pageerror", (error) => {
      console.error(`Page Error: ${error.message}`);
    });

    // Login to Confluence
    await loginToConfluence(page);
  }, TEST_TIMEOUT);

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe("Component Loading Validation", () => {
    test(
      "should load ComponentOrchestrator successfully",
      async () => {
        await page.goto(`${BASE_URL}/display/UMIG/Admin+GUI`);

        // Wait for ComponentOrchestrator initialization
        await page.waitForFunction(
          () => window.ComponentOrchestrator !== undefined,
          { timeout: 10000 },
        );

        const orchestratorLoaded = await page.evaluate(() => {
          return (
            window.ComponentOrchestrator &&
            typeof window.ComponentOrchestrator.initialize === "function"
          );
        });

        expect(orchestratorLoaded).toBe(true);
      },
      TEST_TIMEOUT,
    );

    test(
      "should load all EntityManager classes",
      async () => {
        await page.goto(`${BASE_URL}/display/UMIG/Admin+GUI`);

        // Wait for admin GUI container
        await page.waitForSelector("#admin-gui-container", { timeout: 10000 });

        // Check each EntityManager is loaded
        const entityManagersLoaded = await page.evaluate((entities) => {
          const results = {};
          entities.forEach((entity) => {
            const managerName = `${entity.name.charAt(0).toUpperCase()}${entity.name.slice(1)}EntityManager`;
            results[entity.name] = window[managerName] !== undefined;
          });
          return results;
        }, ENTITY_CONFIGURATIONS);

        // Verify all EntityManagers are loaded
        Object.entries(entityManagersLoaded).forEach(([entity, loaded]) => {
          expect(loaded).toBe(true);
        });
      },
      TEST_TIMEOUT,
    );
  });

  describe("EntityManager Rendering Tests", () => {
    test.each(ENTITY_CONFIGURATIONS)(
      "should render $displayName EntityManager correctly",
      async (config) => {
        await page.goto(`${BASE_URL}/display/UMIG/Admin+GUI`);
        await page.waitForSelector("#admin-gui-container", { timeout: 10000 });

        // Click on entity navigation
        const navSelector = `[data-entity="${config.name}"]`;
        await page.waitForSelector(navSelector, { timeout: 5000 });
        await page.click(navSelector);

        // Wait for EntityManager to render
        await page.waitForSelector("#entityManagerContainer", {
          timeout: 5000,
        });

        // Verify container has content
        const hasContent = await page.evaluate(() => {
          const container = document.getElementById("entityManagerContainer");
          return container && container.children.length > 0;
        });

        expect(hasContent).toBe(true);

        // Check for table if expected
        if (config.hasTable) {
          const tableExists = await page.evaluate(() => {
            return (
              document.querySelector("table.entity-table") !== null ||
              document.querySelector(".aui table") !== null
            );
          });
          expect(tableExists).toBe(true);
        }

        // Check for create button if expected
        if (config.hasCreateButton) {
          const createButtonExists = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            return buttons.some(
              (btn) =>
                btn.textContent.includes("Create") ||
                btn.textContent.includes("Add") ||
                btn.textContent.includes("New"),
            );
          });
          expect(createButtonExists).toBe(true);
        }
      },
      TEST_TIMEOUT,
    );
  });

  describe("Data Loading and Display", () => {
    test.each(ENTITY_CONFIGURATIONS.filter((e) => e.priority === "HIGH"))(
      "should load and display data for $displayName",
      async (config) => {
        await page.goto(`${BASE_URL}/display/UMIG/Admin+GUI`);
        await page.waitForSelector("#admin-gui-container", { timeout: 10000 });

        // Navigate to entity
        const navSelector = `[data-entity="${config.name}"]`;
        await page.click(navSelector);

        // Wait for data to load
        await page.waitForFunction(
          () => {
            const table = document.querySelector("table");
            return table && table.querySelectorAll("tbody tr").length >= 0;
          },
          { timeout: 10000 },
        );

        // Check table headers match expected columns
        if (config.expectedColumns) {
          const headers = await page.evaluate(() => {
            const headerElements = document.querySelectorAll("table thead th");
            return Array.from(headerElements).map((th) =>
              th.textContent.trim(),
            );
          });

          config.expectedColumns.forEach((expectedColumn) => {
            expect(headers.some((h) => h.includes(expectedColumn))).toBe(true);
          });
        }
      },
      TEST_TIMEOUT,
    );
  });

  describe("CRUD Operations", () => {
    test(
      "should open create modal for Teams",
      async () => {
        await page.goto(`${BASE_URL}/display/UMIG/Admin+GUI`);
        await page.waitForSelector("#admin-gui-container", { timeout: 10000 });

        // Navigate to Teams
        await page.click('[data-entity="teams"]');
        await page.waitForSelector("#entityManagerContainer", {
          timeout: 5000,
        });

        // Click Create button
        const createButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          return buttons.find((btn) => btn.textContent.includes("Create"));
        });

        if (createButton) {
          await createButton.click();

          // Wait for modal to appear
          await page.waitForSelector(".modal, .aui-dialog", { timeout: 5000 });

          const modalVisible = await page.evaluate(() => {
            const modal = document.querySelector(".modal, .aui-dialog");
            return modal && modal.style.display !== "none";
          });

          expect(modalVisible).toBe(true);
        }
      },
      TEST_TIMEOUT,
    );
  });

  describe("Component Integration", () => {
    test(
      "should integrate with ComponentOrchestrator event system",
      async () => {
        await page.goto(`${BASE_URL}/display/UMIG/Admin+GUI`);
        await page.waitForSelector("#admin-gui-container", { timeout: 10000 });

        // Setup event listener
        const eventFired = await page.evaluate(() => {
          return new Promise((resolve) => {
            if (window.ComponentOrchestrator) {
              window.ComponentOrchestrator.on("entity:loaded", () => {
                resolve(true);
              });

              // Trigger entity load
              const navItem = document.querySelector('[data-entity="teams"]');
              if (navItem) navItem.click();

              // Timeout after 5 seconds
              setTimeout(() => resolve(false), 5000);
            } else {
              resolve(false);
            }
          });
        });

        expect(eventFired).toBe(true);
      },
      TEST_TIMEOUT,
    );
  });

  describe("Error Handling", () => {
    test(
      "should handle API errors gracefully",
      async () => {
        await page.goto(`${BASE_URL}/display/UMIG/Admin+GUI`);
        await page.waitForSelector("#admin-gui-container", { timeout: 10000 });

        // Intercept API requests to simulate error
        await page.setRequestInterception(true);
        page.on("request", (request) => {
          if (
            request.url().includes("/rest/scriptrunner/latest/custom/teams")
          ) {
            request.respond({
              status: 500,
              contentType: "application/json",
              body: JSON.stringify({ error: "Internal Server Error" }),
            });
          } else {
            request.continue();
          }
        });

        // Navigate to Teams
        await page.click('[data-entity="teams"]');

        // Wait for error message
        await page.waitForFunction(
          () => {
            const errorElements = document.querySelectorAll(
              ".error-message, .aui-message-error",
            );
            return errorElements.length > 0;
          },
          { timeout: 5000 },
        );

        const errorDisplayed = await page.evaluate(() => {
          const errorElement = document.querySelector(
            ".error-message, .aui-message-error",
          );
          return errorElement !== null;
        });

        expect(errorDisplayed).toBe(true);
      },
      TEST_TIMEOUT,
    );
  });

  describe("Performance Validation", () => {
    test(
      "should load EntityManagers within performance targets",
      async () => {
        await page.goto(`${BASE_URL}/display/UMIG/Admin+GUI`);
        await page.waitForSelector("#admin-gui-container", { timeout: 10000 });

        const loadTimes = {};

        for (const config of ENTITY_CONFIGURATIONS.slice(0, 3)) {
          // Test first 3 for speed
          const startTime = Date.now();

          await page.click(`[data-entity="${config.name}"]`);
          await page.waitForSelector("#entityManagerContainer", {
            timeout: 5000,
          });

          const loadTime = Date.now() - startTime;
          loadTimes[config.name] = loadTime;

          // Should load within 2 seconds
          expect(loadTime).toBeLessThan(2000);
        }

        console.log("EntityManager Load Times:", loadTimes);
      },
      TEST_TIMEOUT,
    );
  });
});

// Helper function to login to Confluence
async function loginToConfluence(page) {
  await page.goto(`${BASE_URL}/login.action`);

  // Check if already logged in
  const loggedIn = await page.evaluate(() => {
    return document.querySelector("#user-menu-link") !== null;
  });

  if (!loggedIn) {
    await page.type("#os_username", USERNAME);
    await page.type("#os_password", PASSWORD);
    await page.click("#loginButton");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
  }
}
