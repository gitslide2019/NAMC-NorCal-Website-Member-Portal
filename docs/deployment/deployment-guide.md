# NAMC Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the NAMC website and member portal across different environments (development, staging, production) with proper CI/CD, monitoring, and rollback procedures.

## Infrastructure Architecture

### Cloud Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare CDN                        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        Vercel Edge                           │
│                    (Next.js Frontend)                        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                              │
│                    (Rate Limiting)                           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel API    │    │   Vercel API    │    │   Vercel API    │
│   (US-East)     │    │   (US-West)     │    │   (EU-Central)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Supabase)                     │
│                   Primary + Read Replicas                    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      AWS S3 Storage                          │
│                 (Images, Documents, Backups)                 │
└─────────────────────────────────────────────────────────────┘
```

## Environment Configuration

### Environment Variables

#### Production Environment (.env.production)
```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://namc.org
NEXT_PUBLIC_API_URL=https://api.namc.org

# Database
DATABASE_URL=postgresql://username:password@host:5432/namc_prod
DATABASE_POOL_SIZE=20

# Authentication
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=7d
NEXTAUTH_URL=https://namc.org
NEXTAUTH_SECRET=your-nextauth-secret

# Payment Processing
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Third-Party Services
OPENAI_API_KEY=sk-...
HUBSPOT_API_KEY=pat-...
SHOVELS_API_KEY=...
ARCGIS_API_KEY=...

# Email Services
RESEND_API_KEY=re_...
SENDGRID_API_KEY=SG...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=namc-production
AWS_REGION=us-east-1

# Monitoring
SENTRY_DSN=https://...
DATADOG_API_KEY=...
```

#### Staging Environment (.env.staging)
```bash
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.namc.org
NEXT_PUBLIC_API_URL=https://staging-api.namc.org
# ... other staging-specific variables
```

#### Development Environment (.env.development)
```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
# ... other development-specific variables
```

## Deployment Environments

### 1. Development Environment

#### Local Setup
```bash
# Clone repository
git clone https://github.com/namc/namc-website.git
cd namc-website

# Install dependencies
npm install
cd ../backend && npm install

# Setup local database
supabase start
supabase db reset

# Run development servers
npm run dev:frontend  # localhost:3000
npm run dev:backend   # localhost:3001
```

#### Docker Development
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/namc_dev

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: namc_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 2. Staging Environment

#### Vercel Staging Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to staging
vercel --prod --target=staging

# Set environment variables
vercel env add DATABASE_URL staging
vercel env add JWT_SECRET staging
# ... add all required variables
```

#### Database Migration for Staging
```bash
# Create staging database
supabase projects create namc-staging

# Run migrations
supabase db push --project-ref namc-staging

# Seed with test data
supabase db reset --project-ref namc-staging --seed
```

### 3. Production Environment

#### Production Deployment Checklist

**Pre-deployment**
- [ ] All tests passing (unit, integration, E2E)
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Database backup created
- [ ] Deployment window scheduled

**Deployment Steps**
1. **Database Migration**
   ```bash
   # Create backup
   supabase db backup create --project-ref namc-production
   
   # Run migrations
   supabase db push --project-ref namc-production
   ```

2. **Frontend Deployment**
   ```bash
   # Build and deploy
   npm run build
   vercel --prod
   
   # Verify deployment
   curl -I https://namc.org
   ```

3. **Backend Deployment**
   ```bash
   # Deploy API
   vercel --prod --cwd backend
   
   # Verify health check
   curl https://api.namc.org/health
   ```

4. **Post-deployment Verification**
   ```bash
   # Run smoke tests
   npm run test:smoke
   
   # Check monitoring
   curl https://status.namc.org
   ```

## CI/CD Pipeline

### GitHub Actions Workflow

#### Production Deployment
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:all
      - run: npm run test:e2e

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: github/super-linter@v4
      - uses: snyk/actions/node@master

  deploy:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

#### Staging Deployment
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [ develop ]
  pull_request:
    branches: [ main ]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_STAGING_PROJECT_ID }}
          vercel-args: '--target=staging'
```

## Database Management

### Migration Strategy

#### Creating Migrations
```bash
# Create new migration
supabase migration new add_project_status_column

# Edit migration file
# supabase/migrations/20240729000000_add_project_status_column.sql
```

#### Migration Rollback
```bash
# Rollback last migration
supabase migration down --project-ref namc-production

# Rollback to specific version
supabase migration down 20240729000000 --project-ref namc-production
```

### Database Backup Strategy

#### Automated Backups
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="namc_backup_${DATE}.sql"

# Create backup
pg_dump $DATABASE_URL > "backups/${BACKUP_FILE}"

# Upload to S3
aws s3 cp "backups/${BACKUP_FILE}" s3://namc-backups/database/

# Retain last 30 days
find backups/ -name "namc_backup_*.sql" -mtime +30 -delete
```

#### Point-in-Time Recovery
```bash
# Restore from backup
supabase db restore --backup-file namc_backup_20240729_120000.sql

# Verify restoration
supabase db verify --project-ref namc-production
```

## Monitoring & Alerting

### Application Monitoring

#### Sentry Configuration
```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
});
```

#### Health Check Endpoints
```typescript
// /api/health
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      stripe: await checkStripe(),
      openai: await checkOpenAI(),
    },
  };

  const isHealthy = Object.values(healthCheck.services).every(s => s.status === 'ok');
  
  res.status(isHealthy ? 200 : 503).json(healthCheck);
}
```

### Infrastructure Monitoring

#### Datadog Dashboard
```yaml
# datadog-dashboard.json
{
  "title": "NAMC Production Dashboard",
  "widgets": [
    {
      "type": "timeseries",
      "title": "API Response Times",
      "query": "avg:namc.api.response_time{environment:production}"
    },
    {
      "type": "timeseries", 
      "title": "Error Rates",
      "query": "sum:namc.api.errors{environment:production}.as_rate()"
    },
    {
      "type": "timeseries",
      "title": "Database Connections",
      "query": "avg:postgresql.connections{service:namc-production}"
    }
  ]
}
```

## Rollback Procedures

### Automatic Rollback Triggers
- **Error rate > 5%** for 5 minutes
- **Response time > 2s** for 10 minutes
- **Database connection failures**
- **Critical service unavailability**

### Manual Rollback Process

#### Frontend Rollback
```bash
# Rollback to previous version
vercel rollback --prod

# Verify rollback
curl -I https://namc.org
```

#### Database Rollback
```bash
# Emergency rollback
supabase migration down --project-ref namc-production --count 1

# Verify database state
supabase db verify --project-ref namc-production
```

#### Complete System Rollback
```bash
#!/bin/bash
# rollback-production.sh

echo "Starting production rollback..."

# Rollback frontend
vercel rollback --prod

# Rollback backend  
vercel rollback --prod --cwd backend

# Rollback database (if needed)
supabase migration down --project-ref namc-production --count 1

# Verify services
./scripts/health-check.sh

echo "Rollback completed"
```

## Security Considerations

### SSL/TLS Configuration
```bash
# Force HTTPS
vercel domains add namc.org
vercert domains set-ssl namc.org
```

### Security Headers
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'"
          }
        ]
      }
    ]
  }
}
```

### Secrets Management
```bash
# Using Vercel secrets
vercel secret add database-url production
vercel secret add jwt-secret production
vercel secret add stripe-secret production
```

## Cost Optimization

### Resource Monitoring
- **Vercel usage**: Monitor build minutes and bandwidth
- **Database**: Monitor connection usage and storage
- **Storage**: Monitor S3 bucket usage
- **Third-party**: Monitor API usage limits

### Scaling Strategy
```yaml
# auto-scaling-config.yml
api:
  min_instances: 2
  max_instances: 10
  target_cpu_utilization: 70
  
frontend:
  min_instances: 2
  max_instances: 20
  target_cpu_utilization: 80
```

## Disaster Recovery

### Recovery Time Objectives (RTO)
- **Critical services**: 15 minutes
- **Non-critical services**: 1 hour
- **Full system**: 4 hours

### Recovery Point Objectives (RPO)
- **Database**: 5 minutes (continuous backup)
- **Files**: 1 hour (S3 versioning)
- **Configuration**: 24 hours (GitOps)

### Disaster Recovery Plan
```bash
# disaster-recovery.sh
#!/bin/bash

# 1. Assess damage
./scripts/assess-damage.sh

# 2. Activate DR site
vercel --prod --target=disaster-recovery

# 3. Restore database from backup
supabase db restore --backup-file latest-backup.sql

# 4. Verify all services
./scripts/verify-services.sh

# 5. Update DNS
./scripts/update-dns.sh
```

## Documentation Maintenance

### Update Schedule
- **Monthly**: Review deployment metrics
- **Quarterly**: Update security procedures
- **Annually**: Complete disaster recovery drill

### Change Management
- **Version control**: All changes via Git
- **Approval process**: Required for production changes
- **Rollback plan**: Always available

---

**Deployment Guide Version**: 1.0  
**Last Updated**: July 29, 2025  
**Next Review**: August 29, 2025  
**Owner**: DevOps Team
