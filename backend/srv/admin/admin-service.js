// ============================================================
// Admin Service Handlers
// ============================================================

const cds = require('@sap/cds');
const { generateRegistrationPDF, generateFacturePDF, generateDevisPDF } = require('../lib/pdf-generator');

module.exports = class AdminService extends cds.ApplicationService {

  async init() {
    const { BusinessPartners, Notifications, AuditLogs } = this.entities;

    // ── Stream PDF media content ──
    this.on('READ', BusinessPartners, async (req, next) => {
      const url = req._?.req?.url;
      if (url && url.includes('$value')) {
        console.log("[Admin] Streaming partner document...");
        return next();
      }
      return next();
    });

    // ── Action: Activate Business Partner ──
    this.on('activateBusinessPartner', async (req) => {
      const { bpId } = req.data;
      await UPDATE(BusinessPartners).set({ status: 'ACTIVE' }).where({ ID: bpId });
      await this._logAudit(req, 'STATUS_CHANGE', 'BusinessPartner', bpId, 'Activated');
      return SELECT.one.from(BusinessPartners, bpId);
    });

    // ── Action: Block Business Partner ──
    this.on('blockBusinessPartner', async (req) => {
      const { bpId, reason } = req.data;
      await UPDATE(BusinessPartners).set({ status: 'BLOCKED', blockReason: reason }).where({ ID: bpId });
      await this._logAudit(req, 'STATUS_CHANGE', 'BusinessPartner', bpId, `Blocked: ${reason}`);
      return SELECT.one.from(BusinessPartners, bpId);
    });

    // ── Action: Send Notification ──
    this.on('sendNotification', async (req) => {
      const { userId, title, message, type } = req.data;
      return INSERT.into(Notifications).entries({
        userId, title, message,
        type: type || 'INFO'
      });
    });

    // ── Audit all write operations ──
    this.after(['CREATE', 'UPDATE', 'DELETE'], '*', async (data, req) => {
      if (req.target?.name && !req.target.name.includes('AuditLog') && !req.target.name.includes('Notification')) {
        try {
          await this._logAudit(req, req.event, req.target.name, data?.ID, null);
        } catch (e) {
          // Don't fail the main operation if audit logging fails
          console.warn('Audit log failed:', e.message);
        }
      }
    });

    // ── PDF: Download Registration Certificate ──
    this.on('downloadRegistrationPDF', async (req) => {
      try {
        const { regId } = req.data;
        console.log('[PDF] Demande pour ID:', regId);
        
        const { RegistrationRequest } = cds.entities('pme.registration');
        const reg = await SELECT.one.from(RegistrationRequest, regId);
        
        if (!reg) {
          console.error('[PDF] Enregistrement non trouvé pour ID:', regId);
          return req.error(404, `Registration ${regId} not found`);
        }

        console.log('[PDF] Génération en cours pour:', reg.companyName);
        const pdfBuffer = await generateRegistrationPDF(reg);
        console.log('[PDF] Succès, envoi base64...');
        return pdfBuffer.toString('base64');
      } catch (err) {
        console.error('[PDF] Erreur critique:', err.message);
        return req.error(500, err.message);
      }
    });

    // ── PDF: Download Facture ──
    this.on('downloadFacturePDF', async (req) => {
      const { factId } = req.data;
      const { FactureClient } = cds.entities('sap.pme.doc');
      const fact = await SELECT.one.from(FactureClient, factId);
      if (!fact) return req.error(404, `Facture ${factId} not found`);

      const pdfBuffer = await generateFacturePDF(fact);
      return pdfBuffer.toString('base64');
    });

    // ── PDF: Download Devis ──
    this.on('downloadDevisPDF', async (req) => {
      const { devisId } = req.data;
      const { Devis } = cds.entities('sap.pme.doc');
      const devis = await SELECT.one.from(Devis, devisId);
      if (!devis) return req.error(404, `Devis ${devisId} not found`);

      const pdfBuffer = await generateDevisPDF(devis);
      return pdfBuffer.toString('base64');
    });

    await super.init();
  }

  async _logAudit(req, action, entity, entityId, details) {
    const { AuditLogs } = this.entities;
    try {
      await INSERT.into(AuditLogs).entries({
        actionType: action,
        entityName: entity,
        entityId,
        userId: req.user?.id,
        userName: req.user?.attr?.name || req.user?.id,
        details
      });
    } catch (e) {
      console.warn('Audit insert failed:', e.message);
    }
  }
};
