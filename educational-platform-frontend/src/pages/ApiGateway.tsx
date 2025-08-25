import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/ApiGateway.css';

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'loading';
  responseTime?: number;
  lastCheck?: string;
}

interface ApiResponse {
  data?: any;
  error?: string;
  responseTime: number;
}

export default function ApiGateway() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Auth Service', status: 'loading' },
    { name: 'User Service', status: 'loading' },
    { name: 'Course Service', status: 'loading' },
    { name: 'Recommendation Service', status: 'loading' },
    { name: 'Progress Service', status: 'loading' },
    { name: 'Social Service', status: 'loading' },
    { name: 'Notification Service', status: 'loading' }
  ]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const navigate = useNavigate();

  const serviceEndpoints = {
    'Auth Service': '/api/auth/health',
    'User Service': '/api/users/health',
    'Course Service': '/api/courses/health',
    'Recommendation Service': '/api/recommendations/health',
    'Progress Service': '/api/progress/health',
    'Social Service': '/api/social/health',
    'Notification Service': '/api/notifications/health'
  };

  const testEndpoints = {
    'Auth Service': '/api/auth/register',
    'User Service': '/api/users/profile/1',
    'Course Service': '/api/courses/courses',
    'Recommendation Service': '/api/recommendations/recommendations/user/1',
    'Progress Service': '/api/progress/progress/user/1',
    'Social Service': '/api/social/activities/user/1',
    'Notification Service': '/api/notifications/notifications/1'
  };

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    const currentUser = userJson ? JSON.parse(userJson) as { role?: string } : null;
    setRole(currentUser?.role || null);
    checkAllServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAllServices = async () => {
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        const endpoint = serviceEndpoints[service.name as keyof typeof serviceEndpoints];
        if (!endpoint) return service;

        try {
          const startTime = Date.now();
          const response = await fetch(`http://localhost:3000${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          const responseTime = Date.now() - startTime;

          if (response.ok) {
            return {
              ...service,
              status: 'online' as const,
              responseTime,
              lastCheck: new Date().toISOString()
            };
          } else {
            return {
              ...service,
              status: 'offline' as const,
              lastCheck: new Date().toISOString()
            };
          }
        } catch {
          return {
            ...service,
            status: 'offline' as const,
            lastCheck: new Date().toISOString()
          };
        }
      })
    );

    setServices(updatedServices);
  };

  const testService = async (serviceName: string) => {
    setLoading(true);
    setError(null);
    setApiResponse(null);

    const endpoint = testEndpoints[serviceName as keyof typeof testEndpoints];
    if (!endpoint) {
      setError('Endpoint non trouvé pour ce service');
      setLoading(false);
      return;
    }

    try {
      const startTime = Date.now();
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const responseTime = Date.now() - startTime;

      const data = await response.json();

      setApiResponse({
        data: response.ok ? data : null,
        error: response.ok ? undefined : data.error || 'Erreur inconnue',
        responseTime
      });
    } catch (error) {
      setError(`Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'offline': return '#ef4444';
      case 'loading': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '🟢';
      case 'offline': return '🔴';
      case 'loading': return '🟡';
      default: return '⚪';
    }
  };

  return (
    <div className="api-gateway-container container-full">
      <header className="api-gateway-header">
        <div className="header-content">
          <h1>🚀 API Gateway Dashboard</h1>
          <p>Centre de contrôle centralisé pour tous les microservices</p>
          <div className="header-actions">
            <button 
              className="btn btn-primary"
              onClick={checkAllServices}
            >
              🔄 Actualiser
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/')}
            >
              🏠 Accueil
            </button>
            {role === 'ADMIN' && (
              <>
                <button 
                  className="btn btn-secondary"
                  onClick={() => navigate('/dashboard')}
                >
                  📊 Dashboard
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => navigate('/admin')}
                >
                  🛠️ Administration
                </button>
              </>
            )}
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/notifications')}
            >
              🔔 Notifications
            </button>
            <button 
              className="btn btn-danger"
              onClick={handleLogout}
            >
              🚪 Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="api-gateway-main">
        <div className="services-overview">
          <h2>📊 État des Services</h2>
          <div className="services-grid">
            {services.map((service, index) => (
              <div 
                key={index} 
                className={`service-card ${service.status}`}
                onClick={() => setSelectedService(service.name)}
              >
                <div className="service-header">
                  <span className="status-icon">{getStatusIcon(service.status)}</span>
                  <h3>{service.name}</h3>
                </div>
                <div className="service-details">
                  <p className="status">
                    Statut: <span style={{ color: getStatusColor(service.status) }}>
                      {service.status === 'online' ? 'En ligne' : 
                       service.status === 'offline' ? 'Hors ligne' : 'Vérification...'}
                    </span>
                  </p>
                  {service.responseTime && (
                    <p className="response-time">
                      Temps de réponse: <span>{service.responseTime}ms</span>
                    </p>
                  )}
                  {service.lastCheck && (
                    <p className="last-check">
                      Dernière vérification: <span>
                        {new Date(service.lastCheck).toLocaleTimeString()}
                      </span>
                    </p>
                  )}
                </div>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    testService(service.name);
                  }}
                  disabled={service.status === 'offline'}
                >
                  🧪 Tester
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="api-testing">
          <h2>🧪 Test d'API</h2>
          <div className="test-controls">
            <select 
              value={selectedService} 
              onChange={(e) => setSelectedService(e.target.value)}
              className="service-select"
            >
              <option value="">Sélectionner un service</option>
              {services.map((service, index) => (
                <option key={index} value={service.name}>
                  {service.name}
                </option>
              ))}
            </select>
            {selectedService && (
              <button 
                className="btn btn-primary"
                onClick={() => testService(selectedService)}
                disabled={loading}
              >
                {loading ? '⏳ Test en cours...' : '🚀 Lancer le test'}
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              <h3>❌ Erreur</h3>
              <p>{error}</p>
            </div>
          )}

          {apiResponse && (
            <div className="api-response">
              <h3>📡 Réponse de l'API</h3>
              <div className="response-info">
                <p><strong>Temps de réponse:</strong> {apiResponse.responseTime}ms</p>
                {apiResponse.error && (
                  <p><strong>Erreur:</strong> {apiResponse.error}</p>
                )}
              </div>
              {apiResponse.data && (
                <div className="response-data">
                  <h4>📄 Données reçues:</h4>
                  <pre>{JSON.stringify(apiResponse.data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="gateway-info">
          <h2>ℹ️ Informations sur l'API Gateway</h2>
          <div className="info-grid">
            <div className="info-card">
              <h3>🎯 Fonctionnalités</h3>
              <ul>
                <li>Routage centralisé vers tous les microservices</li>
                <li>Authentification et autorisation</li>
                <li>Limitation de débit (Rate Limiting)</li>
                <li>Gestion des erreurs et fallbacks</li>
                <li>Logging et monitoring</li>
              </ul>
            </div>
            <div className="info-card">
              <h3>🔧 Services disponibles</h3>
              <ul>
                <li><strong>/api/auth</strong> - Authentification</li>
                <li><strong>/api/users</strong> - Gestion des utilisateurs</li>
                <li><strong>/api/courses</strong> - Gestion des cours</li>
                <li><strong>/api/recommendations</strong> - Recommandations IA</li>
                <li><strong>/api/progress</strong> - Suivi des progrès</li>
                <li><strong>/api/social</strong> - Fonctionnalités sociales</li>
                <li><strong>/api/notifications</strong> - Notifications</li>
              </ul>
            </div>
            <div className="info-card">
              <h3>🛡️ Sécurité</h3>
              <ul>
                <li>Middleware Helmet pour la sécurité</li>
                <li>CORS configuré</li>
                <li>Validation des tokens JWT</li>
                <li>Protection contre les attaques</li>
                <li>Logs de sécurité</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}