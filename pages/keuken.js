import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { getOrders, updateOrder, formatPrice } from '../lib/pos-data';

export default function Keuken() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('actief');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [clock, setClock] = useState('');
  const prevOrderCountRef = useRef(0);
  const audioRef = useRef(null);

  const loadOrders = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const allOrders = await getOrders();
    const todayOrders = allOrders.filter(o => o.date === today && o.status !== 'geannuleerd');

    // Check for new orders - play sound
    const activeCount = todayOrders.filter(o => o.status === 'nieuw').length;
    if (activeCount > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
      playAlert();
    }
    prevOrderCountRef.current = activeCount;

    setOrders(todayOrders);
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now());
      setClock(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => { clearInterval(interval); clearInterval(timeInterval); };
  }, [loadOrders]);

  const playAlert = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 350);
    } catch (e) {}
  };

  const updateStatus = async (orderId, status) => {
    await updateOrder(orderId, { status });
    await loadOrders();
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'actief') return o.status === 'nieuw' || o.status === 'bezig';
    if (filter === 'klaar') return o.status === 'klaar';
    return true;
  });

  const getWaitTime = (timestamp) => {
    const mins = Math.floor((currentTime - timestamp) / 60000);
    return mins;
  };

  const getTimeColor = (timestamp) => {
    const mins = getWaitTime(timestamp);
    if (mins < 5) return '#3fb950';  // green
    if (mins < 10) return '#f0883e'; // orange
    if (mins < 15) return '#f85149'; // red
    return '#da3633';                // dark red - urgent!
  };

  const getTimeBg = (timestamp) => {
    const mins = getWaitTime(timestamp);
    if (mins < 5) return 'rgba(63,185,80,0.1)';
    if (mins < 10) return 'rgba(240,136,62,0.1)';
    if (mins < 15) return 'rgba(248,81,73,0.15)';
    return 'rgba(218,54,51,0.2)';
  };

  const statusColors = { nieuw: '#f85149', bezig: '#f0883e', klaar: '#3fb950', afgehaald: '#8b949e' };
  const statusLabels = { nieuw: 'NIEUW', bezig: 'BEREIDING', klaar: 'KLAAR', afgehaald: 'AFGEHAALD' };

  const activeCount = orders.filter(o => o.status === 'nieuw' || o.status === 'bezig').length;
  const newCount = orders.filter(o => o.status === 'nieuw').length;

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <button onClick={() => router.push('/pos')} style={s.backBtn}>← Terug</button>
        <h1 style={s.title}>Keuken Display</h1>

        {newCount > 0 && (
          <div style={s.alertBadge}>
            {newCount} NIEUW
          </div>
        )}

        <div style={s.filterGroup}>
          {[
            { id: 'actief', label: 'Actief', count: activeCount },
            { id: 'klaar', label: 'Klaar', count: orders.filter(o => o.status === 'klaar').length },
            { id: 'alles', label: 'Alles', count: orders.length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{ ...s.filterBtn, ...(filter === f.id ? s.filterBtnActive : {}) }}
            >
              {f.label} <span style={s.filterCount}>{f.count}</span>
            </button>
          ))}
        </div>
        <div style={s.clock}>{clock}</div>
      </div>

      <div style={s.ordersGrid}>
        {filteredOrders.length === 0 && (
          <div style={s.emptyState}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>
              {filter === 'actief' ? '✅' : '📋'}
            </div>
            <div style={{ fontSize: '18px', color: '#8b949e' }}>
              {filter === 'actief' ? 'Geen actieve bestellingen' : 'Geen bestellingen'}
            </div>
          </div>
        )}

        {filteredOrders.map(order => {
          const waitMins = getWaitTime(order.timestamp);
          const timeColor = getTimeColor(order.timestamp);
          const timeBg = getTimeBg(order.timestamp);
          const isUrgent = waitMins >= 10 && (order.status === 'nieuw' || order.status === 'bezig');

          return (
            <div
              key={order.id}
              style={{
                ...s.orderCard,
                borderTop: `4px solid ${statusColors[order.status]}`,
                ...(isUrgent ? { animation: 'none', boxShadow: `0 0 20px ${timeColor}40` } : {}),
              }}
            >
              <div style={{ ...s.orderHeader, background: timeBg }}>
                <div style={s.headerTop}>
                  <div>
                    <span style={s.orderNumber}>#{order.number}</span>
                    <span style={{ ...s.statusBadge, background: statusColors[order.status] + '25', color: statusColors[order.status] }}>
                      {statusLabels[order.status]}
                    </span>
                  </div>
                  <div style={{ ...s.timer, color: timeColor, background: timeColor + '15' }}>
                    {waitMins < 1 ? '<1 min' : `${waitMins} min`}
                  </div>
                </div>
                <div style={s.orderMeta}>
                  <span>{order.time}</span>
                  <span style={s.orderType}>
                    {order.orderType === 'afhalen' ? '📦 Afhalen' : order.orderType === 'bezorgen' ? '🚗 Bezorgen' : '🍽 Ter Plaatse'}
                  </span>
                  {order.staffName && <span>👤 {order.staffName}</span>}
                </div>
              </div>

              <div style={s.orderItems}>
                {order.items.map((item, i) => {
                  const customParts = [];
                  if (item.customizations) {
                    Object.entries(item.customizations).forEach(([key, val]) => {
                      if (Array.isArray(val) && val.length > 0) {
                        customParts.push(`${key}: ${val.join(', ')}`);
                      } else if (typeof val === 'string' && val !== 'Geen saus') {
                        customParts.push(`${key}: ${val}`);
                      }
                    });
                  }
                  return (
                    <div key={i}>
                      <div style={s.orderItem}>
                        <span style={s.itemQty}>{item.quantity}x</span>
                        <span style={s.itemName}>
                          {item.name}
                          {item.variation && <span style={{ color: '#f0883e', fontWeight: '500' }}> ({item.variation})</span>}
                        </span>
                      </div>
                      {customParts.length > 0 && <div style={s.itemCustom}>{customParts.join(' · ')}</div>}
                      {item.note && <div style={{ ...s.itemCustom, color: '#f0883e', fontStyle: 'normal' }}>📝 {item.note}</div>}
                    </div>
                  );
                })}
              </div>

              {order.orderNote && (
                <div style={s.orderNote}>📝 {order.orderNote}</div>
              )}

              <div style={s.orderActions}>
                {order.status === 'nieuw' && (
                  <button onClick={() => updateStatus(order.id, 'bezig')} style={{ ...s.actionBtn, background: '#f0883e' }}>
                    Start Bereiding
                  </button>
                )}
                {order.status === 'bezig' && (
                  <button onClick={() => updateStatus(order.id, 'klaar')} style={{ ...s.actionBtn, background: '#3fb950' }}>
                    KLAAR!
                  </button>
                )}
                {order.status === 'klaar' && (
                  <button onClick={() => updateStatus(order.id, 'afgehaald')} style={{ ...s.actionBtn, background: '#8b949e' }}>
                    Afgehaald
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#0d1117', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  topBar: { display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px', background: '#161b22', borderBottom: '1px solid #30363d', flexWrap: 'wrap' },
  backBtn: { padding: '8px 14px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '13px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#e6edf3' },
  alertBadge: { padding: '6px 14px', borderRadius: '20px', background: '#f85149', color: '#fff', fontSize: '13px', fontWeight: 'bold', animation: 'pulse 1.5s ease-in-out infinite' },
  filterGroup: { display: 'flex', gap: '6px', marginLeft: 'auto' },
  filterBtn: { display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  filterBtnActive: { background: '#238636', borderColor: '#238636', color: '#fff' },
  filterCount: { background: 'rgba(255,255,255,0.15)', padding: '1px 7px', borderRadius: '8px', fontSize: '11px' },
  clock: { fontSize: '18px', fontWeight: 'bold', color: '#e6edf3', fontFamily: 'monospace' },
  ordersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', padding: '16px 20px' },
  emptyState: { gridColumn: '1 / -1', textAlign: 'center', padding: '60px' },
  orderCard: { background: '#161b22', borderRadius: '12px', overflow: 'hidden', border: '1px solid #30363d', transition: 'box-shadow 0.3s' },
  orderHeader: { padding: '12px 14px' },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontSize: '24px', fontWeight: 'bold', marginRight: '8px', color: '#e6edf3' },
  statusBadge: { padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' },
  timer: { padding: '4px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' },
  orderMeta: { display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: '#8b949e', gap: '8px' },
  orderType: { fontWeight: '600' },
  orderItems: { padding: '10px 14px' },
  orderItem: { padding: '4px 0', display: 'flex', gap: '10px', fontSize: '15px' },
  itemQty: { fontWeight: 'bold', color: '#f0883e', minWidth: '28px', fontSize: '16px' },
  itemName: { color: '#e6edf3', fontWeight: '500' },
  itemCustom: { fontSize: '12px', color: '#8b949e', paddingLeft: '38px', paddingBottom: '4px', fontStyle: 'italic', lineHeight: '1.3' },
  orderNote: { padding: '8px 14px', background: 'rgba(240,136,62,0.08)', borderTop: '1px solid rgba(240,136,62,0.2)', fontSize: '12px', color: '#f0883e', fontWeight: '500' },
  orderActions: { padding: '10px 14px', borderTop: '1px solid #30363d' },
  actionBtn: { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.15s', letterSpacing: '0.5px' },
};
