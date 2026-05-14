// ============================================================
// Documents Métier — Devis, Commandes, Factures, Paiements
// CRM Side (clients) + SRM Side (fournisseurs)
// ============================================================

namespace sap.pme.doc;

using { sap.pme as pme }         from './common';
using { sap.pme.crm as crm }     from './crm';
using { sap.pme.srm as srm }     from './srm';
using { cuid, managed, Currency } from '@sap/cds/common';

// ────────────────────────────────────────────
// CRM DOCUMENTS — Côté Client
// ────────────────────────────────────────────

/**
 * Devis client — Quote / Quotation
 */
entity Devis : cuid, managed, pme.StatusTracking, pme.Annotatable {
  devisNumber  : String(20)  @mandatory @readonly;
  clientB2B    : Association to crm.ClientB2B;
  clientB2C    : Association to crm.ClientB2C;
  date         : Date       @mandatory;
  validUntil   : Date;
  items        : Composition of many DevisItem on items.parent = $self;
  totalHT      : pme.Amount default 0;
  totalTVA     : pme.Amount default 0;
  totalTTC     : pme.Amount default 0;
  currency     : Currency;
  discount     : pme.Percent default 0;
  // Conversion en commande
  convertedToOrder : Boolean default false;
  commande     : Association to CommandeClient;
}

entity DevisItem : cuid {
  parent       : Association to Devis;
  lineNumber   : Integer;
  product      : Association to pme.Produit;
  description  : String(512);
  quantity     : Decimal(13, 3) default 1;
  unit         : String(20) default 'PIECE';
  unitPrice    : pme.Amount;
  discount     : pme.Percent default 0;
  tvaRate      : pme.Percent default 19;
  totalHT      : pme.Amount;
  totalTVA     : pme.Amount;
  totalTTC     : pme.Amount;
}

/**
 * Commande client — Sales Order
 */
entity CommandeClient : cuid, managed, pme.StatusTracking, pme.Annotatable {
  orderNumber  : String(20) @mandatory @readonly;
  clientB2B    : Association to crm.ClientB2B;
  clientB2C    : Association to crm.ClientB2C;
  devis        : Association to Devis;
  date         : Date      @mandatory;
  deliveryDate : Date;
  items        : Composition of many CommandeItem on items.parent = $self;
  totalHT      : pme.Amount default 0;
  totalTVA     : pme.Amount default 0;
  totalTTC     : pme.Amount default 0;
  currency     : Currency;
  // Facturation
  invoiced     : Boolean default false;
  facture      : Association to FactureClient;
}

entity CommandeItem : cuid {
  parent       : Association to CommandeClient;
  lineNumber   : Integer;
  product      : Association to pme.Produit;
  description  : String(512);
  quantity     : Decimal(13, 3) default 1;
  unit         : String(20) default 'PIECE';
  unitPrice    : pme.Amount;
  discount     : pme.Percent default 0;
  tvaRate      : pme.Percent default 19;
  totalHT      : pme.Amount;
  totalTVA     : pme.Amount;
  totalTTC     : pme.Amount;
  deliveredQty : Decimal(13, 3) default 0;
}

/**
 * Facture client — Sales Invoice
 */
entity FactureClient : cuid, managed, pme.StatusTracking, pme.Annotatable {
  invoiceNumber : String(20) @mandatory @readonly;
  commande      : Association to CommandeClient;
  clientB2B     : Association to crm.ClientB2B;
  clientB2C     : Association to crm.ClientB2C;
  date          : Date      @mandatory;
  dueDate       : Date;
  items         : Composition of many FactureClientItem on items.parent = $self;
  totalHT       : pme.Amount default 0;
  totalTVA      : pme.Amount default 0;
  totalTTC      : pme.Amount default 0;
  paidAmount    : pme.Amount default 0;
  remainingAmount : pme.Amount default 0;
  currency      : Currency;
  timbreFiscal  : pme.Amount default 0;  // Timbre fiscal algérien
  // Paiements
  paiements     : Composition of many Paiement on paiements.facture = $self;
}

entity FactureClientItem : cuid {
  parent       : Association to FactureClient;
  lineNumber   : Integer;
  product      : Association to pme.Produit;
  description  : String(512);
  quantity     : Decimal(13, 3);
  unit         : String(20);
  unitPrice    : pme.Amount;
  tvaRate      : pme.Percent default 19;
  totalHT      : pme.Amount;
  totalTVA     : pme.Amount;
  totalTTC     : pme.Amount;
}

/**
 * Paiement client
 */
entity Paiement : cuid, managed {
  paymentNumber : String(20) @mandatory @readonly;
  facture       : Association to FactureClient;
  date          : Date      @mandatory;
  amount        : pme.Amount @mandatory;
  method        : pme.PaymentMethod;
  reference     : String(128);
  bankName      : String(128);
  notes         : String(500);
  currency      : Currency;
}

// ────────────────────────────────────────────
// SRM DOCUMENTS — Côté Fournisseur
// ────────────────────────────────────────────

/**
 * RFQ — Request for Quotation (Appel d'offres)
 */
entity RFQ : cuid, managed, pme.StatusTracking, pme.Annotatable {
  rfqNumber    : String(20) @mandatory @readonly;
  title        : String(256) @mandatory;
  description  : String(2000);
  fournisseur  : Association to srm.Fournisseur;
  date         : Date       @mandatory;
  deadline     : Date;
  items        : Composition of many RFQItem on items.parent = $self;
  responses    : Composition of many RFQResponse on responses.rfq = $self;
  totalBudget  : pme.Amount;
  currency     : Currency;
  selectedResponse : Association to RFQResponse;
}

entity RFQItem : cuid {
  parent       : Association to RFQ;
  lineNumber   : Integer;
  product      : Association to pme.Produit;
  description  : String(512);
  quantity     : Decimal(13, 3);
  unit         : String(20);
  targetPrice  : pme.Amount;
}

entity RFQResponse : cuid, managed {
  rfq          : Association to RFQ;
  fournisseur  : Association to srm.Fournisseur;
  date         : Date;
  totalAmount  : pme.Amount;
  deliveryDays : Integer;
  validUntil   : Date;
  items        : Composition of many RFQResponseItem on items.parent = $self;
  selected     : Boolean default false;
  notes        : String(2000);
}

entity RFQResponseItem : cuid {
  parent       : Association to RFQResponse;
  rfqItem      : Association to RFQItem;
  unitPrice    : pme.Amount;
  totalPrice   : pme.Amount;
  notes        : String(500);
}

/**
 * Bon de Commande Fournisseur — Purchase Order
 */
entity BonCommandeFournisseur : cuid, managed, pme.StatusTracking, pme.Annotatable {
  poNumber     : String(20) @mandatory @readonly;
  fournisseur  : Association to srm.Fournisseur;
  rfq          : Association to RFQ;
  date         : Date      @mandatory;
  deliveryDate : Date;
  items        : Composition of many POItem on items.parent = $self;
  totalHT      : pme.Amount default 0;
  totalTVA     : pme.Amount default 0;
  totalTTC     : pme.Amount default 0;
  currency     : Currency;
  // Réception
  receptions   : Association to many ReceptionMarchandise on receptions.bonCommande = $self;
}

entity POItem : cuid {
  parent       : Association to BonCommandeFournisseur;
  lineNumber   : Integer;
  product      : Association to pme.Produit;
  description  : String(512);
  quantity     : Decimal(13, 3);
  unit         : String(20);
  unitPrice    : pme.Amount;
  tvaRate      : pme.Percent default 19;
  totalHT      : pme.Amount;
  totalTVA     : pme.Amount;
  totalTTC     : pme.Amount;
  receivedQty  : Decimal(13, 3) default 0;
}

/**
 * Réception Marchandise — Goods Receipt
 */
entity ReceptionMarchandise : cuid, managed, pme.StatusTracking {
  receiptNumber : String(20) @mandatory @readonly;
  bonCommande   : Association to BonCommandeFournisseur;
  date          : Date      @mandatory;
  items         : Composition of many ReceptionItem on items.parent = $self;
  receivedBy    : String(256);
  notes         : String(2000);
}

entity ReceptionItem : cuid {
  parent       : Association to ReceptionMarchandise;
  poItem       : Association to POItem;
  product      : Association to pme.Produit;
  orderedQty   : Decimal(13, 3);
  receivedQty  : Decimal(13, 3);
  acceptedQty  : Decimal(13, 3);
  rejectedQty  : Decimal(13, 3) default 0;
  notes        : String(500);
}

/**
 * Facture Fournisseur — Supplier Invoice
 * Supports 3-way match: PO ↔ Receipt ↔ Invoice
 */
entity FactureFournisseur : cuid, managed, pme.StatusTracking, pme.Annotatable {
  invoiceNumber : String(20) @mandatory @readonly;
  fournisseur   : Association to srm.Fournisseur;
  bonCommande   : Association to BonCommandeFournisseur;
  reception     : Association to ReceptionMarchandise;
  date          : Date      @mandatory;
  dueDate       : Date;
  items         : Composition of many FactureFournisseurItem on items.parent = $self;
  totalHT       : pme.Amount default 0;
  totalTVA      : pme.Amount default 0;
  totalTTC      : pme.Amount default 0;
  currency      : Currency;
  // 3-Way Match
  matchStatus   : String(20) default 'PENDING'; // PENDING, MATCHED, DISCREPANCY
  matchDate     : Timestamp;
  matchBy       : String(256);
}

entity FactureFournisseurItem : cuid {
  parent       : Association to FactureFournisseur;
  lineNumber   : Integer;
  poItem       : Association to POItem;
  product      : Association to pme.Produit;
  description  : String(512);
  quantity     : Decimal(13, 3);
  unitPrice    : pme.Amount;
  tvaRate      : pme.Percent default 19;
  totalHT      : pme.Amount;
  totalTVA     : pme.Amount;
  totalTTC     : pme.Amount;
}
