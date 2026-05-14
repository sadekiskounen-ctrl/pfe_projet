// ============================================================
// Tests SRM Service
// ============================================================

'use strict';
const cds = require('@sap/cds');

describe('SRM Service Tests', () => {

  let srv;

  beforeAll(async () => {
    srv = await cds.connect.to('SRMService');
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
      expect(actifs.length).toBeGreaterThanOrEqual(2);
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
      expect(result.rating).toBe('A');
      expect(result.totalScore).toBe(16);
    });
  });
});
