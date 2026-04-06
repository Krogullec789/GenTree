import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * React Error Boundary — catches render errors in the component tree.
 * Must be a class component (hooks cannot handle componentDidCatch).
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-gradient)',
          color: 'var(--text-primary)',
          gap: '24px',
          padding: '32px',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <AlertTriangle size={40} color="#ef4444" />
          </div>

          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
              Coś poszło nie tak
            </h1>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>
              Wystąpił nieoczekiwany błąd aplikacji. Spróbuj odświeżyć stronę.
              Twoje dane zostały zapisane przed wystąpieniem błędu.
            </p>
            {this.state.error && (
              <code style={{
                display: 'block',
                marginTop: '16px',
                background: 'rgba(0,0,0,0.3)',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#f87171',
                maxWidth: '500px',
                wordBreak: 'break-all',
                textAlign: 'left',
                lineHeight: 1.5,
              }}>
                {this.state.error.message}
              </code>
            )}
          </div>

          <button
            className="btn"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={18} />
            Odśwież stronę
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
