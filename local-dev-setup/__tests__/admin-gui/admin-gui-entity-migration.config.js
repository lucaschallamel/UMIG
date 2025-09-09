/**
 * Test Configuration for Admin GUI Entity Migration Tests
 * 
 * Provides centralized configuration for all Admin GUI entity migration tests
 * including test data, mock configurations, and helper functions.
 */

// Test data for iterationTypes
const ITERATION_TYPES_TEST_DATA = {
  valid: {
    itt_code: 'TESTIT',
    itt_name: 'Test Iteration Type',
    itt_description: 'Test description for iteration type',
    itt_color: '#FF5722',
    itt_icon: 'test-icon',
    itt_display_order: 1,
    itt_active: true
  },
  invalid: {
    empty_code: { itt_code: '', itt_name: 'Test', itt_color: '#FF0000' },
    long_code: { itt_code: 'a'.repeat(25), itt_name: 'Test', itt_color: '#FF0000' },
    invalid_color: { itt_code: 'TEST', itt_name: 'Test', itt_color: 'invalid-color' }
  },
  defaults: {
    itt_color: '#6B73FF',
    itt_icon: 'play-circle',
    itt_display_order: 0,
    itt_active: true
  }
};

// Test data for migrationTypes
const MIGRATION_TYPES_TEST_DATA = {
  valid: {
    mtm_id: 1,
    mtm_code: 'TESTMT',
    mtm_name: 'Test Migration Type',
    mtm_description: 'Test description for migration type',
    mtm_color: '#9C27B0',
    mtm_icon: 'migration-test',
    mtm_display_order: 1,
    mtm_active: true
  },
  invalid: {
    empty_code: { mtm_code: '', mtm_name: 'Test', mtm_color: '#FF0000' },
    long_code: { mtm_code: 'a'.repeat(25), mtm_name: 'Test', mtm_color: '#FF0000' },
    invalid_color: { mtm_code: 'TEST', mtm_name: 'Test', mtm_color: 'not-a-color' }
  },
  defaults: {
    mtm_color: '#6B73FF',
    mtm_icon: 'migration',
    mtm_display_order: 0,
    mtm_active: true
  }
};

// Mock EntityConfig for unit tests
const createMockEntityConfig = () => ({
  getAllEntities: jest.fn().mockReturnValue({
    users: { name: 'Users', fields: [] },
    teams: { name: 'Teams', fields: [] },
    iterationTypes: {
      name: 'Iteration Types',
      description: 'Manage iteration types and their configurations',
      fields: [
        {
          key: 'itt_code',
          label: 'Code',
          type: 'text',
          required: true,
          maxLength: 20,
          readonly: false,
        },
        {
          key: 'itt_name',
          label: 'Name',
          type: 'text',
          required: true,
          maxLength: 100,
        },
        {
          key: 'itt_description',
          label: 'Description',
          type: 'textarea',
          maxLength: 500,
        },
        {
          key: 'itt_color',
          label: 'Color',
          type: 'color',
          required: true,
          default: '#6B73FF',
        },
        {
          key: 'itt_icon',
          label: 'Icon',
          type: 'text',
          maxLength: 50,
          default: 'play-circle',
        },
        {
          key: 'itt_display_order',
          label: 'Display Order',
          type: 'number',
          required: true,
          default: 0,
        },
        {
          key: 'itt_active',
          label: 'Active',
          type: 'boolean',
          required: true,
          default: true,
        }
      ]
    },
    migrationTypes: {
      name: 'Migration Types',
      description: 'Manage migration types and their configurations',
      fields: [
        {
          key: 'mtm_id',
          label: 'ID',
          type: 'number',
          readonly: true,
          primaryKey: true,
        },
        {
          key: 'mtm_code',
          label: 'Code',
          type: 'text',
          required: true,
          maxLength: 20,
          readonly: false,
        },
        {
          key: 'mtm_name',
          label: 'Name',
          type: 'text',
          required: true,
          maxLength: 100,
        },
        {
          key: 'mtm_description',
          label: 'Description',
          type: 'textarea',
          maxLength: 500,
        },
        {
          key: 'mtm_color',
          label: 'Color',
          type: 'color',
          required: true,
          default: '#6B73FF',
        },
        {
          key: 'mtm_icon',
          label: 'Icon',
          type: 'text',
          maxLength: 50,
          default: 'migration',
        },
        {
          key: 'mtm_display_order',
          label: 'Display Order',
          type: 'number',
          required: true,
          default: 0,
        },
        {
          key: 'mtm_active',
          label: 'Active',
          type: 'boolean',
          required: true,
          default: true,
        }
      ]
    }
  }),
  getEntity: jest.fn().mockImplementation((entityName) => {
    const entities = createMockEntityConfig().getAllEntities();
    return entities[entityName] || null;
  })
});

// API endpoints for testing
const API_ENDPOINTS = {
  base: '/rest/scriptrunner/latest/custom',
  iterationTypes: '/iterationTypes',
  migrationTypes: '/migrationTypes',
  users: '/users',
  teams: '/teams',
  labels: '/labels'
};

// Common test utilities
const TestUtils = {
  // Create a mock API response handler
  createMockApiHandler: (entity, data = []) => {
    let items = [...data];
    let nextId = Math.max(...items.map(item => item.id || item.mtm_id || 0)) + 1;

    return async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      try {
        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(items)
          });
        } else if (method === 'POST') {
          const postData = JSON.parse(await route.request().postData());
          const newItem = {
            ...postData,
            [entity === 'migrationTypes' ? 'mtm_id' : 'id']: nextId++,
            created_at: new Date().toISOString(),
            created_by: 'testuser'
          };
          items.push(newItem);
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newItem)
          });
        } else if (method === 'PUT') {
          const putData = JSON.parse(await route.request().postData());
          const index = items.findIndex(item => 
            (item.id && item.id.toString() === url.split('/').pop()) ||
            (item.mtm_id && item.mtm_id.toString() === url.split('/').pop())
          );
          if (index >= 0) {
            items[index] = { ...items[index], ...putData };
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(items[index])
            });
          } else {
            await route.fulfill({ status: 404 });
          }
        } else if (method === 'DELETE') {
          const id = url.split('/').pop();
          items = items.filter(item => 
            (item.id && item.id.toString() !== id) &&
            (item.mtm_id && item.mtm_id.toString() !== id)
          );
          await route.fulfill({ status: 204 });
        } else {
          await route.continue();
        }
      } catch (error) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: error.message })
        });
      }
    };
  },

  // Create error response handler
  createErrorHandler: (status = 500, message = 'Internal Server Error') => {
    return async (route) => {
      await route.fulfill({
        status: status,
        contentType: 'application/json',
        body: JSON.stringify({ error: message })
      });
    };
  },

  // Wait for Admin GUI to be ready
  waitForAdminGUI: async (page, timeout = 10000) => {
    await page.waitForSelector('[data-umig-ready="true"]', { timeout });
  },

  // Navigate to specific entity section
  navigateToSection: async (page, section, timeout = 5000) => {
    await page.click(`button[data-section="${section}"]`);
    await page.waitForSelector(`#${section}-table`, { timeout });
  },

  // Open create modal for entity
  openCreateModal: async (page, entity, timeout = 3000) => {
    await page.click(`#add-${entity}`);
    await page.waitForSelector('.modal', { timeout });
  },

  // Fill form with test data
  fillForm: async (page, data) => {
    for (const [key, value] of Object.entries(data)) {
      const element = page.locator(`#${key}`);
      const elementType = await element.getAttribute('type');
      
      if (elementType === 'checkbox') {
        if (value) {
          await element.check();
        } else {
          await element.uncheck();
        }
      } else {
        await element.fill(value.toString());
      }
    }
  },

  // Submit form and wait for response
  submitForm: async (page, timeout = 3000) => {
    await page.click('.modal .btn-primary');
    await page.waitForSelector('.modal', { state: 'hidden', timeout });
  },

  // Check for notification
  checkNotification: async (page, type = 'success') => {
    return await page.locator(`.notification-${type}`).isVisible();
  },

  // Get console messages of specific type
  getConsoleMessages: (page, type = 'error') => {
    const messages = [];
    page.on('console', msg => {
      if (msg.type() === type) {
        messages.push(msg.text());
      }
    });
    return messages;
  }
};

// Test configuration for different environments
const TEST_CONFIG = {
  development: {
    baseUrl: 'http://localhost:8090',
    timeout: 30000,
    retries: 2
  },
  ci: {
    baseUrl: 'http://confluence:8090',
    timeout: 60000,
    retries: 3
  }
};

// Export all configuration
module.exports = {
  ITERATION_TYPES_TEST_DATA,
  MIGRATION_TYPES_TEST_DATA,
  createMockEntityConfig,
  API_ENDPOINTS,
  TestUtils,
  TEST_CONFIG
};