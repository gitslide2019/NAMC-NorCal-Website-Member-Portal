# Technology Stack & Development Guidelines

## Core Technologies

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS with custom NAMC design system
- **Animation**: Framer Motion for smooth transitions
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **UI Components**: Radix UI primitives with custom styling

### Backend & Database
- **Database**: SQLite (development) with Prisma ORM
- **Authentication**: NextAuth.js with JWT strategy
- **API**: Next.js API routes with TypeScript

### External Integrations
- **CRM Backbone**: HubSpot API as primary data repository for members, projects, tasks, and business workflows
- **Website Generation**: HubSpot CMS Hub for automated member website creation with professional email setup
- **AI Services**: Anthropic Claude and OpenAI GPT-4 for construction assistant, business growth plans, intelligent bid generation, and compliance review
- **Computer Vision**: Google Vision API for OCR business card scanning, Gemini Live AI for real-time camera-based cost estimation
- **Cost Data**: RS Means API for accurate construction cost estimation and market pricing
- **Financial Management**: QuickBooks API for project accounting and business financial integration
- **E-commerce**: Shopify API for product catalog and order management, Printify API for print-on-demand fulfillment
- **Maps**: Mapbox GL for primary map interface, ArcGIS Online APIs for project data and business analytics
- **GIS Analytics**: ArcGIS Online integration for spatial analysis, demographic data, and construction market insights
- **Energy Efficiency APIs**: SnuggPro and Energy Plus for residential energy modeling, Energy Star Portfolio Manager for commercial building performance
- **Permits**: Shovels API for construction permit data and regulatory information
- **Email**: SendGrid for transactional emails and automated member communications
- **File Processing**: Sharp for image optimization, jsPDF for document generation

## Build System & Commands

### Development
```bash
npm run dev          # Start development server
npm run type-check   # TypeScript type checking
npm run lint         # ESLint code linting
```

### Database
```bash
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open Prisma Studio
```

### Testing
```bash
npm run test:playwright     # Run Playwright tests
npm run test:e2e           # End-to-end system tests
npm run test:accessibility # Accessibility compliance tests
npm run test:comprehensive # Full test suite
npm run test:install       # Install Playwright browsers
```

### Production
```bash
npm run build        # Build for production (includes Prisma generate)
npm run start        # Start production server
```

## Code Style & Conventions

### TypeScript
- Strict mode enabled with comprehensive type checking
- Use path aliases: `@/` for src root, `@/components/ui/` for UI components
- Prefer interfaces over types for object definitions
- Use proper typing for API responses and database models

### Component Architecture
- Functional components with hooks
- Custom hooks in `/src/hooks/` for reusable logic
- UI components in `/src/components/ui/` following Radix patterns
- Service layer in `/src/lib/services/` for external integrations

### Styling Guidelines
- Tailwind CSS with custom NAMC color palette
- Glass morphism design patterns with backdrop blur
- Mobile-first responsive design
- Custom animations using Tailwind and Framer Motion

## Environment Configuration

### Required Environment Variables
```bash
NEXTAUTH_SECRET=         # NextAuth.js secret key
NEXTAUTH_URL=           # Application URL
DATABASE_URL=           # Database connection string (local cache)
HUBSPOT_ACCESS_TOKEN=   # HubSpot private app token (primary data source)
HUBSPOT_PORTAL_ID=      # HubSpot portal ID
ANTHROPIC_API_KEY=      # Claude API key for AI features
OPENAI_API_KEY=         # OpenAI API key for AI features
GOOGLE_VISION_API_KEY=  # Google Vision API for OCR business card scanning
GEMINI_API_KEY=         # Gemini Live AI for real-time camera cost estimation
RS_MEANS_API_KEY=       # RS Means API for cost estimation
QUICKBOOKS_CLIENT_ID=   # QuickBooks OAuth client ID
QUICKBOOKS_CLIENT_SECRET= # QuickBooks OAuth client secret
SHOPIFY_ACCESS_TOKEN=   # Shopify API access token
SHOPIFY_STORE_URL=      # Shopify store URL
SHOPIFY_LOCATION_ID=    # Shopify inventory location ID
PRINTIFY_API_KEY=       # Printify API key for print-on-demand
PRINTIFY_SHOP_ID=       # Printify shop ID
SHOVELS_API_KEY=        # Shovels permits API key
SENDGRID_API_KEY=       # SendGrid email API key
STRIPE_SECRET_KEY=      # Stripe payment processing
STRIPE_CONNECT_CLIENT_ID= # Stripe Connect for escrow payments
BANKING_API_KEY=        # Banking API for ACH/wire transfers
ESCROW_SERVICE_API=     # Third-party escrow service integration
SNUGGPRO_API_KEY=       # SnuggPro API for residential energy modeling
ENERGY_PLUS_API_KEY=    # Energy Plus API for building energy simulation
ENERGY_STAR_API_KEY=    # Energy Star Portfolio Manager API for commercial buildings
MAPBOX_ACCESS_TOKEN=    # Mapbox GL for primary map interface
ARCGIS_API_KEY=         # ArcGIS Online for spatial analytics and business intelligence
ARCGIS_CLIENT_ID=       # ArcGIS OAuth for member access provisioning
HUBSPOT_CMS_API_KEY=    # HubSpot CMS Hub for website generation
DOMAIN_REGISTRAR_API=   # Domain registration service for member websites
```

## Performance & Optimization

- Next.js Image component for optimized images
- Dynamic imports for code splitting
- React.memo for expensive component renders
- Virtualized lists for large datasets (react-window)
- Sharp for server-side image processing

## Development Guidelines

### Data & API Integration
- **HubSpot-First Architecture**: Always use HubSpot as the primary data source with local database as cache
- **No Mock Data**: Never simulate API connections or use mock data when real integrations don't exist
- **Real Business Logic**: Always create proper data structures and business logic for actual implementation
- **Project Management Focus**: Design all features to support team collaboration, task assignment, and project workflows
- **CRM Integration**: Ensure all member interactions and business processes sync with HubSpot workflows
- **Production-Ready Code**: Write code that can handle real data flows and edge cases from day one