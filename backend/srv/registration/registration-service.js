const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
  const { RegistrationRequests, SubmitRegistration } = this.entities;

  // --- LOGIQUE DE RÉ-INSCRIPTION ---
  this.before("CREATE", SubmitRegistration, async (req) => {
    const { email, companyName, type } = req.data;
    const { BusinessPartner } = cds.entities("sap.pme");

    // 0. Vérifier doublon Nom Société + Type (Client/Fournisseur)
    const bpName = await SELECT.one
      .from(BusinessPartner)
      .where({ displayName: companyName, bpType: type });
    const regName = await SELECT.one
      .from(RegistrationRequests)
      .where({ companyName, type, status: "PENDING" });
    if (bpName || regName) {
      return req.error(
        400,
        `La société "${companyName}" est déjà enregistrée ou en cours d'inscription en tant que ${type}.`,
      );
    }

    // 1. Vérifier si déjà approuvé (BP existant) par email
    const bp = await SELECT.one.from(BusinessPartner).where({ email });
    if (bp)
      return req.error(400, "Cet email appartient déjà à un partenaire actif.");

    // 2. Vérifier s'il y a une demande en cours
    const existing = await SELECT.one
      .from(RegistrationRequests)
      .where({ email });
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

    // Correction : On sélectionne explicitement tous les champs, y compris les LargeBinary
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
        "nifDoc",
        "nifType",
        "ai",
        "rc",
        "rcType",
        "aiDoc",
        "aiType",
        "rib",
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

    try {
      await INSERT.into(BusinessPartner).entries({
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
        // Transfert des médias
        rcDoc: reg.rc,
        rcType: reg.rcType,
        nifDoc: reg.nifDoc,
        nifType: reg.nifType,
        aiDoc: reg.aiDoc,
        aiType: reg.aiType,
        ribDoc: reg.rib,
        ribType: reg.ribType,
        status: "ACTIVE",
      });

      await UPDATE(RegistrationRequests)
        .set({ status: "APPROVED" })
        .where({ ID: id });
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
    await UPDATE(RegistrationRequests)
      .set({ status: "REJECTED", adminComment: reason })
      .where({ ID: id });
    return "Demande rejetée";
  });

  this.on("checkStatus", async (req) => {
    const { email } = req.data;
    console.log(`[StatusCheck] Vérification pour: ${email}`);
    const { BusinessPartner } = cds.entities("sap.pme");

    const bp = await SELECT.one.from(BusinessPartner).where("lower(email) =", email.toLowerCase());
    if (bp) {
      console.log(`[StatusCheck] Trouvé dans BusinessPartner: ${bp.status}`);
      return { status: bp.status, blockReason: bp.blockReason };
    }

    const reg = await SELECT.one.from(RegistrationRequests).where("lower(email) =", email.toLowerCase());
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
    const { RegistrationRequests } = cds.entities("pme.registration");
    const bp = await SELECT.one
      .from(BusinessPartner)
      .where("lower(email) =", email.toLowerCase(), "and password =", password);

    if (bp) {
      console.log(`[AUTH] Succès pour: ${email} (Type: ${bp.bpType})`);
      return { status: "SUCCESS", blockReason: bp.bpType };
    }
    console.warn(
      `[AUTH] Échec pour: ${email} - Identifiants incorrects ou compte non migré.`,
    );
    return { status: "INVALID", blockReason: "Identifiants incorrects" };
  });
});
