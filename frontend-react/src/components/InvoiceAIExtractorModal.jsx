import React, { useState, useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────
   InvoiceAIExtractorModal — Premium Redesign
   Split-view: PDF viewer (left) + editable form (right)
───────────────────────────────────────────────────────────── */
export default function InvoiceAIExtractorModal({ isOpen, onClose, onRefreshData, showToast }) {
  const [step, setStep]               = useState(1); // 1:UPLOAD  2:LOADING  3:RESULTS
  const [dragActive, setDragActive]   = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64]   = useState('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [filePreviewUrl, setFilePreviewUrl] = useState(''); // blob URL for preview

  // Loading
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingSteps = [
    { icon: '📂', text: 'Lecture du document...' },
    { icon: '🧠', text: 'Analyse par l\'IA Gemini...' },
    { icon: '📊', text: 'Structuration des données...' },
    { icon: '✨', text: 'Finalisation de l\'extraction...' },
  ];

  // Error / manual
  const [apiError, setApiError]       = useState('');
  const [isManualInput, setIsManualInput] = useState(false);

  // Form fields
  const [extNumero, setExtNumero]           = useState('');
  const [extDate, setExtDate]               = useState('');
  const [extBc, setExtBc]                   = useState('');
  const [extModePaiement, setExtModePaiement] = useState('ESPECES');
  const [extFournisseur, setExtFournisseur] = useState('');
  const [extNif, setExtNif]                 = useState('');
  const [extRc, setExtRc]                   = useState('');
  const [extRib, setExtRib]                 = useState('');
  const [extAdresse, setExtAdresse]         = useState('');
  const [extHt, setExtHt]                   = useState(0);
  const [extTvaPercent, setExtTvaPercent]   = useState(19);
  const [extTva, setExtTva]                 = useState(0);
  const [extTtc, setExtTtc]                 = useState(0);
  const [extLignes, setExtLignes]           = useState([]);
  const [confidence, setConfidence]         = useState('medium');

  // Supplier
  const [suppliers, setSuppliers]           = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  // PDF panel
  const [pdfPanelWidth, setPdfPanelWidth]   = useState(45); // % of modal width
  const [isResizing, setIsResizing]         = useState(false);
  const resizerRef = useRef(null);
  const containerRef = useRef(null);

  const fileInputRef = useRef(null);

  // ── Load suppliers (with deduplication by NIF) ──────────────
  useEffect(() => {
    if (isOpen) {
      fetch('/odata/v4/admin/Fournisseurs')
        .then(r => r.json())
        .then(d => {
          const raw = d.value || [];
          // Dédupliquer : garder un seul enregistrement par NIF (ou par ID si pas de NIF)
          const seen = new Set();
          const unique = raw.filter(s => {
            const key = s.nif ? `nif:${s.nif}` : (s.rc ? `rc:${s.rc}` : `id:${s.ID}`);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          // Trier par nom
          unique.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || '', 'fr'));
          setSuppliers(unique);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // ── Loading step rotation ─────────────────────────────────
  useEffect(() => {
    let t;
    if (step === 2) {
      setLoadingStep(0);
      t = setInterval(() => setLoadingStep(p => (p + 1) % loadingSteps.length), 1800);
    }
    return () => clearInterval(t);
  }, [step]);

  // ── TVA recalc ────────────────────────────────────────────
  useEffect(() => {
    const ht  = parseFloat(extHt) || 0;
    const pct = parseFloat(extTvaPercent) || 0;
    const tvaV = ht * (pct / 100);
    setExtTva(parseFloat(tvaV.toFixed(2)));
    setExtTtc(parseFloat((ht + tvaV).toFixed(2)));
  }, [extHt, extTvaPercent]);

  // ── Cleanup blob URL ──────────────────────────────────────
  useEffect(() => {
    return () => { if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl); };
  }, [filePreviewUrl]);

  // ── Resizable divider ─────────────────────────────────────
  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };
  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e) => {
      if (!containerRef.current) return;
      const rect  = containerRef.current.getBoundingClientRect();
      const x     = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const pct   = Math.min(65, Math.max(25, (x / rect.width) * 100));
      setPdfPanelWidth(pct);
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',  onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',  onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, [isResizing]);

  if (!isOpen) return null;

  // ── File handling ─────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };

  const processFile = (file) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Fichier trop volumineux', 'Max 10 MB autorisé.');
      return;
    }
    setSelectedFile(file);
    setFileMimeType(file.type);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (ev) => setFileBase64(ev.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setFileBase64('');
    setFileMimeType('');
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Gemini call ───────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!fileBase64) return;
    setStep(2);
    setApiError('');
    setIsManualInput(false);
    try {
      let localApiKey = localStorage.getItem('gemini_api_key') || '';
      const res = await fetch('/api/extract-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-gemini-key': localApiKey },
        body: JSON.stringify({ fileData: fileBase64, mimeType: fileMimeType })
      });
      if (res.status === 400) {
        const key = prompt('Saisissez votre clé API Google Gemini :');
        if (!key) throw new Error('Clé API requise.');
        localStorage.setItem('gemini_api_key', key);
        return handleAnalyze();
      }
      if (!res.ok) {
        let errMsg = `Erreur serveur (${res.status})`;
        try { const err = await res.json(); errMsg = err.error?.message || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      setExtNumero(data.numero || '');
      setExtDate(data.date || '');
      setExtBc(data.bc || '');
      setExtModePaiement(data.modePaiement || 'ESPECES');
      setExtFournisseur(data.fournisseur || '');
      setExtNif(data.nif || '');
      setExtRc(data.rc || '');
      setExtRib(data.rib || '');
      setExtAdresse(data.adresse || '');
      setExtHt(data.ht || 0);
      setExtTvaPercent(data.tvaPercent || 19);
      setExtLignes(data.lignes || []);
      setConfidence(data.confidence || 'medium');
      matchSupplierLocally(data.fournisseur, data.nif, data.rc);
      setStep(3);
    } catch (err) {
      setApiError(err.message);
      setExtNumero(''); setExtDate(''); setExtBc('');
      setExtModePaiement('ESPECES'); setExtFournisseur('');
      setExtNif(''); setExtRc(''); setExtRib(''); setExtAdresse('');
      setExtHt(0); setExtTvaPercent(19); setExtLignes([]);
      setConfidence('low'); setIsManualInput(false);
      setStep(3);
    }
  };

  const matchSupplierLocally = (name, nif, rc) => {
    if (!suppliers.length) return;
    const norm = v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nif) { const m = suppliers.find(s => norm(s.nif) === norm(nif)); if (m) { setSelectedSupplierId(m.ID); return; } }
    if (rc)  { const m = suppliers.find(s => norm(s.rc)  === norm(rc));  if (m) { setSelectedSupplierId(m.ID); return; } }
    if (name) {
      const m = suppliers.find(s =>
        norm(s.companyName).includes(norm(name)) || norm(name).includes(norm(s.companyName))
      );
      if (m) { setSelectedSupplierId(m.ID); return; }
    }
    setSelectedSupplierId('');
  };

  // ── Lines ─────────────────────────────────────────────────
  const handleLineChange = (i, field, value) => {
    const updated = [...extLignes];
    updated[i][field] = value;
    if (field === 'quantite' || field === 'prixUnitaireHT') {
      const qty = parseFloat(updated[i].quantite) || 0;
      const price = parseFloat(updated[i].prixUnitaireHT) || 0;
      updated[i].totalHT = parseFloat((qty * price).toFixed(2));
      setExtHt(parseFloat(updated.reduce((s, l) => s + (l.totalHT || 0), 0).toFixed(2)));
    }
    setExtLignes(updated);
  };
  const addLine    = () => setExtLignes([...extLignes, { description: 'Nouvel article', quantite: 1, prixUnitaireHT: 0, totalHT: 0 }]);
  const removeLine = (i) => {
    const updated = extLignes.filter((_, idx) => idx !== i);
    setExtLignes(updated);
    setExtHt(parseFloat(updated.reduce((s, l) => s + (l.totalHT || 0), 0).toFixed(2)));
  };

  // ── Confirm ───────────────────────────────────────────────
  const handleConfirm = async () => {
    let supplierId = selectedSupplierId;

    // Auto-create supplier if not found (or reuse existing)
    if (!supplierId) {
      if (!extFournisseur) {
        showToast('error', 'Fournisseur manquant', 'Saisissez le nom du fournisseur avant de confirmer.');
        return;
      }
      try {
        showToast('info', 'Recherche du fournisseur', `"${extFournisseur}" — vérification en cours...`);
        const emailSlug = extFournisseur.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
        const createRes = await fetch('/api/create-fournisseur', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: extFournisseur,
            email: `${emailSlug}@fournisseur-import.dz`,
            nif: extNif || null, rc: extRc || null,
            rib: extRib || null, street: extAdresse || null,
            kycStatus: 'PENDING', score: 0, country: 'DZ'
          })
        });
        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Erreur HTTP ${createRes.status}`);
        }
        const newSupplier = await createRes.json();
        supplierId = newSupplier.ID;
        setSelectedSupplierId(supplierId);
        if (newSupplier._existing) {
          showToast('info', 'Fournisseur existant utilisé', `♻️ "${extFournisseur}" déjà enregistré — réutilisation.`);
        } else {
          showToast('success', 'Fournisseur créé', `✅ "${extFournisseur}" ajouté (KYC en attente).`);
        }
      } catch (err) {
        showToast('error', 'Échec création fournisseur', err.message);
        return;
      }
    }

    if (!extNumero) { showToast('error', 'Champs manquants', 'Le numéro de facture est obligatoire.'); return; }

    try {
      showToast('info', 'Création de la facture', 'Enregistrement en cours...');
      let formattedDate = new Date().toISOString().split('T')[0];
      if (extDate) {
        const parts = extDate.split('/');
        if (parts.length === 3) formattedDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        else { const p = Date.parse(extDate); if (!isNaN(p)) formattedDate = new Date(p).toISOString().split('T')[0]; }
      }
      const dateObj = new Date(formattedDate);
      dateObj.setDate(dateObj.getDate() + 30);
      const formattedDueDate = dateObj.toISOString().split('T')[0];

      let matchedPo = null;
      if (extBc) {
        const poRes  = await fetch(`/odata/v4/srm/BonsCommande?$filter=poNumber eq '${extBc.trim()}'&$expand=items`);
        const poData = await poRes.json();
        if (poData.value?.length > 0) matchedPo = poData.value[0];
      }

      if (matchedPo) {
        const mappedItems = extLignes.map(line => {
          const poItem = matchedPo.items.find(pi =>
            pi.description.toLowerCase().includes(line.description.toLowerCase()) ||
            line.description.toLowerCase().includes(pi.description.toLowerCase())
          ) || matchedPo.items[0];
          return { poItemId: poItem?.ID || null, quantity: parseFloat(line.quantite) || 1, unitPrice: parseFloat(line.prixUnitaireHT) || 0, tvaRate: parseFloat(extTvaPercent) || 19, description: line.description };
        }).filter(it => it.poItemId !== null);

        const res = await fetch('/odata/v4/srm/createSupplierInvoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poId: matchedPo.ID, receptionId: matchedPo.receptions?.[0]?.ID || null, items: mappedItems, dueDate: formattedDueDate, notes: `Facture N° ${extNumero} (Importée par IA)` })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Erreur création'); }
        const data = await res.json();
        showToast('success', 'Facture créée', `${data.invoiceNumber} — ${data.matchStatus === 'MATCHED' ? '✓ 3-Way Match conforme' : '⚠️ Litige détecté'}`);
      } else {
        const factItems = extLignes.map((l, idx) => ({
          lineNumber: idx + 1, description: l.description,
          quantity: parseFloat(l.quantite) || 1, unitPrice: parseFloat(l.prixUnitaireHT) || 0,
          tvaRate: parseFloat(extTvaPercent) || 19,
          totalHT: parseFloat((l.quantite * l.prixUnitaireHT).toFixed(2)),
          totalTVA: parseFloat((l.quantite * l.prixUnitaireHT * (extTvaPercent / 100)).toFixed(2)),
          totalTTC: parseFloat((l.quantite * l.prixUnitaireHT * (1 + extTvaPercent / 100)).toFixed(2))
        }));
        const res = await fetch('/odata/v4/srm/FacturesFournisseur', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fournisseur_ID: supplierId, date: formattedDate, dueDate: formattedDueDate,
            totalHT: parseFloat(extHt.toFixed(2)), totalTVA: parseFloat(extTva.toFixed(2)),
            totalTTC: parseFloat(extTtc.toFixed(2)), paidAmount: 0,
            remainingAmount: parseFloat(extTtc.toFixed(2)), status: 'SENT', matchStatus: 'PENDING',
            notes: `Facture N° ${extNumero} (Importée par IA — Sans PO)`, items: factItems
          })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Erreur OData'); }
        showToast('success', 'Facture créée', `La facture ${extNumero} a été enregistrée avec succès.`);
      }
      onRefreshData(); onClose(); resetForm();
    } catch (err) {
      showToast('error', 'Échec de la création', err.message);
    }
  };

  const resetForm = () => { setStep(1); resetUpload(); setApiError(''); setIsManualInput(false); };

  // ── Helpers ───────────────────────────────────────────────
  const fmt  = (n) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(n || 0);
  const isPdf = fileMimeType === 'application/pdf';

  const confidenceConfig = {
    high:   { label: '✅ Confiance élevée',                 bg: 'rgba(5,150,105,0.15)', color: '#10b981', border: '#10b981' },
    medium: { label: '⚠️ Vérifiez les données',             bg: 'rgba(217,119,6,0.15)', color: '#f59e0b', border: '#f59e0b' },
    low:    { label: '❌ Extraction incertaine',             bg: 'rgba(220,38,38,0.15)', color: '#ef4444', border: '#ef4444' },
  };
  const conf = confidenceConfig[confidence] || confidenceConfig.medium;

  // ─────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ai-spin { to { transform: rotate(360deg); } }
        @keyframes ai-pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        @keyframes ai-slide-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ai-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        @keyframes ai-bar-move {
          0%   { left: -45%; width: 45%; }
          50%  { left:  60%; width: 30%; }
          100% { left: 110%; width: 45%; }
        }
        @keyframes ai-glow-ring {
          0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
          50%      { box-shadow: 0 0 0 8px rgba(99,102,241,0.25); }
        }
        .ai-modal-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .ai-modal-shell {
          background: var(--card-bg, #1a1d2e);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6);
          display: flex; flex-direction: column;
          overflow: hidden;
          animation: ai-slide-up .3s ease;
        }
        /* ── Header ── */
        .ai-header {
          display: flex; align-items: center; gap: 14px;
          padding: 20px 28px;
          background: linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ai-header-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem; flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(99,102,241,0.4);
        }
        .ai-header-title { font-size: 1.15rem; font-weight: 700; color: var(--text-main,#fff); margin: 0; }
        .ai-header-sub   { font-size: 0.75rem; color: var(--text-muted,#888); margin: 2px 0 0; }
        .ai-close-btn {
          margin-left: auto; width: 34px; height: 34px; border-radius: 50%;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-muted,#aaa); cursor: pointer; display: flex;
          align-items: center; justify-content: center; font-size: 1rem;
          transition: all .2s;
        }
        .ai-close-btn:hover { background: rgba(239,68,68,0.15); color: #ef4444; border-color: #ef4444; }
        /* ── Steps ── */
        .ai-steps {
          display: flex; align-items: center; gap: 0;
          padding: 14px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }
        .ai-step-item {
          display: flex; align-items: center; gap: 8px; flex: 1;
          font-size: 0.78rem; font-weight: 600;
          color: var(--text-muted,#666);
          transition: color .3s;
        }
        .ai-step-item.active  { color: #6366f1; }
        .ai-step-item.done    { color: #10b981; }
        .ai-step-circle {
          width: 26px; height: 26px; border-radius: 50%;
          background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 700; flex-shrink: 0;
          transition: all .3s;
        }
        .ai-step-item.active .ai-step-circle {
          background: #6366f1; border-color: #6366f1; color: #fff;
          animation: ai-glow-ring 2s infinite;
        }
        .ai-step-item.done .ai-step-circle { background: #10b981; border-color: #10b981; color: #fff; }
        .ai-step-divider { flex: 0 0 24px; height: 1px; background: rgba(255,255,255,0.1); margin: 0 4px; }
        /* ── Upload zone ── */
        .ai-upload-zone {
          border: 2px dashed rgba(255,255,255,0.15); border-radius: 16px;
          padding: 48px 32px; text-align: center; cursor: pointer;
          transition: all .25s ease; position: relative; overflow: hidden;
          background: rgba(255,255,255,0.025);
        }
        .ai-upload-zone:hover, .ai-upload-zone.drag {
          border-color: #6366f1;
          background: rgba(99,102,241,0.07);
        }
        .ai-upload-zone.drag { animation: ai-glow-ring .8s infinite; }
        .ai-upload-zone-icon {
          font-size: 3.2rem; margin-bottom: 14px;
          filter: drop-shadow(0 4px 10px rgba(99,102,241,0.4));
          transition: transform .25s;
        }
        .ai-upload-zone:hover .ai-upload-zone-icon { transform: scale(1.08) translateY(-3px); }
        /* ── File chip ── */
        .ai-file-chip {
          display: flex; align-items: center; gap: 12px;
          background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.25);
          border-radius: 12px; padding: 12px 16px;
        }
        .ai-file-chip-icon { font-size: 1.8rem; }
        /* ── Loading ── */
        .ai-loading-ring {
          width: 72px; height: 72px; border-radius: 50%;
          border: 4px solid rgba(99,102,241,0.15);
          border-top: 4px solid #6366f1;
          animation: ai-spin 1s linear infinite;
        }
        .ai-loading-dots span {
          display: inline-block; width: 7px; height: 7px; border-radius: 50%;
          background: #6366f1; margin: 0 3px;
          animation: ai-pulse 1.2s ease-in-out infinite;
        }
        .ai-loading-dots span:nth-child(2) { animation-delay: .2s; }
        .ai-loading-dots span:nth-child(3) { animation-delay: .4s; }
        .ai-progress-bar {
          width: 100%; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.08); position: relative; overflow: hidden;
        }
        .ai-progress-bar::after {
          content: ''; position: absolute; height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1);
          animation: ai-bar-move 1.8s ease-in-out infinite;
        }
        /* ── Split pane ── */
        .ai-split-container {
          display: flex; flex: 1; overflow: hidden;
          min-height: 0;
        }
        .ai-pdf-panel {
          display: flex; flex-direction: column;
          background: #0d0f1a; border-right: 1px solid rgba(255,255,255,0.07);
          min-width: 0; flex-shrink: 0;
        }
        .ai-pdf-header {
          padding: 10px 14px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; gap: 8px;
          font-size: 0.78rem; font-weight: 600; color: var(--text-muted,#888);
        }
        .ai-pdf-badge {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; border-radius: 6px; padding: 2px 8px; font-size: 0.7rem;
        }
        .ai-pdf-viewer {
          flex: 1; overflow: hidden; display: flex;
          align-items: center; justify-content: center;
          background: #0d0f1a;
        }
        .ai-pdf-viewer iframe,
        .ai-pdf-viewer img {
          width: 100%; height: 100%; border: none;
          object-fit: contain;
        }
        .ai-divider-handle {
          width: 5px; cursor: col-resize; flex-shrink: 0;
          background: rgba(255,255,255,0.05);
          transition: background .2s;
          display: flex; align-items: center; justify-content: center;
        }
        .ai-divider-handle:hover { background: rgba(99,102,241,0.35); }
        .ai-divider-handle::after {
          content: '⋮'; color: rgba(255,255,255,0.25);
          font-size: 1.1rem; line-height: 1;
          pointer-events: none;
        }
        /* ── Form panel ── */
        .ai-form-panel {
          flex: 1; display: flex; flex-direction: column;
          overflow: hidden; min-width: 0;
        }
        .ai-form-scroll {
          flex: 1; overflow-y: auto; padding: 20px 24px;
        }
        .ai-form-scroll::-webkit-scrollbar { width: 5px; }
        .ai-form-scroll::-webkit-scrollbar-track { background: transparent; }
        .ai-form-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        /* ── Section headers ── */
        .ai-section-header {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.8rem; font-weight: 700; letter-spacing: .04em;
          text-transform: uppercase; margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ai-section-dot {
          width: 6px; height: 6px; border-radius: 50%;
        }
        /* ── Form inputs ── */
        .ai-input-group { display: flex; flex-direction: column; gap: 5px; }
        .ai-label {
          font-size: 0.72rem; font-weight: 600; color: var(--text-muted,#888);
          text-transform: uppercase; letter-spacing: .04em;
        }
        .ai-input {
          width: 100%; box-sizing: border-box;
          padding: 8px 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: var(--text-main,#fff);
          font-size: 0.85rem; transition: all .2s; outline: none;
        }
        .ai-input:focus {
          border-color: #6366f1;
          background: rgba(99,102,241,0.08);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .ai-input-readonly {
          background: rgba(255,255,255,0.025);
          border-color: rgba(255,255,255,0.06);
          color: var(--text-muted,#888); cursor: default;
        }
        .ai-amount-box {
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 10px; padding: 12px 14px;
          text-align: center;
        }
        .ai-amount-label { font-size: 0.68rem; color: var(--text-muted,#888); text-transform: uppercase; font-weight: 600; }
        .ai-amount-value { font-size: 1.15rem; font-weight: 700; color: var(--text-main,#fff); font-family: 'Courier New', monospace; margin-top: 3px; }
        .ai-amount-box.ttc .ai-amount-value { color: #10b981; font-size: 1.3rem; }
        /* ── Table ── */
        .ai-lines-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .ai-lines-table th {
          padding: 8px 10px; text-align: left;
          color: var(--text-muted,#888); font-size: 0.7rem;
          text-transform: uppercase; letter-spacing: .04em;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
        }
        .ai-lines-table td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .ai-lines-table tr:hover td { background: rgba(255,255,255,0.025); }
        .ai-table-input {
          width: 100%; background: transparent; border: none; outline: none;
          color: var(--text-main,#fff); font-size: 0.82rem;
        }
        .ai-table-input:focus {
          background: rgba(99,102,241,0.1);
          border-radius: 4px; padding: 2px 4px;
        }
        /* ── Confidence badge ── */
        .ai-confidence {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 20px;
          font-size: 0.75rem; font-weight: 700; border: 1px solid;
        }
        /* ── Banners ── */
        .ai-banner {
          border-radius: 10px; padding: 12px 16px;
          font-size: 0.82rem; display: flex; align-items: flex-start; gap: 10px;
        }
        .ai-banner.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; }
        .ai-banner.success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; }
        /* ── Supplier select ── */
        .ai-select {
          width: 100%; box-sizing: border-box;
          padding: 8px 12px;
          background: var(--elevated-bg, #1e2035);
          border: 1px solid var(--border, rgba(255,255,255,0.1));
          border-radius: 8px;
          color: var(--text-main, #ffffff);
          font-size: 0.85rem; outline: none; cursor: pointer;
          -webkit-appearance: auto;
          transition: background 240ms, color 240ms, border-color 240ms;
        }
        .ai-select:focus { border-color: var(--accent, #6366f1); box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        /* Force les options avec les variables de thèmes correspondantes */
        .ai-select option {
          background-color: var(--elevated-bg, #1e2035);
          color: var(--text-main, #ffffff);
          padding: 6px 10px;
        }
        .ai-select option:hover, .ai-select option:checked {
          background-color: var(--accent, #6366f1);
          color: #ffffff;
        }
        /* ── Buttons ── */
        .ai-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 10px; font-size: 0.85rem;
          font-weight: 600; cursor: pointer; border: none; transition: all .2s;
        }
        .ai-btn-primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.4);
        }
        .ai-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.5); }
        .ai-btn-primary:disabled { opacity:.4; cursor:not-allowed; transform:none; box-shadow:none; }
        .ai-btn-success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff; box-shadow: 0 4px 14px rgba(16,185,129,0.35);
        }
        .ai-btn-success:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,0.45); }
        .ai-btn-ghost {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-muted,#aaa);
        }
        .ai-btn-ghost:hover { background: rgba(255,255,255,0.1); color: var(--text-main,#fff); }
        .ai-btn-danger { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #f87171; }
        .ai-btn-danger:hover { background: rgba(239,68,68,0.2); }
        /* ── Footer ── */
        .ai-footer {
          padding: 16px 24px;
          border-top: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          flex-wrap: wrap;
        }
        .ai-form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ai-form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .ai-form-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
        .ai-section-block { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        @media (max-width: 900px) {
          .ai-form-grid-2, .ai-form-grid-4 { grid-template-columns: 1fr; }
          .ai-split-container { flex-direction: column; }
          .ai-divider-handle { display: none; }
        }
      `}} />

      <div className="ai-modal-overlay">
        <div className="ai-modal-shell" style={{
          width:  step === 3 ? 'min(98vw, 1360px)' : 'min(95vw, 560px)',
          height: step === 3 ? 'min(96vh, 860px)'  : 'auto',
          transition: 'width .35s ease, height .35s ease',
        }}>

          {/* ══ HEADER ════════════════════════════════════════ */}
          <div className="ai-header">
            <div className="ai-header-icon">🤖</div>
            <div>
              <p className="ai-header-title">Extracteur IA de Factures</p>
              <p className="ai-header-sub">Propulsé par Google Gemini — Analyse et création automatique</p>
            </div>
            <button className="ai-close-btn" onClick={onClose}>✕</button>
          </div>

          {/* ══ STEP INDICATOR ════════════════════════════════ */}
          <div className="ai-steps">
            {[
              { n: 1, label: 'Importer le document' },
              { n: 2, label: 'Analyse IA' },
              { n: 3, label: 'Validation & Création' },
            ].map((s, i) => (
              <React.Fragment key={s.n}>
                {i > 0 && <div className="ai-step-divider" />}
                <div className={`ai-step-item ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                  <div className="ai-step-circle">
                    {step > s.n ? '✓' : s.n}
                  </div>
                  {s.label}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* ══ STEP 1 — UPLOAD ═══════════════════════════════ */}
          {step === 1 && (
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Drop zone */}
              <div
                className={`ai-upload-zone${dragActive ? ' drag' : ''}`}
                onDragEnter={handleDrag} onDragOver={handleDrag}
                onDragLeave={handleDrag} onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange}
                  accept=".pdf,image/jpeg,image/png" style={{ display: 'none' }} id="ai-file-input" />
                <div className="ai-upload-zone-icon">
                  {dragActive ? '🎯' : '📎'}
                </div>
                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                  {dragActive ? 'Relâchez pour analyser' : 'Glissez votre facture ici'}
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ou <span style={{ color: '#6366f1', textDecoration: 'underline' }}>parcourez vos fichiers</span>
                  &nbsp;· PDF, JPG, PNG · Max 10 MB
                </p>
                {!selectedFile && (
                  <div style={{ marginTop: '18px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['📄 PDF', '🖼️ JPG', '🖼️ PNG'].map(f => (
                      <span key={f} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '3px 10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* File preview chip */}
              {selectedFile && (
                <div className="ai-file-chip" id="ai-file-preview">
                  <span className="ai-file-chip-icon">{isPdf ? '📄' : '🖼️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedFile.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type}
                    </p>
                  </div>
                  <button className="ai-btn ai-btn-danger" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={(e) => { e.stopPropagation(); resetUpload(); }}>
                    ✕ Retirer
                  </button>
                </div>
              )}

              {/* Action bar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
                <button className="ai-btn ai-btn-ghost" onClick={onClose}>Annuler</button>
                <button id="btn-analyze-invoice" className="ai-btn ai-btn-primary" onClick={handleAnalyze} disabled={!selectedFile}>
                  🔍 Analyser par l'IA
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 2 — LOADING ══════════════════════════════ */}
          {step === 2 && (
            <div style={{ padding: '60px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
              <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                <div className="ai-loading-ring" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                  {loadingSteps[loadingStep].icon}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {loadingSteps[loadingStep].text}
                </p>
                <div className="ai-loading-dots">
                  <span /><span /><span />
                </div>
              </div>

              <div style={{ width: '100%', maxWidth: '340px' }}>
                <div className="ai-progress-bar" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  {loadingSteps.map((s, i) => (
                    <span key={i} style={{ fontSize: '0.68rem', color: i <= loadingStep ? '#6366f1' : 'var(--text-muted)', fontWeight: i === loadingStep ? 700 : 400, transition: 'color .3s' }}>
                      {s.icon}
                    </span>
                  ))}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '300px', textAlign: 'center' }}>
                L'IA analyse votre document et extrait toutes les informations pertinentes automatiquement...
              </p>
            </div>
          )}

          {/* ══ STEP 3 — RESULTS ══════════════════════════════ */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

              {/* ── Split container ── */}
              <div className="ai-split-container" ref={containerRef}>

                {/* ── LEFT: PDF Viewer ── */}
                <div className="ai-pdf-panel" style={{ width: `${pdfPanelWidth}%` }}>
                  <div className="ai-pdf-header">
                    <span>👁️</span>
                    <span>Aperçu du document</span>
                    <span className="ai-pdf-badge">{isPdf ? 'PDF' : 'IMAGE'}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.68rem', opacity: .6 }}>
                      {selectedFile?.name}
                    </span>
                  </div>
                  <div className="ai-pdf-viewer">
                    {filePreviewUrl ? (
                      isPdf
                        ? <iframe src={filePreviewUrl} title="Aperçu de la facture" />
                        : <img src={filePreviewUrl} alt="Aperçu de la facture" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '16px' }} />
                    ) : (
                      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📄</div>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Aucun aperçu disponible</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Resize handle ── */}
                <div className="ai-divider-handle" onMouseDown={startResize} ref={resizerRef} />

                {/* ── RIGHT: Form ── */}
                <div className="ai-form-panel">
                  <div className="ai-form-scroll">

                    {/* Status banner */}
                    {apiError ? (
                      <div className="ai-banner error" style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.1rem' }}>❌</span>
                        <div>
                          <strong>Échec de l'extraction IA</strong>
                          <p style={{ margin: '3px 0 0', opacity: .85 }}>{apiError}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="ai-banner success" style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.1rem' }}>✅</span>
                        <div>
                          <strong>Données extraites avec succès</strong>
                          <p style={{ margin: '3px 0 0', opacity: .85 }}>Vérifiez et corrigez si nécessaire avant de valider.</p>
                        </div>
                      </div>
                    )}

                    {/* Error actions */}
                    {apiError && !isManualInput && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <button className="ai-btn ai-btn-ghost" onClick={() => setStep(1)}>🔄 Réessayer</button>
                        <button className="ai-btn ai-btn-primary" onClick={() => setIsManualInput(true)}>✏️ Saisir manuellement</button>
                      </div>
                    )}

                    {(!apiError || isManualInput) && (
                      <>
                        {/* Confidence + Supplier */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div id="ai-confidence-badge" className="ai-confidence" style={{ background: conf.bg, color: conf.color, borderColor: conf.border }}>
                            {conf.label}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end', minWidth: '220px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>🏭 Associer au fournisseur :</span>
                            <select
                              className="ai-select"
                              value={selectedSupplierId}
                              onChange={e => setSelectedSupplierId(e.target.value)}
                              style={{ maxWidth: '240px' }}
                            >
                              <option value="">-- Auto-créer / Nouveau --</option>
                              {suppliers.map(s => (
                                <option key={s.ID} value={s.ID}>
                                  {s.companyName}{s.nif ? ` (NIF: ${s.nif})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* ── Section: Invoice info ── */}
                        <div className="ai-section-block">
                          <div className="ai-section-header" style={{ color: '#6366f1' }}>
                            <span className="ai-section-dot" style={{ background: '#6366f1' }} />
                            🧾 Informations de la facture
                          </div>
                          <div className="ai-form-grid-2">
                            <div className="ai-input-group">
                              <label className="ai-label">N° Facture *</label>
                              <input id="ext-numero" className="ai-input" value={extNumero} onChange={e => setExtNumero(e.target.value)} placeholder="Ex: FAC-2024-001" />
                            </div>
                            <div className="ai-input-group">
                              <label className="ai-label">Date (JJ/MM/AAAA)</label>
                              <input id="ext-date" className="ai-input" value={extDate} onChange={e => setExtDate(e.target.value)} placeholder="Ex: 15/06/2024" />
                            </div>
                            <div className="ai-input-group">
                              <label className="ai-label">Réf. Bon de Commande</label>
                              <input id="ext-bc" className="ai-input" value={extBc} onChange={e => setExtBc(e.target.value)} placeholder="Ex: PO-00001" />
                            </div>
                            <div className="ai-input-group">
                              <label className="ai-label">Mode de paiement</label>
                              <input id="ext-mode-paiement" className="ai-input" value={extModePaiement} onChange={e => setExtModePaiement(e.target.value)} placeholder="Ex: VIREMENT" />
                            </div>
                          </div>
                        </div>

                        {/* ── Section: Supplier info ── */}
                        <div className="ai-section-block">
                          <div className="ai-section-header" style={{ color: '#f59e0b' }}>
                            <span className="ai-section-dot" style={{ background: '#f59e0b' }} />
                            🏭 Informations fournisseur
                          </div>
                          <div className="ai-input-group" style={{ marginBottom: '10px' }}>
                            <label className="ai-label">Raison sociale / Nom</label>
                            <input id="ext-fournisseur" className="ai-input" value={extFournisseur} onChange={e => setExtFournisseur(e.target.value)} placeholder="Nom de l'entreprise" />
                          </div>
                          <div className="ai-form-grid-3">
                            <div className="ai-input-group">
                              <label className="ai-label">NIF</label>
                              <input id="ext-nif" className="ai-input" value={extNif} onChange={e => setExtNif(e.target.value)} placeholder="15 chiffres" />
                            </div>
                            <div className="ai-input-group">
                              <label className="ai-label">RC</label>
                              <input id="ext-rc" className="ai-input" value={extRc} onChange={e => setExtRc(e.target.value)} placeholder="Registre du commerce" />
                            </div>
                            <div className="ai-input-group">
                              <label className="ai-label">RIB</label>
                              <input id="ext-rib" className="ai-input" value={extRib} onChange={e => setExtRib(e.target.value)} placeholder="24 chiffres" />
                            </div>
                          </div>
                          <div className="ai-input-group">
                            <label className="ai-label">Adresse</label>
                            <input id="ext-adresse" className="ai-input" value={extAdresse} onChange={e => setExtAdresse(e.target.value)} placeholder="Adresse complète" />
                          </div>
                        </div>

                        {/* ── Section: Amounts ── */}
                        <div className="ai-section-block">
                          <div className="ai-section-header" style={{ color: '#10b981' }}>
                            <span className="ai-section-dot" style={{ background: '#10b981' }} />
                            💰 Montants
                          </div>
                          <div className="ai-form-grid-4">
                            <div className="ai-amount-box">
                              <div className="ai-amount-label">Montant HT</div>
                              <input id="ext-ht" className="ai-table-input" type="number" value={extHt}
                                onChange={e => setExtHt(parseFloat(e.target.value) || 0)}
                                style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', width: '100%', marginTop: '4px', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'monospace' }} />
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>DA</div>
                            </div>
                            <div className="ai-amount-box">
                              <div className="ai-amount-label">TVA (%)</div>
                              <input id="ext-tva-percent" className="ai-table-input" type="number" value={extTvaPercent}
                                onChange={e => setExtTvaPercent(parseFloat(e.target.value) || 0)}
                                style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b', width: '100%', marginTop: '4px', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'monospace' }} />
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>%</div>
                            </div>
                            <div className="ai-amount-box">
                              <div className="ai-amount-label">TVA (DA)</div>
                              <div className="ai-amount-value" style={{ color: '#f59e0b' }}>{fmt(extTva)}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>calculé</div>
                            </div>
                            <div className="ai-amount-box ttc">
                              <div className="ai-amount-label">Total TTC</div>
                              <div className="ai-amount-value">{fmt(extTtc)}</div>
                              <div style={{ fontSize: '0.68rem', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>DA</div>
                            </div>
                          </div>
                        </div>

                        {/* ── Section: Lines ── */}
                        <div className="ai-section-block">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div className="ai-section-header" style={{ color: '#8b5cf6', margin: 0, border: 'none', paddingBottom: 0 }}>
                              <span className="ai-section-dot" style={{ background: '#8b5cf6' }} />
                              📋 Lignes de facture
                              <span style={{ marginLeft: '8px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
                                {extLignes.length}
                              </span>
                            </div>
                            <button className="ai-btn ai-btn-ghost" onClick={addLine} style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                              + Ajouter
                            </button>
                          </div>
                          <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
                            <table id="ext-lignes-table" className="ai-lines-table">
                              <thead>
                                <tr>
                                  <th>Description</th>
                                  <th style={{ width: '80px', textAlign: 'center' }}>Qté</th>
                                  <th style={{ width: '120px', textAlign: 'right' }}>P.U. HT (DA)</th>
                                  <th style={{ width: '120px', textAlign: 'right' }}>Total HT (DA)</th>
                                  <th style={{ width: '40px' }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {extLignes.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>
                                      Aucune ligne — cliquez "+ Ajouter" pour commencer
                                    </td>
                                  </tr>
                                ) : extLignes.map((line, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <input className="ai-table-input" type="text" value={line.description}
                                        onChange={e => handleLineChange(idx, 'description', e.target.value)} />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <input className="ai-table-input" type="number" value={line.quantite} min="0"
                                        onChange={e => handleLineChange(idx, 'quantite', parseFloat(e.target.value) || 0)}
                                        style={{ textAlign: 'center', width: '60px', fontFamily: 'monospace' }} />
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <input className="ai-table-input" type="number" value={line.prixUnitaireHT} min="0" step="0.01"
                                        onChange={e => handleLineChange(idx, 'prixUnitaireHT', parseFloat(e.target.value) || 0)}
                                        style={{ textAlign: 'right', width: '100px', fontFamily: 'monospace' }} />
                                    </td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#10b981', fontSize: '0.85rem' }}>
                                      {fmt(line.totalHT)}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <button onClick={() => removeLine(idx)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem', padding: '2px 4px', borderRadius: '4px', transition: 'background .2s' }}
                                        onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.15)'}
                                        onMouseLeave={e => e.target.style.background = 'none'}
                                        title="Supprimer">🗑️</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              {extLignes.length > 0 && (
                                <tfoot>
                                  <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                      TOTAL HT
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#10b981', fontSize: '0.92rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                      {fmt(extHt)} DA
                                    </td>
                                    <td style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}></td>
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Footer actions ── */}
                  <div className="ai-footer">
                    <button className="ai-btn ai-btn-ghost" onClick={resetForm}>
                      🔄 Nouveau fichier
                    </button>
                    {(!apiError || isManualInput) && (
                      <button id="btn-confirm-invoice" className="ai-btn ai-btn-success" onClick={handleConfirm}>
                        ✅ Confirmer et créer la facture
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
