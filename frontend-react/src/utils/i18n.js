export const translations = {
  FR: {
    // Sidebar
    overview: "Vue d'ensemble",
    partners: "Clients",
    suppliers: "Fournisseurs",
    registrations: "Inscriptions",
    commandes: "Bons de Commande",
    factures: "Factures",
    catalogue: "Catalogue Produits",
    devis: "Demandes de Devis",
    rfqs: "Appels d'offres (RFQ)",
    settings: "Paramètres",
    logout: "Déconnexion",
    admin: "ADMINISTRATEUR",

    // General Actions & Common Buttons
    actions: "Actions",
    status: "Statut",
    close: "Fermer la fiche",
    closeModal: "Fermer",
    approve: "Approuver",
    reject: "Rejeter",
    save: "Enregistrer",
    cancel: "Annuler",
    add: "Ajouter",
    delete: "Supprimer",
    edit: "Modifier",
    search: "Rechercher...",
    create: "Créer",
    pdf: "PDF",
    ok: "OK",
    yes: "Oui",
    no: "Non",
    loading: "Chargement...",
    error: "Erreur",
    success: "Succès",

    // Statuses
    draft: "Brouillon",
    sent: "Envoyé",
    sent_to_client: "Envoyé au client",
    pending: "En attente",
    confirmed: "Confirmé",
    approved: "Approuvé",
    rejected: "Rejeté",
    cancelled: "Annulé",
    delivered: "Livré",
    paid: "Payée",
    unpaid: "Impayée",
    partial: "Partiel",
    validated: "Validé",
    matched: "Rapproché",
    discrepancy: "Écart / Litige",
    active: "Actif",
    inactive: "Inactif",

    // Table Headers / Labels
    name: "Nom / Raison Sociale",
    email: "Email",
    phone: "Téléphone",
    address: "Adresse",
    wilaya: "Wilaya",
    sector: "Secteur",
    rating: "Note / Confiance",
    kyc: "Statut KYC",
    rc: "Registre de Commerce (RC)",
    nif: "NIF",
    rib: "RIB",
    invoiceNo: "N° Facture",
    orderNo: "N° Commande",
    devisNo: "N° Devis",
    rfqNo: "N° RFQ",
    date: "Date",
    amountHT: "Montant HT",
    tva: "TVA",
    totalTTC: "Total TTC",
    subject: "Objet",
    deadline: "Date limite",
    matchStatus: "Rapprochement",
    currentStock: "Stock Actuel",
    minStock: "Stock Min",
    priceHT: "Prix HT",
    sku: "Code Article / SKU",
    details: "Détails",
    addArticle: "+ Ajouter un Article",

    // Overview KPIs
    caMensuel: "CA Mensuel",
    ventesDe: "Ventes de ",
    encoursClients: "En-cours Clients",
    facturesImpayees: "Factures clients impayées",
    clientsActifs: "Clients Actifs",
    profilsActifs: "Profils B2B & B2C actifs",
    suppliersCount: "Fournisseurs SRM",
    partenairesActifs: "Partenaires SRM actifs",
    dailyRevTitle: "📊 Chiffre d'Affaires Journalier",
    legendLine: "Ligne CA",
    legendVolume: "Volume",
    noDataMonth: "Aucune donnée pour ce mois",
    totalMois: "Total du mois",
    moyenneJour: "Moyenne/jour",
    picJour: "Pic (Jour ",
    criticalAlerts: "Alertes Critiques",
    allClear: "Tout est en ordre !",
    resolve: "RÉSOUDRE",
    topClients: "Top Clients",
    topSuppliers: "Top Fournisseurs",
    topProducts: "Top Articles Vendus",
    noData: "Aucune donnée"
  }
};

export const getStatusLabel = (status, lang = "FR") => {
  if (!status) return "";
  const key = String(status).toLowerCase();
  const dict = translations[lang] || translations["FR"];
  return dict[key] || status;
};

export const translateUI = (key, lang = "FR") => {
  const dict = translations[lang] || translations["FR"];
  return dict[key] || key;
};
