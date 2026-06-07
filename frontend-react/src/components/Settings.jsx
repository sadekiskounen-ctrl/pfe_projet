import React, { useState, useEffect } from 'react';

export default function Settings({ darkMode, setDarkMode, showToast }) {
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('admin@bridgify.com');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const p = JSON.parse(localStorage.getItem('admin_profile'));
    if (p) {
      setUsername(p.username || 'admin');
      setEmail(p.email || 'admin@bridgify.com');
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    const newErrors = {};
    const cleanUser = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUser) {
      newErrors.username = "Le nom d'utilisateur est requis.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      newErrors.email = 'Veuillez saisir une adresse email valide.';
    }

    if (password && password.length < 6) {
      newErrors.password = 'Le mot de passe doit comporter au moins 6 caractères.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const profile = { username: cleanUser, email: cleanEmail, password };
    localStorage.setItem('admin_profile', JSON.stringify(profile));
    showToast('success', 'Profil mis à jour', 'Vos modifications de profil ont été enregistrées.');
  };

  return (
    <div className="view-section active" id="settings">
      <div 
        className="top-card" 
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '30px',
        }}
      >
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
          ⚙️ Paramètres du Système
        </h3>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '25px' }}>
          Gérez vos informations de compte administrateur et configurez les préférences visuelles du portail.
        </p>

        <form id="profile-form" onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            
            {/* Username */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Nom d'utilisateur *
              </label>
              <input
                type="text"
                id="admin-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ border: errors.username ? '1px solid var(--accent-red)' : '1px solid var(--border)' }}
              />
              {errors.username && (
                <span className="field-error-msg" style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '2px' }}>
                  {errors.username}
                </span>
              )}
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Adresse e-mail *
              </label>
              <input
                type="text"
                id="admin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ border: errors.email ? '1px solid var(--accent-red)' : '1px solid var(--border)' }}
              />
              {errors.email && (
                <span className="field-error-msg" style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '2px' }}>
                  {errors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Nouveau mot de passe (Laissez vide pour conserver l'actuel)
              </label>
              <input
                type="password"
                id="admin-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ border: errors.password ? '1px solid var(--accent-red)' : '1px solid var(--border)' }}
              />
              {errors.password && (
                <span className="field-error-msg" style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '2px' }}>
                  {errors.password}
                </span>
              )}
            </div>

            {/* Dark Mode Theme Toggle */}
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'var(--input-bg)',
                borderRadius: '12px',
                marginTop: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  Mode Sombre (Evening Horizon)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Activez le thème sombre SAP Fiori Horizon pour travailler de nuit.
                </span>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  id="darkmode-toggle"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <span className="slider-toggle" />
              </label>
            </div>

          </div>

          <button
            type="submit"
            className="btn-action"
            style={{ width: '100%', padding: '14px', background: 'var(--accent)', color: 'white', fontWeight: 700, borderRadius: '8px', fontSize: '0.95rem' }}
          >
            💾 Sauvegarder les modifications
          </button>
        </form>
      </div>
    </div>
  );
}
