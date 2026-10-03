import React from 'react';

/** Neutral browser-style failure screen. No branding, no support CTAs. */
export function BootFailure() {
  return (
    <div
      style={{
        minHeight: '100vh',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        color: '#202124',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 480, width: '100%' }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 400,
            lineHeight: 1.4,
            margin: '0 0 12px',
          }}
        >
          No se pudo abrir esta página
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: '#5f6368',
            margin: '0 0 8px',
          }}
        >
          Ha ocurrido un error al cargar el contenido. Inténtalo de nuevo más
          tarde.
        </p>
        <p
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            color: '#80868b',
            margin: 0,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          ERR_FAILED
        </p>
      </div>
    </div>
  );
}
