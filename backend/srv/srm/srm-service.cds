// ============================================================
// SRM Service — OData V4
// Portail Fournisseur — PME Connect
// ============================================================

using { sap.pme as pme }           from '../../db/index';
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
    deliveryTerms : String(128),
    ai            : String(30)
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
  action acceptPO(poId: UUID) returns BonsCommande;

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

  // Réception Marchandise (GR)
  type GRItem_Input {
    poItemId    : UUID;
    receivedQty : Decimal(13, 3);
    acceptedQty : Decimal(13, 3);
    rejectedQty : Decimal(13, 3);
    notes       : String(500);
  }
  action createGoodsReceipt(
    poId  : UUID,
    items : array of GRItem_Input,
    notes : String(2000)
  ) returns Receptions;

  // Facture Fournisseur
  type SupplierInvoiceItem_Input {
    poItemId    : UUID;
    quantity    : Decimal(13, 3);
    unitPrice   : Decimal(15, 2);
    tvaRate     : Decimal(5, 2);
    description : String(512);
  }
  action createSupplierInvoice(
    poId        : UUID,
    receptionId : UUID,
    items       : array of SupplierInvoiceItem_Input,
    dueDate     : Date,
    notes       : String(2000)
  ) returns FacturesFournisseur;

  action confirmCashPayment(
    factureId: UUID
  ) returns FacturesFournisseur;

  type ResendItem_Input {
    poItemId  : UUID;
    resendQty : Decimal(13, 3);
  }
  type ApproveItem_Input {
    poItemId    : UUID;
    acceptedQty : Decimal(13, 3);
    rejectedQty : Decimal(13, 3);
  }
  action resolveDiscrepancy(poId: UUID, items: array of ResendItem_Input) returns BonsCommande;
  action approveDiscrepancyResolution(poId: UUID, items: array of ApproveItem_Input) returns BonsCommande;

  function downloadPOPDF(poId: UUID) returns String;
  function downloadGRPDF(grId: UUID) returns String;
  function downloadSupplierInvoicePDF(factureId: UUID) returns String;
}
