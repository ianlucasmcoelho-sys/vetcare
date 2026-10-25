import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ [ErrorBoundary capturou uma falha de UI]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg-primary, #0f172a)',
          color: 'var(--text-primary, #f8fafc)',
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--bg-card, #1e293b)',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: '36px 28px',
            boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.3))',
            border: '1px solid var(--border-color, #334155)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐾⚠️</div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '10px' }}>
              Algo não saiu como esperado
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '24px', lineHeight: '1.5' }}>
              Ocorreu uma falha temporária na interface. Não se preocupe, seus dados estão salvos com segurança.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm, 8px)',
                  background: 'var(--primary, #14b8a6)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background 0.2s'
                }}
              >
                Recarregar Página
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm, 8px)',
                  background: 'transparent',
                  color: 'var(--text-secondary, #94a3b8)',
                  border: '1px solid var(--border-color, #334155)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Ir para o Início
              </button>
            </div>

            {this.state.error && (
              <details style={{ marginTop: '24px', textAlign: 'left', fontSize: '12px', color: '#ef4444' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-muted, #64748b)' }}>Detalhes técnicos</summary>
                <pre style={{ marginTop: '8px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflowX: 'auto' }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
