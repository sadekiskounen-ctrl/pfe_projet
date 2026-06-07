import React, { useState, useEffect } from 'react';

export default function RFQs({
  rfqs,
  suppliersList,
  onSaveRFQ,
  onDeleteRFQ,
  onSelectOffer,
  onConvertPO,
  kpiStats,
  savingRFQ,
  submittingOffer,
  submittingPO,
}) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  // Form states
  const [rfqId, setRfqId] = useState('');
  const [rfqNumber, setRfqNumber] = useState('');
  const [rfqTitle, setRfqTitle] = useState('');
  const [rfqDescription, setRfqDescription] = useState('');
  const [rfqDeadline, setRfqDeadline] = useState('');
  const [targetSector, setTargetSector] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [items, setItems] = useState([{ id: 'init-1', description: '', quantity: '', targetPrice: '' }]);

  // Offers Comparator Modal states
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [activeRfqForOffers, setActiveRfqForOffers] = useState(null);
  const [offersList, setOffersList] = useState([]);
  const [poExists, setPoExists] = useState(false);

  // Filters suppliers checkboxes by sector
  const uniqueSectors = [...new Set(suppliersList.map(s => s.sector).filter(Boolean))];
  const filteredSuppliers = targetSector
    ? suppliersList.filter(s => s.sector === targetSector)
    : suppliersList;

  const filteredRfqs = rfqs.filter(rfq => {
    if (!statusFilter) return true;
    const isClosed = rfq.status === 'APPROVED' || rfq.status === 'CLOSED' || (rfq.deadline && new Date(rfq.deadline) < new Date());
    const statusText = isClosed ? 'CLOSED' : 'OPEN';
    return statusText === statusFilter;
  });

  const handleOpenCreate = () => {
    setEditItem(null);
    setViewOnly(false);
    setRfqId('');
    setRfqNumber('[RFQ-004 auto]');
    setRfqTitle('');
    setRfqDescription('');
    setRfqDeadline('');
    setTargetSector('');
    setSelectedSuppliers([]);
    setItems([{ id: 'init-1', description: '', quantity: '', targetPrice: '' }]);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = async (rfq, viewMode = false) => {
    setEditItem(rfq);
    setViewOnly(viewMode);
    setRfqId(rfq.ID);
    setRfqNumber(rfq.rfqNumber || '');
    setRfqTitle(rfq.title || '');
    setRfqDescription(rfq.description || '');
    setRfqDeadline(rfq.deadline || '');
    setTargetSector('');
    
    // In our OData, RFQ target suppliers selection is simulated or mapped. Let's reset
    setSelectedSuppliers([]);

    try {
      const res = await fetch(`/odata/v4/srm/RFQs(ID=${rfq.ID})?$expand=items`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setItems(
          data.items.map((it, idx) => ({
            id: it.ID || `loaded-${idx}`,
            description: it.description || '',
            quantity: String(it.quantity || ''),
            targetPrice: String(it.targetPrice || ''),
          }))
        );
      } else {
        setItems([{ id: 'init-1', description: '', quantity: '', targetPrice: '' }]);
      }
    } catch (e) {
      console.error(e);
      setItems([{ id: 'init-1', description: '', quantity: '', targetPrice: '' }]);
    }
    setCreateModalOpen(true);
  };

  const handleAddRow = () => {
    setItems([...items, { id: 'new-' + Date.now() + '-' + Math.random(), description: '', quantity: '', targetPrice: '' }]);
  };

  const handleRemoveRow = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id, field, val) => {
    setItems(
      items.map(it => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  const handleSupplierToggle = (id) => {
    if (selectedSuppliers.includes(id)) {
      setSelectedSuppliers(selectedSuppliers.filter(item => item !== id));
    } else {
      setSelectedSuppliers([...selectedSuppliers, id]);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!rfqTitle.trim()) {
      alert("Veuillez saisir un objet pour l'appel d'offres.");
      return;
    }
    if (!rfqDeadline) {
      alert('Veuillez sélectionner une date de clôture.');
      return;
    }

    const payloadItems = [];
    let hasValidItem = false;
    items.forEach((it, idx) => {
      const desc = it.description.trim();
      const qty = parseFloat(it.quantity);
      const price = parseFloat(it.targetPrice);

      if (desc && !isNaN(qty) && !isNaN(price)) {
        payloadItems.push({
          lineNumber: idx + 1,
          description: desc,
          quantity: qty,
          unit: 'PIECE',
          targetPrice: price,
        });
        hasValidItem = true;
      }
    });

    if (!hasValidItem) {
      alert('Veuillez ajouter au moins une ligne de produit avec des valeurs valides.');
      return;
    }

    const totalBudget = payloadItems.reduce((sum, item) => sum + item.quantity * item.targetPrice, 0);

    const payload = {
      rfqNumber: rfqId ? undefined : 'RFQ-TEMP',
      title: rfqTitle,
      description: rfqDescription,
      date: new Date().toISOString().split('T')[0],
      deadline: rfqDeadline,
      status: 'OPEN',
      currency_code: 'DZD',
      totalBudget: parseFloat(totalBudget.toFixed(2)),
      items: payloadItems,
    };

    onSaveRFQ(rfqId, payload, () => {
      setCreateModalOpen(false);
    });
  };

  const handleOpenOffers = async (rfq) => {
    setActiveRfqForOffers(rfq);
    setOffersModalOpen(true);
    setOffersList([]);
    setPoExists(false);

    try {
      const res = await fetch(`/odata/v4/srm/RFQs(ID=${rfq.ID})?$expand=responses($expand=fournisseur)`);
      const data = await res.json();
      setActiveRfqForOffers(data);
      setOffersList(data.responses || []);

      // Check if a PO was already generated
      const poRes = await fetch(`/odata/v4/admin/AllBonsCommande?$filter=rfq_ID eq ${rfq.ID}`);
      const poData = await poRes.json();
      setPoExists(poData.value && poData.value.length > 0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectOfferClick = (respId) => {
    onSelectOffer(activeRfqForOffers.ID, respId, () => {
      handleOpenOffers(activeRfqForOffers);
    });
  };

  const handleConvertPOClick = () => {
    onConvertPO(activeRfqForOffers.ID, () => {
      setOffersModalOpen(false);
    });
  };

  return (
    <div className="view-section active" id="rfqs">
      {/* RFQ KPIs Grid */}
      <div className="kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-label">Appels d'offres publiés</div>
          <div className="kpi-value" id="kpi-rfqs-total">{kpiStats.total || 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Consultations Ouvertes</div>
          <div className="kpi-value" id="kpi-rfqs-open" style={{ color: 'var(--accent-green)' }}>{kpiStats.open || 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Consultations Clôturées</div>
          <div className="kpi-value" id="kpi-rfqs-closed" style={{ color: 'var(--accent-red)' }}>{kpiStats.closed || 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Offres reçues</div>
          <div className="kpi-value" id="kpi-rfqs-offers" style={{ color: 'var(--accent-orange)' }}>{kpiStats.offers || 0}</div>
        </div>
      </div>

      {/* Action Bar */}
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
        <div>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ 
              padding: '8px 14px', 
              borderRadius: '8px', 
              border: '1px solid var(--border)', 
              background: 'var(--input-bg)', 
              color: 'var(--text-main)', 
              outline: 'none', 
              fontSize: '0.85rem',
              minWidth: '180px'
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="OPEN">Ouverts</option>
            <option value="CLOSED">Clôturés</option>
          </select>
        </div>
        <button 
          className="btn-action" 
          onClick={handleOpenCreate}
          style={{ background: 'var(--accent)', color: 'white', fontWeight: 600 }}
        >
          ➕ Publier un Appel d'Offres (RFQ)
        </button>
      </div>

      {/* RFQ List Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>N° Consultation</th>
              <th>Objet de l'appel d'offres</th>
              <th>Date de publication</th>
              <th>Date de clôture</th>
              <th>Statut</th>
              <th style={{ width: '320px' }}>Actions SRM</th>
            </tr>
          </thead>
          <tbody id="rfqs-table-body">
            {filteredRfqs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                  Aucun appel d'offres trouvé.
                </td>
              </tr>
            ) : (
              filteredRfqs.map(rfq => {
                const createdDate = rfq.date ? new Date(rfq.date).toLocaleDateString('fr-FR') : '-';
                const deadlineDate = rfq.deadline ? new Date(rfq.deadline).toLocaleDateString('fr-FR') : '-';
                
                const isClosed = rfq.status === 'APPROVED' || rfq.status === 'CLOSED' || (rfq.deadline && new Date(rfq.deadline) < new Date());
                const statusText = isClosed ? 'Clôturé' : 'Ouvert';
                const statusColor = isClosed ? '#ef4444' : '#4ade80';
                const statusBg = isClosed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(74, 222, 128, 0.1)';

                const offersCount = rfq.responses ? rfq.responses.length : 0;
                const hasOffersNotYetChosen = offersCount > 0 && !rfq.selectedResponse_ID;

                return (
                  <tr key={rfq.ID}>
                    <td style={{ fontWeight: 700 }}>
                      {rfq.rfqNumber || '-'}
                      {hasOffersNotYetChosen && (
                        <span 
                          className="noti-badge-pulse"
                          style={{
                            background: 'rgba(56,189,248,0.2)',
                            color: '#38bdf8',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginLeft: '8px',
                            border: '1px solid rgba(56,189,248,0.4)',
                          }}
                        >
                          <i className="fas fa-bell"></i> {offersCount} offre{offersCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{rfq.title || '-'}</td>
                    <td>{createdDate}</td>
                    <td>{deadlineDate}</td>
                    <td>
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: statusBg,
                          color: statusColor,
                          border: `1px solid ${statusColor}33`,
                        }}
                      >
                        {statusText}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                        {isClosed ? (
                          <button 
                            className="btn-action-secondary" 
                            onClick={() => handleOpenEdit(rfq, true)}
                          >
                            Consulter
                          </button>
                        ) : (
                          <button 
                            className="btn-action-warning" 
                            onClick={() => handleOpenEdit(rfq, false)}
                          >
                            Modifier
                          </button>
                        )}
                        <button 
                          className="btn-action" 
                          style={{ background: 'var(--accent-green)', color: 'white' }}
                          onClick={() => handleOpenOffers(rfq)}
                        >
                          Voir offres
                        </button>
                        <button 
                          className="btn-action" 
                          style={{ background: '#ef4444', color: 'white' }}
                          onClick={() => onDeleteRFQ(rfq.ID, rfq.rfqNumber)}
                        >
                          Supprimer
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

      {/* Create / Edit RFQ Form Modal */}
      {createModalOpen && (
        <div id="rfq-create-modal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ width: '850px' }}>
            <div className="modal-header">
              <h3>{viewOnly ? "📂 Détails de l'Appel d'Offres" : (editItem ? "✏️ Modifier l'Appel d'Offres" : '📣 Publier un Appel d\'Offres')}</h3>
              <span className="close-modal" onClick={() => setCreateModalOpen(false)}>✕</span>
            </div>
            <form id="rfq-form" onSubmit={handleFormSubmit}>
              <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  
                  {/* Left Column: Basic inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Numéro RFQ</label>
                      <input type="text" id="rfq-form-number" value={rfqNumber} readOnly style={{ opacity: 0.7 }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Objet de l'appel d'offres *</label>
                      <input 
                        type="text" 
                        id="rfq-form-title" 
                        placeholder="ex: Fourniture d'équipements informatiques" 
                        value={rfqTitle}
                        onChange={(e) => setRfqTitle(e.target.value)}
                        disabled={viewOnly}
                        required 
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Description / Spécifications</label>
                      <textarea 
                        id="rfq-form-description" 
                        rows={3} 
                        placeholder="Spécifiez en détail les besoins, critères techniques de sélection..."
                        value={rfqDescription}
                        onChange={(e) => setRfqDescription(e.target.value)}
                        disabled={viewOnly}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Date de clôture *</label>
                      <input 
                        type="date" 
                        id="rfq-form-deadline" 
                        value={rfqDeadline}
                        onChange={(e) => setRfqDeadline(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        disabled={viewOnly}
                        required 
                      />
                    </div>
                  </div>

                  {/* Right Column: Target suppliers list checkbox */}
                  <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', background: 'var(--input-bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Fournisseurs ciblés</label>
                      <span id="rfq-supplier-count" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)' }}>
                        {selectedSuppliers.length} sur {filteredSuppliers.length} sélectionné(s)
                      </span>
                    </div>

                    <select 
                      id="rfq-sector-filter" 
                      value={targetSector} 
                      onChange={(e) => setTargetSector(e.target.value)}
                      disabled={viewOnly}
                      style={{ marginBottom: '10px', width: '100%' }}
                    >
                      <option value="">Tous secteurs d'activité</option>
                      {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <div 
                      id="rfq-suppliers-container" 
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        maxHeight: '180px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '6px',
                      }}
                    >
                      {filteredSuppliers.length === 0 ? (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Aucun fournisseur actif.</span>
                      ) : (
                        filteredSuppliers.map(s => (
                          <label 
                            key={s.ID}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.85rem', cursor: viewOnly ? 'default' : 'pointer' }}
                          >
                            <input 
                              type="checkbox" 
                              name="rfq-targeted-suppliers" 
                              value={s.ID} 
                              checked={selectedSuppliers.includes(s.ID)}
                              onChange={() => handleSupplierToggle(s.ID)}
                              disabled={viewOnly}
                              style={{ accentColor: 'var(--accent)' }}
                            />
                            {s.displayName}
                            {s.sector && <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}> ({s.sector})</span>}
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                </div>

                {/* Items Table Section */}
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--card-bg)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Besoins / Lignes de commande cibles</h4>
                    {!viewOnly && (
                      <button 
                        type="button" 
                        className="btn-action" 
                        onClick={handleAddRow}
                        style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--nav-item-active-bg)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                      >
                        ➕ Ajouter une ligne
                      </button>
                    )}
                  </div>

                  <table className="custom-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '45%' }}>Description du besoin *</th>
                        <th style={{ width: '18%' }}>Quantité cible *</th>
                        <th style={{ width: '22%' }}>Budget unitaire max HT (DA) *</th>
                        {!viewOnly && <th style={{ width: '15%', textAlign: 'center' }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody id="rfq-items-tbody">
                      {items.map((it, idx) => (
                        <tr key={it.id}>
                          <td style={{ padding: '8px' }}>
                            <input 
                              type="text" 
                              className="rfq-item-desc" 
                              value={it.description}
                              onChange={(e) => handleItemChange(it.id, 'description', e.target.value)}
                              disabled={viewOnly}
                              placeholder="ex: Ordinateur portable core i7" 
                              required 
                              style={{ 
                                width: '100%', 
                                minWidth: '0',
                                padding: '8px 12px', 
                                fontSize: '0.85rem', 
                                borderRadius: '8px', 
                                border: '1px solid var(--border)', 
                                background: 'var(--input-bg)', 
                                color: 'var(--text-main)', 
                                outline: 'none' 
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input 
                              type="number" 
                              className="rfq-item-qty" 
                              value={it.quantity}
                              onChange={(e) => handleItemChange(it.id, 'quantity', e.target.value)}
                              disabled={viewOnly}
                              placeholder="10" 
                              min="1" 
                              required 
                              style={{ 
                                width: '100%', 
                                minWidth: '0',
                                padding: '8px 12px', 
                                fontSize: '0.85rem', 
                                borderRadius: '8px', 
                                border: '1px solid var(--border)', 
                                background: 'var(--input-bg)', 
                                color: 'var(--text-main)', 
                                outline: 'none' 
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input 
                              type="number" 
                              className="rfq-item-price" 
                              value={it.targetPrice}
                              onChange={(e) => handleItemChange(it.id, 'targetPrice', e.target.value)}
                              disabled={viewOnly}
                              placeholder="85000" 
                              required 
                              style={{ 
                                width: '100%', 
                                minWidth: '0',
                                padding: '8px 12px', 
                                fontSize: '0.85rem', 
                                borderRadius: '8px', 
                                border: '1px solid var(--border)', 
                                background: 'var(--input-bg)', 
                                color: 'var(--text-main)', 
                                outline: 'none' 
                              }}
                            />
                          </td>
                          {!viewOnly && (
                            <td style={{ textAlign: 'center', padding: '8px' }}>
                              <button 
                                type="button" 
                                className="btn-remove-row" 
                                style={{ background: '#ef4444', color: 'white', padding: '6px 12px', fontSize: '0.8rem' }}
                                onClick={() => handleRemoveRow(it.id)}
                              >
                                Supprimer
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Submit Actions */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn-dialog-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setCreateModalOpen(false)}>
                    {viewOnly ? 'Fermer' : 'Annuler'}
                  </button>
                  {!viewOnly && (
                    <button 
                      type="submit" 
                      className="btn-action" 
                      disabled={savingRFQ}
                      style={{ flex: 2, padding: '12px', background: 'var(--accent)', color: 'white', fontWeight: 600 }}
                    >
                      {savingRFQ ? '⏳ Publication...' : "📣 Confirmer & Publier l'Appel d'Offres"}
                    </button>
                  )}
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* RFQ Offers Comparator Modal */}
      {offersModalOpen && activeRfqForOffers && (
        <div id="rfq-offers-modal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ width: '750px' }}>
            <div className="modal-header">
              <h3>🤝 Comparateur d'offres fournisseurs ({activeRfqForOffers.rfqNumber})</h3>
              <span className="close-modal" onClick={() => setOffersModalOpen(false)}>✕</span>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                  Statut consultation : <strong id="offers-rfq-status" style={{ color: (activeRfqForOffers.status === 'APPROVED' || activeRfqForOffers.status === 'CLOSED') ? '#ef4444' : '#4ade80' }}>
                    {(activeRfqForOffers.status === 'APPROVED' || activeRfqForOffers.status === 'CLOSED') ? 'Attribué' : 'Ouvert'}
                  </strong>
                </span>
              </div>

              {/* Offers Table */}
              <div className="table-wrap" style={{ marginBottom: '20px' }}>
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Nom du Soumissionnaire</th>
                      <th>Montant global proposé</th>
                      <th>Délai de livraison estimé</th>
                      <th style={{ textAlign: 'center' }}>Critères techniques</th>
                      <th style={{ textAlign: 'center', width: '140px' }}>Décision</th>
                    </tr>
                  </thead>
                  <tbody id="rfq-offers-tbody">
                    {offersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                          Aucune offre reçue pour le moment.
                        </td>
                      </tr>
                    ) : (
                      offersList.map(resp => {
                        const priceFormatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD' }).format(resp.totalAmount || 0);
                        const isSelected = resp.selected || activeRfqForOffers.selectedResponse_ID === resp.ID;
                        
                        let decisionHtml = '';
                        if (isSelected) {
                          decisionHtml = (
                            <span 
                              style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid #4ade80', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                              ✅ Choisie
                            </span>
                          );
                        } else if (activeRfqForOffers.selectedResponse_ID) {
                          decisionHtml = <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Non retenue</span>;
                        } else {
                          decisionHtml = (
                            <button 
                              className="btn-action" 
                              disabled={submittingOffer}
                              style={{ background: '#22c55e', color: 'black', fontWeight: 700, padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => handleSelectOfferClick(resp.ID)}
                            >
                              {submittingOffer ? '...' : 'Choisir'}
                            </button>
                          );
                        }

                        return (
                          <tr key={resp.ID}>
                            <td style={{ fontWeight: 700 }}>
                              {resp.fournisseur ? resp.fournisseur.companyName : 'Fournisseur externe'}
                            </td>
                            <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{priceFormatted}</td>
                            <td>{resp.deliveryDays || '-'} jours</td>
                            <td style={{ textAlign: 'center', color: '#4ade80', fontSize: '1.2rem' }}>✅</td>
                            <td style={{ textAlign: 'center' }}>{decisionHtml}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Generate Purchase Order (PO) Action */}
              {activeRfqForOffers.selectedResponse_ID && !poExists && (
                <button 
                  id="btn-generate-po"
                  className="btn-action"
                  disabled={submittingPO}
                  onClick={handleConvertPOClick}
                  style={{ width: '100%', padding: '14px', background: 'var(--accent)', color: 'white', fontWeight: 700, borderRadius: '8px', fontSize: '0.95rem', marginBottom: '15px' }}
                >
                  {submittingPO ? '⏳ Génération...' : '🛒 Générer le Bon de Commande Officiel (SRM Purchase Order)'}
                </button>
              )}

              <div style={{ display: 'flex' }}>
                <button className="btn-dialog-secondary" style={{ width: '100%', padding: '12px' }} onClick={() => setOffersModalOpen(false)}>
                  Fermer
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
