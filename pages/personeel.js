import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getStaff, saveStaff, getTimeEntries, clockIn, clockOut, startBreak, endBreak,
  getActiveTimeEntry, getTimeEntriesByRange, formatPrice, ROLES, getWeekRange, getMonthRange,
  getSchedule, saveScheduleShift, deleteScheduleShift, copyWeekSchedule,
} from '../lib/pos-data';

export default function Personeel() {
  const router = useRouter();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('medewerkers');
  const [editingStaff, setEditingStaff] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeEntries, setActiveEntries] = useState({});
  const [currentStaff, setCurrentStaff] = useState(null);
  const [urenPeriod, setUrenPeriod] = useState('week');
  const [clockPin, setClockPin] = useState('');
  const [clockError, setClockError] = useState('');
  const [clockSuccess, setClockSuccess] = useState('');

  // Weekrooster state
  const [roosterWeek, setRoosterWeek] = useState(() => getWeekRange(new Date().toISOString().split('T')[0]).start);
  const [shifts, setShifts] = useState([]);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({ staffId: '', date: '', startTime: '09:00', endTime: '17:00', role: '', note: '' });
  const [roosterLoading, setRoosterLoading] = useState(false);

  useEffect(() => {
    loadData();
    const s = sessionStorage.getItem('posStaff');
    if (s) setCurrentStaff(JSON.parse(s));
  }, []);

  const loadData = async () => {
    const [staffList, entries] = await Promise.all([getStaff(), getTimeEntries()]);
    setStaff(staffList);
    const activeMap = {};
    for (const s of staffList) {
      const active = entries.find(e => e.staffId === s.id && e.status !== 'completed');
      if (active) activeMap[s.id] = active;
    }
    setActiveEntries(activeMap);
    setTimeEntries(entries);
    setLoading(false);
  };

  // Load schedule when week changes
  useEffect(() => {
    if (tab === 'rooster') loadSchedule();
  }, [roosterWeek, tab]);

  const loadSchedule = async () => {
    setRoosterLoading(true);
    const data = await getSchedule(roosterWeek);
    setShifts(data);
    setRoosterLoading(false);
  };

  const getRoosterDays = () => {
    const days = [];
    const start = new Date(roosterWeek);
    const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
    const dayNamesFull = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ date: d.toISOString().split('T')[0], short: dayNames[i], full: dayNamesFull[i], day: d.getDate(), month: d.getMonth() + 1 });
    }
    return days;
  };

  const navigateRoosterWeek = (offset) => {
    const d = new Date(roosterWeek);
    d.setDate(d.getDate() + (offset * 7));
    setRoosterWeek(d.toISOString().split('T')[0]);
  };

  const handleSaveShift = async () => {
    if (!shiftForm.staffId || !shiftForm.date || !shiftForm.startTime || !shiftForm.endTime) return;
    const member = staff.find(s => s.id === shiftForm.staffId);
    const shift = {
      ...shiftForm,
      staffName: member?.name || '',
      weekStart: roosterWeek,
      ...(editingShift ? { _docId: editingShift._docId, id: editingShift.id } : {}),
    };
    await saveScheduleShift(shift);
    await loadSchedule();
    setShowShiftForm(false);
    setEditingShift(null);
  };

  const handleDeleteShift = async (shift) => {
    if (!confirm('Shift verwijderen?')) return;
    await deleteScheduleShift(shift._docId);
    await loadSchedule();
  };

  const handleCopyWeek = async () => {
    const prevWeek = new Date(roosterWeek);
    prevWeek.setDate(prevWeek.getDate() - 7);
    const prevStart = prevWeek.toISOString().split('T')[0];
    if (!confirm(`Rooster kopieren van week ${prevStart}?`)) return;
    setRoosterLoading(true);
    await copyWeekSchedule(prevStart, roosterWeek);
    await loadSchedule();
  };

  const openShiftForm = (date, staffId, existing) => {
    if (existing) {
      setEditingShift(existing);
      setShiftForm({ staffId: existing.staffId, date: existing.date, startTime: existing.startTime, endTime: existing.endTime, role: existing.role || '', note: existing.note || '' });
    } else {
      setEditingShift(null);
      setShiftForm({ staffId: staffId || '', date: date || '', startTime: '09:00', endTime: '17:00', role: '', note: '' });
    }
    setShowShiftForm(true);
  };

  const getShiftHours = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  };

  const getStaffWeekHours = (staffId) => {
    return shifts.filter(s => s.staffId === staffId).reduce((sum, s) => sum + getShiftHours(s.startTime, s.endTime), 0);
  };

  const newStaffTemplate = { name: '', pin: '', role: 'kassier', active: true, email: '', phone: '', hourlyWage: '', contractHours: '', contractType: 'flex', startDate: '', notes: '' };

  const handleSave = async () => {
    if (!formData.name || !formData.pin || formData.pin.length !== 4) return;
    const existing = staff.filter(s => s.id !== editingStaff?.id);
    if (existing.some(s => s.pin === formData.pin)) { alert('PIN is al in gebruik'); return; }
    let updated;
    if (editingStaff) {
      updated = staff.map(s => s.id === editingStaff.id ? { ...s, ...formData, hourlyWage: parseFloat(formData.hourlyWage) || 0, contractHours: parseFloat(formData.contractHours) || 0 } : s);
    } else {
      updated = [...staff, { ...formData, id: `staff_${Date.now()}`, hourlyWage: parseFloat(formData.hourlyWage) || 0, contractHours: parseFloat(formData.contractHours) || 0 }];
    }
    await saveStaff(updated);
    setStaff(updated);
    setShowForm(false);
    setEditingStaff(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Weet je zeker dat je deze medewerker wilt verwijderen?')) return;
    const updated = staff.filter(s => s.id !== id);
    await saveStaff(updated);
    setStaff(updated);
  };

  const toggleActive = async (id) => {
    const updated = staff.map(s => s.id === id ? { ...s, active: !s.active } : s);
    await saveStaff(updated);
    setStaff(updated);
  };

  const handleBreak = async (staffId) => {
    const active = activeEntries[staffId];
    if (!active) return;
    if (active.status === 'break') await endBreak(active._docId);
    else await startBreak(active._docId);
    await loadData();
  };

  const handleForceClockOut = async (staffId) => {
    const active = activeEntries[staffId];
    if (!active) return;
    if (active.status === 'break') await endBreak(active._docId);
    await clockOut(active._docId);
    await loadData();
  };

  const now = new Date();
  const range = urenPeriod === 'week' ? getWeekRange(now.toISOString().split('T')[0]) : getMonthRange(now.toISOString().split('T')[0]);
  const periodEntries = timeEntries.filter(e => e.date >= range.start && e.date <= range.end && e.status === 'completed');

  const staffUren = staff.map(s => {
    const entries = periodEntries.filter(e => e.staffId === s.id);
    const totalHours = entries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
    const totalBreakHours = entries.reduce((sum, e) => sum + ((e.totalBreakMs || 0) / 3600000), 0);
    const shifts = entries.length;
    const loonkosten = totalHours * (s.hourlyWage || 0);
    return { ...s, totalHours, totalBreakHours, shifts, loonkosten, entries };
  }).filter(s => s.shifts > 0 || s.active);

  const totalLoonkosten = staffUren.reduce((s, su) => s + su.loonkosten, 0);
  const totalUren = staffUren.reduce((s, su) => s + su.totalHours, 0);

  const handlePinKey = (key) => {
    if (key === 'C') { setClockPin(''); setClockError(''); return; }
    if (key === '⌫') { setClockPin(p => p.slice(0, -1)); setClockError(''); return; }
    if (clockPin.length < 4) {
      const newPin = clockPin + key;
      setClockPin(newPin);
      setClockError('');
      if (newPin.length === 4) {
        setTimeout(async () => {
          const member = staff.find(s => s.pin === newPin && s.active);
          if (!member) { setClockError('Ongeldige PIN'); setClockPin(''); return; }
          const active = activeEntries[member.id];
          if (active) {
            if (active.status === 'break') {
              await endBreak(active._docId);
              setClockSuccess(`${member.name}: Pauze beeindigd`);
            } else {
              await clockOut(active._docId);
              setClockSuccess(`${member.name}: Uitgeklokt!`);
            }
          } else {
            await clockIn(member.id, member.name);
            setClockSuccess(`${member.name}: Ingeklokt!`);
          }
          setClockPin('');
          setTimeout(() => setClockSuccess(''), 3000);
          await loadData();
        }, 200);
      }
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '0u 0m';
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}u ${mins}m`;
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#fff', background: '#0d1117', minHeight: '100vh' }}>Laden...</div>;

  return (
    <div style={st.container}>
      <div style={st.topBar}>
        <button onClick={() => router.push('/pos')} style={st.backBtn}>← Terug</button>
        <h1 style={st.title}>Personeel & Inkloksysteem</h1>
      </div>

      <div style={st.tabBar}>
        {[
          { id: 'medewerkers', label: 'Medewerkers', icon: '👥', count: staff.length },
          { id: 'inklokken', label: 'Inklokken', icon: '⏰', count: Object.keys(activeEntries).length },
          { id: 'rooster', label: 'Weekrooster', icon: '📅' },
          { id: 'uren', label: 'Uren & Loon', icon: '📊' },
          { id: 'rechten', label: 'Rollen & Rechten', icon: '🔐' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...st.tabBtn, ...(tab === t.id ? st.tabBtnActive : {}) }}>
            <span>{t.icon}</span> {t.label}
            {t.count !== undefined && <span style={st.tabCount}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div style={st.content}>
        {tab === 'medewerkers' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Alle Medewerkers ({staff.length})</h2>
              <button onClick={() => { setFormData(newStaffTemplate); setEditingStaff(null); setShowForm(true); }} style={st.addBtn}>+ Nieuw</button>
            </div>
            <div style={st.staffGrid}>
              {staff.map(member => {
                const isActive = activeEntries[member.id];
                return (
                  <div key={member.id} style={{ ...st.staffCard, opacity: member.active ? 1 : 0.5 }}>
                    <div style={st.staffCardHeader}>
                      <div style={{ ...st.avatar, background: member.active ? member.role === 'admin' ? '#da3633' : '#238636' : '#484f58' }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{member.name}</div>
                        <div style={{ fontSize: '11px', color: '#8b949e' }}>
                          <span style={{ ...st.roleBadge, background: member.role === 'admin' ? 'rgba(218,54,51,0.15)' : member.role === 'manager' ? 'rgba(88,166,255,0.15)' : 'rgba(63,185,80,0.15)', color: member.role === 'admin' ? '#f85149' : member.role === 'manager' ? '#58a6ff' : '#3fb950' }}>
                            {ROLES[member.role]?.label || member.role}
                          </span>
                          {isActive && <span style={st.clockedInBadge}>Ingeklokt</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => toggleActive(member.id)} style={{ ...st.iconBtn, color: member.active ? '#3fb950' : '#f85149' }}>{member.active ? '●' : '○'}</button>
                        <button onClick={() => { setFormData(member); setEditingStaff(member); setShowForm(true); }} style={st.iconBtn}>✏️</button>
                        <button onClick={() => handleDelete(member.id)} style={{ ...st.iconBtn, color: '#f85149' }}>✕</button>
                      </div>
                    </div>
                    <div style={st.staffDetails}>
                      <div style={st.detailRow}><span>PIN:</span><span>{'••••'}</span></div>
                      {member.email && <div style={st.detailRow}><span>Email:</span><span>{member.email}</span></div>}
                      {member.phone && <div style={st.detailRow}><span>Tel:</span><span>{member.phone}</span></div>}
                      {(member.hourlyWage || 0) > 0 && <div style={st.detailRow}><span>Uurloon:</span><span>{formatPrice(member.hourlyWage)}</span></div>}
                      {(member.contractHours || 0) > 0 && <div style={st.detailRow}><span>Contract:</span><span>{member.contractHours}u/{member.contractType || 'flex'}</span></div>}
                      {member.startDate && <div style={st.detailRow}><span>In dienst:</span><span>{member.startDate}</span></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'inklokken' && (
          <div style={st.twoCol}>
            <div style={st.card}>
              <h2 style={st.cardTitle}>PIN Klok</h2>
              <p style={st.hint}>Voer je PIN in om in/uit te klokken</p>
              <div style={st.pinDots}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ ...st.pinDot, background: i < clockPin.length ? '#3fb950' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              {clockError && <div style={st.errorMsg}>{clockError}</div>}
              {clockSuccess && <div style={st.successMsg}>{clockSuccess}</div>}
              <div style={st.numpad}>
                {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(key => (
                  <button key={key} onClick={() => handlePinKey(key)} style={{ ...st.numKey, ...(key === 'C' ? { color: '#f85149' } : {}) }}>{key}</button>
                ))}
              </div>
              <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '11px', color: '#8b949e', textAlign: 'center' }}>
                Ingeklokt? PIN opnieuw = Uitklokken
              </div>
            </div>
            <div style={st.card}>
              <h2 style={st.cardTitle}>Huidige Status</h2>
              {Object.keys(activeEntries).length === 0 && <div style={st.noData}>Niemand ingeklokt</div>}
              {staff.filter(s => activeEntries[s.id]).map(member => {
                const entry = activeEntries[member.id];
                const elapsed = Date.now() - entry.clockIn;
                const isBreak = entry.status === 'break';
                return (
                  <div key={member.id} style={st.activeRow}>
                    <div style={{ ...st.avatar, width: '36px', height: '36px', fontSize: '14px', background: isBreak ? '#f0883e' : '#238636' }}>{member.name.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{member.name}</div>
                      <div style={{ fontSize: '11px', color: '#8b949e' }}>
                        In: {new Date(entry.clockIn).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} · {formatDuration(elapsed)}
                        {isBreak && <span style={{ color: '#f0883e', fontWeight: '600' }}> · PAUZE</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleBreak(member.id)} style={{ ...st.smallBtn, background: isBreak ? 'rgba(63,185,80,0.15)' : 'rgba(240,136,62,0.15)', color: isBreak ? '#3fb950' : '#f0883e' }}>{isBreak ? 'Hervat' : 'Pauze'}</button>
                      <button onClick={() => handleForceClockOut(member.id)} style={{ ...st.smallBtn, background: 'rgba(248,81,73,0.15)', color: '#f85149' }}>Uit</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'uren' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Uren & Loonkosten</h2>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['week', 'maand'].map(p => (
                  <button key={p} onClick={() => setUrenPeriod(p)} style={{ ...st.filterBtn, ...(urenPeriod === p ? st.filterBtnActive : {}) }}>
                    {p === 'week' ? 'Deze Week' : 'Deze Maand'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '12px' }}>Periode: {range.start} t/m {range.end}</div>
            <div style={st.kpiGrid}>
              <div style={st.kpiCard}><div style={st.kpiVal}>{totalUren.toFixed(1)}u</div><div style={st.kpiLabel}>Totaal Uren</div></div>
              <div style={st.kpiCard}><div style={{ ...st.kpiVal, color: '#f0883e' }}>{formatPrice(totalLoonkosten)}</div><div style={st.kpiLabel}>Loonkosten</div></div>
              <div style={st.kpiCard}><div style={st.kpiVal}>{staffUren.filter(s => s.shifts > 0).length}</div><div style={st.kpiLabel}>Medewerkers</div></div>
              <div style={st.kpiCard}><div style={st.kpiVal}>{staffUren.reduce((s, su) => s + su.shifts, 0)}</div><div style={st.kpiLabel}>Shifts</div></div>
            </div>
            <div style={st.card}>
              <h3 style={st.cardTitle}>Per Medewerker</h3>
              {staffUren.filter(su => su.shifts > 0).map(su => (
                <div key={su.id} style={st.urenRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={{ ...st.avatar, width: '32px', height: '32px', fontSize: '13px' }}>{su.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{su.name}</div>
                      <div style={{ fontSize: '11px', color: '#8b949e' }}>{su.shifts} shifts · {su.totalBreakHours.toFixed(1)}u pauze</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{su.totalHours.toFixed(1)}u</div>
                    {su.hourlyWage > 0 && <div style={{ fontSize: '11px', color: '#f0883e' }}>{formatPrice(su.loonkosten)}</div>}
                  </div>
                </div>
              ))}
              {staffUren.filter(su => su.shifts > 0).length === 0 && <div style={st.noData}>Geen uren deze periode</div>}
            </div>
          </>
        )}

        {tab === 'rooster' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => navigateRoosterWeek(-1)} style={st.dateArrow}>‹</button>
                <h2 style={{ margin: 0, fontSize: '18px' }}>
                  Week {(() => { const d = new Date(roosterWeek); const onejan = new Date(d.getFullYear(), 0, 1); return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7); })()}
                  <span style={{ fontSize: '13px', color: '#8b949e', fontWeight: '400', marginLeft: '8px' }}>
                    {getRoosterDays()[0].day}/{getRoosterDays()[0].month} - {getRoosterDays()[6].day}/{getRoosterDays()[6].month}
                  </span>
                </h2>
                <button onClick={() => navigateRoosterWeek(1)} style={st.dateArrow}>›</button>
                {roosterWeek !== getWeekRange(new Date().toISOString().split('T')[0]).start && (
                  <button onClick={() => setRoosterWeek(getWeekRange(new Date().toISOString().split('T')[0]).start)} style={{ ...st.filterBtn, borderColor: '#238636', color: '#3fb950', background: 'rgba(35,134,54,0.1)' }}>Deze Week</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleCopyWeek} style={{ ...st.filterBtn, borderColor: '#58a6ff', color: '#58a6ff', background: 'rgba(88,166,255,0.08)' }}>
                  Vorige Week Kopieren
                </button>
                <button onClick={() => openShiftForm(getRoosterDays()[0].date, '')} style={st.addBtn}>+ Shift Toevoegen</button>
              </div>
            </div>

            {roosterLoading ? (
              <div style={st.noData}>Laden...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: '900px' }}>
                  {/* Day header row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
                    <div style={st.roosterCorner}>Medewerker</div>
                    {getRoosterDays().map(day => {
                      const isToday = day.date === new Date().toISOString().split('T')[0];
                      const dayShiftCount = shifts.filter(s => s.date === day.date).length;
                      return (
                        <div key={day.date} style={{ ...st.roosterDayHeader, ...(isToday ? { background: 'rgba(35,134,54,0.15)', borderBottom: '2px solid #3fb950' } : {}), ...(day.short === 'Za' || day.short === 'Zo' ? { background: 'rgba(240,136,62,0.06)' } : {}) }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: isToday ? '#3fb950' : '#e6edf3' }}>{day.short}</div>
                          <div style={{ fontSize: '11px', color: '#8b949e' }}>{day.day}/{day.month}</div>
                          {dayShiftCount > 0 && <div style={{ fontSize: '10px', color: '#58a6ff', fontWeight: '600' }}>{dayShiftCount} shifts</div>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Staff rows */}
                  {staff.filter(s => s.active).map(member => {
                    const weekHours = getStaffWeekHours(member.id);
                    const contractHours = member.contractHours || 0;
                    const isOver = contractHours > 0 && weekHours > contractHours;
                    return (
                      <div key={member.id} style={{ display: 'grid', gridTemplateColumns: '160px repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
                        <div style={st.roosterStaffCell}>
                          <div style={{ ...st.avatar, width: '28px', height: '28px', fontSize: '11px', background: member.role === 'admin' ? '#da3633' : '#238636' }}>{member.name.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '13px' }}>{member.name}</div>
                            <div style={{ fontSize: '10px', color: isOver ? '#f85149' : '#8b949e' }}>
                              {weekHours.toFixed(1)}u{contractHours > 0 ? ` / ${contractHours}u` : ''}
                            </div>
                          </div>
                        </div>
                        {getRoosterDays().map(day => {
                          const dayShifts = shifts.filter(s => s.staffId === member.id && s.date === day.date);
                          const isToday = day.date === new Date().toISOString().split('T')[0];
                          const isWeekend = day.short === 'Za' || day.short === 'Zo';
                          return (
                            <div
                              key={day.date}
                              style={{ ...st.roosterCell, ...(isToday ? { borderLeft: '2px solid #3fb950' } : {}), ...(isWeekend ? { background: 'rgba(240,136,62,0.03)' } : {}), cursor: 'pointer' }}
                              onClick={() => { if (dayShifts.length === 0) openShiftForm(day.date, member.id); }}
                            >
                              {dayShifts.length === 0 && (
                                <div style={{ color: '#30363d', fontSize: '18px', textAlign: 'center' }}>+</div>
                              )}
                              {dayShifts.map(shift => (
                                <div
                                  key={shift.id}
                                  style={st.roosterShift}
                                  onClick={(e) => { e.stopPropagation(); openShiftForm(null, null, shift); }}
                                >
                                  <div style={{ fontWeight: '700', fontSize: '11px', color: '#e6edf3' }}>{shift.startTime} - {shift.endTime}</div>
                                  <div style={{ fontSize: '10px', color: '#8b949e' }}>{getShiftHours(shift.startTime, shift.endTime).toFixed(1)}u</div>
                                  {shift.note && <div style={{ fontSize: '9px', color: '#f0883e', marginTop: '1px' }}>{shift.note}</div>}
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteShift(shift); }} style={st.roosterDeleteBtn}>✕</button>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Totals row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(7, 1fr)', gap: '2px', marginTop: '4px' }}>
                    <div style={{ ...st.roosterCorner, fontWeight: '700', color: '#58a6ff' }}>Totaal</div>
                    {getRoosterDays().map(day => {
                      const dayShifts = shifts.filter(s => s.date === day.date);
                      const dayHours = dayShifts.reduce((sum, s) => sum + getShiftHours(s.startTime, s.endTime), 0);
                      return (
                        <div key={day.date} style={{ ...st.roosterDayHeader, background: 'rgba(88,166,255,0.05)' }}>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: '#58a6ff' }}>{dayHours.toFixed(1)}u</div>
                          <div style={{ fontSize: '10px', color: '#8b949e' }}>{dayShifts.length} shifts</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div style={{ ...st.kpiGrid, marginTop: '16px' }}>
              <div style={st.kpiCard}>
                <div style={st.kpiVal}>{shifts.length}</div>
                <div style={st.kpiLabel}>Shifts</div>
              </div>
              <div style={st.kpiCard}>
                <div style={st.kpiVal}>{shifts.reduce((sum, s) => sum + getShiftHours(s.startTime, s.endTime), 0).toFixed(1)}u</div>
                <div style={st.kpiLabel}>Totaal Uren</div>
              </div>
              <div style={st.kpiCard}>
                <div style={{ ...st.kpiVal, color: '#f0883e' }}>{formatPrice(shifts.reduce((sum, s) => { const m = staff.find(st2 => st2.id === s.staffId); return sum + getShiftHours(s.startTime, s.endTime) * (m?.hourlyWage || 0); }, 0))}</div>
                <div style={st.kpiLabel}>Geschatte Loonkosten</div>
              </div>
              <div style={st.kpiCard}>
                <div style={st.kpiVal}>{[...new Set(shifts.map(s => s.staffId))].length}</div>
                <div style={st.kpiLabel}>Medewerkers Ingepland</div>
              </div>
            </div>
          </>
        )}

        {tab === 'rechten' && (
          <div style={st.card}>
            <h2 style={st.cardTitle}>Rollen & Rechten Matrix</h2>
            <p style={st.hint}>Overzicht van wat elke rol mag doen</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={st.table}>
                <thead>
                  <tr>
                    <th style={st.th}>Recht</th>
                    {Object.entries(ROLES).map(([key, role]) => (<th key={key} style={{ ...st.th, textAlign: 'center' }}>{role.label}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {['kassa', 'keuken', 'bestellingen', 'menubeheer', 'dagafsluiting', 'personeel', 'financieel', 'audit', 'void', 'discount_high', 'kasboek', 'settings'].map(perm => (
                    <tr key={perm}>
                      <td style={st.td}>{{ kassa: 'Kassa', keuken: 'Keuken', bestellingen: 'Bestellingen', menubeheer: 'Menu Beheer', dagafsluiting: 'Dagafsluiting', personeel: 'Personeel', financieel: 'Financieel', audit: 'Audit Trail', void: 'Annuleren', discount_high: 'Hoge Korting', kasboek: 'Kasboek', settings: 'Instellingen' }[perm]}</td>
                      {Object.entries(ROLES).map(([key, role]) => (
                        <td key={key} style={{ ...st.td, textAlign: 'center' }}>
                          <span style={{ color: role.permissions.includes(perm) ? '#3fb950' : '#484f58', fontSize: '16px' }}>{role.permissions.includes(perm) ? '✓' : '✕'}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showShiftForm && (
        <div style={st.overlay} onClick={() => setShowShiftForm(false)}>
          <div style={{ ...st.modal, width: '440px' }} onClick={e => e.stopPropagation()}>
            <h2 style={st.modalTitle}>{editingShift ? 'Shift Bewerken' : 'Nieuwe Shift'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={st.formGroup}>
                <label style={st.label}>Medewerker *</label>
                <select value={shiftForm.staffId} onChange={e => setShiftForm({ ...shiftForm, staffId: e.target.value })} style={st.input}>
                  <option value="">-- Selecteer --</option>
                  {staff.filter(s => s.active).map(s => (<option key={s.id} value={s.id}>{s.name} ({ROLES[s.role]?.label})</option>))}
                </select>
              </div>
              <div style={st.formGroup}>
                <label style={st.label}>Datum *</label>
                <input type="date" value={shiftForm.date} onChange={e => setShiftForm({ ...shiftForm, date: e.target.value })} style={st.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={st.formGroup}>
                  <label style={st.label}>Start *</label>
                  <input type="time" value={shiftForm.startTime} onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })} style={st.input} />
                </div>
                <div style={st.formGroup}>
                  <label style={st.label}>Eind *</label>
                  <input type="time" value={shiftForm.endTime} onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })} style={st.input} />
                </div>
              </div>
              {shiftForm.startTime && shiftForm.endTime && (
                <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(63,185,80,0.08)', borderRadius: '6px', fontSize: '13px', color: '#3fb950', fontWeight: '600' }}>
                  {getShiftHours(shiftForm.startTime, shiftForm.endTime).toFixed(1)} uur
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[['09:00-17:00', 'Dag'], ['11:00-15:00', 'Lunch'], ['16:00-22:00', 'Avond'], ['17:00-23:00', 'Sluit']].map(([time, label]) => (
                  <button key={time} onClick={() => { const [s, e] = time.split('-'); setShiftForm({ ...shiftForm, startTime: s, endTime: e }); }}
                    style={{ padding: '6px 10px', border: '1px solid #30363d', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', color: '#8b949e', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                    {label} ({time})
                  </button>
                ))}
              </div>
              <div style={st.formGroup}>
                <label style={st.label}>Notitie</label>
                <input type="text" value={shiftForm.note} onChange={e => setShiftForm({ ...shiftForm, note: e.target.value })} style={st.input} placeholder="Bijv. opening, training..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setShowShiftForm(false)} style={{ ...st.actionBtn, background: '#484f58', flex: 1 }}>Annuleren</button>
              <button onClick={handleSaveShift} style={{ ...st.actionBtn, background: '#238636', flex: 2 }}>Opslaan</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={st.overlay} onClick={() => setShowForm(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <h2 style={st.modalTitle}>{editingStaff ? 'Medewerker Bewerken' : 'Nieuwe Medewerker'}</h2>
            <div style={st.formGrid}>
              <div style={st.formGroup}><label style={st.label}>Naam *</label><input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} style={st.input} /></div>
              <div style={st.formGroup}><label style={st.label}>PIN (4 cijfers) *</label><input type="text" maxLength={4} value={formData.pin || ''} onChange={e => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })} style={st.input} /></div>
              <div style={st.formGroup}><label style={st.label}>Rol *</label><select value={formData.role || 'kassier'} onChange={e => setFormData({ ...formData, role: e.target.value })} style={st.input}>{Object.entries(ROLES).map(([k, r]) => (<option key={k} value={k}>{r.label}</option>))}</select></div>
              <div style={st.formGroup}><label style={st.label}>Email</label><input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} style={st.input} /></div>
              <div style={st.formGroup}><label style={st.label}>Telefoon</label><input type="text" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={st.input} /></div>
              <div style={st.formGroup}><label style={st.label}>Uurloon</label><input type="number" step="0.01" value={formData.hourlyWage || ''} onChange={e => setFormData({ ...formData, hourlyWage: e.target.value })} style={st.input} placeholder="0.00" /></div>
              <div style={st.formGroup}><label style={st.label}>Contracturen/week</label><input type="number" value={formData.contractHours || ''} onChange={e => setFormData({ ...formData, contractHours: e.target.value })} style={st.input} /></div>
              <div style={st.formGroup}><label style={st.label}>Contracttype</label><select value={formData.contractType || 'flex'} onChange={e => setFormData({ ...formData, contractType: e.target.value })} style={st.input}><option value="vast">Vast</option><option value="flex">Flex</option><option value="oproep">Oproepkracht</option></select></div>
              <div style={st.formGroup}><label style={st.label}>In dienst sinds</label><input type="date" value={formData.startDate || ''} onChange={e => setFormData({ ...formData, startDate: e.target.value })} style={st.input} /></div>
              <div style={{ ...st.formGroup, gridColumn: '1 / -1' }}><label style={st.label}>Notities</label><textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ ...st.input, minHeight: '60px', resize: 'vertical' }} /></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setShowForm(false)} style={{ ...st.actionBtn, background: '#484f58', flex: 1 }}>Annuleren</button>
              <button onClick={handleSave} style={{ ...st.actionBtn, background: '#238636', flex: 2 }}>Opslaan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  container: { minHeight: '100vh', background: '#0d1117', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#e6edf3' },
  topBar: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', background: '#161b22', borderBottom: '1px solid #30363d' },
  backBtn: { padding: '8px 16px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '14px' },
  title: { margin: 0, fontSize: '22px', fontWeight: 'bold' },
  tabBar: { display: 'flex', gap: '4px', padding: '10px 24px', background: '#161b22', borderBottom: '1px solid #30363d', flexWrap: 'wrap' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1px solid transparent', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  tabBtnActive: { background: 'rgba(35,134,54,0.15)', borderColor: '#238636', color: '#3fb950' },
  tabCount: { background: 'rgba(255,255,255,0.1)', padding: '1px 7px', borderRadius: '8px', fontSize: '11px' },
  content: { padding: '16px 24px' },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px' },
  card: { background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', padding: '20px', marginBottom: '16px' },
  cardTitle: { margin: '0 0 14px', fontSize: '16px', fontWeight: 'bold' },
  hint: { margin: '0 0 16px', fontSize: '13px', color: '#8b949e' },
  addBtn: { padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  staffGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' },
  staffCard: { background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', padding: '16px' },
  staffCardHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' },
  avatar: { width: '42px', height: '42px', borderRadius: '50%', background: '#238636', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 'bold', color: '#fff', flexShrink: 0 },
  roleBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' },
  clockedInBadge: { display: 'inline-block', marginLeft: '6px', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', background: 'rgba(63,185,80,0.15)', color: '#3fb950' },
  staffDetails: { paddingTop: '8px', borderTop: '1px solid #30363d' },
  detailRow: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px', color: '#8b949e' },
  iconBtn: { padding: '4px 8px', border: 'none', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '14px' },
  pinDots: { display: 'flex', justifyContent: 'center', gap: '12px', margin: '20px 0' },
  pinDot: { width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #30363d', transition: 'background 0.15s' },
  numpad: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: '240px', margin: '0 auto' },
  numKey: { padding: '16px', border: '1px solid #30363d', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', color: '#e6edf3', cursor: 'pointer', fontSize: '22px', fontWeight: 'bold' },
  errorMsg: { textAlign: 'center', color: '#f85149', fontSize: '13px', marginBottom: '8px', fontWeight: '500' },
  successMsg: { textAlign: 'center', color: '#3fb950', fontSize: '14px', fontWeight: '600', marginBottom: '8px', padding: '8px', background: 'rgba(63,185,80,0.1)', borderRadius: '8px' },
  activeRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderBottom: '1px solid rgba(48,54,61,0.5)' },
  smallBtn: { padding: '5px 10px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' },
  kpiCard: { background: '#161b22', borderRadius: '10px', border: '1px solid #30363d', padding: '16px', textAlign: 'center' },
  kpiVal: { fontSize: '22px', fontWeight: 'bold' },
  kpiLabel: { fontSize: '10px', color: '#8b949e', marginTop: '4px', textTransform: 'uppercase' },
  urenRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(48,54,61,0.4)' },
  filterBtn: { padding: '6px 14px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  filterBtnActive: { background: '#238636', borderColor: '#238636', color: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '10px 12px', borderBottom: '2px solid #30363d', textAlign: 'left', color: '#8b949e', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase' },
  td: { padding: '8px 12px', borderBottom: '1px solid rgba(48,54,61,0.5)' },
  noData: { textAlign: 'center', padding: '30px', color: '#8b949e', fontSize: '13px' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#161b22', borderRadius: '16px', border: '1px solid #30363d', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { margin: '0 0 16px', fontSize: '20px', fontWeight: 'bold' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  formGroup: { marginBottom: '4px' },
  label: { display: 'block', fontSize: '11px', fontWeight: '600', color: '#8b949e', marginBottom: '4px' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #30363d', borderRadius: '6px', background: '#0d1117', color: '#e6edf3', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  actionBtn: { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
  dateArrow: { padding: '6px 12px', border: '1px solid #30363d', borderRadius: '6px', background: 'transparent', color: '#e6edf3', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  roosterCorner: { padding: '10px 12px', background: '#161b22', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#8b949e', display: 'flex', alignItems: 'center' },
  roosterDayHeader: { padding: '8px', textAlign: 'center', background: '#161b22', borderRadius: '6px' },
  roosterStaffCell: { padding: '8px 10px', background: '#161b22', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' },
  roosterCell: { padding: '4px', background: '#161b22', borderRadius: '6px', minHeight: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' },
  roosterShift: { position: 'relative', padding: '5px 8px', background: 'rgba(35,134,54,0.12)', borderRadius: '6px', borderLeft: '3px solid #3fb950', cursor: 'pointer', transition: 'background 0.15s' },
  roosterDeleteBtn: { position: 'absolute', top: '2px', right: '4px', background: 'none', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: '10px', opacity: 0.5, padding: '2px' },
};
