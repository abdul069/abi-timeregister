import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  getCategories,
  getMenuItems,
  saveOrder,
  getNextOrderNumber,
  formatPrice,
} from '../lib/pos-data';

export default function Kassa() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('burgers');
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [orderType, setOrderType] = useState('afhalen'); // afhalen / ter plaatse
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setCategories(getCategories());
    setMenuItems(getMenuItems());
  }, []);

  const filteredItems = menuItems.filter(item => {
    if (!item.available) return false;
    if (searchQuery) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return item.category === activeCategory;
  });

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((itemId, delta) => {
    setCart(prev => {
      return prev
        .map(c => c.id === itemId ? { ...c, quantity: c.quantity + delta } : c)
        .filter(c => c.quantity > 0);
    });
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCart(prev => prev.filter(c => c.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSearchQuery('');
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const btw = subtotal * 0.09; // 9% BTW
  const total = subtotal + btw;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const processPayment = (method) => {
    const orderNumber = getNextOrderNumber();
    const order = {
      id: `ORD-${Date.now()}`,
      number: orderNumber,
      items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, quantity: c.quantity })),
      subtotal,
      btw,
      total,
      paymentMethod: method,
      orderType,
      status: 'nieuw',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
    };
    saveOrder(order);
    setLastOrder(order);
    setShowPayment(false);
    setShowReceipt(true);
    setCart([]);
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setLastOrder(null);
    setSearchQuery('');
  };

  return (
    <div style={styles.container}>
      {/* Left: Categories + Products */}
      <div style={styles.leftPanel}>
        {/* Top bar */}
        <div style={styles.topBar}>
          <button onClick={() => router.push('/')} style={styles.backBtn}>← Terug</button>
          <h1 style={styles.title}>Kassa</h1>
          <div style={styles.orderTypeToggle}>
            <button
              style={{
                ...styles.typeBtn,
                ...(orderType === 'afhalen' ? styles.typeBtnActive : {}),
              }}
              onClick={() => setOrderType('afhalen')}
            >
              Afhalen
            </button>
            <button
              style={{
                ...styles.typeBtn,
                ...(orderType === 'ter plaatse' ? styles.typeBtnActive : {}),
              }}
              onClick={() => setOrderType('ter plaatse')}
            >
              Ter Plaatse
            </button>
          </div>
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="Zoek product..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={styles.clearSearch}>×</button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div style={styles.categoriesBar}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
              style={{
                ...styles.categoryBtn,
                borderBottom: activeCategory === cat.id && !searchQuery ? `3px solid ${cat.color}` : '3px solid transparent',
                color: activeCategory === cat.id && !searchQuery ? cat.color : '#666',
                fontWeight: activeCategory === cat.id && !searchQuery ? 'bold' : 'normal',
              }}
            >
              <span style={styles.catIcon}>{cat.icon}</span>
              <span style={styles.catName}>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div style={styles.productGrid}>
          {filteredItems.length === 0 && (
            <div style={styles.emptyState}>
              {searchQuery ? `Geen resultaten voor "${searchQuery}"` : 'Geen producten in deze categorie'}
            </div>
          )}
          {filteredItems.map(item => {
            const inCart = cart.find(c => c.id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                style={{
                  ...styles.productBtn,
                  borderColor: inCart ? '#e74c3c' : '#e0e0e0',
                  boxShadow: inCart ? '0 0 0 2px #e74c3c' : 'none',
                }}
              >
                <div style={styles.productName}>{item.name}</div>
                <div style={styles.productPrice}>{formatPrice(item.price)}</div>
                {inCart && (
                  <div style={styles.cartBadge}>{inCart.quantity}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Cart / Order Summary */}
      <div style={styles.rightPanel}>
        <div style={styles.cartHeader}>
          <h2 style={styles.cartTitle}>Bestelling</h2>
          <span style={styles.cartCount}>{totalItems} items</span>
        </div>

        <div style={styles.cartItems}>
          {cart.length === 0 ? (
            <div style={styles.emptyCart}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛒</div>
              <div>Tik op een product om toe te voegen</div>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} style={styles.cartItem}>
                <div style={styles.cartItemInfo}>
                  <div style={styles.cartItemName}>{item.name}</div>
                  <div style={styles.cartItemPrice}>{formatPrice(item.price * item.quantity)}</div>
                </div>
                <div style={styles.cartItemActions}>
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    style={styles.qtyBtn}
                  >−</button>
                  <span style={styles.qtyDisplay}>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    style={styles.qtyBtn}
                  >+</button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    style={styles.deleteBtn}
                  >🗑</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div style={styles.totalsSection}>
          <div style={styles.totalRow}>
            <span>Subtotaal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div style={styles.totalRow}>
            <span>BTW (9%)</span>
            <span>{formatPrice(btw)}</span>
          </div>
          <div style={styles.totalRowBig}>
            <span>Totaal</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionButtons}>
          <button
            onClick={clearCart}
            style={styles.clearBtn}
            disabled={cart.length === 0}
          >
            Wissen
          </button>
          <button
            onClick={() => setShowPayment(true)}
            style={{
              ...styles.payBtn,
              opacity: cart.length === 0 ? 0.5 : 1,
            }}
            disabled={cart.length === 0}
          >
            Afrekenen — {formatPrice(total)}
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div style={styles.modalOverlay} onClick={() => setShowPayment(false)}>
          <div style={styles.paymentModal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Afrekenen</h2>
            <div style={styles.modalTotal}>
              <span>Te betalen:</span>
              <span style={styles.modalAmount}>{formatPrice(total)}</span>
            </div>
            <div style={styles.paymentMethods}>
              <button onClick={() => processPayment('pin')} style={styles.payMethodBtn}>
                <span style={{ fontSize: '40px' }}>💳</span>
                <span>PIN</span>
              </button>
              <button onClick={() => processPayment('contant')} style={styles.payMethodBtn}>
                <span style={{ fontSize: '40px' }}>💵</span>
                <span>Contant</span>
              </button>
              <button onClick={() => processPayment('online')} style={styles.payMethodBtn}>
                <span style={{ fontSize: '40px' }}>📱</span>
                <span>Online</span>
              </button>
            </div>
            <button onClick={() => setShowPayment(false)} style={styles.cancelBtn}>
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastOrder && (
        <div style={styles.modalOverlay} onClick={closeReceipt}>
          <div style={styles.receiptModal} onClick={e => e.stopPropagation()}>
            <div style={styles.receiptContent}>
              <div style={styles.receiptHeader}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>BESTELLING #{lastOrder.number}</div>
                <div style={styles.receiptBadge}>
                  {lastOrder.orderType === 'afhalen' ? '📦 Afhalen' : '🍽 Ter Plaatse'}
                </div>
              </div>

              <div style={styles.receiptDivider} />

              {lastOrder.items.map((item, i) => (
                <div key={i} style={styles.receiptItem}>
                  <span>{item.quantity}x {item.name}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}

              <div style={styles.receiptDivider} />

              <div style={styles.receiptItem}>
                <span>Subtotaal</span>
                <span>{formatPrice(lastOrder.subtotal)}</span>
              </div>
              <div style={styles.receiptItem}>
                <span>BTW (9%)</span>
                <span>{formatPrice(lastOrder.btw)}</span>
              </div>
              <div style={{ ...styles.receiptItem, fontWeight: 'bold', fontSize: '20px' }}>
                <span>Totaal</span>
                <span>{formatPrice(lastOrder.total)}</span>
              </div>

              <div style={styles.receiptDivider} />

              <div style={{ textAlign: 'center', color: '#666' }}>
                <div>Betaald met: {lastOrder.paymentMethod.toUpperCase()}</div>
                <div>{lastOrder.date} {lastOrder.time}</div>
              </div>
            </div>

            <button onClick={closeReceipt} style={styles.receiptCloseBtn}>
              Volgende Bestelling
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#f0f2f5',
    overflow: 'hidden',
  },
  leftPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 20px',
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
    flexWrap: 'wrap',
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
  orderTypeToggle: {
    display: 'flex',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #ddd',
  },
  typeBtn: {
    padding: '8px 16px',
    border: 'none',
    background: '#f5f5f5',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  typeBtnActive: {
    background: '#e74c3c',
    color: '#fff',
  },
  searchBox: {
    position: 'relative',
    marginLeft: 'auto',
  },
  searchInput: {
    padding: '8px 36px 8px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    width: '200px',
    outline: 'none',
  },
  clearSearch: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#999',
  },
  categoriesBar: {
    display: 'flex',
    gap: '4px',
    padding: '0 16px',
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
    overflowX: 'auto',
  },
  categoryBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 14px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    minWidth: '70px',
  },
  catIcon: {
    fontSize: '22px',
    marginBottom: '4px',
  },
  catName: {
    fontSize: '11px',
  },
  productGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '10px',
    padding: '16px',
    overflowY: 'auto',
    alignContent: 'start',
  },
  productBtn: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 10px',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s',
    minHeight: '90px',
    textAlign: 'center',
  },
  productName: {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '6px',
    color: '#333',
    lineHeight: '1.2',
  },
  productPrice: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  cartBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: '#e74c3c',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    color: '#999',
    fontSize: '16px',
  },
  rightPanel: {
    width: '360px',
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    borderLeft: '1px solid #e0e0e0',
    boxShadow: '-2px 0 10px rgba(0,0,0,0.05)',
  },
  cartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
  },
  cartTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  cartCount: {
    fontSize: '13px',
    color: '#999',
    background: '#f0f0f0',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  cartItems: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px 20px',
  },
  emptyCart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#999',
    fontSize: '14px',
    textAlign: 'center',
  },
  cartItem: {
    padding: '10px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  cartItemInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  cartItemName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  cartItemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  qtyBtn: {
    width: '30px',
    height: '30px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    background: '#f9f9f9',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  qtyDisplay: {
    fontSize: '15px',
    fontWeight: 'bold',
    minWidth: '24px',
    textAlign: 'center',
  },
  deleteBtn: {
    marginLeft: 'auto',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
  },
  totalsSection: {
    padding: '12px 20px',
    borderTop: '1px solid #e0e0e0',
    background: '#fafafa',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '13px',
    color: '#666',
  },
  totalRowBig: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0 0',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1a1a2e',
    borderTop: '1px solid #e0e0e0',
    marginTop: '6px',
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    padding: '16px 20px',
    borderTop: '1px solid #e0e0e0',
  },
  clearBtn: {
    padding: '14px 20px',
    border: '1px solid #ddd',
    borderRadius: '10px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
  },
  payBtn: {
    flex: 1,
    padding: '14px 20px',
    border: 'none',
    borderRadius: '10px',
    background: '#e74c3c',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  paymentModal: {
    background: '#fff',
    borderRadius: '20px',
    padding: '32px',
    width: '420px',
    textAlign: 'center',
  },
  modalTitle: {
    margin: '0 0 20px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  modalTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f9f9f9',
    borderRadius: '12px',
    marginBottom: '24px',
    fontSize: '16px',
  },
  modalAmount: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  paymentMethods: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
  },
  payMethodBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '20px',
    border: '2px solid #e0e0e0',
    borderRadius: '14px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  cancelBtn: {
    padding: '12px 24px',
    border: '1px solid #ddd',
    borderRadius: '10px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#666',
  },
  receiptModal: {
    background: '#fff',
    borderRadius: '20px',
    padding: '32px',
    width: '380px',
  },
  receiptContent: {
    marginBottom: '20px',
  },
  receiptHeader: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  receiptBadge: {
    display: 'inline-block',
    marginTop: '8px',
    padding: '4px 12px',
    background: '#f0f0f0',
    borderRadius: '20px',
    fontSize: '14px',
  },
  receiptDivider: {
    borderTop: '1px dashed #ddd',
    margin: '12px 0',
  },
  receiptItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '14px',
  },
  receiptCloseBtn: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '10px',
    background: '#27ae60',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
