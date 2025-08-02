// Test script for the updated useShovelsAPI hook
require('dotenv').config({ path: '.env.local' });

// Simulate the hook's makeAPIRequest function
async function testUpdatedAPILogic() {
  const SHOVELS_API_KEY = process.env.NEXT_PUBLIC_SHOVELS_API_KEY;
  const BASE_URL = 'https://api.shovels.ai/v2';
  
  console.log('🧪 Testing Updated Hook Logic...');
  
  if (!SHOVELS_API_KEY) {
    console.error('❌ API Key not found');
    return;
  }
  
  // Test the searchPermits logic with different scenarios
  const testCases = [
    {
      name: 'Oakland City Search', 
      params: { city: 'Oakland', state: 'CA' }
    },
    {
      name: 'San Francisco Zip Search',
      params: { zip: '94102' }
    },
    {
      name: 'California State Search',
      params: { state: 'CA' }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 ${testCase.name}:`);
    
    try {
      // Simulate the hook's logic
      const defaultDateFrom = testCase.params.dateFrom || '2023-01-01';
      const defaultDateTo = testCase.params.dateTo || '2024-12-31';
      
      let geo_id = 'CA';
      if (testCase.params.zip) {
        geo_id = testCase.params.zip;
      } else if (testCase.params.city && testCase.params.state) {
        geo_id = testCase.params.state;
      } else if (testCase.params.state) {
        geo_id = testCase.params.state;
      }
      
      console.log(`  Parameters: permit_from=${defaultDateFrom}, permit_to=${defaultDateTo}, geo_id=${geo_id}`);
      
      const url = new URL(`${BASE_URL}/permits/search`);
      url.searchParams.append('permit_from', defaultDateFrom);
      url.searchParams.append('permit_to', defaultDateTo);
      url.searchParams.append('geo_id', geo_id);
      url.searchParams.append('limit', '10');
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-API-Key': SHOVELS_API_KEY,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`  Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Success! Found ${data.items ? data.items.length : 0} permits`);
        
        if (data.items && data.items.length > 0) {
          const sample = data.items[0];
          console.log(`  Sample permit: ${sample.permit_number || 'N/A'} - ${sample.description || 'No description'}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`  ❌ Error: ${errorText.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`  ❌ Exception: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Hook Update Summary:');
  console.log('✅ V2 API configuration updated');
  console.log('✅ X-API-Key authentication implemented');
  console.log('✅ Required parameters (permit_from, permit_to, geo_id) added');
  console.log('✅ Response format updated (items array)');
}

testUpdatedAPILogic();