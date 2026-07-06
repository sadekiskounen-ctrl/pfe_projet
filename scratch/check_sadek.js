const Database = require('better-sqlite3');
const db = new Database('db.sqlite');

// Check all tables for sadek
const reg = db.prepare("SELECT ID, email, companyName, type, status FROM pme_registration_RegistrationRequest WHERE lower(email) LIKE '%sadek%'").all();
console.log("=== RegistrationRequests (sadek) ===");
console.log(JSON.stringify(reg, null, 2));

// Check ALL BusinessPartners to see the full picture
const allBP = db.prepare("SELECT email, bpType, status, displayName FROM sap_pme_BusinessPartner ORDER BY bpType, email").all();
console.log("\n=== ALL BusinessPartners ===");
console.log(JSON.stringify(allBP, null, 2));

// Check if there's a BP with 'sadek' in name
const sadekBP = db.prepare("SELECT email, bpType, status, displayName FROM sap_pme_BusinessPartner WHERE lower(email) LIKE '%sadek%' OR lower(displayName) LIKE '%sadek%'").all();
console.log("\n=== BP with 'sadek' ===");
console.log(JSON.stringify(sadekBP, null, 2));

db.close();
