const Database = require('better-sqlite3');
const db = new Database('db.sqlite');

try {
  // Find all business partners
  const bp = db.prepare("SELECT * FROM sap_pme_BusinessPartner").all();
  console.log("\n=== sap_pme_BusinessPartner ===");
  console.log(bp);

  // Find all suppliers
  const suppliers = db.prepare("SELECT * FROM sap_pme_srm_Fournisseur").all();
  console.log("\n=== sap_pme_srm_Fournisseur ===");
  console.log(suppliers);
} catch (e) {
  console.error(e);
}
