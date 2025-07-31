import * as XLSX from 'xlsx';
import moment from 'moment';

interface MemberData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  licenseNumber?: string;
  gender?: string;
  race?: string;
  membershipType?: string;
  annualFee?: number;
  dateJoined?: Date;
  renewalDate?: Date;
  certifications?: string;
  secondContact?: string;
  secondContactName?: string;
}

interface ProcessingResult {
  success: boolean;
  data: MemberData[];
  errors: string[];
  warnings: string[];
  stats: {
    totalRows: number;
    validRows: number;
    skippedRows: number;
    duplicates: number;
  };
}

export class ExcelProcessorService {
  private fieldMapping = {
    'First ': 'firstName',
    'Last ': 'lastName', 
    'Email ': 'email',
    'Number': 'phone',
    'Contractor\'s DBA Name': 'company',
    'Contractor\'s Legal Name': 'legalName',
    'Contact #2': 'secondContact',
    '2nd Point of Contact': 'secondContactName',
    'Address': 'address',
    'City ': 'city',
    'State': 'state',
    'Zip ': 'zip',
    'County ': 'county',
    'License(s)': 'licenseNumber',
    'Gender ': 'gender',
    'Race': 'race',
    'Type ': 'membershipType',
    'Annual Fee': 'annualFee',
    'Date Joined': 'dateJoined',
    'Renewal Date': 'renewalDate',
    'CERTS': 'certifications'
  };

  async processExcelFile(filePath: string): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      success: false,
      data: [],
      errors: [],
      warnings: [],
      stats: {
        totalRows: 0,
        validRows: 0,
        skippedRows: 0,
        duplicates: 0
      }
    };

    try {
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (rawData.length === 0) {
        result.errors.push('Excel file is empty');
        return result;
      }

      const headers = rawData[0] as string[];
      const dataRows = rawData.slice(1) as any[][];
      
      result.stats.totalRows = dataRows.length;

      // Track emails to detect duplicates
      const emailSet = new Set<string>();

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const rowIndex = i + 2; // Excel row number (header is row 1)
        const row = dataRows[i];

        try {
          const memberData = this.processRow(headers, row, rowIndex);
          
          if (!memberData) {
            result.stats.skippedRows++;
            continue;
          }

          // Check for duplicate emails
          if (memberData.email) {
            if (emailSet.has(memberData.email.toLowerCase())) {
              result.warnings.push(`Row ${rowIndex}: Duplicate email ${memberData.email}`);
              result.stats.duplicates++;
            } else {
              emailSet.add(memberData.email.toLowerCase());
            }
          }

          result.data.push(memberData);
          result.stats.validRows++;

        } catch (error) {
          result.errors.push(`Row ${rowIndex}: ${(error as Error).message}`);
          result.stats.skippedRows++;
        }
      }

      result.success = result.data.length > 0;
      
      // Log processing summary
      console.log(`✅ Processed ${result.stats.validRows} valid members out of ${result.stats.totalRows} total rows`);
      if (result.errors.length > 0) {
        console.log(`❌ ${result.errors.length} errors encountered`);
      }
      if (result.warnings.length > 0) {
        console.log(`⚠️  ${result.warnings.length} warnings`);
      }

    } catch (error) {
      result.errors.push(`Failed to process Excel file: ${(error as Error).message}`);
    }

    return result;
  }

  private processRow(headers: string[], row: any[], rowIndex: number): MemberData | null {
    const memberData: any = {};

    // Map Excel columns to member data fields
    headers.forEach((header, index) => {
      if (header && (this.fieldMapping as any)[header.trim()]) {
        const fieldName = (this.fieldMapping as any)[header.trim()];
        const rawValue = row[index];
        
        if (rawValue !== undefined && rawValue !== '' && rawValue !== null) {
          memberData[fieldName] = this.transformValue(fieldName, rawValue, rowIndex);
        }
      }
    });

    // Validate required fields
    if (!memberData.firstName && !memberData.lastName) {
      throw new Error('Missing both first and last name');
    }

    if (!memberData.email || !this.isValidEmail(memberData.email)) {
      if (memberData.firstName && memberData.lastName) {
        // Don't fail completely if we have name but invalid email
        console.warn(`Row ${rowIndex}: Invalid email for ${memberData.firstName} ${memberData.lastName}`);
        memberData.email = null;
      } else {
        throw new Error('Invalid or missing email address');
      }
    }

    // Set defaults
    if (!memberData.company) {
      memberData.company = `${memberData.firstName} ${memberData.lastName} Construction`;
    }

    return memberData as MemberData;
  }

  private transformValue(fieldName: string, value: any, rowIndex: number): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    switch (fieldName) {
      case 'firstName':
      case 'lastName':
      case 'email':
      case 'company':
      case 'address':
      case 'city':
      case 'state':
      case 'county':
      case 'licenseNumber':
      case 'gender':
      case 'race':
      case 'membershipType':
      case 'certifications':
      case 'secondContact':
      case 'secondContactName':
        return String(value).trim();

      case 'phone':
        return this.formatPhoneNumber(String(value));

      case 'zip':
        return String(value).replace(/\.0$/, ''); // Remove .0 from zip codes

      case 'annualFee':
        const fee = parseFloat(String(value));
        return isNaN(fee) ? 0 : fee;

      case 'dateJoined':
      case 'renewalDate':
        return this.parseExcelDate(value, rowIndex);

      default:
        return String(value).trim();
    }
  }

  private parseExcelDate(value: any, rowIndex: number): Date | null {
    if (!value || value === 'N/A') {
      return null;
    }

    try {
      // Excel dates are stored as numbers (days since 1900-01-01)
      if (typeof value === 'number') {
        // Excel date serial number
        const excelEpoch = new Date(1900, 0, 1);
        const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
        return date;
      }

      // Try parsing as string
      const parsed = moment(String(value), ['MM/DD/YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD', 'M/D/YYYY']);
      if (parsed.isValid()) {
        return parsed.toDate();
      }

      console.warn(`Row ${rowIndex}: Could not parse date value: ${value}`);
      return null;
    } catch (error) {
      console.warn(`Row ${rowIndex}: Date parsing error for value ${value}: ${(error as Error).message}`);
      return null;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX if 10 digits
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    // Return original if not 10 digits
    return phone;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Convert member data to HubSpot contact format
  convertToHubSpotFormat(memberData: MemberData): any {
    const hubspotContact = {
      properties: {
        firstname: memberData.firstName,
        lastname: memberData.lastName,
        email: memberData.email,
        phone: memberData.phone,
        company: memberData.company,
        address: memberData.address,
        city: memberData.city,
        state: memberData.state,
        zip: memberData.zip,
        jobtitle: 'Contractor',
        lifecyclestage: 'customer',
        
        // Custom NAMC properties
        license_number: memberData.licenseNumber,
        membership_tier: this.mapMembershipTier(memberData.membershipType || ''),
        membership_status: 'Active',
        annual_fee: memberData.annualFee?.toString(),
        certifications: memberData.certifications,
        gender: memberData.gender,
        race: memberData.race,
        county: memberData.county,
        
        // Convert dates to strings
        join_date: memberData.dateJoined ? memberData.dateJoined.toISOString().split('T')[0] : null,
        renewal_date: memberData.renewalDate ? memberData.renewalDate.toISOString().split('T')[0] : null,
        
        // Additional contacts
        second_contact_phone: memberData.secondContact,
        second_contact_name: memberData.secondContactName
      }
    };

    // Remove null/undefined properties
    Object.keys(hubspotContact.properties).forEach(key => {
      if ((hubspotContact.properties as any)[key] === null || (hubspotContact.properties as any)[key] === undefined) {
        delete (hubspotContact.properties as any)[key];
      }
    });

    return hubspotContact;
  }

  private mapMembershipTier(type: string): string {
    if (!type) return 'Individual';
    
    const lowerType = type.toLowerCase();
    if (lowerType.includes('corporate') || lowerType.includes('company')) return 'Corporate';
    if (lowerType.includes('associate') || lowerType.includes('assoc')) return 'Associate';
    if (lowerType.includes('premium') || lowerType.includes('gold')) return 'Premium';
    return 'Individual';
  }
}

export default ExcelProcessorService;