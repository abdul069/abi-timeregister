import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getCategories,
  getMenuItems,
  saveMenuItems,
  saveCategories,
  getCustomizationOptions,
  saveCustomizationOptions,
  formatPrice,
} from '../lib/pos-data';

export default function MenuBeheer() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('products');
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [customOptions, setCustomOptions] = useState({});
  const [activeCategory, setActiveCategory] = useState('burgers');
  const [saving, setSaving] = useState(false);

  // Product form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', category: 'burgers', available: true, variations: [] });

  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', icon: '', color: '#e74c3c' });

  // Customization form state
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: '', type: 'single', options: [{ name: '', price: 0 }], defaultSelected: [] });

  useEffect(() => {
    async function loadData() {
      const [cats, items, customs] = await Promise.all([
        getCategories(),
        getMenuItems(),
        getCustomizationOptions(),
      ]);
      setCategories(cats);
      setMenuItems(items);
      setCustomOptions(customs);
    }
    loadData();
  }, []);

  const filteredItems = menuItems.filter(i => i.category === activeCategory);

  // ===== PRODUCT FUNCTIONS =====
  const openAddProduct = () => {
    setProductForm({ name: '', price: '', category: activeCategory, available: true, variations: [] });
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const openEditProduct = (item) => {
    setProductForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
      available: item.available,
      variations: item.variations || [],
    });
    setEditingProduct(item);
    setShowProductForm(true);
  };

  const saveProduct = async () => {
    const price = parseFloat(productForm.price);
    if (!productForm.name.trim() || isNaN(price) || price < 0) return;
    if (saving) return;
    setSaving(true);
    try {
      const variations = productForm.variations
        .filter(v => v.name.trim() && !isNaN(parseFloat(v.price)))
        .map(v => ({ name: v.name.trim(), price: parseFloat(v.price) }));

      let updated;
      if (editingProduct) {
        updated = menuItems.map(i =>
          i.id === editingProduct.id
            ? { ...i, name: productForm.name.trim(), price, category: productForm.category, available: productForm.available, variations }
            : i
        );
      } else {
        const newId = Math.max(0, ...menuItems.map(i => i.id)) + 1;
        updated = [...menuItems, {
          id: newId,
          name: productForm.name.trim(),
          price,
          category: productForm.category,
          available: productForm.available,
          variations,
        }];
      }
      await saveMenuItems(updated);
      setMenuItems(updated);
      setShowProductForm(false);
    } catch (err) {
      alert('Fout bij opslaan.');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Product verwijderen?')) return;
    const updated = menuItems.filter(i => i.id !== id);
    await saveMenuItems(updated);
    setMenuItems(updated);
  };

  const toggleAvailable = async (id) => {
    const updated = menuItems.map(i => i.id === id ? { ...i, available: !i.available } : i);
    await saveMenuItems(updated);
    setMenuItems(updated);
  };

  // Variation helpers
  const addVariation = () => {
    setProductForm(prev => ({ ...prev, variations: [...prev.variations, { name: '', price: '' }] }));
  };
  const updateVariation = (idx, field, value) => {
    setProductForm(prev => ({
      ...prev,
      variations: prev.variations.map((v, i) => i === idx ? { ...v, [field]: value } : v),
    }));
  };
  const removeVariation = (idx) => {
    setProductForm(prev => ({ ...prev, variations: prev.variations.filter((_, i) => i !== idx) }));
  };

  // ===== CATEGORY FUNCTIONS =====
  const openAddCategory = () => {
    setCategoryForm({ id: '', name: '', icon: '📦', color: '#e74c3c' });
    setEditingCategory(null);
    setShowCategoryForm(true);
  };

  const openEditCategory = (cat) => {
    setCategoryForm({ id: cat.id, name: cat.name, icon: cat.icon, color: cat.color });
    setEditingCategory(cat);
    setShowCategoryForm(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.icon.trim()) return;
    if (saving) return;
    setSaving(true);
    try {
      let updated;
      if (editingCategory) {
        updated = categories.map(c =>
          c.id === editingCategory.id
            ? { ...c, name: categoryForm.name.trim(), icon: categoryForm.icon.trim(), color: categoryForm.color }
            : c
        );
      } else {
        const newId = categoryForm.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (categories.some(c => c.id === newId)) {
          alert('Categorie ID bestaat al.');
          setSaving(false);
          return;
        }
        updated = [...categories, {
          id: newId,
          name: categoryForm.name.trim(),
          icon: categoryForm.icon.trim(),
          color: categoryForm.color,
        }];
      }
      await saveCategories(updated);
      setCategories(updated);
      setShowCategoryForm(false);
    } catch (err) {
      alert('Fout bij opslaan.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (catId) => {
    const itemCount = menuItems.filter(i => i.category === catId).length;
    if (itemCount > 0) {
      alert(`Kan niet verwijderen: ${itemCount} producten in deze categorie.`);
      return;
    }
    if (!confirm('Categorie verwijderen?')) return;
    const updated = categories.filter(c => c.id !== catId);
    await saveCategories(updated);
    setCategories(updated);
    // Also remove customization options for this category
    const updatedCustom = { ...customOptions };
    delete updatedCustom[catId];
    await saveCustomizationOptions(updatedCustom);
    setCustomOptions(updatedCustom);
  };

  // ===== CUSTOMIZATION FUNCTIONS =====
  const currentGroups = customOptions[activeCategory] || [];

  const openAddGroup = () => {
    setGroupForm({ name: '', type: 'single', options: [{ name: '', price: 0 }], defaultSelected: [] });
    setEditingGroup(null);
    setShowGroupForm(true);
  };

  const openEditGroup = (group, idx) => {
    setGroupForm({
      name: group.name,
      type: group.type,
      options: group.options.length > 0 ? group.options.map(o => ({ ...o })) : [{ name: '', price: 0 }],
      defaultSelected: group.defaultSelected || [],
    });
    setEditingGroup(idx);
    setShowGroupForm(true);
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim()) return;
    if (saving) return;
    setSaving(true);
    try {
      const options = groupForm.options
        .filter(o => o.name.trim())
        .map(o => ({ name: o.name.trim(), price: parseFloat(o.price) || 0 }));

      if (options.length === 0) {
        alert('Voeg minstens 1 optie toe.');
        setSaving(false);
        return;
      }

      const group = {
        name: groupForm.name.trim(),
        type: groupForm.type,
        options,
      };
      if (groupForm.type === 'multi' && groupForm.defaultSelected.length > 0) {
        group.defaultSelected = groupForm.defaultSelected.filter(d => options.some(o => o.name === d));
      }

      const groups = [...currentGroups];
      if (editingGroup !== null) {
        groups[editingGroup] = group;
      } else {
        groups.push(group);
      }

      const updated = { ...customOptions, [activeCategory]: groups };
      await saveCustomizationOptions(updated);
      setCustomOptions(updated);
      setShowGroupForm(false);
    } catch (err) {
      alert('Fout bij opslaan.');
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (idx) => {
    if (!confirm('Aanpassingsgroep verwijderen?')) return;
    const groups = currentGroups.filter((_, i) => i !== idx);
    const updated = { ...customOptions, [activeCategory]: groups };
    await saveCustomizationOptions(updated);
    setCustomOptions(updated);
  };

  // Group form helpers
  const addGroupOption = () => {
    setGroupForm(prev => ({ ...prev, options: [...prev.options, { name: '', price: 0 }] }));
  };
  const updateGroupOption = (idx, field, value) => {
    setGroupForm(prev => ({
      ...prev,
      options: prev.options.map((o, i) => i === idx ? { ...o, [field]: value } : o),
    }));
  };
  const removeGroupOption = (idx) => {
    setGroupForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
  };
  const toggleDefault = (name) => {
    setGroupForm(prev => {
      const ds = prev.defaultSelected || [];
      return { ...prev, defaultSelected: ds.includes(name) ? ds.filter(n => n !== name) : [...ds, name] };
    });
  };

  const tabs = [
    { id: 'products', label: 'Producten', icon: '🛍' },
    { id: 'categories', label: 'Categorieen', icon: '📂' },
    { id: 'customizations', label: 'Aanpassingen', icon: '⚙️' },
  ];

  return (
    <div style={s.container}>
      {/* Top Bar */}
      <div style={s.topBar}>
        <button onClick={() => router.push('/pos')} style={s.backBtn}>← Terug</button>
        <h1 style={s.title}>Menu Beheer</h1>
        <div style={s.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ ...s.tab, ...(activeTab === tab.id ? s.tabActive : {}) }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={s.content}>
        {/* ===== PRODUCTS TAB ===== */}
        {activeTab === 'products' && (
          <>
            <div style={s.sidebar}>
              <h3 style={s.sidebarTitle}>Categorieen</h3>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    ...s.sidebarBtn,
                    ...(activeCategory === cat.id ? { background: cat.color + '15', borderLeft: `3px solid ${cat.color}`, color: cat.color } : {}),
                  }}
                >
                  <span>{cat.icon}</span>
                  <span style={{ flex: 1 }}>{cat.name}</span>
                  <span style={s.badge}>{menuItems.filter(i => i.category === cat.id).length}</span>
                </button>
              ))}
            </div>
            <div style={s.main}>
              <div style={s.mainHeader}>
                <h2 style={s.mainTitle}>
                  {categories.find(c => c.id === activeCategory)?.icon}{' '}
                  {categories.find(c => c.id === activeCategory)?.name}
                </h2>
                <button onClick={openAddProduct} style={s.addBtn}>+ Nieuw Product</button>
              </div>
              <div style={s.list}>
                {filteredItems.map(item => (
                  <div key={item.id} style={{ ...s.row, opacity: item.available ? 1 : 0.5 }}>
                    <div style={s.rowInfo}>
                      <div style={s.rowName}>{item.name}</div>
                      <div style={s.rowPrice}>{formatPrice(item.price)}</div>
                      {item.variations && item.variations.length > 0 && (
                        <div style={s.rowVariations}>
                          {item.variations.map(v => `${v.name}: ${formatPrice(v.price)}`).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div style={s.rowActions}>
                      <button onClick={() => toggleAvailable(item.id)} style={{ ...s.toggleBtn, background: item.available ? '#27ae60' : '#e74c3c' }}>
                        {item.available ? 'Beschikbaar' : 'Uitverkocht'}
                      </button>
                      <button onClick={() => openEditProduct(item)} style={s.editBtn}>Bewerken</button>
                      <button onClick={() => deleteProduct(item.id)} style={s.delBtn}>×</button>
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && <div style={s.empty}>Geen producten in deze categorie</div>}
              </div>
            </div>
          </>
        )}

        {/* ===== CATEGORIES TAB ===== */}
        {activeTab === 'categories' && (
          <div style={{ ...s.main, flex: 1 }}>
            <div style={s.mainHeader}>
              <h2 style={s.mainTitle}>Categorieen Beheren</h2>
              <button onClick={openAddCategory} style={s.addBtn}>+ Nieuwe Categorie</button>
            </div>
            <div style={s.list}>
              {categories.map(cat => (
                <div key={cat.id} style={s.row}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <span style={{ fontSize: '28px' }}>{cat.icon}</span>
                    <div>
                      <div style={s.rowName}>{cat.name}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>ID: {cat.id} · {menuItems.filter(i => i.category === cat.id).length} producten</div>
                    </div>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: cat.color, marginLeft: '8px' }} />
                  </div>
                  <div style={s.rowActions}>
                    <button onClick={() => openEditCategory(cat)} style={s.editBtn}>Bewerken</button>
                    <button onClick={() => deleteCategory(cat.id)} style={s.delBtn}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== CUSTOMIZATIONS TAB ===== */}
        {activeTab === 'customizations' && (
          <>
            <div style={s.sidebar}>
              <h3 style={s.sidebarTitle}>Categorie</h3>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    ...s.sidebarBtn,
                    ...(activeCategory === cat.id ? { background: cat.color + '15', borderLeft: `3px solid ${cat.color}`, color: cat.color } : {}),
                  }}
                >
                  <span>{cat.icon}</span>
                  <span style={{ flex: 1 }}>{cat.name}</span>
                  <span style={s.badge}>{(customOptions[cat.id] || []).length}</span>
                </button>
              ))}
            </div>
            <div style={s.main}>
              <div style={s.mainHeader}>
                <h2 style={s.mainTitle}>
                  Aanpassingen: {categories.find(c => c.id === activeCategory)?.name || activeCategory}
                </h2>
                <button onClick={openAddGroup} style={s.addBtn}>+ Nieuwe Groep</button>
              </div>
              <div style={s.list}>
                {currentGroups.length === 0 && (
                  <div style={s.empty}>Geen aanpassingen voor deze categorie. Voeg een groep toe (bijv. Saus, Groenten, Extra's).</div>
                )}
                {currentGroups.map((group, gIdx) => (
                  <div key={gIdx} style={s.groupCard}>
                    <div style={s.groupHeader}>
                      <div>
                        <span style={s.groupName}>{group.name}</span>
                        <span style={s.groupType}>{group.type === 'single' ? 'Kies 1' : 'Meerdere'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEditGroup(group, gIdx)} style={s.editBtn}>Bewerken</button>
                        <button onClick={() => deleteGroup(gIdx)} style={s.delBtn}>×</button>
                      </div>
                    </div>
                    <div style={s.groupOptions}>
                      {group.options.map((opt, oIdx) => (
                        <span key={oIdx} style={s.optionChip}>
                          {opt.name}
                          {opt.price > 0 && <span style={{ color: '#e74c3c', marginLeft: '4px' }}>+{formatPrice(opt.price)}</span>}
                          {group.defaultSelected && group.defaultSelected.includes(opt.name) && (
                            <span style={{ color: '#27ae60', marginLeft: '4px' }}>✓</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== PRODUCT FORM MODAL ===== */}
      {showProductForm && (
        <div style={s.overlay} onClick={() => setShowProductForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editingProduct ? 'Product Bewerken' : 'Nieuw Product'}</h2>
            <div style={s.formGroup}>
              <label style={s.label}>Productnaam</label>
              <input
                type="text"
                value={productForm.name}
                onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                style={s.input}
                placeholder="bijv. Cheeseburger"
                autoFocus
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Basisprijs (EUR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={productForm.price}
                onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                style={s.input}
                placeholder="0.00"
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Categorie</label>
              <select
                value={productForm.category}
                onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                style={s.input}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={productForm.available}
                  onChange={e => setProductForm({ ...productForm, available: e.target.checked })}
                />
                Beschikbaar
              </label>
            </div>

            {/* Variations Section */}
            <div style={s.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={s.label}>Variaties (optioneel)</label>
                <button onClick={addVariation} style={s.smallAddBtn}>+ Variatie</button>
              </div>
              {productForm.variations.length === 0 && (
                <div style={{ fontSize: '12px', color: '#999', padding: '8px 0' }}>
                  Geen variaties. Voeg toe voor formaten zoals Klein/Medium/Groot.
                </div>
              )}
              {productForm.variations.map((v, idx) => (
                <div key={idx} style={s.variationRow}>
                  <input
                    type="text"
                    value={v.name}
                    onChange={e => updateVariation(idx, 'name', e.target.value)}
                    style={{ ...s.input, flex: 1 }}
                    placeholder="bijv. Medium"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={v.price}
                    onChange={e => updateVariation(idx, 'price', e.target.value)}
                    style={{ ...s.input, width: '90px' }}
                    placeholder="Prijs"
                  />
                  <button onClick={() => removeVariation(idx)} style={s.delBtnSmall}>×</button>
                </div>
              ))}
            </div>

            <div style={s.formActions}>
              <button onClick={() => setShowProductForm(false)} style={s.cancelBtn}>Annuleren</button>
              <button onClick={saveProduct} style={s.saveBtn} disabled={saving}>
                {saving ? 'Opslaan...' : (editingProduct ? 'Opslaan' : 'Toevoegen')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CATEGORY FORM MODAL ===== */}
      {showCategoryForm && (
        <div style={s.overlay} onClick={() => setShowCategoryForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editingCategory ? 'Categorie Bewerken' : 'Nieuwe Categorie'}</h2>
            <div style={s.formGroup}>
              <label style={s.label}>Naam</label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                style={s.input}
                placeholder="bijv. Burgers"
                autoFocus
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Emoji/Icon</label>
              <input
                type="text"
                value={categoryForm.icon}
                onChange={e => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                style={s.input}
                placeholder="bijv. 🍔"
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Kleur</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  style={{ width: '50px', height: '40px', border: 'none', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: '#666' }}>{categoryForm.color}</span>
              </div>
            </div>
            <div style={s.formActions}>
              <button onClick={() => setShowCategoryForm(false)} style={s.cancelBtn}>Annuleren</button>
              <button onClick={saveCategory} style={s.saveBtn} disabled={saving}>
                {saving ? 'Opslaan...' : (editingCategory ? 'Opslaan' : 'Toevoegen')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CUSTOMIZATION GROUP FORM MODAL ===== */}
      {showGroupForm && (
        <div style={s.overlay} onClick={() => setShowGroupForm(false)}>
          <div style={{ ...s.modal, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editingGroup !== null ? 'Groep Bewerken' : 'Nieuwe Aanpassingsgroep'}</h2>
            <div style={s.formGroup}>
              <label style={s.label}>Groepsnaam</label>
              <input
                type="text"
                value={groupForm.name}
                onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                style={s.input}
                placeholder="bijv. Saus, Groenten, Extra's"
                autoFocus
              />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Type</label>
              <select
                value={groupForm.type}
                onChange={e => setGroupForm({ ...groupForm, type: e.target.value })}
                style={s.input}
              >
                <option value="single">Enkele keuze (kies 1)</option>
                <option value="multi">Meerdere keuzes</option>
              </select>
            </div>
            <div style={s.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={s.label}>Opties</label>
                <button onClick={addGroupOption} style={s.smallAddBtn}>+ Optie</button>
              </div>
              {groupForm.options.map((opt, idx) => (
                <div key={idx} style={s.variationRow}>
                  <input
                    type="text"
                    value={opt.name}
                    onChange={e => updateGroupOption(idx, 'name', e.target.value)}
                    style={{ ...s.input, flex: 1 }}
                    placeholder="bijv. Mayonaise"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={opt.price}
                    onChange={e => updateGroupOption(idx, 'price', e.target.value)}
                    style={{ ...s.input, width: '80px' }}
                    placeholder="€"
                  />
                  {groupForm.type === 'multi' && opt.name.trim() && (
                    <button
                      onClick={() => toggleDefault(opt.name.trim())}
                      style={{
                        ...s.defaultToggle,
                        background: (groupForm.defaultSelected || []).includes(opt.name.trim()) ? '#27ae60' : '#eee',
                        color: (groupForm.defaultSelected || []).includes(opt.name.trim()) ? '#fff' : '#999',
                      }}
                      title="Standaard aan"
                    >
                      ✓
                    </button>
                  )}
                  <button onClick={() => removeGroupOption(idx)} style={s.delBtnSmall}>×</button>
                </div>
              ))}
              {groupForm.type === 'multi' && (
                <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
                  ✓ = standaard geselecteerd bij nieuwe bestelling
                </div>
              )}
            </div>
            <div style={s.formActions}>
              <button onClick={() => setShowGroupForm(false)} style={s.cancelBtn}>Annuleren</button>
              <button onClick={saveGroup} style={s.saveBtn} disabled={saving}>
                {saving ? 'Opslaan...' : (editingGroup !== null ? 'Opslaan' : 'Toevoegen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  topBar: { display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 24px', background: '#fff', borderBottom: '1px solid #e0e0e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap' },
  backBtn: { padding: '8px 16px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  title: { margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1a1a2e' },
  tabs: { display: 'flex', gap: '4px', marginLeft: 'auto', background: '#f0f2f5', borderRadius: '8px', padding: '3px' },
  tab: { padding: '8px 16px', border: 'none', borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#666', transition: 'all 0.15s' },
  tabActive: { background: '#fff', color: '#1a1a2e', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  content: { display: 'flex', height: 'calc(100vh - 60px)' },
  sidebar: { width: '220px', background: '#fff', borderRight: '1px solid #e0e0e0', padding: '16px 0', overflowY: 'auto' },
  sidebarTitle: { margin: '0 0 12px', padding: '0 20px', fontSize: '11px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.5px' },
  sidebarBtn: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 20px', border: 'none', borderLeft: '3px solid transparent', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#555', textAlign: 'left' },
  badge: { marginLeft: 'auto', background: '#f0f0f0', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', color: '#888' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  mainHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' },
  mainTitle: { margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1a1a2e' },
  addBtn: { padding: '8px 18px', border: 'none', borderRadius: '8px', background: '#e74c3c', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  list: { flex: 1, overflowY: 'auto', padding: '0 24px 24px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', borderRadius: '10px', marginBottom: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  rowInfo: { display: 'flex', alignItems: 'center', gap: '16px', flex: 1, flexWrap: 'wrap' },
  rowName: { fontSize: '14px', fontWeight: '600', color: '#333' },
  rowPrice: { fontSize: '14px', fontWeight: 'bold', color: '#e74c3c' },
  rowVariations: { fontSize: '11px', color: '#888', width: '100%' },
  rowActions: { display: 'flex', gap: '6px', flexShrink: 0 },
  toggleBtn: { padding: '5px 12px', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  editBtn: { padding: '5px 12px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', fontSize: '11px', cursor: 'pointer', color: '#555' },
  delBtn: { padding: '5px 10px', border: '1px solid #fdd', borderRadius: '6px', background: '#fff', fontSize: '14px', cursor: 'pointer', color: '#e74c3c', fontWeight: 'bold' },
  empty: { textAlign: 'center', padding: '40px', color: '#999', fontSize: '14px' },

  // Group cards for customizations
  groupCard: { background: '#fff', borderRadius: '10px', marginBottom: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' },
  groupHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' },
  groupName: { fontSize: '15px', fontWeight: '700', color: '#333' },
  groupType: { marginLeft: '10px', fontSize: '11px', color: '#999', fontWeight: '400' },
  groupOptions: { display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '12px 16px' },
  optionChip: { padding: '4px 10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '12px', color: '#555' },

  // Modals
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '16px', padding: '28px', width: '440px', maxWidth: '95vw' },
  modalTitle: { margin: '0 0 20px', fontSize: '18px', fontWeight: 'bold', color: '#1a1a2e' },
  formGroup: { marginBottom: '14px' },
  label: { display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#555' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' },
  formActions: { display: 'flex', gap: '10px', marginTop: '20px' },
  cancelBtn: { flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#666' },
  saveBtn: { flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: '#e74c3c', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  smallAddBtn: { padding: '4px 12px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '12px', color: '#555', fontWeight: '600' },
  variationRow: { display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' },
  delBtnSmall: { padding: '6px 10px', border: '1px solid #fdd', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#e74c3c', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 },
  defaultToggle: { width: '30px', height: '30px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};
