const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, '../db.sqlite');

console.log('Connecting to database for verification...');
try {
  const db = new Database(dbPath);
  
  const tables = [
    'sap_pme_crm_ClientB2B',
    'sap_pme_crm_ClientB2C',
    'sap_pme_srm_Fournisseur',
    'sap_pme_BusinessPartner'
  ];
  
  for (const table of tables) {
    const countRow = db.prepare(`SELECT count(*) as count FROM ${table}`).get();
    console.log(`\nTable ${table}: ${countRow.count} rows`);
    
    if (countRow.count > 0) {
      const rows = db.prepare(`SELECT * FROM ${table} LIMIT 3`).all();
      console.log(`First 3 rows:`);
      console.log(JSON.stringify(rows, null, 2));
    }
  }
  
  db.close();
  console.log('\nData verification completed.');
} catch (err) {
  console.error('Error during data verification:', err);
  process.exit(1);
}
