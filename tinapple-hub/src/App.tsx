import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  ShoppingBag,
  Cpu,
  Settings,
  RefreshCw,
  Power,
  RotateCcw,
  Sparkles,
  Server,
  Wifi,
  Monitor,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Aurora } from './components/reactbits/Aurora';
import { ShinyText } from './components/reactbits/ShinyText';
import { DecryptedText } from './components/reactbits/DecryptedText';
import { Dock, DockItem } from './components/reactbits/Dock';

import { TelemetryCards } from './components/widgets/TelemetryCards';
import { ThermalsPowerWidget } from './components/widgets/ThermalsPowerWidget';
import { ServicesManager } from './components/widgets/ServicesManager';
import { ChaddyStore } from './components/widgets/ChaddyStore';
import { HardwareSensors } from './components/widgets/HardwareSensors';
import { SettingsManifest } from './components/widgets/SettingsManifest';
import { LogsModal } from './components/widgets/LogsModal';

import { api, MOCK_SYSTEM_INFO, MOCK_TELEMETRY, MOCK_SERVICES, MOCK_HARDWARE } from './services/api';
import { SystemInfo, TelemetrySnapshot, ServiceInfo, HardwareInfo, SessionMode } from './types/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [systemInfo, setSystemInfo] = useState<SystemInfo>(MOCK_SYSTEM_INFO);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(MOCK_TELEMETRY);
  const [services, setServices] = useState<ServiceInfo[]>(MOCK_SERVICES);
  const [hardware, setHardware] = useState<HardwareInfo>(MOCK_HARDWARE);

  const [activeLogService, setActiveLogService] = useState<string | null>(null);
  const [serviceLogs, setServiceLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Sparkline history buffers (last 20 points)
  const [history, setHistory] = useState<{
    cpu: number[];
    memory: number[];
    netIn: number[];
    netOut: number[];
  }>({
    cpu: [12, 15, 18, 14, 22, 19, 16, 24, 18, 15, 20, 18, 22, 17, 19, 18],
    memory: [29, 29, 30, 30, 30, 31, 30, 30, 30, 30, 30, 30],
    netIn: [100, 250, 400, 800, 1200, 950, 1100, 1400, 900, 1050],
    netOut: [50, 80, 120, 200, 240, 180, 210, 260, 230, 245],
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
      id: 'dashboard',
      label: 'Telemetry & Overview',
      icon: <Activity className="w-5 h-5" />,
    },
    {
      id: 'services',
      label: 'Appliance Services',
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
      label: 'Hardware & Sensors',
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
    <div className="relative min-h-screen text-tinapple-text pb-28">
      {/* Silky WebGL/Canvas Aurora Background */}
      <Aurora speed={0.4} opacity={0.35} />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 border-b border-tinapple-border/70 bg-tinapple-dark/75 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-tinapple-blue/30 via-tinapple-cyan/20 to-tinapple-purple/30 border border-tinapple-border shadow-lg shadow-tinapple-blue/10">
              <span className="text-xl select-none">🍍</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <ShinyText text="tinapple" className="text-base tracking-tight" />
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-tinapple-surface border border-tinapple-border text-tinapple-cyan font-bold">
                  v0.0.1
                </span>
              </div>
              <div className="text-[10px] font-mono text-tinapple-subtext flex items-center gap-2">
                <DecryptedText text="APPLIANCE OS HUB" speed={30} maxIterations={8} />
                <span>•</span>
                <span>{systemInfo.hostname}</span>
              </div>
            </div>
          </div>

          {/* Center Status Indicators */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-tinapple-surface/60 border border-tinapple-border text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-tinapple-green animate-pulse" />
              <span className="text-tinapple-text">SSE Live Telemetry</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-tinapple-surface/60 border border-tinapple-border text-xs font-mono">
              <Monitor className="w-3.5 h-3.5 text-tinapple-purple" />
              <span className="capitalize text-tinapple-purple font-medium">
                {systemInfo.sessionMode} Mode
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block text-right font-mono">
              <span className="text-[10px] text-tinapple-muted block">UPTIME</span>
              <span className="text-xs font-semibold text-tinapple-text">
                {formatUptime(systemInfo.uptime)}
              </span>
            </div>

            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-tinapple-surface hover:bg-tinapple-card border border-tinapple-border text-tinapple-subtext hover:text-white transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-tinapple-cyan' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Telemetry Hero Cards */}
              <TelemetryCards telemetry={telemetry} history={history} />

              {/* Thermals, Governor & Battery */}
              <ThermalsPowerWidget
                telemetry={telemetry}
                onSetThermalProfile={api.setThermalProfile}
                onSetPowerProfile={api.setPowerProfile}
                onSetChargeLimit={api.setBatteryChargeLimit}
              />

              {/* Quick Services Preview */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Essential Appliance Daemons
                  </h3>
                  <button
                    onClick={() => setActiveTab('services')}
                    className="text-xs font-mono text-tinapple-cyan hover:underline"
                  >
                    View all {services.length} services →
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Systemd Service Daemons</h2>
                  <p className="text-xs text-tinapple-subtext">
                    Control, restart, and inspect logs for all appliance background workers.
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <ChaddyStore />
            </motion.div>
          )}

          {activeTab === 'hardware' && (
            <motion.div
              key="hardware"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <HardwareSensors hardware={hardware} />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
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

      {/* MODALS */}
      <LogsModal
        serviceName={activeLogService}
        logs={serviceLogs}
        onClose={() => setActiveLogService(null)}
      />
    </div>
  );
};
export default App;
