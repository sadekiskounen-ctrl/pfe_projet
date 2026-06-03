const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.sqlite');
const db = new Database(dbPath);

console.log('=== Liste des demandes d\'inscription (RegistrationRequest) ===');
const requests = db.prepare("SELECT ID, email, companyName, status, createdAt FROM pme_registration_RegistrationRequest ORDER BY createdAt DESC LIMIT 5").all();
console.log(requests);
