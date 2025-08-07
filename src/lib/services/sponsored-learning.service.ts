import { prisma } from '@/lib/prisma';
import { HubSpotBackboneService } from './hubspot-backbone.service';

export interface SponsoredCourseData {
  title: string;
  description?: string;
  category: 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'BUSINESS_DEVELOPMENT';
  subcategory?: string;
  sponsorId: string;
  partnershipType: 'FULL_SPONSOR' | 'CO_SPONSOR' | 'CONTENT_PARTNER';
  contentUrl?: string;
  duration?: number;
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  badgeId?: string;
  badgeRequired?: boolean;
  prerequisites?: string[];
  learningObjectives?: string[];
  assessmentCriteria?: any;
  certificateTemplate?: string;
  revenueSharePercentage?: number;
}

export interface CourseEnrollmentData {
  memberId: string;
  courseId: string;
  accessExpirationDate?: Date;
}

export interface CourseProgressData {
  memberId: string;
  courseId: string;
  enrollmentId: string;
  currentModule?: string;
  completionPercentage: number;
  modulesCompleted?: string[];
  assessmentScores?: Record<string, number>;
  timeSpent: number;
  strugglingAreas?: string[];
  strengths?: string[];
}

export interface SponsorPartnershipData {
  name: string;
  partnershipType: 'COURSE_SPONSOR' | 'CERTIFICATION_PARTNER' | 'EQUIPMENT_SPONSOR';
  courseCategories?: string[];
  specializations?: string[];
  revenueSharePercentage: number;
  minimumCommitment?: number;
  partnershipStartDate: Date;
  partnershipEndDate?: Date;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  websiteUrl?: string;
}

export class SponsoredLearningService {
  private hubspotService: HubSpotBackboneService;

  constructor() {
    this.hubspotService = new HubSpotBackboneService();
  }

  // Sponsor Partnership Management
  async createSponsorPartnership(data: SponsorPartnershipData) {
    try {
      const partnership = await prisma.sponsorPartnership.create({
        data: {
          ...data,
          courseCategories: data.courseCategories ? JSON.stringify(data.courseCategories) : null,
          specializations: data.specializations ? JSON.stringify(data.specializations) : null,
        },
      });

      // Sync to HubSpot as a company
      await this.syncPartnershipToHubSpot(partnership);

      return partnership;
    } catch (error) {
      console.error('Error creating sponsor partnership:', error);
      throw error;
    }
  }

  async getSponsorPartnerships(status?: string) {
    try {
      const partnerships = await prisma.sponsorPartnership.findMany({
        where: status ? { partnershipStatus: status } : undefined,
        include: {
          sponsoredCourses: {
            include: {
              enrollments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return partnerships.map(partnership => ({
        ...partnership,
        courseCategories: partnership.courseCategories ? JSON.parse(partnership.courseCategories) : [],
        specializations: partnership.specializations ? JSON.parse(partnership.specializations) : [],
      }));
    } catch (error) {
      console.error('Error fetching sponsor partnerships:', error);
      throw error;
    }
  }

  async updatePartnershipMetrics(partnershipId: string) {
    try {
      const partnership = await prisma.sponsorPartnership.findUnique({
        where: { id: partnershipId },
        include: {
          sponsoredCourses: {
            include: {
              enrollments: true,
            },
          },
        },
      });

      if (!partnership) {
        throw new Error('Partnership not found');
      }

      const coursesSponsored = partnership.sponsoredCourses.length;
      const membersTrained = partnership.sponsoredCourses.reduce(
        (total, course) => total + course.completionCount,
        0
      );
      const totalRevenue = partnership.sponsoredCourses.reduce(
        (total, course) => total + course.totalRevenue,
        0
      );
      const badgesAwarded = partnership.sponsoredCourses.reduce(
        (total, course) => total + course.completionCount,
        0
      );

      await prisma.sponsorPartnership.update({
        where: { id: partnershipId },
        data: {
          coursesSponsored,
          membersTrained,
          totalPartnershipValue: totalRevenue,
          badgesAwarded,
        },
      });

      return { coursesSponsored, membersTrained, totalRevenue, badgesAwarded };
    } catch (error) {
      console.error('Error updating partnership metrics:', error);
      throw error;
    }
  }

  // Course Management
  async createSponsoredCourse(data: SponsoredCourseData) {
    try {
      const course = await prisma.sponsoredCourse.create({
        data: {
          ...data,
          prerequisites: data.prerequisites ? JSON.stringify(data.prerequisites) : null,
          learningObjectives: data.learningObjectives ? JSON.stringify(data.learningObjectives) : null,
          assessmentCriteria: data.assessmentCriteria ? JSON.stringify(data.assessmentCriteria) : null,
          revenueSharePercentage: data.revenueSharePercentage || 0,
        },
        include: {
          sponsor: true,
        },
      });

      // Sync to HubSpot as a custom object
      await this.syncCourseToHubSpot(course);

      return course;
    } catch (error) {
      console.error('Error creating sponsored course:', error);
      throw error;
    }
  }

  async getCoursesByCategory(category?: string, subcategory?: string) {
    try {
      const courses = await prisma.sponsoredCourse.findMany({
        where: {
          isActive: true,
          ...(category && { category }),
          ...(subcategory && { subcategory }),
        },
        include: {
          sponsor: true,
          enrollments: {
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return courses.map(course => ({
        ...course,
        prerequisites: course.prerequisites ? JSON.parse(course.prerequisites) : [],
        learningObjectives: course.learningObjectives ? JSON.parse(course.learningObjectives) : [],
        assessmentCriteria: course.assessmentCriteria ? JSON.parse(course.assessmentCriteria) : null,
      }));
    } catch (error) {
      console.error('Error fetching courses by category:', error);
      throw error;
    }
  }

  async getCourseById(courseId: string) {
    try {
      const course = await prisma.sponsoredCourse.findUnique({
        where: { id: courseId },
        include: {
          sponsor: true,
          enrollments: {
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              progress: true,
            },
          },
        },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      return {
        ...course,
        prerequisites: course.prerequisites ? JSON.parse(course.prerequisites) : [],
        learningObjectives: course.learningObjectives ? JSON.parse(course.learningObjectives) : [],
        assessmentCriteria: course.assessmentCriteria ? JSON.parse(course.assessmentCriteria) : null,
      };
    } catch (error) {
      console.error('Error fetching course by ID:', error);
      throw error;
    }
  }

  // Course Enrollment Management
  async enrollMemberInCourse(data: CourseEnrollmentData) {
    try {
      // Check if member is already enrolled
      const existingEnrollment = await prisma.courseEnrollment.findFirst({
        where: {
          memberId: data.memberId,
          courseId: data.courseId,
          status: {
            in: ['ENROLLED', 'IN_PROGRESS'],
          },
        },
      });

      if (existingEnrollment) {
        throw new Error('Member is already enrolled in this course');
      }

      const enrollment = await prisma.courseEnrollment.create({
        data: {
          ...data,
          accessExpirationDate: data.accessExpirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
        },
        include: {
          course: {
            include: {
              sponsor: true,
            },
          },
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update course enrollment count
      await prisma.sponsoredCourse.update({
        where: { id: data.courseId },
        data: {
          enrollmentCount: {
            increment: 1,
          },
        },
      });

      // Create initial progress record
      await prisma.courseProgress.create({
        data: {
          memberId: data.memberId,
          courseId: data.courseId,
          enrollmentId: enrollment.id,
          completionPercentage: 0,
          timeSpent: 0,
        },
      });

      // Sync to HubSpot
      await this.syncEnrollmentToHubSpot(enrollment);

      return enrollment;
    } catch (error) {
      console.error('Error enrolling member in course:', error);
      throw error;
    }
  }

  async getMemberEnrollments(memberId: string, status?: string) {
    try {
      const enrollments = await prisma.courseEnrollment.findMany({
        where: {
          memberId,
          ...(status && { status }),
        },
        include: {
          course: {
            include: {
              sponsor: true,
            },
          },
          progress: true,
        },
        orderBy: { enrollmentDate: 'desc' },
      });

      return enrollments;
    } catch (error) {
      console.error('Error fetching member enrollments:', error);
      throw error;
    }
  }

  // Course Progress Management
  async updateCourseProgress(data: CourseProgressData) {
    try {
      const progress = await prisma.courseProgress.upsert({
        where: {
          memberId_courseId_enrollmentId: {
            memberId: data.memberId,
            courseId: data.courseId,
            enrollmentId: data.enrollmentId,
          },
        },
        update: {
          currentModule: data.currentModule,
          completionPercentage: data.completionPercentage,
          modulesCompleted: data.modulesCompleted ? JSON.stringify(data.modulesCompleted) : undefined,
          assessmentScores: data.assessmentScores ? JSON.stringify(data.assessmentScores) : undefined,
          timeSpent: data.timeSpent,
          lastAccessDate: new Date(),
          strugglingAreas: data.strugglingAreas ? JSON.stringify(data.strugglingAreas) : undefined,
          strengths: data.strengths ? JSON.stringify(data.strengths) : undefined,
        },
        create: {
          ...data,
          modulesCompleted: data.modulesCompleted ? JSON.stringify(data.modulesCompleted) : null,
          assessmentScores: data.assessmentScores ? JSON.stringify(data.assessmentScores) : null,
          strugglingAreas: data.strugglingAreas ? JSON.stringify(data.strugglingAreas) : null,
          strengths: data.strengths ? JSON.stringify(data.strengths) : null,
        },
        include: {
          course: true,
          enrollment: true,
        },
      });

      // Check if course is completed
      if (data.completionPercentage >= 100) {
        await this.completeCourse(data.enrollmentId);
      }

      // Sync to HubSpot
      await this.syncProgressToHubSpot(progress);

      return progress;
    } catch (error) {
      console.error('Error updating course progress:', error);
      throw error;
    }
  }

  async completeCourse(enrollmentId: string) {
    try {
      const enrollment = await prisma.courseEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          course: {
            include: {
              sponsor: true,
            },
          },
          member: true,
        },
      });

      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      // Update enrollment status
      await prisma.courseEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'COMPLETED',
          completionDate: new Date(),
          certificateIssued: true,
          // Certificate URL would be generated here
        },
      });

      // Update course completion metrics
      await prisma.sponsoredCourse.update({
        where: { id: enrollment.courseId },
        data: {
          completionCount: {
            increment: 1,
          },
        },
      });

      // Calculate and update completion rate
      const course = await prisma.sponsoredCourse.findUnique({
        where: { id: enrollment.courseId },
      });

      if (course) {
        const completionRate = course.enrollmentCount > 0 
          ? (course.completionCount + 1) / course.enrollmentCount 
          : 0;

        await prisma.sponsoredCourse.update({
          where: { id: enrollment.courseId },
          data: {
            completionRate,
          },
        });
      }

      // Award badge if configured
      if (enrollment.course.badgeId && enrollment.course.badgeRequired) {
        await this.awardProficiencyBadge(enrollment.memberId, enrollment.course.badgeId, enrollment.courseId);
      }

      // Update partnership metrics
      await this.updatePartnershipMetrics(enrollment.course.sponsorId);

      return enrollment;
    } catch (error) {
      console.error('Error completing course:', error);
      throw error;
    }
  }

  // Revenue Sharing Management
  async calculateRevenueSharing(courseId: string, totalRevenue: number) {
    try {
      const course = await prisma.sponsoredCourse.findUnique({
        where: { id: courseId },
        include: {
          sponsor: true,
        },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      const sponsorShare = totalRevenue * (course.revenueSharePercentage / 100);
      const namcShare = totalRevenue - sponsorShare;

      // Update course revenue
      await prisma.sponsoredCourse.update({
        where: { id: courseId },
        data: {
          totalRevenue: {
            increment: totalRevenue,
          },
        },
      });

      return {
        totalRevenue,
        sponsorShare,
        namcShare,
        sponsorPercentage: course.revenueSharePercentage,
      };
    } catch (error) {
      console.error('Error calculating revenue sharing:', error);
      throw error;
    }
  }

  // Badge Management (placeholder for integration with badge system)
  private async awardProficiencyBadge(memberId: string, badgeId: string, courseId: string) {
    try {
      // This would integrate with the proficiency badge system
      // For now, we'll create a basic badge record
      const badge = await prisma.proficiencyBadge.create({
        data: {
          memberId,
          courseId,
          badgeId,
          badgeName: `Course Completion Badge - ${badgeId}`,
          category: 'COURSE_COMPLETION',
          skillArea: 'General',
          level: 'BASIC',
          verificationStatus: 'VERIFIED',
        },
      });

      return badge;
    } catch (error) {
      console.error('Error awarding proficiency badge:', error);
      throw error;
    }
  }

  // HubSpot Sync Methods
  private async syncPartnershipToHubSpot(partnership: any) {
    try {
      // Sync partnership as a company in HubSpot
      const hubspotData = {
        name: partnership.name,
        domain: partnership.websiteUrl,
        phone: partnership.contactPhone,
        partnership_type: partnership.partnershipType,
        partnership_status: partnership.partnershipStatus,
        revenue_share_percentage: partnership.revenueSharePercentage,
        courses_sponsored: partnership.coursesSponsored,
        members_trained: partnership.membersTrained,
        total_partnership_value: partnership.totalPartnershipValue,
      };

      // This would use the HubSpot API to create/update the company
      console.log('Syncing partnership to HubSpot:', hubspotData);
    } catch (error) {
      console.error('Error syncing partnership to HubSpot:', error);
    }
  }

  private async syncCourseToHubSpot(course: any) {
    try {
      // Sync course as a custom object in HubSpot
      const hubspotData = {
        title: course.title,
        category: course.category,
        sponsor_id: course.sponsorId,
        enrollment_count: course.enrollmentCount,
        completion_count: course.completionCount,
        completion_rate: course.completionRate,
        total_revenue: course.totalRevenue,
      };

      console.log('Syncing course to HubSpot:', hubspotData);
    } catch (error) {
      console.error('Error syncing course to HubSpot:', error);
    }
  }

  private async syncEnrollmentToHubSpot(enrollment: any) {
    try {
      // Sync enrollment as a custom object in HubSpot
      const hubspotData = {
        member_id: enrollment.memberId,
        course_id: enrollment.courseId,
        enrollment_date: enrollment.enrollmentDate,
        status: enrollment.status,
        completion_date: enrollment.completionDate,
      };

      console.log('Syncing enrollment to HubSpot:', hubspotData);
    } catch (error) {
      console.error('Error syncing enrollment to HubSpot:', error);
    }
  }

  private async syncProgressToHubSpot(progress: any) {
    try {
      // Sync progress as a custom object in HubSpot
      const hubspotData = {
        member_id: progress.memberId,
        course_id: progress.courseId,
        completion_percentage: progress.completionPercentage,
        time_spent: progress.timeSpent,
        last_access_date: progress.lastAccessDate,
      };

      console.log('Syncing progress to HubSpot:', hubspotData);
    } catch (error) {
      console.error('Error syncing progress to HubSpot:', error);
    }
  }
}