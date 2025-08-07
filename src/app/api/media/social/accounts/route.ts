import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { socialMediaIntegrationService } from '@/lib/services/social-media-integration.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const officialOnly = searchParams.get('officialOnly') === 'true';

    let accounts;
    if (officialOnly) {
      accounts = await socialMediaIntegrationService.getOfficialAccounts();
    } else {
      accounts = await socialMediaIntegrationService.getSocialMediaAccounts(includeInactive);
    }

    // Remove sensitive data from response
    const sanitizedAccounts = accounts.map(account => ({
      ...account,
      accessToken: undefined,
      refreshToken: undefined
    }));

    return NextResponse.json(sanitizedAccounts);
  } catch (error) {
    console.error('Error fetching social media accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social media accounts' },
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

    const account = await socialMediaIntegrationService.addSocialMediaAccount(data);

    // Remove sensitive data from response
    const sanitizedAccount = {
      ...account,
      accessToken: undefined,
      refreshToken: undefined
    };

    return NextResponse.json(sanitizedAccount, { status: 201 });
  } catch (error) {
    console.error('Error adding social media account:', error);
    return NextResponse.json(
      { error: 'Failed to add social media account' },
      { status: 500 }
    );
  }
}