# 🎯 Guide d'Intégration Frontend - Plateforme Éducative Backend

## 📋 Vue d'Ensemble

Ce document guide les développeurs frontend pour intégrer ce backend de plateforme éducative organisé en microservices. Le backend fournit des APIs RESTful pour une plateforme d'apprentissage en ligne complète.

## 🏗️ Architecture Backend

### Services Disponibles

| Service | Port | Description | Statut |
|---------|------|-------------|--------|
| API Gateway | 3000 | Point d'entrée principal | 🔧 En développement |
| Auth Service | 3001 | Authentification & autorisation | ✅ Fonctionnel |
| User Service | 3002 | Gestion des utilisateurs | 🔧 En développement |
| Course Service | 3003 | Gestion des cours | 🔧 En développement |
| Recommendation Service | 3004 | Recommandations IA | 🔧 En développement |
| Progress Service | 3005 | Suivi des progrès | 🔧 En développement |
| Social Service | 3006 | Fonctionnalités sociales | 🔧 En développement |
| Notification Service | 3007 | Notifications | 🔧 En développement |

### Base de Données
- **PostgreSQL** (Port 5432) - Base principale
- **Redis** (Port 6379) - Cache & sessions
- **MongoDB** (Port 27017) - Données non structurées
- **Elasticsearch** (Port 9200) - Recherche

## 🔐 Authentification

### Endpoints d'Authentification

#### 1. Inscription
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Réponse :**
```json
{
  "message": "Utilisateur créé avec succès",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "role": "STUDENT"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Connexion
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponse :**
```json
{
  "message": "Connexion réussie",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "role": "STUDENT"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. Rafraîchir le Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Réponse :**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 4. Vérifier le Token
```http
GET /auth/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Réponse :**
```json
{
  "valid": true,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "role": "STUDENT"
  }
}
```

#### 5. Déconnexion
```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 👤 Gestion des Utilisateurs

### Endpoints Utilisateur

#### 1. Obtenir le Profil
```http
GET /users/profile
Authorization: Bearer <access_token>
```

**Réponse :**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "role": "STUDENT",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "bio": "Développeur passionné",
    "level": 3,
    "experience": 1500,
    "learningStyle": "visual",
    "timeZone": "Europe/Paris",
    "language": "fr"
  }
}
```

#### 2. Mettre à Jour le Profil
```http
PUT /users/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Développeur passionné par l'apprentissage",
  "learningStyle": "visual",
  "timeZone": "Europe/Paris",
  "language": "fr"
}
```

#### 3. Uploader un Avatar
```http
POST /users/avatar
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

// Fichier image dans le body
```

## 📚 Gestion des Cours

### Endpoints Cours

#### 1. Lister les Cours
```http
GET /courses?page=1&limit=10&category=programming&level=beginner
```

**Réponse :**
```json
{
  "courses": [
    {
      "id": "course-123",
      "title": "Introduction à JavaScript",
      "description": "Apprenez les bases de JavaScript",
      "thumbnailUrl": "https://example.com/thumb.jpg",
      "category": "Programming",
      "level": "BEGINNER",
      "duration": 120,
      "price": 29.99,
      "instructor": {
        "id": "instructor-123",
        "name": "John Doe"
      },
      "rating": 4.5,
      "enrollmentCount": 1250,
      "isPublished": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

#### 2. Obtenir un Cours
```http
GET /courses/course-123
```

**Réponse :**
```json
{
  "id": "course-123",
  "title": "Introduction à JavaScript",
  "description": "Apprenez les bases de JavaScript",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "category": "Programming",
  "level": "BEGINNER",
  "duration": 120,
  "price": 29.99,
  "instructor": {
    "id": "instructor-123",
    "name": "John Doe",
    "avatarUrl": "https://example.com/instructor.jpg"
  },
  "modules": [
    {
      "id": "module-1",
      "title": "Les Fondamentaux",
      "description": "Variables, fonctions, objets",
      "lessons": [
        {
          "id": "lesson-1",
          "title": "Variables et Types",
          "duration": 15,
          "videoUrl": "https://example.com/video1.mp4",
          "isCompleted": false
        }
      ]
    }
  ],
  "skills": ["JavaScript", "ES6", "DOM"],
  "prerequisites": [],
  "rating": 4.5,
  "reviews": [
    {
      "id": "review-1",
      "rating": 5,
      "comment": "Excellent cours !",
      "user": {
        "name": "Alice Smith",
        "avatarUrl": "https://example.com/alice.jpg"
      },
      "createdAt": "2024-01-20T14:30:00Z"
    }
  ],
  "enrollmentCount": 1250,
  "isPublished": true
}
```

#### 3. S'inscrire à un Cours
```http
POST /courses/course-123/enroll
Authorization: Bearer <access_token>
```

#### 4. Rechercher des Cours
```http
GET /courses/search?q=javascript&category=programming&level=beginner&priceRange=0-50
```

## 🎯 Recommandations

### Endpoints Recommandations

#### 1. Obtenir des Recommandations
```http
GET /recommendations?limit=10
Authorization: Bearer <access_token>
```

**Réponse :**
```json
{
  "recommendations": [
    {
      "id": "course-456",
      "title": "React pour Débutants",
      "description": "Créez votre première application React",
      "category": "Programming",
      "level": "INTERMEDIATE",
      "rating": 4.3,
      "enrollments": 800,
      "matchScore": 0.95,
      "reason": "Basé sur votre intérêt pour JavaScript"
    }
  ]
}
```

#### 2. Cours Similaires
```http
GET /courses/course-123/similar?limit=5
```

## 📊 Suivi des Progrès

### Endpoints Progrès

#### 1. Obtenir le Progrès d'un Cours
```http
GET /progress/courses/course-123
Authorization: Bearer <access_token>
```

**Réponse :**
```json
{
  "courseId": "course-123",
  "courseTitle": "Introduction à JavaScript",
  "progress": {
    "completedLessons": 8,
    "totalLessons": 12,
    "percentage": 66.67,
    "timeSpent": 5400,
    "lastActivityAt": "2024-01-25T16:45:00Z"
  },
  "lessons": [
    {
      "id": "lesson-1",
      "title": "Variables et Types",
      "isCompleted": true,
      "completedAt": "2024-01-20T10:30:00Z",
      "score": 95,
      "timeSpent": 900
    }
  ],
  "certificate": null
}
```

#### 2. Marquer une Leçon comme Terminée
```http
POST /progress/lessons/lesson-1/complete
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "score": 95,
  "timeSpent": 900
}
```

## 👥 Fonctionnalités Sociales

### Endpoints Sociaux

#### 1. Groupes d'Étude
```http
GET /social/study-groups?courseId=course-123
Authorization: Bearer <access_token>
```

#### 2. Forum
```http
GET /social/forum/threads?courseId=course-123
Authorization: Bearer <access_token>
```

#### 3. Messages
```http
GET /social/conversations
Authorization: Bearer <access_token>
```

## 🔔 Notifications

### Endpoints Notifications

#### 1. Obtenir les Notifications
```http
GET /notifications?unreadOnly=true
Authorization: Bearer <access_token>
```

**Réponse :**
```json
{
  "notifications": [
    {
      "id": "notif-1",
      "type": "COURSE_UPDATE",
      "title": "Nouvelle leçon disponible",
      "message": "Une nouvelle leçon a été ajoutée au cours JavaScript",
      "data": {
        "courseId": "course-123",
        "lessonId": "lesson-13"
      },
      "isRead": false,
      "createdAt": "2024-01-25T14:30:00Z"
    }
  ]
}
```

#### 2. Marquer comme Lu
```http
PUT /notifications/notif-1/read
Authorization: Bearer <access_token>
```

## 🔧 Configuration Frontend

### Variables d'Environnement

```javascript
// .env
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_AUTH_SERVICE_URL=http://localhost:3001
REACT_APP_USER_SERVICE_URL=http://localhost:3002
REACT_APP_COURSE_SERVICE_URL=http://localhost:3003
REACT_APP_RECOMMENDATION_SERVICE_URL=http://localhost:3004
REACT_APP_PROGRESS_SERVICE_URL=http://localhost:3005
REACT_APP_SOCIAL_SERVICE_URL=http://localhost:3006
REACT_APP_NOTIFICATION_SERVICE_URL=http://localhost:3007
```

### Service API Client

```javascript
// services/api.js
class ApiClient {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL;
    this.token = localStorage.getItem('accessToken');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('accessToken', token);
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Token expiré, essayer de le rafraîchir
        await this.refreshToken();
        // Réessayer la requête
        return this.request(endpoint, options);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setToken(data.accessToken);
      } else {
        // Refresh token expiré, rediriger vers login
        this.logout();
      }
    } catch (error) {
      this.logout();
    }
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Rediriger vers la page de connexion
    window.location.href = '/login';
  }

  // Méthodes d'authentification
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  }

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    this.setToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  }

  // Méthodes utilisateur
  async getProfile() {
    return this.request('/users/profile');
  }

  async updateProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Méthodes cours
  async getCourses(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/courses?${queryString}`);
  }

  async getCourse(courseId) {
    return this.request(`/courses/${courseId}`);
  }

  async enrollCourse(courseId) {
    return this.request(`/courses/${courseId}/enroll`, {
      method: 'POST',
    });
  }

  // Méthodes recommandations
  async getRecommendations(limit = 10) {
    return this.request(`/recommendations?limit=${limit}`);
  }

  // Méthodes progrès
  async getCourseProgress(courseId) {
    return this.request(`/progress/courses/${courseId}`);
  }

  async completeLesson(lessonId, data) {
    return this.request(`/progress/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Méthodes notifications
  async getNotifications(unreadOnly = false) {
    return this.request(`/notifications?unreadOnly=${unreadOnly}`);
  }

  async markNotificationAsRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }
}

export default new ApiClient();
```

### Hook d'Authentification

```javascript
// hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import apiClient from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté au chargement
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const userData = await apiClient.getProfile();
          setUser(userData);
        } catch (error) {
          // Token invalide, nettoyer le localStorage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const data = await apiClient.login(email, password);
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await apiClient.register(userData);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

## 🎨 Exemples d'Intégration

### Page de Connexion

```jsx
// components/LoginForm.jsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
};
```

### Liste des Cours

```jsx
// components/CourseList.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    level: '',
    page: 1,
    limit: 10,
  });

  useEffect(() => {
    fetchCourses();
  }, [filters]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCourses(filters);
      setCourses(data.courses);
    } catch (error) {
      console.error('Erreur lors du chargement des cours:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      await apiClient.enrollCourse(courseId);
      // Mettre à jour la liste ou afficher un message de succès
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="course-list">
      <div className="filters">
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">Toutes les catégories</option>
          <option value="programming">Programmation</option>
          <option value="design">Design</option>
        </select>
        
        <select
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
        >
          <option value="">Tous les niveaux</option>
          <option value="beginner">Débutant</option>
          <option value="intermediate">Intermédiaire</option>
          <option value="advanced">Avancé</option>
        </select>
      </div>

      <div className="courses-grid">
        {courses.map((course) => (
          <div key={course.id} className="course-card">
            <img src={course.thumbnailUrl} alt={course.title} />
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <div className="course-meta">
              <span>{course.category}</span>
              <span>{course.level}</span>
              <span>{course.duration} min</span>
              <span>⭐ {course.rating}</span>
            </div>
            <button onClick={() => handleEnroll(course.id)}>
              S'inscrire
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 🚀 Démarrage Rapide

### 1. Démarrer le Backend

```bash
# Cloner le repository backend
git clone <backend-repo>
cd educational-platform-backend

# Installer les dépendances
npm install

# Configurer l'environnement
npm run setup

# Démarrer les services
npm run dev
```

### 2. Tester les APIs

```bash
# Test simple
npm run test:apis:simple

# Test complet
npm run test:apis
```

### 3. Intégrer dans le Frontend

```bash
# Dans votre projet frontend
npm install

# Configurer les variables d'environnement
# Créer .env avec les URLs des services

# Démarrer le frontend
npm start
```

## 🔍 Points d'Attention

### 1. **Gestion des Tokens**
- Les tokens JWT expirent après 15 minutes
- Utiliser le refresh token pour obtenir un nouveau access token
- Gérer automatiquement le renouvellement des tokens

### 2. **Gestion d'Erreurs**
- Intercepter les erreurs 401 pour rediriger vers la connexion
- Afficher des messages d'erreur appropriés
- Gérer les timeouts et les erreurs réseau

### 3. **Performance**
- Mettre en cache les données fréquemment utilisées
- Utiliser la pagination pour les listes
- Optimiser les requêtes avec des filtres

### 4. **Sécurité**
- Ne jamais stocker les tokens en clair
- Valider les données côté client et serveur
- Utiliser HTTPS en production

## 📞 Support

Pour toute question ou problème d'intégration :

1. Consultez les logs du backend
2. Testez les APIs avec `npm run test:apis:simple`
3. Vérifiez la documentation des endpoints
4. Contactez l'équipe backend

---

**Document généré le**: 11 juillet 2025  
**Version Backend**: 1.0.0  
**Statut**: 🔧 En développement actif 