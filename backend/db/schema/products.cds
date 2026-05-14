// ============================================================
// Produits & Services
// ============================================================

namespace sap.pme;

using { sap.pme as pme } from './common';
using { cuid, managed, Currency } from '@sap/cds/common';

/**
 * Produit ou Service proposé
 */
entity Produit : cuid, managed, pme.SoftDelete {
  code         : String(20)  @mandatory;
  name         : String(256) @mandatory;
  description  : String(2000);
  category     : String(128);
  type         : String(20) default 'PRODUCT'; // PRODUCT | SERVICE
  unit         : String(20) default 'PIECE';   // PIECE, KG, LITRE, HEURE, etc.
  unitPrice    : pme.Amount;
  currency     : Currency;
  tvaRate      : pme.Percent default 19.00;    // TVA algérienne 19%
  stock        : Integer default 0;
  minStock     : Integer default 0;
  imageUrl     : pme.URL;
  isActive     : Boolean default true;
}
