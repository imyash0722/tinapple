import React, { useState } from 'react';
import { AppBrandIcon } from '../common/AppBrandIcons';

interface QuickConnectCardProps {
  onOpenTransfers?: () => void;
  onOpenManga?: () => void;
}

export const QuickConnectCard: React.FC<QuickConnectCardProps> = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';

  const connectionEndpoints = [
    {
      id: 'current',
      name: 'Active Connected Link',
      type: 'Direct Session',
      url: `http://${currentHost}:8088`,
      desc: 'Active network connection currently serving this management session.',
      badge: 'Active & Verified',
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'ethernet',
      name: 'Direct Ethernet',
      type: '1 Gbps Ultra-Low Latency',
      url: 'http://192.168.99.1:8088',
      desc: 'Direct peer-to-peer patch cable connection between PC and server.',
      badge: currentHost === '192.168.99.1' ? 'Current Host' : 'Auto-Negotiating',
      color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'tailscale',
      name: 'Tailscale Mesh',
      type: 'Encrypted WireGuard VPN',
      url: currentHost.startsWith('100.') ? `http://${currentHost}:8088` : 'http://tinapple-server:8088',
      desc: 'Zero-config secure mesh access across all your devices anywhere in the world.',
      badge: currentHost.startsWith('100.') ? 'Active Link' : 'Tailnet Ready',
      color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      ),
    },
  ];

  const quickServices = [
    { id: 'suwayomi', name: 'Suwayomi Manga', port: '4567', path: `http://${currentHost}:4567` },
    { id: 'jellyfin', name: 'Jellyfin Media', port: '8096', path: `http://${currentHost}:8096` },
    { id: 'qbittorrent', name: 'qBittorrent', port: '8080', path: `http://${currentHost}:8080` },
    { id: 'filebrowser', name: 'FileBrowser', port: '8081', path: `http://${currentHost}:8081` },
    { id: 'syncthing', name: 'Syncthing Sync', port: '8384', path: `http://${currentHost}:8384` },
    { id: 'navidrome', name: 'Navidrome Music', port: '4533', path: `http://${currentHost}:4533` },
    { id: 'adguard', name: 'AdGuard Home', port: '3000', path: `http://${currentHost}:3000` },
    { id: 'vaultwarden', name: 'Vaultwarden', port: '8000', path: `http://${currentHost}:8000` },
    { id: 'radarr', name: 'Radarr Movies', port: '7878', path: `http://${currentHost}:7878` },
    { id: 'sonarr', name: 'Sonarr TV', port: '8989', path: `http://${currentHost}:8989` },
    { id: 'prowlarr', name: 'Prowlarr Indexer', port: '9696', path: `http://${currentHost}:9696` },
    { id: 'seerr', name: 'Jellyseerr Requests', port: '5055', path: `http://${currentHost}:5055` },
  ];

  return (
    <div className="space-y-6">
      {/* Connection Endpoints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {connectionEndpoints.map((conn) => (
          <div
            key={conn.id}
            className="tinapple-glass-card rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md flex flex-col justify-between hover:border-slate-700 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
                    {conn.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{conn.name}</h4>
                    <span className="text-xs text-slate-400 font-mono">{conn.type}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[11px] font-mono rounded-full border ${conn.color}`}>
                  {conn.badge}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">{conn.desc}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
              <code className="text-xs text-emerald-400 font-mono truncate">{conn.url}</code>
              <button
                onClick={() => copyToClipboard(conn.url, conn.id)}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-all flex-shrink-0"
              >
                {copiedKey === conn.id ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Direct Service Jump Grid */}
      <div className="tinapple-glass-card rounded-xl bg-slate-900/40 border border-slate-800/60 p-5 backdrop-blur-md">
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <span>⚡ Live Server Portals</span>
          <span className="text-[10px] text-slate-500 font-normal">(Direct 1-Click Launch)</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {quickServices.map((svc) => (
            <a
              key={svc.name}
              href={svc.path}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 hover:border-emerald-500/40 transition-all group text-center"
            >
              <AppBrandIcon id={svc.id} size={32} showBadge className="mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-slate-200 group-hover:text-emerald-300">{svc.name}</span>
              <span className="text-[11px] font-mono text-slate-500">:{svc.port}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
