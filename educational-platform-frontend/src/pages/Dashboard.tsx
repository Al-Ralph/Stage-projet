import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string; email: string; role: string;
  profile: { firstName: string; lastName: string; bio?: string; avatarUrl?: string | null };
}
interface Progress { id: string; courseId: string; courseTitle: string; progress: number; completed: boolean; lastAccessed: string; }
interface Recommendation { id: string; courseId: string; courseTitle: string; score: number; reason: string; }
interface SocialActivity { id: string; type: 'comment' | 'like' | 'share' | 'achievement'; content: string; timestamp: string; courseTitle?: string; }
interface DashboardStats { totalCourses: number; completedCourses: number; averageProgress: number; totalHours: number; achievements: number; }

function getCurrentUserId(): string | null {
  const json = localStorage.getItem('user');
  if (json) { try { const u = JSON.parse(json); if (u?.id) return String(u.id); } catch {} }
  const token = localStorage.getItem('token');
  if (token) { try { const payload = JSON.parse(atob(token.split('.')[1])); if (payload?.userId) return String(payload.userId); } catch {} }
  return null;
}

export default function Dashboard() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [socialActivities, setSocialActivities] = useState<SocialActivity[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const token = useMemo(() => localStorage.getItem('token'), []);
  const role = useMemo(() => { const u = localStorage.getItem('user'); try { return u ? (JSON.parse(u)?.role || null) : null; } catch { return null; } }, []);
  const userId = useMemo(() => getCurrentUserId(), []);

  useEffect(() => {
    if (!token) { navigate('/auth'); return; }
    if (role !== 'ADMIN') { navigate('/'); return; }
    if (!userId) { navigate('/auth'); return; }
    fetchDashboardData(userId);
  }, [navigate, token, role, userId]);

  async function fetchDashboardData(uid: string) {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const profileRes = await fetch(`http://localhost:3002/profile/${uid}`, { headers });
      if (profileRes.ok) setUserProfile(await profileRes.json());

      const progressRes = await fetch(`http://localhost:3005/progress/user/${uid}`, { headers });
      if (progressRes.ok) {
        const data = await progressRes.json(); setProgress(data.progress || []);
      }

      const recoRes = await fetch(`http://localhost:3004/recommendations/user/${uid}`, { headers });
      if (recoRes.ok) {
        const data = await recoRes.json(); setRecommendations(data.recommendations || []);
      }

      const socialRes = await fetch(`http://localhost:3006/activities/user/${uid}`, { headers });
      if (socialRes.ok) {
        const data = await socialRes.json(); setSocialActivities(data.activities || []);
      }

      calculateStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement du dashboard');
    } finally { setLoading(false); }
  }

  function calculateStats() {
    const totalCourses = progress.length;
    const completedCourses = progress.filter(p => p.completed).length;
    const averageProgress = totalCourses > 0 ? Math.round(progress.reduce((acc, p) => acc + p.progress, 0) / totalCourses) : 0;
    const totalHours = Math.round(progress.reduce((acc, p) => acc + (p.progress * 0.1), 0));
    const achievements = socialActivities.filter(a => a.type === 'achievement').length;
    setStats({ totalCourses, completedCourses, averageProgress, totalHours, achievements });
  }

  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); navigate('/auth'); };

  const getInitials = (f: string, l: string) => `${f?.[0] ?? ''}${l?.[0] ?? ''}`.toUpperCase();
  const getActivityIcon = (t: string) => t === 'comment' ? '💬' : t === 'like' ? '👍' : t === 'share' ? '📤' : t === 'achievement' ? '🏆' : '📝';
  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="dashboard-container"><div className="loading"><div className="loading-spinner"></div>Chargement du dashboard...</div></div>;
  if (error) return <div className="dashboard-container"><div className="error-message">{error}</div></div>;

  return (
    <div className="dashboard-container container-full">
      <div className="dashboard-header card">
        <div className="dashboard-header-content">
          <div className="logo">🎓 EduPlatform</div>
          <div className="nav-buttons">
            <button className="btn btn-secondary dashboard-button" onClick={() => navigate('/')}>Cours</button>
            <button className="btn btn-secondary dashboard-button" onClick={() => navigate('/notifications')}>Notifications</button>
            <button className="btn btn-secondary dashboard-button" onClick={() => navigate('/api-gateway')}>API Gateway</button>
            <button className="btn btn-secondary dashboard-button" onClick={() => navigate('/profile')}>Profil</button>
            <button className="btn btn-primary dashboard-button" onClick={handleLogout}>Déconnexion</button>
          </div>
        </div>
      </div>

      <div className="dashboard-main-content">
        {userProfile && (
          <div className="dashboard-section card">
            <div className="dashboard-profile">
              <div className="avatar">{getInitials(userProfile.profile.firstName, userProfile.profile.lastName)}</div>
              <div className="profile-info">
                <h1 className="profile-name">{userProfile.profile.firstName} {userProfile.profile.lastName}</h1>
                <p className="profile-email">{userProfile.email}</p>
                <div className="profile-role">{userProfile.role === 'STUDENT' ? 'Étudiant' : 'Instructeur'}</div>
              </div>
            </div>
          </div>
        )}

        {stats && (
          <div className="dashboard-section card">
            <h2 className="section-title">Mes Statistiques</h2>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-icon">📚</div><div className="stat-number">{stats.totalCourses}</div><div className="stat-label">Cours suivis</div></div>
              <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-number">{stats.completedCourses}</div><div className="stat-label">Cours terminés</div></div>
              <div className="stat-card"><div className="stat-icon">📊</div><div className="stat-number">{stats.averageProgress}%</div><div className="stat-label">Progression moyenne</div></div>
              <div className="stat-card"><div className="stat-icon">⏱️</div><div className="stat-number">{stats.totalHours}h</div><div className="stat-label">Heures d'apprentissage</div></div>
              <div className="stat-card"><div className="stat-icon">🏆</div><div className="stat-number">{stats.achievements}</div><div className="stat-label">Réalisations</div></div>
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          <div className="dashboard-section card">
            <h2 className="section-title">Mes Progrès</h2>
            {progress.length > 0 ? progress.map(item => (
              <div key={item.id} className="progress-item">
                <div className="progress-header"><h3 className="progress-title">{item.courseTitle}</h3><span className="progress-percentage">{item.progress}%</span></div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${item.progress}%` }}></div></div>
                <div className="progress-meta"><span>{item.completed ? '✅ Terminé' : '🔄 En cours'}</span><span>Dernière activité: {formatDate(item.lastAccessed)}</span></div>
              </div>
            )) : <div className="no-data">Aucun progrès enregistré.</div>}
          </div>

          <div className="dashboard-section card">
            <h2 className="section-title">Recommandations pour vous</h2>
            {recommendations.length > 0 ? recommendations.slice(0, 5).map(rec => (
              <div key={rec.id} className="recommendation-item">
                <div className="recommendation-header"><h3 className="recommendation-title">{rec.courseTitle}</h3><span className="recommendation-score">{rec.score}%</span></div>
                <p className="recommendation-reason">{rec.reason}</p>
                <button className="btn btn-primary btn-sm">Voir le cours</button>
              </div>
            )) : <div className="no-data">Aucune recommandation pour le moment.</div>}
          </div>

          <div className="dashboard-section card">
            <h2 className="section-title">Activités récentes</h2>
            {socialActivities.length > 0 ? socialActivities.slice(0, 8).map(a => (
              <div key={a.id} className="activity-item">
                <div className="activity-icon">{getActivityIcon(a.type)}</div>
                <div className="activity-content"><p className="activity-text">{a.content}</p>{a.courseTitle && <span className="activity-course">{a.courseTitle}</span>}<span className="activity-time">{formatDate(a.timestamp)}</span></div>
              </div>
            )) : <div className="no-data">Aucune activité récente.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}