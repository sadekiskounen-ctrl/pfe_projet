// ============================================================
// CRM Service — OData V4
// Portail Client B2B & B2C — PME Connect
// ============================================================

using { sap.pme as pme }           from '../../db/schema/common';
using { sap.pme.crm as crm }       from '../../db/schema/crm';
using { sap.pme.doc as doc }        from '../../db/schema/documents';

@path: '/odata/v4/crm'
@requires: ['Admin', 'Commercial', 'ClientB2B', 'ClientB2C', 'authenticated-user']
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

  // ── Produits (catalogue synchronisé avec l'Admin) ──
  @readonly
  entity Produits as projection on pme.Produit
    where isActive = true and isDeleted = false;

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

  // ── Actions Panier → Documents ──
  // B2B : Panier → Devis (PENDING, en attente de révision admin)
  type CartItem {
    productId   : UUID;
    quantity    : Decimal(13, 3);
    unitPrice   : Decimal(15, 2);
    tvaRate     : Decimal(5, 2);
    description : String(512);
  }
  action submitCartAsDevis(
    clientB2B_ID : UUID,
    items        : array of CartItem,
    notes        : String(2000)
  ) returns Devis;

  // B2C : Panier → Commande directe (après paiement simulé)
  action submitCartAsOrder(
    clientB2C_ID    : UUID,
    items           : array of CartItem,
    paymentMethod   : String(20),
    paymentRef      : String(128)
  ) returns Commandes;

  // ── Actions Workflow Devis ──
  action approveDevis(devisId: UUID) returns Devis;
  action rejectDevis(devisId: UUID, reason: String) returns Devis;
  action convertQuoteToOrder(devisId: UUID) returns Commandes;

  // ── Actions Workflow Commande ──
  action convertCommandeToFacture(commandeId: UUID) returns Factures;
  action sendOrderToClient(commandeId: UUID) returns Commandes;
  action acceptOrder(commandeId: UUID) returns Commandes;
  action rejectOrder(commandeId: UUID) returns Commandes;

  // ── Paiement ──
  action recordPayment(factureId: UUID, amount: Decimal, method: String, reference: String) returns Paiements;

  // ── PDF ──
  function downloadDevisPDF(devisId: UUID) returns String;
  function downloadFacturePDF(factureId: UUID) returns String;
  function downloadCommandePDF(commandeId: UUID) returns String;

  // ── Email ──
  action sendDevisByEmail(devisId: UUID) returns Boolean;
  action sendFactureByEmail(factureId: UUID) returns Boolean;
}
