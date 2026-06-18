const fs = require('fs');
const path = require('path');

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

loadEnv();

const emailService = require('../backend/srv/lib/email-service');

async function runTest() {
  console.log('Sending real welcome registration email test via email-service.js...');
  try {
    const res = await emailService.sendWelcomeRegistration(
      'bridgifycloud@gmail.com', // Send to self
      'SARL SADEK ISK',
      'SARL SADEK ISK',
      'CLIENT_B2C'
    );
    console.log('✅ Success! Email sent.');
    console.log('Message ID:', res.messageId);
  } catch (err) {
    console.error('❌ Failed to send email:');
    console.error(err);
  }
}

runTest();
