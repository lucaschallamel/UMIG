/**
 * E2E test for EntityManager loading and functionality
 * Converted from test-entitymanager-loading.js to Jest E2E test
 *
 * Tests verify that all EntityManagers load properly in the admin GUI
 * and that the component architecture works correctly in US-087 Phase 1
 *
 * Related to Sprint 7 work on admin GUI component migration and TD-005 JavaScript infrastructure
 */

const { chromium } = require("playwright");
const path = require("path");

describe("EntityManager Loading E2E Tests", () => {
  let browser;
  let context;
  let page;

  const TEST_URL =
    "http://localhost:8090/rest/scriptrunner/latest/custom/adminGui";
  const LOGIN_URL = "http://localhost:8090/confluence/login.action";
  const TIMEOUT = 30000;

  // EntityManagers to test (US-087 Phase 1 entities)
  const ENTITY_MANAGERS = [
    "teams",
    "users",
    "environments",
    "applications",
    "labels",
    "migrationTypes",
    "iterationTypes",
  ];

  // Confluence credentials
  const CONFLUENCE_USER = process.env.CONFLUENCE_ADMIN_USER || "admin";
  const CONFLUENCE_PASS = process.env.CONFLUENCE_ADMIN_PASSWORD || "admin";

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: true, // Set to false for debugging
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: TIMEOUT,
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });

    page = await context.newPage();

    // Set up console monitoring
    const consoleErrors = [];
    const consoleWarnings = [];

    page.on("console", (msg) => {
      const text = msg.text();
      const type = msg.type();

      if (type === "error") {
        consoleErrors.push(text);
        if (
          text.includes("Failed to load") ||
          text.includes("not found") ||
          text.includes("Cannot read")
        ) {
          console.error(`Console Error: ${text}`);
        }
      } else if (type === "warning") {
        consoleWarnings.push(text);
      }
    });

    // Store for test access
    page.consoleErrors = consoleErrors;
    page.consoleWarnings = consoleWarnings;
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe("Confluence Authentication", () => {
    test("should authenticate with Confluence successfully", async () => {
      // Navigate to Confluence
      await page.goto(LOGIN_URL, {
        waitUntil: "networkidle",
        timeout: TIMEOUT,
      });

      // Check if we need to login
      const needsLogin = await page
        .locator("#os_username, #loginButton")
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (needsLogin) {
        // Perform login
        await page.fill("#os_username", CONFLUENCE_USER);
        await page.fill("#os_password", CONFLUENCE_PASS);

        // Check for remember me checkbox
        const rememberMe = await page
          .locator("#os_cookie")
          .isVisible()
          .catch(() => false);
        if (rememberMe) {
          await page.check("#os_cookie");
        }

        // Submit login
        await page.click("#loginButton");
        await page.waitForLoadState("networkidle");

        // Verify login success
        const currentUrl = page.url();
        expect(currentUrl).not.toContain("login.action");
      }

      // Verify we're authenticated
      const isAuthenticated = !page.url().includes("login.action");
      expect(isAuthenticated).toBe(true);
    });
  });

  describe("Admin GUI Loading", () => {
    test("should load admin GUI page successfully", async () => {
      await page.goto(TEST_URL, {
        waitUntil: "networkidle",
        timeout: TIMEOUT,
      });

      // Wait for admin GUI to initialize
      await page.waitForTimeout(5000);

      // Check if admin GUI object exists
      const adminGuiExists = await page.evaluate(() => {
        return typeof window.adminGui !== "undefined";
      });

      expect(adminGuiExists).toBe(true);
    });

    test("should have module loader available", async () => {
      const moduleLoaderStatus = await page.evaluate(() => {
        if (typeof window.moduleLoader !== "undefined") {
          return {
            exists: true,
            loadedModules: window.moduleLoader.loadedModules || [],
            failedModules: window.moduleLoader.failedModules || [],
          };
        }
        return { exists: false };
      });

      expect(moduleLoaderStatus.exists).toBe(true);
      expect(moduleLoaderStatus.failedModules.length).toBe(0);
      expect(moduleLoaderStatus.loadedModules.length).toBeGreaterThan(0);
    });

    test("should have SecurityUtils available", async () => {
      const securityUtilsStatus = await page.evaluate(() => {
        return {
          exists: typeof window.SecurityUtils !== "undefined",
          methods: {
            sanitizeInput:
              typeof window.SecurityUtils?.sanitizeInput === "function",
            sanitizeHtml:
              typeof window.SecurityUtils?.sanitizeHtml === "function",
            validateInput:
              typeof window.SecurityUtils?.validateInput === "function",
          },
        };
      });

      expect(securityUtilsStatus.exists).toBe(true);
      expect(securityUtilsStatus.methods.sanitizeInput).toBe(true);
      expect(securityUtilsStatus.methods.sanitizeHtml).toBe(true);
      expect(securityUtilsStatus.methods.validateInput).toBe(true);
    });
  });

  describe("EntityManager Availability", () => {
    test.each(ENTITY_MANAGERS)(
      "should have %s EntityManager available",
      async (entity) => {
        const managerName =
          entity.charAt(0).toUpperCase() + entity.slice(1) + "EntityManager";

        const isAvailable = await page.evaluate((name) => {
          return typeof window[name] !== "undefined";
        }, managerName);

        const isLoaded = await page.evaluate((entity) => {
          return (
            window.adminGui &&
            window.adminGui.componentManagers &&
            window.adminGui.componentManagers[entity] !== undefined
          );
        }, entity);

        expect(isAvailable).toBe(true);
        expect(isLoaded).toBe(true);
      },
    );

    test("should have all EntityManagers properly registered", async () => {
      const registrationStatus = await page.evaluate((entities) => {
        const results = {};

        for (const entity of entities) {
          const managerName =
            entity.charAt(0).toUpperCase() + entity.slice(1) + "EntityManager";

          results[entity] = {
            windowAvailable: typeof window[managerName] !== "undefined",
            adminGuiRegistered:
              window.adminGui?.componentManagers?.[entity] !== undefined,
            isInitialized:
              window.adminGui?.componentManagers?.[entity]?.isInitialized ||
              false,
          };
        }

        return results;
      }, ENTITY_MANAGERS);

      for (const entity of ENTITY_MANAGERS) {
        const status = registrationStatus[entity];
        expect(status.windowAvailable).toBe(true);
        expect(status.adminGuiRegistered).toBe(true);
        // Note: isInitialized may be false until first use, which is acceptable
      }
    });
  });

  describe("EntityManager Navigation and Functionality", () => {
    test.each(ENTITY_MANAGERS)(
      "should navigate to %s entity successfully",
      async (entity) => {
        // Clear any previous console errors
        page.consoleErrors.length = 0;

        // Navigate to entity
        await page.evaluate((entity) => {
          if (window.adminGui && window.adminGui.loadCurrentSection) {
            window.adminGui.currentEntity = entity;
            window.adminGui.loadCurrentSection();
          }
        }, entity);

        // Wait for potential errors and rendering
        await page.waitForTimeout(2000);

        // Check if EntityManager was used successfully
        const usedEntityManager = await page.evaluate((entity) => {
          const manager = window.adminGui?.componentManagers?.[entity];
          return manager && manager.isInitialized;
        }, entity);

        // Check for critical console errors during navigation
        const criticalErrors = page.consoleErrors.filter(
          (error) =>
            error.includes("Failed to load") ||
            error.includes("not found") ||
            error.includes("Cannot read properties"),
        );

        expect(criticalErrors.length).toBe(0);
        expect(usedEntityManager).toBe(true);
      },
    );

    test("should maintain component architecture integrity during navigation", async () => {
      // Test navigation between different entities to ensure no memory leaks or errors
      for (const entity of ENTITY_MANAGERS.slice(0, 3)) {
        // Test first 3 for performance
        await page.evaluate((entity) => {
          if (window.adminGui && window.adminGui.loadCurrentSection) {
            window.adminGui.currentEntity = entity;
            window.adminGui.loadCurrentSection();
          }
        }, entity);

        await page.waitForTimeout(1000);

        // Check component orchestrator health
        const orchestratorHealth = await page.evaluate(() => {
          return {
            exists: typeof window.ComponentOrchestrator !== "undefined",
            registeredComponents:
              window.ComponentOrchestrator?.registeredComponents?.size || 0,
            activeComponents:
              window.ComponentOrchestrator?.activeComponents?.size || 0,
          };
        });

        expect(orchestratorHealth.exists).toBe(true);
        expect(orchestratorHealth.registeredComponents).toBeGreaterThan(0);
      }
    });
  });

  describe("Component Architecture Validation", () => {
    test("should have ComponentOrchestrator available and functional", async () => {
      const orchestratorStatus = await page.evaluate(() => {
        return {
          exists: typeof window.ComponentOrchestrator !== "undefined",
          methods: {
            register:
              typeof window.ComponentOrchestrator?.register === "function",
            initialize:
              typeof window.ComponentOrchestrator?.initialize === "function",
            getComponent:
              typeof window.ComponentOrchestrator?.getComponent === "function",
          },
          registeredComponents:
            window.ComponentOrchestrator?.registeredComponents?.size || 0,
        };
      });

      expect(orchestratorStatus.exists).toBe(true);
      expect(orchestratorStatus.methods.register).toBe(true);
      expect(orchestratorStatus.methods.initialize).toBe(true);
      expect(orchestratorStatus.methods.getComponent).toBe(true);
      expect(orchestratorStatus.registeredComponents).toBeGreaterThan(0);
    });

    test("should have BaseEntityManager available", async () => {
      const baseManagerStatus = await page.evaluate(() => {
        return {
          exists: typeof window.BaseEntityManager !== "undefined",
          isClass: window.BaseEntityManager?.prototype !== undefined,
        };
      });

      expect(baseManagerStatus.exists).toBe(true);
      expect(baseManagerStatus.isClass).toBe(true);
    });

    test("should validate component loading pattern (no IIFE wrappers)", async () => {
      // This test verifies ADR-057 compliance - direct class declaration without IIFE
      const componentLoadingPattern = await page.evaluate(() => {
        const results = {};

        // Check that components are directly available on window object
        const componentClasses = [
          "BaseComponent",
          "TableComponent",
          "ModalComponent",
          "FilterComponent",
          "PaginationComponent",
          "SecurityUtils",
        ];

        for (const componentClass of componentClasses) {
          results[componentClass] = {
            directlyAvailable: typeof window[componentClass] !== "undefined",
            isConstructor: typeof window[componentClass] === "function",
          };
        }

        return results;
      });

      for (const [componentName, status] of Object.entries(
        componentLoadingPattern,
      )) {
        expect(status.directlyAvailable).toBe(true);
        if (componentName !== "SecurityUtils") {
          // SecurityUtils is an object, not a constructor
          expect(status.isConstructor).toBe(true);
        }
      }
    });
  });

  describe("Error Detection and Console Health", () => {
    test("should have minimal console errors during full test execution", async () => {
      // Filter out non-critical warnings and focus on real errors
      const criticalErrors = page.consoleErrors.filter(
        (error) =>
          !error.includes("DevTools") &&
          !error.includes("favicon") &&
          !error.includes("JQMIGRATE") &&
          (error.includes("Failed to load") ||
            error.includes("Cannot read properties") ||
            error.includes("TypeError") ||
            error.includes("ReferenceError")),
      );

      if (criticalErrors.length > 0) {
        console.log("Critical console errors found:");
        criticalErrors.forEach((error) => console.log(`  - ${error}`));
      }

      expect(criticalErrors.length).toBe(0);
    });

    test("should not have module loading failures", async () => {
      const moduleStatus = await page.evaluate(() => {
        return {
          failedModules: window.moduleLoader?.failedModules || [],
          loadErrors: window.moduleLoader?.loadErrors || [],
        };
      });

      expect(moduleStatus.failedModules.length).toBe(0);
      expect(moduleStatus.loadErrors.length).toBe(0);
    });
  });

  describe("US-087 Phase 1 Validation", () => {
    test("should verify all Phase 1 entities are operational", async () => {
      // US-087 Phase 1 specifically covers these entities
      const phase1Entities = [
        "teams",
        "users",
        "environments",
        "applications",
        "labels",
      ];

      const phase1Status = await page.evaluate((entities) => {
        const results = {};

        for (const entity of entities) {
          const managerName =
            entity.charAt(0).toUpperCase() + entity.slice(1) + "EntityManager";
          const manager = window.adminGui?.componentManagers?.[entity];

          results[entity] = {
            managerAvailable: typeof window[managerName] !== "undefined",
            adminGuiRegistered: manager !== undefined,
            canInitialize: manager?.initialize !== undefined,
          };
        }

        return results;
      }, phase1Entities);

      for (const entity of phase1Entities) {
        const status = phase1Status[entity];
        expect(status.managerAvailable).toBe(true);
        expect(status.adminGuiRegistered).toBe(true);
        expect(status.canInitialize).toBe(true);
      }
    });

    test("should validate pagination component fixes are working", async () => {
      // Related to pagination fixes in TD-005 Phase 3
      const paginationStatus = await page.evaluate(() => {
        return {
          componentExists: typeof window.PaginationComponent !== "undefined",
          modalComponentExists: typeof window.ModalComponent !== "undefined",
          noLoadingIssues: !window.moduleLoader?.failedModules?.includes(
            "PaginationComponent",
          ),
        };
      });

      expect(paginationStatus.componentExists).toBe(true);
      expect(paginationStatus.modalComponentExists).toBe(true);
      expect(paginationStatus.noLoadingIssues).toBe(true);
    });
  });
});
