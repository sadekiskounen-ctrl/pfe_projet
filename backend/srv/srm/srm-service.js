// ============================================================
// SRM Service Handlers — Business Logic
// PME Connect — Portail Fournisseur
// ============================================================

'use strict';
const cds = require('@sap/cds');
const { generatePOFournisseurPDF, generateGRFournisseurPDF, generateInvoiceFournisseurPDF } = require('../lib/pdf-generator');
const { sendPOFournisseur, sendInvoiceFournisseur, sendGRFournisseur } = require('../lib/email-service');

const _getLocalDate = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

module.exports = class SRMService extends cds.ApplicationService {

  async init() {
    const {
      Fournisseurs, FournisseurDocuments, Evaluations,
      RFQs, RFQItems, RFQResponses, RFQResponseItems,
      BonsCommande, POItems, Receptions, ReceptionItems,
      FacturesFournisseur, FactureFournisseurItems
    } = this.entities;

    // ── Auto-generate document numbers & budget calculation ──
    this.before('CREATE', RFQs,         async (req) => { 
      req.data.rfqNumber = await this._generateNumber('RFQ',  'RFQ'); 
      if (req.data.items) {
        let total = 0;
        for (const item of req.data.items) {
          total += (parseFloat(item.quantity) || 0) * (parseFloat(item.targetPrice) || 0);
        }
        req.data.totalBudget = parseFloat(total.toFixed(2));
      }
    });
    
    this.before('UPDATE', RFQs,         async (req) => {
      if (req.data.items) {
        let total = 0;
        for (const item of req.data.items) {
          total += (parseFloat(item.quantity) || 0) * (parseFloat(item.targetPrice) || 0);
        }
        req.data.totalBudget = parseFloat(total.toFixed(2));
      }
    });
    this.before('CREATE', BonsCommande, async (req) => { req.data.poNumber     = await this._generateNumber('PO',   'PO');  });
    this.before('CREATE', Receptions,   async (req) => { req.data.receiptNumber = await this._generateNumber('GR',  'GR');  });
    this.before('CREATE', FacturesFournisseur, async (req) => { req.data.invoiceNumber = await this._generateNumber('SUPINV', 'SINV'); });

    // ─────────────────────────────────────────
    // ACTION: Soumettre une réponse à un RFQ
    // ─────────────────────────────────────────
    this.on('submitRFQResponse', async (req) => {
      const { rfqId, fournisseurId, deliveryDays, validUntil, notes, items } = req.data;

      const rfq = await SELECT.one.from(RFQs).where({ ID: rfqId });
      if (!rfq) return req.error(404, 'Appel d\'offres introuvable');
      if (rfq.status === 'CLOSED' || rfq.status === 'CANCELLED') {
        return req.error(400, 'Cet appel d\'offres est clôturé');
      }

      // Check if this supplier already responded
      const existing = await SELECT.one.from(RFQResponses).where({ rfq_ID: rfqId, fournisseur_ID: fournisseurId });
      if (existing) return req.error(400, 'Vous avez déjà soumis une offre pour cet appel d\'offres');

      // Build response items and calculate total
      const rfqItemsList = await SELECT.from(RFQItems).where({ parent_ID: rfqId });
      const responseItems = [];
      let totalAmount = 0;

      for (const inputItem of (items || [])) {
        const rfqItem = rfqItemsList.find(ri => ri.ID === inputItem.rfqItemId);
        if (!rfqItem) continue;
        const unitPrice  = parseFloat(inputItem.unitPrice);
        const totalPrice = unitPrice * parseFloat(rfqItem.quantity);
        totalAmount += totalPrice;
        responseItems.push({
          ID         : cds.utils.uuid(),
          rfqItem_ID : inputItem.rfqItemId,
          unitPrice,
          totalPrice : parseFloat(totalPrice.toFixed(2)),
          notes      : inputItem.notes || ''
        });
      }

      const [response] = await INSERT.into(RFQResponses).entries({
        rfq_ID          : rfqId,
        fournisseur_ID  : fournisseurId,
        date            : _getLocalDate(),
        totalAmount     : parseFloat(totalAmount.toFixed(2)),
        deliveryDays    : deliveryDays || 7,
        validUntil      : validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        selected        : false,
        notes           : notes || '',
        items           : responseItems
      });

      try {
        const { Notification } = cds.entities('sap.pme.admin');
        const supplier = await SELECT.one.from('sap.pme.srm.Fournisseur').where({ ID: fournisseurId });
        await INSERT.into(Notification).entries({
          userId    : 'admin',
          title     : '📩 Nouvelle offre reçue',
          message   : `Le fournisseur ${supplier ? supplier.companyName : 'inconnu'} a soumis une offre pour l'appel d'offres : ${rfq.title}`,
          notifType : 'INFO',
          isRead    : false,
          entityName: 'RFQ',
          entityId  : rfqId
        });
      } catch (e) {
        console.warn('Failed to insert admin notification:', e.message);
      }

      return SELECT.one.from(RFQResponses).where({ ID: response.ID });
    });

    // ─────────────────────────────────────────
    // ACTION: Mettre à jour le profil fournisseur (KYC)
    // ─────────────────────────────────────────
    this.on('updateProfile', async (req) => {
      const { fournisseurId, bankName, rib, bankAccount, street, city, wilaya, phone, paymentTerms, deliveryTerms, ai } = req.data;

      const fournisseur = await SELECT.one.from(Fournisseurs).where({ ID: fournisseurId });
      if (!fournisseur) return req.error(404, 'Fournisseur introuvable');

      const updates = {};
      if (bankName     !== undefined) updates.bankName     = bankName;
      if (rib          !== undefined) updates.rib          = rib;
      if (bankAccount  !== undefined) updates.bankAccount  = bankAccount;
      if (street       !== undefined) updates.street       = street;
      if (city         !== undefined) updates.city         = city;
      if (wilaya       !== undefined) updates.wilaya       = wilaya;
      if (phone        !== undefined) updates.phone        = phone;
      if (paymentTerms !== undefined) updates.paymentTerms = paymentTerms;
      if (deliveryTerms !== undefined) updates.deliveryTerms = deliveryTerms;
      if (ai            !== undefined) updates.ai            = ai;

      await UPDATE(Fournisseurs).set(updates).where({ ID: fournisseurId });

      // Synchroniser avec le BusinessPartner associé pour l'affichage Admin
      if (fournisseur.bp_ID) {
        const { BusinessPartner } = cds.entities('sap.pme');
        const bpUpdates = {};
        if (phone   !== undefined) bpUpdates.phone   = phone;
        if (wilaya  !== undefined) bpUpdates.wilaya  = wilaya;
        if (street  !== undefined) bpUpdates.street  = street;
        if (city    !== undefined) bpUpdates.city    = city;
        if (ai      !== undefined) bpUpdates.ai      = ai;
        
        if (Object.keys(bpUpdates).length > 0) {
          await UPDATE(BusinessPartner).set(bpUpdates).where({ ID: fournisseur.bp_ID });
        }
      }

      return SELECT.one.from(Fournisseurs).where({ ID: fournisseurId });
    });

    // ─────────────────────────────────────────
    // ACTION: Admin sélectionne une offre gagnante
    // ─────────────────────────────────────────
    this.on('selectRFQResponse', async (req) => {
      const { rfqId, responseId } = req.data;

      const rfq = await SELECT.one.from(RFQs).where({ ID: rfqId });
      if (!rfq) return req.error(404, 'RFQ introuvable');

      // Unselect all previous responses
      await UPDATE(RFQResponses).set({ selected: false }).where({ rfq_ID: rfqId });
      // Select the winner
      await UPDATE(RFQResponses).set({ selected: true }).where({ ID: responseId });
      // Update RFQ with selected response and close it
      await UPDATE(RFQs).set({
        selectedResponse_ID : responseId,
        status              : 'CLOSED',
        statusDate          : new Date().toISOString()
      }).where({ ID: rfqId });

      try {
        const { Notification } = cds.entities('sap.pme.admin');
        await UPDATE(Notification).set({ isRead: true }).where({ entityName: 'RFQ', entityId: rfqId });
      } catch (e) {
        console.warn('Failed to auto-resolve RFQ notifications:', e.message);
      }

      return SELECT.one.from(RFQs).where({ ID: rfqId });
    });

    // ─────────────────────────────────────────
    // ACTION: Convertir RFQ → Bon de Commande
    // ─────────────────────────────────────────
    this.on('convertRFQToPO', async (req) => {
      const { rfqId } = req.data;

      const rfq = await SELECT.one.from(RFQs).where({ ID: rfqId });
      if (!rfq || !rfq.selectedResponse_ID) return req.error(400, 'Aucune offre sélectionnée pour ce RFQ');

      const response  = await SELECT.one.from(RFQResponses).where({ ID: rfq.selectedResponse_ID });
      const respItems = await SELECT.from(RFQResponseItems).where({ parent_ID: rfq.selectedResponse_ID });
      const rfqItems  = await SELECT.from(RFQItems).where({ parent_ID: rfqId });

      const poNum = await this._generateNumber('PO', 'PO');
      const delivDate = new Date();
      delivDate.setDate(delivDate.getDate() + (response.deliveryDays || 14));

      let totalHT = 0, totalTVA = 0, totalTTC = 0;
      const poItems = respItems.map((ri, i) => {
        const rfqItem   = rfqItems.find(rfi => rfi.ID === ri.rfqItem_ID) || {};
        const qty       = parseFloat(rfqItem.quantity || 1);
        const price     = parseFloat(ri.unitPrice);
        const tvaRate   = 19;
        const ht        = qty * price;
        const tva       = ht * tvaRate / 100;
        totalHT  += ht;
        totalTVA += tva;
        totalTTC += ht + tva;
        return {
          ID           : cds.utils.uuid(),
          lineNumber   : i + 1,
          product_ID   : rfqItem.product_ID,
          description  : rfqItem.description || '',
          quantity     : qty,
          unit         : rfqItem.unit || 'PIECE',
          unitPrice    : parseFloat(price.toFixed(2)),
          tvaRate,
          totalHT      : parseFloat(ht.toFixed(2)),
          totalTVA     : parseFloat(tva.toFixed(2)),
          totalTTC     : parseFloat((ht + tva).toFixed(2))
        };
      });

      const [po] = await INSERT.into(BonsCommande).entries({
        poNumber     : poNum,
        fournisseur_ID : rfq.fournisseur_ID || response.fournisseur_ID,
        rfq_ID       : rfqId,
        date         : _getLocalDate(),
        deliveryDate : delivDate.toISOString().split('T')[0],
        status       : 'SENT',
        totalHT      : parseFloat(totalHT.toFixed(2)),
        totalTVA     : parseFloat(totalTVA.toFixed(2)),
        totalTTC     : parseFloat(totalTTC.toFixed(2)),
        items        : poItems
      });

      return SELECT.one.from(BonsCommande).where({ ID: po.ID });
    });

    // ─────────────────────────────────────────
    // ACTION: Fournisseur accepte le PO
    // ─────────────────────────────────────────
    this.on('acceptPO', async (req) => {
      const { poId } = req.data;
      const po = await SELECT.one.from(BonsCommande).where({ ID: poId });
      if (!po) return req.error(404, 'Bon de commande introuvable');
      if (po.status !== 'SENT') {
        return req.error(400, `Impossible d'accepter un bon de commande au statut ${po.status}`);
      }

      await UPDATE(BonsCommande).set({
        status     : 'CONFIRMED',
        statusDate : new Date().toISOString()
      }).where({ ID: poId });

      try {
        const { Notification } = cds.entities('sap.pme.admin');
        await INSERT.into(Notification).entries({
          ID: cds.utils.uuid(),
          title: `PO ${po.poNumber} accepté`,
          message: `Le fournisseur a accepté le bon de commande ${po.poNumber}. Vous pouvez valider la réception (GR).`,
          isRead: false,
          createdAt: new Date().toISOString(),
          entityName: 'PO',
          entityId: poId
        });
      } catch (e) {
        console.warn('Failed to insert admin notification:', e.message);
      }

      return SELECT.one.from(BonsCommande).where({ ID: poId });
    });
    // ─────────────────────────────────────────
    // ACTION: 3-Way Match — Facture/PO/Réception
    // ─────────────────────────────────────────
    this.on('performThreeWayMatch', async (req) => {
      const { factureId } = req.data;

      const facture = await SELECT.one.from(FacturesFournisseur).where({ ID: factureId });
      if (!facture) return req.error(404, 'Facture introuvable');
      if (!facture.bonCommande_ID) return req.error(400, 'Facture non liée à un bon de commande');

      const po          = await SELECT.one.from(BonsCommande).where({ ID: facture.bonCommande_ID });
      const poItems     = await SELECT.from(POItems).where({ parent_ID: facture.bonCommande_ID });
      const factItems   = await SELECT.from(FactureFournisseurItems).where({ parent_ID: factureId });
      const receptions  = facture.reception_ID
        ? await SELECT.from(ReceptionItems).where({ parent_ID: facture.reception_ID })
        : [];

      // Match logic: compare quantities and prices
      let hasDiscrepancy = false;
      for (const fi of factItems) {
        const poi = poItems.find(p => p.product_ID === fi.product_ID);
        const gri = receptions.find(r => r.product_ID === fi.product_ID);
        if (!poi || Math.abs(parseFloat(fi.unitPrice) - parseFloat(poi.unitPrice)) > 0.01) {
          hasDiscrepancy = true; break;
        }
        if (gri && parseFloat(fi.quantity) > parseFloat(gri.acceptedQty || gri.receivedQty || 0)) {
          hasDiscrepancy = true; break;
        }
      }

      const matchStatus = hasDiscrepancy ? 'DISCREPANCY' : 'MATCHED';
      await UPDATE(FacturesFournisseur).set({
        matchStatus,
        matchDate : new Date().toISOString(),
        matchBy   : req.user?.id || 'system',
        status    : matchStatus === 'MATCHED' ? 'APPROVED' : 'SENT'
      }).where({ ID: factureId });

      return SELECT.one.from(FacturesFournisseur).where({ ID: factureId });
    });

    // ─────────────────────────────────────────
    // ACTION: Évaluer un fournisseur
    // ─────────────────────────────────────────
    this.on('evaluateSupplier', async (req) => {
      const { fournisseurId, quality, delivery, price, service, compliance, comments } = req.data;
      const total = Math.round(((quality || 0) + (delivery || 0) + (price || 0) + (service || 0) + (compliance || 0)) / 5);
      const rating = total >= 80 ? 'A' : total >= 60 ? 'B' : total >= 40 ? 'C' : 'D';

      const [eval_] = await INSERT.into(Evaluations).entries({
        fournisseur_ID  : fournisseurId,
        date            : _getLocalDate(),
        evaluatedBy     : req.user?.id || 'admin',
        qualityScore    : quality    || 0,
        deliveryScore   : delivery   || 0,
        priceScore      : price      || 0,
        serviceScore    : service    || 0,
        complianceScore : compliance || 0,
        totalScore      : total,
        comments        : comments   || '',
        rating
      });

      await UPDATE(Fournisseurs).set({ rating, score: total }).where({ ID: fournisseurId });
      return SELECT.one.from(Evaluations).where({ ID: eval_.ID });
    });

    // ── Action: Validate KYC ──
    this.on('validateKYC', async (req) => {
      const { fournisseurId } = req.data;
      await UPDATE(Fournisseurs).set({
        kycStatus : 'VALIDATED',
        kycDate   : _getLocalDate(),
        kycBy     : req.user?.id || 'admin',
        status    : 'ACTIVE'
      }).where({ ID: fournisseurId });
      return SELECT.one.from(Fournisseurs).where({ ID: fournisseurId });
    });

    // ── Action: Reject KYC ──
    this.on('rejectKYC', async (req) => {
      const { fournisseurId, reason } = req.data;
      await UPDATE(Fournisseurs).set({
        kycStatus : 'REJECTED',
        kycDate   : _getLocalDate(),
        kycBy     : req.user?.id || 'admin',
        status    : 'BLOCKED'
      }).where({ ID: fournisseurId });
      return SELECT.one.from(Fournisseurs).where({ ID: fournisseurId });
    });

    // ─────────────────────────────────────────
    // ACTION: Créer une Réception Marchandise (GR)
    // ─────────────────────────────────────────
    this.on('createGoodsReceipt', async (req) => {
      const { poId, items: grItems, notes } = req.data;

      const po = await SELECT.one.from(BonsCommande).where({ ID: poId });
      if (!po) return req.error(404, 'Bon de commande introuvable');
      if (po.status !== 'CONFIRMED') return req.error(400, `Impossible de réceptionner un PO au statut ${po.status}`);

      const poItemsList = await SELECT.from(POItems).where({ parent_ID: poId });

      const receptionItems = (grItems || []).map(gi => {
        const poItem = poItemsList.find(p => p.ID === gi.poItemId);
        if (!poItem) return null;
        const rec = parseFloat(gi.receivedQty || 0);
        const acc = parseFloat(gi.acceptedQty != null ? gi.acceptedQty : rec);
        const rej = parseFloat(gi.rejectedQty || Math.max(0, rec - acc) || 0);
        return {
          ID           : cds.utils.uuid(),
          poItem_ID    : gi.poItemId,
          product_ID   : poItem.product_ID,
          orderedQty   : parseFloat(poItem.quantity),
          receivedQty  : rec,
          acceptedQty  : acc,
          rejectedQty  : rej,
          notes        : gi.notes || ''
        };
      }).filter(Boolean);

      const grNum = await this._generateNumber('GR', 'GR');
      const [gr] = await INSERT.into(Receptions).entries({
        receiptNumber : grNum,
        bonCommande_ID: poId,
        date          : _getLocalDate(),
        receivedBy    : req.user?.id || 'fournisseur',
        notes         : notes || '',
        status        : 'CONFIRMED',
        items         : receptionItems
      });

      // Check for discrepancies and alert supplier
      let totalRejected = 0;
      let totalMissing = 0;
      let issueDetails = [];

      for (const gi of receptionItems) {
        const poItem = poItemsList.find(p => p.ID === gi.poItem_ID);
        const descName = poItem ? poItem.description : 'Article';
        if (gi.rejectedQty > 0) {
          totalRejected += gi.rejectedQty;
          issueDetails.push(`- <strong>${gi.rejectedQty}</strong> unité(s) de "${descName}" rejetée(s)`);
        }
        const missing = gi.orderedQty - gi.acceptedQty;
        if (missing > 0) {
          totalMissing += missing;
          issueDetails.push(`- <strong>${missing}</strong> unité(s) de "${descName}" manquante(s) (Commandé: ${gi.orderedQty}, Accepté: ${gi.acceptedQty})`);
        }
      }

      if (totalRejected > 0 || totalMissing > 0) {
        try {
          const supplier = await SELECT.one.from(Fournisseurs).where({ ID: po.fournisseur_ID });
          if (supplier && supplier.email) {
            const { sendWorkflowNotification } = require('../lib/email-service');
            const subject = `⚠️ Alerte Écart de Réception - Bon de Commande ${po.poNumber}`;
            const message = `
              Bonjour ${supplier.companyName || 'Fournisseur'},<br/><br/>
              Lors de la validation de la réception des marchandises pour le bon de commande N° <strong>${po.poNumber}</strong> (Bon de réception N° <strong>${grNum}</strong>), notre équipe a constaté des écarts :<br/><br/>
              <strong>Détails des anomalies :</strong><br/>
              ${issueDetails.join('<br/>')}<br/><br/>
              Merci de prendre contact avec notre service achats pour régulariser cette situation.<br/><br/>
              Cordialement,<br/>
              L'équipe administrative de Bridgify Cloud.
            `;
            sendWorkflowNotification(supplier.email, subject, message).then(() => {
              console.log(`[Notification] Alert email sent to supplier: ${supplier.email} for PO ${po.poNumber}`);
            }).catch((err) => {
              console.error('Failed to send supplier notification email:', err);
            });
          }
        } catch (err) {
          console.error('Failed to prepare supplier notification email:', err);
        }
      }

      // Update PO item receivedQty
      for (const gi of receptionItems) {
        await UPDATE(POItems).set({
          receivedQty: gi.receivedQty
        }).where({ ID: gi.poItem_ID });
      }

      // Update PO status to DELIVERED
      await UPDATE(BonsCommande).set({
        status     : 'DELIVERED',
        statusDate : new Date().toISOString()
      }).where({ ID: poId });

      try {
        const { Notification } = cds.entities('sap.pme.admin');
        await UPDATE(Notification).set({ isRead: true }).where({ entityId: poId });
      } catch (e) {
        console.warn('Failed to auto-resolve PO notifications:', e.message);
      }

      return SELECT.one.from(Receptions).where({ ID: gr.ID });
    });

    // ─────────────────────────────────────────
    // ACTION: Créer une Facture Fournisseur
    // ─────────────────────────────────────────
    this.on('createSupplierInvoice', async (req) => {
      const { poId, receptionId, items: invoiceItems, dueDate, notes } = req.data;

      const po = await SELECT.one.from(BonsCommande).where({ ID: poId });
      if (!po) return req.error(404, 'Bon de commande introuvable');
      if (po.status !== 'DELIVERED') return req.error(400, 'Le PO doit être livré avant de facturer');

      const existingInvoice = await SELECT.one.from(FacturesFournisseur).where({ bonCommande_ID: poId });
      if (existingInvoice) return req.error(400, 'Une facture a déjà été soumise pour ce bon de commande');

      const poItemsList = await SELECT.from(POItems).where({ parent_ID: poId });

      let totalHT = 0, totalTVA = 0, totalTTC = 0;
      const factItems = (invoiceItems || []).map((fi, idx) => {
        const poItem = poItemsList.find(p => p.ID === fi.poItemId);
        const qty      = parseFloat(fi.quantity || (poItem && poItem.quantity) || 0);
        const price    = parseFloat(fi.unitPrice || (poItem && poItem.unitPrice) || 0);
        const tvaRate  = parseFloat(fi.tvaRate || 19);
        const ht       = qty * price;
        const tva      = ht * (tvaRate / 100);
        totalHT  += ht;
        totalTVA += tva;
        totalTTC += ht + tva;
        return {
          ID          : cds.utils.uuid(),
          lineNumber  : idx + 1,
          poItem_ID   : fi.poItemId,
          product_ID  : poItem ? poItem.product_ID : null,
          description : fi.description || (poItem && poItem.description) || '',
          quantity    : qty,
          unitPrice   : parseFloat(price.toFixed(2)),
          tvaRate,
          totalHT     : parseFloat(ht.toFixed(2)),
          totalTVA    : parseFloat(tva.toFixed(2)),
          totalTTC    : parseFloat((ht + tva).toFixed(2))
        };
      });

      const invNum = await this._generateNumber('SUPINV', 'SINV');
      const [facture] = await INSERT.into(FacturesFournisseur).entries({
        invoiceNumber  : invNum,
        fournisseur_ID : po.fournisseur_ID,
        bonCommande_ID : poId,
        reception_ID   : receptionId || null,
        date           : _getLocalDate(),
        dueDate        : dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status         : 'SENT',
        matchStatus    : 'PENDING',
        totalHT        : parseFloat(totalHT.toFixed(2)),
        totalTVA       : parseFloat(totalTVA.toFixed(2)),
        totalTTC       : parseFloat(totalTTC.toFixed(2)),
        paidAmount     : 0,
        remainingAmount: parseFloat(totalTTC.toFixed(2)),
        notes          : notes || '',
        items          : factItems
      });

      // ── Auto 3-Way Match (Tolérance 2%) ──
      const poTotalTTC = parseFloat(po.totalTTC || 0);
      const invTotalTTC = parseFloat(totalTTC.toFixed(2));
      const tolerance = poTotalTTC * 0.02; // 2%
      const diff = Math.abs(invTotalTTC - poTotalTTC);

      let matchStatus = 'MATCHED';
      let docStatus   = 'APPROVED';

      if (diff > tolerance) {
        matchStatus = 'DISCREPANCY';
        docStatus   = 'SENT'; // Litige → reste en attente
      }

      await UPDATE(FacturesFournisseur).set({
        matchStatus,
        matchDate : new Date().toISOString(),
        matchBy   : 'system',
        status    : docStatus
      }).where({ ID: facture.ID });

      return SELECT.one.from(FacturesFournisseur).where({ ID: facture.ID });
    });

    // ─────────────────────────────────────────
    // FUNCTION: Download PO PDF
    // ─────────────────────────────────────────
    this.on('downloadPOPDF', async (req) => {
      const { poId } = req.data;
      const po = await SELECT.one.from(BonsCommande).where({ ID: poId });
      if (!po) return req.error(404, 'Bon de commande introuvable');
      const fournisseur = await SELECT.one.from(Fournisseurs).where({ ID: po.fournisseur_ID });
      const items = await SELECT.from(POItems).columns(i => { i('*'), i.product(p => p('*')) }).where({ parent_ID: poId });
      const pdfBuffer = await generatePOFournisseurPDF({ ...po, items, fournisseur });
      return pdfBuffer.toString('base64');
    });

    // ─────────────────────────────────────────
    // FUNCTION: Download GR PDF
    // ─────────────────────────────────────────
    this.on('downloadGRPDF', async (req) => {
      const { grId } = req.data;
      const gr = await SELECT.one.from(Receptions).where({ ID: grId });
      if (!gr) return req.error(404, 'Bon de réception introuvable');
      const po = await SELECT.one.from(BonsCommande).where({ ID: gr.bonCommande_ID });
      const fournisseur = po ? await SELECT.one.from(Fournisseurs).where({ ID: po.fournisseur_ID }) : null;
      const items = await SELECT.from(ReceptionItems).columns(i => {
        i('*');
        i.product(p => p('*'));
        i.poItem(pi => pi('*'));
      }).where({ parent_ID: grId });
      const pdfBuffer = await generateGRFournisseurPDF({ ...gr, items, bonCommande: { ...po, fournisseur } });
      return pdfBuffer.toString('base64');
    });

    // ─────────────────────────────────────────
    // FUNCTION: Download Supplier Invoice PDF
    // ─────────────────────────────────────────
    this.on('downloadSupplierInvoicePDF', async (req) => {
      const { factureId } = req.data;
      const facture = await SELECT.one.from(FacturesFournisseur).where({ ID: factureId });
      if (!facture) return req.error(404, 'Facture introuvable');
      const fournisseur = await SELECT.one.from(Fournisseurs).where({ ID: facture.fournisseur_ID });
      const items = await SELECT.from(FactureFournisseurItems).columns(i => { i('*'), i.product(p => p('*')) }).where({ parent_ID: factureId });
      const pdfBuffer = await generateInvoiceFournisseurPDF({ ...facture, items, fournisseur });
      return pdfBuffer.toString('base64');
    });

    // ─────────────────────────────────────────
    // ACTION: Confirmer Paiement Espèces (Fournisseur)
    // ─────────────────────────────────────────
    this.on('confirmCashPayment', async (req) => {
      const { factureId } = req.data;
      const { FacturesFournisseur, BonsCommande } = this.entities;
      const { Paiement } = cds.entities('sap.pme.doc');
      const { NumberRange } = cds.entities('sap.pme.admin');

      const invoice = await SELECT.one.from(FacturesFournisseur).where({ ID: factureId });
      if (!invoice) return req.error(404, 'Facture introuvable');
      if (invoice.status !== 'PENDING_CASH') {
        return req.error(400, "Cette facture n'est pas en attente de confirmation de paiement en espèces");
      }

      // 1. Update Invoice Status to PAID
      await UPDATE(FacturesFournisseur).set({
        status          : 'PAID',
        paidAmount      : invoice.totalTTC,
        remainingAmount : 0
      }).where({ ID: factureId });

      // 2. Generate Payment Number for Supplier Payment
      let payNum = 'PAY-SUP-00001';
      let payRange = await SELECT.one.from(NumberRange).where({ objectType: 'PAIEMENT_FOURNISSEUR' });
      if (!payRange) {
        await INSERT.into(NumberRange).entries({ objectType: 'PAIEMENT_FOURNISSEUR', prefix: 'PYS', currentNumber: 0, padLength: 5 });
        payRange = { currentNumber: 0, padLength: 5, prefix: 'PYS' };
      }
      const payNext = (payRange.currentNumber || 0) + 1;
      payNum = `PYS-${String(payNext).padStart(payRange.padLength || 5, '0')}`;
      await UPDATE(NumberRange).set({ currentNumber: payNext }).where({ objectType: 'PAIEMENT_FOURNISSEUR' });

      // 3. Record Payment in Paiement entity
      await INSERT.into(Paiement).entries({
        paymentNumber : payNum,
        date          : _getLocalDate(),
        amount        : invoice.totalTTC,
        method        : 'ESPECES',
        reference     : `SUP-PAY-ESPECES-CONFIRMED-${Date.now()}`
      });

      // 4. Update PO Status to CLOSED
      if (invoice.bonCommande_ID) {
        await UPDATE(BonsCommande).set({
          status: 'CLOSED',
          statusDate: new Date().toISOString()
        }).where({ ID: invoice.bonCommande_ID });
      }

      // 5. Send Notification to Admin
      try {
        const { Notification } = cds.entities('sap.pme.admin');
        await INSERT.into(Notification).entries({
          ID: cds.utils.uuid(),
          title: `Facture ${invoice.invoiceNumber} payée`,
          message: `Le fournisseur a confirmé la réception du paiement en espèces de ${new Intl.NumberFormat('fr-FR').format(invoice.totalTTC)} DA pour la facture ${invoice.invoiceNumber}.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Failed to insert admin notification:', e.message);
      }

      return SELECT.one.from(FacturesFournisseur).where({ ID: factureId });
    });

    // ─────────────────────────────────────────
    // ACTION: Résoudre l'écart de réception (Renvoyer la marchandise)
    // ─────────────────────────────────────────
    this.on('resolveDiscrepancy', async (req) => {
      const { poId, items } = req.data;
      const po = await SELECT.one.from(BonsCommande).where({ ID: poId });
      if (!po) return req.error(404, 'Bon de commande introuvable');

      const receptions = await SELECT.from(Receptions).where({ bonCommande_ID: poId });
      if (receptions.length === 0) return req.error(400, "Aucune réception n'est enregistrée pour ce bon de commande");

      for (const inputItem of (items || [])) {
        const targetResend = parseFloat(inputItem.resendQty) || 0;
        
        // Find the matching reception item across receptions
        for (const gr of receptions) {
          const gi = await SELECT.one.from(ReceptionItems).where({ parent_ID: gr.ID, poItem_ID: inputItem.poItemId });
          if (gi) {
            const maxAllowed = parseFloat(gi.orderedQty) - parseFloat(gi.acceptedQty);
            if (targetResend > maxAllowed + 0.001) {
              return req.error(400, `La quantité renvoyée (${targetResend}) ne peut pas dépasser l'écart (${maxAllowed})`);
            }
            await UPDATE(ReceptionItems).set({ resendQty: targetResend }).where({ ID: gi.ID });
          }
        }
      }

      // Update PO status to TO_APPROVE
      await UPDATE(BonsCommande).set({
        status: 'TO_APPROVE',
        statusDate: new Date().toISOString()
      }).where({ ID: poId });

      // Create notification for admin
      try {
        const { Notification } = cds.entities('sap.pme.admin');
        await INSERT.into(Notification).entries({
          ID: cds.utils.uuid(),
          title: `🔄 Réception PO ${po.poNumber} à valider`,
          message: `Le fournisseur a renvoyé la marchandise pour résoudre l'écart sur le bon de commande ${po.poNumber}. Veuillez vérifier et valider la nouvelle réception.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          entityName: 'PO_RESEND',
          entityId: poId
        });
      } catch (e) {
        console.warn('Failed to insert admin notification:', e.message);
      }

      return SELECT.one.from(BonsCommande).where({ ID: poId });
    });

    // ─────────────────────────────────────────
    // ACTION: Approuver la nouvelle réception par l'admin
    // ─────────────────────────────────────────
    this.on('approveDiscrepancyResolution', async (req) => {
      const { poId, items } = req.data;
      const po = await SELECT.one.from(BonsCommande).where({ ID: poId });
      if (!po) return req.error(404, 'Bon de commande introuvable');
      if (po.status !== 'TO_APPROVE') {
        return req.error(400, "Ce bon de commande n'est pas en attente de validation de remplacement");
      }

      const receptions = await SELECT.from(Receptions).where({ bonCommande_ID: poId });
      if (receptions.length === 0) return req.error(400, "Aucune réception n'est enregistrée pour ce bon de commande");

      const itemsList = items || [];

      for (const gr of receptions) {
        const grItems = await SELECT.from(ReceptionItems).where({ parent_ID: gr.ID });
        for (const gi of grItems) {
          const inputItem = itemsList.find(it => it.poItemId === gi.poItem_ID);
          
          let resend = parseFloat(gi.resendQty) || 0;
          let accepted = resend;
          let rejected = 0;

          if (inputItem) {
            accepted = parseFloat(inputItem.acceptedQty) || 0;
            rejected = parseFloat(inputItem.rejectedQty) || 0;
            resend = accepted + rejected;
          }

          if (resend > 0) {
            const newReceived = parseFloat(gi.receivedQty) + resend;
            const newAccepted = parseFloat(gi.acceptedQty) + accepted;
            const newRejected = parseFloat(gi.rejectedQty) + rejected;
            
            await UPDATE(ReceptionItems).set({
              receivedQty : newReceived,
              acceptedQty : newAccepted,
              rejectedQty : newRejected,
              resendQty   : 0
            }).where({ ID: gi.ID });

            // Update corresponding POItem receivedQty
            if (gi.poItem_ID) {
              await UPDATE(POItems).set({
                receivedQty: newReceived
              }).where({ ID: gi.poItem_ID });
            }
          }
        }
      }

      // Update PO status back to DELIVERED (fully received/validated)
      await UPDATE(BonsCommande).set({
        status     : 'DELIVERED',
        statusDate : new Date().toISOString()
      }).where({ ID: poId });

      try {
        const { Notification } = cds.entities('sap.pme.admin');
        await UPDATE(Notification).set({ isRead: true }).where({ entityId: poId });
      } catch (e) {
        console.warn('Failed to auto-resolve PO discrepancy notifications:', e.message);
      }

      return SELECT.one.from(BonsCommande).where({ ID: poId });
    });

    // ─────────────────────────────────────────
    // CUSTOM DELETE: Supprimer un Appel d'Offres (RFQ) — Hook avant suppression
    // ─────────────────────────────────────────
    this.before('DELETE', RFQs, async (req) => {
      let id = req.data?.ID;
      if (!id && req.params && req.params.length > 0) {
        const param = req.params[0];
        id = typeof param === 'object' ? param.ID : param;
      }

      if (!id) return;

      console.log(`[SRM Service] before DELETE handler for RFQ: ${id}`);

      // 1. Vérifier si l'appel d'offres existe
      const rfq = await SELECT.one.from(RFQs).where({ ID: id });
      if (!rfq) return; // laisse le gestionnaire par défaut renvoyer un 404

      // 2. Vérifier s'il est lié à un bon de commande fournisseur (PO)
      const po = await SELECT.one.from(BonsCommande).where({ rfq_ID: id });
      if (po) {
        return req.error(400, `Impossible de supprimer l'appel d'offres ${rfq.rfqNumber} car il a été converti en Bon de Commande (${po.poNumber}).`);
      }

      try {
        // Suppression des dépendances enfants d'abord pour respecter l'intégrité référentielle SQL/SQLite
        // A. Offres Fournisseurs (RFQResponseItem)
        const responses = await SELECT.from(RFQResponses).where({ rfq_ID: id });
        const responseIds = responses.map(r => r.ID);
        if (responseIds.length > 0) {
          await DELETE.from(RFQResponseItems).where({ parent_ID: { in: responseIds } });
        }

        // B. Offres Fournisseurs (RFQResponse)
        await DELETE.from(RFQResponses).where({ rfq_ID: id });

        // C. Articles de l'appel d'offres (RFQItem)
        await DELETE.from(RFQItems).where({ parent_ID: id });

        console.log(`[SRM Service] Cleaned up child records for RFQ ${rfq.rfqNumber} successfully.`);
      } catch (e) {
        console.error('[SRM Service] Error during RFQ pre-deletion cleanup:', e);
        return req.error(500, `Erreur lors du nettoyage des dépendances de l'appel d'offres : ${e.message}`);
      }
    });

    // ── Automatic Email Hooks ──
    
    // 1. Auto send PO to Supplier on conversion
    this.after('convertRFQToPO', async (po, req) => {
      try {
        const poId = po.ID;
        const fullPo = await SELECT.one.from(BonsCommande).where({ ID: poId });
        const items = await SELECT.from(POItems).columns(i => { i('*'), i.product(p => p('*')) }).where({ parent_ID: poId });
        const supplier = await SELECT.one.from(Fournisseurs).where({ ID: fullPo.fournisseur_ID });
        const pdfBuffer = await generatePOFournisseurPDF({
          ...fullPo,
          items,
          fournisseur: supplier
        });
        sendPOFournisseur(supplier.email, supplier.companyName, fullPo.poNumber, fullPo.totalTTC, 'DZD', pdfBuffer).catch((err) => {
          console.error('Send convertRFQToPO email error in background:', err.message);
        });
      } catch (e) {
        console.error('Auto send convertRFQToPO email error:', e.message);
      }
    });

    // 2. Auto send GR to Supplier on Goods Receipt creation
    this.after('createGoodsReceipt', async (gr, req) => {
      try {
        const grId = gr.ID;
        const fullGr = await SELECT.one.from(Receptions).where({ ID: grId });
        const po = await SELECT.one.from(BonsCommande).where({ ID: fullGr.bonCommande_ID });
        const supplier = await SELECT.one.from(Fournisseurs).where({ ID: po.fournisseur_ID });
        const items = await SELECT.from(ReceptionItems).columns(i => {
          i('*');
          i.product(p => p('*'));
          i.poItem(pi => pi('*'));
        }).where({ parent_ID: grId });
        
        const pdfBuffer = await generateGRFournisseurPDF({
          ...fullGr,
          items,
          bonCommande: { ...po, fournisseur: supplier }
        });
        sendGRFournisseur(supplier.email, supplier.companyName, fullGr.receiptNumber, po.poNumber, pdfBuffer).catch((err) => {
          console.error('Send createGoodsReceipt email error in background:', err.message);
        });
      } catch (e) {
        console.error('Auto send createGoodsReceipt email error:', e.message);
      }
    });

    // 3. Auto send Supplier Invoice on creation
    this.after('createSupplierInvoice', async (invoice, req) => {
      try {
        const invoiceId = invoice.ID;
        const fullInvoice = await SELECT.one.from(FacturesFournisseur).where({ ID: invoiceId });
        const items = await SELECT.from(FactureFournisseurItems).columns(i => { i('*'), i.product(p => p('*')) }).where({ parent_ID: invoiceId });
        const supplier = await SELECT.one.from(Fournisseurs).where({ ID: fullInvoice.fournisseur_ID });
        const pdfBuffer = await generateInvoiceFournisseurPDF({
          ...fullInvoice,
          items,
          fournisseur: supplier
        });
        sendInvoiceFournisseur(supplier.email, supplier.companyName, fullInvoice.invoiceNumber, fullInvoice.totalTTC, 'DZD', pdfBuffer).catch((err) => {
          console.error('Send createSupplierInvoice email error in background:', err.message);
        });
      } catch (e) {
        console.error('Auto send createSupplierInvoice email error:', e.message);
      }
    });

    await super.init();
  }

  async _generateNumber(objectType, prefix) {
    try {
      const { NumberRange } = cds.entities('sap.pme.admin');
      let range = await SELECT.one.from(NumberRange).where({ objectType });
      if (!range) {
        await INSERT.into(NumberRange).entries({ objectType, prefix, currentNumber: 0, padLength: 5 });
        range = { currentNumber: 0, padLength: 5, prefix };
      }
      const next = (range.currentNumber || 0) + 1;
      await UPDATE(NumberRange).set({ currentNumber: next }).where({ objectType });
      return `${prefix}-${String(next).padStart(range.padLength || 5, '0')}`;
    } catch (e) {
      return `${prefix}-${Date.now()}`;
    }
  }
};
