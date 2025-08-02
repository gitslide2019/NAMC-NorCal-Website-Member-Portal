// Test script to check Shovels API connectivity and search results
require('dotenv').config({ path: '.env.local' });

const SHOVELS_API_KEY = process.env.NEXT_PUBLIC_SHOVELS_API_KEY;
// Shovels API V2 configuration (updated January 2025)
const BASE_URL = 'https://api.shovels.ai/v2';
const API_ENDPOINTS = {
  permits: '/permits/search',
  contractors: '/contractors/search',
  addresses: '/addresses/search',
  meta: '/meta/release'
};

async function testShovelsAPI() {
  console.log('🔍 Testing Shovels API V2 Connection...');
  
  if (!SHOVELS_API_KEY) {
    console.error('❌ NEXT_PUBLIC_SHOVELS_API_KEY not found in environment');
    return null;
  }
  
  console.log('✅ API Key found:', SHOVELS_API_KEY.substring(0, 10) + '...');
  console.log('🌐 Using API V2:', BASE_URL);
  
  try {
    // Test 1: API Meta endpoint to verify connection
    console.log('\n🧪 Test 1: API Meta Connection');
    const metaResponse = await fetch(`${BASE_URL}${API_ENDPOINTS.meta}`, {
      headers: {
        'X-API-Key': SHOVELS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Meta response status:', metaResponse.status);
    
    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      console.log('✅ API Connection successful!');
      console.log('API Release info:', metaData);
    } else {
      const errorText = await metaResponse.text();
      console.error('❌ Meta endpoint failed:', errorText);
    }
    
    // Test 2: Basic permits search
    console.log('\n🧪 Test 2: Basic Permits Search (California)');
    const basicParams = new URLSearchParams({
      permit_from: '2024-01-01',
      permit_to: '2024-12-31',
      geo_id: 'CA',
      limit: '5'
    });
    const basicResponse = await fetch(`${BASE_URL}${API_ENDPOINTS.permits}?${basicParams}`, {
      headers: {
        'X-API-Key': SHOVELS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Permits search status:', basicResponse.status);
    
    if (!basicResponse.ok) {
      const errorText = await basicResponse.text();
      console.error('❌ Basic permits search failed:', errorText);
      return null;
    }
    
    const basicData = await basicResponse.json();
    console.log('✅ Basic permits search successful!');
    console.log('Response structure:', Object.keys(basicData));
    console.log('Permits returned:', basicData.permits ? basicData.permits.length : 0);
    
    if (basicData.permits && basicData.permits.length > 0) {
      console.log('Sample permit:', {
        permit_number: basicData.permits[0].permit_number,
        city: basicData.permits[0].city,
        state: basicData.permits[0].state,
        address: basicData.permits[0].address || 'N/A'
      });
    }
    
    // Test 3: Oakland-specific search (using Oakland zip codes as geo_id)
    console.log('\n🧪 Test 3: Oakland-Specific Search');
    const oaklandParams = new URLSearchParams({
      permit_from: '2024-01-01',
      permit_to: '2024-12-31',
      geo_id: '94601', // Oakland zip code
      limit: '10'
    });
    const oaklandResponse = await fetch(`${BASE_URL}${API_ENDPOINTS.permits}?${oaklandParams}`, {
      headers: {
        'X-API-Key': SHOVELS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Oakland search status:', oaklandResponse.status);
    
    if (oaklandResponse.ok) {
      const oaklandData = await oaklandResponse.json();
      console.log('✅ Oakland search successful!');
      console.log('Oakland permits found:', oaklandData.permits ? oaklandData.permits.length : 0);
      
      if (oaklandData.permits && oaklandData.permits.length > 0) {
        console.log('Sample Oakland permit:', {
          permit_number: oaklandData.permits[0].permit_number,
          description: oaklandData.permits[0].description || 'N/A',
          valuation: oaklandData.permits[0].valuation || 'N/A',
          issued_date: oaklandData.permits[0].issued_date || 'N/A'
        });
      } else {
        console.log('⚠️ No permits found for Oakland in current data');
      }
    } else {
      const errorText = await oaklandResponse.text();
      console.error('❌ Oakland search failed:', errorText);
    }
    
    // Test 4: San Francisco search for comparison
    console.log('\n🧪 Test 4: San Francisco Search (for comparison)');
    const sfParams = new URLSearchParams({
      permit_from: '2024-01-01',
      permit_to: '2024-12-31',
      geo_id: '94102', // San Francisco zip code
      limit: '5'
    });
    const sfResponse = await fetch(`${BASE_URL}${API_ENDPOINTS.permits}?${sfParams}`, {
      headers: {
        'X-API-Key': SHOVELS_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (sfResponse.ok) {
      const sfData = await sfResponse.json();
      console.log('San Francisco permits found:', sfData.permits ? sfData.permits.length : 0);
    }
    
    console.log(`\n🎯 RECOMMENDATION: Update useShovelsAPI.ts to use V2 API`);
    console.log(`- Base URL: ${BASE_URL}`);
    console.log(`- Endpoint: ${API_ENDPOINTS.permits}`);
    console.log(`- Auth Header: X-API-Key (not Bearer token)`);
    
    return BASE_URL;
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
    return null;
  }
}

// Test with different V2 API endpoints
async function testAPIEndpoints(workingBaseURL) {
  if (!workingBaseURL) {
    console.log('\n⚠️ Skipping endpoint tests - no working base URL found');
    return;
  }
  
  console.log('\n🔍 Testing different V2 API endpoints...');
  
  const endpoints = [
    { name: 'Permits Search', path: API_ENDPOINTS.permits },
    { name: 'Contractors Search', path: API_ENDPOINTS.contractors },
    { name: 'Addresses Search', path: API_ENDPOINTS.addresses }
  ];
  
  for (const endpoint of endpoints) {
    try {
      // Use correct V2 parameters for permits/search
      let queryParams;
      if (endpoint.path === API_ENDPOINTS.permits) {
        queryParams = new URLSearchParams({
          permit_from: '2024-01-01',
          permit_to: '2024-12-31',
          geo_id: 'CA',
          limit: '1'
        });
      } else {
        queryParams = new URLSearchParams({
          geo_id: 'CA',
          limit: '1'
        });
      }
      
      const response = await fetch(`${workingBaseURL}${endpoint.path}?${queryParams}`, {
        headers: {
          'X-API-Key': SHOVELS_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`${endpoint.name}: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  Data keys: ${Object.keys(data).join(', ')}`);
        
        // Show sample data structure
        if (endpoint.name === 'Permits Search' && data.permits && data.permits.length > 0) {
          console.log(`  Sample permit fields: ${Object.keys(data.permits[0]).join(', ')}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`  Error: ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`${endpoint.name}: ERROR - ${error.message}`);
    }
  }
}

// Run the tests
async function runAllTests() {
  const workingURL = await testShovelsAPI();
  await testAPIEndpoints(workingURL);
  
  console.log('\n🎯 Test Summary:');
  if (workingURL) {
    console.log(`✅ Found working API endpoint: ${workingURL}`);
    console.log('Next step: Update useShovelsAPI.ts to use this endpoint');
  } else {
    console.log('❌ No working API endpoints found');
    console.log('- Check API key validity');
    console.log('- Verify Shovels API documentation for correct endpoints');
    console.log('- Consider contacting Shovels API support');
  }
}

runAllTests();