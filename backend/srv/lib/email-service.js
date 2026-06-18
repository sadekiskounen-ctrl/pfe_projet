// ============================================================
// Email Service — Notifications automatiques Bridgify Cloud
// Design Premium 2026 — inspiré des top entreprises tech
// ============================================================

'use strict';

const nodemailer = require('nodemailer');

// URL publique du logo hébergé sur SAP BTP
const LOGO_URL = 'https://client-pme-5ad225cetrial.cfapps.us10-001.hana.ondemand.com/images/logo_round.png';

// ── Palette de couleurs ──
const COLORS = {
  primary:    '#0f2744',
  accent:     '#2563eb',
  accentLight:'#dbeafe',
  bg:         '#f8fafc',
  white:      '#ffffff',
  text:       '#1e293b',
  textLight:  '#64748b',
  border:     '#e2e8f0',
  success:    '#16a34a',
  error:      '#dc2626',
};

// ── Transport configuration ──
function _createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email', port: 587,
    auth: { user: 'test@ethereal.email', pass: 'testpass' }
  });
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'Bridgify Cloud <noreply@bridgify.dz>';

async function _sendMail(mailOptions) {
  console.log(`[Email Service] Attempting to send email to: ${mailOptions.to} with subject: "${mailOptions.subject}"`);
  try {
    const info = await _createTransport().sendMail(mailOptions);
    console.log(`[Email Service] Email successfully sent to: ${mailOptions.to}. MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[Email Service] Error sending email to: ${mailOptions.to}. Error:`, err);
    throw err;
  }
}

// ── Composants partagés ──
function _header(subtitle) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#0f2744 0%,#1e3a6e 60%,#2563eb 100%)">
      <tr>
        <td align="center" style="padding:40px 32px 32px">
          <!-- Logo en cercle -->
          <div style="display:inline-block;background:rgba(255,255,255,0.12);border-radius:50%;padding:10px;margin-bottom:16px;border:2px solid rgba(255,255,255,0.25)">
            <img src="${LOGO_URL}" alt="Bridgify Cloud" width="48" height="48"
                 style="display:block;border-radius:50%;width:48px;height:48px;object-fit:cover" />
          </div>
          <div>
            <span style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.5px">Bridgify Cloud</span>
          </div>
          ${subtitle ? `<p style="color:rgba(255,255,255,0.7);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;margin:6px 0 0;letter-spacing:0.5px">${subtitle}</p>` : ''}
        </td>
      </tr>
    </table>`;
}

function _footer() {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;border-top:1px solid #e2e8f0">
      <tr>
        <td align="center" style="padding:28px 32px">
          <p style="color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;margin:0 0 6px;line-height:1.6">
            &copy; 2026 Bridgify Cloud &mdash; Solution Cloud de Gestion SAP BTP
          </p>
          <p style="color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;margin:0">
            <a href="mailto:bridgifycloud@gmail.com" style="color:#94a3b8;text-decoration:none">bridgifycloud@gmail.com</a>
          </p>
        </td>
      </tr>
    </table>`;
}

function _wrapper(headerHtml, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bridgify Cloud</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,39,68,0.10)">
          ${headerHtml}
          <tr><td style="background:#ffffff;padding:40px 40px 32px">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${bodyHtml}
            </table>
          </td></tr>
          ${_footer()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function _badge(text, color) {
  return `<span style="display:inline-block;background:${color}18;color:${color};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;padding:4px 10px;border-radius:20px;border:1px solid ${color}30">${text}</span>`;
}

function _button(text, href) {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0">
      <tr>
        <td align="center" style="background:linear-gradient(135deg,#1e3a6e,#2563eb);border-radius:10px">
          <a href="${href}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.2px">${text}</a>
        </td>
      </tr>
    </table>`;
}

function _divider() {
  return `<tr><td style="padding:20px 0"><div style="height:1px;background:linear-gradient(to right,transparent,#e2e8f0,transparent)"></div></td></tr>`;
}

function _text(content, style) {
  const s = style || 'color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:15px;line-height:1.7;margin:0 0 16px';
  return `<tr><td style="${s}">${content}</td></tr>`;
}

function _title(content) {
  return `<tr><td style="color:#0f2744;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.5px;padding-bottom:20px">${content}</td></tr>`;
}

// ── Templates des emails ──

/**
 * Email de bienvenue après inscription
 */
async function sendWelcomeRegistration(clientEmail, clientName, companyName, type) {
  let typeLabel = 'Client B2B';
  let typeColor = '#2563eb';
  let steps = [
    'Vérification de vos documents légaux (RC, NIF, AI)',
    'Validation de votre compte par notre équipe',
    'Accès à votre espace client'
  ];
  if (type === 'FOURNISSEUR') {
    typeLabel = 'Fournisseur';
    typeColor = '#7c3aed';
    steps = [
      'Vérification de vos documents légaux (RC, NIF, AI, RIB)',
      'Validation de votre compte par notre équipe',
      'Accès à votre espace fournisseur'
    ];
  } else if (type === 'CLIENT_B2C') {
    typeLabel = 'Client B2C';
    typeColor = '#0891b2';
    steps = [
      'Vérification de vos informations de profil',
      'Validation de votre compte par notre équipe',
      'Accès à votre espace personnel'
    ];
  }

  const stepsHtml = steps.map((s, i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="36" valign="middle" style="padding-right:14px">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="28" height="28" align="center" valign="middle"
                      style="width:28px;height:28px;border-radius:14px;background:linear-gradient(135deg,#1e3a6e,#2563eb);font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#ffffff;text-align:center;line-height:28px">
                    ${i + 1}
                  </td>
                </tr>
              </table>
            </td>
            <td valign="middle" style="color:#475569;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.5">${s}</td>
          </tr>
        </table>
      </td>
    </tr>`).join('');

  const body = `
    ${_title(`Bienvenue, ${clientName} 👋`)}
    <tr><td style="padding-bottom:20px">${_badge(typeLabel, typeColor)}</td></tr>
    ${_text(`Votre inscription pour <strong style="color:#0f2744">${companyName}</strong> a bien été reçue. Notre équipe examine actuellement votre dossier.`)}
    ${_text(`Vous recevrez une notification dès que votre compte sera activé.`, 'color:#64748b;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:14px;line-height:1.6;margin:0 0 24px')}
    ${_divider()}
    <tr><td style="padding:16px 0 8px;color:#0f2744;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Prochaines étapes</td></tr>
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${stepsHtml}
      </table>
    </td></tr>
    ${_divider()}
    ${_text(`Pour toute question, contactez-nous à <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;text-decoration:none">bridgifycloud@gmail.com</a>`, 'color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;line-height:1.6;margin:0')}
  `;

  const header = `<tr><td>${_header('Solution Cloud de Gestion — SAP BTP')}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `✅ Inscription reçue — ${companyName}`,
    html: _wrapper(header, body)
  });
}

async function sendWelcomeB2B(clientEmail, clientName, companyName) {
  return sendWelcomeRegistration(clientEmail, clientName, companyName, 'CLIENT_B2B');
}

/**
 * Email d'approbation ou rejet de compte
 */
async function sendAccountStatus(clientEmail, clientName, approved, reason) {
  const isApproved = approved;
  const statusText = isApproved ? 'approuvé' : 'rejeté';
  const statusColor = isApproved ? '#16a34a' : '#dc2626';
  const statusEmoji = isApproved ? '🎉' : '❌';
  const statusBadge = isApproved ? 'Compte activé' : 'Demande refusée';

  const body = isApproved
    ? `
      ${_title(`${statusEmoji} Compte ${statusText}, ${clientName} !`)}
      <tr><td style="padding-bottom:20px">${_badge(statusBadge, statusColor)}</td></tr>
      ${_text(`Bonne nouvelle ! Votre compte <strong style="color:#0f2744">Bridgify Cloud</strong> a été <strong style="color:#16a34a">approuvé</strong> par notre équipe.`)}
      ${_text('Vous pouvez maintenant vous connecter et accéder à l\'ensemble de nos services.', 'color:#64748b;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:14px;line-height:1.6;margin:0 0 8px')}
      ${_divider()}
      <tr><td>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px">
          <p style="color:#15803d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:600;margin:0 0 6px">✓ Accès complet activé</p>
          <p style="color:#4ade80;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;margin:0;color:#166534">Tableau de bord, gestion des commandes, suivi, facturation</p>
        </div>
      </td></tr>
      ${_divider()}
      ${_text(`Des questions ? Écrivez-nous à <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;text-decoration:none">bridgifycloud@gmail.com</a>`, 'color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;margin:0')}
    `
    : `
      ${_title(`${statusEmoji} Demande ${statusText}, ${clientName}`)}
      <tr><td style="padding-bottom:20px">${_badge(statusBadge, statusColor)}</td></tr>
      ${_text(`Votre demande d'inscription à <strong style="color:#0f2744">Bridgify Cloud</strong> a malheureusement été <strong style="color:#dc2626">refusée</strong>.`)}
      ${_divider()}
      <tr><td>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px">
          <p style="color:#991b1b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;margin:0 0 6px">Motif du refus</p>
          <p style="color:#7f1d1d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;margin:0">${reason || 'Documents incomplets ou non conformes'}</p>
        </div>
      </td></tr>
      ${_divider()}
      ${_text(`Vous pouvez soumettre une nouvelle demande après correction. Pour toute question : <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;text-decoration:none">bridgifycloud@gmail.com</a>`, 'color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;margin:0')}
    `;

  const header = `<tr><td>${_header()}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `${statusEmoji} Votre compte Bridgify Cloud a été ${statusText}`,
    html: _wrapper(header, body)
  });
}

/**
 * Email de devis
 */
async function sendDevis(clientEmail, clientName, devisNumber, pdfBuffer) {
  const body = `
    ${_title(`Votre devis est prêt 📄`)}
    ${_text(`Bonjour <strong style="color:#0f2744">${clientName}</strong>,`)}
    ${_text(`Votre devis <strong style="color:#2563eb">${devisNumber}</strong> a été généré et est disponible en pièce jointe.`)}
    ${_divider()}
    <tr><td>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="color:#64748b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px">Référence</td>
            <td align="right" style="color:#0f2744;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600">${devisNumber}</td>
          </tr>
          <tr><td colspan="2" style="padding:8px 0"><div style="height:1px;background:#e2e8f0"></div></td></tr>
          <tr>
            <td style="color:#64748b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px">Validité</td>
            <td align="right" style="color:#0f2744;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600">30 jours</td>
          </tr>
        </table>
      </div>
    </td></tr>
    ${_divider()}
    ${_text(`Pour accepter ce devis ou poser une question, contactez-nous à <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;text-decoration:none">bridgifycloud@gmail.com</a>`, 'color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;margin:0')}
  `;

  const header = `<tr><td>${_header()}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `📄 Devis ${devisNumber} — Bridgify Cloud`,
    html: _wrapper(header, body),
    attachments: pdfBuffer ? [{ filename: `${devisNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }] : []
  });
}

/**
 * Email de facture
 */
async function sendFacture(clientEmail, clientName, invoiceNumber, dueDate, totalTTC, currency, pdfBuffer) {
  const formattedAmount = parseFloat(totalTTC).toLocaleString('fr-DZ');
  const formattedDate = new Date(dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const body = `
    ${_title(`Votre facture 🧾`)}
    ${_text(`Bonjour <strong style="color:#0f2744">${clientName}</strong>,`)}
    ${_text(`Veuillez trouver ci-joint votre facture <strong style="color:#2563eb">${invoiceNumber}</strong>.`)}
    ${_divider()}
    <tr><td>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0f2744,#1e3a6e);padding:16px 20px">
          <p style="color:rgba(255,255,255,0.7);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin:0 0 4px">Montant total TTC</p>
          <p style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:700;margin:0;letter-spacing:-0.5px">${formattedAmount} <span style="font-size:14px;opacity:0.8">${currency}</span></p>
        </div>
        <div style="padding:16px 20px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="color:#64748b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;padding-bottom:8px">Référence</td>
              <td align="right" style="color:#0f2744;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;padding-bottom:8px">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px">Date d'échéance</td>
              <td align="right" style="color:#dc2626;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600">${formattedDate}</td>
            </tr>
          </table>
        </div>
      </div>
    </td></tr>
    ${_divider()}
    <tr><td>
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px 20px">
        <p style="color:#92400e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;margin:0">⚠️ Merci de procéder au règlement avant la date d'échéance pour éviter toute interruption de service.</p>
      </div>
    </td></tr>
    ${_divider()}
    ${_text(`Pour toute question concernant cette facture : <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;text-decoration:none">bridgifycloud@gmail.com</a>`, 'color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;margin:0')}
  `;

  const header = `<tr><td>${_header()}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `🧾 Facture ${invoiceNumber} — Bridgify Cloud`,
    html: _wrapper(header, body),
    attachments: pdfBuffer ? [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }] : []
  });
}

/**
 * Notification workflow
 */
async function sendWorkflowNotification(toEmail, subject, message) {
  const body = `
    ${_title(`Notification 🔔`)}
    ${_text(message)}
    ${_divider()}
    ${_text(`Pour plus d'informations : <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;text-decoration:none">bridgifycloud@gmail.com</a>`, 'color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;margin:0')}
  `;

  const header = `<tr><td>${_header()}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: toEmail,
    subject,
    html: _wrapper(header, body)
  });
}
/**
 * Email envoyé quand l'admin bloque un compte utilisateur
 */
async function sendAccountBlocked(clientEmail, clientName, reason) {
  console.log(`[Email Service] sendAccountBlocked called for ${clientEmail} (${clientName}) with reason: ${reason}`);
  const body = `
    ${_title(`🔒 Votre compte a été suspendu`)}
    <tr><td style="padding-bottom:20px">${_badge('Compte bloqué', '#dc2626')}</td></tr>
    ${_text(`Bonjour <strong style="color:#0f2744">${clientName}</strong>,`)}
    ${_text(`Nous vous informons que votre compte <strong style="color:#0f2744">Bridgify Cloud</strong> a été <strong style="color:#dc2626">temporairement suspendu</strong> par l'administrateur.`)}
    ${_divider()}
    <tr><td>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px">
        <p style="color:#991b1b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600;margin:0 0 8px">Motif de la suspension</p>
        <p style="color:#7f1d1d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;margin:0">${reason || 'Non précisé'}</p>
      </div>
    </td></tr>
    ${_divider()}
    <tr><td>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px">
        <p style="color:#0369a1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;margin:0">
          💬 Pour contester cette décision ou obtenir plus d'informations, veuillez contacter notre équipe à <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;font-weight:600;text-decoration:none">bridgifycloud@gmail.com</a>
        </p>
      </div>
    </td></tr>
  `;

  const header = `<tr><td>${_header()}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `🔒 Votre compte Bridgify Cloud a été suspendu`,
    html: _wrapper(header, body)
  });
}

/**
 * Email envoyé quand l'admin réactive un compte utilisateur
 */
async function sendAccountReactivated(clientEmail, clientName) {
  console.log(`[Email Service] sendAccountReactivated called for ${clientEmail} (${clientName})`);
  const body = `
    ${_title(`🎉 Votre compte a été réactivé`)}
    <tr><td style="padding-bottom:20px">${_badge('Compte réactivé', '#16a34a')}</td></tr>
    ${_text(`Bonjour <strong style="color:#0f2744">${clientName}</strong>,`)}
    ${_text(`Bonne nouvelle ! Votre compte <strong style="color:#0f2744">Bridgify Cloud</strong> a été réactivé par l'administrateur.`)}
    ${_text(`Vous pouvez dès à présent vous reconnecter pour accéder à l'ensemble de vos espaces et outils.`, 'color:#64748b;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:14px;line-height:1.6;margin:0 0 24px')}
    ${_divider()}
    <tr><td align="center">
      ${_button('Se connecter au portail', 'https://client-pme-5ad225cetrial.cfapps.us10-001.hana.ondemand.com/auth.html')}
    </td></tr>
    ${_divider()}
    <tr><td>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px">
        <p style="color:#15803d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;margin:0">
          ✓ Accès rétabli : Tableau de bord, commandes, devis et facturation.
        </p>
      </div>
    </td></tr>
  `;

  const header = `<tr><td>${_header('Compte rétabli avec succès')}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `🎉 Votre compte Bridgify Cloud a été réactivé`,
    html: _wrapper(header, body)
  });
}

/**
 * Email envoyé quand l'admin supprime définitivement un compte utilisateur
 */
async function sendAccountDeleted(clientEmail, clientName) {
  console.log(`[Email Service] sendAccountDeleted called for ${clientEmail} (${clientName})`);
  const body = `
    ${_title(`👋 Votre compte a été supprimé`)}
    <tr><td style="padding-bottom:20px">${_badge('Compte supprimé', '#64748b')}</td></tr>
    ${_text(`Bonjour <strong style="color:#0f2744">${clientName}</strong>,`)}
    ${_text(`Nous vous informons que votre compte utilisateur sur <strong style="color:#0f2744">Bridgify Cloud</strong> a été définitivement supprimé.`)}
    ${_text(`Toutes vos données associées ont été purgées de notre système conformément aux réglementations de protection des données.`, 'color:#64748b;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:14px;line-height:1.6;margin:0 0 24px')}
    ${_divider()}
    <tr><td>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px">
        <p style="color:#475569;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;margin:0">
          Nous vous remercions d'avoir utilisé notre plateforme Bridgify Cloud. Si cette action n'émane pas de votre volonté ou si vous souhaitez nous rejoindre à nouveau, veuillez nous contacter à <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;text-decoration:none">bridgifycloud@gmail.com</a>.
        </p>
      </div>
    </td></tr>
  `;

  const header = `<tr><td>${_header('Départ enregistré')}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `👋 Votre compte Bridgify Cloud a été supprimé`,
    html: _wrapper(header, body)
  });
}

/**
 * Formatte les montants numériques pour l'affichage email (style français/DZ)
 */
function _formatAmount(amount) {
  if (amount == null || isNaN(parseFloat(amount))) return '0,00';
  return parseFloat(amount).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).replace(/[\u202f\u00a0\u2009\/\\]/g, ' ').trim();
}

/**
 * Email de confirmation de commande client (Bon de commande client)
 */
async function sendCommande(clientEmail, clientName, orderNumber, totalTTC, currency, pdfBuffer) {
  const formattedAmount = _formatAmount(totalTTC);
  const body = `
    ${_title(`Confirmation de commande 📦`)}
    ${_text(`Bonjour <strong style="color:#0f2744">${clientName}</strong>,`)}
    ${_text(`Votre commande <strong style="color:#2563eb">${orderNumber}</strong> a été enregistrée avec succès. Vous trouverez le bon de commande en pièce jointe.`)}
    ${_divider()}
    <tr><td>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0f2744,#1e3a6e);padding:16px 20px">
          <p style="color:rgba(255,255,255,0.7);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin:0 0 4px">Montant total TTC</p>
          <p style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:700;margin:0;letter-spacing:-0.5px">${formattedAmount} <span style="font-size:14px;opacity:0.8">${currency || 'DZD'}</span></p>
        </div>
        <div style="padding:16px 20px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="color:#64748b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px">Référence de Commande</td>
              <td align="right" style="color:#0f2744;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600">${orderNumber}</td>
            </tr>
          </table>
        </div>
      </div>
    </td></tr>
    ${_divider()}
    ${_text(`Pour toute question ou modification, veuillez nous écrire à <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;text-decoration:none">bridgifycloud@gmail.com</a>`, 'color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;margin:0')}
  `;

  const header = `<tr><td>${_header('Votre commande est validée')}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: clientEmail,
    subject: `📦 Commande ${orderNumber} confirmée — Bridgify Cloud`,
    html: _wrapper(header, body),
    attachments: pdfBuffer ? [{ filename: `${orderNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }] : []
  });
}

/**
 * Email de transmission de bon de commande fournisseur (PO)
 */
async function sendPOFournisseur(supplierEmail, supplierName, poNumber, totalTTC, currency, pdfBuffer) {
  const formattedAmount = _formatAmount(totalTTC);
  const body = `
    ${_title(`Nouveau Bon de Commande Fournisseur 💼`)}
    ${_text(`Bonjour <strong style="color:#0f2744">${supplierName}</strong>,`)}
    ${_text(`Nous avons le plaisir de vous transmettre notre bon de commande <strong style="color:#2563eb">${poNumber}</strong>. Le document PDF est disponible en pièce jointe.`)}
    ${_divider()}
    <tr><td>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0f2744,#1e3a6e);padding:16px 20px">
          <p style="color:rgba(255,255,255,0.7);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin:0 0 4px">Montant total estimé TTC</p>
          <p style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:700;margin:0;letter-spacing:-0.5px">${formattedAmount} <span style="font-size:14px;opacity:0.8">${currency || 'DZD'}</span></p>
        </div>
        <div style="padding:16px 20px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="color:#64748b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px">N° de Commande (PO)</td>
              <td align="right" style="color:#0f2744;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600">${poNumber}</td>
            </tr>
          </table>
        </div>
      </div>
    </td></tr>
    ${_divider()}
    ${_text(`Merci de bien vouloir accuser réception et confirmer la date de livraison via votre portail partenaire. Pour toute question : <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;text-decoration:none">bridgifycloud@gmail.com</a>`, 'color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;margin:0')}
  `;

  const header = `<tr><td>${_header('Nouveau bon de commande reçu')}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: supplierEmail,
    subject: `💼 Bon de Commande ${poNumber} — Bridgify Cloud`,
    html: _wrapper(header, body),
    attachments: pdfBuffer ? [{ filename: `${poNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }] : []
  });
}

/**
 * Email d'accusé de réception de facture fournisseur
 */
async function sendInvoiceFournisseur(supplierEmail, supplierName, invoiceNumber, totalTTC, currency, pdfBuffer) {
  const formattedAmount = _formatAmount(totalTTC);
  const body = `
    ${_title(`Enregistrement de Facture Fournisseur 🧾`)}
    ${_text(`Bonjour <strong style="color:#0f2744">${supplierName}</strong>,`)}
    ${_text(`Votre facture <strong style="color:#2563eb">${invoiceNumber}</strong> a bien été enregistrée et est en cours de traitement par notre service comptabilité.`)}
    ${_divider()}
    <tr><td>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0f2744,#1e3a6e);padding:16px 20px">
          <p style="color:rgba(255,255,255,0.7);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin:0 0 4px">Montant total facturé TTC</p>
          <p style="color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:28px;font-weight:700;margin:0;letter-spacing:-0.5px">${formattedAmount} <span style="font-size:14px;opacity:0.8">${currency || 'DZD'}</span></p>
        </div>
        <div style="padding:16px 20px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="color:#64748b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px">N° de Facture</td>
              <td align="right" style="color:#0f2744;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600">${invoiceNumber}</td>
            </tr>
          </table>
        </div>
      </div>
    </td></tr>
    ${_divider()}
    ${_text(`Vous pouvez suivre le statut de vos factures et paiements sur votre espace partenaire. Pour toute question : <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;text-decoration:none">bridgifycloud@gmail.com</a>`, 'color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;margin:0')}
  `;

  const header = `<tr><td>${_header('Traitement de votre facture')}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: supplierEmail,
    subject: `🧾 Facture Fournisseur ${invoiceNumber} reçue — Bridgify Cloud`,
    html: _wrapper(header, body),
    attachments: pdfBuffer ? [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }] : []
  });
}

/**
 * Email d'envoi du bon de réception de marchandise (GR) au fournisseur
 */
async function sendGRFournisseur(supplierEmail, supplierName, receiptNumber, poNumber, pdfBuffer) {
  const body = `
    ${_title(`Bon de Réception Marchandise 🚚`)}
    ${_text(`Bonjour <strong style="color:#0f2744">${supplierName}</strong>,`)}
    ${_text(`Nous vous transmettons le bon de réception <strong style="color:#2563eb">${receiptNumber}</strong> correspondant au bon de commande <strong style="color:#0f2744">${poNumber}</strong>.`)}
    ${_divider()}
    <tr><td>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="color:#64748b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px">N° de Réception</td>
            <td align="right" style="color:#0f2744;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600">${receiptNumber}</td>
          </tr>
          <tr><td colspan="2" style="padding:8px 0"><div style="height:1px;background:#e2e8f0"></div></td></tr>
          <tr>
            <td style="color:#64748b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px">N° de Commande</td>
            <td align="right" style="color:#0f2744;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:600">${poNumber}</td>
          </tr>
        </table>
      </div>
    </td></tr>
    ${_divider()}
    ${_text(`Le document détaillé de réception est disponible en pièce jointe. Pour toute question : <a href="mailto:bridgifycloud@gmail.com" style="color:#2563eb;text-decoration:none">bridgifycloud@gmail.com</a>`, 'color:#94a3b8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;font-size:13px;margin:0')}
  `;

  const header = `<tr><td>${_header('Réception de marchandises enregistrée')}</td></tr>`;

  return _sendMail({
    from: FROM_ADDRESS,
    to: supplierEmail,
    subject: `🚚 Bon de Réception ${receiptNumber} — Bridgify Cloud`,
    html: _wrapper(header, body),
    attachments: pdfBuffer ? [{ filename: `${receiptNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }] : []
  });
}

module.exports = {
  sendWelcomeB2B,
  sendWelcomeRegistration,
  sendAccountStatus,
  sendDevis,
  sendFacture,
  sendWorkflowNotification,
  sendAccountBlocked,
  sendAccountReactivated,
  sendAccountDeleted,
  sendCommande,
  sendPOFournisseur,
  sendInvoiceFournisseur,
  sendGRFournisseur
};