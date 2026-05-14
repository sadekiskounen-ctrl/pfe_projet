// ============================================================
// PDF Generator — Devis & Factures
// Uses PDFKit for server-side PDF generation
// ============================================================

'use strict';

const PDFDocument = require('pdfkit');

/**
 * Generate a Devis PDF buffer
 * @param {Object} devis - Devis entity with expanded items and client
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateDevisPDF(devis) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Header ──
    _drawHeader(doc, 'DEVIS', devis.devisNumber);

    // ── Client Info ──
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#333333');
    doc.text('CLIENT', { underline: true });
    doc.text(devis.clientB2B?.companyName || devis.clientB2C?.fullName || '');
    doc.text(`Email: ${devis.clientB2B?.email || devis.clientB2C?.email || ''}`);
    doc.text(`Téléphone: ${devis.clientB2B?.phone || devis.clientB2C?.phone || ''}`);
    if (devis.clientB2B?.rc) doc.text(`RC: ${devis.clientB2B.rc}`);

    // ── Document Info ──
    doc.moveDown();
    doc.text(`Date: ${_formatDate(devis.date)}`);
    doc.text(`Valable jusqu'au: ${_formatDate(devis.validUntil)}`);
    doc.text(`Statut: ${devis.status}`);

    // ── Items Table ──
    doc.moveDown();
    _drawItemsTable(doc, devis.items || []);

    // ── Totals ──
    doc.moveDown();
    _drawTotals(doc, devis);

    // ── Footer ──
    _drawFooter(doc);

    doc.end();
  });
}

/**
 * Generate a Facture PDF buffer
 * @param {Object} facture - FactureClient entity with expanded items and client
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateFacturePDF(facture) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Header ──
    _drawHeader(doc, 'FACTURE', facture.invoiceNumber);

    // ── Client Info ──
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#333333');
    doc.text('CLIENT', { underline: true });
    doc.text(facture.clientB2B?.companyName || facture.clientB2C?.fullName || '');
    doc.text(`Email: ${facture.clientB2B?.email || facture.clientB2C?.email || ''}`);
    if (facture.clientB2B?.rc) doc.text(`RC: ${facture.clientB2B.rc}`);
    if (facture.clientB2B?.nif) doc.text(`NIF: ${facture.clientB2B.nif}`);

    // ── Document Info ──
    doc.moveDown();
    doc.text(`Date de facturation: ${_formatDate(facture.date)}`);
    doc.text(`Date d'échéance: ${_formatDate(facture.dueDate)}`);
    doc.text(`Statut: ${facture.status}`);
    doc.text(`Montant payé: ${_formatAmount(facture.paidAmount)} ${facture.currency_code}`);
    doc.text(`Reste à payer: ${_formatAmount(facture.remainingAmount)} ${facture.currency_code}`);

    // ── Items Table ──
    doc.moveDown();
    _drawItemsTable(doc, facture.items || []);

    // ── Totals ──
    doc.moveDown();
    _drawTotals(doc, facture);

    // ── Timbre fiscal ──
    if (facture.timbreFiscal) {
      const x = 350;
      let y = doc.y;
      doc.fontSize(9).fillColor('#333333');
      doc.text('Timbre Fiscal:', x, y);
      doc.text(`${_formatAmount(facture.timbreFiscal)} DZD`, x + 100, y, { align: 'right', width: 100 });
    }

    // ── Mentions légales ──
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#888888');
    doc.text('Mode de règlement: Virement bancaire / Chèque / CCP');
    doc.text('En cas de litige, le tribunal d\'Alger est seul compétent.');

    // ── Footer ──
    _drawFooter(doc);

    doc.end();
  });
}

// ── Private Helpers ──

function _drawHeader(doc, type, number) {
  // Company info (top left)
  doc.fontSize(18).fillColor('#1a3a5c').font('Helvetica-Bold');
  doc.text('GESTION PME', 50, 50);
  doc.fontSize(9).fillColor('#666666').font('Helvetica');
  doc.text('Solution de Gestion Cloud');
  doc.text('contact@gestionpme.dz | +213 21 00 00 00');

  // Document type (top right)
  doc.fontSize(24).fillColor('#1a3a5c').font('Helvetica-Bold');
  doc.text(type, 350, 50, { align: 'right', width: 200 });
  doc.fontSize(12).fillColor('#333333').font('Helvetica');
  doc.text(`N° ${number}`, 350, 80, { align: 'right', width: 200 });

  // Horizontal line
  doc.moveDown(2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1a3a5c').lineWidth(2).stroke();
}

function _drawItemsTable(doc, items) {
  // Table header
  const startY = doc.y + 10;
  doc.rect(50, startY, 495, 20).fill('#1a3a5c');
  doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold');
  doc.text('Description', 55, startY + 5, { width: 200 });
  doc.text('Qté', 260, startY + 5, { width: 50, align: 'right' });
  doc.text('P.U. HT', 315, startY + 5, { width: 70, align: 'right' });
  doc.text('TVA%', 390, startY + 5, { width: 40, align: 'right' });
  doc.text('Total TTC', 435, startY + 5, { width: 110, align: 'right' });

  // Table rows
  let rowY = startY + 22;
  doc.font('Helvetica').fillColor('#333333');

  (items || []).forEach((item, idx) => {
    const bg = idx % 2 === 0 ? '#f5f7fa' : '#ffffff';
    doc.rect(50, rowY, 495, 18).fill(bg);

    doc.fontSize(8).fillColor('#333333');
    doc.text(item.description || '', 55, rowY + 4, { width: 200 });
    doc.text(String(item.quantity || 0), 260, rowY + 4, { width: 50, align: 'right' });
    doc.text(_formatAmount(item.unitPrice), 315, rowY + 4, { width: 70, align: 'right' });
    doc.text(`${item.tvaRate || 19}%`, 390, rowY + 4, { width: 40, align: 'right' });
    doc.text(_formatAmount(item.totalTTC), 435, rowY + 4, { width: 110, align: 'right' });

    rowY += 20;
  });

  // Bottom border
  doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#cccccc').lineWidth(1).stroke();
  doc.y = rowY + 5;
}

function _drawTotals(doc, data) {
  const x = 350;
  let y = doc.y + 10;

  doc.fontSize(9).font('Helvetica');

  // HT
  doc.fillColor('#333333').text('Total HT:', x, y);
  doc.text(`${_formatAmount(data.totalHT)} ${data.currency_code || 'DZD'}`, x + 100, y, { align: 'right', width: 100 });

  // TVA
  y += 16;
  doc.text('TVA (19%):', x, y);
  doc.text(`${_formatAmount(data.totalTVA)} ${data.currency_code || 'DZD'}`, x + 100, y, { align: 'right', width: 100 });

  // TTC
  y += 16;
  doc.rect(x - 5, y - 3, 205, 20).fill('#1a3a5c');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('TOTAL TTC:', x, y + 2);
  doc.text(`${_formatAmount(data.totalTTC)} ${data.currency_code || 'DZD'}`, x + 100, y + 2, { align: 'right', width: 100 });

  doc.y = y + 30;
}

function _drawFooter(doc) {
  doc.fontSize(8).fillColor('#888888').font('Helvetica');
  const footerY = 780;
  doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).strokeColor('#cccccc').lineWidth(0.5).stroke();
  doc.text('Gestion PME — Solution Cloud | contact@gestionpme.dz | RC: 16/00-0000000A25', 50, footerY, {
    align: 'center', width: 495
  });
}

function _formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function _formatAmount(amount) {
  if (amount == null) return '0,00';
  return parseFloat(amount).toLocaleString('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

module.exports = { generateDevisPDF, generateFacturePDF };
