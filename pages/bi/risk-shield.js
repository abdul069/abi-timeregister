import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getContractAnalyses, saveContractAnalysis, deleteContractAnalysis, analyzeContract } from '../../lib/bi-data';

export default function RiskShield() {
  const router = useRouter();
  const [contractText, setContractText] = useState('');
  const [contractNaam, setContractNaam] = useState('');
  const [resultaat, setResultaat] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('analyse');
  const [selectedAnalyse, setSelectedAnalyse] = useState(null);

  useEffect(() => {
    getContractAnalyses().then(setAnalyses);
  }, []);

  const handleAnalyze = async () => {
    if (!contractText.trim()) return;
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 2000));
    const analyse = analyzeContract(contractText);
    const result = {
      naam: contractNaam.trim() || `Contract ${new Date().toLocaleDateString('nl-BE')}`,
      tekst: contractText.substring(0, 500),
      ...analyse,
    };
    setResultaat(result);
    setAnalyzing(false);

    const id = await saveContractAnalysis(result);
    setAnalyses(prev => [{ id, ...result }, ...prev]);
  };

  const risicoKleur = (score) => score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const clausuleKleur = (risico) => risico === 'hoog' ? '#ef4444' : risico === 'medium' ? '#f59e0b' : '#10b981';
  const categorieIcon = (cat) => cat === 'juridisch' ? '\u2696\ufe0f' : cat === 'financieel' ? '\ud83d\udcb0' : cat === 'compliance' ? '\ud83d\udee1\ufe0f' : '\u2139\ufe0f';

  const voorbeeldContract = `SAMENWERKINGSOVEREENKOMST

Artikel 1 - Aansprakelijkheid
De dienstverlener is aansprakelijk voor directe schade tot maximaal het factuurbedrag van de afgelopen 12 maanden. Indirecte schade en gevolgschade zijn uitgesloten.

Artikel 2 - Betalingsvoorwaarden
Facturen dienen binnen 30 dagen na factuurdatum te worden betaald. Bij laattijdige betaling wordt een interest van 10% per jaar aangerekend plus een forfaitaire schadevergoeding van 10%.

Artikel 3 - Geheimhouding
Beide partijen verbinden zich tot geheimhouding van alle vertrouwelijke informatie gedurende de looptijd van de overeenkomst en 2 jaar na beeindiging.

Artikel 4 - Intellectueel Eigendom
Alle intellectuele eigendomsrechten op de ontwikkelde software blijven eigendom van de dienstverlener. De klant verkrijgt een niet-exclusief gebruiksrecht.

Artikel 5 - Opzeg en Beeindiging
De overeenkomst kan door beide partijen worden opgezegd met een opzegtermijn van 3 maanden. Bij ernstige tekortkoming kan de overeenkomst onmiddellijk worden ontbonden.

Artikel 6 - Boeteclausule
Bij schending van de geheimhoudingsplicht is een boete verschuldigd van EUR 50.000 per overtreding, onverminderd het recht op aanvullende schadevergoeding.

Artikel 7 - Force Majeure
In geval van overmacht worden de verplichtingen opgeschort. Indien de overmacht langer dan 6 maanden duurt, kunnen beide partijen de overeenkomst beeindigigen.

Artikel 8 - Privacy en GDPR
De verwerking van persoonsgegevens geschiedt conform de AVG/GDPR. Een verwerkersovereenkomst wordt als bijlage toegevoegd.

Artikel 9 - Concurrentiebeding
De dienstverlener verbindt zich ertoe gedurende de looptijd en 1 jaar na beeindiging geen rechtstreeks concurrerende diensten aan te bieden aan klanten van de opdrachtgever.

Artikel 10 - Garantie
De dienstverlener biedt een garantie van 6 maanden op geleverde werkzaamheden. Binnen deze periode worden gebreken kosteloos hersteld.`;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button onClick={() => router.push('/bi')} style={s.backBtn}>{'\u2190'} BI Hub</button>
        <div>
          <h1 style={s.title}>{'\ud83d\udee1\ufe0f'} RiskShield</h1>
          <p style={s.subtitle}>Contract risico-analyse</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button onClick={() => { setActiveTab('analyse'); setSelectedAnalyse(null); }} style={{ ...s.tab, ...(activeTab === 'analyse' ? s.tabActive : {}) }}>
          Nieuwe Analyse
        </button>
        <button onClick={() => setActiveTab('historie')} style={{ ...s.tab, ...(activeTab === 'historie' ? s.tabActive : {}) }}>
          Historie ({analyses.length})
        </button>
      </div>

      {activeTab === 'analyse' && !selectedAnalyse && (
        <div style={s.content}>
          <div style={s.inputCard}>
            <label style={s.label}>Contractnaam</label>
            <input
              style={s.input}
              placeholder="bv. Samenwerkingsovereenkomst IT-diensten"
              value={contractNaam}
              onChange={e => setContractNaam(e.target.value)}
            />
            <label style={{ ...s.label, marginTop: '12px' }}>Contracttekst</label>
            <textarea
              style={s.textarea}
              placeholder="Plak hier de contracttekst..."
              value={contractText}
              onChange={e => setContractText(e.target.value)}
              rows={10}
            />
            <div style={s.btnRow}>
              <button onClick={() => setContractText(voorbeeldContract)} style={s.exampleBtn}>
                Voorbeeld laden
              </button>
              <button onClick={handleAnalyze} style={s.analyzeBtn} disabled={analyzing || !contractText.trim()}>
                {analyzing ? 'Analyseren...' : '\ud83d\udd0d Analyseren'}
              </button>
            </div>
          </div>

          {/* Results */}
          {resultaat && (
            <div style={s.resultCard}>
              {/* Risk Score */}
              <div style={s.risicoHeader}>
                <div style={{ ...s.risicoScore, borderColor: risicoKleur(resultaat.risicoScore) }}>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: risicoKleur(resultaat.risicoScore) }}>
                    {resultaat.risicoScore}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>VEILIGHEID</div>
                </div>
                <div style={s.risicoInfo}>
                  <h3 style={s.resultName}>{resultaat.naam}</h3>
                  <p style={s.risicoSamenvatting}>{resultaat.samenvatting}</p>
                  <span style={s.clausuleCount}>{resultaat.totaalClausules} clausules gedetecteerd</span>
                </div>
              </div>

              {/* Clausules */}
              <h4 style={s.sectionTitle}>Clausule-analyse</h4>
              {resultaat.clausules.map((c, i) => (
                <div key={i} style={{ ...s.clausuleCard, borderLeftColor: clausuleKleur(c.risico) }}>
                  <div style={s.clausuleHeader}>
                    <div style={s.clausuleLeft}>
                      <span>{categorieIcon(c.categorie)}</span>
                      <span style={s.clausuleNaam}>{c.naam}</span>
                    </div>
                    <span style={{ ...s.risicoBadge, background: clausuleKleur(c.risico) + '20', color: clausuleKleur(c.risico) }}>
                      {c.risico.toUpperCase()}
                    </span>
                  </div>
                  {c.voorbeeld && (
                    <div style={s.clausuleVoorbeeld}>
                      &quot;{c.voorbeeld}&quot;
                    </div>
                  )}
                  <div style={s.clausuleAdvies}>
                    {'\ud83d\udca1'} {c.advies}
                  </div>
                  <div style={s.clausuleMeta}>
                    <span style={s.metaTag}>{c.categorie}</span>
                    <span style={s.metaCount}>{c.aantalVermeldingen}x vermeld</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'historie' && (
        <div style={s.content}>
          {analyses.length === 0 ? (
            <div style={s.empty}>Nog geen contractanalyses uitgevoerd</div>
          ) : (
            analyses.map(a => (
              <div key={a.id} style={s.histCard} onClick={() => { setSelectedAnalyse(a); setActiveTab('analyse'); }}>
                <div style={s.histHeader}>
                  <div>
                    <div style={s.histName}>{a.naam}</div>
                    <div style={s.histMeta}>{a.totaalClausules || 0} clausules</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: risicoKleur(a.risicoScore || 50) }}>
                      {a.risicoScore || '-'}
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteContractAnalysis(a.id); setAnalyses(prev => prev.filter(x => x.id !== a.id)); }} style={s.deleteBtn}>
                      {'\ud83d\uddd1\ufe0f'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* View saved analysis */}
      {selectedAnalyse && activeTab === 'analyse' && (
        <div style={s.content}>
          <button onClick={() => setSelectedAnalyse(null)} style={s.backToNew}>{'\u2190'} Nieuwe analyse</button>
          <div style={s.resultCard}>
            <div style={s.risicoHeader}>
              <div style={{ ...s.risicoScore, borderColor: risicoKleur(selectedAnalyse.risicoScore || 50) }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: risicoKleur(selectedAnalyse.risicoScore || 50) }}>
                  {selectedAnalyse.risicoScore || '-'}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>VEILIGHEID</div>
              </div>
              <div style={s.risicoInfo}>
                <h3 style={s.resultName}>{selectedAnalyse.naam}</h3>
                <p style={s.risicoSamenvatting}>{selectedAnalyse.samenvatting}</p>
              </div>
            </div>
            {selectedAnalyse.clausules?.map((c, i) => (
              <div key={i} style={{ ...s.clausuleCard, borderLeftColor: clausuleKleur(c.risico) }}>
                <div style={s.clausuleHeader}>
                  <div style={s.clausuleLeft}>
                    <span>{categorieIcon(c.categorie)}</span>
                    <span style={s.clausuleNaam}>{c.naam}</span>
                  </div>
                  <span style={{ ...s.risicoBadge, background: clausuleKleur(c.risico) + '20', color: clausuleKleur(c.risico) }}>
                    {c.risico.toUpperCase()}
                  </span>
                </div>
                <div style={s.clausuleAdvies}>{'\ud83d\udca1'} {c.advies}</div>
              </div>
            ))}
          </div>
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
  tabActive: { background: '#f59e0b', color: '#000', borderColor: '#f59e0b' },
  content: { padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  inputCard: { padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { width: '100%', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5', boxSizing: 'border-box' },
  btnRow: { display: 'flex', gap: '10px', marginTop: '16px' },
  exampleBtn: { flex: 1, padding: '12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  analyzeBtn: { flex: 2, padding: '12px', border: 'none', borderRadius: '10px', background: '#f59e0b', color: '#000', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  resultCard: { padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' },
  risicoHeader: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' },
  risicoScore: { width: '80px', height: '80px', borderRadius: '50%', border: '3px solid', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  risicoInfo: { flex: 1 },
  resultName: { margin: '0 0 4px', fontSize: '18px', fontWeight: '700' },
  risicoSamenvatting: { margin: '0 0 6px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' },
  clausuleCount: { fontSize: '11px', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px' },
  sectionTitle: { margin: '0 0 12px', fontSize: '14px', fontWeight: '700', color: '#e2e8f0' },
  clausuleCard: { padding: '14px', marginBottom: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', borderLeft: '3px solid' },
  clausuleHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  clausuleLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  clausuleNaam: { fontSize: '14px', fontWeight: '600', color: '#e2e8f0' },
  risicoBadge: { padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' },
  clausuleVoorbeeld: { fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', marginBottom: '8px', lineHeight: '1.4' },
  clausuleAdvies: { fontSize: '12px', color: '#60a5fa', lineHeight: '1.4', marginBottom: '6px' },
  clausuleMeta: { display: 'flex', gap: '10px', alignItems: 'center' },
  metaTag: { fontSize: '10px', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize' },
  metaCount: { fontSize: '10px', color: '#64748b' },
  empty: { textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '14px' },
  histCard: { padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' },
  histHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  histName: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0' },
  histMeta: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  deleteBtn: { padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px' },
  backToNew: { alignSelf: 'flex-start', padding: '8px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' },
};
