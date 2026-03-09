import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getOrders, updateOrder, formatPrice } from '../lib/pos-data';

export default function Keuken() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('actief');

  const loadOrders = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const allOrders = await getOrders();
    setOrders(allOrders.filter(o => o.date === today));
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const updateStatus = async (orderId, status) => {
    await updateOrder(orderId, { status });
    await loadOrders();
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'actief') return o.status === 'nieuw' || o.status === 'bezig';
    if (filter === 'klaar') return o.status === 'klaar';
    return true;
  });

  const statusColors = {
    nieuw: '#e74c3c',
    bezig: '#f39c12',
    klaar: '#27ae60',
    afgehaald: '#95a5a6',
  };

  const statusLabels = {
    nieuw: 'Nieuw',
    bezig: 'In Bereiding',
    klaar: 'Klaar',
    afgehaald: 'Afgehaald',
  };

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button onClick={() => router.push('/pos')} style={styles.backBtn}>← Terug</button>
        <h1 style={styles.title}>Keuken Display</h1>
        <div style={styles.filterGroup}>
          {['actief', 'klaar', 'alles'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterBtn,
                ...(filter === f ? styles.filterBtnActive : {}),
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span style={styles.filterCount}>
                {f === 'actief'
                  ? orders.filter(o => o.status === 'nieuw' || o.status === 'bezig').length
                  : f === 'klaar'
                  ? orders.filter(o => o.status === 'klaar').length
                  : orders.length}
              </span>
            </button>
          ))}
        </div>
        <div style={styles.clock}>{new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      <div style={styles.ordersGrid}>
        {filteredOrders.length === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>
              {filter === 'actief' ? '✅' : '📋'}
            </div>
            <div style={{ fontSize: '20px', color: '#666' }}>
              {filter === 'actief' ? 'Geen actieve bestellingen' : 'Geen bestellingen'}
            </div>
          </div>
        )}

        {filteredOrders.map(order => (
          <div
            key={order.id}
            style={{
              ...styles.orderCard,
              borderTop: `4px solid ${statusColors[order.status]}`,
            }}
          >
            <div style={styles.orderHeader}>
              <div>
                <span style={styles.orderNumber}>#{order.number}</span>
                <span style={{
                  ...styles.statusBadge,
                  background: statusColors[order.status] + '20',
                  color: statusColors[order.status],
                }}>
                  {statusLabels[order.status]}
                </span>
              </div>
              <div style={styles.orderMeta}>
                <span>{order.time}</span>
                <span style={styles.orderType}>
                  {order.orderType === 'afhalen' ? '📦 Afhalen' : '🍽 Ter Plaatse'}
                </span>
              </div>
            </div>

            <div style={styles.orderItems}>
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
                    <div style={styles.orderItem}>
                      <span style={styles.itemQty}>{item.quantity}x</span>
                      <span style={styles.itemName}>{item.name}</span>
                    </div>
                    {customParts.length > 0 && (
                      <div style={styles.itemCustom}>
                        {customParts.join(' · ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={styles.orderActions}>
              {order.status === 'nieuw' && (
                <button
                  onClick={() => updateStatus(order.id, 'bezig')}
                  style={{ ...styles.actionBtn, background: '#f39c12' }}
                >
                  Start Bereiding
                </button>
              )}
              {order.status === 'bezig' && (
                <button
                  onClick={() => updateStatus(order.id, 'klaar')}
                  style={{ ...styles.actionBtn, background: '#27ae60' }}
                >
                  Klaar!
                </button>
              )}
              {order.status === 'klaar' && (
                <button
                  onClick={() => updateStatus(order.id, 'afgehaald')}
                  style={{ ...styles.actionBtn, background: '#95a5a6' }}
                >
                  Afgehaald
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '16px 24px',
    background: '#16213e',
    borderBottom: '1px solid #2a2a4a',
  },
  backBtn: {
    padding: '8px 16px',
    border: '1px solid #444',
    borderRadius: '8px',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#fff',
  },
  filterGroup: {
    display: 'flex',
    gap: '8px',
    marginLeft: 'auto',
  },
  filterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    border: '1px solid #444',
    borderRadius: '8px',
    background: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '13px',
  },
  filterBtnActive: {
    background: '#e74c3c',
    borderColor: '#e74c3c',
    color: '#fff',
  },
  filterCount: {
    background: 'rgba(255,255,255,0.2)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
  },
  clock: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  ordersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
    padding: '20px',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px',
  },
  orderCard: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  orderHeader: {
    padding: '14px 16px',
    borderBottom: '1px solid #f0f0f0',
  },
  orderNumber: {
    fontSize: '22px',
    fontWeight: 'bold',
    marginRight: '10px',
    color: '#1a1a2e',
  },
  statusBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  orderMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '6px',
    fontSize: '13px',
    color: '#888',
  },
  orderType: {
    fontWeight: '500',
  },
  orderItems: {
    padding: '12px 16px',
  },
  orderItem: {
    padding: '6px 0',
    display: 'flex',
    gap: '10px',
    fontSize: '15px',
  },
  itemQty: {
    fontWeight: 'bold',
    color: '#e74c3c',
    minWidth: '28px',
  },
  itemName: {
    color: '#333',
  },
  itemCustom: {
    fontSize: '12px',
    color: '#888',
    paddingLeft: '38px',
    paddingBottom: '4px',
    fontStyle: 'italic',
    lineHeight: '1.3',
  },
  orderActions: {
    padding: '12px 16px',
    borderTop: '1px solid #f0f0f0',
  },
  actionBtn: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};
