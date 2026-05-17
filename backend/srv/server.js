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

module.exports = cds.server;
