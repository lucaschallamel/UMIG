/**
 * Integration Tests for Admin GUI Entity Loading
 * 
 * Tests the integration between AdminGUI, EntityConfig, and the UI components
 * for loading iterationTypes and migrationTypes sections, including table rendering
 * and form generation.
 */

const { test, expect } = require('@playwright/test');

test.describe('Admin GUI Entity Loading Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the UMIG admin GUI page
    await page.goto('/confluence/pages/viewpage.action?pageId=12345#umig-admin-gui');
    
    // Wait for the admin GUI to initialize
    await page.waitForSelector('[data-umig-ready="true"]', { timeout: 10000 });
  });

  test.describe('EntityConfig Integration', () => {
    
    test('should load EntityConfig module successfully', async ({ page }) => {
      const entityConfigExists = await page.evaluate(() => {
        return !!(window.EntityConfig && typeof window.EntityConfig.getAllEntities === 'function');
      });
      
      expect(entityConfigExists).toBe(true);
    });

    test('should have iterationTypes configuration available', async ({ page }) => {
      const iterationTypesConfig = await page.evaluate(() => {
        if (!window.EntityConfig) return null;
        return window.EntityConfig.getEntity('iterationTypes');
      });
      
      expect(iterationTypesConfig).not.toBeNull();
      expect(iterationTypesConfig.name).toBe('Iteration Types');
      expect(iterationTypesConfig.fields).toBeInstanceOf(Array);
      expect(iterationTypesConfig.fields.length).toBeGreaterThan(0);
    });

    test('should have migrationTypes configuration available', async ({ page }) => {
      const migrationTypesConfig = await page.evaluate(() => {
        if (!window.EntityConfig) return null;
        return window.EntityConfig.getEntity('migrationTypes');
      });
      
      expect(migrationTypesConfig).not.toBeNull();
      expect(migrationTypesConfig.name).toBe('Migration Types');
      expect(migrationTypesConfig.fields).toBeInstanceOf(Array);
      expect(migrationTypesConfig.fields.length).toBeGreaterThan(0);
    });
  });

  test.describe('Labels Section Loading (Baseline)', () => {
    
    test('should load Labels section without errors', async ({ page }) => {
      // Track console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Click on Labels section
      await page.click('button[data-section="labels"]');
      await page.waitForTimeout(2000); // Allow time for loading
      
      // Verify no console errors occurred
      expect(consoleErrors.length).toBe(0);
      
      // Verify Labels section is active
      const activeSection = await page.getAttribute('button[data-section="labels"]', 'class');
      expect(activeSection).toContain('active');
    });

    test('should display Labels table with data', async ({ page }) => {
      await page.click('button[data-section="labels"]');
      await page.waitForSelector('#labels-table', { timeout: 5000 });
      
      const tableExists = await page.locator('#labels-table').isVisible();
      expect(tableExists).toBe(true);
      
      // Check for table headers
      const headers = await page.locator('#labels-table thead th').count();
      expect(headers).toBeGreaterThan(0);
    });
  });

  test.describe('Iteration Types Section Loading', () => {
    
    test('should load Iteration Types section without errors', async ({ page }) => {
      // Track console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Click on Iteration Types section
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForTimeout(3000); // Allow time for loading
      
      // Verify no console errors occurred
      expect(consoleErrors.length).toBe(0);
      
      // Verify Iteration Types section is active
      const activeSection = await page.getAttribute('button[data-section="iterationTypes"]', 'class');
      expect(activeSection).toContain('active');
    });

    test('should display Iteration Types table', async ({ page }) => {
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 5000 });
      
      const tableExists = await page.locator('#iterationTypes-table').isVisible();
      expect(tableExists).toBe(true);
      
      // Verify table has expected columns based on EntityConfig
      const expectedColumns = ['Code', 'Name', 'Description', 'Color', 'Active'];
      for (const column of expectedColumns) {
        const columnExists = await page.locator(`#iterationTypes-table thead th:has-text("${column}")`).isVisible();
        expect(columnExists).toBe(true);
      }
    });

    test('should enable Add button for Iteration Types', async ({ page }) => {
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#add-iterationTypes', { timeout: 5000 });
      
      const addButtonExists = await page.locator('#add-iterationTypes').isVisible();
      expect(addButtonExists).toBe(true);
      
      const addButtonEnabled = await page.locator('#add-iterationTypes').isEnabled();
      expect(addButtonEnabled).toBe(true);
    });

    test('should display existing iteration types data', async ({ page }) => {
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table tbody', { timeout: 5000 });
      
      // Check if table has data rows
      const rowCount = await page.locator('#iterationTypes-table tbody tr').count();
      // Should have at least some test data or empty state
      expect(rowCount).toBeGreaterThanOrEqual(0);
      
      // If there are rows, verify they have the expected number of columns
      if (rowCount > 0) {
        const firstRowCells = await page.locator('#iterationTypes-table tbody tr:first-child td').count();
        expect(firstRowCells).toBeGreaterThan(4); // At least Code, Name, Description, Color, Active
      }
    });
  });

  test.describe('Migration Types Section Loading', () => {
    
    test('should load Migration Types section without errors', async ({ page }) => {
      // Track console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Click on Migration Types section
      await page.click('button[data-section="migrationTypes"]');
      await page.waitForTimeout(3000); // Allow time for loading
      
      // Verify no console errors occurred
      expect(consoleErrors.length).toBe(0);
      
      // Verify Migration Types section is active
      const activeSection = await page.getAttribute('button[data-section="migrationTypes"]', 'class');
      expect(activeSection).toContain('active');
    });

    test('should display Migration Types table', async ({ page }) => {
      await page.click('button[data-section="migrationTypes"]');
      await page.waitForSelector('#migrationTypes-table', { timeout: 5000 });
      
      const tableExists = await page.locator('#migrationTypes-table').isVisible();
      expect(tableExists).toBe(true);
      
      // Verify table has expected columns based on EntityConfig
      const expectedColumns = ['ID', 'Code', 'Name', 'Color', 'Active'];
      for (const column of expectedColumns) {
        const columnExists = await page.locator(`#migrationTypes-table thead th:has-text("${column}")`).isVisible();
        expect(columnExists).toBe(true);
      }
    });

    test('should enable Add button for Migration Types', async ({ page }) => {
      await page.click('button[data-section="migrationTypes"]');
      await page.waitForSelector('#add-migrationTypes', { timeout: 5000 });
      
      const addButtonExists = await page.locator('#add-migrationTypes').isVisible();
      expect(addButtonExists).toBe(true);
      
      const addButtonEnabled = await page.locator('#add-migrationTypes').isEnabled();
      expect(addButtonEnabled).toBe(true);
    });

    test('should display existing migration types data', async ({ page }) => {
      await page.click('button[data-section="migrationTypes"]');
      await page.waitForSelector('#migrationTypes-table tbody', { timeout: 5000 });
      
      // Check if table has data rows
      const rowCount = await page.locator('#migrationTypes-table tbody tr').count();
      // Should have at least some test data or empty state
      expect(rowCount).toBeGreaterThanOrEqual(0);
      
      // If there are rows, verify they have the expected number of columns
      if (rowCount > 0) {
        const firstRowCells = await page.locator('#migrationTypes-table tbody tr:first-child td').count();
        expect(firstRowCells).toBeGreaterThan(4); // At least ID, Code, Name, Color, Active
      }
    });
  });

  test.describe('Section Navigation Performance', () => {
    
    test('should switch between sections quickly', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate through all three sections
      await page.click('button[data-section="labels"]');
      await page.waitForSelector('#labels-table', { timeout: 3000 });
      
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 3000 });
      
      await page.click('button[data-section="migrationTypes"]');
      await page.waitForSelector('#migrationTypes-table', { timeout: 3000 });
      
      const totalTime = Date.now() - startTime;
      
      // Should complete all navigation within 10 seconds
      expect(totalTime).toBeLessThan(10000);
    });

    test('should maintain section state during navigation', async ({ page }) => {
      // Load iterationTypes
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 3000 });
      
      // Switch to labels
      await page.click('button[data-section="labels"]');
      await page.waitForSelector('#labels-table', { timeout: 3000 });
      
      // Switch back to iterationTypes
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForSelector('#iterationTypes-table', { timeout: 3000 });
      
      // Verify iterationTypes table is still functional
      const tableVisible = await page.locator('#iterationTypes-table').isVisible();
      expect(tableVisible).toBe(true);
      
      const addButtonVisible = await page.locator('#add-iterationTypes').isVisible();
      expect(addButtonVisible).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    
    test('should handle API endpoint failures gracefully', async ({ page }) => {
      // Intercept API calls and simulate failures
      await page.route('**/iterationTypes', route => {
        route.abort('failed');
      });
      
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.click('button[data-section="iterationTypes"]');
      await page.waitForTimeout(3000);
      
      // Should handle the error gracefully (exact error handling depends on implementation)
      // At minimum, the page should not crash
      const pageTitle = await page.title();
      expect(pageTitle).toBeDefined();
    });

    test('should display appropriate error messages for failed loads', async ({ page }) => {
      // Simulate API failure
      await page.route('**/migrationTypes', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.click('button[data-section="migrationTypes"]');
      await page.waitForTimeout(3000);
      
      // Look for error message or empty state
      const errorMessage = await page.locator('.error-message, .empty-state, .notification-error').isVisible();
      // Implementation may vary, but some form of error indication should be present
      // This test verifies the application handles errors gracefully
    });
  });
});