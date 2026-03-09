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

// Default customization options per category
const DEFAULT_CUSTOMIZATION_OPTIONS = {
  burgers: [
    {
      name: 'Saus',
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
      ]
    },
    {
      name: 'Groenten',
      type: 'multi',
      defaultSelected: ['Sla', 'Tomaat', 'Ui', 'Augurk'],
      options: [
        { name: 'Sla', price: 0 },
        { name: 'Tomaat', price: 0 },
        { name: 'Ui', price: 0 },
        { name: 'Augurk', price: 0 },
        { name: 'Jalapeno', price: 0 },
      ]
    },
    {
      name: "Extra's",
      type: 'multi',
      options: [
        { name: 'Extra Kaas', price: 0.75 },
        { name: 'Extra Bacon', price: 1.00 },
        { name: 'Extra Saus', price: 0.50 },
      ]
    }
  ],
  chicken: [
    {
      name: 'Saus',
      type: 'single',
      options: [
        { name: 'Geen saus', price: 0 },
        { name: 'Mayonaise', price: 0 },
        { name: 'Ketchup', price: 0 },
        { name: 'Curry', price: 0 },
        { name: 'BBQ Saus', price: 0 },
        { name: 'Sweet Chili', price: 0 },
        { name: 'Knoflooksaus', price: 0 },
      ]
    },
  ],
  fries: [
    {
      name: 'Saus',
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
      ]
    },
  ],
  menu: [
    {
      name: 'Saus Burger',
      type: 'single',
      options: [
        { name: 'Geen saus', price: 0 },
        { name: 'Mayonaise', price: 0 },
        { name: 'Ketchup', price: 0 },
        { name: 'Curry', price: 0 },
        { name: 'Joppiesaus', price: 0 },
        { name: 'BBQ Saus', price: 0 },
      ]
    },
    {
      name: 'Groenten',
      type: 'multi',
      defaultSelected: ['Sla', 'Tomaat', 'Ui', 'Augurk'],
      options: [
        { name: 'Sla', price: 0 },
        { name: 'Tomaat', price: 0 },
        { name: 'Ui', price: 0 },
        { name: 'Augurk', price: 0 },
      ]
    },
    {
      name: 'Drank',
      type: 'single',
      options: [
        { name: 'Cola', price: 0 },
        { name: 'Cola Zero', price: 0 },
        { name: 'Fanta', price: 0 },
        { name: 'Sprite', price: 0 },
        { name: 'Ice Tea', price: 0 },
        { name: 'Water', price: 0 },
      ]
    },
    {
      name: 'Saus Patat',
      type: 'single',
      options: [
        { name: 'Geen saus', price: 0 },
        { name: 'Mayonaise', price: 0 },
        { name: 'Ketchup', price: 0 },
        { name: 'Curry', price: 0 },
        { name: 'Speciaal', price: 0 },
      ]
    },
  ],
};

export async function getCustomizationOptions() {
  if (typeof window === 'undefined') return DEFAULT_CUSTOMIZATION_OPTIONS;
  try {
    const snap = await getDoc(doc(db, 'settings', 'customizations'));
    if (snap.exists()) return snap.data().items;
    await setDoc(doc(db, 'settings', 'customizations'), { items: DEFAULT_CUSTOMIZATION_OPTIONS });
    return DEFAULT_CUSTOMIZATION_OPTIONS;
  } catch (err) {
    console.error('Error loading customization options:', err);
    return DEFAULT_CUSTOMIZATION_OPTIONS;
  }
}

export async function saveCustomizationOptions(options) {
  await setDoc(doc(db, 'settings', 'customizations'), { items: options });
}
