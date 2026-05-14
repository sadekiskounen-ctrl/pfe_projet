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

const FROM_ADDRESS = process.env.EMAIL_FROM || 'noreply@gestionpme.dz';

// ── Email Templates ──

/**
 * Send welcome email to new B2B client after registration
 */
async function sendWelcomeB2B(clientEmail, clientName, companyName) {
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
          <p>Votre compte est actuellement <strong>en cours de validation</strong> par notre équipe administrative.</p>
          <p>Vous recevrez un email de confirmation dans les 24-48h ouvrables.</p>
          <div style="background:#fff;border-left:4px solid #1a3a5c;padding:15px;margin:20px 0">
            <p style="margin:0"><strong>Prochaines étapes :</strong></p>
            <ul>
              <li>Téléchargez vos documents légaux (RC, NIF, NIS, AI)</li>
              <li>Attendez la validation de votre compte</li>
              <li>Accédez à votre espace client</li>
            </ul>
          </div>
        </div>
        <div style="background:#1a3a5c;padding:15px;text-align:center">
          <p style="color:#9bc4e8;margin:0;font-size:12px">
            © 2025 Gestion PME | contact@gestionpme.dz
          </p>
        </div>
      </div>
    `
  });
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
    subject: `Votre compte Gestion PME a été ${status}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a3a5c;padding:30px;text-align:center">
          <h1 style="color:#fff;margin:0">Gestion PME</h1>
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
          <p style="color:#9bc4e8;margin:0;font-size:12px">© 2025 Gestion PME</p>
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
    subject: `Votre devis ${devisNumber} — Gestion PME`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a3a5c;padding:30px;text-align:center">
          <h1 style="color:#fff;margin:0">Gestion PME</h1>
        </div>
        <div style="padding:30px;background:#f9f9f9">
          <h2 style="color:#1a3a5c">Bonjour ${clientName},</h2>
          <p>Veuillez trouver ci-joint votre devis <strong>${devisNumber}</strong>.</p>
          <p>Ce devis est valable 30 jours à compter de sa date d'émission.</p>
          <p>Pour toute question, n'hésitez pas à nous contacter.</p>
        </div>
        <div style="background:#1a3a5c;padding:15px;text-align:center">
          <p style="color:#9bc4e8;margin:0;font-size:12px">© 2025 Gestion PME</p>
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
    subject: `Facture ${invoiceNumber} — Gestion PME`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1a3a5c;padding:30px;text-align:center">
          <h1 style="color:#fff;margin:0">Gestion PME</h1>
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
          <p style="color:#9bc4e8;margin:0;font-size:12px">© 2025 Gestion PME</p>
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
          <h2 style="color:#fff;margin:0">Notification Gestion PME</h2>
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
  sendAccountStatus,
  sendDevis,
  sendFacture,
  sendWorkflowNotification
};
