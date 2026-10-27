import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Layers,
  LayoutGrid,
  Play,
  Square,
  RotateCw,
  ExternalLink,
  Settings,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  X,
  Save,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import CircularCarousel, { CircularCarouselItem } from '../reactbits/CircularCarousel';
import { AppBrandIcon } from '../common/AppBrandIcons';
import { api } from '../../services/api';
import { AppInfo } from '../../types/api';
import { StoreTerminal } from './StoreTerminal';

const FALLBACK_APPS: AppInfo[] = [
  {
    id: 'jellyfin',
    name: 'Jellyfin Media Server',
    tagline: 'Self-hosted privacy-first streaming server',
    description: 'Free Software media system for streaming movies, series, music, and live TV with hardware transcoding.',
    category: 'media',
    package: 'jellyfin-server',
    unit: 'jellyfin.service',
    binary: 'jellyfin',
    port: 8096,
    icon: 'jellyfin',
    accentColor: '#AA5CC3',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'qbittorrent',
    name: 'qBittorrent Headless',
    tagline: 'High-performance torrent engine with WebUI',
    description: 'Feature-rich BitTorrent client running headless with clean Web UI, automated categories, and RSS.',
    category: 'downloads',
    package: 'qbittorrent-nox',
    unit: 'qbittorrent-nox.service',
    binary: 'qbittorrent-nox',
    port: 8080,
    icon: 'qbittorrent',
    accentColor: '#3A75C4',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'metube',
    name: 'MeTube YouTube Downloader',
    tagline: 'Headless YouTube downloader & media streaming engine',
    description: 'Headless Web GUI for downloading YouTube videos and playlists with automated Kodi/Jellyfin NFO metadata and poster streaming integration.',
    category: 'downloads',
    package: 'metube',
    unit: 'metube.service',
    binary: 'metube',
    port: 8085,
    icon: 'youtube',
    accentColor: '#FF0000',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'suwayomi',
    name: 'Suwayomi Manga Server',
    tagline: 'Keiyoushi extension hub & Mihon sync',
    description: 'Self-hosted manga streaming and offline sync server with Keiyoushi source extensions and Tachidesk WebUI.',
    category: 'media',
    package: 'suwayomi-server',
    unit: 'suwayomi-server.service',
    binary: 'suwayomi-server',
    port: 4567,
    icon: 'suwayomi',
    accentColor: '#F43F5E',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'navidrome',
    name: 'Navidrome Music Server',
    tagline: 'Modern Subsonic-compatible audio streamer',
    description: 'Lightweight, fast, and modern music server and streamer with full Subsonic API compatibility.',
    category: 'media',
    package: 'navidrome',
    unit: 'navidrome.service',
    binary: 'navidrome',
    port: 4533,
    icon: 'navidrome',
    accentColor: '#0086D6',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'tailscale',
    name: 'Tailscale Mesh VPN',
    tagline: 'Encrypted WireGuard peer network & subnet router',
    description: 'Zero-config WireGuard mesh network connecting your homelab devices securely from anywhere without port forwarding.',
    category: 'network',
    package: 'tailscale',
    unit: 'tailscaled.service',
    binary: 'tailscaled',
    port: 0,
    icon: 'tailscale',
    accentColor: '#4C72B0',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'syncthing',
    name: 'Syncthing Decentralized Sync',
    tagline: 'Continuous peer-to-peer folder replication',
    description: 'Continuous peer-to-peer decentralized file synchronization protecting your photos, documents, and backups.',
    category: 'backups',
    package: 'syncthing',
    unit: 'syncthing@pineapple.service',
    binary: 'syncthing',
    port: 8384,
    icon: 'syncthing',
    accentColor: '#148FD2',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'adguard',
    name: 'AdGuard Home DNS',
    tagline: 'Network-wide tracking & ad blocker',
    description: 'Network-wide ad-blocking and privacy protection DNS server with DNS-over-HTTPS and parental controls.',
    category: 'network',
    package: 'adguardhome',
    unit: 'adguardhome.service',
    binary: 'adguardhome',
    port: 3000,
    icon: 'adguard',
    accentColor: '#68BC71',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'vaultwarden',
    name: 'Vaultwarden Password Vault',
    tagline: 'Self-hosted end-to-end encrypted password vault',
    description: 'Lightweight Bitwarden-compatible API server written in Rust for managing secure logins, keys, and 2FA secrets.',
    category: 'security',
    package: 'vaultwarden',
    unit: 'vaultwarden.service',
    binary: 'vaultwarden',
    port: 8000,
    icon: 'vaultwarden',
    accentColor: '#175DDC',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'minecraft',
    name: 'Minecraft Gaming Appliance',
    tagline: 'PaperMC server & Playit.gg Anycast domain tunnel',
    description: 'High-tickrate PaperMC server with Aikar GC memory optimization, Anycast domain tunnel, and Crafty 4 support.',
    category: 'gaming',
    package: 'jre17-openjdk-headless',
    unit: 'minecraft-server.service',
    binary: 'minecraft-server',
    port: 25565,
    icon: 'minecraft',
    accentColor: '#34D399',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'docker',
    name: 'Docker Container Engine',
    tagline: 'OCI container runtime & compose engine',
    description: 'Enterprise container runtime engine and Compose orchestrator for running third-party homelab services.',
    category: 'system',
    package: 'docker',
    unit: 'docker.service',
    binary: 'dockerd',
    port: 0,
    icon: 'docker',
    accentColor: '#2496ED',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'niri',
    name: 'Niri Wayland Desktop',
    tagline: 'Modern scrollable tiling Wayland session',
    description: 'Scrollable tiling Wayland compositor with Waybar status integration and hardware acceleration.',
    category: 'desktop',
    package: 'niri',
    unit: 'tinapple-session.service',
    binary: 'niri',
    port: 0,
    icon: 'niri',
    accentColor: '#268BD2',
    installed: true,
    running: false,
    status: 'stopped',
  },
  {
    id: 'playit',
    name: 'Playit.gg Anycast Tunnel',
    tagline: 'Anycast public tunnel for Minecraft & servers',
    description: 'Global Anycast mesh tunnel providing public domains for Minecraft and homelab services without port forwarding.',
    category: 'network',
    package: 'playit',
    unit: 'playit.service',
    binary: 'playit',
    port: 0,
    icon: 'playit',
    accentColor: '#10B981',
    installed: true,
    running: false,
    status: 'stopped',
  },
  {
    id: 'filebrowser',
    name: 'FileBrowser Quantum',
    tagline: 'Web-based file manager and cloud portal',
    description: 'Modern web file manager with integrated document viewing, media streaming, and upload management.',
    category: 'storage',
    package: 'filebrowser',
    unit: 'filebrowser.service',
    binary: 'filebrowser',
    port: 8081,
    icon: 'filebrowser',
    accentColor: '#10B981',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'couchdb',
    name: 'Obsidian LiveSync CouchDB',
    tagline: 'E2EE sync backend for Obsidian notes',
    description: 'End-to-end encrypted synchronization database backend for Obsidian markdown vaults.',
    category: 'storage',
    package: 'couchdb',
    unit: 'couchdb.service',
    binary: 'couchdb',
    port: 5984,
    icon: 'couchdb',
    accentColor: '#E03C31',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'radarr',
    name: 'Radarr Movie Automator',
    tagline: 'Automated movie manager & grabber',
    description: 'Automated movie collection manager, quality profiler, and BitTorrent/Usenet download orchestrator.',
    category: 'automation',
    package: 'radarr',
    unit: 'radarr.service',
    binary: 'radarr',
    port: 7878,
    icon: 'radarr',
    accentColor: '#FFC230',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'sonarr',
    name: 'Sonarr TV Series Automator',
    tagline: 'Smart PVR for TV series & anime',
    description: 'Automated TV show collection manager, episode tracker, and download orchestrator.',
    category: 'automation',
    package: 'sonarr',
    unit: 'sonarr.service',
    binary: 'sonarr',
    port: 8989,
    icon: 'sonarr',
    accentColor: '#00C4FF',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'prowlarr',
    name: 'Prowlarr Indexer Proxy',
    tagline: 'Torrent indexer & tracker sync engine',
    description: 'Unified torrent indexer and Usenet tracker proxy integrating seamlessly with Radarr and Sonarr.',
    category: 'automation',
    package: 'prowlarr',
    unit: 'prowlarr.service',
    binary: 'prowlarr',
    port: 9696,
    icon: 'prowlarr',
    accentColor: '#F59E0B',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'bazarr',
    name: 'Bazarr Subtitle Manager',
    tagline: 'Automated multilingual subtitle manager',
    description: 'Companion subtitle fetcher for Sonarr and Radarr across dozens of multi-language subtitle providers.',
    category: 'automation',
    package: 'bazarr',
    unit: 'bazarr.service',
    binary: 'bazarr',
    port: 6767,
    icon: 'bazarr',
    accentColor: '#8B5CF6',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'seerr',
    name: 'Seerr Media Discovery & Requests',
    tagline: 'Media request & discovery platform for Jellyfin',
    description: 'Clean media request and discovery portal for Jellyfin with integrated user management.',
    category: 'media',
    package: 'seerr',
    unit: 'seerr.service',
    binary: 'seerr',
    port: 5055,
    icon: 'seerr',
    accentColor: '#6366F1',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'jdownloader',
    name: 'JDownloader 2 Headless',
    tagline: 'Universal download manager via MyJDownloader',
    description: 'Headless direct-download manager supporting 1000+ hosters, cloud storage, and MyJDownloader cloud control.',
    category: 'downloads',
    package: 'jdownloader2',
    unit: 'jdownloader.service',
    binary: 'jdownloader',
    port: 0,
    icon: 'jdownloader',
    accentColor: '#2563EB',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'syncyomi',
    name: 'SyncYomi Manga Sync',
    tagline: 'Tachiyomi, Mihon & Suwayomi reading progress sync',
    description: 'Progress synchronization bridge between Tachiyomi, Mihon, and Suwayomi server.',
    category: 'media',
    package: 'syncyomi',
    unit: 'syncyomi.service',
    binary: 'syncyomi',
    port: 8282,
    icon: 'syncyomi',
    accentColor: '#EC4899',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'beeper',
    name: 'Beeper Matrix Chat Bridges',
    tagline: 'Self-hosted multi-network Matrix chat bridges',
    description: 'Self-hosted Matrix chat bridges connecting WhatsApp, Telegram, Signal, Discord, and iMessage.',
    category: 'network',
    package: 'bbctl',
    unit: 'bbctl.service',
    binary: 'bbctl',
    port: 0,
    icon: 'beeper',
    accentColor: '#F43F5E',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'tor',
    name: 'Tor Onion Router',
    tagline: 'Anonymity proxy network daemon',
    description: 'Decentralized privacy routing daemon with SOCKS5 proxy and onion hidden services.',
    category: 'security',
    package: 'tor',
    unit: 'tor.service',
    binary: 'tor',
    port: 9050,
    icon: 'tor',
    accentColor: '#7D4698',
    installed: false,
    running: false,
    status: 'not_installed',
  },
  {
    id: 'protonvpn',
    name: 'Proton VPN Headless Client',
    tagline: 'High-speed Swiss WireGuard & OpenVPN tunnel',
    description: 'High-speed Swiss encrypted WireGuard & OpenVPN tunnel with NetShield tracking/ad-blocker and DNS leak protection.',
    category: 'network',
    package: 'proton-vpn-cli',
    unit: 'proton-vpn-daemon.service',
    binary: 'protonvpn-cli',
    port: 0,
    icon: 'protonvpn',
    accentColor: '#6D4AFF',
    installed: false,
    running: false,
    status: 'not_installed',
  },
];

export const ChaddyStore: React.FC = () => {
  const [apps, setApps] = useState<AppInfo[]>(FALLBACK_APPS);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('grid');
  const [loadingAction, setLoadingAction] = useState<Record<string, string>>({});
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Config modal state
  const [configModalApp, setConfigModalApp] = useState<AppInfo | null>(null);
  const [editPort, setEditPort] = useState<number>(0);
  const [rawConfigPreview, setRawConfigPreview] = useState<string>('');
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [actionError, setActionError] = useState<{ id: string; name?: string; message: string } | null>(null);

  const fetchApps = useCallback(async () => {
    const list = await api.getApps();
    if (list && list.length > 0) {
      setApps(list);
    }
  }, []);

  useEffect(() => {
    fetchApps();
    const timer = setInterval(fetchApps, 4000);
    return () => clearInterval(timer);
  }, [fetchApps]);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const getAppUrl = (port: number) => {
    const proto = (port === 8000 && isHttps) ? 'https' : 'http';
    return `${proto}://${currentHost}:${port}`;
  };

  const handleAction = async (id: string, action: 'install' | 'uninstall' | 'start' | 'stop' | 'restart') => {
    setActionError(null);
    setLoadingAction((prev) => ({ ...prev, [id]: action }));
    try {
      let res: { ok: boolean; error?: string } = { ok: false };
      if (action === 'install') {
        res = await api.installApp(id);
        if (res.ok) {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 },
            colors: [getComputedStyle(document.documentElement).getPropertyValue('--tinapple-accent').trim(), getComputedStyle(document.documentElement).getPropertyValue('--tinapple-accent-secondary').trim(), '#ffffff'],
          });
        }
      } else if (action === 'uninstall') {
        res = await api.uninstallApp(id);
      } else if (action === 'start') {
        res = await api.startApp(id);
      } else if (action === 'stop') {
        res = await api.stopApp(id);
      } else if (action === 'restart') {
        res = await api.restartApp(id);
      }

      if (!res.ok) {
        const appObj = apps.find((a) => a.id === id);
        setActionError({
          id,
          name: appObj ? appObj.name : id,
          message: res.error || `Failed to ${action} ${id}.`,
        });
      }
      await fetchApps();
    } catch (err: any) {
      setActionError({
        id,
        message: err?.message || `Failed to ${action} ${id}.`,
      });
    } finally {
      setLoadingAction((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleOpenConfig = async (app: AppInfo) => {
    setConfigModalApp(app);
    setEditPort(app.port || 0);
    setRawConfigPreview('Loading current system configuration...');
    const data = await api.getAppConfig(app.id);
    if (data) {
      if (data.port) setEditPort(data.port);
      setRawConfigPreview(data.rawConfig || data.rawOverride || 'No custom config file found. Using system defaults.');
    } else {
      setRawConfigPreview('Configuration not yet initialized on filesystem.');
    }
  };

  const handleSaveConfig = async () => {
    if (!configModalApp) return;
    setSavingConfig(true);
    try {
      await api.updateAppConfig(configModalApp.id, {
        port: editPort > 0 ? editPort : undefined,
      });
      await fetchApps();
      setConfigModalApp(null);
    } finally {
      setSavingConfig(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>(['all']);
    apps.forEach((a) => set.add(a.category));
    return Array.from(set);
  }, [apps]);

  const filteredApps = useMemo(() => {
    if (filterCategory === 'all') return apps;
    return apps.filter((a) => a.category === filterCategory);
  }, [apps, filterCategory]);

  const selectedApp = filteredApps[selectedIndex] || filteredApps[0] || apps[0];

  const carouselItems: CircularCarouselItem[] = useMemo(() => {
    return filteredApps.map((a) => {
      const ext = ['suwayomi', 'navidrome', 'filebrowser'].includes(a.id) ? 'png' : 'svg';
      return {
        src: a.icon ? `/icons/${a.icon}.${ext}` : '/icons/archlinux.svg',
        title: a.name,
        subtitle: a.tagline,
        alt: a.name,
      };
    });
  }, [filteredApps]);

  const renderStatusBadge = (app: AppInfo) => {
    if (app.status === 'running') {
      return (
        <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE • RUNNING
        </span>
      );
    }
    if (app.status === 'stopped') {
      return (
        <span className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          INSTALLED • STOPPED
        </span>
      );
    }
    if (app.status === 'failed') {
      return (
        <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          FAILED
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60 flex items-center gap-1.5 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-slate-500" />
        NOT INSTALLED
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-tinapple-card/95 via-tinapple-surface/90 to-tinapple-card/95 border border-tinapple-border backdrop-blur-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tinapple-gold/15 text-tinapple-gold border border-tinapple-gold/25 text-xs mb-3 font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tinapple Appliance & App Management</span>
          </div>

          <div className="mb-1">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight font-mono uppercase">
              APPLIANCE STORE & LIFECYCLE
            </h2>
          </div>

          <p className="text-xs md:text-sm text-tinapple-subtext leading-relaxed">
            Install, start, stop, configure, and monitor live systemd appliances with verified official packages and zero background telemetry.
          </p>
        </div>

        {/* View Switcher & Category Filter */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-tinapple-dark/90 border border-tinapple-border overflow-x-auto">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setFilterCategory(c);
                  setSelectedIndex(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize font-mono transition-all ${
                  filterCategory === c
                    ? 'bg-tinapple-gold text-tinapple-dark shadow-sm'
                    : 'text-tinapple-subtext hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex items-center p-1 rounded-xl bg-tinapple-dark/90 border border-tinapple-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-tinapple-gold text-tinapple-dark shadow-sm'
                  : 'text-tinapple-subtext hover:text-white'
              }`}
              title="Bento Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('carousel')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'carousel'
                  ? 'bg-tinapple-gold text-tinapple-dark shadow-sm'
                  : 'text-tinapple-subtext hover:text-white'
              }`}
              title="3D Radial View"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Error Alert Banner */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-white font-mono">
                Operation Failed: {actionError.name || actionError.id}
              </div>
              <div className="text-xs text-rose-300 font-mono mt-0.5 whitespace-pre-wrap">
                {actionError.message}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-white transition-colors"
            title="Dismiss error notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: 3D RADIAL CAROUSEL VIEW */}
      {viewMode === 'carousel' && selectedApp && (
        <div className="space-y-6">
          <div className="relative rounded-2xl bg-tinapple-card/60 border border-tinapple-border/80 backdrop-blur-xl p-4 overflow-hidden h-[420px] w-full flex items-center justify-center">
            <CircularCarousel
              className="w-full h-full"
              items={carouselItems}
              cardWidth={180}
              aspectRatio={180 / 220}
              curve={200}
              preset="orbit"
              onChange={(idx) => setSelectedIndex(idx)}
              onItemClick={(_item, idx) => setSelectedIndex(idx)}
            />
          </div>

          {/* Selected App Inspector Card */}
          <SpotlightCard
            className="p-6 md:p-8"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-tinapple-border/70">
              <div className="flex items-center gap-4">
                <AppBrandIcon id={selectedApp.id} size={56} showBadge />
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-white tracking-tight">{selectedApp.name}</h2>
                    {renderStatusBadge(selectedApp)}
                  </div>
                  <p className="text-sm font-semibold text-tinapple-gold font-mono mt-0.5">{selectedApp.tagline}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {selectedApp.status === 'running' && selectedApp.port > 0 && (
                  <>
                    <a
                      href={getAppUrl(selectedApp.port)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {selectedApp.id === 'suwayomi' ? 'Suwayomi Web (:4567)' : `Open WebUI (:${selectedApp.port})`}
                    </a>
                    {selectedApp.id === 'suwayomi' && (
                      <>
                        <a
                          href="/tsumiru/"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Tsumiru Web
                        </a>
                        <a
                          href="/download/tsumiru"
                          download="tsumiru-client.apk"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold transition-all shadow-sm"
                          title="Download Suwayomi-Tsumiru Native Android APK"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Tsumiru APK
                        </a>
                      </>
                    )}
                  </>
                )}

                {selectedApp.status === 'running' && (
                  <>
                    <button
                      onClick={() => handleAction(selectedApp.id, 'restart')}
                      disabled={Boolean(loadingAction[selectedApp.id])}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-medium transition-all"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${loadingAction[selectedApp.id] === 'restart' ? 'animate-spin' : ''}`} />
                      Restart
                    </button>
                    <button
                      onClick={() => handleAction(selectedApp.id, 'stop')}
                      disabled={Boolean(loadingAction[selectedApp.id])}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-mono font-medium transition-all"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Stop
                    </button>
                  </>
                )}

                {selectedApp.status === 'stopped' && (
                  <button
                    onClick={() => handleAction(selectedApp.id, 'start')}
                    disabled={Boolean(loadingAction[selectedApp.id])}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs font-mono transition-all hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Service
                  </button>
                )}

                {selectedApp.status === 'not_installed' && (
                  <button
                    onClick={() => handleAction(selectedApp.id, 'install')}
                    disabled={Boolean(loadingAction[selectedApp.id])}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-mono transition-all shadow-lg shadow-emerald-950/40"
                  >
                    {loadingAction[selectedApp.id] === 'install' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Install Appliance Package
                  </button>
                )}

                {selectedApp.installed && (
                  <>
                    <button
                      onClick={() => handleOpenConfig(selectedApp)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-all"
                      title="Configure Service"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Configure
                    </button>
                    <button
                      onClick={() => handleAction(selectedApp.id, 'uninstall')}
                      disabled={Boolean(loadingAction[selectedApp.id])}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-mono transition-all"
                      title="Uninstall Package"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Uninstall
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-tinapple-subtext leading-relaxed mt-5">{selectedApp.description}</p>
          </SpotlightCard>
        </div>
      )}

      {/* VIEW 2: BENTO GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => {
            const isLoading = Boolean(loadingAction[app.id]);
            return (
              <SpotlightCard
                key={app.id}
                className="p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <AppBrandIcon id={app.id} size={44} showBadge />
                    {renderStatusBadge(app)}
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight">{app.name}</h3>
                  <p className="text-xs font-semibold text-tinapple-gold mt-0.5 font-mono">{app.tagline}</p>
                  <p className="text-xs text-tinapple-subtext mt-2.5 leading-relaxed line-clamp-3">
                    {app.description}
                  </p>

                  {/* Port & Unit Metadata */}
                  <div className="mt-4 pt-3 border-t border-tinapple-border/70 flex items-center justify-between text-[11px] font-mono text-tinapple-muted">
                    <span>Unit: <code className="text-slate-300">{app.unit}</code></span>
                    {app.port > 0 && (
                      <span className="text-emerald-400 font-bold">Port :{app.port}</span>
                    )}
                  </div>
                </div>

                {/* Card Action Bar */}
                <div className="mt-5 pt-3 border-t border-tinapple-border/50 flex flex-wrap items-center justify-between gap-2">
                  {/* Left Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {app.status === 'running' && (
                      <>
                        {app.port > 0 && (
                          <a
                            href={getAppUrl(app.port)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1"
                            title={app.id === 'suwayomi' ? 'Open Suwayomi WebUI' : 'Open Web Dashboard'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {app.id === 'suwayomi' ? 'WebUI' : 'Open'}
                          </a>
                        )}
                        {app.id === 'suwayomi' && (
                          <a
                            href="/tsumiru/"
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold flex items-center gap-1"
                            title="Open Suwayomi-Tsumiru Web"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Tsumiru
                          </a>
                        )}
                        <button
                          onClick={() => handleAction(app.id, 'restart')}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
                          title="Restart Daemon"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${loadingAction[app.id] === 'restart' ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleAction(app.id, 'stop')}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs"
                          title="Stop Daemon"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {app.status === 'stopped' && (
                      <button
                        onClick={() => handleAction(app.id, 'start')}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Start
                      </button>
                    )}

                    {app.status === 'not_installed' && (
                      <button
                        onClick={() => handleAction(app.id, 'install')}
                        disabled={isLoading}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs font-mono flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        {loadingAction[app.id] === 'install' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Install
                      </button>
                    )}
                  </div>

                  {/* Right Tools (Configure & Uninstall) */}
                  {app.installed && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenConfig(app)}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-xs transition-colors"
                        title="Configure settings & port"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleAction(app.id, 'uninstall')}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition-colors"
                        title="Uninstall package"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      )}

      {/* CONFIG MANAGEMENT MODAL */}
      {configModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <AppBrandIcon id={configModalApp.id} size={36} showBadge />
                <div>
                  <h3 className="text-base font-bold text-white">{configModalApp.name} Configuration</h3>
                  <span className="text-xs font-mono text-tinapple-gold">{configModalApp.unit}</span>
                </div>
              </div>
              <button
                onClick={() => setConfigModalApp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              {/* Port configuration */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Service Listen Port
                </label>
                <input
                  type="number"
                  value={editPort || ''}
                  onChange={(e) => setEditPort(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 8096"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-tinapple-gold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Updates systemd service drop-in environment <code>PORT={editPort}</code>.
                </span>
              </div>

              {/* System Config File Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Configuration File Preview
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {configModalApp.configPath || 'systemd drop-in'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre leading-relaxed">
                  {rawConfigPreview}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfigModalApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-tinapple-gold hover:brightness-110 text-slate-950 font-bold text-xs font-mono transition-all shadow-md shadow-tinapple-gold/20"
              >
                {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save & Restart Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Download Progress & Provisioning Terminal */}
      <StoreTerminal />
    </div>
  );
};

export default ChaddyStore;
