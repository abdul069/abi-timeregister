import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getOrdersByDateRange, getExpenses, addExpense, deleteExpense, getExpensesByRange,
  getTimeEntriesByRange, getStaff, formatPrice, getWeekRange, getMonthRange, getPreviousPeriod,
  getBusinessSettings, getAuditLog, getAuditLogByDate,
} from '../lib/pos-data';

export default function Financieel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overzicht');
  const [period, setPeriod] = useState('week');
  const [orders, setOrders] = useState([]);
  const [prevOrders, setPrevOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [staff, setStaff] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [settings, setSettings] = useState({});
  const [expenseForm, setExpenseForm] = useState({ category: 'inkoop', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

  const today = new Date().toISOString().split('T')[0];
  const ranges = {
    dag: { start: today, end: today },
    week: getWeekRange(today),
    maand: getMonthRange(today),
  };

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    setLoading(true);
    const r = ranges[period];
    const prev = getPreviousPeriod(r.start, r.end);
    const [ord, prevOrd, exp, te, st, bs, al] = await Promise.all([
      getOrdersByDateRange(r.start, r.end),
      getOrdersByDateRange(prev.start, prev.end),
      getExpensesByRange(r.start, r.end),
      getTimeEntriesByRange(r.start, r.end),
      getStaff(),
      getBusinessSettings(),
      period === 'dag' ? getAuditLogByDate(today) : getAuditLog(200),
    ]);
    setOrders(ord); setPrevOrders(prevOrd); setExpenses(exp);
    setTimeEntries(te); setStaff(st); setSettings(bs);
    setAuditLog(period === 'dag' ? al : al.filter(a => a.date >= r.start && a.date <= r.end));
    setLoading(false);
  };

  const valid = orders.filter(o => o.status !== 'geannuleerd');
  const prevValid = prevOrders.filter(o => o.status !== 'geannuleerd');
  const totalRevenue = valid.reduce((s, o) => s + o.total, 0);
  const prevRevenue = prevValid.reduce((s, o) => s + o.total, 0);
  const totalBTW9 = valid.reduce((s, o) => s + (o.btw || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const completedEntries = timeEntries.filter(e => e.status === 'completed');
  const totalLaborHours = completedEntries.reduce((s, e) => s + (e.totalHours || 0), 0);
  const totalLaborCost = completedEntries.reduce((s, e) => {
    const member = staff.find(st => st.id === e.staffId);
    return s + ((e.totalHours || 0) * (member?.hourlyWage || 0));
  }, 0);
  const grossProfit = totalRevenue - totalExpenses - totalLaborCost;
  const cashTotal = valid.filter(o => o.paymentMethod === 'contant').reduce((s, o) => s + o.total, 0);
  const pinTotal = valid.filter(o => o.paymentMethod === 'pin').reduce((s, o) => s + o.total, 0);
  const onlineTotal = valid.filter(o => o.paymentMethod === 'online').reduce((s, o) => s + o.total, 0);

  const pctChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;

  // Daily breakdown for chart
  const dailyData = {};
  valid.forEach(o => {
    if (!dailyData[o.date]) dailyData[o.date] = { revenue: 0, orders: 0 };
    dailyData[o.date].revenue += o.total;
    dailyData[o.date].orders++;
  });
  const dailyEntries = Object.entries(dailyData).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDailyRevenue = Math.max(...dailyEntries.map(d => d[1].revenue), 1);

  // Expense categories
  const expenseByCategory = {};
  expenses.forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  const handleAddExpense = async () => {
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) return;
    await addExpense({ ...expenseForm, amount: parseFloat(expenseForm.amount) });
    setExpenseForm({ category: 'inkoop', amount: '', description: '', date: today });
    await loadData();
  };

  const handleDeleteExpense = async (docId) => {
    if (!confirm('Kosten verwijderen?')) return;
    await deleteExpense(docId);
    await loadData();
  };

  const r = ranges[period];

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#fff', background: '#0d1117', minHeight: '100vh' }}>Laden...</div>;

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <button onClick={() => router.push('/pos')} style={s.backBtn}>← Terug</button>
        <h1 style={s.title}>Financieel Overzicht</h1>
        <div style={s.periodBtns}>
          {['dag', 'week', 'maand'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ ...s.periodBtn, ...(period === p ? s.periodBtnActive : {}) }}>
              {p === 'dag' ? 'Vandaag' : p === 'week' ? 'Week' : 'Maand'}
            </button>
          ))}
        </div>
      </div>

      <div style={s.tabBar}>
        {[
          { id: 'overzicht', label: 'Overzicht', icon: '📊' },
          { id: 'kosten', label: 'Kosten', icon: '💸', count: expenses.length },
          { id: 'btw', label: 'BTW', icon: '🏛' },
          { id: 'audit', label: 'Audit Trail', icon: '📋', count: auditLog.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...s.tabBtn, ...(tab === t.id ? s.tabBtnActive : {}) }}>
            <span>{t.icon}</span> {t.label}
            {t.count !== undefined && <span style={s.tabCount}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div style={s.periodLabel}>{r.start} t/m {r.end}</div>

      <div style={s.content}>
        {tab === 'overzicht' && (
          <>
            {/* KPI Cards */}
            <div style={s.kpiGrid}>
              <div style={s.kpiCard}>
                <div style={{ ...s.kpiVal, color: '#3fb950' }}>{formatPrice(totalRevenue)}</div>
                <div style={s.kpiLabel}>Omzet</div>
                {pctChange !== 0 && (
                  <div style={{ fontSize: '11px', marginTop: '4px', color: pctChange > 0 ? '#3fb950' : '#f85149' }}>
                    {pctChange > 0 ? '↑' : '↓'} {Math.abs(pctChange).toFixed(1)}% vs vorige periode
                  </div>
                )}
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiVal}>{valid.length}</div>
                <div style={s.kpiLabel}>Bestellingen</div>
                <div style={{ fontSize: '11px', marginTop: '4px', color: '#8b949e' }}>Vorig: {prevValid.length}</div>
              </div>
              <div style={s.kpiCard}>
                <div style={{ ...s.kpiVal, color: '#f85149' }}>{formatPrice(totalExpenses)}</div>
                <div style={s.kpiLabel}>Kosten</div>
              </div>
              <div style={s.kpiCard}>
                <div style={{ ...s.kpiVal, color: '#f0883e' }}>{formatPrice(totalLaborCost)}</div>
                <div style={s.kpiLabel}>Loonkosten</div>
                <div style={{ fontSize: '11px', marginTop: '4px', color: '#8b949e' }}>{totalLaborHours.toFixed(1)}u</div>
              </div>
              <div style={s.kpiCard}>
                <div style={{ ...s.kpiVal, color: grossProfit >= 0 ? '#3fb950' : '#f85149' }}>{formatPrice(grossProfit)}</div>
                <div style={s.kpiLabel}>Bruto Winst</div>
                {totalRevenue > 0 && <div style={{ fontSize: '11px', marginTop: '4px', color: '#8b949e' }}>Marge: {(grossProfit / totalRevenue * 100).toFixed(1)}%</div>}
              </div>
              <div style={s.kpiCard}>
                <div style={{ ...s.kpiVal, fontSize: '16px', color: '#58a6ff' }}>{formatPrice(totalBTW9)}</div>
                <div style={s.kpiLabel}>BTW (9%)</div>
              </div>
            </div>

            <div style={s.twoCol}>
              {/* Revenue Chart */}
              <div style={s.card}>
                <h3 style={s.cardTitle}>Omzet per Dag</h3>
                {dailyEntries.length === 0 && <div style={s.noData}>Geen data</div>}
                <div style={s.chart}>
                  {dailyEntries.map(([date, data]) => (
                    <div key={date} style={s.chartBar}>
                      <div style={s.barWrapper}>
                        <div style={{ ...s.bar, height: `${Math.max((data.revenue / maxDailyRevenue) * 100, 4)}%`, background: '#238636' }} />
                      </div>
                      <div style={s.barLabel}>{date.slice(5)}</div>
                      <div style={s.barVal}>{formatPrice(data.revenue)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & Expenses breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={s.card}>
                  <h3 style={s.cardTitle}>Betaalmethoden</h3>
                  <div style={s.breakdownList}>
                    <div style={s.breakdownRow}><span>💵 Contant</span><span style={{ fontWeight: 'bold' }}>{formatPrice(cashTotal)}</span></div>
                    <div style={s.breakdownRow}><span>💳 PIN</span><span style={{ fontWeight: 'bold' }}>{formatPrice(pinTotal)}</span></div>
                    <div style={s.breakdownRow}><span>📱 Online</span><span style={{ fontWeight: 'bold' }}>{formatPrice(onlineTotal)}</span></div>
                  </div>
                </div>
                <div style={s.card}>
                  <h3 style={s.cardTitle}>Kosten Verdeling</h3>
                  <div style={s.breakdownList}>
                    {Object.entries(expenseByCategory).length === 0 && <div style={s.noData}>Geen kosten</div>}
                    {Object.entries(expenseByCategory).map(([cat, amount]) => (
                      <div key={cat} style={s.breakdownRow}>
                        <span style={{ textTransform: 'capitalize' }}>{cat}</span>
                        <span style={{ fontWeight: 'bold', color: '#f85149' }}>{formatPrice(amount)}</span>
                      </div>
                    ))}
                    {totalLaborCost > 0 && (
                      <div style={{ ...s.breakdownRow, borderTop: '1px solid #30363d', paddingTop: '6px', marginTop: '4px' }}>
                        <span>Loonkosten</span>
                        <span style={{ fontWeight: 'bold', color: '#f0883e' }}>{formatPrice(totalLaborCost)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'kosten' && (
          <div style={s.twoCol}>
            <div style={s.card}>
              <h3 style={s.cardTitle}>Alle Kosten</h3>
              {expenses.length === 0 && <div style={s.noData}>Geen kosten geregistreerd</div>}
              {expenses.map(exp => (
                <div key={exp._docId} style={s.expenseRow}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>{exp.description || exp.category}</div>
                    <div style={{ fontSize: '11px', color: '#8b949e' }}>{exp.date} · {exp.category}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#f85149' }}>{formatPrice(exp.amount)}</span>
                    <button onClick={() => handleDeleteExpense(exp._docId)} style={{ ...s.iconBtn, color: '#f85149' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <h3 style={s.cardTitle}>Kosten Toevoegen</h3>
              <div style={s.formGroup}>
                <label style={s.label}>Categorie</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} style={s.input}>
                  <option value="inkoop">Inkoop</option>
                  <option value="huur">Huur</option>
                  <option value="energie">Energie</option>
                  <option value="verzekering">Verzekering</option>
                  <option value="onderhoud">Onderhoud</option>
                  <option value="marketing">Marketing</option>
                  <option value="overig">Overig</option>
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Bedrag</label>
                <input type="number" step="0.01" min="0" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} style={s.input} placeholder="0.00" />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Omschrijving</label>
                <input type="text" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} style={s.input} placeholder="Bijv. groente leverancier" />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Datum</label>
                <input type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} style={s.input} />
              </div>
              <button onClick={handleAddExpense} style={s.actionBtn}>Toevoegen</button>
            </div>
          </div>
        )}

        {tab === 'btw' && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>BTW Overzicht</h3>
            <p style={s.hint}>Periode: {r.start} t/m {r.end}</p>
            <div style={s.btwGrid}>
              <div style={s.btwCard}>
                <div style={s.btwLabel}>Omzet excl. BTW</div>
                <div style={s.btwVal}>{formatPrice(totalRevenue - totalBTW9)}</div>
              </div>
              <div style={s.btwCard}>
                <div style={s.btwLabel}>BTW 9% (laag tarief)</div>
                <div style={{ ...s.btwVal, color: '#58a6ff' }}>{formatPrice(totalBTW9)}</div>
              </div>
              <div style={s.btwCard}>
                <div style={s.btwLabel}>Omzet incl. BTW</div>
                <div style={{ ...s.btwVal, color: '#3fb950' }}>{formatPrice(totalRevenue)}</div>
              </div>
              <div style={s.btwCard}>
                <div style={s.btwLabel}>Bestellingen</div>
                <div style={s.btwVal}>{valid.length}</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(88,166,255,0.06)', borderRadius: '8px', border: '1px solid rgba(88,166,255,0.15)', fontSize: '12px', color: '#58a6ff' }}>
              Dit overzicht is bedoeld als hulpmiddel. Raadpleeg altijd uw boekhouder voor de officiele BTW-aangifte.
            </div>
          </div>
        )}

        {tab === 'audit' && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Audit Trail</h3>
            <p style={s.hint}>Alle acties worden automatisch gelogd en zijn niet te verwijderen</p>
            {auditLog.length === 0 && <div style={s.noData}>Geen audit logs</div>}
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {auditLog.map((entry, i) => {
                const actionColors = {
                  order_void: '#f85149', clock_in: '#3fb950', clock_out: '#f0883e',
                  work_period_start: '#58a6ff', work_period_end: '#58a6ff', kasboek: '#9b59b6',
                };
                return (
                  <div key={i} style={s.auditRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <div style={{ ...s.auditDot, background: actionColors[entry.action] || '#8b949e' }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500' }}>{entry.description}</div>
                        <div style={{ fontSize: '11px', color: '#8b949e' }}>{entry.date} {entry.time} · {entry.staffId}</div>
                      </div>
                    </div>
                    <span style={{ ...s.auditAction, background: (actionColors[entry.action] || '#8b949e') + '15', color: actionColors[entry.action] || '#8b949e' }}>
                      {entry.action}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#0d1117', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#e6edf3' },
  topBar: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', background: '#161b22', borderBottom: '1px solid #30363d', flexWrap: 'wrap' },
  backBtn: { padding: '8px 16px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '14px' },
  title: { margin: 0, fontSize: '22px', fontWeight: 'bold' },
  periodBtns: { display: 'flex', gap: '4px', marginLeft: 'auto' },
  periodBtn: { padding: '7px 16px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  periodBtnActive: { background: '#238636', borderColor: '#238636', color: '#fff' },

  tabBar: { display: 'flex', gap: '4px', padding: '10px 24px', background: '#161b22', borderBottom: '1px solid #30363d', flexWrap: 'wrap' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1px solid transparent', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  tabBtnActive: { background: 'rgba(35,134,54,0.15)', borderColor: '#238636', color: '#3fb950' },
  tabCount: { background: 'rgba(255,255,255,0.1)', padding: '1px 7px', borderRadius: '8px', fontSize: '11px' },

  periodLabel: { padding: '8px 24px', fontSize: '12px', color: '#8b949e', background: '#0d1117' },
  content: { padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' },
  kpiCard: { background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', padding: '18px', textAlign: 'center' },
  kpiVal: { fontSize: '24px', fontWeight: 'bold' },
  kpiLabel: { fontSize: '10px', color: '#8b949e', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' },

  card: { background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', padding: '18px' },
  cardTitle: { margin: '0 0 14px', fontSize: '15px', fontWeight: '700' },
  hint: { margin: '0 0 12px', fontSize: '12px', color: '#8b949e' },

  chart: { display: 'flex', alignItems: 'flex-end', gap: '4px', height: '160px', marginTop: '8px' },
  chartBar: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' },
  barWrapper: { flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
  bar: { borderRadius: '3px 3px 0 0', minWidth: '100%', transition: 'height 0.4s ease' },
  barLabel: { fontSize: '9px', color: '#8b949e', marginTop: '4px' },
  barVal: { fontSize: '8px', color: '#3fb950', fontWeight: 'bold' },

  breakdownList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  breakdownRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: '13px' },

  expenseRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(48,54,61,0.5)' },
  iconBtn: { padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px' },

  formGroup: { marginBottom: '12px' },
  label: { display: 'block', fontSize: '11px', fontWeight: '600', color: '#8b949e', marginBottom: '4px' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #30363d', borderRadius: '6px', background: '#0d1117', color: '#e6edf3', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  actionBtn: { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },

  btwGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' },
  btwCard: { background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '20px', textAlign: 'center' },
  btwLabel: { fontSize: '12px', color: '#8b949e', marginBottom: '6px' },
  btwVal: { fontSize: '24px', fontWeight: 'bold' },

  auditRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(48,54,61,0.4)', gap: '10px' },
  auditDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  auditAction: { padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' },

  noData: { textAlign: 'center', padding: '30px', color: '#8b949e', fontSize: '13px' },
};
