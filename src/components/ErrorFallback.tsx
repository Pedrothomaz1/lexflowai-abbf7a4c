/**
 * Error Fallback UI Component
 *
 * Displays when an error boundary catches an error.
 * Provides user-friendly message and recovery options.
 *
 * Usage:
 * ```tsx
 * import { ErrorBoundary } from '@/components/ErrorBoundary';
 * import { ErrorFallback } from '@/components/ErrorFallback';
 *
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <Dashboard />
 * </ErrorBoundary>
 * ```
 */

import React from 'react';

interface ErrorFallbackProps {
  error?: Error | null;
  resetErrorBoundary?: () => void;
}

/**
 * Error Fallback Component
 *
 * Shows a user-friendly error message and provides options to recover.
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error }) => {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '16px',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}
      >
        {/* Error Icon */}
        <div
          style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}
        >
          ⚠️
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            color: '#1f2937',
          }}
        >
          Algo deu errado
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '8px 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          Desculpe, encontramos um erro inesperado. Tente recarregar a página ou voltar para a
          página inicial.
        </p>

        {/* Error Details (Dev Mode) */}
        {error && process.env.NODE_ENV === 'development' && (
          <details
            style={{
              marginBottom: '24px',
              padding: '12px',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              border: '1px solid #fee2e2',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <summary style={{ fontWeight: '600', color: '#991b1b', cursor: 'pointer' }}>
              Detalhes do erro
            </summary>
            <pre
              style={{
                fontSize: '12px',
                overflow: 'auto',
                marginTop: '8px',
                color: '#7f1d1d',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
              }}
            >
              {error.message}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleReload}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            Recarregar página
          </button>

          <button
            onClick={handleGoHome}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e5e7eb',
              color: '#1f2937',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#d1d5db')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
          >
            Voltar para home
          </button>
        </div>

        {/* Support Link */}
        <p
          style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '24px',
          }}
        >
          Se o problema persistir,{' '}
          <a
            href="mailto:support@lexflowai.com"
            style={{
              color: '#3b82f6',
              textDecoration: 'none',
            }}
          >
            entre em contato com o suporte
          </a>
        </p>
      </div>
    </div>
  );
};
