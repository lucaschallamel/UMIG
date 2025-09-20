#!/usr/bin/env node

/**
 * Test script to verify all EntityManagers are loading properly
 * US-087 Phase 2 - EntityManager Integration Verification
 * Updated to use Playwright with .env credentials
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TEST_URL = 'http://localhost:8090/confluence/plugins/servlet/umig/adminGui';
const TIMEOUT = 30000;

// Confluence credentials from .env or defaults
const CONFLUENCE_USER = process.env.CONFLUENCE_ADMIN_USER || 'admin';
const CONFLUENCE_PASS = process.env.CONFLUENCE_ADMIN_PASSWORD || 'admin';

// EntityManagers to test
const ENTITY_MANAGERS = [
  'teams',
  'users',
  'environments',
  'applications',
  'labels',
  'migrationTypes',
  'iterationTypes'
];

async function testEntityManagers() {
  console.log('🚀 Starting EntityManager Loading Test with Playwright...\n');

  let browser;
  let allPassed = true;

  try {
    browser = await chromium.launch({
      headless: false, // Set to true for CI
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Set up console log capture
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();

      // Log all messages for debugging
      if (type === 'error') {
        console.error(`  ❌ ERROR: ${text}`);
        if (text.includes('Failed to load') || text.includes('not found') || text.includes('Cannot read')) {
          allPassed = false;
        }
      } else if (text.includes('[US-087]') || text.includes('EntityManager') || text.includes('Loading') || text.includes('SecurityUtils')) {
        console.log(`  📋 ${text}`);
      }
    });

    // Navigate to Confluence login if needed
    console.log(`📍 Navigating to Confluence...`);
    await page.goto('http://localhost:8090/confluence/login.action', { waitUntil: 'networkidle', timeout: TIMEOUT });

    // Check if we need to login (look for the login form)
    const needsLogin = await page.locator('#os_username, #loginButton').isVisible({ timeout: 5000 }).catch(() => false);

    if (needsLogin) {
      console.log(`🔑 Logging in as ${CONFLUENCE_USER}...`);

      // Fill in credentials
      await page.fill('#os_username', CONFLUENCE_USER);
      await page.fill('#os_password', CONFLUENCE_PASS);

      // Check for remember me checkbox and check it
      const rememberMe = await page.locator('#os_cookie').isVisible().catch(() => false);
      if (rememberMe) {
        await page.check('#os_cookie');
      }

      // Submit the form
      await page.click('#loginButton');

      // Wait for navigation to complete
      await page.waitForLoadState('networkidle');

      // Verify login success by checking we're not on login page
      const currentUrl = page.url();
      if (currentUrl.includes('login.action')) {
        throw new Error('Login failed - still on login page');
      }

      console.log(`✅ Login successful`);
    } else {
      console.log(`✅ Already authenticated`);
    }

    // Navigate to admin GUI
    console.log(`📍 Navigating to: ${TEST_URL}`);
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });

    // Wait for admin GUI to initialize
    console.log('⏳ Waiting for admin GUI to initialize...');
    await page.waitForTimeout(5000);

    // Check if admin GUI object exists
    const adminGuiExists = await page.evaluate(() => {
      return typeof window.adminGui !== 'undefined';
    });

    console.log(`\n📊 Admin GUI Status: ${adminGuiExists ? '✅ Loaded' : '❌ Not loaded'}`);

    // Check module loader status
    const moduleLoaderStatus = await page.evaluate(() => {
      if (typeof window.moduleLoader !== 'undefined') {
        return {
          exists: true,
          loadedModules: window.moduleLoader.loadedModules || [],
          failedModules: window.moduleLoader.failedModules || []
        };
      }
      return { exists: false };
    });

    if (moduleLoaderStatus.exists) {
      console.log(`\n📦 Module Loader Status:`);
      console.log(`  Loaded: ${moduleLoaderStatus.loadedModules.length} modules`);
      console.log(`  Failed: ${moduleLoaderStatus.failedModules.length} modules`);
      if (moduleLoaderStatus.failedModules.length > 0) {
        console.log(`  Failed modules: ${moduleLoaderStatus.failedModules.join(', ')}`);
      }
    }

    // Check if EntityManagers are available
    console.log('\n🔍 Checking EntityManager Availability:\n');

    for (const entity of ENTITY_MANAGERS) {
      const managerName = entity.charAt(0).toUpperCase() + entity.slice(1) + 'EntityManager';

      const isAvailable = await page.evaluate((name) => {
        return typeof window[name] !== 'undefined';
      }, managerName);

      const isLoaded = await page.evaluate((entity) => {
        return window.adminGui &&
               window.adminGui.componentManagers &&
               window.adminGui.componentManagers[entity] !== undefined;
      }, entity);

      if (isAvailable && isLoaded) {
        console.log(`  ✅ ${managerName}: Available and Loaded`);
      } else if (isAvailable && !isLoaded) {
        console.log(`  ⚠️  ${managerName}: Available but NOT loaded in adminGui`);
        allPassed = false;
      } else {
        console.log(`  ❌ ${managerName}: NOT Available`);
        allPassed = false;
      }
    }

    // Test navigation to each entity
    console.log('\n🧭 Testing Entity Navigation:\n');

    for (const entity of ENTITY_MANAGERS) {
      console.log(`  Testing ${entity}...`);

      try {
        // Navigate to entity
        await page.evaluate((entity) => {
          if (window.adminGui && window.adminGui.loadCurrentSection) {
            window.adminGui.currentEntity = entity;
            window.adminGui.loadCurrentSection();
          }
        }, entity);

        // Wait for potential errors
        await page.waitForTimeout(1000);

        // Check if EntityManager was used
        const usedEntityManager = await page.evaluate((entity) => {
          const manager = window.adminGui?.componentManagers?.[entity];
          return manager && manager.isInitialized;
        }, entity);

        if (usedEntityManager) {
          console.log(`    ✅ ${entity}: EntityManager used successfully`);
        } else {
          console.log(`    ❌ ${entity}: Fell back to legacy mode`);
          allPassed = false;
        }

        // Check for SecurityUtils availability
        const securityUtilsOk = await page.evaluate(() => {
          return window.SecurityUtils &&
                 typeof window.SecurityUtils.sanitizeInput === 'function' &&
                 typeof window.SecurityUtils.sanitizeHtml === 'function' &&
                 typeof window.SecurityUtils.validateInput === 'function';
        });

        if (!securityUtilsOk) {
          console.log(`    ⚠️  SecurityUtils methods not fully available`);
          allPassed = false;
        }

      } catch (error) {
        console.log(`    ❌ ${entity}: Navigation failed - ${error.message}`);
        allPassed = false;
      }
    }

    // Check for console errors
    console.log('\n📊 Checking for Console Errors:\n');

    const errors = await page.evaluate(() => {
      const logs = [];
      // Check if there were any console errors during the session
      if (window.console && window.console._errors) {
        logs.push(...window.console._errors);
      }
      return logs;
    });

    if (errors.length > 0) {
      console.log(`  ❌ Found ${errors.length} console errors`);
      errors.forEach(err => console.log(`    - ${err}`));
      allPassed = false;
    } else {
      console.log(`  ✅ No console errors detected`);
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - EntityManagers are working correctly!');
    } else {
      console.log('❌ SOME TESTS FAILED - Review errors above');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    allPassed = false;
  } finally {
    if (browser) {
      await browser.close();
    }
    process.exit(allPassed ? 0 : 1);
  }
}

// Run the test
testEntityManagers().catch(console.error);