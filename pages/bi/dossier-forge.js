import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getDossiers, saveDossier, updateDossier, deleteDossier, generateDossier, getDemoSubsidies, getBedrijfsprofiel } from '../../lib/bi-data';

export default function DossierForge() {
  const router = useRouter();
  const [dossiers, setDossiers] = useState([]);
  const [profiel, setProfiel] = useState({});
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editText, setEditText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showSubsidieKiezer, setShowSubsidieKiezer] = useState(false);
  const subsidies = getDemoSubsidies();

  useEffect(() => {
    getDossiers().then(setDossiers);
    getBedrijfsprofiel().then(setProfiel);

    // Check for subsidie query param
    if (router.query.subsidie) {
      const sub = subsidies.find(s => s.id === router.query.subsidie);
      if (sub) {
        getBedrijfsprofiel().then(p => {
          handleGenerate(sub, p);
        });
      }
    }
  }, [router.query.subsidie]);

  const handleGenerate = async (subsidie, profielData) => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1500));
    const dossier = generateDossier(subsidie, profielData || profiel);
    const id = await saveDossier(dossier);
    const newDossier = { id, ...dossier };
    setDossiers(prev => [newDossier, ...prev]);
    setSelectedDossier(newDossier);
    setGenerating(false);
    setShowSubsidieKiezer(false);
  };

  const handleSaveSection = async (dossier, sectionIndex) => {
    const updatedSecties = [...dossier.secties];
    updatedSecties[sectionIndex] = { ...updatedSecties[sectionIndex], inhoud: editText };
    await updateDossier(dossier.id, { secties: updatedSecties });
    const updated = { ...dossier, secties: updatedSecties };
    setSelectedDossier(updated);
    setDossiers(prev => prev.map(d => d.id === dossier.id ? updated : d));
    setEditingSection(null);
  };

  const handleDelete = async (id) => {
    await deleteDossier(id);
    setDossiers(prev => prev.filter(d => d.id !== id));
    if (selectedDossier?.id === id) setSelectedDossier(null);
  };

  const handleExport = (dossier) => {
    let text = `${dossier.titel}\n${'='.repeat(50)}\n\n`;
    text += `Subsidie: ${dossier.subsidie}\nBron: ${dossier.bron}\nStatus: ${dossier.status}\n\n`;
    dossier.secties.forEach(s => {
      text += `${'─'.repeat(50)}\n${s.titel.toUpperCase()}\n${'─'.repeat(50)}\n${s.inhoud}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dossier.titel.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusKleur = (status) => status === 'concept' ? '#f59e0b' : status === 'definitief' ? '#10b981' : '#3b82f6';

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button onClick={() => router.push('/bi')} style={s.backBtn}>{'\u2190'} BI Hub</button>
        <div style={{ flex: 1 }}>
          <h1 style={s.title}>{'\ud83d\udcc4'} DossierForge</h1>
          <p style={s.subtitle}>Subsidiedossier generator</p>
        </div>
        <button onClick={() => setShowSubsidieKiezer(true)} style={s.newBtn}>+ Nieuw</button>
      </div>

      {generating && (
        <div style={s.genOverlay}>
          <div style={s.genModal}>
            <div style={s.spinner} />
            <p style={s.genText}>Dossier wordt gegenereerd...</p>
          </div>
        </div>
      )}

      {/* Subsidie Picker */}
      {showSubsidieKiezer && (
        <div style={s.overlay} onClick={() => setShowSubsidieKiezer(false)}>
          <div style={s.picker} onClick={e => e.stopPropagation()}>
            <h3 style={s.pickerTitle}>Kies een subsidie</h3>
            <p style={s.pickerSubtitle}>Selecteer de subsidie waarvoor u een dossier wilt aanmaken</p>
            {subsidies.map(sub => (
              <button key={sub.id} onClick={() => handleGenerate(sub)} style={s.pickerItem}>
                <div>
                  <div style={s.pickerItemTitle}>{sub.titel}</div>
                  <div style={s.pickerItemMeta}>{sub.bron} \u2022 {sub.bedrag}</div>
                </div>
                <span style={s.pickerArrow}>{'\u2192'}</span>
              </button>
            ))}
            <button onClick={() => setShowSubsidieKiezer(false)} style={s.cancelBtn}>Annuleren</button>
          </div>
        </div>
      )}

      {/* Dossier Detail */}
      {selectedDossier ? (
        <div style={s.content}>
          <div style={s.dossierHeader}>
            <button onClick={() => setSelectedDossier(null)} style={s.backToList}>{'\u2190'} Overzicht</button>
            <div style={s.dossierActions}>
              <button onClick={() => handleExport(selectedDossier)} style={s.exportBtn}>{'\ud83d\udce4'} Export</button>
            </div>
          </div>

          <div style={s.dossierTitle}>
            <h2 style={s.dossierTitel}>{selectedDossier.titel}</h2>
            <div style={s.dossierMeta}>
              <span style={{ ...s.statusBadge, background: statusKleur(selectedDossier.status) + '20', color: statusKleur(selectedDossier.status) }}>
                {selectedDossier.status?.toUpperCase()}
              </span>
              <span style={s.dossierBron}>{selectedDossier.bron}</span>
            </div>
          </div>

          {/* Sections */}
          {selectedDossier.secties?.map((sectie, idx) => (
            <div key={idx} style={s.sectieCard}>
              <div style={s.sectieHeader}>
                <h3 style={s.sectieTitel}>{sectie.titel}</h3>
                <button
                  onClick={() => {
                    if (editingSection === idx) {
                      setEditingSection(null);
                    } else {
                      setEditingSection(idx);
                      setEditText(sectie.inhoud);
                    }
                  }}
                  style={s.editBtn}
                >
                  {editingSection === idx ? 'Annuleren' : '\u270f\ufe0f Bewerken'}
                </button>
              </div>
              {editingSection === idx ? (
                <div>
                  <textarea
                    style={s.editTextarea}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={8}
                  />
                  <button onClick={() => handleSaveSection(selectedDossier, idx)} style={s.saveBtn}>
                    Opslaan
                  </button>
                </div>
              ) : (
                <pre style={s.sectieInhoud}>{sectie.inhoud}</pre>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Dossier List */
        <div style={s.content}>
          {dossiers.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{'\ud83d\udcc4'}</div>
              <p>Nog geen dossiers aangemaakt</p>
              <button onClick={() => setShowSubsidieKiezer(true)} style={s.emptyBtn}>
                Eerste dossier aanmaken
              </button>
            </div>
          ) : (
            dossiers.map(d => (
              <div key={d.id} style={s.dossierCard} onClick={() => setSelectedDossier(d)}>
                <div style={s.dossierCardHeader}>
                  <div style={{ flex: 1 }}>
                    <div style={s.dossierCardTitle}>{d.titel}</div>
                    <div style={s.dossierCardMeta}>
                      <span style={{ ...s.statusBadge, background: statusKleur(d.status) + '20', color: statusKleur(d.status) }}>
                        {d.status?.toUpperCase()}
                      </span>
                      <span style={s.dossierCardBron}>{d.bron}</span>
                      <span style={s.dossierCardBron}>{d.secties?.length || 0} secties</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={e => { e.stopPropagation(); handleExport(d); }} style={s.smallBtn}>{'\ud83d\udce4'}</button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(d.id); }} style={s.smallBtn}>{'\ud83d\uddd1\ufe0f'}</button>
                  </div>
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
  newBtn: { padding: '10px 18px', border: 'none', borderRadius: '10px', background: '#8b5cf6', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 },
  content: { padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' },

  // Generating
  genOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  genModal: { textAlign: 'center', padding: '40px' },
  spinner: { width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' },
  genText: { color: '#94a3b8', fontSize: '14px' },

  // Subsidie picker
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 },
  picker: { background: '#1e293b', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto', padding: '24px 20px' },
  pickerTitle: { margin: '0 0 4px', fontSize: '18px', fontWeight: '700' },
  pickerSubtitle: { margin: '0 0 16px', fontSize: '13px', color: '#64748b' },
  pickerItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', color: '#f1f5f9', cursor: 'pointer', marginBottom: '8px', textAlign: 'left' },
  pickerItemTitle: { fontSize: '14px', fontWeight: '600' },
  pickerItemMeta: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  pickerArrow: { fontSize: '18px', color: '#8b5cf6' },
  cancelBtn: { width: '100%', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'transparent', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', marginTop: '8px' },

  // Dossier detail
  dossierHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  backToList: { padding: '8px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' },
  dossierActions: { display: 'flex', gap: '8px' },
  exportBtn: { padding: '8px 14px', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  dossierTitle: { padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' },
  dossierTitel: { margin: '0 0 8px', fontSize: '20px', fontWeight: '700' },
  dossierMeta: { display: 'flex', gap: '10px', alignItems: 'center' },
  statusBadge: { padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' },
  dossierBron: { fontSize: '12px', color: '#64748b' },

  // Sections
  sectieCard: { padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' },
  sectieHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  sectieTitel: { margin: 0, fontSize: '15px', fontWeight: '700', color: '#e2e8f0' },
  editBtn: { padding: '6px 12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' },
  sectieInhoud: { margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontFamily: 'inherit' },
  editTextarea: { width: '100%', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '13px', lineHeight: '1.6', fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' },
  saveBtn: { padding: '10px 20px', border: 'none', borderRadius: '8px', background: '#8b5cf6', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },

  // Dossier list
  empty: { textAlign: 'center', padding: '60px 20px', color: '#64748b' },
  emptyBtn: { padding: '12px 24px', border: 'none', borderRadius: '10px', background: '#8b5cf6', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '12px' },
  dossierCard: { padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' },
  dossierCardHeader: { display: 'flex', alignItems: 'center' },
  dossierCardTitle: { fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '6px' },
  dossierCardMeta: { display: 'flex', gap: '8px', alignItems: 'center' },
  dossierCardBron: { fontSize: '11px', color: '#64748b' },
  smallBtn: { padding: '6px 8px', border: 'none', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
};
