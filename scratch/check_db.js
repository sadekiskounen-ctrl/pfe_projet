const Database = require('better-sqlite3');
const db = new Database('db.sqlite');
const rows = db.prepare("SELECT email, bpType, status, displayName FROM sap_pme_BusinessPartner WHERE bpType LIKE '%CLIENT%' ORDER BY bpType").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
