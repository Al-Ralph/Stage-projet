// social-service/src/index.ts
import express from 'express';
// import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { Server } from 'socket.io';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

// const prisma = new PrismaClient();
// const redis = new Redis(process.env.REDIS_URL);

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
  res.json({ status: 'OK', service: 'Social Service', timestamp: new Date().toISOString() });
});

// Route pour récupérer les activités sociales d'un utilisateur
app.get('/activities/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Données mockées pour les activités sociales
    const mockActivities = [
      {
        id: '1',
        type: 'achievement',
        content: 'Vous avez obtenu le badge "React Master" !',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        courseTitle: 'React Fundamentals'
      },
      {
        id: '2',
        type: 'comment',
        content: 'Excellent cours sur Node.js, très bien expliqué !',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        courseTitle: 'Node.js Backend Development'
      },
      {
        id: '3',
        type: 'like',
        content: 'Vous avez aimé un commentaire sur TypeScript',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        courseTitle: 'TypeScript Mastery'
      },
      {
        id: '4',
        type: 'share',
        content: 'Vous avez partagé le cours Python Data Science',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        courseTitle: 'Python for Data Science'
      },
      {
        id: '5',
        type: 'achievement',
        content: 'Vous avez terminé votre premier cours !',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        courseTitle: 'Node.js Backend Development'
      },
      {
        id: '6',
        type: 'comment',
        content: 'Merci pour ce cours, j\'ai appris beaucoup !',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        courseTitle: 'React Fundamentals'
      },
      {
        id: '7',
        type: 'like',
        content: 'Vous avez aimé un tutoriel sur Docker',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        courseTitle: 'Docker & Kubernetes'
      },
      {
        id: '8',
        type: 'achievement',
        content: 'Vous avez atteint 50 heures d\'apprentissage !',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    res.json({ activities: mockActivities });
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// WebSocket pour les conversations en temps réel
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation-${conversationId}`);
  });

  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation-${conversationId}`);
  });

  socket.on('send-message', async (data) => {
    try {
      const { conversationId, senderId, content } = data;

      // const message = await prisma.message.create({
      //   data: {
      //     conversationId,
      //     senderId,
      //     content
      //   },
      //   include: {
      //     sender: {
      //       select: {
      //         id: true,
      //         email: true,
      //         profile: {
      //           select: {
      //             firstName: true,
      //             lastName: true,
      //             avatarUrl: true
      //           }
      //         }
      //       }
      //     }
      //   }
      // });
      
      const message = {
        id: Date.now().toString(),
        conversationId,
        senderId,
        content,
        createdAt: new Date(),
        sender: {
          id: senderId,
          email: 'user@example.com',
          profile: {
            firstName: 'User',
            lastName: 'Name',
            avatarUrl: null
          }
        }
      };

      // Émettre le message à tous les participants
      io.to(`conversation-${conversationId}`).emit('new-message', message);
    } catch (error) {
      socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Créer une nouvelle conversation
app.post('/conversations', async (req, res) => {
  try {
    const { participantIds } = req.body;

    if (!participantIds || participantIds.length < 2) {
      return res.status(400).json({ error: 'Au moins 2 participants requis' });
    }

    // const conversation = await prisma.conversation.create({
    //   data: {
    //     participants: {
    //       create: participantIds.map((userId: string) => ({
    //         userId
    //       }))
    //     }
    //   },
    //   include: {
    //     participants: {
    //       include: {
    //         user: {
    //           select: {
    //             id: true,
    //             email: true,
    //             profile: {
    //               select: {
    //                 firstName: true,
    //                 lastName: true,
    //                 avatarUrl: true
    //               }
    //             }
    //           }
    //         }
    //       }
    //     }
    //   }
    // });
    
    const conversation = {
      id: Date.now().toString(),
      participants: participantIds.map((userId: string) => ({
        userId,
        user: {
          id: userId,
          email: 'user@example.com',
          profile: {
            firstName: 'User',
            lastName: 'Name',
            avatarUrl: null
          }
        }
      })),
      createdAt: new Date()
    };

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la conversation' });
  }
});

// Obtenir les conversations d'un utilisateur
app.get('/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // const conversations = await prisma.conversation.findMany({
    //   where: {
    //     participants: {
    //       some: { userId }
    //     }
    //   },
    //   include: {
    //     participants: {
    //       include: {
    //         user: {
    //           select: {
    //             id: true,
    //             email: true,
    //             profile: {
    //               select: {
    //                 firstName: true,
    //                 lastName: true,
    //                 avatarUrl: true
    //               }
    //             }
    //           }
    //         }
    //       }
    //     },
    //     messages: {
    //       orderBy: { createdAt: 'desc' },
    //       take: 1
    //     },
    //     _count: {
    //       select: {
    //         messages: true
    //       }
    //     }
    //   },
    //   orderBy: {
    //     updatedAt: 'desc'
    //   }
    // });
    
    const conversations = [];

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des conversations' });
  }
});

// Obtenir les messages d'une conversation
app.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // const messages = await prisma.message.findMany({
    //   where: { conversationId },
    //   include: {
    //     sender: {
    //       select: {
    //         id: true,
    //         email: true,
    //         profile: {
    //           select: {
    //             firstName: true,
    //             lastName: true,
    //             avatarUrl: true
    //           }
    //         }
    //       }
    //     }
    //   },
    //   orderBy: { createdAt: 'desc' },
    //   skip,
    //   take: Number(limit)
    // });

    // const total = await prisma.message.count({
    //   where: { conversationId }
    // });
    
    const messages = [];
    const total = 0;

    res.json({
      messages: messages.reverse(),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
});

// Créer un groupe d'étude
app.post('/study-groups', async (req, res) => {
  try {
    const { name, description, courseId, creatorId, maxMembers = 10 } = req.body;

    // const studyGroup = await prisma.studyGroup.create({
    //   data: {
    //     name,
    //     description,
    //     courseId,
    //     maxMembers,
    //     members: {
    //       create: {
    //         userId: creatorId,
    //         role: 'ADMIN'
    //       }
    //     }
    //   },
    //   include: {
    //     course: true,
    //     members: {
    //       include: {
    //         user: {
    //           select: {
    //             id: true,
    //             email: true,
    //             profile: {
    //               select: {
    //                 firstName: true,
    //                 lastName: true,
    //                 avatarUrl: true
    //               }
    //             }
    //           }
    //         }
    //       }
    //     }
    //   }
    // });
    
    const studyGroup = {
      id: Date.now().toString(),
      name,
      description,
      courseId,
      maxMembers,
      members: [{
        userId: creatorId,
        role: 'ADMIN',
        user: {
          id: creatorId,
          email: 'user@example.com',
          profile: {
            firstName: 'User',
            lastName: 'Name',
            avatarUrl: null
          }
        }
      }],
      createdAt: new Date()
    };

    res.status(201).json(studyGroup);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création du groupe d\'étude' });
  }
});

// Rejoindre un groupe d'étude
app.post('/study-groups/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    // const group = await prisma.studyGroup.findUnique({
    //   where: { id: groupId },
    //   include: {
    //     members: true
    //   }
    // });
    
    const group = {
      id: groupId,
      maxMembers: 10,
      members: []
    };

    if (!group) {
      return res.status(404).json({ error: 'Groupe non trouvé' });
    }

    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ error: 'Groupe complet' });
    }

    if (group.members.some(m => m.userId === userId)) {
      return res.status(400).json({ error: 'Déjà membre du groupe' });
    }

    // const member = await prisma.studyGroupMember.create({
    //   data: {
    //     groupId,
    //     userId
    //   },
    //   include: {
    //     user: {
    //       select: {
    //         id: true,
    //         email: true,
    //         profile: {
    //           select: {
    //             firstName: true,
    //             lastName: true,
    //             avatarUrl: true
    //           }
    //         }
    //       }
    //     }
    //   }
    // });
    
    const member = {
      id: Date.now().toString(),
      groupId,
      userId,
      user: {
        id: userId,
        email: 'user@example.com',
        profile: {
          firstName: 'User',
          lastName: 'Name',
          avatarUrl: null
        }
      }
    };

    res.json(member);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'adhésion au groupe' });
  }
});

// Obtenir les groupes d'étude d'un cours
app.get('/study-groups/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    // const groups = await prisma.studyGroup.findMany({
    //   where: { courseId, isActive: true },
    //   include: {
    //     members: {
    //       include: {
    //         user: {
    //           select: {
    //             id: true,
    //             email: true,
    //             profile: {
    //               select: {
    //                 firstName: true,
    //                 lastName: true,
    //                 avatarUrl: true
    //               }
    //             }
    //           }
    //         }
    //       }
    //     },
    //     _count: {
    //       select: {
    //         members: true
    //       }
    //     }
    //   },
    //   orderBy: { createdAt: 'desc' }
    // });
    
    const groups = [];

    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des groupes' });
  }
});

const PORT = process.env.PORT || 3006;
server.listen(PORT, () => {
  console.log(`Social Service running on port ${PORT}`);
});