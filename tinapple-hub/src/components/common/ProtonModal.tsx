import React, { useState, useEffect } from 'react';
import {
  Shield,
  X,
  Lock,
  Globe,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Zap,
  Server,
  Layers,
  FileCode,
  LogIn,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { ProtonStatus, ProtonWireGuardInfo } from '../../types/api';
import { SquishSwitch } from '../reactbits/SquishSwitch';

interface ProtonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: ProtonStatus) => void;
}

export const ProtonModal: React.FC<ProtonModalProps> = ({ isOpen, onClose, onStatusChange }) => {
  const [activeTab, setActiveTab] = useState<'wireguard' | 'account' | 'routing'>('wireguard');
  const [status, setStatus] = useState<ProtonStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [wgInfo, setWgInfo] = useState<ProtonWireGuardInfo | null>(null);

  // WireGuard tab state
  const [rawWgConfig, setRawWgConfig] = useState<string>('');
  const [wgSaving, setWgSaving] = useState<boolean>(false);
  const [wgMessage, setWgMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Account login tab state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [totp, setTotp] = useState<string>('');
  const [needs2FA, setNeeds2FA] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchState = async () => {
    setLoading(true);
    try {
      const [st, wg] = await Promise.all([
        api.getProtonStatus(),
        api.protonGetWireGuard(),
      ]);
      setStatus(st);
      setWgInfo(wg);
      if (onStatusChange) onStatusChange(st);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleConnect = async (connect: boolean) => {
    setConnecting(true);
    setWgMessage(null);
    setAuthMessage(null);
    try {
      const res = await api.toggleProtonStatus(connect);
      setStatus(res);
      if (onStatusChange) onStatusChange(res);
      if (res.error) {
        setWgMessage({ type: 'error', text: res.error });
      } else {
        await fetchState();
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveWireGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawWgConfig.trim()) {
      setWgMessage({ type: 'error', text: 'Please paste your WireGuard configuration content.' });
      return;
    }
    setWgSaving(true);
    setWgMessage(null);
    try {
      const res = await api.protonSetWireGuard(rawWgConfig, true);
      setStatus(res);
      if (onStatusChange) onStatusChange(res);
      if (res.active) {
        setWgMessage({ type: 'success', text: 'WireGuard configuration activated! All services now routed through Proton.' });
        setRawWgConfig('');
        await fetchState();
      } else if (res.error) {
        setWgMessage({ type: 'error', text: res.error });
      } else {
        setWgMessage({ type: 'success', text: 'WireGuard configuration saved successfully.' });
        setRawWgConfig('');
        await fetchState();
      }
    } finally {
      setWgSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawWgConfig(content);
        setWgMessage({ type: 'success', text: `Loaded ${file.name}. Click "Save & Activate" to apply.` });
      }
    };
    reader.readAsText(file);
  };

  const handleClearWireGuard = async () => {
    if (!confirm('Are you sure you want to remove the saved Proton WireGuard profile?')) return;
    setLoading(true);
    try {
      await api.protonClearWireGuard();
      setWgMessage({ type: 'success', text: 'WireGuard configuration removed.' });
      await fetchState();
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setAuthMessage({ type: 'error', text: 'Please enter both your Proton username and password.' });
      return;
    }
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const res = await api.protonSignIn(username.trim(), password, totp.trim() || undefined);
      if (res.needs_2fa) {
        setNeeds2FA(true);
        setAuthMessage({ type: 'error', text: 'Two-factor authentication code required. Please enter your 6-digit TOTP code below.' });
      } else if (res.success) {
        setAuthMessage({ type: 'success', text: res.message || 'Successfully signed in and connected to Proton VPN!' });
        setPassword('');
        setTotp('');
        setNeeds2FA(false);
        await fetchState();
      } else {
        setAuthMessage({ type: 'error', text: res.message || 'Sign in failed. Check your username and password.' });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!confirm('Sign out from your Proton account on this appliance?')) return;
    setAuthLoading(true);
    try {
      await api.protonSignOut();
      setAuthMessage({ type: 'success', text: 'Signed out successfully.' });
      await fetchState();
    } finally {
      setAuthLoading(false);
    }
  };

  const isConnected = status?.active === true;
  const isConfigured = status?.configured === true || Boolean(wgInfo?.exists) || Boolean(status?.is_logged_in);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-2xl rounded-2xl bg-[#090e1a] border border-[#6D4AFF]/40 shadow-2xl shadow-[#6D4AFF]/10 overflow-hidden font-mono text-xs flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#0d1428] via-[#12102b] to-[#1a113d] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6D4AFF]/20 border border-[#6D4AFF]/40 flex items-center justify-center text-xl shadow-inner">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm tracking-wide">
                  Proton Privacy Exit & Media Tunnel
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#6D4AFF]/25 text-[#9d85ff] border border-[#6D4AFF]/40 text-[10px] font-bold">
                  SWISS WIREGUARD
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Route all media services through Proton VPN to bypass network blocks & ISP restrictions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Tunnel Status Card */}
        <div className="p-4 bg-slate-950/70 border-b border-white/[0.06] shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                {isConnected && (
                  <span className="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">
                    {isConnected
                      ? 'TUNNEL ACTIVE • ALL SERVICES ROUTED'
                      : isConfigured
                      ? 'TUNNEL STANDBY • READY TO CONNECT'
                      : 'SETUP REQUIRED • NOT CONFIGURED'}
                  </span>
                  {status?.tunnel_type && status.tunnel_type !== 'none' && (
                    <span className="text-[10px] uppercase font-bold text-emerald-400">
                      [{status.tunnel_type}]
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {isConnected
                    ? `Public Egress: ${status?.exit_ip || 'Fetching...'} ${
                        status?.country ? `• Country: ${status.country}` : ''
                      } ${status?.city ? `(${status.city})` : ''}`
                    : isConfigured
                    ? status?.details || 'Click toggle or connect button below to route traffic through Proton.'
                    : 'Provide a WireGuard configuration (.conf) or sign in to unblock restricted media.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SquishSwitch
                checked={isConnected}
                onChange={handleToggleConnect}
                disabled={connecting || loading || !isConfigured}
                variant="emerald"
                size="md"
              />
              <button
                onClick={fetchState}
                disabled={loading}
                title="Refresh Status"
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/[0.06] bg-slate-950/40 px-4 pt-2 shrink-0 gap-2">
          <button
            onClick={() => setActiveTab('wireguard')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'wireguard'
                ? 'border-[#6D4AFF] text-[#a48eff]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>WireGuard Profile (Recommended)</span>
            {wgInfo?.exists && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'account'
                ? 'border-[#6D4AFF] text-[#a48eff]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Proton Account Sign-in</span>
            {status?.is_logged_in && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('routing')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'routing'
                ? 'border-[#6D4AFF] text-[#a48eff]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Routed Services (9 Apps)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: WIREGUARD CONFIGURATION */}
          {activeTab === 'wireguard' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#6D4AFF]/10 border border-[#6D4AFF]/20 space-y-1.5">
                <div className="flex items-center justify-between text-[#caa6ff] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#a48eff]" />
                    <span>Instant WireGuard Kernel Setup</span>
                  </span>
                  <a
                    href="https://account.protonvpn.com/downloads"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] hover:underline text-[#caa6ff]"
                  >
                    <span>Get Config from account.protonvpn.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  WireGuard runs natively inside the Linux kernel with minimal CPU overhead and zero background daemons.
                  Log into your Proton VPN dashboard, select <strong>WireGuard</strong>, choose your desired country (e.g., Switzerland, Netherlands, US), and download or copy the configuration.
                </p>
              </div>

              {wgInfo?.exists && (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold text-white">WireGuard Profile Installed</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                        /etc/wireguard/proton.conf
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 pl-6 flex flex-wrap gap-x-4">
                      {wgInfo.endpoint && <span>Endpoint: <strong className="text-zinc-200">{wgInfo.endpoint}</strong></span>}
                      {wgInfo.address && <span>Internal IP: <strong className="text-zinc-200">{wgInfo.address}</strong></span>}
                      {wgInfo.dns && <span>Proton DNS: <strong className="text-zinc-200">{wgInfo.dns}</strong></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isConnected && (
                      <button
                        type="button"
                        onClick={() => handleToggleConnect(true)}
                        disabled={connecting}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono transition-all"
                      >
                        {connecting ? 'Connecting...' : 'Connect WireGuard'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClearWireGuard}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {wgMessage && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    wgMessage.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {wgMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{wgMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveWireGuard} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Paste Raw WireGuard Configuration:</span>
                  </label>
                  <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white border border-white/5 transition-all text-[11px] flex items-center gap-1.5">
                    <Upload className="w-3 h-3 text-[#a48eff]" />
                    <span>Upload .conf</span>
                    <input
                      type="file"
                      accept=".conf,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  rows={8}
                  value={rawWgConfig}
                  onChange={(e) => setRawWgConfig(e.target.value)}
                  placeholder={`[Interface]\nPrivateKey = aaaaaa...\nAddress = 10.2.0.2/32\nDNS = 10.2.0.1\n\n[Peer]\nPublicKey = bbbbbb...\nAllowedIPs = 0.0.0.0/0\nEndpoint = 185.159.157.1:51820`}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-[11px] leading-relaxed focus:outline-none focus:border-[#6D4AFF] placeholder:text-zinc-600"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-zinc-500">
                    Routing rules will automatically preserve Tailscale & LAN connections.
                  </span>
                  <button
                    type="submit"
                    disabled={wgSaving || !rawWgConfig.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6D4AFF] to-[#8B5CF6] hover:from-[#5B3CE6] hover:to-[#7C3AED] text-white font-bold font-mono transition-all shadow-lg shadow-[#6D4AFF]/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {wgSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving & Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-3.5 h-3.5" />
                        <span>Save & Activate WireGuard</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: PROTON ACCOUNT LOGIN */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.08] space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#6D4AFF]" />
                  <span>Proton VPN CLI Account Authentication</span>
                </span>
                <p className="text-[11px] text-zinc-400">
                  Authenticate using your Proton credentials. The official CLI daemon handles certificate renewal, server rotation, and P2P server connections automatically.
                </p>
              </div>

              {status?.is_logged_in && (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white">Authenticated to Proton VPN</span>
                      <p className="text-[11px] text-zinc-400">
                        Account: <strong className="text-emerald-300">{status.account_name}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isConnected && (
                      <button
                        type="button"
                        onClick={() => handleToggleConnect(true)}
                        disabled={connecting}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono transition-all"
                      >
                        {connecting ? 'Connecting...' : 'Connect VPN'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={authLoading}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-mono transition-all flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}

              {authMessage && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    authMessage.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {authMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{authMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="text-zinc-300 block mb-1 font-bold">
                    Proton Username or Email:
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="user@proton.me or username"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-[#6D4AFF]"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1 font-bold">
                    Proton Password:
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-[#6D4AFF]"
                  />
                </div>

                {(needs2FA || totp) && (
                  <div>
                    <label className="text-amber-300 block mb-1 font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Two-Factor Authentication (TOTP Code):</span>
                    </label>
                    <input
                      type="text"
                      value={totp}
                      onChange={(e) => setTotp(e.target.value)}
                      placeholder="6-digit authenticator code"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/50 text-white focus:outline-none focus:border-amber-400 font-mono tracking-widest text-center"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={authLoading || !username.trim() || !password.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6D4AFF] to-[#8B5CF6] hover:from-[#5B3CE6] hover:to-[#7C3AED] text-white font-bold font-mono transition-all shadow-lg shadow-[#6D4AFF]/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Signing In & Connecting...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In & Connect to Proton</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ROUTED SERVICES */}
          {activeTab === 'routing' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">
                    Zero-Leak Media Platform Routing Matrix
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    When Proton Privacy Exit is active, default routing (0.0.0.0/0) directs all outgoing internet traffic through the Swiss tunnel.
                  </span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {isConnected ? 'TUNNEL ACTIVE' : 'TUNNEL INACTIVE'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    name: 'Jellyfin Media Server',
                    port: ':8096',
                    benefit: 'Unblocks TMDB, TVDB, Fanart.tv, and live streaming metadata',
                    icon: '🎬',
                  },
                  {
                    name: 'Suwayomi Manga Server',
                    port: ':4567',
                    benefit: 'Bypasses ISP bans on MangaDex, MangaFox, and Keiyoushi sources',
                    icon: '📖',
                  },
                  {
                    name: 'qBittorrent Engine',
                    port: ':8080',
                    benefit: 'Anonymous torrenting, unblocked public trackers & DHT nodes',
                    icon: '📥',
                  },
                  {
                    name: 'Servarr Automation Stack',
                    port: ':7878 / :8989 / :9696',
                    benefit: 'Unblocks Prowlarr indexers, Torznab feeds, and TV/movie releases',
                    icon: '🤖',
                  },
                  {
                    name: 'Pinchflat YouTube Archiver',
                    port: ':8945',
                    benefit: 'Bypasses YouTube rate-limits & geographical video blocking',
                    icon: '📹',
                  },
                  {
                    name: 'Navidrome Music Cloud',
                    port: ':4533',
                    benefit: 'Unblocks Last.fm artist bio lookups, album art & lyrics fetching',
                    icon: '🎵',
                  },
                ].map((svc) => (
                  <div
                    key={svc.name}
                    className="p-3 rounded-xl bg-slate-950 border border-white/[0.06] flex items-start gap-2.5"
                  >
                    <span className="text-xl shrink-0 mt-0.5">{svc.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-white text-xs">{svc.name}</strong>
                        <span className="text-[10px] text-zinc-500 font-mono">{svc.port}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                        {svc.benefit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Network Safeguards Verified */}
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/[0.05] space-y-2">
                <span className="text-[11px] font-bold text-zinc-300 block">
                  Hardened Coexistence Safeguards:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Tailscale Mesh traffic protected (table 52)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Local Hotspot (192.168.4.1) protected</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Inbound WebUI port 8088 never blocked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Proton NetShield ad & tracker blocking active</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="text-[10px] text-zinc-500">
            {isConnected ? (
              <span className="text-emerald-400 font-semibold">
                ● Connected to Proton VPN • All traffic encrypted
              </span>
            ) : (
              <span>Not routing through Proton VPN</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 hover:text-white font-mono text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
