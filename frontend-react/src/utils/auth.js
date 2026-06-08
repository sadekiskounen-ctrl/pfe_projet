/**
 * En-têtes d'authentification pour les appels API (OData + REST custom).
 * Utilise sessionStorage.authHeader défini par auth.html après connexion.
 */
export function getAuthHeaders(extra = {}) {
  const authHeader = sessionStorage.getItem('authHeader');
  if (!authHeader) {
    window.location.href = '/admin/auth.html';
    return { 'Content-Type': 'application/json', ...extra };
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': authHeader,
    ...extra
  };
}

/**
 * Parse JSON response safely — handles HTML error pages from SAP BTP approuter/XSUAA.
 * Falls back to text when the response body is not valid JSON.
 */
export async function safeResponseJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { return await res.json(); } catch { /* fall through */ }
  }
  // Non-JSON response (e.g. HTML error page from XSUAA)
  const text = await res.text();
  return { error: { message: text.substring(0, 300) || `Erreur serveur (HTTP ${res.status})` } };
}
