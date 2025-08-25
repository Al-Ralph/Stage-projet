import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Notifications.css';

interface Notification {
  id: string;
  userId: string;
  type: 'course_completed' | 'course_new' | 'enrollment_created' | 'achievement' | 'reminder' | 'social' | 'system' | 'other';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  today: number;
}

interface PaginatedResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const NOTIF_API = import.meta.env.VITE_NOTIFICATION_API_URL || 'http://localhost:3007';
const POLL_INTERVAL =
  Number(import.meta.env.VITE_NOTIF_POLL_INTERVAL_MS) > 0
    ? Number(import.meta.env.VITE_NOTIF_POLL_INTERVAL_MS)
    : 20000; // 20s par défaut
const PAGE_SIZE = 10;

async function apiGet(path: string, token?: string) {
  return fetch(`${NOTIF_API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
}
async function apiPatch(path: string, token?: string) {
  return fetch(`${NOTIF_API}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
}
async function apiDelete(path: string, token?: string) {
  return fetch(`${NOTIF_API}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
}

export default function Notifications() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as { id: string; role?: string }) : null;
    } catch {
      return null;
    }
  }, []);

  const token = useMemo(() => localStorage.getItem('token') || undefined, []);
  const userId = user?.id || null;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [pagesTotal, setPagesTotal] = useState(1);
  const [role] = useState<string | null>(user?.role || null);

  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const firstLoadRef = useRef(true);
  const pollingRef = useRef<number | null>(null);
  const lastFetchSignatureRef = useRef<string>(''); // pour éviter re-traitement identique

  // Redirection si non connecté
  useEffect(() => {
    if (!token || !userId) {
      navigate('/auth');
    }
  }, [token, userId, navigate]);

  // Chargement principal (page + filtre)
  useEffect(() => {
    if (!userId || !token) return;
    let cancelled = false;

    async function load() {
      try {
        firstLoadRef.current ? setLoading(true) : setLoadingPage(true);
        setError(null);

        const unreadOnly = filter === 'unread' ? 'true' : 'false';
        const res = await apiGet(
          `/notifications/${userId}?page=${page}&limit=${PAGE_SIZE}&unreadOnly=${unreadOnly}`,
          token
        );
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || 'Erreur chargement notifications');
        }
        const data: PaginatedResponse = await res.json();

        if (cancelled) return;

        setNotifications(data.notifications || []);
        setPagesTotal(data.pagination?.pages || 1);
        lastFetchSignatureRef.current = JSON.stringify(
          (data.notifications || []).map((n) => n.id)
        );
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur inconnue');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingPage(false);
          firstLoadRef.current = false;
        }
      }
    }

    async function loadStats() {
      try {
        const res = await apiGet(`/notifications/${userId}/stats`, token);
        if (res.ok) {
          const data = (await res.json()) as NotificationStats;
          if (!cancelled) setStats(data);
        }
      } catch {
        /* silencieux */
      }
    }

    load();
    loadStats();

    return () => {
      cancelled = true;
    };
  }, [userId, token, page, filter]);

  // Polling périodique (seulement page 1 pour ajout en direct)
  useEffect(() => {
    if (!userId || !token) return;
    // Nettoyer ancien intervalle
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    function schedule() {
      if (POLL_INTERVAL <= 0) return;
      pollingRef.current = window.setInterval(async () => {
        if (page !== 1) return; // on ne poll que la page 1
        try {
          const unreadOnly = filter === 'unread' ? 'true' : 'false';
            const res = await apiGet(
              `/notifications/${userId}?page=1&limit=${PAGE_SIZE}&unreadOnly=${unreadOnly}`,
              token
            );
          if (!res.ok) return;
          const data: PaginatedResponse = await res.json();
          const newList = data.notifications || [];

          // Détection de nouvelles notifications (id inexistants)
          const existingIds = new Set(notifications.map((n) => n.id));
          const freshOnes = newList.filter((n) => !existingIds.has(n.id));

          if (freshOnes.length > 0) {
            setNotifications((prev) => {
              // On conserve ordre en partant de la nouvelle page 1 complète (cohérence pagination)
              return newList;
            });
            // Ajuster stats (optimiste, on peut re-fetch)
            setStats((prev) =>
              prev
                ? {
                    ...prev,
                    total: prev.total + freshOnes.length,
                    unread:
                      filter === 'unread'
                        ? prev.unread + freshOnes.filter((n) => !n.isRead).length
                        : prev.unread + freshOnes.filter((n) => !n.isRead).length,
                    today:
                      prev.today +
                      freshOnes.filter(
                        (n) =>
                          new Date(n.createdAt).toDateString() ===
                          new Date().toDateString()
                      ).length
                  }
                : prev
            );
            lastFetchSignatureRef.current = JSON.stringify(
              newList.map((n) => n.id)
            );
          } else {
            // Si la liste reçue (ids) diffère (par lecture / suppression côté autre onglet)
            const signature = JSON.stringify(newList.map((n) => n.id));
            if (signature !== lastFetchSignatureRef.current) {
              setNotifications(newList);
              lastFetchSignatureRef.current = signature;
            }
          }
        } catch {
          /* pas critique */
        }
      }, POLL_INTERVAL);
    }

    schedule();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [userId, token, page, filter, notifications]);

  // Actions
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!token || !userId) return;
      try {
        const res = await apiPatch(`/notifications/${userId}/${notificationId}/read`, token);
        if (!res.ok) return;
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setStats((prev) =>
          prev
            ? { ...prev, unread: Math.max(prev.unread - 1, 0) }
            : prev
        );
        if (filter === 'unread') {
          setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        }
      } catch (e) {
        console.error('markAsRead error', e);
      }
    },
    [token, userId, filter]
  );

  const markAllAsRead = useCallback(async () => {
    if (!token || !userId) return;
    try {
      const res = await apiPatch(`/notifications/${userId}/read-all`, token);
      if (!res.ok) return;
      if (filter === 'unread') {
        setNotifications([]);
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
      setStats((prev) => (prev ? { ...prev, unread: 0 } : prev));
    } catch (e) {
      console.error('markAllAsRead error', e);
    }
  }, [token, userId, filter]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!token || !userId) return;
      try {
        const res = await apiDelete(`/notifications/${userId}/${notificationId}`, token);
        if (!res.ok) return;
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setStats((prev) => {
          if (!prev) return prev;
          const wasUnread =
            notifications.find((n) => n.id === notificationId)?.isRead === false;
          return {
            ...prev,
            total: Math.max(prev.total - 1, 0),
            unread: wasUnread ? Math.max(prev.unread - 1, 0) : prev.unread
          };
        });
      } catch (e) {
        console.error('deleteNotification error', e);
      }
    },
    [token, userId, notifications]
  );

  const manualRefresh = async () => {
    if (!userId || !token) return;
    setRefreshing(true);
    try {
      const unreadOnly = filter === 'unread' ? 'true' : 'false';
      const res = await apiGet(
        `/notifications/${userId}?page=${page}&limit=${PAGE_SIZE}&unreadOnly=${unreadOnly}`,
        token
      );
      if (res.ok) {
        const data: PaginatedResponse = await res.json();
        setNotifications(data.notifications || []);
        setPagesTotal(data.pagination?.pages || 1);
        lastFetchSignatureRef.current = JSON.stringify(
          (data.notifications || []).map((n) => n.id)
        );
        const statsRes = await apiGet(`/notifications/${userId}/stats`, token);
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats(s);
        }
      }
    } catch (e) {
      console.error('manualRefresh error', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  // UI helpers
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'course_completed':
        return '🎓';
      case 'course_new':
        return '📚';
      case 'enrollment_created':
        return '✅';
      case 'achievement':
        return '🏆';
      case 'reminder':
        return '⏰';
      case 'social':
        return '💬';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'course_completed':
        return 'var(--success-color)';
      case 'course_new':
        return 'var(--primary-color)';
      case 'enrollment_created':
        return 'var(--info-color)';
      case 'achievement':
        return 'var(--warning-color)';
      case 'reminder':
        return 'var(--info-color)';
      case 'social':
        return 'var(--secondary-color)';
      case 'system':
        return 'var(--text-muted)';
      default:
        return 'var(--text-color)';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  const canPrev = page > 1;
  const canNext = page < pagesTotal && notifications.length === PAGE_SIZE;

  if (!userId) return null;

  if (loading && notifications.length === 0) {
    return (
      <div className="notifications-container">
        <div className="loading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              className="loading-spinner"
              style={{
                width: 24,
                height: 24,
                border: '3px solid rgba(255,255,255,0.3)',
                borderTop: '3px solid white',
                borderRadius: '50%'
              }}
            />
            Chargement des notifications...
          </div>
        </div>
      </div>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <div className="notifications-container">
        <div className="error-message">
          {error}
          <button
            className="btn btn-secondary"
            style={{ marginLeft: 12 }}
            onClick={() => {
              setError(null);
              setLoading(true);
              setPage((p) => (p === 1 ? 2 : 1));
              setTimeout(() => setPage(1), 0);
            }}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-container container-full">
      {/* Header */}
      <div className="notifications-header card">
        <div className="notifications-header-content">
          <div className="logo">🎓 EduPlatform</div>
          <div className="nav-buttons">
            <button
              className="btn btn-secondary notifications-button"
              onClick={() => navigate('/')}
            >
              Cours
            </button>
            {role === 'ADMIN' && (
              <>
                <button
                  className="btn btn-secondary notifications-button"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className="btn btn-secondary notifications-button"
                  onClick={() => navigate('/admin')}
                >
                  Administration
                </button>
              </>
            )}
            <button
              className="btn btn-secondary notifications-button"
              onClick={() => navigate('/profile')}
            >
              Profil
            </button>
            <button
              className="btn btn-primary notifications-button"
              onClick={handleLogout}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="notifications-main-content">
        {/* Statistiques */}
        {stats && (
          <div className="notifications-stats card">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📢</div>
                <div className="stat-number">{stats.total}</div>
                <div className="stat-label">Total</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔔</div>
                <div className="stat-number">{stats.unread}</div>
                <div className="stat-label">Non lues</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-number">{stats.today}</div>
                <div className="stat-label">Aujourd'hui</div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres & actions */}
        <div className="notifications-controls card">
          <div className="controls-left">
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setPage(1);
                  setFilter('all');
                }}
              >
                Toutes ({stats?.total ?? 0})
              </button>
              <button
                className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => {
                  setPage(1);
                  setFilter('unread');
                }}
              >
                Non lues ({stats?.unread ?? 0})
              </button>
            </div>
          </div>
          <div className="controls-right" style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={manualRefresh}
              disabled={refreshing}
              title="Rafraîchir maintenant"
            >
              {refreshing ? '...' : 'Rafraîchir'}
            </button>
            {stats && stats.unread > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={markAllAsRead}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
        </div>

        {loadingPage && (
          <div className="card" style={{ marginBottom: 12, fontSize: 12, opacity: 0.7 }}>
            Actualisation...
          </div>
        )}

        {/* Liste */}
        <div className="notifications-list">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`notification-item card ${!n.isRead ? 'unread' : ''} stagger-animation`}
              >
                <div
                  className="notification-icon"
                  style={{ color: getNotificationColor(n.type) }}
                >
                  {getNotificationIcon(n.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h3 className="notification-title">{n.title}</h3>
                    <div className="notification-actions">
                      {!n.isRead && (
                        <button
                          className="action-btn"
                          onClick={() => markAsRead(n.id)}
                          title="Marquer comme lu"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        className="action-btn delete"
                        onClick={() => deleteNotification(n.id)}
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <p className="notification-message">{n.message}</p>
                  <div className="notification-meta">
                    <span className="notification-time">
                      {formatDate(n.createdAt)}
                    </span>
                    {!n.isRead && <span className="unread-indicator">●</span>}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-notifications card">
              <div className="no-notifications-icon">🔕</div>
              <h3>Aucune notification</h3>
              <p>
                {filter === 'unread'
                  ? "Vous n'avez aucune notification non lue."
                  : "Vous n'avez aucune notification pour le moment."}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {notifications.length > 0 && pagesTotal > 1 && (
          <div className="notifications-pagination card">
            <button
              className="btn btn-secondary"
              disabled={!canPrev}
              onClick={() => canPrev && setPage((p) => p - 1)}
            >
              Précédent
            </button>
            <span className="page-info">
              Page {page} / {pagesTotal}
            </span>
            <button
              className="btn btn-secondary"
              disabled={!canNext}
              onClick={() => canNext && setPage((p) => p + 1)}
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}