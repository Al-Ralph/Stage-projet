// ai-learning-service/src/index.ts
import express from 'express';
import cors from 'cors';

const app = express();

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
  res.json({ status: 'OK', service: 'AI Learning Service', timestamp: new Date().toISOString() });
});

// Données mock pour les modèles IA
const aiModels = {
  recommendation: {
    version: '1.2.0',
    accuracy: 94.5,
    lastUpdated: '2024-01-20T10:00:00Z',
    features: ['user_behavior', 'course_performance', 'learning_style', 'time_patterns']
  },
  optimization: {
    version: '1.1.0',
    accuracy: 89.2,
    lastUpdated: '2024-01-19T14:30:00Z',
    features: ['dropout_prediction', 'content_optimization', 'difficulty_adjustment']
  },
  personalization: {
    version: '1.0.0',
    accuracy: 91.8,
    lastUpdated: '2024-01-18T09:15:00Z',
    features: ['learning_path', 'content_adaptation', 'pace_adjustment']
  }
};

// Analyser les performances d'apprentissage d'un utilisateur
app.post('/analyze/performance', async (req, res) => {
  try {
    const { userId, courseId, learningData } = req.body;

    // Simulation d'analyse IA
    const analysis = {
      userId,
      courseId,
      timestamp: new Date().toISOString(),
      insights: {
        learningStyle: 'visual', // visual, auditory, kinesthetic
        pace: 'moderate', // slow, moderate, fast
        strengths: ['problem_solving', 'creativity'],
        weaknesses: ['time_management', 'focus'],
        recommendedActions: [
          'Ajouter plus d\'exercices pratiques',
          'Réduire la durée des sessions',
          'Inclure des vidéos explicatives'
        ],
        predictedCompletionTime: '3 weeks',
        successProbability: 87.5
      },
      recommendations: [
        {
          type: 'content',
          priority: 'high',
          description: 'Ajouter des exemples concrets pour améliorer la compréhension',
          impact: 'high'
        },
        {
          type: 'pacing',
          priority: 'medium',
          description: 'Ralentir le rythme dans les sections complexes',
          impact: 'medium'
        }
      ]
    };

    res.json(analysis);
  } catch (error) {
    console.error('Erreur lors de l\'analyse:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Générer des recommandations personnalisées
app.post('/recommendations/generate', async (req, res) => {
  try {
    const { userId, context } = req.body;

    // Simulation de recommandations IA
    const recommendations = {
      userId,
      timestamp: new Date().toISOString(),
      recommendations: [
        {
          id: 'rec-1',
          type: 'course',
          title: 'JavaScript Avancé',
          reason: 'Basé sur votre progression en JavaScript de base',
          confidence: 92.5,
          estimatedValue: 'high'
        },
        {
          id: 'rec-2',
          type: 'practice',
          title: 'Exercices de logique',
          reason: 'Pour renforcer vos compétences en résolution de problèmes',
          confidence: 88.3,
          estimatedValue: 'medium'
        },
        {
          id: 'rec-3',
          type: 'resource',
          title: 'Documentation TypeScript',
          reason: 'Complémentaire à vos cours JavaScript',
          confidence: 85.7,
          estimatedValue: 'medium'
        }
      ],
      learningPath: {
        currentLevel: 'intermediate',
        nextSteps: [
          'Compléter le cours JavaScript actuel',
          'Commencer TypeScript',
          'Pratiquer avec des projets réels'
        ],
        estimatedTimeline: '2-3 months'
      }
    };

    res.json(recommendations);
  } catch (error) {
    console.error('Erreur lors de la génération des recommandations:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Optimiser le contenu d'un cours
app.post('/optimize/content', async (req, res) => {
  try {
    const { courseId, userFeedback, performanceData } = req.body;

    // Simulation d'optimisation IA
    const optimization = {
      courseId,
      timestamp: new Date().toISOString(),
      optimizations: [
        {
          section: 'module-3',
          type: 'difficulty_adjustment',
          currentDifficulty: 'hard',
          recommendedDifficulty: 'medium',
          reason: '23% des étudiants abandonnent à ce niveau',
          impact: 'high'
        },
        {
          section: 'module-5',
          type: 'content_addition',
          recommendation: 'Ajouter des exemples pratiques',
          reason: 'Feedback positif sur les exemples existants',
          impact: 'medium'
        },
        {
          section: 'module-2',
          type: 'pacing_adjustment',
          currentDuration: '45min',
          recommendedDuration: '35min',
          reason: 'Concentration diminue après 35 minutes',
          impact: 'medium'
        }
      ],
      predictedImprovements: {
        completionRate: '+15%',
        satisfactionScore: '+12%',
        learningEfficiency: '+8%'
      }
    };

    res.json(optimization);
  } catch (error) {
    console.error('Erreur lors de l\'optimisation:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Prédire les risques d'abandon
app.post('/predict/dropout', async (req, res) => {
  try {
    const { userId, courseId, behaviorData } = req.body;

    // Simulation de prédiction IA
    const prediction = {
      userId,
      courseId,
      timestamp: new Date().toISOString(),
      riskAssessment: {
        dropoutRisk: 'medium', // low, medium, high
        riskScore: 0.34, // 0-1
        confidence: 89.2,
        factors: [
          {
            factor: 'inactivity_period',
            weight: 0.4,
            description: 'Pas d\'activité depuis 5 jours'
          },
          {
            factor: 'difficulty_struggle',
            weight: 0.3,
            description: 'Difficulté avec les concepts récents'
          },
          {
            factor: 'time_constraints',
            weight: 0.2,
            description: 'Sessions courtes et irrégulières'
          }
        ]
      },
      interventions: [
        {
          type: 'motivation',
          priority: 'high',
          action: 'Envoyer un message d\'encouragement personnalisé',
          expectedImpact: 'medium'
        },
        {
          type: 'support',
          priority: 'medium',
          action: 'Proposer une session de tutorat',
          expectedImpact: 'high'
        },
        {
          type: 'content',
          priority: 'low',
          action: 'Simplifier les explications complexes',
          expectedImpact: 'medium'
        }
      ]
    };

    res.json(prediction);
  } catch (error) {
    console.error('Erreur lors de la prédiction:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Générer du contenu adaptatif
app.post('/generate/adaptive-content', async (req, res) => {
  try {
    const { userId, courseId, learningStyle, currentProgress } = req.body;

    // Simulation de génération de contenu IA
    const adaptiveContent = {
      userId,
      courseId,
      timestamp: new Date().toISOString(),
      content: {
        type: 'lesson',
        title: 'Variables et Types en JavaScript',
        difficulty: 'intermediate',
        estimatedDuration: '25 minutes',
        sections: [
          {
            type: 'explanation',
            content: 'Les variables en JavaScript sont des conteneurs pour stocker des données...',
            style: learningStyle === 'visual' ? 'with_diagrams' : 'text_focused'
          },
          {
            type: 'example',
            content: 'let nom = "Alice";\nconst age = 25;\nvar ville = "Paris";',
            interactive: true
          },
          {
            type: 'exercise',
            content: 'Créez une variable pour stocker votre nom et votre âge',
            difficulty: 'beginner',
            hints: ['Utilisez let pour les variables modifiables', 'Utilisez const pour les constantes']
          }
        ],
        adaptations: {
          pace: currentProgress > 80 ? 'fast' : 'normal',
          detail: learningStyle === 'visual' ? 'high' : 'medium',
          interactivity: 'high'
        }
      }
    };

    res.json(adaptiveContent);
  } catch (error) {
    console.error('Erreur lors de la génération de contenu:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Obtenir les statistiques des modèles IA
app.get('/models/stats', async (req, res) => {
  try {
    res.json({
      models: aiModels,
      overallMetrics: {
        totalPredictions: 15420,
        averageAccuracy: 91.8,
        activeUsers: 1250,
        lastTraining: '2024-01-20T08:00:00Z'
      },
      performance: {
        responseTime: '45ms',
        uptime: '99.9%',
        modelUpdates: 'daily'
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Entraîner/améliorer les modèles IA
app.post('/models/train', async (req, res) => {
  try {
    const { modelType, trainingData } = req.body;

    // Simulation d'entraînement IA
    const trainingResult = {
      modelType,
      timestamp: new Date().toISOString(),
      status: 'training_completed',
      results: {
        previousAccuracy: aiModels[modelType as keyof typeof aiModels]?.accuracy || 0,
        newAccuracy: 95.2,
        improvement: '+3.2%',
        trainingTime: '2h 15m',
        dataPoints: trainingData?.length || 0
      },
      nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // +24h
    };

    // Mettre à jour le modèle
    if (aiModels[modelType as keyof typeof aiModels]) {
      aiModels[modelType as keyof typeof aiModels].accuracy = trainingResult.results.newAccuracy;
      aiModels[modelType as keyof typeof aiModels].lastUpdated = trainingResult.timestamp;
    }

    res.json(trainingResult);
  } catch (error) {
    console.error('Erreur lors de l\'entraînement:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
  console.log(`AI Learning Service running on port ${PORT}`);
}); 