/**
 * Error Boundary Component
 *
 * Catches React errors anywhere in the component tree and displays a fallback UI.
 * Logs errors for monitoring/debugging.
 *
 * Usage:
 * ```tsx
 * import { ErrorBoundary } from '@/components/ErrorBoundary';
 * import { ErrorFallback } from '@/components/ErrorFallback';
 *
 * // Wrap a component tree
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <Dashboard />
 * </ErrorBoundary>
 *
 * // Or use the HOC
 * export default withErrorBoundary(Dashboard);
 * ```
 */

import React from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary class component
 *
 * Note: Error Boundaries are class components in React.
 * They cannot be function components.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so next render will show fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console (replace with error tracking service in production)
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // TODO: Send error to Sentry, LogRocket, or similar
    // Example:
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback (minimal UI)
 */
const DefaultErrorFallback: React.FC<{ error: Error | null }> = ({ error }) => (
  <div
    style={{
      padding: '24px',
      backgroundColor: '#fecaca',
      borderRadius: '8px',
      textAlign: 'center',
    }}
  >
    <h2 style={{ color: '#991b1b' }}>Algo deu errado</h2>
    <p style={{ color: '#7f1d1d', marginBottom: '12px' }}>
      {error?.message || 'Erro desconhecido'}
    </p>
    <button
      onClick={() => window.location.reload()}
      style={{
        padding: '8px 16px',
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      Recarregar página
    </button>
  </div>
);

/**
 * HOC: Wrap any component with error boundary
 *
 * Usage:
 * ```tsx
 * function Dashboard() { ... }
 * export default withErrorBoundary(Dashboard);
 * ```
 *
 * Or with custom fallback:
 * ```tsx
 * export default withErrorBoundary(Dashboard, {
 *   fallback: <ErrorFallback />,
 * });
 * ```
 */
interface WithErrorBoundaryOptions {
  fallback?: ReactNode;
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: WithErrorBoundaryOptions
): React.FC<P> {
  return (props: P) => (
    <ErrorBoundary fallback={options?.fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
}
