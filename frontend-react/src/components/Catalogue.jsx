import React, { useState, useEffect } from 'react';

export default function Catalogue({
  products,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  onSaveProduct,
  onToggleStatus,
  onDeleteProduct,
  kpiStats,
  savingProduct,
  showToast,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Form states
  const [prodId, setProdId] = useState('');
  const [prodCode, setProdCode] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodType, setProdType] = useState('PRODUCT');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('0');
  const [prodMinStock, setProdMinStock] = useState('0');
  const [prodTva, setProdTva] = useState('19');
  const [prodUnit, setProdUnit] = useState('PIECE');
  const [prodActive, setProdActive] = useState('true');
  const [prodDescription, setProdDescription] = useState('');

  // Field errors
  const [errors, setErrors] = useState({});

  const handleOpenModal = async (product = null) => {
    setErrors({});
    if (product) {
      // Edit Mode
      setEditItem(product);
      setProdId(product.ID);
      setProdCode(product.code || '');
      setProdName(product.name || '');
      setProdCategory(product.category || '');
      setProdType(product.type || 'PRODUCT');
      setProdPrice(product.unitPrice || '');
      setProdStock(String(product.stock ?? 0));
      setProdMinStock(String(product.minStock ?? 0));
      setProdTva(String(product.tvaRate ?? 19));
      setProdUnit(product.unit || 'PIECE');
      setProdActive(String(product.isActive !== false));
      setProdDescription(product.description || '');
      setModalOpen(true);
    } else {
      // Create Mode - Auto generate SKU
      setEditItem(null);
      setProdId('');
      setProdName('');
      setProdCategory('');
      setProdType('PRODUCT');
      setProdPrice('');
      setProdStock('0');
      setProdMinStock('0');
      setProdTva('19');
      setProdUnit('PIECE');
      setProdActive('true');
      setProdDescription('');
      setProdCode('PROD-TEMP');
      setModalOpen(true);

      try {
        const res = await fetch('/odata/v4/admin/Produits?$orderby=code desc&$top=1', {
          headers: { 'Authorization': 'Basic ' + btoa('admin:admin') }
        });
        const data = await res.json();
        const existing = data.value || [];
        let nextNum = 1;
        if (existing.length > 0) {
          const allRes = await fetch('/odata/v4/admin/Produits?$select=code', {
            headers: { 'Authorization': 'Basic ' + btoa('admin:admin') }
          });
          const allData = await allRes.json();
          const allCodes = (allData.value || []).map(p => p.code || '');
          const nums = allCodes
            .map(c => {
              const m = c.match(/-(\d+)$/);
              return m ? parseInt(m[1]) : 0;
            })
            .filter(n => !isNaN(n));
          nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
        }
        setProdCode(`PROD-${String(nextNum).padStart(3, '0')}`);
      } catch (e) {
        setProdCode(`PROD-${Date.now().toString().slice(-3)}`);
      }
    }
  };

  const handleSave = () => {
    const newErrors = {};
    const nameVal = prodName.trim();
    const priceVal = parseFloat(prodPrice);

    if (!nameVal) {
      newErrors.name = 'Le nom du produit est requis.';
    }
    if (isNaN(priceVal) || priceVal < 0) {
      newErrors.price = 'Le prix HT doit être un nombre positif valide.';
    }
    
    const stockVal = parseInt(prodStock);
    const minStockVal = parseInt(prodMinStock);
    const tvaVal = parseFloat(prodTva);
    
    if (isNaN(stockVal) || stockVal < 0) {
      newErrors.stock = 'Le stock actuel doit être supérieur ou égal à 0.';
    }
    if (isNaN(minStockVal) || minStockVal < 0) {
      newErrors.minStock = 'Le stock minimum doit être supérieur ou égal à 0.';
    }
    if (isNaN(tvaVal) || tvaVal < 0 || tvaVal > 100) {
      newErrors.tva = 'Le taux de TVA doit être compris entre 0 et 100%.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      code: prodCode,
      name: nameVal,
      category: prodCategory.trim() || null,
      type: prodType,
      unitPrice: priceVal,
      stock: stockVal || 0,
      minStock: minStockVal || 0,
      tvaRate: tvaVal || 19,
      unit: prodUnit,
      isActive: prodActive === 'true',
      description: prodDescription.trim() || null,
    };

    onSaveProduct(prodId, payload, () => {
      setModalOpen(false);
    });
  };

  return (
    <div className="view-section active" id="catalogue">
      {/* KPI stats Grid */}
      <div className="kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Articles</div>
          <div className="kpi-value" id="cat-total">{kpiStats.total || 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Articles Actifs</div>
          <div className="kpi-value" id="cat-active" style={{ color: 'var(--accent-green)' }}>{kpiStats.active || 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Articles Inactifs</div>
          <div className="kpi-value" id="cat-inactive" style={{ color: 'var(--accent-red)' }}>{kpiStats.inactive || 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Stock Critique</div>
          <div className="kpi-value" id="cat-lowstock" style={{ color: 'var(--accent-orange)' }}>{kpiStats.lowStock || 0}</div>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '20px',
          background: 'var(--card-bg)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <select 
            id="cat-filter-type" 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Tous types</option>
            <option value="PRODUCT">Produits Physiques</option>
            <option value="SERVICE">Services / Prestations</option>
          </select>

          <select 
            id="cat-filter-status" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tous statuts</option>
            <option value="true">Actifs uniquement</option>
            <option value="false">Inactifs uniquement</option>
          </select>
        </div>

        <button 
          className="btn-action" 
          onClick={() => handleOpenModal(null)}
          style={{ background: 'var(--accent)', color: 'white', fontWeight: 600 }}
        >
          ➕ Nouveau Produit
        </button>
      </div>

      {/* Products List Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>SKU / Code</th>
              <th>Désignation de l'article</th>
              <th>Catégorie</th>
              <th>Type</th>
              <th>Prix Unitaire HT</th>
              <th>Stock Restant</th>
              <th>Taux TVA</th>
              <th>Statut</th>
              <th style={{ width: '280px' }}>Actions</th>
            </tr>
          </thead>
          <tbody id="catalogue-tbody">
            {products.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                  📭 Aucun produit trouvé. Cliquez sur "+ Nouveau Produit" pour commencer.
                </td>
              </tr>
            ) : (
              products.map(p => {
                const isLow = p.stock !== null && p.minStock !== null && p.stock < p.minStock;
                const stockColor = isLow ? '#f87171' : 'var(--accent-green)';
                const statusBadge = p.isActive ? (
                  <span style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--accent-green)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>✅ Actif</span>
                ) : (
                  <span style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>🔴 Inactif</span>
                );

                const typeBadge = p.type === 'SERVICE' ? (
                  <span style={{ background: 'rgba(251,146,60,0.15)', color: 'var(--accent-orange)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem' }}>Service</span>
                ) : (
                  <span style={{ background: 'rgba(56,189,248,0.15)', color: 'var(--accent)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem' }}>Produit</span>
                );

                return (
                  <tr key={p.ID} id={`product-row-${p.ID}`}>
                    <td><span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>{p.code || '—'}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{p.category || '—'}</td>
                    <td>{typeBadge}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-orange)' }}>
                      {(p.unitPrice || 0).toLocaleString('fr-DZ')} DA
                    </td>
                    <td style={{ fontFamily: 'monospace', color: stockColor, fontWeight: 600 }}>
                      {p.stock ?? '—'}{isLow ? ' ⚠️' : ''}
                    </td>
                    <td style={{ color: 'var(--text-dim)' }}>{p.tvaRate ?? 19}%</td>
                    <td>{statusBadge}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => handleOpenModal(p)} 
                          style={{ background: 'rgba(56,189,248,0.15)', color: 'var(--accent)', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          ✏️ Modifier
                        </button>
                        <button 
                          onClick={() => onToggleStatus(p.ID, p.isActive)} 
                          style={{ background: 'rgba(251,146,60,0.15)', color: 'var(--accent-orange)', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          {p.isActive ? '🔴 Désactiver' : '✅ Activer'}
                        </button>
                        <button 
                          onClick={() => onDeleteProduct(p.ID, p.name)} 
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CRUD Product Modal */}
      {modalOpen && (
        <div id="product-modal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ width: '700px' }}>
            <div className="modal-header">
              <h3 id="product-modal-title">{editItem ? '✏️ Modifier le Produit' : '📦 Nouveau Produit'}</h3>
              <span className="close-modal" onClick={() => setModalOpen(false)}>✕</span>
            </div>
            <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <div 
                id="prod-error" 
                style={{
                  display: 'none',
                  background: 'rgba(239,68,68,0.1)',
                  color: 'var(--accent-red)',
                  padding: '10px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Code Article (SKU)</label>
                  <input type="text" id="prod-code" value={prodCode} readOnly style={{ opacity: 0.7 }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Désignation *</label>
                  <input 
                    type="text" 
                    id="prod-name" 
                    placeholder="ex: Chaise Ergonomique" 
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    style={{ border: errors.name ? '1px solid var(--accent-red)' : '1px solid var(--border)' }}
                  />
                  {errors.name && <span style={{ color: 'var(--accent-red)', fontSize: '0.75rem' }}>{errors.name}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Catégorie</label>
                  <input 
                    type="text" 
                    id="prod-category" 
                    placeholder="ex: Mobilier, Matériaux" 
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Type d'article</label>
                  <select id="prod-type" value={prodType} onChange={(e) => setProdType(e.target.value)}>
                    <option value="PRODUCT">Produit Physique (Stockable)</option>
                    <option value="SERVICE">Service (Non stockable)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Prix Unitaire HT (DA) *</label>
                  <input 
                    type="number" 
                    id="prod-price" 
                    placeholder="24500" 
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    style={{ border: errors.price ? '1px solid var(--accent-red)' : '1px solid var(--border)' }}
                  />
                  {errors.price && <span style={{ color: 'var(--accent-red)', fontSize: '0.75rem' }}>{errors.price}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Taux TVA (%)</label>
                  <input 
                    type="number" 
                    id="prod-tva" 
                    value={prodTva} 
                    onChange={(e) => setProdTva(e.target.value)}
                    style={{ border: errors.tva ? '1px solid var(--accent-red)' : '1px solid var(--border)' }}
                  />
                  {errors.tva && <span style={{ color: 'var(--accent-red)', fontSize: '0.75rem' }}>{errors.tva}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Stock Actuel</label>
                  <input 
                    type="number" 
                    id="prod-stock" 
                    value={prodStock} 
                    onChange={(e) => setProdStock(e.target.value)}
                    style={{ border: errors.stock ? '1px solid var(--accent-red)' : '1px solid var(--border)' }}
                  />
                  {errors.stock && <span style={{ color: 'var(--accent-red)', fontSize: '0.75rem' }}>{errors.stock}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Seuil Stock Critique (Alerte)</label>
                  <input 
                    type="number" 
                    id="prod-minstock" 
                    value={prodMinStock} 
                    onChange={(e) => setProdMinStock(e.target.value)}
                    style={{ border: errors.minStock ? '1px solid var(--accent-red)' : '1px solid var(--border)' }}
                  />
                  {errors.minStock && <span style={{ color: 'var(--accent-red)', fontSize: '0.75rem' }}>{errors.minStock}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Unité de mesure</label>
                  <select id="prod-unit" value={prodUnit} onChange={(e) => setProdUnit(e.target.value)}>
                    <option value="PIECE">Pièce (Pce)</option>
                    <option value="KG">Kilogramme (Kg)</option>
                    <option value="LITER">Litre (L)</option>
                    <option value="HOUR">Heure (H)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Statut initial</label>
                  <select id="prod-active" value={prodActive} onChange={(e) => setProdActive(e.target.value)}>
                    <option value="true">Actif (Rendu visible)</option>
                    <option value="false">Inactif (Désactivé)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Description de l'article</label>
                <textarea 
                  id="prod-description" 
                  rows={2} 
                  placeholder="Saisissez la description technique du produit ou service..."
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-dialog-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setModalOpen(false)}>
                  Annuler
                </button>
                <button 
                  id="prod-save-btn" 
                  className="btn-action" 
                  disabled={savingProduct}
                  onClick={handleSave}
                  style={{ flex: 2, padding: '12px', background: 'var(--accent)', color: 'white', fontWeight: 600 }}
                >
                  {savingProduct ? '⏳ Enregistrement...' : (editItem ? '💾 Enregistrer les modifications' : '💾 Créer le Produit')}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
