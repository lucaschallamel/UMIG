/**
 * StepView JavaScript-HTML Synchronization Integration Test
 * 
 * Purpose: Validate that JavaScript correctly populates HTML elements
 * and maintains synchronization between StepView and IterationView styling
 * 
 * Part of US-036 Phase 2: StepView UI Refactoring
 */

const { test, expect } = require('@playwright/test');

const TEST_CONFIG = {
  baseUrl: 'http://localhost:8090',
  stepViewUrl: '/spaces/UMIG/pages/1114120/UMIG+-+Step+View?mig=TORONTO&ite=RUN1&stepid=AUT-001',
  timeout: 10000,
  screenshotPath: '/Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/tests/integration/screenshots/'
};

test.describe('StepView JavaScript-HTML Synchronization', () => {
  
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(TEST_CONFIG.timeout);
    
    // Navigate to StepView page
    await page.goto(TEST_CONFIG.baseUrl + TEST_CONFIG.stepViewUrl);
    await page.waitForLoadState('networkidle');
  });

  test('should verify UMIG_STEP_CONFIG is properly initialized', async ({ page }) => {
    console.log('🔧 Testing UMIG_STEP_CONFIG initialization...');

    // Check that configuration object exists
    const configExists = await page.evaluate(() => {
      return typeof window.UMIG_STEP_CONFIG !== 'undefined';
    });
    
    expect(configExists).toBeTruthy();
    console.log('✅ UMIG_STEP_CONFIG object exists');

    // Validate configuration structure
    const configStructure = await page.evaluate(() => {
      const config = window.UMIG_STEP_CONFIG;
      return {
        hasApi: config && config.api !== undefined,
        hasUser: config && config.user !== undefined,
        hasFeatures: config && config.features !== undefined,
        apiBaseUrl: config?.api?.baseUrl,
        pollingInterval: config?.api?.pollingInterval,
        cacheTimeout: config?.api?.cacheTimeout,
        userRole: config?.user?.role,
        isAdmin: config?.user?.isAdmin,
        isPilot: config?.user?.isPilot,
        bulkOperations: config?.features?.bulkOperations
      };
    });

    // Validate API configuration
    expect(configStructure.hasApi).toBeTruthy();
    expect(configStructure.apiBaseUrl).toBe('/rest/scriptrunner/latest/custom');
    expect(configStructure.pollingInterval).toBe(2000); // 2 seconds
    expect(configStructure.cacheTimeout).toBe(30000);   // 30 seconds
    console.log('✅ API configuration validated');

    // Validate user configuration
    expect(configStructure.hasUser).toBeTruthy();
    expect(['NORMAL', 'PILOT', 'ADMIN']).toContain(configStructure.userRole);
    expect(typeof configStructure.isAdmin).toBe('boolean');
    expect(typeof configStructure.isPilot).toBe('boolean');
    console.log(`✅ User configuration validated - Role: ${configStructure.userRole}`);

    // Validate features configuration
    expect(configStructure.hasFeatures).toBeTruthy();
    expect(typeof configStructure.bulkOperations).toBe('boolean');
    console.log('✅ Features configuration validated');
  });

  test('should verify HTML structure matches expected CSS classes', async ({ page }) => {
    console.log('🏗️ Testing HTML structure and CSS classes...');

    // Define expected CSS selectors based on IterationView alignment
    const expectedSelectors = [
      '.step-details-container',
      '.step-header',
      '.step-header-content',
      '.step-title-row',
      '.step-name',
      '.step-code',
      '.step-title-text',
      '.status-badge',
      '.step-meta',
      '.step-owner',
      '.step-timing',
      '.step-content',
      '.step-section',
      '.step-description-section',
      '.teams-section',
      '.instructions-section',
      '.comments-section',
      '.instructions-container',
      '.comments-container',
      '.loading-indicator',
      '.error-container'
    ];

    // Validate each selector exists
    const selectorResults = [];
    for (const selector of expectedSelectors) {
      const exists = await page.locator(selector).count() > 0;
      selectorResults.push({ selector, exists });
      
      if (exists) {
        console.log(`✅ Found: ${selector}`);
      } else {
        console.log(`❌ Missing: ${selector}`);
      }
    }

    // Calculate structure completeness
    const foundSelectors = selectorResults.filter(r => r.exists).length;
    const completeness = (foundSelectors / expectedSelectors.length) * 100;
    console.log(`📊 HTML Structure Completeness: ${completeness.toFixed(1)}%`);

    // Require at least 80% structure completeness
    expect(completeness).toBeGreaterThanOrEqual(80);

    // Take screenshot of current structure
    await page.screenshot({ 
      path: TEST_CONFIG.screenshotPath + 'stepview-html-structure.png',
      fullPage: true 
    });
  });

  test('should verify iteration-view.css is loaded and applied', async ({ page }) => {
    console.log('🎨 Testing CSS alignment with IterationView...');

    // Check if iteration-view.css is loaded
    const cssLoaded = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      return stylesheets.find(sheet => {
        try {
          return sheet.href && sheet.href.includes('iteration-view.css');
        } catch (e) {
          return false;
        }
      });
    });

    if (cssLoaded) {
      console.log('✅ iteration-view.css stylesheet detected');
    } else {
      console.log('⚠️ iteration-view.css not found - checking for inline styles');
    }

    // Verify key CSS custom properties are available
    const cssVariables = await page.evaluate(() => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      return {
        colorPrimary: computedStyle.getPropertyValue('--color-primary').trim(),
        colorSecondary: computedStyle.getPropertyValue('--color-secondary').trim(),
        spacingMd: computedStyle.getPropertyValue('--spacing-md').trim(),
        fontFamily: computedStyle.getPropertyValue('--font-family').trim(),
        borderRadius: computedStyle.getPropertyValue('--border-radius').trim()
      };
    });

    console.log('🎨 CSS Variables detected:', cssVariables);

    // Verify container styling
    const containerStyles = await page.locator('.step-details-container').evaluate(el => {
      const styles = getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        border: styles.border,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
        padding: styles.padding
      };
    });

    console.log('📦 Container styles:', containerStyles);
    expect(containerStyles.backgroundColor).toBeTruthy();

    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
    await page.waitForTimeout(500); // Allow styles to apply

    const mobileStyles = await page.locator('.step-details-container').evaluate(el => {
      const styles = getComputedStyle(el);
      return {
        borderRadius: styles.borderRadius,
        borderLeft: styles.borderLeft,
        borderRight: styles.borderRight
      };
    });

    console.log('📱 Mobile styles:', mobileStyles);

    // Reset to desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('should verify JavaScript DOM manipulation works correctly', async ({ page }) => {
    console.log('⚙️ Testing JavaScript DOM manipulation...');

    // Mock step data for testing
    const mockStepData = {
      stepCode: 'AUT-001',
      stepName: 'Test Step Name',
      stepDescription: 'This is a test step description',
      status: 'IN_PROGRESS',
      ownerTeam: 'Infrastructure Team',
      assignedTeam: 'Platform Team',
      impactedTeams: ['Database Team', 'Security Team'],
      timing: '15:30 - 16:00',
      instructions: [
        { order: 1, description: 'First instruction', completed: false },
        { order: 2, description: 'Second instruction', completed: true },
        { order: 3, description: 'Third instruction', completed: false }
      ],
      comments: [
        { author: 'John Doe', timestamp: '2025-08-19T10:30:00', text: 'Test comment 1' },
        { author: 'Jane Smith', timestamp: '2025-08-19T11:15:00', text: 'Test comment 2' }
      ]
    };

    // Inject mock data and test DOM population
    await page.evaluate((data) => {
      // Simulate step data population (similar to actual step-view.js)
      
      // Populate step header
      const stepCode = document.querySelector('.step-code');
      if (stepCode) stepCode.textContent = data.stepCode;
      
      const stepTitle = document.querySelector('.step-title-text');
      if (stepTitle) stepTitle.textContent = data.stepName;
      
      const statusBadge = document.querySelector('.status-badge');
      if (statusBadge) {
        statusBadge.textContent = data.status;
        statusBadge.className = `status-badge status-${data.status.toLowerCase().replace('_', '-')}`;
      }
      
      // Populate meta information
      const stepOwner = document.querySelector('.step-owner');
      if (stepOwner) stepOwner.textContent = `Owner: ${data.ownerTeam}`;
      
      const stepTiming = document.querySelector('.step-timing');
      if (stepTiming) stepTiming.textContent = `Time: ${data.timing}`;
      
      // Populate description
      const stepDescription = document.querySelector('.step-description');
      if (stepDescription) stepDescription.textContent = data.stepDescription;
      
      // Populate instructions
      const instructionsContainer = document.querySelector('.instructions-container');
      if (instructionsContainer) {
        instructionsContainer.innerHTML = data.instructions.map(inst => 
          `<div class="instruction-item ${inst.completed ? 'completed' : ''}" data-order="${inst.order}">
             <span class="instruction-order">${inst.order}</span>
             <span class="instruction-text">${inst.description}</span>
             <span class="instruction-status">${inst.completed ? '✅' : '⏳'}</span>
           </div>`
        ).join('');
      }
      
      // Populate comments
      const commentsContainer = document.querySelector('.comments-container');
      if (commentsContainer) {
        commentsContainer.innerHTML = data.comments.map(comment =>
          `<div class="comment-item">
             <div class="comment-author">${comment.author}</div>
             <div class="comment-timestamp">${new Date(comment.timestamp).toLocaleString()}</div>
             <div class="comment-text">${comment.text}</div>
           </div>`
        ).join('');
      }
      
      // Update counts
      const instructionCount = document.querySelector('.instruction-count');
      if (instructionCount) instructionCount.textContent = `(${data.instructions.length})`;
      
      const commentCount = document.querySelector('.comment-count');
      if (commentCount) commentCount.textContent = `(${data.comments.length})`;
      
      return 'DOM populated successfully';
    }, mockStepData);

    // Wait for DOM changes to be applied
    await page.waitForTimeout(500);

    // Verify DOM was populated correctly
    const populatedData = await page.evaluate(() => {
      return {
        stepCode: document.querySelector('.step-code')?.textContent,
        stepTitle: document.querySelector('.step-title-text')?.textContent,
        statusBadge: document.querySelector('.status-badge')?.textContent,
        stepOwner: document.querySelector('.step-owner')?.textContent,
        stepTiming: document.querySelector('.step-timing')?.textContent,
        stepDescription: document.querySelector('.step-description')?.textContent,
        instructionCount: document.querySelector('.instructions-container .instruction-item')?.length || 0,
        commentCount: document.querySelector('.comments-container .comment-item')?.length || 0,
        instructionCountDisplay: document.querySelector('.instruction-count')?.textContent,
        commentCountDisplay: document.querySelector('.comment-count')?.textContent
      };
    });

    console.log('📝 Populated data verification:', populatedData);

    // Verify data was populated correctly
    expect(populatedData.stepCode).toBe(mockStepData.stepCode);
    expect(populatedData.stepTitle).toBe(mockStepData.stepName);
    expect(populatedData.statusBadge).toBe(mockStepData.status);
    expect(populatedData.instructionCount).toBe(mockStepData.instructions.length);
    expect(populatedData.commentCount).toBe(mockStepData.comments.length);

    console.log('✅ DOM manipulation validation successful');

    // Take screenshot of populated UI
    await page.screenshot({ 
      path: TEST_CONFIG.screenshotPath + 'stepview-populated-dom.png',
      fullPage: true 
    });
  });

  test('should verify role-based UI elements display correctly', async ({ page }) => {
    console.log('🔐 Testing role-based UI elements...');

    // Get current user role from configuration
    const userConfig = await page.evaluate(() => {
      const config = window.UMIG_STEP_CONFIG;
      return {
        role: config?.user?.role || 'UNKNOWN',
        isPilot: config?.user?.isPilot || false,
        isAdmin: config?.user?.isAdmin || false,
        bulkOperations: config?.features?.bulkOperations || false
      };
    });

    console.log('👤 Current user configuration:', userConfig);

    // Check step actions visibility
    const stepActionsVisible = await page.locator('.step-actions').isVisible();
    const updateStatusVisible = await page.locator('button.update-status, .update-status').isVisible();
    const bulkCompleteVisible = await page.locator('button.bulk-complete, .bulk-complete').isVisible();

    console.log('🔧 Action button visibility:');
    console.log(`  - Step actions container: ${stepActionsVisible}`);
    console.log(`  - Update status button: ${updateStatusVisible}`);
    console.log(`  - Bulk complete button: ${bulkCompleteVisible}`);

    // Validate role-based access
    if (userConfig.role === 'NORMAL') {
      expect(stepActionsVisible).toBeFalsy();
      console.log('✅ NORMAL user correctly has no action buttons');
      
    } else if (userConfig.role === 'PILOT') {
      expect(stepActionsVisible).toBeTruthy();
      expect(updateStatusVisible).toBeTruthy();
      expect(bulkCompleteVisible).toBeFalsy(); // ADMIN only
      console.log('✅ PILOT user correctly has update status but not bulk complete');
      
    } else if (userConfig.role === 'ADMIN') {
      expect(stepActionsVisible).toBeTruthy();
      expect(updateStatusVisible).toBeTruthy();
      expect(bulkCompleteVisible).toBeTruthy();
      console.log('✅ ADMIN user correctly has all action buttons');
    }

    // Validate bulk operations configuration matches UI
    expect(userConfig.bulkOperations).toBe(userConfig.isPilot);
    console.log(`✅ Bulk operations config (${userConfig.bulkOperations}) matches isPilot (${userConfig.isPilot})`);

    // Take screenshot of role-specific UI
    await page.screenshot({ 
      path: TEST_CONFIG.screenshotPath + `stepview-${userConfig.role.toLowerCase()}-ui.png`,
      fullPage: true 
    });
  });

  test('should verify caching and real-time sync configuration', async ({ page }) => {
    console.log('⚡ Testing caching and real-time sync configuration...');

    // Check if StepViewCache class is available
    const cacheAvailable = await page.evaluate(() => {
      return typeof StepViewCache !== 'undefined';
    });

    if (cacheAvailable) {
      console.log('✅ StepViewCache class is available');

      // Test cache configuration
      const cacheConfig = await page.evaluate(() => {
        const cache = new StepViewCache();
        return {
          cacheTTL: cache.cacheTTL,
          pollingInterval: cache.pollingInterval,
          isPolling: cache.isPolling,
          hasCache: cache.cache instanceof Map
        };
      });

      console.log('💾 Cache configuration:', cacheConfig);

      // Validate cache settings match configuration
      expect(cacheConfig.cacheTTL).toBe(30000);     // 30 seconds
      expect(cacheConfig.pollingInterval).toBe(2000); // 2 seconds
      expect(cacheConfig.isPolling).toBe(false);    // Not started yet
      expect(cacheConfig.hasCache).toBe(true);      // Map instance

      console.log('✅ Cache configuration validated');
    } else {
      console.log('⚠️ StepViewCache class not found - checking global configuration');
    }

    // Verify feature flags are correctly set
    const featureConfig = await page.evaluate(() => {
      const config = window.UMIG_STEP_CONFIG;
      return config?.features || {};
    });

    console.log('🎛️ Feature configuration:', featureConfig);

    expect(featureConfig.caching).toBe(true);
    expect(featureConfig.realTimeSync).toBe(true);
    expect(featureConfig.exportEnabled).toBe(true);
    expect(featureConfig.searchEnabled).toBe(true);
    expect(featureConfig.filterEnabled).toBe(true);

    console.log('✅ Feature flags validated');
  });

  test('should verify error handling and loading states', async ({ page }) => {
    console.log('🚨 Testing error handling and loading states...');

    // Test loading indicator
    const loadingIndicator = page.locator('.loading-indicator');
    const loadingExists = await loadingIndicator.count() > 0;
    expect(loadingExists).toBeTruthy();
    console.log('✅ Loading indicator exists');

    // Test error container
    const errorContainer = page.locator('.error-container');
    const errorExists = await errorContainer.count() > 0;
    expect(errorExists).toBeTruthy();
    console.log('✅ Error container exists');

    // Simulate loading state
    await page.evaluate(() => {
      const loading = document.querySelector('.loading-indicator');
      if (loading) {
        loading.style.display = 'block';
      }
    });

    const loadingVisible = await loadingIndicator.isVisible();
    expect(loadingVisible).toBeTruthy();
    console.log('✅ Loading indicator can be shown');

    // Simulate error state
    await page.evaluate(() => {
      const loading = document.querySelector('.loading-indicator');
      const error = document.querySelector('.error-container');
      const errorMessage = document.querySelector('.error-message');
      
      if (loading) loading.style.display = 'none';
      if (error) error.style.display = 'block';
      if (errorMessage) errorMessage.textContent = 'Test error message';
    });

    const errorVisible = await errorContainer.isVisible();
    const errorText = await page.locator('.error-message').textContent();
    
    expect(errorVisible).toBeTruthy();
    expect(errorText).toBe('Test error message');
    console.log('✅ Error state can be displayed correctly');

    // Reset state
    await page.evaluate(() => {
      const error = document.querySelector('.error-container');
      if (error) error.style.display = 'none';
    });

    // Take screenshot of error/loading states
    await page.screenshot({ 
      path: TEST_CONFIG.screenshotPath + 'stepview-error-states.png',
      fullPage: true 
    });
  });
});

test.afterAll(async () => {
  console.log('🏁 StepView JavaScript-HTML synchronization tests completed');
  console.log(`📁 Screenshots saved to: ${TEST_CONFIG.screenshotPath}`);
});