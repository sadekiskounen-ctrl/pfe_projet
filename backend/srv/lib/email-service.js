// ============================================================
// Email Service — Notifications automatiques
// Uses Nodemailer for transactional emails
// ============================================================

'use strict';

const nodemailer = require('nodemailer');

// ── Transport configuration ──
// In production: use SAP Alert Notification Service or SMTP credentials from env
function _createTransport() {
  // Local dev: use Ethereal (fake SMTP) or env vars
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
  // Fallback: Ethereal test account (dev only)
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'test@ethereal.email',
      pass: 'testpass'
    }
  });
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'noreply@cloudbridge.dz';

// ── Email Templates ──

/**
 * Send welcome email to new client/supplier after registration request submission
 */
async function sendWelcomeRegistration(clientEmail, clientName, companyName, type) {
  const transport = _createTransport();
  let typeLabel = "Client B2B";
  let stepsHtml = `
    <li>Vérification de vos documents légaux (RC, NIF, AI)</li>
    <li>Attendez la validation de votre compte</li>
    <li>Accédez à votre espace client</li>
  `;
  if (type === 'FOURNISSEUR') {
    typeLabel = "Fournisseur";
    stepsHtml = `
      <li>Vérification de vos documents légaux (RC, NIF, AI, RIB)</li>
      <li>Attendez la validation de votre compte</li>
      <li>Accédez à votre espace fournisseur</li>
    `;
  } else if (type === 'CLIENT_B2C') {
    typeLabel = "Client B2C";
    stepsHtml = `
      <li>Vérification de vos informations de profil</li>
      <li>Attendez la validation de votre compte</li>
      <li>Accédez à votre espace personnel</li>
    `;
  }

  return transport.sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `Bienvenue sur CloudBridge — ${companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="background:#1a3a5c;padding:30px;text-align:center">
          <h1 style="color:#fff;margin:0">CloudBridge</h1>
          <p style="color:#9bc4e8;margin:5px 0">Solution Cloud de Gestion - SAP BTP</p>
        </div>
        <div style="padding:30px;background:#f9f9f9">
          <h2 style="color:#1a3a5c;margin-top:0">Bonjour ${clientName},</h2>
          <p>Votre inscription en tant que <strong>${typeLabel}</strong> pour <strong>${companyName}</strong> a été reçue avec succès.</p>
          <p>Votre demande est actuellement <strong>en cours de validation</strong> par notre équipe administrative.</p>
          <p>Vous recevrez un e-mail de confirmation dès que votre compte aura été activé.</p>
          <div style="background:#fff;border-left:4px solid #1a3a5c;padding:15px;margin:20px 0;border-radius:0 4px 4px 0">
            <p style="margin:0"><strong>Prochaines étapes :</strong></p>
            <ul>
              ${stepsHtml}
            </ul>
          </div>
        </div>
        <div style="background:#1a3a5c;padding:15px;text-align:center">
          <p style="color:#9bc4e8;margin:0;font-size:12px">
            © 2026 CloudBridge | contact@cloudbridge.dz
          </p>
        </div>
      </div>
    `
  });
}

/**
 * Send welcome email to new B2B client after registration
 */
async function sendWelcomeB2B(clientEmail, clientName, companyName) {
  return sendWelcomeRegistration(clientEmail, clientName, companyName, 'CLIENT_B2B');
}


/**
 * Send account approval/rejection email
 */
async function sendAccountStatus(clientEmail, clientName, approved, reason) {
  const transport = _createTransport();
  const status = approved ? 'approuvé' : 'rejeté';
  const color = approved ? '#28a745' : '#dc3545';

  return transport.sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `Votre compte CloudBridge a été ${status}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a3a5c;padding:30px;text-align:center">
          <h1 style="color:#fff;margin:0">CloudBridge</h1>
        </div>
        <div style="padding:30px;background:#f9f9f9">
          <h2 style="color:${color}">Compte ${status}</h2>
          <p>Bonjour ${clientName},</p>
          ${approved
            ? '<p>Votre compte a été <strong>approuvé</strong>. Vous pouvez maintenant vous connecter et accéder à tous nos services.</p>'
            : `<p>Votre demande d'inscription a été <strong>rejetée</strong>.</p><p>Motif : ${reason || 'Documents incomplets'}</p>`
          }
        </div>
        <div style="background:#1a3a5c;padding:15px;text-align:center">
          <p style="color:#9bc4e8;margin:0;font-size:12px">© 2026 CloudBridge</p>
        </div>
      </div>
    `
  });
}

/**
 * Send devis email to client
 */
async function sendDevis(clientEmail, clientName, devisNumber, pdfBuffer) {
  const transport = _createTransport();
  return transport.sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `Votre devis ${devisNumber} — CloudBridge`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a3a5c;padding:30px;text-align:center">
          <h1 style="color:#fff;margin:0">CloudBridge</h1>
        </div>
        <div style="padding:30px;background:#f9f9f9">
          <h2 style="color:#1a3a5c">Bonjour ${clientName},</h2>
          <p>Veuillez trouver ci-joint votre devis <strong>${devisNumber}</strong>.</p>
          <p>Ce devis est valable 30 jours à compter de sa date d'émission.</p>
          <p>Pour toute question, n'hésitez pas à nous contacter.</p>
        </div>
        <div style="background:#1a3a5c;padding:15px;text-align:center">
          <p style="color:#9bc4e8;margin:0;font-size:12px">© 2026 CloudBridge</p>
        </div>
      </div>
    `,
    attachments: pdfBuffer ? [{
      filename: `${devisNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : []
  });
}

/**
 * Send invoice email to client
 */
async function sendFacture(clientEmail, clientName, invoiceNumber, dueDate, totalTTC, currency, pdfBuffer) {
  const transport = _createTransport();
  return transport.sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `Facture ${invoiceNumber} — CloudBridge`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a3a5c;padding:30px;text-align:center">
          <h1 style="color:#fff;margin:0">CloudBridge</h1>
        </div>
        <div style="padding:30px;background:#f9f9f9">
          <h2 style="color:#1a3a5c">Bonjour ${clientName},</h2>
          <p>Veuillez trouver ci-joint votre facture <strong>${invoiceNumber}</strong>.</p>
          <div style="background:#fff;border-left:4px solid #1a3a5c;padding:15px;margin:20px 0">
            <p><strong>Montant TTC :</strong> ${parseFloat(totalTTC).toLocaleString('fr-DZ')} ${currency}</p>
            <p><strong>Date d'échéance :</strong> ${new Date(dueDate).toLocaleDateString('fr-DZ')}</p>
          </div>
          <p>Merci de procéder au règlement avant la date d'échéance.</p>
        </div>
        <div style="background:#1a3a5c;padding:15px;text-align:center">
          <p style="color:#9bc4e8;margin:0;font-size:12px">© 2026 CloudBridge</p>
        </div>
      </div>
    `,
    attachments: pdfBuffer ? [{
      filename: `${invoiceNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : []
  });
}

/**
 * Send workflow notification
 */
async function sendWorkflowNotification(toEmail, subject, message) {
  const transport = _createTransport();
  return transport.sendMail({
    from: FROM_ADDRESS,
    to: toEmail,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a3a5c;padding:20px;text-align:center">
          <h2 style="color:#fff;margin:0">Notification CloudBridge</h2>
        </div>
        <div style="padding:25px;background:#f9f9f9">
          <p>${message}</p>
        </div>
      </div>
    `
  });
}

module.exports = {
  sendWelcomeB2B,
  sendWelcomeRegistration,
  sendAccountStatus,
  sendDevis,
  sendFacture,
  sendWorkflowNotification
};
