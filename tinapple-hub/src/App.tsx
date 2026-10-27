import React, { useState, useEffect, useMemo } from 'react';
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
import { AppearanceModal } from './components/common/AppearanceModal';
import { BookmarkModal } from './components/common/BookmarkModal';
import { Sidebar } from './components/common/Sidebar';
import { BUNDLED_WALLPAPERS, THEME_STORAGE_KEY, colorChannels, extractWallpaperColors, loadSettings } from './theme/appearance';
import { DockItem } from './components/reactbits/Dock';

import { TelemetryCards } from './components/widgets/TelemetryCards';
import { ServicesManager } from './components/widgets/ServicesManager';
import { ChaddyStore } from './components/widgets/ChaddyStore';
import { HardwareSensors } from './components/widgets/HardwareSensors';
import { SettingsManifest } from './components/widgets/SettingsManifest';
import { LogsModal } from './components/widgets/LogsModal';
import { TailscaleModal } from './components/widgets/TailscaleModal';
import { GuidesModal } from './components/widgets/GuidesModal';
import { WelcomeInstaller } from './components/installer/WelcomeInstaller';
import { QuickConnectCard } from './components/widgets/QuickConnectCard';
import { TransfersWidget } from './components/widgets/TransfersWidget';
import { MangaShelfWidget } from './components/widgets/MangaShelfWidget';
import { TorPrivacyWidget } from './components/widgets/TorPrivacyWidget';

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

    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem('tinapple_blur', blur.toString());
      localStorage.setItem('tinapple_translucency', translucency.toString());
      localStorage.setItem('tinapple_opacity', Math.round(alpha * 100).toString());
      localStorage.setItem('tinapple_scale', scale);
      setStorageStatus('');
    } catch { setStorageStatus('Browser storage is unavailable. Changes apply for this session only.'); }
  }, [settings]);

  useEffect(() => {
    setColorStatus('');
    if (settings.mode !== 'wallpaper' || !settings.syncWallpaperColors) return;
    const controller = new AbortController();
    const wallpaper = BUNDLED_WALLPAPERS.find(item => item.url === settings.wallpaperUrl);
    const applyColors = (accentColor: string, secondaryColor: string) => {
      if (controller.signal.aborted) return;
      setSettings(previous => previous.wallpaperUrl === settings.wallpaperUrl && previous.syncWallpaperColors
        ? { ...previous, accentColor, secondaryColor } : previous);
    };
    if (wallpaper) {
      applyColors(wallpaper.defaultPrimary, wallpaper.defaultSecondary);
      setColorStatus('Matching wallpaper palette applied.');
    } else {
      setColorStatus('Sampling wallpaper colors…');
      extractWallpaperColors(settings.wallpaperUrl, controller.signal).then(([primary, secondary]) => {
        applyColors(primary, secondary);
        if (!controller.signal.aborted) setColorStatus('Wallpaper colors applied.');
      }).catch(error => {
        if (!controller.signal.aborted) setColorStatus(error.message);
      });
    }
    return () => controller.abort();
  }, [settings.mode, settings.wallpaperUrl, settings.syncWallpaperColors]);
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
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>('jellyfin');

  const handleOpenGuide = (guideId?: string) => {
    if (guideId) setSelectedGuideId(guideId);
    setGuidesOpen(true);
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
      <AppearanceModal isOpen={appearanceOpen} onClose={() => setAppearanceOpen(false)} settings={settings} onUpdate={setSettings} colorStatus={colorStatus} storageStatus={storageStatus} />

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
            <div className="md:hidden flex items-center gap-2">
              <span className="text-lg">🍎</span>
              <span className="font-mono font-bold text-sm text-white capitalize">
                {activeTab === 'store' ? 'App Store' : activeTab}
              </span>
            </div>

            {/* Desktop Page Title & Breadcrumb */}
            <div className="hidden md:flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">Node</span>
              <span className="text-xs text-zinc-600">/</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-black text-white capitalize">
                  {activeTab === 'store' ? 'App Store & Packs' : activeTab}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-tinapple-gold font-bold">
                  {systemInfo.sessionMode === 'headless' ? 'Headless Server' : 'Niri Desktop'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Live Telemetry Status & Quick Actions */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">
            {/* Live SSE Pulse Chip */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>SSE Live</span>
            </div>

            {/* Tailscale VPN Chip */}
            <button
              onClick={() => setTailscaleOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-[11px] font-mono text-sky-300 transition-all cursor-pointer"
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
              <span className="hidden sm:inline">Update OS</span>
            </button>

            {/* Interactive Guides Button */}
            <button
              onClick={() => handleOpenGuide('jellyfin')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-all font-mono text-xs font-semibold shadow-sm active:scale-95"
              title="Interactive Setup Guides"
            >
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Guides</span>
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
        className={`w-full max-w-full px-3 sm:px-6 pt-5 pb-24 md:pb-12 transition-all duration-300 ${
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
              className="space-y-6"
            >
              {/* Tinarchy Homarr Edit Mode Customizer Banner */}
              {isEditMode && (
                <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-sky-500/15 border border-tinapple-gold/40 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tinapple-gold/20 border border-tinapple-gold/40 flex items-center justify-center text-tinapple-gold text-lg shadow-sm">
                      🛠️
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Dashboard Customizer & Edit Mode</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-tinapple-gold/20 text-tinapple-gold border border-tinapple-gold/40">
                          Active
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Reorder or hide widgets, manage quick-connect links, and add custom homelab bookmarks.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingBookmark(null);
                        setBookmarkModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-tinapple-gold hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Bookmark</span>
                    </button>
                    <button
                      onClick={handleResetLayout}
                      className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                      title="Reset to default layout"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                    <button
                      onClick={() => setIsEditMode(false)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Render dynamic widgets according to layout order & visibility */}
              {[...layout.widgets]
                .filter((w) => isOwner || w.id !== 'manga')
                .sort((a, b) => a.order - b.order)
                .map((w, idx, arr) => {
                  if (!w.visible && !isEditMode) return null;

                  const renderWidgetContent = () => {
                    switch (w.id) {
                      case 'quickconnect':
                        return (
                          <QuickConnectCard
                            services={displayServices}
                            customBookmarks={layout.bookmarks}
                            isEditMode={isEditMode}
                            isAdmin={isOwner}
                            onAddBookmark={() => {
                              setEditingBookmark(null);
                              setBookmarkModalOpen(true);
                            }}
                            onEditBookmark={(bm) => {
                              setEditingBookmark(bm);
                              setBookmarkModalOpen(true);
                            }}
                            onDeleteBookmark={handleDeleteBookmark}
                            onSelectTab={(tab) => setActiveTab(tab as any)}
                            onOpenTailscale={() => setTailscaleOpen(true)}
                            onOpenGuide={handleOpenGuide}
                          />
                        );
                      case 'transfers':
                        return <TransfersWidget />;
                      case 'manga':
                        return <MangaShelfWidget />;
                      case 'tor':
                        return <TorPrivacyWidget />;
                      default:
                        return null;
                    }
                  };

                  return (
                    <div key={w.id} className="relative group/widget">
                      {isEditMode && (
                        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-mono text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-tinapple-gold" />
                            <span className="font-bold text-white">{w.title}</span>
                            {!w.visible && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
                                Hidden
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMoveWidget(w.id, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-white"
                              title="Move section up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveWidget(w.id, 'down')}
                              disabled={idx === arr.length - 1}
                              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-white"
                              title="Move section down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleWidgetVisibility(w.id)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white ml-1"
                              title={w.visible ? 'Hide widget from dashboard' : 'Show widget on dashboard'}
                            >
                              {w.visible ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                            </button>
                          </div>
                        </div>
                      )}
                      {w.visible && renderWidgetContent()}
                    </div>
                  );
                })}
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
              <ChaddyStore isAdmin={isOwner} onOpenGuide={handleOpenGuide} />
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

      {/* FLOATING LOGS TERMINAL MODAL */}
      <LogsModal
        serviceName={activeLogService}
        logs={serviceLogs}
        onClose={() => setActiveLogService(null)}
      />

      {/* TAILSCALE MESH REMOTE VPN MODAL */}
      <TailscaleModal
        isOpen={tailscaleOpen}
        onClose={() => setTailscaleOpen(false)}
      />

      {/* CLIENT APPS & SERVICE GUIDES MODAL */}
      <GuidesModal
        isOpen={guidesOpen}
        onClose={() => setGuidesOpen(false)}
        initialGuideId={selectedGuideId}
      />

      {/* HOMARR ADD/EDIT BOOKMARK MODAL (TINARCHY FEATURE) */}
      <BookmarkModal
        isOpen={bookmarkModalOpen}
        onClose={() => {
          setBookmarkModalOpen(false);
          setEditingBookmark(null);
        }}
        onSave={handleSaveBookmark}
        editingBookmark={editingBookmark}
      />
    </div>
  );
};
export default App;
