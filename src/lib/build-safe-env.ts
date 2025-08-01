// Build-safe environment variable access
// Prevents build failures when environment variables are not available

/**
 * Safely get environment variable with optional fallback
 * Returns undefined during build if variable is not available
 */
export function getEnvVar(key: keyof NodeJS.ProcessEnv, fallback?: string): string | undefined {
  try {
    // Check if we're in a build environment
    if (typeof process === 'undefined') {
      return fallback;
    }
    
    return process.env[key] || fallback;
  } catch (error) {
    // In case process.env access fails during build
    console.warn(`Failed to access environment variable ${key}:`, error);
    return fallback;
  }
}

/**
 * Safely check if environment variable exists
 */
export function hasEnvVar(key: keyof NodeJS.ProcessEnv): boolean {
  try {
    return typeof process !== 'undefined' && !!process.env[key];
  } catch {
    return false;
  }
}

/**
 * Get required environment variable or throw error (only at runtime)
 */
export function getRequiredEnvVar(key: keyof NodeJS.ProcessEnv): string {
  const value = getEnvVar(key);
  
  if (!value) {
    // Only throw during runtime, not build
    if (typeof window !== 'undefined' || (typeof process !== 'undefined' && process.env.NODE_ENV !== undefined)) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    
    // Return empty string during build to prevent failures
    return '';
  }
  
  return value;
}

/**
 * Build-safe database URL access
 */
export function getDatabaseUrl(): string {
  return getEnvVar('DATABASE_URL', 'postgresql://localhost:5432/namc_portal') || '';
}

/**
 * Build-safe API key access for client-side
 */
export function getPublicApiKeys() {
  return {
    hubspotToken: getEnvVar('NEXT_PUBLIC_HUBSPOT_ACCESS_TOKEN'),
    hubspotPortalId: getEnvVar('NEXT_PUBLIC_HUBSPOT_PORTAL_ID'),
    arcgisApiKey: getEnvVar('NEXT_PUBLIC_ARCGIS_API_KEY'),
    shovelsApiKey: getEnvVar('NEXT_PUBLIC_SHOVELS_API_KEY'),
    stripePublishableKey: getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
    appUrl: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
  };
}