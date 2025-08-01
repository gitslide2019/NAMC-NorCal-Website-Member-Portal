// Environment variable type declarations for NAMC Member Portal
declare namespace NodeJS {
  interface ProcessEnv {
    // Database
    DATABASE_URL: string;
    
    // Authentication
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    JWT_SECRET: string;
    
    // API Keys (Server-side)
    HUBSPOT_API_KEY?: string;
    OPENAI_API_KEY?: string;
    SENDGRID_API_KEY?: string;
    STRIPE_SECRET_KEY?: string;
    
    // Public API Keys (Client-side)
    NEXT_PUBLIC_HUBSPOT_ACCESS_TOKEN?: string;
    NEXT_PUBLIC_HUBSPOT_PORTAL_ID?: string;
    NEXT_PUBLIC_ARCGIS_API_KEY?: string;
    NEXT_PUBLIC_SHOVELS_API_KEY?: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
    NEXT_PUBLIC_APP_URL?: string;
    
    // Email Configuration
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    
    // Development
    NODE_ENV: 'development' | 'production' | 'test';
    
    // Build Configuration
    CORS_ORIGIN?: string;
  }
}

// Make environment variables optional during build to prevent build failures
declare global {
  namespace globalThis {
    var __BUILD_TIME__: boolean | undefined;
  }
}