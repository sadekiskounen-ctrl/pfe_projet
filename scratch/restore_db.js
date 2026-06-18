const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, 'db.sqlite');
const walPath = path.join(rootDir, 'db.sqlite-wal');
const shmPath = path.join(rootDir, 'db.sqlite-shm');
const backupDbPath = path.join(rootDir, 'backup_db_temp', 'db.sqlite');

console.log('Restoring healthy database from backup...');

try {
  // 1. Delete corrupted database files (if they exist)
  if (fs.existsSync(dbPath)) {
    console.log('Removing corrupt db.sqlite...');
    fs.unlinkSync(dbPath);
  }
  if (fs.existsSync(walPath)) {
    console.log('Removing db.sqlite-wal...');
    fs.unlinkSync(walPath);
  }
  if (fs.existsSync(shmPath)) {
    console.log('Removing db.sqlite-shm...');
    fs.unlinkSync(shmPath);
  }

  // 2. Copy healthy backup to root
  console.log('Copying healthy db.sqlite...');
  fs.copyFileSync(backupDbPath, dbPath);
  console.log('Healthy database copied.');

  // 3. Open it and run migration
  console.log('Opening database with better-sqlite3 for migration...');
  const db = new Database(dbPath);
  
  // Check if resendQty already exists
  const columns = db.pragma('table_info(sap_pme_doc_ReceptionItem)');
  const hasColumn = columns.some(col => col.name === 'resendQty');
  
  if (hasColumn) {
    console.log('Column resendQty already exists in sap_pme_doc_ReceptionItem. No migration needed.');
  } else {
    console.log('Column resendQty not found. Adding column...');
    db.prepare('ALTER TABLE sap_pme_doc_ReceptionItem ADD COLUMN resendQty DECIMAL(13,3) DEFAULT 0').run();
    console.log('Column resendQty added successfully!');
  }
  
  // Verify changes & integrity
  console.log('Verifying integrity...');
  const integrity = db.pragma('integrity_check');
  console.log('Integrity check result:', integrity);
  
  const updatedColumns = db.pragma('table_info(sap_pme_doc_ReceptionItem)');
  const verifyHasColumn = updatedColumns.some(col => col.name === 'resendQty');
  if (verifyHasColumn) {
    console.log('Verification: resendQty is present in the schema!');
  } else {
    console.error('Verification failed: resendQty is not in the schema!');
    db.close();
    process.exit(1);
  }
  
  // Clean close (TRUNCATE wal)
  console.log('Truncating WAL...');
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  console.log('Database restore and migration completed successfully.');
} catch (err) {
  console.error('Error during database restore/migration:', err);
  process.exit(1);
}
