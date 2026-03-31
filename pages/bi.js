import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getBedrijfsprofiel } from '../lib/bi-data';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function BIHub() {
  const router = useRouter();
  const [profiel, setProfiel] = useState(null);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    getBedrijfsprofiel().then(setProfiel);
    const clock = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('nl-BE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }));
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  const modules = [
    {
      title: 'OpportunityRadar',
      icon: '\ud83d\udce1',
      desc: 'Subsidies & aanbestedingen opsporen',
      color: '#3b82f6',
      href: '/bi/opportunity-radar',
      tag: 'VLAIO \u2022 TED \u2022 e-Procurement',
    },
    {
      title: 'CompanyCheck',
      icon: '\ud83c\udfe2',
      desc: 'Bedrijfsanalyse & compliance check',
      color: '#10b981',
      href: '/bi/company-check',
      tag: 'BTW \u2022 RSZ \u2022 Jaarrekeningen',
    },
    {
      title: 'RiskShield',
      icon: '\ud83d\udee1\ufe0f',
      desc: 'Contract risico-analyse per clausule',
      color: '#f59e0b',
      href: '/bi/risk-shield',
      tag: 'Clausules \u2022 Compliance \u2022 Advies',
    },
    {
      title: 'DossierForge',
      icon: '\ud83d\udcc4',
      desc: 'Subsidiedossier generator',
      color: '#8b5cf6',
      href: '/bi/dossier-forge',
      tag: 'Concept \u2022 Budget \u2022 Planning',
    },
    {
      title: 'Kennisbank',
      icon: '\ud83c\udfdb\ufe0f',
      desc: 'Uw bedrijfsprofiel beheren',
      color: '#ec4899',
      href: '/bi/kennisbank',
      tag: profiel?.bedrijfsnaam || 'Profiel instellen',
    },
  ];

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <div style={s.headerTop}>
            <span style={s.badge}>BETA</span>
          </div>
          <h1 style={s.title}>Business Intelligence</h1>
          <p style={s.subtitle}>{currentTime}</p>
        </div>
        {profiel?.bedrijfsnaam && (
          <div style={s.profielCard}>
            <span style={s.profielIcon}>{'\ud83c\udfe2'}</span>
            <div>
              <div style={s.profielNaam}>{profiel.bedrijfsnaam}</div>
              <div style={s.profielInfo}>{profiel.sector || 'Sector instellen'}</div>
            </div>
          </div>
        )}
      </div>

      <div style={s.grid}>
        {modules.map(m => (
          <button key={m.title} onClick={() => router.push(m.href)} style={s.card}>
            <div style={{ ...s.cardIcon, background: m.color + '18' }}>
              <span style={{ fontSize: '36px' }}>{m.icon}</span>
            </div>
            <div style={s.cardBody}>
              <h2 style={s.cardTitle}>{m.title}</h2>
              <p style={s.cardDesc}>{m.desc}</p>
              <span style={{ ...s.cardTag, borderColor: m.color + '40', color: m.color }}>{m.tag}</span>
            </div>
            <div style={{ ...s.cardBar, background: m.color }} />
          </button>
        ))}
      </div>

      <div style={s.footer}>
        <span>ABI Business Intelligence v1.0</span>
        <button onClick={async () => { await signOut(auth); router.push('/'); }} style={s.logoutBtn}>Uitloggen</button>
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', flexWrap: 'wrap', gap: '16px' },
  headerTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' },
  backBtn: { padding: '4px 12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' },
  badge: { padding: '2px 8px', borderRadius: '6px', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' },
  title: { margin: 0, fontSize: '26px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.5px' },
  subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#64748b', textTransform: 'capitalize' },
  profielCard: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' },
  profielIcon: { fontSize: '24px' },
  profielNaam: { fontSize: '14px', fontWeight: '600', color: '#e2e8f0' },
  profielInfo: { fontSize: '11px', color: '#64748b' },
  grid: { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 24px 24px', overflowY: 'auto' },
  card: { position: 'relative', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', textAlign: 'left', color: '#fff', overflow: 'hidden', transition: 'all 0.2s', width: '100%' },
  cardIcon: { width: '60px', height: '60px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { margin: 0, fontSize: '17px', fontWeight: '700', color: '#f1f5f9' },
  cardDesc: { margin: '3px 0 8px', fontSize: '13px', color: '#94a3b8' },
  cardTag: { display: 'inline-block', padding: '3px 10px', borderRadius: '8px', border: '1px solid', fontSize: '10px', fontWeight: '600' },
  cardBar: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '3px' },
  footer: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px 24px', color: '#475569', fontSize: '11px' },
  logoutBtn: { padding: '6px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'transparent', color: '#64748b', fontSize: '11px', cursor: 'pointer' },
};
