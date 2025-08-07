import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { format } = await request.json();
    const estimateId = params.id;

    // Retrieve estimate from database
    const estimate = await prisma.costEstimate.findFirst({
      where: {
        id: estimateId,
        memberId: session.user.id
      },
      include: {
        rsMeansCache: true
      }
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    if (format === 'pdf') {
      const pdfBuffer = await generatePDF(estimate);
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="cost-estimate-${estimateId}.pdf"`
        }
      });
    } else if (format === 'excel') {
      const excelBuffer = await generateExcel(estimate);
      
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="cost-estimate-${estimateId}.xlsx"`
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export estimate' },
      { status: 500 }
    );
  }
}

async function generatePDF(estimate: any): Promise<Buffer> {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('NAMC Cost Estimate', 20, 30);
  
  doc.setFontSize(12);
  doc.text(`Project: ${estimate.projectName}`, 20, 50);
  doc.text(`Date: ${new Date(estimate.createdAt).toLocaleDateString()}`, 20, 60);
  doc.text(`Estimate ID: ${estimate.id}`, 20, 70);
  
  // Summary
  doc.setFontSize(16);
  doc.text('Cost Summary', 20, 90);
  
  doc.setFontSize(12);
  let yPos = 110;
  
  const summaryItems = [
    ['Materials:', `$${estimate.materialCost?.toLocaleString() || '0'}`],
    ['Labor:', `$${estimate.laborCost?.toLocaleString() || '0'}`],
    ['Equipment:', `$${estimate.equipmentCost?.toLocaleString() || '0'}`],
    ['Subtotal:', `$${estimate.subtotalCost?.toLocaleString() || '0'}`],
    ['Overhead:', `$${estimate.overheadCost?.toLocaleString() || '0'}`],
    ['Profit:', `$${estimate.profitCost?.toLocaleString() || '0'}`],
    ['Total:', `$${estimate.totalCost?.toLocaleString() || '0'}`]
  ];
  
  summaryItems.forEach(([label, value]) => {
    doc.text(label, 20, yPos);
    doc.text(value, 120, yPos);
    yPos += 10;
  });
  
  // Confidence and notes
  yPos += 10;
  doc.text(`Confidence Score: ${estimate.confidenceScore || 'N/A'}%`, 20, yPos);
  yPos += 10;
  
  if (estimate.notes) {
    doc.text('Notes:', 20, yPos);
    yPos += 10;
    const splitNotes = doc.splitTextToSize(estimate.notes, 170);
    doc.text(splitNotes, 20, yPos);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

async function generateExcel(estimate: any): Promise<Buffer> {
  const workbook = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['NAMC Cost Estimate'],
    [''],
    ['Project:', estimate.projectName],
    ['Date:', new Date(estimate.createdAt).toLocaleDateString()],
    ['Estimate ID:', estimate.id],
    [''],
    ['Cost Breakdown'],
    ['Materials', estimate.materialCost || 0],
    ['Labor', estimate.laborCost || 0],
    ['Equipment', estimate.equipmentCost || 0],
    ['Subtotal', estimate.subtotalCost || 0],
    ['Overhead', estimate.overheadCost || 0],
    ['Profit', estimate.profitCost || 0],
    ['Total', estimate.totalCost || 0],
    [''],
    ['Confidence Score', `${estimate.confidenceScore || 'N/A'}%`]
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Detailed items sheet if available
  if (estimate.rsMeansCache && estimate.rsMeansCache.length > 0) {
    const itemsData = [
      ['Item Code', 'Description', 'Unit', 'Material Cost', 'Labor Cost', 'Equipment Cost', 'Total Cost']
    ];
    
    estimate.rsMeansCache.forEach((item: any) => {
      itemsData.push([
        item.itemCode,
        item.description,
        item.unit,
        item.materialCost,
        item.laborCost,
        item.equipmentCost,
        item.totalCost
      ]);
    });
    
    const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Detailed Items');
  }
  
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}