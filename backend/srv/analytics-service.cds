

@readonly
@auth: 'none'
service AnalyticsService @(path: '/odata/v4/analytics') {

    type DashboardStats {
        totalRevenue: Decimal(15,2);
        marginPercent: Decimal(5,2);
        activeClients: Integer;
        dso: Integer;
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

    function getGlobalStats(month: String, year: String) returns DashboardStats;
    function getTopClients() returns many TopItem;
    function getTopSuppliers() returns many TopItem;
    function getDailyRevenue(month: String, year: String) returns many DailyTrend;
}
