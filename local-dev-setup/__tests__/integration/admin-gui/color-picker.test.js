/**
 * Color Picker Tests for UMIG Admin GUI
 * Tests the color picker functionality in Migration and Iteration Types
 */

const { test, expect } = require("@playwright/test");

test.describe("Color Picker Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Admin GUI
    await page.goto(
      "/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui",
    );

    // Login as admin
    await page.fill("#userCode", "ADM");
    await page.click('button[type="submit"]');
    await page.waitForSelector(".admin-content", { timeout: 5000 });
  });

  test("should show enhanced color picker in Migration Types CREATE modal", async ({
    page,
  }) => {
    // Navigate to Migration Types
    await page.click("text=Migration Types");
    await page.waitForSelector("#migrationTypesTable");

    // Open CREATE modal
    await page.click("#createMigrationTypeBtn");
    await page.waitForSelector(".modal-content");

    // Check color picker structure
    const colorPickerContainer = await page.locator(".color-picker-container");
    await expect(colorPickerContainer).toBeVisible();

    // Verify all color picker components exist
    await expect(page.locator(".color-picker")).toBeVisible();
    await expect(page.locator(".color-hex-input")).toBeVisible();
    await expect(page.locator(".color-preview")).toBeVisible();
  });

  test("should show enhanced color picker in Iteration Types EDIT modal", async ({
    page,
  }) => {
    // Navigate to Iteration Types
    await page.click("text=Iteration Types");
    await page.waitForSelector("#iterationTypesTable");

    // Click edit on first row
    await page.click(".edit-btn:first-child");
    await page.waitForSelector(".modal-content");

    // Check color picker structure
    const colorPickerContainer = await page.locator(".color-picker-container");
    await expect(colorPickerContainer).toBeVisible();

    // Verify color picker has correct value
    const colorInput = await page.locator(".color-picker");
    const hexInput = await page.locator(".color-hex-input");
    const colorPreview = await page.locator(".color-preview");

    // All should have matching colors
    const colorValue = await colorInput.inputValue();
    const hexValue = await hexInput.inputValue();
    const previewStyle = await colorPreview.getAttribute("style");

    expect(hexValue).toBe(colorValue);
    expect(previewStyle).toContain(colorValue);
  });

  test("should update color preview when color is changed", async ({
    page,
  }) => {
    // Navigate to Migration Types
    await page.click("text=Migration Types");
    await page.waitForSelector("#migrationTypesTable");

    // Open CREATE modal
    await page.click("#createMigrationTypeBtn");
    await page.waitForSelector(".modal-content");

    // Change color
    const newColor = "#FF5733";
    await page.fill(".color-picker", newColor);

    // Verify hex input updates
    const hexValue = await page.locator(".color-hex-input").inputValue();
    expect(hexValue).toBe(newColor);

    // Verify preview updates
    const previewStyle = await page
      .locator(".color-preview")
      .getAttribute("style");
    expect(previewStyle).toContain(newColor);
  });

  test("should sync hex input with color picker", async ({ page }) => {
    // Navigate to Iteration Types
    await page.click("text=Iteration Types");
    await page.waitForSelector("#iterationTypesTable");

    // Open CREATE modal
    await page.click("#createIterationTypeBtn");
    await page.waitForSelector(".modal-content");

    // Type in hex input
    const newColor = "#00FF00";
    await page.fill(".color-hex-input", newColor);

    // Trigger change event
    await page.locator(".color-hex-input").press("Enter");

    // Verify color picker updates
    const colorValue = await page.locator(".color-picker").inputValue();
    expect(colorValue).toBe(newColor);

    // Verify preview updates
    const previewStyle = await page
      .locator(".color-preview")
      .getAttribute("style");
    expect(previewStyle).toContain(newColor);
  });

  test("should maintain color value on save", async ({ page }) => {
    // Navigate to Migration Types
    await page.click("text=Migration Types");
    await page.waitForSelector("#migrationTypesTable");

    // Open CREATE modal
    await page.click("#createMigrationTypeBtn");
    await page.waitForSelector(".modal-content");

    // Fill form with color
    const testColor = "#123456";
    await page.fill('[name="mgt_code"]', "TEST");
    await page.fill('[name="mgt_name"]', "Test Migration");
    await page.fill(".color-picker", testColor);

    // Save
    await page.click(".modal-footer .btn-primary");

    // Wait for table refresh
    await page.waitForSelector("#migrationTypesTable");

    // Find the new row and verify color
    const newRow = await page.locator('tr:has-text("TEST")');
    const colorCell = await newRow.locator("td:nth-child(4)"); // Assuming color is 4th column

    await expect(colorCell).toContainText(testColor);
  });
});
