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
        "ai",
        "rc",
        "rcType",
        "aiDoc",
        "aiType",
        "rib",
        "ribType",
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
        // Transfert des médias
        rcDoc: reg.rc,
        rcType: reg.rcType,
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
    const { BusinessPartner } = cds.entities("sap.pme");

    // 1. Chercher d'abord s'il est déjà un Business Partner (Compte validé)
    const bp = await SELECT.one.from(BusinessPartner).where({ email: email });
    if (bp) {
      return { status: bp.status, blockReason: bp.blockReason };
    }

    // 2. Sinon, chercher s'il y a une demande d'inscription en cours ou rejetée
    const reg = await SELECT.one
      .from(RegistrationRequests)
      .where({ email: email });
    if (reg) {
      return { status: reg.status, blockReason: reg.adminComment };
    }

    return null;
  });

  this.on("checkAvailability", async (req) => {
    const { email, companyName, type } = req.data;
    const { BusinessPartner } = cds.entities("sap.pme");

    if (companyName && type) {
      const bpName = await SELECT.one
        .from(BusinessPartner)
        .where({ displayName: companyName, bpType: type });
      const regName = await SELECT.one
        .from(RegistrationRequests)
        .where({ companyName, type, status: "PENDING" });
      if (bpName || regName)
        return {
          status: "CONFLICT",
          blockReason: `La société "${companyName}" est déjà enregistrée comme ${type}.`,
        };
    }

    if (email) {
      const bp = await SELECT.one.from(BusinessPartner).where({ email });
      const reg = await SELECT.one
        .from(RegistrationRequests)
        .where({ email, status: "PENDING" });
      if (bp || reg)
        return {
          status: "CONFLICT",
          blockReason:
            "Cet email est déjà utilisé par un compte actif ou en attente.",
        };
    }

    return { status: "AVAILABLE" };
  });

  this.on("login", async (req) => {
    const { email, password } = req.data;
    console.log(`[AUTH] Tentative de connexion pour: ${email}`);
    const { BusinessPartner } = cds.entities("sap.pme");
    const bp = await SELECT.one
      .from(BusinessPartner)
      .where({ email, password });

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
