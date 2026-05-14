// ============================================================
// Analytics Service Handlers — KPI Calculations
// ============================================================

const cds = require('@sap/cds');

module.exports = class AnalyticsService extends cds.ApplicationService {

  async init() {

    // ── CRM Dashboard KPI ──
    this.on('getCRMDashboard', async (req) => {
      const { ClientB2B } = cds.entities('sap.pme.crm');
      const { ClientB2C } = cds.entities('sap.pme.crm');
      const { Devis, CommandeClient, FactureClient, Paiement } = cds.entities('sap.pme.doc');

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

      const [
        totalB2B, totalB2C, activeB2B,
        totalDevis, devisEnCours,
        totalCommandes, commandesEnCours,
        totalFactures, facturesImpayees,
        caMois, caAnnee, totalPaiements
      ] = await Promise.all([
        SELECT.one`count(*) as count`.from(ClientB2B),
        SELECT.one`count(*) as count`.from(ClientB2C),
        SELECT.one`count(*) as count`.from(ClientB2B).where({ status: 'ACTIVE' }),
        SELECT.one`count(*) as count`.from(Devis),
        SELECT.one`count(*) as count`.from(Devis).where({ status: ['DRAFT', 'SUBMITTED'] }),
        SELECT.one`count(*) as count`.from(CommandeClient),
        SELECT.one`count(*) as count`.from(CommandeClient).where({ status: ['DRAFT', 'CONFIRMED', 'IN_PROGRESS'] }),
        SELECT.one`count(*) as count`.from(FactureClient),
        SELECT.one`count(*) as count`.from(FactureClient).where({ status: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] }),
        SELECT.one`coalesce(sum(totalTTC),0) as total`.from(FactureClient).where`date >= ${startOfMonth} and status != 'CANCELLED'`,
        SELECT.one`coalesce(sum(totalTTC),0) as total`.from(FactureClient).where`date >= ${startOfYear} and status != 'CANCELLED'`,
        SELECT.one`coalesce(sum(amount),0) as total`.from(Paiement)
      ]);

      const tauxConversion = totalDevis?.count > 0
        ? (totalCommandes?.count / totalDevis?.count * 100).toFixed(2)
        : 0;

      return {
        totalClients: (totalB2B?.count || 0) + (totalB2C?.count || 0),
        totalClientsB2B: totalB2B?.count || 0,
        totalClientsB2C: totalB2C?.count || 0,
        activeClients: activeB2B?.count || 0,
        totalDevis: totalDevis?.count || 0,
        devisEnCours: devisEnCours?.count || 0,
        totalCommandes: totalCommandes?.count || 0,
        commandesEnCours: commandesEnCours?.count || 0,
        totalFactures: totalFactures?.count || 0,
        facturesImpayees: facturesImpayees?.count || 0,
        chiffreAffaireMois: caMois?.total || 0,
        chiffreAffaireAnnee: caAnnee?.total || 0,
        totalPaiements: totalPaiements?.total || 0,
        tauxConversion: parseFloat(tauxConversion)
      };
    });

    // ── SRM Dashboard KPI ──
    this.on('getSRMDashboard', async (req) => {
      const { Fournisseur } = cds.entities('sap.pme.srm');
      const { RFQ, BonCommandeFournisseur } = cds.entities('sap.pme.doc');

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const [
        totalFrs, frsActifs, kycPending,
        totalRFQ, rfqEnCours,
        totalPO, poEnCours,
        totalAchats, achatsMois, avgScore
      ] = await Promise.all([
        SELECT.one`count(*) as count`.from(Fournisseur),
        SELECT.one`count(*) as count`.from(Fournisseur).where({ status: 'ACTIVE' }),
        SELECT.one`count(*) as count`.from(Fournisseur).where({ kycStatus: 'PENDING' }),
        SELECT.one`count(*) as count`.from(RFQ),
        SELECT.one`count(*) as count`.from(RFQ).where({ status: ['DRAFT', 'SUBMITTED'] }),
        SELECT.one`count(*) as count`.from(BonCommandeFournisseur),
        SELECT.one`count(*) as count`.from(BonCommandeFournisseur).where({ status: ['DRAFT', 'CONFIRMED', 'IN_PROGRESS'] }),
        SELECT.one`coalesce(sum(totalTTC),0) as total`.from(BonCommandeFournisseur).where`status != 'CANCELLED'`,
        SELECT.one`coalesce(sum(totalTTC),0) as total`.from(BonCommandeFournisseur).where`date >= ${startOfMonth} and status != 'CANCELLED'`,
        SELECT.one`coalesce(avg(score),0) as avg`.from(Fournisseur).where`score > 0`
      ]);

      return {
        totalFournisseurs: totalFrs?.count || 0,
        fournisseursActifs: frsActifs?.count || 0,
        kycEnAttente: kycPending?.count || 0,
        totalRFQ: totalRFQ?.count || 0,
        rfqEnCours: rfqEnCours?.count || 0,
        totalBonsCommande: totalPO?.count || 0,
        bonsCommandeEnCours: poEnCours?.count || 0,
        totalAchats: totalAchats?.total || 0,
        achatsMois: achatsMois?.total || 0,
        scoreMoyenFournisseur: parseFloat(avgScore?.avg || 0).toFixed(2)
      };
    });

    // ── Admin Dashboard KPI ──
    this.on('getAdminDashboard', async (req) => {
      const { BusinessPartner } = cds.entities('sap.pme');
      const { Devis, CommandeClient, FactureClient } = cds.entities('sap.pme.doc');

      const [totalBP, bpPending, totalDocs] = await Promise.all([
        SELECT.one`count(*) as count`.from(BusinessPartner),
        SELECT.one`count(*) as count`.from(BusinessPartner).where({ status: 'PENDING' }),
        Promise.all([
          SELECT.one`count(*) as count`.from(Devis),
          SELECT.one`count(*) as count`.from(CommandeClient),
          SELECT.one`count(*) as count`.from(FactureClient)
        ])
      ]);

      return {
        totalBusinessPartners: totalBP?.count || 0,
        bpEnAttente: bpPending?.count || 0,
        totalDocuments: totalDocs.reduce((sum, d) => sum + (d?.count || 0), 0),
        totalUtilisateurs: totalBP?.count || 0,
        systemHealth: 'OK'
      };
    });

    await super.init();
  }
};
