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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { FullWindowBackground } from './components/reactbits/FullWindowBackground';
import { AppearanceModal } from './components/common/AppearanceModal';
import { BUNDLED_WALLPAPERS, THEME_STORAGE_KEY, colorChannels, extractWallpaperColors, loadSettings } from './theme/appearance';
import { Dock, DockItem } from './components/reactbits/Dock';

import { TelemetryCards } from './components/widgets/TelemetryCards';
import { ThermalsPowerWidget } from './components/widgets/ThermalsPowerWidget';
import { ServicesManager } from './components/widgets/ServicesManager';
import { ChaddyStore } from './components/widgets/ChaddyStore';
import { HardwareSensors } from './components/widgets/HardwareSensors';
import { SettingsManifest } from './components/widgets/SettingsManifest';
import { LogsModal } from './components/widgets/LogsModal';
import { WelcomeInstaller } from './components/installer/WelcomeInstaller';
import { QuickConnectCard } from './components/widgets/QuickConnectCard';
import { TransfersWidget } from './components/widgets/TransfersWidget';
import { MangaShelfWidget } from './components/widgets/MangaShelfWidget';
import { TorPrivacyWidget } from './components/widgets/TorPrivacyWidget';
import { PywalThemingWidget } from './components/widgets/PywalThemingWidget';

import { api, MOCK_SYSTEM_INFO, MOCK_TELEMETRY, MOCK_SERVICES, MOCK_HARDWARE } from './services/api';
import { SystemInfo, TelemetrySnapshot, ServiceInfo, HardwareInfo, SessionMode } from './types/api';

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
  const [colorStatus, setColorStatus] = useState('');
  const [storageStatus, setStorageStatus] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--tinapple-accent', settings.accentColor);
    root.style.setProperty('--tinapple-accent-rgb', colorChannels(settings.accentColor));
    root.style.setProperty('--tinapple-accent-glow', `${settings.accentColor}55`);
    root.style.setProperty('--tinapple-accent-secondary', settings.secondaryColor);
    root.style.setProperty('--tinapple-secondary-rgb', colorChannels(settings.secondaryColor));
    root.style.setProperty('--glass-bg', settings.enableGlass ? 'rgba(18, 22, 31, 0.65)' : '#12161f');
    root.style.setProperty('--glass-filter', settings.enableGlass ? 'blur(20px) saturate(180%)' : 'none');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
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

  const [activeLogService, setActiveLogService] = useState<string | null>(null);
  const [serviceLogs, setServiceLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [clockSynced, setClockSynced] = useState(false);
  const [rebootDeadline, setRebootDeadline] = useState(0);
  const [isRebooting, setIsRebooting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

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
  ) => {
    await api.controlService(name, action);
    const updated = await api.getServices();
    setServices(updated);
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
        icon: <Sparkles className="w-5 h-5" />,
      });
    }
    items.push(
      {
        id: 'dashboard',
        label: 'Telemetry Matrix',
        icon: <Activity className="w-5 h-5" />,
      },
      {
        id: 'services',
        label: 'Appliance Daemons',
        icon: <Layers className="w-5 h-5" />,
        badge: services.filter((s) => s.activeState === 'active').length,
      },
      {
        id: 'store',
        label: 'Appliance Store',
        icon: <ShoppingBag className="w-5 h-5" />,
      },
      {
        id: 'hardware',
        label: 'Hardware & TPM',
        icon: <Cpu className="w-5 h-5" />,
      },
      {
        id: 'settings',
        label: 'System Manifest',
        icon: <Settings className="w-5 h-5" />,
      },
    );
    return items;
  }, [systemInfo.installed, forceWelcome, services]);

  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="relative isolate min-h-screen text-tinapple-text pb-28 selection:bg-tinapple-gold/20 selection:text-tinapple-gold">
      {/* Configurable background and ambient effects */}
      <FullWindowBackground settings={settings} />
      <AppearanceModal isOpen={appearanceOpen} onClose={() => setAppearanceOpen(false)} settings={settings} onUpdate={setSettings} colorStatus={colorStatus} storageStatus={storageStatus} />

      {/* TOP COMMAND HEADER */}
      <header className="sticky top-0 z-40 bg-tinapple-dark/80 backdrop-blur-2xl border-b border-white/[0.08]">
        <div className="px-6 h-16 max-w-[1440px] mx-auto flex items-center justify-between gap-3">
          {/* System identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-base tracking-tight text-white">tinapple</span>
              <span className="hidden min-[400px]:inline text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-tinapple-gold font-semibold">v0.0.1</span>
            </div>
            <span className="hidden sm:block truncate text-[11px] font-mono text-zinc-400" title={`APPLIANCE OS HUB • ${systemInfo.hostname}`}>
              APPLIANCE OS HUB • {systemInfo.hostname}
            </span>
          </div>

          {/* Live status */}
          <div className="hidden lg:flex shrink-0 items-center justify-center gap-2">
            <div className={statusPillClass}>
              <span className="w-1.5 h-1.5 rounded-full bg-tinapple-green animate-pulse" />
              <Activity className="w-3.5 h-3.5" />
              <span>SSE Live</span>
            </div>
            <div className={statusPillClass}>
              {systemInfo.sessionMode === 'headless'
                ? <Terminal className="w-3.5 h-3.5 text-tinapple-gold" />
                : <Monitor className="w-3.5 h-3.5 text-tinapple-gold" />}
              <span className="capitalize">{systemInfo.sessionMode} Mode</span>
            </div>
            {!systemInfo.installed && (
              <button
                onClick={() => setActiveTab(activeTab === 'welcome' ? 'dashboard' : 'welcome')}
                className={`${statusPillClass} hover:bg-white/[0.08] hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tinapple-gold`}
                title={activeTab === 'welcome' ? 'Open Appliance Dashboard' : 'Open Welcome & Installer'}
                aria-label={activeTab === 'welcome' ? 'Open Appliance Dashboard' : 'Open Welcome & Installer'}
              >
                <Sparkles className="w-3.5 h-3.5 text-tinapple-gold" />
                <span>{activeTab === 'welcome' ? 'Dashboard' : 'Installer'}</span>
              </button>
            )}
          </div>

          {/* Action center */}
          <div className="flex lg:flex-1 shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <div className="hidden xl:flex items-center gap-1.5 mr-1 text-xs font-mono font-medium text-zinc-300" title="System uptime">
              <Timer className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formatUptime(systemInfo.uptime)}</span>
            </div>
            <button
              onClick={() => setAppearanceOpen(true)}
              className={actionButtonClass}
              title="Appearance & Theme"
              aria-label="Appearance & Theme"
            >
              <Palette className="w-4 h-4" />
            </button>
            <button onClick={handleSyncClock} disabled={isSyncing} className={actionButtonClass} title="Sync Clock (NTP)" aria-label="Sync Clock (NTP)" aria-busy={isSyncing}>
              {clockSynced ? <Check className="w-4 h-4 text-tinapple-green" /> : <Clock className={`w-4 h-4 ${isSyncing ? 'animate-spin text-tinapple-gold' : ''}`} />}
            </button>
            <div className="relative">
              <button
                onClick={handleReboot}
                disabled={isRebooting}
                className={`${actionButtonClass} hover:!bg-red-500/20 hover:!border-red-500/50 hover:!text-red-400 ${rebootDeadline ? '!border-red-500/50 !text-red-400' : ''}`}
                title={rebootDeadline ? 'Confirm Reboot?' : 'Reboot Node'}
                aria-label={rebootDeadline ? 'Confirm Reboot?' : 'Reboot Node'}
                aria-busy={isRebooting}
              >
                <Power className={`w-4 h-4 ${isRebooting ? 'animate-pulse' : ''}`} />
              </button>
              {rebootDeadline > 0 && (
                <span className="absolute top-full right-0 mt-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-red-500/40 text-red-400 text-xs font-mono whitespace-nowrap pointer-events-none">Confirm Reboot?</span>
              )}
            </div>
            <button onClick={handleRefresh} disabled={isRefreshing} className={actionButtonClass} title="Refresh telemetry" aria-label="Refresh telemetry" aria-busy={isRefreshing}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-tinapple-gold' : ''}`} />
            </button>
          </div>
        </div>
        <span className="sr-only" role="status">{actionMessage}</span>
      </header>

      {/* MAIN SCREEN-FILLING BENTO DECK */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6">
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
              {/* Quick Connect Portals */}
              <QuickConnectCard />

              {/* Transfers: qBittorrent & JDownloader Remote Queue */}
              <TransfersWidget />

              {/* Suwayomi Manga Shelf: Reading / History / Updates */}
              <MangaShelfWidget />

              {/* Tor Anonymity & Privacy Guard */}
              <TorPrivacyWidget />

              {/* Bento Row 1: Processor & Memory & Storage & Network */}
              <TelemetryCards telemetry={telemetry} history={history} accentColor={settings.accentColor} secondaryColor={settings.secondaryColor} />

              {/* Bento Row 2: Thermals & Acoustic Fan Curves & Battery Limiter */}
              <ThermalsPowerWidget
                telemetry={telemetry}
                onSetThermalProfile={api.setThermalProfile}
                onSetPowerProfile={api.setPowerProfile}
                onSetChargeLimit={api.setBatteryChargeLimit}
              />

              {/* Bento Row 3: Essential Daemon Matrix Preview */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tinapple-gold animate-pulse" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Essential Appliance Daemons
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('services')}
                    className="text-xs font-mono font-semibold text-tinapple-gold hover:underline flex items-center gap-1"
                  >
                    <span>View all {services.length} services</span>
                    <span>→</span>
                  </button>
                </div>
                <ServicesManager
                accentColor={settings.accentColor}
                  services={services.slice(0, 6)}
                  onControlService={handleControlService}
                  onOpenLogs={handleOpenLogs}
                />
              </div>
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
                services={services}
                onControlService={handleControlService}
                onOpenLogs={handleOpenLogs}
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
              <ChaddyStore />
            </motion.div>
          )}

          {activeTab === 'hardware' && (
            <motion.div
              key="hardware"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <HardwareSensors hardware={hardware} />
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
              <PywalThemingWidget />
              <SettingsManifest systemInfo={systemInfo} onUpdateSession={handleUpdateSession} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FLOATING NAVIGATION DOCK */}
      <div className="fixed bottom-6 inset-x-0 flex justify-center z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <Dock items={dockItems} activeId={activeTab} onSelect={setActiveTab} />
        </div>
      </div>

      {/* FLOATING LOGS TERMINAL MODAL */}
      <LogsModal
        serviceName={activeLogService}
        logs={serviceLogs}
        onClose={() => setActiveLogService(null)}
      />
    </div>
  );
};
export default App;
