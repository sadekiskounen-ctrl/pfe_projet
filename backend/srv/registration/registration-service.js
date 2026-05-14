const cds = require('@sap/cds');

module.exports = class RegistrationService extends cds.ApplicationService {
    async init() {
        await super.init();
        const { SubmitRegistration, RegistrationRequests } = this.entities;

        this.before('CREATE', SubmitRegistration, async (req) => {
            req.data.status = 'PENDING';
        });

        this.on('approveRegistration', async (req) => {
            const { id } = req.data;
            const tx = cds.tx(req);
            
            const request = await tx.run(SELECT.one.from(RegistrationRequests).where({ ID: id }));
            if (!request) return req.error(404, 'Demande introuvable');
            if (request.status !== 'PENDING') return req.error(400, 'Demande déjà traitée');

            try {
                // 1. Création du Business Partner
                const { BusinessPartner } = cds.entities('sap.pme');
                // Génération d'un numéro de BP (simplifié pour l'exemple)
                const bpNumber = 'BP-' + Math.floor(Math.random() * 90000 + 10000);
                
                const [bp] = await tx.run(INSERT.into(BusinessPartner).entries({
                    bpNumber: bpNumber,
                    bpType: request.type,
                    displayName: request.companyName,
                    email: request.email,
                    phone: request.phone,
                    status: 'ACTIVE'
                }));

                // 2. Création de l'entité CRM ou SRM correspondante
                if (request.type === 'CLIENT_B2B') {
                    const { ClientB2B, ClientDocument } = cds.entities('sap.pme.crm');
                    await tx.run(INSERT.into(ClientB2B).entries({
                        bp_ID: bp.ID,
                        companyName: request.companyName,
                        email: request.email,
                        phone: request.phone,
                        status: 'ACTIVE'
                    }));
                    // Note: En réalité, on copierait aussi les documents
                } else if (request.type === 'FOURNISSEUR') {
                    const { Fournisseur } = cds.entities('sap.pme.srm');
                    await tx.run(INSERT.into(Fournisseur).entries({
                        bp_ID: bp.ID,
                        companyName: request.companyName,
                        email: request.email,
                        phone: request.phone,
                        status: 'ACTIVE',
                        kycStatus: 'VALIDATED'
                    }));
                }

                // 3. Marquer la demande comme approuvée
                await tx.run(UPDATE(RegistrationRequests).set({ status: 'APPROVED' }).where({ ID: id }));

                // 4. TODO: Notification email à l'utilisateur
                
                return `L'inscription de ${request.companyName} a été approuvée et le compte créé.`;
            } catch (err) {
                console.error(err);
                return req.error(500, "Erreur lors de la création du compte : " + err.message);
            }
        });

        this.on('rejectRegistration', async (req) => {
            const { id, reason } = req.data;
            const tx = cds.tx(req);
            await tx.run(UPDATE(RegistrationRequests).set({ status: 'REJECTED', adminComment: reason }).where({ ID: id }));
            return "L'inscription a été rejetée.";
        });
    }
}
