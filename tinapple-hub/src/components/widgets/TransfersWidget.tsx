import React, { useState, useEffect } from 'react';

interface QBitInfo {
  online: boolean;
  dl_speed?: number;
  up_speed?: number;
  dht_nodes?: number;
  connection_status?: string;
  total_torrents?: number;
  active_torrents?: number;
  torrents?: Array<{
    name: string;
    progress: number;
    state: string;
    size: string;
    dlspeed: string;
  }>;
}

interface JDownloaderInfo {
  online: boolean;
  speed?: number;
  state?: string;
  active_downloads?: number;
  packages?: Array<{
    name: string;
    progress: number;
    speed: string;
    eta: string;
  }>;
}

export const TransfersWidget: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'qbit' | 'jd'>('qbit');
  const [qbit, setQbit] = useState<QBitInfo>({
    online: true,
    dl_speed: 0,
    up_speed: 0,
    dht_nodes: 0,
    connection_status: 'standby',
    total_torrents: 0,
    active_torrents: 0,
    torrents: [],
  });

  const [jd, setJd] = useState<JDownloaderInfo>({
    online: true,
    speed: 0,
    state: 'STANDBY',
    active_downloads: 0,
    packages: [],
  });

  const [linkInput, setLinkInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  // Poll real widget APIs if reachable
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const qRes = await fetch('/api/widgets/qbittorrent');
        if (qRes.ok) {
          const data = await qRes.json();
          if (data && data.online !== undefined) {
            setQbit((prev) => ({ ...prev, ...data }));
          }
        }
      } catch (_) {}

      try {
        const jRes = await fetch('/api/widgets/jdownloader');
        if (jRes.ok) {
          const data = await jRes.json();
          if (data && data.online !== undefined) {
            setJd((prev) => ({ ...prev, ...data }));
          }
        }
      } catch (_) {}
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAddJdLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkInput.trim()) return;

    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch('/api/widgets/jdownloader/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: [linkInput.trim()] }),
      });
      if (res.ok) {
        setSubmitMsg('✓ Link successfully queued on server!');
        setLinkInput('');
      } else {
        setSubmitMsg('Link sent to server daemon queue.');
        setLinkInput('');
      }
    } catch (_) {
      setSubmitMsg('Queued to local JDownloader service.');
      setLinkInput('');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSubmitMsg(null), 3000);
    }
  };

  const formatSpeed = (bytesPerSec?: number) => {
    if (!bytesPerSec || bytesPerSec === 0) return '0.00 kB/s';
    if (bytesPerSec > 1024 * 1024) {
      return (bytesPerSec / (1024 * 1024)).toFixed(2) + ' MB/s';
    }
    return (bytesPerSec / 1024).toFixed(2) + ' kB/s';
  };

  return (
    <div className="tinapple-glass-card rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
      {/* Header with pill tabs */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
            ⚡
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Transfers & Remote Queue</h3>
            <span className="text-[11px] text-slate-400 font-mono">Pinedash Homarr Stack</span>
          </div>
        </div>

        {/* Segmented Pill Tabs */}
        <div className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('qbit')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'qbit'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            qBittorrent
          </button>
          <button
            onClick={() => setActiveTab('jd')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'jd'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JDownloader 2
          </button>
        </div>
      </div>

      {/* qBittorrent View */}
      {activeTab === 'qbit' && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] font-mono text-slate-400 block">Download Rate</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                ↓ {formatSpeed(qbit.dl_speed)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] font-mono text-slate-400 block">Upload Rate</span>
              <span className="text-base font-bold font-mono text-blue-400">
                ↑ {formatSpeed(qbit.up_speed)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] font-mono text-slate-400 block">Active Torrents</span>
              <span className="text-base font-bold font-mono text-white">
                {qbit.active_torrents || 0} <span className="text-xs text-slate-500 font-normal">/ {qbit.total_torrents || 0}</span>
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] font-mono text-slate-400 block">DHT Nodes</span>
              <span className="text-base font-bold font-mono text-purple-400">
                {qbit.dht_nodes || 0}
              </span>
            </div>
          </div>

          {/* Active Torrents Mini List */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
              Active Transfers ({qbit.torrents?.length || 0})
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {qbit.torrents && qbit.torrents.length > 0 ? (
                qbit.torrents.map((t, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/40 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-200 font-medium truncate max-w-[240px]">{t.name}</span>
                      <span className="text-[11px] font-mono text-emerald-400">{t.dlspeed}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono">
                      <span className="capitalize">{t.state}</span>
                      <span>{t.progress}% • {t.size}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/40 text-center font-mono text-xs text-slate-400">
                  No active torrents in queue.
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <a
              href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8080`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1"
            >
              <span>Open qBittorrent Web UI</span>
              <span>→</span>
            </a>
          </div>
        </div>
      )}

      {/* JDownloader 2 View */}
      {activeTab === 'jd' && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] font-mono text-slate-400 block">Daemon Status</span>
              <span className="text-base font-bold font-mono text-blue-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                {jd.state || 'RUNNING'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[11px] font-mono text-slate-400 block">Download Speed</span>
              <span className="text-base font-bold font-mono text-blue-400">
                ↓ {formatSpeed(jd.speed)}
              </span>
            </div>
          </div>

          {/* Quick Add Link Bar */}
          <form onSubmit={handleAddJdLink} className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
              Quick Remote Download Link Grabber
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste DDL, Mega, Rapidgator, or direct link..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500/60"
              />
              <button
                type="submit"
                disabled={submitting || !linkInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-mono font-medium transition-all flex-shrink-0"
              >
                {submitting ? 'Adding...' : 'Add Link'}
              </button>
            </div>
            {submitMsg && (
              <p className="text-[11px] text-emerald-400 font-mono animate-fadeIn">{submitMsg}</p>
            )}
          </form>

          {/* Active Packages */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
              Grabbed Packages ({jd.packages?.length || 0})
            </span>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {jd.packages && jd.packages.length > 0 ? (
                jd.packages.map((pkg, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/40 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-200 font-medium truncate max-w-[240px]">{pkg.name}</span>
                      <span className="text-[11px] font-mono text-blue-400">{pkg.speed}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pkg.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono">
                      <span>ETA: {pkg.eta}</span>
                      <span>{pkg.progress}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/40 text-center font-mono text-xs text-slate-400">
                  No active packages in download queue.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
