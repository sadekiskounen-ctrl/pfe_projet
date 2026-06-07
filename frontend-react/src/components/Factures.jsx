import React from 'react';

export default function Factures({
  factures,
  filterType,
  setFilterType,
  onViewInvoice,
  onResolveDispute,
  onPaySupplier,
}) {
  const viewedInvoices = JSON.parse(localStorage.getItem('viewedConfirmedInvoices') || '[]');

  return (
    <div className="view-section active" id="factures">
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
            id="filter-fac-type" 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            <option value="">Toutes les factures (Client & Fournisseur)</option>
            <option value="CLIENT">Factures Clients (Sortantes)</option>
            <option value="FOURNISSEUR">Factures Fournisseurs (Entrantes)</option>
          </select>
        </div>
      </div>

      {/* Factures Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>N° Facture</th>
              <th>Flux / Partenaire</th>
              <th>Date de facturation</th>
              <th>Montant Total (TTC)</th>
              <th>Statut de rapprochement / Règlement</th>
              <th style={{ width: '240px' }}>Actions</th>
            </tr>
          </thead>
          <tbody id="admin-factures-tbody">
            {factures.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                  Aucune facture trouvée.
                </td>
              </tr>
            ) : (
              factures.map(f => {
                const isSupplier = f._type === 'FOURNISSEUR';
                const typeLabel = isSupplier ? (
                  <span style={{ color: '#fb923c', fontWeight: 600 }}>Fournisseur</span>
                ) : (
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>Client</span>
                );

                const statusColors = { PAID: '#4ade80', UNPAID: '#f87171', PARTIAL: '#fb923c', MATCHED: '#4ade80', LITIGE: '#f87171' };
                
                let sLabel = f.status || '-';
                if (isSupplier && f.matchStatus === 'DISCREPANCY') {
                  sLabel = 'LITIGE';
                }
                const sColor = statusColors[sLabel] || '#94a3b8';
                let statusHtml = <span style={{ color: sColor, fontWeight: 700 }}>{sLabel}</span>;

                const isNew = f.status !== 'PAID' && !viewedInvoices.includes(f.ID);

                const remAmt = f.remainingAmount !== undefined ? f.remainingAmount : (f.status === 'PAID' ? 0 : f.totalTTC);
                const remHtml = (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Reste à payer : {new Intl.NumberFormat('fr-FR').format(remAmt)} DA
                  </div>
                );

                return (
                  <tr 
                    key={f.ID} 
                    id={`invoice-row-${f.ID}`}
                    onClick={() => onViewInvoice(f.ID, f._type)} 
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 700 }}>{f.invoiceNumber || f.factureNumber || '-'}</td>
                    <td>{typeLabel}</td>
                    <td>{f.date || f.createdAt?.slice(0, 10) || '-'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      {new Intl.NumberFormat('fr-FR').format(f.totalTTC || 0)} DA
                      {remHtml}
                    </td>
                    <td>
                      {statusHtml}
                      {isNew && (
                        <span 
                          style={{
                            background: sLabel === 'LITIGE' ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)',
                            color: sLabel === 'LITIGE' ? '#f87171' : '#4ade80',
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
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn-action" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                        onClick={() => onViewInvoice(f.ID, f._type)}
                      >
                        📄 Voir PDF
                      </button>
                      {isSupplier && f.matchStatus === 'DISCREPANCY' && (
                        <button 
                          className="btn-resolve" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px', marginLeft: '5px' }}
                          onClick={() => onResolveDispute(f.ID, f.invoiceNumber)}
                        >
                          ⚖️ Résoudre
                        </button>
                      )}
                      {isSupplier && f.status === 'APPROVED' && (
                        <button 
                          className="btn-action" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px', background: '#4ade80', color: 'black', marginLeft: '5px', fontWeight: 700 }}
                          onClick={() => onPaySupplier(f.ID, f.invoiceNumber, f.totalTTC)}
                        >
                          💵 Payer
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
    </div>
  );
}
