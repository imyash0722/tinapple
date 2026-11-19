import '@fontsource-variable/roboto-flex';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { api } from './services/api';

// Global uncaught error listener to forward browser & website crashes to Error Logger
const CLIENT_ERRORS_KEY = 'tinapple_client_errors';

function persistClientError(err: { message: string; stack?: string; source: string; url?: string }) {
  try {
    const raw = localStorage.getItem(CLIENT_ERRORS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const item = {
      ...err,
      id: `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    // Deduplicate within 5 seconds and keep last 50 items
    const updated = [
      item,
      ...existing.filter(
        (e: any) => e.message !== err.message || Date.now() - new Date(e.timestamp).getTime() > 5000
      ),
    ].slice(0, 50);
    localStorage.setItem(CLIENT_ERRORS_KEY, JSON.stringify(updated));
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const errObj = {
      message: event.message || 'Unknown browser window error',
      stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
      source: 'window.onerror',
      url: window.location.href,
    };
    persistClientError(errObj);
    api.reportClientError(errObj).catch(() => {});
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || 'Unhandled Promise Rejection';
    const errObj = {
      message: msg,
      stack: reason?.stack || String(reason),
      source: 'unhandledrejection',
      url: window.location.href,
    };
    persistClientError(errObj);
    api.reportClientError(errObj).catch(() => {});
  });

  // Intercept console.error to capture runtime frontend anomalies and warnings
  const originalConsoleError = console.error;
  let isInterceptingConsoleError = false;

  console.error = function (...args: any[]) {
    originalConsoleError.apply(console, args);
    if (isInterceptingConsoleError) return;

    try {
      isInterceptingConsoleError = true;
      const msg = args
        .map((a) => (typeof a === 'object' ? a?.message || JSON.stringify(a) : String(a)))
        .join(' ');

      // Filter out internal reporting loops, React ErrorBoundary re-logs, and harmless network polling noise
      if (
        !msg ||
        msg.startsWith('Tinapple Hub Uncaught Error:') ||
        msg.includes('tinapple_client_errors') ||
        msg.includes('/api/v1/system/errors/client') ||
        msg.includes('Failed to load resource')
      ) {
        return;
      }

      const stack = args.find((a) => a instanceof Error)?.stack || new Error().stack;
      const errObj = {
        message: msg.slice(0, 500),
        stack: stack?.slice(0, 1000),
        source: 'console.error',
        url: window.location.href,
      };
      persistClientError(errObj);
      api.reportClientError(errObj).catch(() => {});
    } catch {
      // Ignore errors inside console.error handler
    } finally {
      isInterceptingConsoleError = false;
    }
  };

  // Register Service Worker for offline PWA cache stack
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update();
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Tinapple Hub Uncaught Error:', error, errorInfo);
    const errObj = {
      message: error.message || 'React ErrorBoundary Exception',
      stack: `${error.stack || ''}\nComponentStack: ${errorInfo.componentStack || ''}`,
      source: 'React ErrorBoundary',
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
    persistClientError(errObj);
    api.reportClientError(errObj).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050a16] text-white flex items-center justify-center p-6 font-mono">
          <div className="max-w-lg w-full p-6 rounded-2xl bg-slate-900/90 border border-red-500/30 shadow-2xl backdrop-blur-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto mb-4 flex items-center justify-center text-xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Tinapple Hub Encountered an Error</h2>
            <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/20 rounded-lg p-3 mb-4 text-left overflow-x-auto whitespace-pre-wrap">
              {this.state.error?.message || 'Unknown render failure'}
            </p>
            <button
              onClick={() => {
                try {
                  const keysToRemove: string[] = [];
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('tinapple_') || key.startsWith('homarr_'))) {
                      keysToRemove.push(key);
                    }
                  }
                  keysToRemove.forEach((k) => localStorage.removeItem(k));
                } catch (e) {
                  console.error('Failed to clear cache', e);
                }
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
            >
              Reset Cache & Reload Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
