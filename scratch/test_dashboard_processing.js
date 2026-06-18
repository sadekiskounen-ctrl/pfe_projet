const fs = require('fs');
const path = require('path');

// Charger le fichier .env local s'il existe
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value.trim();
      }
    });
  }
}
loadEnv();

const TEST_USER = process.env.TEST_USER || 'sadekiskounen@gmail.com';
const TEST_PASS = process.env.TEST_PASS || 'votre_mot_de_passe';
const authHeader = 'Basic ' + Buffer.from(`${TEST_USER}:${TEST_PASS}`).toString('base64');

async function test() {
  try {
    console.log("Fetching profile...");
    const profileRes = await fetch("http://localhost:4004/odata/v4/srm/Fournisseurs?$filter=tolower(email) eq 'sadekiskounen@gmail.com'&$expand=bp", {
      headers: { Authorization: authHeader }
    });
    const profileData = await profileRes.json();
    if (!profileData.value || profileData.value.length === 0) {
      console.log("Profile not found!");
      return;
    }
    const profile = profileData.value[0];
    console.log("Profile found:", profile.companyName, "ID:", profile.ID);

    console.log("Fetching dashboard data...");
    const [rfqRes, poRes, matchRes] = await Promise.all([
      fetch(`http://localhost:4004/odata/v4/srm/RFQs?$filter=status eq 'OPEN'&$expand=items&$orderby=deadline asc`, {
        headers: { Authorization: authHeader }
      }),
      fetch(`http://localhost:4004/odata/v4/srm/BonsCommande?$filter=${encodeURIComponent(`fournisseur_ID eq ${profile.ID}`)}&$expand=receptions($expand=items)&$orderby=createdAt desc&$top=10`, {
        headers: { Authorization: authHeader }
      }),
      fetch(`http://localhost:4004/odata/v4/srm/FacturesFournisseur?$filter=${encodeURIComponent(`fournisseur_ID eq ${profile.ID} and matchStatus eq 'PENDING'`)}&$select=ID`, {
        headers: { Authorization: authHeader }
      })
    ]);

    console.log("Parsing dashboard data...");
    const rfqData   = await rfqRes.json();
    const poData    = await poRes.json();
    const matchData = await matchRes.json();

    console.log("RFQ raw response:", JSON.stringify(rfqData, null, 2));
    console.log("PO raw response:", JSON.stringify(poData, null, 2));
    console.log("Match raw response:", JSON.stringify(matchData, null, 2));

    const rfqsList = rfqData.value || [];
    const posList  = poData.value  || [];

    console.log("Processing PO list...");
    posList.forEach(po => {
      console.log("PO status:", po.status, "Number:", po.poNumber);
      if (po.status === 'TO_APPROVE') {
        console.log("PO to approve, replace template...");
      } else if (po.status === 'DELIVERED' && po.receptions && po.receptions.length > 0) {
        let totalMissing = 0;
        let totalRejected = 0;
        let hasDiscrepancy = false;
        po.receptions.forEach(gr => {
          if (gr.items) {
            gr.items.forEach(item => {
              const accepted = parseFloat(item.acceptedQty) || 0;
              const ordered = parseFloat(item.orderedQty) || 0;
              const received = parseFloat(item.receivedQty) || 0;
              if (accepted < ordered) {
                hasDiscrepancy = true;
                const missing = Math.max(0, ordered - received);
                const rejected = Math.max(0, ordered - accepted - missing);
                totalMissing += missing;
                totalRejected += rejected;
              }
            });
          }
        });
        console.log("PO hasDiscrepancy:", hasDiscrepancy, "totalMissing:", totalMissing, "totalRejected:", totalRejected);
      }
    });
    console.log("Success! No errors in dashboard processing.");
  } catch (err) {
    console.error("CRITICAL ERROR IN DASHBOARD PROCESSING:", err);
  }
}
test();
