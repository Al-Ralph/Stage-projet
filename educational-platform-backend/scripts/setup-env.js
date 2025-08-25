#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Configuration de l\'environnement...');

// Créer le fichier .env s'il n'existe pas
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Création du fichier .env...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Fichier .env créé à partir de env.example');
  } else {
    // Créer un fichier .env de base
    const envContent = `# Configuration de la base de données
DATABASE_URL="postgresql://postgres:password@localhost:5432/educational_platform"

# Configuration Redis
REDIS_URL="redis://localhost:6379"

# Configuration MongoDB
MONGODB_URL="mongodb://localhost:27017/educational_platform"

# Configuration JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Configuration des services
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
COURSE_SERVICE_PORT=3003
RECOMMENDATION_SERVICE_PORT=3004
PROGRESS_SERVICE_PORT=3005
SOCIAL_SERVICE_PORT=3006
NOTIFICATION_SERVICE_PORT=3007
API_GATEWAY_PORT=3000

# Configuration AWS S3 (optionnel)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_S3_BUCKET=""

# Configuration Elasticsearch (optionnel)
ELASTICSEARCH_URL="http://localhost:9200"

# Configuration des emails (optionnel)
SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
`;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Fichier .env créé avec la configuration de base');
  }
} else {
  console.log('✅ Fichier .env existe déjà');
}

// Vérifier si Docker est installé
try {
  execSync('docker --version', { stdio: 'ignore' });
  console.log('✅ Docker est installé');
  
  // Vérifier si Docker Compose est disponible
  try {
    execSync('docker-compose --version', { stdio: 'ignore' });
    console.log('✅ Docker Compose est disponible');
  } catch (error) {
    console.log('⚠️  Docker Compose n\'est pas disponible, essayons avec "docker compose"');
    try {
      execSync('docker compose version', { stdio: 'ignore' });
      console.log('✅ Docker Compose (nouvelle syntaxe) est disponible');
    } catch (error2) {
      console.log('❌ Docker Compose n\'est pas disponible');
      console.log('💡 Installez Docker Compose ou utilisez la nouvelle syntaxe "docker compose"');
    }
  }
} catch (error) {
  console.log('❌ Docker n\'est pas installé');
  console.log('💡 Installez Docker pour utiliser les bases de données');
}

// Générer le client Prisma
console.log('🔧 Génération du client Prisma...');
try {
  execSync('cd shared && npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Client Prisma généré avec succès');
} catch (error) {
  console.log('❌ Erreur lors de la génération du client Prisma');
  console.log('💡 Assurez-vous que toutes les dépendances sont installées');
}

console.log('\n🎉 Configuration terminée !');
console.log('\n📋 Prochaines étapes :');
console.log('1. Configurez vos variables d\'environnement dans le fichier .env');
console.log('2. Démarrez les bases de données avec : npm run db:start');
console.log('3. Appliquez les migrations avec : npm run db:migrate');
console.log('4. Démarrez les services avec : npm run dev'); 