import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getDemoSubsidies, getOpportunities, saveOpportunity, deleteOpportunity, getBedrijfsprofiel } from '../../lib/bi-data';

export default function OpportunityRadar() {
  const router = useRouter();
  const [subsidies] = useState(getDemoSubsidies());
  const [saved, setSaved] = useState([]);
  const [profiel, setProfiel] = useState(null);
  const [filter, setFilter] = useState('alle');
  const [zoek, setZoek] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    getOpportunities().then(setSaved);
    getBedrijfsprofiel().then(setProfiel);
  }, []);

  const bronFilter = filter === 'alle' ? subsidies : subsidies.filter(s => {
    if (filter === 'vlaio') return s.bron === 'VLAIO';
    if (filter === 'eu') return s.bron.includes('EU') || s.bron.includes('TED');
    if (filter === 'epro') return s.bron.includes('e-Procurement');
    return true;
  });

  const gefilterd = bronFilter.filter(s =>
    s.titel.toLowerCase().includes(zoek.toLowerCase()) ||
    s.beschrijving.toLowerCase().includes(zoek.toLowerCase())
  ).sort((a, b) => b.match - a.match);

  const isSaved = (id) => saved.some(s => s.externeId === id);

  const toggleSave = async (item) => {
    if (isSaved(item.id)) {
      const existing = saved.find(s => s.externeId === item.id);
      if (existing) {
        await deleteOpportunity(existing.id);
        setSaved(prev => prev.filter(s => s.id !== existing.id));
      }
    } else {
      const newId = await saveOpportunity({ ...item, externeId: item.id });
      setSaved(prev => [...prev, { id: newId, externeId: item.id, ...item }]);
    }
  };

  const matchColor = (score) => score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button onClick={() => router.push('/bi')} style={s.backBtn}>{'\u2190'} BI Hub</button>
        <div>
          <h1 style={s.title}>{'\ud83d\udce1'} OpportunityRadar</h1>
          <p style={s.subtitle}>Subsidies & aanbestedingen</p>
        </div>
      </div>

      {/* Search */}
      <div style={s.searchBar}>
        <input
          style={s.searchInput}
          placeholder="Zoek subsidies en aanbestedingen..."
          value={zoek}
          onChange={e => setZoek(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div style={s.filters}>
        {[
          { key: 'alle', label: 'Alle' },
          { key: 'vlaio', label: 'VLAIO' },
          { key: 'eu', label: 'EU / TED' },
          { key: 'epro', label: 'e-Procurement' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{ ...s.filterBtn, ...(filter === f.key ? s.filterActive : {}) }}
          >
            {f.label}
          </button>
        ))}
        <span style={s.resultCount}>{gefilterd.length} resultaten</span>
      </div>

      {/* Results */}
      <div style={s.list}>
        {gefilterd.map(item => (
          <div key={item.id} style={s.card} onClick={() => setSelectedItem(item)}>
            <div style={s.cardTop}>
              <span style={{ ...s.bronBadge, background: item.bron === 'VLAIO' ? '#3b82f620' : item.bron.includes('EU') ? '#8b5cf620' : '#f59e0b20', color: item.bron === 'VLAIO' ? '#60a5fa' : item.bron.includes('EU') ? '#a78bfa' : '#fbbf24' }}>
                {item.bron}
              </span>
              <span style={{ ...s.typeBadge, background: item.type === 'subsidie' ? '#10b98120' : '#f59e0b20', color: item.type === 'subsidie' ? '#34d399' : '#fbbf24' }}>
                {item.type}
              </span>
              <div style={s.matchCircle}>
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#1e293b" strokeWidth="3" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke={matchColor(item.match)} strokeWidth="3"
                    strokeDasharray={`${item.match} ${100 - item.match}`}
                    strokeDashoffset="25" strokeLinecap="round" />
                </svg>
                <span style={{ ...s.matchText, color: matchColor(item.match) }}>{item.match}%</span>
              </div>
            </div>
            <h3 style={s.cardTitle}>{item.titel}</h3>
            <p style={s.cardDesc}>{item.beschrijving.substring(0, 120)}...</p>
            <div style={s.cardMeta}>
              <span style={s.metaItem}>{'\ud83d\udcc5'} {item.deadline}</span>
              <span style={s.metaItem}>{'\ud83d\udcb0'} {item.bedrag}</span>
            </div>
            <div style={s.cardActions}>
              <button
                onClick={e => { e.stopPropagation(); toggleSave(item); }}
                style={{ ...s.saveBtn, ...(isSaved(item.id) ? s.savedBtn : {}) }}
              >
                {isSaved(item.id) ? '\u2605 Opgeslagen' : '\u2606 Opslaan'}
              </button>
              <button onClick={e => { e.stopPropagation(); router.push({ pathname: '/bi/dossier-forge', query: { subsidie: item.id } }); }} style={s.dossierBtn}>
                {'\ud83d\udcc4'} Dossier
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div style={s.overlay} onClick={() => setSelectedItem(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <span style={{ ...s.bronBadge, background: '#3b82f620', color: '#60a5fa' }}>{selectedItem.bron}</span>
                <h2 style={s.modalTitle}>{selectedItem.titel}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} style={s.closeBtn}>{'\u2715'}</button>
            </div>
            <div style={s.modalBody}>
              <div style={s.modalMatch}>
                <div style={{ fontSize: '36px', fontWeight: '800', color: matchColor(selectedItem.match) }}>{selectedItem.match}%</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Match Score</div>
              </div>
              <div style={s.modalSection}>
                <h4 style={s.sectionLabel}>Beschrijving</h4>
                <p style={s.sectionText}>{selectedItem.beschrijving}</p>
              </div>
              <div style={s.modalGrid}>
                <div style={s.modalField}>
                  <span style={s.fieldLabel}>Type</span>
                  <span style={s.fieldValue}>{selectedItem.type}</span>
                </div>
                <div style={s.modalField}>
                  <span style={s.fieldLabel}>Deadline</span>
                  <span style={s.fieldValue}>{selectedItem.deadline}</span>
                </div>
                <div style={s.modalField}>
                  <span style={s.fieldLabel}>Bedrag</span>
                  <span style={s.fieldValue}>{selectedItem.bedrag}</span>
                </div>
                <div style={s.modalField}>
                  <span style={s.fieldLabel}>Status</span>
                  <span style={{ ...s.fieldValue, color: '#10b981' }}>{selectedItem.status}</span>
                </div>
              </div>
              <div style={s.modalActions}>
                <button onClick={() => { toggleSave(selectedItem); }} style={{ ...s.saveBtn, flex: 1 }}>
                  {isSaved(selectedItem.id) ? '\u2605 Opgeslagen' : '\u2606 Opslaan'}
                </button>
                <button onClick={() => { setSelectedItem(null); router.push({ pathname: '/bi/dossier-forge', query: { subsidie: selectedItem.id } }); }} style={{ ...s.dossierBtn, flex: 1 }}>
                  {'\ud83d\udcc4'} Dossier Aanmaken
                </button>
              </div>
            </div>
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
  title: { margin: 0, fontSize: '22px', fontWeight: '800', color: '#f1f5f9' },
  subtitle: { margin: '2px 0 0', fontSize: '12px', color: '#64748b' },
  searchBar: { padding: '0 20px 12px' },
  searchInput: { width: '100%', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  filters: { display: 'flex', gap: '8px', padding: '0 20px 16px', alignItems: 'center', flexWrap: 'wrap' },
  filterBtn: { padding: '6px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
  filterActive: { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' },
  resultCount: { marginLeft: 'auto', fontSize: '12px', color: '#64748b' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 20px 24px' },
  card: { padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' },
  cardTop: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' },
  bronBadge: { padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' },
  typeBadge: { padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600' },
  matchCircle: { marginLeft: 'auto', position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  matchText: { position: 'absolute', fontSize: '10px', fontWeight: '800' },
  cardTitle: { margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: '#e2e8f0' },
  cardDesc: { margin: '0 0 10px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' },
  cardMeta: { display: 'flex', gap: '16px', marginBottom: '12px' },
  metaItem: { fontSize: '12px', color: '#64748b' },
  cardActions: { display: 'flex', gap: '8px' },
  saveBtn: { padding: '8px 16px', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  savedBtn: { background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' },
  dossierBtn: { padding: '8px 16px', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },

  // Modal
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#1e293b', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 20px 0' },
  modalTitle: { margin: '8px 0 0', fontSize: '20px', fontWeight: '700', color: '#f1f5f9' },
  closeBtn: { padding: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' },
  modalBody: { padding: '16px 20px 24px' },
  modalMatch: { textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '16px' },
  modalSection: { marginBottom: '16px' },
  sectionLabel: { margin: '0 0 6px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  sectionText: { margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5' },
  modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' },
  modalField: { padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' },
  fieldLabel: { display: 'block', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' },
  fieldValue: { fontSize: '14px', fontWeight: '600', color: '#e2e8f0' },
  modalActions: { display: 'flex', gap: '8px' },
};
