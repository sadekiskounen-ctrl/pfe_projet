const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
    // On utilise les vrais namespaces définis dans vos fichiers CDS
    // Accès aux entités globales via cds.entities
    const FactureClient = 'sap.pme.doc.FactureClient';
    const BonCommandeFournisseur = 'sap.pme.doc.BonCommandeFournisseur';
    const BusinessPartner = 'sap.pme.BusinessPartner';
    const RegistrationRequest = 'pme.registration.RegistrationRequest';

    // --- KPIs GLOBAUX ---
    this.on('getGlobalStats', async (req) => {
        const { month, year } = req.data;
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
        
        try {
            // Requête SQL directe pour HANA
            const revenue = await SELECT.from(FactureClient)
                .columns('sum(totalTTC) as total')
                .where(`date >= '${startDate}' AND date <= '${endDate}'`);
            
            const clients = await SELECT.from(BusinessPartner).where({ status: 'ACTIVE' });
            const pending = await SELECT.from(RegistrationRequest).where({ status: 'PENDING' });

            return {
                totalRevenue: revenue[0].total || 0,
                marginPercent: 32.0,
                activeClients: clients.length,
                dso: 28,
                pendingRegistrations: pending.length
            };
        } catch (e) {
            console.error("[Analytics] Error:", e);
            throw e;
        }
    });

    // --- TOP 5 CLIENTS ---
    this.on('getTopClients', async (req) => {
        const top = await SELECT.from(FactureClient)
            .columns('clientB2B.companyName as name', 'sum(totalTTC) as value')
            .groupBy('clientB2B.companyName')
            .orderBy('sum(totalTTC) desc')
            .limit(5);
        return (top || []).map((item, index) => ({
            name: item.name || 'Client Divers',
            value: item.value || 0,
            rank: index + 1
        }));
    });

    // --- TOP 5 FOURNISSEURS ---
    this.on('getTopSuppliers', async (req) => {
        const top = await SELECT.from(BonCommandeFournisseur)
            .columns('fournisseur.companyName as name', 'sum(totalTTC) as value')
            .groupBy('fournisseur.companyName')
            .orderBy('sum(totalTTC) desc')
            .limit(5);
        return (top || []).map((item, index) => ({
            name: item.name || 'Fournisseur Inconnu',
            value: item.value ? 4.5 : 0, 
            rank: index + 1
        }));
    });

    // --- GRAPHIQUE JOURNALIER ---
    this.on('getDailyRevenue', async (req) => {
        const { month, year } = req.data;
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;

        const trend = await SELECT.from(FactureClient)
            .columns('date', 'sum(totalTTC) as value')
            .where(`date >= '${startDate}' AND date <= '${endDate}'`)
            .groupBy('date')
            .orderBy('date');

        const result = [];
        for (let i = 1; i <= lastDay; i++) {
            const dayStr = `${year}-${month.padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const found = trend.find(t => t.date === dayStr);
            result.push({ day: `${i}`, value: found ? found.value : 0 });
        }
        return result;
    });
});
