import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Home.css';
import ChatWidget from './Chatwidget';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: number;
  price: number;
  instructor: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  _count: {
    enrollments: number;
    reviews: number;
  };
}

interface CourseFilters {
  category: string;
  level: string;
  search: string;
}

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CourseFilters>({
    category: '',
    level: '',
    search: '',
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier l'authentification
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    // Charger les cours
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3003/courses');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.courses && Array.isArray(data.courses)) {
        setCourses(data.courses);
      } else {
        setCourses([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/auth');
  };

  const handleEnroll = async (courseId: string) => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3003/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        // Idéalement, le backend lit l'utilisateur depuis le token
        body: JSON.stringify({}),
      });

      if (response.ok) {
        await response.json();
        alert(`✅ Inscription réussie au cours !`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`❌ Erreur: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      alert("❌ Erreur lors de l'inscription au cours");
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      course.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory = !filters.category || course.category === filters.category;
    const matchesLevel = !filters.level || course.level === filters.level;

    return matchesSearch && matchesCategory && matchesLevel;
  });

  const categories = [...new Set(courses.map((course) => course.category))];
  const levels = [...new Set(courses.map((course) => course.level))];

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="loading-spinner"
              style={{
                width: '24px',
                height: '24px',
                border: '3px solid rgba(255,255,255,0.3)',
                borderTop: '3px solid white',
                borderRadius: '50%',
              }}
            ></div>
            Chargement des cours...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container container-full">
      {/* Header */}
      <div className="home-header card">
        <div className="home-header-content">
          <div className="logo">🎓 EduPlatform</div>
          <div className="nav-buttons">
            {isAuthenticated ? (
              <>
                <button className="btn btn-secondary home-button" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
                <button className="btn btn-secondary home-button" onClick={() => navigate('/notifications')}>
                  Notifications
                </button>
                <button className="btn btn-secondary home-button" onClick={() => navigate('/api-gateway')}>
                  API Gateway
                </button>
                <button className="btn btn-secondary home-button" onClick={() => navigate('/admin')}>
                  Administration
                </button>
                <button className="btn btn-secondary home-button" onClick={() => navigate('/ai-insights')}>
                  IA Insights
                </button>
                <button className="btn btn-secondary home-button" onClick={() => navigate('/profile')}>
                  Mon Profil
                </button>
                <button className="btn btn-primary home-button" onClick={handleLogout}>
                  Déconnexion
                </button>
              </>
            ) : (
              <button className="btn btn-primary home-button" onClick={() => navigate('/auth')}>
                Connexion
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="home-main-content">
        {/* Filtres */}
        <div className="home-filters card">
          <div className="home-filters-grid">
            <div className="filter-group">
              <label className="filter-label">Rechercher</label>
              <input
                type="text"
                placeholder="Rechercher un cours..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input home-input"
              />
            </div>
            <div className="filter-group">
              <label className="filter-label">Catégorie</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="select home-select"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Niveau</label>
              <select
                value={filters.level}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                className="select home-select"
              >
                <option value="">Tous les niveaux</option>
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="error-message">
            <strong>Erreur:</strong> {error}
            <button className="btn btn-secondary" onClick={fetchCourses} style={{ marginLeft: '12px' }}>
              Réessayer
            </button>
          </div>
        )}

        {/* Informations de débogage */}
        {!error && (
          <div className="debug-info">
            📊 <strong>Statistiques:</strong> {courses.length} cours disponibles, {filteredCourses.length} cours filtrés
          </div>
        )}

        {/* Grille des cours */}
        <div className="home-courses-grid">
          {filteredCourses.map((course) => (
            <div key={course.id} className={`card home-course-card stagger-animation`}>
              <div className="course-header">
                <div className="course-title-section">
                  <h3 className="course-title">{course.title}</h3>
                </div>
                <div className="course-category">{course.category}</div>
              </div>

              <p className="course-description">{course.description}</p>

              <div className="instructor">
                <div className="avatar">
                  {course.instructor.profile.firstName[0]}
                  {course.instructor.profile.lastName[0]}
                </div>
                <span>
                  {course.instructor.profile.firstName} {course.instructor.profile.lastName}
                </span>
              </div>

              <div className="course-meta home-course-meta">
                <div className="course-info">
                  <span>📚 {course.level}</span>
                  <span>⏱️ {course.duration} min</span>
                  <div className="course-stats">
                    <span>👥 {course._count.enrollments}</span>
                    <span>⭐ {course._count.reviews}</span>
                  </div>
                </div>
                <div className="course-price">{course.price}€</div>
              </div>

              <button className="btn btn-primary home-enroll-button" onClick={() => handleEnroll(course.id)}>
                {isAuthenticated ? "S'inscrire" : "Se connecter pour s'inscrire"}
              </button>
            </div>
          ))}
        </div>

        {/* Message si aucun cours */}
        {filteredCourses.length === 0 && !loading && !error && (
          <div className="no-courses">
            <h3>Aucun cours trouvé</h3>
            <p>
              {courses.length === 0
                ? "Aucun cours n'est disponible pour le moment."
                : 'Aucun cours ne correspond à vos critères de recherche.'}
            </p>
            {courses.length === 0 && (
              <button className="btn btn-primary" onClick={fetchCourses} style={{ marginTop: '16px' }}>
                Recharger les cours
              </button>
            )}
          </div>
        )}
      </div>

      {/* Seul chat restant: le widget flottant aux couleurs de la marque */}
      <ChatWidget
        brandName="EduPlatform"
        welcomeText="Bonjour, je suis en ligne pour les questions, rendez-vous, informations et inscriptions, n'hésitez-pas!"
        palette={{
          primary: '#f97316',     // Orange (header & bouton)
          accent: '#2b1556',      // Violet profond (icône/avatar) si vous préférez (#7c3aed possible)
          textOnPrimary: '#ffffff',
          bubbleBg: 'rgba(43,21,86,0.08)',    // bulle AI
          userBubbleBg: 'rgba(249,115,22,0.12)', // bulle utilisateur
          border: '#f97316',       // contour de la bulle teaser
        }}
        position="right"
      />
    </div>
  );
}