# NAMC Northern California Website & Member Portal

A comprehensive digital platform for the National Association of Minority Contractors Northern California Chapter, featuring a public website and member portal with advanced functionality.

## 🚀 Features

### Public Website
- **Modern Landing Page**: Hero section with video background and call-to-action buttons
- **Interactive Timeline**: Horizontal scrolling timeline showcasing 55 years of history (1969-Present)
- **Responsive Design**: Mobile-first approach with glass morphism effects
- **Newsletter Integration**: HubSpot-powered newsletter signup with lead capture

### Member Portal
- **Member Dashboard**: Personalized dashboard with activity tracking and quick stats
- **Project Opportunities**: Browse and apply for construction projects
- **Learning Management System**: Course catalog and progress tracking
- **Tool Lending Library**: Reserve construction tools and equipment
- **Member Directory**: Connect with other contractors and professionals
- **Event Management**: RSVP to events and networking opportunities

### Admin Portal
- **Admin Dashboard**: Comprehensive overview of members, projects, and system metrics
- **Member Management**: Approve new members and manage existing accounts
- **Project Management**: Create and manage project opportunities
- **Analytics**: Track membership growth, engagement, and revenue metrics
- **Content Management**: Update website content and announcements

### HubSpot Integration
- **Contact Sync**: Automatic contact synchronization with HubSpot CRM
- **Deal Tracking**: Project opportunities tracked as deals in HubSpot
- **Form Integration**: All form submissions captured in HubSpot
- **Workflow Automation**: Automated email sequences and lead nurturing
- **Analytics**: ROI tracking and member journey analytics

## 🛠 Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom NAMC brand colors
- **Authentication**: NextAuth.js with JWT tokens
- **Animation**: Framer Motion for smooth transitions
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **CRM**: HubSpot integration for contact and deal management

## 🎨 Design System

### Brand Colors
- **NAMC Yellow**: #FFD700 (Primary brand color)
- **NAMC Black**: #1A1A1A (Primary text and backgrounds)
- **Accent Yellow**: #FFA500 (Hover states and CTAs)
- **Light Yellow**: #FFF8DC (Background accents)
- **Dark Gray**: #2A2A2A (Secondary backgrounds)

### Design Principles
- **Glass Morphism**: Translucent panels with backdrop blur effects
- **Modern Minimalism**: Clean layouts with generous white space
- **Professional Typography**: Inter for headers, Source Sans Pro for body text
- **Responsive Design**: Mobile-first with breakpoints at 640px, 768px, 1024px, 1280px
- **Accessibility**: WCAG 2.1 AA compliance with keyboard navigation

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js 18.0 or later
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/namc-norcal-website.git
   cd namc-norcal-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your environment variables:
   - `NEXTAUTH_SECRET`: Generate a secure secret
   - `HUBSPOT_ACCESS_TOKEN`: Your HubSpot private app access token
   - `HUBSPOT_PORTAL_ID`: Your HubSpot portal ID
   - Database and other service credentials

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin portal pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── member/            # Member portal pages
│   └── page.tsx           # Landing page
├── components/            # Reusable components
│   ├── forms/             # Form components
│   ├── layout/            # Layout components
│   └── ui/                # UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── services/              # External service integrations
├── styles/                # Global styles
└── types/                 # TypeScript type definitions
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🔐 Authentication

The application uses NextAuth.js with a credentials provider. Demo accounts:

- **Admin**: admin@namc-norcal.org / admin123
- **Member**: member@namc-norcal.org / member123

## 🔌 HubSpot Integration

### Setup
1. Create a private app in your HubSpot account
2. Add the required scopes: `crm.objects.contacts.write`, `crm.objects.deals.write`, `forms`
3. Copy the access token to your `.env.local` file

### Features
- Contact synchronization for member registration
- Deal creation for project opportunities
- Form submissions for contact and newsletter forms
- Webhook handling for real-time updates
- Analytics and reporting integration

## 🎯 Key Features Implementation

### Interactive Timeline
- Horizontal scrolling with smooth animations
- Filterable by category and decade
- Featured events with detailed cards
- Mobile-responsive with vertical layout

### Member Dashboard
- Real-time stats and activity feed
- Quick access to key features
- Progress tracking for profile completion
- Upcoming events and project opportunities

### Admin Dashboard
- System-wide metrics and analytics
- Member and project management
- Quick actions for common tasks
- System alerts and notifications

## 🚀 Deployment

The application is designed to be deployed on Vercel for optimal Next.js performance:

1. **Connect your repository** to Vercel
2. **Set environment variables** in the Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy your application

### Environment Variables for Production
- Set all variables from `.env.example`
- Use secure secrets for `NEXTAUTH_SECRET`
- Configure proper database URLs
- Set up HubSpot production credentials

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- **Email**: info@namc-norcal.org
- **Phone**: (510) 555-0123
- **Website**: [https://namc-norcal.org](https://namc-norcal.org)

## 🙏 Acknowledgments

- NAMC Northern California leadership team
- All contributing developers and designers
- The construction industry professionals who inspire this work

---

**Built with ❤️ for the National Association of Minority Contractors Northern California**