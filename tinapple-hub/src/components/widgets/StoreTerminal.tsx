import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal,
  Play,
  RotateCw,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowDownCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { api } from '../../services/api';
import { InstallLogMessage, InstallProgressState } from '../../types/api';

export const StoreTerminal: React.FC = () => {
  const [logs, setLogs] = useState<InstallLogMessage[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [activeApp, setActiveApp] = useState<string>('');
  const [appName, setAppName] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when logs update
  useEffect(() => {
    if (autoScroll && scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isCollapsed]);

  // Initial fetch
  const fetchProgress = useCallback(async () => {
    const data = await api.getInstallProgress();
    if (data) {
      setStatus(data.status);
      setActiveApp(data.activeApp);
      setAppName(data.appName || data.activeApp);
      setLogs(data.logs || []);
    }
  }, []);

  // SSE subscription with polling fallback
  useEffect(() => {
    fetchProgress();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/v1/apps/install/stream');

      eventSource.addEventListener('status', (e: MessageEvent) => {
        try {
          const st: InstallProgressState = JSON.parse(e.data);
          setStatus(st.status);
          setActiveApp(st.activeApp);
          setAppName(st.appName || st.activeApp);
          if (st.logs && st.logs.length > 0) {
            setLogs(st.logs);
          }
        } catch {}
      });

      eventSource.addEventListener('log', (e: MessageEvent) => {
        try {
          const msg: InstallLogMessage = JSON.parse(e.data);
          setLogs((prev) => [...prev, msg]);
          if (status === 'idle') {
            setStatus('running');
          }
        } catch {}
      });

      eventSource.onerror = () => {
        // SSE error, fallback will handle polling
      };
    } catch {
      // EventSource unavailable
    }

    // Polling interval for reassurance or background status changes
    const timer = setInterval(fetchProgress, 3000);

    return () => {
      clearInterval(timer);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [fetchProgress, status]);

  const handleClear = async () => {
    await api.clearInstallLogs();
    setLogs([]);
    setStatus('idle');
    setActiveApp('');
    setAppName('');
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLineClass = (level: string, text: string) => {
    if (level === 'error' || text.toLowerCase().includes('error:') || text.toLowerCase().includes('failed:')) {
      return 'text-rose-400 font-semibold';
    }
    if (level === 'warn' || text.toLowerCase().includes('warning:')) {
      return 'text-amber-400';
    }
    if (level === 'success' || text.includes('SUCCESS') || text.includes('Arming ConditionNeedsUpdate')) {
      return 'text-emerald-400 font-bold';
    }
    if (level === 'command' || text.startsWith('$') || text.startsWith('>>>')) {
      return 'text-tinapple-gold font-bold';
    }
    if (text.includes('downloading...') || text.includes('Total Download Size:')) {
      return 'text-sky-300';
    }
    if (text.includes('installing ') || text.includes('Packages (')) {
      return 'text-purple-300 font-medium';
    }
    return 'text-slate-300';
  };

  return (
    <div className="mt-8 rounded-2xl bg-[#090b10] border border-tinapple-border/90 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Terminal Title Bar */}
      <div className="px-4 py-3 bg-[#11141d] border-b border-tinapple-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Mac-style window dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block shadow-sm" />
          </div>

          <div className="h-4 w-px bg-tinapple-border/80" />

          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-tinapple-gold" />
            <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
              Download & Provisioning Console
            </span>
          </div>

          {/* Status Indicator Badge */}
          {status === 'running' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-semibold animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              DEPLOYING: {appName || activeApp}
            </span>
          )}

          {status === 'success' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              DEPLOYED: {appName || activeApp}
            </span>
          )}

          {status === 'error' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-mono font-semibold">
              <AlertTriangle className="w-3 h-3" />
              DEPLOY FAILED
            </span>
          )}

          {status === 'idle' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              READY
            </span>
          )}
        </div>

        {/* Console Action Controls */}
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <span className="text-[11px] font-mono text-tinapple-muted hidden sm:inline-block mr-1">
              {logs.length} lines
            </span>
          )}

          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 transition-all ${
              autoScroll
                ? 'bg-tinapple-gold/15 text-tinapple-gold border-tinapple-gold/30'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[10px]">Auto-scroll</span>
          </button>

          <button
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors disabled:opacity-40"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleClear}
            disabled={logs.length === 0 && status === 'idle'}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 border border-slate-700 text-xs font-mono transition-colors disabled:opacity-40"
            title="Clear console output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors hidden sm:block"
            title={isExpanded ? 'Restore size' : 'Expand terminal'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors"
            title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      {!isCollapsed && (
        <div
          ref={scrollRef}
          className={`p-4 font-mono text-[11px] md:text-xs leading-relaxed overflow-y-auto select-text bg-[#07090e]/95 transition-all ${
            isExpanded ? 'h-[520px]' : 'h-64'
          }`}
          style={{ scrollBehavior: autoScroll ? 'smooth' : 'auto' }}
        >
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 font-mono space-y-2 py-8">
              <Terminal className="w-8 h-8 text-slate-700" />
              <p className="text-xs text-slate-400">
                tinapple-store:~$ ready for appliance deployment.
              </p>
              <p className="text-[11px] text-slate-600 max-w-md">
                Click &quot;Install&quot; on any appliance package above to monitor real-time pacman downloads, extraction progress, dependencies, and systemd service activation.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2.5 font-mono">
                  <span className="text-slate-600 select-none flex-shrink-0 text-[10px] mt-0.5">
                    [{log.timestamp}]
                  </span>
                  <span className={`break-all ${getLineClass(log.level, log.message)}`}>
                    {log.message}
                  </span>
                </div>
              ))}

              {status === 'running' && (
                <div className="flex items-center gap-2 text-tinapple-gold pt-2 animate-pulse font-mono">
                  <span className="w-1.5 h-3.5 bg-tinapple-gold inline-block" />
                  <span className="text-[11px]">Streaming live package manager output...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
