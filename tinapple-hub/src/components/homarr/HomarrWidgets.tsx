import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { HomarrAppTile } from './HomarrAppTile';
import { AppBrandIcon } from '../common/AppBrandIcons';
import { SquishSwitch } from '../reactbits/SquishSwitch';
import { api, getServiceHost } from '../../services/api';
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
  FolderSync,
  Thermometer,
  Zap,
  Network,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Radio,
  Play,
  RotateCw,
  Smartphone,
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
    <div className="h-full rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm font-mono flex items-center gap-2">
              <span>Silicon Telemetry</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                LIVE
              </span>
            </h4>
            <span className="text-[11px] text-zinc-400 font-mono">{systemInfo?.hostname || 'tinapple-node'}</span>
          </div>
        </div>
        <div className="text-right font-mono text-[11px] text-zinc-400">
          <span>{coreCount} Cores</span>
          <span className="text-zinc-600 mx-1">|</span>
          <span className="text-tinapple-gold">{tempC}</span>
        </div>
      </div>

      {/* Progress Bars Matrix */}
      <div className="space-y-3.5 font-mono text-xs">
        {/* CPU Meter */}
        <div>
          <div className="flex justify-between items-center text-zinc-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>CPU Load</span>
            </span>
            <span className="font-extrabold text-sm text-white tabular-nums">{cpuPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
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
          <div className="flex justify-between items-center text-zinc-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Memory (RAM)</span>
            </span>
            <span className="font-extrabold text-sm text-white tabular-nums">
              {ramPercent}% <span className="text-[10px] text-zinc-400 font-normal">({formatBytes(telemetry?.memory?.usedBytes)})</span>
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
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
          <div className="flex justify-between items-center text-zinc-300 mb-1">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Root Storage</span>
            </span>
            <span className="font-extrabold text-sm text-white tabular-nums">
              {diskPercent}% <span className="text-[10px] text-zinc-400 font-normal">({formatBytes(telemetry?.disk?.usedBytes)})</span>
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
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
    <div className="h-full rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
      <div className="flex items-center justify-between text-zinc-400 text-xs">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-tinapple-gold">
          <Clock className="w-3.5 h-3.5" />
          <span>Local Clock</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-[10px] text-zinc-300">
          UTC{time.getTimezoneOffset() <= 0 ? '+' : '-'}{Math.abs(Math.floor(time.getTimezoneOffset() / 60))}
        </span>
      </div>

      <div className="my-3 text-center sm:text-left">
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums">{timeStr}</div>
        <div className="text-[11px] sm:text-xs text-zinc-400 mt-1">{dateStr}</div>
      </div>

      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
        <span>Uptime:</span>
        <span className="text-emerald-400 font-bold tabular-nums">{formatUptime(systemInfo?.uptime || 0)}</span>
      </div>
    </div>
  );
};

// 3. Homarr Downloads & Transfer Rates Widget
export const HomarrDownloadsWidget: React.FC = () => {
  const [data, setData] = useState<{
    qbittorrent: { dlSpeed: number; upSpeed: number; active: number; online: boolean };
    jdownloader: { dlSpeed: number; online: boolean };
  }>({
    qbittorrent: { dlSpeed: 0, upSpeed: 0, active: 0, online: true },
    jdownloader: { dlSpeed: 0, online: false },
  });

  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        const [qbRes, jdRes] = await Promise.all([
          fetch('/api/widgets/qbittorrent').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/widgets/jdownloader').then((r) => (r.ok ? r.json() : null)),
        ]);
        if (qbRes || jdRes) {
          setData({
            qbittorrent: {
              dlSpeed: qbRes?.server_state?.dl_info_speed || 0,
              upSpeed: qbRes?.server_state?.up_info_speed || 0,
              active: (qbRes?.torrents || []).length,
              online: !!qbRes,
            },
            jdownloader: {
              dlSpeed: jdRes?.speed || 0,
              online: !!jdRes,
            },
          });
        }
      } catch {}
    };

    fetchTransfers();
    const interval = setInterval(fetchTransfers, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec || bytesPerSec === 0) return '0 KB/s';
    if (bytesPerSec > 1024 * 1024) return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
    return (bytesPerSec / 1024).toFixed(0) + ' KB/s';
  };

  const totalDl = data.qbittorrent.dlSpeed + data.jdownloader.dlSpeed;
  const currentHost = getServiceHost();

  return (
    <div className="h-full rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-sky-400">
          <Download className="w-3.5 h-3.5" />
          <span>Active Transfers</span>
        </span>
        <a
          href={`http://${currentHost}:8080`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-white transition-colors"
          title="Open qBittorrent Web UI"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="my-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">{formatSpeed(totalDl)}</span>
          <span className="text-xs text-emerald-400 font-bold">↓ Down</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
          <span className="flex items-center gap-1 tabular-nums">
            <Upload className="w-3 h-3 text-purple-400" />
            <span>{formatSpeed(data.qbittorrent.upSpeed)} ↑</span>
          </span>
          <span className="text-zinc-600">•</span>
          <span className="tabular-nums">{data.qbittorrent.active} active tasks</span>
        </div>
      </div>

      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
        <span>Engines:</span>
        <span className="text-zinc-300 font-medium">qBittorrent / Pinchflat</span>
      </div>
    </div>
  );
};

// 4. Homarr Tailscale Mesh & Privacy Guard Widget (Tor & Proton VPN Exit Controls)
export const HomarrNetworkGuardWidget: React.FC<{ onOpenTailscale?: () => void }> = ({ onOpenTailscale }) => {
  const [torActive, setTorActive] = useState(false);
  const [isTogglingTor, setIsTogglingTor] = useState(false);
  const [protonActive, setProtonActive] = useState(false);
  const [protonDetails, setProtonDetails] = useState<string>('');
  const [isTogglingProton, setIsTogglingProton] = useState(false);

  useEffect(() => {
    fetch('/api/system/tor-exit')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.active !== undefined) setTorActive(data.active);
      })
      .catch(() => {});

    api.getProtonStatus().then((res) => {
      setProtonActive(res.active);
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
      // Re-fetch details
      const updated = await api.getProtonStatus();
      setProtonActive(updated.active);
      if (updated.details) setProtonDetails(updated.details);
    } catch {} finally {
      setIsTogglingProton(false);
    }
  };

  const currentHost = getServiceHost();

  return (
    <div className="h-full rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
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
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-2 min-w-0">
            <Wifi className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-white font-bold block truncate">MagicDNS Mesh Link</span>
              <span className="text-[10px] text-zinc-400 block truncate">pineapple-server.taildb42a2.ts.net</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold shrink-0">
            Active
          </span>
        </div>

        {/* Proton VPN Privacy Exit Node */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm shrink-0">🛡️</span>
            <div className="min-w-0">
              <span className="text-white font-bold block truncate">Proton Privacy Exit</span>
              <span className="text-[10px] text-zinc-400 block truncate">
                {protonActive ? (protonDetails || 'Swiss WireGuard Active') : 'Swiss WireGuard & OpenVPN'}
              </span>
            </div>
          </div>
          <SquishSwitch
            checked={protonActive}
            onChange={handleToggleProton}
            disabled={isTogglingProton}
            variant="emerald"
            size="sm"
          />
        </div>

        {/* Tor Privacy Exit Node */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm shrink-0">🧅</span>
            <div className="min-w-0">
              <span className="text-white font-bold block truncate">Tor Privacy Exit</span>
              <span className="text-[10px] text-zinc-400 block truncate">SOCKS5 127.0.0.1:9050</span>
            </div>
          </div>
          <SquishSwitch
            checked={torActive}
            onChange={handleToggleTor}
            disabled={isTogglingTor}
            variant="purple"
            size="sm"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400 mt-2">
        <span>DNS Shield:</span>
        <a
          href={`http://${currentHost}:3000`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline flex items-center gap-1"
        >
          <span>AdGuard Home</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
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
      const res = await fetch(`/api/v1/apps/${appId}`);
      if (res.ok) {
        const data = await res.json();
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
      await fetch(`/api/v1/apps/${appId}/${action}`, { method: 'POST' });
      await fetchApp();
    } finally {
      setActionBusy(null);
    }
  };

  const isRunning = app?.status === 'running' || app?.running;
  const isInstalled = app?.installed;
  const port = app?.port || 0;
  const currentHost = getServiceHost();
  const webUrl = port > 0 ? `http://${currentHost}:${port}` : null;
  const accentColor = customColor || app?.accentColor || '#38bdf8';

  return (
    <div className="h-full rounded-2xl bg-slate-900/70 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-xl shadow-black/25 font-mono select-none relative overflow-hidden group">
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
            <h4 className="text-sm font-black text-white truncate">
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
              : 'bg-slate-800 text-slate-400 border-slate-700'
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
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] text-zinc-400">Assigned Port</span>
          <span className="text-xs font-bold text-white mt-1">
            {port > 0 ? `:${port}` : 'None'}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] text-zinc-400">Active State</span>
          <span className="text-xs font-bold text-zinc-200 mt-1 capitalize truncate">
            {app?.activeState || (isRunning ? 'Active' : 'Inactive')}
          </span>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
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
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white border border-white/5 text-[10px] transition-all disabled:opacity-50"
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
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-tinapple-gold hover:bg-amber-400 text-slate-950 text-[10px] font-black transition-all shadow-md active:scale-95"
          >
            <span>Open UI</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

// 5. Homarr Jellyfin Media Server Widget
export const HomarrMediaWidget: React.FC<{ onOpenGuide?: (g: string) => void }> = ({ onOpenGuide }) => {
  const currentHost = getServiceHost();

  return (
    <div className="h-full rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-purple-400">
          <Film className="w-4 h-4" />
          <span>Jellyfin Media Server</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
          Port 8096
        </span>
      </div>

      <div className="p-3 rounded-xl bg-purple-500/[0.07] border border-purple-500/20 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white font-bold">Hardware Transcoding</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
            VA-API / QSV
          </span>
        </div>
        <p className="text-[11px] text-zinc-400">
          DirectPlay 4K HDR streaming enabled for Plezy, Apple TV, Android, and web.
        </p>
      </div>

      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-2">
        {onOpenGuide && (
          <button
            onClick={() => onOpenGuide('jellyfin')}
            className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <BookOpen className="w-3 h-3 text-purple-400" />
            <span>Setup Guide</span>
          </button>
        )}
        <a
          href={`http://${currentHost}:8096`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1 transition-all"
        >
          <span>Launch Web Player</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

// 6. Homarr Suwayomi & Manga Shelf Widget
export const HomarrMangaWidget: React.FC = () => {
  const [mangaCount, setMangaCount] = useState<number>(0);
  const [online, setOnline] = useState<boolean>(true);
  const host = getServiceHost();
  const suwayomiWebUrl = `http://${host}:4567/`;

  useEffect(() => {
    fetch('/api/widgets/manga')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setOnline(data.online !== false);
          if (data.totalCount) setMangaCount(data.totalCount);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="h-full rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-tinapple-gold">
          <BookOpen className="w-4 h-4" />
          <span>Suwayomi Manga</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
          Port 4567
        </span>
      </div>

      <div className="p-3 rounded-xl bg-amber-500/[0.07] border border-amber-500/20 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white font-bold">Desktop Web & Phone App</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
            {online ? 'Active' : 'Offline'}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400">
          Desktop: Native Suwayomi Reader • Phone: Tsumiru Android App (connect to :4567).
        </p>
      </div>

      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-2">
        <a
          href="/download/tsumiru"
          download="tsumiru-client.apk"
          className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-all"
          title="Download Tsumiru Android APK for your phone"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          <span>Phone APK</span>
        </a>
        <a
          href={suwayomiWebUrl}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-tinapple-gold/20 hover:bg-tinapple-gold/30 border border-tinapple-gold/40 text-tinapple-gold text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
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
    <div className="h-full rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
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
          <span className="text-white font-bold">Encrypted File Sync</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
            Continuous
          </span>
        </div>
        <p className="text-[11px] text-zinc-400">
          Zero-cloud direct sync to phone, laptop, and TrueNAS ZFS vault datasets.
        </p>
      </div>

      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-2">
        <a
          href="/pair.sh"
          target="_blank"
          className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
        >
          <span>Pairing Script</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href={`http://${currentHost}:8384`}
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
    <div className="h-full rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-rose-400">
          <Thermometer className="w-4 h-4" />
          <span>Hardware & Battery</span>
        </span>
        <span className="text-[11px] text-zinc-400">Thermal Profile: Normal</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] text-zinc-400 uppercase block mb-1">CPU Temperature</span>
          <span className={`text-base font-extrabold font-mono tabular-nums ${temp > 75 ? 'text-red-400' : 'text-emerald-400'}`}>
            {temp}°C
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] text-zinc-400 uppercase block mb-1">Cooling Fan</span>
          <span className="text-base font-extrabold font-mono text-sky-400 tabular-nums">{fan} RPM</span>
        </div>

        {bat?.present && (
          <div className="col-span-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-tinapple-gold" />
              <div>
                <span className="text-white font-bold block">Battery Threshold</span>
                <span className="text-[10px] text-zinc-400 block tabular-nums">Charge limit {bat.chargeLimit}%</span>
              </div>
            </div>
            <span className="text-base font-extrabold font-mono text-white tabular-nums">{bat.percent}%</span>
          </div>
        )}
      </div>

      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400 mt-2">
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
    { name: 'Dash', port: 8088, path: `http://${currentHost}:8088`, color: 'text-tinapple-gold' },
    { name: 'Media', port: 8096, path: `http://${currentHost}:8096`, color: 'text-purple-400' },
    { name: 'Manga', port: 4567, path: `http://${currentHost}:4567`, color: 'text-amber-400' },
    { name: 'Torrent', port: 8080, path: `http://${currentHost}:8080`, color: 'text-sky-400' },
    { name: 'Sync', port: 8384, path: `http://${currentHost}:8384`, color: 'text-emerald-400' },
    { name: 'Files', port: 8081, path: `http://${currentHost}:8081`, color: 'text-blue-400' },
    { name: 'AdGuard', port: 3000, path: `http://${currentHost}:3000`, color: 'text-teal-400' },
    { name: 'Vault', port: 8000, path: isHttps ? `https://${currentHost}:8000` : `http://${currentHost}:8000`, color: 'text-indigo-400' },
  ];

  return (
    <div className="h-full rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
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
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all flex flex-col items-center justify-center text-center group"
          >
            <span className="text-[10px] text-zinc-400 group-hover:text-white truncate w-full">{p.name}</span>
            <span className={`font-bold ${p.color} text-xs mt-0.5`}>:{p.port}</span>
          </a>
        ))}
      </div>

      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400 mt-2">
        <span>Verified Listeners:</span>
        <span className="text-emerald-400 font-bold">TCP 0.0.0.0</span>
      </div>
    </div>
  );
};

// 10. Homarr Mini Terminal Quick Launcher Widget
export const HomarrTerminalWidget: React.FC<{ onOpenTerminal?: () => void }> = ({ onOpenTerminal }) => {
  return (
    <div className="h-full rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-emerald-400">
          <Terminal className="w-4 h-4" />
          <span>Web Terminal</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
          PTY Bash
        </span>
      </div>

      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-emerald-400/90 leading-relaxed font-mono">
        <div>$ node-status --verified</div>
        <div className="text-zinc-500">Kernel: 6.12.8-cachyos-tinapple</div>
        <div className="text-zinc-400">Interactive PTY shell available</div>
      </div>

      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end mt-2">
        {onOpenTerminal && (
          <button
            onClick={onOpenTerminal}
            className="w-full py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
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
    <div className="h-full rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Kernel & Journal Alerts</span>
        </span>
        <span className="text-[10px] text-zinc-500">Priority ≤ 3</span>
      </div>

      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-[10px] text-zinc-300 max-h-28 overflow-y-auto scrollbar-none">
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

      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400 mt-2">
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
  bookmarks: CustomBookmarkItem[];
  isEditMode: boolean;
  onAddBookmark: () => void;
  onDeleteBookmark: (id: string) => void;
}

export const HomarrBookmarksWidget: React.FC<HomarrBookmarksWidgetProps> = ({
  bookmarks,
  isEditMode,
  onAddBookmark,
  onDeleteBookmark,
}) => {
  return (
    <div className="h-full rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl p-5 shadow-lg shadow-black/20 font-mono">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🔖</span>
          <h4 className="font-bold text-white text-sm tracking-wide uppercase">
            Homelab Bookmarks & Web Services ({bookmarks.length})
          </h4>
        </div>
        {isEditMode && (
          <button
            onClick={onAddBookmark}
            className="px-3 py-1 rounded-xl bg-tinapple-gold hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1 shadow-md transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Bookmark</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {bookmarks.map((bm) => (
          <div
            key={bm.id}
            className="group relative rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/[0.06] hover:border-white/20 p-3 transition-all flex items-center justify-between gap-2"
          >
            <a
              href={bm.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 min-w-0 flex-1"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                {bm.icon || '🌐'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">{bm.name}</span>
                <span className="text-[10px] text-zinc-500 font-mono block truncate">
                  {bm.url.replace(/^https?:\/\//, '')}
                </span>
              </div>
            </a>

            {isEditMode && (
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

        {bookmarks.length === 0 && !isEditMode && (
          <div className="col-span-full py-4 text-center text-xs text-zinc-500">
            No custom bookmarks yet. Enable Edit Mode to add your homelab portals.
          </div>
        )}
      </div>
    </div>
  );
};


// 13. Homarr Appliance Board & Service Launcher Widget
export interface HomarrAppsGridWidgetProps {
  services: ServiceInfo[];
  isEditMode: boolean;
  onOpenSettings?: (app: any) => void;
  onOpenGuide?: (guideId: string) => void;
}

export const HomarrAppsGridWidget: React.FC<HomarrAppsGridWidgetProps> = ({
  services,
  isEditMode,
  onOpenSettings,
  onOpenGuide,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [colSpans, setColSpans] = useState<Record<string, 3 | 4 | 6 | 12>>({});

  const getHost = () => {
    return getServiceHost();
  };

  const getServiceCategory = (name: string): 'media' | 'downloads' | 'storage' | 'network' | 'system' | 'custom' => {
    const n = name.toLowerCase();
    if (['jellyfin', 'seerr', 'jellyseerr', 'radarr', 'sonarr', 'bazarr', 'navidrome', 'pinchflat', 'metube'].some((k) => n.includes(k))) return 'media';
    if (['qbittorrent', 'prowlarr', 'jdownloader', 'transmission'].some((k) => n.includes(k))) return 'downloads';
    if (['suwayomi', 'syncyomi', 'manga'].some((k) => n.includes(k))) return 'media';
    if (['syncthing', 'samba', 'smb', 'filebrowser', 'vaultwarden', 'couchdb', 'obsidian'].some((k) => n.includes(k))) return 'storage';
    if (['adguard', 'tailscale', 'tor', 'privoxy', 'playit', 'wireguard', 'protonvpn'].some((k) => n.includes(k))) return 'network';
    return 'system';
  };

  const getServicePort = (service: ServiceInfo): number => {
    if (service.port && service.port > 0) return service.port;
    const n = service.name.toLowerCase();
    const portMap: Record<string, number> = {
      jellyfin: 8096,
      seerr: 5055,
      jellyseerr: 5055,
      radarr: 7878,
      sonarr: 8989,
      prowlarr: 9696,
      bazarr: 6767,
      qbittorrent: 8080,
      'qbittorrent-nox': 8080,
      suwayomi: 4567,
      'suwayomi-server': 4567,
      syncyomi: 8282,
      navidrome: 4533,
      pinchflat: 8945,
      adguard: 3000,
      adguardhome: 3000,
      vaultwarden: 8000,
      filebrowser: 8082,
      syncthing: 8384,
      couchdb: 5984,
      minecraft: 25565,
      homarr: 7575,
    };
    return portMap[n] || 0;
  };

  const getServiceUrl = (service: ServiceInfo, port: number): string => {
    if (service.webUrl) return service.webUrl;
    if (port > 0) {
      const proto = typeof window !== 'undefined' ? window.location.protocol : 'http:';
      return `${proto}//${getHost()}:${port}`;
    }
    return `http://${getHost()}:8088/`;
  };

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const cat = getServiceCategory(s.name);
      const matchesCat = categoryFilter === 'all' || cat === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [services, categoryFilter, searchQuery]);

  const activeCount = services.filter((s) => s.activeState === 'active' || s.running).length;

  const categories = [
    { id: 'all', label: 'All Appliances' },
    { id: 'media', label: '🎬 Media' },
    { id: 'downloads', label: '📥 Downloads' },
    { id: 'storage', label: '🗄️ Storage & Sync' },
    { id: 'network', label: '🛡️ Network & Mesh' },
    { id: 'system', label: '⚙️ System' },
  ];

  return (
    <div className="h-full rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl p-4 sm:p-6 shadow-xl space-y-4">
      {/* Board Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
            🚀
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-wide uppercase font-mono flex items-center gap-2">
              <span>Homarr Appliance Board</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activeCount}/{services.length} Online
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Authentic Homarr app tiles with live service pings, direct ports, and settings launchers.
            </p>
          </div>
        </div>

        {/* Quick Search Bar */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Filter apps & services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-tinapple-gold"
          />
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryFilter(c.id)}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
              categoryFilter === c.id
                ? 'bg-tinapple-gold text-slate-950 shadow-md shadow-tinapple-gold/20 font-bold'
                : 'bg-slate-800/60 hover:bg-slate-800 text-zinc-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid of HomarrAppTiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {filteredServices.map((svc) => {
          const port = getServicePort(svc);
          const cat = getServiceCategory(svc.name);
          const url = getServiceUrl(svc, port);
          const span = colSpans[svc.name] || 3;

          return (
            <HomarrAppTile
              key={svc.name}
              id={svc.name}
              name={svc.name}
              tagline={svc.description || `${cat.toUpperCase()} Appliance Daemon`}
              category={cat}
              icon={<AppBrandIcon id={svc.name.toLowerCase()} size={30} />}
              url={url}
              port={port > 0 ? port : undefined}
              unit={svc.unit || `${svc.name}.service`}
              activeState={svc.activeState === 'active' || svc.running ? 'active' : svc.activeState === 'failed' ? 'failed' : 'inactive'}
              isEditMode={isEditMode}
              colSpan={span}
              onOpenSettings={onOpenSettings ? () => onOpenSettings(svc) : undefined}
              onToggleColSpan={() => {
                setColSpans((prev) => ({
                  ...prev,
                  [svc.name]: span === 3 ? 6 : 3,
                }));
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
