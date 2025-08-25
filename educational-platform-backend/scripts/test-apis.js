#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Configuration des services à tester
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

// Fonction pour tester un service
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
            status: 'OK',
            code: res.statusCode,
            response: response
          });
        } catch (error) {
          resolve({
            service: service.name,
            status: 'ERROR',
            code: res.statusCode,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        service: service.name,
        status: 'ERROR',
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        service: service.name,
        status: 'TIMEOUT',
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

// Fonction principale pour tester tous les services
async function testAllServices() {
  console.log('🔍 Test des APIs - Plateforme Éducative Backend\n');
  console.log('=' .repeat(60));

  const results = [];

  for (const service of services) {
    console.log(`\n📡 Test de ${service.name} (port ${service.port})...`);
    const result = await testService(service);
    results.push(result);

    if (result.status === 'OK') {
      console.log(`✅ ${service.name}: ${result.code} - ${JSON.stringify(result.response)}`);
    } else {
      console.log(`❌ ${service.name}: ${result.error}`);
    }
  }

  // Résumé
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('=' .repeat(60));

  const successful = results.filter(r => r.status === 'OK').length;
  const failed = results.length - successful;

  console.log(`✅ Services fonctionnels: ${successful}`);
  console.log(`❌ Services en erreur: ${failed}`);
  console.log(`📈 Taux de réussite: ${((successful / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n🔧 Services à vérifier:');
    results.filter(r => r.status !== 'OK').forEach(result => {
      console.log(`   - ${result.service}: ${result.error}`);
    });
  }

  console.log('\n💡 Pour démarrer les services, utilisez: npm run dev');
}

// Exécuter les tests
testAllServices().catch(console.error); 