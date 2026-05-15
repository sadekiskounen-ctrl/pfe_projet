const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
    const { RegistrationRequests } = this.entities;

    // Gestionnaire personnalisé pour le streaming des médias (PDF)
    this.on('READ', RegistrationRequests, async (req, next) => {
        const url = req._.req.url;
        
        // Si on demande le contenu binaire ($value)
        if (url.includes('$value')) {
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
    this.on('approveRegistration', async (req) => {
        const { id } = req.data;
        const { BusinessPartner } = cds.entities('sap.pme');
        
        const reg = await SELECT.one.from(RegistrationRequests).where({ ID: id });
        if(!reg) return req.error(404, "Demande introuvable");

        console.log(`[Registration] Approving and creating BP for: ${reg.companyName}`);
        
        // Création du Business Partner réel
        const nextBP = 'BP' + Math.floor(1000 + Math.random() * 9000);
        await INSERT.into(BusinessPartner).entries({
            bpNumber: nextBP,
            displayName: reg.companyName,
            email: reg.email,
            phone: reg.phone,
            bpType: reg.type,
            status: 'ACTIVE'
        });

        await UPDATE(RegistrationRequests).set({ status: 'APPROVED' }).where({ ID: id });
        return "Demande approuvée et Business Partner créé";
    });

    this.on('rejectRegistration', async (req) => {
        const { id, reason } = req.data;
        console.log(`[Registration] Rejecting request ${id} for: ${reason}`);
        await UPDATE(RegistrationRequests).set({ status: 'REJECTED', adminComment: reason }).where({ ID: id });
        return "Demande rejetée";
    });
});
