const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Simple parser for .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found');
    return;
  }
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

async function main() {
  loadEnv();
  
  console.log('=== Test d\'envoi d\'e-mail avec vos paramètres réels ===');
  console.log(`SMTP_HOST : ${process.env.SMTP_HOST}`);
  console.log(`SMTP_PORT : ${process.env.SMTP_PORT}`);
  console.log(`SMTP_USER : ${process.env.SMTP_USER}`);
  console.log(`SMTP_PASS : [${process.env.SMTP_PASS ? 'CONFIGURÉ' : 'VIDE'}]`);
  console.log(`EMAIL_FROM : ${process.env.EMAIL_FROM}`);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@gestionpme.dz',
    to: process.env.SMTP_USER, // S'envoyer un mail à soi-même pour tester
    subject: 'Test de connexion SMTP - Gestion PME',
    text: 'Si vous recevez cet e-mail, cela signifie que la configuration de votre fichier .env est correcte et fonctionnelle !'
  };

  try {
    console.log('\nTentative d\'envoi de l\'e-mail...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Succès ! E-mail envoyé.');
    console.log(`Message ID : ${info.messageId}`);
  } catch (error) {
    console.error('❌ Échec de l\'envoi de l\'e-mail.');
    console.error('Détails de l\'erreur :', error);
  }
}

main();
