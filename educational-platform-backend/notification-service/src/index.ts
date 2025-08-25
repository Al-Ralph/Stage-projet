import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { Server } from 'socket.io';
import { createServer } from 'http';
import crypto from 'crypto';

/**
 * ===============================
 * UTIL
 * ===============================
 */
function normalizeOrigin(o: string) {
  return o.trim().replace(/\/+$/, '');
}

/**
 * ===============================
 * CONFIG
 * ===============================
 */
const CONFIG = {
  PORT: Number(process.env.PORT) || 3007,
  RAW_ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  EVENT_SECRET: process.env.NOTIF_EVENT_SECRET || '',
  DISABLE_SIMULATION: process.env.DISABLE_SIMULATION === 'true',
  DISABLE_SOCKETS: process.env.DISABLE_SOCKETS === 'true',
  MAX_NOTIFS_PER_USER: Number(process.env.MAX_NOTIFS_PER_USER) || 1000,
  EMAIL: {
    HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    PORT: Number(process.env.SMTP_PORT) || 587,
    USER: process.env.SMTP_USER || '',
    PASS: process.env.SMTP_PASS || '',
    FROM: process.env.SMTP_FROM || 'noreply@edu-platform.local',
    ENABLED: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    ALLOWED_TYPES: (process.env.EMAIL_EVENT_TYPES || 'course_completed')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  },
  SERVICE_VERSION: '1.2.0-cors-lib'
};

const ALLOWED_ORIGINS = CONFIG.RAW_ALLOWED_ORIGINS
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

console.log('[BOOT] ALLOWED_ORIGINS (raw):', CONFIG.RAW_ALLOWED_ORIGINS);
console.log('[BOOT] ALLOWED_ORIGINS (parsed):', ALLOWED_ORIGINS);

const app = express();
app.use(express.json());

/**
 * ===============================
 * CORS (lib cors)
 * ===============================
 */
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // Requêtes server-to-server (curl, tests)
      const norm = normalizeOrigin(origin);
      if (ALLOWED_ORIGINS.includes(norm)) {
        return cb(null, true);
      }
      if (process.env.NODE_ENV !== 'production' && norm === 'http://localhost:5173') {
        console.warn('[CORS] Fallback dev autorisé pour', norm);
        return cb(null, true);
      }
      console.warn('[CORS] Origin refusée:', norm);
      return cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-event-secret'
    ],
    // credentials: true, // décommente si utilisation de cookies/fetch credentials
    optionsSuccessStatus: 204
  })
);

/**
 * ===============================
 * EMAIL (optionnel)
 * ===============================
 */
const transporter = CONFIG.EMAIL.ENABLED
  ? nodemailer.createTransport({
      host: CONFIG.EMAIL.HOST,
      port: CONFIG.EMAIL.PORT,
      secure: false,
      auth: { user: CONFIG.EMAIL.USER, pass: CONFIG.EMAIL.PASS }
    })
  : null;

/**
 * ===============================
 * TYPES
 * ===============================
 */
type NotificationType =
  | 'course_new'
  | 'enrollment_created'
  | 'course_completed'
  | 'reminder'
  | 'system'
  | 'achievement'
  | 'social'
  | 'other';

interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

/**
 * ===============================
 * STOCKAGE (in-memory)
 * ===============================
 */
const notificationsStore: Record<string, NotificationRecord[]> = {};
const subscribedUsers = new Set<string>();

/**
 * ===============================
 * HELPERS
 * ===============================
 */
function safeString(v: any): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
function assertFields(obj: any, required: string[]): string | null {
  for (const f of required) {
    if (obj == null || safeString(obj[f]) === undefined) return f;
  }
  return null;
}
function pushNotification(userId: string, notif: NotificationRecord) {
  if (!notificationsStore[userId]) notificationsStore[userId] = [];
  notificationsStore[userId].unshift(notif);
  if (notificationsStore[userId].length > CONFIG.MAX_NOTIFS_PER_USER) {
    notificationsStore[userId] = notificationsStore[userId].slice(0, CONFIG.MAX_NOTIFS_PER_USER);
  }
}
function broadcast(n: NotificationRecord) {
  if (io) io.to(`user-${n.userId}`).emit('new-notification', n);
}
async function sendEmailIfAllowed(type: string, to: string | undefined, subject: string, html: string) {
  if (!CONFIG.EMAIL.ENABLED || !to || !transporter) return;
  if (!CONFIG.EMAIL.ALLOWED_TYPES.includes(type)) return;
  try {
    await transporter.sendMail({ from: CONFIG.EMAIL.FROM, to, subject, html });
  } catch (e) {
    console.error('[Email] send error:', (e as Error).message);
  }
}

/**
 * ===============================
 * CREATION DE NOTIFICATION
 * ===============================
 */
function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  email?: string;
}) {
  const record: NotificationRecord = {
    id: crypto.randomUUID(),
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    data: params.data,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  pushNotification(params.userId, record);
  if (params.type === 'course_completed') {
    sendEmailIfAllowed(
      params.type,
      params.email,
      `Félicitations: ${params.data?.courseTitle || params.title}`,
      `<h1>Bravo !</h1><p>Vous avez terminé <strong>${params.data?.courseTitle || 'le cours'}</strong>.</p>`
    );
  }
  broadcast(record);
  return record;
}

/**
 * ===============================
 * LOGIQUE D'EVENEMENTS
 * ===============================
 */
function notifyCourseNew(payload: any) {
  const courseId = safeString(payload.courseId);
  const title = safeString(payload.title);
  if (!courseId || !title) return;
  const category = safeString(payload.category);
  const level = safeString(payload.level);
  const targetUserIds: string[] | undefined = Array.isArray(payload.targetUserIds)
    ? payload.targetUserIds.filter(u => typeof u === 'string' && u.trim())
    : undefined;
  const userIds =
    targetUserIds && targetUserIds.length > 0
      ? targetUserIds
      : Array.from(subscribedUsers);
  userIds.forEach(uid =>
    createNotification({
      userId: uid,
      type: 'course_new',
      title: 'Nouveau cours disponible',
      message: `Le cours "${title}" vient d'être publié${category ? ` (catégorie: ${category})` : ''}.`,
      data: { courseId, courseTitle: title, category, level }
    })
  );
}
function notifyEnrollmentCreated(payload: any) {
  const missing = assertFields(payload, ['userId', 'courseId', 'courseTitle']);
  if (missing) return;
  createNotification({
    userId: payload.userId,
    type: 'enrollment_created',
    title: 'Inscription confirmée',
    message: `Vous êtes inscrit au cours "${payload.courseTitle}".`,
    data: { courseId: payload.courseId, courseTitle: payload.courseTitle }
  });
}
function notifyCourseCompleted(payload: any) {
  const missing = assertFields(payload, ['userId', 'courseId', 'courseTitle']);
  if (missing) return;
  const score = typeof payload.score === 'number' ? payload.score : undefined;
  createNotification({
    userId: payload.userId,
    type: 'course_completed',
    title: 'Cours terminé 🎉',
    message: `Félicitations ! Vous avez terminé "${payload.courseTitle}"${
      score != null ? ` (score ${score}%)` : ''
    }.`,
    data: { courseId: payload.courseId, courseTitle: payload.courseTitle, score },
    email: safeString(payload.email)
  });
}

/**
 * ===============================
 * MIDDLEWARE SECRET
 * ===============================
 */
function requireEventSecret(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!CONFIG.EVENT_SECRET) return next(); // pas activé en dev
  const provided = req.header('x-event-secret');
  if (provided !== CONFIG.EVENT_SECRET) {
    return res.status(401).json({ error: 'Invalid or missing x-event-secret' });
  }
  next();
}

/**
 * ===============================
 * SERVER + SOCKET.IO
 * ===============================
 */
const server = createServer(app);

const io = CONFIG.DISABLE_SOCKETS
  ? null
  : new Server(server, {
      cors: { origin: ALLOWED_ORIGINS, credentials: true }
    });

if (io) {
  io.on('connection', socket => {
    socket.on('subscribe', (userId: string) => {
      const id = safeString(userId);
      if (!id) return;
      socket.join(`user-${id}`);
      subscribedUsers.add(id);
    });
    socket.on('unsubscribe', (userId: string) => {
      const id = safeString(userId);
      if (!id) return;
      socket.leave(`user-${id}`);
      subscribedUsers.delete(id);
    });
  });
}

/**
 * ===============================
 * HEALTH & CONFIG
 * ===============================
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    service: 'Notification Service',
    version: CONFIG.SERVICE_VERSION,
    sockets: !CONFIG.DISABLE_SOCKETS,
    simulation: !CONFIG.DISABLE_SIMULATION,
    timestamp: new Date().toISOString()
  });
});
app.get('/config', (_req, res) => {
  res.json({
    allowedOrigins: ALLOWED_ORIGINS,
    eventSecretProtected: !!CONFIG.EVENT_SECRET,
    emailEnabled: CONFIG.EMAIL.ENABLED,
    socketEnabled: !CONFIG.DISABLE_SOCKETS,
    simulationEnabled: !CONFIG.DISABLE_SIMULATION,
    maxPerUser: CONFIG.MAX_NOTIFS_PER_USER
  });
});

/**
 * ===============================
 * ENDPOINTS EVENEMENTS
 * ===============================
 */
app.post('/events/course-new', requireEventSecret, (req, res) => {
  const { courseId, title } = req.body || {};
  if (!courseId || !title) return res.status(400).json({ error: 'courseId & title requis' });
  notifyCourseNew(req.body);
  res.json({ status: 'ok' });
});
app.post('/events/enrollment-created', requireEventSecret, (req, res) => {
  const missing = assertFields(req.body, ['userId', 'courseId', 'courseTitle']);
  if (missing) return res.status(400).json({ error: `${missing} requis` });
  notifyEnrollmentCreated(req.body);
  res.json({ status: 'ok' });
});
app.post('/events/course-completed', requireEventSecret, (req, res) => {
  const missing = assertFields(req.body, ['userId', 'courseId', 'courseTitle']);
  if (missing) return res.status(400).json({ error: `${missing} requis` });
  const before = notificationsStore[req.body.userId]?.length || 0;
  notifyCourseCompleted(req.body);
  const after = notificationsStore[req.body.userId]?.length || 0;
  const created = after > before ? notificationsStore[req.body.userId][0] : null;
  res.json({ status: 'ok', notificationId: created?.id });
});
app.post('/events/custom', requireEventSecret, (req, res) => {
  const missing = assertFields(req.body, ['userId', 'title', 'message']);
  if (missing) return res.status(400).json({ error: `${missing} requis` });
  const type: NotificationType = (safeString(req.body.type) as NotificationType) || 'other';
  const record = createNotification({
    userId: req.body.userId,
    type,
    title: req.body.title,
    message: req.body.message,
    data: req.body.data
  });
  res.json({ status: 'ok', notificationId: record.id });
});

/**
 * ===============================
 * SIMULATION (DEV)
 * ===============================
 */
if (!CONFIG.DISABLE_SIMULATION) {
  app.post('/simulate/course-new', (req, res) => {
    notifyCourseNew({
      courseId: 'sim-' + Date.now(),
      title: 'Cours Simulé ' + new Date().toLocaleTimeString(),
      category: 'Demo',
      level: 'INTRO',
      ...req.body
    });
    res.json({ status: 'simulated', event: 'course_new' });
  });
  app.post('/simulate/enrollment', (req, res) => {
    notifyEnrollmentCreated({
      userId: req.body.userId || 'demo-user',
      courseId: 'c-demo',
      courseTitle: 'Cours Démo',
      ...req.body
    });
    res.json({ status: 'simulated', event: 'enrollment_created' });
  });
  app.post('/simulate/course-completed', (req, res) => {
    notifyCourseCompleted({
      userId: req.body.userId || 'demo-user',
      courseId: 'c-demo',
      courseTitle: 'Cours Démo',
      score: 90,
      ...req.body
    });
    res.json({ status: 'simulated', event: 'course_completed' });
  });
}

/**
 * ===============================
 * API NOTIFICATIONS
 * ===============================
 */
app.get('/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  const { page = '1', limit = '20', unreadOnly = 'false', types } = req.query as Record<string, string>;
  const list = (notificationsStore[userId] || []).filter(n => {
    if (unreadOnly === 'true' && n.isRead) return false;
    if (types) {
      const set = new Set(
        types
          .split(',')
          .map(t => t.trim())
          .filter(Boolean)
      );
      if (set.size > 0 && !set.has(n.type)) return false;
    }
    return true;
  });

  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const start = (p - 1) * l;
  const slice = list.slice(start, start + l);
  res.json({
    notifications: slice,
    pagination: {
      page: p,
      limit: l,
      total: list.length,
      pages: Math.max(1, Math.ceil(list.length / l))
    }
  });
});

app.get('/notifications/:userId/stats', (req, res) => {
  const { userId } = req.params;
  const list = notificationsStore[userId] || [];
  const total = list.length;
  const unread = list.filter(n => !n.isRead).length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = list.filter(n => new Date(n.createdAt) >= todayStart).length;
  res.json({ total, unread, today });
});

app.patch('/notifications/:userId/:notificationId/read', (req, res) => {
  const { userId, notificationId } = req.params;
  const arr = notificationsStore[userId] || [];
  const n = arr.find(x => x.id === notificationId);
  if (!n) return res.status(404).json({ error: 'Notification introuvable' });
  n.isRead = true;
  res.json(n);
});

app.patch('/notifications/:userId/read-all', (req, res) => {
  const { userId } = req.params;
  const arr = notificationsStore[userId] || [];
  arr.forEach(n => (n.isRead = true));
  res.json({ message: 'Toutes les notifications marquées comme lues' });
});

app.delete('/notifications/:userId/:notificationId', (req, res) => {
  const { userId, notificationId } = req.params;
  if (!notificationsStore[userId]) return res.status(404).json({ error: 'Utilisateur inconnu' });
  notificationsStore[userId] = notificationsStore[userId].filter(n => n.id !== notificationId);
  res.json({ message: 'Notification supprimée' });
});

/**
 * ===============================
 * 404 & ERREURS
 * ===============================
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

/**
 * ===============================
 * START
 * ===============================
 */
server.listen(CONFIG.PORT, () => {
  console.log(`Notification Service running on port ${CONFIG.PORT}`);
  console.log('Allowed origins:', ALLOWED_ORIGINS);
  console.log(`Sockets: ${CONFIG.DISABLE_SOCKETS ? 'disabled' : 'enabled'}`);
  console.log(`Simulation: ${CONFIG.DISABLE_SIMULATION ? 'disabled' : 'enabled'}`);
  console.log(`Event secret: ${CONFIG.EVENT_SECRET ? 'ENABLED' : 'NOT SET (dev)'}`);
  console.log(`Email: ${CONFIG.EMAIL.ENABLED ? 'enabled' : 'disabled'}`);
});