import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface AccessRequest {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  accessLevel: 'basic' | 'standard' | 'advanced';
  durationDays: number;
  requestDate: Date;
  status: 'pending' | 'approved' | 'denied';
  justification?: string;
  approvedBy?: string;
  approvedDate?: Date;
  deniedReason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accessLevel, durationDays, justification } = body;

    // Validate request
    if (!['basic', 'standard', 'advanced'].includes(accessLevel)) {
      return NextResponse.json(
        { error: 'Invalid access level' },
        { status: 400 }
      );
    }

    if (!durationDays || durationDays < 1 || durationDays > 365) {
      return NextResponse.json(
        { error: 'Duration must be between 1 and 365 days' },
        { status: 400 }
      );
    }

    // Check if user already has an active request
    const existingRequest = await getActiveAccessRequest(session.user.id);
    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending access request' },
        { status: 409 }
      );
    }

    // Create access request
    const accessRequest: AccessRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      memberId: session.user.id,
      memberName: session.user.name || 'Unknown',
      memberEmail: session.user.email || '',
      accessLevel,
      durationDays,
      requestDate: new Date(),
      status: 'pending',
      justification
    };

    // Store request (mock implementation)
    await storeAccessRequest(accessRequest);

    // Auto-approve basic access requests
    if (accessLevel === 'basic' && durationDays <= 30) {
      await approveAccessRequest(accessRequest.id, 'system');
      accessRequest.status = 'approved';
      accessRequest.approvedBy = 'system';
      accessRequest.approvedDate = new Date();
    }

    return NextResponse.json({
      success: true,
      data: {
        requestId: accessRequest.id,
        status: accessRequest.status,
        message: accessRequest.status === 'approved' 
          ? 'Access request approved automatically'
          : 'Access request submitted for review'
      }
    });
  } catch (error) {
    console.error('Error creating access request:', error);
    return NextResponse.json(
      { error: 'Failed to create access request' },
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const isAdmin = searchParams.get('admin') === 'true';

    // Check if user is admin for admin requests
    if (isAdmin && !await isUserAdmin(session.user.id)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    let requests: AccessRequest[];

    if (isAdmin) {
      // Get all requests for admin
      requests = await getAllAccessRequests(status);
    } else {
      // Get user's own requests
      requests = await getMemberAccessRequests(session.user.id, status);
    }

    return NextResponse.json({
      success: true,
      data: {
        requests,
        totalCount: requests.length
      }
    });
  } catch (error) {
    console.error('Error getting access requests:', error);
    return NextResponse.json(
      { error: 'Failed to get access requests' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    if (!await isUserAdmin(session.user.id)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, action, reason } = body;

    if (!requestId || !['approve', 'deny'].includes(action)) {
      return NextResponse.json(
        { error: 'Request ID and valid action (approve/deny) are required' },
        { status: 400 }
      );
    }

    const request_data = await getAccessRequest(requestId);
    if (!request_data) {
      return NextResponse.json(
        { error: 'Access request not found' },
        { status: 404 }
      );
    }

    if (request_data.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 409 }
      );
    }

    if (action === 'approve') {
      await approveAccessRequest(requestId, session.user.id);
      
      // Provision actual ArcGIS access
      await provisionMemberAccess(
        request_data.memberId,
        request_data.accessLevel,
        request_data.durationDays
      );
    } else {
      await denyAccessRequest(requestId, session.user.id, reason);
    }

    return NextResponse.json({
      success: true,
      message: `Access request ${action}d successfully`
    });
  } catch (error) {
    console.error('Error updating access request:', error);
    return NextResponse.json(
      { error: 'Failed to update access request' },
      { status: 500 }
    );
  }
}

// Mock database functions - replace with actual implementations
async function getActiveAccessRequest(memberId: string): Promise<AccessRequest | null> {
  // Mock implementation
  return null;
}

async function storeAccessRequest(request: AccessRequest): Promise<void> {
  // Mock implementation
  console.log('Storing access request:', request);
}

async function approveAccessRequest(requestId: string, approvedBy: string): Promise<void> {
  // Mock implementation
  console.log('Approving request:', requestId, 'by:', approvedBy);
}

async function denyAccessRequest(requestId: string, deniedBy: string, reason?: string): Promise<void> {
  // Mock implementation
  console.log('Denying request:', requestId, 'by:', deniedBy, 'reason:', reason);
}

async function getAccessRequest(requestId: string): Promise<AccessRequest | null> {
  // Mock implementation
  return {
    id: requestId,
    memberId: 'member_123',
    memberName: 'John Doe',
    memberEmail: 'john@example.com',
    accessLevel: 'basic',
    durationDays: 30,
    requestDate: new Date(),
    status: 'pending'
  };
}

async function getAllAccessRequests(status?: string | null): Promise<AccessRequest[]> {
  // Mock implementation
  const mockRequests: AccessRequest[] = [
    {
      id: 'req_1',
      memberId: 'member_123',
      memberName: 'John Doe',
      memberEmail: 'john@example.com',
      accessLevel: 'standard',
      durationDays: 60,
      requestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'pending',
      justification: 'Need advanced spatial analysis for upcoming commercial project'
    },
    {
      id: 'req_2',
      memberId: 'member_456',
      memberName: 'Jane Smith',
      memberEmail: 'jane@example.com',
      accessLevel: 'basic',
      durationDays: 30,
      requestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'approved',
      approvedBy: 'admin_1',
      approvedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  ];

  return status ? mockRequests.filter(req => req.status === status) : mockRequests;
}

async function getMemberAccessRequests(memberId: string, status?: string | null): Promise<AccessRequest[]> {
  // Mock implementation
  const allRequests = await getAllAccessRequests();
  const memberRequests = allRequests.filter(req => req.memberId === memberId);
  return status ? memberRequests.filter(req => req.status === status) : memberRequests;
}

async function isUserAdmin(userId: string): Promise<boolean> {
  // Mock implementation - replace with actual admin check
  return userId === 'admin_user_id';
}

async function provisionMemberAccess(
  memberId: string,
  accessLevel: string,
  durationDays: number
): Promise<void> {
  // This would call the ArcGIS service to actually provision access
  console.log('Provisioning ArcGIS access:', { memberId, accessLevel, durationDays });
}