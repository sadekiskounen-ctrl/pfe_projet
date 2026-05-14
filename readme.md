# 🏢 Gestion PME/Startups — SAP BTP

> Solution Cloud de Gestion des Clients et des Fournisseurs pour les Startups et PME basée sur SAP Business Technology Platform (SAP BTP)

## 📋 Description

Plateforme SaaS moderne pour la gestion intégrée :
- **CRM** : Clients B2B/B2C, Devis, Commandes, Factures, Paiements
- **SRM** : Fournisseurs, KYC, RFQ, Bons de Commande, Réceptions, 3-Way Match
- **Admin** : Backoffice, Audit, KPI, Notifications

## 🛠️ Stack Technique

| Couche | Technologie |
|--------|------------|
| Backend | SAP CAP (Node.js) + OData V4 |
| Frontend | SAPUI5 / Fiori Elements |
| Database | SAP HANA Cloud |
| Auth | SAP XSUAA (OAuth2 + JWT) |
| Workflow | SAP Build Process Automation |
| Déploiement | Cloud Foundry (MTA) |

## 📁 Structure Projet

```
gestion-pme/
├── app/          → Frontend Fiori (CRM, SRM, Admin)
│   └── router/   → SAP Approuter
├── db/           → Modèles CDS & données
│   ├── schema/   → Entités métier
│   └── data/     → Données de test (CSV)
├── srv/          → Services OData V4
│   ├── crm/      → Service CRM
│   ├── srm/      → Service SRM
│   ├── admin/    → Service Admin
│   └── analytics/→ Service Analytique
└── test/         → Tests unitaires
```

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en mode développement (SQLite)
npm run dev
# ou
cds watch

# 3. Accéder aux services
# → http://localhost:4004
```

## 👤 Utilisateurs de test (dev)

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@pme.dz | admin | Admin |
| commercial@pme.dz | commercial | Commercial |
| clientb2b@pme.dz | client | Client B2B |
| clientb2c@pme.dz | client | Client B2C |
| fournisseur@pme.dz | fournisseur | Fournisseur |

## 📦 Déploiement (Cloud Foundry)

```bash
# Build MTA
mbt build

# Deploy
cf deploy mta_archives/gestion-pme_1.0.0.mtar
```

## 📄 Services OData

| Service | Path | Description |
|---------|------|-------------|
| CRM | `/odata/v4/crm` | Gestion clients, devis, commandes, factures |
| SRM | `/odata/v4/srm` | Gestion fournisseurs, RFQ, achats |
| Admin | `/odata/v4/admin` | Administration, audit, config |
| Analytics | `/odata/v4/analytics` | KPI et dashboards |

## 📐 Architecture

- **Clean Core** — Aucune modification du core SAP
- **Side-by-Side** — Extensions 100% sur BTP
- **Microservices** — Services CAP modulaires
- **RBAC** — 5 rôles (Admin, Commercial, ClientB2B, ClientB2C, Fournisseur)

---

> Projet de Fin d'Études — 2025/2026
