import React, { useState, useEffect, useRef } from 'react';

export default function DialogSystem({ dialogState, onConfirm, onCancel, showToast }) {
  if (!dialogState || !dialogState.isOpen) return null;

  const {
    type,
    title,
    message,
    inputVal: initialInputVal = '',
    paymentAmount = 0,
    paymentInvoiceNumber = '',
  } = dialogState;

  // Custom alert/confirm/prompt input
  const [inputVal, setInputVal] = useState(initialInputVal);
  const [inputError, setInputError] = useState(false);

  // Payment state
  const [paymentStep, setPaymentStep] = useState(0); // 0: Select, 1: Card, 2: OTP
  const [paymentMethod, setPaymentMethod] = useState('CARTE');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpMonth, setCardExpMonth] = useState('');
  const [cardExpYear, setCardExpYear] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState(false);

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (paymentStep === 2 && otpRefs[0].current) {
      otpRefs[0].current.focus();
    }
  }, [paymentStep]);

  const handleCardNumberChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').substring(0, 16);
    v = v.match(/.{1,4}/g)?.join(' ') || v;
    setCardNumber(v);
  };

  const handleCardNameChange = (e) => {
    setCardName(e.target.value.toUpperCase());
  };

  const handleOtpChange = (value, idx) => {
    const newOtp = [...otp];
    newOtp[idx] = value.substring(0, 1);
    setOtp(newOtp);
    if (value && idx < 5) {
      otpRefs[idx + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      const newOtp = [...otp];
      newOtp[idx - 1] = '';
      setOtp(newOtp);
      otpRefs[idx - 1].current.focus();
    }
  };

  const handleConfirmClick = () => {
    if (type === 'prompt') {
      const trimmed = inputVal.trim();
      if (!trimmed) {
        setInputError(true);
        return;
      }
      setInputError(false);
      onConfirm(trimmed);
    } else {
      onConfirm(true);
    }
  };

  const handlePaymentSelectNext = () => {
    if (paymentMethod === 'ESPECES') {
      onConfirm('ESPECES');
    } else {
      setPaymentStep(1);
    }
  };

  const handleCardNext = () => {
    const rawCardNum = cardNumber.replace(/\s/g, '');
    const cleanCardName = cardName.trim();
    const cleanCvv = cardCvv.trim();

    if (rawCardNum.length !== 16) {
      showToast('error', 'Champs invalides', 'Le numéro de carte doit contenir 16 chiffres.');
      return;
    }
    if (!cleanCardName) {
      showToast('error', 'Champs invalides', 'Veuillez saisir le nom du titulaire.');
      return;
    }
    if (!cardExpMonth || !cardExpYear) {
      showToast('error', 'Champs invalides', "Veuillez choisir la date d'expiration.");
      return;
    }
    if (cleanCvv.length !== 3) {
      showToast('error', 'Champs invalides', 'Le code CVV doit contenir 3 chiffres.');
      return;
    }

    const month = parseInt(cardExpMonth, 10);
    const year = parseInt('20' + cardExpYear, 10);
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    if (month < 1 || month > 12) {
      showToast('error', 'Champs invalides', "Mois d'expiration invalide (01 à 12).");
      return;
    }
    if (year < curYear || (year === curYear && month < curMonth)) {
      showToast('error', 'Carte expirée', 'Carte expirée. Veuillez utiliser une carte valide.');
      return;
    }

    setPaymentStep(2);
  };

  const handleOtpConfirm = () => {
    const finalOtp = otp.join('');
    if (finalOtp !== '123456') {
      setOtpError(true);
      return;
    }
    setOtpError(false);
    onConfirm('CARTE');
  };

  // 10 years helper
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let i = 0; i <= 10; i++) {
    const yr = String(currentYear + i).slice(-2);
    yearOptions.push(yr);
  }

  const monthOptions = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  if (type === 'payment') {
    return (
      <div id="payment-dialog-overlay" className="dialog-overlay" style={{ display: 'flex' }}>
        <div className="dialog-box" style={{ maxWidth: '450px' }}>
          
          {/* STEP 0: Select payment method */}
          {paymentStep === 0 && (
            <div id="admin-pay-step-select">
              <h3>💵 Méthode de paiement</h3>
              <p>Sélectionnez le mode de règlement pour la facture fournisseur N° <strong id="payment-invoice-num">{paymentInvoiceNumber}</strong>.</p>
              <div style={{ background: 'var(--input-bg)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Montant total :</span>
                <strong style={{ fontSize: '1rem', color: 'var(--accent)' }} id="payment-invoice-amount">
                  {new Intl.NumberFormat('fr-FR').format(paymentAmount)} DA
                </strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>Mode de règlement :</label>
                <select 
                  id="payment-method-select" 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="CARTE">Carte Interbancaire (CIB / Dahabia)</option>
                  <option value="ESPECES">Espèces (Règlement Physique)</option>
                </select>
              </div>
              <div className="dialog-actions">
                <button className="btn-dialog-secondary" id="payment-select-cancel" onClick={onCancel}>
                  Annuler
                </button>
                <button className="btn-dialog-primary" id="payment-select-next" onClick={handlePaymentSelectNext}>
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Card information */}
          {paymentStep === 1 && (
            <div id="admin-pay-step-card">
              <h3>💳 Saisie Carte CIB / Dahabia</h3>
              <p style={{ marginBottom: '12px' }}>Simulation sécurisée du portail de paiement SATIM.</p>
              
              {/* Card visualizer */}
              <div className="payment-card-visual">
                <div className="card-chip" />
                <div className="card-number-display" id="admin-cardNumDisplay">
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>
                <div className="card-info-row">
                  <div>
                    <div style={{ fontSize: '8px', textTransform: 'uppercase' }}>Titulaire</div>
                    <div id="admin-cardNameDisplay" style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>
                      {cardName || 'NOM DU TITULAIRE'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '8px', textTransform: 'uppercase' }}>Expire</div>
                    <div id="admin-cardExpDisplay" style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>
                      {cardExpMonth && cardExpYear ? `${cardExpMonth}/${cardExpYear}` : 'MM/AA'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Form Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <div>
                  <input 
                    type="text" 
                    id="admin-cardNumber" 
                    placeholder="Numéro de carte (16 chiffres)" 
                    value={cardNumber} 
                    onChange={handleCardNumberChange} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <input 
                    type="text" 
                    id="admin-cardName" 
                    placeholder="NOM DU TITULAIRE" 
                    value={cardName} 
                    onChange={handleCardNameChange} 
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    id="admin-cardExpMonth" 
                    value={cardExpMonth} 
                    onChange={(e) => setCardExpMonth(e.target.value)} 
                    style={{ flex: 1 }}
                  >
                    <option value="">Mois</option>
                    {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select 
                    id="admin-cardExpYear" 
                    value={cardExpYear} 
                    onChange={(e) => setCardExpYear(e.target.value)} 
                    style={{ flex: 1 }}
                  >
                    <option value="">Année</option>
                    {yearOptions.map(y => <option key={y} value={y}>{`20${y}`}</option>)}
                  </select>
                  <input 
                    type="password" 
                    id="admin-cardCvv" 
                    placeholder="CVV" 
                    maxLength={3} 
                    value={cardCvv} 
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))} 
                    style={{ width: '70px', textAlign: 'center' }}
                  />
                </div>
              </div>

              <div className="dialog-actions">
                <button className="btn-dialog-secondary" id="payment-card-back" onClick={() => setPaymentStep(0)}>
                  Retour
                </button>
                <button className="btn-dialog-primary" id="payment-card-next" onClick={handleCardNext}>
                  Valider la carte
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: OTP Verification */}
          {paymentStep === 2 && (
            <div id="admin-pay-step-otp">
              <h3>🔒 Code OTP reçu</h3>
              <p>Un code temporaire a été simulé. Entrez le code standard <strong style={{ color: 'var(--accent)' }}>123456</strong> pour confirmer la transaction.</p>
              
              <div className="otp-inputs">
                {otp.map((digit, idx) => (
                  <input 
                    key={idx}
                    type="text" 
                    id={`admin-otp${idx}`} 
                    className="otp-input" 
                    maxLength={1} 
                    value={digit}
                    ref={otpRefs[idx]}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  />
                ))}
              </div>

              {otpError && (
                <div id="admin-otpError" style={{ color: 'var(--accent-red)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '12px', fontWeight: 600 }}>
                  ❌ Code OTP incorrect. Veuillez réessayer.
                </div>
              )}

              <div className="dialog-actions">
                <button className="btn-dialog-secondary" id="payment-otp-back" onClick={() => setPaymentStep(1)}>
                  Retour
                </button>
                <button className="btn-dialog-primary" id="payment-otp-confirm" onClick={handleOtpConfirm}>
                  Confirmer le paiement
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // STANDARD ALERT / CONFIRM / PROMPT DIALOGS
  return (
    <div id="custom-dialog-overlay" className="dialog-overlay" style={{ display: 'flex' }}>
      <div className="dialog-box">
        <h3 id="dialog-title">{title}</h3>
        <p id="dialog-message">{message}</p>
        
        {type === 'prompt' && (
          <div id="dialog-prompt-container" style={{ marginBottom: '16px' }}>
            <input 
              type="text" 
              id="dialog-input" 
              value={inputVal} 
              onChange={(e) => setInputVal(e.target.value)} 
              style={{ 
                width: '100%', 
                border: inputError ? '1px solid var(--accent-red)' : '1px solid var(--border)' 
              }}
              placeholder="Saisissez votre motif..."
              autoFocus
            />
          </div>
        )}

        <div className="dialog-actions">
          {type !== 'alert' && (
            <button className="btn-dialog-secondary" id="dialog-cancel" onClick={onCancel}>
              Annuler
            </button>
          )}
          <button className="btn-dialog-primary" id="dialog-confirm" onClick={handleConfirmClick}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
