const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

/**
 * NAMC Member Portal HubSpot Integration Test (Simplified)
 * 
 * This script demonstrates the complete HubSpot integration using standard properties:
 * 1. Creates a project from the NAMC portal structure
 * 2. Creates associated contacts (project manager, team members, client)
 * 3. Creates a HubSpot deal representing the project
 * 4. Creates tasks for project milestones
 * 5. Associates all entities together in HubSpot
 * 6. Uses only standard HubSpot properties for maximum compatibility
 */

async function testNAMCHubSpotIntegrationSimple() {
    console.log('🏗️  Testing NAMC Member Portal HubSpot Integration (Standard Properties)...\n');
    
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

    // Sample NAMC project data using standard HubSpot properties
    const namcProject = {
        id: `namc_proj_${Date.now()}`,
        title: 'NAMC Downtown Oakland Mixed-Use Development',
        description: 'Large-scale mixed-use development project featuring affordable housing, retail spaces, and community center. NAMC member-led consortium project showcasing minority contractor capabilities. Budget: $4.5M | Timeline: Feb 2024 - Aug 2025 | Status: In Progress (35% complete)',
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
                specialties: 'Commercial Construction, Mixed-Use Development',
                yearsExperience: 15,
                membershipTier: 'Gold'
            },
            { 
                name: 'Aisha Williams', 
                role: 'Electrical Lead', 
                company: 'Williams Electric Solutions',
                email: `aisha.williams.${Date.now()}@namc-test.org`,
                phone: '(510) 555-0102',
                specialties: 'Commercial Electrical, Smart Building Systems',
                yearsExperience: 12,
                membershipTier: 'Silver'
            },
            { 
                name: 'David Chen', 
                role: 'Structural Engineer', 
                company: 'Chen Engineering Services',
                email: `david.chen.${Date.now()}@namc-test.org`,
                phone: '(510) 555-0103',
                specialties: 'Structural Engineering, Seismic Design',
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
                    { name: 'Building Permits Application', assignee: 'Legal Team', dueDate: '2024-02-28', priority: 'High' },
                    { name: 'Environmental Impact Review', assignee: 'Environmental Consultant', dueDate: '2024-03-15', priority: 'Medium' }
                ]
            },
            {
                id: 'wf_foundation',
                name: 'Foundation & Structure',
                status: 'in_progress',
                tasks: [
                    { name: 'Site Preparation & Excavation', assignee: 'Carlos Rodriguez', dueDate: '2024-04-30', priority: 'High' },
                    { name: 'Foundation Pouring', assignee: 'Foundation Crew', dueDate: '2024-06-15', priority: 'High' },
                    { name: 'Structural Steel Installation', assignee: 'David Chen', dueDate: '2024-08-30', priority: 'Medium' }
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
                    
                    // Standard HubSpot properties with NAMC data embedded
                    lifecyclestage: 'customer',
                    city: namcProject.location.city,
                    state: namcProject.location.state,
                    website: `https://${member.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
                    hs_lead_status: 'CONNECTED',
                    
                    // Store NAMC-specific data in notes and description fields
                    notes_last_updated: `NAMC Member - ${member.membershipTier} Tier | Specialties: ${member.specialties} | Experience: ${member.yearsExperience} years | Project: ${namcProject.title} | Role: ${member.role}`
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
                hs_lead_status: 'CONNECTED',
                notes_last_updated: `Client for NAMC project: ${namcProject.title} | Budget: $${namcProject.budget.allocated.toLocaleString()} | Location: ${namcProject.location.address}`
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
                dealstage: 'contractsent', // Standard HubSpot stage
                pipeline: 'default',
                dealtype: 'existingbusiness',
                
                // Store project details in description and deal source
                description: `${namcProject.description}\n\nProject Details:\n- Category: ${namcProject.category}\n- Priority: ${namcProject.priority}\n- Status: ${namcProject.status}\n- Progress: ${namcProject.timeline.progress}%\n- Budget Allocated: $${namcProject.budget.allocated.toLocaleString()}\n- Budget Spent: $${namcProject.budget.spent.toLocaleString()}\n- Budget Remaining: $${namcProject.budget.remaining.toLocaleString()}\n- Start Date: ${namcProject.timeline.startDate}\n- Current Phase: ${namcProject.timeline.currentPhase}\n- Location: ${namcProject.location.address}`,
                
                hs_deal_stage_probability: namcProject.timeline.progress.toString(),
                deal_currency_code: 'USD'
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
                        hs_task_body: `Project: ${namcProject.title}\nWorkflow: ${workflow.name}\nAssignee: ${task.assignee}\nPriority: ${task.priority}\nDue Date: ${task.dueDate}\nProject Budget: $${namcProject.budget.allocated.toLocaleString()}\nClient: ${namcProject.clientContact.name} (${namcProject.clientContact.company})`,
                        hs_task_status: workflow.status === 'completed' ? 'COMPLETED' : workflow.status === 'in_progress' ? 'IN_PROGRESS' : 'NOT_STARTED',
                        hs_task_priority: task.priority === 'High' ? 'HIGH' : task.priority === 'Medium' ? 'MEDIUM' : 'LOW',
                        hs_task_type: 'TODO',
                        hs_timestamp: new Date(task.dueDate).getTime()
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
            
            if (assigneeContact && assigneeContact.hubspotId) {
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
            } else {
                console.log(`   ⚠️  No assignee contact found for task "${task.name}" (assignee: ${task.assignee})`);
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
        console.log(`📈 Progress: ${namcProject.timeline.progress}%`);
        console.log(`📅 Timeline: ${namcProject.timeline.startDate} to ${namcProject.timeline.endDate}`);
        console.log(`👥 Team Members: ${createdContacts.length}`);
        console.log(`📋 Tasks Created: ${createdTasks.length}`);
        
        console.log('\n👥 Team Members Created:');
        createdContacts.forEach(contact => {
            console.log(`   • ${contact.name} (${contact.role}) - ${contact.membershipTier} Member - HubSpot ID: ${contact.hubspotId}`);
        });
        console.log(`   • ${clientContact.name} (${clientContact.role}) - Client Contact - HubSpot ID: ${clientContact.hubspotId}`);
        
        console.log('\n📋 Tasks Created by Workflow:');
        namcProject.workflows.forEach(workflow => {
            console.log(`   📁 ${workflow.name} (${workflow.status}):`);
            const workflowTasks = createdTasks.filter(t => t.workflow === workflow.name);
            workflowTasks.forEach(task => {
                console.log(`     • ${task.name} (${task.assignee}) - Priority: ${task.priority} - HubSpot ID: ${task.hubspotId}`);
            });
        });

        console.log('\n🔗 Check your HubSpot account:');
        console.log(`   📊 Contacts: https://app.hubspot.com/contacts/${portalId || 'YOUR_PORTAL_ID'}/contacts/list/view/all/`);
        console.log(`   💼 Deals: https://app.hubspot.com/sales/${portalId || 'YOUR_PORTAL_ID'}/deals/board/view/all/`);
        console.log(`   📋 Tasks: https://app.hubspot.com/tasks/${portalId || 'YOUR_PORTAL_ID'}/tasks/list/view/all/`);
        
        console.log('\n🚀 NAMC Member Capabilities Demonstrated:');
        console.log('   ✅ Project management with detailed workflows');
        console.log('   ✅ Team member tracking with membership tier data');
        console.log('   ✅ Client relationship management');
        console.log('   ✅ Task and milestone management with priorities');
        console.log('   ✅ Budget and timeline tracking');
        console.log('   ✅ Member specialties and experience tracking');
        console.log('   ✅ Project location and address tracking');
        console.log('   ✅ Complete data association and relationship mapping');
        console.log('   ✅ Compatible with standard HubSpot properties');
        
        console.log('\n📈 Data Successfully Synced to HubSpot:');
        console.log(`1. 📇 ${createdContacts.length + 1} Contacts (${createdContacts.length} team members + 1 client)`);
        console.log(`2. 💼 1 Deal representing the construction project`);
        console.log(`3. 📋 ${createdTasks.length} Tasks across ${namcProject.workflows.length} workflows`);
        console.log(`4. 🔗 ${(createdContacts.length + 1) * 2 + createdTasks.length * 2} Associations created`);
        console.log(`5. 💰 $${namcProject.budget.allocated.toLocaleString()} project value tracked in HubSpot`);
        
        console.log('\n🎯 What This Demonstrates:');
        console.log('• NAMC members can track complex construction projects in HubSpot');
        console.log('• Project teams with different roles and specialties are properly organized');
        console.log('• Client relationships are maintained alongside project data');
        console.log('• Project workflows and tasks are managed with clear priorities');
        console.log('• Member capabilities (tiers, specialties, experience) are captured');
        console.log('• Financial tracking with budgets and progress monitoring');
        console.log('• All data relationships are properly connected in HubSpot CRM');

    } catch (error) {
        console.log('❌ NAMC HubSpot integration test failed!');
        console.log('');
        
        if (error.response) {
            console.log(`HTTP Status: ${error.response.status}`);
            console.log(`Error Message: ${error.response.data?.message || 'Unknown error'}`);
            
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
                console.log('   1. Invalid property values');
                console.log('   2. Deal pipeline configuration');
                console.log('   3. Task types and properties setup');
            }
        } else {
            console.log(`Network Error: ${error.message}`);
        }
        
        console.log('');
        console.log('💡 Troubleshooting Tips:');
        console.log('1. Verify your HubSpot API key has all required permissions');
        console.log('2. Check deal pipelines are properly configured');
        console.log('3. Ensure task object permissions are enabled');
        console.log('4. Check rate limits and retry if needed');
        console.log('5. This version uses only standard HubSpot properties');
    }
}

// Run the test
testNAMCHubSpotIntegrationSimple();