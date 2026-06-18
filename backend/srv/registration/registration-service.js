const cds = require("@sap/cds");
const { sendWelcomeRegistration, sendAccountStatus } = require("../lib/email-service");

module.exports = cds.service.impl(async function () {
  const { RegistrationRequests, SubmitRegistration } = this.entities;

  // --- Envoi d'email automatique après soumission d'une inscription ---
  this.after("CREATE", SubmitRegistration, async (data) => {
    console.log(`[Registration] Envoi de l'email de bienvenue (PENDING) à : ${data.email}`);
    sendWelcomeRegistration(data.email, data.companyName, data.companyName, data.type).catch((e) => {
      console.warn("[Registration] Échec de l'envoi de l'email de bienvenue :", e.message);
    });
  });

  // --- LOGIQUE DE RÉ-INSCRIPTION ---
  this.before("CREATE", SubmitRegistration, async (req) => {
    const { email, companyName, type } = req.data;
    const { BusinessPartner } = cds.entities("sap.pme");

    // 0. Vérifier doublon Nom Société + Type (Client/Fournisseur)
    const bpName = await SELECT.one
      .from(BusinessPartner)
      .where("lower(displayName) =", companyName.toLowerCase())
      .and({ bpType: type });
    const regName = await SELECT.one
      .from(RegistrationRequests)
      .where("lower(companyName) =", companyName.toLowerCase())
      .and({ type, status: "PENDING" });
    if (bpName || regName) {
      return req.error(
        400,
        `La société "${companyName}" est déjà enregistrée ou en cours d'inscription en tant que ${type}.`,
      );
    }

    // 1. Vérifier si déjà approuvé (BP existant) par email et type
    const bp = await SELECT.one
      .from(BusinessPartner)
      .where("lower(email) =", email.toLowerCase())
      .and({ bpType: type });
    if (bp)
      return req.error(400, `Cet email appartient déjà à un partenaire actif de type ${type}.`);

    // 2. Vérifier s'il y a une demande en cours pour cet email et ce type
    const existing = await SELECT.one
      .from(RegistrationRequests)
      .where("lower(email) =", email.toLowerCase())
      .and({ type });
    if (existing) {
      if (existing.status === "PENDING") {
        return req.error(400, "Une demande est déjà en cours pour cet email.");
      }
      if (existing.status === "REJECTED") {
        // Si c'était refusé, on marque la nouvelle comme ré-inscription
        req.data.isReentry = true;
        // On peut supprimer l'ancienne demande pour nettoyer la base
        await DELETE.from(RegistrationRequests).where({ ID: existing.ID });
      }
    }

    // 3. Vérifier l'unicité absolue des identifiants fiscaux et bancaires (RC, NIF, AI, RIB)
    const { rcNumber, nif, ai, ribNumber, phone } = req.data;

    console.log(`[DEBUG] Vérification unicité pour: RC=${rcNumber}, NIF=${nif}, Type=${type}`);

    if (rcNumber) {
      const bpRC = await SELECT.one.from(BusinessPartner).where({ rc: rcNumber, bpType: type });
      const regRC = await SELECT.one.from(RegistrationRequests).where({ rcNumber, status: "PENDING", type });
      console.log(`[DEBUG] Check RC: bpRC=${!!bpRC}, regRC=${!!regRC}`);
      if (bpRC || regRC) {
        return req.error(400, `Le Registre de Commerce (RC) "${rcNumber}" est déjà enregistré ou en cours d'inscription pour ce rôle.`);
      }
    }

    if (nif) {
      const bpNIF = await SELECT.one.from(BusinessPartner).where({ nif, bpType: type });
      const regNIF = await SELECT.one.from(RegistrationRequests).where({ nif, status: "PENDING", type });
      console.log(`[DEBUG] Check NIF: bpNIF=${!!bpNIF}, regNIF=${!!regNIF}`);
      if (bpNIF || regNIF) {
        return req.error(400, `Le Numéro d'Identification Fiscale (NIF) "${nif}" est déjà enregistré ou en cours d'inscription pour ce rôle.`);
      }
    }

    if (ai) {
      const bpAI = await SELECT.one.from(BusinessPartner).where({ ai, bpType: type });
      const regAI = await SELECT.one.from(RegistrationRequests).where({ ai, status: "PENDING", type });
      if (bpAI || regAI) {
        return req.error(400, `L'Article d'Imposition (AI) "${ai}" est déjà enregistré ou en cours d'inscription pour ce rôle.`);
      }
    }

    if (ribNumber) {
      const bpRIB = await SELECT.one.from(BusinessPartner).where({ ribNumber, bpType: type });
      const regRIB = await SELECT.one.from(RegistrationRequests).where({ ribNumber, status: "PENDING", type });
      if (bpRIB || regRIB) {
        return req.error(400, `Le RIB bancaire "${ribNumber}" est déjà enregistré ou en cours d'inscription pour ce rôle.`);
      }
    }

    if (phone) {
      const bpPhone = await SELECT.one.from(BusinessPartner).where({ phone, bpType: type });
      const regPhone = await SELECT.one.from(RegistrationRequests).where({ phone, status: "PENDING", type });
      if (bpPhone || regPhone) {
        return req.error(400, `Le numéro de téléphone "${phone}" est déjà enregistré ou en cours d'inscription pour ce rôle.`);
      }
    }
  });

  // Gestionnaire personnalisé pour le streaming des médias (PDF)
  this.on("READ", RegistrationRequests, async (req, next) => {
    const url = req._.req.url;

    // Si on demande le contenu binaire ($value)
    if (url.includes("$value")) {
      console.log("[Registration] Streaming media content...");
      // On laisse CAP gérer le stream, mais on s'assure que les headers sont propres
      const res = await next();
      if (res && res.value) {
        // On peut forcer le type si nécessaire, mais CAP le fait via l'annotation @Core.MediaType
        return res;
      }
    }
    return next();
  });

  // Actions d'approbation et de rejet
  this.on("approveRegistration", async (req) => {
    const { id } = req.data;
    const { BusinessPartner } = cds.entities("sap.pme");

    // Optimisation : Exclure les LargeBinary de la sélection initiale pour éviter de surcharger Node.js
    const reg = await SELECT.one
      .from(RegistrationRequests)
      .columns(
        "companyName",
        "email",
        "phone",
        "type",
        "password",
        "rcNumber",
        "nif",
        "nifType",
        "ai",
        "aiType",
        "rcType",
        "ribType",
        "ribNumber",
        "sector",
        "address",
        "status",
      )
      .where({ ID: id });

    if (!reg) return req.error(404, "Demande introuvable");
    if (reg.status === "APPROVED")
      return req.error(400, "Cette demande a déjà été approuvée.");

    // Vérifier si un BP existe déjà avec cet email pour éviter "Entity already exists"
    const existingBP = await SELECT.one
      .from(BusinessPartner)
      .where({ email: reg.email });
    if (existingBP) {
      await UPDATE(RegistrationRequests)
        .set({ status: "APPROVED" })
        .where({ ID: id });
      return req.error(
        400,
        `Un partenaire avec l'email ${reg.email} existe déjà (BP: ${existingBP.bpNumber})`,
      );
    }

    console.log(
      `[Registration] Approving and creating BP for: ${reg.companyName}`,
    );

    // Génération d'un numéro BP unique (plus robuste)
    const count =
      await SELECT.from(BusinessPartner).columns("count(ID) as total");
    const nextBP =
      "BP" + (1000 + count[0].total + Math.floor(Math.random() * 100));

    const bpId = cds.utils.uuid();

    try {
      // 1. Créer le BusinessPartner principal sans les LargeBinary
      await INSERT.into(BusinessPartner).entries({
        ID: bpId,
        bpNumber: nextBP,
        displayName: reg.companyName,
        email: reg.email,
        phone: reg.phone,
        bpType: reg.type,
        password: reg.password,
        rc: reg.rcNumber,
        nif: reg.nif,
        ai: reg.ai,
        ribNumber: reg.ribNumber,
        sector: reg.sector,
        wilaya: reg.address,
        rcType: reg.rcType,
        nifType: reg.nifType,
        aiType: reg.aiType,
        ribType: reg.ribType,
        status: "ACTIVE",
      });

      // 2. Copier les documents LargeBinary directement au sein de la base de données (sans passer par Node.js)
      // Cela résout le Gateway Timeout 504 en éliminant le transfert réseau de mégaoctets de fichiers
      await cds.run(`
        UPDATE sap_pme_BusinessPartner
        SET rcDoc = (SELECT rc FROM pme_registration_RegistrationRequest WHERE ID = ?),
            nifDoc = (SELECT nifDoc FROM pme_registration_RegistrationRequest WHERE ID = ?),
            aiDoc = (SELECT aiDoc FROM pme_registration_RegistrationRequest WHERE ID = ?),
            ribDoc = (SELECT rib FROM pme_registration_RegistrationRequest WHERE ID = ?)
        WHERE ID = ?
      `, [id, id, id, id, bpId]);

      // 2. Créer l'entité spécifique correspondante (ClientB2B, ClientB2C, ou Fournisseur)
      if (reg.type === "CLIENT_B2B") {
        const { ClientB2B, ClientDocument } = cds.entities("sap.pme.crm");
        const clientB2bId = cds.utils.uuid();

        await INSERT.into(ClientB2B).entries({
          ID: clientB2bId,
          bp_ID: bpId,
          companyName: reg.companyName,
          email: reg.email,
          phone: reg.phone,
          status: "ACTIVE",
          rc: reg.rcNumber,
          nif: reg.nif,
          ai: reg.ai,
          sector: reg.sector,
          wilaya: reg.address,
        });

        // Transférer les documents légaux
        if (reg.rcType) {
          await INSERT.into(ClientDocument).entries({
            ID: cds.utils.uuid(),
            client_ID: clientB2bId,
            docType: "RC",
            fileName: "rc_document",
            fileType: reg.rcType,
            verified: true,
          });
        }
        if (reg.nifType) {
          await INSERT.into(ClientDocument).entries({
            ID: cds.utils.uuid(),
            client_ID: clientB2bId,
            docType: "NIF",
            fileName: "nif_document",
            fileType: reg.nifType,
            verified: true,
          });
        }
        if (reg.aiType) {
          await INSERT.into(ClientDocument).entries({
            ID: cds.utils.uuid(),
            client_ID: clientB2bId,
            docType: "AI",
            fileName: "ai_document",
            fileType: reg.aiType,
            verified: true,
          });
        }
        if (reg.ribType) {
          await INSERT.into(ClientDocument).entries({
            ID: cds.utils.uuid(),
            client_ID: clientB2bId,
            docType: "RIB",
            fileName: "rib_document",
            fileType: reg.ribType,
            verified: true,
          });
        }

      } else if (reg.type === "FOURNISSEUR") {
        const { Fournisseur, FournisseurDocument } = cds.entities("sap.pme.srm");
        const fournisseurId = cds.utils.uuid();

        await INSERT.into(Fournisseur).entries({
          ID: fournisseurId,
          bp_ID: bpId,
          companyName: reg.companyName,
          email: reg.email,
          phone: reg.phone,
          status: "ACTIVE",
          rc: reg.rcNumber,
          nif: reg.nif,
          ai: reg.ai,
          sector: reg.sector,
          wilaya: reg.address,
          rib: reg.ribNumber,
          bankAccount: reg.ribNumber,
          kycStatus: "VALIDATED"
        });

        if (reg.rcType) {
          await INSERT.into(FournisseurDocument).entries({
            ID: cds.utils.uuid(),
            fournisseur_ID: fournisseurId,
            docType: "RC",
            fileName: "rc_document",
            fileType: reg.rcType,
            verified: true,
          });
        }
        if (reg.nifType) {
          await INSERT.into(FournisseurDocument).entries({
            ID: cds.utils.uuid(),
            fournisseur_ID: fournisseurId,
            docType: "NIF",
            fileName: "nif_document",
            fileType: reg.nifType,
            verified: true,
          });
        }
        if (reg.aiType) {
          await INSERT.into(FournisseurDocument).entries({
            ID: cds.utils.uuid(),
            fournisseur_ID: fournisseurId,
            docType: "AI",
            fileName: "ai_document",
            fileType: reg.aiType,
            verified: true,
          });
        }
        if (reg.ribType) {
          await INSERT.into(FournisseurDocument).entries({
            ID: cds.utils.uuid(),
            fournisseur_ID: fournisseurId,
            docType: "RIB",
            fileName: "rib_document",
            fileType: reg.ribType,
            verified: true,
          });
        }

      } else if (reg.type === "CLIENT_B2C") {
        const { ClientB2C } = cds.entities("sap.pme.crm");
        const clientB2cId = cds.utils.uuid();

        await INSERT.into(ClientB2C).entries({
          ID: clientB2cId,
          bp_ID: bpId,
          firstName: reg.companyName.split(" ")[0] || reg.companyName,
          lastName: reg.companyName.split(" ").slice(1).join(" ") || reg.companyName,
          email: reg.email,
          phone: reg.phone,
          status: "ACTIVE",
          wilaya: reg.address,
        });
      }

      await UPDATE(RegistrationRequests)
        .set({ status: "APPROVED" })
        .where({ ID: id });

      // Envoi de l'email d'approbation réel (asynchrone, non bloquant)
      console.log(`[Registration] Envoi de l'email d'approbation (APPROVED) à : ${reg.email}`);
      sendAccountStatus(reg.email, reg.companyName, true).catch((mailErr) => {
        console.warn("[Registration] Échec de l'envoi de l'email d'approbation :", mailErr.message);
      });

      return `Succès : Business Partner ${nextBP} créé pour ${reg.companyName}`;
    } catch (err) {
      console.error("Erreur création BP:", err);
      return req.error(
        500,
        "Erreur lors de la création du partenaire dans la base de données.",
      );
    }
  });

  this.on("rejectRegistration", async (req) => {
    const { id, reason } = req.data;
    console.log(`[Registration] Rejecting request ${id} for: ${reason}`);

    // Récupérer les détails de la demande d'inscription pour l'envoi de l'email
    const reg = await SELECT.one
      .from(RegistrationRequests)
      .columns("email", "companyName")
      .where({ ID: id });

    await UPDATE(RegistrationRequests)
      .set({ status: "REJECTED", adminComment: reason })
      .where({ ID: id });

    if (reg) {
      // Envoi de l'email de rejet réel (asynchrone, non bloquant)
      console.log(`[Registration] Envoi de l'email de rejet (REJECTED) à : ${reg.email}`);
      sendAccountStatus(reg.email, reg.companyName, false, reason).catch((mailErr) => {
        console.warn("[Registration] Échec de l'envoi de l'email de rejet :", mailErr.message);
      });
    }

    return "Demande rejetée";
  });

  this.on("checkStatus", async (req) => {
    const { email } = req.data;
    console.log(`[StatusCheck] Vérification pour: ${email}`);
    const { BusinessPartner } = cds.entities("sap.pme");

    // 1. Chercher dans les partenaires actifs (n'importe quel rôle)
    const bp = await SELECT.one.from(BusinessPartner)
      .where("lower(email) =", email.toLowerCase());
      
    if (bp) {
      console.log(`[StatusCheck] Trouvé dans BusinessPartner: ${bp.status}`);
      return { status: bp.status, blockReason: bp.blockReason };
    }

    // 2. Chercher dans les demandes d'inscription
    // Prioriser PENDING, sinon REJECTED
    let reg = await SELECT.one.from(RegistrationRequests)
      .where("lower(email) =", email.toLowerCase())
      .and("status =", "PENDING");

    if (!reg) {
      reg = await SELECT.one.from(RegistrationRequests)
        .where("lower(email) =", email.toLowerCase())
        .and("status =", "REJECTED");
    }

    if (!reg) {
      reg = await SELECT.one.from(RegistrationRequests)
        .where("lower(email) =", email.toLowerCase());
    }

    if (reg) {
      console.log(`[StatusCheck] Trouvé dans RegistrationRequests: ${reg.status}`);
      return { status: reg.status, blockReason: reg.adminComment };
    }

    console.log(`[StatusCheck] Aucun dossier trouvé pour: ${email}`);
    return { status: 'NOT_FOUND' };
  });

  this.on("checkAvailability", async (req) => {
    const { email, companyName, type, rcNumber, nif, ai, ribNumber, phone } = req.data;
    const { BusinessPartner } = cds.entities("sap.pme");

    const isClient = type === 'CLIENT_B2B' || type === 'CLIENT_B2C';
    const typeLabel = isClient ? 'Client' : 'Fournisseur';

    // Helper fonction pour vérifier l'unicité
    const checkDuplicate = async (fieldBP, fieldReg, value, errorMsg) => {
        if (!value) return null;

        let bp, reg;
        if (isClient) {
            bp = await SELECT.one.from(BusinessPartner).where({ [fieldBP]: value }).and(`bpType = 'CLIENT_B2B' or bpType = 'CLIENT_B2C'`);
            reg = await SELECT.one.from(RegistrationRequests).where({ [fieldReg]: value, status: 'PENDING' }).and(`type = 'CLIENT_B2B' or type = 'CLIENT_B2C'`);
        } else {
            bp = await SELECT.one.from(BusinessPartner).where({ [fieldBP]: value, bpType: 'FOURNISSEUR' });
            reg = await SELECT.one.from(RegistrationRequests).where({ [fieldReg]: value, type: 'FOURNISSEUR', status: 'PENDING' });
        }

        if (bp || reg) return { status: "CONFLICT", blockReason: errorMsg };
        return null;
    };

    let error;
    
    error = await checkDuplicate('displayName', 'companyName', companyName, `La société "${companyName}" est déjà enregistrée comme ${typeLabel}.`);
    if (error) return error;

    error = await checkDuplicate('rc', 'rcNumber', rcNumber, `Le Registre de Commerce (RC) "${rcNumber}" est déjà pris pour ce rôle.`);
    if (error) return error;

    error = await checkDuplicate('nif', 'nif', nif, `Le NIF "${nif}" est déjà pris pour ce rôle.`);
    if (error) return error;

    error = await checkDuplicate('ai', 'ai', ai, `L'Article d'Imposition "${ai}" est déjà pris pour ce rôle.`);
    if (error) return error;

    error = await checkDuplicate('ribNumber', 'ribNumber', ribNumber, `Le RIB "${ribNumber}" est déjà pris pour ce rôle.`);
    if (error) return error;

    error = await checkDuplicate('phone', 'phone', phone, `Le Téléphone "${phone}" est déjà pris pour ce rôle.`);
    if (error) return error;

    if (email) {
      const bp = await SELECT.one.from(BusinessPartner).where("lower(email) =", email.toLowerCase());
      const reg = await SELECT.one.from(RegistrationRequests).where("lower(email) =", email.toLowerCase(), "and status = 'PENDING'");
      if (bp || reg) return { status: "CONFLICT", blockReason: "Cet email est déjà utilisé par un compte actif ou en attente." };
    }

    return { status: "AVAILABLE" };
  });

  this.on("login", async (req) => {
    const { email, password } = req.data;
    console.log(`[AUTH] Tentative de connexion pour: ${email}`);
    const { BusinessPartner } = cds.entities("sap.pme");
    const bp = await SELECT.one
      .from(BusinessPartner)
      .where("lower(email) =", email.toLowerCase(), "and password =", password);

    if (bp) {
      // Vérifier si le compte est bloqué
      if (bp.status === 'BLOCKED') {
        console.warn(`[AUTH] Compte bloqué pour: ${email}`);
        return { status: "BLOCKED", blockReason: bp.blockReason || "Votre compte a été suspendu par l'administrateur." };
      }
      console.log(`[AUTH] Succès pour: ${email} (Type: ${bp.bpType})`);
      return { status: "SUCCESS", blockReason: bp.bpType };
    }
    console.warn(
      `[AUTH] Échec pour: ${email} - Identifiants incorrects ou compte non migré.`,
    );
    return { status: "INVALID", blockReason: "Identifiants incorrects" };
  });
});
