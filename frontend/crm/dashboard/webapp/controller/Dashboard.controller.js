sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";

  return Controller.extend("gestionpme.crm.dashboard.controller.Dashboard", {

    onInit: function () {
      // Bind CRM service for recent clients table
      const oModel = this.getOwnerComponent().getModel();
      this.getView().setModel(oModel);
    },

    onRefresh: function () {
      // Reload KPIs
      this.getOwnerComponent()._loadKPIs();
      // Reload table
      this.byId("recentClientsTable").getBinding("items").refresh();
      MessageToast.show("Données actualisées");
    },

    onClientsTilePress: function () {
      // Navigate to clients list
      MessageToast.show("Redirection vers la liste des clients...");
    }
  });
});
