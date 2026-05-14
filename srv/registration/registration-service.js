'use strict';
const cds = require('@sap/cds');

module.exports = class RegistrationService extends cds.ApplicationService {
  async init() {
    const { RegisterClientB2B, RegisterFournisseur } = this.entities;
    const { BusinessPartner } = cds.entities('sap.pme');

    // ── Helper: Generates a sequential number ──
    const generateNumber = async (objectType, prefix) => {
      const { NumberRange } = cds.entities('sap.pme.admin');
      const tx = cds.tx();
      try {
        let range = await tx.run(SELECT.one.from(NumberRange).where({ objectType }));
        if (!range) {
          await tx.run(INSERT.into(NumberRange).entries({ objectType, prefix, currentNumber: 0, padLength: 5 }));
          range = { currentNumber: 0, padLength: 5, prefix };
        }
        const next = (range.currentNumber || 0) + 1;
        await tx.run(UPDATE(NumberRange).set({ currentNumber: next }).where({ objectType }));
        await tx.commit();
        return `${prefix}-${String(next).padStart(range.padLength || 5, '0')}`;
      } catch (e) {
        await tx.rollback();
        throw e;
      }
    };

    // ── B2B Registration Logic ──
    this.before('CREATE', RegisterClientB2B, async (req) => {
      // Force status to PENDING for security
      req.data.status = 'PENDING';
      
      // We automatically create a BusinessPartner for them if not supplied
      if (!req.data.bp_ID) {
        const bpNum = await generateNumber('BP', 'BP');
        const tx = cds.tx(req);
        const [bp] = await tx.run(INSERT.into(BusinessPartner).entries({
          bpNumber: bpNum, 
          bpType: 'CLIENT_B2B',
          displayName: req.data.companyName,
          email: req.data.email, 
          phone: req.data.phone, 
          status: 'PENDING'
        }));
        req.data.bp_ID = bp?.ID || req.data.bp_ID;
      }
    });

    // ── Fournisseur Registration Logic ──
    this.before('CREATE', RegisterFournisseur, async (req) => {
      // Force status to PENDING for security
      req.data.status = 'PENDING';
      req.data.kycStatus = 'PENDING';
      
      if (!req.data.bp_ID) {
        const bpNum = await generateNumber('BP', 'BP');
        const tx = cds.tx(req);
        const [bp] = await tx.run(INSERT.into(BusinessPartner).entries({
          bpNumber: bpNum, 
          bpType: 'FOURNISSEUR',
          displayName: req.data.companyName,
          email: req.data.email, 
          phone: req.data.phone, 
          status: 'PENDING'
        }));
        req.data.bp_ID = bp?.ID || req.data.bp_ID;
      }
    });

    await super.init();
  }
};
