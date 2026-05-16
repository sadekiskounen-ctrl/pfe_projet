const cds = require('@sap/cds');

async function test() {
    console.log('--- Démarrage du test de connexion HANA Cloud ---');
    try {
        const db = await cds.connect.to('db');
        console.log('[OK] Connecté au service DB');
        
        const result = await db.run(SELECT.from('sap.pme.BusinessPartner').limit(1));
        console.log('[OK] Requête SELECT réussie !');
        console.log('Donnée récupérée :', JSON.stringify(result, null, 2));
        
    } catch (err) {
        console.error('[ERREUR] Échec de la connexion ou de la requête :');
        console.error(err);
        if (err.message.includes('No service bound')) {
            console.error('\nCONSEIL : Vérifiez que vous êtes connecté à Cloud Foundry (cf login) et que le profil hybrid est bien configuré.');
        }
    }
}

test();
