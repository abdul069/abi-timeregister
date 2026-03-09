import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getCategories,
  getMenuItems,
  saveMenuItems,
  saveCategories,
  formatPrice,
} from '../lib/pos-data';

export default function MenuBeheer() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('burgers');
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', category: 'burgers', available: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [cats, items] = await Promise.all([getCategories(), getMenuItems()]);
      setCategories(cats);
      setMenuItems(items);
    }
    loadData();
  }, []);

  const filteredItems = menuItems.filter(i => i.category === activeCategory);

  const openAddForm = () => {
    setFormData({ name: '', price: '', category: activeCategory, available: true });
    setEditingItem(null);
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setFormData({ name: item.name, price: String(item.price), category: item.category, available: item.available });
    setEditingItem(item);
    setShowForm(true);
  };

  const saveItem = async () => {
    const price = parseFloat(formData.price);
    if (!formData.name.trim() || isNaN(price) || price < 0) return;
    if (saving) return;
    setSaving(true);

    try {
      let updated;
      if (editingItem) {
        updated = menuItems.map(i =>
          i.id === editingItem.id
            ? { ...i, name: formData.name.trim(), price, category: formData.category, available: formData.available }
            : i
        );
      } else {
        const newId = Math.max(0, ...menuItems.map(i => i.id)) + 1;
        updated = [...menuItems, {
          id: newId,
          name: formData.name.trim(),
          price,
          category: formData.category,
          available: formData.available,
        }];
      }

      await saveMenuItems(updated);
      setMenuItems(updated);
      setShowForm(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving item:', err);
      alert('Fout bij opslaan. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    const updated = menuItems.filter(i => i.id !== id);
    await saveMenuItems(updated);
    setMenuItems(updated);
  };

  const toggleAvailable = async (id) => {
    const updated = menuItems.map(i => i.id === id ? { ...i, available: !i.available } : i);
    await saveMenuItems(updated);
    setMenuItems(updated);
  };

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button onClick={() => router.push('/pos')} style={styles.backBtn}>← Terug</button>
        <h1 style={styles.title}>Menu Beheer</h1>
        <button onClick={openAddForm} style={styles.addBtn}>+ Nieuw Product</button>
      </div>

      <div style={styles.content}>
        {/* Sidebar Categories */}
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Categorieen</h3>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                ...styles.sidebarBtn,
                ...(activeCategory === cat.id ? { background: cat.color + '15', borderLeft: `3px solid ${cat.color}`, color: cat.color } : {}),
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
              <span style={styles.itemCount}>
                {menuItems.filter(i => i.category === cat.id).length}
              </span>
            </button>
          ))}
        </div>

        {/* Items List */}
        <div style={styles.itemsPanel}>
          <div style={styles.itemsHeader}>
            <h2 style={styles.itemsTitle}>
              {categories.find(c => c.id === activeCategory)?.icon}{' '}
              {categories.find(c => c.id === activeCategory)?.name}
            </h2>
            <span style={styles.itemsCount}>{filteredItems.length} producten</span>
          </div>

          <div style={styles.itemsList}>
            {filteredItems.map(item => (
              <div key={item.id} style={{
                ...styles.itemRow,
                opacity: item.available ? 1 : 0.5,
              }}>
                <div style={styles.itemInfo}>
                  <div style={styles.itemName}>{item.name}</div>
                  <div style={styles.itemPrice}>{formatPrice(item.price)}</div>
                </div>
                <div style={styles.itemActions}>
                  <button
                    onClick={() => toggleAvailable(item.id)}
                    style={{
                      ...styles.toggleBtn,
                      background: item.available ? '#27ae60' : '#e74c3c',
                    }}
                  >
                    {item.available ? 'Beschikbaar' : 'Uitverkocht'}
                  </button>
                  <button onClick={() => openEditForm(item)} style={styles.editBtn}>Bewerken</button>
                  <button onClick={() => deleteItem(item.id)} style={styles.delBtn}>Verwijderen</button>
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                Geen producten in deze categorie
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editingItem ? 'Product Bewerken' : 'Nieuw Product'}
            </h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Productnaam</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                style={styles.input}
                placeholder="bijv. Cheeseburger"
                autoFocus
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Prijs (EUR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                style={styles.input}
                placeholder="0.00"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Categorie</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                style={styles.input}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={e => setFormData({ ...formData, available: e.target.checked })}
                />
                Beschikbaar
              </label>
            </div>
            <div style={styles.formActions}>
              <button onClick={() => setShowForm(false)} style={styles.cancelFormBtn}>Annuleren</button>
              <button onClick={saveItem} style={styles.saveBtn} disabled={saving}>
                {saving ? 'Opslaan...' : (editingItem ? 'Opslaan' : 'Toevoegen')}
              </button>
            </div>
          </div>
        </div>
      )}
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
    flex: 1,
  },
  addBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    background: '#e74c3c',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  content: {
    display: 'flex',
    height: 'calc(100vh - 70px)',
  },
  sidebar: {
    width: '240px',
    background: '#fff',
    borderRight: '1px solid #e0e0e0',
    padding: '16px 0',
    overflowY: 'auto',
  },
  sidebarTitle: {
    margin: '0 0 12px',
    padding: '0 20px',
    fontSize: '13px',
    textTransform: 'uppercase',
    color: '#999',
    letterSpacing: '0.5px',
  },
  sidebarBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 20px',
    border: 'none',
    borderLeft: '3px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#555',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  itemCount: {
    marginLeft: 'auto',
    background: '#f0f0f0',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    color: '#888',
  },
  itemsPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  itemsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
  },
  itemsTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  itemsCount: {
    color: '#999',
    fontSize: '14px',
  },
  itemsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 24px 24px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    background: '#fff',
    borderRadius: '10px',
    marginBottom: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.15s',
  },
  itemInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  itemName: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#333',
  },
  itemPrice: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  itemActions: {
    display: 'flex',
    gap: '8px',
  },
  toggleBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  editBtn: {
    padding: '6px 14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    background: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#555',
  },
  delBtn: {
    padding: '6px 14px',
    border: '1px solid #fdd',
    borderRadius: '6px',
    background: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#e74c3c',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    width: '420px',
  },
  modalTitle: {
    margin: '0 0 24px',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '24px',
  },
  cancelFormBtn: {
    flex: 1,
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#666',
  },
  saveBtn: {
    flex: 1,
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    background: '#e74c3c',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};
