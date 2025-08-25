import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

//
// Admin — version complète avec la modification permettant d'ajouter des cours
// - Ajout du chargement des INSTRUCTORs depuis USER_API
// - Ajout d’un champ "Instructeur" dans le formulaire de cours
// - Normalisation du champ "level" avant envoi (UPPER/LOWER selon config)
// - Utilisation d’apiRequest (avec bearer + refresh) pour POST/PUT courses
//

// Ajuste si ton backend attend les niveaux en minuscule
const COURSE_LEVEL_FORMAT: 'UPPER' | 'LOWER' = 'UPPER';

const COURSE_API = 'http://localhost:3003';
const USER_API = 'http://localhost:3002';
const AUTH_API = 'http://localhost:3001';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | string;
  duration: number;
  price: number;
  status: 'draft' | 'published' | 'archived' | string;
  instructor?: { id?: string; firstName?: string; lastName?: string };
  _count?: { enrollments: number; reviews: number };
}

interface UserProfile {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  level?: string | null;
}

type UserRole = 'ADMIN' | 'STUDENT' | 'INSTRUCTOR' | string;

interface User {
  id: string;
  email: string;
  role: UserRole;
  status?: 'active' | 'disabled' | 'pending' | string;
  profile?: UserProfile;
  createdAt?: string;
  lastLoginAt?: string;
}

type Tab = 'dashboard' | 'users' | 'courses' | 'analytics' | 'ai';

// ---------- Helpers auth (Authorization + refresh 401) ----------
async function apiRequest(url: string, init: RequestInit = {}) {
  const withAuth = addAuth(init);
  let res = await fetch(url, withAuth);
  if (res.status === 401 && (await tryRefreshToken())) {
    res = await fetch(url, addAuth(init));
  }
  return res;
}
function addAuth(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers || {});
  const token = localStorage.getItem('token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return { ...init, headers };
}
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${AUTH_API}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    if (data?.accessToken) {
      localStorage.setItem('token', data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ---------- CSS (thème admin) ----------
const css = `
.gradient-bg {
  min-height: 100vh;
  background: radial-gradient(1200px 800px at 20% -10%, #5b21b6 0%, transparent 60%),
    linear-gradient(160deg, #6d28d9 0%, #7c3aed 40%, #8b5cf6 70%, #7e22ce 100%);
  background-attachment: fixed;
  padding: 16px;
  box-sizing: border-box;
}
.glass-dark {
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)), #101014;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05);
}
.glass-section {
  background: linear-gradient(180deg, rgba(0,0,0,0.25), rgba(255,255,255,0.02)), rgba(8,8,10,0.7);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04);
  padding: 16px;
  color: #e5e7eb;
}
.header-shell { padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.brand { display:flex; align-items:center; gap:10px; color:#dcd8ff; font-weight:700; }
.brand-icon { font-size:22px; filter: drop-shadow(0 4px 12px rgba(168,85,247,0.5)); }
.brand-title { font-size:18px; }
.pill-nav { display:flex; gap:12px; align-items:center; }
.pill {
  appearance:none; border:0; border-radius:14px; font-weight:700; padding:10px 16px; cursor:pointer; transition:all .2s ease;
  box-shadow:0 6px 20px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.7);
}
.pill-ghost { background:linear-gradient(180deg,#fff,#f4f5f7); color:#1f2937; border:1px solid #d1d5db; }
.pill-ghost:hover { transform: translateY(-1px); }
.pill-primary { background:linear-gradient(135deg,#7c3aed,#a855f7); color:#fff; border:1px solid rgba(255,255,255,.1); }
.pill-primary:hover { filter:brightness(1.05); transform: translateY(-1px); }
.pill-danger { background:linear-gradient(135deg,#ef4444,#f97316); color:#fff; border:1px solid rgba(255,255,255,.1); }
.pill.sm { padding:8px 12px; border-radius:12px; }

.admin-tabs { display:flex; gap:8px; padding:6px; margin-bottom:12px; border-radius:14px; }
.tab-pill {
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
  border: 1px solid rgba(255,255,255,.08);
  color:#d1d5db; padding:10px 14px; border-radius:12px; cursor:pointer; transition:all .2s ease;
}
.tab-pill.active {
  background: linear-gradient(135deg,#7c3aed,#a855f7);
  color:#fff; border:1px solid rgba(255,255,255,.18);
  box-shadow:0 10px 24px rgba(124,58,237,.45), inset 0 1px 0 rgba(255,255,255,.2);
}

.card { border-radius: 18px; }

.loading { color:#e5e7eb; }
.loading-spinner { width:18px; height:18px; border:3px solid rgba(255,255,255,.25); border-top-color:#a78bfa; border-radius:50%; display:inline-block; margin-right:8px; animation:spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.error-message { color:#fecaca; background:rgba(239,68,68,.18); border:1px solid rgba(239,68,68,.35); padding:10px 12px; border-radius:12px; }

.section-title { font-size:22px; font-weight:800; color:#a78bfa; margin:8px 0 6px; }
.section-subtitle { color:#c7c9d1; opacity:.9; }

.users-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:14px; margin-top:10px; }
.white-card { background: linear-gradient(180deg,#fff,#f9fafb); border:1px solid #e5e7eb; border-radius:16px; color:#111827; box-shadow:0 20px 35px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.7); }

.user-card-header { display:flex; align-items:center; gap:12px; }
.user-avatar { width:42px; height:42px; border-radius:50%; display:grid; place-items:center; font-weight:800; color:#fff; background:linear-gradient(135deg,#7c3aed,#a855f7); box-shadow:0 6px 16px rgba(124,58,237,.35); }
.user-name { font-weight:800; font-size:16px; margin:0; color:#1f2937; }
.user-email { color:#6b7280; font-size:13px; }
.user-meta { display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; margin-top:10px; color:#374151; font-weight:600; }
.role-badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:999px; font-weight:800; font-size:12px; background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe; }
.status-chip { display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; font-weight:700; font-size:12px; border:1px solid; }
.status-active { color:#065f46; background:#d1fae5; border-color:#a7f3d0; }
.status-disabled { color:#7f1d1d; background:#fee2e2; border-color:#fecaca; }
.status-pending { color:#7c2d12; background:#ffedd5; border-color:#fed7aa; }

.section-toolbar { display:flex; gap:8px; align-items:center; margin:8px 0 4px; }
.toolbar-spacer { flex: 1; }

/* Formulaire cours */
.form-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:12px; margin-top:8px; }
.form-group { display:flex; flex-direction:column; gap:6px; }
.input, .select, textarea.input {
  background:#111316; color:#e5e7eb; border:1px solid rgba(255,255,255,0.08);
  border-radius:12px; padding:10px 12px; outline:none; transition:all .2s ease;
}
.input:focus, .select:focus, textarea.input:focus {
  border-color:#a855f7; box-shadow:0 0 0 3px rgba(168,85,247,0.25);
}
.form-actions { display:flex; gap:10px; margin-top:12px; }
`;

// ---------- Helpers UI ----------
function toTitleCase(input: string) {
  const cleaned = (input || '').replace(/[_\-\.]+/g, ' ').trim();
  return cleaned
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
}
function fullName(u: User) {
  const f = u.profile?.firstName?.trim();
  const l = u.profile?.lastName?.trim();
  if (f || l) return `${f || ''} ${l || ''}`.trim();
  const beforeAt = (u.email || '').split('@')[0] || '';
  return toTitleCase(beforeAt) || 'Utilisateur';
}
function initials(u: User) {
  const f = u.profile?.firstName?.trim()?.[0] || '';
  const l = u.profile?.lastName?.trim()?.[0] || '';
  const i = (f + l).toUpperCase();
  return i || (u.email?.[0] || 'U').toUpperCase();
}
function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}
const roleLabel = (r: string) =>
  r.replace(/^ADMIN$/i, 'Admin').replace(/^STUDENT$/i, 'Étudiant').replace(/^INSTRUCTOR$/i, 'Instructeur');

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const navigate = useNavigate();

  // --------- Sécurité d’accès (ADMIN uniquement) ---------
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  useEffect(() => {
    const token = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    const role = (() => {
      try { return u ? JSON.parse(u)?.role : null; } catch { return null; }
    })();
    if (!token) { navigate('/auth'); return; }
    if (role !== 'ADMIN') { navigate('/'); return; }
    try { setCurrentUser(u ? JSON.parse(u) as User : null); } catch { setCurrentUser(null); }
  }, [navigate]);

  // --------- Utilisateurs (SANS RECHERCHE) ---------
  const [users, setUsers] = useState<User[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userLimit] = useState(24);
  const [userTotal, setUserTotal] = useState(0);
  const userPages = useMemo(() => Math.max(1, Math.ceil(userTotal / userLimit)), [userTotal, userLimit]);

  async function fetchAllUsers(page = 1, limit = 24) {
    try {
      setLoadingUsers(true);
      setUsersError(null);

      // Pagination si supportée; sinon fallback
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      let res = await apiRequest(`${USER_API}/users?${params.toString()}`, { method: 'GET' });
      let data: any = await res.json().catch(() => ({}));

      if (!res.ok || (!Array.isArray(data) && !Array.isArray(data?.users))) {
        res = await apiRequest(`${USER_API}/users`, { method: 'GET' });
        data = await res.json().catch(() => ({}));
      }

      const list: User[] = Array.isArray(data) ? data : (data.users || []);
      setUsers(list || []);
      const total = (data.pagination && data.pagination.total) || (Array.isArray(data) ? data.length : list.length || 0);
      setUserTotal(total);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Erreur lors du chargement des utilisateurs");
      setUsers([]);
      setUserTotal(0);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'users') {
      fetchAllUsers(userPage, userLimit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userPage]);

  // --------- Cours ---------
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  async function fetchCoursesFromApi() {
    try {
      setLoadingCourses(true);
      setCoursesError(null);
      const res = await fetch(`${COURSE_API}/courses`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (e) {
      setCoursesError(e instanceof Error ? e.message : 'Erreur inconnue');
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  }
  useEffect(() => {
    fetchCoursesFromApi();
  }, []);

  // --------- Instructeurs (NOUVEAU pour pouvoir créer des cours) ---------
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [instructorError, setInstructorError] = useState<string | null>(null);

  async function fetchInstructors() {
    try {
      setLoadingInstructors(true);
      setInstructorError(null);
      // Le User Service supporte le filtre de rôle via ?role=INSTRUCTOR (selon l’implémentation partagée)
      const res = await apiRequest(`${USER_API}/users?role=INSTRUCTOR&limit=1000`, { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      const list: User[] = Array.isArray(data) ? data : (data.users || []);
      setInstructors(list);
    } catch (e) {
      setInstructorError(e instanceof Error ? e.message : "Erreur lors du chargement des instructeurs");
      setInstructors([]);
    } finally {
      setLoadingInstructors(false);
    }
  }
  useEffect(() => {
    if (activeTab === 'courses') fetchInstructors();
  }, [activeTab]);

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const emptyCourseForm = {
    title: '',
    description: '',
    category: '',
    level: 'BEGINNER' as const,
    duration: 60,
    price: 0,
    status: 'draft' as Course['status'],
    instructorId: '' as string | undefined
  };
  const [courseForm, setCourseForm] = useState<typeof emptyCourseForm>(emptyCourseForm);
  const [savingCourse, setSavingCourse] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function openCreateForm() {
    setEditingCourse(null);

    // Si la liste d'instructeurs n'est pas encore chargée, on la charge maintenant
    if (instructors.length === 0 && !loadingInstructors) {
      await fetchInstructors();
    }

    // Pré-sélection:
    // - si l’admin est aussi INSTRUCTOR, prends son id
    // - sinon, prends le premier instructeur disponible, sinon vide
    const preselected =
      (currentUser?.role === 'INSTRUCTOR' && currentUser?.id) ||
      (instructors.length > 0 ? instructors[0].id : '');

    setCourseForm({ ...emptyCourseForm, instructorId: preselected || undefined });
    setShowCourseForm(true);
  }

  function openEditForm(course: Course) {
    setEditingCourse(course);
    setCourseForm({
      title: course.title || '',
      description: course.description || '',
      category: course.category || '',
      level: (course.level as any) || 'BEGINNER',
      duration: course.duration || 60,
      price: course.price || 0,
      status: (course.status as any) || 'draft',
      instructorId: course.instructor?.id || ''
    });
    setShowCourseForm(true);
  }

  function closeForm() {
    setShowCourseForm(false);
    setEditingCourse(null);
    setCourseForm(emptyCourseForm);
    setSaveError(null);
  }

  const getStatusColor = (status: string) =>
    status === 'published' ? '#10b981' : status === 'draft' ? '#f59e0b' : '#6b7280';

  // Normalisation du level selon ce que le backend attend
  function normalizeLevel(lvl: string) {
    const v = (lvl || '').trim();
    return COURSE_LEVEL_FORMAT === 'LOWER' ? v.toLowerCase() : v.toUpperCase();
  }

  async function createCourse() {
    try {
      setSavingCourse(true);
      setSaveError(null);
      const { payload, errors } = sanitizeCoursePayload({ ...courseForm, level: normalizeLevel(courseForm.level) });
      if (errors.length) {
        setSaveError(errors.join(' '));
        return;
      }
      const res = await apiRequest(`${COURSE_API}/courses`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (Array.isArray(data?.errors) && data.errors.map((e: any) => e.msg || e).join(' | ')) ||
          data?.error ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }
      await fetchCoursesFromApi();
      closeForm();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur lors de la création du cours');
    } finally {
      setSavingCourse(false);
    }
  }

  async function updateCourse(id: string) {
    try {
      setSavingCourse(true);
      setSaveError(null);
      const { payload, errors } = sanitizeCoursePayload({ ...courseForm, level: normalizeLevel(courseForm.level) });
      if (errors.length) {
        setSaveError(errors.join(' '));
        return;
      }
      const res = await apiRequest(`${COURSE_API}/courses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (Array.isArray(data?.errors) && data.errors.map((e: any) => e.msg || e).join(' | ')) ||
          data?.error ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }
      await fetchCoursesFromApi();
      closeForm();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur lors de la mise à jour du cours');
    } finally {
      setSavingCourse(false);
    }
  }

  async function deleteCourse(id: string) {
    if (!confirm('Supprimer ce cours ?')) return;
    try {
      const res = await apiRequest(`${COURSE_API}/courses/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      await fetchCoursesFromApi();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <div className="admin-container container-full gradient-bg">
      <style>{css}</style>

      {/* Header */}
      <header className="admin-header card glass-dark header-shell">
        <div className="brand">
          <span className="brand-icon">🎓</span>
          <span className="brand-title"><strong>EduPlatform</strong> - Administration</span>
        </div>
        <div className="pill-nav">
          <button className="pill pill-ghost" onClick={() => navigate('/')}>Accueil</button>
          <button className="pill pill-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="pill pill-primary" onClick={handleLogout}>Déconnexion</button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="admin-tabs glass-dark">
        <button className={`tab-pill ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📊 Tableau de bord</button>
        <button className={`tab-pill ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 Utilisateurs</button>
        <button className={`tab-pill ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>📚 Cours</button>
        <button className={`tab-pill ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>📈 Analytics</button>
        <button className={`tab-pill ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>🤖 IA Insights</button>
      </nav>

      {/* Content */}
      <div className="admin-content">
        {/* Utilisateurs (sans recherche) */}
        {activeTab === 'users' && (
          <section className="card glass-section">
            <h2 className="section-title" style={{ marginBottom: 6 }}>Gestion des utilisateurs</h2>
            <p className="section-subtitle">Liste complète des utilisateurs existants.</p>

            <div className="section-toolbar">
              <div style={{ color: '#cbd5e1', fontWeight: 700 }}>
                Total: {userTotal} utilisateur{userTotal > 1 ? 's' : ''}
              </div>
              <div className="toolbar-spacer" />
              <button className="pill pill-ghost" onClick={() => fetchAllUsers(userPage, userLimit)}>🔄 Actualiser</button>
            </div>

            {loadingUsers && (
              <div className="loading" style={{ marginBottom: 12 }}>
                <span className="loading-spinner" /> Chargement des utilisateurs…
              </div>
            )}
            {usersError && (
              <div className="error-message" style={{ marginBottom: 12 }}>
                {usersError}
              </div>
            )}

            {!loadingUsers && !usersError && (
              <>
                <div className="users-grid">
                  {users.map((u) => (
                    <div key={u.id} className="card white-card" style={{ padding: 12 }}>
                      <div className="user-card-header">
                        <div className="user-avatar">{initials(u)}</div>
                        <div>
                          <h4 className="user-name">{fullName(u)}</h4>
                          <div className="user-email">{u.email}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="role-badge">{roleLabel(u.role)}</span>
                        <span className={`status-chip ${
                          (u.status || 'active') === 'active'
                            ? 'status-active'
                            : (u.status || '').includes('disable')
                            ? 'status-disabled'
                            : 'status-pending'
                        }`}>
                          {u.status || 'active'}
                        </span>
                        {u.profile?.level && (
                          <span className="status-chip" style={{ color: '#155e75', background: '#ecfeff', borderColor: '#a5f3fc' }}>
                            Niveau: {u.profile.level}
                          </span>
                        )}
                      </div>

                      <div className="user-meta">
                        <div>Créé: {fmtDate(u.createdAt)}</div>
                        <div>Dernière connexion: {fmtDate(u.lastLoginAt)}</div>
                      </div>

                      <div className="user-actions">
                        <button className="pill pill-ghost sm" onClick={() => navigate('/profile')}>👤 Voir profil</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination (si l’API renvoie un total) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                  <button className="pill pill-ghost sm" disabled={userPage <= 1} onClick={() => setUserPage((p) => Math.max(1, p - 1))}>
                    ◀ Précédent
                  </button>
                  <div style={{ color: '#e5e7eb', fontWeight: 700 }}>
                    Page {userPage} / {userPages}
                  </div>
                  <button className="pill pill-ghost sm" disabled={userPage >= userPages} onClick={() => setUserPage((p) => Math.min(userPages, p + 1))}>
                    Suivant ▶
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <section className="card glass-section">
            <h2 className="section-title">Tableau de bord administrateur</h2>
            <p className="section-subtitle">Ajoute ici tes widgets d’admin.</p>
          </section>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && (
          <section className="card glass-section">
            <h2 className="section-title">Analytics</h2>
            <p className="section-subtitle">Ajoute tes graphiques ici.</p>
          </section>
        )}

        {/* IA */}
        {activeTab === 'ai' && (
          <section className="card glass-section">
            <h2 className="section-title">Insights IA</h2>
            <p className="section-subtitle">Affiche des recommandations IA ici.</p>
          </section>
        )}

        {/* Cours */}
        {activeTab === 'courses' && (
          <section className="courses-management">
            <div className="card glass-section">
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestion des cours</h2>
                <button className="pill pill-primary" onClick={openCreateForm}>➕ Créer un cours</button>
              </div>

              {loadingCourses && (
                <div className="loading" style={{ marginBottom: 16 }}>
                  <span className="loading-spinner" /> Chargement des cours...
                </div>
              )}
              {coursesError && (
                <div className="error-message" style={{ marginBottom: 16 }}>
                  {coursesError}
                </div>
              )}

              {!loadingCourses && !coursesError && (
                <div className="courses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {courses.map((course) => (
                    <div key={course.id} className="card white-card" style={{ padding: 12 }}>
                      <div className="course-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>{course.title}</h3>
                        <span className="status-badge" style={{ backgroundColor: getStatusColor(course.status as string), color: '#fff', padding: '4px 10px', borderRadius: 999, fontWeight: 800, fontSize: 12 }}>
                          {course.status}
                        </span>
                      </div>

                      <p className="course-description" style={{ margin: '8px 0' }}>{course.description}</p>

                      <div className="course-meta" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: '#374151', fontWeight: 600 }}>
                        <span>📚 {course.category}</span>
                        <span>📊 {course.level}</span>
                        <span>⏱️ {course.duration} min</span>
                        <span>💰 {course.price}€</span>
                      </div>

                      <div className="course-stats" style={{ display: 'flex', gap: 12, marginTop: 8, color: '#6b7280' }}>
                        <span>👥 {course._count?.enrollments ?? 0}</span>
                        <span>⭐ {course._count?.reviews ?? 0}</span>
                      </div>

                      <div className="course-actions" style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="pill pill-ghost sm" onClick={() => openEditForm(course)}>✏️ Modifier</button>
                        <button className="pill pill-danger sm" onClick={() => deleteCourse(course.id)}>🗑️ Supprimer</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {showCourseForm && (
              <div className="card glass-section" style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 12 }}>{editingCourse ? 'Modifier le cours' : 'Créer un cours'}</h3>
                {saveError && <div className="error-message" style={{ marginBottom: 12 }}>{saveError}</div>}

                {/* Erreur instructeurs si besoin */}
                {instructorError && (
                  <div className="error-message" style={{ marginBottom: 12 }}>
                    Erreur instructeurs: {instructorError}
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label>Titre</label>
                    <input
                      className="input"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                      placeholder="Titre du cours"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Description</label>
                    <textarea
                      className="input"
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                      placeholder="Description du cours"
                    />
                  </div>

                  <div className="form-group">
                    <label>Catégorie</label>
                    <input
                      className="input"
                      value={courseForm.category}
                      onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                      placeholder="Programming, Design, ..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Niveau</label>
                    <select
                      className="select"
                      value={courseForm.level}
                      onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value as any })}
                    >
                      <option value="BEGINNER">BEGINNER</option>
                      <option value="INTERMEDIATE">INTERMEDIATE</option>
                      <option value="ADVANCED">ADVANCED</option>
                    </select>
                    {COURSE_LEVEL_FORMAT === 'LOWER' && (
                      <small style={{ opacity: .8 }}>
                        Le backend attend les niveaux en minuscule; ils seront convertis lors de l’envoi.
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Durée (min)</label>
                    <input
                      type="number"
                      className="input"
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm({ ...courseForm, duration: Number(e.target.value) })}
                      placeholder="120"
                    />
                  </div>

                  <div className="form-group">
                    <label>Prix (€)</label>
                    <input
                      type="number"
                      className="input"
                      value={courseForm.price}
                      onChange={(e) => setCourseForm({ ...courseForm, price: Number(e.target.value) })}
                      placeholder="29.99"
                    />
                  </div>

                  <div className="form-group">
                    <label>Statut</label>
                    <select
                      className="select"
                      value={courseForm.status}
                      onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value as any })}
                    >
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                      <option value="archived">archived</option>
                    </select>
                  </div>

                  {/* Instructeur — nécessaire si ton backend le requiert */}
                  <div className="form-group">
                    <label>Instructeur</label>
                    <select
                      className="select"
                      value={courseForm.instructorId || ''}
                      onChange={(e) => setCourseForm({ ...courseForm, instructorId: e.target.value || undefined })}
                      disabled={loadingInstructors}
                    >
                      <option value="">{loadingInstructors ? 'Chargement...' : '— Sélectionner —'}</option>
                      {instructors.map((u) => (
                        <option key={u.id} value={u.id}>
                          {fullName(u)} ({u.email})
                        </option>
                      ))}
                    </select>
                    <small style={{ opacity: .8 }}>
                      Sélectionne un instructeur si ton API Courses l’exige.
                    </small>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    className="pill pill-primary"
                    disabled={savingCourse}
                    onClick={() => (editingCourse ? updateCourse(editingCourse.id) : createCourse())}
                  >
                    {savingCourse ? '⏳ Enregistrement...' : '💾 Enregistrer'}
                  </button>
                  <button className="pill pill-ghost" onClick={closeForm} disabled={savingCourse}>Annuler</button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ---------------- sanitizeCoursePayload (ajusté) ----------------
function sanitizeCoursePayload(form: {
  title: string;
  description: string;
  category: string;
  level: string;
  duration: number | string;
  price?: number | string;
  status?: string;
  instructorId?: string;
}) {
  const payload = {
    title: (form.title || '').trim(),
    description: (form.description || '').trim(),
    category: (form.category || '').trim(),
    level: (form.level || '').trim(), // déjà normalisé plus haut
    duration: Math.max(1, parseInt(String(form.duration || 0), 10)),
    price: form.price === undefined ? 0 : Math.max(0, Number(form.price)),
    status: ((form.status || 'draft').trim() as 'draft' | 'published' | 'archived'),
    instructorId: form.instructorId?.trim() || undefined
  };

  const errors: string[] = [];
  if (!payload.title) errors.push('Le titre est requis.');
  if (payload.description.length < 10) errors.push('La description doit contenir au moins 10 caractères.');
  if (!payload.level) errors.push('Le niveau est requis.');
  if (!['draft', 'published', 'archived'].includes(payload.status))
    errors.push('Le statut doit être draft, published ou archived.');

  // Si ton backend exige un instructorId obligatoire, décommente la ligne suivante
  // if (!payload.instructorId) errors.push("L'instructeur est requis.");

  return { payload, errors };
}