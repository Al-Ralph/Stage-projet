// recommendation-service/src/index.ts
import express from 'express';
// import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import mongoose from 'mongoose';
import { RecommendationEngine } from './engine/RecommendationEngine';

const app = express();
// const prisma = new PrismaClient();
// const redis = new Redis(process.env.REDIS_URL);
const recommendationEngine = new RecommendationEngine();

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/recommendations');

app.use(express.json());

// Configuration CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Recommendation Service', timestamp: new Date().toISOString() });
});

// Route pour récupérer les recommandations d'un utilisateur (pour le dashboard)
app.get('/recommendations/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Données mockées pour les recommandations
    const mockRecommendations = [
      {
        id: '1',
        courseId: '5',
        courseTitle: 'Advanced React Patterns',
        score: 95,
        reason: 'Basé sur votre intérêt pour React Fundamentals'
      },
      {
        id: '2',
        courseId: '6',
        courseTitle: 'GraphQL API Development',
        score: 88,
        reason: 'Complémentaire à vos compétences Node.js'
      },
      {
        id: '3',
        courseId: '7',
        courseTitle: 'Docker & Kubernetes',
        score: 82,
        reason: 'Pour améliorer vos compétences DevOps'
      },
      {
        id: '4',
        courseId: '8',
        courseTitle: 'Machine Learning Basics',
        score: 78,
        reason: 'Basé sur votre cours Python Data Science'
      },
      {
        id: '5',
        courseId: '9',
        courseTitle: 'AWS Cloud Architecture',
        score: 75,
        reason: 'Pour étendre vos compétences cloud'
      }
    ];
    
    res.json({ recommendations: mockRecommendations });
  } catch (error) {
    console.error('Erreur lors de la récupération des recommandations:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Obtenir des recommandations pour un utilisateur
app.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, type = 'course' } = req.query;

    // Vérifier le cache Redis
    // const cacheKey = `recommendations:${userId}:${type}:${limit}`;
    // const cached = await redis.get(cacheKey);
    
    // if (cached) {
    //   return res.json(JSON.parse(cached));
    // }

    // Générer des recommandations
    const recommendations = await recommendationEngine.getRecommendations(
      userId,
      type as string,
      Number(limit)
    );

    // Mettre en cache pour 1 heure
    // await redis.setex(cacheKey, 3600, JSON.stringify(recommendations));

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la génération des recommandations' });
  }
});

// Obtenir des recommandations basées sur un cours
app.get('/recommendations/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { limit = 5 } = req.query;

    const recommendations = await recommendationEngine.getSimilarCourses(
      courseId,
      Number(limit)
    );

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la recherche de cours similaires' });
  }
});

// Analyser les préférences d'un utilisateur
app.post('/analyze/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, courseId, rating, duration } = req.body;

    // Enregistrer l'interaction
    // await prisma.userInteraction.create({
    //   data: {
    //     userId,
    //     courseId,
    //     action,
    //     duration,
    //     rating
    //   }
    // });

    // Mettre à jour les recommandations
    await recommendationEngine.updateUserPreferences(userId, {
      action,
      courseId,
      rating,
      duration
    });

    res.json({ message: 'Analyse enregistrée avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'analyse des préférences' });
  }
});

// Obtenir des statistiques de recommandations
app.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await recommendationEngine.getUserStats(userId);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Recommendation Service running on port ${PORT}`);
});