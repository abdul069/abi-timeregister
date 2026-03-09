import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getActiveWorkPeriod, startWorkPeriod, endWorkPeriod, getTodayOrders,
  getWorkPeriodHistory, formatPrice, getKasboekByDate, addKasboekEntry,
  DENOMINATIONS, calculateDenominationTotal, getBusinessSettings,
} from '../lib/pos-data';

export default function Dagafsluiting() {
  const router = useRouter();
  const [workPeriod, setWorkPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startCashInput, setStartCashInput] = useState('');
  const [todayStats, setTodayStats] = useState(null);
  const [todayOrders, setTodayOrders] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [endReport, setEndReport] = useState(null);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [tab, setTab] = useState('huidig'); // huidig, kasboek, historie
  const [history, setHistory] = useState([]);
  const [kasboek, setKasboek] = useState([]);
  const [showXReport, setShowXReport] = useState(false);
  const [denomination, setDenomination] = useState({});
  const [useDenomination, setUseDenomination] = useState(false);
  const [kasboekForm, setKasboekForm] = useState({ type: 'storting', amount: '', description: '' });
  const [businessSettings, setBusinessSettings] = useState({ cashTolerance: 2 });
  const [expandedPeriod, setExpandedPeriod] = useState(null);

  // Step flow for closing: 1=counting, 2=confirm, 3=done
  const [closeStep, setCloseStep] = useState(0);
  const [endCashAmount, setEndCashAmount] = useState(0);

  useEffect(() => {
    loadData();
    const staff = sessionStorage.getItem('posStaff');
    if (staff) setCurrentStaff(JSON.parse(staff));
  }, []);

  const loadData = async () => {
    const [period, orders, hist, kb, bs] = await Promise.all([
      getActiveWorkPeriod(),
      getTodayOrders(),
      getWorkPeriodHistory(),
      getKasboekByDate(new Date().toISOString().split('T')[0]),
      getBusinessSettings(),
    ]);
    setWorkPeriod(period && period.active ? period : null);
    setTodayOrders(orders);
    setHistory(hist);
    setKasboek(kb);
    setBusinessSettings(bs);
    calculateStats(orders, kb);
    setLoading(false);
  };

  const calculateStats = (orders, kb) => {
    const validOrders = orders.filter(o => o.status !== 'geannuleerd');
    const paymentBreakdown = {};
    const hourlyBreakdown = {};
    const categoryBreakdown = {};

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
    const pinTotal = validOrders.filter(o => o.paymentMethod === 'pin').reduce((s, o) => s + o.total, 0);
    const onlineTotal = validOrders.filter(o => o.paymentMethod === 'online').reduce((s, o) => s + o.total, 0);

    // Kasboek adjustments
    const kasIn = (kb || []).filter(k => k.direction === 'in').reduce((s, k) => s + k.amount, 0);
    const kasOut = (kb || []).filter(k => k.direction === 'out').reduce((s, k) => s + k.amount, 0);

    const discountTotal = validOrders.reduce((s, o) => {
      if (o.ticketDiscount) {
        return s + (o.ticketDiscount.type === 'percent' ? (o.subtotal || o.total) * (o.ticketDiscount.value / 100) : o.ticketDiscount.value);
      }
      return s;
    }, 0);

    setTodayStats({
      totalOrders: validOrders.length,
      cancelledOrders: orders.filter(o => o.status === 'geannuleerd').length,
      totalRevenue: validOrders.reduce((s, o) => s + o.total, 0),
      totalBTW: validOrders.reduce((s, o) => s + (o.btw || 0), 0),
      cashTotal, pinTotal, onlineTotal,
      discountTotal,
      avgOrder: validOrders.length > 0 ? validOrders.reduce((s, o) => s + o.total, 0) / validOrders.length : 0,
      paymentBreakdown,
      hourlyBreakdown,
      categoryBreakdown,
      kasIn, kasOut,
      takeawayOrders: validOrders.filter(o => o.orderType === 'afhalen').length,
      dineinOrders: validOrders.filter(o => o.orderType === 'ter plaatse').length,
      deliveryOrders: validOrders.filter(o => o.orderType === 'bezorgen').length,
      itemsSold: validOrders.reduce((s, o) => s + (o.items || []).reduce((s2, i) => s2 + i.quantity, 0), 0),
    });
  };

  const handleStartPeriod = async () => {
    const cash = parseFloat(startCashInput) || 0;
    const denom = useDenomination ? denomination : null;
    const period = await startWorkPeriod(cash, currentStaff?.id || 'unknown', denom);
    setWorkPeriod(period);
    setStartCashInput('');
    setDenomination({});
    setUseDenomination(false);
    await loadData();
  };

  const startClosing = () => {
    setCloseStep(1);
    setDenomination({});
    setUseDenomination(true);
  };

  const confirmClosing = () => {
    const amount = useDenomination ? calculateDenominationTotal(denomination) : parseFloat(endCashAmount) || 0;
    setEndCashAmount(amount);
    setCloseStep(2);
  };

  const handleEndPeriod = async () => {
    const cash = endCashAmount;
    const denom = useDenomination ? denomination : null;
    const expectedCash = (workPeriod?.startCash || 0) + (todayStats?.cashTotal || 0) + (todayStats?.kasIn || 0) - (todayStats?.kasOut || 0);
    const difference = cash - expectedCash;

    const reportData = {
      ...todayStats,
      expectedCash,
      actualCash: cash,
      difference,
      withinTolerance: Math.abs(difference) <= (businessSettings.cashTolerance || 2),
    };

    const result = await endWorkPeriod(cash, currentStaff?.id || 'unknown', denom, reportData);
    if (result) {
      setEndReport({ ...result, stats: todayStats, expectedCash, actualCash: cash, difference, withinTolerance: reportData.withinTolerance });
      setShowReport(true);
      setWorkPeriod(null);
      setCloseStep(0);
      setDenomination({});
      await loadData();
    }
  };

  const handleAddKasboek = async () => {
    if (!kasboekForm.amount || parseFloat(kasboekForm.amount) <= 0) return;
    const direction = ['storting', 'wisselgeld', 'fooi_in'].includes(kasboekForm.type) ? 'in' : 'out';
    await addKasboekEntry({
      type: kasboekForm.type,
      amount: parseFloat(kasboekForm.amount),
      description: kasboekForm.description || kasboekForm.type,
      direction,
      staffId: currentStaff?.id || 'unknown',
      staffName: currentStaff?.name || 'Onbekend',
    });
    setKasboekForm({ type: 'storting', amount: '', description: '' });
    await loadData();
  };

  const denomTotal = calculateDenominationTotal(denomination);

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

      {/* Tabs */}
      <div style={s.tabBar}>
        {[
          { id: 'huidig', label: 'Huidige Dag', icon: '📊' },
          { id: 'kasboek', label: 'Kasboek', icon: '📒', count: kasboek.length },
          { id: 'historie', label: 'Z-Rapport Historie', icon: '📋', count: history.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...s.tabBtn, ...(tab === t.id ? s.tabBtnActive : {}) }}>
            <span>{t.icon}</span> {t.label}
            {t.count !== undefined && <span style={s.tabCount}>{t.count}</span>}
          </button>
        ))}
        {workPeriod && (
          <button onClick={() => setShowXReport(true)} style={{ ...s.tabBtn, marginLeft: 'auto', background: 'rgba(88,166,255,0.1)', borderColor: '#58a6ff', color: '#58a6ff' }}>
            X-Rapport (Tussenstand)
          </button>
        )}
      </div>

      <div style={s.content}>
        {/* ===== HUIDIGE DAG TAB ===== */}
        {tab === 'huidig' && (
          <>
            <div style={s.twoCol}>
              {/* Work Period Control */}
              <div style={s.card}>
                {!workPeriod && closeStep === 0 && (
                  <>
                    <h2 style={s.cardTitle}>Werkperiode Openen</h2>
                    <p style={s.hint}>Tel de kassa en voer het startbedrag in</p>

                    <div style={s.toggleRow}>
                      <label style={s.toggleLabel}>
                        <input type="checkbox" checked={useDenomination} onChange={e => setUseDenomination(e.target.checked)} />
                        Coupure-telling gebruiken
                      </label>
                    </div>

                    {useDenomination ? (
                      <div style={s.denomGrid}>
                        {DENOMINATIONS.map(d => (
                          <div key={d.label} style={s.denomRow}>
                            <span style={s.denomLabel}>{d.label}</span>
                            <input
                              type="number" min="0" step="1"
                              value={denomination[d.label] || ''}
                              onChange={e => setDenomination({ ...denomination, [d.label]: parseInt(e.target.value) || 0 })}
                              style={s.denomInput}
                              placeholder="0"
                            />
                            <span style={s.denomTotal}>{formatPrice((denomination[d.label] || 0) * d.value)}</span>
                          </div>
                        ))}
                        <div style={s.denomSumRow}>
                          <strong>Totaal:</strong>
                          <strong style={{ color: '#3fb950' }}>{formatPrice(denomTotal)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div style={s.cashInputGroup}>
                        <label style={s.label}>Startkassa bedrag</label>
                        <div style={s.cashInputRow}>
                          <span style={s.euro}>€</span>
                          <input type="number" step="0.01" min="0" value={startCashInput} onChange={e => setStartCashInput(e.target.value)} style={s.cashInput} placeholder="0.00" />
                        </div>
                      </div>
                    )}
                    <button onClick={handleStartPeriod} style={{ ...s.actionBtn, background: '#238636' }}>
                      Werkperiode Openen
                    </button>
                  </>
                )}

                {workPeriod && closeStep === 0 && (
                  <>
                    <h2 style={s.cardTitle}>Werkperiode Actief</h2>
                    <div style={s.periodInfo}>
                      <div style={s.infoRow}><span>Geopend:</span><span>{new Date(workPeriod.startTime).toLocaleString('nl-NL')}</span></div>
                      <div style={s.infoRow}><span>Startkassa:</span><span style={{ fontWeight: 'bold' }}>{formatPrice(workPeriod.startCash || 0)}</span></div>
                      <div style={s.infoRow}><span>Duur:</span><span>{Math.floor((Date.now() - workPeriod.startTime) / 3600000)}u {Math.floor(((Date.now() - workPeriod.startTime) % 3600000) / 60000)}m</span></div>
                      <div style={s.infoRow}><span>Geopend door:</span><span>{workPeriod.startedBy}</span></div>
                    </div>

                    <div style={s.kassaStand}>
                      <h3 style={s.subTitle}>Kassastand Berekening</h3>
                      <div style={s.calcRow}><span>Startkassa</span><span>{formatPrice(workPeriod.startCash || 0)}</span></div>
                      <div style={s.calcRow}><span>+ Cash omzet</span><span style={{ color: '#3fb950' }}>+{formatPrice(todayStats?.cashTotal || 0)}</span></div>
                      {(todayStats?.kasIn || 0) > 0 && <div style={s.calcRow}><span>+ Kas stortingen</span><span style={{ color: '#3fb950' }}>+{formatPrice(todayStats.kasIn)}</span></div>}
                      {(todayStats?.kasOut || 0) > 0 && <div style={s.calcRow}><span>- Kas opnames</span><span style={{ color: '#f85149' }}>-{formatPrice(todayStats.kasOut)}</span></div>}
                      <div style={{ ...s.calcRow, fontWeight: 'bold', borderTop: '2px solid #30363d', paddingTop: '8px', marginTop: '4px' }}>
                        <span>Verwacht in kassa</span>
                        <span style={{ color: '#3fb950', fontSize: '16px' }}>
                          {formatPrice((workPeriod.startCash || 0) + (todayStats?.cashTotal || 0) + (todayStats?.kasIn || 0) - (todayStats?.kasOut || 0))}
                        </span>
                      </div>
                    </div>

                    <button onClick={startClosing} style={{ ...s.actionBtn, background: '#da3633', marginTop: '16px' }}>
                      Werkperiode Sluiten (Z-Rapport)
                    </button>
                  </>
                )}

                {/* CLOSE STEP 1: Counting */}
                {closeStep === 1 && (
                  <>
                    <h2 style={s.cardTitle}>Stap 1: Kassatelling</h2>
                    <p style={s.hint}>Tel alle coupures en munten in de kassa</p>

                    <div style={s.toggleRow}>
                      <label style={s.toggleLabel}>
                        <input type="checkbox" checked={useDenomination} onChange={e => setUseDenomination(e.target.checked)} />
                        Coupure-telling
                      </label>
                      {!useDenomination && (
                        <label style={s.toggleLabel}>Snelle invoer (totaalbedrag)</label>
                      )}
                    </div>

                    {useDenomination ? (
                      <div style={s.denomGrid}>
                        {DENOMINATIONS.map(d => (
                          <div key={d.label} style={s.denomRow}>
                            <span style={s.denomLabel}>{d.label}</span>
                            <input
                              type="number" min="0" step="1"
                              value={denomination[d.label] || ''}
                              onChange={e => setDenomination({ ...denomination, [d.label]: parseInt(e.target.value) || 0 })}
                              style={s.denomInput}
                              placeholder="0"
                            />
                            <span style={s.denomTotal}>{formatPrice((denomination[d.label] || 0) * d.value)}</span>
                          </div>
                        ))}
                        <div style={s.denomSumRow}>
                          <strong>Geteld totaal:</strong>
                          <strong style={{ color: '#58a6ff', fontSize: '18px' }}>{formatPrice(denomTotal)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div style={s.cashInputGroup}>
                        <label style={s.label}>Geteld bedrag in kassa</label>
                        <div style={s.cashInputRow}>
                          <span style={s.euro}>€</span>
                          <input type="number" step="0.01" min="0" value={endCashAmount || ''} onChange={e => setEndCashAmount(parseFloat(e.target.value) || 0)} style={s.cashInput} placeholder="0.00" />
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <button onClick={() => setCloseStep(0)} style={{ ...s.actionBtn, background: '#484f58', flex: 1 }}>Annuleren</button>
                      <button onClick={confirmClosing} style={{ ...s.actionBtn, background: '#da3633', flex: 2 }}>Verder</button>
                    </div>
                  </>
                )}

                {/* CLOSE STEP 2: Confirm */}
                {closeStep === 2 && (
                  <>
                    <h2 style={s.cardTitle}>Stap 2: Bevestiging Z-Rapport</h2>
                    {(() => {
                      const expected = (workPeriod?.startCash || 0) + (todayStats?.cashTotal || 0) + (todayStats?.kasIn || 0) - (todayStats?.kasOut || 0);
                      const diff = endCashAmount - expected;
                      const withinTol = Math.abs(diff) <= (businessSettings.cashTolerance || 2);
                      return (
                        <div style={s.confirmBox}>
                          <div style={s.confirmRow}><span>Verwacht in kassa:</span><span>{formatPrice(expected)}</span></div>
                          <div style={s.confirmRow}><span>Geteld in kassa:</span><span style={{ fontWeight: 'bold' }}>{formatPrice(endCashAmount)}</span></div>
                          <div style={{ ...s.confirmRow, fontSize: '18px', fontWeight: 'bold', borderTop: '2px solid #30363d', paddingTop: '10px', marginTop: '6px' }}>
                            <span>Verschil:</span>
                            <span style={{ color: diff === 0 ? '#3fb950' : withinTol ? '#f0883e' : '#f85149' }}>
                              {diff >= 0 ? '+' : ''}{formatPrice(diff)}
                            </span>
                          </div>
                          {diff === 0 && <div style={{ ...s.toleranceBadge, background: 'rgba(63,185,80,0.1)', color: '#3fb950' }}>Kassa klopt exact</div>}
                          {diff !== 0 && withinTol && <div style={{ ...s.toleranceBadge, background: 'rgba(240,136,62,0.1)', color: '#f0883e' }}>Binnen tolerantie ({formatPrice(businessSettings.cashTolerance || 2)})</div>}
                          {!withinTol && <div style={{ ...s.toleranceBadge, background: 'rgba(248,81,73,0.1)', color: '#f85149' }}>BUITEN tolerantie! Controleer de kassa.</div>}

                          <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', color: '#8b949e' }}>
                            <div style={s.confirmRow}><span>Totaal omzet:</span><span>{formatPrice(todayStats?.totalRevenue || 0)}</span></div>
                            <div style={s.confirmRow}><span>Bestellingen:</span><span>{todayStats?.totalOrders || 0}</span></div>
                            <div style={s.confirmRow}><span>Cash:</span><span>{formatPrice(todayStats?.cashTotal || 0)}</span></div>
                            <div style={s.confirmRow}><span>PIN:</span><span>{formatPrice(todayStats?.pinTotal || 0)}</span></div>
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <button onClick={() => setCloseStep(1)} style={{ ...s.actionBtn, background: '#484f58', flex: 1 }}>Terug</button>
                      <button onClick={handleEndPeriod} style={{ ...s.actionBtn, background: '#da3633', flex: 2 }}>Bevestig & Sluit Werkperiode</button>
                    </div>
                  </>
                )}
              </div>

              {/* Today's stats */}
              {todayStats && (
                <div style={s.card}>
                  <h2 style={s.cardTitle}>Dagstatistieken</h2>
                  <div style={s.statsGrid}>
                    <div style={s.statBox}><div style={s.statVal}>{todayStats.totalOrders}</div><div style={s.statLabel}>Bestellingen</div></div>
                    <div style={s.statBox}><div style={{ ...s.statVal, color: '#3fb950' }}>{formatPrice(todayStats.totalRevenue)}</div><div style={s.statLabel}>Omzet</div></div>
                    <div style={s.statBox}><div style={{ ...s.statVal, color: '#f0883e' }}>{formatPrice(todayStats.avgOrder)}</div><div style={s.statLabel}>Gem. Bon</div></div>
                    <div style={s.statBox}><div style={{ ...s.statVal, color: '#f85149' }}>{todayStats.cancelledOrders}</div><div style={s.statLabel}>Geannuleerd</div></div>
                    <div style={s.statBox}><div style={s.statVal}>{todayStats.itemsSold}</div><div style={s.statLabel}>Items Verkocht</div></div>
                    <div style={s.statBox}>
                      <div style={{ ...s.statVal, color: '#58a6ff', fontSize: '14px' }}>
                        {todayStats.takeawayOrders}A / {todayStats.dineinOrders}T / {todayStats.deliveryOrders}B
                      </div>
                      <div style={s.statLabel}>Afhaal/Ter Plaatse/Bezorg</div>
                    </div>
                  </div>

                  <h3 style={s.subTitle}>Betaalmethoden</h3>
                  <div style={s.breakdownList}>
                    <div style={s.breakdownRow}><span>💵 Contant</span><span style={{ fontWeight: 'bold' }}>{formatPrice(todayStats.cashTotal)}</span></div>
                    <div style={s.breakdownRow}><span>💳 PIN</span><span style={{ fontWeight: 'bold' }}>{formatPrice(todayStats.pinTotal)}</span></div>
                    <div style={s.breakdownRow}><span>📱 Online</span><span style={{ fontWeight: 'bold' }}>{formatPrice(todayStats.onlineTotal)}</span></div>
                  </div>

                  <h3 style={s.subTitle}>BTW & Kortingen</h3>
                  <div style={s.breakdownList}>
                    <div style={s.breakdownRow}><span>BTW (9%)</span><span>{formatPrice(todayStats.totalBTW)}</span></div>
                    <div style={s.breakdownRow}><span>Totaal korting</span><span style={{ color: '#f85149' }}>-{formatPrice(todayStats.discountTotal)}</span></div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== KASBOEK TAB ===== */}
        {tab === 'kasboek' && (
          <div style={s.twoCol}>
            <div style={s.card}>
              <h2 style={s.cardTitle}>Kasboek Vandaag</h2>
              {kasboek.length === 0 && <div style={s.noData}>Geen kasboek transacties vandaag</div>}
              <div style={s.kasboekList}>
                {kasboek.map(entry => (
                  <div key={entry._docId} style={s.kasboekRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ ...s.directionBadge, background: entry.direction === 'in' ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)', color: entry.direction === 'in' ? '#3fb950' : '#f85149' }}>
                        {entry.direction === 'in' ? '↓ IN' : '↑ UIT'}
                      </span>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{entry.type}</div>
                        <div style={{ fontSize: '11px', color: '#8b949e' }}>{entry.description} · {entry.time} · {entry.staffName}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 'bold', color: entry.direction === 'in' ? '#3fb950' : '#f85149' }}>
                      {entry.direction === 'in' ? '+' : '-'}{formatPrice(entry.amount)}
                    </span>
                  </div>
                ))}
              </div>
              {kasboek.length > 0 && (
                <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={s.breakdownRow}><span>Totaal IN</span><span style={{ color: '#3fb950', fontWeight: 'bold' }}>+{formatPrice(todayStats?.kasIn || 0)}</span></div>
                  <div style={s.breakdownRow}><span>Totaal UIT</span><span style={{ color: '#f85149', fontWeight: 'bold' }}>-{formatPrice(todayStats?.kasOut || 0)}</span></div>
                </div>
              )}
            </div>

            <div style={s.card}>
              <h2 style={s.cardTitle}>Nieuwe Transactie</h2>
              <div style={s.formGroup}>
                <label style={s.label}>Type</label>
                <select value={kasboekForm.type} onChange={e => setKasboekForm({ ...kasboekForm, type: e.target.value })} style={s.select}>
                  <option value="storting">Storting (IN)</option>
                  <option value="wisselgeld">Wisselgeld (IN)</option>
                  <option value="fooi_in">Fooi ontvangen (IN)</option>
                  <option value="afromen">Kas afromen (UIT)</option>
                  <option value="opname">Kas opname (UIT)</option>
                  <option value="fooi_uit">Fooi uitbetaald (UIT)</option>
                  <option value="inkoop">Inkoop betaald (UIT)</option>
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Bedrag</label>
                <div style={s.cashInputRow}>
                  <span style={s.euro}>€</span>
                  <input type="number" step="0.01" min="0" value={kasboekForm.amount} onChange={e => setKasboekForm({ ...kasboekForm, amount: e.target.value })} style={s.cashInput} placeholder="0.00" />
                </div>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Omschrijving (optioneel)</label>
                <input type="text" value={kasboekForm.description} onChange={e => setKasboekForm({ ...kasboekForm, description: e.target.value })} style={s.textInput} placeholder="Bijv. wisselgeld van bank" />
              </div>
              <button onClick={handleAddKasboek} style={{ ...s.actionBtn, background: '#238636' }}>Toevoegen</button>
            </div>
          </div>
        )}

        {/* ===== HISTORIE TAB ===== */}
        {tab === 'historie' && (
          <div style={s.card}>
            <h2 style={s.cardTitle}>Z-Rapport Historie</h2>
            {history.length === 0 && <div style={s.noData}>Nog geen afsluitingen</div>}
            <div style={s.historyList}>
              {history.map(period => {
                const isExpanded = expandedPeriod === period._docId;
                const report = period.report || {};
                const diff = (period.endCash || 0) - ((period.startCash || 0) + (report.cashTotal || 0) + (report.kasIn || 0) - (report.kasOut || 0));
                return (
                  <div key={period._docId}>
                    <div style={s.historyRow} onClick={() => setExpandedPeriod(isExpanded ? null : period._docId)}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{period.startDate}</div>
                        <div style={{ fontSize: '11px', color: '#8b949e' }}>
                          {new Date(period.startTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - {new Date(period.endTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', color: '#3fb950' }}>{formatPrice(report.totalRevenue || 0)}</div>
                        <div style={{ fontSize: '11px', color: diff === 0 ? '#3fb950' : Math.abs(diff) <= 2 ? '#f0883e' : '#f85149' }}>
                          Verschil: {diff >= 0 ? '+' : ''}{formatPrice(diff)}
                        </div>
                      </div>
                      <span style={{ color: '#8b949e', fontSize: '11px' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                    {isExpanded && (
                      <div style={s.historyDetails}>
                        <div style={s.breakdownRow}><span>Bestellingen</span><span>{report.totalOrders || 0}</span></div>
                        <div style={s.breakdownRow}><span>Omzet</span><span style={{ color: '#3fb950' }}>{formatPrice(report.totalRevenue || 0)}</span></div>
                        <div style={s.breakdownRow}><span>Cash</span><span>{formatPrice(report.cashTotal || 0)}</span></div>
                        <div style={s.breakdownRow}><span>PIN</span><span>{formatPrice(report.pinTotal || 0)}</span></div>
                        <div style={s.breakdownRow}><span>Startkassa</span><span>{formatPrice(period.startCash || 0)}</span></div>
                        <div style={s.breakdownRow}><span>Eindkassa</span><span>{formatPrice(period.endCash || 0)}</span></div>
                        <div style={s.breakdownRow}><span>BTW</span><span>{formatPrice(report.totalBTW || 0)}</span></div>
                        <div style={s.breakdownRow}><span>Korting</span><span style={{ color: '#f85149' }}>-{formatPrice(report.discountTotal || 0)}</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* X-Rapport Modal */}
      {showXReport && todayStats && (
        <div style={s.overlay} onClick={() => setShowXReport(false)}>
          <div style={s.reportModal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>X-Rapport (Tussenstand)</h2>
            <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#8b949e', textAlign: 'center' }}>
              {new Date().toLocaleString('nl-NL')} · Tellers worden NIET gereset
            </p>
            <div style={s.reportGrid}>
              <div style={s.breakdownRow}><span>Bestellingen</span><span style={{ fontWeight: 'bold' }}>{todayStats.totalOrders}</span></div>
              <div style={s.breakdownRow}><span>Totaal omzet</span><span style={{ fontWeight: 'bold', color: '#3fb950' }}>{formatPrice(todayStats.totalRevenue)}</span></div>
              <div style={s.breakdownRow}><span>Gem. bestelling</span><span>{formatPrice(todayStats.avgOrder)}</span></div>
              <div style={s.breakdownRow}><span>Geannuleerd</span><span style={{ color: '#f85149' }}>{todayStats.cancelledOrders}</span></div>
              <div style={{ ...s.breakdownRow, borderTop: '1px solid #30363d', paddingTop: '8px', marginTop: '4px' }}><span>💵 Contant</span><span style={{ fontWeight: 'bold' }}>{formatPrice(todayStats.cashTotal)}</span></div>
              <div style={s.breakdownRow}><span>💳 PIN</span><span style={{ fontWeight: 'bold' }}>{formatPrice(todayStats.pinTotal)}</span></div>
              <div style={s.breakdownRow}><span>📱 Online</span><span style={{ fontWeight: 'bold' }}>{formatPrice(todayStats.onlineTotal)}</span></div>
              <div style={{ ...s.breakdownRow, borderTop: '1px solid #30363d', paddingTop: '8px', marginTop: '4px' }}><span>BTW (9%)</span><span>{formatPrice(todayStats.totalBTW)}</span></div>
              <div style={s.breakdownRow}><span>Korting</span><span style={{ color: '#f85149' }}>-{formatPrice(todayStats.discountTotal)}</span></div>
              {workPeriod && (
                <>
                  <div style={{ ...s.breakdownRow, borderTop: '1px solid #30363d', paddingTop: '8px', marginTop: '4px' }}><span>Startkassa</span><span>{formatPrice(workPeriod.startCash || 0)}</span></div>
                  <div style={s.breakdownRow}>
                    <span>Verwacht in kassa</span>
                    <span style={{ fontWeight: 'bold', color: '#3fb950' }}>
                      {formatPrice((workPeriod.startCash || 0) + todayStats.cashTotal + (todayStats.kasIn || 0) - (todayStats.kasOut || 0))}
                    </span>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setShowXReport(false)} style={{ ...s.actionBtn, marginTop: '16px' }}>Sluiten</button>
          </div>
        </div>
      )}

      {/* Z-Rapport (End Report) Modal */}
      {showReport && endReport && (
        <div style={s.overlay} onClick={() => setShowReport(false)}>
          <div style={{ ...s.reportModal, maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>📑</div>
              <h2 style={s.modalTitle}>Z-Rapport · Dagafsluiting</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#8b949e' }}>
                {new Date(endReport.startTime).toLocaleDateString('nl-NL')} ·{' '}
                {new Date(endReport.startTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - {new Date(endReport.endTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div style={s.reportGrid}>
              <div style={{ ...s.breakdownRow, fontWeight: 'bold', fontSize: '16px' }}><span>Totaal omzet</span><span style={{ color: '#3fb950' }}>{formatPrice(endReport.stats?.totalRevenue || 0)}</span></div>
              <div style={s.breakdownRow}><span>Bestellingen</span><span>{endReport.stats?.totalOrders || 0}</span></div>
              <div style={s.breakdownRow}><span>Items verkocht</span><span>{endReport.stats?.itemsSold || 0}</span></div>
              <div style={s.breakdownRow}><span>Gem. bonbedrag</span><span>{formatPrice(endReport.stats?.avgOrder || 0)}</span></div>
              <div style={s.breakdownRow}><span>Geannuleerd</span><span style={{ color: '#f85149' }}>{endReport.stats?.cancelledOrders || 0}</span></div>

              <div style={{ ...s.breakdownRow, borderTop: '1px solid #30363d', paddingTop: '8px', marginTop: '4px' }}><span>💵 Contant</span><span>{formatPrice(endReport.stats?.cashTotal || 0)}</span></div>
              <div style={s.breakdownRow}><span>💳 PIN</span><span>{formatPrice(endReport.stats?.pinTotal || 0)}</span></div>
              <div style={s.breakdownRow}><span>📱 Online</span><span>{formatPrice(endReport.stats?.onlineTotal || 0)}</span></div>

              <div style={{ ...s.breakdownRow, borderTop: '1px solid #30363d', paddingTop: '8px', marginTop: '4px' }}><span>BTW (9%)</span><span>{formatPrice(endReport.stats?.totalBTW || 0)}</span></div>
              <div style={s.breakdownRow}><span>Korting</span><span style={{ color: '#f85149' }}>-{formatPrice(endReport.stats?.discountTotal || 0)}</span></div>

              <div style={{ ...s.breakdownRow, borderTop: '2px solid #30363d', paddingTop: '10px', marginTop: '6px' }}><span>Startkassa</span><span>{formatPrice(endReport.startCash || 0)}</span></div>
              <div style={s.breakdownRow}><span>Verwacht in kassa</span><span>{formatPrice(endReport.expectedCash)}</span></div>
              <div style={s.breakdownRow}><span>Geteld in kassa</span><span style={{ fontWeight: 'bold' }}>{formatPrice(endReport.actualCash)}</span></div>
              <div style={{ ...s.breakdownRow, fontWeight: 'bold', fontSize: '18px', borderTop: '2px solid #30363d', paddingTop: '10px', marginTop: '6px' }}>
                <span>Verschil</span>
                <span style={{ color: endReport.difference === 0 ? '#3fb950' : endReport.withinTolerance ? '#f0883e' : '#f85149' }}>
                  {endReport.difference >= 0 ? '+' : ''}{formatPrice(endReport.difference)}
                </span>
              </div>
              {endReport.withinTolerance && endReport.difference !== 0 && (
                <div style={{ textAlign: 'center', padding: '4px', fontSize: '11px', color: '#f0883e' }}>Binnen tolerantie</div>
              )}
            </div>
            <button onClick={() => setShowReport(false)} style={{ ...s.actionBtn, background: '#238636', marginTop: '16px' }}>Sluiten</button>
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
  title: { margin: 0, fontSize: '22px', fontWeight: 'bold' },
  statusBadge: { marginLeft: 'auto', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: '#fff' },

  tabBar: { display: 'flex', gap: '4px', padding: '10px 24px', background: '#161b22', borderBottom: '1px solid #30363d', flexWrap: 'wrap' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1px solid transparent', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  tabBtnActive: { background: 'rgba(35,134,54,0.15)', borderColor: '#238636', color: '#3fb950' },
  tabCount: { background: 'rgba(255,255,255,0.1)', padding: '1px 7px', borderRadius: '8px', fontSize: '11px' },

  content: { padding: '16px 24px' },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' },

  card: { background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', padding: '24px' },
  cardTitle: { margin: '0 0 16px', fontSize: '18px', fontWeight: 'bold' },
  hint: { margin: '0 0 16px', fontSize: '13px', color: '#8b949e' },
  subTitle: { margin: '16px 0 8px', fontSize: '12px', fontWeight: '700', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px' },

  periodInfo: { background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', marginBottom: '16px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#8b949e' },

  kassaStand: { background: 'rgba(63,185,80,0.04)', borderRadius: '8px', padding: '14px', border: '1px solid rgba(63,185,80,0.15)' },
  calcRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' },

  cashInputGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#8b949e', marginBottom: '6px' },
  cashInputRow: { display: 'flex', alignItems: 'center', border: '2px solid #30363d', borderRadius: '8px', background: '#0d1117', overflow: 'hidden' },
  euro: { padding: '10px 12px', fontSize: '16px', color: '#8b949e', background: 'rgba(255,255,255,0.03)' },
  cashInput: { flex: 1, padding: '10px 12px', border: 'none', background: 'transparent', color: '#e6edf3', fontSize: '18px', fontWeight: 'bold', outline: 'none' },
  textInput: { width: '100%', padding: '10px 12px', border: '2px solid #30363d', borderRadius: '8px', background: '#0d1117', color: '#e6edf3', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '10px 12px', border: '2px solid #30363d', borderRadius: '8px', background: '#0d1117', color: '#e6edf3', fontSize: '14px', outline: 'none' },
  formGroup: { marginBottom: '14px' },
  actionBtn: { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },

  toggleRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' },
  toggleLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#8b949e', cursor: 'pointer' },

  denomGrid: { marginBottom: '12px' },
  denomRow: { display: 'grid', gridTemplateColumns: '60px 80px 1fr', gap: '8px', alignItems: 'center', padding: '4px 0' },
  denomLabel: { fontSize: '13px', fontWeight: '600', color: '#e6edf3' },
  denomInput: { padding: '6px 8px', border: '1px solid #30363d', borderRadius: '6px', background: '#0d1117', color: '#e6edf3', fontSize: '14px', textAlign: 'center', outline: 'none', width: '100%', boxSizing: 'border-box' },
  denomTotal: { fontSize: '12px', color: '#8b949e', textAlign: 'right' },
  denomSumRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', borderTop: '2px solid #30363d', marginTop: '8px', color: '#e6edf3' },

  confirmBox: { background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px', border: '1px solid #30363d' },
  confirmRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' },
  toleranceBadge: { textAlign: 'center', padding: '6px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', marginTop: '8px' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' },
  statBox: { background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px', textAlign: 'center' },
  statVal: { fontSize: '20px', fontWeight: 'bold', color: '#e6edf3' },
  statLabel: { fontSize: '10px', color: '#8b949e', marginTop: '4px', textTransform: 'uppercase' },

  breakdownList: { background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '8px 12px' },
  breakdownRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' },

  noData: { textAlign: 'center', padding: '40px', color: '#8b949e', fontSize: '13px' },

  kasboekList: { maxHeight: '50vh', overflowY: 'auto' },
  kasboekRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid rgba(48,54,61,0.5)', fontSize: '13px' },
  directionBadge: { padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', minWidth: '36px', textAlign: 'center' },

  historyList: { maxHeight: '60vh', overflowY: 'auto' },
  historyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid rgba(48,54,61,0.5)', cursor: 'pointer', gap: '12px' },
  historyDetails: { padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #30363d' },

  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  reportModal: { background: '#161b22', borderRadius: '16px', border: '1px solid #30363d', padding: '28px', width: '440px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { margin: '0 0 6px', fontSize: '20px', fontWeight: 'bold', textAlign: 'center' },
  reportGrid: { background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '12px 14px' },
};
