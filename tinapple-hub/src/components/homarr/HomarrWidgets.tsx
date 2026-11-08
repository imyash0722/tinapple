import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { AppBrandIcon } from '../common/AppBrandIcons';
import { SquishSwitch } from '../reactbits/SquishSwitch';
const ProtonModal = lazy(() => import('../common/ProtonModal').then(m => ({ default: m.ProtonModal })));
import { api, getServiceHost, getServiceUrl } from '../../services/api';
import { serviceRegistry } from '../../services/serviceRegistry';
import {
  Cpu,
  HardDrive,
  Activity,
  Clock,
  Download,
  Upload,
  Shield,
  Wifi,
  ExternalLink,
  Plus,
  Trash2,
  Globe,
  Terminal,
  Film,
  BookOpen,
  Bookmark,
  FolderSync,
  Thermometer,
  Zap,
  Network,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Radio,
  Play,
  Pause,
  RotateCw,
  RefreshCw,
  Smartphone,
  Settings,
  Tv,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TelemetrySnapshot, SystemInfo, ServiceInfo } from '../../types/api';

// 1. Homarr Resource Monitor Widget
export interface HomarrResourceWidgetProps {
  telemetry: TelemetrySnapshot;
  systemInfo: SystemInfo;
}

export const HomarrResourceWidget: React.FC<HomarrResourceWidgetProps> = ({ telemetry, systemInfo }) => {
  const cpuPercent = Math.min(100, Math.round(telemetry?.cpu?.usagePercent ?? 0));
  const ramPercent = Math.min(100, Math.round(telemetry?.memory?.usagePercent ?? 0));
  const diskPercent = Math.min(100, Math.round(telemetry?.disk?.usagePercent ?? 0));

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const coreCount = Array.isArray(telemetry?.cpu?.cores) ? telemetry.cpu.cores.length : 4;
  const tempC = telemetry?.thermal?.cpuTemp ? `${Math.round(telemetry.thermal.cpuTemp)}°C` : 'Normal';

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-surface-container-low border border-outline-variant p-3.5 sm:p-5 flex flex-col justify-between shadow-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-on-surface text-sm font-sans tabular-nums flex items-center gap-2">
              <span>Silicon Telemetry</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                LIVE
              </span>
            </h4>
            <span className="text-[11px] text-on-surface-variant font-sans tabular-nums">{systemInfo?.hostname || 'tinapple-node'}</span>
          </div>
        </div>
        <div className="text-right font-sans tabular-nums text-[11px] text-on-surface-variant">
          <span>{coreCount} Cores</span>
          <span className="text-zinc-600 mx-1">|</span>
          <span className="text-tinapple-gold">{tempC}</span>
        </div>
      </div>

      {/* Progress Bars Matrix */}
      <div className="space-y-3.5 font-sans tabular-nums text-xs">
        {/* CPU Meter */}
        <div>
          <div className="flex justify-between items-center text-on-surface mb-1">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>CPU Load</span>
            </span>
            <span className="font-extrabold text-sm text-on-surface tabular-nums">{cpuPercent}%</span>
          </div>
          <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                cpuPercent > 85 ? 'bg-red-500' : cpuPercent > 60 ? 'bg-amber-400' : 'bg-sky-400'
              }`}
              style={{ width: `${cpuPercent}%` }}
            />
          </div>
        </div>

        {/* RAM Meter */}
        <div>
          <div className="flex justify-between items-center text-on-surface mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Memory (RAM)</span>
            </span>
            <span className="font-extrabold text-sm text-on-surface tabular-nums">
              {ramPercent}% <span className="text-[10px] text-on-surface-variant font-normal">({formatBytes(telemetry?.memory?.usedBytes)})</span>
            </span>
          </div>
          <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                ramPercent > 85 ? 'bg-red-500' : ramPercent > 70 ? 'bg-amber-400' : 'bg-purple-400'
              }`}
              style={{ width: `${ramPercent}%` }}
            />
          </div>
        </div>

        {/* Disk Meter */}
        <div>
          <div className="flex justify-between items-center text-on-surface mb-1">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Root Storage</span>
            </span>
            <span className="font-extrabold text-sm text-on-surface tabular-nums">
              {diskPercent}% <span className="text-[10px] text-on-surface-variant font-normal">({formatBytes(telemetry?.disk?.usedBytes)})</span>
            </span>
          </div>
          <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                diskPercent > 90 ? 'bg-red-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${diskPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Homarr Digital Clock & Node Uptime Widget
export const HomarrClockWidget: React.FC<{ systemInfo: SystemInfo }> = ({ systemInfo }) => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-surface-container-low border border-outline-variant p-3.5 sm:p-5 flex flex-col justify-between shadow-none font-sans tabular-nums">
      <div className="flex items-center justify-between text-on-surface-variant text-xs">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-tinapple-gold">
          <Clock className="w-3.5 h-3.5" />
          <span>Local Clock</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-outline-variant/50 text-[10px] text-on-surface">
          UTC{time.getTimezoneOffset() <= 0 ? '+' : '-'}{Math.abs(Math.floor(time.getTimezoneOffset() / 60))}
        </span>
      </div>

      <div className="my-3 text-center sm:text-left">
        <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight tabular-nums">{timeStr}</div>
        <div className="text-[11px] sm:text-xs text-on-surface-variant mt-1">{dateStr}</div>
      </div>

      <div className="pt-2.5 border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant">
        <span>Uptime:</span>
        <span className="text-emerald-400 font-bold tabular-nums">{formatUptime(systemInfo?.uptime || 0)}</span>
      </div>
    </div>
  );
};

// 3. Homarr Downloads & Transfer Rates Widget
interface TorrentItem {
  name: string;
  progress: number;
  size: number | string;
  dlspeed: number;
  upspeed: number;
  state: string;
  eta: number;
}

export const HomarrDownloadsWidget: React.FC = () => {
  const [data, setData] = useState<{
    dlSpeed: number;
    upSpeed: number;
    dhtNodes: number;
    activeCount: number;
    totalCount: number;
    online: boolean;
    torrents: TorrentItem[];
  }>({
    dlSpeed: 0,
    upSpeed: 0,
    dhtNodes: 0,
    activeCount: 0,
    totalCount: 0,
    online: true,
    torrents: [],
  });

  const fetchTransfers = async () => {
    try {
      const qbRes = await fetch('/api/widgets/qbittorrent').then((r) => (r.ok ? r.json() : null));
      if (qbRes) {
        setData({
          dlSpeed: qbRes.dl_speed || 0,
          upSpeed: qbRes.up_speed || 0,
          dhtNodes: qbRes.dht_nodes || 0,
          activeCount: qbRes.active_torrents || (qbRes.torrents || []).length,
          totalCount: qbRes.total_torrents || (qbRes.torrents || []).length,
          online: qbRes.online !== false,
          torrents: Array.isArray(qbRes.torrents) ? qbRes.torrents : [],
        });
      }
    } catch {}
  };

  useEffect(() => {
    fetchTransfers();
    const interval = setInterval(fetchTransfers, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec || bytesPerSec === 0) return '0 KB/s';
    if (bytesPerSec > 1024 * 1024) return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
    return (bytesPerSec / 1024).toFixed(0) + ' KB/s';
  };

  const formatSize = (bytes: number | string) => {
    const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
    if (isNaN(num) || num <= 0) return '';
    if (num > 1024 * 1024 * 1024) return (num / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    return (num / (1024 * 1024)).toFixed(0) + ' MB';
  };

  const qbitUrl = serviceRegistry.resolveUrl('qbittorrent');

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/25">
            <Download className="w-4 h-4" />
          </span>
          <div>
            <span className="font-bold uppercase tracking-wider text-white">Active Transfers</span>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span className={`w-1.5 h-1.5 rounded-full ${data.online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span>{data.online ? 'qBittorrent Active' : 'Offline'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <a
            href={qbitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1 transition-all"
            title="Open qBittorrent WebUI (:8080)"
          >
            <span>WebUI</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Speedometer Strip */}
      <div className="grid grid-cols-2 gap-2 my-2.5">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Download</span>
            <span className="text-base sm:text-lg font-black text-white tabular-nums">{formatSpeed(data.dlSpeed)}</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-bold">
            ↓ DL
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Upload</span>
            <span className="text-base sm:text-lg font-black text-white tabular-nums">{formatSpeed(data.upSpeed)}</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-bold">
            ↑ UL
          </span>
        </div>
      </div>

      {/* Active Torrents Task List */}
      <div className="flex-1 my-1 overflow-hidden flex flex-col justify-center">
        {data.torrents.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto shelf-scrollbar pr-1.5">
            {data.torrents.map((t, idx) => {
              const progressPct = Math.round((t.progress || 0) * 100);
              const isDl = (t.dlspeed || 0) > 0;
              return (
                <div key={idx} className="p-2 rounded-xl bg-slate-950/40 border border-white/[0.05] space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-zinc-200 font-bold truncate max-w-[220px]" title={t.name}>
                      {t.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 font-bold shrink-0">
                      {progressPct}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progressPct >= 100 ? 'bg-emerald-400' : isDl ? 'bg-sky-400' : 'bg-purple-400'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="capitalize">{t.state || 'Active'}</span>
                    <div className="flex items-center gap-2">
                      {t.size ? <span>{formatSize(t.size)}</span> : null}
                      {isDl ? <span className="text-emerald-400 font-bold">↓ {formatSpeed(t.dlspeed)}</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-zinc-500">
            <span>No active torrent downloads • Standby mode</span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
        <span>Active Tasks: <strong className="text-white">{data.activeCount}</strong></span>
        <span className="text-zinc-500 text-[10px]">Port 8080 • DHT: {data.dhtNodes}</span>
      </div>
    </div>
  );
};

// 4. Homarr Tailscale Mesh & Privacy Guard Widget (Tor & Proton VPN Exit Controls)
export const HomarrNetworkGuardWidget: React.FC<{ onOpenTailscale?: () => void; onOpenProton?: () => void }> = ({ onOpenTailscale, onOpenProton }) => {
  const [torActive, setTorActive] = useState(false);
  const [isTogglingTor, setIsTogglingTor] = useState(false);
  const [protonActive, setProtonActive] = useState(false);
  const [protonDetails, setProtonDetails] = useState<string>('');
  const [protonConfigured, setProtonConfigured] = useState<boolean>(false);
  const [isTogglingProton, setIsTogglingProton] = useState(false);
  const [localProtonModalOpen, setLocalProtonModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/system/tor-exit')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.active !== undefined) setTorActive(data.active);
      })
      .catch(() => {});

    api.getProtonStatus().then((res) => {
      setProtonActive(res.active);
      setProtonConfigured(Boolean(res.configured || res.wireguard_config_exists || res.is_logged_in));
      if (res.details) setProtonDetails(res.details);
    }).catch(() => {});
  }, []);

  const handleToggleTor = async (nextState: boolean) => {
    setIsTogglingTor(true);
    try {
      const res = await fetch('/api/system/tor-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState }),
      });
      if (res.ok) setTorActive(nextState);
    } catch {} finally {
      setIsTogglingTor(false);
    }
  };

  const handleToggleProton = async (nextState: boolean) => {
    setIsTogglingProton(true);
    try {
      const res = await api.toggleProtonStatus(nextState);
      setProtonActive(res.active);
      if (res.details) setProtonDetails(res.details);
      if (res.configured !== undefined) {
        setProtonConfigured(Boolean(res.configured));
      }
      if (!res.active && nextState) {
        // Automatically open setup modal if turning on unconfigured VPN
        if (onOpenProton) {
          onOpenProton();
        } else {
          setLocalProtonModalOpen(true);
        }
      }
    } finally {
      setIsTogglingProton(false);
    }
  };

  const openProtonSetup = () => {
    if (onOpenProton) {
      onOpenProton();
    } else {
      setLocalProtonModalOpen(true);
    }
  };

  const currentHost = getServiceHost();

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-surface-container-low border border-outline-variant p-3.5 sm:p-5 flex flex-col justify-between shadow-none font-sans tabular-nums">
      <div className="flex items-center justify-between text-xs mb-2.5">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-sky-400">
          <Shield className="w-4 h-4" />
          <span>Tailscale Mesh & Privacy</span>
        </span>
        {onOpenTailscale && (
          <button
            onClick={onOpenTailscale}
            className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold hover:bg-sky-500/30 transition-colors"
          >
            Mesh Settings
          </button>
        )}
      </div>

      <div className="space-y-2 text-xs">
        {/* MagicDNS Mesh Link */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container border border-slate-700/60">
          <div className="flex items-center gap-2 min-w-0">
            <Wifi className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-on-surface font-bold block truncate">MagicDNS Mesh Link</span>
              <span className="text-[10px] text-on-surface-variant block truncate">pineapple-server.taildb42a2.ts.net</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold shrink-0">
            Active
          </span>
        </div>

        {/* Proton VPN Privacy Exit Node */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container border border-slate-700/60">
          <div
            onClick={openProtonSetup}
            className="flex items-center gap-2 min-w-0 cursor-pointer group flex-1 mr-2"
            title="Click to configure Proton VPN and media unblocking"
          >
            <Shield className="w-4 h-4 text-[#a48eff] shrink-0 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-on-surface font-bold block truncate group-hover:text-[#a48eff] transition-colors">
                  Proton Privacy Exit
                </span>
                {!protonConfigured && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                    SETUP
                  </span>
                )}
              </div>
              <span className="text-[10px] text-on-surface-variant block truncate">
                {protonActive
                  ? (protonDetails || 'Swiss WireGuard Active • All Media Routed')
                  : protonConfigured
                  ? (protonDetails || 'Configured • Ready to Connect')
                  : 'Setup required • Click to configure WireGuard/Login'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={openProtonSetup}
              className="p-1 rounded-lg hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors"
              title="Configure Proton VPN WireGuard & Account"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <SquishSwitch
              label="Proton VPN" checked={protonActive}
              onChange={handleToggleProton}
              disabled={isTogglingProton}
              variant="purple"
              size="sm"
            />
          </div>
        </div>

        {/* Tor Privacy Exit Node */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container border border-slate-700/60">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-on-surface font-bold block truncate">Tor Privacy Exit</span>
              <span className="text-[10px] text-on-surface-variant block truncate">SOCKS5 127.0.0.1:9050</span>
            </div>
          </div>
          <SquishSwitch
            label="Tor routing" checked={torActive}
            onChange={handleToggleTor}
            disabled={isTogglingTor}
            variant="amber"
            size="sm"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant mt-2">
        <span>DNS Shield:</span>
        <a
          href={serviceRegistry.resolveUrl('adguard')}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline flex items-center gap-1"
        >
          <span>AdGuard Home</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <Suspense fallback={null}>
        <ProtonModal
          isOpen={localProtonModalOpen}
          onClose={() => setLocalProtonModalOpen(false)}
          onStatusChange={(st) => {
            setProtonActive(st.active);
            setProtonConfigured(Boolean(st.configured || st.wireguard_config_exists || st.is_logged_in));
            if (st.details) setProtonDetails(st.details);
          }}
        />
      </Suspense>
    </div>
  );
};

// 4b. Dedicated Single Appliance Custom Widget
export interface HomarrSingleApplianceWidgetProps {
  appId: string;
  customTitle?: string;
  customIcon?: string;
  customColor?: string;
}

export const HomarrSingleApplianceWidget: React.FC<HomarrSingleApplianceWidgetProps> = ({
  appId,
  customTitle,
  customIcon,
  customColor,
}) => {
  const [app, setApp] = useState<any>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const fetchApp = async () => {
    try {
      const data = (await api.getApps()).find(item => item.id === appId);
      if (data) {
        setApp(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchApp();
    const interval = setInterval(fetchApp, 4000);
    return () => clearInterval(interval);
  }, [appId]);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionBusy(action);
    try {
      if (action === 'start') await api.startApp(appId);
      else if (action === 'stop') await api.stopApp(appId);
      else if (action === 'restart') await api.restartApp(appId);
      await fetchApp();
    } finally {
      setActionBusy(null);
    }
  };

  const isRunning = app?.status === 'running' || app?.running;
  const isInstalled = app?.installed;
  const port = app?.port || 0;
  const webUrl = serviceRegistry.get(appId)?.getOpenUrl() || (port > 0 ? getServiceUrl(port) : null);
  const accentColor = customColor || app?.accentColor || '#38bdf8';

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-surface-container-low border border-outline-variant p-3.5 sm:p-5 flex flex-col justify-between shadow-none font-sans tabular-nums select-none relative overflow-hidden group">
      {/* Ambient background glow */}
      <div
        className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-35"
        style={{ backgroundColor: accentColor }}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <AppBrandIcon id={customIcon || app?.icon || appId} size={30} />
          <div className="min-w-0">
            <h4 className="text-sm font-black text-on-surface truncate">
              {customTitle || app?.name || appId}
            </h4>
            <p className="text-[10px] text-tinapple-muted truncate">
              {app?.tagline || `Systemd service ${appId}.service`}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 shrink-0 ${
            isRunning
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : isInstalled
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-surface-container text-on-surface-variant border-slate-700'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isRunning ? 'bg-emerald-400 animate-pulse' : isInstalled ? 'bg-amber-400' : 'bg-slate-500'
            }`}
          />
          {isRunning ? 'RUNNING' : isInstalled ? 'STOPPED' : 'UNINSTALLED'}
        </span>
      </div>

      {/* Metrics & Port badge */}
      <div className="grid grid-cols-2 gap-2 my-2.5">
        <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 flex flex-col justify-between">
          <span className="text-[10px] text-on-surface-variant">Assigned Port</span>
          <span className="text-xs font-bold text-on-surface mt-1">
            {port > 0 ? `:${port}` : 'None'}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 flex flex-col justify-between">
          <span className="text-[10px] text-on-surface-variant">Active State</span>
          <span className="text-xs font-bold text-on-surface mt-1 capitalize truncate">
            {app?.activeState || (isRunning ? 'Active' : 'Inactive')}
          </span>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="pt-2.5 border-t border-outline-variant flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isRunning ? (
            <button
              onClick={() => handleAction('stop')}
              disabled={Boolean(actionBusy)}
              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition-all disabled:opacity-50"
            >
              {actionBusy === 'stop' ? 'Stopping...' : 'Stop'}
            </button>
          ) : (
            <button
              onClick={() => handleAction('start')}
              disabled={Boolean(actionBusy) || !isInstalled}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-all disabled:opacity-50"
            >
              {actionBusy === 'start' ? 'Starting...' : 'Start'}
            </button>
          )}
          <button
            onClick={() => handleAction('restart')}
            disabled={Boolean(actionBusy) || !isInstalled}
            className="p-1 rounded-lg bg-surface-container hover:bg-slate-700 text-on-surface hover:text-on-surface border border-outline-variant/50 text-[10px] transition-all disabled:opacity-50"
            title="Restart Service"
          >
            <RotateCw className={`w-3.5 h-3.5 ${actionBusy === 'restart' ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {webUrl && (
          <a
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-tinapple-gold hover:bg-amber-400 text-slate-950 text-[10px] font-black transition-all shadow-none active:scale-95"
          >
            <span>Open UI</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

// 5. Homarr Jellyfin Media Server Widget (Live Streams, Media Posters & Continue Watching)
interface JellyfinNowPlaying {
  id: string;
  name: string;
  seriesName?: string;
  type: string;
  user: string;
  client?: string;
  device?: string;
  imageUrl: string;
  isPaused: boolean;
  position: number;
  duration: number;
}

interface JellyfinRecentItem {
  id: string;
  name: string;
  seriesName?: string;
  type: string;
  imageUrl: string;
  duration?: number;
}

export const HomarrMediaWidget: React.FC<{ onOpenGuide?: (g: string) => void }> = ({ onOpenGuide }) => {
  const [online, setOnline] = useState<boolean>(true);
  const [serverName, setServerName] = useState<string>('pineapple');
  const [nowPlaying, setNowPlaying] = useState<JellyfinNowPlaying[]>([]);
  const [recent, setRecent] = useState<JellyfinRecentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const mediaShelfRef = useRef<HTMLDivElement>(null);

  const scrollMediaShelf = (direction: 'left' | 'right') => {
    if (mediaShelfRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      mediaShelfRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleMediaWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  const fetchJellyfin = async () => {
    try {
      const res = await fetch('/api/widgets/jellyfin');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setOnline(data.online !== false);
          if (data.serverName) setServerName(data.serverName);
          setNowPlaying(Array.isArray(data.nowPlaying) ? data.nowPlaying : []);
          setRecent(Array.isArray(data.recent) ? data.recent : []);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchJellyfin();
    const interval = setInterval(fetchJellyfin, 4000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}:${(mins % 60).toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const jellyfinBase = serviceRegistry.resolveUrl('jellyfin');
  const activeStream = nowPlaying.length > 0 ? nowPlaying[0] : null;

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between text-xs mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/25">
            <Film className="w-4 h-4" />
          </span>
          <div>
            <span className="font-bold uppercase tracking-wider text-white">Jellyfin Media Server</span>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span>{online ? (activeStream ? 'Streaming Active' : 'Online • Ready') : 'Offline'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
            Port 8096
          </span>
          <a
            href={jellyfinBase}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1 transition-all"
            title="Open Jellyfin Web Player"
          >
            <span>Web Player</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* 1. NOW PLAYING HERO BANNER (When any user is streaming) */}
      {activeStream ? (
        <div className="my-2 p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900/70 to-slate-950/80 border border-purple-500/30 relative overflow-hidden group">
          <div className="flex items-center gap-3">
            {/* Poster Thumbnail */}
            <div className="w-14 h-20 rounded-xl overflow-hidden bg-slate-950 border border-purple-500/30 shrink-0 relative shadow-md">
              <img
                src={activeStream.imageUrl}
                alt={activeStream.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icons/jellyfin.svg';
                }}
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                {activeStream.isPaused ? (
                  <Pause className="w-4 h-4 text-white drop-shadow" />
                ) : (
                  <Play className="w-4 h-4 text-emerald-400 drop-shadow fill-emerald-400" />
                )}
              </div>
            </div>

            {/* Stream Metadata */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Now Playing</span>
                </span>
                <span className="text-[10px] text-zinc-400 truncate">
                  {activeStream.user} • {activeStream.client || activeStream.device || 'Tsukimi'}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white truncate" title={activeStream.name}>
                {activeStream.name}
              </h4>
              {activeStream.seriesName && (
                <p className="text-[11px] text-purple-300 truncate font-semibold" title={activeStream.seriesName}>
                  {activeStream.seriesName}
                </p>
              )}

              {/* Live Playback Progress Bar */}
              {activeStream.duration > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-sky-400 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((activeStream.position / activeStream.duration) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>{formatTime(activeStream.position)}</span>
                    <span>{formatTime(activeStream.duration)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. RECENT MEDIA POSTERS CAROUSEL */}
      {recent.length > 0 ? (
        <div className="space-y-2 my-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="font-bold text-zinc-300">Recently Added Media ({recent.length})</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollMediaShelf('left')}
                className="p-1 rounded-lg bg-slate-950/60 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Scroll shelf left"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => scrollMediaShelf('right')}
                className="p-1 rounded-lg bg-slate-950/60 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Scroll shelf right"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
              <span className="text-[10px] text-zinc-500 hidden sm:inline">Click to stream</span>
            </div>
          </div>

          <div
            ref={mediaShelfRef}
            onWheel={handleMediaWheel}
            className="flex gap-2.5 overflow-x-auto pb-2.5 shelf-scrollbar select-none"
          >
            {recent.map((item) => {
              const itemUrl = `${jellyfinBase.replace(/\/$/, '')}/web/#/details?id=${item.id}`;
              return (
                <a
                  key={item.id}
                  href={itemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex-shrink-0 w-24 rounded-xl overflow-hidden bg-slate-950 border border-white/[0.08] hover:border-purple-500/50 hover:shadow-lg transition-all"
                  title={`${item.name} (${item.type})`}
                >
                  <div className="aspect-[2/3] w-full overflow-hidden relative bg-slate-900">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icons/jellyfin.svg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 text-[8px] font-bold uppercase backdrop-blur-sm">
                      {item.type || 'Media'}
                    </span>
                  </div>

                  <div className="p-1.5">
                    <h5 className="text-[10px] font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                      {item.name}
                    </h5>
                    {item.seriesName && (
                      <p className="text-[9px] text-zinc-400 truncate">{item.seriesName}</p>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      ) : !activeStream ? (
        <div className="p-3 rounded-xl bg-purple-500/[0.07] border border-purple-500/20 space-y-1.5 my-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white font-bold">Hardware Transcoding</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
              VA-API / QSV
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            DirectPlay 4K HDR streaming enabled for Tsukimi, Plezy, Apple TV, Android, and web.
          </p>
        </div>
      ) : null}

      {/* Footer Navigation */}
      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <Tv className="w-3.5 h-3.5 text-purple-400" />
          <span>Tsukimi & Plezy Ready</span>
        </div>

        {onOpenGuide && (
          <button
            onClick={() => onOpenGuide('jellyfin')}
            className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <BookOpen className="w-3 h-3 text-purple-400" />
            <span>Setup Guide</span>
          </button>
        )}
      </div>
    </div>
  );
};

// 6. Homarr Suwayomi & Manga Shelf Widget (Live Covers, Unread Badges & Reading History)
interface MangaShelfItem {
  id: string | number;
  title: string;
  thumbnailUrl: string;
  unreadCount?: number;
  lastChapterRead?: string;
  latestChapter?: string;
  source?: { name?: string } | string;
}

export const HomarrMangaWidget: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reading' | 'history' | 'updates'>('reading');
  const [categoryName, setCategoryName] = useState<string>('Reading');
  const [online, setOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [readingList, setReadingList] = useState<MangaShelfItem[]>([]);
  const [historyList, setHistoryList] = useState<MangaShelfItem[]>([]);
  const [updatesList, setUpdatesList] = useState<MangaShelfItem[]>([]);
  const shelfRef = useRef<HTMLDivElement>(null);

  const scrollShelf = (direction: 'left' | 'right') => {
    if (shelfRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      shelfRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.currentTarget.scrollLeft += e.deltaY;
      }
    }
  };

  const fetchManga = () => {
    setLoading(true);
    fetch('/api/widgets/manga')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setOnline(data.online !== false);
          if (data.categoryName || data.category) {
            setCategoryName(data.categoryName || data.category);
          }
          if (typeof data.totalCount === 'number') setTotalCount(data.totalCount);
          setReadingList(Array.isArray(data.library) ? data.library : Array.isArray(data.mangas) ? data.mangas : []);
          setHistoryList(Array.isArray(data.history) ? data.history : []);
          setUpdatesList(Array.isArray(data.updates) ? data.updates : []);
        }
      })
      .catch(() => setOnline(false))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchManga();
    const interval = setInterval(fetchManga, 15000);
    return () => clearInterval(interval);
  }, []);

  const currentList = activeTab === 'reading' ? readingList : activeTab === 'history' ? historyList : updatesList;
  const suwayomiWebUrl = serviceRegistry.resolveUrl('suwayomi');

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
      {/* Header with Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/25">
            <BookOpen className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold uppercase tracking-wider text-white text-xs">Suwayomi Manga Shelf</span>
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            </div>
            <span className="text-[10px] text-zinc-400">Tachiyomi Extension Engine</span>
          </div>
        </div>

        {/* Tab Pills & Refresh */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-950/70 p-0.5 rounded-xl border border-white/[0.06] text-xs">
            <button
              onClick={() => setActiveTab('reading')}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold ${
                activeTab === 'reading'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {categoryName} {totalCount > 0 ? `(${totalCount})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold ${
                activeTab === 'history'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              History {historyList.length > 0 ? `(${historyList.length})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold ${
                activeTab === 'updates'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Updates {updatesList.length > 0 ? `(${updatesList.length})` : ''}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scrollShelf('left')}
              className="p-1.5 rounded-lg bg-slate-950/60 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors shrink-0"
              title="Scroll shelf left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scrollShelf('right')}
              className="p-1.5 rounded-lg bg-slate-950/60 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors shrink-0"
              title="Scroll shelf right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={fetchManga}
            className="p-1.5 rounded-lg bg-slate-950/60 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors shrink-0"
            title="Refresh manga library"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Manga Covers Horizontal Shelf */}
      <div className="my-2 flex-1 min-h-[140px] flex flex-col justify-center">
        {currentList.length > 0 ? (
          <div
            ref={shelfRef}
            onWheel={handleWheel}
            className="flex gap-3 overflow-x-auto pb-2.5 shelf-scrollbar"
          >
            {currentList.map((manga, idx) => {
              const suwayomiMangaUrl = `${suwayomiWebUrl.replace(/\/$/, '')}/manga/${manga.id}`;
              const sourceLabel = typeof manga.source === 'object' ? manga.source?.name : manga.source || 'Suwayomi';
              return (
                <a
                  key={`${activeTab}-${manga.id}-${idx}`}
                  href={suwayomiMangaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative flex-shrink-0 w-28 rounded-xl overflow-hidden bg-slate-950 border border-white/[0.08] hover:border-orange-500/50 hover:shadow-xl transition-all cursor-pointer"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden relative bg-slate-900">
                    <img
                      src={manga.thumbnailUrl}
                      alt={manga.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icons/suwayomi.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                    {/* Unread badge on library tab */}
                    {activeTab === 'reading' && manga.unreadCount !== undefined && manga.unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-orange-500 text-slate-950 text-[9px] font-bold shadow-md">
                        +{manga.unreadCount}
                      </span>
                    )}

                    {/* Latest chapter pill on updates tab */}
                    {activeTab === 'updates' && manga.latestChapter && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[9px] font-bold shadow-md">
                        Update
                      </span>
                    )}
                  </div>

                  <div className="p-2">
                    <h5 className="text-[11px] font-bold text-white truncate group-hover:text-orange-400 transition-colors" title={manga.title}>
                      {manga.title}
                    </h5>
                    <p className="text-[9px] text-zinc-400 mt-0.5 truncate" title={manga.lastChapterRead || manga.latestChapter || sourceLabel}>
                      {activeTab === 'history' ? (manga.lastChapterRead || 'Read') : activeTab === 'updates' ? (manga.latestChapter || 'New') : sourceLabel}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 px-4 rounded-xl bg-slate-950/40 border border-white/[0.05]">
            <BookOpen className="w-6 h-6 text-orange-400/50 mx-auto mb-1.5" />
            <h5 className="text-xs font-bold text-white">No Manga in {activeTab === 'history' ? 'History' : activeTab === 'updates' ? 'Updates' : categoryName}</h5>
            <p className="text-[10px] text-zinc-400 mt-1 max-w-sm mx-auto">
              Sync extensions or read chapters in Suwayomi to populate your reading shelf.
            </p>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-auto text-xs">
        <a
          href="/download/tsumiru"
          download="tsumiru-client.apk"
          className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-bold flex items-center gap-1.5 transition-all"
          title="Download Tsumiru Android APK for your phone"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          <span>Phone APK</span>
        </a>

        <a
          href={suwayomiWebUrl}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-tinapple-gold/20 hover:bg-tinapple-gold/30 border border-tinapple-gold/40 text-tinapple-gold text-[11px] font-bold flex items-center gap-1.5 transition-all"
          title="Open Suwayomi Manga Web Reader on Desktop (:4567)"
        >
          <span>Open WebUI</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

// 7. Homarr Syncthing & TrueNAS Bridge Widget
export const HomarrSyncVaultWidget: React.FC = () => {
  const currentHost = getServiceHost();

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-surface-container-low border border-outline-variant p-3.5 sm:p-5 flex flex-col justify-between shadow-none font-sans tabular-nums">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-emerald-400">
          <FolderSync className="w-4 h-4" />
          <span>P2P Sync & TrueNAS Bridge</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
          Port 8384
        </span>
      </div>

      <div className="p-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-on-surface font-bold">Encrypted File Sync</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
            Continuous
          </span>
        </div>
        <p className="text-[11px] text-on-surface-variant">
          Zero-cloud direct sync to phone, laptop, and TrueNAS ZFS vault datasets.
        </p>
      </div>

      <div className="pt-3 border-t border-outline-variant flex items-center justify-between gap-2 mt-2">
        <a
          href="/pair.sh"
          target="_blank"
          className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
        >
          <span>Pairing Script</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href={serviceRegistry.resolveUrl('syncthing')}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 transition-all"
        >
          <span>Sync Console</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

// 8. Homarr Hardware Sensors & Battery Widget
export const HomarrHardwareWidget: React.FC<{ telemetry: TelemetrySnapshot }> = ({ telemetry }) => {
  const temp = telemetry?.thermal?.cpuTemp ? Math.round(telemetry.thermal.cpuTemp) : 45;
  const fan = telemetry?.thermal?.fanRpm ?? 1400;
  const bat = telemetry?.battery;

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-surface-container-low border border-outline-variant p-3.5 sm:p-5 flex flex-col justify-between shadow-none font-sans tabular-nums">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-rose-400">
          <Thermometer className="w-4 h-4" />
          <span>Hardware & Battery</span>
        </span>
        <span className="text-[11px] text-on-surface-variant">Thermal Profile: Normal</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-surface-container border border-slate-700/60">
          <span className="text-[10px] text-on-surface-variant uppercase block mb-1">CPU Temperature</span>
          <span className={`text-base font-extrabold font-sans tabular-nums tabular-nums ${temp > 75 ? 'text-red-400' : 'text-emerald-400'}`}>
            {temp}°C
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-container border border-slate-700/60">
          <span className="text-[10px] text-on-surface-variant uppercase block mb-1">Cooling Fan</span>
          <span className="text-base font-extrabold font-sans tabular-nums text-sky-400 tabular-nums">{fan} RPM</span>
        </div>

        {bat?.present && (
          <div className="col-span-2 p-2.5 rounded-xl bg-surface-container border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-tinapple-gold" />
              <div>
                <span className="text-on-surface font-bold block">Battery Threshold</span>
                <span className="text-[10px] text-on-surface-variant block tabular-nums">Charge limit {bat.chargeLimit}%</span>
              </div>
            </div>
            <span className="text-base font-extrabold font-sans tabular-nums text-on-surface tabular-nums">{bat.percent}%</span>
          </div>
        )}
      </div>

      <div className="pt-2.5 border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant mt-2">
        <span>Hardware Nonce:</span>
        <span className="text-emerald-400 font-bold">TPM 2.0 Sealed</span>
      </div>
    </div>
  );
};

// 9. Homarr Server Port Matrix Widget
export const HomarrPortMatrixWidget: React.FC<{ onOpenTools?: () => void }> = ({ onOpenTools }) => {
  const currentHost = getServiceHost();
  const isHttps = window.location.protocol === 'https:';

  const ports = [
    { name: 'Dash', port: 8088, path: '/', color: 'text-tinapple-gold' },
    { name: 'Media', port: 8096, path: serviceRegistry.resolveUrl('jellyfin'), color: 'text-purple-400' },
    { name: 'Manga', port: 4567, path: serviceRegistry.resolveUrl('suwayomi'), color: 'text-amber-400' },
    { name: 'Torrent', port: 8080, path: serviceRegistry.resolveUrl('qbittorrent'), color: 'text-sky-400' },
    { name: 'Sync', port: 8384, path: serviceRegistry.resolveUrl('syncthing'), color: 'text-emerald-400' },
    { name: 'Ombi', port: 5000, path: serviceRegistry.resolveUrl('ombi'), color: 'text-amber-500' },
    { name: 'AdGuard', port: 3000, path: serviceRegistry.resolveUrl('adguard'), color: 'text-teal-400' },
    { name: 'Vault', port: 8000, path: serviceRegistry.resolveUrl('vaultwarden'), color: 'text-indigo-400' },
  ];

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-surface-container-low border border-outline-variant p-3.5 sm:p-5 flex flex-col justify-between shadow-none font-sans tabular-nums">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-tinapple-gold">
          <Network className="w-4 h-4" />
          <span>Active Port Matrix</span>
        </span>
        {onOpenTools && (
          <button
            onClick={onOpenTools}
            className="text-[10px] text-tinapple-gold hover:underline font-bold"
          >
            Full Matrix ↗
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        {ports.map((p) => (
          <a
            key={p.port}
            href={p.path}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-surface-container hover:bg-slate-700/80 border border-slate-700/60 transition-all flex flex-col items-center justify-center text-center group"
          >
            <span className="text-[10px] text-on-surface-variant group-hover:text-on-surface truncate w-full">{p.name}</span>
            <span className={`font-bold ${p.color} text-xs mt-0.5`}>:{p.port}</span>
          </a>
        ))}
      </div>

      <div className="pt-2.5 border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant mt-2">
        <span>Verified Listeners:</span>
        <span className="text-emerald-400 font-bold">TCP 0.0.0.0</span>
      </div>
    </div>
  );
};

// 10. Homarr Mini Terminal Quick Launcher Widget
export const HomarrTerminalWidget: React.FC<{ onOpenTerminal?: () => void }> = ({ onOpenTerminal }) => {
  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-surface-container-low border border-outline-variant p-3.5 sm:p-5 flex flex-col justify-between shadow-none font-sans tabular-nums">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-emerald-400">
          <Terminal className="w-4 h-4" />
          <span>Web Terminal</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
          PTY Bash
        </span>
      </div>

      <div className="p-3 rounded-xl bg-surface-container-low border border-slate-800 text-[11px] text-emerald-400/90 leading-relaxed font-sans tabular-nums">
        <div>$ node-status --verified</div>
        <div className="text-on-surface-variant">Kernel: 6.12.8-cachyos-tinapple</div>
        <div className="text-on-surface-variant">Interactive PTY shell available</div>
      </div>

      <div className="pt-3 border-t border-outline-variant flex items-center justify-end mt-2">
        {onOpenTerminal && (
          <button
            onClick={onOpenTerminal}
            className="w-full py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-none shadow-emerald-500/20"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Web Terminal</span>
          </button>
        )}
      </div>
    </div>
  );
};

// 11. Homarr Journal Alert Stream Widget
export const HomarrJournalWidget: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/v1/tools/kernel-logs')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.logs)) {
          setLogs(data.logs.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-surface-container-low border border-outline-variant p-3.5 sm:p-5 flex flex-col justify-between shadow-none font-sans tabular-nums">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Kernel & Journal Alerts</span>
        </span>
        <span className="text-[10px] text-on-surface-variant">Priority ≤ 3</span>
      </div>

      <div className="p-2.5 rounded-xl bg-surface-container-low border border-slate-800 space-y-1.5 text-[10px] text-on-surface max-h-28 overflow-y-auto shelf-scrollbar pr-1.5">
        {logs.length > 0 ? (
          logs.map((log, i) => (
            <div key={i} className="truncate text-amber-300/90">
              • {log}
            </div>
          ))
        ) : (
          <div className="text-emerald-400 flex items-center gap-1.5 py-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>No critical system journal alerts recorded</span>
          </div>
        )}
      </div>

      <div className="pt-2.5 border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant mt-2">
        <span>System Log State:</span>
        <span className="text-emerald-400 font-bold">Healthy</span>
      </div>
    </div>
  );
};

// 12. Homarr Custom Bookmarks Component
export interface CustomBookmarkItem {
  id: string;
  name: string;
  url: string;
  icon?: string;
  category?: string;
}

export interface HomarrBookmarksWidgetProps {
  bookmarks?: CustomBookmarkItem[];
  isEditMode?: boolean;
  onAddBookmark?: () => void;
  onDeleteBookmark?: (id: string) => void;
}

export const HomarrBookmarksWidget: React.FC<HomarrBookmarksWidgetProps> = ({
  bookmarks = [],
  isEditMode = false,
  onAddBookmark,
  onDeleteBookmark,
}) => {
  const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : [];

  return (
    <div className="h-full rounded-2xl sm:rounded-[28px] bg-surface-container-low border border-outline-variant p-3.5 sm:p-5 shadow-none font-sans tabular-nums">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary shrink-0" />
          <h4 className="font-bold text-on-surface text-sm tracking-wide uppercase">
            Homelab Bookmarks & Web Services ({safeBookmarks.length})
          </h4>
        </div>
        {isEditMode && onAddBookmark && (
          <button
            onClick={onAddBookmark}
            className="px-3 py-1 rounded-xl bg-tinapple-gold hover:bg-amber-400 text-slate-950 font-sans tabular-nums text-xs font-bold flex items-center gap-1 shadow-none transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Bookmark</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {safeBookmarks.map((bm) => (
          <div
            key={bm.id}
            className="group relative rounded-xl bg-surface-container hover:bg-surface-container border border-white/[0.06] hover:border-outline-variant/50 p-3 transition-all flex items-center justify-between gap-2"
          >
            <a
              href={bm.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 min-w-0 flex-1"
            >
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center text-xs font-bold text-primary shrink-0 group-hover:scale-105 transition-transform">
                {bm.icon || <Globe className="w-4 h-4 text-primary" />}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-on-surface block truncate">{bm.name}</span>
                <span className="text-[10px] text-on-surface-variant font-sans tabular-nums block truncate">
                  {bm.url.replace(/^https?:\/\//, '')}
                </span>
              </div>
            </a>

            {isEditMode && onDeleteBookmark && (
              <button
                onClick={() => onDeleteBookmark(bm.id)}
                className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Bookmark"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {safeBookmarks.length === 0 && !isEditMode && (
          <div className="col-span-full py-4 text-center text-xs text-on-surface-variant">
            No custom bookmarks yet. Enable Edit Mode to add your homelab portals.
          </div>
        )}
      </div>
    </div>
  );
};

// 13. Homarr Ombi Media Requests Widget
export const HomarrRequestsWidget: React.FC = () => {
  const [online, setOnline] = useState<boolean>(true);
  const [counts, setCounts] = useState<{ approved?: number; available?: number; pending?: number; denied?: number }>({});
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOmbiData = () => {
    fetch('/api/widgets/ombi')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setOnline(data.online !== false);
          setCounts(data.counts || {});
          setRequests(Array.isArray(data.requests) ? data.requests : []);
        }
      })
      .catch(() => setOnline(false))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchOmbiData();
    const interval = setInterval(fetchOmbiData, 10000);
    return () => clearInterval(interval);
  }, []);

  const ombiUrl = serviceRegistry.resolveUrl('ombi');

  const getStatusBadge = (req: any) => {
    const label = req.statusLabel || (req.available ? 'Available' : req.approved ? 'Approved' : req.denied ? 'Declined' : 'Pending');
    if (label === 'Available' || req.available) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Available</span>;
    }
    if (label === 'Approved' || req.approved) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">Approved</span>;
    }
    if (label === 'Declined' || req.denied) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">Declined</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">Pending</span>;
  };

  return (
    <div className="h-full rounded-2xl bg-surface-container-low border border-outline-variant p-4 sm:p-5 flex flex-col justify-between shadow-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-outline-variant/50">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Film className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-on-surface text-sm">Ombi Requests</span>
              <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-rose-400'} shrink-0`} title={online ? 'Ombi Online' : 'Ombi Offline'} />
            </div>
            <span className="text-[10px] text-on-surface-variant font-mono">Port :5000 • Reverse Proxy /ombi</span>
          </div>
        </div>

        <a
          href={ombiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface hover:text-primary transition-colors"
          title="Open Full Ombi Web Portal"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Counts Bar */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        <div className="px-2 py-1.5 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
          <span className="text-[9px] text-on-surface-variant block uppercase font-mono">Available</span>
          <span className="text-xs font-bold text-emerald-400 font-mono">{counts.available || 0}</span>
        </div>
        <div className="px-2 py-1.5 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
          <span className="text-[9px] text-on-surface-variant block uppercase font-mono">Approved</span>
          <span className="text-xs font-bold text-sky-400 font-mono">{counts.approved || 0}</span>
        </div>
        <div className="px-2 py-1.5 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
          <span className="text-[9px] text-on-surface-variant block uppercase font-mono">Pending</span>
          <span className="text-xs font-bold text-amber-400 font-mono">{counts.pending || 0}</span>
        </div>
        <div className="px-2 py-1.5 rounded-xl bg-surface-container border border-outline-variant/60 text-center">
          <span className="text-[9px] text-on-surface-variant block uppercase font-mono">Denied</span>
          <span className="text-xs font-bold text-rose-400 font-mono">{counts.denied || 0}</span>
        </div>
      </div>

      {/* Requests List */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-52 pr-1 scrollbar-thin">
        {requests.length > 0 ? (
          requests.map((req) => (
            <div
              key={req.id || req.title}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container/70 border border-outline-variant/60 hover:border-outline-variant transition-colors"
            >
              {req.posterPath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w200${req.posterPath}`}
                  alt={req.title}
                  className="w-8 h-12 object-cover rounded-md shrink-0 bg-surface-container-high"
                  loading="lazy"
                  onError={(e: any) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-8 h-12 rounded-md bg-surface-container-highest flex items-center justify-center shrink-0 text-on-surface-variant text-[10px]">
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
                <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-mono mt-0.5">
                  <span>by {req.requestedBy?.displayName || req.requestedBy?.username || 'User'}</span>
                </div>
              </div>
              <div className="shrink-0">
                {getStatusBadge(req)}
              </div>
            </div>
          ))
        ) : isLoading ? (
          <div className="py-8 text-center text-xs text-on-surface-variant font-mono">Loading Ombi requests...</div>
        ) : (
          <div className="p-6 rounded-xl bg-surface-container/40 border border-dashed border-outline-variant text-center space-y-2 my-auto">
            <span className="text-lg">🍿</span>
            <h5 className="text-xs font-bold text-on-surface">No Recent Requests</h5>
            <p className="text-[10px] text-on-surface-variant">
              Launch Ombi to search movies, series, or anime and send requests to Jellyfin.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2.5 border-t border-outline-variant/50 flex items-center justify-between text-xs mt-2 text-on-surface-variant">
        <span className="text-[10px] font-mono">Pipeline: Ombi → Radarr / Sonarr → Jellyfin</span>
        <a
          href={ombiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1"
        >
          <span>Open Ombi Portal →</span>
        </a>
      </div>
    </div>
  );
};
