// ============================================================
// CRM Fiori Annotations — ListReport & ObjectPage
// ============================================================

using CRMService from '../../../srv/crm/crm-service';

// ────────────────────────────────────────────
// CLIENTS B2B — List Report Columns
// ────────────────────────────────────────────
annotate CRMService.ClientsB2B with @(
  UI.SelectionFields: [ companyName, status, wilaya, sector ],

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: companyName,  Label: 'Entreprise' },
    { $Type: 'UI.DataField', Value: email,        Label: 'Email' },
    { $Type: 'UI.DataField', Value: phone,        Label: 'Téléphone' },
    { $Type: 'UI.DataField', Value: wilaya,       Label: 'Wilaya' },
    { $Type: 'UI.DataField', Value: sector,       Label: 'Secteur' },
    { $Type: 'UI.DataField', Value: status,      Label: 'Statut' }
  ],

  UI.HeaderInfo: {
    TypeName: 'Client B2B',
    TypeNamePlural: 'Clients B2B',
    Title: { Value: companyName },
    Description: { Value: sector }
  },

  UI.FieldGroup#General: {
    $Type: 'UI.FieldGroupType',
    Label: 'Informations Générales',
    Data: [
      { $Type: 'UI.DataField', Value: companyName, Label: 'Raison Sociale' },
      { $Type: 'UI.DataField', Value: legalForm,   Label: 'Forme Juridique' },
      { $Type: 'UI.DataField', Value: sector,      Label: 'Secteur' },
      { $Type: 'UI.DataField', Value: rc,          Label: 'RC' },
      { $Type: 'UI.DataField', Value: nif,         Label: 'NIF' },
      { $Type: 'UI.DataField', Value: nis,         Label: 'NIS' },
      { $Type: 'UI.DataField', Value: ai,          Label: 'Article Imposition' }
    ]
  },

  UI.FieldGroup#Contact: {
    $Type: 'UI.FieldGroupType',
    Label: 'Contact',
    Data: [
      { $Type: 'UI.DataField', Value: contactName, Label: 'Nom Contact' },
      { $Type: 'UI.DataField', Value: contactRole, Label: 'Fonction' },
      { $Type: 'UI.DataField', Value: email,       Label: 'Email' },
      { $Type: 'UI.DataField', Value: phone,       Label: 'Téléphone' }
    ]
  },

  UI.FieldGroup#Address: {
    $Type: 'UI.FieldGroupType',
    Label: 'Adresse',
    Data: [
      { $Type: 'UI.DataField', Value: street,     Label: 'Rue' },
      { $Type: 'UI.DataField', Value: city,       Label: 'Ville' },
      { $Type: 'UI.DataField', Value: wilaya,     Label: 'Wilaya' },
      { $Type: 'UI.DataField', Value: postalCode, Label: 'Code Postal' }
    ]
  },

  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',
      ID: 'General',
      Label: 'Général',
      Target: '@UI.FieldGroup#General'
    },
    {
      $Type: 'UI.ReferenceFacet',
      ID: 'Contact',
      Label: 'Contact',
      Target: '@UI.FieldGroup#Contact'
    },
    {
      $Type: 'UI.ReferenceFacet',
      ID: 'Address',
      Label: 'Adresse',
      Target: '@UI.FieldGroup#Address'
    },
    {
      $Type: 'UI.ReferenceFacet',
      ID: 'Documents',
      Label: 'Documents',
      Target: 'documents/@UI.LineItem'
    },
    {
      $Type: 'UI.ReferenceFacet',
      ID: 'Devis',
      Label: 'Devis',
      Target: 'devis/@UI.LineItem'
    }
  ]
);

// ────────────────────────────────────────────
// DOCUMENTS CLIENTS
// ────────────────────────────────────────────
annotate CRMService.ClientDocuments with @(
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: docType,  Label: 'Type de document' },
    { $Type: 'UI.DataField', Value: fileName, Label: 'Nom du fichier' },
    { $Type: 'UI.DataField', Value: verified, Label: 'Vérifié' }
  ]
);

// ────────────────────────────────────────────
// DEVIS — List + Object Page
// ────────────────────────────────────────────
annotate CRMService.Devis with @(
  UI.SelectionFields: [ status, date ],

  UI.LineItem: [
    { $Type: 'UI.DataField', Value: devisNumber, Label: 'N° Devis' },
    { $Type: 'UI.DataField', Value: clientB2B.companyName, Label: 'Client' },
    { $Type: 'UI.DataField', Value: date,        Label: 'Date' },
    { $Type: 'UI.DataField', Value: validUntil,  Label: 'Valable jusqu''au' },
    { $Type: 'UI.DataField', Value: totalTTC,    Label: 'Montant TTC' },
    { $Type: 'UI.DataField', Value: currency_code, Label: 'Devise' },
    { $Type: 'UI.DataField', Value: status,      Label: 'Statut' }
  ],

  UI.HeaderInfo: {
    TypeName: 'Devis',
    TypeNamePlural: 'Devis',
    Title: { Value: devisNumber },
    Description: { Value: status }
  },

  UI.FieldGroup#DevisHeader: {
    Label: 'En-tête',
    Data: [
      { $Type: 'UI.DataField', Value: devisNumber,  Label: 'Numéro' },
      { $Type: 'UI.DataField', Value: date,          Label: 'Date' },
      { $Type: 'UI.DataField', Value: validUntil,    Label: 'Valable jusqu''au' },
      { $Type: 'UI.DataField', Value: status,        Label: 'Statut' },
      { $Type: 'UI.DataField', Value: totalHT,       Label: 'Total HT' },
      { $Type: 'UI.DataField', Value: totalTVA,      Label: 'TVA (19%)' },
      { $Type: 'UI.DataField', Value: totalTTC,      Label: 'Total TTC' },
      { $Type: 'UI.DataField', Value: currency_code, Label: 'Devise' }
    ]
  },

  UI.Facets: [
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'En-tête',
      Target: '@UI.FieldGroup#DevisHeader'
    },
    {
      $Type: 'UI.ReferenceFacet',
      Label: 'Lignes',
      Target: 'items/@UI.LineItem'
    }
  ]
);

// ────────────────────────────────────────────
// DEVIS ITEMS — Line items table
// ────────────────────────────────────────────
annotate CRMService.DevisItems with @(
  UI.LineItem: [
    { $Type: 'UI.DataField', Value: lineNumber,  Label: 'N°' },
    { $Type: 'UI.DataField', Value: description, Label: 'Description' },
    { $Type: 'UI.DataField', Value: quantity,    Label: 'Qté' },
    { $Type: 'UI.DataField', Value: unit,        Label: 'Unité' },
    { $Type: 'UI.DataField', Value: unitPrice,   Label: 'Prix Unitaire' },
    { $Type: 'UI.DataField', Value: tvaRate,     Label: 'TVA%' },
    { $Type: 'UI.DataField', Value: totalHT,     Label: 'Total HT' },
    { $Type: 'UI.DataField', Value: totalTTC,    Label: 'Total TTC' }
  ]
);
