const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, '../db.sqlite');

console.log('Connecting to database...');
try {
  const db = new Database(dbPath);
  
  // Check if resendQty already exists in sap_pme_doc_ReceptionItem
  const columns = db.pragma('table_info(sap_pme_doc_ReceptionItem)');
  const hasColumn = columns.some(col => col.name === 'resendQty');
  
  if (hasColumn) {
    console.log('Column resendQty already exists in sap_pme_doc_ReceptionItem. No migration needed.');
  } else {
    console.log('Column resendQty not found. Adding column...');
    db.prepare('ALTER TABLE sap_pme_doc_ReceptionItem ADD COLUMN resendQty DECIMAL(13,3) DEFAULT 0').run();
    console.log('Column resendQty added successfully!');
  }
  
  // Verify changes
  const updatedColumns = db.pragma('table_info(sap_pme_doc_ReceptionItem)');
  const verifyHasColumn = updatedColumns.some(col => col.name === 'resendQty');
  if (verifyHasColumn) {
    console.log('Verification: resendQty is present in the schema!');
  } else {
    console.error('Verification failed: resendQty is not in the schema!');
    process.exit(1);
  }
  
  db.close();
  console.log('Migration completed successfully.');
} catch (err) {
  console.error('Error during database migration:', err);
  process.exit(1);
}
