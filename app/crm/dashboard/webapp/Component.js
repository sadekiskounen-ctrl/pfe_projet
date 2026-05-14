sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";
  return UIComponent.extend("gestionpme.crm.dashboard.Component", {
    metadata: { manifest: "json" },
    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      this._loadKPIs();
    },
    _loadKPIs: async function () {
      const oModel = this.getModel("kpi");
      try {
        const res = await fetch("/odata/v4/analytics/getCRMDashboard()");
        const data = await res.json();
        oModel.setData(data);
      } catch (e) {
        console.warn("KPI load failed:", e);
        // Set mock data for development
        oModel.setData({
          totalClients: 5, totalClientsB2B: 3, totalClientsB2C: 2,
          activeClients: 2, totalDevis: 0, devisEnCours: 0,
          totalCommandes: 0, commandesEnCours: 0, totalFactures: 0,
          facturesImpayees: 0, chiffreAffaireMois: 0, chiffreAffaireAnnee: 0,
          totalPaiements: 0, tauxConversion: 0
        });
      }
    }
  });
});
