// Script de test pour envoyer un e‑mail de bienvenue
// Utilise le service d’e‑mail déjà implémenté dans le projet.
// Exécuter avec : `node scratch/send_test_email.js`

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sendWelcomeRegistration } = require('../backend/srv/lib/email-service');

(async () => {
  try {
    const clientEmail = 'sadekiskounen@gmail.com';
    const clientName = 'Sadek Iskounen';
    const companyName = 'Bridgify Cloud';
    // Types possibles : CLIENT_B2B, CLIENT_B2C, FOURNISSEUR
    const type = 'CLIENT_B2B';

    await sendWelcomeRegistration(clientEmail, clientName, companyName, type);
    console.log('✅ Email de test envoyé avec succès à', clientEmail);
  } catch (err) {
    console.error('❌ Erreur lors de l’envoi de l’e‑mail de test :', err);
  }
})();
