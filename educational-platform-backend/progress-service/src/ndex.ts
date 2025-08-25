// progress-service/src/index.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@shared/middleware/auth';
import { EventBus } from '@shared/services/eventbus';
import { AnalyticsService } from './services/AnalyticsService';

const app = express();
const prisma = new PrismaClient();
const eventBus = new EventBus();
const analytics = new AnalyticsService();

app.use(express.json());

// Get user progress overview
app.get('/overview', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [enrollments, achievements, statistics] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: true,
          progress: {
            include: {
              completedLessons: true
            }
          }
        }
      }),
      prisma.achievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: 'desc' }
      }),
      analytics.getUserStatistics(userId)
    ]);

    const overview = {
      enrollments: enrollments.map(e => ({
        courseId: e.courseId,
        courseName: e.course.title,
        progress: calculateProgress(e.progress, e.course),
        lastActivity: e.progress.lastActivityAt,
        estimatedCompletion: estimateCompletion(e.progress, e.course)
      })),
      achievements,
      statistics,
      learningStreak: await calculateStreak(userId)
    };

    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Update lesson progress
app.post('/lesson/:lessonId/complete', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const { lessonId } = req.params;
  const { score, timeSpent } = req.body;

  try {
    // Find enrollment through lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true
          }
        }
      }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: lesson.module.courseId
      },
      include: { progress: true }
    });

    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled' });
    }

    // Update progress
    const completedLesson = await prisma.lessonProgress.create({
      data: {
        progressId: enrollment.progress.id,
        lessonId,
        completedAt: new Date(),
        score,
        timeSpent
      }
    });

    // Update overall progress
    await prisma.progress.update({
      where: { id: enrollment.progress.id },
      data: {
        lastActivityAt: new Date(),
        totalTimeSpent: { increment: timeSpent }
      }
    });

    // Check for achievements
    const newAchievements = await checkAchievements(userId, enrollment);

    // Emit progress event
    await eventBus.emit('progress.updated', {
      userId,
      courseId: lesson.module.courseId,
      lessonId,
      progress: calculateProgress(enrollment.progress, lesson.module.course)
    });

    res.json({
      completed: true,
      newAchievements,
      courseProgress: calculateProgress(enrollment.progress, lesson.module.course)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get detailed course progress
app.get('/course/:courseId', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const { courseId } = req.params;

  try {
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId, courseId },
      include: {
        progress: {
          include: {
            completedLessons: {
              include: { lesson: true }
            }
          }
        },
        course: {
          include: {
            modules: {
              include: { lessons: true }
            }
          }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const detailedProgress = {
      overall: calculateProgress(enrollment.progress, enrollment.course),
      modules: enrollment.course.modules.map(module => ({
        moduleId: module.id,
        moduleName: module.title,
        progress: calculateModuleProgress(
          module,
          enrollment.progress.completedLessons
        ),
        lessons: module.lessons.map(lesson => ({
          lessonId: lesson.id,
          lessonName: lesson.title,
          completed: enrollment.progress.completedLessons.some(
            cl => cl.lessonId === lesson.id
          ),
          score: enrollment.progress.completedLessons.find(
            cl => cl.lessonId === lesson.id
          )?.score
        }))
      })),
      timeSpent: enrollment.progress.totalTimeSpent,
      lastActivity: enrollment.progress.lastActivityAt
    };

    res.json(detailedProgress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
});

// Helper functions
function calculateProgress(progress: any, course: any): number {
  const totalLessons = course.modules.reduce(
    (sum: number, m: any) => sum + m.lessons.length,
    0
  );
  const completedLessons = progress.completedLessons.length;
  return Math.round((completedLessons / totalLessons) * 100);
}

function calculateModuleProgress(module: any, completedLessons: any[]): number {
  const moduleLessonIds = module.lessons.map((l: any) => l.id);
  const completedInModule = completedLessons.filter(
    cl => moduleLessonIds.includes(cl.lessonId)
  ).length;
  return Math.round((completedInModule / module.lessons.length) * 100);
}

async function calculateStreak(userId: string): Promise<number> {
  const activities = await prisma.progress.findMany({
    where: {
      enrollment: { userId }
    },
    orderBy: { lastActivityAt: 'desc' },
    select: { lastActivityAt: true }
  });

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const activity of activities) {
    const activityDate = new Date(activity.lastActivityAt);
    activityDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (currentDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === streak) {
      streak++;
    } else if (diffDays > streak + 1) {
      break;
    }
  }

  return streak;
}

async function checkAchievements(userId: string, enrollment: any): Promise<any[]> {
  // Implementation for checking and unlocking achievements
  return [];
}

function estimateCompletion(progress: any, course: any): Date {
  // Calculate estimated completion based on current pace
  const progressRate = calculateProgress(progress, course);
  const daysElapsed = Math.floor(
    (Date.now() - new Date(progress.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (progressRate === 0) return null;
  
  const estimatedTotalDays = (daysElapsed * 100) / progressRate;
  const remainingDays = estimatedTotalDays - daysElapsed;
  
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + remainingDays);
  
  return estimatedDate;
}

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Progress Service running on port ${PORT}`);
});