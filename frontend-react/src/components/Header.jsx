import React, { useState, useEffect, useRef } from 'react';

export default function Header({
  activeTab,
  setActiveTab,
  revenueYear,
  setRevenueYear,
  revenueMonth,
  setRevenueMonth,
  stats,
  notifications,
  unreadCount,
  onViewGeneralNotif,
  onOpenExamModal,
  searchVal,
  setSearchVal,
  onSearchSubmit,
  darkMode,
  setDarkMode,
  onMarkAllAsRead,
  lang = 'FR',
  setLang,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions
  useEffect(() => {
    if (searchVal.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(
          `/odata/v4/admin/BusinessPartners?$filter=contains(tolower(displayName),'${encodeURIComponent(
            searchVal.toLowerCase()
          )}')`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.value || []);
          setSuggestionsOpen(true);
        }
      } catch (e) {
        console.error('Error fetching suggestions', e);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchVal]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchVal(val);

    // If typing from dashboard, switch to partners automatically
    if (activeTab === 'overview' && val.length > 0) {
      setActiveTab('partners');
    }
    onSearchSubmit(val);
  };

  const handleSuggestionSelect = (item) => {
    setSearchVal(item.displayName);
    setSuggestionsOpen(false);
    
    if (item.bpType === 'FOURNISSEUR') {
      setActiveTab('suppliers');
    } else {
      setActiveTab('partners');
    }
    onSearchSubmit(item.displayName);
  };

  // Setup years & months dynamically
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let i = 0; i < 5; i++) {
    yearOptions.push(currentYear - i);
  }

  const monthNames = lang === 'FR' ? [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ] : [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Restrict months for current year
  const maxMonth = (parseInt(revenueYear, 10) === currentYear) ? new Date().getMonth() + 1 : 12;
  const filteredMonthNames = monthNames.slice(0, maxMonth);

  // Sync theme icon & labels
  const themeIcon = darkMode ? '🌙' : '☀️';
  const themeText = darkMode ? 'Evening Horizon' : 'Morning Horizon';

  const translations = {
    FR: {
      overview: "Centre de Contrôle — Vue d'ensemble",
      partners: 'Portail Client B2B & B2C',
      suppliers: 'Gestion des Fournisseurs (SRM)',
      registrations: 'Validation KYC Inscriptions',
      commandes: 'Commandes CRM & SRM',
      factures: 'Facturation & Règlements',
      catalogue: 'Catalogue des Articles',
      devis: 'Traitement des Demandes Devis',
      rfqs: "Appels d'offres (SRM RFQs)",
      settings: 'Paramètres du Profil',
      live: "LIVE",
      searchPlaceholder: "Rechercher...",
      allRead: "Tout marquer comme lu",
      noNotif: "Aucune notification",
      demoRequest: "Demande : ",
      type: "Type : ",
      generalNotif: "Notification générale",
      unnamedTab: "Tableau de bord"
    },
    EN: {
      overview: "Control Center — Overview",
      partners: 'B2B & B2C Customer Portal',
      suppliers: 'Supplier Management (SRM)',
      registrations: 'KYC Registration Validation',
      commandes: 'CRM & SRM Orders',
      factures: 'Invoicing & Payments',
      catalogue: 'Product Catalog',
      devis: 'Quote Requests Processing',
      rfqs: "Tenders (SRM RFQs)",
      settings: 'Profile Settings',
      live: "LIVE",
      searchPlaceholder: "Search...",
      allRead: "Mark all as read",
      noNotif: "No notifications",
      demoRequest: "Request: ",
      type: "Type: ",
      generalNotif: "General notification",
      unnamedTab: "Dashboard"
    }
  };

  const t = (key) => (translations[lang] || translations['FR'])[key] || key;

  const viewTitles = {
    overview: t('overview'),
    partners: t('partners'),
    suppliers: t('suppliers'),
    registrations: t('registrations'),
    commandes: t('commandes'),
    factures: t('factures'),
    catalogue: t('catalogue'),
    devis: t('devis'),
    rfqs: t('rfqs'),
    settings: t('settings')
  };

  return (
    <header>
      <div className="header-title">
        <span 
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', color: 'var(--accent)', verticalAlign: 'middle', marginRight: '6px' }}
        >
          <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%', stroke: 'currentColor', fill: 'none', strokeWidth: '2px' }}>
            <path d="M3 3v18h18M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
          </svg>
        </span>
        <span id="header-view-title">{viewTitles[activeTab] || 'Tableau de bord'}</span>
        <span 
          id="header-date" 
          style={{ 
            marginLeft: '12px', 
            fontSize: '0.85rem', 
            color: 'var(--text-dim)', 
            verticalAlign: 'middle', 
            borderLeft: '1px solid var(--border)', 
            paddingLeft: '12px',
            fontWeight: '500'
          }}
        >
          {new Date().toLocaleDateString('fr-FR')}
        </span>
      </div>

      <div className="header-actions">
        {/* Live Indicator */}
        <div className="live-indicator">
          <span className="live-dot-admin" />
          <span>LIVE</span>
        </div>

        {/* Date Filters (Only shown on overview) */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              id="period-month"
              className="period-selector"
              value={revenueMonth}
              onChange={(e) => setRevenueMonth(e.target.value)}
            >
              {filteredMonthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>

            <select
              id="period-year"
              className="period-selector"
              value={revenueYear}
              onChange={(e) => setRevenueYear(e.target.value)}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {/* Global OData Auto-Complete Search */}
        {(activeTab === 'overview' || activeTab === 'partners' || activeTab === 'suppliers' || activeTab === 'registrations') && (
          <div className="search-container" ref={searchContainerRef}>
            <span className="search-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              id="main-search"
              className="search-input"
              placeholder={t('searchPlaceholder')}
              value={searchVal}
              onChange={handleSearchChange}
              onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
              autoComplete="off"
            />

            {/* Suggestions list */}
            {suggestionsOpen && suggestions.length > 0 && (
              <div className="search-suggestions" id="search-suggestions">
                {suggestions.map(p => (
                  <div
                    key={p.ID}
                    className="search-suggestion-item"
                    onClick={() => handleSuggestionSelect(p)}
                  >
                    <span style={{ fontWeight: 500 }}>{p.displayName}</span>
                    <span className={`search-suggestion-type ${p.bpType === 'FOURNISSEUR' ? 'supplier' : 'client'}`}>
                      {p.bpType === 'FOURNISSEUR' ? (lang === 'FR' ? 'Fournisseur' : 'Supplier') : (lang === 'FR' ? 'Client' : 'Customer')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Unified Notifications Bell Dropdown */}
        <div className="action-icon" style={{ position: 'relative' }} ref={dropdownRef}>
          <span 
            className="action-icon" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <svg 
              id="bell-icon" 
              viewBox="0 0 24 24" 
              className={unreadCount > 0 ? 'bell-ring' : ''}
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span 
                id="noti-count" 
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--accent-red)',
                  color: 'white',
                  borderRadius: '50%',
                  fontSize: '9px',
                  width: '15px',
                  height: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
              >
                {unreadCount}
              </span>
            )}
          </span>

          {/* Notifications Dropdown */}
          {dropdownOpen && (
            <div className="noti-dropdown" id="noti-dropdown" style={{ display: 'flex' }}>
              <div className="noti-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Notifications ({unreadCount})</span>
                {notifications.some(n => !(n.type && n.companyName)) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAllAsRead();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      transition: 'background-color 150ms',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--nav-item-active-bg)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {t('allRead')}
                  </button>
                )}
              </div>
              <div className="noti-list" id="noti-list">
                {notifications.length === 0 ? (
                  <div style={{ padding: '15px', fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                    {t('noNotif')}
                  </div>
                ) : (
                  notifications.map(n => {
                    // Check if it is a registration request
                    if (n.type && n.companyName) {
                      return (
                        <div
                          key={`reg-${n.ID}`}
                          className="noti-item"
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenExamModal(n.ID);
                          }}
                          style={{
                            borderLeft: '3px solid var(--accent)',
                            padding: '10px 12px',
                            marginBottom: '6px',
                            cursor: 'pointer',
                            background: 'rgba(2, 132, 199, 0.05)',
                            borderRadius: '8px',
                          }}
                        >
                          <div className="noti-item-title" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                            🚀 {t('demoRequest')}{n.companyName}
                          </div>
                          <div className="noti-item-time" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                            {t('type')}{n.type === 'FOURNISSEUR' ? (lang === 'FR' ? 'Fournisseur' : 'Supplier') : (n.type === 'CLIENT_B2B' ? (lang === 'FR' ? 'Client B2B' : 'Customer B2B') : (lang === 'FR' ? 'Client B2C' : 'Customer B2C'))}
                          </div>
                        </div>
                      );
                    }

                    // Otherwise it is a general notification
                    const icon = n.title.includes('espèces') ? '💵' : (n.title.includes('offre') ? '📩' : '🔔');
                    return (
                      <div
                        key={`gen-${n.ID}`}
                        className="noti-item"
                        onClick={() => {
                          setDropdownOpen(false);
                          onViewGeneralNotif(n);
                        }}
                        style={{
                          borderLeft: '3px solid var(--accent-orange)',
                          padding: '10px 12px',
                          marginBottom: '6px',
                          cursor: 'pointer',
                          background: 'rgba(217, 119, 6, 0.05)',
                          borderRadius: '8px',
                        }}
                      >
                        <div className="noti-item-title" style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                          {icon} {n.title}
                        </div>
                        <div className="noti-item-time" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                          {n.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>



        {/* Fiori horizon theme indicator toggler */}
        <button
          className="period-selector"
          id="theme-toggle-admin"
          onClick={() => setDarkMode(!darkMode)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span id="theme-icon-admin">{themeIcon}</span>
          <span id="theme-text-admin">{themeText}</span>
        </button>

      </div>
    </header>
  );
}
