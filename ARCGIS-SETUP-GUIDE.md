# ArcGIS Integration Setup Guide

This guide will help you set up the ArcGIS mapping integration for the NAMC NorCal project management system.

## Prerequisites

- An ArcGIS Developer Account (free)
- ArcGIS API key with appropriate privileges
- Node.js and npm installed

## Step 1: Install ArcGIS Dependencies

```bash
npm install @arcgis/core
```

## Step 2: Get Your ArcGIS API Key

1. Visit [ArcGIS Developers Portal](https://developers.arcgis.com/)
2. Sign up for a free developer account or log in
3. Navigate to "API Keys" section
4. Click "Create API Key"
5. Configure your API key with these services:
   - **Geocoding** (for address to coordinates conversion)
   - **Basemaps** (for map display)
   - **Places** (for location search)
   - **Routing** (optional, for directions)

## Step 3: Configure the Integration

1. Navigate to `/member/settings/map` in your application
2. Enter your ArcGIS API key
3. Test the connection using the built-in test button
4. Configure default map settings:
   - **Default Center**: Set to your primary service area (default: San Francisco Bay Area)
   - **Default Zoom**: Recommended zoom level (default: 10)
   - **Enabled Layers**: Choose which layers to display by default

## Step 4: Environment Variables (Optional)

For production deployment, you can set the API key as an environment variable:

```bash
# .env.local
NEXT_PUBLIC_ARCGIS_API_KEY=your_api_key_here
```

Then update the configuration to use the environment variable as a fallback.

## Features Included

### 🗺️ **Interactive Project Maps**
- View all projects on an interactive map
- Color-coded markers by project status
- Click markers for project details
- Fullscreen map view

### 🔍 **Location Services**
- Automatic address geocoding
- Reverse geocoding (coordinates to address)
- Location search and filtering
- Real-time project location updates

### 🎛️ **Layer Management**
- Toggle different map layers on/off
- Project sites layer
- Team locations (future feature)
- Traffic information
- Permits and inspections
- Utilities infrastructure

### 📱 **Responsive Design**
- Mobile-optimized map controls
- Touch-friendly interface
- Adaptive layout for all screen sizes

## Usage Examples

### Basic Map Display

```tsx
import ProjectMap from '@/components/ui/ProjectMap';
import { useArcGISIntegration } from '@/hooks/useArcGISIntegration';

function MyComponent() {
  const { settings, isConfigured } = useArcGISIntegration();
  
  if (!isConfigured) {
    return <div>Please configure ArcGIS integration first</div>;
  }

  return (
    <ProjectMap
      apiKey={settings.apiKey}
      projects={projectLocations}
      onProjectSelect={handleProjectSelect}
      center={settings.defaultCenter}
      zoom={settings.defaultZoom}
      height="500px"
    />
  );
}
```

### Address Geocoding

```tsx
import { useArcGISIntegration } from '@/hooks/useArcGISIntegration';

function AddressInput() {
  const { geocodeAddress } = useArcGISIntegration();
  
  const handleAddressSubmit = async (address: string) => {
    const coordinates = await geocodeAddress(address);
    if (coordinates) {
      console.log('Coordinates:', coordinates);
      // Use coordinates for map display or storage
    }
  };
}
```

### Project Location Enhancement

```tsx
import { useProjectLocations } from '@/hooks/useArcGISIntegration';

function ProjectList({ projects }) {
  const { enrichedProjects, isEnriching } = useProjectLocations(projects);
  
  return (
    <div>
      {isEnriching && <div>Loading map locations...</div>}
      {enrichedProjects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

## Configuration Options

### Map Settings

```typescript
interface MapSettings {
  apiKey: string;                    // Your ArcGIS API key
  defaultCenter: {                   // Default map center
    latitude: number;
    longitude: number;
  };
  defaultZoom: number;               // Default zoom level (1-20)
  enabledLayers: string[];           // Array of enabled layer IDs
}
```

### Available Layers

- `projects` - Project site locations
- `team_locations` - Team member locations (future)
- `traffic` - Real-time traffic information
- `permits` - Permit and inspection locations
- `utilities` - Utility infrastructure
- `demographics` - Census and demographic data

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Verify your API key is correct
   - Check that required services are enabled
   - Ensure the key hasn't expired

2. **Map Not Loading**
   - Check browser console for errors
   - Verify internet connection
   - Ensure ArcGIS CDN is accessible

3. **Geocoding Failures**
   - Check address format
   - Verify geocoding service is enabled
   - Monitor API usage quotas

4. **Performance Issues**
   - Limit the number of markers displayed
   - Use clustering for dense marker areas
   - Optimize layer visibility

### Debug Mode

Enable debug logging by setting:

```javascript
window.arcgisDebug = true;
```

This will log detailed information about API calls and responses.

## API Usage and Quotas

### Free Tier Limits
- **Geocoding**: 20,000 requests/month
- **Basemaps**: 2,000,000 map tiles/month
- **Places**: 1,000 requests/month

### Monitoring Usage
- Check usage in the ArcGIS Developers Portal
- Set up alerts for approaching limits
- Consider upgrading for higher usage needs

## Security Considerations

### API Key Security
- Never expose API keys in client-side code for production
- Use server-side proxy for sensitive operations
- Implement rate limiting and usage monitoring
- Regularly rotate API keys

### Recommended Production Setup
1. Store API key in secure environment variables
2. Implement server-side geocoding proxy
3. Add request validation and rate limiting
4. Monitor and log all API usage

## Support Resources

- [ArcGIS Developers Documentation](https://developers.arcgis.com/documentation/)
- [ArcGIS API for JavaScript](https://developers.arcgis.com/javascript/latest/)
- [ArcGIS Community Forums](https://community.esri.com/t5/arcgis-api-for-javascript/ct-p/arcgis-api-for-javascript)
- [Esri Technical Support](https://support.esri.com/)

## Advanced Features (Future Enhancements)

### 1. Real-time Location Tracking
- Track team member locations in real-time
- Geofencing for site check-ins
- Automatic project proximity notifications

### 2. Route Optimization
- Calculate optimal routes between project sites
- Consider traffic and construction delays
- Multi-stop route planning

### 3. Spatial Analysis
- Analyze project density by region
- Identify service coverage gaps
- Demographic analysis for project planning

### 4. Custom Map Layers
- Add custom business data layers
- Import CAD drawings and blueprints
- Overlay permit and zoning information

## Maintenance

### Regular Tasks
- Monitor API usage monthly
- Update ArcGIS SDK when new versions are released
- Review and optimize layer configurations
- Test backup/restore procedures for map settings

### Version Updates
The ArcGIS API for JavaScript is updated regularly. Check for updates and test compatibility before upgrading in production.

---

**Need Help?** If you encounter issues setting up the ArcGIS integration, please check the troubleshooting section above or contact the development team.