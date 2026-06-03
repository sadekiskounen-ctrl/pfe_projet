const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.sqlite');
const db = new Database(dbPath);

const email = 'sadekiskounen@gmail.com';
const companyName = 'SARL TEST FOURNISSEUR REJECT';

async function main() {
  console.log('=== Test du flux complet d\'inscription et de rejet (Fournisseur) ===');
  
  // 1. Nettoyage
  console.log('Nettoyage des anciennes données de test...');
  db.prepare("DELETE FROM pme_registration_RegistrationRequest WHERE email = ?").run(email);
  const bp = db.prepare("SELECT ID FROM sap_pme_BusinessPartner WHERE email = ?").get(email);
  if (bp) {
    db.prepare("DELETE FROM sap_pme_srm_Fournisseur WHERE bp_ID = ?").run(bp.ID);
    db.prepare("DELETE FROM sap_pme_BusinessPartner WHERE ID = ?").run(bp.ID);
  }
  
  console.log('\n1. Simulation de la soumission d\'une inscription Fournisseur...');
  
  const authHeader = 'Basic ' + Buffer.from('admin:admin').toString('base64');
  
  try {
    const payload = {
      email: email,
      companyName: companyName,
      type: 'FOURNISSEUR',
      password: 'password123',
      address: 'Oran',
      phone: '0566666666'
    };
    
    const regResponse = await fetch('http://localhost:4004/odata/v4/registration/SubmitRegistration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });
    
    if (regResponse.status !== 201 && regResponse.status !== 204 && regResponse.status !== 200) {
      console.error('Échec de la soumission :', await regResponse.text());
      return;
    }
    
    const insertedReq = db.prepare("SELECT ID FROM pme_registration_RegistrationRequest WHERE email = ? AND status = 'PENDING'").get(email);
    if (!insertedReq) {
      console.error('Impossible de trouver la demande.');
      return;
    }

    const reqId = insertedReq.ID;
    console.log(`\n✅ Inscription Fournisseur soumise ! ID de la demande : ${reqId}`);
    console.log('Un e-mail de type PENDING (Fournisseur) a dû être envoyé par le serveur local.');

    // 2. Attendre 3 secondes
    console.log('\nAttente de 3 secondes avant le rejet...');
    await new Promise(r => setTimeout(r, 3000));

    // 3. Rejeter l'inscription
    const reason = 'Documents fiscaux illisibles ou manquants';
    console.log(`\n2. Simulation du rejet de l'inscription par l'administrateur pour motif : "${reason}"...`);
    const rejectResponse = await fetch('http://localhost:4004/odata/v4/registration/rejectRegistration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({ id: reqId, reason: reason })
    });
    
    const rejectText = await rejectResponse.text();
    console.log(`Status de la réponse : ${rejectResponse.status}`);
    console.log(`Corps de la réponse : ${rejectText}`);
    
    if (rejectResponse.status === 200) {
      console.log('\n✅ L\'inscription a été rejetée.');
      console.log('Un e-mail de type REJECTED a été envoyé à sadekiskounen@gmail.com avec le motif.');
    } else {
      console.error('Échec du rejet.');
    }
  } catch (error) {
    console.error('Erreur lors du test :', error);
  }
}

main();
