import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Zap,
  Film,
  Music,
  BookOpen,
  Download,
  ExternalLink,
  Layers,
  ArrowRight,
  Globe,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { TelemetrySnapshot, SystemInfo, ServiceInfo } from '../../types/api';
import { getActiveServerOrigin, getServiceUrl } from '../../services/api';
import { AppBrandIcon } from '../common/AppBrandIcons';
import { AndroidBridge } from '../../services/androidBridge';

interface MobileDashboardViewProps {
  telemetry: TelemetrySnapshot | null;
  systemInfo: SystemInfo;
  services: ServiceInfo[];
  onOpenAppPage?: (appId: string) => void;
  onSwitchToFullBoard: () => void;
  onSelectTab?: (tab: string) => void;
}

export const MobileDashboardView: React.FC<MobileDashboardViewProps> = ({
  telemetry,
  systemInfo,
  services,
  onOpenAppPage,
  onSwitchToFullBoard,
  onSelectTab,
}) => {
  const [ombiOnline, setOmbiOnline] = useState<boolean>(true);
  const [ombiCounts, setOmbiCounts] = useState<{ approved?: number; available?: number; pending?: number; denied?: number }>({});
  const [ombiRequests, setOmbiRequests] = useState<any[]>([]);
  const [isLoadingOmbi, setIsLoadingOmbi] = useState<boolean>(true);

  const fetchOmbiData = () => {
    fetch(`${getActiveServerOrigin()}/api/widgets/seerr`)
      .then((r) => (r.ok ? r.json() : fetch(`${getActiveServerOrigin()}/api/widgets/ombi`).then((ro) => ro.ok ? ro.json() : null)))
      .then((data) => {
        if (data) {
          setOmbiOnline(data.online !== false);
          setOmbiCounts(data.counts || {});
          setOmbiRequests(Array.isArray(data.requests) ? data.requests : []);
        }
      })
      .catch(() => setOmbiOnline(false))
      .finally(() => setIsLoadingOmbi(false));
  };

  useEffect(() => {
    fetchOmbiData();
    const interval = setInterval(fetchOmbiData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Quick primary launchers with clean branding
  const primaryLaunchers = [
    { id: 'jellyfin', name: 'Jellyfin', port: 8096, category: 'Media' },
    { id: 'ombi', name: 'Ombi', port: 5000, category: 'Requests' },
    { id: 'navidrome', name: 'Navidrome', port: 4533, category: 'Music' },
    { id: 'suwayomi', name: 'Suwayomi', port: 4567, category: 'Manga' },
    { id: 'qbittorrent', name: 'qBittorrent', port: 8080, category: 'Torrents' },
    { id: 'radarr', name: 'Radarr', port: 7878, category: 'Movies' },
    { id: 'sonarr', name: 'Sonarr', port: 8989, category: 'Series' },
    { id: 'syncthing', name: 'Syncthing', port: 8384, category: 'Sync' },
    { id: 'adguard', name: 'AdGuard', port: 3000, category: 'DNS' },
  ];

  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const cpuPercent = Math.min(100, Math.max(0, Math.round(telemetry?.cpu.usagePercent || 0)));
  const cpuTemp = Math.round(telemetry?.thermal.cpuTemp || 45);
  const memUsedGB = ((telemetry?.memory.usedBytes || 0) / (1024 * 1024 * 1024)).toFixed(1);
  const memTotalGB = ((telemetry?.memory.totalBytes || 1) / (1024 * 1024 * 1024)).toFixed(1);
  const memPercent = Math.min(100, Math.max(0, Math.round(telemetry?.memory.usagePercent || 0)));
  const diskPercent = Math.min(100, Math.max(0, Math.round(telemetry?.disk.usagePercent || 0)));
  const diskFreeGB = Math.round((telemetry?.disk.freeBytes || 0) / (1024 * 1024 * 1024));

  return (
    <div className="space-y-3.5 sm:space-y-5 pb-20 font-sans select-none animate-in fade-in duration-300">
      {/* 1. Appliance Node Status & Health Card */}
      <div className="p-3.5 sm:p-5 rounded-[24px] bg-surface-container-low border border-outline-variant shadow-none">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-primary-container border border-outline-variant flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-xs sm:text-sm text-on-surface truncate">{systemInfo.hostname || 'tinapple-server'}</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <p className="text-[10px] text-on-surface-variant font-mono truncate">
                Up: {formatUptime(systemInfo.uptime || 0)} • {systemInfo.sessionMode === 'headless' ? 'Headless Server' : 'Niri Desktop'}
              </p>
            </div>
          </div>

          {/* Toggle Full Canvas Board */}
          <button
            onClick={() => {
              AndroidBridge.performHaptic('light');
              onSwitchToFullBoard();
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant text-[11px] font-sans font-bold text-on-surface transition-all flex items-center gap-1 shrink-0 active:scale-95"
            title="Switch to Full Canvas Board View"
          >
            <span>Full Board</span>
            <ArrowRight className="w-3 h-3 text-primary" />
          </button>
        </div>

        {/* 4 Core Health Chips (Mobile Safe, No Text Overflow) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
          {/* CPU */}
          <div className="p-2 sm:p-2.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-lg bg-amber-500/15 text-amber-400 shrink-0">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">CPU</span>
              </div>
              <span className="text-[10px] text-on-surface-variant">{cpuTemp}°C</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs sm:text-sm font-bold text-on-surface">{cpuPercent}%</span>
              <span className="text-[9px] text-on-surface-variant">load</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-1 overflow-hidden">
              <div
                className="bg-amber-400 h-1 rounded-full transition-all duration-500"
                style={{ width: `${cpuPercent}%` }}
              />
            </div>
          </div>

          {/* Memory */}
          <div className="p-2 sm:p-2.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-lg bg-sky-500/15 text-sky-400 shrink-0">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">RAM</span>
              </div>
              <span className="text-[10px] text-on-surface-variant">{memUsedGB}G</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs sm:text-sm font-bold text-on-surface">{memPercent}%</span>
              <span className="text-[9px] text-on-surface-variant">of {memTotalGB}G</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-1 overflow-hidden">
              <div
                className="bg-sky-400 h-1 rounded-full transition-all duration-500"
                style={{ width: `${memPercent}%` }}
              />
            </div>
          </div>

          {/* Disk */}
          <div className="p-2 sm:p-2.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-lg bg-purple-500/15 text-purple-400 shrink-0">
                  <HardDrive className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Disk</span>
              </div>
              <span className="text-[10px] text-on-surface-variant">{diskFreeGB}G free</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs sm:text-sm font-bold text-on-surface">{diskPercent}%</span>
              <span className="text-[9px] text-on-surface-variant">used</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-1 overflow-hidden">
              <div
                className="bg-purple-400 h-1 rounded-full transition-all duration-500"
                style={{ width: `${diskPercent}%` }}
              />
            </div>
          </div>

          {/* Thermal / Profile */}
          <div className="p-2 sm:p-2.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Power</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">OK</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs sm:text-sm font-bold text-on-surface capitalize truncate">
                {telemetry?.thermal.profile || 'server'}
              </span>
              <span className="text-[9px] text-on-surface-variant">profile</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-1 overflow-hidden">
              <div className="bg-emerald-400 h-1 rounded-full w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Direct Service Portals (Quick 1-Tap Mobile Grid) */}
      <div className="p-3.5 sm:p-5 rounded-[24px] bg-surface-container-low border border-outline-variant shadow-none">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
            <span>Primary Media Appliances</span>
          </h4>
          {onSelectTab && (
            <button
              onClick={() => onSelectTab('services')}
              className="text-[11px] text-primary hover:underline font-bold"
            >
              All Services ({services.length}) →
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {primaryLaunchers.map((app) => {
            const liveService = services.find((s) => {
              if (!s) return false;
              if (s.name === app.id || s.id === app.id) return true;
              const sDisplay = (s.displayName || s.name || '').toLowerCase();
              const aName = (app.name || '').toLowerCase();
              return sDisplay.length > 0 && aName.length > 0 && sDisplay.includes(aName);
            });
            const isRunning = liveService ? liveService.activeState === 'active' : true;
            const targetUrl = getServiceUrl(app.id);

            return (
              <a
                key={app.id}
                href={targetUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => AndroidBridge.performHaptic('light')}
                className="p-2.5 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/70 hover:border-primary/50 transition-all flex flex-col justify-between gap-1.5 active:scale-95 group text-center"
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                  <span className="text-[9px] text-on-surface-variant font-mono">:{app.port}</span>
                </div>

                <div className="w-8 h-8 mx-auto rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                  <AppBrandIcon id={app.id} size={20} className="w-5 h-5 text-on-surface" />
                </div>

                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-on-surface block truncate group-hover:text-primary transition-colors">
                    {app.name}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* 3. Media Requests Deck (Ombi Automated Portal) */}
      <div className="p-3.5 sm:p-5 rounded-[24px] bg-surface-container-low border border-outline-variant shadow-none">
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-outline-variant/50">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Film className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-on-surface">Ombi Requests</h4>
                <span className={`w-1.5 h-1.5 rounded-full ${ombiOnline ? 'bg-emerald-400' : 'bg-rose-400'} shrink-0`} />
              </div>
              <span className="text-[9px] text-on-surface-variant font-mono">Port :5000 • Reverse Proxy /ombi</span>
            </div>
          </div>

          <a
            href={getServiceUrl('ombi')}
            target="_blank"
            rel="noreferrer"
            onClick={() => AndroidBridge.performHaptic('light')}
            className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface hover:text-primary transition-colors"
            title="Launch Ombi Web App"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Live Counts Grid */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          <div className="px-1.5 py-1 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
            <span className="text-[8px] text-on-surface-variant block uppercase font-mono">Available</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">{ombiCounts.available || 0}</span>
          </div>
          <div className="px-1.5 py-1 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
            <span className="text-[8px] text-on-surface-variant block uppercase font-mono">Approved</span>
            <span className="text-xs font-bold text-sky-400 font-mono">{ombiCounts.approved || 0}</span>
          </div>
          <div className="px-1.5 py-1 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
            <span className="text-[8px] text-on-surface-variant block uppercase font-mono">Pending</span>
            <span className="text-xs font-bold text-amber-400 font-mono">{ombiCounts.pending || 0}</span>
          </div>
          <div className="px-1.5 py-1 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
            <span className="text-[8px] text-on-surface-variant block uppercase font-mono">Denied</span>
            <span className="text-xs font-bold text-rose-400 font-mono">{ombiCounts.denied || 0}</span>
          </div>
        </div>

        {/* Recent Requests Feed (with local cache proxy) */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-2.5 scrollbar-thin">
          {ombiRequests.length > 0 ? (
            ombiRequests.slice(0, 5).map((req) => {
              const label = req.statusLabel || (req.available ? 'Available' : req.approved ? 'Approved' : req.denied ? 'Declined' : 'Pending');
              const isAvail = label === 'Available' || req.available;
              const isAppr = label === 'Approved' || req.approved;
              const isDen = label === 'Declined' || req.denied;

              return (
                <div
                  key={req.id || req.title}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-surface-container/70 border border-outline-variant/60"
                >
                  {req.posterPath ? (
                    <img
                      src={`/ombi-images/t/p/w200${req.posterPath}`}
                      alt={req.title}
                      className="w-7 h-10 object-cover rounded shrink-0 bg-surface-container-high"
                      loading="lazy"
                      onError={(e: any) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-7 h-10 rounded bg-surface-container-highest flex items-center justify-center shrink-0 text-xs">
                      {req.type === 'Movie' ? '🎬' : '📺'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-on-surface truncate">{req.title}</span>
                    </div>
                    <span className="text-[9px] text-on-surface-variant font-mono block">
                      by {req.requestedBy?.displayName || req.requestedBy?.username || 'User'}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                      isAvail ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      isAppr ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                      isDen ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : isLoadingOmbi ? (
            <div className="py-4 text-center text-xs text-on-surface-variant font-mono">Loading requests...</div>
          ) : (
            <div className="py-4 text-center text-xs text-on-surface-variant space-y-1">
              <p>No active media requests in Ombi.</p>
            </div>
          )}
        </div>

        {/* 1-Tap Launch Button */}
        <a
          href={getServiceUrl('ombi')}
          target="_blank"
          rel="noreferrer"
          onClick={() => AndroidBridge.performHaptic('medium')}
          className="w-full py-2 px-3 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 active:scale-95 transition-all shadow-none"
        >
          <span>Open Ombi Media Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

export default MobileDashboardView;
