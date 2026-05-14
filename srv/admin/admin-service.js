// ============================================================
// Admin Service Handlers
// ============================================================

const cds = require('@sap/cds');

module.exports = class AdminService extends cds.ApplicationService {

  async init() {
    const { BusinessPartners, Notifications, AuditLogs } = this.entities;

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
      await UPDATE(BusinessPartners).set({ status: 'BLOCKED' }).where({ ID: bpId });
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
