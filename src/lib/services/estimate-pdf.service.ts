/**
 * Estimate PDF Generation Service
 * 
 * Generates professional PDF estimates for construction projects
 * with detailed breakdowns, charts, and branding
 */

import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { ConstructionProject, ConstructionEstimate } from '@/types/construction-project.types'

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
    lastAutoTable: {
      finalY: number
    }
  }
}

export class EstimatePDFService {
  private readonly primaryColor = '#FFC107' // NAMC Yellow
  private readonly secondaryColor = '#1F2937' // Dark Gray
  private readonly accentColor = '#3B82F6' // Blue
  
  /**
   * Generate PDF estimate document
   */
  async generateEstimatePDF(
    project: ConstructionProject,
    estimate: ConstructionEstimate,
    companyInfo?: {
      name: string
      logo?: string
      address?: string
      phone?: string
      email?: string
      license?: string
    }
  ): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    // Add metadata
    doc.setProperties({
      title: `Estimate - ${project.title}`,
      subject: 'Construction Cost Estimate',
      author: companyInfo?.name || 'NAMC Member',
      keywords: 'construction, estimate, quote',
      creator: 'NAMC Member Portal'
    })
    
    // Page 1: Cover Page
    this.addCoverPage(doc, project, estimate, companyInfo)
    
    // Page 2: Executive Summary
    doc.addPage()
    this.addExecutiveSummary(doc, project, estimate)
    
    // Page 3: Detailed Cost Breakdown
    doc.addPage()
    this.addCostBreakdown(doc, estimate)
    
    // Page 4: Materials Detail
    doc.addPage()
    this.addMaterialsDetail(doc, estimate)
    
    // Page 5: Labor Detail
    doc.addPage()
    this.addLaborDetail(doc, estimate)
    
    // Page 6: Timeline & Milestones
    doc.addPage()
    this.addTimelineSection(doc, project, estimate)
    
    // Page 7: Terms & Conditions
    doc.addPage()
    this.addTermsAndConditions(doc, estimate)
    
    // Page 8: Signature Page
    doc.addPage()
    this.addSignaturePage(doc, project, companyInfo)
    
    // Add page numbers
    this.addPageNumbers(doc)
    
    // Return as blob
    return doc.output('blob')
  }
  
  /**
   * Add cover page
   */
  private addCoverPage(
    doc: jsPDF,
    project: ConstructionProject,
    estimate: ConstructionEstimate,
    companyInfo?: any
  ) {
    // Background color
    doc.setFillColor(245, 245, 245)
    doc.rect(0, 0, 210, 297, 'F')
    
    // Company logo/name
    if (companyInfo?.logo) {
      // Add logo image
      // doc.addImage(companyInfo.logo, 'PNG', 20, 20, 40, 20)
    } else {
      doc.setFontSize(24)
      doc.setTextColor(this.secondaryColor)
      doc.text(companyInfo?.name || 'NAMC Member Contractor', 105, 30, { align: 'center' })
    }
    
    // Title
    doc.setFontSize(32)
    doc.setTextColor(this.primaryColor)
    doc.text('CONSTRUCTION', 105, 80, { align: 'center' })
    doc.text('ESTIMATE', 105, 95, { align: 'center' })
    
    // Project info box
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(20, 120, 170, 80, 5, 5, 'F')
    
    doc.setFontSize(16)
    doc.setTextColor(this.secondaryColor)
    doc.text('PROJECT:', 30, 135)
    doc.setFontSize(14)
    doc.text(project.title, 30, 145)
    
    doc.setFontSize(12)
    doc.text(`Client: ${project.client.companyName}`, 30, 155)
    doc.text(`Location: ${project.location.city}, ${project.location.state}`, 30, 165)
    doc.text(`Type: ${this.formatProjectType(project.category)}`, 30, 175)
    doc.text(`Size: ${project.specifications.squareFootage?.toLocaleString()} sq ft`, 30, 185)
    
    // Estimate info
    doc.setFillColor(this.primaryColor)
    doc.rect(20, 210, 170, 40, 'F')
    
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL ESTIMATE', 105, 225, { align: 'center' })
    doc.setFontSize(28)
    doc.text(`$${estimate.costBreakdown.total.toLocaleString()}`, 105, 240, { align: 'center' })
    
    // Footer
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Estimate #: ${estimate.id}`, 30, 270)
    doc.text(`Date: ${new Date(estimate.createdAt).toLocaleDateString()}`, 30, 275)
    doc.text(`Valid Until: ${new Date(estimate.validUntil).toLocaleDateString()}`, 30, 280)
  }
  
  /**
   * Add executive summary
   */
  private addExecutiveSummary(doc: jsPDF, project: ConstructionProject, estimate: ConstructionEstimate) {
    this.addHeader(doc, 'EXECUTIVE SUMMARY')
    
    let yPos = 50
    
    // Project Overview
    doc.setFontSize(14)
    doc.setTextColor(this.secondaryColor)
    doc.text('Project Overview', 20, yPos)
    
    doc.setFontSize(11)
    doc.setTextColor(60, 60, 60)
    const description = doc.splitTextToSize(project.description, 170)
    doc.text(description, 20, yPos + 8)
    yPos += 8 + (description.length * 5)
    
    // Cost Summary Table
    yPos += 10
    doc.setFontSize(14)
    doc.setTextColor(this.secondaryColor)
    doc.text('Cost Summary', 20, yPos)
    yPos += 10
    
    const summaryData = [
      ['Direct Costs', ''],
      ['  Materials', `$${estimate.costBreakdown.materials.reduce((sum, m) => sum + m.subtotal, 0).toLocaleString()}`],
      ['  Labor', `$${estimate.costBreakdown.labor.reduce((sum, l) => sum + l.total, 0).toLocaleString()}`],
      ['  Equipment', `$${estimate.costBreakdown.equipment.reduce((sum, e) => sum + e.total, 0).toLocaleString()}`],
      ['  Subcontractors', `$${estimate.costBreakdown.subcontractors.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}`],
      ['Indirect Costs', ''],
      ['  Permits & Fees', `$${estimate.costBreakdown.permits.toLocaleString()}`],
      ['  Insurance', `$${estimate.costBreakdown.insurance.toLocaleString()}`],
      ['  Bonding', `$${estimate.costBreakdown.bonding.toLocaleString()}`],
      ['  Overhead', `$${estimate.costBreakdown.overhead.toLocaleString()}`],
      ['', ''],
      ['Subtotal', `$${estimate.costBreakdown.subtotal.toLocaleString()}`],
      ['Contingency (10%)', `$${estimate.costBreakdown.contingency.toLocaleString()}`],
      ['Profit Margin (15%)', `$${estimate.costBreakdown.profitMargin.toLocaleString()}`],
      ['', ''],
      ['TOTAL ESTIMATE', `$${estimate.costBreakdown.total.toLocaleString()}`]
    ]
    
    doc.autoTable({
      startY: yPos,
      head: [],
      body: summaryData,
      theme: 'plain',
      styles: {
        fontSize: 11,
        cellPadding: 3
      },
      columnStyles: {
        0: { fontStyle: 'normal' },
        1: { halign: 'right', fontStyle: 'normal' }
      },
      didParseCell: (data: any) => {
        if (data.row.index === summaryData.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fontSize = 13
          data.cell.styles.fillColor = [255, 193, 7]
        }
      }
    })
    
    // AI Confidence Score
    yPos = doc.lastAutoTable.finalY + 15
    doc.setFontSize(12)
    doc.setTextColor(this.secondaryColor)
    doc.text('Estimate Confidence Score:', 20, yPos)
    
    // Draw confidence meter
    const meterWidth = 100
    const meterHeight = 10
    const confidence = estimate.aiAnalysis.confidence
    
    doc.setDrawColor(200, 200, 200)
    doc.rect(80, yPos - 8, meterWidth, meterHeight)
    
    const fillColor = confidence > 80 ? [76, 175, 80] : confidence > 60 ? [255, 193, 7] : [244, 67, 54]
    doc.setFillColor(...fillColor)
    doc.rect(80, yPos - 8, (meterWidth * confidence) / 100, meterHeight, 'F')
    
    doc.text(`${confidence}%`, 185, yPos)
  }
  
  /**
   * Add detailed cost breakdown
   */
  private addCostBreakdown(doc: jsPDF, estimate: ConstructionEstimate) {
    this.addHeader(doc, 'DETAILED COST BREAKDOWN')
    
    let yPos = 50
    
    // Cost breakdown pie chart placeholder
    doc.setFontSize(12)
    doc.setTextColor(this.secondaryColor)
    doc.text('Cost Distribution', 105, yPos, { align: 'center' })
    
    // Draw simple pie chart representation
    const centerX = 105
    const centerY = yPos + 30
    const radius = 25
    
    // Calculate percentages
    const total = estimate.costBreakdown.subtotal
    const materialsPct = (estimate.costBreakdown.materials.reduce((sum, m) => sum + m.subtotal, 0) / total) * 100
    const laborPct = (estimate.costBreakdown.labor.reduce((sum, l) => sum + l.total, 0) / total) * 100
    const equipmentPct = (estimate.costBreakdown.equipment.reduce((sum, e) => sum + e.total, 0) / total) * 100
    const subcontractorPct = (estimate.costBreakdown.subcontractors.reduce((sum, s) => sum + s.amount, 0) / total) * 100
    
    // Legend
    yPos += 70
    const legendItems = [
      { label: 'Materials', value: materialsPct, color: [59, 130, 246] },
      { label: 'Labor', value: laborPct, color: [34, 197, 94] },
      { label: 'Equipment', value: equipmentPct, color: [251, 146, 60] },
      { label: 'Subcontractors', value: subcontractorPct, color: [147, 51, 234] }
    ]
    
    legendItems.forEach((item, index) => {
      doc.setFillColor(...item.color)
      doc.rect(60, yPos + (index * 8), 5, 5, 'F')
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.text(`${item.label}: ${item.value.toFixed(1)}%`, 68, yPos + (index * 8) + 4)
    })
    
    // Adjustments section
    yPos += 50
    doc.setFontSize(14)
    doc.setTextColor(this.secondaryColor)
    doc.text('Cost Adjustments Applied', 20, yPos)
    
    yPos += 10
    const adjustments = [
      ['Regional Adjustment', `${estimate.regionalAdjustment > 0 ? '+' : ''}${estimate.regionalAdjustment.toFixed(1)}%`],
      ['Seasonal Adjustment', `${estimate.seasonalAdjustment > 0 ? '+' : ''}${estimate.seasonalAdjustment.toFixed(1)}%`],
      ['Complexity Factor', `×${estimate.complexityFactor.toFixed(2)}`]
    ]
    
    doc.autoTable({
      startY: yPos,
      head: [],
      body: adjustments,
      theme: 'plain',
      styles: {
        fontSize: 11,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { halign: 'right', fontStyle: 'bold' }
      }
    })
  }
  
  /**
   * Add materials detail
   */
  private addMaterialsDetail(doc: jsPDF, estimate: ConstructionEstimate) {
    this.addHeader(doc, 'MATERIALS BREAKDOWN')
    
    let yPos = 50
    
    estimate.costBreakdown.materials.forEach((category) => {
      doc.setFontSize(12)
      doc.setTextColor(this.secondaryColor)
      doc.text(category.category, 20, yPos)
      yPos += 8
      
      const tableData = category.items.map(item => [
        item.name,
        `${item.quantity} ${item.unit}`,
        `$${item.unitCost.toFixed(2)}`,
        `$${item.totalCost.toLocaleString()}`
      ])
      
      tableData.push(['', '', 'Subtotal:', `$${category.subtotal.toLocaleString()}`])
      
      doc.autoTable({
        startY: yPos,
        head: [['Item', 'Quantity', 'Unit Cost', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [255, 193, 7],
          textColor: [31, 41, 55],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' }
        },
        didParseCell: (data: any) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold'
          }
        }
      })
      
      yPos = doc.lastAutoTable.finalY + 10
      
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage()
        this.addHeader(doc, 'MATERIALS BREAKDOWN (CONTINUED)')
        yPos = 50
      }
    })
  }
  
  /**
   * Add labor detail
   */
  private addLaborDetail(doc: jsPDF, estimate: ConstructionEstimate) {
    this.addHeader(doc, 'LABOR BREAKDOWN')
    
    const tableData = estimate.costBreakdown.labor.map(trade => [
      trade.trade,
      trade.workers.toString(),
      `${trade.hours} hrs`,
      `$${trade.rate}/hr`,
      `$${trade.total.toLocaleString()}`
    ])
    
    const totalLabor = estimate.costBreakdown.labor.reduce((sum, l) => sum + l.total, 0)
    tableData.push(['', '', '', 'Total:', `$${totalLabor.toLocaleString()}`])
    
    doc.autoTable({
      startY: 50,
      head: [['Trade', 'Workers', 'Hours', 'Rate', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [255, 193, 7],
        textColor: [31, 41, 55],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 11,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      didParseCell: (data: any) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fontSize = 12
        }
      }
    })
    
    // Equipment section
    let yPos = doc.lastAutoTable.finalY + 20
    doc.setFontSize(16)
    doc.setTextColor(this.secondaryColor)
    doc.text('EQUIPMENT COSTS', 20, yPos)
    yPos += 10
    
    const equipmentData = estimate.costBreakdown.equipment.map(item => [
      item.name,
      item.type,
      `${item.duration} ${item.unit}s`,
      `$${item.rate}/${item.unit}`,
      `$${item.total.toLocaleString()}`
    ])
    
    const totalEquipment = estimate.costBreakdown.equipment.reduce((sum, e) => sum + e.total, 0)
    equipmentData.push(['', '', '', 'Total:', `$${totalEquipment.toLocaleString()}`])
    
    doc.autoTable({
      startY: yPos,
      head: [['Equipment', 'Type', 'Duration', 'Rate', 'Total']],
      body: equipmentData,
      theme: 'striped',
      headStyles: {
        fillColor: [255, 193, 7],
        textColor: [31, 41, 55],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 11,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    })
  }
  
  /**
   * Add timeline section
   */
  private addTimelineSection(doc: jsPDF, project: ConstructionProject, estimate: ConstructionEstimate) {
    this.addHeader(doc, 'PROJECT TIMELINE')
    
    let yPos = 50
    
    // Project duration
    doc.setFontSize(12)
    doc.setTextColor(this.secondaryColor)
    const startDate = new Date(project.timeline.estimatedStartDate)
    const endDate = new Date(project.timeline.estimatedEndDate)
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    doc.text(`Estimated Start: ${startDate.toLocaleDateString()}`, 20, yPos)
    doc.text(`Estimated Completion: ${endDate.toLocaleDateString()}`, 120, yPos)
    yPos += 8
    doc.text(`Total Duration: ${duration} days`, 20, yPos)
    doc.text(`Weather Contingency: ${project.timeline.weatherDays} days`, 120, yPos)
    
    // Key milestones
    yPos += 15
    doc.setFontSize(14)
    doc.text('Key Milestones', 20, yPos)
    yPos += 10
    
    const milestoneData = project.timeline.milestones.slice(0, 8).map(milestone => [
      milestone.name,
      new Date(milestone.targetDate).toLocaleDateString(),
      milestone.isCritical ? 'Yes' : 'No'
    ])
    
    doc.autoTable({
      startY: yPos,
      head: [['Milestone', 'Target Date', 'Critical Path']],
      body: milestoneData,
      theme: 'striped',
      headStyles: {
        fillColor: [255, 193, 7],
        textColor: [31, 41, 55],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 11,
        cellPadding: 3
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' }
      }
    })
    
    // Risks section
    yPos = doc.lastAutoTable.finalY + 20
    doc.setFontSize(14)
    doc.setTextColor(this.secondaryColor)
    doc.text('Identified Risks', 20, yPos)
    yPos += 10
    
    const topRisks = estimate.aiAnalysis.risks.slice(0, 5)
    topRisks.forEach((risk, index) => {
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      doc.text(`${index + 1}. ${risk.description}`, 25, yPos)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Probability: ${risk.probability} | Impact: ${risk.impact}`, 30, yPos + 5)
      if (risk.mitigation) {
        doc.text(`Mitigation: ${risk.mitigation}`, 30, yPos + 10)
        yPos += 5
      }
      yPos += 15
    })
  }
  
  /**
   * Add terms and conditions
   */
  private addTermsAndConditions(doc: jsPDF, estimate: ConstructionEstimate) {
    this.addHeader(doc, 'TERMS & CONDITIONS')
    
    const terms = [
      'PAYMENT TERMS',
      '• 20% deposit required upon contract signing',
      '• Progress payments based on completed milestones',
      '• Final payment due within 30 days of project completion',
      '• 2% monthly interest on overdue payments',
      '',
      'SCOPE OF WORK',
      '• This estimate includes all materials, labor, and equipment as detailed',
      '• Changes to scope will require written change orders',
      '• Additional work will be billed at standard rates',
      '',
      'VALIDITY',
      `• This estimate is valid until ${new Date(estimate.validUntil).toLocaleDateString()}`,
      '• Prices subject to change after expiration',
      '• Material prices locked upon contract signing',
      '',
      'EXCLUSIONS',
      '• Permit fees are estimates only - actual fees may vary',
      '• Does not include furniture, fixtures, or equipment (FF&E)',
      '• Site conditions assumed to be normal - rock/hazmat extra',
      '',
      'WARRANTY',
      '• One year warranty on all workmanship',
      '• Manufacturer warranties on all materials',
      '• Warranty begins upon substantial completion',
      '',
      'INSURANCE & LICENSING',
      '• Contractor maintains general liability insurance',
      '• Workers compensation coverage for all employees',
      '• All work performed by licensed professionals'
    ]
    
    let yPos = 50
    doc.setFontSize(10)
    
    terms.forEach(line => {
      if (line === '') {
        yPos += 5
      } else if (line.startsWith('•')) {
        doc.setTextColor(80, 80, 80)
        doc.text(line, 25, yPos)
        yPos += 6
      } else {
        doc.setTextColor(this.secondaryColor)
        doc.setFontSize(11)
        doc.text(line, 20, yPos)
        doc.setFontSize(10)
        yPos += 8
      }
      
      if (yPos > 270) {
        doc.addPage()
        this.addHeader(doc, 'TERMS & CONDITIONS (CONTINUED)')
        yPos = 50
      }
    })
  }
  
  /**
   * Add signature page
   */
  private addSignaturePage(doc: jsPDF, project: ConstructionProject, companyInfo?: any) {
    this.addHeader(doc, 'ACCEPTANCE & AUTHORIZATION')
    
    let yPos = 60
    
    doc.setFontSize(12)
    doc.setTextColor(60, 60, 60)
    const acceptanceText = 'By signing below, the client acknowledges receipt of this estimate and agrees to the terms and conditions outlined herein. This signature authorizes the commencement of work upon receipt of the required deposit.'
    const splitText = doc.splitTextToSize(acceptanceText, 170)
    doc.text(splitText, 20, yPos)
    
    yPos += splitText.length * 5 + 20
    
    // Client signature section
    doc.setFontSize(11)
    doc.setTextColor(this.secondaryColor)
    doc.text('CLIENT ACCEPTANCE', 20, yPos)
    yPos += 15
    
    doc.setDrawColor(200, 200, 200)
    doc.line(20, yPos, 90, yPos)
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('Signature', 20, yPos + 5)
    
    doc.line(110, yPos, 180, yPos)
    doc.text('Date', 110, yPos + 5)
    
    yPos += 20
    doc.line(20, yPos, 90, yPos)
    doc.text('Print Name', 20, yPos + 5)
    
    doc.line(110, yPos, 180, yPos)
    doc.text('Title', 110, yPos + 5)
    
    // Contractor signature section
    yPos += 30
    doc.setFontSize(11)
    doc.setTextColor(this.secondaryColor)
    doc.text('CONTRACTOR', 20, yPos)
    yPos += 15
    
    doc.line(20, yPos, 90, yPos)
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('Authorized Signature', 20, yPos + 5)
    
    doc.line(110, yPos, 180, yPos)
    doc.text('Date', 110, yPos + 5)
    
    yPos += 20
    doc.line(20, yPos, 90, yPos)
    doc.text(companyInfo?.name || 'Company Name', 20, yPos + 5)
    
    doc.line(110, yPos, 180, yPos)
    doc.text(`License #: ${companyInfo?.license || 'XXXXXXXX'}`, 110, yPos + 5)
    
    // Contact information
    yPos += 30
    doc.setFillColor(245, 245, 245)
    doc.rect(20, yPos, 170, 40, 'F')
    
    yPos += 10
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text('For questions about this estimate, please contact:', 105, yPos, { align: 'center' })
    yPos += 8
    doc.text(companyInfo?.phone || '(555) 123-4567', 105, yPos, { align: 'center' })
    yPos += 6
    doc.text(companyInfo?.email || 'estimates@contractor.com', 105, yPos, { align: 'center' })
  }
  
  /**
   * Add header to page
   */
  private addHeader(doc: jsPDF, title: string) {
    doc.setFillColor(this.primaryColor)
    doc.rect(0, 0, 210, 30, 'F')
    
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.text(title, 105, 20, { align: 'center' })
  }
  
  /**
   * Add page numbers
   */
  private addPageNumbers(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(10)
      doc.setTextColor(150, 150, 150)
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' })
    }
  }
  
  /**
   * Format project type
   */
  private formatProjectType(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }
  
  /**
   * Generate estimate email template
   */
  generateEmailTemplate(
    project: ConstructionProject,
    estimate: ConstructionEstimate,
    recipientName: string
  ): { subject: string; body: string } {
    const subject = `Construction Estimate - ${project.title}`
    
    const body = `
Dear ${recipientName},

Thank you for considering us for your ${this.formatProjectType(project.category)} project. We are pleased to provide you with a detailed estimate for "${project.title}".

PROJECT SUMMARY:
• Location: ${project.location.city}, ${project.location.state}
• Size: ${project.specifications.squareFootage?.toLocaleString()} sq ft
• Estimated Duration: ${Math.ceil((new Date(project.timeline.estimatedEndDate).getTime() - new Date(project.timeline.estimatedStartDate).getTime()) / (1000 * 60 * 60 * 24))} days
• Total Estimate: $${estimate.costBreakdown.total.toLocaleString()}

COST BREAKDOWN:
• Materials: $${estimate.costBreakdown.materials.reduce((sum, m) => sum + m.subtotal, 0).toLocaleString()}
• Labor: $${estimate.costBreakdown.labor.reduce((sum, l) => sum + l.total, 0).toLocaleString()}
• Equipment: $${estimate.costBreakdown.equipment.reduce((sum, e) => sum + e.total, 0).toLocaleString()}
• Subcontractors: $${estimate.costBreakdown.subcontractors.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}

This estimate includes a ${(estimate.costBreakdown.contingency / estimate.costBreakdown.subtotal * 100).toFixed(0)}% contingency for unforeseen conditions and is valid until ${new Date(estimate.validUntil).toLocaleDateString()}.

The attached PDF contains a comprehensive breakdown of all costs, project timeline, and terms & conditions.

We are confident in our ability to deliver this project on time and within budget. Our estimate confidence score for this project is ${estimate.aiAnalysis.confidence}%.

Next Steps:
1. Review the attached detailed estimate
2. Schedule a meeting to discuss any questions
3. Sign and return the estimate with deposit to begin work

We look forward to the opportunity to work with you on this project.

Best regards,
[Your Name]
[Your Company]
[Phone Number]
[Email]

This estimate was generated through the NAMC Member Portal with AI-powered cost analysis.
    `.trim()
    
    return { subject, body }
  }
}

// Export singleton instance
export const estimatePDFService = new EstimatePDFService()