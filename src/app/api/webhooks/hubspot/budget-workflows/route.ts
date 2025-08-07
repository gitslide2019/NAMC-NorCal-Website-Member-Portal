import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ProjectBudgetService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const budgetService = new ProjectBudgetService();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { workflowType, objectId, properties } = data;

    console.log('HubSpot Budget Workflow Triggered:', { workflowType, objectId });

    switch (workflowType) {
      case 'budget_threshold_alert':
        await handleBudgetThresholdAlert(objectId, properties);
        break;
      
      case 'funding_milestone_reached':
        await handleFundingMilestoneReached(objectId, properties);
        break;
      
      case 'social_impact_milestone':
        await handleSocialImpactMilestone(objectId, properties);
        break;
      
      case 'project_profitability_alert':
        await handleProjectProfitabilityAlert(objectId, properties);
        break;
      
      case 'sponsor_engagement_workflow':
        await handleSponsorEngagementWorkflow(objectId, properties);
        break;
      
      case 'funder_progress_update':
        await handleFunderProgressUpdate(objectId, properties);
        break;
      
      default:
        console.log('Unknown workflow type:', workflowType);
        return NextResponse.json({ message: 'Unknown workflow type' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Workflow processed successfully' });
  } catch (error) {
    console.error('Error processing HubSpot budget workflow:', error);
    return NextResponse.json(
      { error: 'Failed to process workflow' },
      { status: 500 }
    );
  }
}

// Handle budget threshold alert workflow
async function handleBudgetThresholdAlert(budgetId: string, properties: any) {
  try {
    // Find the local budget record
    const budget = await prisma.projectBudget.findFirst({
      where: { hubspotObjectId: budgetId },
      include: {
        member: true,
        socialImpactMetrics: true,
      },
    });

    if (!budget) {
      console.error('Budget not found for HubSpot ID:', budgetId);
      return;
    }

    const utilizationPercentage = (budget.spentAmount / budget.totalBudget) * 100;
    const alertLevel = utilizationPercentage >= 90 ? 'CRITICAL' : 'WARNING';

    // Create notification record
    await prisma.$executeRaw`
      INSERT INTO notifications (
        user_id, 
        type, 
        title, 
        message, 
        data, 
        created_at
      ) VALUES (
        ${budget.memberId},
        'BUDGET_ALERT',
        ${`Budget Alert: ${budget.projectName}`},
        ${`Your project budget is ${utilizationPercentage.toFixed(1)}% utilized. ${
          alertLevel === 'CRITICAL' ? 'Immediate attention required.' : 'Please review spending.'
        }`},
        ${JSON.stringify({
          projectId: budget.projectId,
          budgetId: budget.id,
          utilizationPercentage,
          alertLevel,
          spentAmount: budget.spentAmount,
          totalBudget: budget.totalBudget,
        })},
        ${new Date()}
      )
    `;

    // Send email notification (integrate with email service)
    await sendBudgetAlertEmail({
      memberEmail: budget.member.email!,
      memberName: budget.member.name!,
      projectName: budget.projectName,
      utilizationPercentage,
      spentAmount: budget.spentAmount,
      totalBudget: budget.totalBudget,
      alertLevel,
    });

    // Update budget status if critical
    if (alertLevel === 'CRITICAL' && budget.budgetStatus !== 'OVER_BUDGET') {
      await prisma.projectBudget.update({
        where: { id: budget.id },
        data: { budgetStatus: 'OVER_BUDGET' },
      });

      // Sync status back to HubSpot
      await budgetService.updateProjectBudget(budgetId, {
        budgetStatus: 'OVER_BUDGET',
      });
    }

    console.log('Budget threshold alert processed:', {
      projectName: budget.projectName,
      utilizationPercentage,
      alertLevel,
    });
  } catch (error) {
    console.error('Error handling budget threshold alert:', error);
  }
}

// Handle funding milestone reached workflow
async function handleFundingMilestoneReached(campaignId: string, properties: any) {
  try {
    // Find the local campaign record
    const campaign = await prisma.fundingCampaign.findFirst({
      where: { hubspotObjectId: campaignId },
      include: {
        budget: {
          include: {
            member: true,
          },
        },
        contributions: {
          where: { paymentStatus: 'COMPLETED' },
        },
        sponsors: true,
      },
    });

    if (!campaign) {
      console.error('Campaign not found for HubSpot ID:', campaignId);
      return;
    }

    const progressPercentage = (campaign.raisedAmount / campaign.targetAmount) * 100;
    let milestoneType = '';

    // Determine milestone type
    if (progressPercentage >= 100) {
      milestoneType = 'GOAL_REACHED';
    } else if (progressPercentage >= 75) {
      milestoneType = '75_PERCENT';
    } else if (progressPercentage >= 50) {
      milestoneType = '50_PERCENT';
    } else if (progressPercentage >= 25) {
      milestoneType = '25_PERCENT';
    }

    // Send milestone notifications to contributors
    for (const contribution of campaign.contributions) {
      await sendMilestoneUpdateEmail({
        contributorEmail: contribution.contributorEmail,
        contributorName: contribution.contributorName,
        campaignTitle: campaign.campaignTitle,
        milestoneType,
        progressPercentage,
        raisedAmount: campaign.raisedAmount,
        targetAmount: campaign.targetAmount,
      });
    }

    // Send milestone notifications to sponsors
    for (const sponsor of campaign.sponsors) {
      if (sponsor.contactEmail) {
        await sendSponsorMilestoneUpdate({
          sponsorEmail: sponsor.contactEmail,
          sponsorName: sponsor.sponsorName,
          campaignTitle: campaign.campaignTitle,
          milestoneType,
          progressPercentage,
          sponsorshipLevel: sponsor.sponsorshipLevel,
        });
      }
    }

    // Update campaign status if goal reached
    if (milestoneType === 'GOAL_REACHED' && campaign.campaignStatus !== 'COMPLETED') {
      await prisma.fundingCampaign.update({
        where: { id: campaign.id },
        data: { campaignStatus: 'COMPLETED' },
      });

      // Update project budget with final funding amount
      await prisma.projectBudget.update({
        where: { id: campaign.budgetId! },
        data: {
          crowdFunding: campaign.raisedAmount,
          remainingFunds: {
            increment: campaign.raisedAmount - campaign.budget!.crowdFunding,
          },
        },
      });
    }

    console.log('Funding milestone processed:', {
      campaignTitle: campaign.campaignTitle,
      milestoneType,
      progressPercentage,
    });
  } catch (error) {
    console.error('Error handling funding milestone:', error);
  }
}

// Handle social impact milestone workflow
async function handleSocialImpactMilestone(metricsId: string, properties: any) {
  try {
    // Find the local metrics record
    const metrics = await prisma.socialImpactMetrics.findFirst({
      where: { hubspotObjectId: metricsId },
      include: {
        budget: {
          include: {
            member: true,
            fundingCampaigns: {
              include: {
                contributions: {
                  where: { paymentStatus: 'COMPLETED' },
                },
                sponsors: true,
              },
            },
          },
        },
      },
    });

    if (!metrics) {
      console.error('Social impact metrics not found for HubSpot ID:', metricsId);
      return;
    }

    // Parse milestones
    const milestones = JSON.parse(metrics.impactMilestones || '[]');
    const completedMilestones = milestones.filter((milestone: any) => 
      (metrics as any)[milestone.metric] >= milestone.target
    );

    // Check for newly completed milestones
    const newlyCompleted = completedMilestones.filter((milestone: any) => 
      !milestone.completed
    );

    if (newlyCompleted.length > 0) {
      // Update milestone completion status
      const updatedMilestones = milestones.map((milestone: any) => ({
        ...milestone,
        completed: (metrics as any)[milestone.metric] >= milestone.target,
      }));

      await prisma.socialImpactMetrics.update({
        where: { id: metrics.id },
        data: {
          milestonesCompleted: completedMilestones.length,
          impactMilestones: JSON.stringify(updatedMilestones),
        },
      });

      // Send milestone celebration notifications
      for (const milestone of newlyCompleted) {
        await sendImpactMilestoneNotification({
          memberEmail: metrics.budget.member.email!,
          memberName: metrics.budget.member.name!,
          projectName: metrics.budget.projectName,
          milestone,
          currentValue: (metrics as any)[milestone.metric],
        });

        // Notify funders and sponsors
        for (const campaign of metrics.budget.fundingCampaigns) {
          // Notify contributors
          for (const contribution of campaign.contributions) {
            await sendContributorImpactUpdate({
              contributorEmail: contribution.contributorEmail,
              contributorName: contribution.contributorName,
              campaignTitle: campaign.campaignTitle,
              milestone,
              impactScore: metrics.communityBenefitScore,
            });
          }

          // Notify sponsors
          for (const sponsor of campaign.sponsors) {
            if (sponsor.contactEmail) {
              await sendSponsorImpactUpdate({
                sponsorEmail: sponsor.contactEmail,
                sponsorName: sponsor.sponsorName,
                campaignTitle: campaign.campaignTitle,
                milestone,
                impactScore: metrics.communityBenefitScore,
                sponsorshipLevel: sponsor.sponsorshipLevel,
              });
            }
          }
        }
      }

      console.log('Social impact milestone processed:', {
        projectName: metrics.budget.projectName,
        newMilestones: newlyCompleted.length,
        totalCompleted: completedMilestones.length,
      });
    }
  } catch (error) {
    console.error('Error handling social impact milestone:', error);
  }
}

// Handle project profitability alert workflow
async function handleProjectProfitabilityAlert(budgetId: string, properties: any) {
  try {
    const budget = await prisma.projectBudget.findFirst({
      where: { hubspotObjectId: budgetId },
      include: {
        member: true,
        socialImpactMetrics: true,
      },
    });

    if (!budget) return;

    const profitMarginPercentage = budget.contractValue > 0 ? 
      (budget.profitMargin / budget.contractValue) * 100 : 0;

    let alertType = '';
    if (profitMarginPercentage < 5) {
      alertType = 'LOW_MARGIN';
    } else if (profitMarginPercentage < 0) {
      alertType = 'LOSS_PROJECTED';
    }

    if (alertType) {
      await sendProfitabilityAlert({
        memberEmail: budget.member.email!,
        memberName: budget.member.name!,
        projectName: budget.projectName,
        profitMargin: budget.profitMargin,
        profitMarginPercentage,
        alertType,
        contractValue: budget.contractValue,
        totalBudget: budget.totalBudget,
      });

      console.log('Profitability alert processed:', {
        projectName: budget.projectName,
        alertType,
        profitMarginPercentage,
      });
    }
  } catch (error) {
    console.error('Error handling profitability alert:', error);
  }
}

// Handle sponsor engagement workflow
async function handleSponsorEngagementWorkflow(sponsorId: string, properties: any) {
  try {
    const sponsor = await prisma.campaignSponsor.findFirst({
      where: { hubspotCompanyId: sponsorId },
      include: {
        campaign: {
          include: {
            budget: {
              include: {
                socialImpactMetrics: true,
              },
            },
          },
        },
      },
    });

    if (!sponsor) return;

    // Send personalized sponsor engagement content
    await sendSponsorEngagementContent({
      sponsorEmail: sponsor.contactEmail!,
      sponsorName: sponsor.sponsorName,
      campaignTitle: sponsor.campaign.campaignTitle,
      sponsorshipLevel: sponsor.sponsorshipLevel,
      impactMetrics: sponsor.campaign.budget?.socialImpactMetrics,
      recognitionBenefits: JSON.parse(sponsor.benefits || '[]'),
    });

    console.log('Sponsor engagement workflow processed:', {
      sponsorName: sponsor.sponsorName,
      campaignTitle: sponsor.campaign.campaignTitle,
    });
  } catch (error) {
    console.error('Error handling sponsor engagement workflow:', error);
  }
}

// Handle funder progress update workflow
async function handleFunderProgressUpdate(budgetId: string, properties: any) {
  try {
    const budget = await prisma.projectBudget.findFirst({
      where: { hubspotObjectId: budgetId },
      include: {
        member: true,
        socialImpactMetrics: true,
        fundingCampaigns: {
          include: {
            contributions: {
              where: { paymentStatus: 'COMPLETED' },
            },
            sponsors: true,
          },
        },
      },
    });

    if (!budget) return;

    // Generate comprehensive progress report
    const progressReport = {
      projectName: budget.projectName,
      budgetUtilization: (budget.spentAmount / budget.totalBudget) * 100,
      socialImpactScore: budget.socialImpactMetrics?.communityBenefitScore || 0,
      jobsCreated: budget.socialImpactMetrics?.jobsCreated || 0,
      trainingHours: budget.socialImpactMetrics?.trainingHoursProvided || 0,
      housingUnits: budget.socialImpactMetrics?.housingUnitsCreated || 0,
      sroiRatio: budget.socialImpactMetrics?.sroiRatio || 0,
      milestonesCompleted: budget.socialImpactMetrics?.milestonesCompleted || 0,
      milestonesTotal: budget.socialImpactMetrics?.milestonesTotal || 0,
    };

    // Send updates to all funders
    for (const campaign of budget.fundingCampaigns) {
      // Update contributors
      for (const contribution of campaign.contributions) {
        await sendFunderProgressUpdate({
          funderEmail: contribution.contributorEmail,
          funderName: contribution.contributorName,
          funderType: 'contributor',
          contributionAmount: contribution.amount,
          progressReport,
        });
      }

      // Update sponsors
      for (const sponsor of campaign.sponsors) {
        if (sponsor.contactEmail) {
          await sendFunderProgressUpdate({
            funderEmail: sponsor.contactEmail,
            funderName: sponsor.sponsorName,
            funderType: 'sponsor',
            contributionAmount: sponsor.amount,
            progressReport,
            sponsorshipLevel: sponsor.sponsorshipLevel,
          });
        }
      }
    }

    console.log('Funder progress update processed:', {
      projectName: budget.projectName,
      totalFunders: budget.fundingCampaigns.reduce((sum, campaign) => 
        sum + campaign.contributions.length + campaign.sponsors.length, 0),
    });
  } catch (error) {
    console.error('Error handling funder progress update:', error);
  }
}

// Email notification functions (these would integrate with your email service)
async function sendBudgetAlertEmail(data: any) {
  console.log('Sending budget alert email:', data);
  // Implement email sending logic
}

async function sendMilestoneUpdateEmail(data: any) {
  console.log('Sending milestone update email:', data);
  // Implement email sending logic
}

async function sendSponsorMilestoneUpdate(data: any) {
  console.log('Sending sponsor milestone update:', data);
  // Implement email sending logic
}

async function sendImpactMilestoneNotification(data: any) {
  console.log('Sending impact milestone notification:', data);
  // Implement email sending logic
}

async function sendContributorImpactUpdate(data: any) {
  console.log('Sending contributor impact update:', data);
  // Implement email sending logic
}

async function sendSponsorImpactUpdate(data: any) {
  console.log('Sending sponsor impact update:', data);
  // Implement email sending logic
}

async function sendProfitabilityAlert(data: any) {
  console.log('Sending profitability alert:', data);
  // Implement email sending logic
}

async function sendSponsorEngagementContent(data: any) {
  console.log('Sending sponsor engagement content:', data);
  // Implement email sending logic
}

async function sendFunderProgressUpdate(data: any) {
  console.log('Sending funder progress update:', data);
  // Implement email sending logic
}