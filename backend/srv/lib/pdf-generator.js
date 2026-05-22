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
    const devisClientName = devis.clientB2B?.companyName || (devis.clientB2C ? `${devis.clientB2C.firstName || ''} ${devis.clientB2C.lastName || ''}`.trim() : '') || 'Client';
    doc.text(devisClientName);
    doc.text(`Email: ${devis.clientB2B?.email || devis.clientB2C?.email || 'N/A'}`);
    doc.text(`Téléphone: ${devis.clientB2B?.phone || devis.clientB2C?.phone || 'N/A'}`);
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
    const factClientName = facture.clientB2B?.companyName || (facture.clientB2C ? `${facture.clientB2C.firstName || ''} ${facture.clientB2C.lastName || ''}`.trim() : '') || 'Client';
    doc.text(factClientName);
    doc.text(`Email: ${facture.clientB2B?.email || facture.clientB2C?.email || 'N/A'}`);
    if (facture.clientB2B?.rc) doc.text(`RC: ${facture.clientB2B.rc}`);
    if (facture.clientB2B?.nif) doc.text(`NIF: ${facture.clientB2B.nif}`);

    // ── Document Info ──
    doc.moveDown();
    doc.text(`Date de facturation: ${_formatDate(facture.date)}`);
    doc.text(`Date d'échéance: ${_formatDate(facture.dueDate)}`);
    doc.text(`Statut: ${facture.status || 'N/A'}`);
    doc.text(`Montant payé: ${_formatAmount(facture.paidAmount)} ${facture.currency_code || 'DZD'}`);
    doc.text(`Reste à payer: ${_formatAmount(facture.remainingAmount)} ${facture.currency_code || 'DZD'}`);

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

/**
 * Generate a Registration Certificate PDF buffer
 * @param {Object} reg - RegistrationRequest entity
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateRegistrationPDF(reg) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Header ──
    _drawHeader(doc, 'ATTESTATION D\'INSCRIPTION', reg.ID.substring(0, 8));

    // ── Status Stamp ──
    const statusColor = reg.status === 'APPROVED' ? '#107e3e' : (reg.status === 'PENDING' ? '#e9730c' : '#bb0000');
    doc.save();
    doc.fontSize(14).fillColor(statusColor).font('Helvetica-Bold');
    doc.text(`STATUT : ${reg.status}`, 350, 110, { align: 'right', width: 200 });
    doc.restore();

    // ── Registration Details ──
    doc.moveDown(2);
    doc.fontSize(12).fillColor('#1a3a5c').font('Helvetica-Bold');
    doc.text('INFORMATIONS DU PARTENAIRE');
    doc.moveDown(0.5);
    
    doc.fontSize(10).fillColor('#333333').font('Helvetica');
    const labels = [
      ['Dénomination Sociale', reg.companyName],
      ['Type de Partenaire', reg.type],
      ['Email Contact', reg.email],
      ['Téléphone', reg.phone],
      ['Adresse', reg.address],
      ['NIF / SIRET', reg.siret || 'N/A'],
      ['N° TVA', reg.tvaNumber || 'N/A'],
      ['Date de Soumission', _formatDate(reg.createdAt)]
    ];

    labels.forEach(([label, value]) => {
      const y = doc.y;
      doc.font('Helvetica-Bold').text(`${label} :`, 50, y);
      doc.font('Helvetica').text(String(value || 'Non renseigné'), 200, y);
      doc.moveDown(0.5);
    });

    // ── Certification Text ──
    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica-Oblique').text('Cette attestation certifie que la demande d\'inscription a été reçue et traitée par le système de gestion PME Cloud.');
    doc.font('Helvetica').text(`Généré le : ${new Date().toLocaleString('fr-FR')}`);

    // ── Signature Placeholder ──
    doc.moveDown(4);
    doc.fontSize(10).font('Helvetica-Bold').text('Cachet de l\'Administration', 350, doc.y, { align: 'center' });
    doc.rect(350, doc.y + 10, 150, 80).stroke('#cccccc');

    // ── Footer ──
    _drawFooter(doc);

    doc.end();
  });
}

// ── Private Helpers ──

function _drawHeader(doc, type, number, companyInfo) {
  const ci = companyInfo || {};
  // Company info (top left)
  doc.fontSize(18).fillColor('#1a3a5c').font('Helvetica-Bold');
  doc.text(ci.companyName || 'GESTION PME', 50, 50);
  doc.fontSize(9).fillColor('#666666').font('Helvetica');
  doc.text(ci.tagline || 'Solution de Gestion Cloud');
  doc.text(`${ci.email || 'contact@gestionpme.dz'} | ${ci.phone || '+213 21 00 00 00'}`);

  // Document type (top right)
  doc.fontSize(type.length > 12 ? 16 : 22).fillColor('#1a3a5c').font('Helvetica-Bold');
  doc.text(type, 290, 50, { align: 'right', width: 255 });
  doc.fontSize(11).fillColor('#333333').font('Helvetica');
  doc.text(`N° ${number}`, 290, doc.y + 4, { align: 'right', width: 255 });

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

    let desc = item.description || (item.product && item.product.name) || `Article #${idx + 1}`;
    if (item.discount > 0) {
      desc += ` (Remise -${parseFloat(item.discount).toFixed(0)}%)`;
    }

    doc.fontSize(8).fillColor('#333333');
    doc.text(desc, 55, rowY + 4, { width: 200 });
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

  if (data.discount > 0) {
    y += 16;
    doc.fillColor('#d97706').font('Helvetica-Bold').text(`Remise Globale (${parseFloat(data.discount).toFixed(0)}%):`, x, y);
    doc.text('Appliquée', x + 100, y, { align: 'right', width: 100 });
  }

  // TVA
  y += 16;
  doc.fillColor('#333333').font('Helvetica').text('TVA (19%):', x, y);
  doc.text(`${_formatAmount(data.totalTVA)} ${data.currency_code || 'DZD'}`, x + 100, y, { align: 'right', width: 100 });

  // TTC
  y += 16;
  doc.rect(x - 5, y - 3, 205, 20).fill('#1a3a5c');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('TOTAL TTC:', x, y + 2);
  doc.text(`${_formatAmount(data.totalTTC)} ${data.currency_code || 'DZD'}`, x + 100, y + 2, { align: 'right', width: 100 });

  doc.y = y + 30;
}

function _drawFooter(doc, companyInfo) {
  const ci = companyInfo || {};
  doc.fontSize(8).fillColor('#888888').font('Helvetica');
  const footerY = 780;
  doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).strokeColor('#cccccc').lineWidth(0.5).stroke();
  const footerText = `${ci.companyName || 'Gestion PME'} — ${ci.tagline || 'Solution Cloud'} | ${ci.email || 'contact@gestionpme.dz'} | RC: ${ci.rc || 'N/A'}`;
  doc.text(footerText, 50, footerY, {
    align: 'center', width: 495
  });
}

function _formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function _formatAmount(amount) {
  if (amount == null || isNaN(parseFloat(amount))) return '0,00';
  return parseFloat(amount).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).replace(/[\u202f\u00a0\u2009\/\\]/g, ' ').trim();
}

/**
 * Generate a Commande PDF buffer
 * @param {Object} commande - CommandeClient entity with expanded items and client
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateCommandePDF(commande) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Header ──
    _drawHeader(doc, 'BON DE COMMANDE', commande.orderNumber);

    // ── Client Info ──
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#333333');
    doc.text('CLIENT', { underline: true });
    const cmdClientName = commande.clientB2B?.companyName || (commande.clientB2C ? `${commande.clientB2C.firstName || ''} ${commande.clientB2C.lastName || ''}`.trim() : '') || 'Client';
    doc.text(cmdClientName);
    doc.text(`Email: ${commande.clientB2B?.email || commande.clientB2C?.email || 'N/A'}`);
    doc.text(`Téléphone: ${commande.clientB2B?.phone || commande.clientB2C?.phone || 'N/A'}`);
    if (commande.clientB2B?.rc) doc.text(`RC: ${commande.clientB2B.rc}`);

    // ── Document Info ──
    doc.moveDown();
    doc.text(`Date de commande: ${_formatDate(commande.date)}`);
    if (commande.deliveryDate) doc.text(`Date de livraison prévue: ${_formatDate(commande.deliveryDate)}`);
    doc.text(`Statut: ${commande.status}`);

    // ── Items Table ──
    doc.moveDown();
    _drawItemsTable(doc, commande.items || []);

    // ── Totals ──
    doc.moveDown();
    _drawTotals(doc, commande);

    // ── Footer ──
    _drawFooter(doc);

    doc.end();
  });
}

/**
 * Generate a PO Fournisseur PDF buffer
 */
async function generatePOFournisseurPDF(po) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    _drawHeader(doc, 'BON DE COMMANDE FOURNISSEUR', po.poNumber);

    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#333333');
    doc.text('FOURNISSEUR', { underline: true });
    doc.text(po.fournisseur?.companyName || 'Fournisseur');
    doc.text(`Email: ${po.fournisseur?.email || 'N/A'}`);
    doc.text(`Téléphone: ${po.fournisseur?.phone || 'N/A'}`);
    if (po.fournisseur?.rc) doc.text(`RC: ${po.fournisseur.rc}`);
    if (po.fournisseur?.nif) doc.text(`NIF: ${po.fournisseur.nif}`);

    doc.moveDown();
    doc.text(`Date de commande: ${_formatDate(po.date)}`);
    if (po.deliveryDate) doc.text(`Date de livraison prévue: ${_formatDate(po.deliveryDate)}`);
    doc.text(`Statut: ${po.status}`);

    doc.moveDown();
    _drawItemsTable(doc, po.items || []);

    doc.moveDown();
    _drawTotals(doc, po);

    _drawFooter(doc);
    doc.end();
  });
}

/**
 * Generate a GR Fournisseur PDF buffer
 */
async function generateGRFournisseurPDF(gr) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    _drawHeader(doc, 'BON DE RECEPTION', gr.receiptNumber);

    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#333333');
    doc.text('FOURNISSEUR', { underline: true });
    doc.text(gr.bonCommande?.fournisseur?.companyName || 'Fournisseur');
    doc.text(`Email: ${gr.bonCommande?.fournisseur?.email || 'N/A'}`);

    doc.moveDown();
    doc.text(`Date de réception: ${_formatDate(gr.date)}`);
    doc.text(`Réceptionné par: ${gr.receivedBy || 'N/A'}`);
    if (gr.notes) doc.text(`Notes: ${gr.notes}`);

    doc.moveDown();
    
    // Draw GR Items Table
    const startY = doc.y + 10;
    doc.rect(50, startY, 495, 20).fill('#1a3a5c');
    doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text('Description', 55, startY + 5, { width: 180 });
    doc.text('Commandé', 245, startY + 5, { width: 70, align: 'right' });
    doc.text('Reçu', 320, startY + 5, { width: 70, align: 'right' });
    doc.text('Accepté', 395, startY + 5, { width: 70, align: 'right' });
    doc.text('Rejeté', 470, startY + 5, { width: 70, align: 'right' });

    let rowY = startY + 22;
    doc.font('Helvetica').fillColor('#333333');
    (gr.items || []).forEach((item, idx) => {
      const bg = idx % 2 === 0 ? '#f5f7fa' : '#ffffff';
      doc.rect(50, rowY, 495, 18).fill(bg);
      const desc = item.product?.name || item.description || `Article #${idx + 1}`;
      doc.fontSize(8).fillColor('#333333');
      doc.text(desc, 55, rowY + 4, { width: 180 });
      doc.text(String(item.orderedQty || 0), 245, rowY + 4, { width: 70, align: 'right' });
      doc.text(String(item.receivedQty || 0), 320, rowY + 4, { width: 70, align: 'right' });
      doc.text(String(item.acceptedQty || 0), 395, rowY + 4, { width: 70, align: 'right' });
      doc.text(String(item.rejectedQty || 0), 470, rowY + 4, { width: 70, align: 'right' });
      rowY += 20;
    });
    doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#cccccc').lineWidth(1).stroke();
    doc.y = rowY + 10;

    _drawFooter(doc);
    doc.end();
  });
}

/**
 * Generate a Facture Fournisseur PDF buffer
 */
async function generateInvoiceFournisseurPDF(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    _drawHeader(doc, 'FACTURE FOURNISSEUR', invoice.invoiceNumber);

    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#333333');
    doc.text('FOURNISSEUR', { underline: true });
    doc.text(invoice.fournisseur?.companyName || 'Fournisseur');
    doc.text(`Email: ${invoice.fournisseur?.email || 'N/A'}`);
    doc.text(`Téléphone: ${invoice.fournisseur?.phone || 'N/A'}`);
    if (invoice.fournisseur?.rc) doc.text(`RC: ${invoice.fournisseur.rc}`);
    if (invoice.fournisseur?.nif) doc.text(`NIF: ${invoice.fournisseur.nif}`);

    doc.moveDown();
    doc.text(`Date de facture: ${_formatDate(invoice.date)}`);
    doc.text(`Date d'échéance: ${_formatDate(invoice.dueDate)}`);
    doc.text(`Statut: ${invoice.status || 'N/A'}`);
    doc.text(`Statut appariement: ${invoice.matchStatus || 'N/A'}`);

    doc.moveDown();
    _drawItemsTable(doc, invoice.items || []);

    doc.moveDown();
    _drawTotals(doc, invoice);

    _drawFooter(doc);
    doc.end();
  });
}

module.exports = {
  generateDevisPDF,
  generateFacturePDF,
  generateRegistrationPDF,
  generateCommandePDF,
  generatePOFournisseurPDF,
  generateGRFournisseurPDF,
  generateInvoiceFournisseurPDF
};

