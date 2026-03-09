// POS System - Data layer with Firestore persistence
import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from 'firebase/firestore';

// Default fastfood categories
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

// Default menu items for a fastfood restaurant
const DEFAULT_MENU_ITEMS = [
  // Burgers
  { id: 1, name: 'Hamburger', price: 3.50, category: 'burgers', available: true },
  { id: 2, name: 'Cheeseburger', price: 4.00, category: 'burgers', available: true },
  { id: 3, name: 'Double Burger', price: 6.50, category: 'burgers', available: true },
  { id: 4, name: 'Bacon Burger', price: 5.50, category: 'burgers', available: true },
  { id: 5, name: 'Chicken Burger', price: 5.00, category: 'burgers', available: true },
  { id: 6, name: 'Visburger', price: 4.50, category: 'burgers', available: true },
  { id: 7, name: 'Veggie Burger', price: 5.00, category: 'burgers', available: true },
  { id: 8, name: 'Big Tasty', price: 7.50, category: 'burgers', available: true },

  // Chicken
  { id: 10, name: 'Chicken Nuggets 6st', price: 4.00, category: 'chicken', available: true },
  { id: 11, name: 'Chicken Nuggets 9st', price: 5.50, category: 'chicken', available: true },
  { id: 12, name: 'Chicken Wings 6st', price: 5.00, category: 'chicken', available: true },
  { id: 13, name: 'Chicken Tenders 3st', price: 4.50, category: 'chicken', available: true },
  { id: 14, name: 'Kip Wrap', price: 5.50, category: 'chicken', available: true },

  // Frites & Snacks
  { id: 20, name: 'Patat Klein', price: 2.50, category: 'fries', available: true },
  { id: 21, name: 'Patat Midden', price: 3.50, category: 'fries', available: true },
  { id: 22, name: 'Patat Groot', price: 4.50, category: 'fries', available: true },
  { id: 23, name: 'Frikandel', price: 2.00, category: 'fries', available: true },
  { id: 24, name: 'Kroket', price: 2.00, category: 'fries', available: true },
  { id: 25, name: 'Kaassouffle', price: 2.50, category: 'fries', available: true },
  { id: 26, name: 'Bitterballen 6st', price: 4.00, category: 'fries', available: true },
  { id: 27, name: 'Loempia', price: 3.00, category: 'fries', available: true },
  { id: 28, name: 'Onion Rings', price: 3.50, category: 'fries', available: true },

  // Dranken
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

  // Desserts
  { id: 40, name: 'Softijs', price: 2.00, category: 'desserts', available: true },
  { id: 41, name: 'Sundae Caramel', price: 3.00, category: 'desserts', available: true },
  { id: 42, name: 'Sundae Choco', price: 3.00, category: 'desserts', available: true },
  { id: 43, name: 'Appeltaart', price: 2.50, category: 'desserts', available: true },
  { id: 44, name: 'Donut', price: 1.50, category: 'desserts', available: true },

  // Menu's (combos)
  { id: 50, name: 'Hamburger Menu', price: 7.50, category: 'menu', available: true },
  { id: 51, name: 'Cheeseburger Menu', price: 8.00, category: 'menu', available: true },
  { id: 52, name: 'Double Burger Menu', price: 10.50, category: 'menu', available: true },
  { id: 53, name: 'Chicken Burger Menu', price: 9.00, category: 'menu', available: true },
  { id: 54, name: 'Big Tasty Menu', price: 11.50, category: 'menu', available: true },
  { id: 55, name: 'Nuggets Menu 6st', price: 8.00, category: 'menu', available: true },
  { id: 56, name: 'Kindermenu', price: 6.00, category: 'menu', available: true },

  // Sauzen
  { id: 60, name: 'Mayonaise', price: 0.50, category: 'sauzen', available: true },
  { id: 61, name: 'Ketchup', price: 0.50, category: 'sauzen', available: true },
  { id: 62, name: 'Curry', price: 0.50, category: 'sauzen', available: true },
  { id: 63, name: 'Joppiesaus', price: 0.50, category: 'sauzen', available: true },
  { id: 64, name: 'Sambal', price: 0.50, category: 'sauzen', available: true },
  { id: 65, name: 'Knoflooksaus', price: 0.50, category: 'sauzen', available: true },
  { id: 66, name: 'BBQ Saus', price: 0.50, category: 'sauzen', available: true },

  // Extra's
  { id: 70, name: 'Extra Kaas', price: 0.75, category: 'extras', available: true },
  { id: 71, name: 'Extra Bacon', price: 1.00, category: 'extras', available: true },
  { id: 72, name: 'Extra Sla/Tomaat', price: 0.50, category: 'extras', available: true },
  { id: 73, name: 'Upgrade Groot Patat', price: 1.00, category: 'extras', available: true },
  { id: 74, name: 'Upgrade Groot Drank', price: 0.75, category: 'extras', available: true },
];

export async function getCategories() {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  try {
    const snap = await getDoc(doc(db, 'settings', 'categories'));
    if (snap.exists()) return snap.data().items;
    // Initialize with defaults
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
    // Initialize with defaults
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

export async function getOrders() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'orders'), orderBy('timestamp', 'desc'))
    );
    return snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
  } catch (err) {
    console.error('Error loading orders:', err);
    return [];
  }
}

export async function saveOrder(order) {
  await addDoc(collection(db, 'orders'), order);
  return order;
}

export async function updateOrder(orderId, updates) {
  try {
    // Find the Firestore doc by order id field
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
    return Date.now(); // fallback
  }
}

export async function getTodayOrders() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const snap = await getDocs(
      query(collection(db, 'orders'), where('date', '==', today), orderBy('timestamp', 'desc'))
    );
    return snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
  } catch (err) {
    console.error('Error loading today orders:', err);
    return [];
  }
}

export function formatPrice(amount) {
  return `€${amount.toFixed(2)}`;
}

export async function resetDailyCounter() {
  await setDoc(doc(db, 'settings', 'orderCounter'), { value: 0 });
}

// ===== INDEPENDENT MODIFIER GROUPS (Lightspeed-style) =====
// Modifier groups are standalone entities that can be linked to categories or products

const DEFAULT_MODIFIER_GROUPS = [
  {
    id: 'mg_burger_saus',
    name: 'Burger Saus',
    type: 'single',
    options: [
      { name: 'Geen saus', price: 0 },
      { name: 'Mayonaise', price: 0 },
      { name: 'Ketchup', price: 0 },
      { name: 'Curry', price: 0 },
      { name: 'Joppiesaus', price: 0 },
      { name: 'Sambal', price: 0 },
      { name: 'Knoflooksaus', price: 0 },
      { name: 'BBQ Saus', price: 0 },
    ],
  },
  {
    id: 'mg_groenten',
    name: 'Groenten',
    type: 'multi',
    defaultSelected: ['Sla', 'Tomaat', 'Ui', 'Augurk'],
    options: [
      { name: 'Sla', price: 0 },
      { name: 'Tomaat', price: 0 },
      { name: 'Ui', price: 0 },
      { name: 'Augurk', price: 0 },
      { name: 'Jalapeno', price: 0 },
    ],
  },
  {
    id: 'mg_burger_extras',
    name: "Burger Extra's",
    type: 'multi',
    options: [
      { name: 'Extra Kaas', price: 0.75 },
      { name: 'Extra Bacon', price: 1.00 },
      { name: 'Extra Saus', price: 0.50 },
    ],
  },
  {
    id: 'mg_chicken_saus',
    name: 'Chicken Saus',
    type: 'single',
    options: [
      { name: 'Geen saus', price: 0 },
      { name: 'Mayonaise', price: 0 },
      { name: 'Ketchup', price: 0 },
      { name: 'Curry', price: 0 },
      { name: 'BBQ Saus', price: 0 },
      { name: 'Sweet Chili', price: 0 },
      { name: 'Knoflooksaus', price: 0 },
    ],
  },
  {
    id: 'mg_friet_saus',
    name: 'Friet Saus',
    type: 'single',
    options: [
      { name: 'Geen saus', price: 0 },
      { name: 'Mayonaise', price: 0.50 },
      { name: 'Ketchup', price: 0.50 },
      { name: 'Curry', price: 0.50 },
      { name: 'Joppiesaus', price: 0.50 },
      { name: 'Sambal', price: 0.50 },
      { name: 'Knoflooksaus', price: 0.50 },
      { name: 'BBQ Saus', price: 0.50 },
      { name: 'Speciaal', price: 1.00 },
    ],
  },
  {
    id: 'mg_menu_drank',
    name: 'Menu Drank',
    type: 'single',
    options: [
      { name: 'Cola', price: 0 },
      { name: 'Cola Zero', price: 0 },
      { name: 'Fanta', price: 0 },
      { name: 'Sprite', price: 0 },
      { name: 'Ice Tea', price: 0 },
      { name: 'Water', price: 0 },
    ],
  },
  {
    id: 'mg_menu_patat_saus',
    name: 'Menu Patat Saus',
    type: 'single',
    options: [
      { name: 'Geen saus', price: 0 },
      { name: 'Mayonaise', price: 0 },
      { name: 'Ketchup', price: 0 },
      { name: 'Curry', price: 0 },
      { name: 'Speciaal', price: 0 },
    ],
  },
];

// Links connect modifier groups to categories or specific products
const DEFAULT_MODIFIER_LINKS = [
  // Burgers category
  { groupId: 'mg_burger_saus', targetType: 'category', targetId: 'burgers', sortOrder: 0 },
  { groupId: 'mg_groenten', targetType: 'category', targetId: 'burgers', sortOrder: 1 },
  { groupId: 'mg_burger_extras', targetType: 'category', targetId: 'burgers', sortOrder: 2 },
  // Chicken category
  { groupId: 'mg_chicken_saus', targetType: 'category', targetId: 'chicken', sortOrder: 0 },
  // Frites & Snacks category
  { groupId: 'mg_friet_saus', targetType: 'category', targetId: 'fries', sortOrder: 0 },
  // Menu's category
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

// Resolve which modifier groups apply to a specific product
// Checks both category-level and product-level links
export function resolveModifierGroups(product, allGroups, allLinks) {
  const categoryLinks = allLinks
    .filter(l => l.targetType === 'category' && l.targetId === product.category)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const productLinks = allLinks
    .filter(l => l.targetType === 'product' && String(l.targetId) === String(product.id))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // Combine: category links first, then product-specific links
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

// Backward compatibility wrapper - resolves old-style {categoryId: [groups]} format
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
