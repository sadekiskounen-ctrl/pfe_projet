// ============================================================
// SRM Service — OData V4
// Portail Fournisseur — PME Connect
// ============================================================

using { sap.pme as pme }           from '../../db/schema/common';
using { sap.pme.srm as srm }       from '../../db/schema/srm';
using { sap.pme.doc as doc }        from '../../db/schema/documents';

@path: '/odata/v4/srm'
@requires: ['Admin', 'Commercial', 'Fournisseur', 'authenticated-user']
service SRMService {

  // ── Fournisseurs ──
  entity Fournisseurs as projection on srm.Fournisseur {
    *,
    bp           : redirected to BusinessPartners,
    kycDocuments : redirected to FournisseurDocuments,
    evaluations  : redirected to Evaluations,
    rfqs         : redirected to RFQs,
    bonCommandes : redirected to BonsCommande,
    factures     : redirected to FacturesFournisseur
  };

  entity FournisseurDocuments as projection on srm.FournisseurDocument;
  entity Evaluations as projection on srm.FournisseurEvaluation;

  @readonly
  entity BusinessPartners as projection on pme.BusinessPartner;

  @readonly
  entity Produits as projection on pme.Produit
    where isActive = true and isDeleted = false;

  // ── RFQ (Appels d'Offres) ──
  entity RFQs as projection on doc.RFQ {
    *,
    fournisseur : redirected to Fournisseurs,
    items       : redirected to RFQItems,
    responses   : redirected to RFQResponses,
    selectedResponse : redirected to RFQResponses
  };
  entity RFQItems as projection on doc.RFQItem {
    *, product : redirected to Produits
  };
  entity RFQResponses as projection on doc.RFQResponse {
    *,
    fournisseur : redirected to Fournisseurs,
    items       : redirected to RFQResponseItems
  };
  entity RFQResponseItems as projection on doc.RFQResponseItem {
    *, rfqItem : redirected to RFQItems
  };

  // ── Bons de Commande Fournisseur ──
  entity BonsCommande as projection on doc.BonCommandeFournisseur {
    *,
    fournisseur : redirected to Fournisseurs,
    rfq         : redirected to RFQs,
    items       : redirected to POItems,
    receptions  : redirected to Receptions
  };
  entity POItems as projection on doc.POItem {
    *, product : redirected to Produits
  };

  // ── Réceptions Marchandise ──
  entity Receptions as projection on doc.ReceptionMarchandise {
    *,
    bonCommande : redirected to BonsCommande,
    items       : redirected to ReceptionItems
  };
  entity ReceptionItems as projection on doc.ReceptionItem {
    *,
    poItem   : redirected to POItems,
    product  : redirected to Produits
  };

  // ── Factures Fournisseur ──
  entity FacturesFournisseur as projection on doc.FactureFournisseur {
    *,
    fournisseur : redirected to Fournisseurs,
    bonCommande : redirected to BonsCommande,
    reception   : redirected to Receptions,
    items       : redirected to FactureFournisseurItems
  };
  entity FactureFournisseurItems as projection on doc.FactureFournisseurItem {
    *,
    poItem   : redirected to POItems,
    product  : redirected to Produits
  };

  // ── Actions métier SRM ──

  // KYC & Profil
  action validateKYC(fournisseurId: UUID) returns Fournisseurs;
  action rejectKYC(fournisseurId: UUID, reason: String) returns Fournisseurs;
  action updateProfile(
    fournisseurId : UUID,
    bankName      : String(128),
    rib           : String(30),
    bankAccount   : String(30),
    street        : String(256),
    city          : String(128),
    wilaya        : String(64),
    phone         : String(30),
    paymentTerms  : String(128),
    deliveryTerms : String(128)
  ) returns Fournisseurs;

  // Réponse aux Appels d'Offres
  type RFQResponseItem_Input {
    rfqItemId  : UUID;
    unitPrice  : Decimal(15, 2);
    notes      : String(500);
  }
  action submitRFQResponse(
    rfqId        : UUID,
    fournisseurId: UUID,
    deliveryDays : Integer,
    validUntil   : Date,
    notes        : String(2000),
    items        : array of RFQResponseItem_Input
  ) returns RFQResponses;

  // Workflow Admin
  action selectRFQResponse(rfqId: UUID, responseId: UUID) returns RFQs;
  action convertRFQToPO(rfqId: UUID) returns BonsCommande;

  // 3-Way Match
  action performThreeWayMatch(factureId: UUID) returns FacturesFournisseur;

  // Évaluation fournisseur
  action evaluateSupplier(
    fournisseurId  : UUID,
    quality        : Integer,
    delivery       : Integer,
    price          : Integer,
    service        : Integer,
    compliance     : Integer,
    comments       : String
  ) returns Evaluations;
}
