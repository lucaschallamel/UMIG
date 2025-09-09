/**
 * End-to-End Tests for Admin GUI Entity Migration
 * 
 * Tests complete user workflows for iterationTypes and migrationTypes
 * including navigation, form interactions, data persistence, and user experience
 */

const { test, expect } = require('@playwright/test');

test.describe('Admin GUI Entity Migration E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the UMIG admin GUI page
    await page.goto('/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui');
    
    // Wait for the admin GUI to initialize
    await page.waitForSelector('[data-umig-ready="true"]', { timeout: 10000 });
  });

  test.describe('Complete User Workflow - Iteration Types', () => {
    
    test('should complete full lifecycle: Create → Edit → Delete Iteration Type', async ({ page }) => {
      // Mock API responses for the complete workflow
      let createdItem = null;
      
      await page.route('**/iterationTypes', async (route) => {
        const method = route.request().method();
        const url = route.request().url();
        
        if (method === 'GET') {
          // Return existing items + created item
          const items = createdItem ? [createdItem] : [];
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(items)
          });
        } else if (method === 'POST') {
          // Create new item
          const postData = JSON.parse(await route.request().postData());
          createdItem = {
            ...postData,
            id: 1,
            created_at: new Date().toISOString(),
            created_by: 'testuser'
          };
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(createdItem)
          });
        } else if (method === 'PUT') {
          // Update item
          const putData = JSON.parse(await route.request().postData());
          createdItem = { ...createdItem, ...putData };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(createdItem)
          });
        } else if (method === 'DELETE') {
          // Delete item
          createdItem = null;
          await route.fulfill({ status: 204 });
        } else {
          await route.continue();
        }
      });

      // Step 1: Navigate to Iteration Types
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      
      // Step 2: Create new Iteration Type
      await page.click('#add-iterationTypes');
      await page.waitForSelector('.modal', { timeout: 3000 });
      
      // Fill create form
      await page.fill('#itt_code', 'E2ETEST');
      await page.fill('#itt_name', 'E2E Test Type');
      await page.fill('#itt_description', 'Created by E2E test');
      await page.fill('#itt_color', '#FF5722');
      await page.fill('#itt_icon', 'e2e-test');
      await page.fill('#itt_display_order', '99');
      await page.check('#itt_active');
      
      // Submit create form
      await page.click('.modal .btn-primary');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 3000 });
      
      // Verify success notification
      const createSuccess = await page.locator('.notification-success').isVisible();
      expect(createSuccess).toBe(true);
      
      // Wait for table to refresh and show new item
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForSelector('[data-umig-ready="true"]', { timeout: 10000 });
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      
      // Verify item appears in table
      const newRow = await page.locator('#iterationTypes-table tbody tr:has-text("E2ETEST")').isVisible();
      expect(newRow).toBe(true);
      
      // Step 3: Edit the created item
      await page.click('#iterationTypes-table tbody tr:has-text("E2ETEST") .btn-edit');
      await page.waitForSelector('.modal', { timeout: 3000 });
      
      // Verify form is pre-filled
      const codeValue = await page.inputValue('#itt_code');
      expect(codeValue).toBe('E2ETEST');
      
      // Verify code field is readonly in edit mode
      const codeReadonly = await page.locator('#itt_code:disabled').isVisible();
      expect(codeReadonly).toBe(true);
      
      // Update the name
      await page.fill('#itt_name', 'E2E Test Type (Updated)');
      await page.fill('#itt_description', 'Updated by E2E test');
      
      // Submit edit form
      await page.click('.modal .btn-primary');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 3000 });
      
      // Verify update success
      const updateSuccess = await page.locator('.notification-success').isVisible();
      expect(updateSuccess).toBe(true);
      
      // Step 4: Delete the item
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForSelector('[data-umig-ready="true"]', { timeout: 10000 });
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      
      // Click delete button
      await page.click('#iterationTypes-table tbody tr:has-text("E2ETEST") .btn-delete');
      
      // Handle confirmation dialog if it appears
      try {
        await page.waitForSelector('.confirm-dialog, .modal', { timeout: 2000 });
        await page.click('.btn-danger, .btn-confirm'); // Confirm delete
      } catch (e) {
        // If no confirmation dialog, the delete might be immediate
      }
      
      // Verify delete success
      await page.waitForTimeout(2000);
      const deleteSuccess = await page.locator('.notification-success').isVisible();
      expect(deleteSuccess).toBe(true);
    });

    test('should handle form validation errors gracefully', async ({ page }) => {
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      
      // Try to create without required fields
      await page.click('#add-iterationTypes');
      await page.waitForSelector('.modal', { timeout: 3000 });
      
      // Fill only some fields
      await page.fill('#itt_description', 'Missing required fields');
      
      // Try to submit
      await page.click('.modal .btn-primary');
      await page.waitForTimeout(1000);
      
      // Modal should remain open
      const modalVisible = await page.locator('.modal').isVisible();
      expect(modalVisible).toBe(true);
      
      // Check for validation feedback
      const invalidFields = await page.locator('input:invalid').count();
      expect(invalidFields).toBeGreaterThan(0);
      
      // Fill required fields
      await page.fill('#itt_code', 'VALID');
      await page.fill('#itt_name', 'Valid Name');
      await page.fill('#itt_color', '#00AA00');
      
      // Cancel instead of submit
      await page.click('.modal .btn-secondary'); // Cancel button
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 3000 });
    });
  });

  test.describe('Complete User Workflow - Migration Types', () => {
    
    test('should complete full lifecycle: Create → Edit → Delete Migration Type', async ({ page }) => {
      let createdItem = null;
      
      // Mock API for migration types
      await page.route('**/migrationTypes', async (route) => {
        const method = route.request().method();
        
        if (method === 'GET') {
          const items = createdItem ? [createdItem] : [];
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(items)
          });
        } else if (method === 'POST') {
          const postData = JSON.parse(await route.request().postData());
          createdItem = {
            ...postData,
            mtm_id: 1,
            created_at: new Date().toISOString(),
            created_by: 'testuser'
          };
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(createdItem)
          });
        } else if (method === 'PUT') {
          const putData = JSON.parse(await route.request().postData());
          createdItem = { ...createdItem, ...putData };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(createdItem)
          });
        } else if (method === 'DELETE') {
          createdItem = null;
          await route.fulfill({ status: 204 });
        } else {
          await route.continue();
        }
      });

      // Navigate to Migration Types
      await page.click('button[data-section="migrationTypes"]');
      await page.waitForSelector('#migrationTypes-table', { timeout: 5000 });
      
      // Create new Migration Type
      await page.click('#add-migrationTypes');
      await page.waitForSelector('.modal', { timeout: 3000 });
      
      // Verify ID field is not present in create mode
      const idFieldVisible = await page.locator('#mtm_id').isVisible();
      expect(idFieldVisible).toBe(false);
      
      // Fill form
      await page.fill('#mtm_code', 'MIGRATE01');
      await page.fill('#mtm_name', 'Migration Test 01');
      await page.fill('#mtm_description', 'E2E Migration test');
      await page.fill('#mtm_color', '#9C27B0');
      await page.fill('#mtm_icon', 'migrate-test');
      await page.fill('#mtm_display_order', '1');
      await page.check('#mtm_active');
      
      // Submit
      await page.click('.modal .btn-primary');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 3000 });
      
      // Verify creation
      const createSuccess = await page.locator('.notification-success').isVisible();
      expect(createSuccess).toBe(true);
      
      // Refresh and verify in table
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForSelector('[data-umig-ready="true"]', { timeout: 10000 });
      await page.click('button[data-section="migrationTypes"]');
      await page.waitForSelector('#migrationTypes-table', { timeout: 5000 });
      
      // Edit the item
      await page.click('#migrationTypes-table tbody tr:has-text("MIGRATE01") .btn-edit');
      await page.waitForSelector('.modal', { timeout: 3000 });
      
      // Verify ID field is present and readonly in edit mode
      const idFieldInEdit = await page.locator('#mtm_id').isVisible();
      expect(idFieldInEdit).toBe(true);
      
      const idFieldReadonly = await page.locator('#mtm_id:disabled').isVisible();
      expect(idFieldReadonly).toBe(true);
      
      // Update description
      await page.fill('#mtm_description', 'Updated E2E Migration test');
      
      // Submit update
      await page.click('.modal .btn-primary');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 3000 });
      
      // Verify update
      const updateSuccess = await page.locator('.notification-success').isVisible();
      expect(updateSuccess).toBe(true);
    });
  });

  test.describe('User Experience and Accessibility', () => {
    
    test('should provide keyboard navigation support', async ({ page }) => {
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      
      // Use Tab to navigate to Add button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Press Enter to activate Add button
      await page.keyboard.press('Enter');
      await page.waitForSelector('.modal', { timeout: 3000 });
      
      // Navigate through form fields with Tab
      await page.keyboard.press('Tab'); // Focus first field
      await page.keyboard.type('KEYTEST');
      
      await page.keyboard.press('Tab'); // Focus second field
      await page.keyboard.type('Keyboard Test');
      
      // Press Escape to close modal
      await page.keyboard.press('Escape');
      await page.waitForSelector('.modal', { state: 'hidden', timeout: 3000 });
    });

    test('should provide appropriate ARIA labels and roles', async ({ page }) => {
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      
      // Check table accessibility
      const tableRole = await page.getAttribute('#iterationTypes-table', 'role');
      expect(tableRole).toBe('table');
      
      // Check button accessibility
      const addButtonLabel = await page.getAttribute('#add-iterationTypes', 'aria-label');
      expect(addButtonLabel).toBeTruthy();
      
      // Open modal and check form accessibility
      await page.click('#add-iterationTypes');
      await page.waitForSelector('.modal', { timeout: 3000 });
      
      // Check modal role and labeling
      const modalRole = await page.getAttribute('.modal', 'role');
      expect(modalRole).toBe('dialog');
      
      const modalLabel = await page.getAttribute('.modal', 'aria-labelledby');
      expect(modalLabel).toBeTruthy();
    });

    test('should handle responsive design for different screen sizes', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      
      // Table should be responsive (might be horizontally scrollable)
      const tableVisible = await page.locator('#iterationTypes-table').isVisible();
      expect(tableVisible).toBe(true);
      
      // Add button should still be accessible
      const addButtonVisible = await page.locator('#add-iterationTypes').isVisible();
      expect(addButtonVisible).toBe(true);
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Modal should be responsive
      await page.click('#add-iterationTypes');
      await page.waitForSelector('.modal', { timeout: 3000 });
      
      const modalVisible = await page.locator('.modal').isVisible();
      expect(modalVisible).toBe(true);
      
      // Modal should not exceed screen width
      const modalBounds = await page.locator('.modal').boundingBox();
      expect(modalBounds.width).toBeLessThanOrEqual(768);
    });

    test('should provide visual feedback for user actions', async ({ page }) => {
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      
      // Test hover effects on buttons
      await page.hover('#add-iterationTypes');
      
      // Test focus states
      await page.focus('#add-iterationTypes');
      const focusedElement = await page.evaluate(() => document.activeElement.id);
      expect(focusedElement).toBe('add-iterationTypes');
      
      // Test loading states
      await page.click('#add-iterationTypes');
      await page.waitForSelector('.modal', { timeout: 3000 });
      
      // Fill form and test submit button states
      await page.fill('#itt_code', 'TEST');
      await page.fill('#itt_name', 'Test');
      await page.fill('#itt_color', '#FF0000');
      
      const submitButton = await page.locator('.modal .btn-primary');
      const submitButtonEnabled = await submitButton.isEnabled();
      expect(submitButtonEnabled).toBe(true);
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    
    test('should work consistently across browser features', async ({ page }) => {
      // Test color picker support
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      await page.click('#add-iterationTypes');
      await page.waitForSelector('.modal', { timeout: 3000 });
      
      // Color input should be supported or have fallback
      const colorInput = await page.locator('#itt_color');
      const colorType = await colorInput.getAttribute('type');
      expect(['color', 'text'].includes(colorType)).toBe(true);
      
      // Test number input support
      const numberInput = await page.locator('#itt_display_order');
      const numberType = await numberInput.getAttribute('type');
      expect(['number', 'text'].includes(numberType)).toBe(true);
      
      // Test boolean input (checkbox)
      const checkboxInput = await page.locator('#itt_active');
      const checkboxType = await checkboxInput.getAttribute('type');
      expect(checkboxType).toBe('checkbox');
    });

    test('should handle JavaScript errors gracefully', async ({ page }) => {
      const jsErrors = [];
      page.on('pageerror', error => {
        jsErrors.push(error.message);
      });
      
      // Perform complex workflow
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      
      await page.click('button[data-section="migrationTypes"]');
      await page.waitForSelector('#migrationTypes-table', { timeout: 5000 });
      
      await page.click('button[data-section="labels"]');
      await page.waitForSelector('#labels-table', { timeout: 5000 });
      
      // Should not have any JavaScript errors
      expect(jsErrors.length).toBe(0);
    });
  });

  test.describe('Performance and Load Testing', () => {
    
    test('should handle rapid section switching', async ({ page }) => {
      const startTime = Date.now();
      
      // Rapidly switch between sections
      for (let i = 0; i < 5; i++) {
        await page.click('button[data-section="iterationTypes"]');
        await page.waitForSelector('#iterationTypes-table', { timeout: 3000 });
        
        await page.click('button[data-section="migrationTypes"]');
        await page.waitForSelector('#migrationTypes-table', { timeout: 3000 });
        
        await page.click('button[data-section="labels"]');
        await page.waitForSelector('#labels-table', { timeout: 3000 });
      }
      
      const totalTime = Date.now() - startTime;
      
      // Should complete all switches within reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds max
    });

    test('should handle multiple modal operations efficiently', async ({ page }) => {
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      
      const startTime = Date.now();
      
      // Open and close modal multiple times
      for (let i = 0; i < 3; i++) {
        await page.click('#add-iterationTypes');
        await page.waitForSelector('.modal', { timeout: 3000 });
        
        await page.click('.modal .btn-secondary'); // Cancel
        await page.waitForSelector('.modal', { state: 'hidden', timeout: 3000 });
      }
      
      const totalTime = Date.now() - startTime;
      
      // Should be efficient
      expect(totalTime).toBeLessThan(10000); // 10 seconds max
    });
  });
});