// ============================================================
// CRM Module — Clients B2B & B2C
// ============================================================

namespace sap.pme.crm;

using { sap.pme as pme } from './common';
using { cuid, managed }   from '@sap/cds/common';

/**
 * Client B2B (entreprise)
 * Nécessite validation admin + upload documents légaux
 */
entity ClientB2B : cuid, managed, pme.StatusTracking, pme.SoftDelete {
  bp           : Association to pme.BusinessPartner;
  companyName  : String(256) @mandatory;
  rc           : String(30);   // Registre du Commerce
  nif          : String(30);   // Numéro d'Identification Fiscale
  nis          : String(30);   // Numéro d'Identification Statistique
  ai           : String(30);   // Article d'Imposition
  sector       : String(128);
  legalForm    : String(64);   // SARL, SPA, EURL, SNC, etc.
  capital      : pme.Amount;
  employeeCount: Integer;

  // Contact principal
  contactName  : String(256);
  contactRole  : String(128);
  email        : pme.Email    @mandatory;
  phone        : pme.Phone;
  fax          : pme.Phone;

  // Adresse
  street       : String(256);
  city         : String(128);
  postalCode   : String(10);
  wilaya       : String(64);
  country      : String(3) default 'DZ';

  // Documents légaux
  documents    : Composition of many ClientDocument on documents.client = $self;

  // Relations métier
  devis        : Association to many pme.doc.Devis          on devis.clientB2B      = $self;
  commandes    : Association to many pme.doc.CommandeClient  on commandes.clientB2B  = $self;
  factures     : Association to many pme.doc.FactureClient   on factures.clientB2B   = $self;

  // Scoring
  chiffreAffaire : pme.Amount default 0;
  creditLimit    : pme.Amount default 0;
}

/**
 * Client B2C (particulier)
 */
entity ClientB2C : cuid, managed, pme.StatusTracking, pme.SoftDelete {
  bp           : Association to pme.BusinessPartner;
  firstName    : String(128) @mandatory;
  lastName     : String(128) @mandatory;
  fullName     : String(256) = firstName || ' ' || lastName;
  email        : pme.Email   @mandatory;
  phone        : pme.Phone;
  dateOfBirth  : Date;
  gender       : String(10);

  // Adresse
  street       : String(256);
  city         : String(128);
  postalCode   : String(10);
  wilaya       : String(64);
  country      : String(3) default 'DZ';

  // Relations métier
  devis        : Association to many pme.doc.Devis          on devis.clientB2C      = $self;
  commandes    : Association to many pme.doc.CommandeClient  on commandes.clientB2C  = $self;
}

/**
 * Documents légaux pour clients B2B (RC, NIF, etc.)
 */
entity ClientDocument : cuid, managed {
  client       : Association to ClientB2B;
  docType      : String(50)  @mandatory;  // RC, NIF, NIS, AI, RIB, AUTRE
  fileName     : String(256);
  fileType     : String(20);
  fileSize     : Integer;
  url          : pme.URL;
  verified     : Boolean default false;
  verifiedBy   : String(256);
  verifiedAt   : Timestamp;
}
