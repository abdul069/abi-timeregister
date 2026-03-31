import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getBedrijfsprofiel, saveBedrijfsprofiel } from '../../lib/bi-data';

export default function Kennisbank() {
  const router = useRouter();
  const [profiel, setProfiel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('basis');
  const [nieuwActiviteit, setNieuwActiviteit] = useState('');
  const [nieuwCertificaat, setNieuwCertificaat] = useState('');

  useEffect(() => {
    getBedrijfsprofiel().then(setProfiel);
  }, []);

  const updateField = (field, value) => {
    setProfiel(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveBedrijfsprofiel(profiel);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addActiviteit = () => {
    if (!nieuwActiviteit.trim()) return;
    updateField('kernactiviteiten', [...(profiel.kernactiviteiten || []), nieuwActiviteit.trim()]);
    setNieuwActiviteit('');
  };

  const removeActiviteit = (idx) => {
    updateField('kernactiviteiten', profiel.kernactiviteiten.filter((_, i) => i !== idx));
  };

  const addCertificaat = () => {
    if (!nieuwCertificaat.trim()) return;
    updateField('certificaten', [...(profiel.certificaten || []), nieuwCertificaat.trim()]);
    setNieuwCertificaat('');
  };

  const removeCertificaat = (idx) => {
    updateField('certificaten', profiel.certificaten.filter((_, i) => i !== idx));
  };

  if (!profiel) return <div style={s.loading}>Laden...</div>;

  const sections = [
    { key: 'basis', label: 'Basis', icon: '\ud83c\udfe2' },
    { key: 'contact', label: 'Contact', icon: '\ud83d\udcde' },
    { key: 'activiteiten', label: 'Activiteiten', icon: '\u2699\ufe0f' },
    { key: 'extra', label: 'Extra', icon: '\ud83c\udfc5' },
  ];

  const completeness = () => {
    const fields = ['bedrijfsnaam', 'ondernemingsnummer', 'adres', 'stad', 'sector', 'contactPersoon', 'email'];
    const filled = fields.filter(f => profiel[f]?.trim()).length;
    return Math.round((filled / fields.length) * 100);
  };

  const comp = completeness();

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button onClick={() => router.push('/bi')} style={s.backBtn}>{'\u2190'} BI Hub</button>
        <div style={{ flex: 1 }}>
          <h1 style={s.title}>{'\ud83c\udfdb\ufe0f'} Kennisbank</h1>
          <p style={s.subtitle}>Bedrijfsprofiel</p>
        </div>
        <button onClick={handleSave} style={{ ...s.saveBtn, ...(saved ? s.savedBtn : {}) }} disabled={saving}>
          {saving ? 'Opslaan...' : saved ? '\u2713 Opgeslagen' : 'Opslaan'}
        </button>
      </div>

      {/* Completeness */}
      <div style={s.compCard}>
        <div style={s.compHeader}>
          <span style={s.compLabel}>Profiel volledigheid</span>
          <span style={{ ...s.compValue, color: comp >= 80 ? '#10b981' : comp >= 50 ? '#f59e0b' : '#ef4444' }}>{comp}%</span>
        </div>
        <div style={s.compBarBg}>
          <div style={{ ...s.compBarFill, width: `${comp}%`, background: comp >= 80 ? '#10b981' : comp >= 50 ? '#f59e0b' : '#ef4444' }} />
        </div>
        <p style={s.compTip}>
          {comp < 50 ? 'Vul meer gegevens in voor betere resultaten in alle modules.' :
           comp < 80 ? 'Goed bezig! Vul de resterende velden in voor optimale resultaten.' :
           'Uitstekend! Uw profiel is compleet.'}
        </p>
      </div>

      {/* Section Tabs */}
      <div style={s.sectionTabs}>
        {sections.map(sec => (
          <button
            key={sec.key}
            onClick={() => setActiveSection(sec.key)}
            style={{ ...s.sectionTab, ...(activeSection === sec.key ? s.sectionTabActive : {}) }}
          >
            <span>{sec.icon}</span>
            <span style={s.sectionTabLabel}>{sec.label}</span>
          </button>
        ))}
      </div>

      <div style={s.content}>
        {activeSection === 'basis' && (
          <>
            <Field label="Bedrijfsnaam" value={profiel.bedrijfsnaam} onChange={v => updateField('bedrijfsnaam', v)} placeholder="bv. TechCo BV" />
            <Field label="Ondernemingsnummer" value={profiel.ondernemingsnummer} onChange={v => updateField('ondernemingsnummer', v)} placeholder="bv. 0123.456.789" />
            <Field label="BTW-nummer" value={profiel.btwNummer} onChange={v => updateField('btwNummer', v)} placeholder="bv. BE0123456789" />
            <Field label="Adres" value={profiel.adres} onChange={v => updateField('adres', v)} placeholder="Straat en nummer" />
            <div style={s.row}>
              <Field label="Postcode" value={profiel.postcode} onChange={v => updateField('postcode', v)} placeholder="bv. 9000" half />
              <Field label="Stad" value={profiel.stad} onChange={v => updateField('stad', v)} placeholder="bv. Gent" half />
            </div>
            <Field label="Land" value={profiel.land} onChange={v => updateField('land', v)} placeholder="bv. Belgie" />
            <Field label="Sector" value={profiel.sector} onChange={v => updateField('sector', v)} placeholder="bv. IT & Software" />
            <Field label="NACE-code" value={profiel.naceCode} onChange={v => updateField('naceCode', v)} placeholder="bv. 62.010" />
            <div style={s.row}>
              <Field label="Aantal werknemers" value={profiel.aantalWerknemers} onChange={v => updateField('aantalWerknemers', v)} placeholder="bv. 25" half />
              <Field label="Jaaromzet" value={profiel.omzet} onChange={v => updateField('omzet', v)} placeholder="bv. 2.5M EUR" half />
            </div>
          </>
        )}

        {activeSection === 'contact' && (
          <>
            <Field label="Contactpersoon" value={profiel.contactPersoon} onChange={v => updateField('contactPersoon', v)} placeholder="Naam contactpersoon" />
            <Field label="E-mail" value={profiel.email} onChange={v => updateField('email', v)} placeholder="email@bedrijf.be" type="email" />
            <Field label="Telefoon" value={profiel.telefoon} onChange={v => updateField('telefoon', v)} placeholder="+32 9 123 45 67" type="tel" />
            <Field label="Website" value={profiel.website} onChange={v => updateField('website', v)} placeholder="https://www.bedrijf.be" />
          </>
        )}

        {activeSection === 'activiteiten' && (
          <>
            <div style={s.fieldGroup}>
              <label style={s.label}>Beschrijving</label>
              <textarea
                style={s.textarea}
                value={profiel.beschrijving || ''}
                onChange={e => updateField('beschrijving', e.target.value)}
                placeholder="Korte beschrijving van uw bedrijf en activiteiten..."
                rows={4}
              />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Kernactiviteiten</label>
              <div style={s.tagList}>
                {(profiel.kernactiviteiten || []).map((act, i) => (
                  <span key={i} style={s.tag}>
                    {act}
                    <button onClick={() => removeActiviteit(i)} style={s.tagRemove}>{'\u2715'}</button>
                  </span>
                ))}
              </div>
              <div style={s.addRow}>
                <input
                  style={s.addInput}
                  value={nieuwActiviteit}
                  onChange={e => setNieuwActiviteit(e.target.value)}
                  placeholder="Nieuwe activiteit toevoegen..."
                  onKeyDown={e => e.key === 'Enter' && addActiviteit()}
                />
                <button onClick={addActiviteit} style={s.addBtn}>+</button>
              </div>
            </div>
          </>
        )}

        {activeSection === 'extra' && (
          <>
            <div style={s.fieldGroup}>
              <label style={s.label}>Certificaten & Kwaliteitslabels</label>
              <div style={s.tagList}>
                {(profiel.certificaten || []).map((cert, i) => (
                  <span key={i} style={{ ...s.tag, background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }}>
                    {'\ud83c\udfc5'} {cert}
                    <button onClick={() => removeCertificaat(i)} style={s.tagRemove}>{'\u2715'}</button>
                  </span>
                ))}
              </div>
              <div style={s.addRow}>
                <input
                  style={s.addInput}
                  value={nieuwCertificaat}
                  onChange={e => setNieuwCertificaat(e.target.value)}
                  placeholder="bv. ISO 9001, ISO 27001..."
                  onKeyDown={e => e.key === 'Enter' && addCertificaat()}
                />
                <button onClick={addCertificaat} style={s.addBtn}>+</button>
              </div>
            </div>

            <div style={s.infoBox}>
              <h4 style={s.infoTitle}>{'\ud83d\udca1'} Hoe wordt uw profiel gebruikt?</h4>
              <ul style={s.infoList}>
                <li><strong>OpportunityRadar</strong> — matcht subsidies op basis van uw sector en activiteiten</li>
                <li><strong>CompanyCheck</strong> — vult uw eigen bedrijfsgegevens automatisch in</li>
                <li><strong>DossierForge</strong> — genereert dossiers met uw bedrijfsinformatie</li>
                <li><strong>RiskShield</strong> — controleert contracten tegen uw bedrijfsprofiel</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', half }) {
  return (
    <div style={{ ...fieldStyles.group, ...(half ? { flex: 1, minWidth: 0 } : {}) }}>
      <label style={fieldStyles.label}>{label}</label>
      <input
        style={fieldStyles.input}
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

const fieldStyles = {
  group: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { width: '100%', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
};

const s = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#f1f5f9' },
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', background: '#0f172a' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px' },
  backBtn: { padding: '8px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', flexShrink: 0 },
  title: { margin: 0, fontSize: '22px', fontWeight: '800' },
  subtitle: { margin: '2px 0 0', fontSize: '12px', color: '#64748b' },
  saveBtn: { padding: '10px 18px', border: 'none', borderRadius: '10px', background: '#ec4899', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 },
  savedBtn: { background: '#10b981' },

  // Completeness
  compCard: { margin: '0 20px 16px', padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' },
  compHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  compLabel: { fontSize: '13px', fontWeight: '600', color: '#94a3b8' },
  compValue: { fontSize: '16px', fontWeight: '800' },
  compBarBg: { height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' },
  compBarFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s' },
  compTip: { margin: 0, fontSize: '12px', color: '#64748b' },

  // Sections
  sectionTabs: { display: 'flex', gap: '6px', padding: '0 20px 16px', overflowX: 'auto' },
  sectionTab: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', background: 'transparent', color: '#64748b', cursor: 'pointer', flexShrink: 0 },
  sectionTabActive: { background: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.3)', color: '#ec4899' },
  sectionTabLabel: { fontSize: '11px', fontWeight: '600' },
  content: { padding: '0 20px 24px' },
  row: { display: 'flex', gap: '10px' },

  // Tags
  fieldGroup: { marginBottom: '18px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  textarea: { width: '100%', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5', boxSizing: 'border-box' },
  tagList: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' },
  tag: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: '13px', fontWeight: '500' },
  tagRemove: { border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: '0 2px', fontSize: '11px', opacity: 0.7 },
  addRow: { display: 'flex', gap: '8px' },
  addInput: { flex: 1, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', fontSize: '14px', outline: 'none' },
  addBtn: { padding: '10px 16px', border: 'none', borderRadius: '10px', background: '#3b82f6', color: '#fff', fontSize: '18px', fontWeight: '700', cursor: 'pointer' },

  // Info box
  infoBox: { padding: '16px', background: 'rgba(236,72,153,0.08)', borderRadius: '12px', border: '1px solid rgba(236,72,153,0.2)', marginTop: '8px' },
  infoTitle: { margin: '0 0 10px', fontSize: '14px', fontWeight: '700', color: '#ec4899' },
  infoList: { margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.8' },
};
