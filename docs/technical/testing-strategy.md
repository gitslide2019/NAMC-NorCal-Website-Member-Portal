# NAMC Testing Strategy & Test Plans

## Testing Overview

This document outlines the comprehensive testing strategy for the NAMC website and member portal, covering unit tests, integration tests, end-to-end tests, security tests, and performance tests.

## Testing Pyramid

```
        /\
       /  \
      / E2E \      (10% of tests)
     /--------\
    /  Integration \  (30% of tests)
   /----------------\
  /     Unit Tests    \ (60% of tests)
 /_____________________\
```

## 1. Unit Testing

### Frontend Unit Tests (Next.js/React)

#### Test Coverage Goals
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

#### Component Testing
```typescript
// Example: Button component test
describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies glass morphism styles', () => {
    render(<Button variant="glass">Glass Button</Button>);
    const button = screen.getByText('Glass Button');
    expect(button).toHaveClass('backdrop-blur-sm');
  });
});
```

#### Hook Testing
```typescript
// Example: useAuth hook test
describe('useAuth hook', () => {
  it('returns user data when authenticated', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login correctly', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### Backend Unit Tests (Node.js/Express)

#### API Endpoint Testing
```typescript
// Example: User registration endpoint
describe('POST /api/auth/register', () => {
  it('creates new user with valid data', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'new@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.email).toBe('new@example.com');
  });

  it('rejects duplicate email addresses', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      });
    
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Email already exists');
  });
});
```

#### Database Testing
```typescript
// Example: User model tests
describe('User Model', () => {
  it('creates user with hashed password', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });
    
    expect(user.password).not.toBe('password123');
    expect(user.password).toHaveLength(60); // bcrypt hash length
  });

  it('validates email format', async () => {
    await expect(User.create({
      email: 'invalid-email',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    })).rejects.toThrow('Invalid email format');
  });
});
```

## 2. Integration Testing

### API Integration Tests

#### Third-Party Service Integration
```typescript
// Example: Stripe integration test
describe('Stripe Integration', () => {
  it('processes payment successfully', async () => {
    const mockPayment = {
      amount: 10000, // $100.00
      currency: 'usd',
      source: 'tok_visa'
    };

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${validToken}`)
      .send(mockPayment);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('paymentIntentId');
    expect(response.body.status).toBe('succeeded');
  });

  it('handles payment failures gracefully', async () => {
    const mockPayment = {
      amount: 10000,
      currency: 'usd',
      source: 'tok_chargeDeclined'
    };

    const response = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${validToken}`)
      .send(mockPayment);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Payment declined');
  });
});
```

#### Database Integration
```typescript
// Example: User registration with database
describe('User Registration Integration', () => {
  beforeEach(async () => {
    await db.migrate.latest();
    await db.seed.run();
  });

  afterEach(async () => {
    await db.migrate.rollback();
  });

  it('creates user and sends welcome email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'integration@test.com',
        password: 'TestPass123!',
        firstName: 'Integration',
        lastName: 'Test'
      });

    expect(response.status).toBe(201);
    
    // Verify user in database
    const user = await db('users').where({ email: 'integration@test.com' }).first();
    expect(user).toBeDefined();
    expect(user.firstName).toBe('Integration');

    // Verify email was sent
    expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith('integration@test.com');
  });
});
```

## 3. End-to-End Testing

### Critical User Flows

#### Registration Flow
```typescript
// Example: Playwright E2E test
test.describe('Registration Flow', () => {
  test('complete registration process', async ({ page }) => {
    await page.goto('/register');
    
    // Step 1: Basic Information
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="email"]', 'john.doe@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('[data-testid="next-step"]');
    
    // Step 2: Business Details
    await page.fill('[name="company"]', 'Elite Construction');
    await page.fill('[name="licenseNumber"]', 'C-10-123456');
    await page.selectOption('[name="experience"]', '10+ years');
    await page.click('[data-testid="next-step"]');
    
    // Step 3: Verification
    await page.click('[data-testid="submit-registration"]');
    
    // Verify success
    await expect(page).toHaveURL('/registration-success');
    await expect(page.locator('text=Check your email')).toBeVisible();
  });
});
```

#### Project Bidding Flow
```typescript
test.describe('Project Bidding Flow', () => {
  test('submit bid for project', async ({ page }) => {
    // Login as member
    await page.goto('/login');
    await page.fill('[name="email"]', 'member@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to projects
    await page.click('[data-testid="projects-nav"]');
    
    // Select project
    await page.click('[data-testid="project-card"]:first-child');
    
    // Submit bid
    await page.fill('[name="bidAmount"]', '150000');
    await page.fill('[name="proposal"]', 'Detailed proposal...');
    await page.click('[data-testid="submit-bid"]');
    
    // Verify submission
    await expect(page.locator('text=Bid submitted successfully')).toBeVisible();
  });
});
```

#### Learning Management Flow
```typescript
test.describe('Learning Management Flow', () => {
  test('complete course enrollment and progress', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'member@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to learning
    await page.click('[data-testid="learning-nav"]');
    
    // Enroll in course
    await page.click('[data-testid="course-card"]:first-child');
    await page.click('[data-testid="enroll-button"]');
    
    // Complete lesson
    await page.click('[data-testid="start-lesson"]');
    await page.click('[data-testid="complete-lesson"]');
    
    // Verify progress
    await expect(page.locator('text=25% complete')).toBeVisible();
  });
});
```

## 4. Security Testing

### Authentication & Authorization

#### JWT Token Security
```typescript
describe('JWT Security', () => {
  it('rejects expired tokens', async () => {
    const expiredToken = jwt.sign(
      { userId: 1, exp: Math.floor(Date.now() / 1000) - 3600 },
      process.env.JWT_SECRET
    );

    const response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Token expired');
  });

  it('rejects tokens with invalid signature', async () => {
    const invalidToken = jwt.sign(
      { userId: 1 },
      'wrong-secret'
    );

    const response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid token');
  });
});
```

#### SQL Injection Prevention
```typescript
describe('SQL Injection Prevention', () => {
  it('prevents SQL injection in search queries', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    
    const response = await request(app)
      .get(`/api/projects/search?q=${encodeURIComponent(maliciousInput)}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.projects).toEqual([]);
    
    // Verify table still exists
    const users = await db('users').select('*');
    expect(users).toBeDefined();
  });
});
```

#### XSS Prevention
```typescript
describe('XSS Prevention', () => {
  it('sanitizes user input to prevent XSS', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    
    const response = await request(app)
      .post('/api/user/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        bio: xssPayload
      });

    expect(response.status).toBe(200);
    expect(response.body.user.bio).not.toContain('<script>');
    expect(response.body.user.bio).toContain('&lt;script&gt;');
  });
});
```

## 5. Performance Testing

### Load Testing

#### API Load Testing
```typescript
// Example: k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

export default function() {
  const response = http.get('https://api.namc.org/api/projects');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

#### Database Performance
```typescript
describe('Database Performance', () => {
  it('handles large dataset queries efficiently', async () => {
    // Create 10,000 test projects
    const projects = Array.from({ length: 10000 }, (_, i) => ({
      title: `Test Project ${i}`,
      budget: Math.floor(Math.random() * 1000000),
      status: 'active'
    }));
    
    await db('projects').insert(projects);
    
    const startTime = Date.now();
    const results = await db('projects')
      .where('budget', '>', 500000)
      .limit(100);
    
    const queryTime = Date.now() - startTime;
    expect(queryTime).toBeLessThan(100); // Under 100ms
    expect(results).toHaveLength(100);
  });
});
```

## 6. Accessibility Testing

### WCAG 2.1 Compliance

#### Automated Testing
```typescript
// Example: axe-core accessibility tests
test.describe('Accessibility Tests', () => {
  test('landing page meets WCAG 2.1 standards', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('registration form is accessible', async ({ page }) => {
    await page.goto('/register');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

#### Keyboard Navigation
```typescript
test.describe('Keyboard Navigation', () => {
  test('can navigate registration form with keyboard', async ({ page }) => {
    await page.goto('/register');
    
    // Tab through form fields
    await page.keyboard.press('Tab');
    await page.keyboard.type('John');
    
    await page.keyboard.press('Tab');
    await page.keyboard.type('Doe');
    
    await page.keyboard.press('Tab');
    await page.keyboard.type('john.doe@example.com');
    
    // Submit form with Enter
    await page.keyboard.press('Enter');
    
    await expect(page).toHaveURL('/registration-success');
  });
});
```

## 7. Test Data Management

### Test Data Strategy

#### Test Database
- **Environment**: Separate test database
- **Reset**: Before each test suite
- **Seeding**: Consistent test data sets
- **Cleanup**: After test completion

#### Mock Data Examples
```typescript
// Test user data
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'AdminPass123!',
    role: 'admin'
  },
  member: {
    email: 'member@test.com',
    password: 'MemberPass123!',
    role: 'member'
  },
  pending: {
    email: 'pending@test.com',
    password: 'PendingPass123!',
    role: 'pending'
  }
};

// Test project data
export const testProjects = [
  {
    title: 'Downtown Office Renovation',
    budget: 200000,
    location: 'San Francisco, CA',
    deadline: '2025-08-15'
  },
  {
    title: 'Residential Foundation',
    budget: 100000,
    location: 'Oakland, CA',
    deadline: '2025-08-20'
  }
];
```

## 8. Test Environment Setup

### Environment Configuration

#### Test Environment Variables
```bash
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://localhost:5432/namc_test
JWT_SECRET=test-jwt-secret-key
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=test-openai-key
HUBSPOT_API_KEY=test-hubspot-key
```

#### Docker Test Environment
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-db:
    image: postgres:15
    environment:
      POSTGRES_DB: namc_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    
  test-redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
```

## 9. Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: namc_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Run security tests
      run: npm run test:security
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
```

## 10. Test Reporting & Metrics

### Coverage Reports
- **Frontend**: Jest + Istanbul
- **Backend**: Jest + nyc
- **E2E**: Playwright HTML reports

### Performance Metrics
- **Response time**: < 500ms (95th percentile)
- **Error rate**: < 1%
- **Database queries**: < 100ms
- **Page load time**: < 3 seconds

### Security Metrics
- **Vulnerability scanning**: Weekly OWASP ZAP scans
- **Dependency scanning**: Daily npm audit
- **Code analysis**: SonarQube quality gates

## 11. Test Schedule

### Testing Timeline

#### Development Phase
- **Unit Tests**: Continuous (every commit)
- **Integration Tests**: Daily
- **E2E Tests**: Before each release
- **Security Tests**: Weekly
- **Performance Tests**: Bi-weekly

#### Pre-Release Phase
- **Full Regression**: 2 days before release
- **Security Audit**: 1 week before release
- **Performance Benchmark**: 3 days before release
- **Accessibility Review**: 2 days before release

## 12. Test Maintenance

### Test Updates
- **Code Changes**: Update tests immediately
- **API Changes**: Update integration tests
- **UI Changes**: Update E2E selectors
- **Dependencies**: Update test libraries monthly

### Test Review Process
- **Monthly**: Review test coverage
- **Quarterly**: Evaluate test effectiveness
- **Annually**: Update testing strategy

## 13. Disaster Recovery Testing

### Backup Testing
- **Database**: Weekly restore tests
- **Files**: Monthly S3 restore tests
- **Configuration**: Environment replication tests

### Failover Testing
- **Load balancer**: Health check validation
- **Database**: Failover simulation
- **CDN**: Cache invalidation tests

---

**Test Strategy Version**: 1.0  
**Last Updated**: July 29, 2025  
**Next Review**: August 29, 2025  
**Owner**: QA Team
