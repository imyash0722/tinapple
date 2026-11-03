import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Check,
  Sparkles,
  Download,
  ShieldCheck,
  Server,
  Smartphone,
} from 'lucide-react';
import { api, getActiveServerOrigin } from '../../services/api';
import { AppUpdateService } from '../../services/appUpdate';
import { InstallLogMessage, InstallProgressState } from '../../types/api';

interface SystemUpdatePageProps {
  onClose?: () => void;
  autoStart?: boolean;
}

export const SystemUpdatePage: React.FC<SystemUpdatePageProps> = ({ onClose, autoStart = true }) => {
  const [logs, setLogs] = useState<InstallLogMessage[]>([]);
  const [statusState, setStatusState] = useState<InstallProgressState | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadTotal, setDownloadTotal] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [reloadCountdown, setReloadCountdown] = useState<number | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const isAndroid = AppUpdateService.isNativeAndroid();

  // Scroll terminal on new logs
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle countdown for reload
  useEffect(() => {
    if (reloadCountdown === null) return;
    if (reloadCountdown <= 0) {
      window.location.reload();
      return;
    }
    const timer = setTimeout(() => {
      setReloadCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [reloadCountdown]);

  // Connect to SSE stream
  useEffect(() => {
    const unsubscribe = api.subscribeInstallStream(
      (log) => {
        setLogs((prev) => [...prev, log]);
      },
      (st) => {
        setStatusState(st);
        if (st.status === 'running') {
          setIsUpdating(true);
        } else if (st.status === 'success') {
          setIsUpdating(false);
          setIsCompleted(true);
          setReloadCountdown(4);
        } else if (st.status === 'error') {
          setIsUpdating(false);
          setErrorMsg(st.appId ? `Failed during ${st.appId}` : 'Update process encountered an error');
        }
      }
    );

    // Initial check
    api.getInstallProgress().then((st) => {
      if (st) {
        setStatusState(st);
        if (st.status === 'running') setIsUpdating(true);
        if (st.status === 'success') setIsCompleted(true);
        if (st.logs && st.logs.length > 0) {
          setLogs(st.logs);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleStartUpdate = useCallback(async () => {
    setIsUpdating(true);
    setIsCompleted(false);
    setErrorMsg(null);
    setLogs([
      {
        id: `log-${Date.now()}`,
        level: 'command',
        message: '>>> Initiating Tinapple OS and Client update pipeline...',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    if (isAndroid) {
      // Android APK update path
      try {
        const base = getActiveServerOrigin();
        const apkUrl = `${base}/tinapple-client.apk`;
        setLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}`,
            level: 'info',
            message: `Connecting to APK download server: ${apkUrl}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);

        const res = await AppUpdateService.installApk(apkUrl, (progress) => {
          setDownloadProgress(progress);
        });

        if (res.success) {
          setLogs((prev) => [
            ...prev,
            {
              id: `log-${Date.now()}`,
              level: 'success',
              message: '✓ APK downloaded successfully. Android Package Installer launched.',
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
          setIsUpdating(false);
          setIsCompleted(true);
        } else {
          setErrorMsg(res.error || res.status);
          setIsUpdating(false);
          setLogs((prev) => [
            ...prev,
            {
              id: `log-${Date.now()}`,
              level: 'error',
              message: `Update notice: ${res.error || res.status}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Download failed');
        setIsUpdating(false);
      }
      return;
    }

    // Web & Server update path
    try {
      const res = await api.runSystemUpdate();
      if (!res.ok) {
        setErrorMsg(res.error || 'Failed to initiate update');
        setIsUpdating(false);
        setLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}`,
            level: 'error',
            message: `Update execution error: ${res.error}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Network request failed');
      setIsUpdating(false);
    }
  }, [isAndroid]);

  // Auto-start on mount if requested
  useEffect(() => {
    if (autoStart && !isUpdating && !isCompleted) {
      handleStartUpdate();
    }
  }, [autoStart, handleStartUpdate, isCompleted, isUpdating]);

  const handleCopyLogs = () => {
    const raw = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050814] text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Standby Notice Bar */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-amber-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="font-bold tracking-wider uppercase">System in Updating Standby Mode</span>
          <span className="text-amber-400/60 hidden sm:inline">— Operations paused until update finishes</span>
        </div>
        {onClose && !isUpdating && (
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 sm:p-6 overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <RefreshCw className={`w-6 h-6 ${isUpdating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {isAndroid ? 'Android Companion Update' : 'Tinapple OS & Feature Update'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {isAndroid ? 'APK' : 'PACMAN / PARU'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAndroid
                  ? 'Downloading latest Android package and launching package installer'
                  : 'Synchronizing system appliances, Git repository, and systemd units'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isUpdating && (
              <button
                onClick={handleStartUpdate}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restart Update</span>
              </button>
            )}

            <button
              onClick={handleCopyLogs}
              className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Logs'}</span>
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-emerald-300 text-xs font-mono"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-white text-sm">Update Complete!</span>
                <p className="text-emerald-400/80 mt-0.5">
                  {isAndroid
                    ? 'Android Package Installer has opened. Confirm installation on your phone.'
                    : `System fully updated. Reloading dashboard in ${reloadCountdown ?? 3}s...`}
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
            >
              Reload Now
            </button>
          </motion.div>
        )}

        {errorMsg && (
          <div className="mb-4 p-4 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs font-mono">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-white">Update Error</span>
              <p className="text-red-400/80 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Android Download Progress Bar */}
        {isAndroid && isUpdating && (
          <div className="mb-4 p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30">
            <div className="flex items-center justify-between text-xs text-slate-300 font-mono mb-2">
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                Downloading APK Package
              </span>
              <span className="font-bold text-cyan-400">{downloadProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Real-time Streaming Terminal */}
        <div className="flex-1 flex flex-col rounded-2xl bg-[#030610] border border-cyan-500/20 shadow-2xl overflow-hidden font-mono text-xs">
          {/* Terminal Titlebar */}
          <div className="bg-slate-900/80 px-4 py-2.5 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-slate-300">Live Transaction Terminal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{isUpdating ? 'STREAMING' : 'IDLE'}</span>
            </div>
          </div>

          {/* Logs Output Body */}
          <div ref={terminalRef} className="flex-1 p-4 overflow-y-auto space-y-1 select-text">
            {logs.length === 0 ? (
              <div className="text-slate-500 italic py-8 text-center">
                Waiting for transaction stream to initialize...
              </div>
            ) : (
              logs.map((l, idx) => {
                let colorClass = 'text-slate-300';
                if (l.level === 'error') colorClass = 'text-red-400 font-semibold';
                else if (l.level === 'success') colorClass = 'text-emerald-400 font-semibold';
                else if (l.level === 'command') colorClass = 'text-cyan-400 font-semibold';
                else if (l.level === 'warn') colorClass = 'text-amber-400';

                return (
                  <div key={l.id || idx} className="leading-relaxed flex items-start gap-2">
                    {l.timestamp && (
                      <span className="text-slate-600 select-none flex-shrink-0 text-[10px]">
                        [{l.timestamp}]
                      </span>
                    )}
                    <span className={`break-all ${colorClass}`}>{l.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemUpdatePage;
