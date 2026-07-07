// ============================================================
// Admin Service Handlers
// ============================================================

const cds = require('@sap/cds');
const { generateRegistrationPDF, generateFacturePDF, generateDevisPDF, generateCommandePDF, generateInvoiceFournisseurPDF } = require('../lib/pdf-generator');
const { sendAccountBlocked, sendAccountReactivated, sendAccountDeleted, sendFacture } = require('../lib/email-service');

const _getLocalDate = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

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
      console.log(`[Admin Service] activateBusinessPartner received. bpId: ${bpId}`);

      try {
        // 1. Mettre à jour le Business Partner principal
        const updatedCount = await UPDATE('sap.pme.BusinessPartner')
          .set({ status: 'ACTIVE', blockReason: null })
          .where({ ID: bpId });

        console.log(`[Admin Service] BusinessPartner table activation result: ${updatedCount} row(s) updated.`);

        // 2. Récupérer le partenaire
        const bp = await SELECT.one.from('sap.pme.BusinessPartner').where({ ID: bpId });
        console.log(`[Admin Service] Queried BusinessPartner after activation:`, bp);

        if (bp) {
          // 3. Propager le statut ACTIVE sur les tables spécifiques correspondantes
          let specificUpdateCount = 0;
          if (bp.bpType === 'CLIENT_B2B') {
            specificUpdateCount = await UPDATE('sap.pme.crm.ClientB2B').set({ status: 'ACTIVE' }).where({ bp_ID: bpId });
            console.log(`[Admin Service] Propagated ACTIVE to ClientB2B: ${specificUpdateCount} row(s) updated.`);
          } else if (bp.bpType === 'CLIENT_B2C') {
            specificUpdateCount = await UPDATE('sap.pme.crm.ClientB2C').set({ status: 'ACTIVE' }).where({ bp_ID: bpId });
            console.log(`[Admin Service] Propagated ACTIVE to ClientB2C: ${specificUpdateCount} row(s) updated.`);
          } else if (bp.bpType === 'FOURNISSEUR') {
            specificUpdateCount = await UPDATE('sap.pme.srm.Fournisseur').set({ status: 'ACTIVE' }).where({ bp_ID: bpId });
            console.log(`[Admin Service] Propagated ACTIVE to Fournisseur: ${specificUpdateCount} row(s) updated.`);
          }

          // 4. Enregistrer dans les logs d'audit
          await this._logAudit(req, 'STATUS_CHANGE', 'BusinessPartner', bpId, 'Activated');

          // 5. Envoyer l'email de réactivation
          if (bp.email) {
            console.log(`[Admin Service] Invoking sendAccountReactivated for email: ${bp.email}`);
            sendAccountReactivated(bp.email, bp.displayName)
              .then(() => {
                console.log(`[Admin Service] Activation email successfully queued/sent to: ${bp.email}`);
              })
              .catch(mailErr => {
                console.warn('[Admin Service] Échec lors de l\'envoi de l\'email de réactivation:', mailErr.message);
              });
          }
        }
      } catch (err) {
        console.error('[Admin Service] Error during activateBusinessPartner action:', err);
        return req.error(500, `Erreur lors de l'activation: ${err.message}`);
      }

      return SELECT.one.from('sap.pme.BusinessPartner', bpId);
    });

    // ── Event: Before Deleting Business Partner (Send deletion email) ──
    this.before('DELETE', BusinessPartners, async (req) => {
      const { ID } = req.data;
      console.log(`[Admin Service] before DELETE BusinessPartners received for ID: ${ID}`);
      if (ID) {
        try {
          const bp = await SELECT.one.from('sap.pme.BusinessPartner').columns('email', 'displayName').where({ ID });
          console.log(`[Admin Service] Queried BusinessPartner for deletion email:`, bp);
          if (bp && bp.email) {
            console.log(`[Admin Service] Invoking sendAccountDeleted for email: ${bp.email}`);
            sendAccountDeleted(bp.email, bp.displayName)
              .then(() => {
                console.log(`[Admin Service] Deletion email successfully queued/sent to: ${bp.email}`);
              })
              .catch(mailErr => {
                console.warn('[Admin Service] Échec lors de l\'envoi de l\'email de suppression:', mailErr.message);
              });
          }
        } catch (err) {
          console.error('[Admin Service] Error while querying BusinessPartner for deletion email:', err.message);
        }
      }
    });

    // ── Action: Block Business Partner ──
    this.on('blockBusinessPartner', async (req) => {
      const { bpId, reason } = req.data;
      console.log(`[Admin Service] blockBusinessPartner received. bpId: ${bpId}, reason: ${reason}`);

      try {
        // 1. Mettre à jour le Business Partner principal
        const updatedCount = await UPDATE('sap.pme.BusinessPartner')
          .set({ status: 'BLOCKED', blockReason: reason })
          .where({ ID: bpId });

        console.log(`[Admin Service] BusinessPartner table update result: ${updatedCount} row(s) updated.`);

        // 2. Récupérer le partenaire pour connaître son type et ses infos
        const bp = await SELECT.one.from('sap.pme.BusinessPartner').where({ ID: bpId });
        console.log(`[Admin Service] Queried BusinessPartner after update:`, bp);

        if (bp) {
          // 3. Propager le statut BLOCKED sur les tables spécifiques correspondantes
          let specificUpdateCount = 0;
          if (bp.bpType === 'CLIENT_B2B') {
            specificUpdateCount = await UPDATE('sap.pme.crm.ClientB2B').set({ status: 'BLOCKED' }).where({ bp_ID: bpId });
            console.log(`[Admin Service] Propagated block to ClientB2B: ${specificUpdateCount} row(s) updated.`);
          } else if (bp.bpType === 'CLIENT_B2C') {
            specificUpdateCount = await UPDATE('sap.pme.crm.ClientB2C').set({ status: 'BLOCKED' }).where({ bp_ID: bpId });
            console.log(`[Admin Service] Propagated block to ClientB2C: ${specificUpdateCount} row(s) updated.`);
          } else if (bp.bpType === 'FOURNISSEUR') {
            specificUpdateCount = await UPDATE('sap.pme.srm.Fournisseur').set({ status: 'BLOCKED' }).where({ bp_ID: bpId });
            console.log(`[Admin Service] Propagated block to Fournisseur: ${specificUpdateCount} row(s) updated.`);
          }

          // 4. Enregistrer dans les logs d'audit
          await this._logAudit(req, 'STATUS_CHANGE', 'BusinessPartner', bpId, `Blocked: ${reason}`);

          // 5. Envoyer le mail de notification
          if (bp.email) {
            console.log(`[Admin Service] Invoking sendAccountBlocked for email: ${bp.email}`);
            sendAccountBlocked(bp.email, bp.displayName, reason)
              .then(() => {
                console.log(`[Admin Service] Notification email successfully queued/sent to: ${bp.email}`);
              })
              .catch(mailErr => {
                console.warn('[Admin Service] Échec lors de l\'envoi de l\'email de blocage:', mailErr.message);
              });
          } else {
            console.warn(`[Admin Service] BusinessPartner ${bpId} has no email configured, skipping email notification.`);
          }
        } else {
          console.warn(`[Admin Service] BusinessPartner with ID ${bpId} was not found after update!`);
        }
      } catch (err) {
        console.error('[Admin Service] Error during blockBusinessPartner action:', err);
        return req.error(500, `Erreur lors du blocage: ${err.message}`);
      }

      return SELECT.one.from('sap.pme.BusinessPartner', bpId);
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
        const pdfBuffer = await generateInvoiceFournisseurPDF({
          ...suppFact,
          items,
          fournisseur: supplier
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
        date          : _getLocalDate(),
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
        date          : _getLocalDate(),
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
        paidAmount  : invoice.totalTTC,
        remainingAmount : 0,
        matchDate   : new Date().toISOString(),
        matchBy     : req.user?.id || 'admin'
      }).where({ ID: invoiceId });

      await this._logAudit(req, 'RESOLVE_DISPUTE', 'FactureFournisseur', invoiceId, `Dispute resolved for invoice ${invoice.invoiceNumber}. Status forced to PAID.`);

      return SELECT.one.from(FactureFournisseur).where({ ID: invoiceId });
    });

    // ── Action: Pay Supplier Invoice ──
    this.on('paySupplierInvoice', async (req) => {
      const { invoiceId, paymentMethod } = req.data;
      const { FactureFournisseur, BonCommandeFournisseur, Paiement } = cds.entities('sap.pme.doc');
      const { NumberRange } = cds.entities('sap.pme.admin');

      const invoice = await SELECT.one.from(FactureFournisseur).where({ ID: invoiceId });
      if (!invoice) return req.error(404, 'Facture introuvable');
      if (invoice.status !== 'APPROVED') return req.error(400, "Seules les factures approuvées (3-Way Match conforme) peuvent être payées");

      if (paymentMethod === 'ESPECES') {
        // Pour un paiement en espèces, la facture passe au statut 'PENDING_CASH' 
        // et attend que le fournisseur confirme de son côté sur son portail.
        await UPDATE(FactureFournisseur).set({
          status : 'PENDING_CASH'
        }).where({ ID: invoiceId });

        await this._logAudit(req, 'INITIATE_CASH_PAYMENT', 'FactureFournisseur', invoiceId, `Supplier invoice ${invoice.invoiceNumber} payment initiated in cash. Pending supplier confirmation.`);
        return SELECT.one.from(FactureFournisseur).where({ ID: invoiceId });
      }

      // Paiement en ligne (CARTE) : exécuté directement
      await UPDATE(FactureFournisseur).set({
        status          : 'PAID',
        paidAmount      : invoice.totalTTC,
        remainingAmount : 0
      }).where({ ID: invoiceId });

      // Generate Payment Number for Supplier Payment
      let payNum = 'PAY-SUP-00001';
      let payRange = await SELECT.one.from(NumberRange).where({ objectType: 'PAIEMENT_FOURNISSEUR' });
      if (!payRange) {
        await INSERT.into(NumberRange).entries({ objectType: 'PAIEMENT_FOURNISSEUR', prefix: 'PYS', currentNumber: 0, padLength: 5 });
        payRange = { currentNumber: 0, padLength: 5, prefix: 'PYS' };
      }
      const payNext = (payRange.currentNumber || 0) + 1;
      payNum = `PYS-${String(payNext).padStart(payRange.padLength || 5, '0')}`;
      await UPDATE(NumberRange).set({ currentNumber: payNext }).where({ objectType: 'PAIEMENT_FOURNISSEUR' });

      // Record Payment in Paiement entity
      await INSERT.into(Paiement).entries({
        paymentNumber : payNum,
        date          : _getLocalDate(),
        amount        : invoice.totalTTC,
        method        : 'CARTE',
        reference     : `SUP-PAY-CARTE-${Date.now()}`
      });

      // Update PO Status to CLOSED
      if (invoice.bonCommande_ID) {
        await UPDATE(BonCommandeFournisseur).set({
          status: 'CLOSED',
          statusDate: new Date().toISOString()
        }).where({ ID: invoice.bonCommande_ID });
      }

      await this._logAudit(req, 'PAY_SUPPLIER_INVOICE', 'FactureFournisseur', invoiceId, `Supplier invoice ${invoice.invoiceNumber} paid via CARTE online. Linked PO closed.`);

      return SELECT.one.from(FactureFournisseur).where({ ID: invoiceId });
    });

    // ── Auto send Facture on Cash Order Validation by Admin ──
    this.after('validateCashOrder', async (commande, req) => {
      try {
        const commandeId = commande.ID;
        const fullCommande = await SELECT.one.from('sap.pme.doc.CommandeClient').where({ ID: commandeId });
        if (fullCommande.facture_ID) {
          const client = fullCommande.clientB2B_ID
            ? await SELECT.one.from('sap.pme.crm.ClientB2B', fullCommande.clientB2B_ID)
            : await SELECT.one.from('sap.pme.crm.ClientB2C', fullCommande.clientB2C_ID);
          const clientEmail = client.email;
          const clientName = fullCommande.clientB2B_ID
            ? (client.contactName || client.companyName)
            : (client.firstName || client.lastName);
          
          const facture = await SELECT.one.from('sap.pme.doc.FactureClient').where({ ID: fullCommande.facture_ID });
          if (facture) {
            const factItems = await SELECT.from('sap.pme.doc.FactureItem').where({ parent_ID: facture.ID });
            const { Produit } = cds.entities('sap.pme');
            for (let item of factItems) {
              if (!item.description && item.product_ID) {
                const prod = await SELECT.one.from(Produit).where({ ID: item.product_ID });
                item.description = prod?.name || `Produit ${item.product_ID}`;
              }
            }
            const pdfBufferFact = await generateFacturePDF({
              ...facture,
              items: factItems,
              clientB2B: fullCommande.clientB2B_ID ? client : null,
              clientB2C: !fullCommande.clientB2B_ID ? client : null
            });
            sendFacture(clientEmail, clientName, facture.invoiceNumber, facture.dueDate, facture.totalTTC, facture.currency_code, pdfBufferFact).catch((err) => {
              console.error('Send validateCashOrder facture email error in background:', err.message);
            });
          }
        }
      } catch (e) {
        console.error('Auto send validateCashOrder email error:', e.message);
      }
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
