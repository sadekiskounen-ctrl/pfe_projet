const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

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

// Replicate _createTransport from email-service
function _createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'test@ethereal.email',
      pass: 'testpass'
    }
  });
}

async function sendWelcomeB2B(clientEmail, clientName, companyName) {
  const FROM_ADDRESS = process.env.EMAIL_FROM || 'noreply@gestionpme.dz';
  const transport = _createTransport();
  return transport.sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `Bienvenue sur Gestion PME — ${companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a3a5c;padding:30px;text-align:center">
          <h1 style="color:#fff;margin:0">Gestion PME</h1>
          <p style="color:#9bc4e8;margin:5px 0">Solution Cloud de Gestion</p>
        </div>
        <div style="padding:30px;background:#f9f9f9">
          <h2 style="color:#1a3a5c">Bonjour ${clientName},</h2>
          <p>Votre inscription pour <strong>${companyName}</strong> a été reçue avec succès.</p>
        </div>
      </div>
    `
  });
}

async function main() {
  loadEnv();
  const targetEmail = 'sadek.iskounen@fgei.ummto.dz';
  console.log(`Envoi direct de l'e-mail de bienvenue à : ${targetEmail}`);
  
  try {
    const info = await sendWelcomeB2B(targetEmail, 'Sadek Iskounen', 'SARL ISK SADEK');
    console.log('✅ Succès ! E-mail envoyé.');
    console.log(`Message ID : ${info.messageId}`);
  } catch (error) {
    console.error('❌ Échec de l\'envoi :');
    console.error(error);
  }
}

main();
