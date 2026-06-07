import React from 'react';

export default function Fournisseurs({
  suppliers,
  notationFilter,
  setNotationFilter,
  wilayaFilter,
  setWilayaFilter,
  sectorFilter,
  setSectorFilter,
  onOpenDetails,
  onBlockToggle,
  onDelete,
  onRateSupplier,
  wilayasList = [],
}) {
  const formatSector = (sector) => {
    if (!sector || sector === 'N/A') return '-';
    const val = sector.toLowerCase().trim();
    if (val.includes('informatique') || val.includes('tech') || val.includes('service') || val.includes('logiciel')) {
      return 'Informatique & Tech';
    }
    if (val.includes('industrie') || val.includes('manufacture') || val.includes('fabrication') || val.includes('usine')) {
      return 'Industrie & Manufacture';
    }
    if (val.includes('btp') || val.includes('construction') || val.includes('batiment')) {
      return 'BTP & Construction';
    }
    if (val.includes('commerce') || val.includes('distribution') || val.includes('magasin')) {
      return 'Commerce & Distribution';
    }
    return `autre("${sector}")`;
  };

  const renderStars = (bpId, currentRating) => {
    const stars = [];
    const rating = currentRating || 3;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span 
          key={i}
          style={{
            cursor: 'pointer',
            color: i <= rating ? '#eab308' : 'var(--border)',
            fontSize: '1.2rem',
            marginRight: '2px',
          }}
          onClick={() => onRateSupplier(bpId, i)}
          title={`Noter ${i} étoile(s)`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="view-section active" id="suppliers">
      {/* Filters Bar */}
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
        {/* Suppliers notation/rating filter */}
        <div>
          <select 
            id="filter-notation" 
            value={notationFilter} 
            onChange={(e) => setNotationFilter(e.target.value)}
          >
            <option value="">Filtrer par note</option>
            <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
            <option value="4">⭐⭐⭐⭐ (4/5)</option>
            <option value="3">⭐⭐⭐ (3/5)</option>
            <option value="2">⭐⭐ (2/5)</option>
            <option value="1">⭐ (1/5)</option>
          </select>
        </div>

        {/* Search Inputs / Selects */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            id="filter-wilaya-supplier" 
            value={wilayaFilter} 
            onChange={(e) => setWilayaFilter(e.target.value)}
          >
            <option value="">Toutes wilayas</option>
            {wilayasList.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          <select 
            id="filter-sector-supplier" 
            value={sectorFilter} 
            onChange={(e) => setSectorFilter(e.target.value)}
          >
            <option value="">Filtrer par secteur</option>
            <option value="Informatique & Tech">Informatique & Tech</option>
            <option value="Industrie & Manufacture">Industrie & Manufacture</option>
            <option value="BTP & Construction">BTP & Construction</option>
            <option value="Commerce & Distribution">Commerce & Distribution</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
      </div>

      {/* Suppliers List Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Nom du Fournisseur</th>
              <th>Wilaya</th>
              <th>Secteur d'activité</th>
              <th>Évaluation (notation)</th>
              <th>Statut</th>
              <th style={{ width: '220px' }}>Actions</th>
            </tr>
          </thead>
          <tbody id="suppliers-table-body">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                  Aucun fournisseur trouvé
                </td>
              </tr>
            ) : (
              suppliers.map(bp => {
                const isBlocked = bp.status !== 'ACTIVE';
                const statusHtml = !isBlocked ? (
                  <span style={{ color: '#4ade80', fontWeight: 600 }}>✅ ACTIF</span>
                ) : (
                  <span style={{ color: '#f87171', fontWeight: 600 }}>❌ Bloqué</span>
                );

                return (
                  <tr key={bp.ID} id={`supplier-row-${bp.ID}`}>
                    <td style={{ fontWeight: 600 }}>{bp.displayName}</td>
                    <td>{bp.wilaya || '-'}</td>
                    <td>
                      <span 
                        style={{
                          background: 'rgba(251,146,60,0.1)',
                          color: 'var(--accent-orange)',
                          padding: '4px 10px',
                          borderRadius: '15px',
                          fontSize: '0.85rem',
                        }}
                      >
                        {formatSector(bp.sector)}
                      </span>
                    </td>
                    <td>{renderStars(bp.ID, bp.rating)}</td>
                    <td>{statusHtml}</td>
                    <td style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        className="btn-action" 
                        style={{ background: 'var(--accent)' }}
                        onClick={() => onOpenDetails(bp)}
                      >
                        Voir
                      </button>
                      <button 
                        className="btn-action" 
                        style={{ background: isBlocked ? 'var(--accent-green)' : 'var(--accent-red)', color: 'white' }}
                        onClick={() => onBlockToggle(bp.ID, bp.displayName, bp.status)}
                      >
                        {isBlocked ? 'Activer' : 'Bloquer'}
                      </button>
                      <button 
                        className="btn-action" 
                        style={{ background: '#334155', color: '#f87171', marginLeft: '5px', border: '1px solid #f87171' }}
                        title="Supprimer"
                        onClick={() => onDelete(bp.ID, bp.displayName)}
                      >
                        ❌
                      </button>
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
