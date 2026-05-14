const cds = require('@sap/cds');
const cors = require('cors');

cds.on('bootstrap', (app) => {
    // Configurer CORS pour autoriser SAP Build Apps (et autres clients externes)
    // En production, il est recommandé de restreindre l'origine (ex: { origin: 'https://mon-app-build.com' })
    app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Token']
    }));
});

module.exports = cds.server;
