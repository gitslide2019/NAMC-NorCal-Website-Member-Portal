# HubSpot Integration Setup & Testing Guide

## 🔑 **Step 1: Configure Your HubSpot API Key**

### Where to Add Your Key:
Edit the `.env.local` file in the project root:

```bash
# HubSpot Configuration
HUBSPOT_ACCESS_TOKEN=your-hubspot-access-token-here
HUBSPOT_PORTAL_ID=your-portal-id-here
```

**Replace:**
- `your-hubspot-access-token-here` with your actual HubSpot Private App access token
- `your-portal-id-here` with your HubSpot portal/account ID

### How to Get Your HubSpot Keys:

1. **Access Token:**
   - Go to HubSpot Settings → Integrations → Private Apps
   - Create a new Private App or use existing one
   - Copy the access token

2. **Portal ID:**
   - Found in your HubSpot URL: `https://app.hubspot.com/contacts/{PORTAL_ID}`
   - Or in Settings → Account & Billing → Account Information

---

## 🚀 **Step 2: Test HubSpot Integration**

### A. Newsletter Signup Test (Easy Start)
1. **Navigate to:** http://localhost:3000 (homepage)
2. **Scroll down** to the newsletter signup section
3. **Enter test data:**
   - Email: `test@example.com`
   - First Name: `John`
   - Last Name: `Doe`
4. **Click "Subscribe"**
5. **Check HubSpot:** Contact should appear in your HubSpot contacts

### B. Contact Form Test
1. **Navigate to:** http://localhost:3000/contact
2. **Fill out the contact form** with test data
3. **Submit the form**
4. **Check HubSpot:** Contact and activity should be logged

### C. API Endpoint Testing (Advanced)

#### Test Contact Sync API:
```bash
curl -X POST http://localhost:3000/api/hubspot/contacts/sync \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "properties": {
      "email": "test@namc.org",
      "firstName": "Test",
      "lastName": "Member",
      "companyName": "Test Construction Co",
      "phone": "(555) 123-4567",
      "specialties": ["Residential", "Commercial"],
      "membership": {
        "tier": "Gold",
        "status": "Active"
      }
    }
  }'
```

#### Test Deal Creation API:
```bash
curl -X POST http://localhost:3000/api/hubspot/deals/create \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_123",
    "memberId": "member_456",
    "dealName": "Downtown Office Renovation",
    "amount": 150000,
    "closeDate": "2025-09-01",
    "projectType": "Commercial",
    "location": "San Francisco, CA",
    "budgetRange": "$100k-$200k"
  }'
```

---

## 📋 **Step 3: Available HubSpot Features**

### Contact Management
- ✅ **Sync member profiles** to HubSpot contacts
- ✅ **Update contact properties** when user data changes
- ✅ **Newsletter subscriptions** automatically added
- ✅ **Search contacts** by email
- ✅ **Batch contact operations** for bulk updates

### Deal & Project Management
- ✅ **Create deals** for project opportunities
- ✅ **Track project progress** through deal stages
- ✅ **Associate contacts** with deals
- ✅ **Custom project properties** (type, location, budget)

### Form & Lead Management
- ✅ **Newsletter signup forms** with HubSpot integration
- ✅ **Contact forms** that create leads
- ✅ **Member registration** sync
- ✅ **Custom form submissions**

### Automation & Workflows
- ✅ **Trigger workflows** based on member actions
- ✅ **Webhook handling** for real-time updates
- ✅ **Custom properties** for NAMC-specific data
- ✅ **List management** for segmentation

### Analytics & Reporting
- ✅ **Contact analytics** and engagement tracking
- ✅ **Deal analytics** and conversion tracking
- ✅ **Custom reporting** capabilities

---

## 🧪 **Step 4: Testing Checklist**

### Basic Functionality ✅
- [ ] Newsletter signup creates HubSpot contact
- [ ] Contact form submissions logged in HubSpot
- [ ] Member registration syncs to HubSpot
- [ ] Deal creation for project opportunities

### Advanced Features ✅
- [ ] Contact search and deduplication
- [ ] Deal progression tracking
- [ ] Workflow automation triggers
- [ ] Custom property synchronization
- [ ] Batch operations for multiple contacts

### Error Handling ✅
- [ ] Invalid API key handling
- [ ] Network error recovery
- [ ] Duplicate contact management
- [ ] Rate limit handling

---

## 🔧 **Step 5: Debugging & Troubleshooting**

### Check Server Logs
```bash
# View development server logs for HubSpot API calls
npm run dev
```

### Test API Key Validity
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://api.hubapi.com/crm/v3/objects/contacts?limit=1"
```

### Common Issues:
1. **"HubSpot API key not configured"**
   - Check `.env.local` file has correct `HUBSPOT_ACCESS_TOKEN`
   - Restart development server after adding key

2. **"Unauthorized" errors**
   - Verify API key has correct permissions in HubSpot
   - Check scopes include: contacts, deals, forms, workflows

3. **"Contact not found" errors**
   - Normal for new contacts - they'll be created automatically
   - Check email format is valid

---

## 📊 **Step 6: Monitor Results in HubSpot**

### Where to Check:
1. **Contacts:** HubSpot → Contacts → Contacts
2. **Deals:** HubSpot → Sales → Deals
3. **Forms:** HubSpot → Marketing → Forms
4. **Workflows:** HubSpot → Automation → Workflows

### Expected Data:
- **Contact Properties:** Name, email, company, membership tier, specialties
- **Deal Properties:** Project name, amount, close date, location, budget range
- **Custom Fields:** NAMC-specific data like years of experience, certifications
- **Activity Timeline:** Form submissions, email opens, workflow enrollments

---

## 🎯 **Step 7: MCP Integration Benefits**

### Real-Time Sync
- Member profile changes instantly sync to HubSpot
- Project opportunities automatically create deals
- Newsletter signups immediately added to marketing lists

### Workflow Automation
- Welcome email sequences for new members
- Project follow-up workflows
- Membership renewal reminders
- Event invitation targeting

### Advanced Analytics
- Member engagement scoring
- Project conversion tracking
- ROI analysis for membership tiers
- Custom reporting dashboards

---

## 🚨 **Important Notes**

### API Rate Limits
- HubSpot has rate limits (100 requests/10 seconds for most endpoints)
- The integration includes automatic retry logic
- Batch operations used where possible for efficiency

### Data Privacy
- All data transmission uses HTTPS encryption
- No sensitive data logged in console (production)
- GDPR/CCPA compliant data handling

### Required HubSpot Permissions
Your Private App needs these scopes:
- `crm.objects.contacts.read`
- `crm.objects.contacts.write`
- `crm.objects.deals.read`
- `crm.objects.deals.write`
- `forms`
- `automation`

---

**Ready to test!** Add your HubSpot keys and start with the newsletter signup test for immediate results.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "Show HubSpot configuration locations and setup", "status": "completed", "priority": "high"}, {"id": "2", "content": "Test HubSpot MCP integration functionality", "status": "in_progress", "priority": "high"}, {"id": "3", "content": "Verify HubSpot API connections and data flow", "status": "pending", "priority": "medium"}, {"id": "4", "content": "Document HubSpot integration testing results", "status": "pending", "priority": "low"}]