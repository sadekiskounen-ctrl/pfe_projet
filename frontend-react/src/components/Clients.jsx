import React from 'react';

export default function Clients({
  partners,
  clientFilterType,
  setClientFilterType,
  wilayaFilter,
  setWilayaFilter,
  sectorFilter,
  setSectorFilter,
  onOpenDetails,
  onBlockToggle,
  onDelete,
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

  return (
    <div className="view-section active" id="partners">
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
        {/* Client Type Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            id="btn-filter-all" 
            className={`btn-filter ${clientFilterType === '' ? 'active' : ''}`}
            onClick={() => setClientFilterType('')}
          >
            Tous les clients
          </button>
          <button 
            id="btn-filter-b2b" 
            className={`btn-filter ${clientFilterType === 'CLIENT_B2B' ? 'active' : ''}`}
            onClick={() => setClientFilterType('CLIENT_B2B')}
          >
            Clients B2B
          </button>
          <button 
            id="btn-filter-b2c" 
            className={`btn-filter ${clientFilterType === 'CLIENT_B2C' ? 'active' : ''}`}
            onClick={() => setClientFilterType('CLIENT_B2C')}
          >
            Clients B2C
          </button>
        </div>

        {/* Search Inputs / Selects */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            id="filter-wilaya" 
            value={wilayaFilter} 
            onChange={(e) => setWilayaFilter(e.target.value)}
          >
            <option value="">Toutes wilayas</option>
            {wilayasList.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          <select 
            id="filter-sector-client" 
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

      {/* Partners List Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Type</th>
              <th>Nom de l'entreprise / Client</th>
              <th>Wilaya</th>
              <th>Secteur d'activité</th>
              <th>Statut</th>
              <th style={{ width: '220px' }}>Actions</th>
            </tr>
          </thead>
          <tbody id="partners-table-body">
            {partners.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                  Aucun client trouvé
                </td>
              </tr>
            ) : (
              partners.map(bp => {
                const typeLabel = bp.bpType === 'CLIENT_B2B' ? 'B2B' : 'B2C';
                const isBlocked = bp.status !== 'ACTIVE';
                const statusHtml = !isBlocked ? (
                  <span style={{ color: '#4ade80', fontWeight: 600 }}>✅ ACTIF</span>
                ) : (
                  <span style={{ color: '#f87171', fontWeight: 600 }}>❌ Bloqué</span>
                );

                return (
                  <tr key={bp.ID} id={`partner-row-${bp.ID}`}>
                    <td><strong>{typeLabel}</strong></td>
                    <td style={{ fontWeight: 600 }}>{bp.displayName}</td>
                    <td>{bp.wilaya || '-'}</td>
                    <td>
                      <span 
                        style={{
                          background: 'rgba(56,189,248,0.1)',
                          color: 'var(--accent)',
                          padding: '4px 10px',
                          borderRadius: '15px',
                          fontSize: '0.85rem',
                        }}
                      >
                        {formatSector(bp.sector)}
                      </span>
                    </td>
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
