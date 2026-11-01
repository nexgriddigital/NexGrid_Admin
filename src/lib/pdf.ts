import { jsPDF } from 'jspdf';
import { Invoice, Quotation } from '../types';

export function generateInvoicePDF(invoice: Invoice, companyDetails?: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = 18;

  // Header background banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('NEXGRID DIGITAL SYSTEMS', margin, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Enterprise Digital Infrastructure • Cloud • Domains • Software', margin, 21);
  doc.text(
    `${companyDetails?.phone || '+251 91 123 4567'} | ${companyDetails?.email || 'billing@nexgrid.et'} | Addis Ababa, Ethiopia`,
    margin,
    26
  );

  // Document Title badge
  doc.setFillColor(37, 99, 235); // blue-600
  doc.roundedRect(pageWidth - margin - 44, 10, 44, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TAX INVOICE', pageWidth - margin - 37, 18);

  y = 42;

  // Invoice Details & Bill To columns
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BILLED TO:', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS:', pageWidth / 2 + 10, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(invoice.customerName || 'Customer', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600

  // Invoice info column
  doc.text(`Invoice Number: ${invoice.documentNumber}`, pageWidth / 2 + 10, y);
  y += 5;
  if (invoice.customerPhone) doc.text(`Phone: ${invoice.customerPhone}`, margin, y);
  doc.text(`Issue Date: ${invoice.issueDate}`, pageWidth / 2 + 10, y);
  y += 5;
  if (invoice.customerEmail) doc.text(`Email: ${invoice.customerEmail}`, margin, y);
  doc.text(`Due Date: ${invoice.dueDate}`, pageWidth / 2 + 10, y);
  y += 5;
  doc.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth / 2 + 10, y);

  y += 10;

  // Items Table Header
  const colX = {
    desc: margin,
    qty: 120,
    unit: 145,
    total: pageWidth - margin - 5,
  };

  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('ITEM / SERVICE DESCRIPTION', colX.desc + 2, y + 5.5);
  doc.text('QTY', colX.qty, y + 5.5, { align: 'center' });
  doc.text('UNIT PRICE', colX.unit, y + 5.5, { align: 'right' });
  doc.text('TOTAL', colX.total, y + 5.5, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  invoice.items.forEach((item, index) => {
    // Alternating rows
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');
    }

    doc.setTextColor(30, 41, 59);
    doc.text(item.description, colX.desc + 2, y);
    doc.text(String(item.quantity), colX.qty, y, { align: 'center' });
    doc.text(`${item.unitPrice.toLocaleString()} ${invoice.currency}`, colX.unit, y, { align: 'right' });
    doc.text(`${item.lineTotal.toLocaleString()} ${invoice.currency}`, colX.total, y, { align: 'right' });

    y += 7;
  });

  // Divider line
  y += 3;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Summary section
  const summaryX = pageWidth / 2 + 20;
  const summaryValX = pageWidth - margin - 5;

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', summaryX, y);
  doc.text(`${invoice.subtotal.toLocaleString()} ${invoice.currency}`, summaryValX, y, { align: 'right' });
  y += 5;

  if (invoice.discount > 0) {
    doc.text('Discount:', summaryX, y);
    doc.text(`-${invoice.discount.toLocaleString()} ${invoice.currency}`, summaryValX, y, { align: 'right' });
    y += 5;
  }

  if (invoice.taxRate > 0) {
    doc.text(`VAT (${invoice.taxRate}%):`, summaryX, y);
    doc.text(`${invoice.taxAmount.toLocaleString()} ${invoice.currency}`, summaryValX, y, { align: 'right' });
    y += 5;
  }

  // Total amount bold
  doc.setFillColor(241, 245, 249);
  doc.rect(summaryX - 4, y - 4, pageWidth - summaryX + 4 - margin, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Invoiced:', summaryX, y + 1.5);
  doc.text(`${invoice.totalAmount.toLocaleString()} ${invoice.currency}`, summaryValX, y + 1.5, { align: 'right' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text('Payments Received:', summaryX, y);
  doc.text(`${invoice.totalPaid.toLocaleString()} ${invoice.currency}`, summaryValX, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(invoice.balanceDue > 0 ? 220 : 16, invoice.balanceDue > 0 ? 38 : 185, invoice.balanceDue > 0 ? 38 : 129);
  doc.text('Balance Due:', summaryX, y);
  doc.text(`${invoice.balanceDue.toLocaleString()} ${invoice.currency}`, summaryValX, y, { align: 'right' });

  // Bank & Payment Instructions
  y += 14;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('PAYMENT INSTRUCTIONS & BANK ACCOUNTS:', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Commercial Bank of Ethiopia (CBE): 1000234890123 (NexGrid Digital Systems)', margin + 4, y + 12);
  doc.text('Awash Bank: 01320489123000 | Telebirr Merchant: 0911234567', margin + 4, y + 17);
  doc.text('Please quote invoice number on bank slip and share via billing@nexgrid.et or SMS/Telegram.', margin + 4, y + 22);

  // Terms and conditions
  y += 34;
  if (invoice.terms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('TERMS & CONDITIONS:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const splitTerms = doc.splitTextToSize(invoice.terms, pageWidth - margin * 2);
    doc.text(splitTerms, margin, y + 4);
  }

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `NexGrid Admin Portal • Generated on ${new Date().toLocaleDateString()} • Authorized Administrative Document`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  doc.save(`${invoice.documentNumber}.pdf`);
}

export function generateQuotationPDF(quotation: Quotation, companyDetails?: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = 18;

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('NEXGRID DIGITAL SYSTEMS', margin, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Enterprise Digital Infrastructure • Cloud • Domains • Software', margin, 21);
  doc.text(
    `${companyDetails?.phone || '+251 91 123 4567'} | ${companyDetails?.email || 'billing@nexgrid.et'} | Addis Ababa, Ethiopia`,
    margin,
    26
  );

  // Document Title badge
  doc.setFillColor(13, 148, 136); // teal-600
  doc.roundedRect(pageWidth - margin - 46, 10, 46, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('QUOTATION', pageWidth - margin - 37, 18);

  y = 42;

  // Customer & Quotation Info
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PROPOSAL PREPARED FOR:', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION DETAILS:', pageWidth / 2 + 10, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(quotation.customerName || 'Client', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  doc.text(`Quotation #: ${quotation.documentNumber}`, pageWidth / 2 + 10, y);
  y += 5;
  if (quotation.customerPhone) doc.text(`Phone: ${quotation.customerPhone}`, margin, y);
  doc.text(`Date Issued: ${quotation.issueDate}`, pageWidth / 2 + 10, y);
  y += 5;
  if (quotation.customerEmail) doc.text(`Email: ${quotation.customerEmail}`, margin, y);
  doc.text(`Valid Until: ${quotation.expiryDate}`, pageWidth / 2 + 10, y);
  y += 5;
  doc.text(`Status: ${quotation.status.toUpperCase()}`, pageWidth / 2 + 10, y);

  y += 10;

  // Items Table Header
  const colX = {
    desc: margin,
    qty: 120,
    unit: 145,
    total: pageWidth - margin - 5,
  };

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('PROPOSED SCOPE / SPECIFICATION', colX.desc + 2, y + 5.5);
  doc.text('QTY', colX.qty, y + 5.5, { align: 'center' });
  doc.text('UNIT PRICE', colX.unit, y + 5.5, { align: 'right' });
  doc.text('TOTAL', colX.total, y + 5.5, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  quotation.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');
    }

    doc.setTextColor(30, 41, 59);
    doc.text(item.description, colX.desc + 2, y);
    doc.text(String(item.quantity), colX.qty, y, { align: 'center' });
    doc.text(`${item.unitPrice.toLocaleString()} ${quotation.currency}`, colX.unit, y, { align: 'right' });
    doc.text(`${item.lineTotal.toLocaleString()} ${quotation.currency}`, colX.total, y, { align: 'right' });

    y += 7;
  });

  // Summary section
  y += 3;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const summaryX = pageWidth / 2 + 20;
  const summaryValX = pageWidth - margin - 5;

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', summaryX, y);
  doc.text(`${quotation.subtotal.toLocaleString()} ${quotation.currency}`, summaryValX, y, { align: 'right' });
  y += 5;

  if (quotation.discount > 0) {
    doc.text('Discount:', summaryX, y);
    doc.text(`-${quotation.discount.toLocaleString()} ${quotation.currency}`, summaryValX, y, { align: 'right' });
    y += 5;
  }

  if (quotation.taxRate > 0) {
    doc.text(`VAT (${quotation.taxRate}%):`, summaryX, y);
    doc.text(`${quotation.taxAmount.toLocaleString()} ${quotation.currency}`, summaryValX, y, { align: 'right' });
    y += 5;
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(summaryX - 4, y - 4, pageWidth - summaryX + 4 - margin, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Proposed Price:', summaryX, y + 1.5);
  doc.text(`${quotation.totalAmount.toLocaleString()} ${quotation.currency}`, summaryValX, y + 1.5, { align: 'right' });

  y += 16;
  if (quotation.terms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('TERMS & VALIDITY:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const splitTerms = doc.splitTextToSize(quotation.terms, pageWidth - margin * 2);
    doc.text(splitTerms, margin, y + 4);
  }

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `NexGrid Admin Portal • Generated on ${new Date().toLocaleDateString()} • Official Service Quotation`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  doc.save(`${quotation.documentNumber}.pdf`);
}
