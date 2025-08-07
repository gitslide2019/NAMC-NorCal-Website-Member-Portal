import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from './hubspot-backbone.service';

const prisma = new PrismaClient();

interface WebsiteTemplate {
  id: string;
  name: string;
  hubspotTemplateId: string;
  description: string;
  features: string[];
  isDefault: boolean;
}

interface MemberData {
  id: string;
  name?: string;
  email: string;
  company?: string;
  phone?: string;
  location?: string;
  memberType: string;
}

interface WebsiteGenerationData {
  requestId: string;
  member: MemberData;
  businessName: string;
  businessType: string;
  businessDescription?: string;
  servicesOffered?: string;
  domainName: string;
  professionalEmail?: string;
  templateId?: string;
  customizations?: any;
}

export class WebsiteGenerationService {
  private hubspotService: HubSpotBackboneService;

  constructor() {
    this.hubspotService = new HubSpotBackboneService();
  }

  /**
   * Available website templates
   */
  private getAvailableTemplates(): WebsiteTemplate[] {
    return [
      {
        id: 'professional-contractor-v1',
        name: 'Professional Contractor v1.0',
        hubspotTemplateId: 'template_professional_contractor_v1',
        description: 'Clean, modern design with project portfolio and contact forms',
        features: [
          'Responsive design',
          'Project portfolio showcase',
          'Contact forms',
          'Service listings',
          'About section',
          'Testimonials',
          'SEO optimization'
        ],
        isDefault: true
      },
      {
        id: 'social-impact-focus-v1',
        name: 'Social Impact Focus v1.0',
        hubspotTemplateId: 'template_social_impact_v1',
        description: 'Emphasizes community impact and social responsibility metrics',
        features: [
          'Social impact metrics',
          'Community projects showcase',
          'Job creation tracking',
          'Environmental impact display',
          'Local hiring statistics',
          'Sustainability certifications',
          'Community testimonials'
        ],
        isDefault: false
      }
    ];
  }

  /**
   * Generate a professional website for a member
   */
  async generateWebsite(data: WebsiteGenerationData): Promise<{
    websiteUrl: string;
    hubspotPageId: string;
    professionalEmail?: string;
  }> {
    try {
      // Get the website request
      const websiteRequest = await prisma.websiteRequest.findUnique({
        where: { id: data.requestId },
        include: {
          member: true
        }
      });

      if (!websiteRequest) {
        throw new Error('Website request not found');
      }

      // Select template
      const templates = this.getAvailableTemplates();
      const selectedTemplate = templates.find(t => t.id === data.templateId) || 
                              templates.find(t => t.isDefault)!;

      // Generate domain name if not provided
      const domainName = data.domainName || this.generateDomainName(data.businessName);

      // Create HubSpot CMS page
      const hubspotPage = await this.createHubSpotCMSPage({
        templateId: selectedTemplate.hubspotTemplateId,
        businessName: data.businessName,
        businessType: data.businessType,
        businessDescription: data.businessDescription,
        servicesOffered: data.servicesOffered,
        memberData: data.member,
        domainName,
        customizations: data.customizations
      });

      // Set up professional email if requested
      let professionalEmailAddress: string | undefined;
      if (data.professionalEmail) {
        professionalEmailAddress = await this.setupProfessionalEmail({
          domainName,
          emailPrefix: data.professionalEmail.split('@')[0],
          memberEmail: data.member.email,
          memberName: data.member.name || 'Member'
        });
      }

      // Create member website record
      const memberWebsite = await prisma.memberWebsite.create({
        data: {
          memberId: data.member.id,
          websiteRequestId: data.requestId,
          websiteUrl: `https://${domainName}`,
          domainName,
          professionalEmail: professionalEmailAddress,
          hubspotPageId: hubspotPage.id,
          hubspotTemplateId: selectedTemplate.hubspotTemplateId,
          templateVersion: selectedTemplate.name,
          customizations: data.customizations ? JSON.stringify(data.customizations) : null,
          analyticsEnabled: true,
          status: 'ACTIVE'
        }
      });

      // Update website request status
      await prisma.websiteRequest.update({
        where: { id: data.requestId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // Create HubSpot custom object for website tracking
      await this.hubspotService.createCustomObject('member_websites', {
        member_id: data.member.id,
        website_url: `https://${domainName}`,
        domain_name: domainName,
        professional_email: professionalEmailAddress || '',
        cms_page_id: hubspotPage.id,
        template_version: selectedTemplate.name,
        website_status: 'ACTIVE',
        creation_date: new Date().toISOString(),
        monthly_visitors: '0',
        leads_generated: '0'
      });

      // Send completion notification
      await this.sendWebsiteCompletionNotification({
        memberEmail: data.member.email,
        memberName: data.member.name || 'Member',
        businessName: data.businessName,
        websiteUrl: `https://${domainName}`,
        professionalEmail: professionalEmailAddress
      });

      return {
        websiteUrl: `https://${domainName}`,
        hubspotPageId: hubspotPage.id,
        professionalEmail: professionalEmailAddress
      };

    } catch (error) {
      console.error('Website generation error:', error);
      throw new Error(`Failed to generate website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create HubSpot CMS page
   */
  private async createHubSpotCMSPage(data: {
    templateId: string;
    businessName: string;
    businessType: string;
    businessDescription?: string;
    servicesOffered?: string;
    memberData: MemberData;
    domainName: string;
    customizations?: any;
  }): Promise<{ id: string; url: string }> {
    try {
      // In a real implementation, this would use HubSpot's CMS API
      // For now, we'll simulate the page creation
      
      const pageContent = this.generatePageContent(data);
      
      // Simulate HubSpot CMS API call
      const hubspotPageId = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Creating HubSpot CMS page:', {
        templateId: data.templateId,
        domainName: data.domainName,
        businessName: data.businessName,
        pageId: hubspotPageId,
        content: pageContent
      });

      // In real implementation:
      // const page = await hubspotClient.cms.pages.create({
      //   name: `${data.businessName} - Professional Website`,
      //   slug: data.domainName.replace(/\./g, '-'),
      //   templatePath: data.templateId,
      //   widgets: pageContent.widgets,
      //   meta: pageContent.meta
      // });

      return {
        id: hubspotPageId,
        url: `https://${data.domainName}`
      };

    } catch (error) {
      throw new Error(`Failed to create HubSpot CMS page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate page content based on member data
   */
  private generatePageContent(data: {
    businessName: string;
    businessType: string;
    businessDescription?: string;
    servicesOffered?: string;
    memberData: MemberData;
    domainName: string;
  }) {
    return {
      meta: {
        title: `${data.businessName} - Professional ${data.businessType} Contractor`,
        description: data.businessDescription || `Professional ${data.businessType.toLowerCase()} construction services by ${data.businessName}`,
        keywords: [
          data.businessType.toLowerCase(),
          'contractor',
          'construction',
          'professional',
          data.memberData.location || 'california'
        ].join(', ')
      },
      widgets: {
        hero: {
          title: data.businessName,
          subtitle: `Professional ${data.businessType} Contractor`,
          description: data.businessDescription,
          ctaText: 'Get Quote',
          ctaLink: '#contact'
        },
        about: {
          title: 'About Us',
          content: data.businessDescription || `${data.businessName} is a professional ${data.businessType.toLowerCase()} contractor committed to quality construction and community impact.`,
          memberType: data.memberData.memberType,
          location: data.memberData.location
        },
        services: {
          title: 'Our Services',
          services: data.servicesOffered ? 
            data.servicesOffered.split(',').map(s => s.trim()) : 
            this.getDefaultServices(data.businessType)
        },
        contact: {
          businessName: data.businessName,
          email: data.memberData.email,
          phone: data.memberData.phone,
          location: data.memberData.location
        },
        socialImpact: {
          title: 'Community Impact',
          description: 'As a NAMC member, we are committed to creating jobs, supporting local communities, and building a more inclusive construction industry.',
          metrics: {
            jobsCreated: 0,
            localHiring: 0,
            communityProjects: 0
          }
        }
      }
    };
  }

  /**
   * Get default services based on business type
   */
  private getDefaultServices(businessType: string): string[] {
    const serviceMap: Record<string, string[]> = {
      'RESIDENTIAL': [
        'Home Construction',
        'Renovations & Remodeling',
        'Kitchen & Bathroom Remodeling',
        'Additions & Extensions',
        'Roofing Services',
        'Flooring Installation'
      ],
      'COMMERCIAL': [
        'Commercial Construction',
        'Office Build-outs',
        'Retail Construction',
        'Warehouse Construction',
        'Tenant Improvements',
        'Commercial Renovations'
      ],
      'INDUSTRIAL': [
        'Industrial Construction',
        'Manufacturing Facilities',
        'Warehouse Construction',
        'Infrastructure Projects',
        'Heavy Construction',
        'Site Development'
      ],
      'MIXED': [
        'General Construction',
        'Residential Projects',
        'Commercial Projects',
        'Renovations',
        'New Construction',
        'Project Management'
      ]
    };

    return serviceMap[businessType] || serviceMap['MIXED'];
  }

  /**
   * Generate domain name from business name
   */
  private generateDomainName(businessName: string): string {
    const cleanName = businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    
    // In real implementation, check domain availability
    return `${cleanName}.namc-norcal.org`;
  }

  /**
   * Set up professional email
   */
  private async setupProfessionalEmail(data: {
    domainName: string;
    emailPrefix: string;
    memberEmail: string;
    memberName: string;
  }): Promise<string> {
    try {
      const professionalEmail = `${data.emailPrefix}@${data.domainName}`;
      
      // In real implementation, this would:
      // 1. Configure email forwarding to member's personal email
      // 2. Set up email authentication (SPF, DKIM, DMARC)
      // 3. Create email account in hosting provider
      
      console.log('Setting up professional email:', {
        professionalEmail,
        forwardTo: data.memberEmail,
        memberName: data.memberName
      });

      // Simulate email setup
      await new Promise(resolve => setTimeout(resolve, 1000));

      return professionalEmail;

    } catch (error) {
      console.error('Professional email setup error:', error);
      throw new Error('Failed to set up professional email');
    }
  }

  /**
   * Update website content when member data changes
   */
  async updateWebsiteContent(websiteId: string, updates: {
    businessDescription?: string;
    servicesOffered?: string;
    projectPortfolio?: any[];
    socialImpactMetrics?: any;
    testimonials?: any[];
  }): Promise<void> {
    try {
      const website = await prisma.memberWebsite.findUnique({
        where: { id: websiteId },
        include: {
          member: true,
          websiteRequest: true
        }
      });

      if (!website) {
        throw new Error('Website not found');
      }

      // Update HubSpot CMS page content
      await this.updateHubSpotPageContent(website.hubspotPageId!, updates);

      // Update local record
      await prisma.memberWebsite.update({
        where: { id: websiteId },
        data: {
          lastContentUpdate: new Date(),
          customizations: updates ? JSON.stringify(updates) : website.customizations
        }
      });

      console.log('Website content updated:', {
        websiteId,
        hubspotPageId: website.hubspotPageId,
        updates
      });

    } catch (error) {
      throw new Error(`Failed to update website content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update HubSpot page content
   */
  private async updateHubSpotPageContent(pageId: string, updates: any): Promise<void> {
    try {
      // In real implementation, this would use HubSpot's CMS API
      console.log('Updating HubSpot page content:', {
        pageId,
        updates
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      throw new Error('Failed to update HubSpot page content');
    }
  }

  /**
   * Get website analytics
   */
  async getWebsiteAnalytics(websiteId: string): Promise<{
    monthlyVisitors: number;
    leadsGenerated: number;
    pageViews: number;
    bounceRate: number;
    averageSessionDuration: number;
    topPages: Array<{ page: string; views: number }>;
  }> {
    try {
      const website = await prisma.memberWebsite.findUnique({
        where: { id: websiteId }
      });

      if (!website) {
        throw new Error('Website not found');
      }

      // In real implementation, this would integrate with Google Analytics
      // For now, return mock data
      return {
        monthlyVisitors: website.monthlyVisitors,
        leadsGenerated: website.leadsGenerated,
        pageViews: website.monthlyVisitors * 2.3,
        bounceRate: 0.45,
        averageSessionDuration: 125,
        topPages: [
          { page: '/', views: Math.floor(website.monthlyVisitors * 0.6) },
          { page: '/services', views: Math.floor(website.monthlyVisitors * 0.25) },
          { page: '/contact', views: Math.floor(website.monthlyVisitors * 0.15) }
        ]
      };

    } catch (error) {
      throw new Error(`Failed to get website analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send website completion notification
   */
  private async sendWebsiteCompletionNotification(data: {
    memberEmail: string;
    memberName: string;
    businessName: string;
    websiteUrl: string;
    professionalEmail?: string;
  }): Promise<void> {
    try {
      // In real implementation, this would send an email via HubSpot or SendGrid
      console.log('Website completion notification sent:', {
        to: data.memberEmail,
        subject: `Your Professional Website is Live - ${data.businessName}`,
        websiteUrl: data.websiteUrl,
        professionalEmail: data.professionalEmail
      });

    } catch (error) {
      console.error('Failed to send website completion notification:', error);
    }
  }

  /**
   * Backup website data
   */
  async backupWebsite(websiteId: string): Promise<{ backupId: string; backupUrl: string }> {
    try {
      const website = await prisma.memberWebsite.findUnique({
        where: { id: websiteId }
      });

      if (!website) {
        throw new Error('Website not found');
      }

      // In real implementation, this would create a backup of the HubSpot page
      const backupId = `backup_${Date.now()}_${websiteId}`;
      
      console.log('Website backup created:', {
        websiteId,
        backupId,
        hubspotPageId: website.hubspotPageId
      });

      // Update backup timestamp
      await prisma.memberWebsite.update({
        where: { id: websiteId },
        data: {
          lastBackup: new Date()
        }
      });

      return {
        backupId,
        backupUrl: `https://backups.namc-norcal.org/${backupId}`
      };

    } catch (error) {
      throw new Error(`Failed to backup website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Monitor website performance
   */
  async monitorWebsitePerformance(websiteId: string): Promise<{
    isOnline: boolean;
    responseTime: number;
    lastChecked: Date;
    issues: string[];
  }> {
    try {
      const website = await prisma.memberWebsite.findUnique({
        where: { id: websiteId }
      });

      if (!website) {
        throw new Error('Website not found');
      }

      // In real implementation, this would ping the website and check performance
      const performanceData = {
        isOnline: true,
        responseTime: Math.floor(Math.random() * 500) + 200, // 200-700ms
        lastChecked: new Date(),
        issues: [] as string[]
      };

      // Simulate performance issues
      if (Math.random() < 0.1) {
        performanceData.issues.push('Slow response time detected');
      }

      console.log('Website performance check:', {
        websiteId,
        websiteUrl: website.websiteUrl,
        performance: performanceData
      });

      return performanceData;

    } catch (error) {
      return {
        isOnline: false,
        responseTime: 0,
        lastChecked: new Date(),
        issues: ['Failed to check website performance']
      };
    }
  }
}