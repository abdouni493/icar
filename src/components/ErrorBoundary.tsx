import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Rendu de repli personnalisé (ex. message discret au lieu du plein écran). */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Garde-fou global de l'application.
 *
 * Sans cette barrière, la moindre exception levée pendant le rendu d'un
 * composant démonte tout l'arbre React → page blanche sans aucune indication.
 * Ici, on affiche à la place un message lisible + un bouton de rechargement,
 * et on journalise l'erreur dans la console pour le diagnostic.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Journalisation (visible dans la console du navigateur / les logs d'hébergeur).
    console.error('[ErrorBoundary] Une erreur a interrompu le rendu :', error, info);
  }

  private handleReload = () => {
    try { window.location.reload(); } catch { /* ignore */ }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback !== undefined) return this.props.fallback;

    const msg = this.state.error?.message || 'Erreur inconnue';

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0A0A08',
          color: '#F5F0E1',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 20px',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(200,161,60,0.12)',
              border: '1px solid rgba(200,161,60,0.4)',
              fontSize: 30,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px', color: '#D4AF37' }}>
            Une erreur est survenue
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#9C947E', margin: '0 0 20px' }}>
            L&apos;application a rencontré un problème inattendu. Rechargez la page ; si le
            problème persiste, contactez le support.
          </p>

          <pre
            style={{
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 12,
              color: '#C6BDA6',
              background: '#121109',
              border: '1px solid rgba(200,161,60,0.2)',
              borderRadius: 12,
              padding: '12px 14px',
              margin: '0 0 20px',
              maxHeight: 180,
              overflow: 'auto',
            }}
          >
            {msg}
          </pre>

          <button
            onClick={this.handleReload}
            style={{
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
              padding: '12px 28px',
              borderRadius: 12,
              color: '#14130E',
              border: 'none',
              background: 'linear-gradient(135deg, #E4C878, #B8912E)',
              boxShadow: '0 6px 20px rgba(200,161,60,0.35)',
            }}
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }
}
