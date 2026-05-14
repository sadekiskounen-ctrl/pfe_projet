// ============================================================
// SRM Service Handlers — Business Logic
// ============================================================

const cds = require('@sap/cds');

module.exports = class SRMService extends cds.ApplicationService {

  async init() {
    const {
      Fournisseurs, Evaluations, RFQs, BonsCommande, POItems,
      Receptions, FacturesFournisseur
    } = this.entities;
    const { NumberRange } = cds.entities('sap.pme.admin');
    const { BusinessPartner } = cds.entities('sap.pme');

    // ── Auto-generate document numbers ──
    this.before('CREATE', RFQs, async (req) => {
      req.data.rfqNumber = await this._generateNumber('RFQ', 'RFQ');
    });

    this.before('CREATE', BonsCommande, async (req) => {
      req.data.poNumber = await this._generateNumber('PO', 'PO');
    });

    this.before('CREATE', Receptions, async (req) => {
      req.data.receiptNumber = await this._generateNumber('RECEPTION', 'REC');
    });

    this.before('CREATE', FacturesFournisseur, async (req) => {
      req.data.invoiceNumber = await this._generateNumber('FACTURE_FRS', 'FFA');
    });

    // ── Auto-create BusinessPartner for new suppliers ──
    this.before('CREATE', Fournisseurs, async (req) => {
      if (!req.data.bp_ID) {
        const bpNumber = await this._generateNumber('BP', 'BP');
        const bp = await INSERT.into(BusinessPartner).entries({
          bpNumber,
          bpType: 'FOURNISSEUR',
          displayName: req.data.companyName,
          email: req.data.email,
          phone: req.data.phone,
          status: 'PENDING'
        });
        req.data.bp_ID = bp?.ID;
      }
      req.data.status = 'PENDING';
      req.data.kycStatus = 'PENDING';
    });

    // ── Action: Validate KYC ──
    this.on('validateKYC', async (req) => {
      const { fournisseurId } = req.data;
      await UPDATE(Fournisseurs).set({
        kycStatus: 'VALIDATED',
        kycDate: new Date().toISOString().split('T')[0],
        kycBy: req.user.id,
        status: 'ACTIVE'
      }).where({ ID: fournisseurId });

      // Also activate the BusinessPartner
      const frs = await SELECT.one.from(Fournisseurs, fournisseurId).columns('bp_ID');
      if (frs?.bp_ID) {
        await UPDATE(BusinessPartner).set({ status: 'ACTIVE' }).where({ ID: frs.bp_ID });
      }

      return SELECT.one.from(Fournisseurs, fournisseurId);
    });

    // ── Action: Reject KYC ──
    this.on('rejectKYC', async (req) => {
      const { fournisseurId, reason } = req.data;
      await UPDATE(Fournisseurs).set({
        kycStatus: 'REJECTED',
        kycDate: new Date().toISOString().split('T')[0],
        kycBy: req.user.id,
        status: 'REJECTED',
        notes: reason
      }).where({ ID: fournisseurId });

      return SELECT.one.from(Fournisseurs, fournisseurId);
    });

    // ── Action: Select RFQ Response → generates PO ──
    this.on('selectRFQResponse', async (req) => {
      const { rfqId, responseId } = req.data;
      await UPDATE(RFQs).set({
        selectedResponse_ID: responseId,
        status: 'APPROVED'
      }).where({ ID: rfqId });

      // Mark the selected response
      const { RFQResponses } = this.entities;
      await UPDATE(RFQResponses).set({ selected: true }).where({ ID: responseId });

      return SELECT.one.from(RFQs, rfqId);
    });

    // ── Action: Convert RFQ → Purchase Order ──
    this.on('convertRFQToPO', async (req) => {
      const { rfqId } = req.data;
      const rfq = await SELECT.one.from(RFQs).where({ ID: rfqId });

      if (!rfq) req.error(404, 'RFQ not found');
      if (!rfq.selectedResponse_ID) req.error(400, 'No response selected');

      const { RFQResponses, RFQResponseItems } = this.entities;
      const response = await SELECT.one.from(RFQResponses).where({ ID: rfq.selectedResponse_ID });
      const responseItems = await SELECT.from(RFQResponseItems).where({ parent_ID: rfq.selectedResponse_ID });

      const poNumber = await this._generateNumber('PO', 'PO');
      const po = {
        poNumber,
        fournisseur_ID: response.fournisseur_ID,
        rfq_ID: rfqId,
        date: new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        totalHT: response.totalAmount,
        currency_code: rfq.currency_code,
        items: responseItems.map((item, idx) => ({
          lineNumber: idx + 1,
          product_ID: item.product_ID,
          description: item.notes,
          unitPrice: item.unitPrice,
          totalHT: item.totalPrice
        }))
      };

      return INSERT.into(BonsCommande).entries(po);
    });

    // ── Action: 3-Way Match (PO ↔ Receipt ↔ Invoice) ──
    this.on('performThreeWayMatch', async (req) => {
      const { factureId } = req.data;
      const facture = await SELECT.one.from(FacturesFournisseur).where({ ID: factureId });

      if (!facture) req.error(404, 'Facture not found');
      if (!facture.bonCommande_ID) req.error(400, 'No PO linked');

      const po = await SELECT.one.from(BonsCommande).where({ ID: facture.bonCommande_ID });
      let matchStatus = 'MATCHED';

      // Compare totals (with 1% tolerance)
      const tolerance = 0.01;
      if (Math.abs(parseFloat(facture.totalTTC) - parseFloat(po.totalTTC)) / parseFloat(po.totalTTC) > tolerance) {
        matchStatus = 'DISCREPANCY';
      }

      await UPDATE(FacturesFournisseur).set({
        matchStatus,
        matchDate: new Date().toISOString(),
        matchBy: req.user.id,
        status: matchStatus === 'MATCHED' ? 'APPROVED' : 'SUBMITTED'
      }).where({ ID: factureId });

      return SELECT.one.from(FacturesFournisseur, factureId);
    });

    // ── Action: Evaluate Supplier ──
    this.on('evaluateSupplier', async (req) => {
      const { fournisseurId, quality, delivery, price, service, compliance, comments } = req.data;
      const totalScore = Math.round((quality + delivery + price + service + compliance) / 5);

      let rating = 'D';
      if (totalScore >= 16) rating = 'A';
      else if (totalScore >= 12) rating = 'B';
      else if (totalScore >= 8) rating = 'C';

      const evaluation = {
        fournisseur_ID: fournisseurId,
        date: new Date().toISOString().split('T')[0],
        evaluatedBy: req.user.id,
        qualityScore: quality,
        deliveryScore: delivery,
        priceScore: price,
        serviceScore: service,
        complianceScore: compliance,
        totalScore,
        comments,
        rating
      };

      const result = await INSERT.into(Evaluations).entries(evaluation);

      // Update supplier overall rating
      await UPDATE(Fournisseurs).set({
        score: totalScore,
        rating
      }).where({ ID: fournisseurId });

      return result;
    });

    await super.init();
  }

  // ── Helper: Generate sequential number ──
  async _generateNumber(objectType, prefix) {
    const { NumberRange } = cds.entities('sap.pme.admin');
    const tx = cds.tx(this);

    let range = await tx.run(SELECT.one.from(NumberRange).where({ objectType }));
    if (!range) {
      await tx.run(INSERT.into(NumberRange).entries({
        objectType, prefix, currentNumber: 0, padLength: 5
      }));
      range = { currentNumber: 0, padLength: 5, prefix };
    }

    const nextNumber = (range.currentNumber || 0) + 1;
    await tx.run(UPDATE(NumberRange).set({ currentNumber: nextNumber }).where({ objectType }));

    return `${prefix}-${String(nextNumber).padStart(range.padLength, '0')}`;
  }
};
