import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getOrders, formatPrice, getCategories } from '../lib/pos-data';

export default function Bestellingen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overzicht'); // overzicht, bestellingen, producten
  const [orderFilter, setOrderFilter] = useState('alle');

  useEffect(() => {
    async function loadData() {
      const [allOrders, cats] = await Promise.all([getOrders(), getCategories()]);
      setOrders(allOrders);
      setCategories(cats);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredOrders = orders.filter(o => o.date === selectedDate);
  const validOrders = filteredOrders.filter(o => o.status !== 'geannuleerd');
  const cancelledOrders = filteredOrders.filter(o => o.status === 'geannuleerd');

  // Core stats
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = validOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalBTW = validOrders.reduce((sum, o) => sum + (o.btw || 0), 0);

  // Payment breakdown
  const paymentBreakdown = {};
  validOrders.forEach(o => {
    const method = o.paymentMethod || 'onbekend';
    paymentBreakdown[method] = (paymentBreakdown[method] || 0) + o.total;
  });

  // Order type breakdown
  const orderTypeBreakdown = { afhalen: 0, 'ter plaatse': 0, bezorgen: 0 };
  validOrders.forEach(o => {
    if (orderTypeBreakdown[o.orderType] !== undefined) orderTypeBreakdown[o.orderType]++;
  });

  // Hourly breakdown
  const hourlyData = {};
  for (let h = 8; h <= 23; h++) {
    const key = String(h).padStart(2, '0');
    hourlyData[key] = { orders: 0, revenue: 0 };
  }
  validOrders.forEach(o => {
    const hour = o.time ? o.time.split(':')[0] : null;
    if (hour && hourlyData[hour]) {
      hourlyData[hour].orders++;
      hourlyData[hour].revenue += o.total;
    }
  });
  const peakHour = Object.entries(hourlyData).sort((a, b) => b[1].revenue - a[1].revenue)[0];
  const maxHourlyRevenue = Math.max(...Object.values(hourlyData).map(h => h.revenue), 1);

  // Category breakdown
  const categoryData = {};
  validOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const cat = item.category || 'overig';
      if (!categoryData[cat]) categoryData[cat] = { name: cat, count: 0, revenue: 0, items: {} };
      categoryData[cat].count += item.quantity;
      categoryData[cat].revenue += (item.price + (item.extraPrice || 0)) * item.quantity;
      const itemKey = item.name;
      if (!categoryData[cat].items[itemKey]) categoryData[cat].items[itemKey] = { name: item.name, qty: 0, revenue: 0 };
      categoryData[cat].items[itemKey].qty += item.quantity;
      categoryData[cat].items[itemKey].revenue += (item.price + (item.extraPrice || 0)) * item.quantity;
    });
  });
  const sortedCategories = Object.values(categoryData).sort((a, b) => b.revenue - a.revenue);

  // Popular items
  const itemCounts = {};
  validOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const key = item.name;
      if (!itemCounts[key]) itemCounts[key] = { name: item.name, qty: 0, revenue: 0, category: item.category };
      itemCounts[key].qty += item.quantity;
      itemCounts[key].revenue += (item.price + (item.extraPrice || 0)) * item.quantity;
    });
  });
  const popularItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty);

  // Discount stats
  const totalDiscount = validOrders.reduce((sum, o) => {
    if (o.ticketDiscount) {
      return sum + (o.ticketDiscount.type === 'percent' ? (o.subtotal || o.total) * (o.ticketDiscount.value / 100) : o.ticketDiscount.value);
    }
    return sum;
  }, 0);

  // Staff performance
  const staffData = {};
  validOrders.forEach(o => {
    const name = o.staffName || 'Onbekend';
    if (!staffData[name]) staffData[name] = { name, orders: 0, revenue: 0 };
    staffData[name].orders++;
    staffData[name].revenue += o.total;
  });
  const staffPerformance = Object.values(staffData).sort((a, b) => b.revenue - a.revenue);

  // Date navigation
  const goDate = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Filtered order list
  const displayOrders = filteredOrders.filter(o => {
    if (orderFilter === 'alle') return true;
    if (orderFilter === 'geannuleerd') return o.status === 'geannuleerd';
    return o.status === orderFilter;
  }).sort((a, b) => b.timestamp - a.timestamp);

  const getCatInfo = (catId) => categories.find(c => c.id === catId) || { name: catId, icon: '📦', color: '#8b949e' };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#e6edf3', background: '#0d1117', minHeight: '100vh' }}>Laden...</div>;

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <button onClick={() => router.push('/pos')} style={s.backBtn}>← Terug</button>
        <h1 style={s.title}>Bestellingen & Rapporten</h1>

        <div style={s.dateNav}>
          <button onClick={() => goDate(-1)} style={s.dateArrow}>‹</button>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={s.dateInput} />
          <button onClick={() => goDate(1)} style={s.dateArrow} disabled={isToday}>›</button>
          {!isToday && <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} style={s.todayBtn}>Vandaag</button>}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={s.tabBar}>
        {[
          { id: 'overzicht', label: 'Overzicht', icon: '📊' },
          { id: 'bestellingen', label: 'Bestellingen', icon: '🧾', count: filteredOrders.length },
          { id: 'producten', label: 'Producten', icon: '🍔', count: popularItems.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...s.tabBtn, ...(tab === t.id ? s.tabBtnActive : {}) }}>
            <span>{t.icon}</span> {t.label}
            {t.count !== undefined && <span style={s.tabCount}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {/* ====== OVERZICHT TAB ====== */}
        {tab === 'overzicht' && (
          <>
            {/* KPI Cards */}
            <div style={s.kpiGrid}>
              <div style={s.kpiCard}>
                <div style={s.kpiIcon}>💰</div>
                <div style={{ ...s.kpiVal, color: '#3fb950' }}>{formatPrice(totalRevenue)}</div>
                <div style={s.kpiLabel}>Totale Omzet</div>
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiIcon}>🧾</div>
                <div style={s.kpiVal}>{totalOrders}</div>
                <div style={s.kpiLabel}>Bestellingen</div>
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiIcon}>📈</div>
                <div style={{ ...s.kpiVal, color: '#f0883e' }}>{formatPrice(avgOrderValue)}</div>
                <div style={s.kpiLabel}>Gem. Bestelling</div>
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiIcon}>❌</div>
                <div style={{ ...s.kpiVal, color: '#f85149' }}>{cancelledOrders.length}</div>
                <div style={s.kpiLabel}>Geannuleerd</div>
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiIcon}>🏛</div>
                <div style={{ ...s.kpiVal, color: '#8b949e', fontSize: '18px' }}>{formatPrice(totalBTW)}</div>
                <div style={s.kpiLabel}>BTW (9%)</div>
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiIcon}>🏷</div>
                <div style={{ ...s.kpiVal, color: '#f85149', fontSize: '18px' }}>-{formatPrice(totalDiscount)}</div>
                <div style={s.kpiLabel}>Korting</div>
              </div>
            </div>

            <div style={s.twoCol}>
              {/* Hourly Chart */}
              <div style={s.card}>
                <h3 style={s.cardTitle}>Omzet per Uur</h3>
                {peakHour && peakHour[1].revenue > 0 && (
                  <div style={s.peakBadge}>Piek: {peakHour[0]}:00 · {formatPrice(peakHour[1].revenue)}</div>
                )}
                <div style={s.hourlyChart}>
                  {Object.entries(hourlyData).map(([hour, data]) => (
                    <div key={hour} style={s.hourlyBar}>
                      <div style={s.barWrapper}>
                        <div style={{
                          ...s.bar,
                          height: `${Math.max((data.revenue / maxHourlyRevenue) * 100, data.revenue > 0 ? 4 : 0)}%`,
                          background: data.revenue === peakHour?.[1]?.revenue && data.revenue > 0 ? '#3fb950' : '#238636',
                          opacity: data.revenue > 0 ? 1 : 0.15,
                        }} />
                      </div>
                      <div style={s.hourLabel}>{hour}</div>
                      {data.orders > 0 && <div style={s.hourVal}>{data.orders}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment & Order Types */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={s.card}>
                  <h3 style={s.cardTitle}>Betaalmethoden</h3>
                  <div style={s.breakdownList}>
                    {Object.entries(paymentBreakdown).length === 0 && <div style={s.noData}>Geen data</div>}
                    {Object.entries(paymentBreakdown).map(([method, amount]) => {
                      const pct = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
                      const icon = method === 'contant' ? '💵' : method === 'pin' ? '💳' : '📱';
                      const label = method === 'contant' ? 'Contant' : method === 'pin' ? 'PIN' : method === 'online' ? 'Online' : method;
                      return (
                        <div key={method} style={s.breakdownRow}>
                          <div style={s.breakdownLeft}>
                            <span style={{ fontSize: '16px' }}>{icon}</span>
                            <span>{label}</span>
                            <span style={s.pctBadge}>{pct}%</span>
                          </div>
                          <span style={{ fontWeight: 'bold' }}>{formatPrice(amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={s.card}>
                  <h3 style={s.cardTitle}>Besteltype</h3>
                  <div style={s.breakdownList}>
                    {[
                      { key: 'afhalen', icon: '📦', label: 'Afhalen' },
                      { key: 'ter plaatse', icon: '🍽', label: 'Ter Plaatse' },
                      { key: 'bezorgen', icon: '🚗', label: 'Bezorgen' },
                    ].map(t => (
                      <div key={t.key} style={s.breakdownRow}>
                        <div style={s.breakdownLeft}>
                          <span style={{ fontSize: '16px' }}>{t.icon}</span>
                          <span>{t.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={s.countBadge}>{orderTypeBreakdown[t.key] || 0}x</span>
                          <span style={{ fontWeight: 'bold' }}>
                            {formatPrice(validOrders.filter(o => o.orderType === t.key).reduce((s, o) => s + o.total, 0))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {staffPerformance.length > 0 && (
                  <div style={s.card}>
                    <h3 style={s.cardTitle}>Medewerkers</h3>
                    <div style={s.breakdownList}>
                      {staffPerformance.map(sp => (
                        <div key={sp.name} style={s.breakdownRow}>
                          <div style={s.breakdownLeft}>
                            <div style={s.staffAvatar}>{sp.name.charAt(0)}</div>
                            <span>{sp.name}</span>
                            <span style={s.countBadge}>{sp.orders}x</span>
                          </div>
                          <span style={{ fontWeight: 'bold', color: '#3fb950' }}>{formatPrice(sp.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Category Performance */}
            {sortedCategories.length > 0 && (
              <div style={s.card}>
                <h3 style={s.cardTitle}>Categorie Prestaties</h3>
                <div style={s.catGrid}>
                  {sortedCategories.map(cat => {
                    const info = getCatInfo(cat.name);
                    const pct = totalRevenue > 0 ? Math.round((cat.revenue / totalRevenue) * 100) : 0;
                    return (
                      <div key={cat.name} style={s.catCard}>
                        <div style={s.catHeader}>
                          <span style={{ fontSize: '20px' }}>{info.icon}</span>
                          <div>
                            <div style={s.catName}>{info.name}</div>
                            <div style={s.catMeta}>{cat.count} items · {pct}% van omzet</div>
                          </div>
                          <div style={{ marginLeft: 'auto', fontWeight: 'bold', color: '#3fb950', fontSize: '15px' }}>{formatPrice(cat.revenue)}</div>
                        </div>
                        <div style={s.catBar}>
                          <div style={{ height: '4px', borderRadius: '2px', background: info.color || '#238636', width: `${pct}%`, transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ====== BESTELLINGEN TAB ====== */}
        {tab === 'bestellingen' && (
          <div style={s.card}>
            <div style={s.orderHeader}>
              <h3 style={{ ...s.cardTitle, margin: 0 }}>Alle Bestellingen</h3>
              <div style={s.orderFilters}>
                {[
                  { id: 'alle', label: 'Alle' },
                  { id: 'klaar', label: 'Klaar' },
                  { id: 'afgehaald', label: 'Afgehaald' },
                  { id: 'geannuleerd', label: 'Geannuleerd' },
                ].map(f => (
                  <button key={f.id} onClick={() => setOrderFilter(f.id)} style={{ ...s.filterBtn, ...(orderFilter === f.id ? s.filterBtnActive : {}) }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {displayOrders.length === 0 && <div style={s.noData}>Geen bestellingen gevonden</div>}

            <div style={s.orderList}>
              {displayOrders.map(order => {
                const isExpanded = expandedOrder === order.id;
                const statusColor = { nieuw: '#f85149', bezig: '#f0883e', klaar: '#3fb950', afgehaald: '#8b949e', geannuleerd: '#f85149' }[order.status] || '#8b949e';
                const typeIcon = order.orderType === 'afhalen' ? '📦' : order.orderType === 'bezorgen' ? '🚗' : '🍽';
                const payIcon = order.paymentMethod === 'contant' ? '💵' : order.paymentMethod === 'pin' ? '💳' : '📱';
                return (
                  <div key={order.id}>
                    <div style={{ ...s.orderRow, ...(order.status === 'geannuleerd' ? { opacity: 0.5 } : {}) }} onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                      <span style={s.orderNum}>#{order.number}</span>
                      <span style={s.orderTime}>{order.time}</span>
                      <span style={{ ...s.statusDot, background: statusColor }}>{order.status}</span>
                      <span style={{ fontSize: '14px' }}>{typeIcon}</span>
                      <span style={{ fontSize: '14px' }}>{payIcon}</span>
                      {order.staffName && <span style={s.orderStaff}>👤 {order.staffName}</span>}
                      <span style={{ flex: 1 }} />
                      {order.ticketDiscount && <span style={s.discountTag}>🏷</span>}
                      {order.orderNote && <span style={s.noteTag}>📝</span>}
                      <span style={s.orderTotal}>{order.status === 'geannuleerd' ? <s>{formatPrice(order.total)}</s> : formatPrice(order.total)}</span>
                      <span style={s.expandIcon}>{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {isExpanded && (
                      <div style={s.orderDetails}>
                        {order.items.map((item, i) => (
                          <div key={i} style={s.detailGroup}>
                            <div style={s.detailItem}>
                              <span style={s.detailQty}>{item.quantity}x</span>
                              <span style={s.detailName}>
                                {item.name}
                                {item.variation && <span style={{ color: '#f0883e' }}> ({item.variation})</span>}
                              </span>
                              <span style={s.detailPrice}>{formatPrice((item.price + (item.extraPrice || 0)) * item.quantity)}</span>
                            </div>
                            {item.customizations && Object.entries(item.customizations).map(([key, val]) => {
                              const display = Array.isArray(val) ? val.join(', ') : val;
                              if (!display || display === 'Geen saus') return null;
                              return <div key={key} style={s.detailCustom}>{key}: {display}</div>;
                            })}
                            {item.note && <div style={{ ...s.detailCustom, color: '#f0883e' }}>📝 {item.note}</div>}
                            {item.discount && (
                              <div style={{ ...s.detailCustom, color: '#f85149' }}>
                                🏷 -{item.discount.type === 'percent' ? `${item.discount.value}%` : formatPrice(item.discount.value)}
                              </div>
                            )}
                          </div>
                        ))}

                        <div style={s.detailFooter}>
                          {order.subtotal && order.subtotal !== order.total && (
                            <div style={s.detailTotalRow}><span>Subtotaal</span><span>{formatPrice(order.subtotal)}</span></div>
                          )}
                          {order.ticketDiscount && (
                            <div style={{ ...s.detailTotalRow, color: '#f85149' }}>
                              <span>Korting ({order.ticketDiscount.type === 'percent' ? `${order.ticketDiscount.value}%` : formatPrice(order.ticketDiscount.value)})</span>
                              <span>-{formatPrice(
                                order.ticketDiscount.type === 'percent'
                                  ? (order.subtotal || order.total) * (order.ticketDiscount.value / 100)
                                  : order.ticketDiscount.value
                              )}</span>
                            </div>
                          )}
                          {order.btw > 0 && (
                            <div style={s.detailTotalRow}><span>BTW (9%)</span><span>{formatPrice(order.btw)}</span></div>
                          )}
                          <div style={{ ...s.detailTotalRow, fontWeight: 'bold', fontSize: '15px', borderTop: '1px solid #30363d', paddingTop: '8px', marginTop: '4px' }}>
                            <span>Totaal</span><span style={{ color: '#3fb950' }}>{formatPrice(order.total)}</span>
                          </div>
                        </div>

                        {order.orderNote && <div style={s.orderNoteDisplay}>📝 {order.orderNote}</div>}
                        {order.status === 'geannuleerd' && order.voidReason && (
                          <div style={s.voidReason}>❌ Reden: {order.voidReason}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====== PRODUCTEN TAB ====== */}
        {tab === 'producten' && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Product Ranking</h3>
            {popularItems.length === 0 && <div style={s.noData}>Geen productdata voor deze dag</div>}
            <div style={s.productList}>
              {popularItems.map((item, i) => {
                const maxQty = popularItems[0]?.qty || 1;
                const catInfo = getCatInfo(item.category);
                return (
                  <div key={item.name} style={s.productRow}>
                    <span style={{ ...s.productRank, color: i < 3 ? '#f0883e' : '#8b949e' }}>#{i + 1}</span>
                    <span style={{ fontSize: '14px' }}>{catInfo.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={s.productName}>{item.name}</div>
                      <div style={s.productBar}>
                        <div style={{ height: '3px', borderRadius: '2px', background: catInfo.color || '#238636', width: `${(item.qty / maxQty) * 100}%` }} />
                      </div>
                    </div>
                    <span style={s.productQty}>{item.qty}x</span>
                    <span style={s.productRevenue}>{formatPrice(item.revenue)}</span>
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
  topBar: { display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 24px', background: '#161b22', borderBottom: '1px solid #30363d', flexWrap: 'wrap' },
  backBtn: { padding: '8px 16px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '14px' },
  title: { margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#e6edf3' },
  dateNav: { display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' },
  dateArrow: { padding: '6px 12px', border: '1px solid #30363d', borderRadius: '6px', background: 'transparent', color: '#e6edf3', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  dateInput: { padding: '7px 12px', border: '1px solid #30363d', borderRadius: '8px', background: '#0d1117', color: '#e6edf3', fontSize: '14px', cursor: 'pointer', colorScheme: 'dark' },
  todayBtn: { padding: '7px 14px', border: '1px solid #238636', borderRadius: '8px', background: 'rgba(35,134,54,0.15)', color: '#3fb950', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },

  tabBar: { display: 'flex', gap: '4px', padding: '10px 24px', background: '#161b22', borderBottom: '1px solid #30363d' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1px solid transparent', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  tabBtnActive: { background: 'rgba(35,134,54,0.15)', borderColor: '#238636', color: '#3fb950' },
  tabCount: { background: 'rgba(255,255,255,0.1)', padding: '1px 7px', borderRadius: '8px', fontSize: '11px' },

  content: { padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' },

  // KPI Cards
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' },
  kpiCard: { background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', padding: '18px', textAlign: 'center' },
  kpiIcon: { fontSize: '24px', marginBottom: '6px' },
  kpiVal: { fontSize: '24px', fontWeight: 'bold', color: '#e6edf3' },
  kpiLabel: { fontSize: '11px', color: '#8b949e', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' },

  twoCol: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' },

  // Cards
  card: { background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', padding: '18px' },
  cardTitle: { margin: '0 0 14px', fontSize: '15px', fontWeight: '700', color: '#e6edf3' },

  // Hourly Chart
  peakBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: '8px', background: 'rgba(63,185,80,0.1)', color: '#3fb950', fontSize: '11px', fontWeight: 'bold', marginBottom: '12px' },
  hourlyChart: { display: 'flex', alignItems: 'flex-end', gap: '3px', height: '140px' },
  hourlyBar: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' },
  barWrapper: { flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
  bar: { borderRadius: '3px 3px 0 0', minWidth: '100%', transition: 'height 0.4s ease' },
  hourLabel: { fontSize: '9px', color: '#8b949e', marginTop: '4px' },
  hourVal: { fontSize: '9px', color: '#3fb950', fontWeight: 'bold' },

  // Breakdowns
  breakdownList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  breakdownRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '13px' },
  breakdownLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  pctBadge: { padding: '1px 6px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', fontSize: '10px', color: '#8b949e' },
  countBadge: { padding: '1px 6px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', fontSize: '11px', color: '#8b949e', fontWeight: '600' },
  staffAvatar: { width: '24px', height: '24px', borderRadius: '50%', background: '#238636', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff' },

  // Category Performance
  catGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' },
  catCard: { padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' },
  catHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  catName: { fontSize: '14px', fontWeight: '600' },
  catMeta: { fontSize: '11px', color: '#8b949e' },
  catBar: { height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' },

  // Orders tab
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' },
  orderFilters: { display: 'flex', gap: '4px' },
  filterBtn: { padding: '5px 12px', border: '1px solid #30363d', borderRadius: '6px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  filterBtnActive: { background: '#238636', borderColor: '#238636', color: '#fff' },
  orderList: { maxHeight: '70vh', overflowY: 'auto' },
  orderRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: '1px solid rgba(48,54,61,0.5)', cursor: 'pointer', fontSize: '13px', transition: 'background 0.1s' },
  orderNum: { fontWeight: 'bold', minWidth: '44px', color: '#e6edf3', fontSize: '14px' },
  orderTime: { color: '#8b949e', minWidth: '44px' },
  statusDot: { padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', color: '#fff', textTransform: 'capitalize' },
  orderStaff: { fontSize: '11px', color: '#8b949e' },
  discountTag: { fontSize: '12px' },
  noteTag: { fontSize: '12px' },
  orderTotal: { fontWeight: 'bold', color: '#e6edf3', minWidth: '65px', textAlign: 'right' },
  expandIcon: { color: '#8b949e', fontSize: '10px' },

  // Order Details
  orderDetails: { padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #30363d' },
  detailGroup: { marginBottom: '6px' },
  detailItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', fontSize: '13px' },
  detailQty: { fontWeight: 'bold', color: '#f0883e', minWidth: '28px' },
  detailName: { flex: 1, color: '#e6edf3', fontWeight: '500' },
  detailPrice: { color: '#8b949e', fontWeight: '500' },
  detailCustom: { fontSize: '11px', color: '#8b949e', paddingLeft: '36px', fontStyle: 'italic' },
  detailFooter: { marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(48,54,61,0.5)' },
  detailTotalRow: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '13px', color: '#8b949e' },
  orderNoteDisplay: { marginTop: '8px', padding: '8px 10px', background: 'rgba(240,136,62,0.06)', borderRadius: '6px', fontSize: '12px', color: '#f0883e' },
  voidReason: { marginTop: '8px', padding: '8px 10px', background: 'rgba(248,81,73,0.06)', borderRadius: '6px', fontSize: '12px', color: '#f85149' },

  // Products tab
  productList: { display: 'flex', flexDirection: 'column' },
  productRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(48,54,61,0.4)' },
  productRank: { fontWeight: 'bold', minWidth: '30px', fontSize: '13px' },
  productName: { fontSize: '13px', fontWeight: '600', color: '#e6edf3', marginBottom: '4px' },
  productBar: { height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' },
  productQty: { padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', fontSize: '12px', color: '#8b949e', fontWeight: 'bold' },
  productRevenue: { fontWeight: 'bold', color: '#3fb950', minWidth: '65px', textAlign: 'right', fontSize: '13px' },

  noData: { textAlign: 'center', padding: '30px', color: '#8b949e', fontSize: '13px' },
};
