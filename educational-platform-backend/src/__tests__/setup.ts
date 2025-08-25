// Configuration globale pour les tests
import { config } from 'dotenv';

// Charger les variables d'environnement pour les tests
config({ path: '.env.test' });

// Configuration globale Jest
beforeAll(() => {
  // Configuration initiale pour tous les tests
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Nettoyage après tous les tests
});

// Configuration pour éviter les timeouts
jest.setTimeout(30000); 