#!/usr/bin/env node

/**
 * Test script to verify all EntityManagers are working correctly
 * US-087 Phase 2: Base entity migration validation
 * 
 * Usage: node local-dev-setup/scripts/test-entity-managers.js
 */

const puppeteer = require('puppeteer');

// Configuration
const BASE_URL = 'http://localhost:8090';
const USERNAME = 'admin';
const PASSWORD = 'admin';
const ENTITIES_TO_TEST = [
  'teams',
  'users',
  'environments',
  'applications', 
  'labels',
  'migrationTypes',
  'iterationTypes'
];

async function testEntityManagers() {
  const browser = await puppeteer.launch({ 
    headless: false,  // Set to true for CI/CD
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('[US-087]')) {
      console.log(`Browser: ${msg.text()}`);
    }
  });
  
  try {
    console.log('🚀 Starting EntityManager tests...\n');
    
    // Navigate to Confluence
    console.log('1. Navigating to Confluence...');
    await page.goto(`${BASE_URL}/login.action`);
    
    // Login
    console.log('2. Logging in...');
    await page.type('#os_username', USERNAME);
    await page.type('#os_password', PASSWORD);
    await page.click('#loginButton');
    await page.waitForNavigation();
    
    // Navigate to Admin GUI
    console.log('3. Navigating to Admin GUI...');
    await page.goto(`${BASE_URL}/display/UMIG/Admin+GUI`);
    await page.waitForSelector('#admin-gui-container', { timeout: 10000 });
    
    // Test each entity
    const results = {};
    
    for (const entity of ENTITIES_TO_TEST) {
      console.log(`\n📋 Testing ${entity}...`);
      
      try {
        // Click on the entity navigation
        const navSelector = `[data-entity="${entity}"]`;
        await page.waitForSelector(navSelector);
        await page.click(navSelector);
        
        // Wait for EntityManager to load
        await page.waitForFunction(
          (entity) => {
            const logs = Array.from(document.querySelectorAll('*')).filter(
              el => el.textContent.includes(`[US-087] Using ${entity} EntityManager`)
            );
            return logs.length > 0;
          },
          { timeout: 5000 },
          entity
        );
        
        // Check if EntityManager container is rendered
        await page.waitForSelector('#entityManagerContainer', { timeout: 5000 });
        
        // Check for successful data load
        const hasData = await page.evaluate(() => {
          const container = document.getElementById('entityManagerContainer');
          return container && container.children.length > 0;
        });
        
        if (hasData) {
          console.log(`   ✅ ${entity} EntityManager loaded successfully`);
          results[entity] = 'SUCCESS';
        } else {
          console.log(`   ⚠️ ${entity} EntityManager loaded but no data rendered`);
          results[entity] = 'PARTIAL';
        }
        
      } catch (error) {
        console.log(`   ❌ ${entity} EntityManager failed: ${error.message}`);
        results[entity] = 'FAILED';
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    let successCount = 0;
    let partialCount = 0;
    let failedCount = 0;
    
    for (const [entity, status] of Object.entries(results)) {
      const icon = status === 'SUCCESS' ? '✅' : status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`${icon} ${entity}: ${status}`);
      
      if (status === 'SUCCESS') successCount++;
      else if (status === 'PARTIAL') partialCount++;
      else failedCount++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`Total: ${successCount} success, ${partialCount} partial, ${failedCount} failed`);
    console.log('='.repeat(50));
    
    // Overall status
    if (failedCount === 0 && partialCount === 0) {
      console.log('\n🎉 ALL ENTITY MANAGERS WORKING PERFECTLY!');
    } else if (failedCount === 0) {
      console.log('\n⚠️ Entity Managers working but some need attention');
    } else {
      console.log('\n❌ Some Entity Managers are not working correctly');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run tests
testEntityManagers().catch(console.error);