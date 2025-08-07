# Project Structure & Organization

## Root Directory Structure

```
├── src/                    # Main application source code
├── prisma/                 # Database schema and migrations
├── tests/                  # Playwright test suites
├── scripts/                # Utility scripts for data import/sync
├── docs/                   # Project documentation
├── design-screenshots/     # UI/UX reference images
└── screenshots/            # Test and validation screenshots
```

## Source Code Organization (`src/`)

### App Router Structure (`src/app/`)
```
src/app/
├── page.tsx               # Landing page (public)
├── layout.tsx             # Root layout with providers
├── globals.css            # Global styles and Tailwind imports
├── providers.tsx          # Context providers (Theme, etc.)
├── auth/                  # Authentication pages
│   ├── signin/
│   └── register/
├── member/                # Member portal (protected routes)
│   ├── layout.tsx         # Member portal layout
│   ├── dashboard/         # Member dashboard with project and task overview
│   ├── projects/          # Project management with team collaboration
│   ├── payments/          # Project payment and escrow management
│   ├── tasks/             # Task management and assignment
│   ├── teams/             # Team formation and member collaboration
│   ├── tools/             # Tool lending library
│   ├── growth-plan/       # AI-powered business growth planning
│   ├── learning/          # Categorized LMS with sponsor integration
│   ├── badges/            # Proficiency badges and certifications
│   ├── cost-estimator/    # RS Means and camera AI cost estimation
│   ├── bids/              # AI bid generation and management
│   ├── scanner/           # OCR business card scanner
│   ├── directory/         # Member directory and networking
│   ├── community/         # Community discussions and messaging
│   ├── committees/        # Committee management and collaboration
│   ├── voting/            # Community voting and governance
│   ├── chapters/          # Inter-chapter collaboration and connections
│   ├── shop/              # Member shop with exclusive pricing
│   ├── media/             # Media center access
│   ├── websites/          # Professional website management
│   ├── scheduling/        # HubSpot-integrated contractor scheduling and client booking
│   ├── onboarding/        # Interactive member onboarding
│   └── settings/          # Member settings and integrations
├── admin/                 # Admin portal (admin-only routes)
│   ├── layout.tsx         # Admin layout
│   ├── dashboard/         # Admin dashboard with system metrics
│   ├── members/           # Member management and approval
│   ├── projects/          # Project administration and oversight
│   ├── tasks/             # System-wide task management
│   ├── tools/             # Tool inventory management
│   ├── shop/              # Product and order management
│   ├── media/             # Content management system
│   ├── websites/          # Member website generation and management
│   ├── integrations/      # HubSpot, QuickBooks, and API management
│   ├── analytics/         # Business intelligence and reporting
│   └── notifications/     # System notifications and workflows
└── api/                   # API routes
    ├── auth/              # NextAuth.js configuration
    ├── members/           # Member CRUD operations
    ├── projects/          # Project management APIs
    ├── tasks/             # Task assignment and management
    ├── teams/             # Team collaboration APIs
    ├── tools/             # Tool lending library APIs
    ├── growth-plans/      # AI business growth planning
    ├── cost-estimates/    # RS Means and camera AI estimation
    ├── bids/              # AI bid generation and review APIs
    ├── community/         # Community platform APIs
    ├── committees/        # Committee management APIs
    ├── voting/            # Voting system APIs
    ├── chapters/          # Inter-chapter collaboration APIs
    ├── learning/          # Sponsored course and LMS APIs
    ├── badges/            # Proficiency badge and campaign APIs
    ├── payments/          # Project payment and escrow APIs
    ├── ocr/               # Business card scanning
    ├── shop/              # E-commerce and product management
    ├── media/             # Content management APIs
    ├── websites/          # Professional website generation APIs
    ├── scheduling/        # Contractor scheduling and booking APIs
    ├── hubspot/           # HubSpot integration endpoints
    ├── quickbooks/        # Financial integration APIs
    ├── notifications/     # Notification system
    └── webhooks/          # External service webhooks
```

### Component Architecture (`src/components/`)
```
src/components/
├── ui/                    # Reusable UI components (Radix-based)
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── select.tsx
│   ├── tabs.tsx
│   ├── ProjectMap.tsx     # Map components
│   ├── PermitDashboard.tsx
│   └── index.ts           # Component exports
├── layout/                # Layout-specific components
├── forms/                 # Form components
│   ├── ContactForm.tsx
│   └── NewsletterSignup.tsx
└── hubspot/               # HubSpot integration components
    ├── HubSpotDashboardWidget.tsx
    ├── MemberProfileSync.tsx
    └── ProjectDealSync.tsx
```

### Business Logic (`src/lib/` & `src/services/`)
```
src/lib/
├── auth.ts                # NextAuth configuration
├── utils.ts               # Utility functions
├── build-safe-env.ts      # Environment variable handling
├── hubspot-*.ts           # HubSpot service modules
└── services/              # External service integrations
    ├── hubspot-backbone.service.ts      # Primary CRM integration
    ├── task-management.service.ts       # HubSpot task workflows
    ├── project-workflow.service.ts      # Project management logic
    ├── tool-lending.service.ts          # Equipment management
    ├── growth-plan-ai.service.ts        # AI business planning
    ├── ocr-business-card.service.ts     # Card scanning and OCR
    ├── gemini-camera-ai.service.ts      # Gemini Live AI real-time cost estimation
    ├── rs-means-api.service.ts          # Cost data integration
    ├── ai-bid-generator.service.ts      # AI-powered bid creation and review
    ├── community-platform.service.ts    # Member messaging and discussions
    ├── committee-management.service.ts   # Committee collaboration
    ├── voting-system.service.ts          # Community voting and governance
    ├── chapter-connections.service.ts    # Inter-chapter collaboration
    ├── sponsored-learning.service.ts     # LMS with sponsor integration
    ├── proficiency-badges.service.ts     # Badge system and shop campaigns
    ├── project-payments.service.ts       # Escrow and automated payment processing
    ├── quickbooks-api.service.ts        # Financial management
    ├── shopify-api.service.ts           # E-commerce product and order management
    ├── printify-api.service.ts          # Print-on-demand fulfillment
    ├── shop.service.ts                  # E-commerce functionality
    ├── media-management.service.ts      # Content management
    ├── website-generation.service.ts    # Professional website creation
    ├── hubspot-scheduling.service.ts    # Contractor scheduling and booking system
    └── engagement-tracking.service.ts   # Member analytics

src/services/              # Additional service layer
├── hubspot.service.ts
├── batch-import.service.ts
└── excel-processor.service.ts
```

### Custom Hooks (`src/hooks/`)
```
src/hooks/
├── useHubSpot.ts          # HubSpot CRM integration
├── useTaskManagement.ts   # Task assignment and tracking
├── useProjectWorkflow.ts  # Project management workflows
├── useTeamCollaboration.ts # Team formation and collaboration
├── useToolLending.ts      # Equipment reservation system
├── useGrowthPlan.ts       # AI business planning
├── useCostEstimator.ts    # RS Means and Gemini Live AI estimation
├── useAIBidGenerator.ts   # AI-powered bid generation and review
├── useOCRScanner.ts       # Business card scanning
├── useShop.ts             # E-commerce functionality
├── useMediaCenter.ts      # Content management
├── useWebsiteGeneration.ts # Professional website creation and management
├── useCommunityPlatform.ts # Member messaging, discussions, and networking
├── useCommitteeManagement.ts # Committee collaboration and project management
├── useCommunityVoting.ts   # Voting system and governance
├── useChapterConnections.ts # Inter-chapter collaboration and resource sharing
├── useSponsoredLearning.ts # Categorized LMS with sponsor partnerships
├── useProficiencyBadges.ts # Badge system and shop campaign integration
├── useProjectPayments.ts  # Escrow-based payment and cash flow management
├── useQuickBooks.ts       # Financial integration
├── useArcGISIntegration.ts # ArcGIS Online spatial analytics and business intelligence
├── useMapboxMap.ts        # Primary Mapbox map interface
├── useEngagementTracking.ts # Member analytics
├── useContractorScheduling.ts # Scheduling and booking system
├── useAutoSave.ts         # Auto-save functionality
└── useKeyboardShortcuts.ts # Keyboard navigation
```

### Type Definitions (`src/types/`)
```
src/types/
├── index.ts               # Main type definitions
├── construction-project.types.ts
├── environment.d.ts       # Environment variable types
└── playwright.d.ts        # Test-specific types
```

## Testing Structure (`tests/`)

### Test Organization
```
tests/
├── e2e/                   # End-to-end user journeys
├── accessibility/         # WCAG compliance tests
├── integration/           # API integration tests
├── performance/           # Performance benchmarks
├── visual/                # Visual regression tests
├── mobile/                # Mobile-specific tests
├── cross-browser/         # Browser compatibility
├── pages/                 # Page Object Model classes
├── fixtures/              # Test data and assets
└── utils/                 # Test helper functions
```

## Configuration Files

### Key Configuration
- `next.config.js` - Next.js configuration with webpack aliases
- `tailwind.config.js` - Tailwind CSS with NAMC design system
- `tsconfig.json` - TypeScript configuration with path mapping
- `playwright.config.ts` - Test configuration
- `prisma/schema.prisma` - Database schema definition

## Naming Conventions

### Files & Directories
- **Pages**: PascalCase for page components (`page.tsx`)
- **Components**: PascalCase for component files (`Button.tsx`)
- **Hooks**: camelCase starting with `use` (`useHubSpot.ts`)
- **Services**: kebab-case with `.service.ts` suffix
- **Types**: kebab-case with `.types.ts` suffix
- **API Routes**: kebab-case directories with `route.ts`

### Code Conventions
- **Components**: PascalCase (`MemberDashboard`)
- **Functions**: camelCase (`getUserProjects`)
- **Constants**: UPPER_SNAKE_CASE (`NAMC_COLORS`)
- **Interfaces**: PascalCase with descriptive names (`ProjectWorkflow`)
- **Enums**: PascalCase (`ProjectStatus`)

## Import/Export Patterns

### Path Aliases
- `@/` - src root directory
- `@/components/ui/` - UI component library
- `@/lib/` - Utility libraries and services
- `@/hooks/` - Custom React hooks
- `@/types/` - Type definitions

### Component Exports
- Default exports for page components and main components
- Named exports for utility functions and hooks
- Barrel exports in `index.ts` files for UI components