import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ExternalLink, Globe } from 'lucide-react';
import { AppBrandIcon } from '../common/AppBrandIcons';
import { ServiceStatus } from '../../types/api';
import { CustomBookmark } from '../../services/dashboardLayout';

interface QuickConnectCardProps {
  services?: ServiceStatus[];
  customBookmarks?: CustomBookmark[];
  isEditMode?: boolean;
  onAddBookmark?: () => void;
  onEditBookmark?: (bookmark: CustomBookmark) => void;
  onDeleteBookmark?: (id: string) => void;
  onOpenTransfers?: () => void;
  onOpenManga?: () => void;
  onOpenTailscale?: () => void;
  onSelectTab?: (tab: string) => void;
}

export const QuickConnectCard: React.FC<QuickConnectCardProps> = ({
  services = [],
  customBookmarks = [],
  isEditMode = false,
  onAddBookmark,
  onEditBookmark,
  onDeleteBookmark,
  onOpenTailscale,
  onSelectTab,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const showServiceNotice = (name: string, status: string) => {
    setNotice(`${name} is currently ${status}. Manage it in the Services tab.`);
    setTimeout(() => setNotice(null), 4000);
    if (onSelectTab) {
      setTimeout(() => onSelectTab('services'), 700);
    }
  };

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const currentProto = isHttps ? 'https' : 'http';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8088';

  const connectionEndpoints = [
    {
      id: 'current',
      name: 'Active Session',
      type: isHttps ? 'Encrypted TLS (HTTPS)' : 'Direct Link',
      url: currentOrigin,
      desc: isHttps ? 'Secure end-to-end encrypted connection with automatic TLS certificate.' : 'Active network connection currently serving this management dashboard.',
      badge: isHttps ? 'Encrypted & Secure' : 'Active & Verified',
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
      type: '1 Gbps Patch',
      url: `${currentProto}://192.168.99.1${isHttps ? '' : ':8088'}`,
      desc: 'Direct peer-to-peer patch cable connection between PC and server.',
      badge: currentHost === '192.168.99.1' || currentHost === '192.168.99.62' ? 'Active' : 'Auto-Negotiating',
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
      type: "Let's Encrypt TLS",
      url: 'https://tinapple-server.tail3dee69.ts.net',
      desc: "Zero-config secure mesh access with official Let's Encrypt TLS certificate.",
      badge: currentHost.includes('tail3dee69.ts.net') || currentHost.startsWith('100.') ? 'Active Link' : 'Tailnet Ready',
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
    { id: 'vaultwarden', name: 'Vaultwarden', port: '8000', path: isHttps ? `https://${currentHost}:8000` : `http://${currentHost}:8000` },
    { id: 'radarr', name: 'Radarr Movies', port: '7878', path: `http://${currentHost}:7878` },
    { id: 'sonarr', name: 'Sonarr TV', port: '8989', path: `http://${currentHost}:8989` },
    { id: 'prowlarr', name: 'Prowlarr Indexer', port: '9696', path: `http://${currentHost}:9696` },
    { id: 'seerr', name: 'Jellyseerr Requests', port: '5055', path: `http://${currentHost}:5055` },
    { id: 'protonvpn', name: 'Proton VPN', port: '', path: '#' },
  ];

  return (
    <div className="space-y-6">
      {/* Connection Endpoints Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
        {connectionEndpoints.map((conn) => (
          <div
            key={conn.id}
            className="tinapple-glass-card rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 backdrop-blur-md flex flex-col justify-between hover:border-slate-700 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 shrink-0">
                    {conn.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs sm:text-sm truncate">{conn.name}</h4>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-mono block truncate">{conn.type}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-mono rounded-full border shrink-0 ${conn.color}`}>
                  {conn.badge}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed mb-3 sm:mb-4">{conn.desc}</p>
            </div>

            <div className="pt-2.5 sm:pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
              <code className="text-[11px] sm:text-xs text-emerald-400 font-mono truncate">{conn.url}</code>
              <div className="flex items-center gap-1.5 shrink-0">
                {conn.id === 'tailscale' && onOpenTailscale && (
                  <button
                    onClick={onOpenTailscale}
                    className="px-2 py-1 text-[11px] sm:text-xs rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 font-mono font-semibold transition-all"
                  >
                    Mesh
                  </button>
                )}
                <button
                  onClick={() => copyToClipboard(conn.url, conn.id)}
                  className="px-2.5 py-1 text-[11px] sm:text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-all flex-shrink-0"
                >
                  {copiedKey === conn.id ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Direct Service Jump Grid */}
      <div className="tinapple-glass-card rounded-xl bg-slate-900/40 border border-slate-800/60 p-4 sm:p-5 backdrop-blur-md relative">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span>⚡ Live Server Portals</span>
            <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">(Verified Port Links)</span>
          </h4>
          <div className="flex items-center gap-2">
            {notice && (
              <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30 animate-pulse">
                {notice}
              </span>
            )}
            {isEditMode && onAddBookmark && (
              <button
                onClick={onAddBookmark}
                className="px-2.5 py-1 rounded-lg bg-tinapple-gold/15 hover:bg-tinapple-gold/25 border border-tinapple-gold/30 text-tinapple-gold text-[11px] font-mono font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>Add Bookmark</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {quickServices.map((svc) => {
            const svcStatus = services.find((s: any) =>
              (s.name && typeof s.name === 'string' && s.name.toLowerCase().includes(svc.id)) ||
              (s.unit && typeof s.unit === 'string' && s.unit.toLowerCase().includes(svc.id)) ||
              (s.displayName && typeof s.displayName === 'string' && s.displayName.toLowerCase().includes(svc.id)) ||
              s.id === svc.id
            );
            const isRunning = svcStatus ? Boolean(svcStatus.running || svcStatus.activeState === 'active' || svcStatus.status === 'running') : false;
            const isInstalled = svcStatus ? Boolean(svcStatus.installed || (svcStatus.activeState && svcStatus.activeState !== 'not_installed') || (svcStatus.status && svcStatus.status !== 'not_installed')) : false;
            const statusLabel = isRunning ? 'running' : isInstalled ? 'stopped' : 'not installed';

            if (isRunning && svc.port) {
              return (
                <a
                  key={svc.name}
                  href={svc.path}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 hover:border-emerald-500/40 transition-all group text-center relative"
                >
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Active • Online" />
                  <AppBrandIcon id={svc.id} size={30} showBadge className="mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] sm:text-xs font-medium text-slate-200 group-hover:text-emerald-300 truncate w-full">{svc.name}</span>
                  <span className="text-[10px] font-mono text-emerald-400">:{svc.port}</span>
                </a>
              );
            }

            return (
              <button
                key={svc.name}
                type="button"
                onClick={() => showServiceNotice(svc.name, statusLabel)}
                className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl bg-slate-900/30 hover:bg-slate-800/50 border border-slate-800/50 hover:border-slate-700 transition-all group text-center relative opacity-75 hover:opacity-100"
                title={`${svc.name}: ${statusLabel}. Click to manage.`}
              >
                <span
                  className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${
                    isRunning ? 'bg-emerald-400' : isInstalled ? 'bg-amber-400' : 'bg-slate-600'
                  }`}
                />
                <AppBrandIcon id={svc.id} size={30} showBadge className={`mb-2 ${isRunning ? '' : 'grayscale contrast-75'} group-hover:grayscale-0 transition-all`} />
                <span className="text-[11px] sm:text-xs font-medium text-slate-400 group-hover:text-slate-200 truncate w-full">{svc.name}</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {isRunning ? 'Active' : isInstalled ? 'Stopped' : 'Store'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Homelab Bookmarks Grid (Tinarchy Feature) */}
      {(customBookmarks.length > 0 || isEditMode) && (
        <div className="tinapple-glass-card rounded-xl bg-slate-900/40 border border-slate-800/60 p-4 sm:p-5 backdrop-blur-md relative">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-tinapple-gold" />
              <span>Custom Homelab Bookmarks</span>
              <span className="text-[10px] text-slate-500 font-normal">({customBookmarks.length} saved)</span>
            </h4>
            {onAddBookmark && (
              <button
                onClick={onAddBookmark}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3 text-tinapple-gold" />
                <span>Add Link</span>
              </button>
            )}
          </div>

          {customBookmarks.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl font-mono text-slate-500 text-xs">
              <p>No custom bookmarks yet.</p>
              <button
                onClick={onAddBookmark}
                className="mt-2 text-tinapple-gold hover:underline font-semibold text-[11px]"
              >
                + Add your first custom homelab or web bookmark
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {customBookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="group relative flex items-center justify-between p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all backdrop-blur-sm"
                >
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 min-w-0 flex-1 mr-2"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white/10"
                      style={{
                        backgroundColor: `${bm.accentColor || '#10B981'}20`,
                        color: bm.accentColor || '#10B981',
                      }}
                    >
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-tinapple-gold transition-colors truncate">
                          {bm.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 shrink-0" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {bm.tagline || bm.url.replace(/^https?:\/\//, '')}
                      </p>
                    </div>
                  </a>

                  {isEditMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      {onEditBookmark && (
                        <button
                          onClick={() => onEditBookmark(bm)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Edit bookmark"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteBookmark && (
                        <button
                          onClick={() => onDeleteBookmark(bm.id)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                          title="Delete bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickConnectCard;
