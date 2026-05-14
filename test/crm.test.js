// ============================================================
// Tests CRM Service
// ============================================================

'use strict';
const cds = require('@sap/cds');

describe('CRM Service Tests', () => {

  let srv;

  beforeAll(async () => {
    srv = await cds.connect.to('CRMService');
  });

  // ── Clients B2B ──
  describe('ClientsB2B', () => {
    it('should list all B2B clients', async () => {
      const clients = await srv.read('ClientsB2B');
      expect(clients).toBeDefined();
      expect(Array.isArray(clients)).toBe(true);
      expect(clients.length).toBeGreaterThan(0);
    });

    it('should find SARL TechDZ', async () => {
      const clients = await srv.read('ClientsB2B').where({ companyName: 'SARL TechDZ Solutions' });
      expect(clients.length).toBe(1);
      expect(clients[0].email).toBe('contact@techdz.dz');
    });

    it('should reject B2B client without email', async () => {
      await expect(
        srv.create('ClientsB2B', { companyName: 'Test Inc.' })
      ).rejects.toBeDefined();
    });
  });

  // ── Produits ──
  describe('Produits', () => {
    it('should list all products', async () => {
      const products = await srv.read('Produits');
      expect(products.length).toBeGreaterThanOrEqual(10);
    });

    it('should have DZD currency', async () => {
      const products = await srv.read('Produits');
      const hasDZD = products.some(p => p.currency_code === 'DZD');
      expect(hasDZD).toBe(true);
    });
  });

  // ── Devis ──
  describe('Devis Lifecycle', () => {
    let devisId;

    it('should create a devis', async () => {
      const clients = await srv.read('ClientsB2B');
      const products = await srv.read('Produits');
      expect(clients.length).toBeGreaterThan(0);

      const devis = await srv.create('Devis', {
        clientB2B_ID: clients[0].ID,
        date: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        currency_code: 'DZD',
        items: [{
          lineNumber: 1,
          product_ID: products[0].ID,
          description: products[0].name,
          quantity: 2,
          unit: 'PIECE',
          unitPrice: products[0].unitPrice,
          tvaRate: 19
        }]
      });

      expect(devis).toBeDefined();
      expect(devis.devisNumber).toMatch(/^DEV-/);
      devisId = devis.ID;
    });

    it('should approve the devis', async () => {
      if (!devisId) return;
      const result = await srv.send('approveDevis', { devisId });
      expect(result).toBeDefined();
    });

    it('should convert devis to commande', async () => {
      if (!devisId) return;
      const commande = await srv.send('convertDevisToCommande', { devisId });
      expect(commande).toBeDefined();
      expect(commande.orderNumber).toMatch(/^CMD-/);
    });
  });
});
