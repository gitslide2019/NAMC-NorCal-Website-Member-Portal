import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { mediaManagementService } from '@/lib/services/media-management.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const categories = await mediaManagementService.getCategories(includeInactive);

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching media categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await request.json();
    
    // Generate slug from name if not provided
    if (!data.slug) {
      data.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const category = await mediaManagementService.createCategory(data);

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating media category:', error);
    return NextResponse.json(
      { error: 'Failed to create media category' },
      { status: 500 }
    );
  }
}