const nodemailer = require('nodemailer');

async function main() {
  console.log('=== Génération d\'un compte Ethereal de test ===');
  
  // 1. Créer un compte de test Ethereal temporaire
  let testAccount;
  try {
    testAccount = await nodemailer.createTestAccount();
    console.log('Compte créé avec succès !');
    console.log(`Serveur SMTP : ${testAccount.smtp.host}`);
    console.log(`Port : ${testAccount.smtp.port}`);
    console.log(`Utilisateur : ${testAccount.user}`);
    console.log(`Mot de passe : ${testAccount.pass}`);
    console.log('\nVous pouvez utiliser ces identifiants dans votre fichier .env pour tester l\'application en local.');
  } catch (error) {
    console.error('Erreur lors de la création du compte de test Ethereal :', error);
    return;
  }

  // 2. Configurer le transporteur nodemailer avec les identifiants générés
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  // 3. Préparer le contenu de l'e-mail (Modèle Welcome B2B)
  const mailOptions = {
    from: '"Gestion PME" <noreply@gestionpme.dz>',
    to: 'contact@pme-partenaire.dz',
    subject: 'Bienvenue sur Gestion PME — Inscription Reçue',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="background:#1d2d3e;padding:30px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">Gestion PME</h1>
          <p style="color:#94a3b8;margin:5px 0">Solution Cloud de Gestion - SAP BTP</p>
        </div>
        <div style="padding:30px;background:#f8fafc">
          <h2 style="color:#1d2d3e;margin-top:0">Bonjour Partenaire,</h2>
          <p>Votre inscription pour l'entreprise <strong>PME Partenaire SPA</strong> a été reçue avec succès.</p>
          <p>Votre compte est actuellement <strong>en cours de validation</strong> par notre équipe administrative.</p>
          <p>Vous recevrez un e-mail de confirmation dès que vos justificatifs auront été vérifiés.</p>
          <div style="background:#fff;border-left:4px solid #0070f2;padding:15px;margin:20px 0;border-radius:0 4px 4px 0;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
            <p style="margin:0;font-weight:bold;color:#1d2d3e">Prochaines étapes :</p>
            <ul style="margin:5px 0 0 20px;padding:0;color:#475569">
              <li>Vérification de vos documents administratifs (RC, NIF, AI)</li>
              <li>Activation de votre accès par le backoffice</li>
              <li>Réception de vos identifiants de connexion</li>
            </ul>
          </div>
          <p style="color:#64748b;font-size:14px">Ceci est un e-mail de test généré automatiquement par le système de notification locale.</p>
        </div>
        <div style="background:#f1f5f9;padding:15px;text-align:center;border-top:1px solid #e2e8f0">
          <p style="color:#94a3b8;margin:0;font-size:12px">
            © 2026 Gestion PME Connect | contact@gestionpme.dz
          </p>
        </div>
      </div>
    `
  };

  console.log('\n=== Envoi de l\'e-mail de test ===');
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`E-mail envoyé avec succès ! Message ID: ${info.messageId}`);
    
    // 4. Ethereal fournit une URL de prévisualisation web de l'e-mail envoyé
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('\n=============================================================');
    console.log('👉 CLIQUEZ SUR LE LIEN CI-DESSOUS POUR VOIR L\'EMAIL ENVOYÉ :');
    console.log(previewUrl);
    console.log('=============================================================');
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'e-mail :', error);
  }
}

main();
