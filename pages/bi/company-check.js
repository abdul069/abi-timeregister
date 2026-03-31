import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getCompanyChecks, saveCompanyCheck, deleteCompanyCheck, analyzeCompany } from '../../lib/bi-data';

export default function CompanyCheck() {
  const router = useRouter();
  const [ondernemingsnummer, setOndernemingsnummer] = useState('');
  const [bedrijfsnaam, setBedrijfsnaam] = useState('');
  const [resultaat, setResultaat] = useState(null);
  const [geschiedenis, setGeschiedenis] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('check');

  useEffect(() => {
    getCompanyChecks().then(setGeschiedenis);
  }, []);

  const handleAnalyze = async () => {
    if (!ondernemingsnummer.trim()) return;
    setAnalyzing(true);
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));
    const analyse = analyzeCompany(ondernemingsnummer);
    const result = {
      ondernemingsnummer: ondernemingsnummer.trim(),
      bedrijfsnaam: bedrijfsnaam.trim() || 'Onbekend bedrijf',
      ...analyse,
    };
    setResultaat(result);
    setAnalyzing(false);

    const id = await saveCompanyCheck(result);
    setGeschiedenis(prev => [{ id, ...result }, ...prev]);
  };

  const handleDelete = async (id) => {
    await deleteCompanyCheck(id);
    setGeschiedenis(prev => prev.filter(g => g.id !== id));
  };

  const scoreColor = (score) => score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const statusIcon = (ok) => ok ? '\u2705' : '\u274c';

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button onClick={() => router.push('/bi')} style={s.backBtn}>{'\u2190'} BI Hub</button>
        <div>
          <h1 style={s.title}>{'\ud83c\udfe2'} CompanyCheck</h1>
          <p style={s.subtitle}>Bedrijfsanalyse & compliance</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button onClick={() => setActiveTab('check')} style={{ ...s.tab, ...(activeTab === 'check' ? s.tabActive : {}) }}>
          Nieuwe Check
        </button>
        <button onClick={() => setActiveTab('historie')} style={{ ...s.tab, ...(activeTab === 'historie' ? s.tabActive : {}) }}>
          Historie ({geschiedenis.length})
        </button>
      </div>

      {activeTab === 'check' && (
        <div style={s.content}>
          {/* Input */}
          <div style={s.inputCard}>
            <label style={s.label}>Ondernemingsnummer (KBO)</label>
            <input
              style={s.input}
              placeholder="bv. 0123.456.789"
              value={ondernemingsnummer}
              onChange={e => setOndernemingsnummer(e.target.value)}
            />
            <label style={{ ...s.label, marginTop: '12px' }}>Bedrijfsnaam (optioneel)</label>
            <input
              style={s.input}
              placeholder="bv. TechCo BV"
              value={bedrijfsnaam}
              onChange={e => setBedrijfsnaam(e.target.value)}
            />
            <button onClick={handleAnalyze} style={s.analyzeBtn} disabled={analyzing || !ondernemingsnummer.trim()}>
              {analyzing ? 'Analyseren...' : '\ud83d\udd0d Bedrijf Analyseren'}
            </button>
          </div>

          {/* Results */}
          {resultaat && (
            <div style={s.resultCard}>
              <div style={s.resultHeader}>
                <div>
                  <h3 style={s.resultName}>{resultaat.bedrijfsnaam}</h3>
                  <p style={s.resultKbo}>{resultaat.ondernemingsnummer}</p>
                </div>
                <div style={s.scoreCircle}>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: scoreColor(resultaat.scores.samenwerkingsscore) }}>
                    {resultaat.scores.samenwerkingsscore}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>SCORE</div>
                </div>
              </div>

              {/* Quick Stats */}
              <div style={s.statsGrid}>
                <div style={s.statItem}>
                  <span style={s.statIcon}>{statusIcon(resultaat.scores.btwStatus === 'actief')}</span>
                  <span style={s.statLabel}>BTW</span>
                  <span style={{ ...s.statValue, color: resultaat.scores.btwStatus === 'actief' ? '#10b981' : '#ef4444' }}>
                    {resultaat.scores.btwStatus === 'actief' ? 'Actief' : 'Inactief'}
                  </span>
                </div>
                <div style={s.statItem}>
                  <span style={s.statIcon}>{statusIcon(resultaat.scores.rszStatus === 'in_orde')}</span>
                  <span style={s.statLabel}>RSZ</span>
                  <span style={{ ...s.statValue, color: resultaat.scores.rszStatus === 'in_orde' ? '#10b981' : '#ef4444' }}>
                    {resultaat.scores.rszStatus === 'in_orde' ? 'In orde' : 'Achterstal'}
                  </span>
                </div>
                <div style={s.statItem}>
                  <span style={s.statIcon}>{statusIcon(resultaat.scores.jaarrekeningIngediend)}</span>
                  <span style={s.statLabel}>Jaarrekening</span>
                  <span style={{ ...s.statValue, color: resultaat.scores.jaarrekeningIngediend ? '#10b981' : '#ef4444' }}>
                    {resultaat.scores.jaarrekeningIngediend ? `Ingediend (${resultaat.scores.laatsteJaarrekening})` : 'Niet ingediend'}
                  </span>
                </div>
                <div style={s.statItem}>
                  <span style={s.statIcon}>{statusIcon(resultaat.scores.juridischeStatus === 'normaal')}</span>
                  <span style={s.statLabel}>Juridisch</span>
                  <span style={{ ...s.statValue, color: resultaat.scores.juridischeStatus === 'normaal' ? '#10b981' : '#ef4444' }}>
                    {resultaat.scores.juridischeStatus === 'normaal' ? 'Normaal' : 'Procedure'}
                  </span>
                </div>
              </div>

              {/* Score Bars */}
              <div style={s.scoresSection}>
                <h4 style={s.sectionTitle}>Scores</h4>
                {[
                  { label: 'Samenwerkingsscore', value: resultaat.scores.samenwerkingsscore },
                  { label: 'Financiele Gezondheid', value: resultaat.scores.financieleGezondheid },
                  { label: 'Betalingsgedrag', value: resultaat.scores.betalingsgedrag },
                ].map(item => (
                  <div key={item.label} style={s.scoreBar}>
                    <div style={s.scoreBarHeader}>
                      <span style={s.scoreBarLabel}>{item.label}</span>
                      <span style={{ ...s.scoreBarValue, color: scoreColor(item.value) }}>{item.value}/100</span>
                    </div>
                    <div style={s.progressBg}>
                      <div style={{ ...s.progressFill, width: `${item.value}%`, background: scoreColor(item.value) }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bedrijfsinfo */}
              <div style={s.infoSection}>
                <h4 style={s.sectionTitle}>Bedrijfsgegevens</h4>
                <div style={s.infoGrid}>
                  <div style={s.infoItem}>
                    <span style={s.infoLabel}>Rechtsvorm</span>
                    <span style={s.infoValue}>{resultaat.scores.rechtsvorm}</span>
                  </div>
                  <div style={s.infoItem}>
                    <span style={s.infoLabel}>Oprichting</span>
                    <span style={s.infoValue}>{resultaat.scores.oprichtingsdatum}</span>
                  </div>
                  <div style={s.infoItem}>
                    <span style={s.infoLabel}>NACE-code</span>
                    <span style={s.infoValue}>{resultaat.scores.naceCode}</span>
                  </div>
                </div>
              </div>

              {/* Risico's */}
              <div style={s.risicoSection}>
                <h4 style={s.sectionTitle}>Risico-analyse</h4>
                {resultaat.risicos.map((r, i) => (
                  <div key={i} style={{ ...s.risicoItem, borderLeftColor: r.type === 'hoog' ? '#ef4444' : r.type === 'medium' ? '#f59e0b' : '#10b981' }}>
                    <span style={{ ...s.risicoBadge, background: r.type === 'hoog' ? '#ef444420' : r.type === 'medium' ? '#f59e0b20' : '#10b98120', color: r.type === 'hoog' ? '#ef4444' : r.type === 'medium' ? '#f59e0b' : '#10b981' }}>
                      {r.type.toUpperCase()}
                    </span>
                    <span style={s.risicoText}>{r.tekst}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'historie' && (
        <div style={s.content}>
          {geschiedenis.length === 0 ? (
            <div style={s.empty}>Nog geen bedrijfschecks uitgevoerd</div>
          ) : (
            geschiedenis.map(g => (
              <div key={g.id} style={s.histCard}>
                <div style={s.histHeader}>
                  <div>
                    <div style={s.histName}>{g.bedrijfsnaam}</div>
                    <div style={s.histKbo}>{g.ondernemingsnummer}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: scoreColor(g.scores?.samenwerkingsscore || 0) }}>
                      {g.scores?.samenwerkingsscore || '-'}
                    </div>
                    <button onClick={() => handleDelete(g.id)} style={s.deleteBtn}>{'\ud83d\uddd1\ufe0f'}</button>
                  </div>
                </div>
                <div style={s.histTags}>
                  <span style={{ ...s.histTag, color: g.scores?.btwStatus === 'actief' ? '#10b981' : '#ef4444' }}>
                    BTW: {g.scores?.btwStatus || '-'}
                  </span>
                  <span style={{ ...s.histTag, color: g.scores?.rszStatus === 'in_orde' ? '#10b981' : '#ef4444' }}>
                    RSZ: {g.scores?.rszStatus === 'in_orde' ? 'OK' : 'NOK'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#f1f5f9' },
  header: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' },
  backBtn: { padding: '8px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', flexShrink: 0 },
  title: { margin: 0, fontSize: '22px', fontWeight: '800' },
  subtitle: { margin: '2px 0 0', fontSize: '12px', color: '#64748b' },
  tabs: { display: 'flex', gap: '4px', padding: '0 20px 16px' },
  tab: { flex: 1, padding: '10px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', background: 'transparent', color: '#94a3b8', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'center' },
  tabActive: { background: '#10b981', color: '#fff', borderColor: '#10b981' },
  content: { padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  inputCard: { padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { width: '100%', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  analyzeBtn: { width: '100%', padding: '14px', border: 'none', borderRadius: '12px', background: '#10b981', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '16px' },
  resultCard: { padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' },
  resultHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  resultName: { margin: 0, fontSize: '20px', fontWeight: '700' },
  resultKbo: { margin: '4px 0 0', fontSize: '13px', color: '#64748b' },
  scoreCircle: { textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', minWidth: '70px' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' },
  statItem: { display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' },
  statIcon: { fontSize: '16px' },
  statLabel: { fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
  statValue: { fontSize: '13px', fontWeight: '600' },
  scoresSection: { marginBottom: '20px' },
  sectionTitle: { margin: '0 0 12px', fontSize: '14px', fontWeight: '700', color: '#e2e8f0' },
  scoreBar: { marginBottom: '12px' },
  scoreBarHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  scoreBarLabel: { fontSize: '12px', color: '#94a3b8' },
  scoreBarValue: { fontSize: '12px', fontWeight: '700' },
  progressBg: { height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s' },
  infoSection: { marginBottom: '20px' },
  infoGrid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  infoItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  infoLabel: { fontSize: '12px', color: '#64748b' },
  infoValue: { fontSize: '13px', fontWeight: '500', color: '#e2e8f0', textAlign: 'right', maxWidth: '60%' },
  risicoSection: {},
  risicoItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', marginBottom: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid' },
  risicoBadge: { padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', flexShrink: 0 },
  risicoText: { fontSize: '13px', color: '#cbd5e1' },
  empty: { textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '14px' },
  histCard: { padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' },
  histHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  histName: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0' },
  histKbo: { fontSize: '12px', color: '#64748b' },
  deleteBtn: { padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px' },
  histTags: { display: 'flex', gap: '12px', marginTop: '8px' },
  histTag: { fontSize: '11px', fontWeight: '600' },
};
