# Shovels API Integration Setup Guide

This guide will help you set up the Shovels API integration for construction permit tracking in the NAMC NorCal project management system.

## Overview

The Shovels integration provides access to comprehensive construction permit data, including:
- Building permits and applications
- Inspection schedules and results
- Contractor information and licensing
- Property details and valuations
- Permit status tracking and compliance

## Prerequisites

- A Shovels API account (free tier available)
- Shovels API key with appropriate permissions
- Node.js and npm installed
- ArcGIS integration configured (for map display)

## Step 1: Get Your Shovels API Key

1. Visit [Shovels.ai](https://www.shovels.ai/)
2. Sign up for a developer account
3. Navigate to your API dashboard
4. Generate a new API key
5. Note your API key and available quotas

### API Access Levels
- **Free Tier**: Limited requests per month, basic permit data
- **Professional**: Higher limits, advanced features, historical data
- **Enterprise**: Custom limits, priority support, bulk data access

## Step 2: Configure the Integration

### Option A: Environment Variable (Recommended for Production)
```bash
# Add to your .env.local file
NEXT_PUBLIC_SHOVELS_API_KEY=your_shovels_api_key_here
```

### Option B: Settings Page Configuration
1. Navigate to `/member/settings/permits` in your application
2. Enter your Shovels API key
3. Test the connection using the built-in validator
4. Save your configuration

## Step 3: Verify Installation

The integration includes several components that should now be available:

### Core Hook: `useShovelsAPI`
```typescript
import { useShovelsAPI } from '@/hooks/useShovelsAPI';

function MyComponent() {
  const { searchPermits, getBuildingInfo, config } = useShovelsAPI();
  
  // Check if configured
  if (!config.isConfigured) {
    return <div>Please configure Shovels API</div>;
  }
  
  // Use the API
  const permits = await searchPermits({
    city: 'San Francisco',
    state: 'CA',
    limit: 50
  });
}
```

### Components Available:
- **PermitDashboard**: Comprehensive permit tracking interface
- **PermitMapView**: Interactive map showing permits with ArcGIS
- **Settings Page**: Configuration and management interface

## Features Included

### 🏗️ **Permit Tracking**
- Search permits by address, contractor, or permit number
- Filter by status, type, date range, and valuation
- View detailed permit information and history
- Track inspection schedules and results

### 🗺️ **Map Integration**
- Display permits on interactive ArcGIS maps
- Color-coded markers by permit status
- Click markers for detailed permit information
- Geographic filtering and search

### 📊 **Analytics & Reporting**
- Permit statistics and trends
- Contractor performance tracking
- Valuation analysis and projections
- Compliance monitoring

### 🔍 **Advanced Search**
- Multi-criteria permit searches
- Saved search filters
- Bulk data export
- Historical permit data

## Usage Examples

### Basic Permit Search

```typescript
import { useShovelsAPI } from '@/hooks/useShovelsAPI';

function PermitSearch() {
  const { searchPermits } = useShovelsAPI();
  
  const searchByAddress = async () => {
    const permits = await searchPermits({
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      status: 'issued',
      limit: 25
    });
    
    console.log('Found permits:', permits);
  };
}
```

### Building Information Lookup

```typescript
import { useShovelsAPI } from '@/hooks/useShovelsAPI';

function BuildingInfo() {
  const { getBuildingInfo } = useShovelsAPI();
  
  const getProperty = async () => {
    const building = await getBuildingInfo('123 Main St, San Francisco, CA');
    
    if (building) {
      console.log('Property details:', building);
      console.log('Associated permits:', building.permits);
    }
  };
}
```

### Project-Specific Permit Tracking

```typescript
import { useProjectPermits } from '@/hooks/useShovelsAPI';

function ProjectPermits({ project }) {
  const { permits, buildingInfo, isLoading } = useProjectPermits(
    project.address,
    project.city,
    project.state
  );
  
  if (isLoading) return <div>Loading permits...</div>;
  
  return (
    <div>
      <h3>Permits for {project.name}</h3>
      {permits.map(permit => (
        <div key={permit.id}>
          <h4>{permit.permit_number}</h4>
          <p>Status: {permit.status}</p>
          <p>Value: ${permit.valuation?.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
```

## API Reference

### Available Methods

#### `searchPermits(params)`
Search for permits based on various criteria.

**Parameters:**
- `address` (string): Street address
- `city` (string): City name
- `state` (string): State abbreviation
- `zip` (string): ZIP code
- `permitType` (string): Type of permit (building, electrical, etc.)
- `status` (string): Permit status (issued, pending, expired, rejected)
- `dateFrom` (string): Start date (YYYY-MM-DD)
- `dateTo` (string): End date (YYYY-MM-DD)
- `limit` (number): Maximum results (default: 50)

#### `getBuildingInfo(address)`
Get comprehensive building information for an address.

**Parameters:**
- `address` (string): Full address string

#### `getPermitDetails(permitId)`
Get detailed information for a specific permit.

**Parameters:**
- `permitId` (string): Unique permit identifier

#### `getPermitsByContractor(contractorName)`
Search permits by contractor name.

**Parameters:**
- `contractorName` (string): Contractor company name

### Data Types

#### Permit Object
```typescript
interface ShovelsPermit {
  id: string;
  permit_number: string;
  permit_type: string;
  status: 'issued' | 'pending' | 'expired' | 'rejected' | 'under_review';
  issued_date: string;
  expiration_date?: string;
  valuation: number;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    latitude?: number;
    longitude?: number;
  };
  contractor?: {
    name: string;
    license_number?: string;
    phone?: string;
  };
  owner?: {
    name: string;
    phone?: string;
  };
  fees?: {
    total: number;
    paid: number;
    outstanding: number;
  };
  inspections?: ShovelsInspection[];
}
```

#### Inspection Object
```typescript
interface ShovelsInspection {
  id: string;
  type: string;
  status: 'scheduled' | 'passed' | 'failed' | 'cancelled';
  scheduled_date?: string;
  completed_date?: string;
  inspector?: string;
  notes?: string;
}
```

## Configuration Options

### API Settings
```typescript
interface ShovelsAPIConfig {
  apiKey: string;           // Your Shovels API key
  baseUrl: string;          // API base URL (default: https://api.shovels.ai/v1)
  isConfigured: boolean;    // Configuration status
}
```

### Search Parameters
- **Geographic**: Address, city, state, ZIP code
- **Temporal**: Date ranges, issue dates, expiration dates
- **Classification**: Permit types, status values, valuation ranges
- **Contractor**: Company names, license numbers, performance history

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   ```
   Error: Shovels API error: 401 Unauthorized
   ```
   - Check your API key is correct
   - Verify your account has active permissions
   - Ensure the key hasn't expired

2. **Rate Limit Exceeded**
   ```
   Error: Shovels API error: 429 Too Many Requests
   ```
   - Check your usage quotas in the Shovels dashboard
   - Implement request throttling
   - Consider upgrading to a higher tier

3. **No Results Found**
   - Verify the address format and spelling
   - Try broader search criteria
   - Check if permits exist for the specified area

4. **Geocoding Issues**
   - Ensure ArcGIS integration is configured
   - Check address formatting
   - Verify coordinates are within expected ranges

### Debug Mode

Enable detailed logging:
```javascript
// Add to your component
console.log('Shovels API Config:', config);
console.log('Search Parameters:', searchParams);
```

### Network Issues

Check connectivity and API status:
```typescript
const testConnection = async () => {
  try {
    const isWorking = await testConnection();
    console.log('Shovels API Status:', isWorking ? 'Connected' : 'Failed');
  } catch (error) {
    console.error('Connection test failed:', error);
  }
};
```

## API Usage and Quotas

### Request Limits by Tier

**Free Tier:**
- 1,000 requests/month
- Basic permit data
- Limited historical access

**Professional:**
- 10,000 requests/month
- Full permit details
- 2-year historical data
- Priority support

**Enterprise:**
- Custom limits
- Bulk data access
- Real-time updates
- Dedicated support

### Optimization Tips

1. **Batch Requests**: Group similar searches to reduce API calls
2. **Cache Results**: Store frequently accessed data locally
3. **Smart Filtering**: Use precise criteria to reduce result sets
4. **Pagination**: Use limit parameters for large datasets

## Security Considerations

### API Key Security
- Store keys in environment variables
- Never commit keys to version control
- Rotate keys regularly
- Monitor usage for unusual activity

### Data Privacy
- Follow local data protection regulations
- Implement proper access controls
- Log API usage for audit purposes
- Respect data retention policies

## Best Practices

### Performance
- Implement request caching for frequently accessed data
- Use pagination for large result sets
- Optimize search criteria to reduce unnecessary requests
- Monitor API usage and implement rate limiting

### User Experience
- Show loading states during API calls
- Provide meaningful error messages
- Cache search results for better responsiveness
- Implement offline fallbacks where possible

### Monitoring
- Track API usage against quotas
- Monitor response times and error rates
- Set up alerts for quota thresholds
- Log important API interactions

## Advanced Features

### 1. Real-time Permit Monitoring
Set up webhooks or polling to monitor permit status changes:

```typescript
const monitorPermit = async (permitId: string) => {
  const permit = await getPermitDetails(permitId);
  
  // Check for status changes
  if (permit.status !== previousStatus) {
    // Trigger notifications or updates
    notifyStatusChange(permit);
  }
};
```

### 2. Contractor Performance Analysis
Analyze contractor data across multiple permits:

```typescript
const analyzeContractor = async (contractorName: string) => {
  const permits = await getPermitsByContractor(contractorName);
  
  const analysis = {
    totalPermits: permits.length,
    averageValue: permits.reduce((sum, p) => sum + p.valuation, 0) / permits.length,
    successRate: permits.filter(p => p.status === 'issued').length / permits.length,
    inspectionHistory: permits.flatMap(p => p.inspections || [])
  };
  
  return analysis;
};
```

### 3. Geographic Analysis
Combine with mapping for spatial analysis:

```typescript
const analyzeArea = async (bounds: GeoBounds) => {
  const permits = await searchPermits({
    // Use bounds to search specific geographic area
    latitude: bounds.center.lat,
    longitude: bounds.center.lng,
    radius: bounds.radius
  });
  
  // Analyze permit density, values, types
  return spatialAnalysis(permits);
};
```

## Integration with NAMC Workflows

### Project Permit Tracking
Automatically associate permits with NAMC projects:

```typescript
const linkProjectPermits = async (project: Project) => {
  const permits = await searchPermits({
    address: project.address,
    city: project.city,
    state: project.state
  });
  
  // Link permits to project for tracking
  await updateProject(project.id, {
    linkedPermits: permits.map(p => p.id)
  });
};
```

### Compliance Monitoring
Track permit compliance for member projects:

```typescript
const checkCompliance = async (projects: Project[]) => {
  const complianceReport = [];
  
  for (const project of projects) {
    const permits = await useProjectPermits(
      project.address, 
      project.city, 
      project.state
    );
    
    const issues = permits.permits.filter(p => 
      p.status === 'expired' || 
      p.inspections?.some(i => i.status === 'failed')
    );
    
    if (issues.length > 0) {
      complianceReport.push({
        project: project.name,
        issues: issues.length,
        details: issues
      });
    }
  }
  
  return complianceReport;
};
```

## Support and Resources

- **Shovels Documentation**: [docs.shovels.ai](https://docs.shovels.ai/)
- **API Reference**: [api.shovels.ai/docs](https://api.shovels.ai/docs)
- **Support Portal**: Available through your Shovels dashboard
- **Community Forums**: Developer community and discussions

## Maintenance

### Regular Tasks
- Monitor API usage monthly
- Review and optimize search queries
- Update cached data periodically
- Test integration with new Shovels features

### Updates
- Keep integration code updated with latest Shovels API changes
- Monitor for new features and endpoints
- Update type definitions as needed
- Test thoroughly before deploying updates

---

**Need Help?** If you encounter issues with the Shovels integration, check the troubleshooting section above or contact your development team for assistance.