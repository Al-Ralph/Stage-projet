import express from 'express';
import mongoose, { Schema, model, InferSchemaType } from 'mongoose';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json());

// CORS (dev-friendly; restrict in prod)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // change to your frontend origin in prod
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ----------------------------- Mongoose connection -----------------------------
const MONGODB_URI =
  process.env.MONGODB_URI ||
  // Fallback to your provided URI (move it to env for security in real usage)
  'mongodb+srv://cherif:cherif1234@cluster0.asyio.mongodb.net/educational_platform?retryWrites=true&w=majority';

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => console.log('✅ Connecté à MongoDB'))
  .catch((err) => {
    console.error('Erreur MongoDB:', err);
    process.exit(1);
  });

// ----------------------------- Schemas & Models -----------------------------
const ProfileSchema = new Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    bio: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    level: { type: String, trim: true } // used by UI, optional
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    role: { type: String, required: true, enum: ['ADMIN', 'STUDENT', 'INSTRUCTOR'], index: true },
    status: { type: String, default: 'active', enum: ['active', 'disabled', 'pending'] },
    profile: ProfileSchema,
    lastLoginAt: { type: Date }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

/* Virtual id
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});
*/
// Optional compound text index for search
UserSchema.index({
  email: 'text',
  'profile.firstName': 'text',
  'profile.lastName': 'text'
});

type UserDoc = InferSchemaType<typeof UserSchema> & { id: string };
const User = model<UserDoc>('User', UserSchema);

// ----------------------------- Static assets (avatars) -----------------------------
const PORT = Number(process.env.PORT || 3002);
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
fs.mkdirSync(AVATARS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => {
    const userId = (req.params as any).userId || 'unknown';
    const safeName = file.originalname.replace(/[^\w.\-]+/g, '_');
    cb(null, `${userId}-${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// ----------------------------- Helpers -----------------------------
function pickUserForFront(u: UserDoc) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.status || 'active',
    profile: u.profile
      ? {
          firstName: u.profile.firstName ?? null,
          lastName: u.profile.lastName ?? null,
          bio: u.profile.bio ?? null,
          avatarUrl: u.profile.avatarUrl ?? null,
          level: u.profile.level ?? null
        }
      : null,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt ?? null
  };
}

function buildUserFilter(query: any) {
  const filter: any = {};
  const role = String(query.role ?? '').trim().toUpperCase();
  const search = String(query.search ?? '').trim();

  if (role && ['ADMIN', 'STUDENT', 'INSTRUCTOR'].includes(role)) {
    filter.role = role;
  }

  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); // escape + case-insensitive
    filter.$or = [
      { email: rx },
      { 'profile.firstName': rx },
      { 'profile.lastName': rx }
    ];
  }

  return filter;
}

// ----------------------------- Routes -----------------------------
// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', service: 'User Service', timestamp: new Date().toISOString() });
});

// GET /users?page=1&limit=24 [&role=...] [&search=...]
app.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.max(1, parseInt(String(req.query.limit ?? '24'), 10) || 24);
    const skip = (page - 1) * limit;

    const filter = buildUserFilter(req.query);

    const [total, items] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    const users = (items as any[]).map((raw) => {
      // Ensure id field exists in lean result
      raw.id = raw._id.toString();
      delete raw._id;
      delete raw.__v;
      return pickUserForFront(raw as UserDoc);
    });

    const pages = Math.max(1, Math.ceil(total / limit));
    res.json({ users, pagination: { total, page, limit, pages } });
  } catch (error) {
    console.error('GET /users error', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// GET /users/:userId
app.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const u = await User.findById(userId).lean();
    if (!u) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    (u as any).id = (u as any)._id.toString();
    delete (u as any)._id;
    delete (u as any).__v;
    res.json(pickUserForFront(u as any));
  } catch (error) {
    console.error('GET /users/:userId error', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /profile/:userId
app.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const u = await User.findById(userId).lean();
    if (!u) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    res.json({
      id: u._id.toString(),
      email: u.email,
      role: u.role,
      profile: {
        firstName: u.profile?.firstName ?? null,
        lastName: u.profile?.lastName ?? null,
        bio: u.profile?.bio ?? null,
        avatarUrl: u.profile?.avatarUrl ?? null,
        level: u.profile?.level ?? null
      },
      enrollments: [] // if enrollments are in another service, leave empty
    });
  } catch (error) {
    console.error('GET /profile/:userId error', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /profile/:userId (update nested profile fields)
app.put(
  '/profile/:userId',
  [
    body('firstName').optional().isString().trim(),
    body('lastName').optional().isString().trim(),
    body('bio').optional().isString().trim(),
    body('level').optional().isString().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { userId } = req.params;
      const { firstName, lastName, bio, level } = req.body;

      const update: any = {};
      if (firstName !== undefined) update['profile.firstName'] = firstName || null;
      if (lastName !== undefined) update['profile.lastName'] = lastName || null;
      if (bio !== undefined) update['profile.bio'] = bio || null;
      if (level !== undefined) update['profile.level'] = level || null;

      const u = await User.findByIdAndUpdate(
        userId,
        Object.keys(update).length ? { $set: update } : {},
        { new: true }
      ).lean();

      if (!u) return res.status(404).json({ error: 'Utilisateur non trouvé' });

      res.json({
        id: `profile-${u._id.toString()}`,
        userId: u._id.toString(),
        firstName: u.profile?.firstName ?? null,
        lastName: u.profile?.lastName ?? null,
        bio: u.profile?.bio ?? null,
        avatarUrl: u.profile?.avatarUrl ?? null,
        level: u.profile?.level ?? null
      });
    } catch (error) {
      console.error('PUT /profile/:userId error', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
  }
);

// POST /avatar/:userId (upload + store URL in profile.avatarUrl)
app.post('/avatar/:userId', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const publicUrl = `${APP_BASE_URL}/uploads/avatars/${req.file.filename}`;
    u.profile = u.profile || {};
    u.profile.avatarUrl = publicUrl;
    await u.save();

    res.json({ avatarUrl: publicUrl });
  } catch (error) {
    console.error('POST /avatar/:userId error', error);
    res.status(500).json({ error: "Erreur lors de l'upload de l'avatar" });
  }
});

// Admin actions: disable/enable user
app.post('/users/:id/disable', async (req, res) => {
  try {
    const u = await User.findByIdAndUpdate(req.params.id, { status: 'disabled' }, { new: true }).lean();
    if (!u) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    (u as any).id = (u as any)._id.toString();
    delete (u as any)._id;
    delete (u as any).__v;
    res.json({ ok: true, user: pickUserForFront(u as any) });
  } catch (error) {
    console.error('POST /users/:id/disable error', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/users/:id/enable', async (req, res) => {
  try {
    const u = await User.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true }).lean();
    if (!u) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    (u as any).id = (u as any)._id.toString();
    delete (u as any)._id;
    delete (u as any).__v;
    res.json({ ok: true, user: pickUserForFront(u as any) });
  } catch (error) {
    console.error('POST /users/:id/enable error', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ----------------------------- Start server -----------------------------
app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});