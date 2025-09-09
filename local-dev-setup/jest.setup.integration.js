// Integration Test Setup - Requires running infrastructure
console.log('🔗 Setting up Integration Test environment...');

// Check infrastructure availability
const checkInfrastructure = async () => {
  const checks = {
    database: false,
    confluence: false,
    api: false
  };
  
  // Try to check database connection if utilities are available
  try {
    const { testConnection } = await import('./scripts/utilities/database-utils.js');
    checks.database = await testConnection();
  } catch (e) {
    console.warn('⚠️  Database not available:', e.message);
  }
  
  // Check Confluence availability
  try {
    const response = await fetch('http://localhost:8090/status', { 
      signal: AbortSignal.timeout(5000) 
    });
    checks.confluence = response.ok;
  } catch (e) {
    console.warn('⚠️  Confluence not available:', e.message);
  }
  
  // Check API server availability
  try {
    const response = await fetch('http://localhost:8090/rest/scriptrunner/latest/custom/test', {
      signal: AbortSignal.timeout(5000)
    });
    checks.api = response.ok;
  } catch (e) {
    console.warn('⚠️  API server not available:', e.message);
  }
  
  return checks;
};

// Skip tests if infrastructure not available
beforeAll(async () => {
  const infrastructure = await checkInfrastructure();
  
  if (!infrastructure.database || !infrastructure.confluence || !infrastructure.api) {
    console.log('🚫 Skipping integration tests - infrastructure not available');
    console.log('💡 Run "npm start" to start required services');
    console.log(`   Database: ${infrastructure.database ? '✅' : '❌'}`);
    console.log(`   Confluence: ${infrastructure.confluence ? '✅' : '❌'}`);
    console.log(`   API Server: ${infrastructure.api ? '✅' : '❌'}`);
    
    // Skip all tests in this run
    const originalTest = global.test;
    const originalIt = global.it;
    const originalDescribe = global.describe;
    
    global.test = (...args) => originalTest.skip(...args);
    global.it = (...args) => originalIt.skip(...args);
    global.describe = (name, fn) => originalDescribe.skip(name, fn);
  } else {
    console.log('✅ Integration test environment ready');
    console.log('   Database: ✅');
    console.log('   Confluence: ✅');
    console.log('   API Server: ✅');
  }
}, 10000); // 10 second timeout for infrastructure checks

// Integration test utilities
global.integrationUtils = {
  apiBase: 'http://localhost:8090/rest/scriptrunner/latest/custom',
  
  apiCall: async (endpoint, options = {}) => {
    const url = `${global.integrationUtils.apiBase}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  waitForService: async (url, maxAttempts = 30, delay = 1000) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url, { 
          signal: AbortSignal.timeout(2000) 
        });
        if (response.ok) return true;
      } catch (e) {
        // Service not ready, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error(`Service at ${url} not available after ${maxAttempts} attempts`);
  }
};

// Cleanup between tests
afterEach(async () => {
  // Clean up any test data created during integration tests
  jest.clearAllMocks();
});

console.log('✅ Integration test setup complete');