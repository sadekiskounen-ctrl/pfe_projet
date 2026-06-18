require('dotenv').config();
const cds = require('@sap/cds');
const cors = require('cors');
const express = require('express');

// Force dummy auth regardless of bound XSUAA service instances
// This is critical: on SAP BTP, CDS auto-detects bound XSUAA and overrides 'dummy' with JWT validation
// Since this app uses custom Basic Auth middleware, we must prevent that override
if (cds.env && cds.env.requires) {
    cds.env.requires.auth = { kind: 'dummy', strategy: 'dummy' };
}

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

    // Autoriser l'accès public (anonyme) aux endpoints d'inscription
    app.use('/odata/v4/registration', (req, res, next) => {
        const publicEndpoints = ['/SubmitRegistration', '/checkAvailability', '/checkStatus', '/login'];
        const hasAuth = !!(req.headers.authorization || req.headers.Authorization);
        if (!hasAuth && publicEndpoints.some(ep => req.path.startsWith(ep))) {
            // Créer un utilisateur factice pour les routes publiques sans auth
            req.user = new cds.User({ id: 'anonymous', roles: ['any', 'authenticated-user'] });
        }
        next();
    });

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

                // 0. Vérification des comptes système hardcodés (fonctionnel même en mode dummy/production)
                const systemAccounts = {
                    'admin@pme.dz':      { password: 'admin',      roles: ['Admin', 'authenticated-user'] },
                    'admin':             { password: 'admin',      roles: ['Admin', 'authenticated-user'] },
                    'commercial@pme.dz': { password: 'commercial', roles: ['Commercial', 'authenticated-user'] },
                    'commercial':        { password: 'commercial', roles: ['Commercial', 'authenticated-user'] },
                };
                const sysUser = systemAccounts[email] || systemAccounts[resolvedEmail];
                if (sysUser && sysUser.password === password) {
                    req.user = new cds.User({ id: resolvedEmail, roles: sysUser.roles });
                    console.log(`[Custom Auth] System account authenticated: ${resolvedEmail} with roles: ${sysUser.roles}`);
                    return next();
                }

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
                            if (bp.status === 'BLOCKED') {
                                console.warn(`[Custom Auth] Authentication failed: User account ${email} is BLOCKED. Block reason: ${bp.blockReason || 'None specified'}`);
                                return res.status(403).json({ error: { message: "Ce compte a été bloqué par l'administrateur." } });
                            }

                            // Map bpType to CAP roles (e.g. CLIENT_B2B -> ClientB2B, FOURNISSEUR -> Fournisseur)
                            let role = bp.bpType;
                            if (role === 'CLIENT_B2B') role = 'ClientB2B';
                            if (role === 'CLIENT_B2C') role = 'ClientB2C';
                            if (role === 'FOURNISSEUR') role = 'Fournisseur';

                            const roles = [role, 'authenticated-user'];
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

    function requireAdmin(req, res, next) {
        if (req.user && req.user.is('Admin')) return next();
        return res.status(401).json({ error: { message: 'Authentification administrateur requise.' } });
    }

    // Custom route — Auto-create a Fournisseur (bypasses OData @readonly)
    app.post('/api/create-fournisseur', requireAdmin, async (req, res) => {
        try {
            const { companyName, email, nif, rc, rib, street, country } = req.body;
            if (!companyName) {
                return res.status(400).json({ error: { message: 'companyName est obligatoire.' } });
            }
            const db = await cds.connect.to('db');
            const { Fournisseur } = db.entities('sap.pme.srm');
            const newRecord = await db.run(
                INSERT.into(Fournisseur).entries({
                    companyName,
                    email: email || `${companyName.toLowerCase().replace(/[^a-z0-9]/g,'').substring(0,30)}@fournisseur-import.dz`,
                    nif:   nif    || null,
                    rc:    rc     || null,
                    rib:   rib    || null,
                    street: street || null,
                    country: country || 'DZ',
                    kycStatus: 'PENDING',
                    score: 0
                })
            );
            // Retrieve the created record to get its generated ID
            const created = await db.run(
                SELECT.one.from(Fournisseur).where({ companyName }).orderBy({ createdAt: 'desc' })
            );
            console.log('[create-fournisseur] Created supplier:', created?.ID, companyName);
            return res.status(201).json({ ID: created?.ID, companyName });
        } catch (err) {
            console.error('[create-fournisseur] Error:', err);
            return res.status(500).json({ error: { message: err.message || 'Erreur création fournisseur' } });
        }
    });

    // Custom route for Gemini Invoice AI Extraction
    app.post('/api/extract-invoice', requireAdmin, async (req, res) => {
        try {
            const { fileData, mimeType } = req.body;
            let apiKey = process.env.GEMINI_API_KEY || req.headers['x-gemini-key'];
            if (!apiKey) {
                return res.status(400).json({ error: { message: "Clé API Gemini manquante. Veuillez configurer GEMINI_API_KEY ou fournir l'en-tête X-Gemini-Key." } });
            }

            console.log('[Gemini Extractor] Received file for extraction. MimeType:', mimeType);

            const prompt = `Analyze this invoice document and extract the following information. Return ONLY a valid JSON object matching the following structure (do not include any markdown formatting or extra characters, just the raw JSON):
{
  "numero": "Invoice number or identifier",
  "date": "Invoice date in DD/MM/YYYY format",
  "bc": "Purchase order reference (Bon de commande) if present, e.g. PO-00001",
  "modePaiement": "Payment method (e.g. ESPECES, VIREMENT, CHEQUE)",
  "fournisseur": "Supplier company name",
  "nif": "Supplier NIF (Numéro d'Identification Fiscale, typically 15 digits)",
  "rc": "Supplier RC (Registre du Commerce)",
  "rib": "Supplier RIB (24 digits bank account number)",
  "adresse": "Supplier address",
  "ht": number (Total amount HT),
  "tvaPercent": number (TVA percent, default to 19 if not specified),
  "tva": number (Total TVA amount),
  "ttc": number (Total TTC amount),
  "confidence": "high" or "medium" or "low" (Confidence level of the extraction),
  "lignes": [
    {
      "description": "Item description",
      "quantite": number,
      "prixUnitaireHT": number,
      "totalHT": number
    }
  ]
}`;

            const models = ['gemini-2.5-flash-preview-05-20', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'];
            let lastError = null;
            let result = null;

            for (const model of models) {
                try {
                    console.log(`[Gemini Extractor] Trying model: ${model}`);
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        { text: prompt },
                                        {
                                            inlineData: {
                                                mimeType: mimeType,
                                                data: fileData
                                            }
                                        }
                                    ]
                                }
                            ],
                            generationConfig: {
                                responseMimeType: "application/json"
                            }
                        })
                    });

                    if (response.ok) {
                        result = await response.json();
                        console.log(`[Gemini Extractor] Success with model: ${model}`);
                        break;
                    } else {
                        const errText = await response.text();
                        console.warn(`[Gemini Extractor] Model ${model} failed with: ${errText}`);
                        lastError = new Error(`Gemini API Error for ${model}: ${errText}`);
                    }
                } catch (e) {
                    console.warn(`[Gemini Extractor] Connection error for ${model}:`, e.message);
                    lastError = e;
                }
            }

            if (!result) {
                return res.status(500).json({ error: { message: lastError ? lastError.message : "All Gemini model candidates failed." } });
            }

            const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textResponse) {
                return res.status(500).json({ error: { message: "Réponse vide de l'IA Gemini." } });
            }

            // Parse extracted text to JSON
            const jsonStart = textResponse.indexOf('{');
            const jsonEnd = textResponse.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1) {
                return res.status(500).json({ error: { message: "Impossible de parser le JSON extrait par l'IA.", rawText: textResponse } });
            }
            const cleanJsonText = textResponse.substring(jsonStart, jsonEnd + 1);
            const extractedData = JSON.parse(cleanJsonText);

            return res.json(extractedData);
        } catch (err) {
            console.error('[Gemini Extractor] Extraction error:', err);
            return res.status(500).json({ error: { message: err.message } });
        }
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
