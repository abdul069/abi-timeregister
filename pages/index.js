import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Vul alle velden in');
        setLoading(false);
        return;
      }

      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/bi');
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'Dit e-mailadres is al in gebruik',
        'auth/invalid-email': 'Ongeldig e-mailadres',
        'auth/weak-password': 'Wachtwoord moet minimaal 6 tekens zijn',
        'auth/user-not-found': 'Geen account gevonden met dit e-mailadres',
        'auth/wrong-password': 'Onjuist wachtwoord',
        'auth/invalid-credential': 'Ongeldige inloggegevens',
      };
      setError(messages[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.logo}>📡</div>
        <h1 style={s.title}>ABI Business Intelligence</h1>
        <p style={s.subtitle}>Subsidies, compliance & dossiers</p>

        <h2 style={s.formTitle}>
          {isSignup ? 'Account Aanmaken' : 'Inloggen'}
        </h2>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="uw@email.be"
              style={s.input}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Uw wachtwoord"
              style={s.input}
            />
          </div>

          <button type="submit" disabled={loading} style={{ ...s.submitBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Laden...' : (isSignup ? 'Registreren' : 'Inloggen')}
          </button>
        </form>

        <button
          onClick={() => { setIsSignup(!isSignup); setError(''); }}
          style={s.switchBtn}
        >
          {isSignup ? 'Al een account? Inloggen' : 'Geen account? Registreren'}
        </button>

        <p style={s.version}>ABI BI v1.0</p>
      </div>
    </div>
  );
}

const s = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  card: { width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.04)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '40px 28px', textAlign: 'center' },
  logo: { fontSize: '56px', marginBottom: '8px' },
  title: { margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.5px' },
  subtitle: { margin: '0 0 28px', fontSize: '13px', color: '#64748b' },
  formTitle: { margin: '0 0 20px', fontSize: '16px', fontWeight: '600', color: '#94a3b8' },
  error: { background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px', border: '1px solid rgba(239,68,68,0.2)' },
  field: { marginBottom: '14px', textAlign: 'left' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { width: '100%', padding: '13px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  submitBtn: { width: '100%', padding: '14px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginTop: '6px', marginBottom: '12px' },
  switchBtn: { width: '100%', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'transparent', color: '#64748b', fontSize: '13px', cursor: 'pointer' },
  version: { margin: '20px 0 0', fontSize: '11px', color: '#334155' },
};
