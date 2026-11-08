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
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { TelemetrySnapshot, SystemInfo, ServiceInfo, MediaRequestItem } from '../../types/api';
import { api, getActiveServerOrigin, getServiceUrl } from '../../services/api';
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
  const [activeMediaTab, setActiveMediaTab] = useState<'requests' | 'search'>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'movie' | 'tv'>('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [requests, setRequests] = useState<MediaRequestItem[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const data = await api.getMediaRequests();
      setRequests(data);
    } catch {}
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setActionNotice(null);
    try {
      const results = await api.searchMedia(searchTerm.trim(), searchType);
      setSearchResults(results);
    } catch {
      setActionNotice('Search failed. Check *arr services connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRequest = async (item: any) => {
    AndroidBridge.performHaptic('medium');
    setActionNotice(`Requesting "${item.title}"...`);
    try {
      const res = await api.requestMedia({
        type: item.type,
        title: item.title,
        year: item.year,
        tmdb_id: item.type === 'movie' ? item.remote_id : undefined,
        tvdb_id: item.type === 'tv' ? item.remote_id : undefined,
        poster_url: item.poster_url,
        overview: item.overview,
      });

      if (res.success) {
        setActionNotice(`✓ Requested "${item.title}". Added to queue.`);
        await fetchRequests();
        setTimeout(() => {
          setActiveMediaTab('requests');
          setActionNotice(null);
        }, 1500);
      } else {
        setActionNotice(`Notice: ${res.error || 'Failed to submit'}`);
      }
    } catch (err: any) {
      setActionNotice(`Error: ${err.message || 'Request failed'}`);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    AndroidBridge.performHaptic('light');
    await api.deleteMediaRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  // Quick primary launchers
  const primaryLaunchers = [
    { id: 'jellyfin', name: 'Jellyfin', port: 8096, category: 'Cinema & TV', icon: <Film className="w-5 h-5 text-purple-400" /> },
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
            const liveService = services.find((s) => s.name === app.id || s.displayName.toLowerCase().includes(app.name.toLowerCase()));
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

      {/* 3. Media Requests & Automated Workflow Deck */}
      <div className="p-4 sm:p-5 rounded-[24px] bg-surface-container-low border border-outline-variant shadow-none">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant/50">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-on-surface">Automated Media Requests</h4>
          </div>

          <div className="flex items-center bg-surface-container p-0.5 rounded-xl border border-outline-variant">
            <button
              onClick={() => setActiveMediaTab('requests')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeMediaTab === 'requests' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Queue ({requests.length})
            </button>
            <button
              onClick={() => setActiveMediaTab('search')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                activeMediaTab === 'search' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              Search
            </button>
          </div>
        </div>

        {actionNotice && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice(null)}>×</button>
          </div>
        )}

        {activeMediaTab === 'search' ? (
          <div className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search movie or TV show..."
                className="flex-1 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={isSearching || !searchTerm.trim()}
                className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shrink-0"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </form>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <div
                    key={`${item.type}-${item.remote_id || item.title}`}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container/70 border border-outline-variant/60"
                  >
                    {item.poster_url ? (
                      <img src={item.poster_url} alt={item.title} className="w-8 h-12 object-cover rounded shrink-0 bg-surface-container-high" />
                    ) : (
                      <div className="w-8 h-12 rounded bg-surface-container-highest flex items-center justify-center shrink-0 text-xs">
                        {item.type === 'movie' ? '🎬' : '📺'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-on-surface truncate">{item.title}</span>
                        {item.year > 0 && <span className="text-[10px] text-on-surface-variant">({item.year})</span>}
                      </div>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold bg-surface-container-highest text-primary">
                        {item.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRequest(item)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold shrink-0"
                    >
                      Request
                    </button>
                  </div>
                ))
              ) : isSearching ? (
                <div className="text-center py-6 text-xs text-on-surface-variant">Searching Radarr & Sonarr...</div>
              ) : (
                <div className="text-center py-6 text-xs text-on-surface-variant">Search any movie or show to download with automatic subtitles.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {requests.length > 0 ? (
              requests.map((req) => {
                const isDone = req.status === 'available' || req.progress >= 100;
                return (
                  <div key={req.id} className="p-2.5 rounded-xl bg-surface-container/70 border border-outline-variant/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                        <span className="font-bold text-on-surface text-xs truncate">{req.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          isDone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {isDone ? 'Ready' : `${Math.round(req.progress)}%`}
                        </span>
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-1 rounded text-on-surface-variant hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {!isDone && (
                      <div className="w-full bg-surface-container-highest rounded-full h-1 overflow-hidden">
                        <div className="bg-primary h-1 rounded-full" style={{ width: `${Math.max(5, Math.min(100, req.progress))}%` }} />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-on-surface-variant space-y-1">
                <span>🍿</span>
                <p>No active requests in queue.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
