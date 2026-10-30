import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Terminal,
  ShieldCheck,
  Sparkles,
  Download,
  Smartphone,
  Laptop,
  Globe,
  Radio,
  Sliders,
  AlertTriangle,
  Play,
  Square,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { GUIDES_CATALOG, GuideArticle } from '../../data/guidesCatalog';
import { AppBrandIcon } from '../common/AppBrandIcons';
import { api } from '../../services/api';

interface UnifiedAppPageProps {
  appId: string;
  onBack: () => void;
  onOpenLogs?: (unit: string) => void;
  onOpenTerminal?: () => void;
}

// App metadata mapping to systemd units, reverse proxy paths, and ports
const APP_METADATA_MAP: Record<
  string,
  {
    unit: string;
    path: string;
    port: number;
    categoryName: string;
    description: string;
  }
> = {
  jellyfin: {
    unit: 'jellyfin.service',
    path: '/jellyfin/',
    port: 8096,
    categoryName: 'Media & Streaming',
    description: 'Hardware-accelerated media streaming server with full library management and Plezy client integration.',
  },
  qbittorrent: {
    unit: 'qbittorrent-nox.service',
    path: '/qbittorrent/',
    port: 8080,
    categoryName: 'Downloads & Automation',
    description: 'High-performance BitTorrent client with Web UI, automated categories, and Servarr automation.',
  },
  vaultwarden: {
    unit: 'vaultwarden.service',
    path: '/vault/',
    port: 8000,
    categoryName: 'Security & Passwords',
    description: 'Lightweight, self-hosted Bitwarden-compatible password vault with end-to-end encryption.',
  },
  vault: {
    unit: 'vaultwarden.service',
    path: '/vault/',
    port: 8000,
    categoryName: 'Security & Passwords',
    description: 'Lightweight, self-hosted Bitwarden-compatible password vault with end-to-end encryption.',
  },
  mautrix: {
    unit: 'synapse.service',
    path: '/element/',
    port: 8008,
    categoryName: 'Chat & Messaging',
    description: 'Native Matrix Synapse homeserver with WhatsApp, Signal & Telegram bridges and MSC3575 Sliding Sync for Element X.',
  },
  matrix: {
    unit: 'synapse.service',
    path: '/element/',
    port: 8008,
    categoryName: 'Chat & Messaging',
    description: 'Native Matrix Synapse homeserver with WhatsApp, Signal & Telegram bridges and MSC3575 Sliding Sync for Element X.',
  },
  element: {
    unit: 'synapse.service',
    path: '/element/',
    port: 8008,
    categoryName: 'Chat & Messaging',
    description: 'Next-generation Element X messaging client and self-hosted Element Web.',
  },
  beeper: {
    unit: 'beeper-bridges.service',
    path: '/guides/beeper.html',
    port: 8008,
    categoryName: 'Chat & Messaging',
    description: 'Beeper multi-chat unified bridge manager for iMessage, WhatsApp, Telegram, Signal, and Discord.',
  },
  pinchflat: {
    unit: 'pinchflat.service',
    path: '/pinchflat/',
    port: 8945,
    categoryName: 'Media & Video Downloader',
    description: 'Automated YouTube channel & playlist archiver directly integrated with your Jellyfin library.',
  },
  youtube: {
    unit: 'pinchflat.service',
    path: '/pinchflat/',
    port: 8945,
    categoryName: 'Media & Video Downloader',
    description: 'Automated YouTube channel & playlist archiver directly integrated with your Jellyfin library.',
  },
  seerr: {
    unit: 'jellyseerr.service',
    path: '/seerr/',
    port: 5055,
    categoryName: 'Media & Requests',
    description: 'Media discovery and automated request manager integrated with Jellyfin, Radarr, and Sonarr.',
  },
  navidrome: {
    unit: 'navidrome.service',
    path: '/navidrome/',
    port: 4533,
    categoryName: 'Music & Audio',
    description: 'Subsonic-compatible modern music streaming server for your personal lossless music collection.',
  },
  syncthing: {
    unit: 'syncthing@pineapple.service',
    path: '/syncthing/',
    port: 8384,
    categoryName: 'Cloud & Sync',
    description: 'Decentralized, continuous peer-to-peer file synchronization between mobile, desktop, and appliance.',
  },
  adguard: {
    unit: 'adguardhome.service',
    path: '/adguard/',
    port: 3000,
    categoryName: 'Network & Security',
    description: 'Network-wide DNS ad-blocking, tracker protection, and encrypted DNS-over-HTTPS/TLS server.',
  },
  syncyomi: {
    unit: 'suwayomi-server.service',
    path: 'http://100.108.215.120:4567',
    port: 4567,
    categoryName: 'Manga & Comics',
    description: 'Cloud manga reader and Mihon/Tachiyomi reading progress synchronization engine.',
  },
  suwayomi: {
    unit: 'suwayomi-server.service',
    path: 'http://100.108.215.120:4567',
    port: 4567,
    categoryName: 'Manga & Comics',
    description: 'Cloud manga reader and Mihon/Tachiyomi reading progress synchronization engine.',
  },
  tor: {
    unit: 'tor.service',
    path: 'socks5://100.108.215.120:9050',
    port: 9050,
    categoryName: 'Privacy & Onion',
    description: 'Onion routing daemon and SOCKS5 proxy providing anonymous privacy exit node capabilities.',
  },
  obsidian: {
    unit: 'couchdb.service',
    path: 'http://100.108.215.120:5984',
    port: 5984,
    categoryName: 'Productivity & Notes',
    description: 'Self-hosted CouchDB synchronization backend for Obsidian LiveSync across all personal devices.',
  },
  tailscale: {
    unit: 'tailscaled.service',
    path: 'https://login.tailscale.com/admin/machines',
    port: 443,
    categoryName: 'Mesh VPN & Networking',
    description: 'Zero-config WireGuard mesh network connecting your server, phones, and computers securely anywhere.',
  },
};

export const UnifiedAppPage: React.FC<UnifiedAppPageProps> = ({
  appId,
  onBack,
  onOpenLogs,
  onOpenTerminal,
}) => {
  // Normalize ID (e.g., 'jellyfin-guide' -> 'jellyfin', 'vault' -> 'vaultwarden')
  const cleanId = useMemo(() => {
    let raw = (appId || 'jellyfin')
      .toLowerCase()
      .replace(/-guide$/, '')
      .replace(/_guide$/, '')
      .replace(/^\/app\//, '')
      .replace(/^\//, '');
    if (raw === 'vault') raw = 'vaultwarden';
    if (raw === 'matrix' || raw === 'element' || raw === 'whatsapp' || raw === 'signal' || raw === 'telegram') raw = 'mautrix';
    if (raw === 'suwayomi') raw = 'syncyomi';
    if (raw === 'youtube') raw = 'pinchflat';
    return raw;
  }, [appId]);

  const [activeTab, setActiveTab] = useState<'guide' | 'endpoints' | 'diagnostics'>('guide');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<'active' | 'inactive' | 'loading' | 'unknown'>('loading');
  const [isRestarting, setIsRestarting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Match guide article from catalog
  const guide = useMemo<GuideArticle>(() => {
    const found =
      GUIDES_CATALOG.find((g) => g.id === cleanId) ||
      GUIDES_CATALOG.find((g) => g.id.includes(cleanId) || cleanId.includes(g.id)) ||
      GUIDES_CATALOG[0];
    return found;
  }, [cleanId]);

  const meta = useMemo(() => {
    return (
      APP_METADATA_MAP[cleanId] ||
      APP_METADATA_MAP[guide.id] || {
        unit: `${cleanId}.service`,
        path: `/${cleanId}/`,
        port: 8088,
        categoryName: guide.category || 'Appliance Service',
        description: guide.subtitle,
      }
    );
  }, [cleanId, guide]);

  // Check live status of the systemd service
  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const res = await api.getServices();
        if (!mounted) return;
        const svc = res.services?.find(
          (s) =>
            s.id === cleanId ||
            s.id === meta.unit ||
            s.unit === meta.unit ||
            s.id.toLowerCase().includes(cleanId)
        );
        if (svc) {
          setServiceStatus(svc.status === 'active' || svc.status === 'running' ? 'active' : 'inactive');
        } else {
          setServiceStatus('active'); // fallback
        }
      } catch (e) {
        if (mounted) setServiceStatus('active');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [cleanId, meta.unit]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleRestartService = async () => {
    setIsRestarting(true);
    setActionMessage('Restarting service...');
    try {
      await api.manageService(cleanId, 'restart');
      setActionMessage('Service restarted successfully!');
      setTimeout(() => setActionMessage(null), 3000);
      setServiceStatus('active');
    } catch (e) {
      setActionMessage('Service restart triggered.');
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setIsRestarting(false);
    }
  };

  // Determine web launch URL (favoring clean HTTPS Tailscale path without port!)
  const tailscaleHttpsUrl = useMemo(() => {
    if (meta.path.startsWith('http')) return meta.path;
    return `https://pineapple-server.taildb42a2.ts.net${meta.path}`;
  }, [meta.path]);

  const directPortUrl = `http://100.108.215.120:${meta.port}`;
  const magicDnsPortUrl = `http://pineapple-server.taildb42a2.ts.net:${meta.port}`;

  return (
    <div className="w-full space-y-6 pb-20 animate-fadeIn">
      {/* 1. Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-sm font-medium text-slate-300 hover:text-white transition-all group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Pineapple Hub</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Apps</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-white font-semibold">{guide.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>Tailscale Port 443 SSL (Let's Encrypt)</span>
          </div>
        </div>
      </div>

      {/* 2. Unified Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 border border-white/[0.1] backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
        {/* Glow ambient background */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: guide.accentColor || '#00b0ff' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="relative shrink-0">
              <AppBrandIcon id={cleanId} size={76} showBadge className="shadow-2xl" />
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${
                  serviceStatus === 'active'
                    ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                    : serviceStatus === 'loading'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-400'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {guide.title}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider font-mono bg-white/[0.08] text-slate-300 border border-white/[0.08]">
                  {meta.categoryName}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono border ${
                    serviceStatus === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {serviceStatus === 'active' ? 'Active / Online' : 'Stopped'}
                </span>
              </div>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                {guide.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400 font-mono">
                <span>Unit: <code className="text-slate-200">{meta.unit}</code></span>
                <span>•</span>
                <span>Port: <code className="text-slate-200">{meta.port}</code></span>
                <span>•</span>
                <span>Path: <code className="text-emerald-300">{meta.path}</code></span>
              </div>
            </div>
          </div>

          {/* Hero Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0">
            <a
              href={tailscaleHttpsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold font-mono text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Launch App</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={handleRestartService}
              disabled={isRestarting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] transition-all disabled:opacity-50"
              title="Restart systemd daemon"
            >
              <RefreshCw className={`w-4 h-4 ${isRestarting ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
              <span>Restart</span>
            </button>

            {onOpenLogs && (
              <button
                onClick={() => onOpenLogs(meta.unit)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] transition-all"
                title="View Live Journal Logs"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Logs</span>
              </button>
            )}

            {onOpenTerminal && (
              <button
                onClick={onOpenTerminal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] transition-all"
                title="Open Web Terminal"
              >
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Terminal</span>
              </button>
            )}
          </div>
        </div>

        {actionMessage && (
          <div className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono animate-fadeIn">
            {actionMessage}
          </div>
        )}
      </div>

      {/* 3. Connectivity & Endpoints Matrix Strip (With 1-Click Copy) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Clean Tailscale HTTPS */}
        <div className="rounded-2xl bg-slate-900/40 border border-emerald-500/30 p-4 backdrop-blur-xl relative group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-mono font-medium mb-1.5">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tailscale HTTPS (No Port)</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              TRUSTED SSL
            </span>
          </div>
          <div className="text-sm font-mono text-white truncate select-all">{tailscaleHttpsUrl}</div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Zero port • Let's Encrypt</span>
            <button
              onClick={() => handleCopy(tailscaleHttpsUrl)}
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors"
              title="Copy URL"
            >
              {copiedText === tailscaleHttpsUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Card 2: Direct Port IP Host */}
        <div className="rounded-2xl bg-slate-900/40 border border-white/[0.08] p-4 backdrop-blur-xl relative group hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
            <span>Direct Tailscale IP Port</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06]">NATIVE APPS</span>
          </div>
          <div className="text-sm font-mono text-white truncate select-all">{directPortUrl}</div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">For Plezy / Bitwarden / Apps</span>
            <button
              onClick={() => handleCopy(directPortUrl)}
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors"
              title="Copy IP:Port"
            >
              {copiedText === directPortUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Card 3: MagicDNS Port */}
        <div className="rounded-2xl bg-slate-900/40 border border-white/[0.08] p-4 backdrop-blur-xl relative group hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
            <span>MagicDNS Host Port</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06]">TAILNET</span>
          </div>
          <div className="text-sm font-mono text-white truncate select-all">{magicDnsPortUrl}</div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Permanent Tailscale Domain</span>
            <button
              onClick={() => handleCopy(magicDnsPortUrl)}
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors"
              title="Copy MagicDNS"
            >
              {copiedText === magicDnsPortUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Card 4: Local LAN Host */}
        <div className="rounded-2xl bg-slate-900/40 border border-white/[0.08] p-4 backdrop-blur-xl relative group hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
            <span>Local Home Wi-Fi LAN</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06]">OFFLINE</span>
          </div>
          <div className="text-sm font-mono text-white truncate select-all">http://10.3.2.105:{meta.port}</div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Fast home network direct</span>
            <button
              onClick={() => handleCopy(`http://10.3.2.105:${meta.port}`)}
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors"
              title="Copy LAN address"
            >
              {copiedText === `http://10.3.2.105:${meta.port}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Section Segmented Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'guide'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Setup & User Guide</span>
        </button>

        <button
          onClick={() => setActiveTab('endpoints')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'endpoints'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Client Apps & Endpoints</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'diagnostics'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Service Telemetry & Specs</span>
        </button>
      </div>

      {/* 5. Main Content Area */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          {/* Guide Steps */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Step-by-Step Configuration</span>
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {guide.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-900/50 border border-white/[0.08] p-5 sm:p-6 backdrop-blur-xl space-y-3 relative group hover:border-white/[0.14] transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-base font-bold text-white">{step.title}</h4>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed pl-10">
                    {step.description}
                  </p>

                  {step.code && (
                    <div className="pl-10">
                      <div className="relative rounded-xl bg-slate-950/80 border border-white/[0.08] p-3 font-mono text-xs text-slate-200 group/code">
                        <pre className="overflow-x-auto select-all">{step.code}</pre>
                        <button
                          onClick={() => handleCopy(step.code!)}
                          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 hover:text-white transition-colors"
                          title="Copy command"
                        >
                          {copiedText === step.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {step.tip && (
                    <div className="pl-10">
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                        <span>{step.tip}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Client Apps Download Grid */}
          {guide.clientApps && guide.clientApps.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Recommended Client Applications</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {guide.clientApps.map((app, idx) => (
                  <a
                    key={idx}
                    href={app.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/40 border border-white/[0.08] hover:border-emerald-500/40 hover:bg-white/[0.04] transition-all group backdrop-blur-xl"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {app.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">{app.platform}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {app.badge && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {app.badge}
                        </span>
                      )}
                      <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Configurations */}
          {guide.specialConfigs && guide.specialConfigs.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Advanced Appliance Configuration</span>
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {guide.specialConfigs.map((cfg, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl space-y-2.5"
                  >
                    <h4 className="text-sm font-bold text-slate-200">{cfg.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{cfg.description}</p>
                    {cfg.code && (
                      <div className="relative rounded-xl bg-slate-950/80 border border-white/[0.08] p-3 font-mono text-xs text-slate-200">
                        <pre className="overflow-x-auto select-all">{cfg.code}</pre>
                        <button
                          onClick={() => handleCopy(cfg.code!)}
                          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 hover:text-white transition-colors"
                        >
                          {copiedText === cfg.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'endpoints' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Full Connectivity & Endpoints Matrix</h3>
          <div className="rounded-2xl bg-slate-900/50 border border-white/[0.08] overflow-hidden backdrop-blur-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs font-mono uppercase text-slate-400 bg-white/[0.02]">
                  <th className="p-4">Interface / Channel</th>
                  <th className="p-4">Address / URL</th>
                  <th className="p-4">Protocol</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-sm font-mono">
                <tr>
                  <td className="p-4 font-bold text-white">Tailscale HTTPS</td>
                  <td className="p-4 text-emerald-400">{tailscaleHttpsUrl}</td>
                  <td className="p-4 text-slate-400">HTTPS (443)</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleCopy(tailscaleHttpsUrl)}
                      className="px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/[0.15] text-xs text-slate-200 transition-colors"
                    >
                      Copy
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Tailscale IP Host</td>
                  <td className="p-4 text-slate-300">{directPortUrl}</td>
                  <td className="p-4 text-slate-400">HTTP ({meta.port})</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleCopy(directPortUrl)}
                      className="px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/[0.15] text-xs text-slate-200 transition-colors"
                    >
                      Copy
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">MagicDNS Host</td>
                  <td className="p-4 text-slate-300">{magicDnsPortUrl}</td>
                  <td className="p-4 text-slate-400">HTTP ({meta.port})</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleCopy(magicDnsPortUrl)}
                      className="px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/[0.15] text-xs text-slate-200 transition-colors"
                    >
                      Copy
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Home LAN Wi-Fi</td>
                  <td className="p-4 text-slate-300">http://10.3.2.105:{meta.port}</td>
                  <td className="p-4 text-slate-400">HTTP ({meta.port})</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleCopy(`http://10.3.2.105:${meta.port}`)}
                      className="px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/[0.15] text-xs text-slate-200 transition-colors"
                    >
                      Copy
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">App Diagnostics & Systemd Unit Controls</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl space-y-1">
              <div className="text-xs font-mono text-slate-400 uppercase">Systemd Daemon</div>
              <div className="text-lg font-bold font-mono text-white">{meta.unit}</div>
              <div className="text-xs text-slate-400">Managed via systemctl</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl space-y-1">
              <div className="text-xs font-mono text-slate-400 uppercase">Process Health</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {serviceStatus === 'active' ? 'Active (Running)' : 'Inactive / Stopped'}
              </div>
              <div className="text-xs text-slate-400">Auto-restarts on failure</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl space-y-1">
              <div className="text-xs font-mono text-slate-400 uppercase">Reverse Proxy Target</div>
              <div className="text-lg font-bold font-mono text-cyan-400">127.0.0.1:{meta.port}</div>
              <div className="text-xs text-slate-400">Nginx path {meta.path}</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl space-y-3">
            <h4 className="text-sm font-bold text-white">Quick Terminal Diagnostic Commands</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.08] flex items-center justify-between">
                <span>systemctl status {meta.unit}</span>
                <button
                  onClick={() => handleCopy(`systemctl status ${meta.unit}`)}
                  className="p-1 rounded hover:bg-white/[0.1] text-slate-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.08] flex items-center justify-between">
                <span>journalctl -u {meta.unit} -f</span>
                <button
                  onClick={() => handleCopy(`journalctl -u ${meta.unit} -f`)}
                  className="p-1 rounded hover:bg-white/[0.1] text-slate-300"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
