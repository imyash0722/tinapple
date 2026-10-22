import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Server,
  Key,
  RefreshCw,
  Play,
  Square,
  AlertCircle,
  X,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { api } from '../../services/api';
import { AppBrandIcon } from '../common/AppBrandIcons';

interface PlayitTunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayitTunnelModal: React.FC<PlayitTunnelModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<{
    installed: boolean;
    running: boolean;
    configured: boolean;
    claimUrl?: string;
    claimCode?: string;
    publicAddress?: string;
    secretPath: string;
    lastLog?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const data = await api.getPlayitStatus();
      setStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      const interval = setInterval(loadStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateClaim = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await api.generatePlayitClaim();
      if (res && res.claimUrl) {
        setActionMessage('Claim URL generated! Open it to register your server tunnel.');
        await loadStatus();
      }
    } catch {
      setActionMessage('Failed to generate claim URL');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySecret = async () => {
    if (!secretInput.trim()) return;
    setLoading(true);
    setActionMessage(null);
    try {
      const ok = await api.setPlayitSecret(secretInput.trim());
      if (ok) {
        setActionMessage('Secret applied and tunnel agent started successfully!');
        setSecretInput('');
        await loadStatus();
      } else {
        setActionMessage('Failed to apply secret');
      }
    } catch {
      setActionMessage('Error setting secret');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    await api.startPlayit();
    await loadStatus();
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    await api.stopPlayit();
    await loadStatus();
    setLoading(false);
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset your Playit tunnel agent credentials?')) return;
    setLoading(true);
    await api.resetPlayit();
    await loadStatus();
    setLoading(false);
    setActionMessage('Tunnel agent credentials reset');
  };

  const publicAddr = status?.publicAddress || 'playit.gg Anycast Tunnel';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Glow Header */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 relative z-10 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <AppBrandIcon id="playit" size={32} showBadge />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-wide">Playit.gg Minecraft Tunnel</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Anycast Mesh
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Worldwide Minecraft server access without port forwarding or exposing your home IP.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 relative z-10">
          {actionMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Status & Public Address Card */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Tunnel Daemon Status</span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    status?.running ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className={`text-xs font-mono font-bold ${status?.running ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {status?.running ? 'ONLINE & ROUTING' : 'AGENT STOPPED'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Public Minecraft Address
                </span>
                <span className="text-sm font-mono font-bold text-emerald-300 break-all">
                  {publicAddr}
                </span>
              </div>
              {status?.publicAddress && (
                <button
                  onClick={() => copyToClipboard(status.publicAddress!, 'addr')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'addr' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'addr' ? 'Copied' : 'Copy IP'}</span>
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {status?.running ? (
                <button
                  onClick={handleStop}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Tunnel</span>
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Tunnel</span>
                </button>
              )}

              <button
                onClick={loadStatus}
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleReset}
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 text-xs font-mono ml-auto transition-colors disabled:opacity-50"
              >
                Reset Key
              </button>
            </div>
          </div>

          {/* Quick 1-Click Provisioning via Claim URL */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">1-Click Agent Provisioning</h4>
            </div>
            <p className="text-xs text-slate-300">
              Generate a unique claim token, open the claim link on your browser, and bind this Minecraft instance to your Playit account.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleGenerateClaim}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Claim Link</span>
              </button>

              {status?.claimUrl && (
                <a
                  href={status.claimUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 font-mono text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  <span>Open Claim Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {status?.claimCode && (
              <div className="mt-2 text-xs font-mono text-slate-400 flex items-center gap-2">
                <span>Code:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-bold">
                  {status.claimCode}
                </span>
                <button
                  onClick={() => copyToClipboard(status.claimCode!, 'code')}
                  className="text-slate-400 hover:text-white"
                >
                  {copiedKey === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Manual Secret Key */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Or Enter Playit Secret Key Directly</h4>
            </div>
            <p className="text-xs text-slate-400">
              If you already have a secret key from your Playit dashboard, paste it below:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                placeholder="Paste Playit Secret Key here..."
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
              />
              <button
                onClick={handleApplySecret}
                disabled={loading || !secretInput.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold disabled:opacity-50 transition-colors"
              >
                Apply Secret
              </button>
            </div>
          </div>

          {/* Terminal Logs Preview */}
          {status?.lastLog && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Terminal className="w-3.5 h-3.5" />
                <span>Live Agent Output</span>
              </div>
              <pre className="p-3 rounded-xl bg-black/90 border border-slate-800 text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-32">
                {status.lastLog}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
