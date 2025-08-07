import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30'; // days
    const projectId = searchParams.get('projectId');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));

    // Base where clause
    const baseWhere: any = {
      memberId: session.user.id,
      reviewDate: {
        gte: startDate
      }
    };

    if (projectId) {
      baseWhere.projectId = projectId;
    }

    // Get compliance reviews for analytics
    const reviews = await prisma.complianceReview.findMany({
      where: baseWhere,
      include: {
        issues: true
      },
      orderBy: {
        reviewDate: 'desc'
      }
    });

    // Get compliance deadlines
    const deadlines = await prisma.complianceDeadline.findMany({
      where: {
        memberId: session.user.id,
        createdAt: {
          gte: startDate
        }
      }
    });

    // Calculate analytics
    const analytics = {
      overview: calculateOverviewMetrics(reviews, deadlines),
      trends: calculateTrends(reviews, parseInt(timeframe)),
      riskAnalysis: calculateRiskAnalysis(reviews),
      complianceByType: calculateComplianceByType(reviews),
      issueAnalysis: calculateIssueAnalysis(reviews),
      deadlineAnalysis: calculateDeadlineAnalysis(deadlines),
      recommendations: generateRecommendations(reviews, deadlines)
    };

    return NextResponse.json({
      success: true,
      analytics,
      timeframe: parseInt(timeframe),
      totalReviews: reviews.length,
      totalDeadlines: deadlines.length
    });

  } catch (error) {
    console.error('Error generating compliance analytics:', error);
    return NextResponse.json(
      { error: 'Failed to generate compliance analytics' },
      { status: 500 }
    );
  }
}

function calculateOverviewMetrics(reviews: any[], deadlines: any[]) {
  const totalReviews = reviews.length;
  const compliantReviews = reviews.filter(r => r.complianceStatus === 'COMPLIANT').length;
  const nonCompliantReviews = reviews.filter(r => r.complianceStatus === 'NON_COMPLIANT').length;
  const pendingReviews = reviews.filter(r => r.complianceStatus === 'PENDING' || r.complianceStatus === 'IN_REVIEW').length;
  
  const averageScore = totalReviews > 0 ? 
    reviews.reduce((sum, r) => sum + r.complianceScore, 0) / totalReviews : 0;
  
  const totalIssues = reviews.reduce((sum, r) => sum + r.issuesFound, 0);
  const criticalIssues = reviews.filter(r => r.riskLevel === 'CRITICAL').length;
  
  const now = new Date();
  const upcomingDeadlines = deadlines.filter(d => {
    const dueDate = new Date(d.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue > 0 && daysUntilDue <= 30 && d.status !== 'COMPLETED';
  }).length;
  
  const overdueDeadlines = deadlines.filter(d => {
    const dueDate = new Date(d.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue < 0 && d.status !== 'COMPLETED';
  }).length;

  return {
    totalReviews,
    compliantReviews,
    nonCompliantReviews,
    pendingReviews,
    complianceRate: totalReviews > 0 ? Math.round((compliantReviews / totalReviews) * 100) : 0,
    averageScore: Math.round(averageScore),
    totalIssues,
    criticalIssues,
    upcomingDeadlines,
    overdueDeadlines
  };
}

function calculateTrends(reviews: any[], timeframeDays: number) {
  const trends = [];
  const intervalDays = Math.max(1, Math.floor(timeframeDays / 10)); // 10 data points max
  
  for (let i = 0; i < timeframeDays; i += intervalDays) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - i);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (i + intervalDays));
    
    const periodReviews = reviews.filter(r => {
      const reviewDate = new Date(r.reviewDate);
      return reviewDate >= startDate && reviewDate < endDate;
    });
    
    const avgScore = periodReviews.length > 0 ? 
      periodReviews.reduce((sum, r) => sum + r.complianceScore, 0) / periodReviews.length : 0;
    
    trends.unshift({
      date: startDate.toISOString().split('T')[0],
      reviewCount: periodReviews.length,
      averageScore: Math.round(avgScore),
      compliantCount: periodReviews.filter(r => r.complianceStatus === 'COMPLIANT').length,
      issueCount: periodReviews.reduce((sum, r) => sum + r.issuesFound, 0)
    });
  }
  
  return trends;
}

function calculateRiskAnalysis(reviews: any[]) {
  const riskDistribution = {
    LOW: reviews.filter(r => r.riskLevel === 'LOW').length,
    MEDIUM: reviews.filter(r => r.riskLevel === 'MEDIUM').length,
    HIGH: reviews.filter(r => r.riskLevel === 'HIGH').length,
    CRITICAL: reviews.filter(r => r.riskLevel === 'CRITICAL').length
  };
  
  const riskTrend = calculateRiskTrend(reviews);
  const highRiskDocuments = reviews.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL');
  
  return {
    riskDistribution,
    riskTrend,
    highRiskDocuments: highRiskDocuments.map(r => ({
      id: r.id,
      documentName: r.documentName,
      documentType: r.documentType,
      riskLevel: r.riskLevel,
      complianceScore: r.complianceScore,
      issuesFound: r.issuesFound
    }))
  };
}

function calculateRiskTrend(reviews: any[]) {
  const last30Days = reviews.filter(r => {
    const reviewDate = new Date(r.reviewDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return reviewDate >= thirtyDaysAgo;
  });
  
  const previous30Days = reviews.filter(r => {
    const reviewDate = new Date(r.reviewDate);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return reviewDate >= sixtyDaysAgo && reviewDate < thirtyDaysAgo;
  });
  
  const currentHighRisk = last30Days.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length;
  const previousHighRisk = previous30Days.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length;
  
  const trend = previousHighRisk > 0 ? 
    ((currentHighRisk - previousHighRisk) / previousHighRisk) * 100 : 0;
  
  return {
    current: currentHighRisk,
    previous: previousHighRisk,
    trend: Math.round(trend),
    direction: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'
  };
}

function calculateComplianceByType(reviews: any[]) {
  const typeStats: { [key: string]: any } = {};
  
  reviews.forEach(review => {
    if (!typeStats[review.documentType]) {
      typeStats[review.documentType] = {
        total: 0,
        compliant: 0,
        nonCompliant: 0,
        pending: 0,
        averageScore: 0,
        totalScore: 0
      };
    }
    
    const stats = typeStats[review.documentType];
    stats.total++;
    stats.totalScore += review.complianceScore;
    
    switch (review.complianceStatus) {
      case 'COMPLIANT':
        stats.compliant++;
        break;
      case 'NON_COMPLIANT':
        stats.nonCompliant++;
        break;
      default:
        stats.pending++;
    }
  });
  
  // Calculate averages
  Object.keys(typeStats).forEach(type => {
    const stats = typeStats[type];
    stats.averageScore = Math.round(stats.totalScore / stats.total);
    stats.complianceRate = Math.round((stats.compliant / stats.total) * 100);
    delete stats.totalScore; // Remove intermediate calculation
  });
  
  return typeStats;
}

function calculateIssueAnalysis(reviews: any[]) {
  const issueTypes: { [key: string]: number } = {};
  const severityDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  
  reviews.forEach(review => {
    if (review.issues) {
      review.issues.forEach((issue: any) => {
        // Count issue types
        issueTypes[issue.issueType] = (issueTypes[issue.issueType] || 0) + 1;
        
        // Count severity distribution
        severityDistribution[issue.severity as keyof typeof severityDistribution]++;
      });
    }
  });
  
  const topIssueTypes = Object.entries(issueTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([type, count]) => ({ type, count }));
  
  return {
    topIssueTypes,
    severityDistribution,
    totalIssues: Object.values(issueTypes).reduce((sum, count) => sum + count, 0)
  };
}

function calculateDeadlineAnalysis(deadlines: any[]) {
  const now = new Date();
  const typeStats: { [key: string]: any } = {};
  
  deadlines.forEach(deadline => {
    if (!typeStats[deadline.deadlineType]) {
      typeStats[deadline.deadlineType] = {
        total: 0,
        completed: 0,
        overdue: 0,
        upcoming: 0
      };
    }
    
    const stats = typeStats[deadline.deadlineType];
    stats.total++;
    
    const dueDate = new Date(deadline.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (deadline.status === 'COMPLETED') {
      stats.completed++;
    } else if (daysUntilDue < 0) {
      stats.overdue++;
    } else if (daysUntilDue <= 30) {
      stats.upcoming++;
    }
  });
  
  return typeStats;
}

function generateRecommendations(reviews: any[], deadlines: any[]) {
  const recommendations = [];
  
  // High-risk document recommendations
  const highRiskReviews = reviews.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL');
  if (highRiskReviews.length > 0) {
    recommendations.push({
      type: 'HIGH_RISK',
      priority: 'HIGH',
      title: 'Address High-Risk Documents',
      description: `You have ${highRiskReviews.length} documents with high or critical risk levels that need immediate attention.`,
      action: 'Review and resolve compliance issues in high-risk documents'
    });
  }
  
  // Overdue deadline recommendations
  const now = new Date();
  const overdueDeadlines = deadlines.filter(d => {
    const dueDate = new Date(d.dueDate);
    return dueDate < now && d.status !== 'COMPLETED';
  });
  
  if (overdueDeadlines.length > 0) {
    recommendations.push({
      type: 'OVERDUE_DEADLINES',
      priority: 'CRITICAL',
      title: 'Overdue Compliance Deadlines',
      description: `You have ${overdueDeadlines.length} overdue compliance deadlines that require immediate action.`,
      action: 'Complete overdue compliance requirements to avoid penalties'
    });
  }
  
  // Low compliance score recommendations
  const avgScore = reviews.length > 0 ? 
    reviews.reduce((sum, r) => sum + r.complianceScore, 0) / reviews.length : 0;
  
  if (avgScore < 70) {
    recommendations.push({
      type: 'LOW_COMPLIANCE',
      priority: 'MEDIUM',
      title: 'Improve Overall Compliance Score',
      description: `Your average compliance score is ${Math.round(avgScore)}%. Consider reviewing and updating your compliance processes.`,
      action: 'Review compliance procedures and provide additional training'
    });
  }
  
  // Upcoming deadline recommendations
  const upcomingDeadlines = deadlines.filter(d => {
    const dueDate = new Date(d.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue > 0 && daysUntilDue <= 7 && d.status !== 'COMPLETED';
  });
  
  if (upcomingDeadlines.length > 0) {
    recommendations.push({
      type: 'UPCOMING_DEADLINES',
      priority: 'MEDIUM',
      title: 'Upcoming Compliance Deadlines',
      description: `You have ${upcomingDeadlines.length} compliance deadlines due within the next 7 days.`,
      action: 'Prepare and submit required compliance documentation'
    });
  }
  
  return recommendations;
}