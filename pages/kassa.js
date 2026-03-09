import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  getCategories,
  getMenuItems,
  getCustomizationOptions,
  saveOrder,
  getNextOrderNumber,
  formatPrice,
} from '../lib/pos-data';

// Category colors for the grid buttons (Lightspeed style)
const CATEGORY_COLORS = {
  burgers: '#c0392b',
  chicken: '#d35400',
  fries: '#f39c12',
  drinks: '#2980b9',
  desserts: '#8e44ad',
  menu: '#27ae60',
  sauzen: '#16a085',
  extras: '#7f8c8d',
};

export default function Kassa() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('burgers');
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [orderType, setOrderType] = useState('afhalen');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [customizationOptions, setCustomizationOptions] = useState({});

  // Customization modal state
  const [showCustomization, setShowCustomization] = useState(false);
  const [customizingItem, setCustomizingItem] = useState(null);
  const [customSelections, setCustomSelections] = useState({});

  // Variation selection state
  const [selectedVariation, setSelectedVariation] = useState(null);

  // Cash payment state
  const [showCashInput, setShowCashInput] = useState(false);
  const [cashGiven, setCashGiven] = useState('');

  useEffect(() => {
    async function loadData() {
      const [cats, items, customs] = await Promise.all([
        getCategories(),
        getMenuItems(),
        getCustomizationOptions(),
      ]);
      setCategories(cats);
      setMenuItems(items);
      setCustomizationOptions(customs);
    }
    loadData();
  }, []);

  const filteredItems = menuItems.filter(item => {
    if (!item.available) return false;
    if (searchQuery) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return item.category === activeCategory;
  });

  const hasCustomization = (item) => {
    const hasOptions = customizationOptions[item.category] && customizationOptions[item.category].length > 0;
    const hasVariations = item.variations && item.variations.length > 0;
    return hasOptions || hasVariations;
  };

  const handleProductClick = useCallback((item) => {
    if (hasCustomization(item)) {
      setCustomizingItem(item);
      // Set default variation
      if (item.variations && item.variations.length > 0) {
        setSelectedVariation(item.variations[0]);
      } else {
        setSelectedVariation(null);
      }
      const groups = customizationOptions[item.category] || [];
      const defaults = {};
      groups.forEach(group => {
        if (group.type === 'single') {
          defaults[group.name] = group.options[0]?.name || '';
        } else if (group.type === 'multi') {
          defaults[group.name] = group.defaultSelected ? [...group.defaultSelected] : [];
        }
      });
      setCustomSelections(defaults);
      setShowCustomization(true);
    } else {
      addToCart(item, null, null);
    }
  }, [menuItems, customizationOptions]);

  const addToCart = useCallback((item, customizations, variation) => {
    setCart(prev => {
      if (!customizations && !variation) {
        // No customizations - merge by product id
        const existing = prev.find(c => c.id === item.id && !c.customizations && !c.variation);
        if (existing) {
          return prev.map(c => c.cartId === existing.cartId ? { ...c, quantity: c.quantity + 1 } : c);
        }
        return [...prev, { ...item, cartId: `${item.id}-plain`, quantity: 1, customizations: null, variation: null, extraPrice: 0 }];
      } else {
        // With customizations/variation - always new entry
        const extraPrice = calculateExtraPrice(item.category, customizations);
        const itemPrice = variation ? variation.price : item.price;
        return [...prev, {
          ...item,
          price: itemPrice,
          cartId: `${item.id}-${Date.now()}`,
          quantity: 1,
          customizations,
          variation: variation ? variation.name : null,
          extraPrice,
        }];
      }
    });
  }, []);

  const calculateExtraPrice = (category, customizations) => {
    if (!customizations || !customizationOptions[category]) return 0;
    let extra = 0;
    customizationOptions[category].forEach(group => {
      if (group.type === 'single') {
        const selected = group.options.find(o => o.name === customizations[group.name]);
        if (selected) extra += selected.price;
      } else if (group.type === 'multi') {
        const selectedNames = customizations[group.name] || [];
        selectedNames.forEach(name => {
          const opt = group.options.find(o => o.name === name);
          if (opt) extra += opt.price;
        });
      }
    });
    return extra;
  };

  const confirmCustomization = () => {
    if (customizingItem) {
      addToCart(customizingItem, { ...customSelections }, selectedVariation);
      setShowCustomization(false);
      setCustomizingItem(null);
      setSelectedVariation(null);
    }
  };

  const updateQuantity = useCallback((cartId, delta) => {
    setCart(prev => {
      return prev
        .map(c => c.cartId === cartId ? { ...c, quantity: c.quantity + delta } : c)
        .filter(c => c.quantity > 0);
    });
  }, []);

  const removeFromCart = useCallback((cartId) => {
    setCart(prev => prev.filter(c => c.cartId !== cartId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSearchQuery('');
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + (item.price + (item.extraPrice || 0)) * item.quantity, 0);
  const btw = subtotal * 0.09;
  const total = subtotal + btw;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getItemTotal = (item) => (item.price + (item.extraPrice || 0)) * item.quantity;

  const processPayment = async (method, cashInfo) => {
    if (processing) return;
    setProcessing(true);
    try {
      const orderNumber = await getNextOrderNumber();
      const order = {
        id: `ORD-${Date.now()}`,
        number: orderNumber,
        items: cart.map(c => ({
          id: c.id,
          name: c.name,
          price: c.price,
          extraPrice: c.extraPrice || 0,
          quantity: c.quantity,
          customizations: c.customizations || null,
          variation: c.variation || null,
          category: c.category,
        })),
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
      if (cashInfo) {
        order.cashGiven = cashInfo.given;
        order.cashChange = cashInfo.change;
      }
      await saveOrder(order);
      setLastOrder(order);
      setShowPayment(false);
      setShowCashInput(false);
      setCashGiven('');
      setShowReceipt(true);
      setCart([]);
    } catch (err) {
      console.error('Error processing payment:', err);
      alert('Fout bij verwerken bestelling. Probeer opnieuw.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCashPayment = () => {
    setShowCashInput(true);
    setCashGiven('');
  };

  const confirmCashPayment = () => {
    const given = parseFloat(cashGiven);
    if (isNaN(given) || given < total) return;
    processPayment('contant', { given, change: given - total });
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setLastOrder(null);
    setSearchQuery('');
  };

  const getCustomizationSummary = (customizations, category) => {
    if (!customizations) return null;
    const parts = [];
    const groups = customizationOptions[category] || [];
    groups.forEach(group => {
      const val = customizations[group.name];
      if (!val) return;
      if (group.type === 'single' && val && val !== 'Geen saus') {
        parts.push(val);
      } else if (group.type === 'multi' && Array.isArray(val) && val.length > 0) {
        const paidItems = val.filter(name => {
          const opt = group.options.find(o => o.name === name);
          return opt && opt.price > 0;
        });
        const freeItems = val.filter(name => {
          const opt = group.options.find(o => o.name === name);
          return opt && opt.price === 0;
        });
        if (group.name === 'Groenten') {
          parts.push(freeItems.join(', '));
        }
        if (paidItems.length > 0) {
          parts.push(paidItems.join(', '));
        }
      }
    });
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const cashGivenNum = parseFloat(cashGiven) || 0;
  const cashChange = cashGivenNum - total;

  // Get count of items in cart for a product (for badge)
  const getCartCount = (itemId) => {
    return cart.filter(c => c.id === itemId).reduce((sum, c) => sum + c.quantity, 0);
  };

  return (
    <div style={styles.container}>
      {/* LEFT: Order Panel */}
      <div style={styles.orderPanel}>
        <div style={styles.orderHeader}>
          <button onClick={() => router.push('/pos')} style={styles.backBtn}>
            ← Terug
          </button>
          <span style={styles.orderTitle}>Bestelling</span>
          <div style={styles.orderTypePills}>
            <button
              style={{
                ...styles.pillBtn,
                ...(orderType === 'afhalen' ? styles.pillActive : {}),
              }}
              onClick={() => setOrderType('afhalen')}
            >
              Afhalen
            </button>
            <button
              style={{
                ...styles.pillBtn,
                ...(orderType === 'ter plaatse' ? styles.pillActive : {}),
              }}
              onClick={() => setOrderType('ter plaatse')}
            >
              Ter Plaatse
            </button>
          </div>
        </div>

        <div style={styles.orderItems}>
          {cart.length === 0 ? (
            <div style={styles.emptyCart}>
              <div style={{ fontSize: '36px', marginBottom: '8px', opacity: 0.4 }}>🛒</div>
              <div>Geen items</div>
            </div>
          ) : (
            cart.map(item => {
              const summary = getCustomizationSummary(item.customizations, item.category);
              return (
                <div key={item.cartId} style={styles.orderItem}>
                  <div style={styles.orderItemTop}>
                    <div style={styles.orderItemQty}>
                      <button onClick={() => updateQuantity(item.cartId, -1)} style={styles.qtyBtnSmall}>-</button>
                      <span style={styles.qtyNum}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartId, 1)} style={styles.qtyBtnSmall}>+</button>
                    </div>
                    <div style={styles.orderItemDetails}>
                      <div style={styles.orderItemName}>
                        {item.name}
                        {item.variation && <span style={{ color: '#f0883e', fontWeight: '400' }}> ({item.variation})</span>}
                      </div>
                      {summary && (
                        <div style={styles.orderItemCustom}>{summary}</div>
                      )}
                    </div>
                    <div style={styles.orderItemPrice}>
                      {formatPrice(getItemTotal(item))}
                    </div>
                    <button onClick={() => removeFromCart(item.cartId)} style={styles.removeBtn}>×</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Order Totals */}
        <div style={styles.orderTotals}>
          <div style={styles.totalLine}>
            <span>Subtotaal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div style={styles.totalLine}>
            <span>BTW 9%</span>
            <span>{formatPrice(btw)}</span>
          </div>
          <div style={styles.totalLineMain}>
            <span>Totaal</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={styles.orderActions}>
          <button
            onClick={clearCart}
            style={styles.clearOrderBtn}
            disabled={cart.length === 0}
          >
            Wissen
          </button>
          <button
            onClick={() => setShowPayment(true)}
            style={{
              ...styles.checkoutBtn,
              opacity: cart.length === 0 ? 0.5 : 1,
            }}
            disabled={cart.length === 0}
          >
            Afrekenen — {formatPrice(total)}
          </button>
        </div>
      </div>

      {/* MIDDLE: Categories */}
      <div style={styles.categoryPanel}>
        <div style={styles.searchBoxDark}>
          <input
            type="text"
            placeholder="🔍 Zoeken..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={styles.searchInputDark}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={styles.clearSearchDark}>×</button>
          )}
        </div>
        <div style={styles.categoryList}>
          {categories.map(cat => {
            const catColor = CATEGORY_COLORS[cat.id] || '#555';
            const isActive = activeCategory === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
                style={{
                  ...styles.categoryBtn,
                  background: isActive ? catColor : 'rgba(255,255,255,0.08)',
                  borderColor: isActive ? catColor : 'transparent',
                  color: isActive ? '#fff' : '#bbb',
                }}
              >
                <span style={styles.catEmoji}>{cat.icon}</span>
                <span style={styles.catLabel}>{cat.name}</span>
                <span style={styles.catCount}>
                  {menuItems.filter(i => i.category === cat.id && i.available).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Products Grid */}
      <div style={styles.productPanel}>
        <div style={styles.productHeader}>
          <h2 style={styles.productTitle}>
            {searchQuery ? `Zoeken: "${searchQuery}"` : (
              <>
                {categories.find(c => c.id === activeCategory)?.icon}{' '}
                {categories.find(c => c.id === activeCategory)?.name}
              </>
            )}
          </h2>
          <span style={styles.productCount}>{filteredItems.length} items</span>
        </div>
        <div style={styles.productGrid}>
          {filteredItems.length === 0 && (
            <div style={styles.emptyProducts}>
              {searchQuery ? `Geen resultaten voor "${searchQuery}"` : 'Geen producten'}
            </div>
          )}
          {filteredItems.map(item => {
            const count = getCartCount(item.id);
            const catColor = CATEGORY_COLORS[item.category] || '#555';
            return (
              <button
                key={item.id}
                onClick={() => handleProductClick(item)}
                style={{
                  ...styles.productBtn,
                  borderColor: count > 0 ? '#27ae60' : catColor,
                  borderTopWidth: '3px',
                }}
              >
                <div style={styles.productName}>{item.name}</div>
                <div style={styles.productPrice}>{formatPrice(item.price)}</div>
                {count > 0 && (
                  <div style={styles.productBadge}>{count}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CUSTOMIZATION MODAL */}
      {showCustomization && customizingItem && (
        <div style={styles.modalOverlay} onClick={() => setShowCustomization(false)}>
          <div style={styles.customModal} onClick={e => e.stopPropagation()}>
            <div style={styles.customHeader}>
              <h2 style={styles.customTitle}>{customizingItem.name}</h2>
              <span style={styles.customPrice}>{formatPrice(customizingItem.price)}</span>
            </div>

            <div style={styles.customBody}>
              {/* Variation selector */}
              {customizingItem.variations && customizingItem.variations.length > 0 && (
                <div style={styles.customGroup}>
                  <h3 style={styles.customGroupTitle}>
                    Grootte
                    <span style={styles.customGroupType}>(kies 1)</span>
                  </h3>
                  <div style={styles.customOptions}>
                    {customizingItem.variations.map(v => (
                      <button
                        key={v.name}
                        style={{
                          ...styles.customOptionBtn,
                          background: selectedVariation?.name === v.name ? '#27ae60' : 'rgba(255,255,255,0.08)',
                          borderColor: selectedVariation?.name === v.name ? '#27ae60' : 'rgba(255,255,255,0.15)',
                          color: selectedVariation?.name === v.name ? '#fff' : '#ccc',
                        }}
                        onClick={() => setSelectedVariation(v)}
                      >
                        <span>{v.name}</span>
                        <span style={styles.optionPrice}>{formatPrice(v.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {customizationOptions[customizingItem.category]?.map(group => (
                <div key={group.name} style={styles.customGroup}>
                  <h3 style={styles.customGroupTitle}>
                    {group.name}
                    <span style={styles.customGroupType}>
                      {group.type === 'single' ? '(kies 1)' : '(meerdere)'}
                    </span>
                  </h3>
                  <div style={styles.customOptions}>
                    {group.options.map(opt => {
                      const isSelected = group.type === 'single'
                        ? customSelections[group.name] === opt.name
                        : (customSelections[group.name] || []).includes(opt.name);
                      return (
                        <button
                          key={opt.name}
                          style={{
                            ...styles.customOptionBtn,
                            background: isSelected ? '#27ae60' : 'rgba(255,255,255,0.08)',
                            borderColor: isSelected ? '#27ae60' : 'rgba(255,255,255,0.15)',
                            color: isSelected ? '#fff' : '#ccc',
                          }}
                          onClick={() => {
                            if (group.type === 'single') {
                              setCustomSelections(prev => ({ ...prev, [group.name]: opt.name }));
                            } else {
                              setCustomSelections(prev => {
                                const arr = prev[group.name] || [];
                                if (arr.includes(opt.name)) {
                                  return { ...prev, [group.name]: arr.filter(n => n !== opt.name) };
                                }
                                return { ...prev, [group.name]: [...arr, opt.name] };
                              });
                            }
                          }}
                        >
                          <span>{opt.name}</span>
                          {opt.price > 0 && (
                            <span style={styles.optionPrice}>+{formatPrice(opt.price)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.customFooter}>
              <button onClick={() => setShowCustomization(false)} style={styles.customCancelBtn}>
                Annuleren
              </button>
              <button onClick={confirmCustomization} style={styles.customAddBtn}>
                Toevoegen — {formatPrice((selectedVariation ? selectedVariation.price : customizingItem.price) + calculateExtraPrice(customizingItem.category, customSelections))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPayment && !showCashInput && (
        <div style={styles.modalOverlay} onClick={() => setShowPayment(false)}>
          <div style={styles.paymentModal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.payModalTitle}>Afrekenen</h2>
            <div style={styles.payTotal}>
              <span style={styles.payTotalLabel}>Te betalen</span>
              <span style={styles.payTotalAmount}>{formatPrice(total)}</span>
            </div>
            <div style={styles.payMethods}>
              <button onClick={() => processPayment('pin')} style={{ ...styles.payMethodBtn, borderColor: '#3498db' }} disabled={processing}>
                <span style={{ fontSize: '36px' }}>💳</span>
                <span style={styles.payMethodLabel}>PIN</span>
              </button>
              <button onClick={handleCashPayment} style={{ ...styles.payMethodBtn, borderColor: '#27ae60' }} disabled={processing}>
                <span style={{ fontSize: '36px' }}>💵</span>
                <span style={styles.payMethodLabel}>Contant</span>
              </button>
              <button onClick={() => processPayment('online')} style={{ ...styles.payMethodBtn, borderColor: '#9b59b6' }} disabled={processing}>
                <span style={{ fontSize: '36px' }}>📱</span>
                <span style={styles.payMethodLabel}>Online</span>
              </button>
            </div>
            <button onClick={() => setShowPayment(false)} style={styles.payCancelBtn}>
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* CASH INPUT MODAL */}
      {showPayment && showCashInput && (
        <div style={styles.modalOverlay} onClick={() => { setShowCashInput(false); }}>
          <div style={styles.cashModal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.payModalTitle}>Contant Betalen</h2>
            <div style={styles.cashTotalRow}>
              <span>Te betalen:</span>
              <span style={styles.cashTotalAmount}>{formatPrice(total)}</span>
            </div>

            <div style={styles.cashQuickBtns}>
              {[5, 10, 20, 50, 100].map(amount => (
                <button
                  key={amount}
                  style={{
                    ...styles.cashQuickBtn,
                    opacity: amount < total ? 0.4 : 1,
                  }}
                  onClick={() => setCashGiven(String(amount))}
                  disabled={amount < total}
                >
                  €{amount}
                </button>
              ))}
              <button
                style={styles.cashQuickBtnExact}
                onClick={() => setCashGiven(total.toFixed(2))}
              >
                Exact
              </button>
            </div>

            <div style={styles.cashInputRow}>
              <label style={styles.cashInputLabel}>Ontvangen bedrag:</label>
              <div style={styles.cashInputWrapper}>
                <span style={styles.cashEuro}>€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashGiven}
                  onChange={e => setCashGiven(e.target.value)}
                  style={styles.cashInput}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            {cashGivenNum >= total && cashGiven !== '' && (
              <div style={styles.changeBox}>
                <span style={styles.changeLabel}>Wisselgeld terug:</span>
                <span style={styles.changeAmount}>{formatPrice(cashChange)}</span>
              </div>
            )}

            {cashGivenNum > 0 && cashGivenNum < total && (
              <div style={styles.changeBoxError}>
                <span>Onvoldoende — nog {formatPrice(total - cashGivenNum)} nodig</span>
              </div>
            )}

            <div style={styles.cashActions}>
              <button onClick={() => setShowCashInput(false)} style={styles.payCancelBtn}>
                ← Terug
              </button>
              <button
                onClick={confirmCashPayment}
                style={{
                  ...styles.cashConfirmBtn,
                  opacity: cashGivenNum >= total && cashGiven !== '' ? 1 : 0.4,
                }}
                disabled={cashGivenNum < total || cashGiven === '' || processing}
              >
                {processing ? 'Verwerken...' : 'Bevestig Betaling'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceipt && lastOrder && (
        <div style={styles.modalOverlay} onClick={closeReceipt}>
          <div style={styles.receiptModal} onClick={e => e.stopPropagation()}>
            <div style={styles.receiptContent}>
              <div style={styles.receiptHeader}>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff' }}>
                  BESTELLING #{lastOrder.number}
                </div>
                <div style={styles.receiptBadge}>
                  {lastOrder.orderType === 'afhalen' ? '📦 Afhalen' : '🍽 Ter Plaatse'}
                </div>
              </div>

              <div style={styles.receiptDivider} />

              {lastOrder.items.map((item, i) => {
                const cat = item.category || (menuItems.find(m => m.id === item.id)?.category) || '';
                const summary = item.customizations ? getCustomizationSummary(item.customizations, cat) : null;
                return (
                  <div key={i}>
                    <div style={styles.receiptItem}>
                      <span>{item.quantity}x {item.name}{item.variation ? ` (${item.variation})` : ''}</span>
                      <span>{formatPrice((item.price + (item.extraPrice || 0)) * item.quantity)}</span>
                    </div>
                    {summary && (
                      <div style={styles.receiptCustom}>{summary}</div>
                    )}
                  </div>
                );
              })}

              <div style={styles.receiptDivider} />

              <div style={styles.receiptItem}>
                <span>Subtotaal</span>
                <span>{formatPrice(lastOrder.subtotal)}</span>
              </div>
              <div style={styles.receiptItem}>
                <span>BTW (9%)</span>
                <span>{formatPrice(lastOrder.btw)}</span>
              </div>
              <div style={{ ...styles.receiptItem, fontWeight: 'bold', fontSize: '18px', color: '#fff' }}>
                <span>Totaal</span>
                <span>{formatPrice(lastOrder.total)}</span>
              </div>

              <div style={styles.receiptDivider} />

              <div style={{ textAlign: 'center', color: '#999' }}>
                <div>Betaald met: {lastOrder.paymentMethod.toUpperCase()}</div>
                {lastOrder.cashGiven && (
                  <>
                    <div style={{ marginTop: '4px' }}>
                      Ontvangen: {formatPrice(lastOrder.cashGiven)}
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#27ae60', fontSize: '16px' }}>
                      Wisselgeld: {formatPrice(lastOrder.cashChange)}
                    </div>
                  </>
                )}
                <div style={{ marginTop: '4px' }}>{lastOrder.date} {lastOrder.time}</div>
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
  // ===== LAYOUT =====
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#0d1117',
    color: '#e6edf3',
    overflow: 'hidden',
  },

  // ===== LEFT: ORDER PANEL =====
  orderPanel: {
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
    background: '#161b22',
    borderRight: '1px solid #30363d',
  },
  orderHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #30363d',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  backBtn: {
    padding: '6px 12px',
    border: '1px solid #30363d',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.05)',
    color: '#8b949e',
    cursor: 'pointer',
    fontSize: '13px',
    alignSelf: 'flex-start',
  },
  orderTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#e6edf3',
  },
  orderTypePills: {
    display: 'flex',
    gap: '4px',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#0d1117',
    padding: '3px',
  },
  pillBtn: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    background: 'transparent',
    color: '#8b949e',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.15s',
  },
  pillActive: {
    background: '#238636',
    color: '#fff',
  },

  // Order Items
  orderItems: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  emptyCart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#484f58',
    fontSize: '14px',
  },
  orderItem: {
    padding: '10px 12px',
    marginBottom: '4px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.04)',
    borderLeft: '3px solid #238636',
  },
  orderItemTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  orderItemQty: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  qtyBtnSmall: {
    width: '24px',
    height: '24px',
    border: '1px solid #30363d',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.06)',
    color: '#e6edf3',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  qtyNum: {
    fontSize: '14px',
    fontWeight: 'bold',
    minWidth: '20px',
    textAlign: 'center',
    color: '#e6edf3',
  },
  orderItemDetails: {
    flex: 1,
    minWidth: 0,
  },
  orderItemName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e6edf3',
  },
  orderItemCustom: {
    fontSize: '11px',
    color: '#8b949e',
    marginTop: '2px',
    lineHeight: '1.3',
  },
  orderItemPrice: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#e6edf3',
    whiteSpace: 'nowrap',
  },
  removeBtn: {
    border: 'none',
    background: 'none',
    color: '#f85149',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '0 4px',
    lineHeight: '1',
  },

  // Order Totals
  orderTotals: {
    padding: '12px 16px',
    borderTop: '1px solid #30363d',
    background: 'rgba(255,255,255,0.02)',
  },
  totalLine: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    fontSize: '13px',
    color: '#8b949e',
  },
  totalLineMain: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0 0',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    borderTop: '1px solid #30363d',
    marginTop: '6px',
  },

  // Order Actions
  orderActions: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #30363d',
  },
  clearOrderBtn: {
    padding: '12px 16px',
    border: '1px solid #30363d',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)',
    color: '#8b949e',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  checkoutBtn: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    borderRadius: '8px',
    background: '#238636',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    transition: 'all 0.15s',
  },

  // ===== MIDDLE: CATEGORIES =====
  categoryPanel: {
    width: '160px',
    display: 'flex',
    flexDirection: 'column',
    background: '#161b22',
    borderRight: '1px solid #30363d',
  },
  searchBoxDark: {
    position: 'relative',
    padding: '12px 10px',
    borderBottom: '1px solid #30363d',
  },
  searchInputDark: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #30363d',
    borderRadius: '6px',
    background: '#0d1117',
    color: '#e6edf3',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  clearSearchDark: {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    fontSize: '16px',
  },
  categoryList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  categoryBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 8px',
    border: '2px solid transparent',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.15s',
    textAlign: 'center',
    position: 'relative',
  },
  catEmoji: {
    fontSize: '22px',
    marginBottom: '4px',
  },
  catLabel: {
    fontSize: '11px',
    fontWeight: '600',
    lineHeight: '1.2',
  },
  catCount: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    fontSize: '10px',
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '8px',
    padding: '1px 5px',
    color: '#8b949e',
  },

  // ===== RIGHT: PRODUCTS =====
  productPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#0d1117',
    overflow: 'hidden',
  },
  productHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #30363d',
  },
  productTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#e6edf3',
  },
  productCount: {
    fontSize: '13px',
    color: '#8b949e',
  },
  productGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '10px',
    padding: '16px 20px',
    overflowY: 'auto',
    alignContent: 'start',
  },
  emptyProducts: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    color: '#484f58',
    fontSize: '15px',
  },
  productBtn: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '18px 12px',
    border: '2px solid #30363d',
    borderRadius: '10px',
    background: '#161b22',
    cursor: 'pointer',
    transition: 'all 0.12s',
    minHeight: '90px',
    textAlign: 'center',
    color: '#e6edf3',
    borderTopStyle: 'solid',
  },
  productName: {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '6px',
    color: '#e6edf3',
    lineHeight: '1.2',
  },
  productPrice: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#f0883e',
  },
  productBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#238636',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
  },

  // ===== MODALS =====
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  // Customization Modal
  customModal: {
    background: '#161b22',
    borderRadius: '16px',
    border: '1px solid #30363d',
    width: '520px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
  },
  customHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #30363d',
  },
  customTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#e6edf3',
  },
  customPrice: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#f0883e',
  },
  customBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
  },
  customGroup: {
    marginBottom: '20px',
  },
  customGroupTitle: {
    margin: '0 0 10px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#e6edf3',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  customGroupType: {
    marginLeft: '8px',
    fontSize: '11px',
    fontWeight: '400',
    color: '#8b949e',
    textTransform: 'none',
    letterSpacing: '0',
  },
  customOptions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  customOptionBtn: {
    padding: '10px 16px',
    border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.12s',
  },
  optionPrice: {
    fontSize: '11px',
    opacity: 0.8,
    fontWeight: '600',
  },
  customFooter: {
    display: 'flex',
    gap: '10px',
    padding: '16px 24px',
    borderTop: '1px solid #30363d',
  },
  customCancelBtn: {
    padding: '12px 20px',
    border: '1px solid #30363d',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)',
    color: '#8b949e',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  customAddBtn: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    borderRadius: '8px',
    background: '#238636',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
  },

  // Payment Modal
  paymentModal: {
    background: '#161b22',
    borderRadius: '16px',
    border: '1px solid #30363d',
    padding: '32px',
    width: '440px',
    textAlign: 'center',
  },
  payModalTitle: {
    margin: '0 0 20px',
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#e6edf3',
  },
  payTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  payTotalLabel: {
    fontSize: '15px',
    color: '#8b949e',
  },
  payTotalAmount: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#f0883e',
  },
  payMethods: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  payMethodBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 12px',
    border: '2px solid #30363d',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.04)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    color: '#e6edf3',
  },
  payMethodLabel: {
    fontSize: '14px',
    fontWeight: '600',
  },
  payCancelBtn: {
    padding: '10px 24px',
    border: '1px solid #30363d',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)',
    color: '#8b949e',
    cursor: 'pointer',
    fontSize: '14px',
  },

  // Cash Modal
  cashModal: {
    background: '#161b22',
    borderRadius: '16px',
    border: '1px solid #30363d',
    padding: '32px',
    width: '440px',
  },
  cashTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '15px',
    color: '#8b949e',
  },
  cashTotalAmount: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#f0883e',
  },
  cashQuickBtns: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  cashQuickBtn: {
    flex: 1,
    minWidth: '60px',
    padding: '12px 8px',
    border: '2px solid #30363d',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.06)',
    color: '#e6edf3',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    transition: 'all 0.12s',
  },
  cashQuickBtnExact: {
    flex: 1,
    minWidth: '60px',
    padding: '12px 8px',
    border: '2px solid #238636',
    borderRadius: '8px',
    background: 'rgba(35,134,54,0.15)',
    color: '#3fb950',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  cashInputRow: {
    marginBottom: '16px',
  },
  cashInputLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#8b949e',
    marginBottom: '6px',
  },
  cashInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '2px solid #30363d',
    borderRadius: '8px',
    background: '#0d1117',
    overflow: 'hidden',
  },
  cashEuro: {
    padding: '12px 14px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#8b949e',
    background: 'rgba(255,255,255,0.04)',
    borderRight: '1px solid #30363d',
  },
  cashInput: {
    flex: 1,
    padding: '12px 14px',
    border: 'none',
    background: 'transparent',
    color: '#e6edf3',
    fontSize: '20px',
    fontWeight: 'bold',
    outline: 'none',
  },
  changeBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    background: 'rgba(35,134,54,0.12)',
    border: '1px solid rgba(35,134,54,0.3)',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  changeLabel: {
    fontSize: '14px',
    color: '#8b949e',
  },
  changeAmount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#3fb950',
  },
  changeBoxError: {
    padding: '12px 18px',
    background: 'rgba(248,81,73,0.1)',
    border: '1px solid rgba(248,81,73,0.3)',
    borderRadius: '10px',
    marginBottom: '20px',
    color: '#f85149',
    fontSize: '13px',
    textAlign: 'center',
  },
  cashActions: {
    display: 'flex',
    gap: '10px',
  },
  cashConfirmBtn: {
    flex: 1,
    padding: '14px',
    border: 'none',
    borderRadius: '8px',
    background: '#238636',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },

  // Receipt Modal
  receiptModal: {
    background: '#161b22',
    borderRadius: '16px',
    border: '1px solid #30363d',
    padding: '28px',
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
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '20px',
    fontSize: '13px',
    color: '#8b949e',
  },
  receiptDivider: {
    borderTop: '1px dashed #30363d',
    margin: '12px 0',
  },
  receiptItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '14px',
    color: '#8b949e',
  },
  receiptCustom: {
    fontSize: '11px',
    color: '#484f58',
    paddingLeft: '20px',
    paddingBottom: '2px',
  },
  receiptCloseBtn: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '10px',
    background: '#238636',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
