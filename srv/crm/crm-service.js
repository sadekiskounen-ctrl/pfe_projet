// ============================================================
// CRM Service Handlers — Business Logic (Full)
// ============================================================

'use strict';
const cds = require('@sap/cds');
const { generateDevisPDF, generateFacturePDF } = require('../lib/pdf-generator');
const { sendDevis, sendFacture, sendWelcomeB2B } = require('../lib/email-service');
const { validateClientB2B, validateFournisseur } = require('../lib/validators');

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

    // ── Send welcome email after B2B registration ──
    this.after('CREATE', ClientsB2B, async (data) => {
      try {
        await sendWelcomeB2B(data.email, data.contactName, data.companyName);
      } catch (e) { console.warn('Welcome email failed:', e.message); }
    });

    // ── Action: Approve Devis ──
    this.on('approveDevis', async (req) => {
      const { devisId } = req.data;
      await UPDATE(Devis).set({ status: 'APPROVED', statusDate: new Date().toISOString(), statusBy: req.user.id }).where({ ID: devisId });
      return SELECT.one.from(Devis, devisId);
    });

    // ── Action: Reject Devis ──
    this.on('rejectDevis', async (req) => {
      const { devisId, reason } = req.data;
      await UPDATE(Devis).set({ status: 'REJECTED', statusDate: new Date().toISOString(), statusBy: req.user.id, notes: reason }).where({ ID: devisId });
      return SELECT.one.from(Devis, devisId);
    });

    // ── Action: Convert Devis → Commande ──
    this.on('convertDevisToCommande', async (req) => {
      const { devisId } = req.data;
      const devis = await SELECT.one.from(Devis).where({ ID: devisId }).columns('*');
      if (!devis)             return req.error(404, 'Devis introuvable');
      if (devis.status !== 'APPROVED')  return req.error(400, 'Le devis doit être approuvé');
      if (devis.convertedToOrder)       return req.error(400, 'Devis déjà converti');

      const items = await SELECT.from(DevisItems).where({ parent_ID: devisId });
      const orderNum = await this._generateNumber('COMMANDE', 'CMD');

      const [commande] = await INSERT.into(Commandes).entries({
        orderNumber: orderNum, clientB2B_ID: devis.clientB2B_ID, clientB2C_ID: devis.clientB2C_ID,
        devis_ID: devis.ID, date: new Date().toISOString().split('T')[0],
        status: 'CONFIRMED', totalHT: devis.totalHT, totalTVA: devis.totalTVA, totalTTC: devis.totalTTC,
        currency_code: devis.currency_code,
        items: items.map((item, i) => ({
          lineNumber: i + 1, product_ID: item.product_ID, description: item.description,
          quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice,
          tvaRate: item.tvaRate, totalHT: item.totalHT, totalTVA: item.totalTVA, totalTTC: item.totalTTC
        }))
      });
      await UPDATE(Devis).set({ convertedToOrder: true, commande_ID: commande?.ID }).where({ ID: devisId });
      return commande;
    });

    // ── Action: Convert Commande → Facture ──
    this.on('convertCommandeToFacture', async (req) => {
      const { commandeId } = req.data;
      const commande = await SELECT.one.from(Commandes).where({ ID: commandeId });
      if (!commande)          return req.error(404, 'Commande introuvable');
      if (commande.invoiced)  return req.error(400, 'Commande déjà facturée');

      const items = await SELECT.from(CommandeItems).where({ parent_ID: commandeId });
      const invNum = await this._generateNumber('FACTURE', 'FAC');
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);

      const [facture] = await INSERT.into(Factures).entries({
        invoiceNumber: invNum, commande_ID: commande.ID,
        clientB2B_ID: commande.clientB2B_ID, clientB2C_ID: commande.clientB2C_ID,
        date: new Date().toISOString().split('T')[0], dueDate: dueDate.toISOString().split('T')[0],
        status: 'SENT', totalHT: commande.totalHT, totalTVA: commande.totalTVA, totalTTC: commande.totalTTC,
        remainingAmount: commande.totalTTC, currency_code: commande.currency_code,
        items: items.map((item, i) => ({
          lineNumber: i + 1, product_ID: item.product_ID, description: item.description,
          quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice,
          tvaRate: item.tvaRate, totalHT: item.totalHT, totalTVA: item.totalTVA, totalTTC: item.totalTTC
        }))
      });
      await UPDATE(Commandes).set({ invoiced: true, facture_ID: facture?.ID }).where({ ID: commandeId });
      return facture;
    });

    // ── Action: Record Payment ──
    this.on('recordPayment', async (req) => {
      const { factureId, amount, method, reference } = req.data;
      const facture = await SELECT.one.from(Factures).where({ ID: factureId });
      if (!facture) return req.error(404, 'Facture introuvable');

      const payNum = await this._generateNumber('PAIEMENT', 'PAY');
      const [paiement] = await INSERT.into(Paiements).entries({
        paymentNumber: payNum, facture_ID: factureId,
        date: new Date().toISOString().split('T')[0], amount, method, reference,
        currency_code: facture.currency_code
      });

      const newPaid = parseFloat(facture.paidAmount || 0) + parseFloat(amount);
      const newRem  = Math.max(0, parseFloat(facture.totalTTC) - newPaid);
      const newStat = newRem <= 0 ? 'PAID' : 'PARTIALLY_PAID';
      await UPDATE(Factures).set({ paidAmount: newPaid, remainingAmount: newRem, status: newStat }).where({ ID: factureId });
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

    // ── Action: Send Devis by Email ──
    this.on('sendDevisByEmail', async (req) => {
      const { devisId } = req.data;
      try {
        const devis = await SELECT.one.from(Devis).where({ ID: devisId });
        const items = await SELECT.from(DevisItems).where({ parent_ID: devisId });
        const pdfBuffer = await generateDevisPDF({ ...devis, items });
        const clientEmail = devis.clientB2B_ID
          ? (await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2B, devis.clientB2B_ID).columns('email', 'contactName'))
          : (await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2C, devis.clientB2C_ID).columns('email', 'firstName'));
        await sendDevis(clientEmail.email, clientEmail.contactName || clientEmail.firstName, devis.devisNumber, pdfBuffer);
        return true;
      } catch (e) {
        console.error('Send devis email error:', e.message);
        return false;
      }
    });

    // ── Action: Send Facture by Email ──
    this.on('sendFactureByEmail', async (req) => {
      const { factureId } = req.data;
      try {
        const facture = await SELECT.one.from(Factures).where({ ID: factureId });
        const items = await SELECT.from(FactureItems).where({ parent_ID: factureId });
        const pdfBuffer = await generateFacturePDF({ ...facture, items });
        const clientEmail = facture.clientB2B_ID
          ? (await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2B, facture.clientB2B_ID).columns('email', 'contactName'))
          : (await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2C, facture.clientB2C_ID).columns('email', 'firstName'));
        await sendFacture(clientEmail.email, clientEmail.contactName || clientEmail.firstName,
          facture.invoiceNumber, facture.dueDate, facture.totalTTC, facture.currency_code, pdfBuffer);
        return true;
      } catch (e) {
        console.error('Send facture email error:', e.message);
        return false;
      }
    });

    await super.init();
  }

  async _generateNumber(objectType, prefix) {
    const { NumberRange } = cds.entities('sap.pme.admin');
    const tx = cds.tx(this);
    let range = await tx.run(SELECT.one.from(NumberRange).where({ objectType }));
    if (!range) {
      await tx.run(INSERT.into(NumberRange).entries({ objectType, prefix, currentNumber: 0, padLength: 5 }));
      range = { currentNumber: 0, padLength: 5, prefix };
    }
    const next = (range.currentNumber || 0) + 1;
    await tx.run(UPDATE(NumberRange).set({ currentNumber: next }).where({ objectType }));
    return `${prefix}-${String(next).padStart(range.padLength || 5, '0')}`;
  }

  _calculateLineTotal(data) {
    if (data.quantity != null && data.unitPrice != null) {
      const qty = parseFloat(data.quantity);
      const price = parseFloat(data.unitPrice);
      const discount = parseFloat(data.discount || 0);
      const tvaRate = parseFloat(data.tvaRate || 19);
      const subtotal = qty * price * (1 - discount / 100);
      data.totalHT  = subtotal;
      data.totalTVA = subtotal * (tvaRate / 100);
      data.totalTTC = subtotal + data.totalTVA;
    }
  }
};
