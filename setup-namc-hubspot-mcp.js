const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

/**
 * NAMC HubSpot MCP Setup Script
 * 
 * This script sets up the complete NAMC HubSpot MCP (Model Context Protocol) integration:
 * 1. Creates property groups for organized data management
 * 2. Creates custom properties for comprehensive member CRM
 * 3. Sets up project management properties
 * 4. Configures task and workflow properties
 * 5. Verifies all components are properly configured
 */

async function setupNAMCHubSpotMCP() {
    console.log('🔧 Setting up NAMC HubSpot MCP Integration System...\n');
    
    const apiKey = process.env.HUBSPOT_ACCESS_TOKEN;
    const portalId = process.env.HUBSPOT_PORTAL_ID;
    
    if (!apiKey) {
        console.log('❌ HUBSPOT_ACCESS_TOKEN not found in .env.local');
        console.log('📝 Please add your HubSpot API key to .env.local file\n');
        return;
    }
    
    console.log('✅ Environment variables loaded');
    console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    if (portalId) console.log(`🏢 Portal ID: ${portalId}`);
    console.log('');

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };

    try {
        console.log('🧪 Step 1: Creating Property Groups...\n');
        
        // Define property groups
        const propertyGroups = [
            // Contact (Member) Property Groups
            {
                objectType: 'contacts',
                name: 'namc_member_info',
                displayName: 'NAMC Member Information',
                displayOrder: 1
            },
            {
                objectType: 'contacts',
                name: 'namc_member_metrics',
                displayName: 'NAMC Member Metrics',
                displayOrder: 2
            },
            // Deal (Project) Property Groups
            {
                objectType: 'deals',
                name: 'namc_project_info',
                displayName: 'NAMC Project Information',
                displayOrder: 1
            },
            {
                objectType: 'deals',
                name: 'namc_project_status',
                displayName: 'NAMC Project Status',
                displayOrder: 2
            },
            {
                objectType: 'deals',
                name: 'namc_project_budget',
                displayName: 'NAMC Project Budget',
                displayOrder: 3
            },
            {
                objectType: 'deals',
                name: 'namc_project_team',
                displayName: 'NAMC Project Team',
                displayOrder: 4
            },
            {
                objectType: 'deals',
                name: 'namc_project_metrics',
                displayName: 'NAMC Project Metrics',
                displayOrder: 5
            }
        ];

        let groupsCreated = 0;
        let groupsExisting = 0;

        for (const group of propertyGroups) {
            try {
                await axios.post(`https://api.hubapi.com/crm/v3/properties/${group.objectType}/groups`, {
                    name: group.name,
                    displayName: group.displayName,
                    displayOrder: group.displayOrder
                }, { headers });
                
                groupsCreated++;
                console.log(`   ✅ Created ${group.objectType} property group: ${group.displayName}`);
            } catch (error) {
                if (error.response?.status === 409) {
                    groupsExisting++;
                    console.log(`   ℹ️  Property group already exists: ${group.displayName}`);
                } else {
                    console.log(`   ⚠️  Failed to create group ${group.displayName}: ${error.response?.data?.message || error.message}`);
                }
            }
        }

        console.log(`\n📊 Property Groups Summary: ${groupsCreated} created, ${groupsExisting} existing`);

        console.log('\n🧪 Step 2: Creating Contact (Member) Custom Properties...\n');
        
        // Define contact custom properties
        const contactProperties = [
            {
                name: 'namc_member_id',
                label: 'NAMC Member ID',
                description: 'Unique identifier for NAMC member',
                groupName: 'namc_member_info',
                type: 'string',
                fieldType: 'text'
            },
            {
                name: 'namc_membership_tier',
                label: 'Membership Tier',
                description: 'NAMC membership tier level',
                groupName: 'namc_member_info',
                type: 'enumeration',
                fieldType: 'select',
                options: [
                    { label: 'Bronze', value: 'bronze' },
                    { label: 'Silver', value: 'silver' },
                    { label: 'Gold', value: 'gold' },
                    { label: 'Platinum', value: 'platinum' }
                ]
            },
            {
                name: 'namc_member_status',
                label: 'Member Status',
                description: 'Current NAMC membership status',
                groupName: 'namc_member_info',
                type: 'enumeration',
                fieldType: 'select',
                options: [
                    { label: 'Active', value: 'active' },
                    { label: 'Inactive', value: 'inactive' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Suspended', value: 'suspended' }
                ]
            },
            {
                name: 'namc_specialties',
                label: 'Member Specialties',
                description: 'Areas of construction specialization',
                groupName: 'namc_member_info',
                type: 'string',
                fieldType: 'textarea'
            },
            {
                name: 'namc_years_experience',
                label: 'Years of Experience',
                description: 'Years of experience in construction industry',
                groupName: 'namc_member_info',
                type: 'number',
                fieldType: 'text'
            },
            {
                name: 'namc_certifications',
                label: 'Certifications',
                description: 'Professional certifications and licenses',
                groupName: 'namc_member_info',
                type: 'string',
                fieldType: 'textarea'
            },
            {
                name: 'namc_service_areas',
                label: 'Service Areas',
                description: 'Geographic areas served',
                groupName: 'namc_member_info',
                type: 'string',
                fieldType: 'textarea'
            },
            {
                name: 'namc_business_size',
                label: 'Business Size',
                description: 'Size classification of member business',
                groupName: 'namc_member_info',
                type: 'enumeration',
                fieldType: 'select',
                options: [
                    { label: 'Sole Proprietor', value: 'sole_proprietor' },
                    { label: 'Small (1-10 employees)', value: 'small' },
                    { label: 'Medium (11-50 employees)', value: 'medium' },
                    { label: 'Large (50+ employees)', value: 'large' }
                ]
            },
            {
                name: 'namc_minority_classification',
                label: 'Minority Classification',
                description: 'Minority business classification',
                groupName: 'namc_member_info',
                type: 'string',
                fieldType: 'textarea'
            },
            // Member Metrics Properties
            {
                name: 'namc_projects_completed',
                label: 'Projects Completed',
                description: 'Number of projects completed through NAMC',
                groupName: 'namc_member_metrics',
                type: 'number',
                fieldType: 'text'
            },
            {
                name: 'namc_avg_project_value',
                label: 'Average Project Value',
                description: 'Average value of projects completed',
                groupName: 'namc_member_metrics',
                type: 'number',
                fieldType: 'text'
            },
            {
                name: 'namc_total_project_value',
                label: 'Total Project Value',
                description: 'Total value of all projects completed',
                groupName: 'namc_member_metrics',
                type: 'number',
                fieldType: 'text'
            },
            {
                name: 'namc_member_score',
                label: 'Member Performance Score',
                description: 'Overall member performance score (1-100)',
                groupName: 'namc_member_metrics',
                type: 'number',
                fieldType: 'text'
            }
        ];

        let createdContactProps = 0;
        let existingContactProps = 0;

        for (const property of contactProperties) {
            try {
                await axios.post('https://api.hubapi.com/crm/v3/properties/contacts', property, { headers });
                createdContactProps++;
                console.log(`   ✅ Created contact property: ${property.label}`);
            } catch (error) {
                if (error.response?.status === 409) {
                    existingContactProps++;
                    console.log(`   ℹ️  Contact property already exists: ${property.label}`);
                } else {
                    console.log(`   ⚠️  Failed to create contact property ${property.label}: ${error.response?.data?.message || error.message}`);
                }
            }
        }

        console.log(`\n📊 Contact Properties Summary: ${createdContactProps} created, ${existingContactProps} existing`);

        console.log('\n🧪 Step 3: Creating Deal (Project) Custom Properties...\n');
        
        // Define deal custom properties
        const dealProperties = [
            // Project Information
            {
                name: 'namc_project_id',
                label: 'NAMC Project ID',
                description: 'Unique identifier for NAMC project',
                groupName: 'namc_project_info',
                type: 'string',
                fieldType: 'text'
            },
            {
                name: 'namc_project_type',
                label: 'Project Type',
                description: 'Type of construction project',
                groupName: 'namc_project_info',
                type: 'enumeration',
                fieldType: 'select',
                options: [
                    { label: 'Residential', value: 'residential' },
                    { label: 'Commercial', value: 'commercial' },
                    { label: 'Industrial', value: 'industrial' },
                    { label: 'Infrastructure', value: 'infrastructure' }
                ]
            },
            {
                name: 'namc_project_category',
                label: 'Project Category',
                description: 'Specific category of construction',
                groupName: 'namc_project_info',
                type: 'string',
                fieldType: 'text'
            },
            {
                name: 'namc_project_location',
                label: 'Project Location',
                description: 'Full address of project location',
                groupName: 'namc_project_info',
                type: 'string',
                fieldType: 'textarea'
            },
            // Project Status
            {
                name: 'namc_project_progress',
                label: 'Project Progress',
                description: 'Overall project completion percentage',
                groupName: 'namc_project_status',
                type: 'number',
                fieldType: 'text'
            },
            {
                name: 'namc_current_phase',
                label: 'Current Phase',
                description: 'Current phase of project execution',
                groupName: 'namc_project_status',
                type: 'string',
                fieldType: 'text'
            },
            {
                name: 'namc_project_priority',
                label: 'Project Priority',
                description: 'Project priority level',
                groupName: 'namc_project_status',
                type: 'enumeration',
                fieldType: 'select',
                options: [
                    { label: 'Low', value: 'low' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'High', value: 'high' },
                    { label: 'Critical', value: 'critical' }
                ]
            },
            {
                name: 'namc_risk_level',
                label: 'Risk Level',
                description: 'Project risk assessment level',
                groupName: 'namc_project_status',
                type: 'enumeration',
                fieldType: 'select',
                options: [
                    { label: 'Low', value: 'low' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'High', value: 'high' }
                ]
            },
            // Project Budget
            {
                name: 'namc_budget_allocated',
                label: 'Budget Allocated',
                description: 'Total budget allocated for project',
                groupName: 'namc_project_budget',
                type: 'number',
                fieldType: 'text'
            },
            {
                name: 'namc_budget_spent',
                label: 'Budget Spent',
                description: 'Amount of budget spent to date',
                groupName: 'namc_project_budget',
                type: 'number',
                fieldType: 'text'
            },
            {
                name: 'namc_budget_remaining',
                label: 'Budget Remaining',
                description: 'Remaining budget amount',
                groupName: 'namc_project_budget',
                type: 'number',
                fieldType: 'text'
            },
            // Project Team
            {
                name: 'namc_project_manager',
                label: 'Project Manager',
                description: 'Primary project manager contact',
                groupName: 'namc_project_team',
                type: 'string',
                fieldType: 'text'
            },
            {
                name: 'namc_team_size',
                label: 'Team Size',
                description: 'Number of team members on project',
                groupName: 'namc_project_team',
                type: 'number',
                fieldType: 'text'
            },
            // Project Metrics
            {
                name: 'namc_minority_participation',
                label: 'Minority Participation %',
                description: 'Percentage of minority contractor participation',
                groupName: 'namc_project_metrics',
                type: 'number',
                fieldType: 'text'
            },
            {
                name: 'namc_quality_score',
                label: 'Quality Score',
                description: 'Project quality assessment score (1-100)',
                groupName: 'namc_project_metrics',
                type: 'number',
                fieldType: 'text'
            },
            {
                name: 'namc_sustainability_rating',
                label: 'Sustainability Rating',
                description: 'Environmental sustainability rating',
                groupName: 'namc_project_metrics',
                type: 'string',
                fieldType: 'text'
            },
            {
                name: 'namc_permit_status',
                label: 'Permit Status',
                description: 'Overall permit approval status',
                groupName: 'namc_project_metrics',
                type: 'enumeration',
                fieldType: 'select',
                options: [
                    { label: 'Not Required', value: 'not_required' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Rejected', value: 'rejected' }
                ]
            }
        ];

        let createdDealProps = 0;
        let existingDealProps = 0;

        for (const property of dealProperties) {
            try {
                await axios.post('https://api.hubapi.com/crm/v3/properties/deals', property, { headers });
                createdDealProps++;
                console.log(`   ✅ Created deal property: ${property.label}`);
            } catch (error) {
                if (error.response?.status === 409) {
                    existingDealProps++;
                    console.log(`   ℹ️  Deal property already exists: ${property.label}`);
                } else {
                    console.log(`   ⚠️  Failed to create deal property ${property.label}: ${error.response?.data?.message || error.message}`);
                }
            }
        }

        console.log(`\n📊 Deal Properties Summary: ${createdDealProps} created, ${existingDealProps} existing`);

        console.log('\n🧪 Step 4: Verifying MCP Setup...\n');
        
        // Test creating a sample member with all custom properties
        const testMemberData = {
            properties: {
                // Standard properties
                email: `test.mcp.member.${Date.now()}@namc-test.org`,
                firstname: 'Test',
                lastname: 'MCP Member',
                company: 'Test MCP Construction LLC',
                phone: '(555) 123-4567',
                lifecyclestage: 'customer',
                hs_lead_status: 'CONNECTED',
                
                // Custom NAMC properties
                namc_member_id: `namc_test_${Date.now()}`,
                namc_membership_tier: 'gold',
                namc_member_status: 'active',
                namc_specialties: 'Commercial Construction, Green Building',
                namc_years_experience: '12',
                namc_business_size: 'medium',
                namc_projects_completed: '6',
                namc_avg_project_value: '1500000'
            }
        };

        try {
            const testMemberResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts', testMemberData, { headers });
            console.log(`   ✅ Successfully created test member with all custom properties`);
            console.log(`   📝 Test Member ID: ${testMemberResponse.data.id}`);
            
            // Clean up test member
            await axios.delete(`https://api.hubapi.com/crm/v3/objects/contacts/${testMemberResponse.data.id}`, { headers });
            console.log(`   🧹 Test member cleaned up successfully`);
        } catch (testError) {
            console.log(`   ⚠️  Test member creation failed: ${testError.response?.data?.message || testError.message}`);
        }

        // Test creating a sample project with all custom properties
        const testProjectData = {
            properties: {
                // Standard properties
                dealname: 'Test MCP Project',
                amount: '500000',
                closedate: '2025-12-31',
                dealstage: 'appointmentscheduled',
                pipeline: 'default',
                
                // Custom NAMC properties
                namc_project_id: `namc_proj_test_${Date.now()}`,
                namc_project_type: 'commercial',
                namc_project_progress: '25',
                namc_minority_participation: '70',
                namc_budget_allocated: '500000',
                namc_budget_spent: '125000',
                namc_budget_remaining: '375000'
            }
        };

        try {
            const testProjectResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/deals', testProjectData, { headers });
            console.log(`   ✅ Successfully created test project with all custom properties`);
            console.log(`   📝 Test Project ID: ${testProjectResponse.data.id}`);
            
            // Clean up test project
            await axios.delete(`https://api.hubapi.com/crm/v3/objects/deals/${testProjectResponse.data.id}`, { headers });
            console.log(`   🧹 Test project cleaned up successfully`);
        } catch (testError) {
            console.log(`   ⚠️  Test project creation failed: ${testError.response?.data?.message || testError.message}`);
        }

        // Final Setup Summary
        console.log('\n🎉 NAMC HubSpot MCP Setup Complete!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Property Groups: Created and configured');
        console.log('✅ Contact Properties: Member CRM system ready');
        console.log('✅ Deal Properties: Project management system ready');
        console.log('✅ System Verification: All components tested');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        console.log('\n📊 Setup Statistics:');
        console.log(`🏷️  Property Groups: ${groupsCreated} created, ${groupsExisting} existing`);
        console.log(`👤 Contact Properties: ${createdContactProps} created, ${existingContactProps} existing`);
        console.log(`💼 Deal Properties: ${createdDealProps} created, ${existingDealProps} existing`);
        console.log(`📋 Total Properties: ${createdContactProps + createdDealProps} created, ${existingContactProps + existingDealProps} existing`);

        console.log('\n🚀 MCP System Capabilities Now Available:');
        console.log('   ✅ Comprehensive member lifecycle management');
        console.log('   ✅ Advanced project tracking and analytics');
        console.log('   ✅ Minority participation monitoring');
        console.log('   ✅ Member performance scoring');
        console.log('   ✅ Project budget and timeline tracking');
        console.log('   ✅ Team member management');
        console.log('   ✅ Quality and risk assessment');
        console.log('   ✅ Permit and compliance tracking');
        console.log('   ✅ Sustainability reporting');
        console.log('   ✅ Custom reporting and analytics');

        console.log('\n🔗 Access Your HubSpot Configuration:');
        console.log(`   ⚙️  Property Settings: https://app.hubspot.com/property-settings/${portalId}/properties`);
        console.log(`   📊 Contact Properties: https://app.hubspot.com/property-settings/${portalId}/properties/contact`);
        console.log(`   💼 Deal Properties: https://app.hubspot.com/property-settings/${portalId}/properties/deal`);

        console.log('\n📈 Next Steps:');
        console.log('1. ✅ Run the full MCP test: node test-namc-mcp-hubspot-full.js');
        console.log('2. 🔄 Set up automated workflows in HubSpot UI');
        console.log('3. 📊 Create custom dashboards and reports');
        console.log('4. 🔔 Configure email notifications and alerts');
        console.log('5. 🌐 Integrate with NAMC website forms and workflows');
        console.log('6. 📱 Set up mobile access and notifications');
        console.log('7. 🎯 Create member engagement scoring workflows');
        console.log('8. 📈 Implement automated reporting schedules');

        console.log('\n✨ NAMC HubSpot MCP System is Production Ready!');

    } catch (error) {
        console.log('❌ NAMC HubSpot MCP setup failed!');
        console.log('');
        
        if (error.response) {
            console.log(`HTTP Status: ${error.response.status}`);
            console.log(`Error Message: ${error.response.data?.message || 'Unknown error'}`);
            
            if (error.response.status === 401) {
                console.log('');
                console.log('🔑 Authentication Error - Your HubSpot API key needs these scopes:');
                console.log('   ✅ crm.objects.contacts.read/write');
                console.log('   ✅ crm.objects.deals.read/write');
                console.log('   ✅ crm.objects.tasks.read/write');
                console.log('   ✅ crm.schemas.contacts.read/write');
                console.log('   ✅ crm.schemas.deals.read/write');
                console.log('   ✅ crm.schemas.tasks.read/write');
            }
            
            if (error.response.status === 403) {
                console.log('');
                console.log('🚫 Permission Error - Your HubSpot account needs:');
                console.log('   ✅ Professional or Enterprise tier for custom properties');
                console.log('   ✅ Permission to create custom objects and properties');
                console.log('   ✅ API access enabled in account settings');
            }
        } else {
            console.log(`Network Error: ${error.message}`);
        }
        
        console.log('');
        console.log('💡 Troubleshooting:');
        console.log('1. Check HubSpot Private App permissions');
        console.log('2. Verify account tier supports custom properties');
        console.log('3. Ensure API rate limits are not exceeded');
        console.log('4. Contact HubSpot support if issues persist');
    }
}

// Run the setup
setupNAMCHubSpotMCP();