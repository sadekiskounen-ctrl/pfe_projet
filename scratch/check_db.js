const Database = require('better-sqlite3');
const db = new Database('db.sqlite');

try {
    console.log('--- ALL REGISTRATION REQUESTS ---');
    const regs = db.prepare('SELECT ID, companyName, email, status, type FROM pme_registration_RegistrationRequest').all();
    console.log(regs);

    console.log('--- ALL BUSINESS PARTNERS ---');
    const bps = db.prepare('SELECT ID, bpNumber, displayName, email, bpType, status FROM sap_pme_BusinessPartner').all();
    console.log(bps);

    console.log('--- ALL B2C CLIENTS ---');
    const b2cs = db.prepare('SELECT * FROM sap_pme_crm_ClientB2C').all();
    console.log(b2cs);

} catch (err) {
    console.error(err);
}
