import React, { useState } from 'react';

export default function Registrations({
  registrations,
  onOpenExam,
  examModalOpen,
  activeExamItem,
  onCloseExam,
  onViewPdf,
  onSubmitDecision,
  submittingDecision,
}) {
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');

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

  const handleDecision = (status) => {
    setCommentError('');
    const trimmedComment = comment.trim();
    if (status === 'REJECTED' && !trimmedComment) {
      setCommentError('Un motif de refus est obligatoire.');
      return;
    }
    onSubmitDecision(status, trimmedComment, () => {
      setComment('');
      onCloseExam();
    });
  };

  return (
    <div className="view-section active" id="registrations">
      {/* Table list of KYC dossiers */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Dossier / Raison Sociale</th>
              <th>E-mail de contact</th>
              <th>Type de compte demandé</th>
              <th style={{ width: '150px' }}>Actions KYC</th>
            </tr>
          </thead>
          <tbody id="registrations-table-body">
            {registrations.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                  Aucun dossier d'inscription en attente
                </td>
              </tr>
            ) : (
              registrations.map(r => {
                const typeLabel = r.type === 'FOURNISSEUR' ? 'Fournisseur' : (r.type === 'CLIENT_B2B' ? 'Client B2B' : 'Client B2C');
                const btnLabel = r.isReentry ? 'Re-examiner' : 'Examiner';
                const btnStyle = r.isReentry ? { background: '#fb923c', color: 'black' } : {};

                return (
                  <tr key={r.ID} id={`registration-row-${r.ID}`}>
                    <td style={{ fontWeight: 600 }}>
                      {r.companyName}
                      {r.isReentry && (
                        <span 
                          style={{
                            fontSize: '0.7rem',
                            background: '#fb923c',
                            color: 'black',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            marginLeft: '5px',
                            fontWeight: 'bold',
                          }}
                        >
                          RE-INSCRIPTION
                        </span>
                      )}
                    </td>
                    <td>{r.email}</td>
                    <td><strong>{typeLabel}</strong></td>
                    <td>
                      <button 
                        className="btn-action" 
                        style={btnStyle}
                        onClick={() => {
                          setComment('');
                          setCommentError('');
                          onOpenExam(r.ID);
                        }}
                      >
                        {btnLabel}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Exam Modal */}
      {examModalOpen && activeExamItem && (
        <div id="exam-modal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ width: '700px' }}>
            <div className="modal-header">
              <h3 id="exam-modal-title">📂 Examen du Dossier KYC</h3>
              <span className="close-modal" onClick={onCloseExam}>✕</span>
            </div>
            
            <div className="modal-body">
              {/* Info grid */}
              <div className="info-grid" style={{ marginBottom: '20px' }}>
                <div className="info-group">
                  <label>Raison Sociale / Nom</label>
                  <p id="exam-company" style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent)' }}>
                    {activeExamItem.companyName}
                  </p>
                </div>
                <div className="info-group">
                  <label>Type de compte</label>
                  <p id="exam-type" style={{ fontWeight: 600 }}>
                    {activeExamItem.type === 'FOURNISSEUR' ? 'Fournisseur' : (activeExamItem.type === 'CLIENT_B2B' ? 'Client B2B' : 'Client B2C')}
                  </p>
                </div>
                <div className="info-group">
                  <label>Adresse E-mail</label>
                  <p id="exam-email" style={{ fontFamily: 'monospace' }}>{activeExamItem.email}</p>
                </div>
                <div className="info-group">
                  <label>Secteur d'activité</label>
                  <p id="exam-sector">{formatSector(activeExamItem.sector)}</p>
                </div>
                <div className="info-group">
                  <label>Numéro Registre du Commerce (RC)</label>
                  <p id="exam-rc" style={{ fontFamily: 'monospace' }}>{activeExamItem.rcNumber || 'N/A'}</p>
                </div>
                <div className="info-group">
                  <label>Identifiant Fiscal (NIF)</label>
                  <p id="exam-nif" style={{ fontFamily: 'monospace' }}>{activeExamItem.nif || 'N/A'}</p>
                </div>
                <div className="info-group">
                  <label>Article d'Imposition (AI)</label>
                  <p id="exam-ai" style={{ fontFamily: 'monospace' }}>{activeExamItem.ai || 'N/A'}</p>
                </div>
                <div className="info-group">
                  <label>Relevé d'Identité Bancaire (RIB)</label>
                  <p id="exam-ribNumber" style={{ fontFamily: 'monospace' }}>{activeExamItem.ribNumber || 'N/A'}</p>
                </div>
              </div>

              {/* PDF Attachments Section */}
              <div className="docs-section">
                <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📄 Pièces justificatives PDF fournies :
                </h4>
                <div className="docs-grid">
                  <button 
                    className="btn-doc"
                    onClick={() => onViewPdf(`/odata/v4/registration/RegistrationRequests('${activeExamItem.ID}')/rc/$value`)}
                  >
                    📂 Registre Commerce (RC)
                  </button>
                  <button 
                    className="btn-doc"
                    onClick={() => onViewPdf(`/odata/v4/registration/RegistrationRequests('${activeExamItem.ID}')/nifDoc/$value`)}
                  >
                    📂 Carte fiscale (NIF)
                  </button>
                  <button 
                    className="btn-doc"
                    onClick={() => onViewPdf(`/odata/v4/registration/RegistrationRequests('${activeExamItem.ID}')/aiDoc/$value`)}
                  >
                    📂 Art. Imposition (AI)
                  </button>
                  <button 
                    className="btn-doc"
                    onClick={() => onViewPdf(`/odata/v4/registration/RegistrationRequests('${activeExamItem.ID}')/rib/$value`)}
                  >
                    📂 RIB Bancaire
                  </button>
                </div>
              </div>

              {/* Evaluation comments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Commentaires / Motif de refus (Obligatoire si refusé)
                </label>
                <textarea 
                  id="exam-comment" 
                  rows={3} 
                  placeholder="Décrivez vos conclusions d'examen ou spécifiez le motif précis du refus..."
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    if (e.target.value.trim()) setCommentError('');
                  }}
                  style={{ width: '100%', border: commentError ? '1px solid var(--accent-red)' : '1px solid var(--border)' }}
                />
                {commentError && (
                  <span className="field-error-msg" style={{ color: 'var(--accent-red)', fontSize: '0.75rem', fontWeight: 600 }}>
                    {commentError}
                  </span>
                )}
              </div>

              {/* Decision Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn-reject" 
                  disabled={submittingDecision}
                  onClick={() => handleDecision('REJECTED')}
                  style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submittingDecision ? '⏳ Refus...' : '❌ Refuser le dossier'}
                </button>
                
                <button 
                  className="btn-approve" 
                  disabled={submittingDecision}
                  onClick={() => handleDecision('APPROVED')}
                  style={{ flex: 2, background: 'var(--accent-green)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submittingDecision ? '⏳ Approbation...' : '✅ Approuver & Activer le compte'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
