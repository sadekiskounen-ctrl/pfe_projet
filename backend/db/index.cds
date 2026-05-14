// ============================================================
// Database Index — Point d'entrée pour tous les modèles CDS
// ============================================================

// Common types & aspects
using from './schema/common';

// Master data
using from './schema/business-partner';
using from './schema/products';

// CRM entities
using from './schema/crm';

// SRM entities
using from './schema/srm';

// Business documents (CRM + SRM)
using from './schema/documents';

// Admin & system entities
using from './schema/admin';

// Registration workflows
using from './schema/registration';
