import HubSpotService from './hubspot.service';

interface ImportResult {
  success: boolean;
  totalProcessed: number;
  successfulImports: number;
  failedImports: number;
  errors: ImportError[];
  warnings: string[];
  importedContacts: any[];
}

interface ImportError {
  contactData: any;
  error: string;
  details?: any;
}

interface ImportOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  skipDuplicates?: boolean;
  dryRun?: boolean;
  onProgress?: (progress: ImportProgress) => void;
}

interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export class BatchImportService {
  private hubspotService: HubSpotService;
  private startTime: number = 0;

  constructor(apiKey: string) {
    this.hubspotService = new HubSpotService(apiKey);
  }

  async importContacts(
    contactData: any[], 
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const {
      batchSize = 20, // HubSpot batch API limit is 100, but we'll be conservative
      delayBetweenBatches = 1000, // 1 second delay to respect rate limits
      skipDuplicates = true,
      dryRun = false,
      onProgress
    } = options;

    const result: ImportResult = {
      success: false,
      totalProcessed: 0,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      warnings: [],
      importedContacts: []
    };

    this.startTime = Date.now();

    try {
      console.log(`🚀 Starting ${dryRun ? 'DRY RUN' : 'LIVE'} import of ${contactData.length} contacts...`);
      console.log(`📊 Batch size: ${batchSize}, Delay between batches: ${delayBetweenBatches}ms`);

      // Split into batches
      const batches = this.createBatches(contactData, batchSize);
      console.log(`📦 Created ${batches.length} batches`);

      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNumber = i + 1;
        
        console.log(`\n🔄 Processing batch ${batchNumber}/${batches.length} (${batch.length} contacts)...`);

        try {
          if (dryRun) {
            // Simulate processing for dry run
            await this.simulateBatchProcessing(batch);
            result.successfulImports += batch.length;
          } else {
            const batchResult = await this.processBatch(batch, skipDuplicates);
            result.successfulImports += batchResult.successful;
            result.failedImports += batchResult.failed;
            result.errors.push(...batchResult.errors);
            result.warnings.push(...batchResult.warnings);
            result.importedContacts.push(...batchResult.importedContacts);
          }

          result.totalProcessed += batch.length;

          // Report progress
          if (onProgress) {
            const progress = this.calculateProgress(
              result.totalProcessed,
              contactData.length,
              batchNumber,
              batches.length,
              result.successfulImports,
              result.failedImports
            );
            onProgress(progress);
          }

          // Delay between batches (except for the last one)
          if (i < batches.length - 1) {
            console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
            await this.delay(delayBetweenBatches);
          }

        } catch (error) {
          console.error(`❌ Batch ${batchNumber} failed completely:`, (error as Error).message);
          
          // Mark all contacts in this batch as failed
          batch.forEach(contact => {
            result.errors.push({
              contactData: contact,
              error: `Batch processing failed: ${(error as Error).message}`,
              details: error
            });
          });
          
          result.failedImports += batch.length;
          result.totalProcessed += batch.length;
        }
      }

      // Calculate final results
      result.success = result.successfulImports > 0 && result.errors.length < contactData.length;
      
      const duration = Date.now() - this.startTime;
      console.log(`\n✅ Import completed in ${(duration / 1000).toFixed(1)} seconds`);
      console.log(`📊 Results: ${result.successfulImports} successful, ${result.failedImports} failed`);

      return result;

    } catch (error) {
      console.error('❌ Import process failed:', error);
      result.errors.push({
        contactData: null,
        error: `Import process failed: ${(error as Error).message}`,
        details: error
      });
      
      return result;
    }
  }

  private async processBatch(
    batch: any[], 
    skipDuplicates: boolean
  ): Promise<{
    successful: number;
    failed: number;
    errors: ImportError[];
    warnings: string[];
    importedContacts: any[];
  }> {
    const batchResult = {
      successful: 0,
      failed: 0,
      errors: [] as ImportError[],
      warnings: [] as string[],
      importedContacts: [] as any[]
    };

    // Process contacts individually for better error handling
    for (const contactData of batch) {
      try {
        // Check for duplicates if requested
        if (skipDuplicates && contactData.properties.email) {
          const existing = await this.hubspotService.findContactByEmail(contactData.properties.email);
          if (existing) {
            batchResult.warnings.push(
              `Contact with email ${contactData.properties.email} already exists, skipping`
            );
            continue;
          }
        }

        // Create the contact
        const createdContact = await this.hubspotService.createContact(contactData);
        batchResult.importedContacts.push(createdContact);
        batchResult.successful++;
        
        console.log(`   ✅ Created: ${contactData.properties.firstname} ${contactData.properties.lastname} (${contactData.properties.email})`);

      } catch (error) {
        batchResult.failed++;
        batchResult.errors.push({
          contactData,
          error: (error as Error).message,
          details: error
        });
        
        console.log(`   ❌ Failed: ${contactData.properties.firstname} ${contactData.properties.lastname} - ${(error as Error).message}`);
      }
    }

    // Small delay between individual contact creations
    await this.delay(100);

    return batchResult;
  }

  private async simulateBatchProcessing(batch: any[]): Promise<void> {
    // Simulate processing time for dry run
    await this.delay(500);
    
    batch.forEach(contact => {
      console.log(`   🔍 [DRY RUN] Would create: ${contact.properties.firstname} ${contact.properties.lastname} (${contact.properties.email})`);
    });
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private calculateProgress(
    processed: number,
    total: number,
    currentBatch: number,
    totalBatches: number,
    successful: number,
    failed: number
  ): ImportProgress {
    const percentage = Math.round((processed / total) * 100);
    const elapsed = Date.now() - this.startTime;
    const estimatedTotal = (elapsed / processed) * total;
    const estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);

    return {
      total,
      processed,
      successful,
      failed,
      currentBatch,
      totalBatches,
      percentage,
      estimatedTimeRemaining: Math.round(estimatedTimeRemaining / 1000) // in seconds
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method to validate contacts before import
  validateContacts(contacts: any[]): { valid: any[]; invalid: any[]; errors: string[] } {
    const result = {
      valid: [] as any[],
      invalid: [] as any[],
      errors: [] as string[]
    };

    contacts.forEach((contact, index) => {
      const errors = [] as string[];
      
      // Required fields validation
      if (!contact.properties.email) {
        errors.push('Missing email address');
      } else if (!this.isValidEmail(contact.properties.email)) {
        errors.push('Invalid email format');
      }

      if (!contact.properties.firstname && !contact.properties.lastname) {
        errors.push('Missing both first and last name');
      }

      if (errors.length === 0) {
        result.valid.push(contact);
      } else {
        result.invalid.push(contact);
        result.errors.push(`Contact ${index + 1}: ${errors.join(', ')}`);
      }
    });

    return result;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Method to create custom properties in HubSpot if they don't exist
  async ensureCustomProperties(): Promise<void> {
    const customProperties = [
      {
        name: 'membership_tier',
        label: 'Membership Tier',
        type: 'enumeration',
        options: [
          { label: 'Individual', value: 'Individual' },
          { label: 'Corporate', value: 'Corporate' },
          { label: 'Associate', value: 'Associate' },
          { label: 'Premium', value: 'Premium' }
        ]
      },
      {
        name: 'membership_status',
        label: 'Membership Status',
        type: 'enumeration',
        options: [
          { label: 'Active', value: 'Active' },
          { label: 'Inactive', value: 'Inactive' },
          { label: 'Pending', value: 'Pending' },
          { label: 'Expired', value: 'Expired' }
        ]
      },
      {
        name: 'license_number',
        label: 'License Number',
        type: 'string'
      },
      {
        name: 'annual_fee',
        label: 'Annual Membership Fee',
        type: 'number'
      },
      {
        name: 'join_date',
        label: 'Date Joined NAMC',
        type: 'date'
      },
      {
        name: 'renewal_date',
        label: 'Membership Renewal Date',
        type: 'date'
      },
      {
        name: 'certifications',
        label: 'Certifications',
        type: 'string'
      },
      {
        name: 'county',
        label: 'County',
        type: 'string'
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'string'
      },
      {
        name: 'race',
        label: 'Race/Ethnicity',
        type: 'string'
      },
      {
        name: 'second_contact_phone',
        label: 'Second Contact Phone',
        type: 'string'
      },
      {
        name: 'second_contact_name',
        label: 'Second Contact Name',
        type: 'string'
      }
    ];

    console.log('🔧 Ensuring custom properties exist in HubSpot...');

    for (const property of customProperties) {
      try {
        await this.hubspotService.createCustomProperty('contacts', property);
        console.log(`   ✅ Created/verified property: ${property.name}`);
      } catch (error) {
        if ((error as Error).message.includes('already exists') || (error as Error).message.includes('409')) {
          console.log(`   ℹ️  Property already exists: ${property.name}`);
        } else {
          console.warn(`   ⚠️  Could not create property ${property.name}: ${(error as Error).message}`);
        }
      }
    }
  }
}

export default BatchImportService;