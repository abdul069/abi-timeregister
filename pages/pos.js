import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getTodayOrders, formatPrice, getStaff, verifyPin, getActiveWorkPeriod, getParkedOrders, getBusinessSettings, hasPermission } from '../lib/pos-data';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function PosHome() {
  const router = useRouter();
  const [stats, setStats] = useState({ todayOrders: 0, todayRevenue: 0, activeOrders: 0, parkedOrders: 0, avgOrder: 0, itemsSold: 0 });
  const [businessSettings, setBusinessSettings] = useState({ dailyGoal: 500 });
  const [currentTime, setCurrentTime] = useState('');
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [currentStaff, setCurrentStaff] = useState(null);
  const [workPeriod, setWorkPeriod] = useState(null);
  const [pinTarget, setPinTarget] = useState(null);

  useEffect(() => {
    const updateStats = async () => {
      const [todayOrders, period, parked, bs] = await Promise.all([
        getTodayOrders(),
        getActiveWorkPeriod(),
        getParkedOrders(),
        getBusinessSettings(),
      ]);
      const validOrders = todayOrders.filter(o => o.status !== 'geannuleerd');
      const revenue = validOrders.reduce((sum, o) => sum + o.total, 0);
      setStats({
        todayOrders: validOrders.length,
        todayRevenue: revenue,
        activeOrders: todayOrders.filter(o => o.status === 'nieuw' || o.status === 'bezig').length,
        parkedOrders: parked.length,
        avgOrder: validOrders.length > 0 ? revenue / validOrders.length : 0,
        itemsSold: validOrders.reduce((s, o) => s + (o.items || []).reduce((s2, i) => s2 + i.quantity, 0), 0),
      });
      setWorkPeriod(period && period.active ? period : null);
      setBusinessSettings(bs);
    };
    updateStats();
    const interval = setInterval(updateStats, 10000);

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('nl-NL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }));
    }, 1000);

    // Check staff session
    const staff = sessionStorage.getItem('posStaff');
    if (staff) setCurrentStaff(JSON.parse(staff));

    return () => { clearInterval(interval); clearInterval(clockInterval); };
  }, []);

  const handleLogout = async () => {
    sessionStorage.removeItem('posStaff');
    setCurrentStaff(null);
    await signOut(auth);
    router.push('/');
  };

  const handleStaffLogout = () => {
    sessionStorage.removeItem('posStaff');
    setCurrentStaff(null);
  };

  const openWithPin = (target) => {
    if (currentStaff) {
      sessionStorage.setItem('posStaff', JSON.stringify(currentStaff));
      router.push(target);
    } else {
      setPinTarget(target);
      setPinInput('');
      setPinError('');
      setShowPinLogin(true);
    }
  };

  const handlePinSubmit = async () => {
    const staff = await verifyPin(pinInput);
    if (staff) {
      setCurrentStaff(staff);
      sessionStorage.setItem('posStaff', JSON.stringify(staff));
      setShowPinLogin(false);
      setPinInput('');
      if (pinTarget) {
        router.push(pinTarget);
        setPinTarget(null);
      }
    } else {
      setPinError('Ongeldige PIN');
      setPinInput('');
    }
  };

  const handlePinKey = (key) => {
    if (key === '⌫') {
      setPinInput(prev => prev.slice(0, -1));
      setPinError('');
    } else if (key === 'C') {
      setPinInput('');
      setPinError('');
    } else if (pinInput.length < 4) {
      const newPin = pinInput + key;
      setPinInput(newPin);
      setPinError('');
      if (newPin.length === 4) {
        setTimeout(async () => {
          const staff = await verifyPin(newPin);
          if (staff) {
            setCurrentStaff(staff);
            sessionStorage.setItem('posStaff', JSON.stringify(staff));
            setShowPinLogin(false);
            setPinInput('');
            if (pinTarget) {
              router.push(pinTarget);
              setPinTarget(null);
            }
          } else {
            setPinError('Ongeldige PIN');
            setPinInput('');
          }
        }, 200);
      }
    }
  };

  const tiles = [
    { title: 'Kassa', icon: '🧾', desc: 'Nieuwe bestelling opnemen', color: '#e74c3c', href: '/kassa', badge: stats.parkedOrders > 0 ? `${stats.parkedOrders} geparkeerd` : null },
    { title: 'Keuken', icon: '👨‍🍳', desc: 'Keuken display & orderstatus', color: '#f39c12', href: '/keuken', badge: stats.activeOrders > 0 ? `${stats.activeOrders} actief` : null },
    { title: 'Bestellingen', icon: '📊', desc: 'Rapporten & analytics', color: '#3498db', href: '/bestellingen' },
    { title: 'Financieel', icon: '💰', desc: 'Omzet, kosten, BTW & audit', color: '#2ecc71', href: '/financieel' },
    { title: 'Menu Beheer', icon: '📋', desc: 'Producten, modifiers & koppelingen', color: '#27ae60', href: '/menubeheer' },
    { title: 'Dagafsluiting', icon: '📑', desc: 'Z/X-rapport & kasboek', color: '#9b59b6', href: '/dagafsluiting' },
    { title: 'Personeel', icon: '👥', desc: 'Inkloksysteem, uren & rechten', color: '#1abc9c', href: '/personeel' },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.brandName}>FastFood POS</h1>
          <p style={styles.clock}>{currentTime}</p>
        </div>
        <div style={styles.quickStats}>
          <div style={styles.quickStat}>
            <span style={styles.quickStatValue}>{stats.todayOrders}</span>
            <span style={styles.quickStatLabel}>Bestellingen</span>
          </div>
          <div style={styles.quickStatDivider} />
          <div style={styles.quickStat}>
            <span style={{ ...styles.quickStatValue, color: '#27ae60' }}>{formatPrice(stats.todayRevenue)}</span>
            <span style={styles.quickStatLabel}>Omzet</span>
            {businessSettings.dailyGoal > 0 && (
              <div style={{ width: '60px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '4px' }}>
                <div style={{ height: '3px', borderRadius: '2px', background: stats.todayRevenue >= businessSettings.dailyGoal ? '#3fb950' : '#f0883e', width: `${Math.min((stats.todayRevenue / businessSettings.dailyGoal) * 100, 100)}%` }} />
              </div>
            )}
          </div>
          <div style={styles.quickStatDivider} />
          <div style={styles.quickStat}>
            <span style={{ ...styles.quickStatValue, color: '#f0883e' }}>{formatPrice(stats.avgOrder)}</span>
            <span style={styles.quickStatLabel}>Gem. Bon</span>
          </div>
          <div style={styles.quickStatDivider} />
          <div style={styles.quickStat}>
            <span style={{ ...styles.quickStatValue, color: stats.activeOrders > 0 ? '#f39c12' : '#27ae60' }}>{stats.activeOrders}</span>
            <span style={styles.quickStatLabel}>Actief</span>
          </div>
          {workPeriod && (
            <>
              <div style={styles.quickStatDivider} />
              <div style={styles.quickStat}>
                <span style={{ ...styles.quickStatValue, color: '#3fb950', fontSize: '14px' }}>OPEN</span>
                <span style={styles.quickStatLabel}>Werkperiode</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Staff info bar */}
      {currentStaff && (
        <div style={styles.staffBar}>
          <span>👤 Ingelogd als: <strong>{currentStaff.name}</strong> ({currentStaff.role})</span>
          <button onClick={handleStaffLogout} style={styles.staffLogoutBtn}>Uitklokken</button>
        </div>
      )}

      {/* Navigation Tiles */}
      <div style={styles.tilesGrid}>
        {tiles.map(tile => (
          <button
            key={tile.title}
            onClick={() => {
              if (tile.href === '/kassa') {
                openWithPin(tile.href);
              } else {
                router.push(tile.href);
              }
            }}
            style={styles.tile}
          >
            <div style={{ ...styles.tileIcon, background: tile.color + '15' }}>
              <span style={{ fontSize: '44px' }}>{tile.icon}</span>
            </div>
            <h2 style={styles.tileTitle}>{tile.title}</h2>
            <p style={styles.tileDesc}>{tile.desc}</p>
            {tile.badge && <span style={{ ...styles.tileBadge, background: tile.color }}>{tile.badge}</span>}
            <div style={{ ...styles.tileBar, background: tile.color }} />
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span>FastFood POS v3.0</span>
        {!currentStaff && (
          <button onClick={() => { setPinTarget(null); setPinInput(''); setPinError(''); setShowPinLogin(true); }} style={styles.loginBtn}>
            🔐 PIN Login
          </button>
        )}
        <button onClick={handleLogout} style={styles.logoutBtn}>Uitloggen</button>
      </div>

      {/* PIN Login Modal */}
      {showPinLogin && (
        <div style={styles.overlay} onClick={() => setShowPinLogin(false)}>
          <div style={styles.pinModal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '12px' }}>🔐</div>
            <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 'bold', color: '#e6edf3', textAlign: 'center' }}>PIN Invoeren</h2>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#8b949e', textAlign: 'center' }}>Voer uw 4-cijferige PIN in</p>

            {/* PIN dots */}
            <div style={styles.pinDots}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ ...styles.pinDot, background: i < pinInput.length ? '#3fb950' : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>

            {pinError && <div style={styles.pinError}>{pinError}</div>}

            {/* Numpad */}
            <div style={styles.pinNumpad}>
              {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(key => (
                <button key={key} style={{ ...styles.pinKey, ...(key === 'C' ? { color: '#f85149' } : {}) }} onClick={() => handlePinKey(key)}>
                  {key}
                </button>
              ))}
            </div>

            <button onClick={() => setShowPinLogin(false)} style={styles.pinCancelBtn}>Annuleren</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #1a2332 100%)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', flexWrap: 'wrap', gap: '16px' },
  brandName: { margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#fff' },
  clock: { margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' },
  quickStats: { display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.06)', padding: '14px 24px', borderRadius: '14px', backdropFilter: 'blur(10px)' },
  quickStat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  quickStatValue: { fontSize: '22px', fontWeight: 'bold', color: '#fff' },
  quickStatLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  quickStatDivider: { width: '1px', height: '32px', background: 'rgba(255,255,255,0.12)' },

  staffBar: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '8px 24px', background: 'rgba(88,166,255,0.08)', borderBottom: '1px solid rgba(88,166,255,0.15)', color: '#58a6ff', fontSize: '13px' },
  staffLogoutBtn: { padding: '4px 12px', border: '1px solid rgba(88,166,255,0.3)', borderRadius: '6px', background: 'transparent', color: '#58a6ff', cursor: 'pointer', fontSize: '12px' },

  tilesGrid: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '16px 32px', alignContent: 'center' },
  tile: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden', textAlign: 'center', color: '#fff' },
  tileIcon: { width: '70px', height: '70px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' },
  tileTitle: { margin: '0 0 4px', fontSize: '16px', fontWeight: 'bold', color: '#e6edf3' },
  tileDesc: { margin: 0, fontSize: '11px', color: '#8b949e' },
  tileBadge: { position: 'absolute', top: '10px', right: '10px', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', color: '#fff' },
  tileBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px' },

  footer: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px', color: 'rgba(255,255,255,0.35)', fontSize: '12px' },
  loginBtn: { padding: '6px 14px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer' },
  logoutBtn: { padding: '6px 14px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' },

  // PIN Modal
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  pinModal: { background: '#161b22', borderRadius: '20px', border: '1px solid #30363d', padding: '32px', width: '320px' },
  pinDots: { display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' },
  pinDot: { width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #30363d', transition: 'background 0.15s' },
  pinError: { textAlign: 'center', color: '#f85149', fontSize: '13px', marginBottom: '12px', fontWeight: '500' },
  pinNumpad: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' },
  pinKey: { padding: '16px', border: '1px solid #30363d', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', color: '#e6edf3', cursor: 'pointer', fontSize: '22px', fontWeight: 'bold', transition: 'background 0.1s' },
  pinCancelBtn: { width: '100%', padding: '10px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '14px' },
};
