// ============================================================
// Validators — Backend Business Validation
// ============================================================

'use strict';

/**
 * Validate Algerian RC format: WW/DD-XXXXXXXA99
 */
function validateRC(rc) {
  if (!rc) return true; // optional field
  return /^\d{2}\/\d{2}-\d{7}[A-Z]\d{2}$/.test(rc);
}

/**
 * Validate Algerian NIF format: 20 digits
 */
function validateNIF(nif) {
  if (!nif) return true;
  return /^\d{15,20}$/.test(nif);
}

/**
 * Validate email
 */
function validateEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate Algerian phone number
 */
function validatePhone(phone) {
  if (!phone) return true;
  return /^(\+213|0)(5|6|7)\d{8}$/.test(phone.replace(/\s/g, ''));
}

/**
 * Validate that amount is positive
 */
function validateAmount(amount) {
  return parseFloat(amount) >= 0;
}

/**
 * Validate a B2B client payload
 */
function validateClientB2B(data, req) {
  const errors = [];
  if (!data.companyName) errors.push('Nom entreprise obligatoire');
  if (!data.email) errors.push('Email obligatoire');
  if (data.email && !validateEmail(data.email)) errors.push('Email invalide');
  if (data.phone && !validatePhone(data.phone)) errors.push('Numéro de téléphone invalide');
  if (data.rc && !validateRC(data.rc)) errors.push('Format RC invalide (ex: 16/00-1234567A19)');
  if (errors.length > 0) req.error(400, errors.join(' | '));
}

/**
 * Validate a supplier payload
 */
function validateFournisseur(data, req) {
  const errors = [];
  if (!data.companyName) errors.push('Nom fournisseur obligatoire');
  if (!data.email) errors.push('Email obligatoire');
  if (data.email && !validateEmail(data.email)) errors.push('Email invalide');
  if (errors.length > 0) req.error(400, errors.join(' | '));
}

/**
 * Validate a Devis/Order/Invoice has at least one line item
 */
function validateHasItems(items, req, docType = 'Document') {
  if (!items || items.length === 0) {
    req.error(400, `${docType} doit avoir au moins une ligne`);
  }
}

module.exports = {
  validateRC,
  validateNIF,
  validateEmail,
  validatePhone,
  validateAmount,
  validateClientB2B,
  validateFournisseur,
  validateHasItems
};
