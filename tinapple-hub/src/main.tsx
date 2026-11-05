import '@fontsource-variable/roboto-flex';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { api } from './services/api';

// Global uncaught error listener to forward browser & website crashes to Error Logger
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    api.reportClientError({
      message: event.message || 'Unknown browser window error',
      stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
      source: 'window.onerror',
      url: window.location.href,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || 'Unhandled Promise Rejection';
    api.reportClientError({
      message: msg,
      stack: reason?.stack || String(reason),
      source: 'unhandledrejection',
      url: window.location.href,
    });
  });

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
    api.reportClientError({
      message: error.message || 'React ErrorBoundary Exception',
      stack: `${error.stack || ''}\nComponentStack: ${errorInfo.componentStack || ''}`,
      source: 'React ErrorBoundary',
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
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
