/**
 * PME Connect — Intercepteur d'authentification universel (Fetch & XHR)
 * Injecte l'en-tête Basic Auth de session sur les appels OData v4 et /api/*.
 */
(function() {
    function shouldInject(url) {
        if (!url) return false;
        const s = url.toString();
        return s.includes('/odata/v4/') || s.includes('/api/');
    }

    function getAuthHeader() {
        return sessionStorage.getItem('authHeader');
    }

    // 1. Surcharge de l'API fetch globale
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        options = options || {};
        const authHeader = getAuthHeader();
        if (authHeader && shouldInject(url)) {
            options.headers = options.headers || {};
            if (!options.headers['Authorization'] && !options.headers['authorization']) {
                options.headers['Authorization'] = authHeader;
            }
        }
        return originalFetch(url, options);
    };

    // 2. Surcharge de XMLHttpRequest (SAPUI5 / Fiori Elements)
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        this._url = url ? url.toString() : '';
        return originalOpen.apply(this, arguments);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
        const authHeader = getAuthHeader();
        if (authHeader && shouldInject(this._url)) {
            this.setRequestHeader('Authorization', authHeader);
        }
        return originalSend.apply(this, arguments);
    };

    if (getAuthHeader()) {
        console.log('[Auth Interceptor] Prêt — en-tête de sécurité disponible en session.');
    }
})();
