/**
 * 🔒 PME Connect — Intercepteur d'Authentification Universel (Fetch & XHR)
 * Permet d'injecter automatiquement et de manière transparente l'en-tête d'authentification Basic
 * stocké dans la session sur toutes les requêtes OData v4 (SAPUI5 et fetch personnalisé).
 */
(function() {
    const authHeader = sessionStorage.getItem('authHeader');
    if (authHeader) {
        console.log("[Auth Interceptor] En-tête de sécurité chargé depuis la session.");

        // 1. Surcharge de l'API fetch globale
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            options = options || {};
            const urlString = url.toString();
            
            // On cible uniquement les appels vers les services OData v4
            if (urlString.includes('/odata/v4/')) {
                options.headers = options.headers || {};
                
                // Si l'en-tête n'est pas déjà explicitement défini
                if (!options.headers['Authorization'] && !options.headers['authorization']) {
                    options.headers['Authorization'] = authHeader;
                }
            }
            return originalFetch(url, options);
        };

        // 2. Surcharge de XMLHttpRequest (requis par SAPUI5 / Fiori Elements)
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            this._url = url.toString();
            return originalOpen.apply(this, arguments);
        };

        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(body) {
            if (this._url && this._url.includes('/odata/v4/')) {
                // On injecte l'en-tête d'authentification
                this.setRequestHeader('Authorization', authHeader);
            }
            return originalSend.apply(this, arguments);
        };
    } else {
        console.warn("[Auth Interceptor] Aucun en-tête d'authentification en session.");
    }
})();
