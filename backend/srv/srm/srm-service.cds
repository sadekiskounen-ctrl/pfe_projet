// ============================================================
// SRM Service — OData V4
// Gestion Fournisseurs, RFQ, Bons de Commande, Réceptions
// ============================================================

using { sap.pme as pme }           from '../../db/schema/common';
using { sap.pme.srm as srm }       from '../../db/schema/srm';
using { sap.pme.doc as doc }        from '../../db/schema/documents';

@path: '/odata/v4/srm'
@requires: 'authenticated-user'
service SRMService {

  // ── Fournisseurs ──
  entity Fournisseurs as projection on srm.Fournisseur {
    *,
    bp : redirected to BusinessPartners,
    kycDocuments : redirected to FournisseurDocuments,
    evaluations : redirected to Evaluations,
    rfqs : redirected to RFQs,
    bonCommandes : redirected to BonsCommande,
    factures : redirected to FacturesFournisseur
  };

  entity FournisseurDocuments as projection on srm.FournisseurDocument;
  entity Evaluations as projection on srm.FournisseurEvaluation;

  @readonly
  entity BusinessPartners as projection on pme.BusinessPartner;

  @readonly
  entity Produits as projection on pme.Produit;

  // ── RFQ ──
  entity RFQs as projection on doc.RFQ {
    *,
    fournisseur : redirected to Fournisseurs,
    items : redirected to RFQItems,
    responses : redirected to RFQResponses
  };
  entity RFQItems as projection on doc.RFQItem;
  entity RFQResponses as projection on doc.RFQResponse {
    *,
    fournisseur : redirected to Fournisseurs,
    items : redirected to RFQResponseItems
  };
  entity RFQResponseItems as projection on doc.RFQResponseItem;

  // ── Bons de Commande Fournisseur ──
  entity BonsCommande as projection on doc.BonCommandeFournisseur {
    *,
    fournisseur : redirected to Fournisseurs,
    rfq : redirected to RFQs,
    items : redirected to POItems,
    receptions : redirected to Receptions
  };
  entity POItems as projection on doc.POItem;

  // ── Réceptions ──
  entity Receptions as projection on doc.ReceptionMarchandise {
    *,
    bonCommande : redirected to BonsCommande,
    items : redirected to ReceptionItems
  };
  entity ReceptionItems as projection on doc.ReceptionItem;

  // ── Factures Fournisseur ──
  entity FacturesFournisseur as projection on doc.FactureFournisseur {
    *,
    fournisseur : redirected to Fournisseurs,
    bonCommande : redirected to BonsCommande,
    reception : redirected to Receptions,
    items : redirected to FactureFournisseurItems
  };
  entity FactureFournisseurItems as projection on doc.FactureFournisseurItem;

  // ── Actions métier SRM ──
  action validateKYC(fournisseurId: UUID) returns Fournisseurs;
  action rejectKYC(fournisseurId: UUID, reason: String) returns Fournisseurs;
  action selectRFQResponse(rfqId: UUID, responseId: UUID) returns RFQs;
  action convertRFQToPO(rfqId: UUID) returns BonsCommande;
  action performThreeWayMatch(factureId: UUID) returns FacturesFournisseur;
  action evaluateSupplier(fournisseurId: UUID, quality: Integer, delivery: Integer, price: Integer, service: Integer, compliance: Integer, comments: String) returns Evaluations;
}
