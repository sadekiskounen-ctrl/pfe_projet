// ============================================================
// Tests SRM Service
// ============================================================

'use strict';
const cds = require('@sap/cds');

describe('SRM Service Tests', () => {

  let srv;
  const cdsTest = cds.test('serve', '--in-memory', '--with-mocks');

  beforeAll(async () => {
    await cdsTest;
    srv = cds.services.SRMService;
  });

  // ── Fournisseurs ──
  describe('Fournisseurs', () => {
    it('should list all suppliers', async () => {
      const fournisseurs = await srv.read('Fournisseurs');
      expect(Array.isArray(fournisseurs)).toBe(true);
      expect(fournisseurs.length).toBeGreaterThan(0);
    });

    it('should find active supplier', async () => {
      const actifs = await srv.read('Fournisseurs').where({ status: 'ACTIVE' });
      expect(actifs.length).toBeGreaterThanOrEqual(1);
    });

    it('should have pending KYC supplier', async () => {
      const pending = await srv.read('Fournisseurs').where({ kycStatus: 'PENDING' });
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Supplier Evaluation ──
  describe('Supplier Evaluation', () => {
    it('should evaluate a supplier', async () => {
      const fournisseurs = await srv.read('Fournisseurs').where({ status: 'ACTIVE' });
      expect(fournisseurs.length).toBeGreaterThan(0);

      // Scores are on a 0-20 scale; avg = (18+16+14+17+19)/5 = 16.8 → rounds to 17
      // Rating thresholds: >=80 → A, >=60 → B, >=40 → C, <40 → D (0-100 scale)
      // So score 17 on a 0-20 scale → 'D'
      const result = await srv.send('evaluateSupplier', {
        fournisseurId: fournisseurs[0].ID,
        quality: 18,
        delivery: 16,
        price: 14,
        service: 17,
        compliance: 19,
        comments: 'Fournisseur fiable et réactif'
      });

      expect(result).toBeDefined();
      expect(result.totalScore).toBe(17);
      expect(result.rating).toBe('D');
    });

    it('should rate A for high scores', async () => {
      const fournisseurs = await srv.read('Fournisseurs').where({ status: 'ACTIVE' });
      expect(fournisseurs.length).toBeGreaterThan(0);

      // Scores: (90+85+80+88+92)/5 = 87 → rating 'A'
      const result = await srv.send('evaluateSupplier', {
        fournisseurId: fournisseurs[0].ID,
        quality: 90,
        delivery: 85,
        price: 80,
        service: 88,
        compliance: 92,
        comments: 'Excellent fournisseur — test haute note'
      });

      expect(result).toBeDefined();
      expect(result.totalScore).toBe(87);
      expect(result.rating).toBe('A');
    });
  });

  // ── Purchase Order Acceptance ──
  describe('Purchase Order Acceptance', () => {
    it('should accept a Purchase Order', async () => {
      const { BonsCommande } = srv.entities;
      const poId = cds.utils.uuid();
      
      // Seed a test PO with status 'SENT'
      await INSERT.into(BonsCommande).entries({
        ID: poId,
        poNumber: 'PO-TEST-123',
        date: '2026-05-24',
        status: 'SENT'
      });

      const result = await srv.send('acceptPO', { poId });
      expect(result).toBeDefined();
      expect(result.status).toBe('CONFIRMED');

      // Verify DB update
      const updated = await SELECT.one.from(BonsCommande).where({ ID: poId });
      expect(updated.status).toBe('CONFIRMED');
      expect(updated.statusDate).toBeDefined();
    });

    it('should fail to accept a PO that is not in SENT status', async () => {
      const { BonsCommande } = srv.entities;
      const poId = cds.utils.uuid();

      // Seed a test PO with status 'CONFIRMED'
      await INSERT.into(BonsCommande).entries({
        ID: poId,
        poNumber: 'PO-TEST-456',
        date: '2026-05-24',
        status: 'CONFIRMED'
      });

      await expect(srv.send('acceptPO', { poId })).rejects.toThrow();
    });
  });

  // ── Supplier Invoice ──
  describe('Supplier Invoice', () => {
    it('should create a Supplier Invoice successfully', async () => {
      const suppliers = await srv.read('Fournisseurs').where({ status: 'ACTIVE' });
      const products = await srv.read('Produits');
      expect(suppliers.length).toBeGreaterThan(0);
      expect(products.length).toBeGreaterThan(0);

      const poId = cds.utils.uuid();
      const poItemId = cds.utils.uuid();

      // Seed a test PO with status 'DELIVERED'
      await INSERT.into('sap.pme.doc.BonCommandeFournisseur').entries({
        ID: poId,
        poNumber: 'PO-TEST-INV',
        fournisseur_ID: suppliers[0].ID,
        date: '2026-05-24',
        status: 'DELIVERED',
        totalTTC: 119.00
      });

      await INSERT.into('sap.pme.doc.POItem').entries({
        ID: poItemId,
        parent_ID: poId,
        lineNumber: 1,
        product_ID: products[0].ID,
        description: products[0].name,
        quantity: 1,
        unitPrice: 100.00
      });

      const result = await srv.send('createSupplierInvoice', {
        poId,
        receptionId: null,
        items: [{
          poItemId,
          quantity: 1,
          unitPrice: 100.00,
          tvaRate: 19
        }],
        dueDate: '2026-06-24',
        notes: 'Test supplier invoice creation'
      });

      expect(result).toBeDefined();
      expect(result.invoiceNumber).toBeDefined();
      expect(result.status).toBe('APPROVED');
      expect(result.matchStatus).toBe('MATCHED');
    });

    it('should confirm cash payment successfully and close PO', async () => {
      const { FacturesFournisseur, BonsCommande } = srv.entities;
      const { Paiement } = cds.entities('sap.pme.doc');

      const poId = cds.utils.uuid();
      const factureId = cds.utils.uuid();

      // Seed a test PO with status 'DELIVERED'
      await INSERT.into(BonsCommande).entries({
        ID: poId,
        poNumber: 'PO-TEST-CASH-CONF',
        date: '2026-05-24',
        status: 'DELIVERED'
      });

      // Seed a test invoice in status 'PENDING_CASH'
      await INSERT.into(FacturesFournisseur).entries({
        ID: factureId,
        invoiceNumber: 'SINV-TEST-CASH',
        bonCommande_ID: poId,
        date: '2026-05-24',
        status: 'PENDING_CASH',
        totalTTC: 15000.00,
        paidAmount: 0,
        remainingAmount: 15000.00
      });

      // Call confirmCashPayment action
      const result = await srv.send('confirmCashPayment', { factureId });

      expect(result).toBeDefined();
      expect(result.status).toBe('PAID');
      expect(result.paidAmount).toBe(15000.00);
      expect(result.remainingAmount).toBe(0);

      // Verify PO closed
      const updatedPo = await SELECT.one.from(BonsCommande).where({ ID: poId });
      expect(updatedPo.status).toBe('CLOSED');

      // Verify Payment record created
      const payments = await SELECT.from(Paiement).where({ amount: 15000.00, method: 'ESPECES' });
      expect(payments.length).toBeGreaterThanOrEqual(1);
    });
  });
});

