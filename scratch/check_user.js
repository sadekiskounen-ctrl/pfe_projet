const cds = require('@sap/cds');
(async () => {
    try {
        const db = await cds.connect.to('db');
        const email = 'mouloudhemiche@gmail.com';
        
        console.log('--- DIAGNOSTIC UTILISATEUR ---');
        
        const reg = await db.run(SELECT.from('pme_registration_RegistrationRequest').where({ email }));
        console.log('Inscription trouvée:', reg.length > 0 ? 'OUI' : 'NON');
        if (reg.length > 0) console.log('Statut Inscription:', reg[0].status);

        const bp = await db.run(SELECT.from('sap_pme_BusinessPartner').where({ email }));
        console.log('Partenaire créé:', bp.length > 0 ? 'OUI' : 'NON');
        if (bp.length > 0) console.log('Statut Partenaire:', bp[0].status);

    } catch (e) {
        console.error('Erreur:', e.message);
    }
    process.exit();
})();
