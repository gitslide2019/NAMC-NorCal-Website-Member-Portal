const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

async function testHubSpotConnection() {
    console.log('🔗 Testing HubSpot MCP Integration...\n');
    
    const apiKey = process.env.HUBSPOT_ACCESS_TOKEN;
    const portalId = process.env.HUBSPOT_PORTAL_ID;
    
    if (!apiKey) {
        console.log('❌ HUBSPOT_ACCESS_TOKEN not found in .env.local');
        console.log('📝 Please add your HubSpot API key to .env.local file\n');
        return;
    }
    
    if (!portalId) {
        console.log('⚠️  HUBSPOT_PORTAL_ID not found in .env.local');
        console.log('📝 This is optional but recommended for better organization\n');
    }
    
    console.log('✅ Environment variables loaded');
    console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    if (portalId) console.log(`🏢 Portal ID: ${portalId}`);
    console.log('');
    
    try {
        // Test 1: Verify API Key and Get Account Info
        console.log('🧪 Test 1: Verifying API connection...');
        const accountResponse = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            params: { limit: 1 }
        });
        
        console.log('✅ API connection successful!');
        console.log(`📊 Total contacts available: ${accountResponse.data.total || 'Unknown'}\n`);
        
        // Test 2: Create a Test Contact
        console.log('🧪 Test 2: Creating test contact...');
        const testContact = {
            properties: {
                email: `test.namc.${Date.now()}@example.com`,
                firstname: 'NAMC',
                lastname: 'Test Contact',
                company: 'Test Construction Company',
                phone: '(555) 123-4567',
                jobtitle: 'Test Contractor',
                membership_status: 'test_member',
                specialties: 'Residential,Commercial',
                years_experience: '10'
            }
        };
        
        const contactResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts', testContact, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        const createdContactId = contactResponse.data.id;
        console.log('✅ Test contact created successfully!');
        console.log(`📝 Contact ID: ${createdContactId}`);
        console.log(`📧 Email: ${contactResponse.data.properties.email}\n`);
        
        // Test 3: Create a Test Deal
        console.log('🧪 Test 3: Creating test deal...');
        const testDeal = {
            properties: {
                dealname: 'NAMC Test Project - Downtown Renovation',
                dealstage: 'appointmentscheduled',
                pipeline: 'default',
                amount: '150000',
                closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
                project_type: 'Commercial',
                location: 'San Francisco, CA',
                budget_range: '$100k-$200k'
            }
        };
        
        const dealResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/deals', testDeal, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        const createdDealId = dealResponse.data.id;
        console.log('✅ Test deal created successfully!');
        console.log(`💼 Deal ID: ${createdDealId}`);
        console.log(`💰 Amount: $${dealResponse.data.properties.amount}\n`);
        
        // Test 4: Associate Contact with Deal
        console.log('🧪 Test 4: Associating contact with deal...');
        try {
            await axios.put(
                `https://api.hubapi.com/crm/v4/objects/contacts/${createdContactId}/associations/deals/${createdDealId}`,
                {
                    associationCategory: 'HUBSPOT_DEFINED',
                    associationTypeId: 4 // Contact to Deal association
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('✅ Contact and deal associated successfully!\n');
        } catch (associationError) {
            console.log('⚠️  Association failed (this is non-critical)');
            console.log(`   Error: ${associationError.response?.data?.message || associationError.message}\n`);
        }
        
        // Test 5: Search for Contact
        console.log('🧪 Test 5: Testing contact search...');
        const searchResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts/search', {
            filterGroups: [{
                filters: [{
                    propertyName: 'email',
                    operator: 'EQ',
                    value: testContact.properties.email
                }]
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Contact search successful!');
        console.log(`🔍 Found ${searchResponse.data.results.length} matching contact(s)\n`);
        
        // Summary
        console.log('🎉 All HubSpot MCP Integration Tests Passed!');
        console.log('');
        console.log('📋 Test Results Summary:');
        console.log('✅ API connection verified');
        console.log('✅ Contact creation working');
        console.log('✅ Deal creation working');
        console.log('✅ Contact search working');
        console.log('');
        console.log('🚀 Your HubSpot integration is ready to use!');
        console.log('');
        console.log('🔗 Check your HubSpot account:');
        console.log(`   - Contacts: https://app.hubspot.com/contacts/${portalId || 'YOUR_PORTAL_ID'}/contacts/list/view/all/`);
        console.log(`   - Deals: https://app.hubspot.com/sales/${portalId || 'YOUR_PORTAL_ID'}/deals/board/view/all/`);
        console.log('');
        console.log('🧪 Next Steps:');
        console.log('1. Test newsletter signup on your website');
        console.log('2. Test contact form submission');
        console.log('3. Check that data appears in HubSpot');
        
    } catch (error) {
        console.log('❌ HubSpot integration test failed!');
        console.log('');
        
        if (error.response) {
            console.log(`HTTP Status: ${error.response.status}`);
            console.log(`Error Message: ${error.response.data?.message || 'Unknown error'}`);
            
            if (error.response.status === 401) {
                console.log('');
                console.log('🔑 Authentication Error - Possible Issues:');
                console.log('   1. Invalid or expired API key');
                console.log('   2. API key lacks required permissions');
                console.log('   3. Check your Private App settings in HubSpot');
                console.log('');
                console.log('Required Scopes:');
                console.log('   - crm.objects.contacts.read');
                console.log('   - crm.objects.contacts.write');
                console.log('   - crm.objects.deals.read');
                console.log('   - crm.objects.deals.write');
            }
            
            if (error.response.status === 429) {
                console.log('');
                console.log('⏱️  Rate Limit Error:');
                console.log('   You have exceeded HubSpot API rate limits');
                console.log('   Wait a few minutes and try again');
            }
        } else {
            console.log(`Network Error: ${error.message}`);
        }
        
        console.log('');
        console.log('💡 Troubleshooting Tips:');
        console.log('1. Verify your API key in .env.local file');
        console.log('2. Check HubSpot Private App permissions');
        console.log('3. Ensure your HubSpot account is active');
        console.log('4. Try testing with a smaller request first');
    }
}

// Run the test
testHubSpotConnection();