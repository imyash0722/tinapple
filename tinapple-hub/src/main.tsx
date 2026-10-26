import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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
                localStorage.removeItem('tinapple_theme_settings');
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
