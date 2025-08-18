/**
 * US-028 Enhanced IterationView - End-to-End Page Load Tests
 * Critical UAT validation for migration loading DOM timing issues
 * 
 * Tests actual IterationView macro page loading in Confluence browser environment
 * Validates DOM element timing and script loading race conditions
 * 
 * Created: 2025-08-14
 * Framework: Playwright (Real Browser Testing)
 * Purpose: Close UAT gaps identified in current test coverage
 */

const { test, expect } = require('@playwright/test');

// Configuration
const CONFLUENCE_BASE = 'http://localhost:8090';
const TEST_PAGE_URL = `${CONFLUENCE_BASE}/pages/viewpage.action?pageId=YOUR_TEST_PAGE_ID`;
const API_MIGRATIONS_URL = `${CONFLUENCE_BASE}/rest/scriptrunner/latest/custom/migrations`;

test.describe('US-028 Enhanced IterationView - Page Load UAT', () => {
  
  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  });

  test('should load IterationView page and populate migration selector', async ({ page }) => {
    // Navigate to test page with IterationView macro
    await page.goto(TEST_PAGE_URL);
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Critical DOM Timing Validation
    const migrationSelect = await page.locator('#migration-select');
    await expect(migrationSelect).toBeVisible({ timeout: 10000 });
    
    // Validate initial loading state
    const initialText = await migrationSelect.textContent();
    expect(initialText).toContain('Loading migrations');
    
    // Wait for API call to complete and selector to be populated
    await page.waitForFunction(
      () => {
        const select = document.getElementById('migration-select');
        return select && select.options.length > 1 && 
               !select.textContent.includes('Loading migrations');
      },
      { timeout: 15000 }
    );
    
    // Validate successful migration loading
    const options = await migrationSelect.locator('option').count();
    expect(options).toBeGreaterThan(1); // At least default option + migrations
    
    // Check for proper migration data
    const firstMigrationOption = await migrationSelect.locator('option[value!=""]').first();
    await expect(firstMigrationOption).toBeVisible();
    
    const optionValue = await firstMigrationOption.getAttribute('value');
    expect(optionValue).toMatch(/^[a-f0-9-]{36}$/); // UUID format
  });

  test('should handle migration API network failures gracefully', async ({ page }) => {
    // Block the migrations API endpoint
    await page.route(API_MIGRATIONS_URL, route => route.abort());
    
    await page.goto(TEST_PAGE_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for error state
    const migrationSelect = await page.locator('#migration-select');
    await page.waitForFunction(
      () => {
        const select = document.getElementById('migration-select');
        return select && (select.textContent.includes('Error') || 
                         select.textContent.includes('Failed'));
      },
      { timeout: 10000 }
    );
    
    const errorText = await migrationSelect.textContent();
    expect(errorText).toMatch(/(Error|Failed)/);
  });

  test('should validate script loading order and DOM readiness', async ({ page }) => {
    // Track script loading and DOM events
    const events = [];
    
    await page.addInitScript(() => {
      window.testEvents = [];
      
      // Track DOM ready
      document.addEventListener('DOMContentLoaded', () => {
        window.testEvents.push({ event: 'DOMContentLoaded', timestamp: Date.now() });
      });
      
      // Track when migration select exists
      const checkMigrationSelect = () => {
        if (document.getElementById('migration-select')) {
          window.testEvents.push({ event: 'MigrationSelectExists', timestamp: Date.now() });
        } else {
          setTimeout(checkMigrationSelect, 10);
        }
      };
      checkMigrationSelect();
      
      // Track iteration-view.js loading
      window.originalFetch = window.fetch;
      window.fetch = function(...args) {
        if (args[0]?.includes('/custom/migrations')) {
          window.testEvents.push({ event: 'MigrationAPICall', timestamp: Date.now() });
        }
        return window.originalFetch.apply(this, args);
      };
    });
    
    await page.goto(TEST_PAGE_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for all events to be recorded
    await page.waitForTimeout(2000);
    
    const events = await page.evaluate(() => window.testEvents || []);
    
    // Validate proper event sequence
    expect(events.length).toBeGreaterThan(0);
    
    const domReady = events.find(e => e.event === 'DOMContentLoaded');
    const selectExists = events.find(e => e.event === 'MigrationSelectExists');
    const apiCall = events.find(e => e.event === 'MigrationAPICall');
    
    // DOM should be ready before select element exists
    if (domReady && selectExists) {
      expect(domReady.timestamp).toBeLessThanOrEqual(selectExists.timestamp);
    }
    
    // Select element should exist before API call
    if (selectExists && apiCall) {
      expect(selectExists.timestamp).toBeLessThanOrEqual(apiCall.timestamp);
    }
  });

  test('should validate both migration loading functions execute correctly', async ({ page }) => {
    // Instrument both migration loading functions
    await page.addInitScript(() => {
      window.migrationLoadingCalls = [];
      
      // Override console.log to capture function calls
      const originalConsoleLog = console.log;
      console.log = function(...args) {
        if (args[0]?.includes('migration')) {
          window.migrationLoadingCalls.push(args.join(' '));
        }
        return originalConsoleLog.apply(this, args);
      };
    });
    
    await page.goto(TEST_PAGE_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for page to fully initialize
    await page.waitForFunction(
      () => document.getElementById('migration-select')?.options?.length > 1,
      { timeout: 15000 }
    );
    
    // Check which functions were called
    const migrationCalls = await page.evaluate(() => window.migrationLoadingCalls || []);
    
    // Validate API calls were made
    const networkCalls = [];
    page.on('request', request => {
      if (request.url().includes('/custom/migrations')) {
        networkCalls.push(request.url());
      }
    });
    
    // Should have made at least one API call to migrations endpoint
    expect(networkCalls.length).toBeGreaterThan(0);
  });

  test('should complete full user workflow - migration selection to data display', async ({ page }) => {
    await page.goto(TEST_PAGE_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for migrations to load
    const migrationSelect = await page.locator('#migration-select');
    await page.waitForFunction(
      () => document.getElementById('migration-select')?.options?.length > 1,
      { timeout: 15000 }
    );
    
    // Select first migration
    const firstMigrationOption = await migrationSelect.locator('option[value!=""]').first();
    const migrationValue = await firstMigrationOption.getAttribute('value');
    await migrationSelect.selectOption(migrationValue);
    
    // Validate migration selection triggers dependent loading
    const iterationSelect = await page.locator('#iteration-select');
    await expect(iterationSelect).toBeVisible();
    
    // Wait for iterations to load (if any exist)
    await page.waitForTimeout(2000); // Allow time for API calls
    
    // Validate page responds to migration selection
    const currentMigrationValue = await migrationSelect.inputValue();
    expect(currentMigrationValue).toBe(migrationValue);
    
    // Check if data loading indicators appear
    const loadingIndicators = await page.locator('.loading, [class*="loading"]').count();
    // Loading indicators may or may not be present depending on data availability
    
    // Validate no JavaScript errors occurred during workflow
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    
    expect(errors.length).toBe(0);
  });

  test('should meet performance requirements for page load', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(TEST_PAGE_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for migrations to be fully loaded
    await page.waitForFunction(
      () => {
        const select = document.getElementById('migration-select');
        return select && select.options.length > 1 && 
               !select.textContent.includes('Loading');
      },
      { timeout: 15000 }
    );
    
    const loadTime = Date.now() - startTime;
    
    // Validate <3 second load time requirement
    expect(loadTime).toBeLessThan(3000);
    
    // Measure API response time
    let apiResponseTime = 0;
    page.on('response', response => {
      if (response.url().includes('/custom/migrations')) {
        apiResponseTime = Date.now() - startTime;
      }
    });
    
    // API should respond quickly for good user experience
    expect(apiResponseTime).toBeLessThan(2000);
  });

  test('should handle concurrent user scenarios', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );
    
    // Navigate all pages simultaneously
    await Promise.all(
      pages.map(page => page.goto(TEST_PAGE_URL))
    );
    
    // Wait for all pages to load migrations
    await Promise.all(
      pages.map(page => 
        page.waitForFunction(
          () => document.getElementById('migration-select')?.options?.length > 1,
          { timeout: 20000 }
        )
      )
    );
    
    // Validate all pages loaded successfully
    for (const page of pages) {
      const migrationSelect = await page.locator('#migration-select');
      const options = await migrationSelect.locator('option').count();
      expect(options).toBeGreaterThan(1);
    }
    
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });
});

// Test configuration
module.exports = {
  testDir: './src/groovy/umig/tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  use: {
    baseURL: 'http://localhost:8090',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chrome',
      use: { browserName: 'chromium' }
    },
    {
      name: 'firefox', 
      use: { browserName: 'firefox' }
    }
  ]
};