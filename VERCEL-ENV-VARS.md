# Vercel Environment Variables Configuration

## Required Environment Variables for Vercel Deployment

### NextAuth (Authentication)
```
NEXTAUTH_SECRET=super-secret-nextauth-key-for-namc-production-67890
NEXTAUTH_URL=https://your-vercel-app-name.vercel.app
```

### HubSpot Integration
```
HUBSPOT_ACCESS_TOKEN=your-hubspot-private-app-token
HUBSPOT_PORTAL_ID=your-hubspot-portal-id
NEXT_PUBLIC_HUBSPOT_ACCESS_TOKEN=your-hubspot-private-app-token
NEXT_PUBLIC_HUBSPOT_PORTAL_ID=your-hubspot-portal-id
```

### ArcGIS (Maps)
```
ARCGIS_API_KEY=your-arcgis-api-key
```

### Shovels API (Permits)
```
SHOVELS_API_KEY=your-shovels-api-key
```

## How to Set in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Click on **Settings** tab
3. Click on **Environment Variables** in the left sidebar
4. Add each variable with its value
5. Set them for **Production**, **Preview**, and **Development** environments
6. Click **Save**
7. Redeploy your application

## Critical Notes

1. **NEXTAUTH_SECRET**: Must be set and different from development
2. **NEXTAUTH_URL**: Must be your production Vercel URL
3. **Database**: Currently uses mock users - no database required for auth
4. **HubSpot**: Both server-side and client-side tokens needed

## Test Credentials (Production)
- **Admin**: admin@namc-norcal.org / admin123
- **Member**: member@namc-norcal.org / member123

## Debug Authentication Issues

If authentication still fails:
1. Check Vercel deployment logs for errors
2. Check browser console for client-side errors  
3. Verify environment variables are set correctly
4. Ensure NEXTAUTH_URL matches your Vercel domain exactly