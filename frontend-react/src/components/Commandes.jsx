import React, { useState } from 'react';

export default function Commandes({
  commandes,
  filterType,
  setFilterType,
  onViewOrder,
  onValidateCash,
  onOpenGR,
  commandeDetailModalOpen,
  activeOrderDetails,
  onCloseOrderDetails,
  onSendOrderToClient,
  sendingOrderToClient,
  onViewPdf,
  grModalOpen,
  activeGrDetails,
  onCloseGR,
  onSubmitGR,
  submittingGR,
  onApproveDiscrepancy,
}) {
  // GR state
  const [grNotes, setGrNotes] = useState('');
  const [grItems, setGrItems] = useState([]);

  // Initialize GR items when GR modal opens
  React.useEffect(() => {
    if (activeGrDetails && activeGrDetails.items) {
      setGrItems(
        activeGrDetails.items.map(item => ({
          ID: item.ID,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'PIECE',
          receivedQty: item.quantity,
          acceptedQty: item.quantity,
          rejectedQty: 0,
        }))
      );
      setGrNotes('');
    }
  }, [activeGrDetails]);

  const handleGrItemChange = (idx, field, val) => {
    const newItems = [...grItems];
    const parsedVal = Math.max(0, parseFloat(val) || 0);
    newItems[idx][field] = parsedVal;

    if (field === 'receivedQty') {
      newItems[idx].acceptedQty = Math.min(newItems[idx].acceptedQty, parsedVal);
      newItems[idx].rejectedQty = Math.max(0, parsedVal - newItems[idx].acceptedQty);
    } else if (field === 'acceptedQty') {
      const acc = Math.min(parsedVal, newItems[idx].receivedQty);
      newItems[idx].acceptedQty = acc;
      newItems[idx].rejectedQty = Math.max(0, newItems[idx].receivedQty - acc);
    } else if (field === 'rejectedQty') {
      const rej = Math.min(parsedVal, newItems[idx].receivedQty);
      newItems[idx].rejectedQty = rej;
      newItems[idx].acceptedQty = Math.max(0, newItems[idx].receivedQty - rej);
    }

    setGrItems(newItems);
  };

  const handleGrSubmitClick = () => {
    const payloadItems = grItems.map(item => ({
      poItemId: item.ID,
      receivedQty: item.receivedQty,
      acceptedQty: item.acceptedQty,
      rejectedQty: item.rejectedQty,
      notes: '',
    }));
    onSubmitGR(activeGrDetails.ID, payloadItems, grNotes);
  };

  const viewedOrders = JSON.parse(localStorage.getItem('viewedConfirmedOrders') || '[]');

  return (
    <div className="view-section active" id="commandes">
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
            id="filter-cmd-type" 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            <option value="">Toutes les commandes (CRM & SRM)</option>
            <option value="B2B">Commandes Clients B2B</option>
            <option value="B2C">Commandes Clients B2C</option>
            <option value="SRM">Commandes Fournisseurs (SRM PO)</option>
          </select>
        </div>
      </div>

      {/* Commandes Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>N° Commande</th>
              <th>Type de flux / Partenaire</th>
              <th>Date de création</th>
              <th>Montant Total (TTC)</th>
              <th>Statut de livraison / Commande</th>
              <th style={{ width: '240px' }}>Actions</th>
            </tr>
          </thead>
          <tbody id="admin-commandes-tbody">
            {commandes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                  Aucune commande trouvée.
                </td>
              </tr>
            ) : (
              commandes.map(item => {
                const isSRM = item._type === 'SRM';
                const typeLabel = isSRM ? (
                  <span style={{ color: '#fb923c', fontWeight: 600 }}>
                    Achats ({item.fournisseur ? item.fournisseur.companyName : 'Fournisseur'})
                  </span>
                ) : (
                  item.clientB2B_ID ? (
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>Client B2B</span>
                  ) : (
                    <span style={{ color: '#a78bfa', fontWeight: 600 }}>Client B2C</span>
                  )
                );

                const statusColors = isSRM 
                  ? { SENT: '#fb923c', CONFIRMED: '#38bdf8', DELIVERED: '#4ade80', CLOSED: '#94a3b8', CANCELLED: '#f87171', TO_APPROVE: '#a78bfa' }
                  : { PENDING: '#fb923c', CONFIRMED: '#38bdf8', PAID: '#4ade80', DRAFT: '#94a3b8', SENT_TO_CLIENT: '#38bdf8' };
                
                const statusLabels = isSRM
                  ? { SENT: 'Envoyé', CONFIRMED: 'Accepté', DELIVERED: 'Livré', CLOSED: 'Clôturé', CANCELLED: 'Annulé', TO_APPROVE: 'Remplacement à valider' }
                  : { PENDING: 'En attente', CONFIRMED: 'Confirmée', PAID: 'Payée', DRAFT: 'Brouillon', SENT_TO_CLIENT: 'Envoyée' };

                const sColor = statusColors[item.status] || '#94a3b8';
                let sLabel = statusLabels[item.status] || item.status;

                // Sync new tag
                const isNew = item.status === 'CONFIRMED' && !viewedOrders.includes(item.ID);

                return (
                  <tr 
                    key={item.ID} 
                    onClick={() => onViewOrder(item)} 
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 700 }}>{item.orderNumber || item.poNumber || '-'}</td>
                    <td>{typeLabel}</td>
                    <td>{item.date || item.createdAt?.slice(0, 10) || '-'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      {new Intl.NumberFormat('fr-FR').format(item.totalTTC || 0)} DA
                    </td>
                    <td>
                      <span style={{ color: sColor, fontWeight: 700 }}>
                        {sLabel}
                        {isNew && (
                          <span 
                            style={{
                              background: isSRM ? 'rgba(56,189,248,0.2)' : 'rgba(16,185,129,0.2)',
                              color: isSRM ? '#38bdf8' : '#4ade80',
                              fontSize: '0.65rem',
                              padding: '2px 6px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              marginLeft: '6px',
                              animation: 'badgePulse 1.2s infinite',
                              display: 'inline-block',
                              verticalAlign: 'middle',
                            }}
                          >
                            Nouveau ✓
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      {isSRM && item.status === 'CONFIRMED' ? (
                        <button 
                          className="btn-action" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px', background: 'var(--accent)', color: 'white' }}
                          onClick={() => onOpenGR(item)}
                        >
                          <i className="fas fa-truck"></i> Valider GR
                        </button>
                      ) : isSRM && item.status === 'TO_APPROVE' ? (
                        <button 
                          className="btn-action" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px', background: '#10b981', color: 'white' }}
                          onClick={() => onViewOrder(item)}
                        >
                          <i className="fas fa-check"></i> Approuver GR
                        </button>
                      ) : !isSRM && item.status === 'PENDING' ? (
                        <>
                          <button 
                            className="btn-action" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                            onClick={() => onViewOrder(item)}
                          >
                            👁 Détails
                          </button>
                          <button 
                            className="btn-action" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px', background: '#4ade80', color: 'black', marginLeft: '5px' }}
                            onClick={() => onValidateCash(item.ID)}
                          >
                            ✅ Valider Espèces
                          </button>
                        </>
                      ) : (
                        <button 
                          className="btn-action" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                          onClick={() => onViewOrder(item)}
                        >
                          👁 Détails
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CRM Commande Detail Modal */}
      {commandeDetailModalOpen && activeOrderDetails && (
        <div id="commande-detail-modal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ width: '700px' }}>
            <div className="modal-header">
              <h3>🛒 Détails du Bon de Commande {activeOrderDetails._type === 'SRM' ? 'Fournisseur' : 'Client'}</h3>
              <span className="close-modal" onClick={onCloseOrderDetails}>✕</span>
            </div>
            <div className="modal-body">
              <div className="info-grid" style={{ marginBottom: '20px' }}>
                <div className="info-group">
                  <label>{activeOrderDetails._type === 'SRM' ? 'N° PO' : 'N° Commande'}</label>
                  <p style={{ fontWeight: 700 }}>{activeOrderDetails._type === 'SRM' ? activeOrderDetails.poNumber : activeOrderDetails.orderNumber}</p>
                </div>
                <div className="info-group">
                  <label>{activeOrderDetails._type === 'SRM' ? 'Fournisseur' : 'Client'}</label>
                  <p style={{ fontWeight: 600 }}>
                    {activeOrderDetails._type === 'SRM' 
                      ? (activeOrderDetails.fournisseur?.companyName || 'Fournisseur')
                      : (activeOrderDetails.clientB2B?.companyName || 
                         (activeOrderDetails.clientB2C ? (activeOrderDetails.clientB2C.firstName + ' ' + activeOrderDetails.clientB2C.lastName) : '') || 
                         'Client')
                    }
                  </p>
                </div>
                <div className="info-group">
                  <label>Date de création</label>
                  <p>{activeOrderDetails.date || '-'}</p>
                </div>
                <div className="info-group">
                  <label>Statut</label>
                  <p>
                    <span className={`status-badge status-${activeOrderDetails.status?.toLowerCase()}`}>
                      {activeOrderDetails.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items List Table */}
              <div className="table-wrap" style={{ marginBottom: '20px', maxHeight: '250px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Désignation de l'article</th>
                      <th style={{ textAlign: 'right' }}>Quantité</th>
                      <th style={{ textAlign: 'right' }}>Prix Unitaire HT</th>
                      <th style={{ textAlign: 'right' }}>Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeOrderDetails.items || []).map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{item.description || '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {new Intl.NumberFormat('fr-FR').format(item.unitPrice)} DA
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                          {new Intl.NumberFormat('fr-FR').format(item.totalHT)} DA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pricing Totals */}
              <div style={{ background: 'var(--input-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Total HT :</span>
                  <strong id="cmd-det-total-ht">{new Intl.NumberFormat('fr-FR').format(activeOrderDetails.totalHT || 0)} DA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Total TVA :</span>
                  <strong id="cmd-det-total-tva">{new Intl.NumberFormat('fr-FR').format(activeOrderDetails.totalTVA || 0)} DA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                  <span>Total TTC :</span>
                  <strong style={{ color: 'var(--accent)' }} id="cmd-det-total-ttc">
                    {new Intl.NumberFormat('fr-FR').format(activeOrderDetails.totalTTC || 0)} DA
                  </strong>
                </div>
              </div>

              {/* Goods Receipt (GR) History if delivered/anomaly */}
              {activeOrderDetails._type === 'SRM' && activeOrderDetails.receptions && activeOrderDetails.receptions.length > 0 && (
                <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border)', paddingTop: '15px' }}>
                  <h4 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                    <i className="fas fa-truck" style={{ color: 'var(--accent)' }}></i> Réception de marchandises (GR)
                  </h4>
                  {activeOrderDetails.receptions.map((gr, idx) => {
                    let totalMissing = 0;
                    let totalRejected = 0;
                    (gr.items || []).forEach(item => {
                      totalMissing += Math.max(0, (parseFloat(item.orderedQty) || 0) - (parseFloat(item.receivedQty) || 0));
                      totalRejected += parseFloat(item.rejectedQty) || 0;
                    });
                    const hasDiscrepancy = totalMissing > 0 || totalRejected > 0;
                    return (
                      <div key={idx} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '15px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div>
                            <strong style={{ fontSize: '0.95rem' }}>{gr.receiptNumber}</strong>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: '10px' }}>{gr.date}</span>
                          </div>
                          <button 
                            className="btn-action" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                            onClick={() => onViewPdf(`/odata/v4/srm/downloadGRPDF(grId=${gr.ID})`)}
                          >
                            📄 PDF
                          </button>
                        </div>
                        {hasDiscrepancy && (
                          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '10px', color: '#ef4444', fontSize: '0.8rem', marginBottom: '10px' }}>
                            <strong>⚠️ Écart de réception détecté :</strong>
                            <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
                              {totalMissing > 0 && <li>{totalMissing} unité(s) manquante(s)</li>}
                              {totalRejected > 0 && <li>{totalRejected} unité(s) rejetée(s) par l'admin</li>}
                            </ul>
                          </div>
                        )}
                        <table className="custom-table" style={{ width: '100%', fontSize: '0.8rem', marginTop: '10px' }}>
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th style={{ textAlign: 'center' }}>Commandé</th>
                              <th style={{ textAlign: 'center' }}>Reçu</th>
                              <th style={{ textAlign: 'center' }}>Accepté</th>
                              <th style={{ textAlign: 'center' }}>Rejeté</th>
                              <th style={{ textAlign: 'center', color: '#3b82f6' }}>Renvoyé</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(gr.items || []).map((gi, i) => (
                              <tr key={i}>
                                <td>{gi.product?.name || gi.poItem?.description || gi.description || 'Article'}</td>
                                <td style={{ textAlign: 'center' }}>{gi.orderedQty}</td>
                                <td style={{ textAlign: 'center' }}>{gi.receivedQty}</td>
                                <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold' }}>{gi.acceptedQty}</td>
                                <td style={{ textAlign: 'center', color: gi.rejectedQty > 0 ? '#ef4444' : 'inherit', fontWeight: gi.rejectedQty > 0 ? 'bold' : 'normal' }}>{gi.rejectedQty}</td>
                                <td style={{ textAlign: 'center', color: '#3b82f6', fontWeight: gi.resendQty > 0 ? 'bold' : 'normal' }}>{gi.resendQty || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {gr.notes && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                            <strong>Notes :</strong> {gr.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action buttons */}
              <div id="cmd-det-actions" style={{ display: 'flex', gap: '10px' }}>
                {activeOrderDetails.status === 'DRAFT' ? (
                  <>
                    <button 
                      className="btn-action" 
                      disabled={sendingOrderToClient}
                      onClick={() => onSendOrderToClient(activeOrderDetails.ID)}
                      style={{ flex: 2, padding: '12px', background: '#fb923c', color: 'black', fontWeight: 700 }}
                    >
                      {sendingOrderToClient ? '⏳ Envoi...' : '✉️ Envoyer le Bon de Commande au Client'}
                    </button>
                    <button className="btn-dialog-secondary" style={{ flex: 1, padding: '12px' }} onClick={onCloseOrderDetails}>
                      Fermer
                    </button>
                  </>
                ) : activeOrderDetails._type === 'SRM' && activeOrderDetails.status === 'TO_APPROVE' ? (
                  <>
                    <button 
                      className="btn-action" 
                      onClick={() => {
                        onApproveDiscrepancy(activeOrderDetails.ID);
                        onCloseOrderDetails();
                      }}
                      style={{ flex: 2, padding: '12px', background: '#10b981', color: 'white', fontWeight: 700 }}
                    >
                      <i className="fas fa-check"></i> Approuver la réception
                    </button>
                    <button className="btn-dialog-secondary" style={{ flex: 1, padding: '12px' }} onClick={onCloseOrderDetails}>
                      Fermer
                    </button>
                  </>
                ) : (
                  <button className="btn-dialog-secondary" style={{ width: '100%', padding: '12px' }} onClick={onCloseOrderDetails}>
                    Fermer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goods Receipt (GR) Modal */}
      {grModalOpen && activeGrDetails && (
        <div id="admin-gr-modal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ width: '750px' }}>
            <div className="modal-header">
              <h3>🚚 Validation Réception Marchandise (GR SRM)</h3>
              <span className="close-modal" onClick={onCloseGR}>✕</span>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
                Enregistrement de la réception physique pour le bon de commande fournisseur N° <strong id="admin-gr-po-number">{activeGrDetails.poNumber}</strong>.
              </p>
              
              {/* GR items table */}
              <div className="table-wrap" id="admin-gr-items-container" style={{ marginBottom: '20px', maxHeight: '250px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '0.75rem' }}>Description</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '0.75rem' }}>Qté Commandée</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '0.75rem' }}>Qté Reçue</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '0.75rem' }}>Qté Acceptée</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '0.75rem' }}>Qté Rejetée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grItems.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{item.description || '—'}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'monospace' }}>{item.quantity} {item.unit}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            className="admin-gr-receivedQty" 
                            value={item.receivedQty} 
                            onChange={(e) => handleGrItemChange(i, 'receivedQty', e.target.value)}
                            style={{ width: '80px', padding: '6px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)', fontFamily: 'monospace', textAlign: 'center' }} 
                            min="0" 
                            step="0.001"
                          />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            className="admin-gr-acceptedQty" 
                            value={item.acceptedQty} 
                            onChange={(e) => handleGrItemChange(i, 'acceptedQty', e.target.value)}
                            style={{ width: '80px', padding: '6px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)', fontFamily: 'monospace', textAlign: 'center' }} 
                            min="0" 
                            step="0.001"
                          />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            className="admin-gr-rejectedQty" 
                            value={item.rejectedQty} 
                            onChange={(e) => handleGrItemChange(i, 'rejectedQty', e.target.value)}
                            style={{ width: '80px', padding: '6px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)', fontFamily: 'monospace', textAlign: 'center' }} 
                            min="0" 
                            step="0.001"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* GR notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Remarques / Observations sur la livraison
                </label>
                <textarea 
                  id="admin-gr-notes" 
                  rows={2} 
                  placeholder="Renseignez tout écart de livraison, défaut de qualité ou observation sur le transport..."
                  value={grNotes}
                  onChange={(e) => setGrNotes(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-dialog-secondary" style={{ flex: 1, padding: '12px' }} onClick={onCloseGR}>
                  Annuler
                </button>
                <button 
                  className="btn-action" 
                  disabled={submittingGR}
                  onClick={handleGrSubmitClick}
                  style={{ flex: 2, padding: '12px', background: 'var(--accent)', color: 'white', fontWeight: 700 }}
                >
                  {submittingGR ? '⏳ Validation...' : '🚚 Confirmer & Valider la Réception (GR)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
