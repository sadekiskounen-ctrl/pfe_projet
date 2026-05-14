const cds = require('@sap/cds');
const cors = require('cors');
const express = require('express');

cds.on('bootstrap', (app) => {
    // Augmenter la limite de taille pour les fichiers PDF (Base64)
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Configurer CORS
    app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Token']
    }));
});

module.exports = cds.server;
