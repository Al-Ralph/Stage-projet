import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/AIInsights.css';

interface AIAnalysis {
  userId: string;
  courseId: string;
  timestamp: string;
  insights: {
    learningStyle: string;
    pace: string;
    strengths: string[];
    weaknesses: string[];
    recommendedActions: string[];
    predictedCompletionTime: string;
    successProbability: number;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    description: string;
    impact: string;
  }>;
}

interface AIRecommendation {
  userId: string;
  timestamp: string;
  recommendations: Array<{
    id: string;
    type: string;
    title: string;
    reason: string;
    confidence: number;
    estimatedValue: string;
  }>;
  learningPath: {
    currentLevel: string;
    nextSteps: string[];
    estimatedTimeline: string;
  };
}

interface AIOptimization {
  courseId: string;
  timestamp: string;
  optimizations: Array<{
    section: string;
    type: string;
    currentDifficulty?: string;
    recommendedDifficulty?: string;
    reason: string;
    impact: string;
  }>;
  predictedImprovements: {
    completionRate: string;
    satisfactionScore: string;
    learningEfficiency: string;
  };
}

interface DropoutPrediction {
  userId: string;
  courseId: string;
  timestamp: string;
  riskAssessment: {
    dropoutRisk: string;
    riskScore: number;
    confidence: number;
    factors: Array<{
      factor: string;
      weight: number;
      description: string;
    }>;
  };
  interventions: Array<{
    type: string;
    priority: string;
    action: string;
    expectedImpact: string;
  }>;
}

export default function AIInsights() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'recommendations' | 'optimization' | 'predictions' | 'models'>('analysis');
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation | null>(null);
  const [optimization, setOptimization] = useState<AIOptimization | null>(null);
  const [dropoutPrediction, setDropoutPrediction] = useState<DropoutPrediction | null>(null);
  const [modelStats, setModelStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
      return;
    }
    
    fetchAIInsights();
  }, [navigate]);

  const fetchAIInsights = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAnalysis(),
        fetchRecommendations(),
        fetchOptimization(),
        fetchDropoutPrediction(),
        fetchModelStats()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    try {
      const response = await fetch('http://localhost:3008/analyze/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'user-1',
          courseId: 'course-1',
          learningData: {
            sessions: 15,
            totalTime: 1200,
            exercisesCompleted: 45,
            averageScore: 87.5
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('http://localhost:3008/recommendations/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'user-1',
          context: 'learning_progress'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      }
    } catch (error) {
      console.error('Erreur lors des recommandations:', error);
    }
  };

  const fetchOptimization = async () => {
    try {
      const response = await fetch('http://localhost:3008/optimize/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courseId: 'course-1',
          userFeedback: {
            satisfaction: 4.2,
            difficulty: 3.8,
            engagement: 4.5
          },
          performanceData: {
            completionRate: 78.5,
            averageTime: 45,
            dropoutRate: 12.3
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setOptimization(data);
      }
    } catch (error) {
      console.error('Erreur lors de l\'optimisation:', error);
    }
  };

  const fetchDropoutPrediction = async () => {
    try {
      const response = await fetch('http://localhost:3008/predict/dropout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'user-1',
          courseId: 'course-1',
          behaviorData: {
            lastActivity: '2024-01-20T10:00:00Z',
            sessionDuration: 25,
            exercisesAttempted: 3,
            timeSpent: 180
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDropoutPrediction(data);
      }
    } catch (error) {
      console.error('Erreur lors de la prédiction:', error);
    }
  };

  const fetchModelStats = async () => {
    try {
      const response = await fetch('http://localhost:3008/models/stats');
      if (response.ok) {
        const data = await response.json();
        setModelStats(data);
      }
    } catch (error) {
      console.error('Erreur lors des stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth');
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="ai-insights-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          Analyse IA en cours...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-insights-container">
        <div className="error-message">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="ai-insights-container container-full">
      {/* Header */}
      <header className="ai-insights-header card">
        <div className="ai-insights-header-content">
          <div className="logo">
            🤖 IA Insights - EduPlatform
          </div>
          <div className="nav-buttons">
            <button 
              className="btn btn-secondary ai-insights-button"
              onClick={() => navigate('/')}
            >
              Accueil
            </button>
            <button 
              className="btn btn-secondary ai-insights-button"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </button>
            <button 
              className="btn btn-secondary ai-insights-button"
              onClick={() => navigate('/admin')}
            >
              Administration
            </button>
            <button 
              className="btn btn-primary ai-insights-button"
              onClick={handleLogout}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="ai-insights-main-content">
        {/* Navigation des onglets */}
        <nav className="ai-insights-tabs card">
          <button 
            className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            📊 Analyse Performance
          </button>
          <button 
            className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            🎯 Recommandations
          </button>
          <button 
            className={`tab-btn ${activeTab === 'optimization' ? 'active' : ''}`}
            onClick={() => setActiveTab('optimization')}
          >
            ⚡ Optimisation
          </button>
          <button 
            className={`tab-btn ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictions')}
          >
            🔮 Prédictions
          </button>
          <button 
            className={`tab-btn ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            🧠 Modèles IA
          </button>
        </nav>

        {/* Contenu des onglets */}
        <div className="ai-insights-content">
          {activeTab === 'analysis' && analysis && (
            <div className="analysis-section">
              <h2>Analyse des Performances d'Apprentissage</h2>
              
              <div className="insights-grid">
                <div className="insight-card">
                  <h3>🎯 Style d'Apprentissage</h3>
                  <div className="insight-value">{analysis.insights.learningStyle}</div>
                  <p>Votre profil d'apprentissage dominant</p>
                </div>

                <div className="insight-card">
                  <h3>⚡ Rythme</h3>
                  <div className="insight-value">{analysis.insights.pace}</div>
                  <p>Votre vitesse d'apprentissage optimale</p>
                </div>

                <div className="insight-card">
                  <h3>📈 Probabilité de Réussite</h3>
                  <div className="insight-value">{analysis.insights.successProbability}%</div>
                  <p>Basé sur vos performances actuelles</p>
                </div>

                <div className="insight-card">
                  <h3>⏱️ Temps de Complétion</h3>
                  <div className="insight-value">{analysis.insights.predictedCompletionTime}</div>
                  <p>Temps estimé pour terminer le cours</p>
                </div>
              </div>

              <div className="strengths-weaknesses">
                <div className="strengths">
                  <h3>💪 Vos Forces</h3>
                  <ul>
                    {analysis.insights.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>

                <div className="weaknesses">
                  <h3>🎯 Axes d'Amélioration</h3>
                  <ul>
                    {analysis.insights.weaknesses.map((weakness, index) => (
                      <li key={index}>{weakness}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="recommendations-section">
                <h3>🚀 Actions Recommandées</h3>
                <div className="recommendations-list">
                  {analysis.recommendations.map((rec, index) => (
                    <div key={index} className="recommendation-item">
                      <div className="recommendation-header">
                        <span className={`priority-badge ${rec.priority}`}>
                          {rec.priority}
                        </span>
                        <span className="impact-badge">{rec.impact}</span>
                      </div>
                      <p>{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && recommendations && (
            <div className="recommendations-section">
              <h2>Recommandations Personnalisées</h2>
              
              <div className="learning-path">
                <h3>🛤️ Parcours d'Apprentissage</h3>
                <div className="path-info">
                  <div className="current-level">
                    <span>Niveau actuel:</span>
                    <strong>{recommendations.learningPath.currentLevel}</strong>
                  </div>
                  <div className="timeline">
                    <span>Timeline estimée:</span>
                    <strong>{recommendations.learningPath.estimatedTimeline}</strong>
                  </div>
                </div>
                
                <div className="next-steps">
                  <h4>Prochaines étapes:</h4>
                  <ol>
                    {recommendations.learningPath.nextSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="recommendations-grid">
                {recommendations.recommendations.map((rec) => (
                  <div key={rec.id} className="recommendation-card">
                    <div className="recommendation-header">
                      <h3>{rec.title}</h3>
                      <span className={`value-badge ${rec.estimatedValue}`}>
                        {rec.estimatedValue}
                      </span>
                    </div>
                    <p className="recommendation-reason">{rec.reason}</p>
                    <div className="recommendation-meta">
                      <span className="confidence">
                        Confiance: {rec.confidence}%
                      </span>
                      <span className="type-badge">{rec.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'optimization' && optimization && (
            <div className="optimization-section">
              <h2>Optimisation du Contenu</h2>
              
              <div className="improvements-preview">
                <h3>📈 Améliorations Prédites</h3>
                <div className="improvements-grid">
                  <div className="improvement-card">
                    <div className="improvement-icon">📊</div>
                    <div className="improvement-value">{optimization.predictedImprovements.completionRate}</div>
                    <div className="improvement-label">Taux de complétion</div>
                  </div>
                  <div className="improvement-card">
                    <div className="improvement-icon">😊</div>
                    <div className="improvement-value">{optimization.predictedImprovements.satisfactionScore}</div>
                    <div className="improvement-label">Satisfaction</div>
                  </div>
                  <div className="improvement-card">
                    <div className="improvement-icon">⚡</div>
                    <div className="improvement-value">{optimization.predictedImprovements.learningEfficiency}</div>
                    <div className="improvement-label">Efficacité</div>
                  </div>
                </div>
              </div>

              <div className="optimizations-list">
                <h3>🔧 Optimisations Suggérées</h3>
                {optimization.optimizations.map((opt, index) => (
                  <div key={index} className="optimization-item">
                    <div className="optimization-header">
                      <h4>{opt.section}</h4>
                      <span className={`impact-badge ${opt.impact}`}>
                        {opt.impact}
                      </span>
                    </div>
                    <p className="optimization-reason">{opt.reason}</p>
                    {opt.currentDifficulty && opt.recommendedDifficulty && (
                      <div className="difficulty-change">
                        <span>Difficulté: {opt.currentDifficulty} → {opt.recommendedDifficulty}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'predictions' && dropoutPrediction && (
            <div className="predictions-section">
              <h2>Prédictions d'Abandon</h2>
              
              <div className="risk-assessment">
                <h3>⚠️ Évaluation des Risques</h3>
                <div className="risk-overview">
                  <div className="risk-score">
                    <div className="risk-circle" style={{ 
                      background: `conic-gradient(${getRiskColor(dropoutPrediction.riskAssessment.dropoutRisk)} ${dropoutPrediction.riskAssessment.riskScore * 360}deg, rgba(255,255,255,0.1) 0deg)` 
                    }}>
                      <div className="risk-value">
                        {Math.round(dropoutPrediction.riskAssessment.riskScore * 100)}%
                      </div>
                    </div>
                    <div className="risk-label">
                      Risque d'abandon: <strong>{dropoutPrediction.riskAssessment.dropoutRisk}</strong>
                    </div>
                  </div>
                  
                  <div className="confidence-info">
                    <span>Confiance: {dropoutPrediction.riskAssessment.confidence}%</span>
                  </div>
                </div>
              </div>

              <div className="risk-factors">
                <h3>🔍 Facteurs de Risque</h3>
                <div className="factors-list">
                  {dropoutPrediction.riskAssessment.factors.map((factor, index) => (
                    <div key={index} className="factor-item">
                      <div className="factor-header">
                        <span className="factor-name">{factor.factor}</span>
                        <span className="factor-weight">{Math.round(factor.weight * 100)}%</span>
                      </div>
                      <p className="factor-description">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="interventions">
                <h3>🛠️ Interventions Recommandées</h3>
                <div className="interventions-list">
                  {dropoutPrediction.interventions.map((intervention, index) => (
                    <div key={index} className="intervention-item">
                      <div className="intervention-header">
                        <span className={`priority-badge ${intervention.priority}`}>
                          {intervention.priority}
                        </span>
                        <span className="impact-badge">{intervention.expectedImpact}</span>
                      </div>
                      <p className="intervention-action">{intervention.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'models' && modelStats && (
            <div className="models-section">
              <h2>Modèles IA</h2>
              
              <div className="models-overview">
                <h3>📊 Vue d'Ensemble</h3>
                <div className="overview-stats">
                  <div className="stat-item">
                    <div className="stat-value">{modelStats.overallMetrics.totalPredictions}</div>
                    <div className="stat-label">Prédictions totales</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{modelStats.overallMetrics.averageAccuracy}%</div>
                    <div className="stat-label">Précision moyenne</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{modelStats.overallMetrics.activeUsers}</div>
                    <div className="stat-label">Utilisateurs actifs</div>
                  </div>
                </div>
              </div>

              <div className="models-grid">
                {Object.entries(modelStats.models).map(([modelName, model]: [string, any]) => (
                  <div key={modelName} className="model-card">
                    <div className="model-header">
                      <h3>{modelName}</h3>
                      <span className="version-badge">v{model.version}</span>
                    </div>
                    
                    <div className="model-stats">
                      <div className="accuracy">
                        <span>Précision:</span>
                        <strong>{model.accuracy}%</strong>
                      </div>
                      <div className="last-update">
                        <span>Dernière mise à jour:</span>
                        <span>{new Date(model.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="model-features">
                      <h4>Fonctionnalités:</h4>
                      <ul>
                        {model.features.map((feature: string, index: number) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="performance-metrics">
                <h3>⚡ Métriques de Performance</h3>
                <div className="performance-grid">
                  <div className="performance-item">
                    <span>Temps de réponse:</span>
                    <strong>{modelStats.performance.responseTime}</strong>
                  </div>
                  <div className="performance-item">
                    <span>Disponibilité:</span>
                    <strong>{modelStats.performance.uptime}</strong>
                  </div>
                  <div className="performance-item">
                    <span>Mises à jour:</span>
                    <strong>{modelStats.performance.modelUpdates}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 