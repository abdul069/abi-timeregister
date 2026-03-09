import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getActiveWorkPeriod,
  startWorkPeriod,
  endWorkPeriod,
  getTodayOrders,
  formatPrice,
} from '../lib/pos-data';

export default function Dagafsluiting() {
  const router = useRouter();
  const [workPeriod, setWorkPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cashInput, setCashInput] = useState('');
  const [todayStats, setTodayStats] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [endReport, setEndReport] = useState(null);
  const [currentStaff, setCurrentStaff] = useState(null);

  useEffect(() => {
    loadData();
    const staff = sessionStorage.getItem('posStaff');
    if (staff) setCurrentStaff(JSON.parse(staff));
  }, []);

  const loadData = async () => {
    const [period, orders] = await Promise.all([
      getActiveWorkPeriod(),
      getTodayOrders(),
    ]);
    setWorkPeriod(period && period.active ? period : null);

    const validOrders = orders.filter(o => o.status !== 'geannuleerd');
    const paymentBreakdown = {};
    const categoryBreakdown = {};
    const hourlyBreakdown = {};

    validOrders.forEach(o => {
      paymentBreakdown[o.paymentMethod] = (paymentBreakdown[o.paymentMethod] || 0) + o.total;
      const hour = o.time ? o.time.split(':')[0] : '??';
      hourlyBreakdown[hour] = (hourlyBreakdown[hour] || 0) + o.total;
      (o.items || []).forEach(item => {
        const cat = item.category || 'overig';
        if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { count: 0, revenue: 0 };
        categoryBreakdown[cat].count += item.quantity;
        categoryBreakdown[cat].revenue += (item.price + (item.extraPrice || 0)) * item.quantity;
      });
    });

    const cashTotal = validOrders.filter(o => o.paymentMethod === 'contant').reduce((s, o) => s + o.total, 0);
    const discountTotal = validOrders.reduce((s, o) => {
      if (o.ticketDiscount) {
        return s + (o.ticketDiscount.type === 'percent' ? o.subtotal * (o.ticketDiscount.value / 100) : o.ticketDiscount.value);
      }
      return s;
    }, 0);

    setTodayStats({
      totalOrders: validOrders.length,
      cancelledOrders: orders.filter(o => o.status === 'geannuleerd').length,
      totalRevenue: validOrders.reduce((s, o) => s + o.total, 0),
      totalBTW: validOrders.reduce((s, o) => s + (o.btw || 0), 0),
      cashTotal,
      pinTotal: paymentBreakdown['pin'] || 0,
      onlineTotal: paymentBreakdown['online'] || 0,
      discountTotal,
      avgOrder: validOrders.length > 0 ? validOrders.reduce((s, o) => s + o.total, 0) / validOrders.length : 0,
      paymentBreakdown,
      categoryBreakdown,
      hourlyBreakdown,
      takeawayOrders: validOrders.filter(o => o.orderType === 'afhalen').length,
      dineinOrders: validOrders.filter(o => o.orderType === 'ter plaatse').length,
      deliveryOrders: validOrders.filter(o => o.orderType === 'bezorgen').length,
    });
    setLoading(false);
  };

  const handleStartPeriod = async () => {
    const cash = parseFloat(cashInput) || 0;
    const period = await startWorkPeriod(cash, currentStaff?.id || 'unknown');
    setWorkPeriod(period);
    setCashInput('');
  };

  const handleEndPeriod = async () => {
    if (!confirm('Werkperiode afsluiten? Dit reset de dagteller.')) return;
    const cash = parseFloat(cashInput) || 0;
    const result = await endWorkPeriod(cash, currentStaff?.id || 'unknown');
    if (result) {
      setEndReport({
        ...result,
        stats: todayStats,
        expectedCash: (result.startCash || 0) + (todayStats?.cashTotal || 0),
        actualCash: cash,
        difference: cash - ((result.startCash || 0) + (todayStats?.cashTotal || 0)),
      });
      setShowReport(true);
      setWorkPeriod(null);
      setCashInput('');
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#fff', background: '#0d1117', minHeight: '100vh' }}>Laden...</div>;

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <button onClick={() => router.push('/pos')} style={s.backBtn}>← Terug</button>
        <h1 style={s.title}>Dagafsluiting</h1>
        <div style={{ ...s.statusBadge, background: workPeriod ? '#238636' : '#484f58' }}>
          {workPeriod ? '● WERKPERIODE ACTIEF' : '○ GEEN ACTIEVE WERKPERIODE'}
        </div>
      </div>

      <div style={s.content}>
        {/* Work Period Control */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>{workPeriod ? 'Werkperiode Sluiten' : 'Werkperiode Openen'}</h2>
          {workPeriod && (
            <div style={s.periodInfo}>
              <div style={s.infoRow}><span>Geopend:</span><span>{new Date(workPeriod.startTime).toLocaleString('nl-NL')}</span></div>
              <div style={s.infoRow}><span>Startkassa:</span><span>{formatPrice(workPeriod.startCash || 0)}</span></div>
              <div style={s.infoRow}><span>Duur:</span><span>{Math.round((Date.now() - workPeriod.startTime) / 60000)} min</span></div>
            </div>
          )}
          <div style={s.cashInputGroup}>
            <label style={s.label}>{workPeriod ? 'Kassa telling (eindstand)' : 'Startkassa bedrag'}</label>
            <div style={s.cashInputRow}>
              <span style={s.euro}>€</span>
              <input type="number" step="0.01" min="0" value={cashInput} onChange={e => setCashInput(e.target.value)} style={s.cashInput} placeholder="0.00" />
            </div>
          </div>
          <button onClick={workPeriod ? handleEndPeriod : handleStartPeriod} style={{ ...s.actionBtn, background: workPeriod ? '#da3633' : '#238636' }}>
            {workPeriod ? 'Werkperiode Sluiten & Afsluiten' : 'Werkperiode Openen'}
          </button>
        </div>

        {/* Today's stats */}
        {todayStats && (
          <div style={s.card}>
            <h2 style={s.cardTitle}>Dagstatistieken</h2>
            <div style={s.statsGrid}>
              <div style={s.statBox}><div style={s.statVal}>{todayStats.totalOrders}</div><div style={s.statLabel}>Bestellingen</div></div>
              <div style={s.statBox}><div style={{ ...s.statVal, color: '#3fb950' }}>{formatPrice(todayStats.totalRevenue)}</div><div style={s.statLabel}>Omzet</div></div>
              <div style={s.statBox}><div style={{ ...s.statVal, color: '#f0883e' }}>{formatPrice(todayStats.avgOrder)}</div><div style={s.statLabel}>Gem. bestelling</div></div>
              <div style={s.statBox}><div style={{ ...s.statVal, color: '#f85149' }}>{todayStats.cancelledOrders}</div><div style={s.statLabel}>Geannuleerd</div></div>
            </div>

            <h3 style={s.subTitle}>Betaalmethoden</h3>
            <div style={s.breakdownList}>
              {Object.entries(todayStats.paymentBreakdown).map(([method, amount]) => (
                <div key={method} style={s.breakdownRow}>
                  <span style={{ textTransform: 'capitalize' }}>{method === 'contant' ? '💵 Contant' : method === 'pin' ? '💳 PIN' : '📱 Online'}</span>
                  <span style={{ fontWeight: 'bold' }}>{formatPrice(amount)}</span>
                </div>
              ))}
            </div>

            <h3 style={s.subTitle}>Besteltype</h3>
            <div style={s.breakdownList}>
              <div style={s.breakdownRow}><span>📦 Afhalen</span><span>{todayStats.takeawayOrders}</span></div>
              <div style={s.breakdownRow}><span>🍽 Ter Plaatse</span><span>{todayStats.dineinOrders}</span></div>
              <div style={s.breakdownRow}><span>🚗 Bezorgen</span><span>{todayStats.deliveryOrders}</span></div>
            </div>

            <h3 style={s.subTitle}>BTW & Kortingen</h3>
            <div style={s.breakdownList}>
              <div style={s.breakdownRow}><span>BTW (9%)</span><span>{formatPrice(todayStats.totalBTW)}</span></div>
              <div style={s.breakdownRow}><span>Totaal korting</span><span style={{ color: '#f85149' }}>-{formatPrice(todayStats.discountTotal)}</span></div>
            </div>

            {workPeriod && (
              <>
                <h3 style={s.subTitle}>Kassastand</h3>
                <div style={s.breakdownList}>
                  <div style={s.breakdownRow}><span>Startkassa</span><span>{formatPrice(workPeriod.startCash || 0)}</span></div>
                  <div style={s.breakdownRow}><span>+ Cash ontvangen</span><span>{formatPrice(todayStats.cashTotal)}</span></div>
                  <div style={{ ...s.breakdownRow, fontWeight: 'bold', borderTop: '1px solid #30363d', paddingTop: '8px' }}>
                    <span>Verwacht in kassa</span><span style={{ color: '#3fb950' }}>{formatPrice((workPeriod.startCash || 0) + todayStats.cashTotal)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* End Report Modal */}
      {showReport && endReport && (
        <div style={s.overlay} onClick={() => setShowReport(false)}>
          <div style={s.reportModal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 'bold', color: '#e6edf3', textAlign: 'center' }}>Dagafsluiting Rapport</h2>
            <div style={{ ...s.breakdownList, marginBottom: '16px' }}>
              <div style={s.breakdownRow}><span>Periode</span><span>{new Date(endReport.startTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - {new Date(endReport.endTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</span></div>
              <div style={s.breakdownRow}><span>Totaal omzet</span><span style={{ fontWeight: 'bold', color: '#3fb950' }}>{formatPrice(endReport.stats?.totalRevenue || 0)}</span></div>
              <div style={s.breakdownRow}><span>Bestellingen</span><span>{endReport.stats?.totalOrders || 0}</span></div>
              <div style={s.breakdownRow}><span>Startkassa</span><span>{formatPrice(endReport.startCash || 0)}</span></div>
              <div style={s.breakdownRow}><span>Verwacht in kassa</span><span>{formatPrice(endReport.expectedCash)}</span></div>
              <div style={s.breakdownRow}><span>Geteld in kassa</span><span>{formatPrice(endReport.actualCash)}</span></div>
              <div style={{ ...s.breakdownRow, fontWeight: 'bold', fontSize: '16px', borderTop: '1px solid #30363d', paddingTop: '8px' }}>
                <span>Verschil</span>
                <span style={{ color: endReport.difference >= 0 ? '#3fb950' : '#f85149' }}>
                  {endReport.difference >= 0 ? '+' : ''}{formatPrice(endReport.difference)}
                </span>
              </div>
            </div>
            <button onClick={() => setShowReport(false)} style={s.actionBtn}>Sluiten</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#0d1117', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#e6edf3' },
  topBar: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', background: '#161b22', borderBottom: '1px solid #30363d', flexWrap: 'wrap' },
  backBtn: { padding: '8px 16px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '14px' },
  title: { margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#e6edf3' },
  statusBadge: { marginLeft: 'auto', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: '#fff' },
  content: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', padding: '20px 24px' },
  card: { background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', padding: '24px' },
  cardTitle: { margin: '0 0 16px', fontSize: '18px', fontWeight: 'bold', color: '#e6edf3' },
  periodInfo: { background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', marginBottom: '16px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#8b949e' },
  cashInputGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#8b949e', marginBottom: '6px' },
  cashInputRow: { display: 'flex', alignItems: 'center', border: '2px solid #30363d', borderRadius: '8px', background: '#0d1117', overflow: 'hidden' },
  euro: { padding: '10px 12px', fontSize: '16px', color: '#8b949e', background: 'rgba(255,255,255,0.03)' },
  cashInput: { flex: 1, padding: '10px 12px', border: 'none', background: 'transparent', color: '#e6edf3', fontSize: '18px', fontWeight: 'bold', outline: 'none' },
  actionBtn: { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' },
  statBox: { background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px', textAlign: 'center' },
  statVal: { fontSize: '22px', fontWeight: 'bold', color: '#e6edf3' },
  statLabel: { fontSize: '11px', color: '#8b949e', marginTop: '4px' },
  subTitle: { margin: '16px 0 8px', fontSize: '13px', fontWeight: '700', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px' },
  breakdownList: { background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '8px 12px' },
  breakdownRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#e6edf3' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  reportModal: { background: '#161b22', borderRadius: '16px', border: '1px solid #30363d', padding: '28px', width: '440px' },
};
