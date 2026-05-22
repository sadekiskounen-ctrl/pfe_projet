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
});
