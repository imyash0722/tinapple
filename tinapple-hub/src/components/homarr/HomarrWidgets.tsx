import React, { useState, useEffect } from 'react';
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
  Edit2,
  Globe,
  Terminal,
} from 'lucide-react';
import { TelemetrySnapshot, SystemInfo } from '../../types/api';
import { api } from '../../services/api';

// 1. Homarr Resource Monitor Widget
export interface HomarrResourceWidgetProps {
  telemetry: TelemetrySnapshot;
  systemInfo: SystemInfo;
}

export const HomarrResourceWidget: React.FC<HomarrResourceWidgetProps> = ({ telemetry, systemInfo }) => {
  const cpuPercent = Math.min(100, Math.round(telemetry.cpu.loadPercent || 0));
  const ramPercent = Math.min(100, Math.round(telemetry.memory.percent || 0));
  const diskPercent = Math.min(100, Math.round(telemetry.storage.percent || 0));

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="col-span-12 lg:col-span-6 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20">
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
            <span className="text-[11px] text-zinc-400 font-mono">{systemInfo.hostname || 'tinapple-node'}</span>
          </div>
        </div>
        <div className="text-right font-mono text-[11px] text-zinc-400">
          <span>{telemetry.cpu.cores ? `${telemetry.cpu.cores} Cores` : 'x86_64'}</span>
          <span className="text-zinc-600 mx-1">|</span>
          <span className="text-tinapple-gold">{telemetry.cpu.temperatureC ? `${telemetry.cpu.temperatureC}°C` : 'Normal'}</span>
        </div>
      </div>

      {/* Progress Bars Matrix */}
      <div className="space-y-3.5 font-mono text-xs">
        {/* CPU Meter */}
        <div>
          <div className="flex justify-between text-zinc-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>CPU Load</span>
            </span>
            <span className="font-bold text-white">{cpuPercent}%</span>
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
          <div className="flex justify-between text-zinc-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Memory (RAM)</span>
            </span>
            <span className="font-bold text-white">
              {formatBytes(telemetry.memory.usedBytes)} / {formatBytes(telemetry.memory.totalBytes)} ({ramPercent}%)
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
          <div className="flex justify-between text-zinc-300 mb-1">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Root Storage</span>
            </span>
            <span className="font-bold text-white">
              {formatBytes(telemetry.storage.usedBytes)} / {formatBytes(telemetry.storage.totalBytes)} ({diskPercent}%)
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
    <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
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
        <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">{timeStr}</div>
        <div className="text-xs text-zinc-400 mt-1">{dateStr}</div>
      </div>

      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
        <span>Uptime:</span>
        <span className="text-emerald-400 font-bold">{formatUptime(systemInfo.uptime || 0)}</span>
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
  const currentHost = window.location.hostname;

  return (
    <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 font-mono">
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
          <span className="text-2xl font-black text-white">{formatSpeed(totalDl)}</span>
          <span className="text-xs text-emerald-400 font-bold">↓ Down</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
          <span className="flex items-center gap-1">
            <Upload className="w-3 h-3 text-purple-400" />
            <span>{formatSpeed(data.qbittorrent.upSpeed)} ↑</span>
          </span>
          <span className="text-zinc-600">•</span>
          <span>{data.qbittorrent.active} active tasks</span>
        </div>
      </div>

      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
        <span>Engines:</span>
        <span className="text-zinc-300 font-medium">qBittorrent / MeTube</span>
      </div>
    </div>
  );
};

// 4. Homarr Custom Bookmarks Component
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
  if (bookmarks.length === 0 && !isEditMode) return null;

  return (
    <div className="col-span-12 rounded-2xl bg-slate-900/40 border border-white/[0.08] backdrop-blur-xl p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🔖</span>
          <h4 className="font-bold text-white text-sm font-mono tracking-wide uppercase">
            Homelab Bookmarks & Web Services
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
      </div>
    </div>
  );
};
