# NAMC Website API Documentation

## Overview
Comprehensive API documentation for the NAMC website backend, including authentication, member services, project management, and third-party integrations.

## Base URL
```
Production: https://api.namc.org/v1
Staging: https://staging-api.namc.org/v1
Development: http://localhost:3001/api/v1
```

## Authentication
All API endpoints require authentication using JWT tokens in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### POST /auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["member"]
  },
  "expiresIn": 86400
}
```

#### POST /auth/register
Register new member account.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "companyName": "ABC Construction",
  "phone": "+1-555-123-4567"
}
```

#### POST /auth/refresh
Refresh JWT token.

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

## User Management

### GET /users/profile
Get current user's profile.

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1-555-123-4567",
  "avatarUrl": "https://cdn.namc.org/avatars/user123.jpg",
  "membership": {
    "tier": "professional",
    "status": "active",
    "expiresAt": "2024-12-31T23:59:59Z"
  },
  "profile": {
    "companyName": "Elite Construction LLC",
    "jobTitle": "Project Manager",
    "bio": "15+ years experience in commercial construction...",
    "specialties": ["commercial", "residential", "green-building"],
    "yearsExperience": 15,
    "websiteUrl": "https://eliteconstruction.com",
    "linkedinUrl": "https://linkedin.com/in/johndoe",
    "completeness": 85
  },
  "locations": [
    {
      "id": "loc-123",
      "address": "123 Main St, San Francisco, CA 94105",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "isPrimary": true
    }
  ],
  "certifications": [
    {
      "id": "cert-456",
      "name": "General Contractor License",
      "issuingOrganization": "California CSLB",
      "certificateNumber": "A-123456",
      "issueDate": "2020-01-15",
      "expiryDate": "2024-12-31",
      "isVerified": true
    }
  ]
}
```

### PUT /users/profile
Update user profile.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1-555-123-4567",
  "companyName": "Elite Construction LLC",
  "jobTitle": "Project Manager",
  "bio": "Updated bio...",
  "specialties": ["commercial", "residential"],
  "yearsExperience": 16
}
```

### POST /users/avatar
Upload user avatar.

**Request:**
- Multipart form data with image file (max 5MB, JPG/PNG)

**Response:**
```json
{
  "avatarUrl": "https://cdn.namc.org/avatars/user123-updated.jpg"
}
```

## Project Opportunities

### GET /projects
Get list of project opportunities with filtering.

**Query Parameters:**
- `status` (string): open, in_progress, completed
- `type` (string): residential, commercial, industrial, government
- `budget_min` (number): minimum budget
- `budget_max` (number): maximum budget
- `location` (string): city, state, or zip code
- `radius` (number): search radius in miles
- `page` (number): pagination page
- `limit` (number): items per page (max 50)

**Response:**
```json
{
  "projects": [
    {
      "id": "proj-789",
      "title": "Downtown Office Renovation",
      "description": "Complete renovation of 10,000 sq ft office space...",
      "type": "commercial",
      "budgetMin": 150000,
      "budgetMax": 200000,
      "location": {
        "address": "456 Market St, San Francisco, CA",
        "latitude": 37.7849,
        "longitude": -122.4094
      },
      "startDate": "2024-09-01",
      "deadline": "2024-08-15",
      "status": "open",
      "clientName": "TechCorp Inc",
      "bidCount": 12,
      "permits": [
        {
          "type": "building",
          "status": "required",
          "estimatedCost": 2500
        }
      ],
      "gisData": {
        "zoning": "commercial",
        "utilities": ["electric", "water", "gas"],
        "environmental": {
          "floodZone": false,
          "seismicZone": "moderate"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### GET /projects/:id
Get detailed project information.

**Response:**
```json
{
  "id": "proj-789",
  "title": "Downtown Office Renovation",
  "description": "Complete renovation...",
  "specifications": {
    "squareFootage": 10000,
    "floors": 3,
    "parkingSpaces": 25,
    "specialRequirements": ["ADA compliance", "LEED certification"]
  },
  "documents": [
    {
      "id": "doc-123",
      "name": "Architectural Plans.pdf",
      "type": "blueprint",
      "url": "https://cdn.namc.org/projects/proj-789/plans.pdf",
      "size": 5242880
    }
  ],
  "permits": [
    {
      "id": "permit-456",
      "type": "building",
      "jurisdiction": "San Francisco DBI",
      "status": "pending",
      "applicationDate": "2024-07-15",
      "estimatedTimeline": "30-45 days"
    }
  ],
  "client": {
    "name": "TechCorp Inc",
    "contactEmail": "projects@techcorp.com"
  }
}
```

### POST /projects/:id/bids
Submit a bid for a project.

**Request:**
```json
{
  "bidAmount": 175000,
  "proposalText": "We propose a comprehensive renovation approach...",
  "timelineDays": 90,
  "documents": [
    {
      "name": "Detailed Proposal.pdf",
      "url": "https://cdn.namc.org/bids/proposal-123.pdf"
    }
  ]
}
```

**Response:**
```json
{
  "id": "bid-456",
  "status": "submitted",
  "submittedAt": "2024-07-29T15:30:00Z",
  "message": "Bid successfully submitted"
}
```

## Learning Management System

### GET /courses
Get list of available courses.

**Query Parameters:**
- `category` (string): course category
- `difficulty` (string): beginner, intermediate, advanced
- `instructor` (string): instructor ID
- `isFree` (boolean): free courses only
- `search` (string): search in title/description
- `page` (number): pagination page
- `limit` (number): items per page

**Response:**
```json
{
  "courses": [
    {
      "id": "course-123",
      "title": "Advanced Project Management",
      "description": "Master project management for construction...",
      "category": "business",
      "difficulty": "advanced",
      "duration": 8,
      "price": 199.99,
      "instructor": {
        "id": "inst-789",
        "name": "Sarah Johnson",
        "avatarUrl": "https://cdn.namc.org/instructors/sarah.jpg"
      },
      "thumbnailUrl": "https://cdn.namc.org/courses/course-123-thumb.jpg",
      "enrollmentCount": 234,
      "rating": 4.8,
      "isFree": false,
      "isEnrolled": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### POST /courses/:id/enroll
Enroll in a course.

**Response:**
```json
{
  "enrollmentId": "enroll-789",
  "status": "enrolled",
  "progress": 0,
  "enrollmentDate": "2024-07-29"
}
```

### GET /courses/:id/progress
Get course progress.

**Response:**
```json
{
  "courseId": "course-123",
  "progress": 65,
  "completedLessons": ["lesson-1", "lesson-2", "lesson-3"],
  "currentLesson": "lesson-4",
  "estimatedCompletion": "2024-08-15",
  "certificateEligible": false
}
```

## Tool Lending Library

### GET /tools
Get available tools with filtering.

**Query Parameters:**
- `category` (string): tool category
- `location` (string): tool location
- `availableFrom` (date): start date for availability
- `availableTo` (date): end date for availability
- `search` (string): search in name/description
- `page` (number): pagination page

**Response:**
```json
{
  "tools": [
    {
      "id": "tool-456",
      "name": "Excavator CAT 320",
      "description": "Medium excavator ideal for...",
      "category": "heavy_equipment",
      "manufacturer": "Caterpillar",
      "model": "320",
      "dailyRentalPrice": 350.00,
      "condition": "excellent",
      "location": {
        "name": "NAMC Equipment Yard",
        "address": "789 Industrial Way, Oakland, CA"
      },
      "images": [
        "https://cdn.namc.org/tools/tool-456-1.jpg"
      ],
      "isAvailable": true,
      "nextAvailable": "2024-07-30"
    }
  ]
}
```

### POST /tools/:id/reserve
Reserve a tool.

**Request:**
```json
{
  "startDate": "2024-08-01",
  "endDate": "2024-08-05",
  "notes": "Need for residential foundation work"
}
```

**Response:**
```json
{
  "reservationId": "res-123",
  "status": "pending",
  "totalCost": 1400.00,
  "approvalRequired": true,
  "estimatedApprovalTime": "24 hours"
}
```

## Member Directory

### GET /members
Search member directory.

**Query Parameters:**
- `specialty` (string): filter by specialty
- `location` (string): filter by location
- `experience` (string): years of experience range
- `search` (string): search in name/company
- `page` (number): pagination page
- `limit` (number): items per page

**Response:**
```json
{
  "members": [
    {
      "id": "member-789",
      "name": "Michael Rodriguez",
      "companyName": "Rodriguez Construction",
      "jobTitle": "Owner & CEO",
      "specialties": ["residential", "remodeling", "green-building"],
      "yearsExperience": 12,
      "location": {
        "city": "San Jose",
        "state": "CA"
      },
      "avatarUrl": "https://cdn.namc.org/members/michael-avatar.jpg",
      "profileCompleteness": 95,
      "certifications": ["General Contractor B", "LEED AP"],
      "isAvailable": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1247,
    "totalPages": 63
  }
}
```

## Events & Calendar

### GET /events
Get upcoming events.

**Query Parameters:**
- `type` (string): event type
- `startDate` (date): filter by start date
- `endDate` (date): filter by end date
- `location` (string): filter by location
- `isVirtual` (boolean): virtual events only
- `page` (number): pagination page

**Response:**
```json
{
  "events": [
    {
      "id": "event-123",
      "title": "Monthly Networking Mixer",
      "description": "Connect with fellow contractors...",
      "type": "networking",
      "startDatetime": "2024-08-15T18:00:00Z",
      "endDatetime": "2024-08-15T20:00:00Z",
      "location": {
        "name": "NAMC Headquarters",
        "address": "123 Main St, San Francisco, CA"
      },
      "isVirtual": false,
      "maxAttendees": 50,
      "registeredCount": 32,
      "registrationRequired": true,
      "registrationDeadline": "2024-08-14"
    }
  ]
}
```

### POST /events/:id/register
Register for an event.

**Response:**
```json
{
  "registrationId": "reg-456",
  "status": "registered",
  "confirmationEmail": "sent"
}
```

## Messaging

### GET /messages
Get user's messages.

**Query Parameters:**
- `type` (string): inbox, sent, unread
- `limit` (number): items per page
- `offset` (number): pagination offset

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-789",
      "sender": {
        "id": "user-123",
        "name": "Jane Smith",
        "avatarUrl": "https://cdn.namc.org/avatars/jane.jpg"
      },
      "subject": "Project Collaboration Opportunity",
      "body": "Hi, I saw your profile and...",
      "isRead": false,
      "createdAt": "2024-07-28T14:30:00Z"
    }
  ],
  "unreadCount": 3,
  "totalCount": 45
}
```

### POST /messages
Send a message.

**Request:**
```json
{
  "recipientId": "user-456",
  "subject": "Project Discussion",
  "body": "I'd like to discuss the downtown renovation project..."
}
```

## E-commerce

### GET /products
Get product catalog.

**Query Parameters:**
- `category` (string): product category
- `search` (string): search in name/description
- `minPrice` (number): minimum price
- `maxPrice` (number): maximum price
- `isFeatured` (boolean): featured products only
- `page` (number): pagination page

**Response:**
```json
{
  "products": [
    {
      "id": "prod-123",
      "name": "NAMC Hard Hat - Yellow",
      "description": "Professional-grade safety helmet...",
      "sku": "NHC-YELLOW-001",
      "category": "safety_equipment",
      "price": 45.99,
      "images": [
        "https://cdn.namc.org/products/hard-hat-1.jpg"
      ],
      "inventory": 150,
      "isFeatured": true,
      "tags": ["safety", "branded", "ppe"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### POST /orders
Create new order.

**Request:**
```json
{
  "items": [
    {
      "productId": "prod-123",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94105",
    "country": "USA"
  },
  "paymentMethod": "stripe"
}
```

### POST /orders/:id/process
Process payment for order.

**Request:**
```json
{
  "paymentMethodId": "pm_1234567890",
  "savePaymentMethod": false
}
```

## Third-Party API Integrations

### Shovels API Integration

#### GET /permits/search
Search for permits using Shovels API.

**Query Parameters:**
- `address` (string): project address
- `city` (string): city name
- `state` (string): state code
- `permitType` (string): permit type filter
- `status` (string): permit status filter

**Response:**
```json
{
  "permits": [
    {
      "id": "permit-123",
      "permitNumber": "BUILD-2024-001",
      "type": "building",
      "status": "issued",
      "description": "New construction - 3 story mixed-use",
      "estimatedValue": 2500000,
      "address": "123 Main St, San Francisco, CA",
      "applicant": "ABC Construction LLC",
      "issueDate": "2024-03-15",
      "expirationDate": "2025-03-15",
      "documents": [
        {
          "type": "plans",
          "url": "https://shovels.api/docs/permit-123-plans.pdf"
        }
      ]
    }
  ]
}
```

### ArcGIS Online Integration

#### GET /gis/analyze
Get GIS analysis for location.

**Query Parameters:**
- `latitude` (number): location latitude
- `longitude` (number): location longitude
- `radius` (number): analysis radius in meters

**Response:**
```json
{
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "zoning": {
    "current": "commercial",
    "allowedUses": ["office", "retail", "restaurant"],
    "restrictions": ["height_limit_85ft"]
  },
  "utilities": {
    "electric": {
      "provider": "PG&E",
      "serviceAvailable": true
    },
    "water": {
      "provider": "SFPUC",
      "serviceAvailable": true
    },
    "gas": {
      "provider": "PG&E",
      "serviceAvailable": true
    }
  },
  "environmental": {
    "floodZone": false,
    "seismicZone": "moderate",
    "soilType": "clay",
    "contamination": false
  },
  "nearbyProjects": [
    {
      "id": "proj-456",
      "title": "Nearby Office Complex",
      "distance": 0.3,
      "type": "commercial"
    }
  ]
}
```

### HubSpot MCP Integration

#### POST /hubspot/contacts/sync
Sync member data with HubSpot CRM.

**Request:**
```json
{
  "userId": "user-123",
  "properties": {
    "firstname": "John",
    "lastname": "Doe",
    "company": "Elite Construction LLC",
    "phone": "+1-555-123-4567",
    "specialties": "commercial,residential"
  }
}
```

#### POST /hubspot/deals/create
Create deal for project opportunity.

**Request:**
```json
{
  "projectId": "proj-789",
  "memberId": "user-123",
  "dealName": "Downtown Office Renovation - Elite Construction",
  "amount": 175000,
  "closeDate": "2024-12-31"
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

### Error Codes
- `400` Bad Request - Invalid request format
- `401` Unauthorized - Invalid or missing token
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource not found
- `422` Unprocessable Entity - Validation errors
- `429` Too Many Requests - Rate limit exceeded
- `500` Internal Server Error - Server error

## Rate Limiting
- **Authentication**: 10 requests per minute
- **General API**: 100 requests per minute per user
- **File uploads**: 5 requests per minute
- **Search endpoints**: 50 requests per minute

## Pagination
All list endpoints support pagination with the following format:

**Query Parameters:**
- `page` (number): page number (default: 1)
- `limit` (number): items per page (default: 20, max: 100)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## Webhooks

### Supported Webhook Events
- `user.registered` - New user registration
- `project.created` - New project opportunity
- `bid.submitted` - New bid submitted
- `course.completed` - Course completion
- `order.paid` - Successful payment
- `tool.reserved` - Tool reservation

### Webhook Payload Example
```json
{
  "event": "project.created",
  "timestamp": "2024-07-29T15:30:00Z",
  "data": {
    "projectId": "proj-789",
    "title": "Downtown Office Renovation",
    "budget": 175000,
    "location": "San Francisco, CA"
  }
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
import { NAMCApi } from '@namc/api-client';

const api = new NAMCApi({
  baseURL: 'https://api.namc.org/v1',
  token: 'your_jwt_token'
});

// Get projects
const projects = await api.projects.search({
  location: 'San Francisco, CA',
  budget_min: 100000,
  type: 'commercial'
});

// Submit bid
const bid = await api.projects.submitBid('proj-789', {
  bidAmount: 175000,
  proposalText: 'Our comprehensive approach...',
  timelineDays: 90
});
```

### Python
```python
import requests

class NAMCApi:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_projects(self, **params):
        response = requests.get(
            f'{self.base_url}/projects',
            headers=self.headers,
            params=params
        )
        return response.json()

# Usage
api = NAMCApi('https://api.namc.org/v1', 'your_token')
projects = api.get_projects(location='San Francisco, CA', type='commercial')
```

---

**API Version**: 1.0  
**Last Updated**: July 29, 2025  
**Contact**: api-support@namc.org
