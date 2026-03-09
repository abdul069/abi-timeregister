import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getDeliveries, getDeliveriesByDate, getDeliveriesByRange,
  getCouriers, saveCouriers, assignCourier, updateDeliveryStatus,
  formatPrice, getWeekRange, getMonthRange,
} from '../lib/pos-data';

export default function Bezorging() {
  const router = useRouter();
  const [tab, setTab] = useState('actief');
  const [deliveries, setDeliveries] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [courierForm, setCourierForm] = useState({ name: '', phone: '', vehicle: 'scooter' });
  const [editingCourier, setEditingCourier] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('dag');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tab === 'rapport') loadReportData();
  }, [tab, reportPeriod, reportDate]);

  const loadData = async () => {
    const [dels, cours] = await Promise.all([getDeliveriesByDate(today), getCouriers()]);
    setDeliveries(dels);
    setCouriers(cours);
    setLoading(false);
  };

  const loadReportData = async () => {
    let range;
    if (reportPeriod === 'dag') {
      range = { start: reportDate, end: reportDate };
    } else if (reportPeriod === 'week') {
      range = getWeekRange(reportDate);
    } else {
      range = getMonthRange(reportDate);
    }
    const data = await getDeliveriesByRange(range.start, range.end);
    setReportData(data);
  };

  const activeDeliveries = deliveries.filter(d => ['nieuw', 'toegewezen', 'onderweg'].includes(d.status));
  const completedDeliveries = deliveries.filter(d => d.status === 'afgeleverd');

  const handleAssign = async (courierId) => {
    if (!selectedDelivery) return;
    const courier = couriers.find(c => c.id === courierId);
    if (!courier) return;
    await assignCourier(selectedDelivery._docId, courierId, courier.name, 'system');
    setShowAssignModal(false);
    setSelectedDelivery(null);
    await loadData();
  };

  const handleStatusUpdate = async (del, newStatus) => {
    await updateDeliveryStatus(del._docId, newStatus, 'system');
    await loadData();
  };

  const handleSaveCourier = async () => {
    let updated;
    if (editingCourier) {
      updated = couriers.map(c => c.id === editingCourier.id ? { ...c, ...courierForm } : c);
    } else {
      updated = [...couriers, { ...courierForm, id: `courier_${Date.now()}`, active: true, status: 'beschikbaar' }];
    }
    await saveCouriers(updated);
    setCouriers(updated);
    setShowCourierModal(false);
    setCourierForm({ name: '', phone: '', vehicle: 'scooter' });
    setEditingCourier(null);
  };

  const handleDeleteCourier = async (id) => {
    const updated = couriers.filter(c => c.id !== id);
    await saveCouriers(updated);
    setCouriers(updated);
  };

  const statusColors = {
    nieuw: '#f0883e',
    toegewezen: '#58a6ff',
    onderweg: '#d29922',
    afgeleverd: '#3fb950',
    geannuleerd: '#f85149',
  };

  const statusLabels = {
    nieuw: 'Nieuw',
    toegewezen: 'Toegewezen',
    onderweg: 'Onderweg',
    afgeleverd: 'Afgeleverd',
    geannuleerd: 'Geannuleerd',
  };

  // Report stats
  const reportStats = {
    total: reportData.length,
    delivered: reportData.filter(d => d.status === 'afgeleverd').length,
    revenue: reportData.reduce((s, d) => s + (d.total || 0), 0),
    avgTime: (() => {
      const completed = reportData.filter(d => d.deliveredAt && d.timestamp);
      if (completed.length === 0) return 0;
      const totalMs = completed.reduce((s, d) => s + (d.deliveredAt - d.timestamp), 0);
      return Math.round(totalMs / completed.length / 60000);
    })(),
  };

  // Courier performance
  const courierPerf = {};
  reportData.forEach(d => {
    if (!d.courierName) return;
    if (!courierPerf[d.courierName]) courierPerf[d.courierName] = { count: 0, delivered: 0, totalTime: 0 };
    courierPerf[d.courierName].count++;
    if (d.status === 'afgeleverd') {
      courierPerf[d.courierName].delivered++;
      if (d.deliveredAt && d.timestamp) {
        courierPerf[d.courierName].totalTime += (d.deliveredAt - d.timestamp);
      }
    }
  });

  const tabs = [
    { id: 'actief', label: 'Actieve Bezorgingen', icon: '🚀' },
    { id: 'koeriers', label: 'Koeriers', icon: '🛵' },
    { id: 'rapport', label: 'Bezorgrapporten', icon: '📊' },
  ];

  if (loading) {
    return (
      <div style={st.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8b949e' }}>
          Laden...
        </div>
      </div>
    );
  }

  return (
    <div style={st.container}>
      {/* Header */}
      <div style={st.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/pos')} style={st.backBtn}>← Terug</button>
          <div>
            <h1 style={st.title}>🚚 Bezorging</h1>
            <p style={st.subtitle}>Bezorgbeheer, koeriers & routes</p>
          </div>
        </div>
        <div style={st.headerStats}>
          <div style={st.headerStat}>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#f0883e' }}>{activeDeliveries.length}</span>
            <span style={{ fontSize: '10px', color: '#8b949e' }}>ACTIEF</span>
          </div>
          <div style={{ width: '1px', height: '28px', background: '#30363d' }} />
          <div style={st.headerStat}>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#3fb950' }}>{completedDeliveries.length}</span>
            <span style={{ fontSize: '10px', color: '#8b949e' }}>AFGELEVERD</span>
          </div>
          <div style={{ width: '1px', height: '28px', background: '#30363d' }} />
          <div style={st.headerStat}>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#58a6ff' }}>{couriers.filter(c => c.active).length}</span>
            <span style={{ fontSize: '10px', color: '#8b949e' }}>KOERIERS</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={st.tabs}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...st.tab, ...(tab === t.id ? st.tabActive : {}) }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={st.content}>
        {/* ===== ACTIEVE BEZORGINGEN ===== */}
        {tab === 'actief' && (
          <div>
            {activeDeliveries.length === 0 ? (
              <div style={st.emptyState}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚚</div>
                <p style={{ color: '#8b949e', margin: 0 }}>Geen actieve bezorgingen</p>
              </div>
            ) : (
              <div style={st.deliveryGrid}>
                {activeDeliveries.map(del => (
                  <div key={del._docId} style={st.deliveryCard}>
                    <div style={st.deliveryCardHeader}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#e6edf3', fontSize: '15px' }}>Order #{del.orderId}</span>
                        {del.platform && del.platform !== 'pos' && (
                          <span style={{ ...st.platformBadge, background: del.platform === 'takeaway' ? '#FF8000' : '#e74c3c' }}>
                            {del.platform === 'takeaway' ? '🟠 Takeaway' : del.platform}
                          </span>
                        )}
                      </div>
                      <span style={{ ...st.statusBadge, background: statusColors[del.status] + '20', color: statusColors[del.status], border: `1px solid ${statusColors[del.status]}40` }}>
                        {statusLabels[del.status]}
                      </span>
                    </div>

                    <div style={st.deliveryInfo}>
                      {del.customerName && <div style={st.infoRow}><span style={st.infoIcon}>👤</span> {del.customerName}</div>}
                      {del.customerAddress && <div style={st.infoRow}><span style={st.infoIcon}>📍</span> {del.customerAddress}</div>}
                      {del.customerPhone && <div style={st.infoRow}><span style={st.infoIcon}>📞</span> {del.customerPhone}</div>}
                      {del.deliveryNotes && <div style={{ ...st.infoRow, color: '#d29922' }}><span style={st.infoIcon}>📝</span> {del.deliveryNotes}</div>}
                      <div style={st.infoRow}><span style={st.infoIcon}>💰</span> {formatPrice(del.total || 0)}</div>
                      {del.courierName && <div style={st.infoRow}><span style={st.infoIcon}>🛵</span> {del.courierName}</div>}
                    </div>

                    <div style={st.deliveryActions}>
                      {del.status === 'nieuw' && (
                        <button onClick={() => { setSelectedDelivery(del); setShowAssignModal(true); }} style={{ ...st.actionBtn, background: '#58a6ff20', color: '#58a6ff', border: '1px solid #58a6ff40' }}>
                          🛵 Toewijzen
                        </button>
                      )}
                      {del.status === 'toegewezen' && (
                        <button onClick={() => handleStatusUpdate(del, 'onderweg')} style={{ ...st.actionBtn, background: '#d2992220', color: '#d29922', border: '1px solid #d2992240' }}>
                          🚀 Onderweg
                        </button>
                      )}
                      {del.status === 'onderweg' && (
                        <button onClick={() => handleStatusUpdate(del, 'afgeleverd')} style={{ ...st.actionBtn, background: '#3fb95020', color: '#3fb950', border: '1px solid #3fb95040' }}>
                          ✅ Afgeleverd
                        </button>
                      )}
                    </div>

                    {/* Timeline */}
                    <div style={st.timeline}>
                      <div style={{ ...st.timelineDot, background: '#3fb950' }} />
                      <span style={st.timelineText}>{del.time || new Date(del.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</span>
                      {del.assignedAt && (
                        <>
                          <div style={st.timelineLine} />
                          <div style={{ ...st.timelineDot, background: '#58a6ff' }} />
                          <span style={st.timelineText}>{new Date(del.assignedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                      {del.pickedUpAt && (
                        <>
                          <div style={st.timelineLine} />
                          <div style={{ ...st.timelineDot, background: '#d29922' }} />
                          <span style={st.timelineText}>{new Date(del.pickedUpAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Completed today */}
            {completedDeliveries.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ color: '#8b949e', fontSize: '13px', textTransform: 'uppercase', margin: '0 0 12px' }}>Afgeleverd vandaag ({completedDeliveries.length})</h3>
                <div style={st.completedList}>
                  {completedDeliveries.map(del => (
                    <div key={del._docId} style={st.completedRow}>
                      <span style={{ color: '#e6edf3' }}>#{del.orderId}</span>
                      <span style={{ color: '#8b949e' }}>{del.customerName || '-'}</span>
                      <span style={{ color: '#8b949e' }}>{del.courierName || '-'}</span>
                      <span style={{ color: '#3fb950' }}>{formatPrice(del.total || 0)}</span>
                      {del.deliveredAt && del.timestamp && (
                        <span style={{ color: '#8b949e', fontSize: '12px' }}>
                          {Math.round((del.deliveredAt - del.timestamp) / 60000)} min
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== KOERIERS ===== */}
        {tab === 'koeriers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#e6edf3', margin: 0 }}>Koeriers Beheer</h3>
              <button onClick={() => { setCourierForm({ name: '', phone: '', vehicle: 'scooter' }); setEditingCourier(null); setShowCourierModal(true); }} style={st.addBtn}>
                + Nieuwe Koerier
              </button>
            </div>

            <div style={st.courierGrid}>
              {couriers.map(c => {
                const activeDels = activeDeliveries.filter(d => d.courierId === c.id);
                return (
                  <div key={c.id} style={st.courierCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                          {c.vehicle === 'scooter' ? '🛵' : c.vehicle === 'fiets' ? '🚲' : c.vehicle === 'auto' ? '🚗' : '🚶'}
                        </div>
                        <h4 style={{ margin: '0 0 4px', color: '#e6edf3', fontSize: '16px' }}>{c.name}</h4>
                        {c.phone && <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#8b949e' }}>📞 {c.phone}</p>}
                      </div>
                      <span style={{
                        ...st.statusBadge,
                        background: activeDels.length > 0 ? '#d2992220' : '#3fb95020',
                        color: activeDels.length > 0 ? '#d29922' : '#3fb950',
                        border: `1px solid ${activeDels.length > 0 ? '#d2992240' : '#3fb95040'}`,
                      }}>
                        {activeDels.length > 0 ? `${activeDels.length} bezorging(en)` : 'Beschikbaar'}
                      </span>
                    </div>

                    {activeDels.length > 0 && (
                      <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {activeDels.map(d => (
                          <div key={d._docId} style={{ fontSize: '12px', color: '#8b949e', padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>#{d.orderId} - {d.customerAddress || 'Geen adres'}</span>
                            <span style={{ color: statusColors[d.status] }}>{statusLabels[d.status]}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button onClick={() => { setCourierForm({ name: c.name, phone: c.phone || '', vehicle: c.vehicle || 'scooter' }); setEditingCourier(c); setShowCourierModal(true); }} style={{ ...st.smallBtn, color: '#58a6ff' }}>
                        Bewerken
                      </button>
                      <button onClick={() => handleDeleteCourier(c.id)} style={{ ...st.smallBtn, color: '#f85149' }}>
                        Verwijderen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== RAPPORTEN ===== */}
        {tab === 'rapport' && (
          <div>
            {/* Period selector */}
            <div style={st.periodBar}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['dag', 'week', 'maand'].map(p => (
                  <button key={p} onClick={() => setReportPeriod(p)} style={{ ...st.periodBtn, ...(reportPeriod === p ? st.periodBtnActive : {}) }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} style={st.dateInput} />
            </div>

            {/* KPIs */}
            <div style={st.kpiGrid}>
              <div style={st.kpiCard}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#58a6ff' }}>{reportStats.total}</span>
                <span style={{ fontSize: '11px', color: '#8b949e' }}>Totaal Bezorgingen</span>
              </div>
              <div style={st.kpiCard}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#3fb950' }}>{reportStats.delivered}</span>
                <span style={{ fontSize: '11px', color: '#8b949e' }}>Afgeleverd</span>
              </div>
              <div style={st.kpiCard}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f0883e' }}>{formatPrice(reportStats.revenue)}</span>
                <span style={{ fontSize: '11px', color: '#8b949e' }}>Bezorgomzet</span>
              </div>
              <div style={st.kpiCard}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#d29922' }}>{reportStats.avgTime} min</span>
                <span style={{ fontSize: '11px', color: '#8b949e' }}>Gem. Bezorgtijd</span>
              </div>
            </div>

            {/* Courier performance */}
            <div style={st.section}>
              <h3 style={st.sectionTitle}>Koerier Prestaties</h3>
              {Object.keys(courierPerf).length === 0 ? (
                <p style={{ color: '#8b949e', fontSize: '13px' }}>Geen data voor deze periode</p>
              ) : (
                <div style={st.tableWrap}>
                  <table style={st.table}>
                    <thead>
                      <tr>
                        <th style={st.th}>Koerier</th>
                        <th style={st.th}>Bezorgingen</th>
                        <th style={st.th}>Afgeleverd</th>
                        <th style={st.th}>Gem. Tijd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(courierPerf).map(([name, perf]) => (
                        <tr key={name}>
                          <td style={st.td}>{name}</td>
                          <td style={st.td}>{perf.count}</td>
                          <td style={st.td}>{perf.delivered}</td>
                          <td style={st.td}>
                            {perf.delivered > 0 ? Math.round(perf.totalTime / perf.delivered / 60000) + ' min' : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Delivery list */}
            <div style={st.section}>
              <h3 style={st.sectionTitle}>Bezorgingen ({reportData.length})</h3>
              <div style={st.tableWrap}>
                <table style={st.table}>
                  <thead>
                    <tr>
                      <th style={st.th}>Order</th>
                      <th style={st.th}>Klant</th>
                      <th style={st.th}>Adres</th>
                      <th style={st.th}>Koerier</th>
                      <th style={st.th}>Status</th>
                      <th style={st.th}>Bedrag</th>
                      <th style={st.th}>Tijd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(d => (
                      <tr key={d._docId}>
                        <td style={st.td}>#{d.orderId}</td>
                        <td style={st.td}>{d.customerName || '-'}</td>
                        <td style={{ ...st.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.customerAddress || '-'}</td>
                        <td style={st.td}>{d.courierName || '-'}</td>
                        <td style={st.td}>
                          <span style={{ color: statusColors[d.status] }}>{statusLabels[d.status] || d.status}</span>
                        </td>
                        <td style={st.td}>{formatPrice(d.total || 0)}</td>
                        <td style={st.td}>
                          {d.deliveredAt && d.timestamp ? Math.round((d.deliveredAt - d.timestamp) / 60000) + ' min' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assign Courier Modal */}
      {showAssignModal && (
        <div style={st.overlay} onClick={() => setShowAssignModal(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', color: '#e6edf3', fontSize: '18px' }}>Koerier Toewijzen</h2>
            <p style={{ margin: '0 0 16px', color: '#8b949e', fontSize: '13px' }}>
              Order #{selectedDelivery?.orderId} - {selectedDelivery?.customerAddress || 'Geen adres'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {couriers.filter(c => c.active).map(c => (
                <button key={c.id} onClick={() => handleAssign(c.id)} style={st.courierOption}>
                  <span style={{ fontSize: '24px' }}>
                    {c.vehicle === 'scooter' ? '🛵' : c.vehicle === 'fiets' ? '🚲' : c.vehicle === 'auto' ? '🚗' : '🚶'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#e6edf3' }}>{c.name}</div>
                    {c.phone && <div style={{ fontSize: '12px', color: '#8b949e' }}>{c.phone}</div>}
                  </div>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '11px',
                    color: activeDeliveries.filter(d => d.courierId === c.id).length > 0 ? '#d29922' : '#3fb950',
                  }}>
                    {activeDeliveries.filter(d => d.courierId === c.id).length > 0
                      ? `${activeDeliveries.filter(d => d.courierId === c.id).length} actief`
                      : 'Beschikbaar'}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAssignModal(false)} style={st.cancelBtn}>Annuleren</button>
          </div>
        </div>
      )}

      {/* Courier Form Modal */}
      {showCourierModal && (
        <div style={st.overlay} onClick={() => setShowCourierModal(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', color: '#e6edf3', fontSize: '18px' }}>
              {editingCourier ? 'Koerier Bewerken' : 'Nieuwe Koerier'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={st.label}>Naam *</label>
                <input value={courierForm.name} onChange={e => setCourierForm({ ...courierForm, name: e.target.value })} style={st.input} placeholder="Naam koerier" />
              </div>
              <div>
                <label style={st.label}>Telefoon</label>
                <input value={courierForm.phone} onChange={e => setCourierForm({ ...courierForm, phone: e.target.value })} style={st.input} placeholder="06-12345678" />
              </div>
              <div>
                <label style={st.label}>Voertuig</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ id: 'scooter', icon: '🛵', label: 'Scooter' }, { id: 'fiets', icon: '🚲', label: 'Fiets' }, { id: 'auto', icon: '🚗', label: 'Auto' }, { id: 'lopend', icon: '🚶', label: 'Lopend' }].map(v => (
                    <button key={v.id} onClick={() => setCourierForm({ ...courierForm, vehicle: v.id })} style={{
                      ...st.vehicleBtn,
                      ...(courierForm.vehicle === v.id ? { background: '#58a6ff20', border: '1px solid #58a6ff', color: '#58a6ff' } : {}),
                    }}>
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={handleSaveCourier} disabled={!courierForm.name} style={{ ...st.saveBtn, opacity: courierForm.name ? 1 : 0.5 }}>
                {editingCourier ? 'Opslaan' : 'Toevoegen'}
              </button>
              <button onClick={() => setShowCourierModal(false)} style={st.cancelBtn}>Annuleren</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  container: { minHeight: '100vh', background: '#0d1117', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#e6edf3' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #21262d', flexWrap: 'wrap', gap: '12px' },
  backBtn: { padding: '8px 14px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '13px' },
  title: { margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#e6edf3' },
  subtitle: { margin: '2px 0 0', fontSize: '12px', color: '#8b949e' },
  headerStats: { display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.04)', padding: '10px 20px', borderRadius: '10px' },
  headerStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },

  tabs: { display: 'flex', gap: '4px', padding: '12px 24px', borderBottom: '1px solid #21262d', overflowX: 'auto' },
  tab: { padding: '8px 16px', border: 'none', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' },
  tabActive: { background: '#21262d', color: '#e6edf3' },

  content: { padding: '20px 24px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },

  deliveryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' },
  deliveryCard: { background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  deliveryCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  platformBadge: { marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: '#fff' },
  statusBadge: { padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' },
  deliveryInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  infoRow: { fontSize: '13px', color: '#8b949e', display: 'flex', alignItems: 'center', gap: '6px' },
  infoIcon: { fontSize: '12px', width: '18px', textAlign: 'center' },
  deliveryActions: { display: 'flex', gap: '8px' },
  actionBtn: { flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', textAlign: 'center' },
  timeline: { display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '8px', borderTop: '1px solid #21262d' },
  timelineDot: { width: '8px', height: '8px', borderRadius: '50%' },
  timelineLine: { width: '16px', height: '2px', background: '#30363d' },
  timelineText: { fontSize: '11px', color: '#8b949e' },

  completedList: { display: 'flex', flexDirection: 'column', gap: '4px' },
  completedRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#161b22', borderRadius: '8px', fontSize: '13px', gap: '12px' },

  emptyState: { textAlign: 'center', padding: '60px 20px' },

  courierGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  courierCard: { background: '#161b22', border: '1px solid #21262d', borderRadius: '12px', padding: '16px' },
  smallBtn: { padding: '4px 10px', border: '1px solid #30363d', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '12px' },
  addBtn: { padding: '8px 16px', border: '1px solid #3fb950', borderRadius: '8px', background: '#3fb95015', color: '#3fb950', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },

  periodBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' },
  periodBtn: { padding: '6px 14px', border: '1px solid #30363d', borderRadius: '6px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '12px' },
  periodBtnActive: { background: '#21262d', color: '#e6edf3', border: '1px solid #58a6ff' },
  dateInput: { padding: '6px 12px', border: '1px solid #30363d', borderRadius: '6px', background: '#0d1117', color: '#e6edf3', fontSize: '13px' },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' },
  kpiCard: { background: '#161b22', border: '1px solid #21262d', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },

  section: { marginBottom: '24px' },
  sectionTitle: { margin: '0 0 12px', color: '#e6edf3', fontSize: '15px', fontWeight: '600' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '8px 12px', textAlign: 'left', color: '#8b949e', borderBottom: '1px solid #21262d', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' },
  td: { padding: '8px 12px', borderBottom: '1px solid #161b22', color: '#e6edf3' },

  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '24px', width: '440px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto' },

  courierOption: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #21262d', borderRadius: '10px', background: '#0d1117', cursor: 'pointer', color: '#e6edf3', fontSize: '14px', textAlign: 'left' },

  label: { display: 'block', fontSize: '12px', color: '#8b949e', marginBottom: '4px', fontWeight: '600' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #30363d', borderRadius: '8px', background: '#0d1117', color: '#e6edf3', fontSize: '14px', boxSizing: 'border-box' },
  vehicleBtn: { flex: 1, padding: '8px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '12px', textAlign: 'center' },
  saveBtn: { flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  cancelBtn: { width: '100%', padding: '10px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '14px', marginTop: '8px' },
};
