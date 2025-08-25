// progress-service/src/index.ts
import express from 'express';
// import { PrismaClient } from '@prisma/client';
import amqp from 'amqplib';

const app = express();
// const prisma = new PrismaClient();

// Configuration RabbitMQ
let channel: amqp.Channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();
    
    // Déclarer les queues
    await channel.assertQueue('progress.update', { durable: true });
    await channel.assertQueue('achievement.check', { durable: true });
    
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ connection failed:', error);
  }
}

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
  res.json({ status: 'OK', service: 'Progress Service', timestamp: new Date().toISOString() });
});

// Route pour récupérer les progrès d'un utilisateur
app.get('/progress/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Données mockées pour les progrès
    const mockProgress = [
      {
        id: '1',
        courseId: '1',
        courseTitle: 'React Fundamentals',
        progress: 75,
        completed: false,
        lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        courseId: '2',
        courseTitle: 'Node.js Backend Development',
        progress: 100,
        completed: true,
        lastAccessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        courseId: '3',
        courseTitle: 'TypeScript Mastery',
        progress: 45,
        completed: false,
        lastAccessed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        courseId: '4',
        courseTitle: 'Python for Data Science',
        progress: 90,
        completed: false,
        lastAccessed: new Date().toISOString()
      }
    ];
    
    res.json({ progress: mockProgress });
  } catch (error) {
    console.error('Erreur lors de la récupération des progrès:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Mettre à jour la progression d'une leçon
app.post('/progress/lesson/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { userId, completed, score, timeSpent } = req.body;

    // Vérifier l'inscription au cours
    // const enrollment = await prisma.enrollment.findFirst({
    //   where: {
    //     userId,
    //     course: {
    //       modules: {
    //         some: {
    //           lessons: {
    //             some: { id: lessonId }
    //           }
    //         }
    //       }
    //     }
    //   },
    //   include: {
    //     progress: true
    //   }
    // });
    
    const enrollment = {
      id: 'mock-enrollment-id',
      progress: {
        id: 'mock-progress-id'
      }
    };

    if (!enrollment) {
      return res.status(403).json({ error: 'Non inscrit au cours' });
    }

    // Mettre à jour ou créer la progression de la leçon
    // const lessonProgress = await prisma.lessonProgress.upsert({
    //   where: {
    //     progressId_lessonId: {
    //       progressId: enrollment.progress!.id,
    //       lessonId
    //     }
    //   },
    //   update: {
    //     completedAt: completed ? new Date() : null,
    //     score,
    //     timeSpent
    //   },
    //   create: {
    //     progressId: enrollment.progress!.id,
    //     lessonId,
    //     completedAt: completed ? new Date() : null,
    //     score,
    //     timeSpent
    //   }
    // });

    // Mettre à jour le temps total passé
    // await prisma.progress.update({
    //   where: { id: enrollment.progress!.id },
    //   data: {
    //     lastActivityAt: new Date(),
    //     totalTimeSpent: {
    //       increment: timeSpent || 0
    //     }
    //   }
    // });
    
    const lessonProgress = {
      id: Date.now().toString(),
      progressId: enrollment.progress!.id,
      lessonId,
      completedAt: completed ? new Date() : null,
      score,
      timeSpent
    };

    // Publier un événement de mise à jour de progression
    if (channel) {
      channel.sendToQueue('progress.update', Buffer.from(JSON.stringify({
        userId,
        lessonId,
        completed,
        score,
        timeSpent
      })));
    }

    res.json(lessonProgress);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la progression' });
  }
});

// Obtenir la progression d'un cours
app.get('/progress/course/:courseId/:userId', async (req, res) => {
  try {
    const { courseId, userId } = req.params;

    // const enrollment = await prisma.enrollment.findFirst({
    //   where: { userId, courseId },
    //   include: {
    //     progress: {
    //       include: {
    //         completedLessons: {
    //           include: {
    //             lesson: {
    //               include: {
    //                 module: true
    //               }
    //             }
    //           }
    //         }
    //       }
    //     },
    //     course: {
    //       include: {
    //         modules: {
    //           include: {
    //             lessons: true
    //           },
    //           orderBy: { order: 'asc' }
    //         }
    //       }
    //     }
    //   }
    // });
    
    const enrollment = {
      id: 'mock-enrollment-id',
      progress: {
        id: 'mock-progress-id',
        completedLessons: []
      },
      course: {
        modules: []
      }
    };

    if (!enrollment) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    // Calculer les statistiques de progression
    const totalLessons = enrollment.course.modules.reduce(
      (total, module) => total + module.lessons.length, 0
    );
    const completedLessons = enrollment.progress?.completedLessons.length || 0;
    const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    res.json({
      enrollment,
      progress: {
        totalLessons,
        completedLessons,
        progressPercentage,
        totalTimeSpent: enrollment.progress?.totalTimeSpent || 0,
        lastActivityAt: enrollment.progress?.lastActivityAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la progression' });
  }
});

// Obtenir les statistiques globales d'un utilisateur
app.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // const enrollments = await prisma.enrollment.findMany({
    //   where: { userId },
    //   include: {
    //     course: true,
    //     progress: {
    //       include: {
    //         completedLessons: true
    //       }
    //     }
    //   }
    // });
    
    const enrollments = [];

    const stats = {
      totalCourses: enrollments.length,
      completedCourses: enrollments.filter(e => e.completedAt).length,
      totalTimeSpent: enrollments.reduce((total, e) => total + (e.progress?.totalTimeSpent || 0), 0),
      totalLessonsCompleted: enrollments.reduce((total, e) => total + (e.progress?.completedLessons.length || 0), 0),
      averageScore: 0
    };

    // Calculer le score moyen
    const allScores = enrollments.flatMap(e => 
      e.progress?.completedLessons.map(l => l.score).filter(s => s !== null) || []
    );
    
    if (allScores.length > 0) {
      stats.averageScore = allScores.reduce((sum, score) => sum + score!, 0) / allScores.length;
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// Marquer un cours comme terminé
app.post('/progress/course/:courseId/complete', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.body;

    // const enrollment = await prisma.enrollment.findFirst({
    //   where: { userId, courseId },
    //   include: {
    //     progress: {
    //       include: {
    //         completedLessons: true
    //       }
    //     },
    //     course: {
    //       include: {
    //         modules: {
    //           include: {
    //             lessons: true
    //           }
    //         }
    //       }
    //     }
    //   }
    // });
    
    const enrollment = {
      id: 'mock-enrollment-id',
      progress: {
        id: 'mock-progress-id',
        completedLessons: []
      },
      course: {
        modules: []
      }
    };

    if (!enrollment) {
      return res.status(404).json({ error: 'Inscription non trouvée' });
    }

    const totalLessons = enrollment.course.modules.reduce(
      (total, module) => total + module.lessons.length, 0
    );
    const completedLessons = enrollment.progress?.completedLessons.length || 0;

    if (completedLessons < totalLessons) {
      return res.status(400).json({ error: 'Toutes les leçons doivent être terminées' });
    }

    // Marquer comme terminé
    // await prisma.enrollment.update({
    //   where: { id: enrollment.id },
    //   data: { completedAt: new Date() }
    // });

    // Publier un événement de vérification d'achievement
    if (channel) {
      channel.sendToQueue('achievement.check', Buffer.from(JSON.stringify({
        userId,
        courseId,
        action: 'course_completed'
      })));
    }

    res.json({ message: 'Cours marqué comme terminé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la finalisation du cours' });
  }
});

// Initialiser RabbitMQ au démarrage
// connectRabbitMQ();

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Progress Service running on port ${PORT}`);
}); 