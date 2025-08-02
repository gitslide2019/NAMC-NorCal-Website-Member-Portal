#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSampleMembers() {
  try {
    console.log('🚀 Creating sample NAMC members...')
    
    const sampleMembers = [
      {
        email: 'member@namc-norcal.org',
        name: 'John Doe',
        phone: '(415) 555-0123',
        company: 'NAMC Construction Co',
        memberType: 'REGULAR',
        location: 'Oakland, CA',
        website: 'https://namc-construction.com',
        isActive: true
      },
      {
        email: 'admin@namc-norcal.org',
        name: 'Jane Smith',
        phone: '(415) 555-0124',
        company: 'NAMC Northern California',
        memberType: 'ADMIN',
        location: 'San Francisco, CA',
        website: 'https://namc-norcal.org',
        isActive: true
      },
      {
        email: 'premium.member@construction.com',
        name: 'Robert Johnson',
        phone: '(510) 555-0125',
        company: 'Golden Gate Construction',
        memberType: 'PREMIUM',
        location: 'Berkeley, CA',
        website: 'https://ggconstruction.com',
        isActive: true
      },
      {
        email: 'executive@megabuild.com',
        name: 'Sarah Wilson',
        phone: '(925) 555-0126',
        company: 'MegaBuild Enterprises',
        memberType: 'EXECUTIVE',
        location: 'Fremont, CA',
        website: 'https://megabuild.com',
        isActive: true
      },
      {
        email: 'contractor@bayarea.net',
        name: 'Michael Brown',
        phone: '(408) 555-0127',
        company: 'Bay Area Contractors',
        memberType: 'REGULAR',
        location: 'San Jose, CA',
        website: 'https://bayareacontractors.net',
        isActive: true
      },
      {
        email: 'services@minority-owned.org',
        name: 'Lisa Garcia',
        phone: '(707) 555-0128',
        company: 'Minority-Owned Services LLC',
        memberType: 'PREMIUM',
        location: 'Napa, CA',
        website: 'https://minority-owned.org',
        isActive: true
      },
      {
        email: 'info@heritage-builders.com',
        name: 'David Martinez',
        phone: '(831) 555-0129',
        company: 'Heritage Builders Inc',
        memberType: 'REGULAR',
        location: 'Santa Cruz, CA',
        website: 'https://heritage-builders.com',
        isActive: false
      },
      {
        email: 'contact@diverse-construction.net',
        name: 'Angela Lee',
        phone: '(650) 555-0130',
        company: 'Diverse Construction Network',
        memberType: 'EXECUTIVE',
        location: 'Palo Alto, CA',
        website: 'https://diverse-construction.net',
        isActive: true
      }
    ]
    
    let created = 0
    let skipped = 0
    
    for (const memberData of sampleMembers) {
      try {
        // Check if member already exists
        const existing = await prisma.user.findUnique({
          where: { email: memberData.email }
        })
        
        if (existing) {
          console.log(`⏭️  Skipping existing member: ${memberData.email}`)
          skipped++
          continue
        }
        
        // Create new member
        const member = await prisma.user.create({
          data: memberData
        })
        
        console.log(`✅ Created member: ${member.name} (${member.email})`)
        created++
        
      } catch (error) {
        console.error(`❌ Failed to create member ${memberData.email}:`, error.message)
      }
    }
    
    console.log('\n📈 Summary:')
    console.log(`✅ Created: ${created}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    
    // Show final stats
    const totalUsers = await prisma.user.count()
    const activeUsers = await prisma.user.count({ where: { isActive: true } })
    const memberTypes = await prisma.user.groupBy({
      by: ['memberType'],
      _count: { memberType: true }
    })
    
    console.log('\n📊 Database Statistics:')
    console.log(`   Total Members: ${totalUsers}`)
    console.log(`   Active Members: ${activeUsers}`)
    console.log('   By Type:')
    memberTypes.forEach(type => {
      console.log(`     ${type.memberType}: ${type._count.memberType}`)
    })
    
    console.log('\n🎉 Sample members created successfully!')
    
  } catch (error) {
    console.error('💥 Failed to create sample members:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  createSampleMembers()
}