/**
 * Loyalty Points and Member Tier API Routes
 * Handles loyalty points, member tier benefits, and rewards
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const memberId = searchParams.get('memberId') || session.user.id;

    // Only allow users to view their own data unless they're admin
    if (memberId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: memberId },
      include: {
        orders: {
          where: { paymentStatus: 'PAID' },
          include: {
            items: {
              include: { product: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'status':
        // Get current loyalty status
        const userSpecs = JSON.parse(user.hubspotSyncError || '{}');
        const loyaltyStatus = {
          currentPoints: userSpecs.loyaltyPoints || 0,
          currentTier: user.memberType,
          pointsToNextTier: calculatePointsToNextTier(userSpecs.loyaltyPoints || 0, user.memberType),
          tierBenefits: getTierBenefits(user.memberType),
          pointsHistory: userSpecs.pointsHistory || [],
          totalOrderValue: user.orders.reduce((sum, order) => sum + order.totalAmount, 0),
          totalOrders: user.orders.length,
        };
        
        return NextResponse.json({
          success: true,
          data: loyaltyStatus,
        });

      case 'history':
        // Get detailed points history
        const userHistory = JSON.parse(user.hubspotSyncError || '{}');
        const pointsHistory = userHistory.pointsHistory || [];
        
        // Enhance history with order details
        const enhancedHistory = await Promise.all(
          pointsHistory.map(async (entry: any) => {
            if (entry.orderId) {
              const order = await prisma.order.findUnique({
                where: { id: entry.orderId },
                include: {
                  items: {
                    include: { product: true },
                  },
                },
              });
              return {
                ...entry,
                orderDetails: order,
              };
            }
            return entry;
          })
        );
        
        return NextResponse.json({
          success: true,
          data: {
            history: enhancedHistory,
            totalPointsEarned: pointsHistory.reduce((sum: number, entry: any) => sum + entry.points, 0),
          },
        });

      case 'benefits':
        // Get available tier benefits and discounts
        const currentTierBenefits = getTierBenefits(user.memberType);
        const allTierBenefits = {
          REGULAR: getTierBenefits('REGULAR'),
          PREMIUM: getTierBenefits('PREMIUM'),
          EXECUTIVE: getTierBenefits('EXECUTIVE'),
        };
        
        return NextResponse.json({
          success: true,
          data: {
            currentTier: user.memberType,
            currentBenefits: currentTierBenefits,
            allTiers: allTierBenefits,
          },
        });

      case 'leaderboard':
        // Get loyalty points leaderboard (admin only)
        if (session.user.memberType !== 'ADMIN') {
          return NextResponse.json(
            { success: false, error: 'Admin access required' },
            { status: 403 }
          );
        }

        const topMembers = await prisma.user.findMany({
          where: { isActive: true },
          take: 50,
          orderBy: { lastActive: 'desc' },
        });

        const leaderboard = topMembers
          .map(member => {
            const specs = JSON.parse(member.hubspotSyncError || '{}');
            return {
              id: member.id,
              name: member.name,
              memberType: member.memberType,
              points: specs.loyaltyPoints || 0,
              joinDate: member.joinDate,
            };
          })
          .sort((a, b) => b.points - a.points)
          .slice(0, 20);

        return NextResponse.json({
          success: true,
          data: leaderboard,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error fetching loyalty data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch loyalty data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, memberId, points, reason } = body;

    switch (action) {
      case 'award_points':
        if (!memberId || !points || !reason) {
          return NextResponse.json(
            { success: false, error: 'Member ID, points, and reason required' },
            { status: 400 }
          );
        }

        const user = await prisma.user.findUnique({
          where: { id: memberId },
        });

        if (!user) {
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          );
        }

        // Update user points
        const currentSpecs = JSON.parse(user.hubspotSyncError || '{}');
        const currentPoints = currentSpecs.loyaltyPoints || 0;
        const newTotalPoints = currentPoints + points;
        const newTier = calculateMemberTier(newTotalPoints);

        const updatedSpecs = {
          ...currentSpecs,
          loyaltyPoints: newTotalPoints,
          pointsHistory: [
            ...(currentSpecs.pointsHistory || []),
            {
              points,
              date: new Date().toISOString(),
              reason,
              awardedBy: session.user.id,
            },
          ],
        };

        await prisma.user.update({
          where: { id: memberId },
          data: {
            memberType: newTier,
            hubspotSyncError: JSON.stringify(updatedSpecs),
            hubspotSyncStatus: 'PENDING',
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            pointsAwarded: points,
            newTotalPoints,
            previousTier: user.memberType,
            newTier,
            tierUpdated: user.memberType !== newTier,
          },
          message: `Awarded ${points} points to ${user.name}`,
        });

      case 'adjust_tier':
        if (!memberId || !body.newTier) {
          return NextResponse.json(
            { success: false, error: 'Member ID and new tier required' },
            { status: 400 }
          );
        }

        const targetUser = await prisma.user.findUnique({
          where: { id: memberId },
        });

        if (!targetUser) {
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          );
        }

        await prisma.user.update({
          where: { id: memberId },
          data: {
            memberType: body.newTier,
            hubspotSyncStatus: 'PENDING',
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            previousTier: targetUser.memberType,
            newTier: body.newTier,
          },
          message: `Updated ${targetUser.name}'s tier from ${targetUser.memberType} to ${body.newTier}`,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing loyalty request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process loyalty request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate points needed to reach next tier
 */
function calculatePointsToNextTier(currentPoints: number, currentTier: string): number {
  switch (currentTier) {
    case 'REGULAR':
      return Math.max(0, 5000 - currentPoints);
    case 'PREMIUM':
      return Math.max(0, 10000 - currentPoints);
    case 'EXECUTIVE':
      return 0; // Already at highest tier
    default:
      return 5000 - currentPoints;
  }
}

/**
 * Calculate member tier based on loyalty points
 */
function calculateMemberTier(totalPoints: number): string {
  if (totalPoints >= 10000) {
    return 'EXECUTIVE';
  } else if (totalPoints >= 5000) {
    return 'PREMIUM';
  } else {
    return 'REGULAR';
  }
}

/**
 * Get benefits for a specific tier
 */
function getTierBenefits(tier: string): {
  discountPercentage: number;
  pointsMultiplier: number;
  benefits: string[];
  exclusiveAccess: string[];
} {
  switch (tier) {
    case 'EXECUTIVE':
      return {
        discountPercentage: 20,
        pointsMultiplier: 2.0,
        benefits: [
          'Free shipping on all orders',
          'Priority customer support',
          'Early access to new products',
          'Exclusive executive events',
          'Personal account manager',
          'Custom training programs',
        ],
        exclusiveAccess: [
          'Executive-only products',
          'Advanced training materials',
          'Industry insider reports',
          'VIP networking events',
        ],
      };
    case 'PREMIUM':
      return {
        discountPercentage: 15,
        pointsMultiplier: 1.5,
        benefits: [
          'Free shipping on orders over $100',
          'Priority customer support',
          'Early access to new products',
          'Premium member events',
          'Extended return policy',
        ],
        exclusiveAccess: [
          'Premium-only products',
          'Advanced courses',
          'Industry reports',
        ],
      };
    case 'REGULAR':
      return {
        discountPercentage: 10,
        pointsMultiplier: 1.0,
        benefits: [
          'Member pricing on all products',
          'Access to member-only content',
          'Monthly newsletter',
          'Basic customer support',
        ],
        exclusiveAccess: [
          'Member-only products',
          'Basic courses',
        ],
      };
    default:
      return {
        discountPercentage: 0,
        pointsMultiplier: 1.0,
        benefits: [],
        exclusiveAccess: [],
      };
  }
}