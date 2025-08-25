import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Ancien design avec styles inline conservés
const API_URL = 'http://localhost:3001';

interface ValidationError {
  value: string;
  msg: string;
  param: string;
  location: string;
}
type Errors = Record<string, string>;

const styles = {
  container: {
    width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  } as React.CSSProperties,
  card: {
    width: '100%', maxWidth: 450, background: 'rgba(255,255,255,0.98)', borderRadius: 24,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.05)', padding: 48
  } as React.CSSProperties,
  logo: {
    width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 36, color: 'white', fontWeight: 700
  } as React.CSSProperties,
  title: {
    fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8, textAlign: 'center'
  } as React.CSSProperties,
  subtitle: { color: '#6b7280', fontSize: 16, textAlign: 'center', marginBottom: 32, fontWeight: 500 } as React.CSSProperties,
  label: { display: 'block', color: '#374151', fontWeight: 600, marginBottom: 8, fontSize: 14 } as React.CSSProperties,
  input: {
    width: '100%', padding: '16px 20px', border: '2px solid #e5e7eb', borderRadius: 12, marginBottom: 16, fontSize: 16,
    outline: 'none', transition: 'all 0.3s ease', backgroundColor: '#f9fafb', boxSizing: 'border-box'
  } as React.CSSProperties,
  error: { color: '#dc2626', fontSize: 13, marginBottom: 8, marginTop: -8, fontWeight: 500 } as React.CSSProperties,
  button: {
    width: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white',
    padding: '16px 0', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, marginTop: 8, marginBottom: 16,
    cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
  } as React.CSSProperties,
  switch: { width: '100%', background: 'none', border: 'none', color: '#667eea', fontWeight: 600, cursor: 'pointer', marginTop: 16, textAlign: 'center' } as React.CSSProperties,
  message: { marginTop: 20, textAlign: 'center', fontWeight: 600, borderRadius: 12, padding: '12px 16px', fontSize: 14 } as React.CSSProperties,
  success: { color: '#059669', background: '#d1fae5', border: '1px solid #a7f3d0' } as React.CSSProperties,
  fail: { color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca' } as React.CSSProperties
};

export default function AuthPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({}); const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const resetForm = () => { setEmail(''); setPassword(''); setFirstName(''); setLastName(''); setErrors({}); setMessage(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage(null); setErrors({});
    try {
      const body: Record<string, string> = { email, password };
      if (mode === 'register') { if (firstName) body.firstName = firstName; if (lastName) body.lastName = lastName; }
      const endpoint = mode === 'login' ? '/login' : '/register';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.accessToken) localStorage.setItem('token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        if (data.user) {
          const storedUser = {
            ...data.user,
            firstName: data.user.firstName ?? (mode === 'register' ? firstName || null : null),
            lastName: data.user.lastName ?? (mode === 'register' ? lastName || null : null)
          };
          localStorage.setItem('user', JSON.stringify(storedUser));
        }
        const role = data?.user?.role;
        setMessage(data.message || (mode === 'login' ? 'Connexion réussie !' : 'Inscription réussie !'));
        setTimeout(() => { role === 'ADMIN' ? navigate('/admin') : navigate('/'); }, 400);
        resetForm();
      } else {
        if (data.errors) {
          const fieldErrors: Errors = {}; (data.errors as ValidationError[]).forEach((err) => { fieldErrors[err.param] = err.msg; });
          setErrors(fieldErrors);
        } else setMessage(data.error || 'Erreur inconnue');
      }
    } catch { setMessage('Erreur réseau'); } finally { setLoading(false); }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={styles.logo}>🎓</div>
          <h2 style={styles.title}>{mode === 'login' ? 'Connexion' : 'Inscription'}</h2>
          <p style={styles.subtitle}>Plateforme éducative intelligente</p>
        </div>
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div>
                <label style={styles.label}>Prénom</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ ...styles.input, borderColor: errors.firstName ? '#dc2626' : '#e5e7eb' }} placeholder="Entrez votre prénom" />
                {errors.firstName && <div style={styles.error}>{errors.firstName}</div>}
              </div>
              <div>
                <label style={styles.label}>Nom</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} style={{ ...styles.input, borderColor: errors.lastName ? '#dc2626' : '#e5e7eb' }} placeholder="Entrez votre nom" />
                {errors.lastName && <div style={styles.error}>{errors.lastName}</div>}
              </div>
            </>
          )}
          <div>
            <label style={styles.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ ...styles.input, borderColor: errors.email ? '#dc2626' : '#e5e7eb' }} placeholder="exemple@email.com" />
            {errors.email && <div style={styles.error}>{errors.email}</div>}
          </div>
          <div>
            <label style={styles.label}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ ...styles.input, borderColor: errors.password ? '#dc2626' : '#e5e7eb' }} placeholder="Entrez votre mot de passe" />
            {errors.password && <div style={styles.error}>{errors.password}</div>}
          </div>
          <button type="submit" disabled={loading} style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Chargement...' : (mode === 'login' ? 'Se connecter' : "S'inscrire")}
          </button>
        </form>
        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}); setMessage(null); }} style={styles.switch}>
          {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà inscrit ? Se connecter'}
        </button>
        {message && <div style={{ ...styles.message, ...(message.toLowerCase().includes('réuss') ? styles.success : styles.fail) }}>{message}</div>}
      </div>
    </div>
  );
}