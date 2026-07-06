const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db.sqlite');

db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, tables) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("Tables:", tables.map(t => t.name));
  
  // Search for the user in registration tables or business partner tables
  db.all("SELECT * FROM crm_ClientsB2C WHERE email = 'sadekiskounen@gmail.com';", [], (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log("ClientsB2C rows:", rows);
    }
  });

  db.all("SELECT * FROM crm_ClientsB2B WHERE email = 'sadekiskounen@gmail.com';", [], (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log("ClientsB2B rows:", rows);
    }
  });
  
  db.all("SELECT * FROM registration_Requests WHERE email = 'sadekiskounen@gmail.com';", [], (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log("registration_Requests rows:", rows);
    }
  });
});
