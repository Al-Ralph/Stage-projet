import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// CORS + preflight
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Santé
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', service: 'Course Service', timestamp: new Date().toISOString() });
});

// Upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Types simples
type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
type CourseStatus = 'draft' | 'published' | 'archived';
interface CourseRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  level: CourseLevel;
  duration: number;
  price: number;
  status: CourseStatus;
  instructor: { id: string; email: string; profile: { firstName: string; lastName: string } };
  _count: { enrollments: number; reviews: number };
  createdAt: string;
  updatedAt: string;
}
interface EnrollmentRecord {
  id: string;
  courseId: string;
  userId: string;
  enrolledAt: string;
  progress: number;
  completed: boolean;
  lastAccessed: string;
}
interface DecodedToken { userId: string; email: string; role: 'ADMIN' | 'STUDENT'; iat?: number; exp?: number; }

const nowISO = () => new Date().toISOString();
const genId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const safeIncludes = (a: string, b: string) => a.toLowerCase().includes(b.toLowerCase());

// Auth middlewares
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requis' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as DecodedToken | undefined;
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
}

// Données en mémoire (démo)
let courses: CourseRecord[] = [
  {
    id: 'course-1',
    title: 'Introduction à JavaScript',
    description: "Apprenez les bases de JavaScript, ES6+, et les concepts modernes du développement web. Ce cours couvre les fondamentaux jusqu'aux fonctionnalités avancées.",
    category: 'Programming',
    level: 'BEGINNER',
    duration: 120,
    price: 29.99,
    status: 'published',
    instructor: { id: 'instructor-1', email: 'instructor@example.com', profile: { firstName: 'John', lastName: 'Smith' } },
    _count: { enrollments: 0, reviews: 25 },
    createdAt: nowISO(),
    updatedAt: nowISO()
  },
  {
    id: 'course-2',
    title: 'React.js Avancé',
    description: 'Maîtrisez React avec les hooks, le contexte, et les patterns avancés. Apprenez à construire des applications performantes et maintenables.',
    category: 'Programming',
    level: 'INTERMEDIATE',
    duration: 180,
    price: 49.99,
    status: 'published',
    instructor: { id: 'instructor-2', email: 'sarah@example.com', profile: { firstName: 'Sarah', lastName: 'Johnson' } },
    _count: { enrollments: 0, reviews: 18 },
    createdAt: nowISO(),
    updatedAt: nowISO()
  }
];

let enrollments: EnrollmentRecord[] = [
  {
    id: 'enrollment-1',
    courseId: 'course-1',
    userId: 'user-1',
    enrolledAt: '2024-01-15T10:00:00Z',
    progress: 75,
    completed: false,
    lastAccessed: '2024-01-20T14:30:00Z'
  }
];

// GET /courses (public)
app.get('/courses', (req, res) => {
  try {
    const { page = '1', limit = '10', category, level, search } = req.query as Record<string, string>;
    const p = Math.max(1, parseInt(page || '1', 10));
    const l = Math.max(1, parseInt(limit || '10', 10));

    let list = [...courses];
    if (category) list = list.filter(c => c.category === category);
    if (level) list = list.filter(c => c.level === level);
    if (search) list = list.filter(c => safeIncludes(c.title, search) || safeIncludes(c.description, search));

    const withCounts = list.map(c => {
      const enrolled = enrollments.filter(e => e.courseId === c.id).length;
      return { ...c, _count: { enrollments: enrolled, reviews: c._count.reviews } };
    });

    const total = withCounts.length;
    const start = (p - 1) * l;
    res.json({ courses: withCounts.slice(start, start + l), pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des cours' });
  }
});

// GET /courses/:courseId (public)
app.get('/courses/:courseId', (req, res) => {
  try {
    const { courseId } = req.params;
    const course = courses.find(c => c.id === courseId);
    if (!course) return res.status(404).json({ error: 'Cours non trouvé' });

    const enrolled = enrollments.filter(e => e.courseId === course.id).length;
    res.json({ ...course, _count: { enrollments: enrolled, reviews: course._count.reviews } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du cours' });
  }
});

// POST /courses (ADMIN)
app.post(
  '/courses',
  requireAuth,
  requireAdmin,
  [
    body('title').trim().isString().isLength({ min: 1, max: 200 }),
    body('description').trim().isString().isLength({ min: 10, max: 2000 }),
    body('category').trim().isString().isLength({ min: 1 }),
    body('level').trim().toUpperCase().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    body('duration').isInt({ min: 1 }),
    body('price').optional().isFloat({ min: 0 }),
    body('status').optional().trim().isIn(['draft', 'published', 'archived'])
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors (POST /courses):', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = (req as any).user as DecodedToken;
      const { title, description, category, level, duration, price = 0, status = 'draft', instructorId } = req.body;

      const record: CourseRecord = {
        id: genId('course'),
        title,
        description,
        category,
        level,
        duration: Number(duration),
        price: Number(price),
        status,
        instructor: { id: instructorId || user.userId, email: 'instructor@example.com', profile: { firstName: 'John', lastName: 'Smith' } },
        _count: { enrollments: 0, reviews: 0 },
        createdAt: nowISO(),
        updatedAt: nowISO()
      };
      courses.unshift(record);
      res.status(201).json(record);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la création du cours' });
    }
  }
);

// PUT /courses/:courseId (ADMIN)
app.put(
  '/courses/:courseId',
  requireAuth,
  requireAdmin,
  [
    body('title').optional().trim().isString().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isString().isLength({ min: 10, max: 2000 }),
    body('category').optional().trim().isString().isLength({ min: 1 }),
    body('level').optional().trim().toUpperCase().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    body('duration').optional().isInt({ min: 1 }),
    body('price').optional().isFloat({ min: 0 }),
    body('status').optional().trim().isIn(['draft', 'published', 'archived'])
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors (PUT /courses/:id):', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { courseId } = req.params;
      const idx = courses.findIndex(c => c.id === courseId);
      if (idx === -1) return res.status(404).json({ error: 'Cours non trouvé' });

      const updated = { ...courses[idx], ...req.body, updatedAt: nowISO() } as CourseRecord;
      const enrolled = enrollments.filter(e => e.courseId === updated.id).length;
      updated._count = { enrollments: enrolled, reviews: updated._count.reviews };
      courses[idx] = updated;

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la mise à jour du cours' });
    }
  }
);

// DELETE /courses/:courseId (ADMIN)
app.delete('/courses/:courseId', requireAuth, requireAdmin, (req, res) => {
  try {
    const { courseId } = req.params;
    const idx = courses.findIndex(c => c.id === courseId);
    if (idx === -1) return res.status(404).json({ error: 'Cours non trouvé' });

    courses.splice(idx, 1);
    enrollments = enrollments.filter(e => e.courseId !== courseId);

    res.json({ message: 'Cours supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du cours' });
  }
});

// Upload de contenu (ADMIN)
app.post('/courses/:courseId/content', requireAuth, requireAdmin, upload.single('content'), (req, res) => {
  try {
    const { courseId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const url = `https://example.com/courses/${courseId}/${Date.now()}-${req.file.originalname}`;
    res.json({ contentUrl: url });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'upload du contenu" });
  }
});

// S'inscrire (auth)
app.post('/courses/:courseId/enroll', requireAuth, (req, res) => {
  try {
    const { courseId } = req.params;
    const user = (req as any).user as DecodedToken;
    const userId = user.userId;

    const course = courses.find(c => c.id === courseId);
    if (!course) return res.status(404).json({ error: 'Cours non trouvé' });
    if (enrollments.find(e => e.courseId === courseId && e.userId === userId)) {
      return res.status(400).json({ error: 'Vous êtes déjà inscrit à ce cours' });
    }

    const e: EnrollmentRecord = { id: genId('enrollment'), courseId, userId, enrolledAt: nowISO(), progress: 0, completed: false, lastAccessed: nowISO() };
    enrollments.push(e);
    res.status(201).json({ message: 'Inscription réussie', enrollment: e });
  } catch (error) {
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Enrollments utilisateur (auth: proprio ou admin)
app.get('/users/:userId/enrollments', requireAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const auth = (req as any).user as DecodedToken;
    if (auth.role !== 'ADMIN' && auth.userId !== userId) return res.status(403).json({ error: 'Accès refusé' });

    const { page = '1', limit = '10' } = req.query as Record<string, string>;
    const p = Math.max(1, parseInt(page || '1', 10));
    const l = Math.max(1, parseInt(limit || '10', 10));

    const all = enrollments.filter(e => e.userId === userId).map(e => ({ ...e, course: courses.find(c => c.id === e.courseId) }));
    const total = all.length;
    const start = (p - 1) * l;
    res.json({ enrollments: all.slice(start, start + l), pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Update progress (auth: proprio ou admin)
app.put('/enrollments/:enrollmentId/progress', requireAuth, (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { progress, completed } = req.body as { progress?: number; completed?: boolean };
    const auth = (req as any).user as DecodedToken;

    const e = enrollments.find(x => x.id === enrollmentId);
    if (!e) return res.status(404).json({ error: 'Inscription non trouvée' });
    if (auth.role !== 'ADMIN' && auth.userId !== e.userId) return res.status(403).json({ error: 'Accès refusé' });

    if (typeof progress === 'number') e.progress = Math.min(100, Math.max(0, progress));
    if (typeof completed === 'boolean') e.completed = completed;
    e.lastAccessed = nowISO();

    res.json({ message: 'Progrès mis à jour', enrollment: e });
  } catch (error) {
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.listen(PORT, () => {
  console.log(`Course Service running on port ${PORT}`);
});