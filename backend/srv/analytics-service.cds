

@readonly
@requires: ['Admin', 'Commercial']
service AnalyticsService @(path: '/odata/v4/analytics') {

    type DashboardStats {
        totalRevenue: Decimal(15,2);
        marginPercent: Decimal(5,2);
        activeClients: Integer;
        encoursClients: Decimal(15,2);
        delaisFournisseurs: Integer;
        pendingRegistrations: Integer;
    }

    type TopItem {
        name: String;
        value: Decimal(15,2);
        rank: Integer;
    }

    type DailyTrend {
        day: String;
        value: Decimal(15,2);
    }

    type AdminDashboardStats {
        totalBusinessPartners: Integer;
        bpEnAttente: Integer;
        totalDocuments: Integer;
        systemHealth: String;
    }

    type CRMDashboardStats {
        totalClients: Integer;
        totalClientsB2B: Integer;
        totalClientsB2C: Integer;
        activeClients: Integer;
        totalDevis: Integer;
        devisEnCours: Integer;
        totalCommandes: Integer;
        commandesEnCours: Integer;
        totalFactures: Integer;
        facturesImpayees: Integer;
        chiffreAffaireMois: Decimal(15,2);
        chiffreAffaireAnnee: Decimal(15,2);
        totalPaiements: Integer;
        tauxConversion: Decimal(5,2);
    }

    function getGlobalStats(month: String, year: String) returns DashboardStats;
    function getTopClients() returns many TopItem;
    function getTopSuppliers() returns many TopItem;
    function getTopProducts() returns many TopItem;
    function getDailyRevenue(month: String, year: String) returns many DailyTrend;
    function getAdminDashboard() returns AdminDashboardStats;
    function getCRMDashboard() returns CRMDashboardStats;
}
