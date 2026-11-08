import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Server, ArrowRight, ShieldAlert, Cpu, ExternalLink, Sparkles } from 'lucide-react';
import { DEFAULT_SERVERS, getActiveServerOrigin, discoverBestServerOrigin } from '../../services/api';

interface ServerOfflineStandbyProps {
  onRetry: () => void;
  onEnterCachedMode: () => void;
  targetUrl?: string;
}

export const ServerOfflineStandby: React.FC<ServerOfflineStandbyProps> = ({
  onRetry,
  onEnterCachedMode,
  targetUrl,
}) => {
  const currentUrl = targetUrl || getActiveServerOrigin();
  const [customInput, setCustomInput] = useState(currentUrl);
  const [isPinging, setIsPinging] = useState(false);
  const [isAutoDiscovering, setIsAutoDiscovering] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [customError, setCustomError] = useState('');

  const handleAutoDiscover = useCallback(async () => {
    setIsAutoDiscovering(true);
    setIsPinging(true);
    try {
      const best = await discoverBestServerOrigin(1200);
      if (best) {
        setCustomInput(best);
        onRetry();
      }
    } finally {
      setIsAutoDiscovering(false);
      setIsPinging(false);
      setCountdown(5);
    }
  }, [onRetry]);

  // Auto-retry countdown with background discovery attempt
  useEffect(() => {
    if (isPinging || isAutoDiscovering) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleAutoDiscover();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPinging, isAutoDiscovering, handleAutoDiscover]);

  const handleSelectEndpoint = (url: string) => {
    try {
      localStorage.setItem('tinapple_server_url', url);
    } catch {}
    setIsPinging(true);
    setCountdown(6);
    setTimeout(() => {
      onRetry();
      setIsPinging(false);
    }, 500);
  };

  const handleResetToDefault = () => {
    try {
      localStorage.removeItem('tinapple_server_url');
    } catch {}
    setCustomInput(window.location.origin);
    setIsPinging(true);
    setTimeout(() => {
      onRetry();
      setIsPinging(false);
    }, 400);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError('');
    let formatted = customInput.trim();
    if (!formatted) return;
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `http://${formatted}`;
    }
    try {
      const parsed = new URL(formatted);
      // Auto-append port 8088 if plain hostname entered without explicit port
      if (!parsed.port && parsed.hostname !== 'localhost' && !parsed.hostname.endsWith('.ts.net')) {
        parsed.port = '8088';
        formatted = parsed.toString().replace(/\/+$/, '');
      }
      localStorage.setItem('tinapple_server_url', formatted);
      setIsPinging(true);
      setTimeout(() => {
        onRetry();
        setIsPinging(false);
      }, 500);
    } catch {
      setCustomError('Please enter a valid URL (e.g. http://192.168.4.1:8088)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050814]/95 backdrop-blur-2xl text-slate-100 font-sans selection:bg-cyan-500/20">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative max-w-lg w-full bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/50 backdrop-blur-3xl overflow-hidden"
      >
        {/* Top Status Icon & Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <WifiOff className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-wide">Server Not Reachable</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  STANDBY
                </span>
              </div>
              <p className="text-xs text-slate-400">Tinapple appliance control plane is currently offline</p>
            </div>
          </div>
        </div>

        {/* Current Target Pill */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              Target Endpoint
            </span>
            <span className="text-[11px] font-mono text-cyan-300 font-semibold">
              Auto-retry in {countdown}s
            </span>
          </div>
          <div className="font-mono text-sm font-semibold text-slate-200 truncate bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
            {currentUrl}
          </div>
        </div>

        {/* Quick Connection Preset Pills */}
        <div className="space-y-2 mb-6">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Connect Presets
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {DEFAULT_SERVERS.map((srv) => {
              const isSelected = currentUrl.includes(srv.host);
              return (
                <button
                  key={srv.id}
                  onClick={() => handleSelectEndpoint(srv.url)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-sm'
                      : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:border-white/20'
                  }`}
                >
                  <div className="text-[11px] font-bold">{srv.label}</div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">{srv.host}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Server Endpoint Input */}
        <form onSubmit={handleApplyCustom} className="mb-6">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Custom Host or IP
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="http://192.168.4.1:8088"
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all"
            >
              <span>Connect</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {customError && <p className="text-[11px] text-red-400 mt-1.5">{customError}</p>}
        </form>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={() => {
              setIsPinging(true);
              onRetry();
              setTimeout(() => setIsPinging(false), 1200);
            }}
            disabled={isPinging}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-98 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Connecting...' : 'Retry Connection Now'}</span>
          </button>

          <button
            onClick={handleResetToDefault}
            className="w-full sm:w-auto py-3 px-3.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
            title="Clear saved endpoint and auto-detect server origin"
          >
            <span>Reset Default</span>
          </button>

          <button
            onClick={onEnterCachedMode}
            className="w-full sm:w-auto py-3 px-3.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Offline Cache</span>
          </button>
        </div>

        {/* Diagnostics footnote */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400/80" />
            Check AP hotspot or Tailscale VPN
          </span>
          <span className="font-mono text-[10px] text-slate-500">Port :8088</span>
        </div>
      </motion.div>
    </div>
  );
};

export default ServerOfflineStandby;
