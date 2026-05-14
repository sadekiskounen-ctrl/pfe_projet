// ============================================================
// SRM Fiori Annotations — Fournisseurs, RFQ
// ============================================================

using SRMService from '../../../srv/srm/srm-service';

// ────────────────────────────────────────────
// FOURNISSEURS — List Report
// ────────────────────────────────────────────
annotate SRMService.Fournisseurs with @(
  UI.SelectionFields: [ companyName, kycStatus, status, rating, wilaya ],

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: companyName,  Label: 'Fournisseur' },
    { $Type: 'UI.DataField', Value: sector,       Label: 'Secteur' },
    { $Type: 'UI.DataField', Value: wilaya,       Label: 'Wilaya' },
    { $Type: 'UI.DataField', Value: kycStatus,    Label: 'KYC' },
    { $Type: 'UI.DataField', Value: rating,       Label: 'Note' },
    { $Type: 'UI.DataField', Value: score,        Label: 'Score' },
    { $Type: 'UI.DataField', Value: status,       Label: 'Statut' }
  ],

  UI.HeaderInfo: {
    TypeName: 'Fournisseur',
    TypeNamePlural: 'Fournisseurs',
    Title: { Value: companyName },
    Description: { Value: sector }
  },

  UI.FieldGroup#FrsGeneral: {
    Label: 'Informations Générales',
    Data: [
      { $Type: 'UI.DataField', Value: companyName,  Label: 'Raison Sociale' },
      { $Type: 'UI.DataField', Value: legalForm,    Label: 'Forme Juridique' },
      { $Type: 'UI.DataField', Value: sector,       Label: 'Secteur' },
      { $Type: 'UI.DataField', Value: rc,           Label: 'RC' },
      { $Type: 'UI.DataField', Value: nif,          Label: 'NIF' },
      { $Type: 'UI.DataField', Value: categories,   Label: 'Catégories' }
    ]
  },

  UI.FieldGroup#FrsContact: {
    Label: 'Contact',
    Data: [
      { $Type: 'UI.DataField', Value: contactName, Label: 'Contact' },
      { $Type: 'UI.DataField', Value: contactRole, Label: 'Fonction' },
      { $Type: 'UI.DataField', Value: email,       Label: 'Email' },
      { $Type: 'UI.DataField', Value: phone,       Label: 'Téléphone' }
    ]
  },

  UI.FieldGroup#FrsBanking: {
    Label: 'Informations Bancaires',
    Data: [
      { $Type: 'UI.DataField', Value: bankName, Label: 'Banque' },
      { $Type: 'UI.DataField', Value: rib,      Label: 'RIB' }
    ]
  },

  UI.FieldGroup#FrsKYC: {
    Label: 'KYC & Notation',
    Data: [
      { $Type: 'UI.DataField', Value: kycStatus,    Label: 'Statut KYC' },
      { $Type: 'UI.DataField', Value: kycDate,      Label: 'Date KYC' },
      { $Type: 'UI.DataField', Value: rating,       Label: 'Note (A-D)' },
      { $Type: 'UI.DataField', Value: score,        Label: 'Score (0-100)' },
      { $Type: 'UI.DataField', Value: leadTimeDays, Label: 'Délai livraison (jours)' },
      { $Type: 'UI.DataField', Value: paymentTerms, Label: 'Conditions paiement' }
    ]
  },

  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Général',
      Target: '@UI.FieldGroup#FrsGeneral'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Contact',
      Target: '@UI.FieldGroup#FrsContact'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'KYC & Notation',
      Target: '@UI.FieldGroup#FrsKYC'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Informations Bancaires',
      Target: '@UI.FieldGroup#FrsBanking'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Documents KYC',
      Target: 'kycDocuments/@UI.LineItem'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Évaluations',
      Target: 'evaluations/@UI.LineItem'
    }
  ]
);

// ────────────────────────────────────────────
// DOCUMENTS KYC
// ────────────────────────────────────────────
annotate SRMService.FournisseurDocuments with @(
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: docType,  Label: 'Type de document' },
    { $Type: 'UI.DataField', Value: fileName, Label: 'Nom du fichier' },
    { $Type: 'UI.DataField', Value: verified, Label: 'Vérifié' }
  ]
);

// ────────────────────────────────────────────
// RFQ — List + Object Page
// ────────────────────────────────────────────
annotate SRMService.RFQs with @(
  UI.SelectionFields: [ status, date ],

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: rfqNumber,              Label: 'N° RFQ' },
    { $Type: 'UI.DataField', Value: title,                  Label: 'Titre' },
    { $Type: 'UI.DataField', Value: fournisseur.companyName, Label: 'Fournisseur' },
    { $Type: 'UI.DataField', Value: date,                   Label: 'Date' },
    { $Type: 'UI.DataField', Value: deadline,               Label: 'Deadline' },
    { $Type: 'UI.DataField', Value: totalBudget,            Label: 'Budget' },
    { $Type: 'UI.DataField', Value: status,                 Label: 'Statut' }
  ],

  UI.HeaderInfo: {
    TypeName: 'Appel d''Offres (RFQ)',
    TypeNamePlural: 'Appels d''Offres',
    Title: { Value: rfqNumber },
    Description: { Value: title }
  },

  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Lignes',
      Target: 'items/@UI.LineItem'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Réponses',
      Target: 'responses/@UI.LineItem'
    }
  ]
);

// ── Evaluations table ──
annotate SRMService.Evaluations with @(
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: date,           Label: 'Date' },
    { $Type: 'UI.DataField', Value: qualityScore,   Label: 'Qualité /20' },
    { $Type: 'UI.DataField', Value: deliveryScore,  Label: 'Livraison /20' },
    { $Type: 'UI.DataField', Value: priceScore,     Label: 'Prix /20' },
    { $Type: 'UI.DataField', Value: serviceScore,   Label: 'Service /20' },
    { $Type: 'UI.DataField', Value: complianceScore,Label: 'Conformité /20' },
    { $Type: 'UI.DataField', Value: totalScore,     Label: 'Score Total' },
    { $Type: 'UI.DataField', Value: rating,         Label: 'Note' }
  ]
);
