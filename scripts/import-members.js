const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Since we're in a Node.js script, we need to use require for the compiled JS
// In production, you'd compile the TypeScript first
// For now, let's create a JavaScript version of the services

const XLSX = require('xlsx');
const axios = require('axios');
const moment = require('moment');

class MemberImportTool {
  constructor() {
    this.hubspotApiKey = process.env.HUBSPOT_ACCESS_TOKEN;
    this.hubspotPortalId = process.env.HUBSPOT_PORTAL_ID;
    
    if (!this.hubspotApiKey) {
      console.error('❌ HUBSPOT_ACCESS_TOKEN not found in environment variables');
      process.exit(1);
    }
  }

  async run() {
    console.log('🚀 NAMC NorCal Member Import Tool');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const skipDuplicates = !args.includes('--allow-duplicates');
    const batchSize = this.getArgValue(args, '--batch-size', 20);

    console.log(`📋 Configuration:`);
    console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE IMPORT'}`);
    console.log(`   Skip duplicates: ${skipDuplicates}`);
    console.log(`   Batch size: ${batchSize}`);
    console.log(`   HubSpot Portal: ${this.hubspotPortalId}\n`);

    try {
      // Step 1: Process Excel file
      console.log('📊 Step 1: Processing Excel file...');
      const memberData = await this.processExcelFile();
      console.log(`✅ Processed ${memberData.length} members\n`);

      // Step 2: Ensure custom properties exist
      if (!dryRun) {
        console.log('🔧 Step 2: Setting up custom properties...');
        await this.ensureCustomProperties();
        console.log('✅ Custom properties ready\n');
      }

      // Step 3: Import members
      console.log(`🔄 Step 3: ${dryRun ? 'Simulating' : 'Executing'} member import...`);
      const result = await this.importMembers(memberData, {
        dryRun,
        skipDuplicates,
        batchSize
      });

      // Step 4: Show results
      this.showResults(result);

    } catch (error) {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    }
  }

  async processExcelFile() {
    const filePath = path.join(__dirname, '..', 'NAMC NorCal Members 2025.xlsx');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel file not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    const members = [];
    let skipped = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowIndex = i + 2;

      try {
        const member = this.processRow(headers, row, rowIndex);
        if (member) {
          members.push(member);
        } else {
          skipped++;
        }
      } catch (error) {
        console.warn(`⚠️  Row ${rowIndex} skipped: ${error.message}`);
        skipped++;
      }
    }

    console.log(`   📊 ${members.length} valid members, ${skipped} skipped`);
    return members;
  }

  processRow(headers, row, rowIndex) {
    const data = {};

    // Map Excel columns to data
    headers.forEach((header, index) => {
      if (header && row[index] !== undefined && row[index] !== '') {
        data[header] = row[index]; // Keep original header, don't trim
      }
    });


    // Validate required fields
    if (!data['First '] && !data['Last ']) {
      throw new Error('Missing name');
    }

    if (!data['Email '] || !this.isValidEmail(data['Email '])) {
      if (data['First '] && data['Last ']) {
        console.warn(`Row ${rowIndex}: Invalid email for ${data['First ']} ${data['Last ']}`);
      } else {
        throw new Error('Invalid email');
      }
    }

    // Convert to HubSpot format
    const hubspotContact = {
      properties: {
        firstname: (data['First '] || '').trim(),
        lastname: (data['Last '] || '').trim(),
        email: (data['Email '] || '').trim(),
        phone: this.formatPhoneNumber(data['Number'] || ''),
        company: (data['Contractor\'s DBA Name'] || `${data['First ']} ${data['Last ']} Construction`).trim(),
        address: (data['Address'] || '').trim(),
        city: (data['City '] || '').trim(),
        state: (data['State'] || '').trim(),
        zip: String(data['Zip '] || '').replace(/\.0$/, ''),
        jobtitle: 'Contractor',
        lifecyclestage: 'customer',
        
        // Custom NAMC properties
        license_number: (data['License(s)'] || '').trim(),
        membership_tier: this.mapMembershipTier(data['Type ']),
        membership_status: 'Active',
        annual_fee: data['Annual Fee'] ? String(data['Annual Fee']) : undefined,
        certifications: (data['CERTS'] || '').trim(),
        gender: (data['Gender '] || '').trim(),
        race: (data['Race'] || '').trim(),
        county: (data['County '] || '').trim(),
        
        // Convert dates
        join_date: this.parseExcelDate(data['Date Joined']),
        renewal_date: this.parseExcelDate(data['Renewal Date']),
        
        // Additional contacts
        second_contact_phone: (data['Contact #2'] || '').trim(),
        second_contact_name: (data['2nd Point of Contact'] || '').trim()
      }
    };

    // Remove empty properties
    Object.keys(hubspotContact.properties).forEach(key => {
      if (!hubspotContact.properties[key] || hubspotContact.properties[key] === '') {
        delete hubspotContact.properties[key];
      }
    });

    return hubspotContact;
  }

  parseExcelDate(value) {
    if (!value || value === 'N/A') return null;

    try {
      if (typeof value === 'number') {
        // Excel date serial number
        const excelEpoch = new Date(1900, 0, 1);
        const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
      }

      const parsed = moment(String(value), ['MM/DD/YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD']);
      if (parsed.isValid()) {
        return parsed.format('YYYY-MM-DD');
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  formatPhoneNumber(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  }

  mapMembershipTier(type) {
    if (!type) return 'Individual';
    const lowerType = String(type).toLowerCase();
    if (lowerType.includes('corporate')) return 'Corporate';
    if (lowerType.includes('associate')) return 'Associate';
    if (lowerType.includes('premium')) return 'Premium';
    return 'Individual';
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async ensureCustomProperties() {
    const properties = [
      { name: 'membership_tier', label: 'Membership Tier', type: 'enumeration' },
      { name: 'membership_status', label: 'Membership Status', type: 'enumeration' },
      { name: 'license_number', label: 'License Number', type: 'string' },
      { name: 'annual_fee', label: 'Annual Fee', type: 'string' },
      { name: 'join_date', label: 'Date Joined', type: 'date' },
      { name: 'renewal_date', label: 'Renewal Date', type: 'date' },
      { name: 'certifications', label: 'Certifications', type: 'string' },
      { name: 'county', label: 'County', type: 'string' },
      { name: 'gender', label: 'Gender', type: 'string' },
      { name: 'race', label: 'Race/Ethnicity', type: 'string' },
      { name: 'second_contact_phone', label: 'Second Contact Phone', type: 'string' },
      { name: 'second_contact_name', label: 'Second Contact Name', type: 'string' }
    ];

    for (const property of properties) {
      try {
        await this.createCustomProperty(property);
        console.log(`   ✅ ${property.name}`);
      } catch (error) {
        if (error.message.includes('409') || error.message.includes('already exists')) {
          console.log(`   ℹ️  ${property.name} (already exists)`);
        } else {
          console.warn(`   ⚠️  ${property.name}: ${error.message}`);
        }
      }
    }
  }

  async createCustomProperty(property) {
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/properties/contacts',
      property,
      {
        headers: {
          'Authorization': `Bearer ${this.hubspotApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  async importMembers(members, options = {}) {
    const { dryRun = false, skipDuplicates = true, batchSize = 20 } = options;
    
    const result = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      skipped: 0
    };

    const batches = this.createBatches(members, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNum = i + 1;
      
      console.log(`   📦 Batch ${batchNum}/${batches.length} (${batch.length} contacts)`);
      
      for (const member of batch) {
        try {
          result.totalProcessed++;
          
          if (dryRun) {
            console.log(`      🔍 [DRY RUN] ${member.properties.firstname} ${member.properties.lastname} (${member.properties.email})`);
            result.successful++;
            continue;
          }

          // Check for duplicates
          if (skipDuplicates && member.properties.email) {
            const existing = await this.findContactByEmail(member.properties.email);
            if (existing) {
              console.log(`      ⏭️  Skipped: ${member.properties.email} (duplicate)`);
              result.skipped++;
              continue;
            }
          }

          // Create contact
          const created = await this.createContact(member);
          console.log(`      ✅ Created: ${member.properties.firstname} ${member.properties.lastname}`);
          result.successful++;

        } catch (error) {
          console.log(`      ❌ Failed: ${member.properties.firstname} ${member.properties.lastname} - ${error.message}`);
          result.failed++;
          result.errors.push({
            contact: member,
            error: error.message
          });
        }
      }

      // Delay between batches
      if (i < batches.length - 1) {
        console.log(`      ⏳ Waiting 1 second...`);
        await this.delay(1000);
      }
    }

    return result;
  }

  async findContactByEmail(email) {
    try {
      const response = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email
            }]
          }]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.hubspotApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.results?.[0] || null;
    } catch (error) {
      return null;
    }
  }

  async createContact(contactData) {
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      contactData,
      {
        headers: {
          'Authorization': `Bearer ${this.hubspotApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getArgValue(args, argName, defaultValue) {
    const index = args.indexOf(argName);
    if (index !== -1 && index + 1 < args.length) {
      const value = parseInt(args[index + 1]);
      return isNaN(value) ? defaultValue : value;
    }
    return defaultValue;
  }

  showResults(result) {
    console.log('\n🎉 Import Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   📊 Total processed: ${result.totalProcessed}`);
    console.log(`   ✅ Successful: ${result.successful}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    console.log(`   ⏭️  Skipped (duplicates): ${result.skipped}`);
    
    if (result.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      result.errors.slice(0, 5).forEach((error, i) => {
        const contact = error.contact?.properties;
        console.log(`   ${i + 1}. ${contact?.firstname} ${contact?.lastname}: ${error.error}`);
      });
      
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more errors`);
      }
    }

    if (result.successful > 0) {
      console.log(`\n🔗 Check your HubSpot contacts: https://app.hubspot.com/contacts/${this.hubspotPortalId}/contacts/list/view/all/`);
    }

    console.log('\n✅ Import complete!');
  }
}

// Show usage if no arguments or help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 NAMC NorCal Member Import Tool

Usage: node scripts/import-members.js [options]

Options:
  --dry-run              Simulate import without making changes
  --allow-duplicates     Don't skip existing contacts
  --batch-size <number>  Number of contacts per batch (default: 20)
  --help, -h             Show this help message

Examples:
  node scripts/import-members.js --dry-run
  node scripts/import-members.js --batch-size 10
  node scripts/import-members.js --allow-duplicates
`);
  process.exit(0);
}

// Run the import tool
const tool = new MemberImportTool();
tool.run().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});