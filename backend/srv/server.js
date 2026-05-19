const cds = require('@sap/cds');
const cors = require('cors');
const express = require('express');

cds.on('bootstrap', (app) => {
    // Augmenter la limite de taille pour les fichiers PDF (Base64)
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Configurer CORS
    app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Token']
    }));

    // Middleware d'authentification personnalisé (Basic Auth)
    app.use(async (req, res, next) => {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Basic ')) {
            try {
                const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8');
                const [email, password] = credentials.split(':');

                console.log(`[Custom Auth] Authenticating: ${email}`);

                // Mappage des identifiants simplifiés de démonstration
                let resolvedEmail = email;
                if (email === 'admin') resolvedEmail = 'admin@pme.dz';
                if (email === 'commercial') resolvedEmail = 'commercial@pme.dz';
                if (email === 'client') resolvedEmail = 'clientb2b@pme.dz';
                if (email === 'fournisseur') resolvedEmail = 'fournisseur@pme.dz';

                // 1. Vérification des utilisateurs de test configurés dans .cdsrc.json ou package.json
                const devUsers = cds.env.auth?.users || {};
                
                // On teste d'abord l'email résolu (ex: admin@pme.dz)
                if (devUsers[resolvedEmail]) {
                    const expectedPassword = devUsers[resolvedEmail].password || resolvedEmail.split('@')[0];
                    if (expectedPassword === password) {
                        const roles = devUsers[resolvedEmail].roles || [];
                        req.user = new cds.User({ id: resolvedEmail, roles: roles });
                        console.log(`[Custom Auth] Authenticated dev user (resolved): ${resolvedEmail} with roles: ${roles}`);
                        return next();
                    }
                }
                
                // On teste ensuite le nom abrégé (ex: admin)
                if (devUsers[email]) {
                    const expectedPassword = devUsers[email].password || email;
                    if (expectedPassword === password) {
                        const roles = devUsers[email].roles || [];
                        req.user = new cds.User({ id: email, roles: roles });
                        console.log(`[Custom Auth] Authenticated dev user (short): ${email} with roles: ${roles}`);
                        return next();
                    }
                }

                // 2. Vérification dynamique en base de données (BusinessPartner)
                if (cds.db && cds.entities('sap.pme')) {
                    const { BusinessPartner } = cds.entities('sap.pme');
                    if (BusinessPartner) {
                        const bp = await cds.run(SELECT.one
                            .from(BusinessPartner)
                            .where("lower(email) =", email.toLowerCase(), "and password =", password));
                        
                        if (bp) {
                            // Map bpType to CAP roles (e.g. CLIENT_B2B -> ClientB2B, FOURNISSEUR -> Fournisseur)
                            let role = bp.bpType;
                            if (role === 'CLIENT_B2B') role = 'ClientB2B';
                            if (role === 'CLIENT_B2C') role = 'ClientB2C';
                            if (role === 'FOURNISSEUR') role = 'Fournisseur';

                            const roles = [role];
                            req.user = new cds.User({ id: email, roles: roles });
                            console.log(`[Custom Auth] Authenticated DB user: ${email} with role: ${role}`);
                            return next();
                        }
                    }
                }
            } catch (err) {
                console.error('[Custom Auth] Error during authentication:', err);
            }
        }
        next();
    });
});

cds.on('served', async () => {
    console.log('[Sync] Starting automatic database synchronization...');
    try {
        const { BusinessPartner } = cds.entities('sap.pme');
        const { ClientB2B, ClientB2C } = cds.entities('sap.pme.crm');
        const { Fournisseur } = cds.entities('sap.pme.srm');

        if (BusinessPartner && ClientB2B && Fournisseur && ClientB2C) {
            const bps = await SELECT.from(BusinessPartner);
            for (const bp of bps) {
                if (bp.bpType === 'CLIENT_B2B') {
                    const client = await SELECT.one.from(ClientB2B).where({ email: bp.email });
                    if (!client) {
                        console.log(`[Sync] Syncing missing ClientB2B for: ${bp.displayName} (${bp.email})`);
                        await INSERT.into(ClientB2B).entries({
                            ID: cds.utils.uuid(),
                            bp_ID: bp.ID,
                            companyName: bp.displayName,
                            email: bp.email,
                            phone: bp.phone,
                            status: bp.status || 'ACTIVE',
                            rc: bp.rc,
                            nif: bp.nif,
                            ai: bp.ai,
                            sector: bp.sector,
                            wilaya: bp.wilaya
                        });
                    } else {
                        // Synchro des colonnes éventuellement vides
                        const updates = {};
                        if (!client.bp_ID) updates.bp_ID = bp.ID;
                        if (!client.rc && bp.rc) updates.rc = bp.rc;
                        if (!client.nif && bp.nif) updates.nif = bp.nif;
                        if (!client.ai && bp.ai) updates.ai = bp.ai;
                        if (!client.sector && bp.sector) updates.sector = bp.sector;
                        if (!client.wilaya && bp.wilaya) updates.wilaya = bp.wilaya;
                        if (!client.phone && bp.phone) updates.phone = bp.phone;
                        
                        if (Object.keys(updates).length > 0) {
                            console.log(`[Sync] Updating missing fields on ClientB2B for: ${bp.displayName}`);
                            await UPDATE(ClientB2B).set(updates).where({ ID: client.ID });
                        }
                    }
                } else if (bp.bpType === 'FOURNISSEUR') {
                    const fournisseur = await SELECT.one.from(Fournisseur).where({ email: bp.email });
                    if (!fournisseur) {
                        console.log(`[Sync] Syncing missing Fournisseur for: ${bp.displayName} (${bp.email})`);
                        await INSERT.into(Fournisseur).entries({
                            ID: cds.utils.uuid(),
                            bp_ID: bp.ID,
                            companyName: bp.displayName,
                            email: bp.email,
                            phone: bp.phone,
                            status: bp.status || 'ACTIVE',
                            rc: bp.rc,
                            nif: bp.nif,
                            ai: bp.ai,
                            sector: bp.sector,
                            wilaya: bp.wilaya,
                            rib: bp.ribNumber,
                            bankAccount: bp.ribNumber,
                            kycStatus: 'VALIDATED'
                        });
                    } else {
                        // Synchro des colonnes éventuellement vides
                        const updates = {};
                        if (!fournisseur.bp_ID) updates.bp_ID = bp.ID;
                        if (!fournisseur.rc && bp.rc) updates.rc = bp.rc;
                        if (!fournisseur.nif && bp.nif) updates.nif = bp.nif;
                        if (!fournisseur.ai && bp.ai) updates.ai = bp.ai;
                        if (!fournisseur.sector && bp.sector) updates.sector = bp.sector;
                        if (!fournisseur.wilaya && bp.wilaya) updates.wilaya = bp.wilaya;
                        if (!fournisseur.phone && bp.phone) updates.phone = bp.phone;
                        if (!fournisseur.rib && bp.ribNumber) updates.rib = bp.ribNumber;
                        if (!fournisseur.bankAccount && bp.ribNumber) updates.bankAccount = bp.ribNumber;
                        
                        if (Object.keys(updates).length > 0) {
                            console.log(`[Sync] Updating missing fields on Fournisseur for: ${bp.displayName}`);
                            await UPDATE(Fournisseur).set(updates).where({ ID: fournisseur.ID });
                        }
                    }
                } else if (bp.bpType === 'CLIENT_B2C') {
                    const clientB2c = await SELECT.one.from(ClientB2C).where({ email: bp.email });
                    if (!clientB2c) {
                        console.log(`[Sync] Syncing missing ClientB2C for: ${bp.displayName} (${bp.email})`);
                        await INSERT.into(ClientB2C).entries({
                            ID: cds.utils.uuid(),
                            bp_ID: bp.ID,
                            firstName: bp.displayName.split(' ')[0] || bp.displayName,
                            lastName: bp.displayName.split(' ').slice(1).join(' ') || bp.displayName,
                            email: bp.email,
                            phone: bp.phone,
                            status: bp.status || 'ACTIVE',
                            wilaya: bp.wilaya
                        });
                    } else {
                        const updates = {};
                        if (!clientB2c.bp_ID) updates.bp_ID = bp.ID;
                        if (!clientB2c.wilaya && bp.wilaya) updates.wilaya = bp.wilaya;
                        if (!clientB2c.phone && bp.phone) updates.phone = bp.phone;
                        
                        if (Object.keys(updates).length > 0) {
                            console.log(`[Sync] Updating missing fields on ClientB2C for: ${bp.displayName}`);
                            await UPDATE(ClientB2C).set(updates).where({ ID: clientB2c.ID });
                        }
                    }
                }
            }
            console.log('[Sync] Database synchronization completed successfully.');
        }
    } catch (err) {
        console.error('[Sync] Error during database synchronization:', err);
    }
});

module.exports = cds.server;
