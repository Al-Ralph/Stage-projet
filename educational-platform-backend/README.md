# 🎓 Plateforme Éducative Backend

Backend ultra-performant pour plateforme éducative avec recommandations alimentées par l'IA, organisé en microservices.

## 🏗️ Architecture

- **API Gateway** (Port 3000) - Point d'entrée principal
- **Auth Service** (Port 3001) - Authentification et autorisation
- **User Service** (Port 3002) - Gestion des utilisateurs
- **Course Service** (Port 3003) - Gestion des cours
- **Recommendation Service** (Port 3004) - Recommandations IA
- **Progress Service** (Port 3005) - Suivi des progrès
- **Social Service** (Port 3006) - Fonctionnalités sociales
- **Notification Service** (Port 3007) - Notifications

## 🚀 Installation et Configuration

### Prérequis

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker (optionnel, pour les bases de données)

### Installation

1. **Cloner le repository**
   ```bash
   git clone <repository-url>
   cd educational-platform-backend
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer l'environnement**
   ```bash
   npm run setup
   ```
   Ce script va :
   - Créer le fichier `.env` à partir de `env.example`
   - Vérifier l'installation de Docker
   - Générer le client Prisma

4. **Démarrer les bases de données (optionnel)**
   ```bash
   npm run db:start
   ```

5. **Appliquer les migrations (si bases de données démarrées)**
   ```bash
   npm run db:migrate
   ```

## 🛠️ Commandes Disponibles

### Développement
```bash
# Démarrer tous les services en mode développement
npm run dev

# Démarrer un service spécifique
npm run dev:auth
npm run dev:user
npm run dev:course
# etc.

# Service de test simple (sans dépendances)
npm run start:test
```

### Tests
```bash
# Tests unitaires
npm run test

# Tests des APIs (tous les services)
npm run test:apis

# Tests des APIs (version simple)
npm run test:apis:simple
```

### Base de données
```bash
# Démarrer les bases de données
npm run db:start

# Arrêter les bases de données
npm run db:stop

# Appliquer les migrations
npm run db:migrate

# Réinitialiser la base de données
npm run db:reset
```

### Prisma
```bash
# Générer le client Prisma
npm run prisma:generate

# Ouvrir Prisma Studio
npm run prisma:studio
```

## 🔧 Résolution des Problèmes

### Problème 1: Docker Compose non reconnu
**Erreur**: `docker-compose : Le terme «docker-compose» n'est pas reconnu`

**Solutions**:
1. **Installer Docker Desktop** (recommandé)
   - Téléchargez et installez Docker Desktop depuis [docker.com](https://www.docker.com/products/docker-desktop/)
   - Docker Compose est inclus avec Docker Desktop

2. **Utiliser la nouvelle syntaxe Docker**
   ```bash
   # Au lieu de docker-compose
   docker compose up -d postgres redis mongodb
   ```

3. **Installer Docker Compose séparément**
   ```bash
   # Windows (avec Chocolatey)
   choco install docker-compose

   # Windows (avec Scoop)
   scoop install docker-compose
   ```

### Problème 2: Erreurs Prisma
**Erreur**: `Prisma schema validation - Type "UserSkill" is neither a built-in type...`

**Solution**: Le schéma Prisma a été corrigé avec tous les modèles manquants.

**Erreur**: `Environment variable not found: DATABASE_URL`

**Solution**: 
1. Créez le fichier `.env` :
   ```bash
   npm run setup
   ```

2. Ou copiez manuellement `env.example` vers `.env`

### Problème 3: Services ne démarrent pas
**Erreur**: `@prisma/client did not initialize yet`

**Solutions**:
1. **Générer le client Prisma** :
   ```bash
   npm run prisma:generate
   ```

2. **Démarrer les bases de données** :
   ```bash
   npm run db:start
   ```

3. **Utiliser le mode sans dépendances** :
   ```bash
   npm run start:test
   ```

### Problème 4: Erreurs de tests Jest
**Erreur**: `Jest encountered an unexpected token`

**Solution**: Les tests ont été simplifiés pour éviter les erreurs de parsing TypeScript.

### Problème 5: Module TensorFlow manquant
**Erreur**: `Cannot find module '@tensorflow/tfjs-node'`

**Solution**: Le service de recommandation a été simplifié pour fonctionner sans TensorFlow.

## 📊 Tests des APIs

### Test simple (recommandé pour commencer)
```bash
npm run test:apis:simple
```

### Test complet (nécessite tous les services démarrés)
```bash
npm run test:apis
```

### Test manuel
```bash
# Service de test simple
npm run start:test

# Puis dans un autre terminal
curl http://localhost:3001/health
```

## 🗄️ Bases de Données

### Services inclus
- **PostgreSQL** (Port 5432) - Base de données principale
- **Redis** (Port 6379) - Cache et sessions
- **MongoDB** (Port 27017) - Données non structurées
- **Elasticsearch** (Port 9200) - Recherche et analytics

### Démarrer les bases de données
```bash
npm run db:start
```

### Vérifier le statut
```bash
docker ps
```

## 🔐 Variables d'Environnement

Copiez `env.example` vers `.env` et configurez :

```env
# Base de données
DATABASE_URL="postgresql://postgres:password@localhost:5432/educational_platform"
REDIS_URL="redis://localhost:6379"
MONGODB_URL="mongodb://localhost:27017/educational_platform"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Ports des services
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
# etc.
```

## 📁 Structure du Projet

```
educational-platform-backend/
├── api-gateway/          # Point d'entrée principal
├── auth-service/         # Authentification
├── user-service/         # Gestion utilisateurs
├── course-service/       # Gestion cours
├── recommendation-service/ # Recommandations IA
├── progress-service/     # Suivi progrès
├── social-service/       # Fonctionnalités sociales
├── notification-service/ # Notifications
├── shared/              # Code partagé
│   ├── middleware/      # Middlewares communs
│   ├── prisma/         # Schéma de base de données
│   ├── services/       # Services partagés
│   └── utils/          # Utilitaires
├── scripts/            # Scripts utilitaires
├── kubernetes/         # Configuration Kubernetes
└── docker-compose.yml  # Configuration Docker
```

## 🚀 Déploiement

### Développement local
```bash
npm run dev
```

### Production avec Docker
```bash
docker-compose build
docker-compose up -d
```

### Kubernetes
```bash
npm run k8s:deploy
```

## 📈 Monitoring et Logs

### Logs des services
```bash
# Logs en temps réel
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f auth-service
```

### Health checks
```bash
# Vérifier le statut des services
curl http://localhost:3000/health
curl http://localhost:3001/health
# etc.
```

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👨‍💻 Auteur

**Steve Ataky, PhD**

---

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez la section "Résolution des Problèmes" ci-dessus
2. Consultez les logs des services
3. Testez avec `npm run test:apis:simple`
4. Ouvrez une issue sur GitHub

**Bonne chance avec votre plateforme éducative ! 🎓**