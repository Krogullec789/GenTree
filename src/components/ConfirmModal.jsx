import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Accessible confirmation modal — replaces window.confirm().
 * Supports keyboard: Enter to confirm, Escape to cancel.
 */
const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Potwierdź',
  danger = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        className="glass"
        style={{
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          animation: 'modalIn 0.2s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div style={{
            background: danger ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
            borderRadius: '50%',
            width: '46px',
            height: '46px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <AlertTriangle size={22} color={danger ? '#ef4444' : '#3b82f6'} />
          </div>
          <h3 id="confirm-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
            {title}
          </h3>
        </div>

        <p style={{ margin: '0 0 28px 0', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '14px' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn secondary" onClick={onCancel}>
            <X size={16} /> Anuluj
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            autoFocus
            style={danger ? {
              backgroundColor: 'rgba(239,68,68,0.2)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.5)',
            } : {}}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
