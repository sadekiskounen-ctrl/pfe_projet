const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.sqlite');
const db = new Database(dbPath);

async function main() {
  const email = 'sadek.iskounen@fgei.ummto.dz';
  console.log(`Recherche de la demande d'inscription pour : ${email}`);
  
  const request = db.prepare("SELECT ID, companyName, status FROM pme_registration_RegistrationRequest WHERE email = ?").get(email);
  
  if (!request) {
    console.error(`Aucune demande d'inscription trouvée pour ${email}`);
    return;
  }
  
  console.log(`Trouvé : ID=${request.ID}, Entreprise=${request.companyName}, Statut actuel=${request.status}`);
  
  if (request.status === 'APPROVED') {
    console.log('Cette inscription est déjà approuvée.');
    return;
  }

  console.log('\nEnvoi de la requête d\'approbation au serveur local (Basic Auth admin:admin)...');
  
  const authHeader = 'Basic ' + Buffer.from('admin:admin').toString('base64');
  
  try {
    const response = await fetch('http://localhost:4004/odata/v4/registration/approveRegistration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({ id: request.ID })
    });
    
    const status = response.status;
    const text = await response.text();
    console.log(`Status de la réponse : ${status}`);
    console.log(`Corps de la réponse : ${text}`);
    
    if (status === 200 || status === 201) {
      console.log('\n✅ L\'inscription a été approuvée avec succès !');
      console.log('L\'e-mail de bienvenue a dû être envoyé par le serveur local à sadek.iskounen@fgei.ummto.dz.');
    } else {
      console.error('\n❌ Échec de l\'approbation via le serveur.');
    }
  } catch (error) {
    console.error('Erreur de connexion au serveur local. Assurez-vous que le serveur local (cds watch ou npm run dev) tourne sur le port 4004.', error);
  }
}

main();
