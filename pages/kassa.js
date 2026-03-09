import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  getCategories,
  getMenuItems,
  getModifierGroups,
  getModifierLinks,
  resolveModifierGroups,
  saveOrder,
  getNextOrderNumber,
  formatPrice,
  getParkedOrders,
  parkOrder,
  recallParkedOrder,
  getPendingIncomingOrders,
  acceptIncomingOrder,
  rejectIncomingOrder,
} from '../lib/pos-data';

export default function Kassa() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [orderType, setOrderType] = useState('afhalen');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [allModifierGroups, setAllModifierGroups] = useState([]);
  const [allModifierLinks, setAllModifierLinks] = useState([]);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [currentTime, setCurrentTime] = useState('');

  // Customization modal state
  const [showCustomization, setShowCustomization] = useState(false);
  const [customizingItem, setCustomizingItem] = useState(null);
  const [customSelections, setCustomSelections] = useState({});
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [itemNote, setItemNote] = useState('');

  // Cash payment state
  const [showCashInput, setShowCashInput] = useState(false);
  const [cashGiven, setCashGiven] = useState('');

  // Selected cart item (for actions)
  const [selectedCartItem, setSelectedCartItem] = useState(null);

  // Discount state
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [ticketDiscount, setTicketDiscount] = useState(null);

  // Parked orders
  const [showParked, setShowParked] = useState(false);
  const [parkedOrders, setParkedOrders] = useState([]);

  // Order note
  const [showOrderNote, setShowOrderNote] = useState(false);
  const [orderNote, setOrderNote] = useState('');

  // Numpad for quantity
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadValue, setNumpadValue] = useState('');
  const [numpadTarget, setNumpadTarget] = useState(null);

  // Incoming platform orders (Takeaway.com)
  const [incomingOrders, setIncomingOrders] = useState([]);
  const [showIncoming, setShowIncoming] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    async function loadData() {
      const [cats, items, groups, links, parked] = await Promise.all([
        getCategories(),
        getMenuItems(),
        getModifierGroups(),
        getModifierLinks(),
        getParkedOrders(),
      ]);
      setCategories(cats);
      setMenuItems(items);
      setAllModifierGroups(groups);
      setAllModifierLinks(links);
      setParkedOrders(parked);
      if (cats.length > 0) setActiveCategory(cats[0].id);
    }
    loadData();

    // Check staff from sessionStorage
    const staff = sessionStorage.getItem('posStaff');
    if (staff) setCurrentStaff(JSON.parse(staff));

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    // Poll for incoming delivery platform orders
    const checkIncoming = async () => {
      try {
        const pending = await getPendingIncomingOrders();
        setIncomingOrders(pending);
      } catch (e) { /* ignore */ }
    };
    checkIncoming();
    const incomingInterval = setInterval(checkIncoming, 10000);

    return () => { clearInterval(clockInterval); clearInterval(incomingInterval); };
  }, []);

  const filteredItems = menuItems.filter(item => {
    if (!item.available) return false;
    if (searchQuery) return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return item.category === activeCategory;
  });

  const handleProductClick = useCallback((item) => {
    const groups = resolveModifierGroups(item, allModifierGroups, allModifierLinks);
    const hasVariations = item.variations && item.variations.length > 0;

    if (groups.length > 0 || hasVariations) {
      setCustomizingItem(item);
      setSelectedVariation(hasVariations ? item.variations[0] : null);
      setItemNote('');
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
      addToCart(item, null, null, '');
    }
  }, [menuItems, allModifierGroups, allModifierLinks]);

  const addToCart = useCallback((item, customizations, variation, note) => {
    setCart(prev => {
      if (!customizations && !variation && !note) {
        const existing = prev.find(c => c.id === item.id && !c.customizations && !c.variation && !c.note);
        if (existing) {
          return prev.map(c => c.cartId === existing.cartId ? { ...c, quantity: c.quantity + 1 } : c);
        }
        return [...prev, { ...item, cartId: `${item.id}-plain`, quantity: 1, customizations: null, variation: null, extraPrice: 0, note: '', discount: null }];
      } else {
        const extraPrice = calculateExtraPrice(item, customizations);
        const itemPrice = variation ? variation.price : item.price;
        return [...prev, {
          ...item,
          price: itemPrice,
          cartId: `${item.id}-${Date.now()}`,
          quantity: 1,
          customizations,
          variation: variation ? variation.name : null,
          extraPrice,
          note: note || '',
          discount: null,
        }];
      }
    });
    setSelectedCartItem(null);
  }, [allModifierGroups, allModifierLinks]);

  const calculateExtraPrice = (item, customizations) => {
    if (!customizations) return 0;
    const groups = resolveModifierGroups(item, allModifierGroups, allModifierLinks);
    let extra = 0;
    groups.forEach(group => {
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
      addToCart(customizingItem, { ...customSelections }, selectedVariation, itemNote);
      setShowCustomization(false);
      setCustomizingItem(null);
      setSelectedVariation(null);
      setItemNote('');
    }
  };

  const updateQuantity = useCallback((cartId, delta) => {
    setCart(prev => prev.map(c => c.cartId === cartId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  }, []);

  const removeFromCart = useCallback((cartId) => {
    setCart(prev => prev.filter(c => c.cartId !== cartId));
    setSelectedCartItem(null);
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSearchQuery('');
    setSelectedCartItem(null);
    setTicketDiscount(null);
    setOrderNote('');
  }, []);

  // Calculate totals with discounts
  const getItemFinalPrice = (item) => {
    let basePrice = (item.price + (item.extraPrice || 0)) * item.quantity;
    if (item.discount) {
      if (item.discount.type === 'percent') {
        basePrice -= basePrice * (item.discount.value / 100);
      } else {
        basePrice -= item.discount.value;
      }
    }
    return Math.max(0, basePrice);
  };

  const subtotal = cart.reduce((sum, item) => sum + getItemFinalPrice(item), 0);
  const ticketDiscountAmount = ticketDiscount
    ? ticketDiscount.type === 'percent'
      ? subtotal * (ticketDiscount.value / 100)
      : ticketDiscount.value
    : 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - ticketDiscountAmount);
  const btw = subtotalAfterDiscount * 0.09;
  const total = subtotalAfterDiscount + btw;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Apply item discount
  const applyItemDiscount = () => {
    if (!selectedCartItem || !discountValue) return;
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return;
    setCart(prev => prev.map(c =>
      c.cartId === selectedCartItem ? { ...c, discount: { type: discountType, value: val } } : c
    ));
    setShowDiscount(false);
    setDiscountValue('');
  };

  // Apply ticket discount
  const applyTicketDiscount = () => {
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return;
    setTicketDiscount({ type: discountType, value: val });
    setShowDiscount(false);
    setDiscountValue('');
  };

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
          note: c.note || '',
          discount: c.discount || null,
        })),
        subtotal: subtotalAfterDiscount,
        btw,
        total,
        ticketDiscount: ticketDiscount || null,
        paymentMethod: method,
        orderType,
        orderNote: orderNote || '',
        status: 'nieuw',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        staffId: currentStaff?.id || null,
        staffName: currentStaff?.name || null,
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
      setTicketDiscount(null);
      setOrderNote('');
      setSelectedCartItem(null);
    } catch (err) {
      console.error('Error processing payment:', err);
      alert('Fout bij verwerken bestelling.');
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

  // Park order
  const handleParkOrder = async () => {
    if (cart.length === 0) return;
    const order = {
      items: [...cart],
      orderType,
      orderNote,
      ticketDiscount,
    };
    const updated = await parkOrder(order);
    setParkedOrders(updated);
    clearCart();
  };

  // Recall parked order
  const handleRecallOrder = async (parkedId) => {
    const order = await recallParkedOrder(parkedId);
    if (order) {
      setCart(order.items || []);
      setOrderType(order.orderType || 'afhalen');
      setOrderNote(order.orderNote || '');
      setTicketDiscount(order.ticketDiscount || null);
      const updated = await getParkedOrders();
      setParkedOrders(updated);
    }
    setShowParked(false);
  };

  const getCustomizationSummary = (customizations, item) => {
    if (!customizations) return null;
    const parts = [];
    const groups = resolveModifierGroups(item, allModifierGroups, allModifierLinks);
    groups.forEach(group => {
      const val = customizations[group.name];
      if (!val) return;
      if (group.type === 'single' && val && val !== 'Geen saus') {
        parts.push(val);
      } else if (group.type === 'multi' && Array.isArray(val) && val.length > 0) {
        parts.push(val.join(', '));
      }
    });
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const cashGivenNum = parseFloat(cashGiven) || 0;
  const cashChange = cashGivenNum - total;

  const getCartCount = (itemId) => cart.filter(c => c.id === itemId).reduce((sum, c) => sum + c.quantity, 0);

  // Numpad handler for cash
  const handleCashNumpad = (key) => {
    if (key === 'C') {
      setCashGiven('');
    } else if (key === '⌫') {
      setCashGiven(prev => prev.slice(0, -1));
    } else if (key === '.' && cashGiven.includes('.')) {
      return;
    } else {
      setCashGiven(prev => prev + key);
    }
  };

  const handleAcceptIncoming = async (order) => {
    const staffId = currentStaff?.id || 'system';
    await acceptIncomingOrder(order._docId, staffId);
    setIncomingOrders(prev => prev.filter(o => o._docId !== order._docId));
  };

  const handleRejectIncoming = async (order) => {
    const staffId = currentStaff?.id || 'system';
    await rejectIncomingOrder(order._docId, rejectReason || 'Te druk', staffId);
    setIncomingOrders(prev => prev.filter(o => o._docId !== order._docId));
    setRejectReason('');
  };

  return (
    <div style={st.container}>
      {/* Incoming Platform Orders Banner */}
      {incomingOrders.length > 0 && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900, background: '#FF8000', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'pulse 1s infinite' }}>
          <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>
            🟠 {incomingOrders.length} nieuwe Takeaway bestelling{incomingOrders.length > 1 ? 'en' : ''}!
          </span>
          <button onClick={() => setShowIncoming(true)} style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', background: '#fff', color: '#FF8000', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
            Bekijk &amp; Accepteer
          </button>
        </div>
      )}

      {/* Incoming Orders Modal */}
      {showIncoming && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowIncoming(false)}>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '24px', width: '600px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', color: '#e6edf3', fontSize: '18px' }}>🟠 Inkomende Bestellingen ({incomingOrders.length})</h2>
            {incomingOrders.map(order => (
              <div key={order._docId} style={{ background: '#0d1117', border: '1px solid #FF800040', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#e6edf3' }}>#{order.platformOrderId}</span>
                    <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', background: '#FF800020', color: '#FF8000', fontSize: '11px' }}>{order.platform}</span>
                  </div>
                  <span style={{ fontWeight: 'bold', color: '#3fb950', fontSize: '18px' }}>{formatPrice(order.total || 0)}</span>
                </div>
                {order.customerName && <div style={{ fontSize: '13px', color: '#8b949e', marginBottom: '4px' }}>👤 {order.customerName}</div>}
                {order.customerAddress && <div style={{ fontSize: '13px', color: '#8b949e', marginBottom: '4px' }}>📍 {order.customerAddress}</div>}
                {order.customerPhone && <div style={{ fontSize: '13px', color: '#8b949e', marginBottom: '4px' }}>📞 {order.customerPhone}</div>}
                {order.deliveryNotes && <div style={{ fontSize: '13px', color: '#d29922', marginBottom: '4px' }}>📝 {order.deliveryNotes}</div>}
                <div style={{ margin: '8px 0', borderTop: '1px solid #21262d', paddingTop: '8px' }}>
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#e6edf3', padding: '2px 0' }}>
                      <span>{item.quantity}x {item.name}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button onClick={() => handleAcceptIncoming(order)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                    ✅ Accepteren
                  </button>
                  <button onClick={() => handleRejectIncoming(order)} style={{ flex: 1, padding: '10px', border: '1px solid #f85149', borderRadius: '8px', background: 'transparent', color: '#f85149', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                    ❌ Weigeren
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setShowIncoming(false)} style={{ width: '100%', padding: '10px', border: '1px solid #30363d', borderRadius: '8px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '14px', marginTop: '8px' }}>
              Sluiten
            </button>
          </div>
        </div>
      )}

      {/* LEFT: Order Panel */}
      <div style={st.orderPanel}>
        {/* Staff & Time header */}
        <div style={st.staffBar}>
          <span style={st.staffName}>{currentStaff?.name || 'Kassier'}</span>
          <span style={st.clock}>{currentTime}</span>
        </div>

        <div style={st.orderHeader}>
          <div style={st.orderTypePills}>
            {['afhalen', 'ter plaatse', 'bezorgen'].map(type => (
              <button
                key={type}
                style={{ ...st.pillBtn, ...(orderType === type ? st.pillActive : {}) }}
                onClick={() => setOrderType(type)}
              >
                {type === 'afhalen' ? '📦' : type === 'ter plaatse' ? '🍽' : '🚗'} {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Order items list */}
        <div style={st.orderItems}>
          {cart.length === 0 ? (
            <div style={st.emptyCart}>
              <div style={{ fontSize: '42px', opacity: 0.3 }}>🛒</div>
              <div style={{ marginTop: '8px' }}>Geen items</div>
              <div style={{ fontSize: '11px', color: '#484f58', marginTop: '4px' }}>Klik op een product om toe te voegen</div>
            </div>
          ) : (
            cart.map(item => {
              const summary = getCustomizationSummary(item.customizations, item);
              const isSelected = selectedCartItem === item.cartId;
              return (
                <div
                  key={item.cartId}
                  style={{ ...st.orderItem, ...(isSelected ? st.orderItemSelected : {}) }}
                  onClick={() => setSelectedCartItem(isSelected ? null : item.cartId)}
                >
                  <div style={st.orderItemTop}>
                    <div style={st.orderItemQty}>
                      <button onClick={e => { e.stopPropagation(); updateQuantity(item.cartId, -1); }} style={st.qtyBtnSmall}>-</button>
                      <span style={st.qtyNum}>{item.quantity}</span>
                      <button onClick={e => { e.stopPropagation(); updateQuantity(item.cartId, 1); }} style={st.qtyBtnSmall}>+</button>
                    </div>
                    <div style={st.orderItemDetails}>
                      <div style={st.orderItemName}>
                        {item.name}
                        {item.variation && <span style={{ color: '#f0883e', fontWeight: '400' }}> ({item.variation})</span>}
                      </div>
                      {summary && <div style={st.orderItemCustom}>{summary}</div>}
                      {item.note && <div style={{ fontSize: '10px', color: '#f0883e', fontStyle: 'italic' }}>📝 {item.note}</div>}
                      {item.discount && (
                        <div style={{ fontSize: '10px', color: '#f85149' }}>
                          🏷 -{item.discount.type === 'percent' ? `${item.discount.value}%` : formatPrice(item.discount.value)}
                        </div>
                      )}
                    </div>
                    <div style={st.orderItemPrice}>
                      {formatPrice(getItemFinalPrice(item))}
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeFromCart(item.cartId); }} style={st.removeBtn}>×</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick actions for selected item */}
        {selectedCartItem && (
          <div style={st.quickActions}>
            <button onClick={() => { setShowDiscount(true); setDiscountType('percent'); setDiscountValue(''); }} style={st.quickActionBtn}>
              🏷 Korting
            </button>
            <button onClick={() => removeFromCart(selectedCartItem)} style={{ ...st.quickActionBtn, color: '#f85149' }}>
              🗑 Verwijder
            </button>
          </div>
        )}

        {/* Order Note */}
        {orderNote && (
          <div style={st.orderNoteBar}>
            📝 {orderNote}
          </div>
        )}

        {/* Ticket discount display */}
        {ticketDiscount && (
          <div style={st.ticketDiscountBar}>
            <span>🏷 Ticket Korting: -{ticketDiscount.type === 'percent' ? `${ticketDiscount.value}%` : formatPrice(ticketDiscount.value)}</span>
            <button onClick={() => setTicketDiscount(null)} style={st.ticketDiscountRemove}>×</button>
          </div>
        )}

        {/* Totals */}
        <div style={st.orderTotals}>
          <div style={st.totalLine}>
            <span>Subtotaal ({totalItems} items)</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {ticketDiscountAmount > 0 && (
            <div style={{ ...st.totalLine, color: '#f85149' }}>
              <span>Korting</span>
              <span>-{formatPrice(ticketDiscountAmount)}</span>
            </div>
          )}
          <div style={st.totalLine}>
            <span>BTW 9%</span>
            <span>{formatPrice(btw)}</span>
          </div>
          <div style={st.totalLineMain}>
            <span>TOTAAL</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        {/* Bottom action bar */}
        <div style={st.actionBar}>
          <div style={st.actionRow}>
            <button onClick={() => router.push('/pos')} style={st.actionBtnSmall} title="Terug">←</button>
            <button onClick={() => setShowOrderNote(true)} style={st.actionBtnSmall} title="Opmerking">📝</button>
            <button onClick={() => { setShowDiscount(true); setDiscountType('percent'); setDiscountValue(''); setSelectedCartItem(null); }} style={st.actionBtnSmall} title="Ticket Korting" disabled={cart.length === 0}>🏷</button>
            <button onClick={handleParkOrder} style={st.actionBtnSmall} title="Parkeren" disabled={cart.length === 0}>⏸</button>
            <button onClick={() => setShowParked(true)} style={{ ...st.actionBtnSmall, position: 'relative' }} title="Geparkeerd">
              📋
              {parkedOrders.length > 0 && <span style={st.parkedBadge}>{parkedOrders.length}</span>}
            </button>
          </div>
          <div style={st.actionRow}>
            <button onClick={clearCart} style={st.clearBtn} disabled={cart.length === 0}>
              Wissen
            </button>
            <button
              onClick={() => setShowPayment(true)}
              style={{ ...st.checkoutBtn, opacity: cart.length === 0 ? 0.4 : 1 }}
              disabled={cart.length === 0}
            >
              Afrekenen — {formatPrice(total)}
            </button>
          </div>
        </div>
      </div>

      {/* MIDDLE: Categories */}
      <div style={st.categoryPanel}>
        <div style={st.searchBox}>
          <input
            type="text"
            placeholder="Zoeken..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={st.searchInput}
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} style={st.clearSearch}>×</button>}
        </div>
        <div style={st.categoryList}>
          {categories.map(cat => {
            const isActive = activeCategory === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
                style={{
                  ...st.categoryBtn,
                  background: isActive ? (cat.color || '#555') : 'rgba(255,255,255,0.06)',
                  borderColor: isActive ? (cat.color || '#555') : 'transparent',
                  color: isActive ? '#fff' : '#999',
                }}
              >
                <span style={st.catEmoji}>{cat.icon}</span>
                <span style={st.catLabel}>{cat.name}</span>
                <span style={st.catCount}>{menuItems.filter(i => i.category === cat.id && i.available).length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Products */}
      <div style={st.productPanel}>
        <div style={st.productHeader}>
          <h2 style={st.productTitle}>
            {searchQuery ? `Zoeken: "${searchQuery}"` : (
              <>{categories.find(c => c.id === activeCategory)?.icon} {categories.find(c => c.id === activeCategory)?.name}</>
            )}
          </h2>
          <span style={st.productCount}>{filteredItems.length} items</span>
        </div>
        <div style={st.productGrid}>
          {filteredItems.length === 0 && (
            <div style={st.emptyProducts}>{searchQuery ? 'Geen resultaten' : 'Geen producten'}</div>
          )}
          {filteredItems.map(item => {
            const count = getCartCount(item.id);
            const catColor = categories.find(c => c.id === item.category)?.color || '#555';
            return (
              <button
                key={item.id}
                onClick={() => handleProductClick(item)}
                style={{
                  ...st.productBtn,
                  borderColor: count > 0 ? '#238636' : catColor,
                  borderTopWidth: '3px',
                }}
              >
                <div style={st.productName}>{item.name}</div>
                <div style={st.productPrice}>
                  {item.variations && item.variations.length > 0
                    ? `vanaf ${formatPrice(Math.min(item.price, ...item.variations.map(v => v.price)))}`
                    : formatPrice(item.price)}
                </div>
                {count > 0 && <div style={st.productBadge}>{count}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== CUSTOMIZATION MODAL ===== */}
      {showCustomization && customizingItem && (
        <div style={st.overlay} onClick={() => setShowCustomization(false)}>
          <div style={st.customModal} onClick={e => e.stopPropagation()}>
            <div style={st.customHeader}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#e6edf3' }}>{customizingItem.name}</h2>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#f0883e' }}>{formatPrice(customizingItem.price)}</span>
            </div>
            <div style={st.customBody}>
              {customizingItem.variations && customizingItem.variations.length > 0 && (
                <div style={st.customGroup}>
                  <h3 style={st.customGroupTitle}>Grootte <span style={st.customGroupType}>(kies 1)</span></h3>
                  <div style={st.customOptions}>
                    {customizingItem.variations.map(v => (
                      <button key={v.name} style={{ ...st.customOptionBtn, ...(selectedVariation?.name === v.name ? st.optionSelected : {}) }} onClick={() => setSelectedVariation(v)}>
                        <span>{v.name}</span>
                        <span style={st.optionPrice}>{formatPrice(v.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {resolveModifierGroups(customizingItem, allModifierGroups, allModifierLinks).map(group => (
                <div key={group.id} style={st.customGroup}>
                  <h3 style={st.customGroupTitle}>
                    {group.name}
                    <span style={st.customGroupType}>{group.type === 'single' ? '(kies 1)' : '(meerdere)'}</span>
                  </h3>
                  <div style={st.customOptions}>
                    {group.options.map(opt => {
                      const isSelected = group.type === 'single'
                        ? customSelections[group.name] === opt.name
                        : (customSelections[group.name] || []).includes(opt.name);
                      return (
                        <button
                          key={opt.name}
                          style={{ ...st.customOptionBtn, ...(isSelected ? st.optionSelected : {}) }}
                          onClick={() => {
                            if (group.type === 'single') {
                              setCustomSelections(prev => ({ ...prev, [group.name]: opt.name }));
                            } else {
                              setCustomSelections(prev => {
                                const arr = prev[group.name] || [];
                                return { ...prev, [group.name]: arr.includes(opt.name) ? arr.filter(n => n !== opt.name) : [...arr, opt.name] };
                              });
                            }
                          }}
                        >
                          <span>{opt.name}</span>
                          {opt.price > 0 && <span style={st.optionPrice}>+{formatPrice(opt.price)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Item note */}
              <div style={st.customGroup}>
                <h3 style={st.customGroupTitle}>Opmerking <span style={st.customGroupType}>(optioneel)</span></h3>
                <input
                  type="text"
                  value={itemNote}
                  onChange={e => setItemNote(e.target.value)}
                  placeholder="bijv. extra gaar, geen ui..."
                  style={st.noteInput}
                />
              </div>
            </div>
            <div style={st.customFooter}>
              <button onClick={() => setShowCustomization(false)} style={st.cancelBtn}>Annuleren</button>
              <button onClick={confirmCustomization} style={st.confirmBtn}>
                Toevoegen — {formatPrice((selectedVariation ? selectedVariation.price : customizingItem.price) + calculateExtraPrice(customizingItem, customSelections))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PAYMENT MODAL ===== */}
      {showPayment && !showCashInput && (
        <div style={st.overlay} onClick={() => setShowPayment(false)}>
          <div style={st.paymentModal} onClick={e => e.stopPropagation()}>
            <h2 style={st.modalTitle}>Afrekenen</h2>
            <div style={st.payTotal}>
              <span style={{ fontSize: '15px', color: '#8b949e' }}>Te betalen</span>
              <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#f0883e' }}>{formatPrice(total)}</span>
            </div>
            <div style={st.payMethods}>
              <button onClick={() => processPayment('pin')} style={{ ...st.payMethodBtn, borderColor: '#3498db' }} disabled={processing}>
                <span style={{ fontSize: '40px' }}>💳</span>
                <span style={{ fontSize: '15px', fontWeight: '700' }}>PIN</span>
              </button>
              <button onClick={handleCashPayment} style={{ ...st.payMethodBtn, borderColor: '#27ae60' }} disabled={processing}>
                <span style={{ fontSize: '40px' }}>💵</span>
                <span style={{ fontSize: '15px', fontWeight: '700' }}>Contant</span>
              </button>
              <button onClick={() => processPayment('online')} style={{ ...st.payMethodBtn, borderColor: '#9b59b6' }} disabled={processing}>
                <span style={{ fontSize: '40px' }}>📱</span>
                <span style={{ fontSize: '15px', fontWeight: '700' }}>Online</span>
              </button>
            </div>
            <button onClick={() => setShowPayment(false)} style={st.cancelBtnFull}>Annuleren</button>
          </div>
        </div>
      )}

      {/* ===== CASH INPUT WITH NUMPAD ===== */}
      {showPayment && showCashInput && (
        <div style={st.overlay} onClick={() => setShowCashInput(false)}>
          <div style={st.cashModal} onClick={e => e.stopPropagation()}>
            <h2 style={st.modalTitle}>Contant Betalen</h2>
            <div style={st.cashTotalRow}>
              <span>Te betalen:</span>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f0883e' }}>{formatPrice(total)}</span>
            </div>

            {/* Quick amounts */}
            <div style={st.cashQuickBtns}>
              {[5, 10, 20, 50, 100].map(amount => (
                <button key={amount} style={{ ...st.cashQuickBtn, opacity: amount < total ? 0.3 : 1 }} onClick={() => setCashGiven(String(amount))} disabled={amount < total}>
                  €{amount}
                </button>
              ))}
              <button style={st.cashQuickBtnExact} onClick={() => setCashGiven(total.toFixed(2))}>Exact</button>
            </div>

            {/* Display */}
            <div style={st.cashDisplay}>
              <span style={st.cashEuroSign}>€</span>
              <span style={st.cashAmount}>{cashGiven || '0.00'}</span>
            </div>

            {/* Numpad */}
            <div style={st.numpadGrid}>
              {['7','8','9','4','5','6','1','2','3','.','0','⌫'].map(key => (
                <button key={key} style={st.numpadBtn} onClick={() => handleCashNumpad(key)}>
                  {key}
                </button>
              ))}
            </div>

            {cashGivenNum >= total && cashGiven !== '' && (
              <div style={st.changeBox}>
                <span style={{ color: '#8b949e' }}>Wisselgeld:</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#3fb950' }}>{formatPrice(cashChange)}</span>
              </div>
            )}

            <div style={st.cashActions}>
              <button onClick={() => setShowCashInput(false)} style={st.cancelBtnHalf}>← Terug</button>
              <button
                onClick={confirmCashPayment}
                style={{ ...st.confirmBtnHalf, opacity: cashGivenNum >= total && cashGiven !== '' ? 1 : 0.4 }}
                disabled={cashGivenNum < total || cashGiven === '' || processing}
              >
                {processing ? 'Verwerken...' : 'Bevestig'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== RECEIPT MODAL ===== */}
      {showReceipt && lastOrder && (
        <div style={st.overlay} onClick={closeReceipt}>
          <div style={st.receiptModal} onClick={e => e.stopPropagation()}>
            <div style={st.receiptContent}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>BESTELLING #{lastOrder.number}</div>
                <div style={st.receiptBadge}>
                  {lastOrder.orderType === 'afhalen' ? '📦 Afhalen' : lastOrder.orderType === 'bezorgen' ? '🚗 Bezorgen' : '🍽 Ter Plaatse'}
                </div>
              </div>
              <div style={st.receiptDivider} />
              {lastOrder.items.map((item, i) => {
                const summary = item.customizations ? getCustomizationSummary(item.customizations, item) : null;
                return (
                  <div key={i}>
                    <div style={st.receiptItem}>
                      <span>{item.quantity}x {item.name}{item.variation ? ` (${item.variation})` : ''}</span>
                      <span>{formatPrice((item.price + (item.extraPrice || 0)) * item.quantity)}</span>
                    </div>
                    {summary && <div style={st.receiptCustom}>{summary}</div>}
                    {item.note && <div style={{ ...st.receiptCustom, color: '#f0883e' }}>📝 {item.note}</div>}
                    {item.discount && (
                      <div style={{ ...st.receiptCustom, color: '#f85149' }}>
                        Korting: -{item.discount.type === 'percent' ? `${item.discount.value}%` : formatPrice(item.discount.value)}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={st.receiptDivider} />
              {lastOrder.ticketDiscount && (
                <div style={{ ...st.receiptItem, color: '#f85149' }}>
                  <span>Ticket Korting</span>
                  <span>-{lastOrder.ticketDiscount.type === 'percent' ? `${lastOrder.ticketDiscount.value}%` : formatPrice(lastOrder.ticketDiscount.value)}</span>
                </div>
              )}
              <div style={st.receiptItem}><span>Subtotaal</span><span>{formatPrice(lastOrder.subtotal)}</span></div>
              <div style={st.receiptItem}><span>BTW (9%)</span><span>{formatPrice(lastOrder.btw)}</span></div>
              <div style={{ ...st.receiptItem, fontWeight: 'bold', fontSize: '20px', color: '#fff' }}>
                <span>TOTAAL</span><span>{formatPrice(lastOrder.total)}</span>
              </div>
              <div style={st.receiptDivider} />
              <div style={{ textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
                <div>Betaald: {lastOrder.paymentMethod.toUpperCase()}</div>
                {lastOrder.cashGiven != null && (
                  <>
                    <div>Ontvangen: {formatPrice(lastOrder.cashGiven)}</div>
                    <div style={{ fontWeight: 'bold', color: '#3fb950', fontSize: '16px' }}>Wisselgeld: {formatPrice(lastOrder.cashChange)}</div>
                  </>
                )}
                {lastOrder.staffName && <div>Medewerker: {lastOrder.staffName}</div>}
                {lastOrder.orderNote && <div style={{ color: '#f0883e' }}>📝 {lastOrder.orderNote}</div>}
                <div style={{ marginTop: '4px' }}>{lastOrder.date} {lastOrder.time}</div>
              </div>
            </div>
            <button onClick={closeReceipt} style={st.receiptCloseBtn}>Volgende Bestelling</button>
          </div>
        </div>
      )}

      {/* ===== DISCOUNT MODAL ===== */}
      {showDiscount && (
        <div style={st.overlay} onClick={() => setShowDiscount(false)}>
          <div style={{ ...st.smallModal }} onClick={e => e.stopPropagation()}>
            <h2 style={st.modalTitle}>{selectedCartItem ? 'Item Korting' : 'Ticket Korting'}</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button style={{ ...st.pillBtn, flex: 1, ...(discountType === 'percent' ? st.pillActive : {}) }} onClick={() => setDiscountType('percent')}>% Procent</button>
              <button style={{ ...st.pillBtn, flex: 1, ...(discountType === 'fixed' ? st.pillActive : {}) }} onClick={() => setDiscountType('fixed')}>€ Vast bedrag</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px', color: '#8b949e' }}>{discountType === 'percent' ? '%' : '€'}</span>
              <input
                type="number"
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
                style={st.noteInput}
                placeholder={discountType === 'percent' ? 'bijv. 10' : 'bijv. 2.50'}
                autoFocus
                min="0"
                step="0.01"
              />
            </div>
            {/* Quick discount buttons */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {(discountType === 'percent' ? [5, 10, 15, 20, 25, 50] : [0.50, 1, 2, 5, 10]).map(v => (
                <button key={v} onClick={() => setDiscountValue(String(v))} style={st.discountQuickBtn}>
                  {discountType === 'percent' ? `${v}%` : formatPrice(v)}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowDiscount(false)} style={st.cancelBtnHalf}>Annuleren</button>
              <button onClick={selectedCartItem ? applyItemDiscount : applyTicketDiscount} style={st.confirmBtnHalf}>Toepassen</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PARKED ORDERS MODAL ===== */}
      {showParked && (
        <div style={st.overlay} onClick={() => setShowParked(false)}>
          <div style={st.smallModal} onClick={e => e.stopPropagation()}>
            <h2 style={st.modalTitle}>Geparkeerde Bestellingen ({parkedOrders.length})</h2>
            {parkedOrders.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8b949e', padding: '24px' }}>Geen geparkeerde bestellingen</div>
            ) : (
              parkedOrders.map(p => (
                <div key={p.parkedId} style={st.parkedCard}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#e6edf3' }}>
                      {p.items.length} items — {formatPrice(p.items.reduce((s, i) => s + (i.price + (i.extraPrice || 0)) * i.quantity, 0))}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>
                      {p.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>
                    <div style={{ fontSize: '10px', color: '#484f58', marginTop: '2px' }}>
                      Geparkeerd: {new Date(p.parkedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button onClick={() => handleRecallOrder(p.parkedId)} style={st.recallBtn}>Ophalen</button>
                </div>
              ))
            )}
            <button onClick={() => setShowParked(false)} style={{ ...st.cancelBtnFull, marginTop: '12px' }}>Sluiten</button>
          </div>
        </div>
      )}

      {/* ===== ORDER NOTE MODAL ===== */}
      {showOrderNote && (
        <div style={st.overlay} onClick={() => setShowOrderNote(false)}>
          <div style={st.smallModal} onClick={e => e.stopPropagation()}>
            <h2 style={st.modalTitle}>Bestelling Opmerking</h2>
            <textarea
              value={orderNote}
              onChange={e => setOrderNote(e.target.value)}
              style={{ ...st.noteInput, height: '80px', resize: 'vertical' }}
              placeholder="bijv. klant belt als bestelling klaar is..."
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => { setOrderNote(''); setShowOrderNote(false); }} style={st.cancelBtnHalf}>Wissen</button>
              <button onClick={() => setShowOrderNote(false)} style={st.confirmBtnHalf}>Opslaan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== STYLES =====
const st = {
  container: { display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#0d1117', color: '#e6edf3', overflow: 'hidden' },

  // LEFT: Order Panel
  orderPanel: { width: '340px', display: 'flex', flexDirection: 'column', background: '#161b22', borderRight: '1px solid #30363d' },
  staffBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#0d1117', borderBottom: '1px solid #30363d', fontSize: '12px' },
  staffName: { color: '#58a6ff', fontWeight: '600' },
  clock: { color: '#8b949e', fontFamily: 'monospace', fontSize: '13px', fontWeight: '600' },
  orderHeader: { padding: '8px 12px', borderBottom: '1px solid #30363d' },
  orderTypePills: { display: 'flex', gap: '3px', background: '#0d1117', borderRadius: '8px', padding: '3px' },
  pillBtn: { flex: 1, padding: '7px 4px', border: 'none', borderRadius: '6px', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'all 0.15s' },
  pillActive: { background: '#238636', color: '#fff' },

  orderItems: { flex: 1, overflowY: 'auto', padding: '6px' },
  emptyCart: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#484f58', fontSize: '13px' },
  orderItem: { padding: '8px 10px', marginBottom: '3px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid #238636', cursor: 'pointer', transition: 'background 0.1s' },
  orderItemSelected: { background: 'rgba(88,166,255,0.1)', borderLeftColor: '#58a6ff' },
  orderItemTop: { display: 'flex', alignItems: 'flex-start', gap: '8px' },
  orderItemQty: { display: 'flex', alignItems: 'center', gap: '3px' },
  qtyBtnSmall: { width: '22px', height: '22px', border: '1px solid #30363d', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#e6edf3', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  qtyNum: { fontSize: '13px', fontWeight: 'bold', minWidth: '18px', textAlign: 'center', color: '#e6edf3' },
  orderItemDetails: { flex: 1, minWidth: 0 },
  orderItemName: { fontSize: '13px', fontWeight: '600', color: '#e6edf3' },
  orderItemCustom: { fontSize: '10px', color: '#8b949e', marginTop: '1px', lineHeight: '1.2' },
  orderItemPrice: { fontSize: '13px', fontWeight: 'bold', color: '#e6edf3', whiteSpace: 'nowrap' },
  removeBtn: { border: 'none', background: 'none', color: '#f85149', cursor: 'pointer', fontSize: '16px', padding: '0 2px', lineHeight: '1' },

  quickActions: { display: 'flex', gap: '4px', padding: '6px 12px', borderTop: '1px solid #30363d', background: 'rgba(88,166,255,0.05)' },
  quickActionBtn: { flex: 1, padding: '6px', border: '1px solid #30363d', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', color: '#8b949e', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },

  orderNoteBar: { padding: '6px 12px', background: 'rgba(240,136,62,0.1)', borderTop: '1px solid rgba(240,136,62,0.2)', fontSize: '11px', color: '#f0883e' },
  ticketDiscountBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: 'rgba(248,81,73,0.1)', borderTop: '1px solid rgba(248,81,73,0.2)', fontSize: '11px', color: '#f85149' },
  ticketDiscountRemove: { border: 'none', background: 'none', color: '#f85149', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },

  orderTotals: { padding: '10px 14px', borderTop: '1px solid #30363d', background: 'rgba(255,255,255,0.02)' },
  totalLine: { display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '12px', color: '#8b949e' },
  totalLineMain: { display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: '22px', fontWeight: 'bold', color: '#fff', borderTop: '1px solid #30363d', marginTop: '4px' },

  actionBar: { padding: '8px 12px', borderTop: '1px solid #30363d', display: 'flex', flexDirection: 'column', gap: '6px' },
  actionRow: { display: 'flex', gap: '4px' },
  actionBtnSmall: { flex: 1, padding: '8px 4px', border: '1px solid #30363d', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', color: '#8b949e', cursor: 'pointer', fontSize: '14px', position: 'relative' },
  parkedBadge: { position: 'absolute', top: '-4px', right: '-4px', background: '#f0883e', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  clearBtn: { padding: '10px 14px', border: '1px solid #30363d', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: '#8b949e', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  checkoutBtn: { flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' },

  // MIDDLE: Categories
  categoryPanel: { width: '140px', display: 'flex', flexDirection: 'column', background: '#161b22', borderRight: '1px solid #30363d' },
  searchBox: { position: 'relative', padding: '8px 6px', borderBottom: '1px solid #30363d' },
  searchInput: { width: '100%', padding: '7px 8px', border: '1px solid #30363d', borderRadius: '6px', background: '#0d1117', color: '#e6edf3', fontSize: '11px', outline: 'none', boxSizing: 'border-box' },
  clearSearch: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '14px' },
  categoryList: { flex: 1, overflowY: 'auto', padding: '6px', display: 'flex', flexDirection: 'column', gap: '3px' },
  categoryBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 6px', border: '2px solid transparent', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', transition: 'all 0.12s', textAlign: 'center', position: 'relative' },
  catEmoji: { fontSize: '20px', marginBottom: '3px' },
  catLabel: { fontSize: '10px', fontWeight: '600', lineHeight: '1.2' },
  catCount: { position: 'absolute', top: '3px', right: '3px', fontSize: '9px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '1px 4px', color: '#8b949e' },

  // RIGHT: Products
  productPanel: { flex: 1, display: 'flex', flexDirection: 'column', background: '#0d1117', overflow: 'hidden' },
  productHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #30363d' },
  productTitle: { margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#e6edf3' },
  productCount: { fontSize: '12px', color: '#8b949e' },
  productGrid: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', padding: '12px 16px', overflowY: 'auto', alignContent: 'start' },
  emptyProducts: { gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#484f58', fontSize: '14px' },
  productBtn: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 8px', border: '2px solid #30363d', borderRadius: '8px', background: '#161b22', cursor: 'pointer', transition: 'all 0.1s', minHeight: '75px', textAlign: 'center', color: '#e6edf3', borderTopStyle: 'solid' },
  productName: { fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#e6edf3', lineHeight: '1.2' },
  productPrice: { fontSize: '13px', fontWeight: 'bold', color: '#f0883e' },
  productBadge: { position: 'absolute', top: '-6px', right: '-6px', width: '22px', height: '22px', borderRadius: '50%', background: '#238636', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' },

  // Modals
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  customModal: { background: '#161b22', borderRadius: '16px', border: '1px solid #30363d', width: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
  customHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #30363d' },
  customBody: { flex: 1, overflowY: 'auto', padding: '14px 20px' },
  customGroup: { marginBottom: '16px' },
  customGroupTitle: { margin: '0 0 8px', fontSize: '13px', fontWeight: '700', color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.5px' },
  customGroupType: { marginLeft: '6px', fontSize: '10px', fontWeight: '400', color: '#8b949e', textTransform: 'none', letterSpacing: '0' },
  customOptions: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  customOptionBtn: { padding: '8px 14px', border: '2px solid rgba(255,255,255,0.12)', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.1s', color: '#ccc' },
  optionSelected: { background: '#238636', borderColor: '#238636', color: '#fff' },
  optionPrice: { fontSize: '10px', opacity: 0.8, fontWeight: '600' },
  customFooter: { display: 'flex', gap: '8px', padding: '12px 20px', borderTop: '1px solid #30363d' },
  noteInput: { width: '100%', padding: '8px 12px', border: '1px solid #30363d', borderRadius: '6px', background: '#0d1117', color: '#e6edf3', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },

  cancelBtn: { padding: '10px 18px', border: '1px solid #30363d', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: '#8b949e', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  confirmBtn: { flex: 1, padding: '10px 18px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  cancelBtnFull: { width: '100%', padding: '10px', border: '1px solid #30363d', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: '#8b949e', cursor: 'pointer', fontSize: '13px' },
  cancelBtnHalf: { flex: 1, padding: '10px', border: '1px solid #30363d', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: '#8b949e', cursor: 'pointer', fontSize: '13px' },
  confirmBtnHalf: { flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#238636', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },

  // Payment
  paymentModal: { background: '#161b22', borderRadius: '16px', border: '1px solid #30363d', padding: '28px', width: '440px', textAlign: 'center' },
  modalTitle: { margin: '0 0 16px', fontSize: '20px', fontWeight: 'bold', color: '#e6edf3' },
  payTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '20px' },
  payMethods: { display: 'flex', gap: '10px', marginBottom: '16px' },
  payMethodBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '18px 10px', border: '2px solid #30363d', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s', color: '#e6edf3' },

  // Cash
  cashModal: { background: '#161b22', borderRadius: '16px', border: '1px solid #30363d', padding: '24px', width: '400px' },
  cashTotalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '14px', fontSize: '14px', color: '#8b949e' },
  cashQuickBtns: { display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' },
  cashQuickBtn: { flex: 1, minWidth: '50px', padding: '10px 6px', border: '2px solid #30363d', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: '#e6edf3', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  cashQuickBtnExact: { flex: 1, minWidth: '50px', padding: '10px 6px', border: '2px solid #238636', borderRadius: '8px', background: 'rgba(35,134,54,0.12)', color: '#3fb950', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  cashDisplay: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px', background: '#0d1117', borderRadius: '10px', border: '2px solid #30363d', marginBottom: '14px' },
  cashEuroSign: { fontSize: '20px', color: '#8b949e', marginRight: '6px' },
  cashAmount: { fontSize: '32px', fontWeight: 'bold', color: '#e6edf3', fontFamily: 'monospace' },
  numpadGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '14px' },
  numpadBtn: { padding: '14px', border: '1px solid #30363d', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: '#e6edf3', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', transition: 'background 0.1s' },
  changeBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(35,134,54,0.1)', border: '1px solid rgba(35,134,54,0.25)', borderRadius: '10px', marginBottom: '14px' },
  cashActions: { display: 'flex', gap: '8px' },

  // Receipt
  receiptModal: { background: '#161b22', borderRadius: '16px', border: '1px solid #30363d', padding: '24px', width: '380px' },
  receiptContent: { marginBottom: '16px' },
  receiptBadge: { display: 'inline-block', marginTop: '6px', padding: '3px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '16px', fontSize: '12px', color: '#8b949e' },
  receiptDivider: { borderTop: '1px dashed #30363d', margin: '10px 0' },
  receiptItem: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '13px', color: '#8b949e' },
  receiptCustom: { fontSize: '10px', color: '#484f58', paddingLeft: '16px', paddingBottom: '2px' },
  receiptCloseBtn: { width: '100%', padding: '12px', border: 'none', borderRadius: '10px', background: '#238636', color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' },

  // Small modal
  smallModal: { background: '#161b22', borderRadius: '16px', border: '1px solid #30363d', padding: '24px', width: '380px', maxHeight: '80vh', overflowY: 'auto' },
  discountQuickBtn: { padding: '6px 14px', border: '1px solid #30363d', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', color: '#e6edf3', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },

  // Parked
  parkedCard: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '6px', border: '1px solid #30363d' },
  recallBtn: { padding: '6px 14px', border: 'none', borderRadius: '6px', background: '#238636', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' },
};
