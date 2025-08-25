import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connexion à MongoDB (URI directement dans index.js comme demandé)
mongoose
  .connect(
    'mongodb+srv://cherif:cherif1234@cluster0.asyio.mongodb.net/educational_platform?retryWrites=true&w=majority',
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(async () => {
    console.log('✅ Connecté à MongoDB');
    // Seed de l’ADMIN au démarrage (créé dans la DB si absent)
    await ensureAdminUser();
  })
  .catch((err) => console.error('Erreur MongoDB:', err));

// Modèle User
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  role: { type: String, default: 'STUDENT' } // 'ADMIN' ou 'STUDENT'
});
const User = mongoose.model('User', userSchema);

// Seed ADMIN dans la DB (sans variables d'env, tout est ici)
async function ensureAdminUser() {
  try {
    const email = 'admin@edu.local';
    const password = 'Admin@123456';
    const firstName = 'Admin';
    const lastName = 'User';

    let admin = await User.findOne({ email: email.toLowerCase() });
    if (!admin) {
      const hash = await bcrypt.hash(password, 10);
      admin = await User.create({
        email: email.toLowerCase(),
        password: hash,
        firstName,
        lastName,
        role: 'ADMIN'
      });
      console.log(`✅ Admin seedé dans la DB: ${email} (id: ${admin._id})`);
    } else if (admin.role !== 'ADMIN') {
      admin.role = 'ADMIN';
      await admin.save();
      console.log(`🔁 Utilisateur existant promu ADMIN: ${email} (id: ${admin._id})`);
    } else {
      console.log(`ℹ️ Admin déjà présent en DB: ${email} (id: ${admin._id})`);
    }
  } catch (err) {
    console.error('❌ Erreur seed admin:', err);
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Auth Service', timestamp: new Date().toISOString() });
});

// Inscription
app.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').optional().trim(),
  body('lastName').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email.trim().toLowerCase();
    const { password, firstName, lastName } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const newUser = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'STUDENT'
    });

    // Générer les tokens
    const accessToken = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Connexion
app.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Générer les tokens
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie',
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/* ========= ROUTES D'AUTH ========= */

// Login Admin (depuis la DB)
app.post('/login/admin', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    // Auth admin via DB
    const user = await User.findOne({ email });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Identifiants admin invalides' });
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Connexion admin réussie',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Erreur /login/admin:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Login Student (n'autorise que rôle STUDENT)
app.post('/login/student', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (user.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Accès réservé aux étudiants' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Connexion étudiant réussie',
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Erreur /login/student:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/* ========= FIN NOUVELLES ROUTES ========= */

// Rafraîchir le token
app.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requis' });
    }

    // Vérifier le refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'fallback-secret');
    
    // Trouver l'utilisateur
    const userId = typeof decoded === 'object' && decoded !== null && 'userId' in decoded
      ? (decoded as jwt.JwtPayload).userId
      : undefined;
    if (!userId) {
      return res.status(401).json({ error: 'Refresh token invalide' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Générer un nouveau access token
    const newAccessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '15m' }
    );

    res.json({
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error);
    res.status(401).json({ error: 'Refresh token invalide' });
  }
});

// Déconnexion
app.post('/logout', async (req, res) => {
  try {
    // En production, on invaliderait le refresh token (ex: Redis)
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Vérifier le token
app.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token requis' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    if (typeof decoded === 'object' && decoded !== null) {
      res.json({
        valid: true,
        user: {
          id: (decoded as jwt.JwtPayload).userId,
          email: (decoded as jwt.JwtPayload).email,
          role: (decoded as jwt.JwtPayload).role
        }
      });
    } else {
      res.status(401).json({ error: 'Token invalide' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
});

const PORT = process.env.AUTH_SERVICE_PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Service d'authentification démarré sur le port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});