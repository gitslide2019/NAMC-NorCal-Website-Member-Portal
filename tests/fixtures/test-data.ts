export const TestData = {
  // Valid user registration data
  validRegistrationData: {
    step1: {
      firstName: 'John',
      lastName: 'Contractor',
      email: 'john.contractor@example.com',
      phone: '(415) 555-0123',
      company: 'Bay Area Construction LLC',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    },
    step2: {
      businessAddress: '1234 Construction Way',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      licenseNumber: 'C-1234567',
      yearsExperience: '15',
      specialties: ['Residential Construction', 'Commercial Construction', 'Electrical Work'],
      serviceAreas: 'San Francisco Bay Area, Oakland, San Jose, Berkeley'
    }
  },

  // Invalid data for validation testing
  invalidRegistrationData: {
    step1: {
      firstName: '', // Required field empty
      lastName: 'A', // Too short
      email: 'invalid-email', // Invalid format
      phone: '123', // Too short
      company: '', // Required field empty
      password: '123', // Too short
      confirmPassword: '456' // Doesn't match
    },
    step2: {
      businessAddress: '', // Required field empty
      city: '', // Required field empty
      state: 'California', // Should be 2 characters
      zip: '1', // Too short
      licenseNumber: '', // Required field empty
      yearsExperience: '', // Required field empty
      specialties: [], // Empty array
      serviceAreas: '' // Required field empty
    }
  },

  // Edge case data
  edgeCaseData: {
    maxLengthText: 'a'.repeat(1000),
    specialCharacters: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    scriptInjection: '<script>alert("XSS")</script>',
    sqlInjection: "'; DROP TABLE users; --",
    unicodeText: '🏗️ 建设公司 Société de Construction 🔨',
    emptySpaces: '   ',
    onlyNumbers: '1234567890',
    mixedCase: 'MiXeD cAsE tExT'
  },

  // Demo credentials
  demoCredentials: {
    admin: {
      email: 'admin@namc-norcal.org',
      password: 'admin123'
    },
    member: {
      email: 'member@namc-norcal.org',
      password: 'member123'
    }
  },

  // Mock dashboard data
  mockDashboardData: {
    profile: {
      completionPercentage: 75,
      missingFields: ['Business License Upload', 'Insurance Certificate']
    },
    stats: {
      projectsApplied: 8,
      coursesInProgress: 2,
      coursesCompleted: 12,
      toolsReserved: 1,
      messagesUnread: 3
    },
    recentActivity: [
      {
        id: 1,
        type: 'project',
        title: 'Applied to Oakland School Renovation',
        description: 'Your bid has been submitted and is under review',
        timestamp: '3 hours ago',
        status: 'pending'
      },
      {
        id: 2,
        type: 'course',
        title: 'Completed Safety Training Module',
        description: 'Certificate available for download',
        timestamp: '1 day ago',
        status: 'completed'
      },
      {
        id: 3,
        type: 'tool',
        title: 'Reserved concrete mixer',
        description: 'Equipment reserved for next week',
        timestamp: '2 days ago',
        status: 'approved'
      }
    ],
    upcomingEvents: [
      {
        id: 1,
        title: 'Monthly Networking Breakfast',
        date: 'Feb 15, 2025',
        time: '8:00 AM',
        location: 'Oakland Convention Center',
        type: 'networking'
      },
      {
        id: 2,
        title: 'OSHA Safety Workshop',
        date: 'Feb 22, 2025',
        time: '2:00 PM',
        location: 'Virtual Event',
        type: 'training'
      }
    ],
    projectOpportunities: [
      {
        id: 1,
        title: 'Community Center Renovation',
        budget: '$125,000 - $175,000',
        location: 'Berkeley, CA',
        deadline: 'Feb 28, 2025',
        bidsCount: 12
      },
      {
        id: 2,
        title: 'Residential Solar Installation',
        budget: '$50,000 - $75,000',
        location: 'San Jose, CA',
        deadline: 'Mar 5, 2025',
        bidsCount: 6
      }
    ]
  },

  // Mock API responses
  mockApiResponses: {
    successfulRegistration: {
      success: true,
      message: 'Registration submitted successfully',
      data: {
        userId: '12345',
        email: 'test@example.com',
        status: 'pending_approval'
      }
    },
    registrationError: {
      success: false,
      message: 'Registration failed',
      errors: {
        email: 'Email already exists',
        licenseNumber: 'Invalid license number format'
      }
    },
    successfulLogin: {
      success: true,
      user: {
        id: '12345',
        name: 'John Contractor',
        email: 'john@example.com',
        role: 'member',
        profileComplete: false
      },
      token: 'jwt-token-here'
    },
    loginError: {
      success: false,
      message: 'Invalid email or password'
    },
    dashboardData: {
      success: true,
      data: {
        stats: {
          projectsApplied: 8,
          coursesCompleted: 12,
          toolsReserved: 1,
          messagesUnread: 3
        },
        recentActivity: [
          {
            id: 1,
            type: 'project',
            title: 'Applied to Oakland School Renovation',
            timestamp: '2025-01-30T10:00:00Z'
          }
        ]
      }
    }
  },

  // Form validation test cases
  formValidationTests: {
    email: {
      valid: [
        'test@example.com',
        'user+tag@domain.co.uk',
        'firstname.lastname@company.org'
      ],
      invalid: [
        'invalid-email',
        '@domain.com',
        'user@',
        'user space@domain.com',
        'user@domain',
        ''
      ]
    },
    password: {
      valid: [
        'SecurePass123!',
        'MyP@ssw0rd',
        'ComplexPassword1234!'
      ],
      invalid: [
        '123',
        'password',
        'PASSWORD',
        '12345678',
        'Pass!',
        ''
      ]
    },
    phone: {
      valid: [
        '(415) 555-0123',
        '415-555-0123',
        '4155550123',
        '+1 415 555 0123'
      ],
      invalid: [
        '123',
        'not-a-phone',
        '123-456',
        '',
        '12345678901234567890'
      ]
    },
    zipCode: {
      valid: [
        '94102',
        '94102-1234',
        '12345'
      ],
      invalid: [
        '1',
        '123',
        'ABCDE',
        '',
        '123456'
      ]
    }
  },

  // Accessibility test data
  accessibilityTests: {
    colorContrast: {
      // Colors that should pass WCAG AA
      passing: [
        { background: '#FFFFFF', text: '#000000' }, // White on black
        { background: '#FFFFFF', text: '#767676' }, // Gray on white
        { background: '#000000', text: '#FFFFFF' }  // Black on white
      ],
      // Colors that may fail WCAG AA
      failing: [
        { background: '#FFFFFF', text: '#FFD700' }, // NAMC yellow on white
        { background: '#FFD700', text: '#FFFFFF' }, // White on NAMC yellow
        { background: '#F0F0F0', text: '#C0C0C0' }  // Light gray on light gray
      ]
    },
    keyboardNavigation: {
      // Expected tab order for different pages
      homePage: [
        'a[href="/"]', // Logo
        'a[href="/about"]', // About link
        'a[href="/timeline"]', // Timeline link
        'a[href="/auth/register"]', // Become member button
        'a[href="/auth/signin"]' // Sign in button
      ],
      registrationPage: [
        'input[name="firstName"]',
        'input[name="lastName"]',
        'input[name="email"]',
        'input[name="phone"]',
        'input[name="company"]',
        'input[name="password"]',
        'input[name="confirmPassword"]',
        'button:has-text("Next")'
      ],
      signInPage: [
        'input[name="email"]',
        'input[name="password"]',
        'button:has([data-testid="show-password"])',
        'input[type="checkbox"]',
        'a[href="/auth/forgot-password"]',
        'button[type="submit"]',
        'a[href="/auth/register"]'
      ]
    }
  },

  // Performance test expectations
  performanceExpectations: {
    pageLoadTime: {
      fast: 1000, // 1 second
      acceptable: 3000, // 3 seconds
      slow: 5000 // 5 seconds (failing threshold)
    },
    resourceSize: {
      acceptable: 2 * 1024 * 1024, // 2MB
      large: 5 * 1024 * 1024 // 5MB (concerning)
    },
    memoryUsage: {
      acceptable: 50 * 1024 * 1024, // 50MB
      high: 100 * 1024 * 1024 // 100MB (concerning)
    }
  },

  // Test user personas for different scenarios
  testPersonas: {
    newContractor: {
      name: 'Alex Rodriguez',
      company: 'Rodriguez Roofing',
      specialties: ['Roofing', 'Residential Construction'],
      experience: '8 years',
      location: 'Oakland, CA',
      goals: ['Find new projects', 'Complete safety training', 'Network with peers']
    },
    experiencedMember: {
      name: 'Maria Santos',
      company: 'Santos Construction Group',
      specialties: ['Commercial Construction', 'Project Management'],
      experience: '25 years',
      location: 'San Francisco, CA',
      goals: ['Bid on large projects', 'Mentor new contractors', 'Access advanced tools']
    },
    startupContractor: {
      name: 'David Kim',
      company: 'Kim Electric Services',
      specialties: ['Electrical Work', 'Smart Home Installation'],
      experience: '3 years',
      location: 'San Jose, CA',
      goals: ['Build client base', 'Learn business skills', 'Get certified']
    }
  },

  // Browser and device configurations for testing
  testEnvironments: {
    desktop: {
      chrome: { width: 1920, height: 1080 },
      firefox: { width: 1920, height: 1080 },
      safari: { width: 1440, height: 900 },
      edge: { width: 1920, height: 1080 }
    },
    tablet: {
      ipad: { width: 768, height: 1024 },
      androidTablet: { width: 800, height: 1280 }
    },
    mobile: {
      iphone: { width: 375, height: 667 },
      androidPhone: { width: 360, height: 640 },
      largeMobile: { width: 414, height: 896 }
    }
  }
}