import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getStaff, saveStaff } from '../lib/pos-data';

export default function Personeel() {
  const router = useRouter();
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', pin: '', role: 'kassier', active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStaff().then(setStaff);
  }, []);

  const openAdd = () => {
    setForm({ name: '', pin: '', role: 'kassier', active: true });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (member) => {
    setForm({ name: member.name, pin: member.pin, role: member.role, active: member.active });
    setEditing(member);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.pin.trim()) return;
    if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) {
      alert('PIN moet precies 4 cijfers zijn.');
      return;
    }
    // Check duplicate PIN
    const duplicate = staff.find(s => s.pin === form.pin && (!editing || s.id !== editing.id));
    if (duplicate) {
      alert('Deze PIN is al in gebruik door ' + duplicate.name);
      return;
    }
    setSaving(true);
    try {
      let updated;
      if (editing) {
        updated = staff.map(s => s.id === editing.id ? { ...s, name: form.name.trim(), pin: form.pin, role: form.role, active: form.active } : s);
      } else {
        updated = [...staff, { id: `staff_${Date.now()}`, name: form.name.trim(), pin: form.pin, role: form.role, active: form.active }];
      }
      await saveStaff(updated);
      setStaff(updated);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Medewerker verwijderen?')) return;
    const updated = staff.filter(s => s.id !== id);
    await saveStaff(updated);
    setStaff(updated);
  };

  const toggleActive = async (id) => {
    const updated = staff.map(s => s.id === id ? { ...s, active: !s.active } : s);
    await saveStaff(updated);
    setStaff(updated);
  };

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <button onClick={() => router.push('/pos')} style={s.backBtn}>← Terug</button>
        <h1 style={s.title}>Personeel Beheer</h1>
        <button onClick={openAdd} style={s.addBtn}>+ Medewerker</button>
      </div>

      <div style={s.content}>
        <div style={s.info}>
          <p>Medewerkers loggen in met een 4-cijferige PIN code. Rollen bepalen toegangsniveau.</p>
          <p><strong>Admin:</strong> Volledige toegang | <strong>Kassier:</strong> Alleen kassa & keuken</p>
        </div>

        <div style={s.list}>
          {staff.map(member => (
            <div key={member.id} style={{ ...s.row, opacity: member.active ? 1 : 0.5 }}>
              <div style={s.avatar}>{member.name.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={s.memberName}>{member.name}</div>
                <div style={s.memberInfo}>
                  PIN: {'●●●●'} · Rol: {member.role} · {member.active ? '✅ Actief' : '❌ Inactief'}
                </div>
              </div>
              <div style={s.actions}>
                <button onClick={() => toggleActive(member.id)} style={{ ...s.toggleBtn, background: member.active ? '#238636' : '#484f58' }}>
                  {member.active ? 'Actief' : 'Inactief'}
                </button>
                <button onClick={() => openEdit(member)} style={s.editBtn}>Bewerken</button>
                <button onClick={() => handleDelete(member.id)} style={s.delBtn}>×</button>
              </div>
            </div>
          ))}
          {staff.length === 0 && <div style={s.empty}>Geen medewerkers. Voeg een medewerker toe.</div>}
        </div>
      </div>

      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editing ? 'Medewerker Bewerken' : 'Nieuwe Medewerker'}</h2>
            <div style={s.formGroup}>
              <label style={s.label}>Naam</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={s.input} placeholder="bijv. Ahmed" autoFocus />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>PIN Code (4 cijfers)</label>
              <input type="text" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} style={{ ...s.input, fontSize: '24px', letterSpacing: '12px', textAlign: 'center', fontFamily: 'monospace' }} placeholder="0000" maxLength={4} />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Rol</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={s.input}>
                <option value="admin">Admin (volledige toegang)</option>
                <option value="kassier">Kassier (kassa & keuken)</option>
                <option value="keuken">Keuken (alleen keuken display)</option>
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.checkboxLabel}>
                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                Actief
              </label>
            </div>
            <div style={s.formActions}>
              <button onClick={() => setShowForm(false)} style={s.cancelBtn}>Annuleren</button>
              <button onClick={handleSave} style={s.saveBtn} disabled={saving}>{saving ? 'Opslaan...' : (editing ? 'Opslaan' : 'Toevoegen')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#0d1117', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#e6edf3' },
  topBar: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', background: '#161b22', borderBottom: '1px solid #30363d' },
  backBtn: { padding: '8px 16px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '14px' },
  title: { margin: 0, fontSize: '22px', fontWeight: 'bold', flex: 1 },
  addBtn: { padding: '8px 18px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  content: { maxWidth: '700px', margin: '0 auto', padding: '24px' },
  info: { background: 'rgba(88,166,255,0.08)', border: '1px solid rgba(88,166,255,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '20px', fontSize: '13px', color: '#8b949e', lineHeight: 1.5 },
  list: {},
  row: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#161b22', borderRadius: '10px', border: '1px solid #30363d', marginBottom: '8px' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#238636', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: '#fff', flexShrink: 0 },
  memberName: { fontSize: '15px', fontWeight: '600' },
  memberInfo: { fontSize: '12px', color: '#8b949e', marginTop: '2px' },
  actions: { display: 'flex', gap: '6px', flexShrink: 0 },
  toggleBtn: { padding: '5px 12px', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  editBtn: { padding: '5px 12px', border: '1px solid #30363d', borderRadius: '6px', background: 'transparent', fontSize: '11px', cursor: 'pointer', color: '#8b949e' },
  delBtn: { padding: '5px 10px', border: '1px solid rgba(248,81,73,0.3)', borderRadius: '6px', background: 'transparent', fontSize: '14px', cursor: 'pointer', color: '#f85149', fontWeight: 'bold' },
  empty: { textAlign: 'center', padding: '40px', color: '#8b949e' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#161b22', borderRadius: '16px', border: '1px solid #30363d', padding: '28px', width: '380px' },
  modalTitle: { margin: '0 0 20px', fontSize: '18px', fontWeight: 'bold' },
  formGroup: { marginBottom: '14px' },
  label: { display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#8b949e' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #30363d', borderRadius: '8px', background: '#0d1117', color: '#e6edf3', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' },
  formActions: { display: 'flex', gap: '10px', marginTop: '20px' },
  cancelBtn: { flex: 1, padding: '10px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#8b949e' },
  saveBtn: { flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
};
