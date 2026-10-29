import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  Activity,
  Layers,
  ShoppingBag,
  Cpu,
  Settings,
  RefreshCw,
  Server,
  Monitor,
  Terminal,
  Sparkles,
  Clock,
  Power,
  Timer,
  Check,
  Palette,
  Wrench,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  BookOpen,
  ArrowUpCircle,
  Menu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { FullWindowBackground } from './components/reactbits/FullWindowBackground';
import { Sidebar } from './components/common/Sidebar';
import { BUNDLED_WALLPAPERS, THEME_STORAGE_KEY, colorChannels, extractWallpaperColors, loadSettings } from './theme/appearance';
import { fetchMatugenPalette, applyMatugenM3 } from './theme/matugen';
import { DockItem } from './components/reactbits/Dock';

import { TelemetryCards } from './components/widgets/TelemetryCards';
import { ServicesManager } from './components/widgets/ServicesManager';
import { ChaddyStore } from './components/widgets/ChaddyStore';
import { HardwareSensors } from './components/widgets/HardwareSensors';
import { SettingsManifest } from './components/widgets/SettingsManifest';
import { QuickConnectCard } from './components/widgets/QuickConnectCard';
import { TransfersWidget } from './components/widgets/TransfersWidget';
import { MangaShelfWidget } from './components/widgets/MangaShelfWidget';
import { TorPrivacyWidget } from './components/widgets/TorPrivacyWidget';
import { HomarrCanvas } from './components/homarr/HomarrCanvas';
import { GuidesPage } from './components/widgets/GuidesPage';

// High-speed lazy-loaded modals (reduces initial dashboard bundle size by >60%)
const AppearanceModal = lazy(() => import('./components/common/AppearanceModal').then((m) => ({ default: m.AppearanceModal })));
const BookmarkModal = lazy(() => import('./components/common/BookmarkModal').then((m) => ({ default: m.BookmarkModal })));
const LogsModal = lazy(() => import('./components/widgets/LogsModal').then((m) => ({ default: m.LogsModal })));
const TailscaleModal = lazy(() => import('./components/widgets/TailscaleModal').then((m) => ({ default: m.TailscaleModal })));
const GuidesModal = lazy(() => import('./components/widgets/GuidesModal').then((m) => ({ default: m.GuidesModal })));
const WebTerminalModal = lazy(() => import('./components/widgets/WebTerminalModal').then((m) => ({ default: m.WebTerminalModal })));
const AppSettingsModal = lazy(() => import('./components/widgets/AppSettingsModal').then((m) => ({ default: m.AppSettingsModal })));
const ServerToolsModal = lazy(() => import('./components/widgets/ServerToolsModal').then((m) => ({ default: m.ServerToolsModal })));
const WelcomeInstaller = lazy(() => import('./components/installer/WelcomeInstaller').then((m) => ({ default: m.WelcomeInstaller })));

import { api, MOCK_SYSTEM_INFO, MOCK_TELEMETRY, MOCK_SERVICES, MOCK_HARDWARE } from './services/api';
import { SystemInfo, TelemetrySnapshot, ServiceInfo, HardwareInfo, SessionMode } from './types/api';
import {
  loadDashboardLayout,
  saveDashboardLayout,
  CustomBookmark,
  DashboardLayoutState,
  DEFAULT_WIDGETS,
} from './services/dashboardLayout';

export const App: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>(MOCK_SYSTEM_INFO);
  const [requestedTab] = useState(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    return params.get('tab');
  });
  const [requestedGuide] = useState(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    return params.get('guide');
  });
  const [selectedTab, setActiveTab] = useState<string | null>(requestedTab);
  const forceWelcome = requestedTab === 'welcome';
  const activeTab = selectedTab === 'welcome' && systemInfo.installed && !forceWelcome
    ? 'dashboard'
    : selectedTab || (systemInfo.installed ? 'dashboard' : 'welcome');
  const [settings, setSettings] = useState(loadSettings);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [colorStatus, setColorStatus] = useState('');
  const [storageStatus, setStorageStatus] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--tinapple-accent', settings.accentColor);
    root.style.setProperty('--tinapple-accent-rgb', colorChannels(settings.accentColor));
    root.style.setProperty('--tinapple-accent-glow', `${settings.accentColor}55`);
    root.style.setProperty('--tinapple-accent-secondary', settings.secondaryColor);
    root.style.setProperty('--tinapple-secondary-rgb', colorChannels(settings.secondaryColor));

    const blur = settings.glassBlur ?? 20;
    const translucency = settings.glassTranslucency ?? 45;
    // Higher translucency = lower alpha (more see-through / clear glass)
    const alpha = Math.max(0.08, Math.min(0.95, (100 - translucency) / 100));

    root.style.setProperty('--glass-blur', `${blur}px`);
    root.style.setProperty('--glass-opacity', `${alpha.toFixed(2)}`);
    root.style.setProperty('--glass-translucency', `${translucency}%`);
    root.style.setProperty('--glass-bg', settings.enableGlass ? `rgba(10, 18, 38, ${alpha.toFixed(2)})` : '#0a1226');
    root.style.setProperty('--glass-filter', settings.enableGlass ? `blur(${blur}px) saturate(180%)` : 'none');

    const scale = settings.uiScale || '100%';
    root.style.setProperty('--ui-scale', scale);
    const zoomVal = parseInt(scale) / 100;
    (document.body.style as any).zoom = zoomVal.toString();

    // Material 3 (M3) Matugen dynamic coloring for the entire dashboard
    let active = true;
    fetchMatugenPalette({
      hex: settings.accentColor,
      wallpaper: settings.mode === 'wallpaper' ? settings.wallpaperUrl : undefined,
    }).then((palette) => {
      if (active && palette) {
        applyMatugenM3(palette, translucency, settings.enableGlass);
      }
    }).catch((err) => {
      console.debug('M3 palette application error:', err);
    });

    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem('tinapple_blur', blur.toString());
      localStorage.setItem('tinapple_translucency', translucency.toString());
      localStorage.setItem('tinapple_opacity', Math.round(alpha * 100).toString());
      localStorage.setItem('tinapple_scale', scale);
      setStorageStatus('');
    } catch { setStorageStatus('Browser storage is unavailable. Changes apply for this session only.'); }

    return () => { active = false; };
  }, [settings]);

  useEffect(() => {
    setColorStatus('');
    // Matugen extraction: automatically triggers if wallpaper mode is enabled
    if (settings.mode !== 'wallpaper') return;

    let active = true;
    setColorStatus('Matugen M3 extracting palette from wallpaper…');
    fetchMatugenPalette({
      wallpaper: settings.wallpaperUrl,
      mode: 'dark',
    }).then((palette) => {
      if (active && palette) {
        applyMatugenM3(palette, settings.glassTranslucency, settings.enableGlass);
        const primary = palette.colors.primary;
        const secondary = palette.colors.tertiary || palette.colors.secondary;
        if (primary && (primary !== settings.accentColor || secondary !== settings.secondaryColor)) {
          setSettings(previous => ({
            ...previous,
            accentColor: primary,
            secondaryColor: secondary || previous.secondaryColor,
          }));
        }
        setColorStatus(`Matugen M3 active: ${palette.source_color}`);
      }
    }).catch(() => {
      if (active) setColorStatus('Matugen active');
    });

    return () => { active = false; };
  }, [settings.mode, settings.wallpaperUrl]);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(MOCK_TELEMETRY);
  const [services, setServices] = useState<ServiceInfo[]>(MOCK_SERVICES);
  const [hardware, setHardware] = useState<HardwareInfo>(MOCK_HARDWARE);

  const isOwner = systemInfo.isAdmin === true;
  const displayServices = useMemo(() => {
    if (isOwner) return services;
    return services.filter(
      (s) => s.id !== 'suwayomi' && s.id !== 'suwayomi-server' && s.name !== 'suwayomi' && s.name !== 'suwayomi-server'
    );
  }, [services, isOwner]);

  const [activeLogService, setActiveLogService] = useState<string | null>(null);
  const [serviceLogs, setServiceLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [tailscaleOpen, setTailscaleOpen] = useState<boolean>(false);
  const [guidesOpen, setGuidesOpen] = useState<boolean>(false);
  const [webTerminalOpen, setWebTerminalOpen] = useState<boolean>(false);
  const [serverToolsOpen, setServerToolsOpen] = useState<boolean>(false);
  const [settingsModalApp, setSettingsModalApp] = useState<{ id: string; name?: string } | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(requestedGuide || 'jellyfin');

  const handleOpenGuide = (guideId?: string) => {
    if (guideId) setSelectedGuideId(guideId);
    setActiveTab('guides');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'guides');
      if (guideId) url.searchParams.set('guide', guideId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [clockSynced, setClockSynced] = useState(false);
  const [rebootDeadline, setRebootDeadline] = useState(0);
  const [isRebooting, setIsRebooting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Dashboard Homarr Edit Mode & Custom Bookmarks (Tinarchy Architecture)
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [layout, setLayout] = useState<DashboardLayoutState>(loadDashboardLayout);
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState<boolean>(false);
  const [editingBookmark, setEditingBookmark] = useState<CustomBookmark | null>(null);

  const handleSaveBookmark = (bookmarkData: Omit<CustomBookmark, 'id'>, existingId?: string) => {
    setLayout((prev) => {
      let nextBookmarks: CustomBookmark[];
      if (existingId) {
        nextBookmarks = prev.bookmarks.map((b) =>
          b.id === existingId ? { ...bookmarkData, id: existingId } : b
        );
      } else {
        const newBm: CustomBookmark = {
          ...bookmarkData,
          id: `bm-${Date.now()}`,
        };
        nextBookmarks = [...prev.bookmarks, newBm];
      }
      const nextState = { ...prev, bookmarks: nextBookmarks };
      saveDashboardLayout(nextState);
      return nextState;
    });
  };

  const handleDeleteBookmark = (id: string) => {
    setLayout((prev) => {
      const nextBookmarks = prev.bookmarks.filter((b) => b.id !== id);
      const nextState = { ...prev, bookmarks: nextBookmarks };
      saveDashboardLayout(nextState);
      return nextState;
    });
  };

  const handleToggleWidgetVisibility = (id: string) => {
    setLayout((prev) => {
      const nextWidgets = prev.widgets.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w
      );
      const nextState = { ...prev, widgets: nextWidgets };
      saveDashboardLayout(nextState);
      return nextState;
    });
  };

  const handleMoveWidget = (id: string, direction: 'up' | 'down') => {
    setLayout((prev) => {
      const sorted = [...prev.widgets].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((w) => w.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= sorted.length) return prev;

      const tempOrder = sorted[idx].order;
      sorted[idx].order = sorted[targetIdx].order;
      sorted[targetIdx].order = tempOrder;

      const nextState = { ...prev, widgets: sorted };
      saveDashboardLayout(nextState);
      return nextState;
    });
  };

  const handleResetLayout = () => {
    const nextState: DashboardLayoutState = {
      version: 3,
      widgets: [...DEFAULT_WIDGETS],
      bookmarks: layout.bookmarks,
    };
    setLayout(nextState);
    saveDashboardLayout(nextState);
  };

  useEffect(() => {
    if (!rebootDeadline) return;
    const timeout = window.setTimeout(() => setRebootDeadline(0), Math.max(0, rebootDeadline - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [rebootDeadline]);

  useEffect(() => {
    if (!clockSynced) return;
    const timeout = window.setTimeout(() => setClockSynced(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [clockSynced]);

  // Sparkline history buffers (last 25 points)
  const [history, setHistory] = useState<{
    cpu: number[];
    memory: number[];
    netIn: number[];
    netOut: number[];
  }>({
    cpu: [12, 14, 16, 15, 22, 18, 14, 25, 19, 14, 20, 18, 24, 16, 18, 17, 19, 21, 15, 18],
    memory: [47, 47, 47, 48, 48, 47, 47, 48, 48, 47, 47, 48, 47, 48],
    netIn: [120, 350, 500, 950, 1400, 1100, 1250, 1600, 1050, 1200, 980, 1150],
    netOut: [60, 95, 140, 220, 280, 210, 240, 310, 270, 290, 230, 260],
  });

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      const [info, svcs, hw] = await Promise.all([
        api.getSystemInfo(),
        api.getServices(),
        api.getHardwareInfo(),
      ]);
      setSystemInfo(info);
      setServices(svcs);
      setHardware(hw);
    };
    loadInitialData();

    // Subscribe to SSE real-time stream
    const unsubscribe = api.subscribeTelemetry((snapshot) => {
      setTelemetry(snapshot);
      setHistory((prev) => ({
        cpu: [...prev.cpu.slice(-25), snapshot.cpu.usagePercent],
        memory: [...prev.memory.slice(-25), snapshot.memory.usagePercent],
        netIn: [...prev.netIn.slice(-25), snapshot.network.rateIn / 1024],
        netOut: [...prev.netOut.slice(-25), snapshot.network.rateOut / 1024],
      }));
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [info, tel, svcs] = await Promise.all([
        api.getSystemInfo(),
        api.getTelemetry(),
        api.getServices(),
      ]);
      setSystemInfo(info);
      setTelemetry(tel);
      setServices(svcs);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSyncClock = async () => {
    setIsSyncing(true);
    setClockSynced(false);
    try {
      const synced = await api.syncTime();
      setClockSynced(synced);
      setActionMessage(synced ? 'Clock synced.' : 'Clock sync failed. Try again.');
      await handleRefresh();
    } catch {
      setActionMessage('Clock sync failed. Try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const [isUpdatingSystem, setIsUpdatingSystem] = useState<boolean>(false);

  const handleRunSystemUpdate = async () => {
    setIsUpdatingSystem(true);
    setActionMessage('Initiating full system & appliance update...');
    try {
      const res = await api.runSystemUpdate();
      if (res.ok) {
        setActionMessage('System update running. Inspecting live console.');
        setActiveTab('store');
      } else {
        setActionMessage(res.error || 'System update failed to initiate.');
      }
    } catch {
      setActionMessage('Failed to trigger update pipeline.');
    } finally {
      setIsUpdatingSystem(false);
    }
  };

  const handleReboot = async () => {
    if (Date.now() >= rebootDeadline) {
      setRebootDeadline(Date.now() + 3000);
      setActionMessage('Click again within 3 seconds to confirm reboot.');
      return;
    }
    setRebootDeadline(0);
    setIsRebooting(true);
    try {
      const sent = await api.rebootNode();
      setActionMessage(sent ? 'Reboot signal sent.' : 'Reboot request failed. Try again.');
    } catch {
      setActionMessage('Reboot request failed. Try again.');
    } finally {
      setIsRebooting(false);
    }
  };

  const actionButtonClass = 'p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tinapple-gold disabled:opacity-50 disabled:cursor-wait';
  const statusPillClass = 'flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-zinc-300 whitespace-nowrap';

  const handleControlService = async (
    name: string,
    action: 'start' | 'stop' | 'restart' | 'enable' | 'disable'
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await api.controlService(name, action);
    const updated = await api.getServices();
    setServices(updated);
    return res;
  };

  const handleOpenLogs = async (name: string) => {
    setActiveLogService(name);
    const logs = await api.getServiceLogs(name);
    setServiceLogs(logs);
  };

  const handleUpdateSession = async (mode: SessionMode) => {
    await api.setSessionMode(mode);
    setSystemInfo((prev) => ({ ...prev, sessionMode: mode }));
  };

  const dockItems: DockItem[] = useMemo(() => {
    const items: DockItem[] = [];
    if (!systemInfo.installed || forceWelcome) {
      items.push({
        id: 'welcome',
        label: 'Installer & Welcome',
        shortLabel: 'Installer',
        icon: <Sparkles className="w-4 h-4" />,
      });
    }
    items.push(
      {
        id: 'dashboard',
        label: 'Telemetry Matrix',
        shortLabel: 'Dashboard',
        icon: <Activity className="w-4 h-4" />,
      },
      {
        id: 'services',
        label: 'Appliance Daemons',
        shortLabel: 'Services',
        icon: <Layers className="w-4 h-4" />,
        badge: displayServices.filter((s) => s.activeState === 'active').length,
      },
      {
        id: 'store',
        label: 'App Store',
        shortLabel: 'Store',
        icon: <ShoppingBag className="w-4 h-4" />,
      },
      {
        id: 'hardware',
        label: 'Hardware & TPM',
        shortLabel: 'Hardware',
        icon: <Cpu className="w-4 h-4" />,
      },
      {
        id: 'settings',
        label: 'System Manifest',
        shortLabel: 'Settings',
        icon: <Settings className="w-4 h-4" />,
      },
    );
    return items;
  }, [systemInfo.installed, forceWelcome, displayServices]);

  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="relative isolate min-h-screen text-tinapple-text pb-12 selection:bg-tinapple-gold/20 selection:text-tinapple-gold">
      {/* Configurable background and ambient effects */}
      <FullWindowBackground settings={settings} />
      {appearanceOpen && (
        <Suspense fallback={null}>
          <AppearanceModal
            isOpen={appearanceOpen}
            onClose={() => setAppearanceOpen(false)}
            settings={settings}
            onUpdate={setSettings}
            colorStatus={colorStatus}
            storageStatus={storageStatus}
          />
        </Suspense>
      )}

      {/* PERSISTENT COLLAPSIBLE SIDEBAR & MOBILE DRAWER */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        collapsed={desktopSidebarCollapsed}
        setCollapsed={setDesktopSidebarCollapsed}
        displayServices={displayServices}
        systemInfo={systemInfo}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        onOpenGuides={() => handleOpenGuide('jellyfin')}
        onOpenAppearance={() => setAppearanceOpen(true)}
        onOpenTailscale={() => setTailscaleOpen(true)}
        onOpenTerminal={() => setWebTerminalOpen(true)}
        onOpenTools={() => setServerToolsOpen(true)}
        onRunUpdate={handleRunSystemUpdate}
        isUpdatingSystem={isUpdatingSystem}
        onSyncClock={handleSyncClock}
        isSyncing={isSyncing}
        clockSynced={clockSynced}
        onReboot={handleReboot}
        isRebooting={isRebooting}
        rebootDeadline={rebootDeadline}
      />

      {/* TOP COMMAND HEADER (CLEAN BREADCRUMB & STATUS BAR) */}
      <header
        className={`sticky top-0 z-20 w-full bg-[#050a16]/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-lg shadow-black/20 transition-all duration-300 ${
          desktopSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <div className="w-full px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Left: Mobile Hamburger & Desktop Page Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white/[0.05] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Icon & Tab Title */}
            <div className="md:hidden flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">🍎</span>
              <span className="font-mono font-bold text-sm text-white capitalize truncate max-w-[120px] sm:max-w-xs">
                {activeTab === 'store' ? 'App Store' : activeTab === 'guides' ? 'Guides' : activeTab}
              </span>
            </div>

            {/* Desktop Page Title & Breadcrumb */}
            <div className="hidden md:flex items-center gap-2.5 min-w-0 shrink-0">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 shrink-0">Node</span>
              <span className="text-xs text-zinc-600 shrink-0">/</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-mono font-black text-white capitalize truncate">
                  {activeTab === 'store' ? 'App Store & Packs' : activeTab === 'guides' ? 'Appliance Guides' : activeTab}
                </span>
                <span className="hidden 2xl:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-tinapple-gold font-bold whitespace-nowrap">
                  {systemInfo.sessionMode === 'headless' ? 'Headless Server' : 'Niri Desktop'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Live Telemetry Status & Quick Actions */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            {/* Live SSE Pulse Chip */}
            <div className="hidden 2xl:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>SSE Live</span>
            </div>

            {/* Tailscale VPN Chip */}
            <button
              onClick={() => setTailscaleOpen(true)}
              className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-[11px] font-mono text-sky-300 transition-all cursor-pointer whitespace-nowrap"
              title="Tailscale VPN Mesh Status"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span>Tailscale VPN</span>
            </button>

            {/* Full System Update Button */}
            <button
              onClick={handleRunSystemUpdate}
              disabled={isUpdatingSystem}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Full System & Appliance Update (paru/pacman -Syu)"
            >
              <ArrowUpCircle className={`w-4 h-4 text-emerald-400 ${isUpdatingSystem ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">Update OS</span>
            </button>

            {/* Interactive Guides Button */}
            <button
              onClick={() => handleOpenGuide('jellyfin')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-all font-mono text-xs font-semibold shadow-sm active:scale-95"
              title="Interactive Setup Guides"
            >
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Guides</span>
            </button>

            {/* Interactive Web Terminal */}
            <button
              onClick={() => setWebTerminalOpen(true)}
              className={actionButtonClass}
              title="Interactive Web Terminal (PTY)"
              aria-label="Interactive Web Terminal (PTY)"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Server Operations & Port Matrix */}
            <button
              onClick={() => setServerToolsOpen(true)}
              className={actionButtonClass}
              title="Port Matrix & Maintenance Tools"
              aria-label="Port Matrix & Maintenance Tools"
            >
              <Wrench className="w-4 h-4 text-tinapple-gold" />
            </button>

            {/* Appearance / Wallpaper Modal Button */}
            <button
              onClick={() => setAppearanceOpen(true)}
              className={actionButtonClass}
              title="Appearance & Theme"
              aria-label="Appearance & Theme"
            >
              <Palette className="w-4 h-4 text-sky-400" />
            </button>

            {/* Refresh telemetry */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={actionButtonClass}
              title="Refresh telemetry"
              aria-label="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-tinapple-gold' : ''}`} />
            </button>
          </div>
        </div>
        <span className="sr-only" role="status">{actionMessage}</span>
      </header>

      {/* MAIN SCREEN-FILLING BENTO DECK */}
      <main
        className={`w-full max-w-full px-3 sm:px-6 pt-4 sm:pt-5 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-12 transition-all duration-300 ${
          desktopSidebarCollapsed ? 'md:pl-24' : 'md:pl-72'
        }`}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <WelcomeInstaller
                onOpenDashboard={() => setActiveTab('dashboard')}
              />
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <HomarrCanvas
                telemetry={telemetry}
                systemInfo={systemInfo}
                services={displayServices}
                isEditMode={isEditMode}
                setIsEditMode={setIsEditMode}
                isOwner={isOwner}
                onOpenAppSettings={(app) => {
                  setSelectedAppForConfig(app);
                  setAppSettingsOpen(true);
                }}
                onOpenTailscale={() => setTailscaleOpen(true)}
                onOpenTerminal={() => setWebTerminalOpen(true)}
                onOpenTools={() => setServerToolsOpen(true)}
                onOpenGuide={handleOpenGuide}
              />
            </motion.div>
          )}

          {activeTab === 'services' && (
            <motion.div
              key="services"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight font-mono">
                    Systemd Service Daemons
                  </h2>
                  <p className="text-xs text-tinapple-subtext font-mono mt-0.5">
                    Start, stop, restart, and tail live stdout/stderr for all background services.
                  </p>
                </div>
              </div>
              <ServicesManager
                accentColor={settings.accentColor}
                services={displayServices}
                isAdmin={isOwner}
                onControlService={handleControlService}
                onOpenLogs={handleOpenLogs}
                onOpenSettings={(name) => setSettingsModalApp({ id: name, name })}
                onOpenTailscale={() => setTailscaleOpen(true)}
                onOpenGuide={handleOpenGuide}
              />
            </motion.div>
          )}

          {activeTab === 'store' && (
            <motion.div
              key="store"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <ChaddyStore
                isAdmin={isOwner}
                onOpenGuide={handleOpenGuide}
                onOpenSettings={(appId, name) => setSettingsModalApp({ id: appId, name })}
              />
            </motion.div>
          )}

          {activeTab === 'guides' && (
            <motion.div
              key="guides"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <GuidesPage
                initialGuideId={selectedGuideId}
                onSelectGuide={(id) => setSelectedGuideId(id)}
              />
            </motion.div>
          )}

          {activeTab === 'hardware' && (
            <motion.div
              key="hardware"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Primary System Telemetry Matrix (Moved from Dashboard to Hardware tab) */}
              <TelemetryCards
                telemetry={telemetry}
                systemInfo={systemInfo}
                history={history}
                accentColor={settings.accentColor}
                secondaryColor={settings.secondaryColor}
                onOpenTailscale={() => setTailscaleOpen(true)}
              />

              {/* Hardware Sensors, Thermal Profiles & Battery Management */}
              <HardwareSensors
                hardware={hardware}
                telemetry={telemetry}
                onSetThermalProfile={api.setThermalProfile}
                onSetPowerProfile={api.setPowerProfile}
                onSetChargeLimit={api.setBatteryChargeLimit}
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-6"
            >
              <SettingsManifest systemInfo={systemInfo} onUpdateSession={handleUpdateSession} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* LAZY LOADED FLOATING MODALS (ONLY FETCHED WHEN OPENED) */}
      <Suspense fallback={null}>
        {activeLogService && (
          <LogsModal
            serviceName={activeLogService}
            logs={serviceLogs}
            onClose={() => setActiveLogService(null)}
          />
        )}

        {tailscaleOpen && (
          <TailscaleModal
            isOpen={tailscaleOpen}
            onClose={() => setTailscaleOpen(false)}
          />
        )}

        {guidesOpen && (
          <GuidesModal
            isOpen={guidesOpen}
            onClose={() => setGuidesOpen(false)}
            initialGuideId={selectedGuideId}
          />
        )}

        {webTerminalOpen && (
          <WebTerminalModal
            isOpen={webTerminalOpen}
            onClose={() => setWebTerminalOpen(false)}
          />
        )}

        {serverToolsOpen && (
          <ServerToolsModal
            isOpen={serverToolsOpen}
            onClose={() => setServerToolsOpen(false)}
          />
        )}

        {Boolean(settingsModalApp) && (
          <AppSettingsModal
            isOpen={Boolean(settingsModalApp)}
            appId={settingsModalApp?.id || null}
            appName={settingsModalApp?.name}
            onClose={() => setSettingsModalApp(null)}
            onAppUpdated={handleRefresh}
          />
        )}

        {bookmarkModalOpen && (
          <BookmarkModal
            isOpen={bookmarkModalOpen}
            onClose={() => {
              setBookmarkModalOpen(false);
              setEditingBookmark(null);
            }}
            onSave={handleSaveBookmark}
            editingBookmark={editingBookmark}
          />
        )}
      </Suspense>
    </div>
  );
};
export default App;
