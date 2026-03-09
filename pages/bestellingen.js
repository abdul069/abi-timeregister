import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getOrders, formatPrice } from '../lib/pos-data';

export default function Bestellingen() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      const allOrders = await getOrders();
      setOrders(allOrders);
      setLoading(false);
    }
    loadOrders();
  }, []);

  const filteredOrders = orders.filter(o => o.date === selectedDate);

  // Stats
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const paymentBreakdown = filteredOrders.reduce((acc, o) => {
    acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total;
    return acc;
  }, {});

  // Popular items
  const itemCounts = {};
  filteredOrders.forEach(o => {
    o.items.forEach(item => {
      if (!itemCounts[item.name]) itemCounts[item.name] = { name: item.name, qty: 0, revenue: 0 };
      itemCounts[item.name].qty += item.quantity;
      itemCounts[item.name].revenue += item.price * item.quantity;
    });
  });
  const popularItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 10);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>Laden...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button onClick={() => router.push('/pos')} style={styles.backBtn}>← Terug</button>
        <h1 style={styles.title}>Bestellingen & Rapporten</h1>
        <div style={styles.dateSelector}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={styles.dateInput}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Totale Omzet</div>
          <div style={{ ...styles.statValue, color: '#27ae60' }}>{formatPrice(totalRevenue)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Aantal Bestellingen</div>
          <div style={{ ...styles.statValue, color: '#3498db' }}>{totalOrders}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Gem. Bestelling</div>
          <div style={{ ...styles.statValue, color: '#e67e22' }}>{formatPrice(avgOrderValue)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Betaalmethode</div>
          <div style={styles.paymentList}>
            {Object.entries(paymentBreakdown).map(([method, amount]) => (
              <div key={method} style={styles.paymentItem}>
                <span style={{ textTransform: 'capitalize' }}>{method}</span>
                <span style={{ fontWeight: 'bold' }}>{formatPrice(amount)}</span>
              </div>
            ))}
            {Object.keys(paymentBreakdown).length === 0 && (
              <div style={{ color: '#999', fontSize: '13px' }}>Geen data</div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Popular Items */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Populaire Producten</h2>
          <div style={styles.popularList}>
            {popularItems.length === 0 && (
              <div style={{ color: '#999', padding: '20px', textAlign: 'center' }}>Geen data voor deze dag</div>
            )}
            {popularItems.map((item, i) => (
              <div key={item.name} style={styles.popularItem}>
                <span style={styles.popularRank}>#{i + 1}</span>
                <span style={styles.popularName}>{item.name}</span>
                <span style={styles.popularQty}>{item.qty}x</span>
                <span style={styles.popularRevenue}>{formatPrice(item.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order List */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Alle Bestellingen ({filteredOrders.length})</h2>
          <div style={styles.orderList}>
            {filteredOrders.length === 0 && (
              <div style={{ color: '#999', padding: '20px', textAlign: 'center' }}>Geen bestellingen op deze dag</div>
            )}
            {filteredOrders.map(order => (
              <div key={order.id}>
                <div
                  style={styles.orderRow}
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <span style={styles.orderNum}>#{order.number}</span>
                  <span style={styles.orderTime}>{order.time}</span>
                  <span style={{
                    ...styles.orderStatus,
                    color: order.status === 'klaar' || order.status === 'afgehaald' ? '#27ae60' : '#f39c12',
                  }}>
                    {order.status}
                  </span>
                  <span style={styles.orderTypeLabel}>
                    {order.orderType === 'afhalen' ? '📦' : '🍽'}
                  </span>
                  <span style={styles.orderPayment}>{order.paymentMethod}</span>
                  <span style={styles.orderTotal}>{formatPrice(order.total)}</span>
                  <span>{expandedOrder === order.id ? '▲' : '▼'}</span>
                </div>
                {expandedOrder === order.id && (
                  <div style={styles.orderDetails}>
                    {order.items.map((item, i) => (
                      <div key={i} style={styles.detailItem}>
                        <span>{item.quantity}x {item.name}</span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div style={{ ...styles.detailItem, fontWeight: 'bold', borderTop: '1px solid #eee', paddingTop: '8px', marginTop: '4px' }}>
                      <span>Totaal (incl. BTW)</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f0f2f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 24px',
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  backBtn: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  dateSelector: {
    marginLeft: 'auto',
  },
  dateInput: {
    padding: '8px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    padding: '20px 24px',
  },
  statCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  statLabel: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
  },
  paymentList: {
    marginTop: '4px',
  },
  paymentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    padding: '2px 0',
    color: '#333',
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '16px',
    padding: '0 24px 24px',
  },
  section: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  sectionTitle: {
    margin: 0,
    padding: '16px 20px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1a1a2e',
    borderBottom: '1px solid #f0f0f0',
  },
  popularList: {
    padding: '8px 0',
  },
  popularItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 20px',
    borderBottom: '1px solid #f8f8f8',
  },
  popularRank: {
    color: '#999',
    fontSize: '13px',
    minWidth: '28px',
  },
  popularName: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
  },
  popularQty: {
    fontSize: '13px',
    color: '#666',
    background: '#f0f0f0',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  popularRevenue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#27ae60',
    minWidth: '70px',
    textAlign: 'right',
  },
  orderList: {
    maxHeight: '500px',
    overflowY: 'auto',
  },
  orderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    borderBottom: '1px solid #f5f5f5',
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontSize: '14px',
  },
  orderNum: {
    fontWeight: 'bold',
    minWidth: '50px',
    color: '#1a1a2e',
  },
  orderTime: {
    color: '#888',
    minWidth: '50px',
  },
  orderStatus: {
    fontWeight: '500',
    textTransform: 'capitalize',
    minWidth: '70px',
  },
  orderTypeLabel: {
    fontSize: '16px',
  },
  orderPayment: {
    color: '#666',
    textTransform: 'capitalize',
    minWidth: '60px',
  },
  orderTotal: {
    fontWeight: 'bold',
    color: '#1a1a2e',
    minWidth: '70px',
    textAlign: 'right',
  },
  orderDetails: {
    padding: '12px 20px 12px 80px',
    background: '#fafafa',
    borderBottom: '1px solid #f0f0f0',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '13px',
    color: '#555',
  },
};
