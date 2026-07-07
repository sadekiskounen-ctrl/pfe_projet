const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
    const FactureClient = 'sap.pme.doc.FactureClient';
    const FactureClientItem = 'sap.pme.doc.FactureClientItem';
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
            // ── CA Mensuel ──────────────────────────────────────────────────────────────
            // Formule : CA = Σ (Prix de vente unitaire HT × Quantités vendues)
            // Source  : FactureClientItem (lignes d'articles des factures B2B + B2C)
            // Périmètre : factures du mois sélectionné, hors DRAFT et CANCELLED
            const facturesDuMois = await SELECT
                .from(FactureClient)
                .columns('ID')
                .where(`date >= '${startDate}' AND date <= '${endDate}' AND status != 'DRAFT' AND status != 'CANCELLED'`);

            let totalRevenue = 0;

            if (facturesDuMois.length > 0) {
                const factureIds = facturesDuMois.map(f => f.ID);
                const lignes = await SELECT
                    .from(FactureClientItem)
                    .columns('unitPrice', 'quantity')
                    .where({ parent_ID: { in: factureIds } });

                lignes.forEach(ligne => {
                    // CA ligne = Prix unitaire HT × Quantité vendue
                    totalRevenue += parseFloat(ligne.unitPrice || 0) * parseFloat(ligne.quantity || 0);
                });
            }

            // En-cours Clients (Revenus attendus globaux) : somme des restes à payer de TOUTES les factures client impayées/partiellement payées
            const unpaidInvoices = await SELECT.from(FactureClient).where("status != 'PAID' AND status != 'CANCELLED' AND status != 'DRAFT'");
            let encoursClients = 0;
            unpaidInvoices.forEach(f => {
                const unpaidAmt = f.remainingAmount !== null && f.remainingAmount !== undefined
                    ? parseFloat(f.remainingAmount)
                    : (parseFloat(f.totalTTC || 0) - parseFloat(f.paidAmount || 0));
                encoursClients += unpaidAmt;
            });

            // Ajouter également les montants des commandes confirmées/en cours qui n'ont pas encore été facturées
            const CommandeClient = 'sap.pme.doc.CommandeClient';
            if (cds.entities[CommandeClient]) {
                const unpaidOrders = await SELECT.from(CommandeClient).where("status != 'PAID' AND status != 'CANCELLED' AND status != 'DRAFT' AND (invoiced = false OR invoiced is null)");
                unpaidOrders.forEach(c => {
                    encoursClients += parseFloat(c.totalTTC || 0);
                });
            }
            
            // Délais Fournisseurs (Moyenne des jours entre date de commande et livraison)
            const commandes = await SELECT.from(BonCommandeFournisseur).where(`date >= '${startDate}' AND date <= '${endDate}'`);
            let totalDays = 0;
            let validOrders = 0;
            
            commandes.forEach(c => {
                if (c.date && c.deliveryDate) {
                    const diffTime = Math.abs(new Date(c.deliveryDate) - new Date(c.date));
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    totalDays += diffDays;
                    validOrders++;
                }
            });
            const delaisFournisseurs = validOrders > 0 ? Math.round(totalDays / validOrders) : 0;
            
            const clients = await SELECT.from(BusinessPartner).where({ status: 'ACTIVE', bpType: { 'in': ['CLIENT_B2B', 'CLIENT_B2C'] } });
            const pending = await SELECT.from(RegistrationRequest).where({ status: 'PENDING' });

            return {
                totalRevenue: totalRevenue,
                marginPercent: 32.0, // KPI fictif (à remplacer si besoin)
                activeClients: clients.length,
                encoursClients: encoursClients,
                delaisFournisseurs: delaisFournisseurs,
                pendingRegistrations: pending.length
            };
        } catch (e) {
            console.error("[Analytics] Error:", e);
            throw e;
        }
    });

    // --- TOP 5 CLIENTS (B2B & B2C) ---
    this.on('getTopClients', async (req) => {
        const factures = await SELECT.from(FactureClient).columns(f => {
            f.totalTTC;
            f.clientB2B(b => { b.companyName });
            f.clientB2C(c => { c.firstName; c.lastName; c.fullName });
        });

        const clientMap = {};
        factures.forEach(f => {
            let name = 'Client Divers';
            if (f.clientB2B && f.clientB2B.companyName) {
                name = f.clientB2B.companyName;
            } else if (f.clientB2C) {
                name = f.clientB2C.fullName || `${f.clientB2C.firstName} ${f.clientB2C.lastName || ''}`.trim() || 'Client Divers';
            }
            
            clientMap[name] = (clientMap[name] || 0) + (parseFloat(f.totalTTC) || 0);
        });

        const sorted = Object.entries(clientMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return sorted.map((item, index) => ({
            name: item.name,
            value: item.value,
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
            value: item.value || 0, 
            rank: index + 1
        }));
    });

    // --- TOP PRODUITS ---
    this.on('getTopProducts', async (req) => {
        const top = await SELECT.from(FactureClientItem)
            .columns('product.name as name', 'sum(totalTTC) as value')
            .groupBy('product.name')
            .orderBy('sum(totalTTC) desc')
            .limit(5);
        return (top || []).map((item, index) => ({
            name: item.name || 'Produit Inconnu',
            value: item.value || 0,
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
            .columns('date', 'sum(totalHT) as value')
            .where(`date >= '${startDate}' AND date <= '${endDate}' AND status != 'DRAFT' AND status != 'CANCELLED'`)
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

    // --- ADMIN DASHBOARD ---
    this.on('getAdminDashboard', async (req) => {
        try {
            const bps = await SELECT.from(BusinessPartner);
            const pending = await SELECT.from(RegistrationRequest).where({ status: 'PENDING' });
            return {
                totalBusinessPartners: bps.length,
                bpEnAttente: pending.length,
                totalDocuments: 150, // Fictive data for documents
                systemHealth: "OK"
            };
        } catch (e) {
            console.error("[Analytics] Admin Dashboard Error:", e);
            throw e;
        }
    });

    // --- CRM DASHBOARD ---
    this.on('getCRMDashboard', async (req) => {
        try {
            const clients = await SELECT.from(BusinessPartner).where({ bpType: { 'in': ['CLIENT_B2B', 'CLIENT_B2C'] } });
            const clientsB2B = clients.filter(c => c.bpType === 'CLIENT_B2B');
            const clientsB2C = clients.filter(c => c.bpType === 'CLIENT_B2C');
            const activeClients = clients.filter(c => c.status === 'ACTIVE');
            
            return {
                totalClients: clients.length,
                totalClientsB2B: clientsB2B.length,
                totalClientsB2C: clientsB2C.length,
                activeClients: activeClients.length,
                totalDevis: 0,
                devisEnCours: 0,
                totalCommandes: 0,
                commandesEnCours: 0,
                totalFactures: 0,
                facturesImpayees: 0,
                chiffreAffaireMois: 0,
                chiffreAffaireAnnee: 0,
                totalPaiements: 0,
                tauxConversion: 0
            };
        } catch (e) {
            console.error("[Analytics] CRM Dashboard Error:", e);
            throw e;
        }
    });
});
