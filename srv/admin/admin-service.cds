// ============================================================
// Admin Service — OData V4
// Backoffice: Users, Audit, Config, KPI, Notifications
// ============================================================

using { sap.pme as pme }           from '../../db/schema/common';
using { sap.pme.crm as crm }       from '../../db/schema/crm';
using { sap.pme.srm as srm }       from '../../db/schema/srm';
using { sap.pme.doc as doc }        from '../../db/schema/documents';
using { sap.pme.admin as admin }    from '../../db/schema/admin';

@path: '/odata/v4/admin'
@requires: 'Admin'
service AdminService {

  // ── Master Data (read/write) ──
  entity BusinessPartners as projection on pme.BusinessPartner;
  entity Produits as projection on pme.Produit;

  // ── CRM Entities (read-only for admin) ──
  @readonly entity ClientsB2B as projection on crm.ClientB2B;
  @readonly entity ClientsB2C as projection on crm.ClientB2C;

  // ── SRM Entities (read-only for admin) ──
  @readonly entity Fournisseurs as projection on srm.Fournisseur;

  // ── Documents (read-only for admin) ──
  @readonly entity AllDevis as projection on doc.Devis;
  @readonly entity AllCommandes as projection on doc.CommandeClient;
  @readonly entity AllFacturesClient as projection on doc.FactureClient;
  @readonly entity AllPaiements as projection on doc.Paiement;
  @readonly entity AllBonsCommande as projection on doc.BonCommandeFournisseur;
  @readonly entity AllFacturesFournisseur as projection on doc.FactureFournisseur;

  // ── Admin Entities ──
  entity AuditLogs as projection on admin.AuditLog;
  entity SystemConfigs as projection on admin.SystemConfig;
  entity Notifications as projection on admin.Notification;
  entity NumberRanges as projection on admin.NumberRange;

  // ── Admin Actions ──
  action activateBusinessPartner(bpId: UUID) returns BusinessPartners;
  action blockBusinessPartner(bpId: UUID, reason: String) returns BusinessPartners;
  action sendNotification(userId: String, title: String, message: String, type: String) returns Notifications;
}
