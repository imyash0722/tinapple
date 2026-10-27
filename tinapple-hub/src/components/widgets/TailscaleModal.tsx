import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Power,
  Key,
  X,
  Server,
  Lock,
  ArrowRight,
  Wifi,
} from 'lucide-react';
import { api } from '../../services/api';
import { TailscaleStatus } from '../../types/api';
import { AppBrandIcon } from '../common/AppBrandIcons';

interface TailscaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TailscaleModal: React.FC<TailscaleModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<TailscaleStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [authKeyInput, setAuthKeyInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await api.getTailscaleStatus();
      setStatus(data);
    } catch (e) {
      console.error('Failed to fetch tailscale status', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenAuth = async () => {
    setLoading(true);
    setActionMsg('Generating auth session...');
    try {
      const res = await api.loginTailscale();
      const url = res.authUrl || status?.authUrl;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        setActionMsg('Opened authentication page in new tab. Approve to connect!');
      } else {
        setActionMsg('Generating authentication link, checking status...');
      }
      await fetchStatus();
    } catch (e) {
      setActionMsg('Failed to generate login URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authKeyInput.trim()) return;
    setLoading(true);
    setActionMsg('Authenticating with Auth Key...');
    try {
      await api.loginTailscale(authKeyInput.trim());
      setAuthKeyInput('');
      setActionMsg('Auth key submitted! Checking connection...');
      await fetchStatus();
    } catch (e) {
      setActionMsg('Failed to authenticate with key.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out of Tailscale on this server?')) return;
    setLoading(true);
    setActionMsg('Logging out...');
    try {
      await api.logoutTailscale();
      setActionMsg('Logged out successfully.');
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleState = async () => {
    setLoading(true);
    try {
      if (status?.backendState === 'Running') {
        setActionMsg('Stopping Tailscale...');
        await api.downTailscale();
      } else {
        setActionMsg('Starting Tailscale...');
        await api.upTailscale();
      }
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isConnected = status?.backendState === 'Running';
  const needsLogin = status?.backendState === 'NeedsLogin' || (!isConnected && Boolean(status?.authUrl));
  const primaryIP = status?.tailscaleIPs?.[0] || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#091124] border border-[#1b2b52] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-gradient-to-b from-sky-500/15 via-blue-600/5 to-transparent blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#1b2b52]/80 relative z-10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-[#0e1b38] border border-sky-500/25 shadow-inner">
              <AppBrandIcon id="tailscale" size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide font-mono">Tailscale Mesh VPN</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  {status?.version ? `v${status.version}` : 'WireGuard'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Authenticate server to access dashboard remotely from any device.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-6 pt-6 overflow-y-auto pr-1">
          {/* Status Hero Card */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : needsLogin
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-zinc-800/40 border-zinc-700/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl border mt-0.5 ${
                    isConnected
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : needsLogin
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {isConnected ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : needsLogin ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : (
                    <Power className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isConnected
                          ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400'
                          : needsLogin
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-zinc-500'
                      }`}
                    />
                    <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                      {isConnected
                        ? `Connected (${status?.tailnet || 'Tailnet'})`
                        : needsLogin
                        ? 'Needs Authentication'
                        : `State: ${status?.backendState || 'Stopped'}`}
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-300 font-mono mt-1">
                    {isConnected
                      ? `Server is online and routing peer-to-peer traffic.`
                      : needsLogin
                      ? `Server requires one-time authorization to join your Tailscale tailnet.`
                      : `Tailscale daemon is currently idle.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={fetchStatus}
                  className="p-2 rounded-xl bg-[#0e1b38] hover:bg-[#14264e] border border-[#1b2b52] text-zinc-300 hover:text-white transition-colors"
                  title="Refresh state"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
                </button>
                {isConnected && (
                  <button
                    onClick={handleToggleState}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Connected Details Grid */}
            {isConnected && (
              <div className="mt-4 pt-4 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                {primaryIP && (
                  <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/25 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">Tailscale IPv4</span>
                      <span className="text-sm font-bold text-emerald-300">{primaryIP}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(primaryIP, 'ip')}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                      title="Copy IP"
                    >
                      {copiedKey === 'ip' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {status?.dnsName && (
                  <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/25 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">MagicDNS Hostname</span>
                      <span className="text-sm font-bold text-white truncate max-w-[170px] inline-block">
                        {status.dnsName}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(status.dnsName || '', 'dns')}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                      title="Copy MagicDNS"
                    >
                      {copiedKey === 'dns' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {primaryIP && (() => {
                  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
                  const remoteDashUrl = isHttps ? 'https://tinapple-server.tail3dee69.ts.net' : `http://${primaryIP}:8088`;
                  return (
                    <div className="sm:col-span-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="text-zinc-200">
                          Remote Dashboard URL:{' '}
                          <a
                            href={remoteDashUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-300 font-bold hover:underline"
                          >
                            {remoteDashUrl}
                          </a>
                        </span>
                      </div>
                      <a
                        href={remoteDashUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-sky-400 font-bold hover:underline"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Action Message Toast */}
          {actionMsg && (
            <div className="p-3 rounded-xl bg-[#0d1c3a] border border-sky-500/30 text-xs font-mono text-sky-300 flex items-center justify-between animate-fade-in">
              <span>{actionMsg}</span>
              <button onClick={() => setActionMsg(null)} className="text-zinc-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* LOGIN SECTION (When not connected or needs login) */}
          {!isConnected && (
            <div className="space-y-4">
              {/* Option 1: Browser 1-Click Login */}
              <div className="p-5 rounded-2xl bg-[#0c162e] border border-[#1b2b52]">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h5 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-sky-400" />
                      <span>Option 1: One-Click Browser Authorization</span>
                    </h5>
                    <p className="text-xs text-zinc-400 font-mono mt-1">
                      Click below to open Tailscale's secure authentication in a new browser tab on your client PC.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 whitespace-nowrap">
                    Recommended
                  </span>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleOpenAuth}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-mono text-sm font-bold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <span>Log in to Tailscale</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {status?.authUrl && (
                    <button
                      onClick={() => copyToClipboard(status.authUrl || '', 'authUrl')}
                      className="px-4 py-3 rounded-xl font-mono text-xs font-semibold bg-[#112042] hover:bg-[#172c5a] border border-[#203666] text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
                      title="Copy authentication link"
                    >
                      {copiedKey === 'authUrl' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Copied Link!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Auth Link</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {status?.authUrl && (
                  <div className="mt-3 p-2.5 rounded-lg bg-black/40 border border-[#1b2b52] flex items-center justify-between text-[11px] font-mono text-zinc-400 truncate">
                    <span className="truncate mr-2">{status.authUrl}</span>
                    <a
                      href={status.authUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline shrink-0"
                    >
                      Direct Link
                    </a>
                  </div>
                )}
              </div>

              {/* Option 2: Pre-authenticated Auth Key */}
              <div className="p-5 rounded-2xl bg-[#0c162e] border border-[#1b2b52]">
                <h5 className="text-sm font-bold text-white font-mono flex items-center gap-2 mb-1">
                  <Key className="w-4 h-4 text-purple-400" />
                  <span>Option 2: Tailscale Auth Key</span>
                </h5>
                <p className="text-xs text-zinc-400 font-mono mb-3">
                  Generate a reusable or ephemeral key in your Tailscale Admin Console (Settings &gt; Keys) and paste it here.
                </p>

                <form onSubmit={handleKeyLogin} className="flex gap-2">
                  <input
                    type="password"
                    placeholder="tskey-auth-..."
                    value={authKeyInput}
                    onChange={(e) => setAuthKeyInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-[#1b2b52] text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loading || !authKeyInput.trim()}
                    className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-[#14264e] hover:bg-[#1a3266] border border-sky-500/30 text-sky-300 disabled:opacity-40 transition-colors"
                  >
                    Authenticate
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Connected Extra Controls (Log out) */}
          {isConnected && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-500 font-mono">
                Device Endorsement: {status?.hostName || 'pineapple'}
              </span>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="text-xs font-mono text-red-400 hover:text-red-300 hover:underline transition-colors"
              >
                Log Out of Tailnet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
