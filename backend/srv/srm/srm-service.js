// ============================================================
// SRM Service Handlers — Business Logic
// PME Connect — Portail Fournisseur
// ============================================================

'use strict';
const cds = require('@sap/cds');
const { generatePOFournisseurPDF, generateGRFournisseurPDF, generateInvoiceFournisseurPDF } = require('../lib/pdf-generator');

module.exports = class SRMService extends cds.ApplicationService {

  async init() {
    const {
      Fournisseurs, FournisseurDocuments, Evaluations,
      RFQs, RFQItems, RFQResponses, RFQResponseItems,
      BonsCommande, POItems, Receptions, ReceptionItems,
      FacturesFournisseur, FactureFournisseurItems
    } = this.entities;

    // ── Auto-generate document numbers ──
    this.before('CREATE', RFQs,         async (req) => { req.data.rfqNumber    = await this._generateNumber('RFQ',  'RFQ'); });
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
        date            : new Date().toISOString().split('T')[0],
        totalAmount     : parseFloat(totalAmount.toFixed(2)),
        deliveryDays    : deliveryDays || 7,
        validUntil      : validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        selected        : false,
        notes           : notes || '',
        items           : responseItems
      });

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
        date         : new Date().toISOString().split('T')[0],
        deliveryDate : delivDate.toISOString().split('T')[0],
        status       : 'CONFIRMED',
        totalHT      : parseFloat(totalHT.toFixed(2)),
        totalTVA     : parseFloat(totalTVA.toFixed(2)),
        totalTTC     : parseFloat(totalTTC.toFixed(2)),
        items        : poItems
      });

      return SELECT.one.from(BonsCommande).where({ ID: po.ID });
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
        date            : new Date().toISOString().split('T')[0],
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
        kycDate   : new Date().toISOString().split('T')[0],
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
        kycDate   : new Date().toISOString().split('T')[0],
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
        return {
          ID           : cds.utils.uuid(),
          poItem_ID    : gi.poItemId,
          product_ID   : poItem.product_ID,
          orderedQty   : parseFloat(poItem.quantity),
          receivedQty  : parseFloat(gi.receivedQty),
          acceptedQty  : parseFloat(gi.acceptedQty != null ? gi.acceptedQty : gi.receivedQty),
          rejectedQty  : parseFloat(gi.rejectedQty || 0),
          notes        : gi.notes || ''
        };
      }).filter(Boolean);

      const grNum = await this._generateNumber('GR', 'GR');
      const [gr] = await INSERT.into(Receptions).entries({
        receiptNumber : grNum,
        bonCommande_ID: poId,
        date          : new Date().toISOString().split('T')[0],
        receivedBy    : req.user?.id || 'fournisseur',
        notes         : notes || '',
        status        : 'CONFIRMED',
        items         : receptionItems
      });

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
        date           : new Date().toISOString().split('T')[0],
        dueDate        : dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status         : 'SENT',
        matchStatus    : 'PENDING',
        totalHT        : parseFloat(totalHT.toFixed(2)),
        totalTVA       : parseFloat(totalTVA.toFixed(2)),
        totalTTC       : parseFloat(totalTTC.toFixed(2)),
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
      const items = await SELECT.from(ReceptionItems).columns(i => { i('*'), i.product(p => p('*')) }).where({ parent_ID: grId });
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
