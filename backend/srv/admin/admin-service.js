// ============================================================
// Admin Service Handlers
// ============================================================

const cds = require('@sap/cds');
const { generateRegistrationPDF, generateFacturePDF, generateDevisPDF, generateCommandePDF } = require('../lib/pdf-generator');

module.exports = class AdminService extends cds.ApplicationService {

  async init() {
    const { BusinessPartners, Notifications, AuditLogs } = this.entities;

    // ── Stream PDF media content ──
    this.on('READ', BusinessPartners, async (req, next) => {
      const url = req._?.req?.url;
      if (url && url.includes('$value')) {
        console.log("[Admin] Streaming partner document...");
        return next();
      }
      return next();
    });

    // ── Action: Activate Business Partner ──
    this.on('activateBusinessPartner', async (req) => {
      const { bpId } = req.data;
      await UPDATE(BusinessPartners).set({ status: 'ACTIVE' }).where({ ID: bpId });
      await this._logAudit(req, 'STATUS_CHANGE', 'BusinessPartner', bpId, 'Activated');
      return SELECT.one.from(BusinessPartners, bpId);
    });

    // ── Action: Block Business Partner ──
    this.on('blockBusinessPartner', async (req) => {
      const { bpId, reason } = req.data;
      await UPDATE(BusinessPartners).set({ status: 'BLOCKED', blockReason: reason }).where({ ID: bpId });
      await this._logAudit(req, 'STATUS_CHANGE', 'BusinessPartner', bpId, `Blocked: ${reason}`);
      return SELECT.one.from(BusinessPartners, bpId);
    });

    // ── Action: Send Notification ──
    this.on('sendNotification', async (req) => {
      const { userId, title, message, type } = req.data;
      return INSERT.into(Notifications).entries({
        userId, title, message,
        type: type || 'INFO'
      });
    });

    // ── Audit all write operations ──
    this.after(['CREATE', 'UPDATE', 'DELETE'], '*', async (data, req) => {
      if (req.target?.name && !req.target.name.includes('AuditLog') && !req.target.name.includes('Notification')) {
        try {
          await this._logAudit(req, req.event, req.target.name, data?.ID, null);
        } catch (e) {
          // Don't fail the main operation if audit logging fails
          console.warn('Audit log failed:', e.message);
        }
      }
    });

    // ── Action: Revise Devis ──
    this.on('reviseDevis', async (req) => {
      const { devisId, discountGlobal, items } = req.data;
      const { Devis, DevisItem } = cds.entities('sap.pme.doc');

      const devis = await SELECT.one.from(Devis).where({ ID: devisId });
      if (!devis) return req.error(404, `Devis ${devisId} non trouvé`);
      if (devis.status === 'APPROVED' || devis.status === 'REJECTED') {
        return req.error(400, `Impossible de modifier un devis au statut ${devis.status}`);
      }

      let totalHT = 0;
      let totalTVA = 0;
      
      if (items && items.length > 0) {
        for (const reqItem of items) {
          const item = await SELECT.one.from(DevisItem).where({ ID: reqItem.itemId, parent_ID: devisId });
          if (!item) continue;
          
          const price = parseFloat(reqItem.unitPrice != null ? reqItem.unitPrice : item.unitPrice);
          const qty = parseFloat(item.quantity || 1);
          const disc = parseFloat(reqItem.discount != null ? reqItem.discount : item.discount || 0);
          const tvaRate = parseFloat(item.tvaRate || 19);
          
          const subtotal = qty * price * (1 - disc / 100);
          const tva = subtotal * (tvaRate / 100);
          const ttc = subtotal + tva;
          
          await UPDATE(DevisItem).set({
            unitPrice: price, discount: disc,
            totalHT: subtotal, totalTVA: tva, totalTTC: ttc
          }).where({ ID: reqItem.itemId });
          
          totalHT += subtotal;
          totalTVA += tva;
        }
      } else {
        // If no items passed, we still need to calculate from existing items
        const existItems = await SELECT.from(DevisItem).where({ parent_ID: devisId });
        for (const item of existItems) {
          totalHT += parseFloat(item.totalHT || 0);
          totalTVA += parseFloat(item.totalTVA || 0);
        }
      }
      
      const globDisc = parseFloat(discountGlobal || 0);
      const finalHT = totalHT * (1 - globDisc / 100);
      const finalTVA = totalTVA * (1 - globDisc / 100);
      const finalTTC = finalHT + finalTVA;
      
      await UPDATE(Devis).set({
        discount: globDisc,
        totalHT: finalHT, totalTVA: finalTVA, totalTTC: finalTTC
      }).where({ ID: devisId });
      
      await this._logAudit(req, 'UPDATE', 'Devis', devisId, 'Prices revised by admin');
      
      const res = await SELECT.one.from(Devis).where({ ID: devisId });
      return res;
    });

    // ── PDF: Download Registration Certificate ──
    this.on('downloadRegistrationPDF', async (req) => {
      try {
        const { regId } = req.data;
        console.log('[PDF] Demande pour ID:', regId);
        
        const { RegistrationRequest } = cds.entities('pme.registration');
        const reg = await SELECT.one.from(RegistrationRequest, regId);
        
        if (!reg) {
          console.error('[PDF] Enregistrement non trouvé pour ID:', regId);
          return req.error(404, `Registration ${regId} not found`);
        }

        console.log('[PDF] Génération en cours pour:', reg.companyName);
        const pdfBuffer = await generateRegistrationPDF(reg);
        console.log('[PDF] Succès, envoi base64...');
        return pdfBuffer.toString('base64');
      } catch (err) {
        console.error('[PDF] Erreur critique:', err.message);
        return req.error(500, err.message);
      }
    });

    // ── PDF: Download Facture ──
    this.on('downloadFacturePDF', async (req) => {
      const { factId } = req.data;
      const { FactureClient, FactureClientItem, FactureFournisseur, FactureFournisseurItem } = cds.entities('sap.pme.doc');
      
      let fact = await SELECT.one.from(FactureClient, factId);
      if (fact) {
        const items = await SELECT.from(FactureClientItem).where({ parent_ID: factId });
        
        // Enrich items with product name if description is missing
        const { Produit } = cds.entities('sap.pme');
        for (let item of items) {
          if (!item.description && item.product_ID) {
            const prod = await SELECT.one.from(Produit).where({ ID: item.product_ID });
            item.description = prod?.name || `Produit ${item.product_ID}`;
          }
        }

        const client = fact.clientB2B_ID
          ? await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2B).where({ ID: fact.clientB2B_ID })
          : await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2C).where({ ID: fact.clientB2C_ID });
        const pdfBuffer = await generateFacturePDF({
          ...fact,
          items,
          clientB2B: fact.clientB2B_ID ? client : null,
          clientB2C: !fact.clientB2B_ID ? client : null
        });
        return pdfBuffer.toString('base64');
      }

      let suppFact = await SELECT.one.from(FactureFournisseur, factId);
      if (suppFact) {
        const items = await SELECT.from(FactureFournisseurItem).where({ parent_ID: factId });
        const supplier = await SELECT.one.from(cds.entities('sap.pme.srm').Fournisseur).where({ ID: suppFact.fournisseur_ID });
        const pdfBuffer = await generateFacturePDF({
          ...suppFact,
          items,
          clientB2B: {
            companyName: supplier ? supplier.companyName : 'Fournisseur',
            email: supplier ? supplier.email : '',
            phone: supplier ? supplier.phone : '',
            rc: supplier ? supplier.rc : ''
          }
        });
        return pdfBuffer.toString('base64');
      }

      return req.error(404, `Facture ${factId} not found`);
    });

    // ── PDF: Download Devis ──
    this.on('downloadDevisPDF', async (req) => {
      const { devisId } = req.data;
      const { Devis, DevisItem } = cds.entities('sap.pme.doc');
      const devis = await SELECT.one.from(Devis, devisId);
      if (!devis) return req.error(404, `Devis ${devisId} not found`);
      const items = await SELECT.from(DevisItem).where({ parent_ID: devisId });
      const client = devis.clientB2B_ID
        ? await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2B).where({ ID: devis.clientB2B_ID })
        : await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2C).where({ ID: devis.clientB2C_ID });

      const pdfBuffer = await generateDevisPDF({ ...devis, items, clientB2B: devis.clientB2B_ID ? client : null, clientB2C: !devis.clientB2B_ID ? client : null });
      return pdfBuffer.toString('base64');
    });

    // ── PDF: Download Commande ──
    this.on('downloadCommandePDF', async (req) => {
      const { commandeId } = req.data;
      const { CommandeClient, CommandeItem } = cds.entities('sap.pme.doc');
      const commande = await SELECT.one.from(CommandeClient, commandeId);
      if (!commande) return req.error(404, `Commande ${commandeId} not found`);
      const items = await SELECT.from(CommandeItem).where({ parent_ID: commandeId });
      const client = commande.clientB2B_ID
        ? await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2B).where({ ID: commande.clientB2B_ID })
        : await SELECT.one.from(cds.entities('sap.pme.crm').ClientB2C).where({ ID: commande.clientB2C_ID });

      const pdfBuffer = await generateCommandePDF({ ...commande, items, clientB2B: commande.clientB2B_ID ? client : null, clientB2C: !commande.clientB2B_ID ? client : null });
      return pdfBuffer.toString('base64');
    });

    // ── Action: Validate Cash (Espèces) Order ──
    this.on('validateCashOrder', async (req) => {
      const { commandeId } = req.data;
      const { CommandeClient, CommandeItem, FactureClient, Paiement } = cds.entities('sap.pme.doc');
      const { NumberRange } = cds.entities('sap.pme.admin');
      const { Produit } = cds.entities('sap.pme');

      const commande = await SELECT.one.from(CommandeClient).where({ ID: commandeId });
      if (!commande) return req.error(404, 'Commande introuvable');
      if (commande.status === 'PAID') return req.error(400, 'Commande déjà payée');
      if (commande.status !== 'PENDING' && commande.status !== 'CONFIRMED') return req.error(400, `Impossible de valider une commande au statut ${commande.status}`);

      const lineItems = await SELECT.from(CommandeItem).where({ parent_ID: commandeId });

      // Generate Invoice Number
      let invNum = 'FAC-00001';
      let invRange = await SELECT.one.from(NumberRange).where({ objectType: 'FACTURE' });
      if (!invRange) {
        await INSERT.into(NumberRange).entries({ objectType: 'FACTURE', prefix: 'FAC', currentNumber: 0, padLength: 5 });
        invRange = { currentNumber: 0, padLength: 5, prefix: 'FAC' };
      }
      const invNext = (invRange.currentNumber || 0) + 1;
      invNum = `FAC-${String(invNext).padStart(invRange.padLength || 5, '0')}`;
      await UPDATE(NumberRange).set({ currentNumber: invNext }).where({ objectType: 'FACTURE' });

      // Create Invoice
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      await INSERT.into(FactureClient).entries({
        invoiceNumber : invNum,
        commande_ID   : commande.ID,
        clientB2B_ID  : commande.clientB2B_ID,
        clientB2C_ID  : commande.clientB2C_ID,
        date          : new Date().toISOString().split('T')[0],
        dueDate       : dueDate.toISOString().split('T')[0],
        status        : 'PAID',
        totalHT       : commande.totalHT,
        totalTVA      : commande.totalTVA,
        totalTTC      : commande.totalTTC,
        discount      : commande.discount || 0,
        paidAmount    : commande.totalTTC,
        remainingAmount : 0,
        currency_code   : 'DZD',
        items         : lineItems.map(l => ({ ...l, parent_ID: null, ID: cds.utils.uuid() }))
      });

      // Get new facture ID
      const facture = await SELECT.one.from(FactureClient).where({ invoiceNumber: invNum });

      // Generate Payment Number
      let payNum = 'PAY-00001';
      let payRange = await SELECT.one.from(NumberRange).where({ objectType: 'PAIEMENT' });
      if (!payRange) {
        await INSERT.into(NumberRange).entries({ objectType: 'PAIEMENT', prefix: 'PAY', currentNumber: 0, padLength: 5 });
        payRange = { currentNumber: 0, padLength: 5, prefix: 'PAY' };
      }
      const payNext = (payRange.currentNumber || 0) + 1;
      payNum = `PAY-${String(payNext).padStart(payRange.padLength || 5, '0')}`;
      await UPDATE(NumberRange).set({ currentNumber: payNext }).where({ objectType: 'PAIEMENT' });

      // Record Payment
      await INSERT.into(Paiement).entries({
        paymentNumber : payNum,
        facture_ID    : facture.ID,
        date          : new Date().toISOString().split('T')[0],
        amount        : commande.totalTTC,
        method        : 'ESPECES',
        reference     : `CASH-ADMIN-${Date.now()}`
      });

      // Update Order Status
      await UPDATE(CommandeClient).set({ 
        invoiced: true, 
        facture_ID: facture.ID, 
        status: 'PAID' 
      }).where({ ID: commande.ID });

      // Deduct stock
      for (const item of lineItems) {
        await UPDATE(Produit).where({ ID: item.product_ID }).with({ stock: { '-=': item.quantity } });
      }

      await this._logAudit(req, 'VALIDATE_CASH_ORDER', 'CommandeClient', commandeId, `Order validated + paid via espèces. Invoice ${invNum}`);

      return SELECT.one.from(CommandeClient).where({ ID: commande.ID });
    });

    // ── Action: Resolve Dispute ──
    this.on('resolveDispute', async (req) => {
      const { invoiceId } = req.data;
      const { FactureFournisseur } = cds.entities('sap.pme.doc');

      const invoice = await SELECT.one.from(FactureFournisseur).where({ ID: invoiceId });
      if (!invoice) return req.error(404, 'Facture introuvable');
      if (invoice.matchStatus !== 'DISCREPANCY') {
        return req.error(400, "Cette facture n'est pas en litige/écart");
      }

      await UPDATE(FactureFournisseur).set({
        matchStatus : 'MATCHED',
        status      : 'PAID',
        matchDate   : new Date().toISOString(),
        matchBy     : req.user?.id || 'admin'
      }).where({ ID: invoiceId });

      await this._logAudit(req, 'RESOLVE_DISPUTE', 'FactureFournisseur', invoiceId, `Dispute resolved for invoice ${invoice.invoiceNumber}. Status forced to PAID.`);

      return SELECT.one.from(FactureFournisseur).where({ ID: invoiceId });
    });

    await super.init();
  }

  async _logAudit(req, action, entity, entityId, details) {
    const { AuditLogs } = this.entities;
    try {
      await INSERT.into(AuditLogs).entries({
        actionType: action,
        entityName: entity,
        entityId,
        userId: req.user?.id,
        userName: req.user?.attr?.name || req.user?.id,
        details
      });
    } catch (e) {
      console.warn('Audit insert failed:', e.message);
    }
  }
};
