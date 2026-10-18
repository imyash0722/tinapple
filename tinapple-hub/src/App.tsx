import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { FullWindowBackground, BackgroundMode } from './components/reactbits/FullWindowBackground';
import { ShinyText } from './components/reactbits/ShinyText';
import { DecryptedText } from './components/reactbits/DecryptedText';
import { Dock, DockItem } from './components/reactbits/Dock';
import { BrandLogo } from './components/common/BrandLogo';
import HoldButton from './components/reactbits/HoldButton';

import { TelemetryCards } from './components/widgets/TelemetryCards';
import { ThermalsPowerWidget } from './components/widgets/ThermalsPowerWidget';
import { ServicesManager } from './components/widgets/ServicesManager';
import { ChaddyStore } from './components/widgets/ChaddyStore';
import { HardwareSensors } from './components/widgets/HardwareSensors';
import { SettingsManifest } from './components/widgets/SettingsManifest';
import { LogsModal } from './components/widgets/LogsModal';
import { WelcomeInstaller } from './components/installer/WelcomeInstaller';

import { api, MOCK_SYSTEM_INFO, MOCK_TELEMETRY, MOCK_SERVICES, MOCK_HARDWARE } from './services/api';
import { SystemInfo, TelemetrySnapshot, ServiceInfo, HardwareInfo, SessionMode } from './types/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    return params.get('tab') || 'welcome';
  });
  const [bgMode, setBgMode] = useState<BackgroundMode>('microslats');
  const [systemInfo, setSystemInfo] = useState<SystemInfo>(MOCK_SYSTEM_INFO);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(MOCK_TELEMETRY);
  const [services, setServices] = useState<ServiceInfo[]>(MOCK_SERVICES);
  const [hardware, setHardware] = useState<HardwareInfo>(MOCK_HARDWARE);

  const [activeLogService, setActiveLogService] = useState<string | null>(null);
  const [serviceLogs, setServiceLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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
    const [info, tel, svcs] = await Promise.all([
      api.getSystemInfo(),
      api.getTelemetry(),
      api.getServices(),
    ]);
    setSystemInfo(info);
    setTelemetry(tel);
    setServices(svcs);
    setTimeout(() => setIsRefreshing(false), 500);
  };

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

  const dockItems: DockItem[] = [
    {
      id: 'welcome',
      label: 'Installer & Welcome',
      icon: <Sparkles className="w-5 h-5 text-tinapple-gold" />,
    },
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
      label: 'Chaddy Store',
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
  ];

  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="relative min-h-screen text-tinapple-text pb-28 selection:bg-tinapple-gold/20 selection:text-tinapple-gold">
      {/* Full-Window Interactive MicroSlats / WebGL Waves Ambient Background */}
      <FullWindowBackground mode={bgMode} />

      {/* TOP COMMAND HEADER */}
      <header className="sticky top-0 z-40 border-b border-tinapple-border bg-tinapple-dark/80 backdrop-blur-3xl shadow-2xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Appliance Name */}
          <div className="flex items-center gap-3.5">
            <BrandLogo size={40} electric={true} />
            <div>
              <div className="flex items-center gap-2">
                <ShinyText
                  text="tinapple"
                  shimmerColor="#e5b567"
                  className="text-base font-extrabold tracking-tight font-mono text-white"
                />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-tinapple-surface border border-tinapple-border text-tinapple-gold font-bold">
                  v0.0.1
                </span>
              </div>
              <div className="text-[10px] font-mono text-tinapple-subtext flex items-center gap-2">
                <DecryptedText
                  text="APPLIANCE OS HUB"
                  speed={30}
                  maxIterations={8}
                  className="text-tinapple-green font-bold"
                  encryptedClassName="text-tinapple-gold/70"
                />
                <span className="text-tinapple-muted">•</span>
                <span className="text-tinapple-muted">{systemInfo.hostname}</span>
              </div>
            </div>
          </div>

          {/* Center Telemetry & Session Mode Badges */}
          <div className="hidden md:flex items-center gap-3 font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-tinapple-card/90 border border-tinapple-border text-xs">
              <span className="w-2 h-2 rounded-full bg-tinapple-green animate-pulse" />
              <span className="text-tinapple-text">SSE Live Telemetry</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-tinapple-card/90 border border-tinapple-border text-xs">
              <Monitor className="w-3.5 h-3.5 text-tinapple-gold" />
              <span className="capitalize text-tinapple-gold font-semibold">
                {systemInfo.sessionMode} Mode
              </span>
            </div>

            {/* Background Canvas Mode Selector */}
            <button
              onClick={() => setBgMode(bgMode === 'microslats' ? 'waves' : 'microslats')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tinapple-card/90 border border-tinapple-border hover:border-tinapple-gold/50 text-xs transition-colors"
              title="Toggle interactive background mode"
            >
              <span className="w-2 h-2 rounded-full bg-tinapple-gold" />
              <span className="text-tinapple-subtext hover:text-white capitalize font-mono text-[11px]">
                {bgMode === 'microslats' ? 'Micro Slats' : 'WebGL Waves'}
              </span>
            </button>

            {/* Installer Quick Switch */}
            <button
              onClick={() => setActiveTab(activeTab === 'welcome' ? 'dashboard' : 'welcome')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono transition-all ${
                activeTab === 'welcome'
                  ? 'bg-tinapple-gold text-tinapple-dark font-bold border-tinapple-gold shadow-md shadow-tinapple-gold/20'
                  : 'bg-tinapple-card/90 border-tinapple-border text-tinapple-gold hover:border-tinapple-gold/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activeTab === 'welcome' ? 'Live Matrix' : 'Installer'}</span>
            </button>
          </div>

          {/* Right Action Cluster with HoldButton Safety Controls */}
          <div className="flex items-center gap-3">
            {/* Quick Safety HoldButtons */}
            <div className="hidden xl:flex items-center gap-2">
              <HoldButton
                size="sm"
                holdTime={1200}
                backgroundColor="#15181f"
                fillColor="#e5b567"
                textColor="#e5b567"
                fillTextColor="#060709"
                wave={true}
                glow={true}
                doneLabel="NTP Synced!"
                onHold={async () => {
                  await api.syncTime();
                  handleRefresh();
                }}
                className="font-mono text-[11px] font-bold"
              >
                Hold to Sync Time
              </HoldButton>

              <HoldButton
                size="sm"
                holdTime={2000}
                backgroundColor="#15181f"
                fillColor="#ef4444"
                textColor="#f87171"
                fillTextColor="#ffffff"
                wave={true}
                glow={true}
                doneLabel="Reboot Signal Sent"
                onHold={async () => {
                  await api.rebootNode();
                }}
                className="font-mono text-[11px] font-bold"
              >
                Hold to Reboot
              </HoldButton>
            </div>

            <div className="hidden sm:block text-right font-mono">
              <span className="text-[10px] text-tinapple-muted block tracking-wider">UPTIME</span>
              <span className="text-xs font-bold text-tinapple-text">
                {formatUptime(systemInfo.uptime)}
              </span>
            </div>

            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-tinapple-card/80 hover:bg-tinapple-surface border border-tinapple-border text-tinapple-subtext hover:text-white transition-all active:scale-95"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-tinapple-gold' : ''}`} />
            </button>
          </div>
        </div>
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
              {/* Bento Row 1: Processor & Memory & Storage & Network */}
              <TelemetryCards telemetry={telemetry} history={history} />

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
            >
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
