sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("gestionpme.admin.dashboard.controller.App", {

    onInit: function () {
      // Load admin KPIs on init
      this._loadAdminKPIs();
      // Filter BP table to show all (or filter by status PENDING)
      this._applyBPFilter();
    },

    _loadAdminKPIs: async function () {
      const oKpiModel = this.getOwnerComponent().getModel("kpi");
      try {
        const res = await fetch("/odata/v4/analytics/getAdminDashboard()");
        const data = await res.json();
        oKpiModel.setData(data);
      } catch (e) {
        oKpiModel.setData({
          totalBusinessPartners: 8, bpEnAttente: 2,
          totalDocuments: 0, systemHealth: "OK"
        });
      }
    },

    _applyBPFilter: function () {
      const oTable = this.byId("bpPendingTable");
      if (oTable) {
        const oBinding = oTable.getBinding("items");
        if (oBinding) {
          const oFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "PENDING");
          oBinding.filter([oFilter]);
        }
      }
    },

    onRefresh: function () {
      this._loadAdminKPIs();
      this.byId("bpPendingTable")?.getBinding("items")?.refresh();
      this.byId("auditTable")?.getBinding("items")?.refresh();
      MessageToast.show("Données actualisées");
    },

    onActivateBP: async function (oEvent) {
      const oItem = oEvent.getSource().getParent().getParent();
      const oCtx = oItem.getBindingContext("admin");
      const bpId = oCtx.getObject().ID;
      const bpName = oCtx.getObject().displayName;

      MessageBox.confirm(`Activer le partenaire "${bpName}" ?`, {
        title: "Confirmation",
        onClose: async (sAction) => {
          if (sAction === "OK") {
            try {
              await fetch("/odata/v4/admin/activateBusinessPartner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bpId })
              });
              MessageToast.show(`"${bpName}" activé avec succès`);
              this.onRefresh();
            } catch (e) {
              MessageBox.error(`Erreur: ${e.message}`);
            }
          }
        }
      });
    },

    onBlockBP: function (oEvent) {
      const oItem = oEvent.getSource().getParent().getParent();
      const oCtx = oItem.getBindingContext("admin");
      const bpId = oCtx.getObject().ID;
      const bpName = oCtx.getObject().displayName;

      MessageBox.confirm(`Bloquer le partenaire "${bpName}" ?`, {
        title: "Blocage",
        onClose: async (sAction) => {
          if (sAction === "OK") {
            try {
              await fetch("/odata/v4/admin/blockBusinessPartner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bpId, reason: "Bloqué par administrateur" })
              });
              MessageToast.show(`"${bpName}" bloqué`);
              this.onRefresh();
            } catch (e) {
              MessageBox.error(`Erreur: ${e.message}`);
            }
          }
        }
      });
    },

    onAddUser:          function () { MessageToast.show("Fonctionnalité: Ajouter utilisateur"); },
    onNavDashboard:     function () { window.location.href = "/admin/dashboard/webapp/index.html"; },
    onNavBP:            function () { 
      const oTable = this.byId("bpPendingTable");
      oTable.getBinding("items").filter([]);
      MessageToast.show("Affichage de tous les Business Partners");
    },
    onNavClientsB2B:    function () { window.location.href = "/crm/clients/webapp/index.html"; },
    onNavFournisseurs:  function () { window.location.href = "/srm/fournisseurs/webapp/index.html"; },
    onNavProduits:      function () { MessageToast.show("Gestion des produits en développement"); },
    onNavAuditLogs:     function () { 
      this.byId("auditTable")?.getBinding("items")?.refresh(); 
      MessageToast.show("Logs d'audit actualisés");
    },
    onNavNotifications: function () { MessageToast.show("Aucune nouvelle notification"); },
    onNavConfig:        function () { MessageToast.show("Configuration système bloquée en environnement de test"); }
  });
});
