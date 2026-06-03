const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.sqlite');
const db = new Database(dbPath);

const email = 'sadekiskounen@gmail.com';
const companyName = 'SARL TEST B2C FLOW';

async function main() {
  console.log('=== Test du flux complet d\'inscription et d\'approbation ===');
  
  // 1. Supprimer toute ancienne demande ou partenaire lié à cette adresse mail pour éviter les conflits d'unicité
  console.log('Nettoyage des anciennes données de test...');
  db.prepare("DELETE FROM pme_registration_RegistrationRequest WHERE email = ?").run(email);
  const bp = db.prepare("SELECT ID FROM sap_pme_BusinessPartner WHERE email = ?").get(email);
  if (bp) {
    db.prepare("DELETE FROM sap_pme_crm_ClientB2C WHERE bp_ID = ?").run(bp.ID);
    db.prepare("DELETE FROM sap_pme_BusinessPartner WHERE ID = ?").run(bp.ID);
  }
  
  console.log('\n1. Simulation de la soumission d\'une inscription B2C...');
  
  const authHeader = 'Basic ' + Buffer.from('admin:admin').toString('base64');
  
  try {
    const payload = {
      email: email,
      companyName: companyName,
      type: 'CLIENT_B2C',
      password: 'password123',
      address: 'Tizi Ouzou',
      phone: '0555555555'
    };
    
    // Envoyer la demande d'inscription
    const regResponse = await fetch('http://localhost:4004/odata/v4/registration/SubmitRegistration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`Status de la soumission : ${regResponse.status}`);
    
    if (regResponse.status !== 201 && regResponse.status !== 204 && regResponse.status !== 200) {
      console.error('Échec de la soumission d\'inscription :', await regResponse.text());
      return;
    }
    
    // Récupérer le ID de la demande nouvellement insérée dans la base
    const insertedReq = db.prepare("SELECT ID FROM pme_registration_RegistrationRequest WHERE email = ? AND status = 'PENDING'").get(email);
    if (!insertedReq) {
      console.error('Impossible de trouver la demande insérée en base.');
      return;
    }

    const reqId = insertedReq.ID;
    console.log(`\n✅ Inscription soumise avec succès ! ID de la demande : ${reqId}`);
    console.log('Un e-mail de bienvenue de type PENDING a dû être envoyé par le serveur local.');

    // 2. Attendre 3 secondes
    console.log('\nAttente de 3 secondes avant l\'approbation administrative...');
    await new Promise(r => setTimeout(r, 3000));

    // 3. Approuver l'inscription
    console.log('\n2. Simulation de l\'approbation de l\'inscription par l\'administrateur...');
    const approveResponse = await fetch('http://localhost:4004/odata/v4/registration/approveRegistration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({ id: reqId })
    });
    
    const approveText = await approveResponse.text();
    console.log(`Status de l'approbation : ${approveResponse.status}`);
    console.log(`Réponse de l'approbation : ${approveText}`);
    
    if (approveResponse.status === 200) {
      console.log('\n✅ Le compte B2C a été approuvé !');
      console.log('Un e-mail de type APPROVED confirmant l\'activation du compte a été envoyé.');
    } else {
      console.error('Échec de l\'approbation.');
    }
  } catch (error) {
    console.error('Erreur lors de l\'exécution du test local :', error);
  }
}

main();
