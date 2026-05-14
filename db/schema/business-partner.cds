// ============================================================
// BusinessPartner — Master Data Entity
// Central entity linking clients & suppliers
// ============================================================

namespace sap.pme;

using { sap.pme as pme } from './common';
using { cuid, managed }   from '@sap/cds/common';

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

  // Address (embedded)
  street      : String(256);
  city        : String(128);
  postalCode  : String(10);
  wilaya      : String(64);
  country     : String(3) default 'DZ';

  // Navigation
  clientB2B   : Association to one pme.crm.ClientB2B   on clientB2B.bp   = $self;
  clientB2C   : Association to one pme.crm.ClientB2C   on clientB2C.bp   = $self;
  fournisseur : Association to one pme.srm.Fournisseur on fournisseur.bp = $self;
}
