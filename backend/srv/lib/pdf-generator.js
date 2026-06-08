// ============================================================
// PDF Generator — Devis, Factures, Commandes, Réceptions & KYC
// Uses PDFKit for server-side PDF generation
// ============================================================

'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generate a Devis PDF buffer
 * @param {Object} devis - Devis entity with expanded items and client
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateDevisPDF(devis) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margins: { top: 0, bottom: 0, left: 50, right: 50 }, size: "A4" });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Header ──
    _drawHeader(doc, 'DEVIS CLIENT', devis.devisNumber);

    const startY = doc.y + 15;

    // ── Column 1: Client Info ──
    doc.x = 50;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('DESTINATAIRE (CLIENT)');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    const devisClientName = devis.clientB2B?.companyName || (devis.clientB2C ? `${devis.clientB2C.firstName || ''} ${devis.clientB2C.lastName || ''}`.trim() : '') || 'Client';
    doc.font('Helvetica-Bold').text(devisClientName);
    doc.font('Helvetica').text(`Email : ${devis.clientB2B?.email || devis.clientB2C?.email || 'N/A'}`);
    doc.text(`Tél : ${devis.clientB2B?.phone || devis.clientB2C?.phone || 'N/A'}`);
    
    if (devis.clientB2B) {
      if (devis.clientB2B.rc) doc.text(`RC : ${devis.clientB2B.rc}`);
      if (devis.clientB2B.nif) doc.text(`NIF : ${devis.clientB2B.nif}`);
      if (devis.clientB2B.ai) doc.text(`AI : ${devis.clientB2B.ai}`);
      doc.text(`Adresse : ${devis.clientB2B.street || ''}, ${devis.clientB2B.city || ''} (${devis.clientB2B.wilaya || ''})`);
    } else if (devis.clientB2C) {
      doc.text(`Adresse : ${devis.clientB2C.street || ''}, ${devis.clientB2C.city || ''} (${devis.clientB2C.wilaya || ''})`);
    }
    const leftEndY = doc.y;

    // ── Column 2: Document Info ──
    doc.x = 350;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('DÉTAILS DU DOCUMENT');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Date d'émission : ${_formatDate(devis.date)}`);
    doc.text(`Date de validité : ${_formatDate(devis.validUntil)}`);
    doc.text('Statut : ', { continued: true });
    doc.font('Helvetica-Bold').text(String(devis.status || 'En cours'));
    const rightEndY = doc.y;

    // Reset coordinates
    doc.x = 50;
    doc.y = Math.max(leftEndY, rightEndY) + 25;

    // ── Items Table ──
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
    const doc = new PDFDocument({ margins: { top: 0, bottom: 0, left: 50, right: 50 }, size: "A4" });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Header ──
    _drawHeader(doc, 'FACTURE CLIENT', facture.invoiceNumber);

    const startY = doc.y + 15;

    // ── Column 1: Client Info ──
    doc.x = 50;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('DESTINATAIRE (CLIENT)');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    const factClientName = facture.clientB2B?.companyName || (facture.clientB2C ? `${facture.clientB2C.firstName || ''} ${facture.clientB2C.lastName || ''}`.trim() : '') || 'Client';
    doc.font('Helvetica-Bold').text(factClientName);
    doc.font('Helvetica').text(`Email : ${facture.clientB2B?.email || facture.clientB2C?.email || 'N/A'}`);
    doc.text(`Tél : ${facture.clientB2B?.phone || facture.clientB2C?.phone || 'N/A'}`);
    
    if (facture.clientB2B) {
      if (facture.clientB2B.rc) doc.text(`RC : ${facture.clientB2B.rc}`);
      if (facture.clientB2B.nif) doc.text(`NIF : ${facture.clientB2B.nif}`);
      if (facture.clientB2B.ai) doc.text(`AI : ${facture.clientB2B.ai}`);
      doc.text(`Adresse : ${facture.clientB2B.street || ''}, ${facture.clientB2B.city || ''} (${facture.clientB2B.wilaya || ''})`);
    } else if (facture.clientB2C) {
      doc.text(`Adresse : ${facture.clientB2C.street || ''}, ${facture.clientB2C.city || ''} (${facture.clientB2C.wilaya || ''})`);
    }
    const leftEndY = doc.y;

    // ── Column 2: Document Info ──
    doc.x = 350;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('DÉTAILS DU DOCUMENT');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Date de facture : ${_formatDate(facture.date)}`);
    doc.text(`Date d'échéance : ${_formatDate(facture.dueDate)}`);
    doc.text(`Statut : ${facture.status || 'N/A'}`);
    doc.text(`Montant payé : ${_formatAmount(facture.paidAmount)} ${facture.currency_code || 'DZD'}`);
    doc.text(`Reste à payer : ${_formatAmount(facture.remainingAmount)} ${facture.currency_code || 'DZD'}`);
    const rightEndY = doc.y;

    // Reset coordinates
    doc.x = 50;
    doc.y = Math.max(leftEndY, rightEndY) + 25;

    // ── Items Table ──
    _drawItemsTable(doc, facture.items || []);

    // ── Totals & RIB ──
    const beforeTotalsY = doc.y;
    _drawTotals(doc, facture);
    _drawPaymentInfo(doc, beforeTotalsY + 10);

    // ── Footer ──
    _drawFooter(doc);

    doc.end();
  });
}

/**
 * Generate a Commande PDF buffer
 * @param {Object} commande - CommandeClient entity with expanded items and client
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateCommandePDF(commande) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margins: { top: 0, bottom: 0, left: 50, right: 50 }, size: "A4" });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Header ──
    _drawHeader(doc, 'BON DE COMMANDE', commande.orderNumber);

    const startY = doc.y + 15;

    // ── Column 1: Client Info ──
    doc.x = 50;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('DESTINATAIRE (CLIENT)');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    const cmdClientName = commande.clientB2B?.companyName || (commande.clientB2C ? `${commande.clientB2C.firstName || ''} ${commande.clientB2C.lastName || ''}`.trim() : '') || 'Client';
    doc.font('Helvetica-Bold').text(cmdClientName);
    doc.font('Helvetica').text(`Email : ${commande.clientB2B?.email || commande.clientB2C?.email || 'N/A'}`);
    doc.text(`Tél : ${commande.clientB2B?.phone || commande.clientB2C?.phone || 'N/A'}`);
    
    if (commande.clientB2B) {
      if (commande.clientB2B.rc) doc.text(`RC : ${commande.clientB2B.rc}`);
      if (commande.clientB2B.nif) doc.text(`NIF : ${commande.clientB2B.nif}`);
      if (commande.clientB2B.ai) doc.text(`AI : ${commande.clientB2B.ai}`);
      doc.text(`Adresse : ${commande.clientB2B.street || ''}, ${commande.clientB2B.city || ''} (${commande.clientB2B.wilaya || ''})`);
    } else if (commande.clientB2C) {
      doc.text(`Adresse : ${commande.clientB2C.street || ''}, ${commande.clientB2C.city || ''} (${commande.clientB2C.wilaya || ''})`);
    }
    const leftEndY = doc.y;

    // ── Column 2: Document Info ──
    doc.x = 350;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('DÉTAILS DU DOCUMENT');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Date de commande : ${_formatDate(commande.date)}`);
    if (commande.deliveryDate) doc.text(`Date de livraison prévue : ${_formatDate(commande.deliveryDate)}`);
    doc.text(`Statut : ${commande.status}`);
    const rightEndY = doc.y;

    // Reset coordinates
    doc.x = 50;
    doc.y = Math.max(leftEndY, rightEndY) + 25;

    // ── Items Table ──
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
 * @param {Object} po - BonCommandeFournisseur entity
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePOFournisseurPDF(po) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margins: { top: 0, bottom: 0, left: 50, right: 50 }, size: "A4" });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    _drawHeader(doc, 'BON DE COMMANDE FOURNISSEUR', po.poNumber);

    const startY = doc.y + 15;

    // ── Column 1: Supplier Info ──
    doc.x = 50;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('DESTINATAIRE (FOURNISSEUR)');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.font('Helvetica-Bold').text(po.fournisseur?.companyName || 'Fournisseur');
    doc.font('Helvetica').text(`Email : ${po.fournisseur?.email || 'N/A'}`);
    doc.text(`Tél : ${po.fournisseur?.phone || 'N/A'}`);
    if (po.fournisseur?.rc) doc.text(`RC : ${po.fournisseur.rc}`);
    if (po.fournisseur?.nif) doc.text(`NIF : ${po.fournisseur.nif}`);
    if (po.fournisseur?.ai) doc.text(`AI : ${po.fournisseur.ai}`);
    doc.text(`Adresse : ${po.fournisseur?.street || ''}, ${po.fournisseur?.city || ''} (${po.fournisseur?.wilaya || ''})`);
    const leftEndY = doc.y;

    // ── Column 2: Document Info ──
    doc.x = 350;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('DÉTAILS DU DOCUMENT');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Date de commande : ${_formatDate(po.date)}`);
    if (po.deliveryDate) doc.text(`Date de livraison prévue : ${_formatDate(po.deliveryDate)}`);
    doc.text(`Statut : ${po.status}`);
    const rightEndY = doc.y;

    // Reset coordinates
    doc.x = 50;
    doc.y = Math.max(leftEndY, rightEndY) + 25;

    _drawItemsTable(doc, po.items || []);

    doc.moveDown();
    _drawTotals(doc, po);

    _drawFooter(doc);
    doc.end();
  });
}

/**
 * Generate a GR Fournisseur PDF buffer
 * @param {Object} gr - ReceptionFournisseur entity
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateGRFournisseurPDF(gr) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margins: { top: 0, bottom: 0, left: 50, right: 50 }, size: "A4" });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    _drawHeader(doc, 'BON DE RÉCEPTION', gr.receiptNumber);

    const startY = doc.y + 15;

    // ── Column 1: Supplier Info ──
    doc.x = 50;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('PROVENANCE (FOURNISSEUR)');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.font('Helvetica-Bold').text(gr.bonCommande?.fournisseur?.companyName || 'Fournisseur');
    doc.font('Helvetica').text(`Email : ${gr.bonCommande?.fournisseur?.email || 'N/A'}`);
    doc.text(`Tél : ${gr.bonCommande?.fournisseur?.phone || 'N/A'}`);
    doc.text(`Adresse : ${gr.bonCommande?.fournisseur?.street || ''}, ${gr.bonCommande?.fournisseur?.city || ''}`);
    const leftEndY = doc.y;

    // ── Column 2: Document Info ──
    doc.x = 350;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('DÉTAILS DU DOCUMENT');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Date de réception : ${_formatDate(gr.date)}`);
    doc.text(`Réceptionné par : ${gr.receivedBy || 'N/A'}`);
    if (gr.notes) doc.text(`Notes : ${gr.notes}`);
    const rightEndY = doc.y;

    // Reset coordinates
    doc.x = 50;
    doc.y = Math.max(leftEndY, rightEndY) + 25;

    // Draw GR Items Table
    const tableStartY = doc.y + 10;
    doc.rect(50, tableStartY, 495, 22).fill('#f1f5f9');
    doc.fontSize(8.5).fillColor('#1e293b').font('Helvetica-Bold');
    doc.text('Description', 60, tableStartY + 7, { width: 200 });
    doc.text('Commandé', 270, tableStartY + 7, { width: 60, align: 'right' });
    doc.text('Reçu', 340, tableStartY + 7, { width: 55, align: 'right' });
    doc.text('Accepté', 405, tableStartY + 7, { width: 60, align: 'right' });
    doc.text('Rejeté', 475, tableStartY + 7, { width: 60, align: 'right' });

    // Border below headers
    doc.moveTo(50, tableStartY + 22).lineTo(545, tableStartY + 22).strokeColor('#cbd5e1').lineWidth(1).stroke();

    let rowY = tableStartY + 22;
    doc.font('Helvetica').fillColor('#333333');
    (gr.items || []).forEach((item, idx) => {
      const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(50, rowY, 495, 20).fill(bg);
      
      const desc = item.product?.name || item.poItem?.description || item.description || `Article #${idx + 1}`;
      
      doc.fontSize(8).fillColor('#0f172a');
      doc.text(desc, 60, rowY + 6, { width: 200, ellipsis: true });
      doc.text(String(item.orderedQty || 0), 270, rowY + 6, { width: 60, align: 'right' });
      doc.text(String(item.receivedQty || 0), 340, rowY + 6, { width: 55, align: 'right' });
      
      doc.fillColor('#15803d').font('Helvetica-Bold').text(String(item.acceptedQty || 0), 405, rowY + 6, { width: 60, align: 'right' });
      doc.fillColor(item.rejectedQty > 0 ? '#b91c1c' : '#0f172a').font(item.rejectedQty > 0 ? 'Helvetica-Bold' : 'Helvetica').text(String(item.rejectedQty || 0), 475, rowY + 6, { width: 60, align: 'right' });
      
      doc.moveTo(50, rowY + 20).lineTo(545, rowY + 20).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      rowY += 20;
    });

    // Calculate totals & discrepancies
    let totalOrdered = 0;
    let totalReceived = 0;
    let totalAccepted = 0;
    let totalRejected = 0;
    (gr.items || []).forEach(item => {
      totalOrdered += parseFloat(item.orderedQty) || 0;
      totalReceived += parseFloat(item.receivedQty) || 0;
      totalAccepted += parseFloat(item.acceptedQty) || 0;
      totalRejected += parseFloat(item.rejectedQty) || 0;
    });
    const totalMissing = Math.max(0, totalOrdered - totalReceived);

    doc.y = rowY + 15;
    
    // Draw a summary card
    doc.rect(50, doc.y, 495, 45).fill('#f8fafc');
    doc.rect(50, doc.y, 495, 45).stroke('#e2e8f0');
    
    const summaryY = doc.y + 6;
    doc.fontSize(8.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('RÉSUMÉ DES QUANTITÉS', 60, summaryY);
    
    doc.fontSize(8).fillColor('#475569').font('Helvetica');
    doc.text(`Commandé : ${totalOrdered}`, 60, summaryY + 14);
    doc.text(`Reçu : ${totalReceived}`, 140, summaryY + 14);
    doc.text(`Accepté : ${totalAccepted}`, 210, summaryY + 14);
    
    if (totalRejected > 0) {
      doc.fillColor('#b91c1c').font('Helvetica-Bold').text(`Rejeté : ${totalRejected}`, 280, summaryY + 14);
    } else {
      doc.text(`Rejeté : ${totalRejected}`, 280, summaryY + 14);
    }
    
    if (totalMissing > 0) {
      doc.fillColor('#b91c1c').font('Helvetica-Bold').text(`Manquant : ${totalMissing}`, 350, summaryY + 14);
    } else {
      doc.text(`Manquant : ${totalMissing}`, 350, summaryY + 14);
    }

    if (totalRejected > 0 || totalMissing > 0) {
      doc.fontSize(7.5).fillColor('#b91c1c').font('Helvetica-Bold');
      let alertMsg = 'Écart de réception constaté : ';
      if (totalMissing > 0) alertMsg += `${totalMissing} pièce(s) manquante(s). `;
      if (totalRejected > 0) alertMsg += `${totalRejected} pièce(s) rejetée(s) par l'administrateur. `;
      doc.text(alertMsg, 60, summaryY + 26);
    }

    doc.y = summaryY + 45 + 15;

    // Signature boxes
    doc.x = 50;
    const sigY = doc.y;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Signature du Réceptionnaire', 50, sigY);
    doc.rect(50, sigY + 10, 160, 60).stroke('#cbd5e1');

    doc.text('Visa & Cachet Fournisseur', 385, sigY);
    doc.rect(385, sigY + 10, 160, 60).stroke('#cbd5e1');

    _drawFooter(doc);
    doc.end();
  });
}

/**
 * Generate a Facture Fournisseur PDF buffer
 * @param {Object} invoice - FactureFournisseur entity
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateInvoiceFournisseurPDF(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margins: { top: 0, bottom: 0, left: 50, right: 50 }, size: "A4" });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    _drawHeader(doc, 'FACTURE FOURNISSEUR', invoice.invoiceNumber);

    const startY = doc.y + 15;

    // ── Column 1: Supplier Info ──
    doc.x = 50;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('EXPÉDITEUR (FOURNISSEUR)');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.font('Helvetica-Bold').text(invoice.fournisseur?.companyName || 'Fournisseur');
    doc.font('Helvetica').text(`Email : ${invoice.fournisseur?.email || 'N/A'}`);
    doc.text(`Tél : ${invoice.fournisseur?.phone || 'N/A'}`);
    if (invoice.fournisseur?.rc) doc.text(`RC : ${invoice.fournisseur.rc}`);
    if (invoice.fournisseur?.nif) doc.text(`NIF : ${invoice.fournisseur.nif}`);
    if (invoice.fournisseur?.ai) doc.text(`AI : ${invoice.fournisseur.ai}`);
    doc.text(`Adresse : ${invoice.fournisseur?.street || ''}, ${invoice.fournisseur?.city || ''} (${invoice.fournisseur?.wilaya || ''})`);
    const leftEndY = doc.y;

    // ── Column 2: Document Info ──
    doc.x = 350;
    doc.y = startY;
    doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold');
    doc.text('DÉTAILS DU DOCUMENT');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#475569');
    doc.text(`Date de facture : ${_formatDate(invoice.date)}`);
    doc.text(`Date d'échéance : ${_formatDate(invoice.dueDate)}`);
    doc.text(`Statut : ${invoice.status || 'N/A'}`);
    doc.text(`Statut appariement : ${invoice.matchStatus || 'N/A'}`);
    const rightEndY = doc.y;

    // Reset coordinates
    doc.x = 50;
    doc.y = Math.max(leftEndY, rightEndY) + 25;

    _drawItemsTable(doc, invoice.items || []);

    const beforeTotalsY = doc.y;
    _drawTotals(doc, invoice);

    // If the supplier has bank info (RIB/IBAN), we can draw it on the left
    if (invoice.fournisseur?.rib || invoice.fournisseur?.bankAccount) {
      doc.save();
      const showBank = invoice.fournisseur?.bankName && invoice.fournisseur.bankName.trim() !== '' && invoice.fournisseur.bankName.toUpperCase().trim() !== 'N/A';
      const boxHeight = showBank ? 65 : 50;

      doc.rect(50, beforeTotalsY + 10, 260, boxHeight).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fontSize(8.5).fillColor('#0f172a').font('Helvetica-Bold');
      doc.text('COORDONNÉES BANCAIRES DU FOURNISSEUR', 60, beforeTotalsY + 18);
      doc.fontSize(7.5).fillColor('#475569').font('Helvetica');

      let ribY = beforeTotalsY + 32;
      if (showBank) {
        doc.text(`Banque : ${invoice.fournisseur.bankName}`, 60, beforeTotalsY + 32);
        ribY = beforeTotalsY + 44;
      }
      doc.font('Helvetica-Bold').text(`RIB : ${invoice.fournisseur.rib || invoice.fournisseur.bankAccount}`, 60, ribY);
      doc.restore();
    } else {
      _drawPaymentInfo(doc, beforeTotalsY + 10);
    }

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
    const doc = new PDFDocument({ margins: { top: 0, bottom: 0, left: 50, right: 50 }, size: "A4" });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Header ──
    _drawHeader(doc, 'ATTESTATION D\'INSCRIPTION', reg.ID.substring(0, 8));

    // Decorative frame/border for the certificate
    doc.save();
    doc.rect(40, 115, 515, 605).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.restore();

    // ── Status Badge/Stamp ──
    const statusColor = reg.status === 'APPROVED' ? '#15803d' : (reg.status === 'PENDING' ? '#b45309' : '#b91c1c');
    const statusLabel = reg.status === 'APPROVED' ? 'DEMANDE APPROUVÉE' : (reg.status === 'PENDING' ? 'EN ATTENTE' : 'DEMANDE REJETÉE');
    
    doc.save();
    doc.rect(380, 130, 150, 30).fill(statusColor);
    doc.fontSize(9.5).fillColor('#FFFFFF').font('Helvetica-Bold');
    doc.text(statusLabel, 380, 140, { align: 'center', width: 150 });
    doc.restore();

    // ── Title ──
    doc.y = 175;
    doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text('ATTESTATION OFFICIELLE DE PARTENARIAT', 50, doc.y, { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(9.5).fillColor('#475569').font('Helvetica-Oblique');
    doc.text('Par la présente, l\'administration certifie l\'inscription de la structure suivante dans les registres de Bridgify Cloud.', 50, doc.y, { align: 'center', width: 495 });

    // ── Partner Details Grid ──
    doc.moveDown(2);
    const gridStartY = doc.y;

    // Subtle background for details card
    doc.rect(60, gridStartY, 475, 185).fill('#f8fafc');
    doc.rect(60, gridStartY, 475, 185).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

    const labels = [
      ['Raison Sociale / Nom', reg.companyName],
      ['Type de Partenaire', reg.type === 'CLIENT_B2B' ? 'Client Entreprise (B2B)' : (reg.type === 'CLIENT_B2C' ? 'Client Particulier (B2C)' : 'Fournisseur / Distributeur')],
      ['Identifiant Fiscal / NIF', reg.siret || 'Non spécifié'],
      ['Numéro de TVA', reg.tvaNumber || 'N/A'],
      ['Adresse Siège', reg.address || 'N/A'],
      ['Contact Email', reg.email],
      ['Téléphone', reg.phone || 'N/A'],
      ['Date de validation', _formatDate(reg.createdAt)]
    ];

    let currentY = gridStartY + 12;
    labels.forEach(([label, value]) => {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(label, 75, currentY);
      doc.font('Helvetica').fillColor('#475569').text(String(value || 'N/A'), 240, currentY);
      currentY += 20;
    });

    // ── Signature / Seal Area ──
    doc.y = gridStartY + 215;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text('Fait à Alger, le ' + new Date().toLocaleDateString('fr-DZ'), 50, doc.y, { align: 'center' });

    doc.moveDown(1.5);
    const sealY = doc.y;
    doc.fontSize(8.5).font('Helvetica-Bold').text('Pour l\'Administration Bridgify Cloud', 340, sealY, { align: 'center', width: 180 });
    
    // Official seal box
    doc.rect(340, sealY + 15, 180, 75).strokeColor('#cbd5e1').lineWidth(1).stroke();
    
    // Add text inside seal box for authenticity
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#94a3b8');
    doc.text('Signature & Cachet Électronique', 340, sealY + 45, { align: 'center', width: 180 });

    // ── Footer ──
    _drawFooter(doc);

    doc.end();
  });
}

// ── Private Helpers ──

function _drawHeader(doc, type, number, companyInfo) {
  const ci = companyInfo || {};
  const logoCandidates = [
    // Dynamic process root paths (robust for SAP BTP CF container where root is process.cwd())
    path.join(process.cwd(), 'app', 'images', 'logo.png'),
    path.join(process.cwd(), 'app', 'images', 'logo_round.png'),
    path.join(process.cwd(), 'frontend', 'images', 'logo.png'),
    path.join(process.cwd(), 'frontend', 'images', 'logo_round.png'),
    // Relative dirname paths (fallback)
    path.join(__dirname, '..', 'app', 'images', 'logo.png'),
    path.join(__dirname, '..', 'app', 'images', 'logo_round.png'),
    path.join(__dirname, '..', '..', 'app', 'images', 'logo.png'),
    path.join(__dirname, '..', '..', 'app', 'images', 'logo_round.png'),
    path.join(__dirname, '..', '..', '..', 'frontend', 'images', 'logo.png'),
    path.join(__dirname, '..', '..', '..', 'frontend', 'images', 'logo_round.png'),
  ];
  const effectiveLogo = logoCandidates.find(p => fs.existsSync(p)) || null;

  // Draw a very thin header line in accent blue
  doc.rect(50, 40, 495, 2).fill('#2563EB');

  // Logo (left side, slightly below the line)
  if (effectiveLogo) {
    doc.image(effectiveLogo, 50, 52, { width: 42, height: 42 });
  }

  // Issuer Brand info (on the left, next to the logo)
  const textX = effectiveLogo ? 102 : 50;
  doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold');
  doc.text(ci.companyName || 'Bridgify Cloud', textX, 52);
  
  doc.fontSize(7.5).fillColor('#64748b').font('Helvetica');
  doc.text(ci.tagline || 'Solution Cloud de Gestion Intégrée — SAP BTP', textX, 68);
  doc.text(`${ci.email || 'contact@bridgify.dz'}  |  ${ci.phone || '+213 21 00 00 00'}  |  www.bridgify.dz`, textX, 78);
  doc.text(`Adresse : 12 Rue de la Liberté, Alger  |  NIF : 001234567890123  |  RC : 16/00-9876543B20`, textX, 88);

  // Document metadata (on the right)
  doc.fontSize(13).fillColor('#0f172a').font('Helvetica-Bold');
  doc.text(type, 300, 52, { align: 'right', width: 245 });
  doc.fontSize(8.5).fillColor('#475569').font('Helvetica');
  doc.text(`Référence : N° ${number}`, 300, doc.y + 2, { align: 'right', width: 245 });
  doc.text(`Généré le : ${new Date().toLocaleDateString('fr-DZ')}`, 300, doc.y + 2, { align: 'right', width: 245 });

  // A subtle grey separator line below the header area
  doc.moveTo(50, 108).lineTo(545, 108).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

  doc.x = 50;
  doc.y = 120;
}

function _drawFooter(doc, companyInfo) {
  const ci = companyInfo || {};
  const footerY = 745;

  // Thin separator line
  doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

  // Footer left: legal note / terms
  doc.fontSize(7).fillColor('#64748b').font('Helvetica');
  doc.text('Conditions de règlement : Paiement à réception de facture, sauf accord contractuel spécifique.', 50, footerY + 10, { width: 320 });
  doc.text('Pénalités de retard : 1,5% par mois de retard sur les sommes restant dues. Aucun escompte pour paiement anticipé.', 50, footerY + 18, { width: 320 });

  // Footer right: copyright and support contact
  doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold');
  doc.text('Bridgify Cloud SPA', 380, footerY + 10, { align: 'right', width: 165 });
  doc.font('Helvetica').fontSize(6.5);
  doc.text('Support : support@bridgify.dz', 380, footerY + 19, { align: 'right', width: 165 });
  doc.text('Document généré électroniquement.', 380, footerY + 27, { align: 'right', width: 165 });
  
  // Page number
  doc.fontSize(7.5).fillColor('#475569');
  doc.text('Page 1 sur 1', 50, footerY + 38, { align: 'center', width: 495 });
}

function _drawPaymentInfo(doc, y) {
  doc.save();
  const startY = y || doc.y;

  // Encart cadre pour le RIB
  doc.rect(50, startY, 260, 65).fillAndStroke('#f8fafc', '#cbd5e1');
  
  doc.fontSize(8.5).fillColor('#0f172a').font('Helvetica-Bold');
  doc.text('INFORMATIONS DE RÈGLEMENT (RIB)', 60, startY + 8);
  
  doc.fontSize(7.5).fillColor('#475569').font('Helvetica');
  doc.text('Bénéficiaire : Bridgify Cloud SPA', 60, startY + 22);
  doc.text('Banque : Banque de l\'Agriculture et du Développement (BADR)', 60, startY + 32);
  doc.font('Helvetica-Bold').text('RIB : 003 00060 0000012345 67', 60, startY + 44);
  
  doc.restore();
}

function _drawItemsTable(doc, items) {
  const startY = doc.y + 10;
  
  // Table Header row (subtle background, dark slate text)
  doc.rect(50, startY, 495, 22).fill('#f1f5f9');
  doc.fontSize(8.5).fillColor('#1e293b').font('Helvetica-Bold');
  doc.text('Description', 60, startY + 7, { width: 220 });
  doc.text('Qté', 290, startY + 7, { width: 40, align: 'right' });
  doc.text('P.U. HT', 340, startY + 7, { width: 65, align: 'right' });
  doc.text('TVA', 415, startY + 7, { width: 35, align: 'right' });
  doc.text('Total TTC', 460, startY + 7, { width: 75, align: 'right' });

  // Border below headers
  doc.moveTo(50, startY + 22).lineTo(545, startY + 22).strokeColor('#cbd5e1').lineWidth(1).stroke();

  let rowY = startY + 22;
  doc.font('Helvetica').fillColor('#333333');

  (items || []).forEach((item, idx) => {
    // Alternating background for rows
    const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.rect(50, rowY, 495, 20).fill(bg);

    let desc = item.description || (item.product && item.product.name) || `Article #${idx + 1}`;
    if (item.discount > 0) {
      desc += ` (Remise -${parseFloat(item.discount).toFixed(0)}%)`;
    }

    doc.fontSize(8).fillColor('#0f172a');
    doc.text(desc, 60, rowY + 6, { width: 220, ellipsis: true });
    doc.text(String(item.quantity || 0), 290, rowY + 6, { width: 40, align: 'right' });
    doc.text(_formatAmount(item.unitPrice), 340, rowY + 6, { width: 65, align: 'right' });
    doc.text(`${item.tvaRate || 19}%`, 415, rowY + 6, { width: 35, align: 'right' });
    doc.text(_formatAmount(item.totalTTC), 460, rowY + 6, { width: 75, align: 'right' });

    // Fine border below row
    doc.moveTo(50, rowY + 20).lineTo(545, rowY + 20).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    rowY += 20;
  });

  doc.y = rowY + 10;
}

function _drawTotals(doc, data) {
  const x = 360;
  let y = doc.y + 10;

  doc.fontSize(8.5).font('Helvetica');

  // HT
  doc.fillColor('#475569').text('Total HT :', x, y);
  doc.fillColor('#0f172a').font('Helvetica-Bold').text(`${_formatAmount(data.totalHT)} ${data.currency_code || 'DZD'}`, x + 100, y, { align: 'right', width: 85 });

  // Discount
  if (data.discount > 0) {
    y += 16;
    doc.fontSize(8.5).fillColor('#b45309').font('Helvetica-Bold').text(`Remise (${parseFloat(data.discount).toFixed(0)}%) :`, x, y);
    doc.text('Incluse', x + 100, y, { align: 'right', width: 85 });
  }

  // TVA
  y += 16;
  doc.fontSize(8.5).fillColor('#475569').font('Helvetica').text('TVA (19%) :', x, y);
  doc.fillColor('#0f172a').text(`${_formatAmount(data.totalTVA)} ${data.currency_code || 'DZD'}`, x + 100, y, { align: 'right', width: 85 });

  // Timbre Fiscal
  if (data.timbreFiscal) {
    y += 16;
    doc.fontSize(8.5).fillColor('#475569').font('Helvetica').text('Timbre Fiscal :', x, y);
    doc.fillColor('#0f172a').text(`${_formatAmount(data.timbreFiscal)} ${data.currency_code || 'DZD'}`, x + 100, y, { align: 'right', width: 85 });
  }

  // TTC
  y += 20;
  doc.rect(x - 5, y - 4, 190, 24).fill('#2563EB'); // Clean accent blue box
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('TOTAL TTC :', x, y + 5);
  doc.text(`${_formatAmount(data.totalTTC)} ${data.currency_code || 'DZD'}`, x + 90, y + 5, { align: 'right', width: 90 });

  doc.y = y + 35;
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

module.exports = {
  generateDevisPDF,
  generateFacturePDF,
  generateRegistrationPDF,
  generateCommandePDF,
  generatePOFournisseurPDF,
  generateGRFournisseurPDF,
  generateInvoiceFournisseurPDF
};
