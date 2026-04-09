// POS System - Professional Data Layer v4.0
// Inspired by Lightspeed, Toast, SambaPOS, Untill, Vectron
// v4.0: Takeaway.com, Bezorging, Odoo integratie
import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from 'firebase/firestore';

// ===== DEFAULT DATA =====
const DEFAULT_CATEGORIES = [
  { id: 'burgers', name: 'Burgers', icon: '🍔', color: '#e74c3c' },
  { id: 'chicken', name: 'Chicken', icon: '🍗', color: '#e67e22' },
  { id: 'fries', name: 'Frites & Snacks', icon: '🍟', color: '#f1c40f' },
  { id: 'drinks', name: 'Dranken', icon: '🥤', color: '#3498db' },
  { id: 'desserts', name: 'Desserts', icon: '🍦', color: '#9b59b6' },
  { id: 'menu', name: "Menu's", icon: '📋', color: '#2ecc71' },
  { id: 'sauzen', name: 'Sauzen', icon: '🫙', color: '#1abc9c' },
  { id: 'extras', name: "Extra's", icon: '➕', color: '#95a5a6' },
];

const DEFAULT_MENU_ITEMS = [
  { id: 1, name: 'Hamburger', price: 3.50, category: 'burgers', available: true },
  { id: 2, name: 'Cheeseburger', price: 4.00, category: 'burgers', available: true },
  { id: 3, name: 'Double Burger', price: 6.50, category: 'burgers', available: true },
  { id: 4, name: 'Bacon Burger', price: 5.50, category: 'burgers', available: true },
  { id: 5, name: 'Chicken Burger', price: 5.00, category: 'burgers', available: true },
  { id: 6, name: 'Visburger', price: 4.50, category: 'burgers', available: true },
  { id: 7, name: 'Veggie Burger', price: 5.00, category: 'burgers', available: true },
  { id: 8, name: 'Big Tasty', price: 7.50, category: 'burgers', available: true },
  { id: 10, name: 'Chicken Nuggets 6st', price: 4.00, category: 'chicken', available: true },
  { id: 11, name: 'Chicken Nuggets 9st', price: 5.50, category: 'chicken', available: true },
  { id: 12, name: 'Chicken Wings 6st', price: 5.00, category: 'chicken', available: true },
  { id: 13, name: 'Chicken Tenders 3st', price: 4.50, category: 'chicken', available: true },
  { id: 14, name: 'Kip Wrap', price: 5.50, category: 'chicken', available: true },
  { id: 20, name: 'Patat Klein', price: 2.50, category: 'fries', available: true },
  { id: 21, name: 'Patat Midden', price: 3.50, category: 'fries', available: true },
  { id: 22, name: 'Patat Groot', price: 4.50, category: 'fries', available: true },
  { id: 23, name: 'Frikandel', price: 2.00, category: 'fries', available: true },
  { id: 24, name: 'Kroket', price: 2.00, category: 'fries', available: true },
  { id: 25, name: 'Kaassouffle', price: 2.50, category: 'fries', available: true },
  { id: 26, name: 'Bitterballen 6st', price: 4.00, category: 'fries', available: true },
  { id: 27, name: 'Loempia', price: 3.00, category: 'fries', available: true },
  { id: 28, name: 'Onion Rings', price: 3.50, category: 'fries', available: true },
  { id: 30, name: 'Cola', price: 2.00, category: 'drinks', available: true },
  { id: 31, name: 'Cola Zero', price: 2.00, category: 'drinks', available: true },
  { id: 32, name: 'Fanta', price: 2.00, category: 'drinks', available: true },
  { id: 33, name: 'Sprite', price: 2.00, category: 'drinks', available: true },
  { id: 34, name: 'Ice Tea', price: 2.00, category: 'drinks', available: true },
  { id: 35, name: 'Water', price: 1.50, category: 'drinks', available: true },
  { id: 36, name: 'Jus d\'Orange', price: 2.50, category: 'drinks', available: true },
  { id: 37, name: 'Milkshake Vanille', price: 3.50, category: 'drinks', available: true },
  { id: 38, name: 'Milkshake Choco', price: 3.50, category: 'drinks', available: true },
  { id: 39, name: 'Milkshake Aardbei', price: 3.50, category: 'drinks', available: true },
  { id: 40, name: 'Softijs', price: 2.00, category: 'desserts', available: true },
  { id: 41, name: 'Sundae Caramel', price: 3.00, category: 'desserts', available: true },
  { id: 42, name: 'Sundae Choco', price: 3.00, category: 'desserts', available: true },
  { id: 43, name: 'Appeltaart', price: 2.50, category: 'desserts', available: true },
  { id: 44, name: 'Donut', price: 1.50, category: 'desserts', available: true },
  { id: 50, name: 'Hamburger Menu', price: 7.50, category: 'menu', available: true },
  { id: 51, name: 'Cheeseburger Menu', price: 8.00, category: 'menu', available: true },
  { id: 52, name: 'Double Burger Menu', price: 10.50, category: 'menu', available: true },
  { id: 53, name: 'Chicken Burger Menu', price: 9.00, category: 'menu', available: true },
  { id: 54, name: 'Big Tasty Menu', price: 11.50, category: 'menu', available: true },
  { id: 55, name: 'Nuggets Menu 6st', price: 8.00, category: 'menu', available: true },
  { id: 56, name: 'Kindermenu', price: 6.00, category: 'menu', available: true },
  { id: 60, name: 'Mayonaise', price: 0.50, category: 'sauzen', available: true },
  { id: 61, name: 'Ketchup', price: 0.50, category: 'sauzen', available: true },
  { id: 62, name: 'Curry', price: 0.50, category: 'sauzen', available: true },
  { id: 63, name: 'Joppiesaus', price: 0.50, category: 'sauzen', available: true },
  { id: 64, name: 'Sambal', price: 0.50, category: 'sauzen', available: true },
  { id: 65, name: 'Knoflooksaus', price: 0.50, category: 'sauzen', available: true },
  { id: 66, name: 'BBQ Saus', price: 0.50, category: 'sauzen', available: true },
  { id: 70, name: 'Extra Kaas', price: 0.75, category: 'extras', available: true },
  { id: 71, name: 'Extra Bacon', price: 1.00, category: 'extras', available: true },
  { id: 72, name: 'Extra Sla/Tomaat', price: 0.50, category: 'extras', available: true },
  { id: 73, name: 'Upgrade Groot Patat', price: 1.00, category: 'extras', available: true },
  { id: 74, name: 'Upgrade Groot Drank', price: 0.75, category: 'extras', available: true },
];

// ===== ROLE PERMISSIONS SYSTEM =====
export const ROLES = {
  admin: {
    label: 'Admin',
    permissions: ['kassa', 'keuken', 'bestellingen', 'menubeheer', 'dagafsluiting', 'personeel', 'financieel', 'audit', 'void', 'discount_high', 'kasboek', 'settings', 'bezorging', 'integraties'],
  },
  manager: {
    label: 'Manager',
    permissions: ['kassa', 'keuken', 'bestellingen', 'menubeheer', 'dagafsluiting', 'financieel', 'void', 'discount_high', 'kasboek', 'bezorging'],
  },
  kassier: {
    label: 'Kassier',
    permissions: ['kassa', 'keuken', 'bestellingen'],
  },
  keuken: {
    label: 'Keuken',
    permissions: ['keuken'],
  },
};

export function hasPermission(staff, permission) {
  if (!staff) return false;
  const role = ROLES[staff.role];
  if (!role) return false;
  return role.permissions.includes(permission);
}

// ===== CATEGORIES & MENU =====
export async function getCategories() {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const snap = await getDoc(doc(db, 'settings', 'categories'));
    if (snap.exists()) return snap.data().items;
    await setDoc(doc(db, 'settings', 'categories'), { items: DEFAULT_CATEGORIES });
    return DEFAULT_CATEGORIES;
  } catch (err) {
    console.error('Error loading categories:', err);
    return DEFAULT_CATEGORIES;
  }
}

export async function saveCategories(categories) {
  await setDoc(doc(db, 'settings', 'categories'), { items: categories });
}

export async function getMenuItems() {
  if (typeof window === 'undefined') return DEFAULT_MENU_ITEMS;
  try {
    const snap = await getDoc(doc(db, 'settings', 'menuItems'));
    if (snap.exists()) return snap.data().items;
    await setDoc(doc(db, 'settings', 'menuItems'), { items: DEFAULT_MENU_ITEMS });
    return DEFAULT_MENU_ITEMS;
  } catch (err) {
    console.error('Error loading menu items:', err);
    return DEFAULT_MENU_ITEMS;
  }
}

export async function saveMenuItems(items) {
  await setDoc(doc(db, 'settings', 'menuItems'), { items });
}

// ===== ORDERS =====
export async function getOrders() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(collection(db, 'orders'));
    const orders = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return orders;
  } catch (err) {
    console.error('Error loading orders:', err);
    return [];
  }
}

export async function getOrdersByDateRange(startDate, endDate) {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(collection(db, 'orders'));
    const orders = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    return orders
      .filter(o => o.date >= startDate && o.date <= endDate)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.error('Error loading orders by range:', err);
    return [];
  }
}

export async function saveOrder(order) {
  await addDoc(collection(db, 'orders'), order);
  return order;
}

export async function saveOrderEnhanced(order) {
  const docRef = await addDoc(collection(db, 'orders'), order);
  return { ...order, _docId: docRef.id };
}

export async function updateOrder(orderId, updates) {
  try {
    const snap = await getDocs(
      query(collection(db, 'orders'), where('id', '==', orderId))
    );
    if (!snap.empty) {
      const docRef = snap.docs[0].ref;
      await updateDoc(docRef, updates);
      return { ...snap.docs[0].data(), ...updates };
    }
  } catch (err) {
    console.error('Error updating order:', err);
  }
  return null;
}

export async function getNextOrderNumber() {
  if (typeof window === 'undefined') return 1;
  const counterRef = doc(db, 'settings', 'orderCounter');
  try {
    const next = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const current = snap.exists() ? snap.data().value : 0;
      const nextVal = current + 1;
      transaction.set(counterRef, { value: nextVal });
      return nextVal;
    });
    return next;
  } catch (err) {
    console.error('Error getting order number:', err);
    return Date.now();
  }
}

export async function getTodayOrders() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const snap = await getDocs(
      query(collection(db, 'orders'), where('date', '==', today))
    );
    const orders = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return orders;
  } catch (err) {
    console.error('Error loading today orders:', err);
    return [];
  }
}

export function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '€0.00';
  return `€${amount.toFixed(2)}`;
}

export async function resetDailyCounter() {
  await setDoc(doc(db, 'settings', 'orderCounter'), { value: 0 });
}

// ===== VOID / CANCEL =====
export async function voidOrder(orderId, reason, staffId) {
  try {
    const snap = await getDocs(
      query(collection(db, 'orders'), where('id', '==', orderId))
    );
    if (!snap.empty) {
      const docRef = snap.docs[0].ref;
      await updateDoc(docRef, {
        status: 'geannuleerd',
        voidReason: reason,
        voidedBy: staffId,
        voidedAt: Date.now(),
      });
      await addAuditLog('order_void', `Order #${orderId} geannuleerd: ${reason}`, staffId);
      return true;
    }
  } catch (err) {
    console.error('Error voiding order:', err);
  }
  return false;
}

// ===== MODIFIER GROUPS =====
const DEFAULT_MODIFIER_GROUPS = [
  {
    id: 'mg_burger_saus', name: 'Burger Saus', type: 'single',
    options: [
      { name: 'Geen saus', price: 0 }, { name: 'Mayonaise', price: 0 }, { name: 'Ketchup', price: 0 },
      { name: 'Curry', price: 0 }, { name: 'Joppiesaus', price: 0 }, { name: 'Sambal', price: 0 },
      { name: 'Knoflooksaus', price: 0 }, { name: 'BBQ Saus', price: 0 },
    ],
  },
  {
    id: 'mg_groenten', name: 'Groenten', type: 'multi', defaultSelected: ['Sla', 'Tomaat', 'Ui', 'Augurk'],
    options: [
      { name: 'Sla', price: 0 }, { name: 'Tomaat', price: 0 }, { name: 'Ui', price: 0 },
      { name: 'Augurk', price: 0 }, { name: 'Jalapeno', price: 0 },
    ],
  },
  {
    id: 'mg_burger_extras', name: "Burger Extra's", type: 'multi',
    options: [{ name: 'Extra Kaas', price: 0.75 }, { name: 'Extra Bacon', price: 1.00 }, { name: 'Extra Saus', price: 0.50 }],
  },
  {
    id: 'mg_chicken_saus', name: 'Chicken Saus', type: 'single',
    options: [
      { name: 'Geen saus', price: 0 }, { name: 'Mayonaise', price: 0 }, { name: 'Ketchup', price: 0 },
      { name: 'Curry', price: 0 }, { name: 'BBQ Saus', price: 0 }, { name: 'Sweet Chili', price: 0 }, { name: 'Knoflooksaus', price: 0 },
    ],
  },
  {
    id: 'mg_friet_saus', name: 'Friet Saus', type: 'single',
    options: [
      { name: 'Geen saus', price: 0 }, { name: 'Mayonaise', price: 0.50 }, { name: 'Ketchup', price: 0.50 },
      { name: 'Curry', price: 0.50 }, { name: 'Joppiesaus', price: 0.50 }, { name: 'Sambal', price: 0.50 },
      { name: 'Knoflooksaus', price: 0.50 }, { name: 'BBQ Saus', price: 0.50 }, { name: 'Speciaal', price: 1.00 },
    ],
  },
  {
    id: 'mg_menu_drank', name: 'Menu Drank', type: 'single',
    options: [
      { name: 'Cola', price: 0 }, { name: 'Cola Zero', price: 0 }, { name: 'Fanta', price: 0 },
      { name: 'Sprite', price: 0 }, { name: 'Ice Tea', price: 0 }, { name: 'Water', price: 0 },
    ],
  },
  {
    id: 'mg_menu_patat_saus', name: 'Menu Patat Saus', type: 'single',
    options: [
      { name: 'Geen saus', price: 0 }, { name: 'Mayonaise', price: 0 }, { name: 'Ketchup', price: 0 },
      { name: 'Curry', price: 0 }, { name: 'Speciaal', price: 0 },
    ],
  },
];

const DEFAULT_MODIFIER_LINKS = [
  { groupId: 'mg_burger_saus', targetType: 'category', targetId: 'burgers', sortOrder: 0 },
  { groupId: 'mg_groenten', targetType: 'category', targetId: 'burgers', sortOrder: 1 },
  { groupId: 'mg_burger_extras', targetType: 'category', targetId: 'burgers', sortOrder: 2 },
  { groupId: 'mg_chicken_saus', targetType: 'category', targetId: 'chicken', sortOrder: 0 },
  { groupId: 'mg_friet_saus', targetType: 'category', targetId: 'fries', sortOrder: 0 },
  { groupId: 'mg_burger_saus', targetType: 'category', targetId: 'menu', sortOrder: 0 },
  { groupId: 'mg_groenten', targetType: 'category', targetId: 'menu', sortOrder: 1 },
  { groupId: 'mg_menu_drank', targetType: 'category', targetId: 'menu', sortOrder: 2 },
  { groupId: 'mg_menu_patat_saus', targetType: 'category', targetId: 'menu', sortOrder: 3 },
];

export async function getModifierGroups() {
  if (typeof window === 'undefined') return DEFAULT_MODIFIER_GROUPS;
  try {
    const snap = await getDoc(doc(db, 'settings', 'modifierGroups'));
    if (snap.exists()) return snap.data().items;
    await setDoc(doc(db, 'settings', 'modifierGroups'), { items: DEFAULT_MODIFIER_GROUPS });
    return DEFAULT_MODIFIER_GROUPS;
  } catch (err) {
    console.error('Error loading modifier groups:', err);
    return DEFAULT_MODIFIER_GROUPS;
  }
}

export async function saveModifierGroups(groups) {
  await setDoc(doc(db, 'settings', 'modifierGroups'), { items: groups });
}

export async function getModifierLinks() {
  if (typeof window === 'undefined') return DEFAULT_MODIFIER_LINKS;
  try {
    const snap = await getDoc(doc(db, 'settings', 'modifierLinks'));
    if (snap.exists()) return snap.data().items;
    await setDoc(doc(db, 'settings', 'modifierLinks'), { items: DEFAULT_MODIFIER_LINKS });
    return DEFAULT_MODIFIER_LINKS;
  } catch (err) {
    console.error('Error loading modifier links:', err);
    return DEFAULT_MODIFIER_LINKS;
  }
}

export async function saveModifierLinks(links) {
  await setDoc(doc(db, 'settings', 'modifierLinks'), { items: links });
}

export function resolveModifierGroups(product, allGroups, allLinks) {
  const categoryLinks = allLinks
    .filter(l => l.targetType === 'category' && l.targetId === product.category)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const productLinks = allLinks
    .filter(l => l.targetType === 'product' && String(l.targetId) === String(product.id))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const allRelevantLinks = [...categoryLinks, ...productLinks];
  const seenIds = new Set();
  const resolved = [];
  for (const link of allRelevantLinks) {
    if (seenIds.has(link.groupId)) continue;
    seenIds.add(link.groupId);
    const group = allGroups.find(g => g.id === link.groupId);
    if (group) resolved.push(group);
  }
  return resolved;
}

export async function getCustomizationOptions() {
  const [groups, links] = await Promise.all([getModifierGroups(), getModifierLinks()]);
  const result = {};
  links.forEach(link => {
    if (link.targetType === 'category') {
      const group = groups.find(g => g.id === link.groupId);
      if (group) {
        if (!result[link.targetId]) result[link.targetId] = [];
        if (!result[link.targetId].find(g => g.id === group.id)) {
          result[link.targetId].push(group);
        }
      }
    }
  });
  return result;
}

export async function saveCustomizationOptions(options) {
  await setDoc(doc(db, 'settings', 'customizations'), { items: options });
}

// ===== STAFF / PERSONNEL MANAGEMENT =====
const DEFAULT_STAFF = [
  { id: 'staff_admin', name: 'Admin', pin: '1234', role: 'admin', active: true, email: '', phone: '', hourlyWage: 0, contractHours: 0, contractType: 'vast', startDate: '', notes: '' },
  { id: 'staff_kassier', name: 'Kassier', pin: '0000', role: 'kassier', active: true, email: '', phone: '', hourlyWage: 12.50, contractHours: 24, contractType: 'flex', startDate: '', notes: '' },
];

export async function getStaff() {
  if (typeof window === 'undefined') return DEFAULT_STAFF;
  try {
    const snap = await getDoc(doc(db, 'settings', 'staff'));
    if (snap.exists()) return snap.data().items;
    await setDoc(doc(db, 'settings', 'staff'), { items: DEFAULT_STAFF });
    return DEFAULT_STAFF;
  } catch (err) {
    console.error('Error loading staff:', err);
    return DEFAULT_STAFF;
  }
}

export async function saveStaff(staff) {
  await setDoc(doc(db, 'settings', 'staff'), { items: staff });
}

export async function verifyPin(pin) {
  const staff = await getStaff();
  return staff.find(s => s.pin === pin && s.active) || null;
}

// ===== TIME CLOCK (Inkloksysteem) =====
export async function getTimeEntries() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(collection(db, 'timeEntries'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    entries.sort((a, b) => (b.clockIn || 0) - (a.clockIn || 0));
    return entries;
  } catch (err) {
    console.error('Error loading time entries:', err);
    return [];
  }
}

export async function clockIn(staffId, staffName) {
  const entry = {
    staffId,
    staffName,
    clockIn: Date.now(),
    clockOut: null,
    breaks: [],
    date: new Date().toISOString().split('T')[0],
    status: 'active',
  };
  const docRef = await addDoc(collection(db, 'timeEntries'), entry);
  await addAuditLog('clock_in', `${staffName} ingeklokt`, staffId);
  return { ...entry, _docId: docRef.id };
}

export async function clockOut(entryDocId) {
  try {
    const docRef = doc(db, 'timeEntries', entryDocId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const now = Date.now();
      // Calculate total break time
      let breakMs = 0;
      (data.breaks || []).forEach(b => {
        if (b.end) breakMs += b.end - b.start;
      });
      const workedMs = now - data.clockIn - breakMs;
      await updateDoc(docRef, {
        clockOut: now,
        status: 'completed',
        totalBreakMs: breakMs,
        totalWorkedMs: workedMs,
        totalHours: Math.round((workedMs / 3600000) * 100) / 100,
      });
      await addAuditLog('clock_out', `${data.staffName} uitgeklokt (${(workedMs / 3600000).toFixed(1)}u)`, data.staffId);
      return true;
    }
  } catch (err) {
    console.error('Error clocking out:', err);
  }
  return false;
}

export async function startBreak(entryDocId) {
  try {
    const docRef = doc(db, 'timeEntries', entryDocId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const breaks = data.breaks || [];
      breaks.push({ start: Date.now(), end: null });
      await updateDoc(docRef, { breaks, status: 'break' });
      return true;
    }
  } catch (err) {
    console.error('Error starting break:', err);
  }
  return false;
}

export async function endBreak(entryDocId) {
  try {
    const docRef = doc(db, 'timeEntries', entryDocId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const breaks = data.breaks || [];
      const lastBreak = breaks[breaks.length - 1];
      if (lastBreak && !lastBreak.end) {
        lastBreak.end = Date.now();
        await updateDoc(docRef, { breaks, status: 'active' });
        return true;
      }
    }
  } catch (err) {
    console.error('Error ending break:', err);
  }
  return false;
}

export async function getActiveTimeEntry(staffId) {
  try {
    const snap = await getDocs(collection(db, 'timeEntries'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    return entries.find(e => e.staffId === staffId && e.status !== 'completed') || null;
  } catch (err) {
    return null;
  }
}

export async function getTimeEntriesByRange(startDate, endDate) {
  try {
    const snap = await getDocs(collection(db, 'timeEntries'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    return entries
      .filter(e => e.date >= startDate && e.date <= endDate)
      .sort((a, b) => (b.clockIn || 0) - (a.clockIn || 0));
  } catch (err) {
    return [];
  }
}

// ===== KASBOEK (Cash Book / Cash Register Log) =====
export async function getKasboekEntries() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(collection(db, 'kasboek'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return entries;
  } catch (err) {
    console.error('Error loading kasboek:', err);
    return [];
  }
}

export async function addKasboekEntry(entry) {
  const full = {
    ...entry,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
  };
  const docRef = await addDoc(collection(db, 'kasboek'), full);
  await addAuditLog('kasboek', `${entry.type}: ${formatPrice(entry.amount)} - ${entry.description}`, entry.staffId);
  return { ...full, _docId: docRef.id };
}

export async function getKasboekByDate(date) {
  try {
    const snap = await getDocs(collection(db, 'kasboek'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    return entries.filter(e => e.date === date).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    return [];
  }
}

// ===== AUDIT TRAIL =====
export async function addAuditLog(action, description, staffId, extra) {
  try {
    await addDoc(collection(db, 'auditLog'), {
      action,
      description,
      staffId: staffId || 'system',
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ...(extra || {}),
    });
  } catch (err) {
    console.error('Error adding audit log:', err);
  }
}

export async function getAuditLog(limit) {
  try {
    const snap = await getDocs(collection(db, 'auditLog'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return limit ? entries.slice(0, limit) : entries;
  } catch (err) {
    console.error('Error loading audit log:', err);
    return [];
  }
}

export async function getAuditLogByDate(date) {
  try {
    const snap = await getDocs(collection(db, 'auditLog'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    return entries.filter(e => e.date === date).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    return [];
  }
}

// ===== WORK PERIODS (Dagafsluiting) =====
export async function getActiveWorkPeriod() {
  if (typeof window === 'undefined') return null;
  try {
    const snap = await getDoc(doc(db, 'settings', 'activeWorkPeriod'));
    if (snap.exists()) return snap.data();
    return null;
  } catch (err) {
    console.error('Error loading work period:', err);
    return null;
  }
}

export async function startWorkPeriod(startCash, staffId, denomination) {
  const period = {
    id: `WP-${Date.now()}`,
    startTime: Date.now(),
    startDate: new Date().toISOString().split('T')[0],
    startCash: parseFloat(startCash) || 0,
    startDenomination: denomination || null,
    startedBy: staffId,
    active: true,
  };
  await setDoc(doc(db, 'settings', 'activeWorkPeriod'), period);
  await addAuditLog('work_period_start', `Werkperiode geopend met startkassa ${formatPrice(period.startCash)}`, staffId);
  return period;
}

export async function endWorkPeriod(endCash, staffId, denomination, reportData) {
  const current = await getActiveWorkPeriod();
  if (!current) return null;

  const endData = {
    ...current,
    endTime: Date.now(),
    endDate: new Date().toISOString().split('T')[0],
    endCash: parseFloat(endCash) || 0,
    endDenomination: denomination || null,
    endedBy: staffId,
    active: false,
    report: reportData || null,
  };

  await addDoc(collection(db, 'workPeriods'), endData);
  await setDoc(doc(db, 'settings', 'activeWorkPeriod'), {});
  await resetDailyCounter();
  await addAuditLog('work_period_end', `Werkperiode gesloten. Geteld: ${formatPrice(endData.endCash)}`, staffId);
  return endData;
}

export async function getWorkPeriodHistory() {
  try {
    const snap = await getDocs(collection(db, 'workPeriods'));
    const periods = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    periods.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
    return periods;
  } catch (err) {
    console.error('Error loading work period history:', err);
    return [];
  }
}

// ===== PARKED ORDERS =====
export async function getParkedOrders() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDoc(doc(db, 'settings', 'parkedOrders'));
    if (snap.exists()) return snap.data().items || [];
    return [];
  } catch (err) {
    console.error('Error loading parked orders:', err);
    return [];
  }
}

export async function saveParkedOrders(orders) {
  await setDoc(doc(db, 'settings', 'parkedOrders'), { items: orders });
}

export async function parkOrder(order) {
  const parked = await getParkedOrders();
  parked.push({ ...order, parkedAt: Date.now(), parkedId: `PARK-${Date.now()}` });
  await saveParkedOrders(parked);
  return parked;
}

export async function recallParkedOrder(parkedId) {
  const parked = await getParkedOrders();
  const order = parked.find(p => p.parkedId === parkedId);
  const remaining = parked.filter(p => p.parkedId !== parkedId);
  await saveParkedOrders(remaining);
  return order;
}

// ===== BUSINESS SETTINGS =====
const DEFAULT_BUSINESS = {
  name: 'FastFood POS',
  address: '',
  phone: '',
  btwNumber: '',
  btwPercentage: 9,
  btwPercentageHigh: 21,
  receiptFooter: 'Bedankt voor uw bezoek!',
  currency: 'EUR',
  dailyGoal: 500,
  cashTolerance: 2.00,
};

export async function getBusinessSettings() {
  if (typeof window === 'undefined') return DEFAULT_BUSINESS;
  try {
    const snap = await getDoc(doc(db, 'settings', 'business'));
    if (snap.exists()) return { ...DEFAULT_BUSINESS, ...snap.data() };
    await setDoc(doc(db, 'settings', 'business'), DEFAULT_BUSINESS);
    return DEFAULT_BUSINESS;
  } catch (err) {
    console.error('Error loading business settings:', err);
    return DEFAULT_BUSINESS;
  }
}

export async function saveBusinessSettings(settings) {
  await setDoc(doc(db, 'settings', 'business'), settings);
}

// ===== EXPENSES (Kosten tracking) =====
export async function getExpenses() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(collection(db, 'expenses'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return entries;
  } catch (err) {
    return [];
  }
}

export async function addExpense(expense) {
  const full = {
    ...expense,
    timestamp: Date.now(),
    date: expense.date || new Date().toISOString().split('T')[0],
  };
  const docRef = await addDoc(collection(db, 'expenses'), full);
  return { ...full, _docId: docRef.id };
}

export async function deleteExpense(docId) {
  await deleteDoc(doc(db, 'expenses', docId));
}

export async function getExpensesByRange(startDate, endDate) {
  try {
    const snap = await getDocs(collection(db, 'expenses'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    return entries
      .filter(e => e.date >= startDate && e.date <= endDate)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    return [];
  }
}

// ===== HELPER: Date utilities =====
export function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

export function getMonthRange(date) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getPreviousPeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil((end - start) / 86400000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays + 1);
  return {
    start: prevStart.toISOString().split('T')[0],
    end: prevEnd.toISOString().split('T')[0],
  };
}

// Denomination helper
export const DENOMINATIONS = [
  { label: '€500', value: 500 },
  { label: '€200', value: 200 },
  { label: '€100', value: 100 },
  { label: '€50', value: 50 },
  { label: '€20', value: 20 },
  { label: '€10', value: 10 },
  { label: '€5', value: 5 },
  { label: '€2', value: 2 },
  { label: '€1', value: 1 },
  { label: '€0.50', value: 0.50 },
  { label: '€0.20', value: 0.20 },
  { label: '€0.10', value: 0.10 },
  { label: '€0.05', value: 0.05 },
];

export function calculateDenominationTotal(counts) {
  if (!counts) return 0;
  return DENOMINATIONS.reduce((sum, d) => sum + (counts[d.label] || 0) * d.value, 0);
}

// ===== COURIERS (Koeriers) =====
const DEFAULT_COURIERS = [
  { id: 'courier_1', name: 'Standaard Bezorger', phone: '', vehicle: 'scooter', active: true, status: 'beschikbaar' },
];

export async function getCouriers() {
  if (typeof window === 'undefined') return DEFAULT_COURIERS;
  try {
    const snap = await getDoc(doc(db, 'settings', 'couriers'));
    if (snap.exists()) return snap.data().items;
    await setDoc(doc(db, 'settings', 'couriers'), { items: DEFAULT_COURIERS });
    return DEFAULT_COURIERS;
  } catch (err) {
    console.error('Error loading couriers:', err);
    return DEFAULT_COURIERS;
  }
}

export async function saveCouriers(couriers) {
  await setDoc(doc(db, 'settings', 'couriers'), { items: couriers });
}

// ===== DELIVERIES (Bezorgingen) =====
export async function getDeliveries() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(collection(db, 'deliveries'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return entries;
  } catch (err) {
    console.error('Error loading deliveries:', err);
    return [];
  }
}

export async function getDeliveriesByDate(date) {
  try {
    const snap = await getDocs(collection(db, 'deliveries'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    return entries.filter(e => e.date === date).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    return [];
  }
}

export async function getDeliveriesByRange(startDate, endDate) {
  try {
    const snap = await getDocs(collection(db, 'deliveries'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    return entries
      .filter(e => e.date >= startDate && e.date <= endDate)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    return [];
  }
}

export async function createDelivery(delivery) {
  const full = {
    ...delivery,
    id: `DEL-${Date.now()}`,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
    status: delivery.status || 'nieuw',
    courierId: delivery.courierId || null,
    courierName: delivery.courierName || null,
    assignedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
  };
  const docRef = await addDoc(collection(db, 'deliveries'), full);
  await addAuditLog('delivery_created', `Bezorging ${full.id} aangemaakt voor order #${delivery.orderId}`, delivery.staffId);
  return { ...full, _docId: docRef.id };
}

export async function updateDelivery(deliveryDocId, updates) {
  try {
    const docRef = doc(db, 'deliveries', deliveryDocId);
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    console.error('Error updating delivery:', err);
    return false;
  }
}

export async function assignCourier(deliveryDocId, courierId, courierName, staffId) {
  await updateDelivery(deliveryDocId, {
    courierId,
    courierName,
    status: 'toegewezen',
    assignedAt: Date.now(),
  });
  await addAuditLog('delivery_assigned', `Bezorging toegewezen aan ${courierName}`, staffId);
}

export async function updateDeliveryStatus(deliveryDocId, status, staffId) {
  const updates = { status };
  if (status === 'onderweg') updates.pickedUpAt = Date.now();
  if (status === 'afgeleverd') updates.deliveredAt = Date.now();
  await updateDelivery(deliveryDocId, updates);
  await addAuditLog('delivery_status', `Bezorgstatus: ${status}`, staffId);
}

// ===== TAKEAWAY.COM / THUISBEZORGD INTEGRATION =====
export async function getIntegrationSettings() {
  if (typeof window === 'undefined') return {};
  try {
    const snap = await getDoc(doc(db, 'settings', 'integrations'));
    if (snap.exists()) return snap.data();
    return {};
  } catch (err) {
    return {};
  }
}

export async function saveIntegrationSettings(settings) {
  await setDoc(doc(db, 'settings', 'integrations'), settings);
}

export async function getIncomingOrders() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(collection(db, 'incomingOrders'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return entries;
  } catch (err) {
    return [];
  }
}

export async function getPendingIncomingOrders() {
  try {
    const snap = await getDocs(collection(db, 'incomingOrders'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    return entries.filter(e => e.status === 'pending').sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    return [];
  }
}

export async function acceptIncomingOrder(docId, staffId) {
  try {
    const docRef = doc(db, 'incomingOrders', docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();

    // Create POS order from incoming
    const orderNumber = await getNextOrderNumber();
    const posOrder = {
      id: orderNumber,
      items: data.items || [],
      total: data.total || 0,
      subtotal: data.subtotal || data.total || 0,
      orderType: 'bezorging',
      paymentMethod: data.paymentMethod || 'online',
      status: 'nieuw',
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      staffId: staffId || 'system',
      platform: data.platform || 'takeaway',
      platformOrderId: data.platformOrderId || data.id,
      customerName: data.customerName || '',
      customerAddress: data.customerAddress || '',
      customerPhone: data.customerPhone || '',
      deliveryNotes: data.deliveryNotes || '',
    };

    await saveOrder(posOrder);
    await updateDoc(docRef, { status: 'accepted', acceptedAt: Date.now(), posOrderId: orderNumber });
    await addAuditLog('incoming_accepted', `${data.platform} order #${data.platformOrderId} geaccepteerd als #${orderNumber}`, staffId);

    // Auto-create delivery
    await createDelivery({
      orderId: orderNumber,
      platform: data.platform,
      customerName: data.customerName || '',
      customerAddress: data.customerAddress || '',
      customerPhone: data.customerPhone || '',
      deliveryNotes: data.deliveryNotes || '',
      total: data.total,
      staffId,
    });

    return posOrder;
  } catch (err) {
    console.error('Error accepting incoming order:', err);
    return null;
  }
}

export async function rejectIncomingOrder(docId, reason, staffId) {
  try {
    const docRef = doc(db, 'incomingOrders', docId);
    await updateDoc(docRef, { status: 'rejected', rejectedAt: Date.now(), rejectReason: reason });
    await addAuditLog('incoming_rejected', `Inkomende bestelling afgewezen: ${reason}`, staffId);
    return true;
  } catch (err) {
    return false;
  }
}

// ===== ODOO INTEGRATION =====
export async function getOdooSettings() {
  if (typeof window === 'undefined') return {};
  try {
    const snap = await getDoc(doc(db, 'settings', 'odoo'));
    if (snap.exists()) return snap.data();
    return {};
  } catch (err) {
    return {};
  }
}

export async function saveOdooSettings(settings) {
  await setDoc(doc(db, 'settings', 'odoo'), settings);
}

export async function getOdooSyncLog() {
  try {
    const snap = await getDocs(collection(db, 'odooSyncLog'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return entries;
  } catch (err) {
    return [];
  }
}

export async function addOdooSyncLog(entry) {
  const full = {
    ...entry,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
  await addDoc(collection(db, 'odooSyncLog'), full);
  return full;
}

// ===== WEEKROOSTER (Weekly Schedule) =====
export async function getSchedule(weekStart) {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(collection(db, 'schedules'));
    const entries = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    return entries.filter(e => e.weekStart === weekStart);
  } catch (err) {
    console.error('Error loading schedule:', err);
    return [];
  }
}

export async function saveScheduleShift(shift) {
  const full = {
    ...shift,
    id: shift.id || `shift_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    updatedAt: Date.now(),
  };
  // Check if shift already exists
  if (shift._docId) {
    const docRef = doc(db, 'schedules', shift._docId);
    await updateDoc(docRef, full);
    return full;
  }
  const docRef = await addDoc(collection(db, 'schedules'), full);
  return { ...full, _docId: docRef.id };
}

export async function deleteScheduleShift(docId) {
  await deleteDoc(doc(db, 'schedules', docId));
}

export async function copyWeekSchedule(fromWeekStart, toWeekStart) {
  const shifts = await getSchedule(fromWeekStart);
  const newShifts = [];
  for (const shift of shifts) {
    const { _docId, ...data } = shift;
    const dayOffset = new Date(toWeekStart) - new Date(fromWeekStart);
    const oldDate = new Date(data.date);
    oldDate.setTime(oldDate.getTime() + dayOffset);
    const newShift = {
      ...data,
      id: `shift_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      weekStart: toWeekStart,
      date: oldDate.toISOString().split('T')[0],
      updatedAt: Date.now(),
    };
    const docRef = await addDoc(collection(db, 'schedules'), newShift);
    newShifts.push({ ...newShift, _docId: docRef.id });
  }
  return newShifts;
}
