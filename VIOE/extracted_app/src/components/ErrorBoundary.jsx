import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Global Error Boundary
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({ errorInfo });

    // TODO: Send to error tracking service (Sentry, etc.)
    // if (import.meta.env.VITE_SENTRY_DSN) {
    //   Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="bg-slate-900/50 border border-red-900/50 rounded-2xl p-8 text-center">
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-950/50 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>

              {/* Title */}
              <h1 className="text-xl font-bold text-white mb-2">
                Something went wrong
              </h1>

              {/* Description */}
              <p className="text-slate-400 mb-6">
                An unexpected error occurred. Our team has been notified and is working on a fix.
              </p>

              {/* Error details (development only) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-6 p-4 bg-slate-950 rounded-lg text-left overflow-auto max-h-40">
                  <p className="text-xs font-mono text-red-400 break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-xs font-mono text-slate-500 mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack.slice(0, 500)}
                    </pre>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            </div>

            {/* Support info */}
            <p className="text-center text-slate-600 text-sm mt-6">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
