/**
 * PME Connect — Intercepteur d'authentification universel (Fetch & XHR)
 * Injecte l'en-tête Basic Auth de session sur les appels OData v4 et /api/*.
 * Détecte automatiquement si l'utilisateur est bloqué et force la déconnexion.
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

    // 3. Vérification automatique du statut du compte (toutes les 30 secondes)
    // Si l'admin bloque l'utilisateur, il sera déconnecté automatiquement
    function checkAccountStatus() {
        const currentUser = sessionStorage.getItem('currentUser');
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        console.log('[Auth Interceptor] checkAccountStatus called. currentUser:', currentUser, 'isLoggedIn:', isLoggedIn);
        if (!currentUser || !isLoggedIn) return;

        console.log('[Auth Interceptor] Fetching status for:', currentUser);
        originalFetch(`/odata/v4/registration/checkStatus(email='${encodeURIComponent(currentUser)}',role='client')`)
            .then(r => {
                console.log('[Auth Interceptor] Response status:', r.status);
                return r.json();
            })
            .then(raw => {
                const data = raw.value || raw;
                console.log('[Auth Interceptor] Status check result:', data);
                if (data && data.status === 'BLOCKED') {
                    console.warn('[Auth Interceptor] Compte bloqué détecté — déconnexion automatique.');
                    // Vider la session
                    sessionStorage.clear();
                    // Rediriger vers la page de login avec un message de blocage
                    const reason = encodeURIComponent(data.blockReason || "Votre compte a été suspendu par l'administrateur.");
                    window.location.href = '/auth.html?blocked=true&reason=' + reason;
                }
            })
            .catch(err => {
                console.error('[Auth Interceptor] Erreur lors de la vérification du statut:', err);
            });
    }

    if (getAuthHeader()) {
        console.log('[Auth Interceptor] Prêt — vérification du statut initial (5s) puis récurrente (30s).');
        // Premier check après 5 secondes, puis toutes les 30 secondes
        setTimeout(checkAccountStatus, 5000);
        setInterval(checkAccountStatus, 30000);
    }
})();
