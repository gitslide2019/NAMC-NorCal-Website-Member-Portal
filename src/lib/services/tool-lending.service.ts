/**
 * Tool Lending Service
 * 
 * Handles business logic for tool lending operations including:
 * - Automated late fee calculations
 * - Maintenance scheduling
 * - Availability checking
 * - Utilization analytics
 * - HubSpot workflow integration
 */

import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from './hubspot-backbone.service';

const prisma = new PrismaClient();

interface LateFeeCalculation {
  reservationId: string;
  originalEndDate: Date;
  actualReturnDate: Date;
  daysLate: number;
  dailyRate: number;
  lateFeeRate: number;
  calculatedFee: number;
}

interface MaintenanceSchedule {
  toolId: string;
  maintenanceType: string;
  description: string;
  scheduledDate: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

interface UtilizationReport {
  toolId: string;
  toolName: string;
  category: string;
  totalDays: number;
  reservedDays: number;
  utilizationRate: number;
  revenue: number;
  maintenanceCost: number;
  netRevenue: number;
}

export class ToolLendingService {
  private hubspotService: HubSpotBackboneService;

  constructor() {
    this.hubspotService = new HubSpotBackboneService({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
      portalId: process.env.HUBSPOT_PORTAL_ID
    });
  }

  /**
   * Calculate late fees for overdue reservations
   */
  async calculateLateFees(reservationId?: string): Promise<LateFeeCalculation[]> {
    try {
      const where: any = {
        status: 'CHECKED_OUT',
        endDate: { lt: new Date() }, // Past due date
        lateFees: 0 // Haven't calculated fees yet
      };

      if (reservationId) {
        where.id = reservationId;
      }

      const overdueReservations = await prisma.toolReservation.findMany({
        where,
        include: {
          tool: {
            select: {
              id: true,
              name: true,
              dailyRate: true
            }
          }
        }
      });

      const calculations: LateFeeCalculation[] = [];
      const lateFeeRate = 0.5; // 50% of daily rate as late fee

      for (const reservation of overdueReservations) {
        const actualReturnDate = new Date(); // Current date as return date
        const daysLate = Math.ceil(
          (actualReturnDate.getTime() - reservation.endDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysLate > 0) {
          const calculatedFee = daysLate * reservation.tool.dailyRate * lateFeeRate;

          const calculation: LateFeeCalculation = {
            reservationId: reservation.id,
            originalEndDate: reservation.endDate,
            actualReturnDate,
            daysLate,
            dailyRate: reservation.tool.dailyRate,
            lateFeeRate,
            calculatedFee
          };

          calculations.push(calculation);

          // Update reservation with calculated late fee
          await prisma.toolReservation.update({
            where: { id: reservation.id },
            data: { lateFees: calculatedFee }
          });

          // Trigger HubSpot workflow for late fee notification
          if (reservation.hubspotObjectId) {
            await this.hubspotService.triggerWorkflow('late_fee_calculated', reservation.hubspotObjectId);
          }
        }
      }

      return calculations;
    } catch (error) {
      console.error('Error calculating late fees:', error);
      throw new Error('Failed to calculate late fees');
    }
  }

  /**
   * Schedule automatic maintenance based on usage patterns
   */
  async scheduleAutomaticMaintenance(): Promise<MaintenanceSchedule[]> {
    try {
      const tools = await prisma.tool.findMany({
        include: {
          reservations: {
            where: {
              status: 'RETURNED',
              endDate: {
                gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
              }
            }
          },
          maintenanceRecords: {
            where: {
              status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
            }
          }
        }
      });

      const schedules: MaintenanceSchedule[] = [];

      for (const tool of tools) {
        // Skip if already has scheduled maintenance
        if (tool.maintenanceRecords.length > 0) continue;

        const totalUsageDays = tool.reservations.reduce((total, reservation) => {
          const days = Math.ceil(
            (reservation.endDate.getTime() - reservation.startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return total + days;
        }, 0);

        let shouldSchedule = false;
        let maintenanceType = 'ROUTINE';
        let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'LOW';
        let description = 'Routine maintenance check';

        // Determine maintenance needs based on usage and condition
        if (tool.condition === 'NEEDS_REPAIR') {
          shouldSchedule = true;
          maintenanceType = 'REPAIR';
          priority = 'URGENT';
          description = 'Tool requires immediate repair';
        } else if (tool.condition === 'FAIR' && totalUsageDays > 30) {
          shouldSchedule = true;
          maintenanceType = 'INSPECTION';
          priority = 'HIGH';
          description = 'Tool showing wear, requires detailed inspection';
        } else if (totalUsageDays > 60) {
          shouldSchedule = true;
          maintenanceType = 'ROUTINE';
          priority = 'MEDIUM';
          description = 'High usage tool requires routine maintenance';
        } else if (tool.category === 'measuring_tools' && totalUsageDays > 20) {
          shouldSchedule = true;
          maintenanceType = 'CALIBRATION';
          priority = 'MEDIUM';
          description = 'Measuring tool requires calibration check';
        }

        if (shouldSchedule) {
          // Schedule maintenance 1-7 days from now based on priority
          const daysFromNow = priority === 'URGENT' ? 1 : 
                             priority === 'HIGH' ? 2 : 
                             priority === 'MEDIUM' ? 5 : 7;

          const scheduledDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);

          const schedule: MaintenanceSchedule = {
            toolId: tool.id,
            maintenanceType,
            description,
            scheduledDate,
            priority
          };

          schedules.push(schedule);

          // Create maintenance record
          await prisma.toolMaintenance.create({
            data: {
              toolId: tool.id,
              maintenanceType,
              description,
              scheduledDate,
              status: 'SCHEDULED'
            }
          });

          // Make tool unavailable if urgent
          if (priority === 'URGENT') {
            await prisma.tool.update({
              where: { id: tool.id },
              data: { isAvailable: false }
            });
          }
        }
      }

      return schedules;
    } catch (error) {
      console.error('Error scheduling automatic maintenance:', error);
      throw new Error('Failed to schedule automatic maintenance');
    }
  }

  /**
   * Check tool availability for a date range
   */
  async checkAvailability(
    toolId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<{
    available: boolean;
    conflicts: Array<{
      type: 'reservation' | 'maintenance';
      startDate: Date;
      endDate: Date;
      details: any;
    }>;
  }> {
    try {
      const tool = await prisma.tool.findUnique({
        where: { id: toolId },
        include: {
          reservations: {
            where: {
              status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_OUT'] },
              OR: [
                {
                  AND: [
                    { startDate: { lte: endDate } },
                    { endDate: { gte: startDate } }
                  ]
                }
              ]
            }
          },
          maintenanceRecords: {
            where: {
              status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
              OR: [
                {
                  AND: [
                    { scheduledDate: { lte: endDate } },
                    { 
                      OR: [
                        { completedDate: { gte: startDate } },
                        { completedDate: null }
                      ]
                    }
                  ]
                }
              ]
            }
          }
        }
      });

      if (!tool) {
        throw new Error('Tool not found');
      }

      const conflicts = [];

      // Check reservation conflicts
      for (const reservation of tool.reservations) {
        conflicts.push({
          type: 'reservation' as const,
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          details: {
            id: reservation.id,
            status: reservation.status,
            memberId: reservation.memberId
          }
        });
      }

      // Check maintenance conflicts
      for (const maintenance of tool.maintenanceRecords) {
        conflicts.push({
          type: 'maintenance' as const,
          startDate: maintenance.scheduledDate!,
          endDate: maintenance.completedDate || maintenance.scheduledDate!,
          details: {
            id: maintenance.id,
            type: maintenance.maintenanceType,
            status: maintenance.status
          }
        });
      }

      return {
        available: tool.isAvailable && conflicts.length === 0,
        conflicts
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      throw new Error('Failed to check availability');
    }
  }

  /**
   * Generate utilization report for tools
   */
  async generateUtilizationReport(
    startDate: Date,
    endDate: Date,
    toolIds?: string[]
  ): Promise<UtilizationReport[]> {
    try {
      const where: any = {};
      if (toolIds && toolIds.length > 0) {
        where.id = { in: toolIds };
      }

      const tools = await prisma.tool.findMany({
        where,
        include: {
          reservations: {
            where: {
              status: 'RETURNED',
              startDate: { gte: startDate },
              endDate: { lte: endDate }
            }
          },
          maintenanceRecords: {
            where: {
              status: 'COMPLETED',
              completedDate: {
                gte: startDate,
                lte: endDate
              }
            }
          }
        }
      });

      const reports: UtilizationReport[] = [];
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      for (const tool of tools) {
        const reservedDays = tool.reservations.reduce((total, reservation) => {
          const days = Math.ceil(
            (reservation.endDate.getTime() - reservation.startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return total + days;
        }, 0);

        const revenue = tool.reservations.reduce((total, reservation) => {
          return total + reservation.totalCost + reservation.lateFees;
        }, 0);

        const maintenanceCost = tool.maintenanceRecords.reduce((total, maintenance) => {
          return total + (maintenance.cost || 0);
        }, 0);

        const utilizationRate = totalDays > 0 ? (reservedDays / totalDays) * 100 : 0;
        const netRevenue = revenue - maintenanceCost;

        reports.push({
          toolId: tool.id,
          toolName: tool.name,
          category: tool.category,
          totalDays,
          reservedDays,
          utilizationRate,
          revenue,
          maintenanceCost,
          netRevenue
        });
      }

      return reports.sort((a, b) => b.utilizationRate - a.utilizationRate);
    } catch (error) {
      console.error('Error generating utilization report:', error);
      throw new Error('Failed to generate utilization report');
    }
  }

  /**
   * Process daily maintenance tasks
   */
  async processDailyTasks(): Promise<{
    lateFeesCalculated: number;
    maintenanceScheduled: number;
    overdueNotifications: number;
  }> {
    try {
      // Calculate late fees
      const lateFees = await this.calculateLateFees();
      
      // Schedule automatic maintenance
      const maintenanceSchedules = await this.scheduleAutomaticMaintenance();
      
      // Send overdue notifications
      const overdueReservations = await prisma.toolReservation.findMany({
        where: {
          status: 'CHECKED_OUT',
          endDate: { lt: new Date() }
        },
        include: {
          user: { select: { email: true, name: true } },
          tool: { select: { name: true } }
        }
      });

      // Trigger HubSpot workflows for overdue notifications
      for (const reservation of overdueReservations) {
        if (reservation.hubspotObjectId) {
          await this.hubspotService.triggerWorkflow('tool_overdue', reservation.hubspotObjectId);
        }
      }

      return {
        lateFeesCalculated: lateFees.length,
        maintenanceScheduled: maintenanceSchedules.length,
        overdueNotifications: overdueReservations.length
      };
    } catch (error) {
      console.error('Error processing daily tasks:', error);
      throw new Error('Failed to process daily tasks');
    }
  }
}