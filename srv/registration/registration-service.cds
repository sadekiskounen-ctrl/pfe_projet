// ============================================================
// Registration Service — Public Onboarding API
// ============================================================

using { sap.pme as pme }           from '../../db/schema/common';
using { sap.pme.crm as crm }       from '../../db/schema/crm';
using { sap.pme.srm as srm }       from '../../db/schema/srm';

@path: '/odata/v4/registration'
// Service public (pas d'authentification requise)
service RegistrationService {

  // ── Inscription B2B ──
  @insertonly
  entity RegisterClientB2B as projection on crm.ClientB2B {
    companyName, rc, nif, nis, ai, sector, legalForm,
    contactName, contactRole, email, phone, street, city, postalCode, wilaya, country,
    documents
  };

  @insertonly
  entity ClientDocuments as projection on crm.ClientDocument;

  // ── Inscription Fournisseur ──
  @insertonly
  entity RegisterFournisseur as projection on srm.Fournisseur {
    companyName, rc, nif, sector, legalForm,
    contactName, contactRole, email, phone, bankName, rib,
    street, city, postalCode, wilaya, country,
    kycDocuments
  };

  @insertonly
  entity FournisseurDocuments as projection on srm.FournisseurDocument;

}
