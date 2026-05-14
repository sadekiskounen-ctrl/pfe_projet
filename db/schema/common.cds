// ============================================================
// Common Types, Aspects & Reusable Definitions
// Gestion PME/Startups — SAP BTP
// ============================================================

namespace sap.pme;

using {
  cuid,
  managed,
  Currency,
  Country,
  sap.common.CodeList
} from '@sap/cds/common';

// ────────────────────────────────────────────
// Reusable Types
// ────────────────────────────────────────────

type Email    : String(256);
type Phone    : String(30);
type Amount   : Decimal(15, 2);
type Percent  : Decimal(5, 2);
type URL      : String(1024);

// ────────────────────────────────────────────
// Status Enums
// ────────────────────────────────────────────

type BPStatus : String enum {
  PENDING  = 'PENDING';
  ACTIVE   = 'ACTIVE';
  INACTIVE = 'INACTIVE';
  BLOCKED  = 'BLOCKED';
}

type DocumentStatus : String enum {
  DRAFT     = 'DRAFT';
  SUBMITTED = 'SUBMITTED';
  APPROVED  = 'APPROVED';
  REJECTED  = 'REJECTED';
  CANCELLED = 'CANCELLED';
}

type OrderStatus : String enum {
  DRAFT       = 'DRAFT';
  CONFIRMED   = 'CONFIRMED';
  IN_PROGRESS = 'IN_PROGRESS';
  DELIVERED   = 'DELIVERED';
  COMPLETED   = 'COMPLETED';
  CANCELLED   = 'CANCELLED';
}

type InvoiceStatus : String enum {
  DRAFT         = 'DRAFT';
  SENT          = 'SENT';
  PARTIALLY_PAID = 'PARTIALLY_PAID';
  PAID          = 'PAID';
  OVERDUE       = 'OVERDUE';
  CANCELLED     = 'CANCELLED';
}

type PaymentMethod : String enum {
  VIREMENT = 'VIREMENT';
  CHEQUE   = 'CHEQUE';
  ESPECES  = 'ESPECES';
  CCP      = 'CCP';
  CARTE    = 'CARTE';
}

type SupplierRating : String enum {
  A = 'A';
  B = 'B';
  C = 'C';
  D = 'D';
}

// ────────────────────────────────────────────
// Reusable Aspects
// ────────────────────────────────────────────

/**
 * Tracks status lifecycle for any entity
 */
aspect StatusTracking {
  status     : String(20) default 'DRAFT';
  statusDate : Timestamp  @cds.on.write: $now;
  statusBy   : String(256);
}

/**
 * Postal address fields
 */
aspect Address {
  street     : String(256);
  city       : String(128);
  postalCode : String(10);
  wilaya     : String(64);   // Algerian province
  country    : Country;
}

/**
 * Soft delete support
 */
aspect SoftDelete {
  isDeleted  : Boolean default false;
  deletedAt  : Timestamp;
  deletedBy  : String(256);
}

/**
 * Notes / comments
 */
aspect Annotatable {
  notes : String(2000);
}

