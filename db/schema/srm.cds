// ============================================================
// SRM Module — Fournisseurs, KYC, Notation
// ============================================================

namespace sap.pme.srm;

using { sap.pme as pme } from './common';
using { cuid, managed }   from '@sap/cds/common';

/**
 * Fournisseur — Supplier master data
 * Workflow onboarding + KYC validation
 */
entity Fournisseur : cuid, managed, pme.StatusTracking, pme.SoftDelete {
  bp              : Association to pme.BusinessPartner;
  companyName     : String(256) @mandatory;
  rc              : String(30);
  nif             : String(30);
  nis             : String(30);
  ai              : String(30);
  sector          : String(128);
  legalForm       : String(64);

  // Contact principal
  contactName     : String(256);
  contactRole     : String(128);
  email           : pme.Email    @mandatory;
  phone           : pme.Phone;

  // Adresse
  street          : String(256);
  city            : String(128);
  postalCode      : String(10);
  wilaya          : String(64);
  country         : String(3) default 'DZ';

  // Bancaire
  bankName        : String(128);
  bankAccount     : String(30);
  rib             : String(30);

  // KYC
  kycStatus       : String(20) default 'PENDING'; // PENDING, VALIDATED, REJECTED
  kycDate         : Date;
  kycBy           : String(256);
  kycDocuments    : Composition of many FournisseurDocument on kycDocuments.fournisseur = $self;

  // Notation / Scoring
  rating          : pme.SupplierRating;
  score           : Integer default 0;   // 0-100
  evaluations     : Composition of many FournisseurEvaluation on evaluations.fournisseur = $self;

  // Relations métier
  rfqs            : Association to many pme.doc.RFQ                  on rfqs.fournisseur             = $self;
  bonCommandes    : Association to many pme.doc.BonCommandeFournisseur on bonCommandes.fournisseur     = $self;
  factures        : Association to many pme.doc.FactureFournisseur    on factures.fournisseur          = $self;

  // Catégories de produits/services
  categories      : String(512); // Comma-separated categories

  // Conditions
  paymentTerms    : String(128);
  deliveryTerms   : String(128);
  leadTimeDays    : Integer;
}

/**
 * Documents KYC du fournisseur
 */
entity FournisseurDocument : cuid, managed {
  fournisseur  : Association to Fournisseur;
  docType      : String(50) @mandatory;
  fileName     : String(256);
  fileType     : String(20);
  fileSize     : Integer;
  url          : pme.URL;
  verified     : Boolean default false;
  verifiedBy   : String(256);
  verifiedAt   : Timestamp;
}

/**
 * Évaluations périodiques du fournisseur
 */
entity FournisseurEvaluation : cuid, managed {
  fournisseur    : Association to Fournisseur;
  date           : Date       @mandatory;
  evaluatedBy    : String(256);
  qualityScore   : Integer;    // 0-20
  deliveryScore  : Integer;    // 0-20
  priceScore     : Integer;    // 0-20
  serviceScore   : Integer;    // 0-20
  complianceScore: Integer;    // 0-20
  totalScore     : Integer;    // Calculated: sum / 5
  comments       : String(2000);
  rating         : pme.SupplierRating;
}
