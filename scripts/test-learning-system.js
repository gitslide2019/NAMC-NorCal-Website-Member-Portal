#!/usr/bin/env node

/**
 * Test script for the Learning Management System
 * This script tests the basic functionality of the sponsored learning system
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLearningSystem() {
  console.log('🧪 Testing Learning Management System...\n');

  try {
    // Test 1: Create a sponsor partnership
    console.log('1. Creating sponsor partnership...');
    const partnership = await prisma.sponsorPartnership.create({
      data: {
        name: 'Test Sponsor - PG&E',
        partnershipType: 'COURSE_SPONSOR',
        partnershipStatus: 'ACTIVE',
        courseCategories: JSON.stringify(['RESIDENTIAL', 'COMMERCIAL']),
        specializations: JSON.stringify(['Energy Efficiency', 'Solar Installation']),
        revenueSharePercentage: 25,
        minimumCommitment: 10000,
        partnershipStartDate: new Date(),
        contactEmail: 'partnership@pge.com',
        logoUrl: 'https://example.com/pge-logo.png',
        websiteUrl: 'https://pge.com',
      },
    });
    console.log('✅ Sponsor partnership created:', partnership.name);

    // Test 2: Create a sponsored course
    console.log('\n2. Creating sponsored course...');
    const course = await prisma.sponsoredCourse.create({
      data: {
        title: 'Residential Energy Efficiency Fundamentals',
        description: 'Learn the basics of residential energy efficiency and conservation.',
        category: 'RESIDENTIAL',
        subcategory: 'Energy Efficiency',
        sponsorId: partnership.id,
        partnershipType: 'FULL_SPONSOR',
        contentUrl: 'https://learning.pge.com/energy-efficiency-101',
        duration: 120, // 2 hours
        difficultyLevel: 'BEGINNER',
        badgeId: 'energy-efficiency-basic',
        badgeRequired: true,
        prerequisites: JSON.stringify([]),
        learningObjectives: JSON.stringify([
          'Understand basic energy efficiency principles',
          'Identify common energy waste sources',
          'Recommend basic efficiency improvements'
        ]),
        assessmentCriteria: JSON.stringify({
          passingScore: 80,
          maxAttempts: 3,
          timeLimit: 60
        }),
        revenueSharePercentage: 25,
      },
    });
    console.log('✅ Sponsored course created:', course.title);

    // Test 3: Create a test user
    console.log('\n3. Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        email: 'test.contractor@example.com',
        name: 'Test Contractor',
        company: 'Test Construction Co.',
        memberType: 'REGULAR',
        location: 'San Francisco, CA',
      },
    });
    console.log('✅ Test user created:', testUser.name);

    // Test 4: Enroll user in course
    console.log('\n4. Enrolling user in course...');
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        memberId: testUser.id,
        courseId: course.id,
        accessExpirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });
    console.log('✅ User enrolled in course');

    // Test 5: Create course progress
    console.log('\n5. Creating course progress...');
    const progress = await prisma.courseProgress.create({
      data: {
        memberId: testUser.id,
        courseId: course.id,
        enrollmentId: enrollment.id,
        currentModule: 'Module 1: Introduction',
        completionPercentage: 25,
        modulesCompleted: JSON.stringify(['intro', 'basics']),
        assessmentScores: JSON.stringify({ quiz1: 85, quiz2: 92 }),
        timeSpent: 30, // 30 minutes
        strugglingAreas: JSON.stringify(['technical-calculations']),
        strengths: JSON.stringify(['conceptual-understanding']),
      },
    });
    console.log('✅ Course progress created');

    // Test 6: Award proficiency badge
    console.log('\n6. Awarding proficiency badge...');
    const badge = await prisma.proficiencyBadge.create({
      data: {
        memberId: testUser.id,
        courseId: course.id,
        badgeId: 'energy-efficiency-basic',
        badgeName: 'Energy Efficiency Fundamentals',
        category: 'RESIDENTIAL',
        skillArea: 'Energy Efficiency',
        level: 'BASIC',
        verificationStatus: 'VERIFIED',
        requiresContinuingEd: true,
        expirationDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
        nextRenewalDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000 - 90 * 24 * 60 * 60 * 1000), // 90 days before expiration
        projectOpportunitiesUnlocked: JSON.stringify(['energy-audit-projects', 'efficiency-upgrades']),
        digitalCertificateUrl: '/certificates/energy-efficiency-basic.pdf',
      },
    });
    console.log('✅ Proficiency badge awarded:', badge.badgeName);

    // Test 7: Create badge shop campaign
    console.log('\n7. Creating badge shop campaign...');
    const campaign = await prisma.badgeShopCampaign.create({
      data: {
        memberId: testUser.id,
        badgeId: badge.id,
        campaignType: 'BADGE_EARNED',
        title: 'Congratulations on Your Energy Efficiency Badge!',
        description: 'Celebrate your achievement with exclusive energy efficiency tools and resources.',
        productCategories: JSON.stringify(['tools', 'equipment', 'training-materials']),
        discountPercentage: 15,
        campaignDuration: 30,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        memberProjectFundPercentage: 50,
        namcSupportPercentage: 30,
        sponsorPartnershipPercentage: 20,
      },
    });
    console.log('✅ Badge shop campaign created:', campaign.title);

    // Test 8: Create member project fund
    console.log('\n8. Creating member project fund...');
    const projectFund = await prisma.memberProjectFund.create({
      data: {
        memberId: testUser.id,
        currentBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        totalWithdrawn: 0,
      },
    });
    console.log('✅ Member project fund created');

    // Test 9: Add fund transaction
    console.log('\n9. Adding fund transaction...');
    const transaction = await prisma.projectFundTransaction.create({
      data: {
        fundId: projectFund.id,
        transactionType: 'EARNED',
        amount: 25.00,
        source: 'BADGE_SHOP_CAMPAIGN',
        sourceId: campaign.id,
        description: 'Revenue from badge shop campaign: Energy Efficiency Badge celebration',
        status: 'COMPLETED',
      },
    });

    // Update fund balance
    await prisma.memberProjectFund.update({
      where: { id: projectFund.id },
      data: {
        currentBalance: 25.00,
        totalEarned: 25.00,
        lastTransactionDate: new Date(),
      },
    });
    console.log('✅ Fund transaction added: $25.00 earned');

    // Test 10: Create mentorship connection
    console.log('\n10. Creating mentorship connection...');
    
    // Create a mentor user
    const mentorUser = await prisma.user.create({
      data: {
        email: 'mentor@example.com',
        name: 'Expert Mentor',
        company: 'Senior Construction Co.',
        memberType: 'PREMIUM',
        location: 'San Francisco, CA',
      },
    });

    const mentorship = await prisma.mentorshipConnection.create({
      data: {
        mentorId: mentorUser.id,
        menteeId: testUser.id,
        connectionType: 'BADGE_BASED',
        skillArea: 'Energy Efficiency',
        badgeId: badge.id,
        status: 'ACTIVE',
        meetingFrequency: 'MONTHLY',
        startDate: new Date(),
        endDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
      },
    });
    console.log('✅ Mentorship connection created');

    // Test 11: Query comprehensive data
    console.log('\n11. Querying comprehensive learning data...');
    
    const learningData = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: {
        courseEnrollments: {
          include: {
            course: {
              include: {
                sponsor: true,
              },
            },
            progress: true,
          },
        },
        proficiencyBadges: {
          include: {
            shopCampaigns: true,
          },
        },
        memberProjectFunds: {
          include: {
            transactions: true,
          },
        },
        mentorshipMentees: {
          include: {
            mentor: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log('✅ Learning data retrieved successfully');
    console.log(`   - Enrollments: ${learningData.courseEnrollments.length}`);
    console.log(`   - Badges: ${learningData.proficiencyBadges.length}`);
    console.log(`   - Project Fund Balance: $${learningData.memberProjectFunds[0]?.currentBalance || 0}`);
    console.log(`   - Mentorship Connections: ${learningData.mentorshipMentees.length}`);

    console.log('\n🎉 All Learning Management System tests passed!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Sponsor Partnership Management');
    console.log('   ✅ Course Creation and Management');
    console.log('   ✅ Course Enrollment System');
    console.log('   ✅ Progress Tracking');
    console.log('   ✅ Proficiency Badge System');
    console.log('   ✅ Badge Shop Campaigns');
    console.log('   ✅ Member Project Fund');
    console.log('   ✅ Fund Transactions');
    console.log('   ✅ Mentorship Connections');
    console.log('   ✅ Comprehensive Data Queries');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testLearningSystem()
    .then(() => {
      console.log('\n✨ Learning Management System is working correctly!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Learning Management System test failed:', error);
      process.exit(1);
    });
}

module.exports = { testLearningSystem };