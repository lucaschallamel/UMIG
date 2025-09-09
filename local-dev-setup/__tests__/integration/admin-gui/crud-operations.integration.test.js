/**
 * Integration Tests for Admin GUI CRUD Operations
 *
 * Tests CRUD operations for iterationTypes and migrationTypes entities,
 * including form generation, validation, and data persistence through
 * the Admin GUI interface.
 */

const { test, expect } = require("@playwright/test");

test.describe("Admin GUI CRUD Operations Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the UMIG admin GUI page
    await page.goto(
      "/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui",
    );

    // Wait for the admin GUI to initialize
    await page.waitForSelector('[data-umig-ready="true"]', { timeout: 10000 });
  });

  test.describe("Iteration Types CRUD Operations", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Iteration Types section
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector("#iterationTypes-table", { timeout: 5000 });
    });

    test("should open Create modal for Iteration Types", async ({ page }) => {
      // Click Add button
      await page.click("#add-iterationTypes");

      // Wait for modal to appear
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Verify modal is visible and has correct title
      const modalVisible = await page.locator(".modal").isVisible();
      expect(modalVisible).toBe(true);

      const modalTitle = await page.locator(".modal-title").textContent();
      expect(modalTitle).toContain("Add Iteration Type");
    });

    test("should generate correct form fields for Iteration Types", async ({
      page,
    }) => {
      await page.click("#add-iterationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Verify required form fields are present
      const expectedFields = [
        { id: "itt_code", label: "Code" },
        { id: "itt_name", label: "Name" },
        { id: "itt_description", label: "Description" },
        { id: "itt_color", label: "Color" },
        { id: "itt_icon", label: "Icon" },
        { id: "itt_display_order", label: "Display Order" },
        { id: "itt_active", label: "Active" },
      ];

      for (const field of expectedFields) {
        const fieldExists = await page.locator(`#${field.id}`).isVisible();
        expect(fieldExists).toBe(true);

        // Verify field labels
        const labelExists = await page
          .locator(`label[for="${field.id}"]`)
          .isVisible();
        expect(labelExists).toBe(true);
      }
    });

    test("should validate required fields for Iteration Types", async ({
      page,
    }) => {
      await page.click("#add-iterationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Try to submit form without filling required fields
      await page.click(".modal .btn-primary"); // Save button

      // Wait for validation messages
      await page.waitForTimeout(1000);

      // Check that required field validations are triggered
      const codeField = await page.locator("#itt_code:invalid");
      const nameField = await page.locator("#itt_name:invalid");
      const colorField = await page.locator("#itt_color:invalid");

      // At least one required field should be invalid
      const invalidFieldExists =
        (await codeField.isVisible()) ||
        (await nameField.isVisible()) ||
        (await colorField.isVisible());
      expect(invalidFieldExists).toBe(true);
    });

    test("should set default values for Iteration Types fields", async ({
      page,
    }) => {
      await page.click("#add-iterationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Check default values based on EntityConfig
      const colorValue = await page.inputValue("#itt_color");
      expect(colorValue).toBe("#6B73FF");

      const iconValue = await page.inputValue("#itt_icon");
      expect(iconValue).toBe("play-circle");

      const displayOrderValue = await page.inputValue("#itt_display_order");
      expect(displayOrderValue).toBe("0");

      const activeChecked = await page.isChecked("#itt_active");
      expect(activeChecked).toBe(true);
    });

    test("should create new Iteration Type successfully", async ({ page }) => {
      // Mock API response for successful creation
      await page.route("**/iterationTypes", (route) => {
        if (route.request().method() === "POST") {
          route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              itt_code: "TEST",
              itt_name: "Test Type",
              itt_description: "Test Description",
              itt_color: "#FF6B6B",
              itt_icon: "test-icon",
              itt_display_order: 1,
              itt_active: true,
              created_at: new Date().toISOString(),
              created_by: "testuser",
            }),
          });
        } else {
          route.continue();
        }
      });

      await page.click("#add-iterationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Fill in form fields
      await page.fill("#itt_code", "TEST");
      await page.fill("#itt_name", "Test Type");
      await page.fill("#itt_description", "Test Description");
      await page.fill("#itt_color", "#FF6B6B");
      await page.fill("#itt_icon", "test-icon");
      await page.fill("#itt_display_order", "1");
      await page.check("#itt_active");

      // Submit form
      await page.click(".modal .btn-primary");

      // Wait for modal to close and success notification
      await page.waitForSelector(".modal", { state: "hidden", timeout: 3000 });

      // Look for success notification
      const successNotification = await page
        .locator(".notification-success")
        .isVisible();
      expect(successNotification).toBe(true);
    });

    test("should handle Edit operation for Iteration Types", async ({
      page,
    }) => {
      // Mock API response with existing data
      await page.route("**/iterationTypes", (route) => {
        if (route.request().method() === "GET") {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                itt_code: "PROD",
                itt_name: "Production",
                itt_description: "Production environment",
                itt_color: "#00AA00",
                itt_icon: "production",
                itt_display_order: 1,
                itt_active: true,
              },
            ]),
          });
        } else {
          route.continue();
        }
      });

      // Refresh to load mock data
      await page.reload();
      await page.waitForSelector('[data-umig-ready="true"]', {
        timeout: 10000,
      });
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector("#iterationTypes-table", { timeout: 5000 });

      // Click edit button for first row
      await page.click("#iterationTypes-table tbody tr:first-child .btn-edit");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Verify modal shows existing data
      const codeValue = await page.inputValue("#itt_code");
      expect(codeValue).toBe("PROD");

      const nameValue = await page.inputValue("#itt_name");
      expect(nameValue).toBe("Production");
    });

    test("should make itt_code readonly in Edit mode", async ({ page }) => {
      // Mock data and simulate edit
      await page.route("**/iterationTypes", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              itt_code: "PROD",
              itt_name: "Production",
              itt_active: true,
            },
          ]),
        });
      });

      await page.reload();
      await page.waitForSelector('[data-umig-ready="true"]', {
        timeout: 10000,
      });
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector("#iterationTypes-table", { timeout: 5000 });

      await page.click("#iterationTypes-table tbody tr:first-child .btn-edit");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Verify itt_code field is disabled in edit mode
      const codeFieldDisabled = await page
        .locator("#itt_code:disabled")
        .isVisible();
      expect(codeFieldDisabled).toBe(true);
    });
  });

  test.describe("Migration Types CRUD Operations", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Migration Types section
      await page.click('button[data-section="migrationTypes"]');
      await page.waitForSelector("#migrationTypes-table", { timeout: 5000 });
    });

    test("should open Create modal for Migration Types", async ({ page }) => {
      await page.click("#add-migrationTypes");

      await page.waitForSelector(".modal", { timeout: 3000 });

      const modalVisible = await page.locator(".modal").isVisible();
      expect(modalVisible).toBe(true);

      const modalTitle = await page.locator(".modal-title").textContent();
      expect(modalTitle).toContain("Add Migration Type");
    });

    test("should generate correct form fields for Migration Types", async ({
      page,
    }) => {
      await page.click("#add-migrationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Verify required form fields are present (note: mit_id should not be visible in create mode)
      const expectedFields = [
        { id: "mit_code", label: "Code" },
        { id: "mit_name", label: "Name" },
        { id: "mit_description", label: "Description" },
        { id: "mit_color", label: "Color" },
        { id: "mit_icon", label: "Icon" },
        { id: "mit_display_order", label: "Display Order" },
        { id: "mit_active", label: "Active" },
      ];

      for (const field of expectedFields) {
        const fieldExists = await page.locator(`#${field.id}`).isVisible();
        expect(fieldExists).toBe(true);
      }

      // mit_id should not be visible in create mode (readonly primary key)
      const idFieldVisible = await page.locator("#mit_id").isVisible();
      expect(idFieldVisible).toBe(false);
    });

    test("should validate required fields for Migration Types", async ({
      page,
    }) => {
      await page.click("#add-migrationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Try to submit without filling required fields
      await page.click(".modal .btn-primary");
      await page.waitForTimeout(1000);

      // Check for validation errors
      const codeField = await page.locator("#mit_code:invalid");
      const nameField = await page.locator("#mit_name:invalid");
      const colorField = await page.locator("#mit_color:invalid");

      const invalidFieldExists =
        (await codeField.isVisible()) ||
        (await nameField.isVisible()) ||
        (await colorField.isVisible());
      expect(invalidFieldExists).toBe(true);
    });

    test("should set default values for Migration Types fields", async ({
      page,
    }) => {
      await page.click("#add-migrationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Check default values
      const colorValue = await page.inputValue("#mit_color");
      expect(colorValue).toBe("#6B73FF");

      const iconValue = await page.inputValue("#mit_icon");
      expect(iconValue).toBe("migration");

      const displayOrderValue = await page.inputValue("#mit_display_order");
      expect(displayOrderValue).toBe("0");

      const activeChecked = await page.isChecked("#mit_active");
      expect(activeChecked).toBe(true);
    });

    test("should create new Migration Type successfully", async ({ page }) => {
      // Mock successful creation
      await page.route("**/migrationTypes", (route) => {
        if (route.request().method() === "POST") {
          route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              mit_id: 1,
              mit_code: "TESTMIG",
              mit_name: "Test Migration",
              mit_description: "Test Migration Description",
              mit_color: "#FF6B6B",
              mit_icon: "test-migration",
              mit_display_order: 1,
              mit_active: true,
              created_at: new Date().toISOString(),
              created_by: "testuser",
            }),
          });
        } else {
          route.continue();
        }
      });

      await page.click("#add-migrationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Fill form
      await page.fill("#mit_code", "TESTMIG");
      await page.fill("#mit_name", "Test Migration");
      await page.fill("#mit_description", "Test Migration Description");
      await page.fill("#mit_color", "#FF6B6B");
      await page.fill("#mit_icon", "test-migration");
      await page.fill("#mit_display_order", "1");
      await page.check("#mit_active");

      // Submit
      await page.click(".modal .btn-primary");

      // Verify success
      await page.waitForSelector(".modal", { state: "hidden", timeout: 3000 });
      const successNotification = await page
        .locator(".notification-success")
        .isVisible();
      expect(successNotification).toBe(true);
    });

    test("should show ID field in Edit mode for Migration Types", async ({
      page,
    }) => {
      // Mock existing data
      await page.route("**/migrationTypes", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              mit_id: 1,
              mit_code: "EXISTING",
              mit_name: "Existing Migration",
              mit_active: true,
            },
          ]),
        });
      });

      await page.reload();
      await page.waitForSelector('[data-umig-ready="true"]', {
        timeout: 10000,
      });
      await page.click('button[data-section="migrationTypes"]');
      await page.waitForSelector("#migrationTypes-table", { timeout: 5000 });

      // Click edit
      await page.click("#migrationTypes-table tbody tr:first-child .btn-edit");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // ID field should be visible and readonly in edit mode
      const idFieldVisible = await page.locator("#mit_id").isVisible();
      expect(idFieldVisible).toBe(true);

      const idFieldDisabled = await page
        .locator("#mit_id:disabled")
        .isVisible();
      expect(idFieldDisabled).toBe(true);

      const idValue = await page.inputValue("#mit_id");
      expect(idValue).toBe("1");
    });
  });

  test.describe("Form Field Validation", () => {
    test("should validate color field format", async ({ page }) => {
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector("#iterationTypes-table", { timeout: 5000 });
      await page.click("#add-iterationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Fill with invalid color
      await page.fill("#itt_color", "invalid-color");
      await page.fill("#itt_code", "TEST");
      await page.fill("#itt_name", "Test Name");

      await page.click(".modal .btn-primary");
      await page.waitForTimeout(1000);

      // Color field should be invalid
      const colorFieldInvalid = await page
        .locator("#itt_color:invalid")
        .isVisible();
      expect(colorFieldInvalid).toBe(true);
    });

    test("should validate maxLength constraints", async ({ page }) => {
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector("#iterationTypes-table", { timeout: 5000 });
      await page.click("#add-iterationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Fill with text exceeding maxLength (itt_code: maxLength 20)
      const longCode = "a".repeat(25);
      await page.fill("#itt_code", longCode);

      // Check that input respects maxLength
      const actualValue = await page.inputValue("#itt_code");
      expect(actualValue.length).toBeLessThanOrEqual(20);
    });

    test("should validate number field types", async ({ page }) => {
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector("#iterationTypes-table", { timeout: 5000 });
      await page.click("#add-iterationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Fill number field with invalid value
      await page.fill("#itt_display_order", "not-a-number");
      await page.fill("#itt_code", "TEST");
      await page.fill("#itt_name", "Test Name");
      await page.fill("#itt_color", "#FF0000");

      await page.click(".modal .btn-primary");
      await page.waitForTimeout(1000);

      // Number field should be invalid
      const numberFieldInvalid = await page
        .locator("#itt_display_order:invalid")
        .isVisible();
      expect(numberFieldInvalid).toBe(true);
    });
  });

  test.describe("Error Handling", () => {
    test("should handle server errors during creation", async ({ page }) => {
      // Mock server error
      await page.route("**/iterationTypes", (route) => {
        if (route.request().method() === "POST") {
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Internal Server Error" }),
          });
        } else {
          route.continue();
        }
      });

      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector("#iterationTypes-table", { timeout: 5000 });
      await page.click("#add-iterationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Fill valid form
      await page.fill("#itt_code", "TEST");
      await page.fill("#itt_name", "Test Name");
      await page.fill("#itt_color", "#FF0000");

      await page.click(".modal .btn-primary");
      await page.waitForTimeout(2000);

      // Should show error notification
      const errorNotification = await page
        .locator(".notification-error")
        .isVisible();
      expect(errorNotification).toBe(true);

      // Modal should remain open
      const modalVisible = await page.locator(".modal").isVisible();
      expect(modalVisible).toBe(true);
    });

    test("should handle validation errors from server", async ({ page }) => {
      // Mock validation error
      await page.route("**/migrationTypes", (route) => {
        if (route.request().method() === "POST") {
          route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              error: "Validation failed",
              details: "Code already exists",
            }),
          });
        } else {
          route.continue();
        }
      });

      await page.click('button[data-section="migrationTypes"]');
      await page.waitForSelector("#migrationTypes-table", { timeout: 5000 });
      await page.click("#add-migrationTypes");
      await page.waitForSelector(".modal", { timeout: 3000 });

      // Fill form
      await page.fill("#mit_code", "EXISTING");
      await page.fill("#mit_name", "Test Name");
      await page.fill("#mit_color", "#FF0000");

      await page.click(".modal .btn-primary");
      await page.waitForTimeout(2000);

      // Should show validation error
      const errorMessage = await page
        .locator(".error-message, .notification-error")
        .isVisible();
      expect(errorMessage).toBe(true);
    });
  });
});
