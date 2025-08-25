#!/usr/bin/env node

const http = require('http');

const services = [
  { name: 'API Gateway', port: 3000, path: '/health' },
  { name: 'Auth Service', port: 3001, path: '/health' },
  { name: 'User Service', port: 3002, path: '/health' },
  { name: 'Course Service', port: 3003, path: '/health' },
  { name: 'Recommendation Service', port: 3004, path: '/health' },
  { name: 'Progress Service', port: 3005, path: '/health' },
  { name: 'Social Service', port: 3006, path: '/health' },
  { name: 'Notification Service', port: 3007, path: '/health' }
];

function testService(service) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: service.port,
      path: service.path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            service: service.name,
            status: '✅ En ligne',
            port: service.port,
            response: response
          });
        } catch (error) {
          resolve({
            service: service.name,
            status: '⚠️  Réponse non-JSON',
            port: service.port,
            response: data
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        service: service.name,
        status: '❌ Hors ligne',
        port: service.port,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        service: service.name,
        status: '⏰ Timeout',
        port: service.port,
        error: 'Délai d\'attente dépassé'
      });
    });

    req.end();
  });
}

async function testAllServices() {
  console.log('🔍 Test des services de la plateforme éducative...\n');

  const results = await Promise.all(services.map(testService));

  console.log('📊 Résultats des tests :\n');
  
  results.forEach(result => {
    console.log(`${result.status} ${result.service} (port ${result.port})`);
    if (result.error) {
      console.log(`   Erreur: ${result.error}`);
    } else if (result.response) {
      console.log(`   Réponse: ${JSON.stringify(result.response)}`);
    }
    console.log('');
  });

  const onlineServices = results.filter(r => r.status.includes('✅')).length;
  const totalServices = services.length;

  console.log(`📈 Résumé: ${onlineServices}/${totalServices} services en ligne`);

  if (onlineServices === 0) {
    console.log('\n💡 Aucun service n\'est démarré. Démarrez les services avec :');
    console.log('   npm run dev');
    console.log('\n💡 Ou testez le service simple avec :');
    console.log('   npm run start:test');
  } else if (onlineServices < totalServices) {
    console.log('\n💡 Certains services ne sont pas démarrés. Vérifiez les logs.');
  } else {
    console.log('\n🎉 Tous les services sont opérationnels !');
  }
}

// Test des endpoints spécifiques
async function testSpecificEndpoints() {
  console.log('\n🔍 Test des endpoints spécifiques...\n');

  const endpoints = [
    { name: 'Auth - Register', port: 3001, path: '/register', method: 'POST' },
    { name: 'Auth - Login', port: 3001, path: '/login', method: 'POST' },
    { name: 'User - Profile', port: 3002, path: '/profile', method: 'GET' },
    { name: 'Course - List', port: 3003, path: '/courses', method: 'GET' },
    { name: 'Recommendation - Get', port: 3004, path: '/recommendations', method: 'GET' }
  ];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    console.log(`${result.status} ${result.name} (${endpoint.method} ${endpoint.path})`);
    if (result.error) {
      console.log(`   Erreur: ${result.error}`);
    }
    console.log('');
  }
}

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: endpoint.port,
      path: endpoint.path,
      method: endpoint.method,
      timeout: 3000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      resolve({
        status: res.statusCode === 200 ? '✅ OK' : `⚠️  ${res.statusCode}`,
        name: endpoint.name,
        statusCode: res.statusCode
      });
    });

    req.on('error', (error) => {
      resolve({
        status: '❌ Erreur',
        name: endpoint.name,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: '⏰ Timeout',
        name: endpoint.name,
        error: 'Délai d\'attente dépassé'
      });
    });

    req.end();
  });
}

// Exécution des tests
async function main() {
  await testAllServices();
  await testSpecificEndpoints();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAllServices, testSpecificEndpoints }; 