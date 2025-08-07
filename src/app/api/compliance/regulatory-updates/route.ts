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
    const regulatoryBody = searchParams.get('regulatoryBody');
    const updateType = searchParams.get('updateType');
    const impactLevel = searchParams.get('impactLevel');
    const recent = searchParams.get('recent'); // Get updates from last 90 days

    const where: any = {
      isActive: true
    };

    if (regulatoryBody) {
      where.regulatoryBody = regulatoryBody;
    }

    if (updateType) {
      where.updateType = updateType;
    }

    if (impactLevel) {
      where.impactLevel = impactLevel;
    }

    if (recent === 'true') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      where.createdAt = {
        gte: ninetyDaysAgo
      };
    }

    const updates = await prisma.regulatoryUpdate.findMany({
      where,
      orderBy: [
        { impactLevel: 'desc' },
        { effectiveDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Parse JSON fields and add additional info
    const formattedUpdates = updates.map(update => {
      const now = new Date();
      const effectiveDate = new Date(update.effectiveDate);
      const daysUntilEffective = Math.ceil((effectiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...update,
        affectedCategories: update.affectedCategories ? JSON.parse(update.affectedCategories) : [],
        daysUntilEffective,
        isEffective: daysUntilEffective <= 0,
        isUpcoming: daysUntilEffective > 0 && daysUntilEffective <= 30
      };
    });

    return NextResponse.json({
      success: true,
      updates: formattedUpdates
    });

  } catch (error) {
    console.error('Error fetching regulatory updates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regulatory updates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (user?.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      regulatoryBody,
      updateType,
      effectiveDate,
      impactLevel,
      affectedCategories,
      actionRequired,
      documentUrl
    } = body;

    if (!title || !description || !regulatoryBody || !updateType || !effectiveDate || !impactLevel) {
      return NextResponse.json(
        { error: 'Title, description, regulatory body, update type, effective date, and impact level are required' },
        { status: 400 }
      );
    }

    const update = await prisma.regulatoryUpdate.create({
      data: {
        title,
        description,
        regulatoryBody,
        updateType,
        effectiveDate: new Date(effectiveDate),
        impactLevel,
        affectedCategories: affectedCategories ? JSON.stringify(affectedCategories) : JSON.stringify([]),
        actionRequired,
        documentUrl,
        isActive: true
      }
    });

    // Parse JSON fields for response
    const formattedUpdate = {
      ...update,
      affectedCategories: JSON.parse(update.affectedCategories)
    };

    return NextResponse.json({
      success: true,
      update: formattedUpdate
    });

  } catch (error) {
    console.error('Error creating regulatory update:', error);
    return NextResponse.json(
      { error: 'Failed to create regulatory update' },
      { status: 500 }
    );
  }
}