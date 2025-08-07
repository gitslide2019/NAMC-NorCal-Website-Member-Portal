#!/usr/bin/env node

/**
 * Tool Lending Daily Tasks Script
 * 
 * This script should be run daily via cron job to:
 * - Calculate late fees for overdue reservations
 * - Schedule automatic maintenance based on usage
 * - Send overdue notifications
 * - Update tool availability status
 * 
 * Usage: node scripts/tool-lending-daily-tasks.js
 * Cron: 0 6 * * * (daily at 6 AM)
 */

const { PrismaClient } = require('@prisma/client');
const { ToolLendingService } = require('../src/lib/services/tool-lending.service');

const prisma = new PrismaClient();

async function runDailyTasks() {
  console.log('Starting tool lending daily tasks...');
  console.log('Timestamp:', new Date().toISOString());

  try {
    const toolLendingService = new ToolLendingService();
    
    // Process daily tasks
    const results = await toolLendingService.processDailyTasks();
    
    console.log('Daily tasks completed successfully:');
    console.log(`- Late fees calculated: ${results.lateFeesCalculated}`);
    console.log(`- Maintenance scheduled: ${results.maintenanceScheduled}`);
    console.log(`- Overdue notifications sent: ${results.overdueNotifications}`);
    
    // Additional cleanup tasks
    await cleanupCancelledReservations();
    await updateToolConditions();
    await generateDailyReport();
    
    console.log('All daily tasks completed successfully');
    
  } catch (error) {
    console.error('Error running daily tasks:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Clean up old cancelled reservations
 */
async function cleanupCancelledReservations() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deletedCount = await prisma.toolReservation.deleteMany({
      where: {
        status: 'CANCELLED',
        updatedAt: { lt: thirtyDaysAgo }
      }
    });
    
    console.log(`Cleaned up ${deletedCount.count} old cancelled reservations`);
  } catch (error) {
    console.error('Error cleaning up cancelled reservations:', error);
  }
}

/**
 * Update tool conditions based on usage and maintenance
 */
async function updateToolConditions() {
  try {
    // Get tools that have been heavily used
    const tools = await prisma.tool.findMany({
      include: {
        reservations: {
          where: {
            status: 'RETURNED',
            endDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        },
        maintenanceRecords: {
          where: {
            status: 'COMPLETED',
            completedDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: { completedDate: 'desc' },
          take: 1
        }
      }
    });

    let updatedCount = 0;

    for (const tool of tools) {
      let newCondition = tool.condition;
      
      // Calculate usage intensity
      const usageDays = tool.reservations.reduce((total, reservation) => {
        const days = Math.ceil(
          (reservation.endDate.getTime() - reservation.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return total + days;
      }, 0);

      // Check if recently maintained
      const recentMaintenance = tool.maintenanceRecords[0];
      const wasRecentlyMaintained = recentMaintenance && 
        recentMaintenance.completedDate &&
        new Date(recentMaintenance.completedDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Update condition based on usage and maintenance
      if (wasRecentlyMaintained && recentMaintenance.maintenanceType === 'REPAIR') {
        newCondition = 'GOOD'; // Repaired tools are in good condition
      } else if (usageDays > 20 && tool.condition === 'EXCELLENT') {
        newCondition = 'GOOD'; // Heavy usage degrades excellent tools
      } else if (usageDays > 15 && tool.condition === 'GOOD') {
        newCondition = 'FAIR'; // Continued heavy usage degrades good tools
      }

      if (newCondition !== tool.condition) {
        await prisma.tool.update({
          where: { id: tool.id },
          data: { condition: newCondition }
        });
        updatedCount++;
        console.log(`Updated ${tool.name} condition from ${tool.condition} to ${newCondition}`);
      }
    }

    console.log(`Updated condition for ${updatedCount} tools`);
  } catch (error) {
    console.error('Error updating tool conditions:', error);
  }
}

/**
 * Generate daily summary report
 */
async function generateDailyReport() {
  try {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Get daily statistics
    const [
      totalTools,
      availableTools,
      activeReservations,
      overdueReservations,
      scheduledMaintenance,
      completedMaintenance
    ] = await Promise.all([
      prisma.tool.count(),
      prisma.tool.count({ where: { isAvailable: true } }),
      prisma.toolReservation.count({ 
        where: { status: { in: ['CONFIRMED', 'CHECKED_OUT'] } }
      }),
      prisma.toolReservation.count({
        where: {
          status: 'CHECKED_OUT',
          endDate: { lt: today }
        }
      }),
      prisma.toolMaintenance.count({
        where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } }
      }),
      prisma.toolMaintenance.count({
        where: {
          status: 'COMPLETED',
          completedDate: {
            gte: yesterday,
            lt: today
          }
        }
      })
    ]);

    const report = {
      date: today.toISOString().split('T')[0],
      timestamp: today.toISOString(),
      statistics: {
        totalTools,
        availableTools,
        utilizationRate: totalTools > 0 ? ((totalTools - availableTools) / totalTools * 100).toFixed(1) : 0,
        activeReservations,
        overdueReservations,
        scheduledMaintenance,
        completedMaintenanceYesterday: completedMaintenance
      }
    };

    console.log('\n=== DAILY TOOL LENDING REPORT ===');
    console.log(`Date: ${report.date}`);
    console.log(`Total Tools: ${report.statistics.totalTools}`);
    console.log(`Available Tools: ${report.statistics.availableTools}`);
    console.log(`Utilization Rate: ${report.statistics.utilizationRate}%`);
    console.log(`Active Reservations: ${report.statistics.activeReservations}`);
    console.log(`Overdue Reservations: ${report.statistics.overdueReservations}`);
    console.log(`Scheduled Maintenance: ${report.statistics.scheduledMaintenance}`);
    console.log(`Completed Maintenance (Yesterday): ${report.statistics.completedMaintenanceYesterday}`);
    console.log('================================\n');

    // Save report to database (optional)
    // You could create a DailyReport model to store these statistics
    
  } catch (error) {
    console.error('Error generating daily report:', error);
  }
}

// Run the script
if (require.main === module) {
  runDailyTasks();
}

module.exports = {
  runDailyTasks,
  cleanupCancelledReservations,
  updateToolConditions,
  generateDailyReport
};