#!/usr/bin/env node

const express = require('express');
const app = express();

// Configuration de base
app.use(express.json());

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'test-service', 
    timestamp: new Date().toISOString(),
    message: 'Service de test fonctionnel'
  });
});

// Route de test
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test réussi !',
    endpoints: [
      '/health - Vérification de santé',
      '/test - Route de test'
    ]
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({ 
    message: 'Plateforme Éducative Backend - Service de Test',
    version: '1.0.0',
    status: 'running'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Service de test démarré sur le port ${PORT}`);
  console.log(`📡 Testez avec: http://localhost:${PORT}/health`);
  console.log(`🔗 Ou visitez: http://localhost:${PORT}/`);
});

// Gestion des erreurs
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du service...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
}); 