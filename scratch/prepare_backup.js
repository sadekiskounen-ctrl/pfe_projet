const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, '../db.sqlite');
const backupDir = path.resolve(__dirname, '../backup_db_temp');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('Opening database with better-sqlite3...');
try {
  const db = new Database(dbPath);
  console.log('Running WAL checkpoint...');
  db.pragma('wal_checkpoint(TRUNCATE)');
  console.log('WAL checkpoint completed successfully. Closing database...');
  db.close();
  
  console.log('Database closed. Backing up db.sqlite...');
  fs.copyFileSync(dbPath, path.join(backupDir, 'db.sqlite'));
  console.log('Backup of db.sqlite successful!');
  
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';
  if (fs.existsSync(walPath)) {
    fs.copyFileSync(walPath, path.join(backupDir, 'db.sqlite-wal'));
    console.log('Backup of db.sqlite-wal successful!');
  }
  if (fs.existsSync(shmPath)) {
    fs.copyFileSync(shmPath, path.join(backupDir, 'db.sqlite-shm'));
    console.log('Backup of db.sqlite-shm successful!');
  }
  
  console.log('All backups completed successfully in:', backupDir);
} catch (err) {
  console.error('Error during database operation or backup:', err);
  process.exit(1);
}
