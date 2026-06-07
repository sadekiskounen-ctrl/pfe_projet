import React from 'react';

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div id="toast-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast toast-${toast.type}`}
        >
          <span className="toast-icon">
            {toast.type === 'success' && '✅'}
            {toast.type === 'error' && '❌'}
            {toast.type === 'warning' && '⚠️'}
            {toast.type === 'info' && 'ℹ️'}
          </span>
          <div className="toast-body">
            {toast.title && <div className="toast-title">{toast.title}</div>}
            <div className="toast-message">{toast.message}</div>
          </div>
          <button 
            className="toast-close" 
            onClick={() => removeToast(toast.id)}
          >
            ✕
          </button>
          <div 
            className="toast-progress" 
            style={{ animationDuration: `${toast.duration || 4000}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
