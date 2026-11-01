import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Plus,
  Wrench,
  Check,
  RotateCcw,
  LayoutGrid,
  Layers,
  Activity,
  Sparkles,
  Film,
  Download,
  Cloud,
  Shield,
  Cpu,
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Menu,
  Palette,
  RefreshCw,
  Terminal,
  BookOpen,
  Maximize2,
  Minimize2,
  MoveUp,
  MoveDown,
  ArrowRight,
  Lock,
  Globe,
  Sliders,
  Move,
  ShoppingBag,
  Server,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomarrResourceWidget,
  HomarrClockWidget,
  HomarrDownloadsWidget,
  HomarrNetworkGuardWidget,
  HomarrMediaWidget,
  HomarrMangaWidget,
  HomarrSyncVaultWidget,
  HomarrHardwareWidget,
  HomarrPortMatrixWidget,
  HomarrTerminalWidget,
  HomarrJournalWidget,
  HomarrBookmarksWidget,
  CustomBookmarkItem,
  HomarrSingleApplianceWidget,
} from './HomarrWidgets';
import {
  CustomIframeWidget,
  CustomMarkdownWidget,
  CustomLinksWidget,
  CustomMonitorWidget,
} from './CustomWidgets';
import { HomarrAppTile } from './HomarrAppTile';
import { HomarrCanvas } from './HomarrCanvas';
import { WidgetEditorModal } from './WidgetEditorModal';
import { WidgetCreatorModal } from './WidgetCreatorModal';
import { TelemetrySnapshot, SystemInfo, ServiceInfo } from '../../types/api';
import { CanvasWidget, CanvasLayoutMode, WidgetCategory } from '../../types/canvas';
import { AndroidBridge } from '../../services/androidBridge';
import { api, getServiceUrl } from '../../services/api';

const BOARD_STORAGE_KEY = 'tinapple_homarr_board_widgets_v8';
const SECTION_COLLAPSE_STORAGE_KEY = 'tinapple_homarr_sections_collapsed_v1';
const VIEW_MODE_STORAGE_KEY = 'tinapple_homarr_view_mode';

export interface HomarrBoardProps {
  telemetry: TelemetrySnapshot;
  systemInfo: SystemInfo;
  services: ServiceInfo[];
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  isOwner: boolean;
  onOpenAppSettings?: (app: any) => void;
  onOpenTailscale: () => void;
  onOpenProton: () => void;
  onOpenTerminal: () => void;
  onOpenTools: () => void;
  onOpenGuide: (guideId: string) => void;
  onOpenAppearance: () => void;
  onOpenDrawer: () => void;
  onNavigateTab: (tabId: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

// 1. Definition of Built-in Curated Homarr Appliance Tiles
interface CuratedAppliance {
  id: string;
  name: string;
  tagline: string;
  category: 'media' | 'downloads' | 'storage' | 'network' | 'system';
  icon: string;
  port?: number;
  subpath: string;
  guideId?: string;
  defaultColSpan?: 3 | 4 | 6 | 12;
}

const CURATED_APPLIANCES: CuratedAppliance[] = [
  // Media & Streaming
  { id: 'jellyfin', name: 'Jellyfin Media Server', tagline: 'Hardware Transcoding & 4K DirectPlay', category: 'media', icon: '🎬', port: 8096, subpath: '/jellyfin/', guideId: 'jellyfin' },
  { id: 'seerr', name: 'Seerr Media Discovery', tagline: 'Automated 1-Click Requests & Approvals', category: 'media', icon: '👁️', port: 5055, subpath: '/seerr/', guideId: 'jellyseerr' },
  { id: 'navidrome', name: 'Navidrome Music Server', tagline: 'Lossless Audio & Subsonic API Streaming', category: 'media', icon: '🎵', port: 4533, subpath: '/navidrome/', guideId: 'navidrome' },
  { id: 'pinchflat', name: 'Pinchflat YouTube Stack', tagline: 'Automated YouTube Channel Archiver', category: 'media', icon: '📺', port: 8945, subpath: '/pinchflat/', guideId: 'pinchflat' },
  { id: 'suwayomi', name: 'Suwayomi Manga Server', tagline: 'Keiyoushi Extensions & Tachiyomi Sync', category: 'media', icon: '📖', port: 4567, subpath: '/suwayomi/', guideId: 'suwayomi' },
  { id: 'tsumiru', name: 'Tsumiru Reader', tagline: 'Offline Manga Reader & Desktop CanvasKit', category: 'media', icon: '📚', port: 0, subpath: '/tsumiru/' },

  // Downloads & Automation
  { id: 'qbittorrent', name: 'qBittorrent Headless', tagline: 'P2P BitTorrent Client & WebUI', category: 'downloads', icon: '📥', port: 8080, subpath: '/qbittorrent/', guideId: 'qbittorrent' },
  { id: 'radarr', name: 'Radarr Movie Automator', tagline: 'Automated 4K/1080p Movie Indexer & Grabber', category: 'downloads', icon: '🍿', port: 7878, subpath: '/radarr/', guideId: 'radarr' },
  { id: 'sonarr', name: 'Sonarr TV Series Automator', tagline: 'Automated Anime & TV Episode PVR', category: 'downloads', icon: '📺', port: 8989, subpath: '/sonarr/', guideId: 'sonarr' },
  { id: 'prowlarr', name: 'Prowlarr Tracker Proxy', tagline: 'Unified Torrent & Usenet Indexer Proxy', category: 'downloads', icon: '🔍', port: 9696, subpath: '/prowlarr/', guideId: 'prowlarr' },
  { id: 'bazarr', name: 'Bazarr Subtitles', tagline: 'Multilingual Automated Subtitle Matcher', category: 'downloads', icon: '💬', port: 6767, subpath: '/bazarr/', guideId: 'bazarr' },

  // Storage & Cloud
  { id: 'syncthing', name: 'Syncthing Decentralized Sync', tagline: 'Continuous Bidirectional P2P Replication', category: 'storage', icon: '🔄', port: 8384, subpath: '/syncthing/', guideId: 'syncthing' },
  { id: 'vaultwarden', name: 'Vaultwarden Password Vault', tagline: 'Encrypted Bitwarden Zero-Knowledge Cloud', category: 'storage', icon: '🔐', port: 8000, subpath: '/vault/', guideId: 'vaultwarden' },

  // Network & Privacy
  { id: 'adguard', name: 'AdGuard Home DNS', tagline: 'Network-wide DNS Tracker & Malware Blocker', category: 'network', icon: '🛡️', port: 3000, subpath: '/adguard/', guideId: 'adguard' },
  { id: 'tor', name: 'Tor Privacy Onion Proxy', tagline: 'Onion Routing & SOCKS5 Privacy Daemon', category: 'network', icon: '🧅', port: 9050, subpath: '/guides/tor.html', guideId: 'tor' },
];

// 2. Default Board Widgets Set
const DEFAULT_BOARD_WIDGETS: CanvasWidget[] = [
  {
    id: 'silicon_telemetry',
    type: 'silicon_telemetry',
    title: 'Silicon Resource Monitor',
    description: 'Real-time CPU load, Memory (RAM), Root storage fill bars, core count, and thermals.',
    icon: '⚡',
    category: 'telemetry',
    x: 0,
    y: 0,
    w: 520,
    h: 340,
    colSpan: 6,
    zIndex: 1,
    visible: true,
  },
  {
    id: 'digital_clock',
    type: 'digital_clock',
    title: 'Digital Clock & Uptime',
    description: 'Real-time digital clock with seconds, date, UTC timezone, and node uptime.',
    icon: '⏱️',
    category: 'system',
    x: 0,
    y: 0,
    w: 420,
    h: 340,
    colSpan: 6,
    zIndex: 2,
    visible: true,
  },
  {
    id: 'transfers_rate',
    type: 'transfers_rate',
    title: 'Active Transfers & Speeds',
    description: 'qBittorrent & Pinchflat download/upload transfer speeds and active torrent tasks count.',
    icon: '📥',
    category: 'storage',
    x: 0,
    y: 0,
    w: 420,
    h: 340,
    colSpan: 6,
    zIndex: 3,
    visible: true,
  },
  {
    id: 'media_server',
    type: 'media_server',
    title: 'Jellyfin Media Server',
    description: 'Hardware video transcoding status (VA-API/QSV), 4K DirectPlay streaming, and web player.',
    icon: '🎬',
    category: 'media',
    x: 0,
    y: 0,
    w: 460,
    h: 320,
    colSpan: 6,
    zIndex: 4,
    visible: true,
  },
  {
    id: 'manga_shelf',
    type: 'manga_shelf',
    title: 'Suwayomi Manga Shelf',
    description: 'Self-hosted manga library status and fast offline Tsumiru reader launcher.',
    icon: '📖',
    category: 'media',
    x: 0,
    y: 0,
    w: 420,
    h: 320,
    colSpan: 6,
    zIndex: 5,
    visible: true,
  },
  {
    id: 'network_guard',
    type: 'network_guard',
    title: 'Tailscale Mesh & Privacy Guard',
    description: 'Tailscale VPN MagicDNS status, direct Tor onion exit toggle switch, and AdGuard Home.',
    icon: '🛡️',
    category: 'network',
    x: 0,
    y: 0,
    w: 480,
    h: 320,
    colSpan: 6,
    zIndex: 6,
    visible: true,
  },
  {
    id: 'storage_vault',
    type: 'storage_vault',
    title: 'Syncthing & TrueNAS Bridge',
    description: 'Continuous encrypted P2P folder synchronization and TrueNAS ZFS dataset bridge.',
    icon: '🔄',
    category: 'storage',
    x: 0,
    y: 0,
    w: 480,
    h: 320,
    colSpan: 6,
    zIndex: 7,
    visible: true,
  },
  {
    id: 'port_matrix',
    type: 'port_matrix',
    title: 'Server Port Matrix & Listeners',
    description: 'Live matrix of verified open ports and reverse proxy subpaths.',
    icon: '🔌',
    category: 'network',
    x: 0,
    y: 0,
    w: 460,
    h: 320,
    colSpan: 6,
    zIndex: 8,
    visible: true,
  },
  {
    id: 'quick_terminal',
    type: 'quick_terminal',
    title: 'Interactive Web Terminal',
    description: 'Embedded fast PTY bash shell launcher for quick node troubleshooting.',
    icon: '💻',
    category: 'system',
    x: 0,
    y: 0,
    w: 480,
    h: 340,
    colSpan: 6,
    zIndex: 9,
    visible: true,
  },
  {
    id: 'homelab_bookmarks',
    type: 'homelab_bookmarks',
    title: 'Homelab Web Bookmarks',
    description: 'Customizable grid of external web links and homelab portals with icon customization.',
    icon: '🔖',
    category: 'system',
    x: 0,
    y: 0,
    w: 1200,
    h: 280,
    colSpan: 12,
    zIndex: 10,
    visible: true,
  },
];

export const HomarrBoard: React.FC<HomarrBoardProps> = ({
  telemetry,
  systemInfo,
  services,
  isEditMode,
  setIsEditMode,
  isOwner,
  onOpenAppSettings,
  onOpenTailscale,
  onOpenProton,
  onOpenTerminal,
  onOpenTools,
  onOpenGuide,
  onOpenAppearance,
  onOpenDrawer,
  onNavigateTab,
  onRefresh,
  isRefreshing,
}) => {
  // 1. View Mode (Clean Homarr Grid Board vs 2D Pannable Canvas)
  const [viewMode, setViewMode] = useState<'grid' | 'canvas'>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return saved === 'canvas' ? 'canvas' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetViewMode = (mode: 'grid' | 'canvas') => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  };

  // 2. Search & Category Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' or 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Persistent Board Widgets State
  const [widgets, setWidgets] = useState<CanvasWidget[]>(() => {
    try {
      const saved = localStorage.getItem(BOARD_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      // Fallback to previous canvas storage if available
      const canvasSaved = localStorage.getItem('tinapple_homarr_canvas_widgets_v7');
      if (canvasSaved) return JSON.parse(canvasSaved);
    } catch (e) {
      console.warn('Failed to load board widgets state', e);
    }
    return DEFAULT_BOARD_WIDGETS;
  });

  // 4. Collapsible Section Headers State
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(SECTION_COLLAPSE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem(SECTION_COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Modals
  const [editingWidget, setEditingWidget] = useState<CanvasWidget | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);

  // Sync widgets with localStorage
  const saveWidgets = (newWidgets: CanvasWidget[]) => {
    setWidgets(newWidgets);
    try {
      localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(newWidgets));
    } catch (e) {
      console.error('Failed to save widgets', e);
    }
  };

  const handleResetBoard = () => {
    if (window.confirm('Reset Homarr board layout to factory defaults?')) {
      saveWidgets(DEFAULT_BOARD_WIDGETS);
      setCollapsedSections({});
      localStorage.removeItem(SECTION_COLLAPSE_STORAGE_KEY);
      AndroidBridge.performHaptic('heavy');
    }
  };

  const handleAddWidget = (newWidget: CanvasWidget) => {
    saveWidgets([...widgets, newWidget]);
    setCreatorOpen(false);
    AndroidBridge.performHaptic('medium');
  };

  const handleUpdateWidget = (updated: CanvasWidget) => {
    saveWidgets(widgets.map((w) => (w.id === updated.id ? updated : w)));
    setEditingWidget(null);
  };

  const handleDeleteWidget = (id: string) => {
    saveWidgets(widgets.filter((w) => w.id !== id));
    AndroidBridge.performHaptic('light');
  };

  const handleToggleWidgetVisibility = (id: string) => {
    saveWidgets(
      widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const handleToggleColSpan = (id: string) => {
    saveWidgets(
      widgets.map((w) => {
        if (w.id !== id) return w;
        const current = w.colSpan || 6;
        const nextSpan = current === 3 ? 6 : current === 6 ? 12 : 3;
        return { ...w, colSpan: nextSpan as 3 | 4 | 6 | 12 };
      })
    );
  };

  const handleMoveWidget = (id: string, direction: 'up' | 'down') => {
    const idx = widgets.findIndex((w) => w.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= widgets.length) return;

    const reordered = [...widgets];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    saveWidgets(reordered);
    AndroidBridge.performHaptic('light');
  };

  // 5. Build dynamic services map for live ping statuses
  const servicesMap = useMemo(() => {
    const map = new Map<string, ServiceInfo>();
    services.forEach((s) => {
      map.set(s.id, s);
      map.set(s.name, s);
    });
    return map;
  }, [services]);

  const totalServicesCount = CURATED_APPLIANCES.length;
  const onlineServicesCount = useMemo(() => {
    return CURATED_APPLIANCES.filter((app) => {
      const s = servicesMap.get(app.id);
      return s?.activeState === 'active';
    }).length;
  }, [servicesMap]);

  // 6. Filter Appliances & Widgets by search query and category
  const filteredAppliances = useMemo(() => {
    return CURATED_APPLIANCES.filter((app) => {
      const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        app.name.toLowerCase().includes(q) ||
        app.tagline.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  const visibleWidgets = useMemo(() => {
    return widgets.filter((w) => {
      if (!isEditMode && !w.visible) return false;
      const matchesCategory = selectedCategory === 'all' || w.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        w.title.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q))
      );
    });
  }, [widgets, isEditMode, selectedCategory, searchQuery]);

  // Render individual widget component
  const renderWidgetContent = (widget: CanvasWidget) => {
    switch (widget.type) {
      case 'silicon_telemetry':
        return <HomarrResourceWidget telemetry={telemetry} systemInfo={systemInfo} />;
      case 'digital_clock':
        return <HomarrClockWidget systemInfo={systemInfo} />;
      case 'transfers_rate':
        return <HomarrDownloadsWidget />;
      case 'network_guard':
        return (
          <HomarrNetworkGuardWidget
            onOpenTailscale={onOpenTailscale}
            onOpenProton={onOpenProton}
          />
        );
      case 'media_server':
        return <HomarrMediaWidget onOpenGuide={onOpenGuide} />;
      case 'manga_shelf':
        return <HomarrMangaWidget />;
      case 'storage_vault':
        return <HomarrSyncVaultWidget />;
      case 'hardware_thermals':
        return <HomarrHardwareWidget telemetry={telemetry} />;
      case 'port_matrix':
        return <HomarrPortMatrixWidget onOpenTools={onOpenTools} />;
      case 'quick_terminal':
        return <HomarrTerminalWidget onOpenTerminal={onOpenTerminal} />;
      case 'node_journal':
        return <HomarrJournalWidget />;
      case 'homelab_bookmarks':
        return <HomarrBookmarksWidget isEditMode={isEditMode} />;
      case 'single_appliance':
        return (
          <HomarrSingleApplianceWidget
            title={widget.title}
            appId={widget.appId || widget.id}
            tagline={widget.description}
            port={widget.targetPort}
            icon={widget.icon}
            accentColor={widget.accentColor}
            onOpenGuide={onOpenGuide}
          />
        );
      case 'custom_iframe':
        return (
          <CustomIframeWidget
            url={widget.iframeUrl || ''}
            title={widget.title}
            refreshSeconds={widget.refreshSeconds}
          />
        );
      case 'custom_markdown':
        return <CustomMarkdownWidget markdown={widget.markdown || ''} />;
      case 'custom_links':
        return (
          <CustomLinksWidget
            links={widget.links || []}
            isEditMode={isEditMode}
            onUpdateLinks={(newLinks) => {
              saveWidgets(
                widgets.map((w) => (w.id === widget.id ? { ...w, links: newLinks } : w))
              );
            }}
          />
        );
      case 'custom_monitor':
        return (
          <CustomMonitorWidget
            endpoint={widget.pingEndpoint || ''}
            port={widget.targetPort}
            title={widget.title}
            refreshSeconds={widget.refreshSeconds}
          />
        );
      default:
        return (
          <div className="p-4 text-zinc-400 font-mono text-xs">
            Unknown widget type: {widget.type}
          </div>
        );
    }
  };

  // Helper for colSpan classes
  const getColSpanClass = (span?: number) => {
    switch (span) {
      case 12:
        return 'col-span-12';
      case 6:
        return 'col-span-12 lg:col-span-6';
      case 4:
        return 'col-span-12 sm:col-span-6 lg:col-span-4';
      case 3:
      default:
        return 'col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3';
    }
  };

  // If user explicitly chose 2D Canvas View
  if (viewMode === 'canvas') {
    return (
      <div className="w-full">
        {/* View Mode Return Banner */}
        <div className="mb-4 px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-zinc-300 font-bold">2D Freeform Pannable Canvas Mode</span>
          </div>
          <button
            onClick={() => handleSetViewMode('grid')}
            className="px-3 py-1.5 rounded-xl bg-tinapple-gold hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Switch to Homarr Full Page Board</span>
          </button>
        </div>

        <HomarrCanvas
          telemetry={telemetry}
          systemInfo={systemInfo}
          services={services}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          isOwner={isOwner}
          onOpenAppSettings={onOpenAppSettings}
          onOpenTailscale={onOpenTailscale}
          onOpenProton={onOpenProton}
          onOpenTerminal={onOpenTerminal}
          onOpenTools={onOpenTools}
          onOpenGuide={onOpenGuide}
        />
      </div>
    );
  }

  // Categories definition
  const CATEGORIES = [
    { id: 'all', label: 'All Tiles', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'media', label: 'Media', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'downloads', label: 'Downloads', icon: <Download className="w-3.5 h-3.5" /> },
    { id: 'storage', label: 'Storage & Cloud', icon: <Cloud className="w-3.5 h-3.5" /> },
    { id: 'network', label: 'Network & Privacy', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'telemetry', label: 'Silicon & Telemetry', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'system', label: 'System & Bookmarks', icon: <Bookmark className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full space-y-6 pb-20 select-none font-sans">
      {/* ═══════════════════════════════════════════════════════════════
          1. AUTHENTIC HOMARR UNIFIED COMMAND & SEARCH BAR
          ═══════════════════════════════════════════════════════════════ */}
      <header className="rounded-3xl bg-slate-950/75 border border-white/[0.08] p-4 sm:p-5 backdrop-blur-2xl shadow-2xl shadow-black/40 flex flex-col gap-4">
        {/* Top Header Row: Server Identity, Status, and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Branding & Status Badge */}
          <div className="flex items-center gap-3.5">
            {/* Drawer Menu Button (Instant Access to App Store, Guides, Web Terminal, Settings) */}
            <button
              onClick={onOpenDrawer}
              className="p-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white transition-all shadow-sm active:scale-95"
              title="Open Appliance Navigation Drawer (Store, Guides, Terminal, Tools)"
            >
              <Menu className="w-5 h-5 text-tinapple-gold" />
            </button>

            {/* Server Node Icon */}
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 via-purple-500/20 to-sky-500/20 border border-white/15 flex items-center justify-center text-xl shrink-0 shadow-inner">
              🍎
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
                  {systemInfo?.hostname || 'tinapple-server'}
                </h1>
                {/* Live Online Badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{onlineServicesCount}/{totalServicesCount} Online</span>
                </span>
                {/* Headless Server / Niri Desktop Badge */}
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] border border-white/10 text-zinc-400 font-semibold">
                  {systemInfo?.sessionMode === 'headless' ? 'Headless Server' : 'Niri Desktop'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                Homarr Appliance Landing Page • All Daemons Reverse Proxied
              </p>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center flex-wrap gap-2 font-mono text-xs">
            {/* App Store Shortcut */}
            <button
              onClick={() => onNavigateTab('store')}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Open 1-Click ChaddyStore App & Pack Installer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">App Store</span>
            </button>

            {/* Setup Guides Shortcut */}
            <button
              onClick={() => onNavigateTab('guides')}
              className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Open Interactive Appliance Setup Guides"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Guides</span>
            </button>

            {/* Web Terminal Shortcut */}
            <button
              onClick={onOpenTerminal}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-emerald-400 transition-all active:scale-95"
              title="Open Interactive Web PTY Terminal"
            >
              <Terminal className="w-4 h-4" />
            </button>

            {/* Port Matrix & Tools */}
            <button
              onClick={onOpenTools}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-tinapple-gold transition-all active:scale-95"
              title="Server Tools & Port Matrix"
            >
              <Wrench className="w-4 h-4" />
            </button>

            {/* Appearance / Theme Picker */}
            <button
              onClick={onOpenAppearance}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-sky-400 transition-all active:scale-95"
              title="Customize Wallpaper, Accent Colors & Glass Blur"
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* Add Widget / Appliance */}
            <button
              onClick={() => setCreatorOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-tinapple-gold" />
              <span>+ Widget</span>
            </button>

            {/* Edit Mode Toggle */}
            <button
              onClick={() => {
                setIsEditMode(!isEditMode);
                AndroidBridge.performHaptic('medium');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                isEditMode
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 hover:bg-emerald-400'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10'
              }`}
            >
              {isEditMode ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Done Editing</span>
                </>
              ) : (
                <>
                  <Sliders className="w-3.5 h-3.5 text-tinapple-gold" />
                  <span>Edit Board</span>
                </>
              )}
            </button>

            {/* View Mode Toggle (Grid Board <-> 2D Canvas) */}
            <button
              onClick={() => handleSetViewMode('canvas')}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10 flex items-center gap-1.5 transition-all"
              title="Switch to 2D Freeform Pannable Canvas"
            >
              <Move className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden lg:inline">2D Canvas</span>
            </button>

            {/* Telemetry Refresh */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-all disabled:opacity-50"
              title="Refresh Live Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-tinapple-gold' : ''}`} />
            </button>
          </div>
        </div>

        {/* Center: Homarr Fast Interactive Search Bar */}
        <div className="relative w-full">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps, daemons, widgets, or web… (Press '/' to focus, 'Esc' to clear)"
              className="w-full pl-11 pr-24 py-3 rounded-2xl bg-slate-900/90 border border-white/15 focus:border-tinapple-gold text-sm font-mono text-white placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
            />
            {/* Clear Button or Shortcut Pill */}
            <div className="absolute right-3.5 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.08] text-zinc-400 border border-white/10">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Web Search fallback pill if user typed a search query */}
          {searchQuery.trim().length > 0 && (
            <div className="mt-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs font-mono text-zinc-400">
              <span>Filtering for "{searchQuery}"</span>
              <a
                href={`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-tinapple-gold hover:underline flex items-center gap-1 font-bold"
              >
                <span>Search DuckDuckGo</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Bottom Filter Row: Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0 transition-all font-semibold ${
                  isSelected
                    ? 'bg-tinapple-gold text-slate-950 border-tinapple-gold shadow-md shadow-tinapple-gold/20'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border-white/[0.08]'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}

          {isEditMode && (
            <button
              onClick={handleResetBoard}
              className="ml-auto px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 flex items-center gap-1.5 shrink-0 transition-all font-bold"
              title="Reset Board to Default Layout"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Factory</span>
            </button>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          2. HOMARR SECTION 1: APPLIANCE DAEMONS GRID (APPS CONTAINER)
          ═══════════════════════════════════════════════════════════════ */}
      {filteredAppliances.length > 0 && (
        <section className="space-y-3.5">
          {/* Section Container Header */}
          <div
            onClick={() => toggleSectionCollapse('appliances')}
            className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/[0.06] backdrop-blur-md cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">🚀</span>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Appliance Launchers & Daemons ({filteredAppliances.length})
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-bold">
                Reverse Proxied
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-xs font-mono hidden sm:inline">
                {collapsedSections['appliances'] ? 'Click to expand' : 'Click to collapse'}
              </span>
              {collapsedSections['appliances'] ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </div>
          </div>

          {/* Grid of Appliance Tiles */}
          {!collapsedSections['appliances'] && (
            <div className="grid grid-cols-12 gap-3.5">
              {filteredAppliances.map((app) => {
                const serviceInfo = servicesMap.get(app.id);
                const activeState = serviceInfo?.activeState || 'active';
                const appUrl = getServiceUrl(app.id, app.subpath);

                return (
                  <HomarrAppTile
                    key={app.id}
                    id={app.id}
                    name={app.name}
                    tagline={app.tagline}
                    category={app.category}
                    icon={app.icon}
                    url={appUrl}
                    activeState={activeState}
                    isEditMode={isEditMode}
                    colSpan={app.defaultColSpan || 3}
                    onOpenSettings={
                      onOpenAppSettings
                        ? () => onOpenAppSettings(serviceInfo || { name: app.id, displayName: app.name })
                        : undefined
                    }
                    onOpenGuide={app.guideId ? () => onOpenGuide(app.guideId!) : undefined}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          3. HOMARR SECTION 2: MODULAR INTEGRATION WIDGETS
          ═══════════════════════════════════════════════════════════════ */}
      {visibleWidgets.length > 0 && (
        <section className="space-y-3.5">
          {/* Section Container Header */}
          <div
            onClick={() => toggleSectionCollapse('widgets')}
            className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/[0.06] backdrop-blur-md cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">⚡</span>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Live Integration Widgets ({visibleWidgets.length})
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/25 font-bold">
                Real-Time SSE
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-xs font-mono hidden sm:inline">
                {collapsedSections['widgets'] ? 'Click to expand' : 'Click to collapse'}
              </span>
              {collapsedSections['widgets'] ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </div>
          </div>

          {/* Grid of Modular Widgets */}
          {!collapsedSections['widgets'] && (
            <div className="grid grid-cols-12 gap-4">
              {visibleWidgets.map((widget) => {
                const colSpanClass = getColSpanClass(widget.colSpan);

                return (
                  <div
                    key={widget.id}
                    className={`${colSpanClass} relative rounded-2xl bg-slate-900/50 hover:bg-slate-900/70 border border-white/[0.08] backdrop-blur-xl transition-all p-3 sm:p-4 shadow-xl shadow-black/20 flex flex-col justify-between`}
                    style={{ minHeight: '300px' }}
                  >
                    {/* Edit Mode Controls Overlay */}
                    {isEditMode && (
                      <div className="mb-2 p-2 rounded-xl bg-slate-950/90 border border-white/10 flex items-center justify-between font-mono text-xs z-10">
                        <div className="flex items-center gap-1.5 text-zinc-300 font-bold truncate">
                          <span>{widget.icon}</span>
                          <span className="truncate">{widget.title}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Move Up */}
                          <button
                            onClick={() => handleMoveWidget(widget.id, 'up')}
                            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Move widget backward"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          {/* Move Down */}
                          <button
                            onClick={() => handleMoveWidget(widget.id, 'down')}
                            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Move widget forward"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          {/* Toggle ColSpan */}
                          <button
                            onClick={() => handleToggleColSpan(widget.id)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                            title={`Resize width (Current: ${widget.colSpan || 6} cols)`}
                          >
                            {widget.colSpan === 12 ? (
                              <Minimize2 className="w-3.5 h-3.5" />
                            ) : (
                              <Maximize2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {/* Edit Properties */}
                          <button
                            onClick={() => setEditingWidget(widget)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-tinapple-gold hover:bg-white/10 transition-colors"
                            title="Edit Widget Settings"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          {/* Toggle Visibility */}
                          <button
                            onClick={() => handleToggleWidgetVisibility(widget.id)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                            title={widget.visible ? 'Hide widget' : 'Show widget'}
                          >
                            {widget.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteWidget(widget.id)}
                            className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                            title="Delete widget from board"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* The Live Functional Widget Content */}
                    <div className="w-full h-full flex-1">
                      {renderWidgetContent(widget)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* No Search Matches Placeholder */}
      {filteredAppliances.length === 0 && visibleWidgets.length === 0 && (
        <div className="text-center py-16 px-4 rounded-3xl bg-slate-950/60 border border-white/10 backdrop-blur-xl">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-bold text-white font-mono">No appliances or widgets found</h3>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            No items matched "{searchQuery}" in category "{selectedCategory}".
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold transition-all"
            >
              Clear All Filters
            </button>
            <a
              href={`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-tinapple-gold hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition-all flex items-center gap-1.5"
            >
              <span>Search Web for "{searchQuery}"</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          4. MODALS FOR WIDGET CREATION AND EDITING
          ═══════════════════════════════════════════════════════════════ */}
      {creatorOpen && (
        <WidgetCreatorModal
          isOpen={creatorOpen}
          onClose={() => setCreatorOpen(false)}
          onAddWidget={handleAddWidget}
          currentWidgetCount={widgets.length}
          viewportCenter={{ x: 200, y: 200 }}
        />
      )}

      {editingWidget && (
        <WidgetEditorModal
          widget={editingWidget}
          isOpen={!!editingWidget}
          onClose={() => setEditingWidget(null)}
          onSave={handleUpdateWidget}
          onDelete={handleDeleteWidget}
        />
      )}
    </div>
  );
};

export default HomarrBoard;
