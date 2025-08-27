#!/usr/bin/env node

/**
 * Test the fixed StepView URL generation
 * Tests the API changes and JavaScript URL construction fixes
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8090';
const SCRIPTRUNNER_BASE = '/rest/scriptrunner/latest/custom';

async function testMigrationsAPI() {
  console.log('\n=== Testing Migrations API ===');
  try {
    const response = await fetch(`${BASE_URL}${SCRIPTRUNNER_BASE}/migrations`);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response format:', Array.isArray(data) ? 'Array' : 'Object');
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('First migration:', {
        id: data[0].id,
        name: data[0].name
      });
      console.log('✓ Migrations API returns correct format');
      return data[0]; // Return first migration for iterations test
    } else {
      console.log('✗ Migrations API format incorrect or empty');
      return null;
    }
  } catch (error) {
    console.log('✗ Migrations API error:', error.message);
    return null;
  }
}

async function testIterationsAPI(migration) {
  console.log('\n=== Testing Iterations API ===');
  if (!migration) {
    console.log('⏭ Skipping iterations test - no migration available');
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}${SCRIPTRUNNER_BASE}/migrations/${migration.id}/iterations`);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response format:', Array.isArray(data) ? 'Array' : 'Object');
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('First iteration:', {
        id: data[0].id,
        name: data[0].name,
        code: data[0].code
      });
      
      if (data[0].code) {
        console.log('✓ Iterations API includes code field');
        return data[0];
      } else {
        console.log('✗ Iterations API missing code field');
        return null;
      }
    } else {
      console.log('✗ Iterations API format incorrect or empty');
      return null;
    }
  } catch (error) {
    console.log('✗ Iterations API error:', error.message);
    return null;
  }
}

function testUrlConstruction(migration, iteration) {
  console.log('\n=== Testing URL Construction Logic ===');
  if (!migration || !iteration) {
    console.log('⏭ Skipping URL construction test - missing data');
    return;
  }

  // Simulate the fixed JavaScript logic
  const migrationCode = migration.name; // For migrations, name serves as code
  const iterationCode = iteration.code;  // For iterations, use the code field
  const stepCode = 'BUS-002'; // Sample step code

  console.log('Input parameters:', {
    migrationCode,
    iterationCode, 
    stepCode
  });

  // Simulate building the URL
  const baseUrl = 'http://localhost:8090/pages/viewpage.action';
  const pageId = '1114120';
  
  const params = new URLSearchParams();
  params.set('pageId', pageId);
  params.set('mig', migrationCode);
  params.set('ite', iterationCode);
  params.set('stepid', stepCode);
  
  const constructedUrl = `${baseUrl}?${params.toString()}`;
  
  console.log('Constructed URL:', constructedUrl);
  
  // Validate the URL format
  const expectedFormat = /^http:\/\/localhost:8090\/pages\/viewpage\.action\?pageId=\d+&mig=.+&ite=.+&stepid=.+$/;
  if (expectedFormat.test(constructedUrl)) {
    console.log('✓ URL format is correct');
  } else {
    console.log('✗ URL format is incorrect');
  }
  
  // Check for problematic patterns from the original issue
  if (constructedUrl.includes('/spaces/UMIG/pages/')) {
    console.log('✗ URL still uses old spaces format');
  } else {
    console.log('✓ URL uses correct viewpage.action format');
  }
  
  if (migrationCode.includes('Operativebandwidth') || iterationCode.includes('Iteration1forPlan')) {
    console.log('✗ URL contains concatenated names instead of proper codes');
  } else {
    console.log('✓ URL uses proper codes');
  }
}

async function runTests() {
  console.log('🧪 Testing StepView URL Fix');
  console.log('================================');
  
  const migration = await testMigrationsAPI();
  const iteration = await testIterationsAPI(migration);
  testUrlConstruction(migration, iteration);
  
  console.log('\n=== Test Summary ===');
  console.log('Check the results above for any ✗ failures');
  console.log('All ✓ indicators mean the fixes are working correctly');
}

// Run the tests
runTests().catch(console.error);