const Database = require('better-sqlite3');
const path = require('path');

function checkIntegrity(dbPath) {
  console.log(`Checking integrity of ${dbPath}...`);
  try {
    const db = new Database(dbPath);
    const result = db.pragma('integrity_check');
    console.log(`Result:`, result);
    db.close();
  } catch (err) {
    console.error(`Error opening or checking database:`, err);
  }
}

checkIntegrity(path.resolve(__dirname, '../db.sqlite'));
checkIntegrity(path.resolve(__dirname, '../backup_db_temp/db.sqlite'));
