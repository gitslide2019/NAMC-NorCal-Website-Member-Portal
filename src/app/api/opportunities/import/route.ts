import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ProjectOpportunitiesImportService from '@/lib/services/project-opportunities-import.service'
import path from 'path'

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check (optional - you can allow all authenticated users)
    // if (session.user.memberType !== 'admin') {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    const importService = new ProjectOpportunitiesImportService()

    try {
      // Path to the CSV file
      const csvPath = path.join(process.cwd(), 'NAMC_Project_Opportunities_2025-08-01.csv')
      
      console.log('Starting import from:', csvPath)
      const result = await importService.importFromCSV(csvPath)

      // Get updated statistics
      const stats = await importService.getOpportunityStats()

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${result.imported} opportunities`,
        data: {
          imported: result.imported,
          errors: result.errors,
          stats
        }
      })
    } finally {
      await importService.disconnect()
    }
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to import opportunities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const importService = new ProjectOpportunitiesImportService()

    try {
      const stats = await importService.getOpportunityStats()
      
      return NextResponse.json({
        success: true,
        data: stats
      })
    } finally {
      await importService.disconnect()
    }
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get opportunity statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}