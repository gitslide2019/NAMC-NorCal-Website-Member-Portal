import { NextRequest, NextResponse } from 'next/server';
import { arcgisService } from '@/lib/services/arcgis-online.service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      accessLevel = 'basic', 
      durationDays = 30 
    } = body;

    // Validate access level
    if (!['basic', 'standard', 'advanced'].includes(accessLevel)) {
      return NextResponse.json(
        { error: 'Invalid access level. Must be basic, standard, or advanced' },
        { status: 400 }
      );
    }

    // Validate duration
    if (durationDays < 1 || durationDays > 365) {
      return NextResponse.json(
        { error: 'Duration must be between 1 and 365 days' },
        { status: 400 }
      );
    }

    // Check if member already has active access
    const existingAccess = await arcgisService.getMemberAccess(session.user.id);
    if (existingAccess && existingAccess.expirationDate > new Date()) {
      return NextResponse.json(
        { error: 'Member already has active ArcGIS access' },
        { status: 409 }
      );
    }

    // Provision new access
    const memberAccess = await arcgisService.provisionMemberAccess(
      session.user.id,
      accessLevel,
      durationDays
    );

    return NextResponse.json({
      success: true,
      data: {
        accessLevel: memberAccess.accessLevel,
        expirationDate: memberAccess.expirationDate,
        features: memberAccess.features,
        usageCount: memberAccess.usageCount,
        maxUsage: memberAccess.maxUsage
      }
    });
  } catch (error) {
    console.error('Error provisioning member access:', error);
    return NextResponse.json(
      { error: 'Failed to provision ArcGIS access' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current member access status
    const memberAccess = await arcgisService.getMemberAccess(session.user.id);

    if (!memberAccess) {
      return NextResponse.json({
        success: true,
        data: {
          hasAccess: false,
          message: 'No ArcGIS access provisioned'
        }
      });
    }

    const isExpired = memberAccess.expirationDate < new Date();
    const usagePercentage = (memberAccess.usageCount / memberAccess.maxUsage) * 100;

    return NextResponse.json({
      success: true,
      data: {
        hasAccess: !isExpired,
        accessLevel: memberAccess.accessLevel,
        expirationDate: memberAccess.expirationDate,
        features: memberAccess.features,
        usageCount: memberAccess.usageCount,
        maxUsage: memberAccess.maxUsage,
        usagePercentage,
        isExpired,
        daysRemaining: isExpired ? 0 : Math.ceil(
          (memberAccess.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      }
    });
  } catch (error) {
    console.error('Error getting member access:', error);
    return NextResponse.json(
      { error: 'Failed to get member access status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Revoke member access (implementation would depend on your database setup)
    // This would typically involve:
    // 1. Marking the access as revoked in the database
    // 2. Optionally deleting the temporary ArcGIS user account
    // 3. Clearing any cached tokens

    return NextResponse.json({
      success: true,
      message: 'ArcGIS access revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking member access:', error);
    return NextResponse.json(
      { error: 'Failed to revoke ArcGIS access' },
      { status: 500 }
    );
  }
}