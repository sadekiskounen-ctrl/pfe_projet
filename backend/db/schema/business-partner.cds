// ============================================================
// BusinessPartner — Master Data Entity
// Central entity linking clients & suppliers
// ============================================================

namespace sap.pme;

using { sap.pme as pme } from './common';
using { cuid, managed }   from '@sap/cds/common';
using { sap.pme.crm } from './crm';
using { sap.pme.srm } from './srm';

/**
 * BusinessPartner is the leading master data entity.
 * Both Clients and Fournisseurs reference it.
 * Follows SAP S/4HANA BP concept (Side-by-Side).
 */
entity BusinessPartner : cuid, managed, pme.SoftDelete, pme.Annotatable {
  bpNumber    : String(10)  @mandatory @readonly;
  bpType      : String(20)  @mandatory;  // CLIENT_B2B | CLIENT_B2C | FOURNISSEUR
  displayName : String(256) @mandatory;
  email       : pme.Email;
  phone       : pme.Phone;
  website     : pme.URL;
  logo        : pme.URL;
  status      : pme.BPStatus default 'PENDING';
  blockReason : String(512); // Motif de blocage/désactivation
  password    : String(100);
  sector      : String(128); // Secteur d'activité
  rating      : Integer default 3; // Notation en étoiles (1 à 5)

  // Algerian Fiscal Identifiers
  nif         : String(20);
  rc          : String(20);
  ai          : String(20);
  ribNumber   : String(30); // Numéro de RIB (20 ou 24 chiffres)

  // Address (embedded)
  street      : String(256);
  city        : String(128);
  postalCode  : String(10);
  wilaya      : String(64);
  country     : String(3) default 'DZ';

  // Documents Médias
  rcDoc       : LargeBinary @Core.MediaType: rcType;
  rcType      : String  @Core.IsMediaType: true;
  nifDoc      : LargeBinary @Core.MediaType: nifType;
  nifType     : String  @Core.IsMediaType: true;
  aiDoc       : LargeBinary @Core.MediaType: aiType;
  aiType      : String  @Core.IsMediaType: true;
  ribDoc      : LargeBinary @Core.MediaType: ribType;
  ribType     : String  @Core.IsMediaType: true;

  // Navigation (Corrected references)
  clientB2B   : Association to many crm.ClientB2B   on clientB2B.bp   = $self;
  clientB2C   : Association to many crm.ClientB2C   on clientB2C.bp   = $self;
  fournisseur : Association to many srm.Fournisseur on fournisseur.bp = $self;
}
