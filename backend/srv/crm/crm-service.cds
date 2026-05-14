// ============================================================
// CRM Service — OData V4 (Extended with PDF & Email actions)
// ============================================================

using { sap.pme as pme }           from '../../db/schema/common';
using { sap.pme.crm as crm }       from '../../db/schema/crm';
using { sap.pme.doc as doc }        from '../../db/schema/documents';

@path: '/odata/v4/crm'
@requires: 'authenticated-user'
service CRMService {

  // ── Clients B2B ──
  entity ClientsB2B as projection on crm.ClientB2B {
    *,
    bp : redirected to BusinessPartners,
    documents : redirected to ClientDocuments,
    devis : redirected to Devis,
    commandes : redirected to Commandes,
    factures : redirected to Factures
  };

  // ── Clients B2C ──
  entity ClientsB2C as projection on crm.ClientB2C {
    *,
    bp : redirected to BusinessPartners
  };

  // ── Documents clients ──
  entity ClientDocuments as projection on crm.ClientDocument;

  // ── Business Partners (read-only from CRM) ──
  @readonly
  entity BusinessPartners as projection on pme.BusinessPartner;

  // ── Produits ──
  @readonly
  entity Produits as projection on pme.Produit;

  // ── Devis ──
  entity Devis as projection on doc.Devis {
    *,
    clientB2B : redirected to ClientsB2B,
    clientB2C : redirected to ClientsB2C,
    items : redirected to DevisItems,
    commande : redirected to Commandes
  };
  entity DevisItems as projection on doc.DevisItem {
    *,
    product : redirected to Produits
  };

  // ── Commandes Client ──
  entity Commandes as projection on doc.CommandeClient {
    *,
    clientB2B : redirected to ClientsB2B,
    clientB2C : redirected to ClientsB2C,
    devis : redirected to Devis,
    items : redirected to CommandeItems,
    facture : redirected to Factures
  };
  entity CommandeItems as projection on doc.CommandeItem {
    *,
    product : redirected to Produits
  };

  // ── Factures Client ──
  entity Factures as projection on doc.FactureClient {
    *,
    clientB2B : redirected to ClientsB2B,
    clientB2C : redirected to ClientsB2C,
    commande : redirected to Commandes,
    items : redirected to FactureItems,
    paiements : redirected to Paiements
  };
  entity FactureItems as projection on doc.FactureClientItem {
    *,
    product : redirected to Produits
  };

  // ── Paiements ──
  entity Paiements as projection on doc.Paiement {
    *,
    facture : redirected to Factures
  };

  // ── Actions métier CRM ──
  action convertDevisToCommande(devisId: UUID) returns Commandes;
  action convertCommandeToFacture(commandeId: UUID) returns Factures;
  action approveDevis(devisId: UUID) returns Devis;
  action rejectDevis(devisId: UUID, reason: String) returns Devis;
  action recordPayment(factureId: UUID, amount: Decimal, method: String, reference: String) returns Paiements;

  // ── PDF Actions ──
  // Returns base64 encoded PDF
  function downloadDevisPDF(devisId: UUID) returns String;
  function downloadFacturePDF(factureId: UUID) returns String;

  // ── Email Actions ──
  action sendDevisByEmail(devisId: UUID) returns Boolean;
  action sendFactureByEmail(factureId: UUID) returns Boolean;
}
