import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Server,
  Lock,
  ArrowRight,
  Wifi,
  Users,
  Smartphone,
  Laptop,
  Activity,
  Terminal,
  Zap,
  Radio,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Share2,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  DetailedTailscaleStatus,
  DetailedTailscalePeer,
  TailscaleNetcheckResult,
  TailscaleStatus,
} from '../../types/api';
import { AppBrandIcon } from '../common/AppBrandIcons';
import { AndroidBridge } from '../../services/androidBridge';
import { TailscaleUserManager } from './TailscaleUserManager';
import { SpotlightCard } from '../reactbits/SpotlightCard';

export const TailscalePage: React.FC = () => {
  const [status, setStatus] = useState<DetailedTailscaleStatus | null>(null);
  const [basicStatus, setBasicStatus] = useState<TailscaleStatus | null>(null);
  const [netcheck, setNetcheck] = useState<TailscaleNetcheckResult | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'peers' | 'routing' | 'netcheck' | 'users' | 'security'>('peers');
  const [searchQuery, setSearchQuery] = useState('');
  const [peerFilter, setPeerFilter] = useState<'all' | 'online' | 'mobile' | 'servers'>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [netchecking, setNetchecking] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [authKeyInput, setAuthKeyInput] = useState('');
  const [showAuthInput, setShowAuthInput] = useState(false);
  const [pingResults, setPingResults] = useState<Record<string, { latency: string; loading: boolean }>>({});

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    AndroidBridge.performHaptic('light');
    setCopiedKey(key);
    showToast(`Copied ${key} to clipboard`, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      // 1. Try detailed endpoint
      const detailed = await api.getDetailedTailscaleStatus();
      if (detailed && detailed.peers && detailed.peers.length > 0) {
        setStatus(detailed);
        return;
      }

      // Fallback: Query basic status + user management peer directory
      const [basic, usersData] = await Promise.all([
        api.getTailscaleStatus(),
        api.getUserManagement().catch(() => null),
      ]);
      setBasicStatus(basic);

      const serverIp = basic?.tailscaleIPs?.[0] || '100.108.215.120';
      const fallbackPeers: DetailedTailscalePeer[] = [];

      if (usersData && usersData.tailscale_users) {
        usersData.tailscale_users.forEach((u) => {
          (u.devices || []).forEach((d) => {
            const isSelf = d.ip === serverIp;
            fallbackPeers.push({
              id: d.ip || d.name,
              hostName: d.name === 'pineapple' && isSelf ? 'pineapple-server' : d.name,
              dnsName: d.name ? `${d.name.toLowerCase()}.taildb42a2.ts.net` : '',
              os: d.os || (d.name === 'V2428' ? 'android' : 'linux'),
              userId: u.user_id,
              tailscaleIPs: d.ip ? [d.ip] : [],
              online: d.online,
              rxBytes: 0,
              txBytes: 0,
              isSelf: isSelf,
              userLogin: u.login_name,
              userName: u.display_name,
              exitNodeOption: isSelf,
            });
          });
        });
      }

      const selfPeer = fallbackPeers.find((p) => p.isSelf) || {
        id: 'self',
        hostName: basic?.hostName || 'pineapple-server',
        dnsName: basic?.dnsName || 'pineapple-server.taildb42a2.ts.net',
        os: 'linux',
        userId: 1,
        tailscaleIPs: basic?.tailscaleIPs || [serverIp],
        online: basic?.online ?? true,
        rxBytes: 0,
        txBytes: 0,
        isSelf: true,
      };

      setStatus({
        installed: basic?.installed ?? true,
        running: basic?.running ?? true,
        backendState: basic?.backendState || 'Running',
        authUrl: basic?.authUrl,
        tailscaleIPs: basic?.tailscaleIPs || [serverIp],
        dnsName: basic?.dnsName || 'pineapple-server.taildb42a2.ts.net',
        hostName: basic?.hostName || 'pineapple-server',
        tailnet: basic?.tailnet || 'imyash0722@gmail.com',
        online: basic?.online ?? true,
        version: basic?.version || '1.104.7',
        self: selfPeer,
        peers: fallbackPeers.filter((p) => !p.isSelf),
        exitNode: '',
        exitNodeAllowLan: true,
        advertiseExitNode: false,
        ssh: true,
        shieldsUp: false,
        acceptRoutes: true,
        preferredDerp: 6,
        preferredDerpRegion: 'Bangalore (IN)',
        healthWarnings: [],
      });
    } catch {
      showToast('Failed to refresh Tailscale status', 'error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchNetcheck = async (force = false) => {
    setNetchecking(true);
    try {
      const res = await api.getTailscaleNetcheck(force);
      if (res) {
        setNetcheck(res);
        showToast('Netcheck diagnostic report completed', 'success');
      } else {
        showToast('Netcheck report unavailable', 'error');
      }
    } catch {
      showToast('Failed to run netcheck probe', 'error');
    } finally {
      setNetchecking(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(true), 8000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Load netcheck when opening the netcheck tab
  useEffect(() => {
    if (activeSubTab === 'netcheck' && !netcheck && !netchecking) {
      fetchNetcheck(false);
    }
  }, [activeSubTab, netcheck, netchecking]);

  const handleToggleTailscale = async (currentlyOnline: boolean) => {
    setLoading(true);
    AndroidBridge.performHaptic('medium');
    try {
      if (currentlyOnline) {
        const ok = await api.downTailscale();
        if (ok) showToast('Tailscale service stopped', 'info');
      } else {
        const ok = await api.upTailscale();
        if (ok) showToast('Tailscale service started', 'success');
      }
      await fetchStatus();
    } catch {
      showToast('Failed to update service state', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authKeyInput.trim()) return;
    setLoading(true);
    showToast('Submitting Tailscale Auth Key...', 'info');
    try {
      await api.loginTailscale(authKeyInput.trim());
      setAuthKeyInput('');
      setShowAuthInput(false);
      showToast('Auth key accepted! Checking connection...', 'success');
      await fetchStatus();
    } catch {
      showToast('Failed to authenticate with key', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdvertiseExit = async () => {
    if (!status) return;
    const targetState = !status.advertiseExitNode;
    setLoading(true);
    AndroidBridge.performHaptic('medium');
    try {
      const ok = await api.setTailscalePrefs({ advertiseExitNode: targetState });
      if (ok) {
        showToast(
          targetState
            ? 'Exit node advertisement enabled for this server'
            : 'Exit node advertisement disabled',
          'success'
        );
        await fetchStatus();
      } else {
        showToast('Failed to update exit node advertisement', 'error');
      }
    } catch {
      showToast('Error updating exit node advertisement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlwaysOnExit = async () => {
    if (!status) return;
    const targetState = !status.alwaysOnExitNode;
    setLoading(true);
    AndroidBridge.performHaptic('medium');
    try {
      const ok = await api.setTailscalePrefs({
        alwaysOnExitNode: targetState,
        advertiseExitNode: targetState ? true : status.advertiseExitNode,
      });
      if (ok) {
        showToast(
          targetState
            ? 'Always-On Exit Node mode enabled (server will continuously advertise)'
            : 'Always-On Exit Node mode disabled',
          'success'
        );
        await fetchStatus();
      } else {
        showToast('Failed to update Always-On Exit Node mode', 'error');
      }
    } catch {
      showToast('Error updating Always-On Exit Node mode', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExitNode = async (exitNodeIp: string) => {
    setLoading(true);
    AndroidBridge.performHaptic('medium');
    try {
      const ok = await api.setTailscalePrefs({
        exitNode: exitNodeIp,
        exitNodeAllowLan: status?.exitNodeAllowLAN ?? true,
      });
      if (ok) {
        showToast(
          exitNodeIp ? `Routing outbound traffic via ${exitNodeIp}` : 'Exit node cleared; direct mesh active',
          'success'
        );
        await fetchStatus();
      } else {
        showToast('Failed to configure exit node', 'error');
      }
    } catch {
      showToast('Error configuring exit node', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAllowLan = async () => {
    if (!status) return;
    const targetState = !status.exitNodeAllowLAN;
    setLoading(true);
    AndroidBridge.performHaptic('light');
    try {
      const ok = await api.setTailscalePrefs({ exitNodeAllowLan: targetState });
      if (ok) {
        showToast(targetState ? 'LAN access enabled while using exit node' : 'LAN access disabled', 'success');
        await fetchStatus();
      } else {
        showToast('Failed to toggle LAN access', 'error');
      }
    } catch {
      showToast('Error updating LAN access setting', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePref = async (pref: 'ssh' | 'shieldsUp' | 'acceptRoutes') => {
    if (!status) return;
    const currentValue = status[pref];
    const targetValue = !currentValue;
    setLoading(true);
    AndroidBridge.performHaptic('light');
    try {
      const payload: Record<string, boolean> = { [pref]: targetValue };
      const ok = await api.setTailscalePrefs(payload);
      if (ok) {
        showToast(`Updated ${pref} preference`, 'success');
        await fetchStatus();
      } else {
        showToast(`Failed to update ${pref}`, 'error');
      }
    } catch {
      showToast(`Error updating ${pref}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePingPeer = async (target: string) => {
    if (!target) return;
    setPingResults((prev) => ({ ...prev, [target]: { latency: '...', loading: true } }));
    AndroidBridge.performHaptic('light');
    try {
      const res = await api.pingTailscalePeer(target);
      if (res && res.success) {
        setPingResults((prev) => ({
          ...prev,
          [target]: { latency: res.latency, loading: false },
        }));
      } else {
        setPingResults((prev) => ({
          ...prev,
          [target]: { latency: 'unreachable', loading: false },
        }));
      }
    } catch {
      setPingResults((prev) => ({
        ...prev,
        [target]: { latency: 'timeout', loading: false },
      }));
    }
  };

  const isOnline = status ? status.running && status.online : basicStatus?.online ?? false;
  const backendState = status?.backendState || basicStatus?.backendState || 'NoState';
  const tailscaleIpv4 = status?.self?.tailscaleIPs?.[0] || status?.tailscaleIPs?.[0] || basicStatus?.tailscaleIPs?.[0] || '';
  const tailscaleIpv6 = status?.self?.tailscaleIPs?.[1] || status?.tailscaleIPs?.[1] || basicStatus?.tailscaleIPs?.[1] || '';
  const dnsName = status?.dnsName || basicStatus?.dnsName || '';
  const tailnetName = status?.tailnet || basicStatus?.tailnet || '';
  const version = status?.version || basicStatus?.version || '';
  const nodeHostName = status?.hostName || basicStatus?.hostName || 'pineapple-server';

  // Available exit nodes in tailnet
  const exitNodeCandidates = useMemo(() => {
    if (!status?.peers) return [];
    return status.peers.filter((p) => p.exitNodeOption || p.exitNode);
  }, [status]);

  // Filtered peers list
  const filteredPeers = useMemo(() => {
    if (!status?.peers) return [];
    return status.peers.filter((peer) => {
      // Type/State filter
      if (peerFilter === 'online' && !peer.online) return false;
      if (peerFilter === 'mobile' && peer.os !== 'android' && peer.os !== 'iOS') return false;
      if (peerFilter === 'servers' && peer.os !== 'linux') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (peer.hostName || '').toLowerCase().includes(q) || (peer.dnsName || '').toLowerCase().includes(q);
        const matchesIp = (peer.tailscaleIPs || []).some((ip) => (ip || '').includes(q));
        const matchesUser = (peer.userLogin || '').toLowerCase().includes(q) || (peer.userName || '').toLowerCase().includes(q);
        return matchesName || matchesIp || matchesUser;
      }
      return true;
    });
  }, [status, peerFilter, searchQuery]);

  const renderOsIcon = (os: string) => {
    const clean = (os || '').toLowerCase();
    if (clean.includes('android')) return <Smartphone className="w-4 h-4 text-emerald-400" />;
    if (clean.includes('ios') || clean.includes('apple') || clean.includes('darwin')) return <Smartphone className="w-4 h-4 text-sky-400" />;
    if (clean.includes('windows')) return <Laptop className="w-4 h-4 text-blue-400" />;
    return <Server className="w-4 h-4 text-purple-400" />;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-300 font-sans select-none pb-20 md:pb-12">
      {/* 1. Appliance Tailscale Mesh Status Hero Banner */}
      <SpotlightCard className="p-4 sm:p-6 rounded-[28px] border border-outline-variant bg-surface-container-low shadow-none relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-highest border border-outline-variant flex items-center justify-center shrink-0 shadow-sm">
              <AppBrandIcon id="tailscale" size={28} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight truncate">
                  {nodeHostName}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono border ${
                    isOnline
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : backendState === 'NeedsLogin'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'}`} />
                  {isOnline ? 'Mesh Active' : backendState}
                </span>

                {status?.exitNode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    <Globe className="w-3 h-3 text-sky-400" />
                    <span>Exit: {status.exitNode}</span>
                  </span>
                )}

                {status?.advertiseExitNode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    <Zap className="w-3 h-3 text-purple-400" />
                    <span>Advertising Exit Node</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-on-surface-variant font-mono truncate">
                {tailnetName ? `Tailnet: ${tailnetName}` : 'Zero-Config Mesh VPN & WireGuard Overlay'}
                {version ? ` • v${version}` : ''}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleToggleTailscale(isOnline)}
              disabled={loading}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all shadow-none active:scale-95 disabled:opacity-50 ${
                isOnline
                  ? 'bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-on-surface'
                  : 'bg-primary text-on-primary hover:bg-primary/90'
              }`}
            >
              <Power className={`w-4 h-4 ${isOnline ? 'text-emerald-400' : 'text-on-primary'}`} />
              <span>{isOnline ? 'Disconnect' : 'Connect'}</span>
            </button>

            <button
              onClick={() => fetchStatus(false)}
              disabled={refreshing}
              className="p-2 rounded-full bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface transition-all active:scale-95"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
            </button>

            <button
              onClick={() => setShowAuthInput((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-xs font-medium text-on-surface transition-all"
              title="Authenticate with Tailscale Auth Key"
            >
              <Key className="w-3.5 h-3.5 text-tinapple-gold" />
              <span className="hidden sm:inline">Auth Key</span>
            </button>
          </div>
        </div>

        {/* Auth Key Form Modal Slide-Down */}
        {showAuthInput && (
          <form onSubmit={handleKeyLogin} className="mt-4 pt-4 border-t border-outline-variant/60 flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              placeholder="tskey-auth-..."
              value={authKeyInput}
              onChange={(e) => setAuthKeyInput(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-surface-container-highest border border-outline-variant text-xs font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading || !authKeyInput.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-all shrink-0"
            >
              Submit Key
            </button>
            <button
              type="button"
              onClick={() => setShowAuthInput(false)}
              className="px-3 py-2 rounded-xl bg-surface-container text-on-surface-variant text-xs hover:text-on-surface transition-all"
            >
              Cancel
            </button>
          </form>
        )}

        {/* IP & DNS Address Badges Strip */}
        <div className="mt-4 pt-3.5 border-t border-outline-variant/60 flex flex-wrap items-center gap-2">
          {tailscaleIpv4 && (
            <button
              onClick={() => copyToClipboard(tailscaleIpv4, 'IPv4')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface transition-all active:scale-95 group"
            >
              <span className="text-[10px] text-on-surface-variant uppercase font-bold">IPv4</span>
              <span className="font-semibold text-primary">{tailscaleIpv4}</span>
              {copiedKey === 'IPv4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3 h-3 text-on-surface-variant group-hover:text-on-surface" />}
            </button>
          )}

          {dnsName && (
            <button
              onClick={() => copyToClipboard(dnsName, 'MagicDNS')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface transition-all active:scale-95 group"
            >
              <span className="text-[10px] text-on-surface-variant uppercase font-bold">MagicDNS</span>
              <span className="font-semibold truncate max-w-[200px] sm:max-w-none">{dnsName}</span>
              {copiedKey === 'MagicDNS' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3 h-3 text-on-surface-variant group-hover:text-on-surface" />}
            </button>
          )}

          {tailscaleIpv6 && (
            <button
              onClick={() => copyToClipboard(tailscaleIpv6, 'IPv6')}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-mono text-on-surface transition-all active:scale-95 group"
            >
              <span className="text-[10px] text-on-surface-variant uppercase font-bold">IPv6</span>
              <span className="font-semibold text-zinc-400 truncate max-w-xs">{tailscaleIpv6}</span>
              {copiedKey === 'IPv6' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3 h-3 text-on-surface-variant group-hover:text-on-surface" />}
            </button>
          )}

          <a
            href="https://login.tailscale.com/admin"
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline"
          >
            <span>Admin Console</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </SpotlightCard>

      {/* Action Notification Toast Banner */}
      {actionMsg && (
        <div
          className={`p-3 rounded-2xl border text-xs font-sans flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : actionMsg.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-primary/10 border-primary/30 text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-on-surface-variant hover:text-on-surface p-1">
            ✕
          </button>
        </div>
      )}

      {/* 2. Sub-Navigation Tabs Bar (Mobile Horizontal Scroll / Desktop Dock) */}
      <div className="flex items-center p-1 rounded-2xl bg-surface-container-high/60 border border-outline-variant overflow-x-auto scrollbar-none gap-1">
        <button
          onClick={() => {
            AndroidBridge.performHaptic('light');
            setActiveSubTab('peers');
          }}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'peers'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Peers & Mesh ({status?.peers?.length ?? 0})</span>
        </button>

        <button
          onClick={() => {
            AndroidBridge.performHaptic('light');
            setActiveSubTab('routing');
          }}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'routing'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Exit Node Routing</span>
          {status?.advertiseExitNode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>

        <button
          onClick={() => {
            AndroidBridge.performHaptic('light');
            setActiveSubTab('netcheck');
          }}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'netcheck'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Netcheck & DERP</span>
        </button>

        <button
          onClick={() => {
            AndroidBridge.performHaptic('light');
            setActiveSubTab('users');
          }}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'users'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Access & Roles (RBAC)</span>
        </button>

        <button
          onClick={() => {
            AndroidBridge.performHaptic('light');
            setActiveSubTab('security');
          }}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            activeSubTab === 'security'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security & Toggles</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB A: PEERS & MESH DIRECTORY */}
      {activeSubTab === 'peers' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search peers by hostname, IP, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-full bg-surface-container-highest border border-outline-variant text-xs font-sans text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center p-1 rounded-full bg-surface-container-highest border border-outline-variant self-start sm:self-auto overflow-x-auto">
              {(['all', 'online', 'mobile', 'servers'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPeerFilter(mode)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                    peerFilter === mode
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Self Node Card (This Appliance) */}
          {status?.self && (
            <SpotlightCard className="p-4 sm:p-5 rounded-[24px] border border-primary/40 bg-surface-container-low shadow-none relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-on-surface truncate">{status.self.hostName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                        This Node (Server)
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <span className="text-xs text-on-surface-variant font-mono block mt-0.5">
                      {status.self.tailscaleIPs?.[0] || '100.108.215.120'} • {status.self.dnsName || 'DNS Active'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-on-surface-variant px-3 py-1 rounded-xl bg-surface-container">
                    Linux • Local Appliance Host
                  </span>
                </div>
              </div>
            </SpotlightCard>
          )}

          {/* Peer Devices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredPeers.map((peer) => {
              const peerIp = peer.tailscaleIPs?.[0] || '';
              const pingState = pingResults[peerIp];

              return (
                <SpotlightCard
                  key={peer.id || peerIp}
                  className="p-4 rounded-[22px] border border-outline-variant bg-surface-container-low hover:border-primary/40 transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2.5 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                          {renderOsIcon(peer.os)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-on-surface truncate" title={peer.hostName}>
                            {peer.hostName}
                          </h4>
                          <span className="text-[10px] text-on-surface-variant font-mono block truncate">
                            {peer.userName || peer.userLogin || 'Tailnet Peer'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            peer.online
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${peer.online ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'}`} />
                          {peer.online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {/* IPs & Tags */}
                    <div className="space-y-1 text-xs font-mono">
                      <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-surface-container">
                        <span className="text-[10px] text-on-surface-variant">IP:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-primary">{peerIp}</span>
                          <button
                            onClick={() => copyToClipboard(peerIp, peer.hostName || peerIp || 'peer')}
                            className="p-1 text-on-surface-variant hover:text-on-surface"
                            title="Copy IP"
                          >
                            {copiedKey === (peer.hostName || peerIp || 'peer') ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {peer.exitNodeOption && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                          <Globe className="w-3 h-3 text-purple-400" />
                          <span>Exit Node Capable</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Ping Tool */}
                  <div className="pt-2 border-t border-outline-variant/50 flex items-center justify-between">
                    <span className="text-[10px] text-on-surface-variant capitalize font-mono">
                      OS: {peer.os || 'unknown'}
                    </span>

                    <button
                      onClick={() => handlePingPeer(peerIp)}
                      disabled={pingState?.loading}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-[11px] font-mono font-medium text-on-surface active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Zap className={`w-3 h-3 ${pingState?.loading ? 'animate-spin text-amber-400' : 'text-primary'}`} />
                      <span>{pingState?.loading ? 'Pinging...' : pingState?.latency ? `⚡ ${pingState.latency}` : 'Ping'}</span>
                    </button>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>

          {filteredPeers.length === 0 && (
            <div className="p-8 text-center rounded-[24px] bg-surface-container-low border border-outline-variant text-on-surface-variant space-y-2">
              <Users className="w-8 h-8 mx-auto text-on-surface-variant/50" />
              <p className="text-sm">No Tailnet peers found matching your filter criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB B: EXIT NODE ROUTING */}
      {activeSubTab === 'routing' && (
        <div className="space-y-4">
          {/* Current Routing Status Banner */}
          <SpotlightCard className="p-5 rounded-[24px] border border-outline-variant bg-surface-container-low">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Current Mesh Outbound Routing State
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <span>
                    {status?.exitNode ? `Active Exit Node: ${status.exitNode}` : 'Direct Mesh (Direct Internet Gateway)'}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-mono mt-1">
                  {status?.exitNode
                    ? `All appliance internet requests are tunneled through exit node ${status.exitNode}`
                    : 'Appliances query external endpoints directly via physical Wi-Fi/Ethernet gateway.'}
                </p>
              </div>

              {status?.exitNode && (
                <button
                  onClick={() => handleSelectExitNode('')}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-rose-400 transition-all shrink-0"
                >
                  Clear Exit Node
                </button>
              )}
            </div>
          </SpotlightCard>

          {/* Section 1: Advertise This Node as Exit Node */}
          <SpotlightCard className="p-5 rounded-[24px] border border-outline-variant bg-surface-container-low space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <h4 className="font-bold text-sm text-on-surface">Advertise as Exit Node for Tailnet</h4>
                  {status?.alwaysOnExitNode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ALWAYS-ON ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Allows your mobile devices (Pixel, iPhone, laptop) to route all cellular or public Wi-Fi traffic
                  securely through this home server and Proton VPN.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleToggleAlwaysOnExit}
                  disabled={loading}
                  title="When Always-On is enabled, the server watchdog continuously asserts exit node advertising across reboots and network reconnects."
                  className={`px-3 py-2 rounded-full font-bold text-xs font-mono transition-all active:scale-95 disabled:opacity-50 shrink-0 ${
                    status?.alwaysOnExitNode
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant'
                  }`}
                >
                  Always-On: {status?.alwaysOnExitNode ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={handleToggleAdvertiseExit}
                  disabled={loading}
                  className={`px-4 py-2.5 rounded-full font-bold text-xs font-mono transition-all active:scale-95 disabled:opacity-50 shrink-0 ${
                    status?.advertiseExitNode
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-primary text-on-primary hover:bg-primary/90'
                  }`}
                >
                  {status?.advertiseExitNode ? 'Disable Advertisement' : 'Enable Advertisement'}
                </button>
              </div>
            </div>

            {/* Approval Status Callout */}
            {status?.advertiseExitNode && !status?.exitNodeApproved && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>One-Time Action Required: Approve Exit Node in Tailscale Admin Console</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  The server is actively advertising <code className="text-amber-300 font-mono">0.0.0.0/0</code> and <code className="text-amber-300 font-mono">::/0</code>, but Tailscale hides unapproved exit nodes from mobile apps and client devices until an administrator approves the route.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href="https://login.tailscale.com/admin/machines"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>Open Machines Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    Find <strong>pineapple-server</strong> (100.108.215.120) → <strong>...</strong> → <strong>Edit route settings</strong> → Enable <strong>Use as exit node</strong>
                  </span>
                </div>
              </div>
            )}

            {status?.advertiseExitNode && status?.exitNodeApproved && (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Approved & Active: Client devices can select pineapple-server as their Exit Node anytime!</span>
              </div>
            )}
          </SpotlightCard>

          {/* Section 2: Route Through Another Exit Node */}
          <SpotlightCard className="p-5 rounded-[24px] border border-outline-variant bg-surface-container-low space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-on-surface">Select Outbound Exit Node</h4>
                <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                  Choose a peer on your Tailnet to route this server’s traffic through:
                </p>
              </div>

              {/* LAN Access Toggle */}
              <button
                onClick={handleToggleAllowLan}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition-all ${
                  status?.exitNodeAllowLAN
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant'
                }`}
              >
                Allow LAN Access: {status?.exitNodeAllowLAN ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="space-y-2">
              {exitNodeCandidates.length > 0 ? (
                exitNodeCandidates.map((cand) => {
                  const ip = cand.tailscaleIPs?.[0] || '';
                  const isCurrent = status?.exitNode === ip || status?.exitNode === cand.hostName;

                  return (
                    <div
                      key={cand.id || ip}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isCurrent
                          ? 'bg-primary/10 border-primary text-on-surface'
                          : 'bg-surface-container border-outline-variant/70 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                          {renderOsIcon(cand.os)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-on-surface block truncate">{cand.hostName}</span>
                          <span className="text-[10px] text-on-surface-variant font-mono block">{ip}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectExitNode(isCurrent ? '' : ip)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          isCurrent
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                            : 'bg-primary text-on-primary hover:bg-primary/90'
                        }`}
                      >
                        {isCurrent ? 'Disconnect' : 'Use as Exit Node'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center rounded-2xl bg-surface-container border border-outline-variant text-on-surface-variant text-xs space-y-1">
                  <p>No exit nodes currently advertised on your Tailnet.</p>
                  <p className="text-[11px] text-on-surface-variant/70">
                    To make another device an exit node, run <code className="text-primary font-mono">tailscale set --advertise-exit-node</code> on that device.
                  </p>
                </div>
              )}
            </div>
          </SpotlightCard>
        </div>
      )}

      {/* TAB C: NETCHECK & DERP DIAGNOSTICS */}
      {activeSubTab === 'netcheck' && (
        <div className="space-y-4">
          {/* Diagnostic Action Banner */}
          <div className="flex items-center justify-between p-4 sm:p-5 rounded-[24px] bg-surface-container-low border border-outline-variant">
            <div>
              <h3 className="font-bold text-sm text-on-surface">Network Conditions & Latency Probe</h3>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                Probes UDP hole-punching, DERP relay regions, IPv4/IPv6, and captive portals.
              </p>
            </div>

            <button
              onClick={() => fetchNetcheck(true)}
              disabled={netchecking}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs transition-all shadow-none disabled:opacity-50 active:scale-95 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${netchecking ? 'animate-spin' : ''}`} />
              <span>{netchecking ? 'Probing...' : 'Run Netcheck'}</span>
            </button>
          </div>

          {netcheck ? (
            <>
              {/* Core Telemetry Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 font-mono">
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant">
                  <span className="text-[10px] text-on-surface-variant uppercase block">UDP Punching</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${netcheck.udp ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="font-bold text-sm text-on-surface">{netcheck.udp ? 'Reachable' : 'Blocked'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant">
                  <span className="text-[10px] text-on-surface-variant uppercase block">IPv4 / IPv6</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-bold text-xs text-on-surface">
                      v4: {netcheck.ipv4 ? 'Yes' : 'No'} • v6: {netcheck.ipv6 ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant">
                  <span className="text-[10px] text-on-surface-variant uppercase block">Preferred Relay</span>
                  <span className="font-bold text-xs text-primary truncate block mt-1">
                    {netcheck.preferredDerpName || `DERP ${netcheck.preferredDerp}`}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant">
                  <span className="text-[10px] text-on-surface-variant uppercase block">Captive Portal</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${netcheck.captivePortal ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span className="font-bold text-xs text-on-surface">{netcheck.captivePortal ? 'Detected' : 'None'}</span>
                  </div>
                </div>
              </div>

              {/* DERP Region Latency Table */}
              <SpotlightCard className="p-5 rounded-[24px] border border-outline-variant bg-surface-container-low space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs text-on-surface uppercase font-mono tracking-wider">
                    Global DERP Relay Region Latencies
                  </h4>
                  <span className="text-[10px] text-on-surface-variant font-mono">Sorted by proximity</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {Object.entries(netcheck.regionLatency || {})
                    .sort(([, a], [, b]) => a - b)
                    .map(([regionId, latencyMs]) => {
                      const idNum = parseInt(regionId, 10);
                      const isPreferred = idNum === netcheck.preferredDerp;
                      const pingColor =
                        latencyMs < 50
                          ? 'text-emerald-400'
                          : latencyMs < 150
                          ? 'text-amber-400'
                          : 'text-zinc-400';

                      return (
                        <div
                          key={regionId}
                          className={`p-2.5 rounded-xl border flex items-center justify-between font-mono text-xs ${
                            isPreferred
                              ? 'bg-primary/10 border-primary text-on-surface'
                              : 'bg-surface-container border-outline-variant/60'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-on-surface font-semibold truncate">
                              DERP {regionId}
                            </span>
                            {isPreferred && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-primary text-on-primary font-bold">
                                BEST
                              </span>
                            )}
                          </div>

                          <span className={`font-bold ${pingColor}`}>
                            {latencyMs.toFixed(1)} ms
                          </span>
                        </div>
                      );
                    })}
                </div>
              </SpotlightCard>
            </>
          ) : (
            <div className="p-8 text-center rounded-[24px] bg-surface-container-low border border-outline-variant space-y-3">
              <Activity className="w-8 h-8 mx-auto text-primary animate-pulse" />
              <p className="text-xs text-on-surface-variant font-mono">
                {netchecking ? 'Running network diagnostic probes...' : 'Click "Run Netcheck" to probe connectivity.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB D: ACCESS & ROLES (RBAC) */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <TailscaleUserManager />
        </div>
      )}

      {/* TAB E: SECURITY & SETTINGS */}
      {activeSubTab === 'security' && (
        <div className="space-y-4">
          <SpotlightCard className="p-5 rounded-[24px] border border-outline-variant bg-surface-container-low space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant">
              Security Governance & Daemon Preferences
            </h3>

            {/* Toggle 1: Tailscale SSH */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs text-on-surface">Tailscale SSH Server</span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Permit SSH connections directly over Tailscale without managing keys.
                </p>
              </div>

              <button
                onClick={() => handleTogglePref('ssh')}
                disabled={loading}
                className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all ${
                  status?.ssh
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {status?.ssh ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Toggle 2: Shields Up */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-on-surface">Shields Up (Block Incoming)</span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Blocks all incoming connections from other machines on the Tailnet.
                </p>
              </div>

              <button
                onClick={() => handleTogglePref('shieldsUp')}
                disabled={loading}
                className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all ${
                  status?.shieldsUp
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {status?.shieldsUp ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            {/* Toggle 3: Accept Subnet Routes */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-xs text-on-surface">Accept Subnet Routes</span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Accept IP routes advertised by other nodes on your Tailnet.
                </p>
              </div>

              <button
                onClick={() => handleTogglePref('acceptRoutes')}
                disabled={loading}
                className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all ${
                  status?.acceptRoutes
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {status?.acceptRoutes ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </SpotlightCard>
        </div>
      )}
    </div>
  );
};

export default TailscalePage;
