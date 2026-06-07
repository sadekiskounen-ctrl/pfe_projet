import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Overview from './components/Overview.jsx';
import Clients from './components/Clients.jsx';
import Fournisseurs from './components/Fournisseurs.jsx';
import Registrations from './components/Registrations.jsx';
import Commandes from './components/Commandes.jsx';
import Factures from './components/Factures.jsx';
import Catalogue from './components/Catalogue.jsx';
import Devis from './components/Devis.jsx';
import RFQs from './components/RFQs.jsx';
import Settings from './components/Settings.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import DialogSystem from './components/DialogSystem.jsx';

const adminHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'Basic ' + btoa('admin:admin')
};

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme-dark') === 'true');
  const [searchVal, setSearchVal] = useState('');

  // Date filters for stats
  const [revenueYear, setRevenueYear] = useState(() => String(new Date().getFullYear()));
  const [revenueMonth, setRevenueMonth] = useState(() => String(new Date().getMonth() + 1));

  // Global counts for sidebar badges
  const [counts, setCounts] = useState({
    registrations: 0,
    commandes: 0,
    factures: 0,
    catalogue: 0,
    devis: 0,
    rfqs: 0
  });

  // OData entities lists
  const [stats, setStats] = useState({
    totalRevenue: 0,
    encoursClients: 0,
    activeClients: 0,
    suppliersCount: 0,
    dailyRevenue: [],
    topClients: [],
    topSuppliers: [],
    topProducts: [],
    alerts: []
  });
  const [partners, setPartners] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [factures, setFactures] = useState([]);
  const [products, setProducts] = useState([]);
  const [devis, setDevis] = useState([]);
  const [rfqs, setRfqs] = useState([]);

  // Active view filters
  const [clientFilterType, setClientFilterType] = useState(''); // '', 'CLIENT_B2B', 'CLIENT_B2C'
  const [clientWilaya, setClientWilaya] = useState('');
  const [clientSector, setClientSector] = useState('');
  
  const [supplierNotation, setSupplierNotation] = useState('');
  const [supplierWilaya, setSupplierWilaya] = useState('');
  const [supplierSector, setSupplierSector] = useState('');

  const [cmdFilterType, setCmdFilterType] = useState('');
  const [facFilterType, setFacFilterType] = useState('');
  const [catTypeFilter, setCatTypeFilter] = useState('');
  const [catStatusFilter, setCatStatusFilter] = useState('');
  const [devisFilterStatus, setDevisFilterStatus] = useState('');

  // Unified notifications dropdown items
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastRFQResponseCount, setLastRFQResponseCount] = useState(-1);

  // Lists of values for dropdown filters
  const [clientWilayasList, setClientWilayasList] = useState([]);
  const [supplierWilayasList, setSupplierWilayasList] = useState([]);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Custom dialog state
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    inputVal: '',
    paymentAmount: 0,
    paymentInvoiceNumber: '',
    resolveFn: null,
    rejectFn: null
  });

  // Details Modal (unified CRM/SRM documents view)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activePartnerDetails, setActivePartnerDetails] = useState(null);
  const [partnerDevis, setPartnerDevis] = useState([]);
  const [partnerCommandes, setPartnerCommandes] = useState([]);
  const [partnerRfqResponses, setPartnerRfqResponses] = useState([]);
  const [partnerPOs, setPartnerPOs] = useState([]);
  const [loadingPartnerDocs, setLoadingPartnerDocs] = useState(false);

  // Exam registration Modal
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [activeExamItem, setActiveExamItem] = useState(null);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // PDF Viewer Modal
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState('');

  // Action status indicators
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingDevis, setSavingDevis] = useState(false);
  const [savingRFQ, setSavingRFQ] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [submittingPO, setSubmittingPO] = useState(false);
  const [sendingOrderToClient, setSendingOrderToClient] = useState(false);
  const [submittingGR, setSubmittingGR] = useState(false);

  // Goods Receipt Modal
  const [grModalOpen, setGrModalOpen] = useState(false);
  const [activeGrDetails, setActiveGrDetails] = useState(null);

  // Discrepancy Approval Modal
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [activeApproveDetails, setActiveApproveDetails] = useState(null);
  const [approveItems, setApproveItems] = useState([]);
  const [submittingApprove, setSubmittingApprove] = useState(false);

  // ----------------------------------------------------
  // TOAST SYSTEM IMPLEMENTATION
  // ----------------------------------------------------
  const showToast = useCallback((type, title, message, duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Bind to window.Toast so external code or interceptors can use it
  useEffect(() => {
    window.Toast = {
      success: (title, msg) => showToast('success', title, msg),
      error: (title, msg) => showToast('error', title, msg),
      info: (title, msg) => showToast('info', title, msg),
      show: (type, title, msg, dur) => showToast(type, title, msg, dur)
    };
  }, [showToast]);

  // ----------------------------------------------------
  // DIALOG SYSTEM IMPLEMENTATION
  // ----------------------------------------------------
  const showCustomDialog = (options) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        type: options.type || 'alert',
        title: options.title || 'Notification',
        message: options.message || '',
        inputVal: options.inputVal || '',
        paymentAmount: options.paymentAmount || 0,
        paymentInvoiceNumber: options.paymentInvoiceNumber || '',
        resolveFn: resolve,
        rejectFn: () => resolve(null)
      });
    });
  };

  const handleDialogConfirm = (value) => {
    const resolve = dialogState.resolveFn;
    setDialogState(prev => ({ ...prev, isOpen: false }));
    if (resolve) resolve(value);
  };

  const handleDialogCancel = () => {
    const resolve = dialogState.resolveFn;
    setDialogState(prev => ({ ...prev, isOpen: false }));
    if (resolve) resolve(null);
  };

  // Bind to window.Dialog so external code can use it
  useEffect(() => {
    window.Dialog = {
      alert: (msg) => showCustomDialog({ type: 'alert', title: 'Notification', message: msg }),
      confirm: (msg) => showCustomDialog({ type: 'confirm', title: 'Confirmation', message: msg }),
      prompt: (msg) => showCustomDialog({ type: 'prompt', title: 'Saisie requise', message: msg }),
      selectPaymentMethod: (invoiceNumber, amount) => showCustomDialog({
        type: 'payment',
        paymentInvoiceNumber: invoiceNumber,
        paymentAmount: amount
      })
    };
  }, []);

  // ----------------------------------------------------
  // THEME MANAGEMENT (Morning vs Evening Horizon)
  // ----------------------------------------------------
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme-dark', 'true');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme-dark', 'false');
    }
  }, [darkMode]);

  // ----------------------------------------------------
  // ODATA DATA FETCHERS
  // ----------------------------------------------------

  // 1. Load general statistics for Overview
  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, supRes, clientTopRes, supTopRes, prodTopRes] = await Promise.all([
        fetch(`/odata/v4/analytics/getGlobalStats(month='${revenueMonth}',year='${revenueYear}')`),
        fetch('/odata/v4/admin/Fournisseurs?$select=ID', { headers: adminHeaders }),
        fetch('/odata/v4/analytics/getTopClients()'),
        fetch('/odata/v4/analytics/getTopSuppliers()'),
        fetch('/odata/v4/analytics/getTopProducts()')
      ]);

      const sRaw = await statsRes.json();
      const s = sRaw.value || sRaw;

      const supData = await supRes.json().catch(() => ({ value: [] }));
      const suppliersCount = (supData.value || []).length;

      const topC = await clientTopRes.json().catch(() => ({ value: [] }));
      const topS = await supTopRes.json().catch(() => ({ value: [] }));
      const topP = await prodTopRes.json().catch(() => ({ value: [] }));

      // Fetch daily revenue chart data
      const chartRes = await fetch(`/odata/v4/analytics/getDailyRevenue(month='${revenueMonth}',year='${revenueYear}')`);
      const chartData = await chartRes.json().catch(() => ({ value: [] }));

      // Fetch dynamic alerts list
      let activeAlerts = [];
      
      // A. KYC Pending alerts
      try {
        const regRes = await fetch("/odata/v4/registration/RegistrationRequests?$filter=status eq 'PENDING'&$select=ID,companyName,address", { headers: adminHeaders });
        const regData = await regRes.json();
        (regData.value || []).forEach(r => {
          activeAlerts.push({
            type: 'registration',
            id: r.ID,
            tab: 'registrations',
            title: 'Nouvelle inscription en attente KYC',
            message: `L'entreprise <em>${r.companyName} (${r.address || 'Algérie'})</em> demande validation.`,
            color: 'var(--accent)'
          });
        });
      } catch (e) { console.error(e); }

      // B. Dispute factures alerts
      try {
        const res = await fetch("/odata/v4/admin/AllFacturesFournisseur?$filter=matchStatus eq 'DISCREPANCY'&$expand=fournisseur($select=companyName)&$select=ID,invoiceNumber", { headers: adminHeaders });
        const data = await res.json();
        (data.value || []).forEach(d => {
          const supName = d.fournisseur ? d.fournisseur.companyName : 'Fournisseur';
          activeAlerts.push({
            type: 'invoice',
            id: d.ID,
            tab: 'factures',
            title: 'Écart de facturation (Litige)',
            message: `Facture N° <strong>${d.invoiceNumber || '—'}</strong> (Fournisseur : <em>${supName}</em>) en écart.`,
            color: '#ef4444'
          });
        });
      } catch (e) { console.error(e); }

      // C. Stock critique alerts
      try {
        const prodRes = await fetch("/odata/v4/admin/Produits?$filter=stock lt minStock&$select=ID,code,name,stock,minStock", { headers: adminHeaders });
        const prodData = await prodRes.json();
        (prodData.value || []).forEach(p => {
          activeAlerts.push({
            type: 'product',
            id: p.ID,
            tab: 'catalogue',
            title: 'Stock Critique / Faible',
            message: `Produit : <em>${p.name} (SKU: ${p.code || '—'})</em>. Stock restant : <strong style="color:var(--accent-orange);">${p.stock ?? 0}</strong> (Min: ${p.minStock ?? 0}).`,
            color: 'var(--accent-orange)'
          });
        });
      } catch (e) { console.error(e); }

      setStats({
        totalRevenue: s.totalRevenue || 0,
        encoursClients: s.encoursClients || 0,
        activeClients: s.activeClients || 0,
        suppliersCount: suppliersCount,
        dailyRevenue: chartData.value || [],
        topClients: topC.value || [],
        topSuppliers: topS.value || [],
        topProducts: topP.value || [],
        alerts: activeAlerts
      });
    } catch (e) {
      console.error('Stats OData fetch error', e);
    }
  }, [revenueMonth, revenueYear]);

  // Sector helpers
  const getSectorODataFilter = (sector) => {
    if (!sector) return "";
    if (sector === 'Informatique & Tech') {
      return `(sector eq 'Informatique & Tech' or contains(tolower(sector),'informatique') or contains(tolower(sector),'tech') or contains(tolower(sector),'service') or contains(tolower(sector),'logiciel'))`;
    }
    if (sector === 'Industrie & Manufacture') {
      return `(sector eq 'Industrie & Manufacture' or contains(tolower(sector),'industrie') or contains(tolower(sector),'manufacture') or contains(tolower(sector),'fabrication'))`;
    }
    if (sector === 'BTP & Construction') {
      return `(sector eq 'BTP & Construction' or contains(tolower(sector),'btp') or contains(tolower(sector),'construction') or contains(tolower(sector),'batiment'))`;
    }
    if (sector === 'Commerce & Distribution') {
      return `(sector eq 'Commerce & Distribution' or contains(tolower(sector),'commerce') or contains(tolower(sector),'distribution'))`;
    }
    if (sector === 'Autre') {
      return `(sector ne null and not (contains(tolower(sector),'informatique') or contains(tolower(sector),'tech') or contains(tolower(sector),'service') or contains(tolower(sector),'logiciel') or contains(tolower(sector),'industrie') or contains(tolower(sector),'manufacture') or contains(tolower(sector),'fabrication') or contains(tolower(sector),'btp') or contains(tolower(sector),'construction') or contains(tolower(sector),'batiment') or contains(tolower(sector),'commerce') or contains(tolower(sector),'distribution')))`;
    }
    return `sector eq '${sector.replace(/'/g, "''")}'`;
  };

  // 2. Load Clients (BusinessPartners client types)
  const fetchPartners = useCallback(async (search = '') => {
    try {
      let url = '/odata/v4/admin/BusinessPartners';
      const filters = [];
      
      if (clientFilterType) {
        filters.push(`bpType eq '${clientFilterType}'`);
      } else {
        filters.push(`(bpType eq 'CLIENT_B2B' or bpType eq 'CLIENT_B2C')`);
      }

      if (search) filters.push(`(startswith(tolower(displayName),'${search.toLowerCase()}') or startswith(tolower(rc),'${search.toLowerCase()}') or startswith(tolower(nif),'${search.toLowerCase()}'))`);
      if (clientWilaya) filters.push(`startswith(tolower(wilaya),'${clientWilaya.toLowerCase()}')`);
      if (clientSector) {
        filters.push(getSectorODataFilter(clientSector));
      }

      if (filters.length > 0) url += `?$filter=${filters.join(' and ')}`;

      const res = await fetch(url);
      const data = await res.json();
      const list = data.value || [];
      setPartners(list);

      // Populate unique wilayas list
      const uniqueW = [...new Set(list.map(p => p.wilaya).filter(Boolean))];
      setClientWilayasList(uniqueW);
    } catch (e) {
      console.error('Partners OData fetch error', e);
    }
  }, [clientFilterType, clientWilaya, clientSector]);

  // 3. Load Fournisseurs
  const fetchSuppliers = useCallback(async (search = '') => {
    try {
      let url = '/odata/v4/admin/BusinessPartners?$filter=bpType eq \'FOURNISSEUR\'';
      if (search) url += ` and (startswith(tolower(displayName),'${search.toLowerCase()}') or startswith(tolower(rc),'${search.toLowerCase()}') or startswith(tolower(nif),'${search.toLowerCase()}'))`;
      if (supplierWilaya) url += ` and startswith(tolower(wilaya),'${supplierWilaya.toLowerCase()}')`;
      if (supplierNotation) url += ` and rating eq ${supplierNotation}`;
      if (supplierSector) {
        url += ` and ${getSectorODataFilter(supplierSector)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      const list = data.value || [];
      setSuppliers(list);

      // Populate unique wilayas list
      const uniqueW = [...new Set(list.map(p => p.wilaya).filter(Boolean))];
      setSupplierWilayasList(uniqueW);
    } catch (e) {
      console.error('Suppliers OData fetch error', e);
    }
  }, [supplierNotation, supplierWilaya, supplierSector]);

  // 4. Load registrations (KYC)
  const fetchRegistrations = useCallback(async (search = '') => {
    try {
      let url = '/odata/v4/registration/RegistrationRequests';
      if (search) url += `?$filter=startswith(tolower(companyName),'${search.toLowerCase()}')`;
      const res = await fetch(url);
      const data = await res.json();
      const list = data.value || [];
      const pending = list.filter(r => r.status === 'PENDING');
      setRegistrations(pending);
    } catch (e) {
      console.error('Registrations KYC fetch error', e);
    }
  }, []);

  // 5. Load command CRM & SRM
  const fetchCommandes = useCallback(async (silent = false) => {
    try {
      let crmList = [];
      let srmList = [];

      if (cmdFilterType === '' || cmdFilterType === 'B2B' || cmdFilterType === 'B2C') {
        let url = '/odata/v4/crm/Commandes?$orderby=createdAt desc&$top=200';
        if (cmdFilterType === 'B2B') url += '&$filter=clientB2B_ID ne null';
        if (cmdFilterType === 'B2C') url += '&$filter=clientB2C_ID ne null';
        try {
          const res = await fetch(url, { headers: adminHeaders });
          const data = await res.json();
          crmList = (data.value || []).map(cmd => ({ ...cmd, _type: 'CRM' }));
        } catch (e) { console.error(e); }
      }

      if (cmdFilterType === '' || cmdFilterType === 'SRM') {
        try {
          const res = await fetch('/odata/v4/admin/AllBonsCommande?$orderby=createdAt desc&$expand=fournisseur', { headers: adminHeaders });
          const data = await res.json();
          srmList = (data.value || []).map(po => ({ ...po, _type: 'SRM' }));
        } catch (e) { console.error(e); }
      }

      const merged = [...crmList, ...srmList].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date || 0).getTime();
        const timeB = new Date(b.createdAt || b.date || 0).getTime();
        return timeB - timeA;
      });

      setCommandes(merged);
    } catch (e) {
      console.error('Commandes OData fetch error', e);
    }
  }, [cmdFilterType]);

  // 6. Load Factures
  const fetchFactures = useCallback(async (silent = false) => {
    try {
      let clientFactures = [];
      let fournisseurFactures = [];

      if (facFilterType !== 'FOURNISSEUR') {
        const res = await fetch('/odata/v4/crm/Factures?$orderby=createdAt desc&$top=200', { headers: adminHeaders });
        const data = await res.json();
        clientFactures = (data.value || []).map(f => ({ ...f, _type: 'CLIENT' }));
      }

      if (facFilterType !== 'CLIENT') {
        try {
          const res = await fetch('/odata/v4/srm/FacturesFournisseur?$orderby=createdAt desc&$top=200', { headers: adminHeaders });
          const data = await res.json();
          fournisseurFactures = (data.value || []).map(f => ({ ...f, _type: 'FOURNISSEUR' }));
        } catch(e) { console.error(e); }
      }

      const merged = [...clientFactures, ...fournisseurFactures].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );

      setFactures(merged);
    } catch (e) {
      console.error('Factures OData fetch error', e);
    }
  }, [facFilterType]);

  // 7. Load Catalogue
  const fetchCatalogue = useCallback(async () => {
    try {
      let filters = [];
      if (catTypeFilter) filters.push(`type eq '${catTypeFilter}'`);
      if (catStatusFilter !== '') filters.push(`isActive eq ${catStatusFilter}`);
      
      let url = '/odata/v4/admin/Produits?$orderby=name';
      if (filters.length) url += '&$filter=' + filters.join(' and ');

      const res = await fetch(url, { headers: adminHeaders });
      const data = await res.json();
      setProducts(data.value || []);
    } catch (e) {
      console.error('Catalogue products fetch error', e);
    }
  }, [catTypeFilter, catStatusFilter]);

  // 8. Load Devis
  const fetchDevis = useCallback(async () => {
    try {
      let url = "/odata/v4/admin/AllDevis?$expand=clientB2B,clientB2C&$orderby=createdAt desc";
      if (devisFilterStatus) url += `&$filter=status eq '${devisFilterStatus}'`;

      const res = await fetch(url);
      const data = await res.json();
      setDevis(data.value || []);
    } catch (e) {
      console.error('Devis OData fetch error', e);
    }
  }, [devisFilterStatus]);

  // 9. Load RFQs
  const fetchRfqs = useCallback(async () => {
    try {
      const res = await fetch('/odata/v4/srm/RFQs?$expand=fournisseur,items,responses', {
        headers: adminHeaders
      });
      const data = await res.json();
      setRfqs(data.value || []);
    } catch (e) {
      console.error('RFQs SRM fetch error', e);
    }
  }, []);

  // 10. Load Unified Notifications & alert counts (bell icon)
  const fetchNotifications = useCallback(async () => {
    try {
      // General notifications
      const notiRes = await fetch('/odata/v4/admin/Notifications?$filter=isRead eq false&$orderby=createdAt desc&$top=20', { headers: adminHeaders });
      const notiData = await notiRes.json();
      const generalNotifs = notiData.value || [];

      // Pending registrations requests
      const regRes = await fetch('/odata/v4/registration/RegistrationRequests?$filter=status eq \'PENDING\'', { headers: adminHeaders });
      const regData = await regRes.json();
      const pendingRegs = regData.value || [];

      setNotifications([...pendingRegs, ...generalNotifs]);
      setUnreadCount(generalNotifs.length + pendingRegs.length);

      // Check for incoming RFQ responses quietly to trigger toast alert
      const respRes = await fetch('/odata/v4/srm/RFQResponses?$filter=selected eq false&$select=ID', { headers: adminHeaders }).catch(() => ({ json: async () => ({ value: [] }) }));
      const respData = await respRes.json().catch(() => ({ value: [] }));
      const newResponsesCount = (respData.value || []).length;
      if (newResponsesCount > lastRFQResponseCount && lastRFQResponseCount >= 0) {
        showToast('info', '📩 Nouvelle offre reçue', `${newResponsesCount} offre(s) fournisseur en attente.`, 5000);
      }
      setLastRFQResponseCount(newResponsesCount);

      // Extract alert counts for sidebar badges
      const rfqRes = await fetch('/odata/v4/srm/RFQs?$filter=status eq \'OPEN\'&$select=ID', { headers: adminHeaders }).catch(() => ({ json: async () => ({ value: [] }) }));
      const rfqData = await rfqRes.json().catch(() => ({ value: [] }));

      const crmCmdRes = await fetch('/odata/v4/crm/Commandes?$filter=status eq \'PENDING\' or status eq \'CONFIRMED\'&$select=ID,status', { headers: adminHeaders }).catch(() => ({ json: async () => ({ value: [] }) }));
      const crmCmds = (await crmCmdRes.json().catch(() => ({ value: [] }))).value || [];
      const srmCmdRes = await fetch('/odata/v4/admin/AllBonsCommande?$filter=status eq \'CONFIRMED\'&$select=ID,status', { headers: adminHeaders }).catch(() => ({ json: async () => ({ value: [] }) }));
      const srmCmds = (await srmCmdRes.json().catch(() => ({ value: [] }))).value || [];

      const viewed = JSON.parse(localStorage.getItem('viewedConfirmedOrders') || '[]');
      const pendingCashCount = crmCmds.filter(c => c.status === 'PENDING').length;
      const unviewedCrmConfirmed = crmCmds.filter(c => c.status === 'CONFIRMED' && !viewed.includes(c.ID)).length;
      const unviewedSrmConfirmed = srmCmds.filter(c => c.status === 'CONFIRMED' && !viewed.includes(c.ID)).length;

      const crmFacRes = await fetch('/odata/v4/crm/Factures?$filter=status ne \'PAID\'&$select=ID,status', { headers: adminHeaders }).catch(() => ({ json: async () => ({ value: [] }) }));
      const crmFacs = (await crmFacRes.json().catch(() => ({ value: [] }))).value || [];
      const srmFacRes = await fetch('/odata/v4/srm/FacturesFournisseur?$filter=status ne \'PAID\'&$select=ID,status', { headers: adminHeaders }).catch(() => ({ json: async () => ({ value: [] }) }));
      const srmFacs = (await srmFacRes.json().catch(() => ({ value: [] }))).value || [];

      const viewedF = JSON.parse(localStorage.getItem('viewedConfirmedInvoices') || '[]');
      const unpaidCrmCount = crmFacs.filter(f => !viewedF.includes(f.ID)).length;
      const unpaidSrmCount = srmFacs.filter(f => !viewedF.includes(f.ID)).length;

      const devisRes = await fetch('/odata/v4/admin/AllDevis?$filter=status eq \'PENDING\'&$select=ID', { headers: adminHeaders }).catch(() => ({ json: async () => ({ value: [] }) }));
      const devisData = await devisRes.json().catch(() => ({ value: [] }));

      const prodRes = await fetch('/odata/v4/admin/Produits?$select=stock,minStock', { headers: adminHeaders }).catch(() => ({ json: async () => ({ value: [] }) }));
      const prodData = await prodRes.json().catch(() => ({ value: [] }));
      const lowStockCount = (prodData.value || []).filter(p => p.stock !== null && p.minStock !== null && p.stock < p.minStock).length;

      setCounts({
        registrations: pendingRegs.length,
        commandes: pendingCashCount + unviewedCrmConfirmed + unviewedSrmConfirmed,
        factures: unpaidCrmCount + unpaidSrmCount,
        catalogue: lowStockCount,
        devis: (devisData.value || []).length,
        rfqs: (rfqData.value || []).length
      });
    } catch (e) {
      console.error('Unified notifications poll error', e);
    }
  }, [lastRFQResponseCount, showToast]);

  // ----------------------------------------------------
  // USE EFFECTS / POLLING REGISTRATION
  // ----------------------------------------------------
  useEffect(() => {
    // Initial fetch
    fetchStats();
    fetchPartners();
    fetchSuppliers();
    fetchRegistrations();
    fetchCommandes();
    fetchFactures();
    fetchCatalogue();
    fetchDevis();
    fetchRfqs();
    fetchNotifications();

    // 5-second interval polling for real time sync
    const pollInterval = setInterval(() => {
      fetchNotifications();
      fetchStats();

      // Silent tab updates
      if (activeTab === 'partners') fetchPartners();
      if (activeTab === 'suppliers') fetchSuppliers();
      if (activeTab === 'registrations') fetchRegistrations();
      if (activeTab === 'commandes') fetchCommandes(true);
      if (activeTab === 'factures') fetchFactures(true);
      if (activeTab === 'devis') fetchDevis();
      if (activeTab === 'rfqs') fetchRfqs();
      if (activeTab === 'catalogue') fetchCatalogue();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [
    activeTab,
    fetchStats,
    fetchPartners,
    fetchSuppliers,
    fetchRegistrations,
    fetchCommandes,
    fetchFactures,
    fetchCatalogue,
    fetchDevis,
    fetchRfqs,
    fetchNotifications
  ]);

  // ----------------------------------------------------
  // GENERAL INTERACTIVE ACTIONS (ODATA POST/PATCH)
  // ----------------------------------------------------

  // Header notifications mark read
  const handleViewGeneralNotif = async (notif) => {
    const confirm = await window.Dialog.confirm(`${notif.title}\n\n${notif.message}\n\nMarquer comme lue ?`);
    if (confirm) {
      try {
        const res = await fetch(`/odata/v4/admin/Notifications(${notif.ID})`, {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify({ isRead: true })
        });
        if (res.ok) {
          fetchNotifications();
          showToast('success', 'Notification lue', 'La notification a été archivée.');
          
          if (notif.title.toLowerCase().includes('accepté') || notif.message.toLowerCase().includes('réception')) {
            setActiveTab('commandes');
            setCmdFilterType('SRM');
          }
        }
      } catch (e) {
        showToast('error', 'Erreur', 'Impossible de marquer la notification comme lue.');
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const generalNotifs = notifications.filter(n => !(n.type && n.companyName));
    if (generalNotifs.length === 0) return;
    try {
      await Promise.all(
        generalNotifs.map(n =>
          fetch(`/odata/v4/admin/Notifications(${n.ID})`, {
            method: 'PATCH',
            headers: adminHeaders,
            body: JSON.stringify({ isRead: true })
          })
        )
      );
      fetchNotifications();
      showToast('success', 'Notifications lues', 'Toutes les notifications ont été marquées comme lues.');
    } catch (e) {
      showToast('error', 'Erreur', 'Impossible de marquer les notifications comme lues.');
    }
  };

  // Resolve Alert panel redirect & glow highlight
  const handleResolveAlert = (tab, type, targetId) => {
    setActiveTab(tab);
    setTimeout(() => {
      const elId = `${type === 'product' ? 'product' : (type === 'registration' ? 'registration' : 'invoice')}-row-${targetId}`;
      const targetRow = document.getElementById(elId);
      if (targetRow) {
        document.querySelectorAll('.highlighted-problem-row').forEach(row => {
          row.classList.remove('highlighted-problem-row');
        });
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetRow.classList.add('highlighted-problem-row');
      }
    }, 300);
  };

  // Partners activate / block / delete
  const handlePartnerBlockToggle = async (id, name, currentStatus) => {
    const isActivating = currentStatus !== 'ACTIVE';
    if (isActivating) {
      const confirm = await window.Dialog.confirm(`Activer le compte de "${name}" ?`);
      if (confirm) {
        try {
          const res = await fetch('/odata/v4/admin/activateBusinessPartner', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({ bpId: id })
          });
          if (res.ok) {
            showToast('success', 'Compte activé', `Le partenaire "${name}" a été activé.`);
            fetchPartners();
            fetchSuppliers();
            fetchStats();
          }
        } catch (e) { showToast('error', 'Erreur', "Erreur lors de l'activation."); }
      }
    } else {
      const reason = await window.Dialog.prompt(`Bloquer le compte de "${name}" ?\nMotif du blocage (Obligatoire) :`);
      if (!reason) return;
      try {
        const res = await fetch('/odata/v4/admin/blockBusinessPartner', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ bpId: id, reason: reason })
        });
        if (res.ok) {
          showToast('success', 'Compte bloqué', `Le partenaire "${name}" a été bloqué.`);
          fetchPartners();
          fetchSuppliers();
          fetchStats();
        }
      } catch (e) { showToast('error', 'Erreur', "Erreur lors du blocage."); }
    }
  };

  const handlePartnerDelete = async (id, name) => {
    const confirm = await window.Dialog.confirm(`Voulez-vous supprimer définitivement "${name}" ?`);
    if (confirm) {
      try {
        const res = await fetch(`/odata/v4/admin/BusinessPartners(${id})`, { method: 'DELETE' });
        if (res.ok) {
          showToast('success', 'Partenaire supprimé', `"${name}" a été supprimé.`);
          fetchPartners();
          fetchSuppliers();
          fetchStats();
        }
      } catch (e) { showToast('error', 'Erreur', 'Impossible de supprimer.'); }
    }
  };

  // Suppliers rating stars
  const handleRateSupplier = async (id, rating) => {
    try {
      const res = await fetch(`/odata/v4/admin/BusinessPartners(${id})`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ rating })
      });
      if (res.ok) {
        fetchSuppliers();
      } else {
        showToast('error', 'Erreur', 'Erreur lors de la notation.');
      }
    } catch (e) { console.error(e); }
  };

  // KYC Exam submission decision
  const handleSubmitExamDecision = async (status, reason, callback) => {
    setSubmittingDecision(true);
    const action = status === 'APPROVED' ? 'approveRegistration' : 'rejectRegistration';
    try {
      const res = await fetch(`/odata/v4/registration/${action}`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(status === 'APPROVED' ? { id: activeExamItem.ID } : { id: activeExamItem.ID, reason })
      });
      if (res.ok) {
        showToast('success', 'KYC Dossier mis à jour', 'La décision a été enregistrée avec succès.');
        fetchRegistrations();
        fetchNotifications();
        fetchStats();
        callback();
      } else {
        const err = await res.json();
        showToast('error', 'Erreur', err?.error?.message || 'Une erreur est survenue.');
      }
    } catch (e) {
      showToast('error', 'Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  // PDF Viewer Modal Helper
  const handleOpenPdfViewer = async (url) => {
    try {
      setPdfViewerUrl('about:blank');
      setPdfModalOpen(true);
      
      let blobUrl;
      if (typeof url === 'string' && url.includes('downloadDevisPDF')) {
        const match = url.match(/devisId=([a-f0-9-]+)/i);
        const devisId = match ? match[1] : null;
        showToast('info', 'Chargement...', 'Génération du PDF du devis...');
        const res = await fetch('/odata/v4/admin/downloadDevisPDF', {
          method: 'POST',
          headers: { ...adminHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ devisId })
        });
        const data = await res.json();
        const pdf = data.value || data.pdf;
        if (!res.ok || !pdf) throw new Error();
        blobUrl = `data:application/pdf;base64,${pdf}`;
      } else if (typeof url === 'string' && url.includes('downloadCommandePDF')) {
        const match = url.match(/commandeId=([a-f0-9-]+)/i);
        const commandeId = match ? match[1] : null;
        showToast('info', 'Chargement...', 'Génération du PDF du bon de commande...');
        const res = await fetch('/odata/v4/admin/downloadCommandePDF', {
          method: 'POST',
          headers: { ...adminHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ commandeId })
        });
        const data = await res.json();
        const pdf = data.value || data.pdf;
        if (!res.ok || !pdf) throw new Error();
        blobUrl = `data:application/pdf;base64,${pdf}`;
      } else if (typeof url === 'string' && url.includes('downloadGRPDF')) {
        showToast('info', 'Chargement...', 'Génération du PDF du bon de réception...');
        const res = await fetch(url, { headers: adminHeaders });
        const data = await res.json();
        const pdf = data.value || data.pdf;
        if (!res.ok || !pdf) throw new Error();
        blobUrl = `data:application/pdf;base64,${pdf}`;
      } else {
        const res = await fetch(url, { headers: adminHeaders });
        if (!res.ok) {
          showToast('error', 'Erreur de document', 'Impossible de charger le document PDF (' + res.status + ')');
          setPdfModalOpen(false);
          return;
        }
        const blob = await res.blob();
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        blobUrl = URL.createObjectURL(pdfBlob);
      }
      
      setPdfViewerUrl(blobUrl);
    } catch (e) {
      showToast('error', 'Erreur', 'Impossible de charger le document.');
      setPdfModalOpen(false);
    }
  };

  const handleClosePdfViewer = () => {
    setPdfModalOpen(false);
    if (pdfViewerUrl && pdfViewerUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfViewerUrl);
    }
    setPdfViewerUrl('');
  };

  // Business Partner unified details modal
  const handleOpenPartnerDetails = async (bp) => {
    setActivePartnerDetails(bp);
    setDetailsModalOpen(true);
    setPartnerDevis([]);
    setPartnerCommandes([]);
    setPartnerRfqResponses([]);
    setPartnerPOs([]);
    setLoadingPartnerDocs(true);

    const isSupplier = bp.bpType === 'FOURNISSEUR';
    try {
      if (!isSupplier) {
        // Fetch client documents (Devis & Sales orders)
        const clientEntity = bp.bpType === 'CLIENT_B2B' ? 'ClientsB2B' : 'ClientsB2C';
        const clientRes = await fetch(`/odata/v4/admin/${clientEntity}?$filter=bp_ID eq ${bp.ID}`);
        const clientData = await clientRes.json();
        
        if (clientData.value && clientData.value.length > 0) {
          const clientId = clientData.value[0].ID;
          const filterField = bp.bpType === 'CLIENT_B2B' ? 'clientB2B_ID' : 'clientB2C_ID';

          const devisRes = await fetch(`/odata/v4/admin/AllDevis?$filter=${filterField} eq ${clientId}&$orderby=date desc`);
          const devisData = await devisRes.json();
          setPartnerDevis(devisData.value || []);

          const cmdRes = await fetch(`/odata/v4/admin/AllCommandes?$filter=${filterField} eq ${clientId}&$orderby=date desc`);
          const cmdData = await cmdRes.json();
          setPartnerCommandes(cmdData.value || []);
        }
      } else {
        // Fetch supplier documents (RFQ responses & Purchase Orders PO)
        const supplierRes = await fetch(`/odata/v4/admin/Fournisseurs?$filter=bp_ID eq ${bp.ID}`);
        const supplierData = await supplierRes.json();
        
        if (supplierData.value && supplierData.value.length > 0) {
          const supplierId = supplierData.value[0].ID;

          const rfqRespRes = await fetch(`/odata/v4/admin/AllRFQResponses?$filter=fournisseur_ID eq ${supplierId}&$orderby=createdAt desc`);
          const rfqRespData = await rfqRespRes.json();
          setPartnerRfqResponses(rfqRespData.value || []);

          const poRes = await fetch(`/odata/v4/admin/AllBonsCommande?$filter=fournisseur_ID eq ${supplierId}&$orderby=date desc`);
          const poData = await poRes.json();
          setPartnerPOs(poData.value || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPartnerDocs(false);
    }
  };

  const handleApprovePartnerDevis = async (devisId) => {
    const confirm = await window.Dialog.confirm("Approuver et convertir ce devis en Bon de Commande ?");
    if (!confirm) return;
    try {
      const res = await fetch(`/odata/v4/crm/approveDevis`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ devisId })
      });
      if (res.ok) {
        showToast('success', 'Devis validé', 'Le devis a été converti en Bon de Commande Client.');
        if (activePartnerDetails) handleOpenPartnerDetails(activePartnerDetails);
      }
    } catch (e) { showToast('error', 'Erreur', 'Impossible de valider.'); }
  };

  // CRM Order details modal actions
  const handleViewOrder = async (order) => {
    // Save viewed status
    let viewed = JSON.parse(localStorage.getItem('viewedConfirmedOrders') || '[]');
    if (!viewed.includes(order.ID)) {
      viewed.push(order.ID);
      localStorage.setItem('viewedConfirmedOrders', JSON.stringify(viewed));
    }
    fetchCommandes(true);

    if (order._type === 'SRM') {
      if (order.status === 'CONFIRMED') {
        // Direct SRM PO Goods receipt modal
        handleOpenGRModal(order);
      } else {
        // Fetch full PO details with items and show details modal
        try {
          const res = await fetch(`/odata/v4/srm/BonsCommande(ID=${order.ID})?$expand=items,fournisseur,receptions($expand=items($expand=product,poItem))`, { headers: adminHeaders });
          const data = await res.json();
          setActiveOrderDetails({ ...order, ...data, _type: 'SRM' });
          setCommandeDetailModalOpen(true);
        } catch (e) {
          showToast('error', 'Erreur', 'Impossible de charger les détails de la commande.');
        }
      }
    } else {
      // Fetch full CRM details with items
      try {
        const res = await fetch(`/odata/v4/crm/Commandes(ID=${order.ID})?$expand=items,clientB2B,clientB2C`, { headers: adminHeaders });
        const data = await res.json();
        setActiveOrderDetails({ ...order, ...data, _type: 'CRM' });
        setCommandeDetailModalOpen(true);
      } catch (e) {
        showToast('error', 'Erreur', 'Impossible de charger les détails de la commande.');
      }
    }
  };

  const handleSendOrderToClient = async (commandeId) => {
    setSendingOrderToClient(true);
    try {
      const res = await fetch(`/odata/v4/crm/sendOrderToClient`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ commandeId })
      });
      if (res.ok) {
        showToast('success', 'Envoyé !', 'Le Bon de Commande a été envoyé avec succès au portail client.');
        setCommandeDetailModalOpen(false);
        if (activePartnerDetails) handleOpenPartnerDetails(activePartnerDetails);
        fetchCommandes();
      } else {
        const err = await res.json();
        showToast('error', 'Erreur', err?.error?.message || 'Erreur lors de l\'envoi.');
      }
    } catch (e) {
      showToast('error', 'Erreur', 'Impossible d\'envoyer.');
    } finally {
      setSendingOrderToClient(false);
    }
  };

  const handleValidateCashOrder = async (commandeId) => {
    const confirm = await window.Dialog.confirm("Valider cette commande en espèces ?\nCela générera la facture et décrémentera le stock.");
    if (!confirm) return;
    try {
      const res = await fetch('/odata/v4/admin/validateCashOrder', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ commandeId })
      });
      if (res.ok) {
        showToast('success', 'Commande validée !', 'Facture générée et stock mis à jour.');
        fetchCommandes();
        fetchFactures();
        fetchStats();
      } else {
        const err = await res.json();
        showToast('error', 'Erreur', err?.error?.message || 'Erreur serveur.');
      }
    } catch (e) {
      showToast('error', 'Erreur', 'Impossible de valider.');
    }
  };

  // Goods Receipt validation submit
  const handleOpenGRModal = async (po) => {
    try {
      const res = await fetch(`/odata/v4/srm/BonsCommande(ID=${po.ID})?$expand=items`, { headers: adminHeaders });
      const data = await res.json();
      setActiveGrDetails({ ...po, items: data.items || [] });
      setGrModalOpen(true);
    } catch (e) {
      showToast('error', 'Erreur', 'Impossible de charger la commande.');
    }
  };

  const handleSubmitGR = async (poId, itemsList, notes) => {
    setSubmittingGR(true);
    try {
      const res = await fetch('/odata/v4/srm/createGoodsReceipt', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ poId, items: itemsList, notes })
      });
      if (res.ok) {
        showToast('success', 'Réception validée !', 'Le Bon de Réception (Goods Receipt) a été enregistré.');
        setGrModalOpen(false);
        fetchCommandes();
        fetchStats();
        if (activePartnerDetails) handleOpenPartnerDetails(activePartnerDetails);
      } else {
        const err = await res.json();
        showToast('error', 'Erreur', err?.error?.message || 'Erreur serveur.');
      }
    } catch (e) {
      showToast('error', 'Erreur', 'Impossible de valider la réception.');
    } finally {
      setSubmittingGR(false);
    }
  };

  const handleApproveDiscrepancy = async (poId) => {
    showToast('info', 'Chargement...', "Chargement des détails de la commande...");
    try {
      const res = await fetch(`/odata/v4/srm/BonsCommande(ID=${poId})?$expand=receptions($expand=items($expand=product,poItem))`, {
        headers: adminHeaders
      });
      if (!res.ok) throw new Error("Impossible de charger les réceptions.");
      const data = await res.json();
      
      const itemsWithResend = [];
      if (data.receptions) {
        data.receptions.forEach(gr => {
          if (gr.items) {
            gr.items.forEach(gi => {
              const resendQty = parseFloat(gi.resendQty) || 0;
              if (resendQty > 0) {
                const poItemId = gi.poItem_ID || gi.poItem?.ID;
                const desc = (gi.product && gi.product.name) || (gi.poItem && gi.poItem.description) || gi.description || "Article";
                if (!itemsWithResend.some(x => x.poItemId === poItemId)) {
                  itemsWithResend.push({
                    poItemId,
                    description: desc,
                    resendQty: resendQty,
                    acceptedQty: resendQty,
                    rejectedQty: 0
                  });
                }
              }
            });
          }
        });
      }

      if (itemsWithResend.length === 0) {
        showToast('error', 'Erreur', "Aucun article de remplacement en attente de validation pour cette commande.");
        return;
      }

      setActiveApproveDetails(data);
      setApproveItems(itemsWithResend);
      setApproveModalOpen(true);
    } catch (e) {
      showToast('error', 'Erreur', e.message || "Erreur de chargement.");
    }
  };

  const handleApproveItemChange = (idx, field, val) => {
    const newItems = [...approveItems];
    const parsedVal = Math.max(0, parseFloat(val) || 0);
    const item = newItems[idx];
    const resendQty = item.resendQty;

    if (field === 'acceptedQty') {
      const acc = Math.min(parsedVal, resendQty);
      item.acceptedQty = acc;
      item.rejectedQty = Math.max(0, resendQty - acc);
    } else if (field === 'rejectedQty') {
      const rej = Math.min(parsedVal, resendQty);
      item.rejectedQty = rej;
      item.acceptedQty = Math.max(0, resendQty - rej);
    }
    
    setApproveItems(newItems);
  };

  const handleSubmitApproveDiscrepancy = async () => {
    if (!activeApproveDetails) return;
    
    for (const item of approveItems) {
      if (Math.abs(item.acceptedQty + item.rejectedQty - item.resendQty) > 0.001) {
        showToast('error', 'Validation incorrecte', `La somme acceptée + rejetée doit être égale à ${item.resendQty} pour ${item.description}`);
        return;
      }
    }

    setSubmittingApprove(true);
    showToast('info', 'Traitement...', "Approbation de la réception en cours...");
    try {
      const payloadItems = approveItems.map(item => ({
        poItemId: item.poItemId,
        acceptedQty: item.acceptedQty,
        rejectedQty: item.rejectedQty
      }));

      const res = await fetch('/odata/v4/srm/approveDiscrepancyResolution', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ 
          poId: activeApproveDetails.ID, 
          items: payloadItems 
        })
      });

      if (res.ok) {
        showToast('success', 'Réception approuvée !', "La marchandise de remplacement a été validée.");
        setApproveModalOpen(false);
        fetchCommandes();
        fetchStats();
        fetchNotifications();
        if (activePartnerDetails) handleOpenPartnerDetails(activePartnerDetails);
      } else {
        const err = await res.json();
        showToast('error', 'Erreur', err?.error?.message || 'Erreur serveur.');
      }
    } catch (e) {
      showToast('error', 'Erreur', "Impossible d'approuver la réception.");
    } finally {
      setSubmittingApprove(false);
    }
  };

  // Factures disputes & payment actions
  const handleViewInvoiceDetails = async (facId, type) => {
    // Save viewed status
    let viewed = JSON.parse(localStorage.getItem('viewedConfirmedInvoices') || '[]');
    if (!viewed.includes(facId)) {
      viewed.push(facId);
      localStorage.setItem('viewedConfirmedInvoices', JSON.stringify(viewed));
    }
    fetchFactures(true);

    const action = type === 'CLIENT' ? 'downloadFacturePDF' : 'downloadFacturePDF'; // In OData, endpoint is unified or handles body
    try {
      showToast('info', 'Chargement...', 'Génération du PDF de la facture...');
      const res = await fetch(`/odata/v4/admin/downloadFacturePDF`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ factId: facId })
      });
      const data = await res.json();
      const pdf = data.value || data.pdf;
      if (!pdf) throw new Error();
      
      setPdfViewerUrl(`data:application/pdf;base64,${pdf}`);
      setPdfModalOpen(true);
    } catch (e) {
      showToast('error', 'Erreur PDF', 'Impossible d\'afficher la facture PDF.');
    }
  };

  const handleResolveDispute = async (invoiceId, invoiceNumber) => {
    const confirm = await window.Dialog.confirm(`Résoudre le litige pour la facture ${invoiceNumber} ?\nCela forcera le statut à Payé (PAID) et appariée (MATCHED).`);
    if (!confirm) return;
    try {
      const res = await fetch('/odata/v4/admin/resolveDispute', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ invoiceId })
      });
      if (res.ok) {
        showToast('success', 'Litige résolu', 'Le litige a été clos. Facture payée.');
        fetchFactures();
        fetchNotifications();
        fetchStats();
      } else {
        const err = await res.json();
        showToast('error', 'Erreur', err?.error?.message || 'Erreur serveur.');
      }
    } catch (e) { showToast('error', 'Erreur', 'Erreur lors de la résolution.'); }
  };

  const handlePaySupplierInvoice = async (invoiceId, invoiceNumber, amount) => {
    const confirmPay = await window.Dialog.confirm(`Effectuer le paiement de la facture ${invoiceNumber} d'un montant de ${new Intl.NumberFormat('fr-FR').format(amount)} DA ?`);
    if (!confirmPay) return;

    const method = await window.Dialog.selectPaymentMethod(invoiceNumber, amount);
    if (!method) return;

    try {
      const res = await fetch('/odata/v4/admin/paySupplierInvoice', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ invoiceId, paymentMethod: method })
      });
      if (res.ok) {
        showToast('success', 'Facture payée !', `Règlement via ${method === 'CARTE' ? 'Carte CIB' : 'Espèces'} validé.`);
        fetchFactures();
        fetchStats();
      } else {
        const err = await res.json();
        showToast('error', 'Erreur', err?.error?.message || 'Erreur serveur.');
      }
    } catch (e) { showToast('error', 'Erreur', 'Règlement impossible.'); }
  };

  // Catalogue products CRUD
  const handleSaveProduct = async (id, payload, callback) => {
    setSavingProduct(true);
    try {
      let res;
      if (id) {
        res = await fetch(`/odata/v4/admin/Produits(${id})`, {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/odata/v4/admin/Produits', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast('success', 'Catalogue mis à jour', id ? 'Produit modifié avec succès.' : 'Nouveau produit créé avec succès.');
        fetchCatalogue();
        fetchStats();
        callback();
      } else {
        const err = await res.json();
        showToast('error', 'Erreur', err?.error?.message || 'Erreur lors de l\'enregistrement.');
      }
    } catch (e) {
      showToast('error', 'Erreur', 'Impossible de contacter le serveur.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProductStatus = async (id, currentStatus) => {
    const action = currentStatus ? 'désactiver' : 'activer';
    const confirm = await window.Dialog.confirm(`Voulez-vous ${action} ce produit ?`);
    if (!confirm) return;
    try {
      const res = await fetch(`/odata/v4/admin/Produits(${id})`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        showToast('success', 'Statut produit mis à jour', `Le produit a été ${currentStatus ? 'désactivé' : 'activé'}.`);
        fetchCatalogue();
      }
    } catch (e) { showToast('error', 'Erreur', 'Action impossible.'); }
  };

  const handleDeleteProduct = async (id, name) => {
    const confirm = await window.Dialog.confirm(`Supprimer définitivement "${name}" ?\nCette action est irréversible.`);
    if (!confirm) return;
    try {
      const res = await fetch(`/odata/v4/admin/Produits(${id})`, { method: 'DELETE', headers: adminHeaders });
      if (res.ok) {
        showToast('success', 'Produit supprimé', `"${name}" a été supprimé.`);
        fetchCatalogue();
        fetchStats();
      }
    } catch (e) { showToast('error', 'Erreur', 'Suppression impossible.'); }
  };

  // Devis revision submit
  const handleSaveDevisRevision = async (id, discountGlobal, itemsList, callback) => {
    setSavingDevis(true);
    try {
      // 1. Save modified prices & discounts
      const resRevise = await fetch('/odata/v4/admin/reviseDevis', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ devisId: id, discountGlobal, items: itemsList })
      });
      if (!resRevise.ok) {
        const err = await resRevise.json();
        throw new Error(err.error?.message || 'Erreur lors de la révision.');
      }

      // 2. Approve devis OData converting to sales order
      const resApprove = await fetch(`/odata/v4/crm/approveDevis`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ devisId: id })
      });
      if (!resApprove.ok) throw new Error("Impossible d'approuver le devis.");

      showToast('success', 'Devis approuvé !', 'Le devis a été révisé et approuvé.');
      fetchDevis();
      fetchCommandes();
      callback();
    } catch (err) {
      showToast('error', 'Erreur', err.message);
    } finally {
      setSavingDevis(false);
    }
  };

  // RFQs SRM actions
  const handleSaveRFQ = async (id, payload, callback) => {
    setSavingRFQ(true);
    try {
      let res;
      if (id) {
        res = await fetch(`/odata/v4/srm/RFQs(${id})`, {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/odata/v4/srm/RFQs', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        showToast('success', 'Appel d\'offres publié', 'L\'appel d\'offres (RFQ) a été enregistré.');
        fetchRfqs();
        callback();
      } else {
        const err = await res.json();
        showToast('error', 'Erreur', err?.error?.message || 'Erreur lors de la publication.');
      }
    } catch (e) {
      showToast('error', 'Erreur', 'Impossible d\'enregistrer.');
    } finally {
      setSavingRFQ(false);
    }
  };

  const handleDeleteRFQ = async (id, number) => {
    const confirm = await window.Dialog.confirm(`Supprimer définitivement l'appel d'offres "${number}" ?`);
    if (!confirm) return;
    try {
      const res = await fetch(`/odata/v4/srm/RFQs(${id})`, { method: 'DELETE', headers: adminHeaders });
      if (res.ok) {
        showToast('success', 'Appel d\'offres supprimé', `"${number}" a été supprimé.`);
        fetchRfqs();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', 'Erreur de suppression', err?.error?.message || 'Impossible de supprimer.');
      }
    } catch (e) { showToast('error', 'Erreur', 'Suppression impossible.'); }
  };

  const handleSelectRFQOffer = async (rfqId, responseId, callback) => {
    setSubmittingOffer(true);
    try {
      const res = await fetch('/odata/v4/srm/selectRFQResponse', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ rfqId, responseId })
      });
      if (res.ok) {
        showToast('success', 'Offre sélectionnée', 'L\'offre a été validée. Consultation close.');
        fetchRfqs();
        fetchNotifications();
        callback();
      } else {
        showToast('error', 'Erreur', 'Erreur lors de la validation.');
      }
    } catch (e) {
      showToast('error', 'Erreur', 'Sélection impossible.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleConvertRFQToPO = async (rfqId, callback) => {
    setSubmittingPO(true);
    try {
      const res = await fetch('/odata/v4/srm/convertRFQToPO', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ rfqId })
      });
      if (res.ok) {
        showToast('success', 'PO généré !', 'Le Bon de Commande Fournisseur (Purchase Order) a été généré.');
        fetchRfqs();
        fetchCommandes();
        callback();
      } else {
        showToast('error', 'Erreur', 'Génération du PO impossible.');
      }
    } catch (e) {
      showToast('error', 'Erreur', 'Action impossible.');
    } finally {
      setSubmittingPO(false);
    }
  };

  // Global search query handler
  const handleGlobalSearchSubmit = (val) => {
    if (activeTab === 'partners') fetchPartners(val);
    if (activeTab === 'suppliers') fetchSuppliers(val);
    if (activeTab === 'registrations') fetchRegistrations(val);
  };

  // Logout trigger
  const handleLogout = async () => {
    const confirm = await window.Dialog.confirm('Voulez-vous vous déconnecter ?');
    if (confirm) {
      sessionStorage.clear();
      window.location.href = '/index.html';
    }
  };

  // CRM Order details modal closed
  const [activeOrderDetails, setActiveOrderDetails] = useState(null);
  const [commandeDetailModalOpen, setCommandeDetailModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* Sidebar Nav */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSearchVal('');
        }} 
        counts={counts}
        onLogout={handleLogout}
      />

      {/* Main content wrapper */}
      <div className="main-wrapper">
        
        {/* Top Header */}
        <Header 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          revenueYear={revenueYear}
          setRevenueYear={setRevenueYear}
          revenueMonth={revenueMonth}
          setRevenueMonth={setRevenueMonth}
          stats={stats}
          notifications={notifications}
          unreadCount={unreadCount}
          onViewGeneralNotif={handleViewGeneralNotif}
          onOpenExamModal={(id) => {
            const item = registrations.find(r => r.ID === id) || notifications.find(n => n.ID === id);
            if (item) {
              setActiveExamItem(item);
              setExamModalOpen(true);
            } else {
              // Fetch single registration request if needed
              fetch(`/odata/v4/registration/RegistrationRequests('${id}')`)
                .then(res => res.json())
                .then(data => {
                  setActiveExamItem(data);
                  setExamModalOpen(true);
                })
                .catch(() => showToast('error', 'Erreur', 'Impossible de charger le dossier.'));
            }
          }}
          searchVal={searchVal}
          setSearchVal={setSearchVal}
          onSearchSubmit={handleGlobalSearchSubmit}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onMarkAllAsRead={handleMarkAllAsRead}
        />

        {/* View sections switch */}
        <main className="content" style={{ overflowY: 'auto' }}>
          
          {activeTab === 'overview' && (
            <Overview 
              stats={stats} 
              revenueYear={revenueYear} 
              revenueMonth={revenueMonth}
              onResolveAlert={handleResolveAlert}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'partners' && (
            <Clients 
              partners={partners}
              clientFilterType={clientFilterType}
              setClientFilterType={setClientFilterType}
              wilayaFilter={clientWilaya}
              setWilayaFilter={setClientWilaya}
              sectorFilter={clientSector}
              setSectorFilter={setClientSector}
              onOpenDetails={handleOpenPartnerDetails}
              onBlockToggle={handlePartnerBlockToggle}
              onDelete={handlePartnerDelete}
              wilayasList={clientWilayasList}
            />
          )}

          {activeTab === 'suppliers' && (
            <Fournisseurs 
              suppliers={suppliers}
              notationFilter={supplierNotation}
              setNotationFilter={setSupplierNotation}
              wilayaFilter={supplierWilaya}
              setWilayaFilter={setSupplierWilaya}
              sectorFilter={supplierSector}
              setSectorFilter={setSupplierSector}
              onOpenDetails={handleOpenPartnerDetails}
              onBlockToggle={handlePartnerBlockToggle}
              onDelete={handlePartnerDelete}
              onRateSupplier={handleRateSupplier}
              wilayasList={supplierWilayasList}
            />
          )}

          {activeTab === 'registrations' && (
            <Registrations 
              registrations={registrations}
              onOpenExam={(id) => {
                const item = registrations.find(r => r.ID === id);
                setActiveExamItem(item);
                setExamModalOpen(true);
              }}
              examModalOpen={examModalOpen}
              activeExamItem={activeExamItem}
              onCloseExam={() => setExamModalOpen(false)}
              onViewPdf={handleOpenPdfViewer}
              onSubmitDecision={handleSubmitExamDecision}
              submittingDecision={submittingDecision}
            />
          )}

          {activeTab === 'commandes' && (
            <Commandes 
              commandes={commandes}
              filterType={cmdFilterType}
              setFilterType={setCmdFilterType}
              onViewOrder={handleViewOrder}
              onValidateCash={handleValidateCashOrder}
              onOpenGR={handleOpenGRModal}
              commandeDetailModalOpen={commandeDetailModalOpen}
              activeOrderDetails={activeOrderDetails}
              onCloseOrderDetails={() => setCommandeDetailModalOpen(false)}
              onSendOrderToClient={handleSendOrderToClient}
              sendingOrderToClient={sendingOrderToClient}
              onViewPdf={handleOpenPdfViewer}
              grModalOpen={grModalOpen}
              activeGrDetails={activeGrDetails}
              onCloseGR={() => setGrModalOpen(false)}
              onSubmitGR={handleSubmitGR}
              submittingGR={submittingGR}
              onApproveDiscrepancy={handleApproveDiscrepancy}
            />
          )}

          {activeTab === 'factures' && (
            <Factures 
              factures={factures}
              filterType={facFilterType}
              setFilterType={setFacFilterType}
              onViewInvoice={handleViewInvoiceDetails}
              onResolveDispute={handleResolveDispute}
              onPaySupplier={handlePaySupplierInvoice}
            />
          )}

          {activeTab === 'catalogue' && (
            <Catalogue 
              products={products}
              typeFilter={catTypeFilter}
              setTypeFilter={setCatTypeFilter}
              statusFilter={catStatusFilter}
              setStatusFilter={setCatStatusFilter}
              onSaveProduct={handleSaveProduct}
              onToggleStatus={handleToggleProductStatus}
              onDeleteProduct={handleDeleteProduct}
              kpiStats={{
                total: products.length,
                active: products.filter(p => p.isActive).length,
                inactive: products.filter(p => !p.isActive).length,
                lowStock: products.filter(p => p.stock !== null && p.minStock !== null && p.stock < p.minStock).length
              }}
              savingProduct={savingProduct}
              showToast={showToast}
            />
          )}

          {activeTab === 'devis' && (
            <Devis 
              devis={devis}
              filterStatus={devisFilterStatus}
              setFilterStatus={setDevisFilterStatus}
              onSaveDevis={handleSaveDevisRevision}
              savingDevis={savingDevis}
            />
          )}

          {activeTab === 'rfqs' && (
            <RFQs 
              rfqs={rfqs}
              suppliersList={suppliers}
              onSaveRFQ={handleSaveRFQ}
              onDeleteRFQ={handleDeleteRFQ}
              onSelectOffer={handleSelectRFQOffer}
              onConvertPO={handleConvertRFQToPO}
              kpiStats={{
                total: rfqs.length,
                open: rfqs.filter(r => r.status === 'OPEN').length,
                closed: rfqs.filter(r => r.status !== 'OPEN').length,
                offers: rfqs.reduce((sum, r) => sum + (r.responses ? r.responses.length : 0), 0)
              }}
              savingRFQ={savingRFQ}
              submittingOffer={submittingOffer}
              submittingPO={submittingPO}
            />
          )}

          {activeTab === 'settings' && (
            <Settings 
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              showToast={showToast}
            />
          )}

        </main>
      </div>

      {/* unified BusinessPartner Details Modal */}
      {detailsModalOpen && activePartnerDetails && (
        <div id="details-modal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ width: '85%', maxWidth: '1200px' }}>
            <div className="modal-header">
              <h3>📄 Fiche Partenaire & Historique Documents</h3>
              <span className="close-modal" onClick={() => setDetailsModalOpen(false)}>✕</span>
            </div>
            
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', maxHeight: '78vh', overflowY: 'auto' }}>
              
              {/* Left Panel: Basic Details — Theme-Adaptive Premium Design */}
              {(() => {
                const dm = darkMode;
                const panelBg        = dm ? '#0f1c2e'   : '#f1f5f9';
                const cardBg         = dm ? '#162032'   : '#ffffff';
                const cardBorder     = dm ? 'rgba(255,255,255,0.07)' : '#e2e8f0';
                const labelColor     = dm ? '#64748b'   : '#94a3b8';
                const valueColor     = dm ? '#e2e8f0'   : '#0f172a';
                const sectionHdrBg   = dm ? 'rgba(59,130,246,0.12)'  : 'rgba(59,130,246,0.07)';
                const sectionBorder  = dm ? 'rgba(59,130,246,0.18)'  : 'rgba(59,130,246,0.25)';
                const sectionHdrClr  = dm ? '#60a5fa'   : '#1d4ed8';
                const purpleHdrBg    = dm ? 'rgba(168,85,247,0.1)'   : 'rgba(168,85,247,0.06)';
                const purpleBorder   = dm ? 'rgba(168,85,247,0.2)'   : 'rgba(168,85,247,0.25)';
                const purpleHdrClr   = dm ? '#c084fc'   : '#7c3aed';
                const greenHdrBg     = dm ? 'rgba(34,197,94,0.1)'    : 'rgba(34,197,94,0.06)';
                const greenBorder    = dm ? 'rgba(34,197,94,0.2)'    : 'rgba(34,197,94,0.25)';
                const greenHdrClr    = dm ? '#4ade80'   : '#16a34a';
                const fiscalItemBg   = dm ? 'rgba(255,255,255,0.04)' : '#f8fafc';
                const fiscalItemBrd  = dm ? 'rgba(255,255,255,0.07)' : '#e2e8f0';
                const fiscalValClr   = dm ? '#a5f3fc'   : '#0369a1';
                const fiscalNaColor  = dm ? '#475569'   : '#94a3b8';
                const dividerColor   = dm ? 'rgba(255,255,255,0.07)' : '#e2e8f0';

                return (
                  <div style={{ borderRight: `1px solid ${dividerColor}`, paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* Header Card — Partner Name + Type Badge */}
                    <div style={{
                      background: dm
                        ? 'linear-gradient(135deg, #1e3a5f 0%, #0f2540 100%)'
                        : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                      borderRadius: '14px',
                      padding: '16px',
                      border: '1px solid rgba(59,130,246,0.35)',
                      boxShadow: dm ? '0 4px 20px rgba(0,0,0,0.35)' : '0 4px 16px rgba(30,64,175,0.2)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '5px' }}>
                            Raison Sociale
                          </div>
                          <div id="det-name" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ffffff', lineHeight: 1.3 }}>
                            {activePartnerDetails.displayName}
                          </div>
                          <div id="det-bp" style={{ fontSize: '11px', color: '#93c5fd', fontFamily: 'monospace', marginTop: '4px', opacity: 0.85 }}>
                            {activePartnerDetails.bpNumber}
                          </div>
                        </div>
                        <span style={{
                          background: activePartnerDetails.bpType === 'FOURNISSEUR' ? 'rgba(251,191,36,0.25)' : 'rgba(34,197,94,0.25)',
                          color: activePartnerDetails.bpType === 'FOURNISSEUR' ? '#fbbf24' : '#4ade80',
                          border: `1px solid ${activePartnerDetails.bpType === 'FOURNISSEUR' ? 'rgba(251,191,36,0.5)' : 'rgba(34,197,94,0.5)'}`,
                          borderRadius: '20px', padding: '4px 11px',
                          fontSize: '10.5px', fontWeight: 700, whiteSpace: 'nowrap',
                        }}>
                          {activePartnerDetails.bpType === 'FOURNISSEUR' ? '🏭 Fournisseur' : activePartnerDetails.bpType === 'CLIENT_B2B' ? '🏢 Client B2B' : '👤 Client B2C'}
                        </span>
                      </div>
                    </div>

                    {/* Contact & Localisation Section */}
                    <div style={{ background: cardBg, borderRadius: '12px', border: `1px solid ${sectionBorder}`, overflow: 'hidden' }}>
                      <div style={{ padding: '7px 14px', background: sectionHdrBg, borderBottom: `1px solid ${sectionBorder}` }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: sectionHdrClr, textTransform: 'uppercase', letterSpacing: '1px' }}>📞 Contact & Localisation</span>
                      </div>
                      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                        {[
                          { label: 'E-mail',           value: activePartnerDetails.email,          icon: '✉️',  mono: true },
                          { label: 'Téléphone',         value: activePartnerDetails.phone  || 'N/A', icon: '📱' },
                          { label: 'Wilaya',            value: activePartnerDetails.wilaya || 'N/A', icon: '📍' },
                          { label: "Secteur d'activité",value: activePartnerDetails.sector || 'N/A', icon: '🏗️' },
                        ].map(({ label, value, icon, mono }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                            <span style={{ fontSize: '14px', marginTop: '1px', flexShrink: 0 }}>{icon}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '9px', fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '2px' }}>{label}</div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: valueColor, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Identifiants Légaux & Fiscaux */}
                    <div style={{ background: cardBg, borderRadius: '12px', border: `1px solid ${purpleBorder}`, overflow: 'hidden' }}>
                      <div style={{ padding: '7px 14px', background: purpleHdrBg, borderBottom: `1px solid ${purpleBorder}` }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: purpleHdrClr, textTransform: 'uppercase', letterSpacing: '1px' }}>🔢 Identifiants Légaux & Fiscaux</span>
                      </div>
                      <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {[
                          { label: 'N.I.F (Fiscal)',        value: activePartnerDetails.nif },
                          { label: 'R.C (Reg. Commerce)',   value: activePartnerDetails.rc },
                          { label: 'A.I (Art. Imposition)', value: activePartnerDetails.ai },
                          { label: 'R.I.B (Banque)',        value: activePartnerDetails.ribNumber },
                        ].map(({ label, value }) => (
                          <div key={label} style={{
                            background: fiscalItemBg, borderRadius: '8px',
                            padding: '8px 9px', border: `1px solid ${fiscalItemBrd}`,
                          }}>
                            <div style={{ fontSize: '8px', fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>{label}</div>
                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: value ? fiscalValClr : fiscalNaColor, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {value || <span style={{ fontStyle: 'italic', fontWeight: 400, color: fiscalNaColor }}>N/A</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Documents Légaux Buttons */}
                    <div style={{ background: cardBg, borderRadius: '12px', border: `1px solid ${greenBorder}`, overflow: 'hidden' }}>
                      <div style={{ padding: '7px 14px', background: greenHdrBg, borderBottom: `1px solid ${greenBorder}` }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: greenHdrClr, textTransform: 'uppercase', letterSpacing: '1px' }}>📁 Documents Légaux</span>
                      </div>
                      <div style={{ padding: '10px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                        {[
                          { label: 'Reg. Commerce', sub: 'RC',  field: 'rcDoc',  color: '#3b82f6' },
                          { label: 'Carte Fiscale',  sub: 'NIF', field: 'nifDoc', color: '#8b5cf6' },
                          { label: 'Art. Imposition',sub: 'AI',  field: 'aiDoc',  color: '#f59e0b' },
                          { label: 'RIB Bancaire',   sub: 'RIB', field: 'ribDoc', color: '#10b981' },
                        ].map(({ label, sub, field, color }) => (
                          <button
                            key={field}
                            className="btn-action"
                            onClick={() => handleOpenPdfViewer(`/odata/v4/admin/BusinessPartners(${activePartnerDetails.ID})/${field}/$value`)}
                            style={{
                              background: dm ? `${color}1a` : `${color}12`,
                              border: `1px solid ${color}${dm ? '55' : '40'}`,
                              borderRadius: '10px',
                              color: dm ? '#fff' : '#0f172a',
                              padding: '10px 6px',
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', gap: '4px',
                              cursor: 'pointer', transition: 'all 0.2s',
                              fontSize: '11px', fontWeight: 600, lineHeight: 1.3,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${color}30`; e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`; }}
                            onMouseLeave={e => { e.currentTarget.style.background = dm ? `${color}1a` : `${color}12`; e.currentTarget.style.borderColor = `${color}${dm?'55':'40'}`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            <span style={{ fontSize: '18px' }}>📄</span>
                            <span style={{ color: dm ? '#e2e8f0' : '#1e293b', textAlign: 'center', fontSize: '10.5px' }}>{label}</span>
                            <span style={{ fontSize: '9px', fontWeight: 700, color, background: `${color}20`, padding: '1px 7px', borderRadius: '20px', border: `1px solid ${color}40` }}>{sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                );
              })()}

              {/* Right Panel: CRM/SRM Documents Table Lists */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Loader */}
                {loadingPartnerDocs ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    ⏳ Chargement des documents OData en cours...
                  </div>
                ) : activePartnerDetails.bpType !== 'FOURNISSEUR' ? (
                  
                  // Client view layout: Devis and CRM Commandes
                  <>
                    <div>
                      <h4 id="det-right-title-1" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        📄 Demandes de Devis (Client)
                      </h4>
                      <div className="table-wrap" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        <table className="custom-table" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th>N° Devis</th>
                              <th>Date</th>
                              <th>Total TTC</th>
                              <th>Statut</th>
                              <th style={{ width: '180px' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody id="det-right-tbody-1">
                            {partnerDevis.length === 0 ? (
                              <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '15px', color: 'var(--text-dim)' }}>
                                  Aucune demande de devis.
                                </td>
                              </tr>
                            ) : (
                              partnerDevis.map(d => (
                                <tr key={d.ID}>
                                  <td><strong>{d.devisNumber}</strong></td>
                                  <td>{d.date || d.createdAt?.slice(0, 10)}</td>
                                  <td style={{ fontFamily: 'monospace' }}>{new Intl.NumberFormat().format(d.totalTTC)} DA</td>
                                  <td><span className={`status-badge status-${d.status.toLowerCase()}`}>{d.status}</span></td>
                                  <td>
                                    <button className="btn-action-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => handleOpenPdfViewer(`/odata/v4/admin/downloadDevisPDF(devisId=${d.ID})`)}>
                                      PDF
                                    </button>
                                    {d.status === 'PENDING' && (
                                      <button className="btn-action" style={{ background: 'var(--accent-green)', color: 'white', fontSize: '0.75rem', padding: '4px 8px', marginLeft: '5px' }} onClick={() => handleApprovePartnerDevis(d.ID)}>
                                        Approuver
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 id="det-right-title-2" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        🛒 Bons de Commande (Client CRM)
                      </h4>
                      <div className="table-wrap" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        <table className="custom-table" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th>N° BC</th>
                              <th>Date</th>
                              <th>Total TTC</th>
                              <th>Statut</th>
                              <th>PDF</th>
                            </tr>
                          </thead>
                          <tbody id="det-right-tbody-2">
                            {partnerCommandes.length === 0 ? (
                              <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '15px', color: 'var(--text-dim)' }}>
                                  Aucun bon de commande.
                                </td>
                              </tr>
                            ) : (
                              partnerCommandes.map(c => (
                                <tr key={c.ID}>
                                  <td><strong>{c.orderNumber}</strong></td>
                                  <td>{c.date || c.createdAt?.slice(0, 10)}</td>
                                  <td style={{ fontFamily: 'monospace' }}>{new Intl.NumberFormat().format(c.totalTTC)} DA</td>
                                  <td><span className={`status-badge status-${c.status.toLowerCase()}`}>{c.status}</span></td>
                                  <td>
                                    <button className="btn-action-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => handleOpenPdfViewer(`/odata/v4/admin/downloadCommandePDF(commandeId=${c.ID})`)}>
                                      PDF
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  
                  // Supplier view layout: RFQ responses and SRM POs
                  <>
                    <div>
                      <h4 id="det-right-title-1" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        📄 Offres / Réponses RFQ (Fournisseur)
                      </h4>
                      <div className="table-wrap" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        <table className="custom-table" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th>Désignation</th>
                              <th>Date de soumission</th>
                              <th>Montant Proposé</th>
                              <th>Statut de choix</th>
                            </tr>
                          </thead>
                          <tbody id="det-right-tbody-1">
                            {partnerRfqResponses.length === 0 ? (
                              <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '15px', color: 'var(--text-dim)' }}>
                                  Aucune offre soumise.
                                </td>
                              </tr>
                            ) : (
                              partnerRfqResponses.map(r => (
                                <tr key={r.ID}>
                                  <td><strong>Offre RFQ</strong></td>
                                  <td>{new Date(r.createdAt || r.modifiedAt || Date.now()).toISOString().split('T')[0]}</td>
                                  <td style={{ fontFamily: 'monospace' }}>{new Intl.NumberFormat().format(r.totalAmount)} DA</td>
                                  <td>
                                    {r.selected ? (
                                      <span style={{ color: '#22c55e', fontWeight: 700 }}>Sélectionnée</span>
                                    ) : (
                                      <span style={{ color: 'var(--text-dim)' }}>En attente</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 id="det-right-title-2" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        🛒 Bons de Commande (PO Fournisseur SRM)
                      </h4>
                      <div className="table-wrap" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        <table className="custom-table" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th>N° PO</th>
                              <th>Date</th>
                              <th>Total HT</th>
                              <th>Statut</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody id="det-right-tbody-2">
                            {partnerPOs.length === 0 ? (
                              <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '15px', color: 'var(--text-dim)' }}>
                                  Aucun bon de commande purchase order.
                                </td>
                              </tr>
                            ) : (
                              partnerPOs.map(p => (
                                <tr key={p.ID}>
                                  <td><strong>{p.poNumber}</strong></td>
                                  <td>{p.date}</td>
                                  <td style={{ fontFamily: 'monospace' }}>{new Intl.NumberFormat().format(p.totalHT)} DA</td>
                                  <td><span className={`status-badge status-${p.status.toLowerCase()}`}>{p.status}</span></td>
                                  <td>
                                    {p.status === 'CONFIRMED' ? (
                                      <button className="btn-action" style={{ background: 'var(--accent)', color: 'white', fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => {
                                        setDetailsModalOpen(false);
                                        handleOpenGRModal(p);
                                      }}>
                                        Valider GR
                                      </button>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
            
            <div className="modal-header" style={{ borderTop: '1px solid var(--border)', background: 'var(--input-bg)', display: 'flex', justifyContent: 'flex-end', padding: '12px 24px' }}>
              <input type="hidden" id="det-bp-id" value={activePartnerDetails.ID} />
              <button className="btn-dialog-secondary" onClick={() => setDetailsModalOpen(false)}>
                Fermer la fiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Inline Viewer Modal */}
      {pdfModalOpen && (
        <div id="pdf-viewer-modal" className="modal-overlay" style={{ display: 'flex', zIndex: 5000 }}>
          <div style={{ width: '85%', height: '90%', background: 'var(--card-bg)', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
            <div style={{ padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>📄 Aperçu du Document PDF</span>
              <button onClick={handleClosePdfViewer} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, padding: 0 }} id="pdf-viewer-container">
              <iframe src={pdfViewerUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Viewer" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Approbation Écart (Discrepancy Approval Modal) */}
      {approveModalOpen && activeApproveDetails && (
        <div id="admin-approve-modal" className="modal-overlay" style={{ display: 'flex', zIndex: 4500 }}>
          <div className="modal-content" style={{ width: '700px' }}>
            <div className="modal-header">
              <h3>🔄 Approbation de la Marchandise Renvoyée</h3>
              <span className="close-modal" onClick={() => setApproveModalOpen(false)}>✕</span>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '15px', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Saisie des quantités acceptées et rejetées pour le bon de commande N° <strong>{activeApproveDetails.poNumber}</strong> (Fournisseur : {activeApproveDetails.fournisseur?.companyName || 'Fournisseur'}).
              </p>
              
              <div className="table-wrap" style={{ marginBottom: '20px', maxHeight: '250px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '0.75rem' }}>Description</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '0.75rem' }}>Quantité Renvoyée</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '0.75rem' }}>Quantité Acceptée</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '0.75rem' }}>Quantité Rejetée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approveItems.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-main)' }}>{item.description}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-main)' }}>{item.resendQty}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            value={item.acceptedQty} 
                            onChange={(e) => handleApproveItemChange(i, 'acceptedQty', e.target.value)}
                            style={{ width: '90px', padding: '6px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)', fontFamily: 'monospace', textAlign: 'center' }} 
                            min="0" 
                            max={item.resendQty}
                            step="0.001"
                          />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            value={item.rejectedQty} 
                            onChange={(e) => handleApproveItemChange(i, 'rejectedQty', e.target.value)}
                            style={{ width: '90px', padding: '6px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)', fontFamily: 'monospace', textAlign: 'center' }} 
                            min="0" 
                            max={item.resendQty}
                            step="0.001"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn-dialog-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setApproveModalOpen(false)}>
                  Annuler
                </button>
                <button 
                  className="btn-action" 
                  disabled={submittingApprove}
                  onClick={handleSubmitApproveDiscrepancy}
                  style={{ flex: 2, padding: '12px', background: '#10b981', color: 'white', fontWeight: 700 }}
                >
                  {submittingApprove ? '⏳ Validation...' : '✔️ Valider & Enregistrer l\'Inspection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast popup alerts container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Custom Alert/Confirm/Prompt dialog overlays */}
      <DialogSystem 
        dialogState={dialogState} 
        onConfirm={handleDialogConfirm} 
        onCancel={handleDialogCancel}
        showToast={showToast}
      />

    </div>
  );
}
