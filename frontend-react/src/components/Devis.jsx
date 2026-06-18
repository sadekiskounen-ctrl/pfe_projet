import React, { useState, useEffect } from 'react';

export default function Devis({
  devis,
  filterStatus,
  setFilterStatus,
  onSaveDevis,
  savingDevis,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  
  // Revision states
  const [discountGlobal, setDiscountGlobal] = useState(0);
  const [items, setItems] = useState([]);
  
  // Calculated totals
  const [totalHT, setTotalHT] = useState(0);
  const [totalTVA, setTotalTVA] = useState(0);
  const [totalTTC, setTotalTTC] = useState(0);

  const handleOpenRevision = async (devisItem) => {
    setActiveItem(devisItem);
    setModalOpen(true);
    setDiscountGlobal(parseFloat(devisItem.discount || 0));
    setItems([]);

    try {
      const res = await fetch(`/odata/v4/admin/AllDevis(ID=${devisItem.ID})?$expand=items`);
      const data = await res.json();
      const loadedItems = (data.items || []).map(item => ({
        ID: item.ID,
        description: item.description,
        quantity: item.quantity,
        tvaRate: item.tvaRate ?? 19,
        unitPrice: parseFloat(item.unitPrice || 0),
        discount: parseFloat(item.discount || 0),
        totalHT: parseFloat(item.totalHT || 0),
      }));
      setItems(loadedItems);
      recalc(loadedItems, parseFloat(devisItem.discount || 0));
    } catch (e) {
      console.error('Error loading devis items', e);
    }
  };

  const recalc = (itemsList, globDisc) => {
    let sumHT = 0;
    let sumTVA = 0;

    itemsList.forEach(item => {
      const subHT = item.quantity * item.unitPrice * (1 - item.discount / 100);
      const subTVA = subHT * (item.tvaRate / 100);
      sumHT += subHT;
      sumTVA += subTVA;
    });

    const finalHT = sumHT * (1 - globDisc / 100);
    const finalTVA = sumTVA * (1 - globDisc / 100);
    const finalTTC = finalHT + finalTVA;

    setTotalHT(finalHT);
    setTotalTVA(finalTVA);
    setTotalTTC(finalTTC);
  };

  const handleItemChange = (idx, field, val) => {
    const newItems = [...items];
    newItems[idx][field] = parseFloat(val) || 0;
    
    // Update totalHT for this row
    const row = newItems[idx];
    row.totalHT = row.quantity * row.unitPrice * (1 - row.discount / 100);
    
    setItems(newItems);
    recalc(newItems, discountGlobal);
  };

  const handleGlobalDiscountChange = (val) => {
    const disc = parseFloat(val) || 0;
    setDiscountGlobal(disc);
    recalc(items, disc);
  };

  const handleApprove = () => {
    const payloadItems = items.map(item => ({
      itemId: item.ID,
      unitPrice: item.unitPrice,
      discount: item.discount,
    }));
    onSaveDevis(activeItem.ID, discountGlobal, payloadItems, () => {
      setModalOpen(false);
    });
  };

  return (
    <div className="view-section active" id="devis">
      {/* Filters Bar */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          background: 'var(--card-bg)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
          <select 
            id="devis-filter-status" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            <option value="">Tous les devis</option>
            <option value="PENDING">En attente de validation</option>
            <option value="APPROVED">Approuvés</option>
            <option value="REJECTED">Refusés</option>
          </select>
        </div>
      </div>

      {/* Devis Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>N° Devis</th>
              <th>Nom de l'entreprise / Client</th>
              <th>Date de création</th>
              <th>Montant Total (TTC)</th>
              <th>Statut de validation</th>
              <th style={{ width: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody id="devis-table-body">
            {devis.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                  Aucun devis trouvé.
                </td>
              </tr>
            ) : (
              devis.map(d => {
                const clientName = d.clientB2B 
                  ? d.clientB2B.companyName 
                  : (d.clientB2C ? d.clientB2C.firstName + ' ' + d.clientB2C.lastName : 'Inconnu');
                
                const dDate = d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '-';
                
                const statusHtml = d.status === 'PENDING' ? (
                  <span style={{ background: 'rgba(251,146,60,0.2)', color: '#fb923c', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>En attente</span>
                ) : d.status === 'APPROVED' ? (
                  <span style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>Approuvé</span>
                ) : d.status === 'REJECTED' ? (
                  <span style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>Refusé</span>
                ) : (
                  <span style={{ background: 'rgba(156,163,175,0.2)', color: '#9ca3af', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>{d.status}</span>
                );

                const isPending = d.status === 'PENDING';

                return (
                  <tr key={d.ID}>
                    <td style={{ fontFamily: 'monospace' }}>{d.devisNumber || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{clientName}</td>
                    <td>{dDate}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>
                      {parseFloat(d.totalTTC || 0).toFixed(2)} DA
                    </td>
                    <td>{statusHtml}</td>
                    <td>
                      <button 
                        className="btn-action" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: !isPending ? 'var(--input-bg)' : undefined, color: !isPending ? 'var(--text-main)' : undefined }}
                        onClick={() => handleOpenRevision(d)}
                      >
                        {isPending ? 'Réviser' : 'Voir'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Revision Modal */}
      {modalOpen && activeItem && (
        <div id="devis-modal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ width: '700px' }}>
            <div className="modal-header">
              <h3>📄 Révision & Négociation Devis</h3>
              <span className="close-modal" onClick={() => setModalOpen(false)}>✕</span>
            </div>
            <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <div className="info-grid" style={{ marginBottom: '15px' }}>
                <div className="info-group">
                  <label>Client</label>
                  <p id="rev-devis-client">
                    {activeItem.clientB2B 
                      ? activeItem.clientB2B.companyName 
                      : (activeItem.clientB2C ? activeItem.clientB2C.firstName + ' ' + activeItem.clientB2C.lastName : 'Client')}
                  </p>
                </div>
                <div className="info-group">
                  <label>Statut Actuel</label>
                  <p id="rev-devis-status">
                    {(() => {
                      const devisLabels = {
                        PENDING: 'En attente',
                        APPROVED: 'Approuvé',
                        REJECTED: 'Refusé',
                        CONVERTED: 'Converti en commande',
                      };
                      const devisColors = {
                        PENDING: '#fb923c',
                        APPROVED: '#4ade80',
                        REJECTED: '#f87171',
                        CONVERTED: '#38bdf8',
                      };
                      const raw = activeItem.status || '-';
                      return (
                        <span style={{ fontWeight: 700, color: devisColors[raw] || '#94a3b8' }}>
                          {devisLabels[raw] || raw}
                        </span>
                      );
                    })()}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {activeItem.notes && (
                <div id="rev-devis-notes-group" style={{ background: 'var(--input-bg)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--accent)', marginBottom: '15px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Instructions Client / Notes :</label>
                  <p id="rev-devis-notes" style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '4px' }}>
                    {activeItem.notes}
                  </p>
                </div>
              )}

              {/* Items List Table */}
              <div className="table-wrap" style={{ marginBottom: '15px' }}>
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Désignation de l'article</th>
                      <th>Qté</th>
                      <th style={{ width: '120px' }}>Prix Unitaire HT (DA)</th>
                      <th style={{ width: '100px' }}>Remise (%)</th>
                      <th>Total HT (DA)</th>
                    </tr>
                  </thead>
                  <tbody id="devis-items-tbody">
                    {items.map((item, idx) => {
                      const isPending = activeItem.status === 'PENDING';
                      return (
                        <tr key={idx} className="rev-item-row">
                          <td style={{ fontWeight: 600 }}>{item.description || `Article #${idx + 1}`}</td>
                          <td style={{ fontFamily: 'monospace' }}>{item.quantity}</td>
                          <td>
                            {isPending ? (
                              <input 
                                type="number" 
                                className="period-selector" 
                                value={item.unitPrice} 
                                onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                                style={{ width: '100px', textAlign: 'right', padding: '4px' }} 
                                min="0"
                              />
                            ) : (
                              item.unitPrice.toFixed(2)
                            )}
                          </td>
                          <td>
                            {isPending ? (
                              <input 
                                type="number" 
                                className="period-selector" 
                                value={item.discount} 
                                onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                                style={{ width: '70px', textAlign: 'right', padding: '4px' }} 
                                min="0"
                                max="100"
                              />
                            ) : (
                              item.discount.toFixed(2)
                            )}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {item.totalHT.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Global Discount Option */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Remise globale (%) :</label>
                <input 
                  type="number" 
                  id="rev-devis-discount"
                  className="period-selector"
                  value={discountGlobal}
                  onChange={(e) => handleGlobalDiscountChange(e.target.value)}
                  disabled={activeItem.status !== 'PENDING'}
                  style={{ width: '70px', textAlign: 'right' }}
                  min="0"
                  max="100"
                />
              </div>

              {/* Pricing totals summary */}
              <div style={{ background: 'var(--input-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Sous-total HT (après remises lignes & globale) :</span>
                  <strong id="rev-total-ht">{totalHT.toFixed(2)} DA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>TVA (19% appliquée) :</span>
                  <strong id="rev-total-tva">{totalTVA.toFixed(2)} DA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                  <span>Montant Total Final TTC :</span>
                  <strong style={{ color: 'var(--accent)' }} id="rev-total-ttc">
                    {totalTTC.toFixed(2)} DA
                  </strong>
                </div>
              </div>

              {/* Actions */}
              <div id="devis-modal-actions" style={{ display: 'flex', gap: '10px' }}>
                {activeItem.status === 'PENDING' ? (
                  <>
                    <button className="btn-dialog-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setModalOpen(false)}>
                      Annuler
                    </button>
                    <button 
                      className="btn-approve" 
                      disabled={savingDevis}
                      onClick={handleApprove}
                      style={{ flex: 2, padding: '12px', background: 'var(--accent-green)', color: 'white', fontWeight: 600 }}
                    >
                      {savingDevis ? '⏳ Approbation...' : '✅ Approuver & Convertir en BC Client'}
                    </button>
                  </>
                ) : (
                  <button className="btn-dialog-secondary" style={{ width: '100%', padding: '12px' }} onClick={() => setModalOpen(false)}>
                    Fermer
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
