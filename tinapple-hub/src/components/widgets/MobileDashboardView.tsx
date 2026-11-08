import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Thermometer,
  Zap,
  Film,
  Music,
  BookOpen,
  Download,
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ArrowRight,
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
}

export const MobileDashboardView: React.FC<MobileDashboardViewProps> = ({
  telemetry,
  systemInfo,
  services,
  onOpenAppPage,
  onSwitchToFullBoard,
}) => {
  const [ombiOnline, setOmbiOnline] = useState<boolean>(true);
  const [ombiCounts, setOmbiCounts] = useState<{ approved?: number; available?: number; pending?: number; denied?: number }>({});
  const [ombiRequests, setOmbiRequests] = useState<any[]>([]);
  const [isLoadingOmbi, setIsLoadingOmbi] = useState<boolean>(true);

  const fetchOmbiData = () => {
    fetch(`${getActiveServerOrigin()}/api/widgets/ombi`)
      .then((r) => (r.ok ? r.json() : null))
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

  // Quick primary launchers
  const primaryLaunchers = [
    { id: 'jellyfin', name: 'Jellyfin', port: 8096, category: 'Cinema & TV', icon: <Film className="w-5 h-5 text-purple-400" /> },
    { id: 'ombi', name: 'Ombi Requests', port: 5000, category: 'Media Portal', icon: <Film className="w-5 h-5 text-amber-500" /> },
    { id: 'navidrome', name: 'Navidrome', port: 4533, category: 'Lossless Music', icon: <Music className="w-5 h-5 text-emerald-400" /> },
    { id: 'suwayomi', name: 'Suwayomi', port: 4567, category: 'Manga & Comics', icon: <BookOpen className="w-5 h-5 text-sky-400" /> },
    { id: 'qbittorrent', name: 'qBittorrent', port: 8080, category: 'Downloads', icon: <Download className="w-5 h-5 text-amber-400" /> },
    { id: 'radarr', name: 'Radarr', port: 7878, category: 'Movies Automator', icon: <Film className="w-5 h-5 text-amber-500" /> },
    { id: 'sonarr', name: 'Sonarr', port: 8989, category: 'TV Automator', icon: <Activity className="w-5 h-5 text-sky-500" /> },
  ];

  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const cpuPercent = Math.round(telemetry?.cpu.usagePercent || 0);
  const cpuTemp = Math.round(telemetry?.thermal.cpuTemp || 45);
  const memUsedGB = ((telemetry?.memory.usedBytes || 0) / (1024 * 1024 * 1024)).toFixed(1);
  const memTotalGB = ((telemetry?.memory.totalBytes || 1) / (1024 * 1024 * 1024)).toFixed(1);
  const memPercent = Math.round(telemetry?.memory.usagePercent || 0);
  const diskPercent = Math.round(telemetry?.disk.usagePercent || 0);
  const diskFreeGB = Math.round((telemetry?.disk.freeBytes || 0) / (1024 * 1024 * 1024));

  return (
    <div className="space-y-4 pb-24 font-sans select-none animate-in fade-in duration-300">
      {/* 1. Appliance Node Status & Health Card */}
      <div className="p-4 sm:p-5 rounded-[24px] bg-surface-container-low border border-outline-variant shadow-none">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary-container border border-outline-variant flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-on-surface truncate">{systemInfo.hostname || 'tinapple-server'}</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <p className="text-[10px] text-on-surface-variant font-mono truncate">
                Uptime: {formatUptime(systemInfo.uptime || 0)}
              </p>
            </div>
          </div>

          {/* Toggle Full Canvas Board */}
          <button
            onClick={() => {
              AndroidBridge.performHaptic('light');
              onSwitchToFullBoard();
            }}
            className="px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant text-[11px] font-sans font-bold text-on-surface transition-all flex items-center gap-1.5 shrink-0"
            title="Switch to Full Canvas Board View"
          >
            <span>Full Board</span>
            <ArrowRight className="w-3 h-3 text-primary" />
          </button>
        </div>

        {/* 4 Core Health Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* CPU */}
          <div className="p-2.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-on-surface-variant block uppercase font-mono">CPU</span>
              <span className="text-xs font-bold text-on-surface truncate font-mono">
                {cpuPercent}% <span className="text-[10px] text-on-surface-variant font-normal">({cpuTemp}°C)</span>
              </span>
            </div>
          </div>

          {/* RAM */}
          <div className="p-2.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-on-surface-variant block uppercase font-mono">Memory</span>
              <span className="text-xs font-bold text-on-surface truncate font-mono">
                {memPercent}% <span className="text-[10px] text-on-surface-variant font-normal">({memUsedGB}G)</span>
              </span>
            </div>
          </div>

          {/* Disk */}
          <div className="p-2.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-on-surface-variant block uppercase font-mono">Disk</span>
              <span className="text-xs font-bold text-on-surface truncate font-mono">
                {diskPercent}% <span className="text-[10px] text-on-surface-variant font-normal">({diskFreeGB}G free)</span>
              </span>
            </div>
          </div>

          {/* Power / Thermal */}
          <div className="p-2.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-on-surface-variant block uppercase font-mono">Profile</span>
              <span className="text-xs font-bold text-on-surface truncate font-mono capitalize">
                {telemetry?.thermal.profile || 'server'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Direct Service Portals (Quick Links) */}
      <div className="p-4 sm:p-5 rounded-[24px] bg-surface-container-low border border-outline-variant shadow-none">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
            <span>Primary Media Appliances</span>
          </h4>
          <span className="text-[10px] text-on-surface-variant font-mono">Direct 1-Tap Links</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
                className="p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/70 hover:border-primary/50 transition-all flex flex-col justify-between gap-2 active:scale-98 group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                    <AppBrandIcon name={app.id} className="w-4 h-4 text-on-surface" />
                  </div>
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-bold text-on-surface block truncate group-hover:text-primary transition-colors">
                    {app.name}
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-mono truncate block">
                    Port :{app.port}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* 3. Media Requests Deck (Ombi Automated Portal) */}
      <div className="p-4 sm:p-5 rounded-[24px] bg-surface-container-low border border-outline-variant shadow-none">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant/50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Film className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-on-surface">Ombi Media Requests</h4>
                <span className={`w-2 h-2 rounded-full ${ombiOnline ? 'bg-emerald-400' : 'bg-rose-400'} shrink-0`} />
              </div>
              <span className="text-[10px] text-on-surface-variant font-mono">Port :5000 • Reverse Proxy /ombi</span>
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
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Live Counts Grid */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <div className="px-2 py-1.5 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
            <span className="text-[9px] text-on-surface-variant block uppercase font-mono">Available</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">{ombiCounts.available || 0}</span>
          </div>
          <div className="px-2 py-1.5 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
            <span className="text-[9px] text-on-surface-variant block uppercase font-mono">Approved</span>
            <span className="text-xs font-bold text-sky-400 font-mono">{ombiCounts.approved || 0}</span>
          </div>
          <div className="px-2 py-1.5 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
            <span className="text-[9px] text-on-surface-variant block uppercase font-mono">Pending</span>
            <span className="text-xs font-bold text-amber-400 font-mono">{ombiCounts.pending || 0}</span>
          </div>
          <div className="px-2 py-1.5 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
            <span className="text-[9px] text-on-surface-variant block uppercase font-mono">Denied</span>
            <span className="text-xs font-bold text-rose-400 font-mono">{ombiCounts.denied || 0}</span>
          </div>
        </div>

        {/* Recent Requests Feed */}
        <div className="space-y-2 max-h-56 overflow-y-auto mb-3 scrollbar-thin">
          {ombiRequests.length > 0 ? (
            ombiRequests.map((req) => {
              const label = req.statusLabel || (req.available ? 'Available' : req.approved ? 'Approved' : req.denied ? 'Declined' : 'Pending');
              const isAvail = label === 'Available' || req.available;
              const isAppr = label === 'Approved' || req.approved;
              const isDen = label === 'Declined' || req.denied;

              return (
                <div
                  key={req.id || req.title}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container/70 border border-outline-variant/60"
                >
                  {req.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w200${req.posterPath}`}
                      alt={req.title}
                      className="w-8 h-12 object-cover rounded shrink-0 bg-surface-container-high"
                      loading="lazy"
                      onError={(e: any) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-8 h-12 rounded bg-surface-container-highest flex items-center justify-center shrink-0 text-xs">
                      {req.type === 'Movie' ? '🎬' : '📺'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-on-surface truncate">{req.title}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold bg-surface-container-highest text-on-surface-variant shrink-0">
                        {req.type || 'Media'}
                      </span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant font-mono block mt-0.5">
                      by {req.requestedBy?.displayName || req.requestedBy?.username || 'User'}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
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
            <div className="py-6 text-center text-xs text-on-surface-variant font-mono">Loading Ombi requests...</div>
          ) : (
            <div className="py-6 text-center text-xs text-on-surface-variant space-y-1">
              <span>🍿</span>
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
          className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-98 transition-all shadow-sm"
        >
          <span>Open Ombi Request Portal</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
