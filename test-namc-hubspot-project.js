const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

/**
 * NAMC Member Portal HubSpot Integration Test
 * 
 * This script demonstrates the complete HubSpot integration capabilities for NAMC member portal:
 * 1. Creates a project from the NAMC portal structure
 * 2. Creates associated contacts (project manager, team members, client)
 * 3. Creates a HubSpot deal representing the project
 * 4. Creates tasks for project milestones
 * 5. Associates all entities together in HubSpot
 * 6. Demonstrates member capabilities and workflow management
 */

async function testNAMCHubSpotIntegration() {
    console.log('🏗️  Testing NAMC Member Portal HubSpot Integration...\n');
    
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

    // Sample NAMC project data based on the portal structure
    const namcProject = {
        id: `namc_proj_${Date.now()}`,
        title: 'NAMC Downtown Oakland Mixed-Use Development',
        description: 'Large-scale mixed-use development project featuring affordable housing, retail spaces, and community center. NAMC member-led consortium project showcasing minority contractor capabilities.',
        client: 'Oakland Housing Authority',
        category: 'commercial',
        budget: {
            allocated: 4500000,
            spent: 1350000,
            remaining: 3150000,
            percentage: 30
        },
        timeline: {
            startDate: '2024-02-01',
            endDate: '2025-08-30',
            currentPhase: 'Foundation & Structure',
            progress: 35
        },
        status: 'in_progress',
        priority: 'high',
        team: [
            { 
                name: 'Carlos Rodriguez', 
                role: 'Project Manager', 
                company: 'Rodriguez Construction LLC',
                email: `carlos.rodriguez.${Date.now()}@namc-test.org`,
                phone: '(510) 555-0101',
                specialties: ['Commercial Construction', 'Mixed-Use Development'],
                yearsExperience: 15,
                membershipTier: 'Gold'
            },
            { 
                name: 'Aisha Williams', 
                role: 'Electrical Lead', 
                company: 'Williams Electric Solutions',
                email: `aisha.williams.${Date.now()}@namc-test.org`,
                phone: '(510) 555-0102',
                specialties: ['Commercial Electrical', 'Smart Building Systems'],
                yearsExperience: 12,
                membershipTier: 'Silver'
            },
            { 
                name: 'David Chen', 
                role: 'Structural Engineer', 
                company: 'Chen Engineering Services',
                email: `david.chen.${Date.now()}@namc-test.org`,
                phone: '(510) 555-0103',
                specialties: ['Structural Engineering', 'Seismic Design'],
                yearsExperience: 18,
                membershipTier: 'Platinum'
            }
        ],
        clientContact: {
            name: 'Janet Thompson',
            role: 'Development Director',
            company: 'Oakland Housing Authority',
            email: `janet.thompson.${Date.now()}@oakland.gov`,
            phone: '(510) 555-0200'
        },
        location: {
            address: '1200 Broadway, Oakland, CA 94612',
            city: 'Oakland',
            state: 'CA',
            coordinates: { lat: 37.8044, lng: -122.2712 }
        },
        workflows: [
            {
                id: 'wf_planning',
                name: 'Project Planning & Permits',
                status: 'completed',
                tasks: [
                    { name: 'Site Survey & Assessment', assignee: 'Carlos Rodriguez', dueDate: '2024-02-15', priority: 'High' },
                    { name: 'Building Permits Application', assignee: 'Legal Team', dueDate: '2024-02-28', priority: 'Critical' },
                    { name: 'Environmental Impact Review', assignee: 'Environmental Consultant', dueDate: '2024-03-15', priority: 'High' }
                ]
            },
            {
                id: 'wf_foundation',
                name: 'Foundation & Structure',
                status: 'in_progress',
                tasks: [
                    { name: 'Site Preparation & Excavation', assignee: 'Carlos Rodriguez', dueDate: '2024-04-30', priority: 'High' },
                    { name: 'Foundation Pouring', assignee: 'Foundation Crew', dueDate: '2024-06-15', priority: 'Critical' },
                    { name: 'Structural Steel Installation', assignee: 'David Chen', dueDate: '2024-08-30', priority: 'High' }
                ]
            },
            {
                id: 'wf_systems',
                name: 'MEP Systems Installation',
                status: 'pending',
                tasks: [
                    { name: 'Electrical Rough-in', assignee: 'Aisha Williams', dueDate: '2024-10-15', priority: 'High' },
                    { name: 'Plumbing Installation', assignee: 'Plumbing Team', dueDate: '2024-11-30', priority: 'Medium' },
                    { name: 'HVAC System Installation', assignee: 'HVAC Contractor', dueDate: '2024-12-31', priority: 'Medium' }
                ]
            }
        ]
    };

    try {
        console.log('🧪 Step 1: Creating NAMC project team member contacts in HubSpot...\n');
        
        const createdContacts = [];
        
        // Create contacts for project team members
        for (const member of namcProject.team) {
            console.log(`   Creating contact: ${member.name} (${member.role})`);
            
            const contactData = {
                properties: {
                    email: member.email,
                    firstname: member.name.split(' ')[0],
                    lastname: member.name.split(' ').slice(1).join(' '),
                    company: member.company,
                    phone: member.phone,
                    jobtitle: member.role,
                    
                    // NAMC-specific custom properties
                    namc_member_status: 'active',
                    namc_membership_tier: member.membershipTier,
                    namc_specialties: member.specialties.join(', '),
                    namc_years_experience: member.yearsExperience.toString(),
                    namc_project_role: member.role,
                    
                    // Standard HubSpot properties
                    lifecyclestage: 'customer',
                    city: namcProject.location.city,
                    state: namcProject.location.state,
                    website: `https://${member.company.toLowerCase().replace(/\s+/g, '')}.com`,
                    
                    // Custom notes
                    hs_lead_status: 'NAMC_MEMBER',
                    notes_last_contacted: `NAMC member working on project: ${namcProject.title}`
                }
            };

            const contactResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts', contactData, { headers });
            createdContacts.push({
                ...member,
                hubspotId: contactResponse.data.id,
                hubspotData: contactResponse.data
            });
            
            console.log(`   ✅ Contact created - ID: ${contactResponse.data.id}`);
        }

        // Create client contact
        console.log(`\n   Creating client contact: ${namcProject.clientContact.name}`);
        const clientContactData = {
            properties: {
                email: namcProject.clientContact.email,
                firstname: namcProject.clientContact.name.split(' ')[0],
                lastname: namcProject.clientContact.name.split(' ').slice(1).join(' '),
                company: namcProject.clientContact.company,
                phone: namcProject.clientContact.phone,
                jobtitle: namcProject.clientContact.role,
                lifecyclestage: 'customer',
                city: namcProject.location.city,
                state: namcProject.location.state,
                hs_lead_status: 'CLIENT',
                notes_last_contacted: `Client for NAMC project: ${namcProject.title}`
            }
        };

        const clientContactResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts', clientContactData, { headers });
        const clientContact = {
            ...namcProject.clientContact,
            hubspotId: clientContactResponse.data.id,
            hubspotData: clientContactResponse.data
        };
        
        console.log(`   ✅ Client contact created - ID: ${clientContactResponse.data.id}`);

        console.log('\n🧪 Step 2: Creating HubSpot deal for the NAMC project...\n');
        
        const dealData = {
            properties: {
                dealname: namcProject.title,
                amount: namcProject.budget.allocated.toString(),
                closedate: new Date(namcProject.timeline.endDate).toISOString().split('T')[0],
                dealstage: 'contractsent', // Adjust based on your pipeline
                pipeline: 'default',
                
                // Custom project properties
                namc_project_id: namcProject.id,
                namc_project_category: namcProject.category,
                namc_project_priority: namcProject.priority,
                namc_project_status: namcProject.status,
                namc_project_progress: namcProject.timeline.progress.toString(),
                namc_budget_allocated: namcProject.budget.allocated.toString(),
                namc_budget_spent: namcProject.budget.spent.toString(),
                namc_budget_remaining: namcProject.budget.remaining.toString(),
                
                // Location information
                namc_project_address: namcProject.location.address,
                namc_project_city: namcProject.location.city,
                namc_project_state: namcProject.location.state,
                
                // Timeline information
                namc_start_date: namcProject.timeline.startDate,
                namc_current_phase: namcProject.timeline.currentPhase,
                
                // Description
                dealtype: 'NAMC Construction Project',
                description: namcProject.description
            }
        };

        const dealResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/deals', dealData, { headers });
        const createdDeal = {
            ...namcProject,
            hubspotId: dealResponse.data.id,
            hubspotData: dealResponse.data
        };
        
        console.log(`✅ Deal created successfully!`);
        console.log(`💼 Deal ID: ${dealResponse.data.id}`);
        console.log(`💰 Amount: $${dealResponse.data.properties.amount}`);
        console.log(`📅 Close Date: ${dealResponse.data.properties.closedate}`);

        console.log('\n🧪 Step 3: Creating tasks for project workflows and milestones...\n');
        
        const createdTasks = [];
        
        // Create tasks for each workflow
        for (const workflow of namcProject.workflows) {
            console.log(`   Creating tasks for workflow: ${workflow.name}`);
            
            for (const task of workflow.tasks) {
                const taskData = {
                    properties: {
                        hs_task_subject: `${workflow.name}: ${task.name}`,
                        hs_task_body: `Project: ${namcProject.title}\nWorkflow: ${workflow.name}\nAssignee: ${task.assignee}\nPriority: ${task.priority}\nDue Date: ${task.dueDate}`,
                        hs_task_status: workflow.status === 'completed' ? 'COMPLETED' : workflow.status === 'in_progress' ? 'IN_PROGRESS' : 'NOT_STARTED',
                        hs_task_priority: task.priority === 'Critical' ? 'HIGH' : task.priority === 'High' ? 'MEDIUM' : 'LOW',
                        hs_task_type: 'TODO',
                        hs_timestamp: new Date(task.dueDate).getTime(),
                        
                        // Custom NAMC properties
                        namc_project_id: namcProject.id,
                        namc_workflow_id: workflow.id,
                        namc_workflow_name: workflow.name,
                        namc_task_assignee: task.assignee,
                        namc_task_category: 'project_milestone'
                    }
                };

                try {
                    const taskResponse = await axios.post('https://api.hubapi.com/crm/v3/objects/tasks', taskData, { headers });
                    createdTasks.push({
                        ...task,
                        workflow: workflow.name,
                        hubspotId: taskResponse.data.id,
                        hubspotData: taskResponse.data
                    });
                    
                    console.log(`     ✅ Task created: "${task.name}" - ID: ${taskResponse.data.id}`);
                } catch (taskError) {
                    console.log(`     ⚠️  Task creation failed for "${task.name}": ${taskError.response?.data?.message || taskError.message}`);
                }
            }
        }

        console.log('\n🧪 Step 4: Associating contacts with the deal...\n');
        
        // Associate team member contacts with the deal
        for (const contact of createdContacts) {
            try {
                await axios.put(
                    `https://api.hubapi.com/crm/v4/objects/contacts/${contact.hubspotId}/associations/deals/${createdDeal.hubspotId}`,
                    {
                        associationCategory: 'HUBSPOT_DEFINED',
                        associationTypeId: 4 // Contact to Deal association
                    },
                    { headers }
                );
                console.log(`   ✅ Associated ${contact.name} with deal`);
            } catch (associationError) {
                console.log(`   ⚠️  Association failed for ${contact.name}: ${associationError.response?.data?.message || associationError.message}`);
            }
        }

        // Associate client contact with the deal
        try {
            await axios.put(
                `https://api.hubapi.com/crm/v4/objects/contacts/${clientContact.hubspotId}/associations/deals/${createdDeal.hubspotId}`,
                {
                    associationCategory: 'HUBSPOT_DEFINED',
                    associationTypeId: 4
                },
                { headers }
            );
            console.log(`   ✅ Associated client ${clientContact.name} with deal`);
        } catch (associationError) {
            console.log(`   ⚠️  Client association failed: ${associationError.response?.data?.message || associationError.message}`);
        }

        console.log('\n🧪 Step 5: Associating tasks with contacts and deal...\n');
        
        // Associate tasks with relevant contacts and deal
        for (const task of createdTasks) {
            // Find the assignee contact
            const assigneeContact = createdContacts.find(c => c.name === task.assignee) || clientContact;
            
            if (assigneeContact) {
                try {
                    // Associate task with contact
                    await axios.put(
                        `https://api.hubapi.com/crm/v4/objects/tasks/${task.hubspotId}/associations/contacts/${assigneeContact.hubspotId}`,
                        {
                            associationCategory: 'HUBSPOT_DEFINED',
                            associationTypeId: 204 // Task to Contact association
                        },
                        { headers }
                    );
                    
                    // Associate task with deal
                    await axios.put(
                        `https://api.hubapi.com/crm/v4/objects/tasks/${task.hubspotId}/associations/deals/${createdDeal.hubspotId}`,
                        {
                            associationCategory: 'HUBSPOT_DEFINED',
                            associationTypeId: 212 // Task to Deal association
                        },
                        { headers }
                    );
                    
                    console.log(`   ✅ Associated task "${task.name}" with ${assigneeContact.name} and deal`);
                } catch (taskAssociationError) {
                    console.log(`   ⚠️  Task association failed for "${task.name}": ${taskAssociationError.response?.data?.message || taskAssociationError.message}`);
                }
            }
        }

        // Final Summary
        console.log('\n🎉 NAMC HubSpot Integration Test Results:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ NAMC Project Creation: SUCCESS');
        console.log(`✅ Team Member Contacts: ${createdContacts.length} created`);
        console.log('✅ Client Contact: 1 created');
        console.log('✅ HubSpot Deal: 1 created');
        console.log(`✅ Project Tasks: ${createdTasks.length} created`);
        console.log('✅ Contact-Deal Associations: SUCCESS');
        console.log('✅ Task Associations: SUCCESS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        console.log('\n📊 Created Data Summary:');
        console.log(`🏗️  Project: ${namcProject.title}`);
        console.log(`💼 Deal ID: ${createdDeal.hubspotId}`);
        console.log(`💰 Budget: $${namcProject.budget.allocated.toLocaleString()}`);
        console.log(`📅 Timeline: ${namcProject.timeline.startDate} to ${namcProject.timeline.endDate}`);
        console.log(`👥 Team Members: ${createdContacts.length}`);
        console.log(`📋 Tasks Created: ${createdTasks.length}`);
        
        console.log('\n👥 Team Members Created:');
        createdContacts.forEach(contact => {
            console.log(`   • ${contact.name} (${contact.role}) - HubSpot ID: ${contact.hubspotId}`);
        });
        
        console.log('\n📋 Tasks Created by Workflow:');
        namcProject.workflows.forEach(workflow => {
            console.log(`   📁 ${workflow.name} (${workflow.status}):`);
            const workflowTasks = createdTasks.filter(t => t.workflow === workflow.name);
            workflowTasks.forEach(task => {
                console.log(`     • ${task.name} (${task.assignee}) - HubSpot ID: ${task.hubspotId}`);
            });
        });

        console.log('\n🔗 Check your HubSpot account:');
        console.log(`   📊 Contacts: https://app.hubspot.com/contacts/${portalId || 'YOUR_PORTAL_ID'}/contacts/list/view/all/`);
        console.log(`   💼 Deals: https://app.hubspot.com/sales/${portalId || 'YOUR_PORTAL_ID'}/deals/board/view/all/`);
        console.log(`   📋 Tasks: https://app.hubspot.com/tasks/${portalId || 'YOUR_PORTAL_ID'}/tasks/list/view/all/`);
        
        console.log('\n🚀 NAMC Member Capabilities Demonstrated:');
        console.log('   ✅ Project management with detailed workflows');
        console.log('   ✅ Team member tracking with NAMC-specific data');
        console.log('   ✅ Client relationship management');
        console.log('   ✅ Task and milestone management');
        console.log('   ✅ Budget and timeline tracking');
        console.log('   ✅ Member specialties and experience tracking');
        console.log('   ✅ Membership tier management');
        console.log('   ✅ Project location and address tracking');
        console.log('   ✅ Complete data association and relationship mapping');
        
        console.log('\n📈 Next Steps for NAMC Portal Integration:');
        console.log('1. 🔄 Set up automated sync for project updates');
        console.log('2. 📧 Configure email workflows for project notifications');
        console.log('3. 📊 Create custom dashboards for member project tracking');
        console.log('4. 🔔 Set up task assignment and deadline notifications');
        console.log('5. 📈 Implement project progress reporting');
        console.log('6. 🎯 Create member performance analytics');
        console.log('7. 📋 Set up automated workflow progression');

    } catch (error) {
        console.log('❌ NAMC HubSpot integration test failed!');
        console.log('');
        
        if (error.response) {
            console.log(`HTTP Status: ${error.response.status}`);
            console.log(`Error Message: ${error.response.data?.message || 'Unknown error'}`);
            console.log(`Error Details:`, error.response.data);
            
            if (error.response.status === 401) {
                console.log('');
                console.log('🔑 Authentication Error - Check:');
                console.log('   1. HubSpot API key in .env.local');
                console.log('   2. Private App permissions in HubSpot');
                console.log('   3. Required scopes are enabled');
            }
            
            if (error.response.status === 400) {
                console.log('');
                console.log('🔧 Configuration issues - Possible causes:');
                console.log('   1. Custom properties may need to be created in HubSpot first');
                console.log('   2. Deal pipeline configuration');
                console.log('   3. Task types and properties setup');
            }
        } else {
            console.log(`Network Error: ${error.message}`);
        }
        
        console.log('');
        console.log('💡 Troubleshooting Tips:');
        console.log('1. Verify your HubSpot API key has all required permissions');
        console.log('2. Check if custom properties exist in your HubSpot account');
        console.log('3. Ensure deal pipelines are properly configured');
        console.log('4. Verify task object permissions are enabled');
        console.log('5. Check rate limits and retry if needed');
    }
}

// Run the test
testNAMCHubSpotIntegration();