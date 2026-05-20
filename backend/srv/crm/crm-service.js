// ============================================================
// CRM Service Handlers — Business Logic (Full Rebuild)
// PME Connect — Portail Client B2B & B2C
// ============================================================

'use strict';
const cds = require('@sap/cds');
const { generateDevisPDF, generateFacturePDF, generateCommandePDF } = require('../lib/pdf-generator');
const { sendDevis, sendFacture, sendWelcomeB2B } = require('../lib/email-service');
const { validateClientB2B } = require('../lib/validators');

module.exports = class CRMService extends cds.ApplicationService {

  async init() {
    const {
      ClientsB2B, ClientsB2C, Devis, DevisItems,
      Commandes, CommandeItems, Factures, FactureItems, Paiements
    } = this.entities;
    const { BusinessPartner } = cds.entities('sap.pme');

    // ── Auto-generate document numbers ──
    this.before('CREATE', Devis,     async (req) => { req.data.devisNumber   = await this._generateNumber('DEVIS',    'DEV'); });
    this.before('CREATE', Commandes, async (req) => { req.data.orderNumber   = await this._generateNumber('COMMANDE', 'CMD'); });
    this.before('CREATE', Factures,  async (req) => { req.data.invoiceNumber = await this._generateNumber('FACTURE',  'FAC'); });
    this.before('CREATE', Paiements, async (req) => { req.data.paymentNumber = await this._generateNumber('PAIEMENT', 'PAY'); });

    // ── Validate on create ──
    this.before('CREATE', ClientsB2B, (req) => validateClientB2B(req.data, req));

    // ── Auto-calculate line totals ──
    this.before(['CREATE', 'UPDATE'], DevisItems,   (req) => this._calculateLineTotal(req.data));
    this.before(['CREATE', 'UPDATE'], CommandeItems,(req) => this._calculateLineTotal(req.data));
    this.before(['CREATE', 'UPDATE'], FactureItems, (req) => this._calculateLineTotal(req.data));

    // ── Auto-create BusinessPartner for new B2B clients ──
    this.before('CREATE', ClientsB2B, async (req) => {
      if (!req.data.bp_ID) {
        const bpNum = await this._generateNumber('BP', 'BP');
        const [bp] = await INSERT.into(BusinessPartner).entries({
          bpNumber: bpNum, bpType: 'CLIENT_B2B',
          displayName: req.data.companyName,
          email: req.data.email, phone: req.data.phone, status: 'PENDING'
        });
        req.data.bp_ID = bp?.ID;
      }
      req.data.status = req.data.status || 'PENDING';
    });

    // ── Welcome email after B2B registration ──
    this.after('CREATE', ClientsB2B, async (data) => {
      try { await sendWelcomeB2B(data.email, data.contactName, data.companyName); }
      catch (e) { console.warn('Welcome email failed:', e.message); }
    });

    // ─────────────────────────────────────────
    // ACTION: B2B — Submit Cart as Devis (RFQ)
    // Client B2B soumet son panier → Devis PENDING
    // ─────────────────────────────────────────
    this.on('submitCartAsDevis', async (req) => {
      const { clientB2B_ID, items, notes } = req.data;

      if (!clientB2B_ID) return req.error(400, 'clientB2B_ID est requis');
      if (!items || items.length === 0) return req.error(400, 'Le panier est vide');

      // Validate client exists and is ACTIVE
      const client = await SELECT.one.from(ClientsB2B).where({ ID: clientB2B_ID });
      if (!client) return req.error(404, 'Client B2B introuvable');
      if (client.status !== 'ACTIVE') return req.error(403, 'Compte client non activé');

      // Build line items with calculated totals
      const lineItems = items.map((item, i) => {
        const qty   = parseFloat(item.quantity);
        const price = parseFloat(item.unitPrice);
        const disc  = 0; // Discount applied later by admin
        const tva   = parseFloat(item.tvaRate || 19);
        const ht    = qty * price * (1 - disc / 100);
        const tvaAmt = ht * (tva / 100);
        return {
          lineNumber  : i + 1,
          product_ID  : item.productId,
          description : item.description || '',
          quantity    : qty,
          unit        : 'PIECE',
          unitPrice   : price,
          discount    : disc,
          tvaRate     : tva,
          totalHT     : parseFloat(ht.toFixed(2)),
          totalTVA    : parseFloat(tvaAmt.toFixed(2)),
          totalTTC    : parseFloat((ht + tvaAmt).toFixed(2))
        };
      });

      const totalHT  = lineItems.reduce((s, i) => s + i.totalHT,  0);
      const totalTVA = lineItems.reduce((s, i) => s + i.totalTVA, 0);
      const totalTTC = lineItems.reduce((s, i) => s + i.totalTTC, 0);

      const devNum = await this._generateNumber('DEVIS', 'DEV');
      const [devis] = await INSERT.into(Devis).entries({
        devisNumber  : devNum,
        clientB2B_ID : clientB2B_ID,
        date         : new Date().toISOString().split('T')[0],
        validUntil   : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status       : 'PENDING',
        notes        : notes || '',
        totalHT      : parseFloat(totalHT.toFixed(2)),
        totalTVA     : parseFloat(totalTVA.toFixed(2)),
        totalTTC     : parseFloat(totalTTC.toFixed(2)),
        items        : lineItems
      });

      return SELECT.one.from(Devis).where({ ID: devis.ID });
    });

    // ─────────────────────────────────────────
    // ACTION: B2C — Submit Cart as Order (after payment)
    // Client B2C paie et obtient une commande directement
    // ─────────────────────────────────────────
    this.on('submitCartAsOrder', async (req) => {
      const { clientB2C_ID, items, paymentMethod, paymentRef } = req.data;

      if (!clientB2C_ID) return req.error(400, 'clientB2C_ID est requis');
      if (!items || items.length === 0) return req.error(400, 'Le panier est vide');

      const client = await SELECT.one.from(ClientsB2C).where({ ID: clientB2C_ID });
      if (!client) return req.error(404, 'Client B2C introuvable');

      const lineItems = items.map((item, i) => {
        const qty    = parseFloat(item.quantity);
        const price  = parseFloat(item.unitPrice);
        const tva    = parseFloat(item.tvaRate || 19);
        const ht     = qty * price;
        const tvaAmt = ht * (tva / 100);
        return {
          lineNumber  : i + 1,
          product_ID  : item.productId,
          description : item.description || '',
          quantity    : qty,
          unit        : 'PIECE',
          unitPrice   : price,
          tvaRate     : tva,
          totalHT     : parseFloat(ht.toFixed(2)),
          totalTVA    : parseFloat(tvaAmt.toFixed(2)),
          totalTTC    : parseFloat((ht + tvaAmt).toFixed(2))
        };
      });

      const totalHT  = lineItems.reduce((s, i) => s + i.totalHT,  0);
      const totalTVA = lineItems.reduce((s, i) => s + i.totalTVA, 0);
      const totalTTC = lineItems.reduce((s, i) => s + i.totalTTC, 0);

      const cmdNum = await this._generateNumber('COMMANDE', 'CMD');
      const [commande] = await INSERT.into(Commandes).entries({
        orderNumber  : cmdNum,
        clientB2C_ID : clientB2C_ID,
        date         : new Date().toISOString().split('T')[0],
        status       : 'CONFIRMED',
        totalHT      : parseFloat(totalHT.toFixed(2)),
        totalTVA     : parseFloat(totalTVA.toFixed(2)),
        totalTTC     : parseFloat(totalTTC.toFixed(2)),
        items        : lineItems
      });

      // Auto-generate invoice
      const invNum  = await this._generateNumber('FACTURE', 'FAC');
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);
      const [facture] = await INSERT.into(Factures).entries({
        invoiceNumber : invNum,
        commande_ID   : commande.ID,
        clientB2C_ID  : clientB2C_ID,
        date          : new Date().toISOString().split('T')[0],
        dueDate       : dueDate.toISOString().split('T')[0],
        status        : 'PAID',
        totalHT       : parseFloat(totalHT.toFixed(2)),
        totalTVA      : parseFloat(totalTVA.toFixed(2)),
        totalTTC      : parseFloat(totalTTC.toFixed(2)),
        paidAmount    : parseFloat(totalTTC.toFixed(2)),
        remainingAmount : 0,
        items         : lineItems.map(l => ({ ...l }))
      });

      // Record the payment
      const payNum = await this._generateNumber('PAIEMENT', 'PAY');
      await INSERT.into(Paiements).entries({
        paymentNumber : payNum,
        facture_ID    : facture.ID,
        date          : new Date().toISOString().split('T')[0],
        amount        : parseFloat(totalTTC.toFixed(2)),
        method        : paymentMethod || 'CARTE',
        reference     : paymentRef || `SIM-${Date.now()}`
      });

      await UPDATE(Commandes).set({ invoiced: true, facture_ID: facture.ID, status: 'PAID' }).where({ ID: commande.ID });

      return SELECT.one.from(Commandes).where({ ID: commande.ID });
    });

    // ── Action: Approve Devis (Admin) ──
    this.on('approveDevis', async (req) => {
      const { devisId } = req.data;
      await UPDATE(Devis).set({ status: 'APPROVED', statusDate: new Date().toISOString(), statusBy: req.user.id }).where({ ID: devisId });
      return SELECT.one.from(Devis, devisId);
    });

    // ── Action: Reject Devis (Admin) ──
    this.on('rejectDevis', async (req) => {
      const { devisId, reason } = req.data;
      await UPDATE(Devis).set({ status: 'REJECTED', statusDate: new Date().toISOString(), statusBy: req.user.id, notes: reason }).where({ ID: devisId });
      return SELECT.one.from(Devis, devisId);
    });

    // ── Action: Convert Devis → Commande (Client B2B) ──
    this.on('convertQuoteToOrder', async (req) => {
      const { devisId } = req.data;
      const devis = await SELECT.one.from(Devis).where({ ID: devisId });
      if (!devis)                    return req.error(404, 'Devis introuvable');
      if (devis.status !== 'APPROVED') return req.error(400, 'Le devis doit être approuvé par l\'administrateur');
      if (devis.convertedToOrder)    return req.error(400, 'Ce devis a déjà été converti en commande');

      const items = await SELECT.from(DevisItems).where({ parent_ID: devisId });
      const orderNum = await this._generateNumber('COMMANDE', 'CMD');

      const [commande] = await INSERT.into(Commandes).entries({
        orderNumber  : orderNum,
        clientB2B_ID : devis.clientB2B_ID,
        clientB2C_ID : devis.clientB2C_ID,
        devis_ID     : devis.ID,
        date         : new Date().toISOString().split('T')[0],
        status       : 'CONFIRMED',
        totalHT      : devis.totalHT,
        totalTVA     : devis.totalTVA,
        totalTTC     : devis.totalTTC,
        items        : items.map((item, i) => ({
          lineNumber  : i + 1,
          product_ID  : item.product_ID,
          description : item.description,
          quantity    : item.quantity,
          unit        : item.unit,
          unitPrice   : item.unitPrice,
          tvaRate     : item.tvaRate,
          totalHT     : item.totalHT,
          totalTVA    : item.totalTVA,
          totalTTC    : item.totalTTC
        }))
      });

      await UPDATE(Devis).set({ convertedToOrder: true, commande_ID: commande.ID, status: 'APPROVED' }).where({ ID: devisId });
      return SELECT.one.from(Commandes).where({ ID: commande.ID });
    });

    // ── Action: Send Order to Client ──
    this.on('sendOrderToClient', async (req) => {
      const { commandeId } = req.data;
      await UPDATE(Commandes).set({ status: 'SENT_TO_CLIENT', statusDate: new Date().toISOString() }).where({ ID: commandeId });
      return SELECT.one.from(Commandes, commandeId);
    });

    // ── Action: Accept Order ──
    this.on('acceptOrder', async (req) => {
      const { commandeId } = req.data;
      const cmd = await SELECT.one.from(Commandes).where({ ID: commandeId });
      if (!cmd) return req.error(404, 'Commande introuvable');
      await UPDATE(Commandes).set({ status: 'ACCEPTED_BY_CLIENT', statusDate: new Date().toISOString() }).where({ ID: commandeId });

      // Auto-create invoice
      const items  = await SELECT.from(CommandeItems).where({ parent_ID: commandeId });
      const invNum = await this._generateNumber('FACTURE', 'FAC');
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);
      const [facture] = await INSERT.into(Factures).entries({
        invoiceNumber : invNum,
        commande_ID   : commandeId,
        clientB2B_ID  : cmd.clientB2B_ID,
        clientB2C_ID  : cmd.clientB2C_ID,
        date          : new Date().toISOString().split('T')[0],
        dueDate       : dueDate.toISOString().split('T')[0],
        status        : 'SENT',
        totalHT       : cmd.totalHT,
        totalTVA      : cmd.totalTVA,
        totalTTC      : cmd.totalTTC,
        remainingAmount : cmd.totalTTC,
        items         : items.map((item, i) => ({
          lineNumber  : i + 1, product_ID: item.product_ID,
          description : item.description, quantity: item.quantity,
          unit        : item.unit, unitPrice: item.unitPrice,
          tvaRate     : item.tvaRate, totalHT: item.totalHT,
          totalTVA    : item.totalTVA, totalTTC: item.totalTTC
        }))
      });
      await UPDATE(Commandes).set({ invoiced: true, facture_ID: facture.ID }).where({ ID: commandeId });
      return SELECT.one.from(Commandes, commandeId);
    });

    // ── Action: Reject Order ──
    this.on('rejectOrder', async (req) => {
      const { commandeId } = req.data;
      await UPDATE(Commandes).set({ status: 'REJECTED_BY_CLIENT', statusDate: new Date().toISOString() }).where({ ID: commandeId });
      return SELECT.one.from(Commandes, commandeId);
    });

    // ── Action: Convert Commande → Facture ──
    this.on('convertCommandeToFacture', async (req) => {
      const { commandeId } = req.data;
      const commande = await SELECT.one.from(Commandes).where({ ID: commandeId });
      if (!commande)        return req.error(404, 'Commande introuvable');
      if (commande.invoiced) return req.error(400, 'Commande déjà facturée');

      const items  = await SELECT.from(CommandeItems).where({ parent_ID: commandeId });
      const invNum = await this._generateNumber('FACTURE', 'FAC');
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);
      const [facture] = await INSERT.into(Factures).entries({
        invoiceNumber : invNum,
        commande_ID   : commande.ID,
        clientB2B_ID  : commande.clientB2B_ID,
        clientB2C_ID  : commande.clientB2C_ID,
        date          : new Date().toISOString().split('T')[0],
        dueDate       : dueDate.toISOString().split('T')[0],
        status        : 'SENT',
        totalHT       : commande.totalHT,
        totalTVA      : commande.totalTVA,
        totalTTC      : commande.totalTTC,
        remainingAmount : commande.totalTTC,
        items         : items.map((item, i) => ({
          lineNumber  : i + 1, product_ID: item.product_ID,
          description : item.description, quantity: item.quantity,
          unit        : item.unit, unitPrice: item.unitPrice,
          tvaRate     : item.tvaRate, totalHT: item.totalHT,
          totalTVA    : item.totalTVA, totalTTC: item.totalTTC
        }))
      });
      await UPDATE(Commandes).set({ invoiced: true, facture_ID: facture.ID }).where({ ID: commandeId });
      return facture;
    });

    // ── Action: Record Payment ──
    this.on('recordPayment', async (req) => {
      const { factureId, amount, method, reference } = req.data;
      const facture = await SELECT.one.from(Factures).where({ ID: factureId });
      if (!facture) return req.error(404, 'Facture introuvable');

      const payNum = await this._generateNumber('PAIEMENT', 'PAY');
      const [paiement] = await INSERT.into(Paiements).entries({
        paymentNumber : payNum, facture_ID: factureId,
        date          : new Date().toISOString().split('T')[0],
        amount, method, reference
      });

      const newPaid = parseFloat(facture.paidAmount || 0) + parseFloat(amount);
      const newRem  = Math.max(0, parseFloat(facture.totalTTC) - newPaid);
      const newStat = newRem <= 0 ? 'PAID' : 'PARTIALLY_PAID';
      await UPDATE(Factures).set({ paidAmount: newPaid, remainingAmount: newRem, status: newStat }).where({ ID: factureId });

      if (newStat === 'PAID' && facture.commande_ID) {
        await UPDATE(Commandes).set({ status: 'PAID', statusDate: new Date().toISOString() }).where({ ID: facture.commande_ID });
      }
      return paiement;
    });

    // ── Function: Download Devis PDF ──
    this.on('downloadDevisPDF', async (req) => {
      const { devisId } = req.data;
      const devis = await SELECT.one.from(Devis).where({ ID: devisId });
      if (!devis) return req.error(404, 'Devis introuvable');
      const items = await SELECT.from(DevisItems).where({ parent_ID: devisId });
      const client = devis.clientB2B_ID
        ? await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2B).where({ ID: devis.clientB2B_ID })
        : await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2C).where({ ID: devis.clientB2C_ID });
      const pdfBuffer = await generateDevisPDF({ ...devis, items, clientB2B: devis.clientB2B_ID ? client : null, clientB2C: !devis.clientB2B_ID ? client : null });
      return pdfBuffer.toString('base64');
    });

    // ── Function: Download Facture PDF ──
    this.on('downloadFacturePDF', async (req) => {
      const { factureId } = req.data;
      const facture = await SELECT.one.from(Factures).where({ ID: factureId });
      if (!facture) return req.error(404, 'Facture introuvable');
      const items = await SELECT.from(FactureItems).where({ parent_ID: factureId });
      const pdfBuffer = await generateFacturePDF({ ...facture, items });
      return pdfBuffer.toString('base64');
    });

    // ── Function: Download Commande PDF ──
    this.on('downloadCommandePDF', async (req) => {
      const { commandeId } = req.data;
      const commande = await SELECT.one.from(Commandes).where({ ID: commandeId });
      if (!commande) return req.error(404, 'Commande introuvable');
      const items = await SELECT.from(CommandeItems).where({ parent_ID: commandeId });
      const client = commande.clientB2B_ID
        ? await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2B).where({ ID: commande.clientB2B_ID })
        : await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2C).where({ ID: commande.clientB2C_ID });
      const pdfBuffer = await generateCommandePDF({ ...commande, items, clientB2B: commande.clientB2B_ID ? client : null, clientB2C: !commande.clientB2B_ID ? client : null });
      return pdfBuffer.toString('base64');
    });

    // ── Action: Send Devis by Email ──
    this.on('sendDevisByEmail', async (req) => {
      try {
        const { devisId } = req.data;
        const devis = await SELECT.one.from(Devis).where({ ID: devisId });
        const items = await SELECT.from(DevisItems).where({ parent_ID: devisId });
        const pdfBuffer = await generateDevisPDF({ ...devis, items });
        const clientEmail = devis.clientB2B_ID
          ? await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2B, devis.clientB2B_ID).columns('email', 'contactName')
          : await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2C, devis.clientB2C_ID).columns('email', 'firstName');
        await sendDevis(clientEmail.email, clientEmail.contactName || clientEmail.firstName, devis.devisNumber, pdfBuffer);
        return true;
      } catch (e) { console.error('Send devis email error:', e.message); return false; }
    });

    // ── Action: Send Facture by Email ──
    this.on('sendFactureByEmail', async (req) => {
      try {
        const { factureId } = req.data;
        const facture = await SELECT.one.from(Factures).where({ ID: factureId });
        const items   = await SELECT.from(FactureItems).where({ parent_ID: factureId });
        const pdfBuffer = await generateFacturePDF({ ...facture, items });
        const clientEmail = facture.clientB2B_ID
          ? await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2B, facture.clientB2B_ID).columns('email', 'contactName')
          : await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2C, facture.clientB2C_ID).columns('email', 'firstName');
        await sendFacture(clientEmail.email, clientEmail.contactName || clientEmail.firstName,
          facture.invoiceNumber, facture.dueDate, facture.totalTTC, facture.currency_code, pdfBuffer);
        return true;
      } catch (e) { console.error('Send facture email error:', e.message); return false; }
    });

    await super.init();
  }

  async _generateNumber(objectType, prefix) {
    const { NumberRange } = cds.entities('sap.pme.admin');
    let range = await SELECT.one.from(NumberRange).where({ objectType });
    if (!range) {
      await INSERT.into(NumberRange).entries({ objectType, prefix, currentNumber: 0, padLength: 5 });
      range = { currentNumber: 0, padLength: 5, prefix };
    }
    const next = (range.currentNumber || 0) + 1;
    await UPDATE(NumberRange).set({ currentNumber: next }).where({ objectType });
    return `${prefix}-${String(next).padStart(range.padLength || 5, '0')}`;
  }

  _calculateLineTotal(data) {
    if (data.quantity != null && data.unitPrice != null) {
      const qty      = parseFloat(data.quantity);
      const price    = parseFloat(data.unitPrice);
      const discount = parseFloat(data.discount || 0);
      const tvaRate  = parseFloat(data.tvaRate || 19);
      const subtotal = qty * price * (1 - discount / 100);
      data.totalHT  = parseFloat(subtotal.toFixed(2));
      data.totalTVA = parseFloat((subtotal * tvaRate / 100).toFixed(2));
      data.totalTTC = parseFloat((data.totalHT + data.totalTVA).toFixed(2));
    }
  }
};
