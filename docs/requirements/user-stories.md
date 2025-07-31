# NAMC Website User Stories

## Epic User Stories

### Public Website Features

#### Epic 1: Interactive Timeline (1969-Present)
**As a** website visitor  
**I want to** explore an interactive timeline of NAMC's history from 1969 to present  
**So that** I can understand the organization's impact and evolution

**Acceptance Criteria:**
- Timeline displays key milestones chronologically
- Each milestone includes images, videos, and detailed descriptions
- Users can filter by decade or category (founding, projects, policy)
- Mobile-responsive with swipe gestures
- Social sharing capabilities for individual milestones
- Search functionality within timeline content

#### Epic 2: Member Registration & Onboarding
**As a** prospective member  
**I want to** easily register and complete my profile  
**So that** I can access member benefits and networking opportunities

**Acceptance Criteria:**
- Multi-step registration form with progress indicator
- Document upload for certifications/licenses
- Profile completeness meter with gamification
- Automated email verification
- Welcome email with next steps
- Guided tour of member portal features

### Member Portal Features

#### Epic 3: Learning Management System (LMS)
**As a** member  
**I want to** access professional development courses  
**So that** I can improve my skills and advance my career

**Acceptance Criteria:**
- Browse courses by category, difficulty, and certification
- Track learning progress with visual indicators
- Download certificates upon completion
- Save courses to watchlist
- Rate and review courses
- Mobile-friendly video player with speed controls

#### Epic 4: Project Opportunity Management
**As a** member contractor  
**I want to** find and bid on relevant project opportunities  
**So that** I can grow my business and find new clients

**Acceptance Criteria:**
- Filter projects by location, budget, type, and deadline
- View permit requirements and status for each project
- Submit bids with detailed proposals and timelines
- Track bid status and receive notifications
- Access project documents and specifications
- View GIS data for project locations

## Detailed User Stories

### Public Website User Stories

#### Story 1.1: Timeline Navigation
**As a** website visitor  
**I want to** navigate through different decades of NAMC history  
**So that** I can focus on specific time periods of interest

**Acceptance Criteria:**
- Horizontal scroll navigation with decade markers
- Jump-to-decade dropdown menu
- Smooth animations between time periods
- Year indicator always visible
- Keyboard navigation support (arrow keys)

**Priority**: High  
**Story Points**: 5  
**Dependencies**: Timeline data structure

#### Story 1.2: Milestone Details
**As a** website visitor  
**I want to** click on timeline milestones to see detailed information  
**So that** I can learn more about significant events

**Acceptance Criteria:**
- Expandable milestone cards with rich media
- Image gallery with zoom functionality
- Video playback with captions
- Related milestone suggestions
- Share milestone on social media

**Priority**: High  
**Story Points**: 8  
**Dependencies**: Timeline navigation, media management

#### Story 1.3: Timeline Search
**As a** website visitor  
**I want to** search for specific events or keywords in the timeline  
**So that** I can quickly find relevant historical information

**Acceptance Criteria:**
- Search bar with autocomplete suggestions
- Highlight matching results in timeline
- Filter search results by category
- Search within specific date ranges
- Clear search functionality

**Priority**: Medium  
**Story Points**: 3  
**Dependencies**: Timeline navigation, search infrastructure

### Member Registration & Profile Management

#### Story 2.1: Registration Form
**As a** prospective member  
**I want to** complete a registration form with my business information  
**So that** I can create my member account

**Acceptance Criteria:**
- Progressive form with validation
- Real-time email availability check
- Password strength indicator
- Business information fields (company, license, specialties)
- Geographic service area selection
- Terms of service acceptance

**Priority**: High  
**Story Points**: 5  
**Dependencies**: User authentication system

#### Story 2.2: Document Upload
**As a** new member  
**I want to** upload my business licenses and certifications  
**So that** I can verify my credentials and build trust

**Acceptance Criteria:**
- Drag-and-drop file upload
- Support for PDF, JPG, PNG formats
- File size validation (max 10MB)
- Document type categorization
- Preview before submission
- Upload progress indicator

**Priority**: High  
**Story Points**: 3  
**Dependencies**: File storage system

#### Story 2.3: Profile Completeness
**As a** new member  
**I want to** see my profile completeness percentage  
**So that** I know what information to add for maximum visibility

**Acceptance Criteria:**
- Visual progress bar with percentage
- Checklist of required and optional fields
- Gamification with badges for milestones
- Suggestions for next steps
- Impact on search visibility

**Priority**: Medium  
**Story Points**: 3  
**Dependencies**: Member profile system

### Learning Management System (LMS)

#### Story 3.1: Course Discovery
**As a** member  
**I want to** browse and search for relevant courses  
**So that** I can find training that matches my needs

**Acceptance Criteria:**
- Category-based browsing
- Search by keyword, instructor, or skill
- Filter by difficulty level and duration
- Sort by popularity, rating, or newest
- Course preview with trailer videos
- Bookmark courses for later

**Priority**: High  
**Story Points**: 5  
**Dependencies**: Course catalog system

#### Story 3.2: Course Progress Tracking
**As a** member  
**I want to** track my progress through courses  
**So that** I can resume learning where I left off

**Acceptance Criteria:**
- Visual progress indicators for each course
- Lesson completion checkmarks
- Time spent tracking
- Resume from last position
- Progress percentage calculation
- Mobile sync across devices

**Priority**: High  
**Story Points**: 5  
**Dependencies**: Course enrollment system

#### Story 3.3: Certificate Generation
**As a** member  
**I want to** receive a certificate upon course completion  
**So that** I can demonstrate my professional development

**Acceptance Criteria:**
- Automatic certificate generation
- Downloadable PDF format
- Shareable on LinkedIn
- Certificate verification system
- Print-friendly layout
- Expiration date tracking

**Priority**: Medium  
**Story Points**: 3  
**Dependencies**: Course completion tracking

### Project Opportunities & Bidding

#### Story 4.1: Project Search & Filter
**As a** member contractor  
**I want to** search and filter project opportunities  
**So that** I can find projects that match my expertise and location

**Acceptance Criteria:**
- Filter by project type, budget range, location
- Search by keywords in title and description
- Sort by deadline, budget, or posting date
- Save search preferences
- Email alerts for new matching projects
- Map view of project locations

**Priority**: High  
**Story Points**: 8  
**Dependencies**: Project database, GIS integration

#### Story 4.2: Permit Information Display
**As a** member contractor  
**I want to** see permit requirements and status for projects  
**So that** I can assess project feasibility and timeline

**Acceptance Criteria:**
- Display required permit types
- Show permit application status
- Link to permit documents
- Estimated permit timeline
- Permit cost estimates
- Historical permit data for location

**Priority**: High  
**Story Points**: 5  
**Dependencies**: Shovels API integration

#### Story 4.3: Bid Submission
**As a** member contractor  
**I want to** submit detailed bids for projects  
**So that** I can compete for project opportunities

**Acceptance Criteria:**
- Bid amount input with validation
- Proposal text editor with formatting
- Timeline specification
- Document attachment support
- Preview before submission
- Confirmation email

**Priority**: High  
**Story Points**: 5  
**Dependencies**: Project bidding system

### Tool Lending Library

#### Story 5.1: Tool Catalog Browsing
**As a** member  
**I want to** browse the available tools  
**So that** I can find equipment I need for my projects

**Acceptance Criteria:**
- Category-based tool browsing
- Search by tool name or type
- Filter by availability and location
- Tool specifications and images
- Rental pricing display
- Availability calendar

**Priority**: Medium  
**Story Points**: 5  
**Dependencies**: Tool inventory system

#### Story 5.2: Tool Reservation
**As a** member  
**I want to** reserve tools for specific dates  
**So that** I can ensure equipment availability for my projects

**Acceptance Criteria:**
- Date picker for reservation period
- Real-time availability checking
- Cost calculation
- Reservation confirmation
- Email reminders
- Cancellation policy display

**Priority**: Medium  
**Story Points**: 5  
**Dependencies**: Tool reservation system

### Member Directory & Networking

#### Story 6.1: Member Search
**As a** member  
**I want to** search for other members by specialty and location  
**So that** I can find potential partners or subcontractors

**Acceptance Criteria:**
- Search by name, company, or specialty
- Filter by location and service area
- Sort by experience or rating
- View member profiles and portfolios
- Send connection requests
- Save favorite members

**Priority**: Medium  
**Story Points**: 5  
**Dependencies**: Member directory system

#### Story 6.2: Profile Privacy Controls
**As a** member  
**I want to** control what information is visible to other members  
**So that** I can maintain privacy while networking

**Acceptance Criteria:**
- Granular privacy settings
- Public vs. member-only visibility
- Contact preference settings
- Block specific users
- Export my data
- Privacy policy acknowledgment

**Priority**: Medium  
**Story Points**: 3  
**Dependencies**: Member profile system

### AI Assistant & Growth Planning

#### Story 7.1: AI Assistant Interaction
**As a** member  
**I want to** interact with an AI assistant  
**So that** I can get quick answers and automate tasks

**Acceptance Criteria:**
- Natural language chat interface
- Context-aware responses
- Task automation (scheduling, messaging)
- Learning recommendations
- Project opportunity alerts
- Voice input support

**Priority**: Low  
**Story Points**: 8  
**Dependencies**: OpenAI API integration

#### Story 7.2: Personalized Growth Plan
**As a** member  
**I want to** receive a personalized career development plan  
**So that** I can systematically improve my business and skills

**Acceptance Criteria:**
- Skills assessment questionnaire
- Goal setting with SMART criteria
- Progress tracking dashboard
- Milestone celebrations
- Mentor matching suggestions
- Resource recommendations

**Priority**: Low  
**Story Points**: 8  
**Dependencies**: AI assistant, member data analysis

## User Personas

### Primary Personas

#### 1. Established Contractor (Elena)
- **Age**: 45
- **Experience**: 15+ years
- **Business**: Mid-size commercial construction
- **Goals**: Find larger projects, expand network, stay current with regulations
- **Pain Points**: Limited project visibility, complex permit processes
- **Technology**: Desktop primary, mobile for field work

#### 2. Growing Contractor (Marcus)
- **Age**: 32
- **Experience**: 8 years
- **Business**: Small residential construction
- **Goals**: Learn new skills, find steady work, build reputation
- **Pain Points**: Limited budget for tools, need training, competition
- **Technology**: Mobile-first, social media active

#### 3. New Contractor (Aisha)
- **Age**: 28
- **Experience**: 3 years
- **Business**: Startup specialty contractor
- **Goals**: Build client base, learn industry, find mentors
- **Pain Points**: Lack of experience, need guidance, limited resources
- **Technology**: Mobile-native, expects modern UX

### Secondary Personas

#### 4. Sponsor Representative (David)
- **Role**: Corporate partnership manager
- **Goals**: Find qualified minority contractors, track ROI
- **Needs**: Detailed member profiles, project tracking

#### 5. Government Agency (Patricia)
- **Role**: Contract compliance officer
- **Goals**: Verify minority contractor certifications
- **Needs**: Verified credentials, compliance reporting

## Acceptance Criteria Template

Each user story should include:

```
**Story ID**: [EPIC-NUMBER]
**As a**: [user type]
**I want to**: [action/goal]
**So that**: [benefit/value]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Priority**: [High/Medium/Low]
**Story Points**: [Fibonacci scale]
**Dependencies**: [list any blocking items]
**Definition of Done**:
- [ ] Code complete
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] UI/UX review complete
- [ ] Accessibility testing complete
- [ ] Performance testing complete
- [ ] Documentation updated
- [ ] Deployed to staging
```

## Story Mapping

### MVP Release (Phase 1)
1. User registration and authentication
2. Basic member profile creation
3. Project opportunity browsing
4. Timeline display (read-only)
5. Basic member directory

### Phase 2 Release
6. Course enrollment and progress tracking
7. Tool lending library
8. Advanced project search with GIS
9. Messaging system
10. Event registration

### Phase 3 Release
11. AI assistant integration
12. Advanced analytics
13. Mobile app
14. Advanced networking features
15. Sponsor portal

---

**Document Owner**: Product Team  
**Last Updated**: July 29, 2025  
**Next Review**: August 5, 2025
