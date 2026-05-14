// ============================================================
// Admin Module — Audit Logs, System Configuration
// ============================================================

namespace sap.pme.admin;

using { sap.pme as pme } from './common';
using { cuid, managed }   from '@sap/cds/common';

/**
 * Audit Log — tracks all critical operations
 */
entity AuditLog : cuid, managed {
  actionType   : String(50)  @mandatory;  // CREATE, UPDATE, DELETE, STATUS_CHANGE, LOGIN
  entityName   : String(128);
  entityId     : String(36);
  userId       : String(256);
  userName     : String(256);
  logTimestamp  : Timestamp   @cds.on.write: $now;
  oldValue     : LargeString;
  newValue     : LargeString;
  ipAddress    : String(45);
  details      : String(2000);
}

/**
 * System Configuration — key-value store
 */
entity SystemConfig : cuid, managed {
  configKey    : String(128) @mandatory;
  configValue  : String(1024);
  description  : String(512);
  category     : String(64);  // GENERAL, INVOICE, EMAIL, WORKFLOW
}

/**
 * Notification — internal notifications
 */
entity Notification : cuid, managed {
  userId       : String(256) @mandatory;
  title        : String(256) @mandatory;
  message      : String(2000);
  notifType    : String(20) default 'INFO'; // INFO, WARNING, SUCCESS, ERROR
  isRead       : Boolean default false;
  readAt       : Timestamp;
  link         : pme.URL;
  entityName   : String(128);
  entityId     : String(36);
}

/**
 * Number Range — auto-increment sequences
 * Used for: DEV-00001, CMD-00001, FAC-00001, etc.
 */
entity NumberRange : cuid {
  objectType   : String(20) @mandatory;  // DEVIS, COMMANDE, FACTURE, etc.
  prefix       : String(10);
  currentNumber: Integer default 0;
  padLength    : Integer default 5;
}
