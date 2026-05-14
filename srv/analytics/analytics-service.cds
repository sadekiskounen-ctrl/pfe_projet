// ============================================================
// Analytics Service — KPI & Dashboards
// ============================================================

using { sap.pme as pme }           from '../../db/schema/common';
using { sap.pme.crm as crm }       from '../../db/schema/crm';
using { sap.pme.srm as srm }       from '../../db/schema/srm';
using { sap.pme.doc as doc }        from '../../db/schema/documents';

@path: '/odata/v4/analytics'
@requires: 'authenticated-user'
service AnalyticsService {

  // ── Read-only projections for analytics ──
  @readonly entity Clients       as projection on crm.ClientB2B;
  @readonly entity Fournisseurs  as projection on srm.Fournisseur;
  @readonly entity Devis         as projection on doc.Devis;
  @readonly entity Commandes     as projection on doc.CommandeClient;
  @readonly entity Factures      as projection on doc.FactureClient;
  @readonly entity Paiements     as projection on doc.Paiement;
  @readonly entity BonsCommande  as projection on doc.BonCommandeFournisseur;
  @readonly entity Produits      as projection on pme.Produit;

  // ── Functions for KPI ──
  function getCRMDashboard()  returns CRMDashboardKPI;
  function getSRMDashboard()  returns SRMDashboardKPI;
  function getAdminDashboard() returns AdminDashboardKPI;

  // ── KPI Types ──
  type CRMDashboardKPI {
    totalClients       : Integer;
    totalClientsB2B    : Integer;
    totalClientsB2C    : Integer;
    activeClients      : Integer;
    totalDevis         : Integer;
    devisEnCours       : Integer;
    totalCommandes     : Integer;
    commandesEnCours   : Integer;
    totalFactures      : Integer;
    facturesImpayees   : Integer;
    chiffreAffaireMois : Decimal(15,2);
    chiffreAffaireAnnee: Decimal(15,2);
    totalPaiements     : Decimal(15,2);
    tauxConversion     : Decimal(5,2);
  }

  type SRMDashboardKPI {
    totalFournisseurs     : Integer;
    fournisseursActifs    : Integer;
    kycEnAttente          : Integer;
    totalRFQ              : Integer;
    rfqEnCours            : Integer;
    totalBonsCommande     : Integer;
    bonsCommandeEnCours   : Integer;
    totalAchats           : Decimal(15,2);
    achatsMois            : Decimal(15,2);
    scoreMoyenFournisseur : Decimal(5,2);
  }

  type AdminDashboardKPI {
    totalBusinessPartners : Integer;
    bpEnAttente           : Integer;
    totalDocuments        : Integer;
    totalUtilisateurs     : Integer;
    systemHealth          : String;
  }
}
