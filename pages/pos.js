import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getTodayOrders, formatPrice, resetDailyCounter } from '../lib/pos-data';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function PosHome() {
  const router = useRouter();
  const [stats, setStats] = useState({ todayOrders: 0, todayRevenue: 0, activeOrders: 0 });
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateStats = async () => {
      const todayOrders = await getTodayOrders();
      setStats({
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
        activeOrders: todayOrders.filter(o => o.status === 'nieuw' || o.status === 'bezig').length,
      });
    };
    updateStats();
    const interval = setInterval(updateStats, 10000);

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('nl-NL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    }, 1000);

    return () => { clearInterval(interval); clearInterval(clockInterval); };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const tiles = [
    {
      title: 'Kassa',
      icon: '🧾',
      desc: 'Nieuwe bestelling opnemen',
      color: '#e74c3c',
      href: '/kassa',
    },
    {
      title: 'Keuken',
      icon: '👨‍🍳',
      desc: 'Keuken display & orderstatus',
      color: '#f39c12',
      href: '/keuken',
    },
    {
      title: 'Bestellingen',
      icon: '📊',
      desc: 'Ordergeschiedenis & rapporten',
      color: '#3498db',
      href: '/bestellingen',
    },
    {
      title: 'Menu Beheer',
      icon: '📋',
      desc: 'Producten & prijzen beheren',
      color: '#27ae60',
      href: '/menubeheer',
    },
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
            <span style={styles.quickStatLabel}>Bestellingen vandaag</span>
          </div>
          <div style={styles.quickStatDivider} />
          <div style={styles.quickStat}>
            <span style={{ ...styles.quickStatValue, color: '#27ae60' }}>{formatPrice(stats.todayRevenue)}</span>
            <span style={styles.quickStatLabel}>Omzet vandaag</span>
          </div>
          <div style={styles.quickStatDivider} />
          <div style={styles.quickStat}>
            <span style={{ ...styles.quickStatValue, color: stats.activeOrders > 0 ? '#f39c12' : '#27ae60' }}>
              {stats.activeOrders}
            </span>
            <span style={styles.quickStatLabel}>Actieve orders</span>
          </div>
        </div>
      </div>

      {/* Navigation Tiles */}
      <div style={styles.tilesGrid}>
        {tiles.map(tile => (
          <button
            key={tile.title}
            onClick={() => router.push(tile.href)}
            style={styles.tile}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ ...styles.tileIcon, background: tile.color + '15' }}>
              <span style={{ fontSize: '48px' }}>{tile.icon}</span>
            </div>
            <h2 style={styles.tileTitle}>{tile.title}</h2>
            <p style={styles.tileDesc}>{tile.desc}</p>
            <div style={{ ...styles.tileBar, background: tile.color }} />
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span>FastFood POS Systeem v1.0</span>
        <button
          onClick={async () => { if (confirm('Weet je zeker dat je de dagteller wilt resetten?')) await resetDailyCounter(); }}
          style={styles.resetBtn}
        >
          Reset Dagteller
        </button>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Uitloggen
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 40px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  brandName: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#fff',
  },
  clock: {
    margin: '4px 0 0',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'capitalize',
  },
  quickStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    background: 'rgba(255,255,255,0.08)',
    padding: '16px 28px',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
  },
  quickStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
  },
  quickStatLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  quickStatDivider: {
    width: '1px',
    height: '36px',
    background: 'rgba(255,255,255,0.15)',
  },
  tilesGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    padding: '20px 40px',
    alignContent: 'center',
  },
  tile: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px 24px',
    background: '#fff',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    textAlign: 'center',
  },
  tileIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  tileTitle: {
    margin: '0 0 6px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  tileDesc: {
    margin: 0,
    fontSize: '13px',
    color: '#888',
  },
  tileBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '24px',
    padding: '20px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
  },
  resetBtn: {
    padding: '6px 16px',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    cursor: 'pointer',
  },
  logoutBtn: {
    padding: '6px 16px',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    cursor: 'pointer',
  },
};
