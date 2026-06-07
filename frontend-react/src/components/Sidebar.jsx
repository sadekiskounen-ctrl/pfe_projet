import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, counts, onLogout }) {
  const menuItems = [
    {
      id: 'overview',
      label: "Vue d'ensemble",
      dotId: 'overviewDot',
      badgeId: 'overview-badge',
      badgeCount: 0,
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M3 3v18h18M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
      )
    },
    {
      id: 'partners',
      label: 'Clients',
      dotId: 'partnersDot',
      badgeId: 'partners-badge',
      badgeCount: 0,
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      id: 'suppliers',
      label: 'Fournisseurs',
      dotId: 'suppliersDot',
      badgeId: 'suppliers-badge',
      badgeCount: 0,
      icon: (
        <svg viewBox="0 0 24 24">
          <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      )
    },
    {
      id: 'registrations',
      label: 'Inscriptions',
      dotId: 'regDot',
      badgeId: 'reg-alert-badge',
      badgeCount: counts.registrations || 0,
      dotClass: 'dot-red',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    {
      id: 'commandes',
      label: 'Bons de Commande',
      dotId: 'cmdDot',
      badgeId: 'cmd-alert-badge',
      badgeCount: counts.commandes || 0,
      dotClass: 'dot-orange',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )
    },
    {
      id: 'factures',
      label: 'Factures',
      dotId: 'facDot',
      badgeId: 'fac-alert-badge',
      badgeCount: counts.factures || 0,
      dotClass: 'dot-green',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    {
      id: 'catalogue',
      label: 'Catalogue Produits',
      dotId: 'catDot',
      badgeId: 'cat-alert-badge',
      badgeCount: counts.catalogue || 0,
      dotClass: 'dot-orange',
      icon: (
        <svg viewBox="0 0 24 24">
          <polyline points="21 16 12 21 3 16 12 11 21 16" />
          <polyline points="21 7.5 12 12.5 3 7.5 12 2.5 21 7.5" />
          <line x1="12" y1="22.5" x2="12" y2="12.5" />
          <line x1="12" y1="12" x2="12" y2="2.5" />
          <line x1="3" y1="7.6" x2="3" y2="16.1" />
          <line x1="21" y1="7.6" x2="21" y2="16.1" />
        </svg>
      )
    },
    {
      id: 'devis',
      label: 'Demandes de Devis',
      dotId: 'devisDot',
      badgeId: 'devis-alert-badge',
      badgeCount: counts.devis || 0,
      dotClass: 'dot-orange',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    {
      id: 'rfqs',
      label: "Appels d'offres (RFQ)",
      dotId: 'rfqDot',
      badgeId: 'rfq-alert-badge',
      badgeCount: counts.rfqs || 0,
      dotClass: 'dot-blue',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M11 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2m-8-9a3 3 0 0 0 3 3h4V6H6a3 3 0 0 0-3 3Zm16-3.8c.8.8.8 2 0 2.8m2-6.8a8.5 8.5 0 0 1 0 10.8" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Paramètres',
      dotId: 'settingsDot',
      badgeId: 'settings-badge',
      badgeCount: 0,
      icon: (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    }
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/images/logo_round.png" alt="Bridgify Cloud Logo" onError={(e) => { e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563EB"><circle cx="12" cy="12" r="10"/></svg>' }} />
        <div className="brand-meta">
          <span className="brand-name">Bridgify Cloud</span>
          <span className="admin-badge">ADMINISTRATEUR</span>
        </div>
      </div>

      <nav className="nav-menu">
        {menuItems.map(item => {
          const isActive = activeTab === item.id;
          const showDot = item.badgeCount > 0;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              id={`nav-${item.id}`}
              className={`nav-item ${isActive ? 'active' : ''} ${showDot ? 'has-notif' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(item.id);
              }}
            >
              {/* Pulse Notification Dot */}
              <span 
                id={item.dotId} 
                className={`noti-dot ${item.dotClass || ''}`} 
                style={{ display: showDot ? 'block' : 'none' }}
              />
              
              <span className="nav-icon">
                {item.icon}
              </span>
              
              <span className="nav-text">{item.label}</span>
              
              {/* Badge Count on Hover/Expanded */}
              {item.badgeCount > 0 && (
                <span 
                  id={item.badgeId} 
                  className={`noti-badge noti-badge-pulse ${item.dotClass || 'dot-blue'}`}
                >
                  {item.badgeCount}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      <div 
        className="nav-item" 
        onClick={onLogout}
        style={{ marginTop: 'auto', color: 'var(--accent-red)' }}
      >
        <span className="nav-icon">
          <svg viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </span>
        <span className="nav-text" style={{ fontWeight: 600 }}>Déconnexion</span>
      </div>

      <div className="sidebar-footer">
        Bridgify Cloud v2.4
      </div>
    </aside>
  );
}
