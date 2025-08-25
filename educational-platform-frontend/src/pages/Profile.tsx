import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Endpoints (utilisés pour charger les données initiales)
const USER_API = 'http://localhost:3002';
const COURSE_API = 'http://localhost:3003';
const AUTH_API = 'http://localhost:3001';

// *** NEW *** URL Notification Service (env ou fallback)
const NOTIF_API = import.meta.env.VITE_NOTIFICATION_API_URL || 'http://localhost:3007';
const NOTIF_SECRET = import.meta.env.VITE_NOTIF_EVENT_SECRET || '';

interface Enrollment {
  id: string;
  progress: number;
  completed: boolean;
  course?: { id: string; title: string; level?: string; category?: string; duration?: number };
  completedAt?: string;
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  profile: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatarUrl?: string | null;
    level?: string;
  };
  enrollments: Enrollment[];
}

type CurrentUser = {
  id: string | null;
  role: string | null;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  level?: string | null;
};

// Helpers auth
function addAuth(init: RequestInit = {}): RequestInit {
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
async function apiGet(url: string, init: RequestInit = {}) {
  let res = await fetch(url, addAuth(init));
  if (res.status === 401 && (await tryRefreshToken())) {
    res = await fetch(url, addAuth(init));
  }
  return res;
}

function parseLocalUser(): Partial<CurrentUser> {
  const userJson = localStorage.getItem('user');
  if (!userJson) return {};
  try {
    const u = JSON.parse(userJson);
    return {
      id: u?.id ? String(u.id) : null,
      role: u?.role ?? null,
      email: u?.email ?? null,
      firstName: u?.firstName ?? null,
      lastName: u?.lastName ?? null,
      level: u?.level ?? u?.profile?.level ?? null
    };
  } catch {
    return {};
  }
}
function parseJwt(): Partial<CurrentUser> {
  const token = localStorage.getItem('token');
  if (!token) return {};
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload?.userId ? String(payload.userId) : null,
      role: payload?.role ?? null,
      email: payload?.email ?? null,
      firstName: payload?.firstName ?? null,
      lastName: payload?.lastName ?? null,
      level: payload?.level ?? null
    };
  } catch {
    return {};
  }
}
function getCurrentUser(): CurrentUser {
  const ls = parseLocalUser();
  const jwt = parseJwt();
  return {
    id: (ls.id ?? jwt.id) || null,
    role: (ls.role ?? jwt.role) || null,
    email: (ls.email ?? jwt.email) || null,
    firstName: (ls.firstName ?? jwt.firstName) || null,
    lastName: (ls.lastName ?? jwt.lastName) || null,
    level: (ls.level ?? jwt.level) || null
  };
}
function toTitleCase(input: string): string {
  const cleaned = input.replace(/[_\-\.]+/g, ' ').trim();
  return cleaned
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
}
function deriveNameFromEmail(email?: string | null): { firstName?: string; lastName?: string } {
  if (!email) return {};
  const pretty = toTitleCase(email.split('@')[0] || '');
  const parts = pretty.split(' ');
  if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  return { firstName: pretty };
}
function pickDisplayName(profile?: UserProfile, fallbackUser?: CurrentUser): { firstName: string; lastName: string } {
  const pfF = profile?.profile?.firstName?.trim();
  const pfL = profile?.profile?.lastName?.trim();
  const lsF = fallbackUser?.firstName?.trim();
  const lsL = fallbackUser?.lastName?.trim();
  const jwt = parseJwt();
  const jwtF = jwt.firstName?.trim();
  const jwtL = jwt.lastName?.trim();
  if (pfF || pfL) return { firstName: pfF || '', lastName: pfL || '' };
  if (lsF || lsL) return { firstName: lsF || '', lastName: lsL || '' };
  if (jwtF || jwtL) return { firstName: jwtF || '', lastName: jwtL || '' };
  const derived = deriveNameFromEmail(profile?.email || fallbackUser?.email || '');
  return { firstName: derived.firstName || 'Utilisateur', lastName: derived.lastName || '' };
}
const getInitials = (f?: string, l?: string) =>
  `${(f?.trim()?.[0] || '').toUpperCase()}${(l?.trim()?.[0] || '').toUpperCase()}` || 'U';

/**
 * Overrides localStorage
 * profile_enrollment_overrides_<userId> = { "<enrollmentId>": { completed, progress, completedAt } }
 */
function loadOverrides(userId: string): Record<string, Partial<Enrollment>> {
  try {
    const raw = localStorage.getItem(`profile_enrollment_overrides_${userId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
function saveOverrides(userId: string, overrides: Record<string, Partial<Enrollment>>) {
  localStorage.setItem(`profile_enrollment_overrides_${userId}`, JSON.stringify(overrides));
}

// Long press
const LONG_PRESS_MS = 1200;
const LONG_PRESS_INTERVAL = 30;
type PressState = { timeoutId: number; intervalId: number; startedAt: number };

// *** NEW *** Appel Notification Service (course_completed)
async function postCourseCompletedNotification(params: {
  userId: string;
  courseId?: string;
  courseTitle?: string;
  score?: number;
  email?: string | null;
}) {
  try {
    const body = {
      userId: params.userId,
      courseId: params.courseId || 'unknown',
      courseTitle: params.courseTitle || 'Cours',
      score: params.score
    };
    await fetch(`${NOTIF_API}/events/course-completed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(NOTIF_SECRET ? { 'x-event-secret': NOTIF_SECRET } : {})
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    console.warn('[Notification] Échec envoi event course-completed:', e);
  }
}

// Variante personnalisée (si tu veux un message custom) – non utilisée directement:
// await fetch(`${NOTIF_API}/events/custom`, { ... , body: JSON.stringify({ userId, title:'Bravo', message:'...' , type:'other'}) })

export default function Profile() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const token = useMemo(() => localStorage.getItem('token'), []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role] = useState<string | null>(currentUser.role || null);
  const [loading, setLoading] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enrollmentsCS, setEnrollmentsCS] = useState<Enrollment[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Partial<Enrollment>>>({});
  const [pressProgress, setPressProgress] = useState<Record<string, number>>({});
  const pressRefs = useRef<Record<string, PressState>>({});

  useEffect(() => {
    if (!token || !currentUser.id) {
      navigate('/auth');
      return;
    }
    const o = loadOverrides(currentUser.id);
    setOverrides(o);
    fetchProfile(currentUser.id);
    fetchEnrollmentsFromCourseService(currentUser.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, token, currentUser.id]);

  async function fetchProfile(userId: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await apiGet(`${USER_API}/profile/${userId}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Erreur HTTP: ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as UserProfile;
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }
  async function fetchEnrollmentsFromCourseService(userId: string) {
    try {
      setLoadingEnrollments(true);
      const res = await apiGet(`${COURSE_API}/users/${userId}/enrollments?page=1&limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      const list: Enrollment[] = (data?.enrollments || []).map((e: any) => ({
        id: e.id,
        progress: e.progress,
        completed: e.completed,
        completedAt: e.completedAt,
        course: e.course
          ? {
              id: e.course.id,
              title: e.course.title,
              level: e.course.level,
              category: e.course.category,
              duration: e.course.duration
            }
          : { id: e.courseId, title: `Cours ${e.courseId}` }
      }));
      setEnrollmentsCS(list);
    } finally {
      setLoadingEnrollments(false);
    }
  }

  const enrollmentsRaw: Enrollment[] =
    enrollmentsCS.length > 0 ? enrollmentsCS : profile?.enrollments || [];

  const enrollments: Enrollment[] = useMemo(() => {
    if (!currentUser.id) return enrollmentsRaw;
    if (!overrides || Object.keys(overrides).length === 0) return enrollmentsRaw;
    return enrollmentsRaw.map((enr) => {
      const ov = overrides[enr.id];
      if (!ov) return enr;
      return {
        ...enr,
        progress: ov.progress != null ? ov.progress : enr.progress,
        completed: ov.completed != null ? ov.completed : enr.completed,
        completedAt: ov.completedAt || enr.completedAt
      };
    });
  }, [enrollmentsRaw, overrides, currentUser.id]);

  const averageProgress = useMemo(
    () =>
      Math.round(
        enrollments.reduce((acc, e) => acc + (e.progress || 0), 0) / Math.max(enrollments.length, 1)
      ),
    [enrollments]
  );
  const completedCourses = enrollments.filter((e) => e.completed).length;

  const display = pickDisplayName(profile || undefined, currentUser);
  const initials = getInitials(display.firstName, display.lastName);
  const emailToShow = profile?.email || currentUser.email || '';
  const userLevel = profile?.profile?.level || currentUser.level || null;
  const roleLabel = (profile?.role || currentUser.role || '')
    .toString()
    .replace(/^STUDENT$/i, 'ÉTUDIANT')
    .replace(/^ADMIN$/i, 'ADMIN')
    .replace(/^INSTRUCTOR$/i, 'INSTRUCTEUR');
  const roleAndLevel = userLevel ? `${roleLabel} — Niveau: ${userLevel}` : roleLabel;

  function beginPress(enr: Enrollment) {
    if (enr.completed) return;
    cancelPress(enr.id);
    const startedAt = performance.now();
    const timeoutId = window.setTimeout(() => {
      finalizeCompletion(enr);
      cancelPress(enr.id);
    }, LONG_PRESS_MS);
    const intervalId = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const pct = Math.min(1, elapsed / LONG_PRESS_MS);
      setPressProgress((prev) => ({ ...prev, [enr.id]: pct }));
    }, LONG_PRESS_INTERVAL);
    pressRefs.current[enr.id] = { timeoutId, intervalId, startedAt };
  }
  function cancelPress(enrollmentId: string) {
    const st = pressRefs.current[enrollmentId];
    if (st) {
      clearTimeout(st.timeoutId);
      clearInterval(st.intervalId);
      delete pressRefs.current[enrollmentId];
    }
    setPressProgress((prev) => {
      const copy = { ...prev };
      delete copy[enrollmentId];
      return copy;
    });
  }

  // *** UPDATED *** Marquer terminé + notifier
  async function finalizeCompletion(enr: Enrollment) {
    if (!currentUser.id) return;
    if (enr.completed) return;

    // 1. Mise à jour locale optimiste
    const newOverrides = {
      ...overrides,
      [enr.id]: {
        completed: true,
        progress: 100,
        completedAt: new Date().toISOString()
      }
    };
    setOverrides(newOverrides);
    saveOverrides(currentUser.id, newOverrides);

    // 2. Notifier le Notification Service
    await postCourseCompletedNotification({
      userId: currentUser.id,
      courseId: enr.course?.id,
      courseTitle: enr.course?.title,
      email: emailToShow || undefined
    });
  }

  function manualComplete(enr: Enrollment) {
    finalizeCompletion(enr);
  }

  function onCardPointerDown(e: React.PointerEvent, enr: Enrollment) {
    if (e.button !== 0) return;
    beginPress(enr);
  }
  function onCardPointerUp(_e: React.PointerEvent, enr: Enrollment) {
    cancelPress(enr.id);
  }
  function onCardPointerLeave(_e: React.PointerEvent, enr: Enrollment) {
    cancelPress(enr.id);
  }

  function getPressRing(enrollmentId: string) {
    const pct = pressProgress[enrollmentId] || 0;
    const r = 16;
    const c = 2 * Math.PI * r;
    const dash = c * pct;
    return { pct, c, dash };
  }

  function formatDuration(min?: number) {
    if (min == null) return '';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h${m ? m : ''}`;
  }

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">
          <div className="loading-spinner" /> Chargement du profil...
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header card">
        <div className="profile-header-content">
          <div className="logo">🎓 EduPlatform</div>
          <div className="nav-buttons">
            <button className="btn btn-secondary profile-button" onClick={() => navigate('/')}>
              Accueil
            </button>
            {role === 'ADMIN' && (
              <>
                <button className="btn btn-secondary profile-button" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
                <button className="btn btn-secondary profile-button" onClick={() => navigate('/admin')}>
                  Administration
                </button>
              </>
            )}
            <button className="btn btn-secondary profile-button" onClick={() => navigate('/notifications')}>
              Notifications
            </button>
            <button
              className="btn btn-primary profile-button"
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                navigate('/auth');
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="profile-main-content">
        {error && (
          <div className="error-message" style={{ marginBottom: 12 }}>
            <strong>Info:</strong> {error} (nom via fallback)
            {currentUser.id && (
              <button
                className="btn btn-secondary"
                onClick={() => fetchProfile(currentUser.id as string)}
                style={{ marginLeft: 12 }}
              >
                Réessayer
              </button>
            )}
          </div>
        )}

        <div className="profile-section card">
          <div className="profile-header-info">
            <div className="avatar">{initials}</div>
            <div className="profile-info">
              <h1 className="profile-name">
                {display.firstName} {display.lastName}
              </h1>
              {emailToShow && <p className="profile-email">{emailToShow}</p>}
              <div className="profile-role">{roleAndLevel}</div>
              {profile?.profile?.bio && <p className="profile-bio">{profile.profile.bio}</p>}
            </div>
          </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{enrollments.length}</div>
                <div className="stat-label">Cours suivis</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{averageProgress}%</div>
                <div className="stat-label">Progression moyenne</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{completedCourses}</div>
                <div className="stat-label">Cours terminés</div>
              </div>
            </div>

          <h2 className="section-title" style={{ marginTop: 24 }}>
            Mes cours
          </h2>

          {loadingEnrollments && (
            <div className="loading" style={{ marginBottom: 8 }}>
              <div className="loading-spinner" /> Chargement des cours...
            </div>
          )}

          {enrollments.length > 0 ? (
            <div className="enrollments-grid">
              {enrollments.map((enr, idx) => {
                const ring = getPressRing(enr.id);
                const pressing = !enr.completed && ring.pct > 0;
                return (
                  <div
                    key={enr.id || idx}
                    className={`card enrollment-card ${enr.completed ? 'completed' : ''}`}
                    onPointerDown={(e) => onCardPointerDown(e, enr)}
                    onPointerUp={(e) => onCardPointerUp(e, enr)}
                    onPointerLeave={(e) => onCardPointerLeave(e, enr)}
                  >
                    {pressing && (
                      <div className="longpress-overlay">
                        <svg width="60" height="60" viewBox="0 0 60 60">
                          <circle cx="30" cy="30" r="22" stroke="rgba(255,255,255,0.3)" strokeWidth="6" fill="none" />
                          <circle
                            cx="30"
                            cy="30"
                            r="22"
                            stroke="#10b981"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={ring.c}
                            strokeDashoffset={ring.c - ring.dash}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 30ms linear' }}
                          />
                        </svg>
                        <div className="longpress-text">{Math.round(ring.pct * 100)}%</div>
                        <div className="longpress-text" style={{ fontSize: 10 }}>
                          Relâcher pour annuler
                        </div>
                      </div>
                    )}

                    <h3 className="enrollment-title">{enr.course?.title || `Cours ${idx + 1}`}</h3>

                    <div className="enrollment-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${enr.progress || 0}%` }} />
                      </div>
                      <div className="progress-text">
                        {enr.progress || 0}% {enr.completed && ' ✅'}
                      </div>
                    </div>

                    <div className="course-meta-row" style={{ marginTop: 6 }}>
                      {enr.course?.category && <span className="meta-chip">{enr.course.category}</span>}
                      {enr.course?.level && <span className="meta-chip level">{enr.course.level}</span>}
                      {enr.course?.duration != null && (
                        <span className="meta-chip duration">{formatDuration(enr.course.duration)}</span>
                      )}
                    </div>

                    <div className="enrollment-actions" style={{ marginTop: 10 }}>
                      {!enr.completed && (
                        <>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => manualComplete(enr)}
                            type="button"
                            title="Marquer comme terminé"
                          >
                            Terminer
                          </button>
                          <span className="press-hint">(Appui long sur la carte pour terminer)</span>
                        </>
                      )}
                      {enr.completed && (
                        <span className="date-finished">
                          Terminé {enr.completedAt ? `le ${new Date(enr.completedAt).toLocaleDateString()}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-courses">
              <h3>Vous n'avez pas encore suivi de cours</h3>
              <p>Commencez votre apprentissage en découvrant nos cours disponibles.</p>
              <button
                className="btn btn-primary profile-button"
                style={{ marginTop: 16 }}
                onClick={() => navigate('/')}
              >
                Découvrir les cours
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}