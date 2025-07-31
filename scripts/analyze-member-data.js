const XLSX = require('xlsx');
const path = require('path');

function analyzeMemberData() {
    console.log('🔍 Analyzing NAMC NorCal Member Data...\n');
    
    try {
        // Read the Excel file
        const filePath = path.join(__dirname, '..', 'NAMC NorCal Members 2025.xlsx');
        const workbook = XLSX.readFile(filePath);
        
        console.log('📊 Workbook Analysis:');
        console.log(`   Sheets found: ${workbook.SheetNames.length}`);
        console.log(`   Sheet names: ${workbook.SheetNames.join(', ')}\n`);
        
        // Analyze each sheet
        workbook.SheetNames.forEach((sheetName, index) => {
            console.log(`📋 Sheet ${index + 1}: "${sheetName}"`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length === 0) {
                console.log('   ⚠️  Empty sheet\n');
                return;
            }
            
            // Get headers (first row)
            const headers = jsonData[0] || [];
            console.log(`   📝 Columns found: ${headers.length}`);
            console.log('   📋 Column headers:');
            headers.forEach((header, i) => {
                console.log(`      ${i + 1}. ${header || '[Empty]'}`);
            });
            
            // Sample data analysis
            const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
            console.log(`   📊 Data rows: ${dataRows.length}`);
            
            if (dataRows.length > 0) {
                console.log('\n   🔍 Sample data (first 3 rows):');
                dataRows.slice(0, 3).forEach((row, i) => {
                    console.log(`      Row ${i + 1}:`);
                    headers.forEach((header, j) => {
                        if (row[j] !== undefined && row[j] !== '') {
                            console.log(`         ${header}: ${row[j]}`);
                        }
                    });
                    console.log('');
                });
                
                // Data quality analysis
                console.log('   📈 Data Quality Analysis:');
                headers.forEach((header, i) => {
                    const values = dataRows.map(row => row[i]).filter(val => val !== undefined && val !== '');
                    const filledPercentage = ((values.length / dataRows.length) * 100).toFixed(1);
                    console.log(`      ${header}: ${values.length}/${dataRows.length} filled (${filledPercentage}%)`);
                });
            }
            
            console.log('\n');
        });
        
        // Generate field mapping suggestions
        const mainSheet = workbook.Sheets[workbook.SheetNames[0]];
        const mainData = XLSX.utils.sheet_to_json(mainSheet, { header: 1 });
        
        if (mainData.length > 0) {
            const headers = mainData[0];
            console.log('🗺️  Suggested HubSpot Field Mapping:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            const fieldMappings = generateFieldMappings(headers);
            Object.entries(fieldMappings).forEach(([excelField, hubspotField]) => {
                console.log(`   ${excelField} → ${hubspotField.property} (${hubspotField.type})`);
            });
        }
        
        console.log('\n✅ Analysis complete!');
        
    } catch (error) {
        console.error('❌ Error analyzing member data:', error.message);
    }
}

function generateFieldMappings(headers) {
    const mappings = {};
    
    headers.forEach(header => {
        if (!header) return;
        
        const lowerHeader = header.toLowerCase();
        
        // Map common fields to HubSpot properties
        if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
            mappings[header] = { property: 'firstname', type: 'string' };
        } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
            mappings[header] = { property: 'lastname', type: 'string' };
        } else if (lowerHeader.includes('email')) {
            mappings[header] = { property: 'email', type: 'string' };
        } else if (lowerHeader.includes('phone')) {
            mappings[header] = { property: 'phone', type: 'string' };
        } else if (lowerHeader.includes('company') || lowerHeader.includes('business')) {
            mappings[header] = { property: 'company', type: 'string' };
        } else if (lowerHeader.includes('address')) {
            mappings[header] = { property: 'address', type: 'string' };
        } else if (lowerHeader.includes('city')) {
            mappings[header] = { property: 'city', type: 'string' };
        } else if (lowerHeader.includes('state')) {
            mappings[header] = { property: 'state', type: 'string' };
        } else if (lowerHeader.includes('zip')) {
            mappings[header] = { property: 'zip', type: 'string' };
        } else if (lowerHeader.includes('member') && lowerHeader.includes('type')) {
            mappings[header] = { property: 'membership_tier', type: 'enumeration' };
        } else if (lowerHeader.includes('join') && lowerHeader.includes('date')) {
            mappings[header] = { property: 'join_date', type: 'date' };
        } else if (lowerHeader.includes('license')) {
            mappings[header] = { property: 'license_number', type: 'string' };
        } else if (lowerHeader.includes('specialty') || lowerHeader.includes('trade')) {
            mappings[header] = { property: 'specialties', type: 'string' };
        } else if (lowerHeader.includes('experience') || lowerHeader.includes('years')) {
            mappings[header] = { property: 'years_experience', type: 'number' };
        } else if (lowerHeader.includes('certification')) {
            mappings[header] = { property: 'certifications', type: 'string' };
        } else if (lowerHeader.includes('website') || lowerHeader.includes('url')) {
            mappings[header] = { property: 'website', type: 'string' };
        } else if (lowerHeader.includes('title') || lowerHeader.includes('position')) {
            mappings[header] = { property: 'jobtitle', type: 'string' };
        } else {
            // Create custom property for unmapped fields
            const customProperty = header.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            mappings[header] = { property: customProperty, type: 'string' };
        }
    });
    
    return mappings;
}

// Run the analysis
if (require.main === module) {
    analyzeMemberData();
}