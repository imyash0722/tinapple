import React, { useState } from 'react';
import { ExternalLink, Download, BookOpen, Smartphone, Copy, Check, Globe, Gamepad2 } from 'lucide-react';
import { AppBrandIcon } from '../common/AppBrandIcons';
import { PlayitTunnelModal } from './PlayitTunnelModal';

interface QuickConnectCardProps {
  onOpenTransfers?: () => void;
  onOpenManga?: () => void;
}

export const QuickConnectCard: React.FC<QuickConnectCardProps> = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [playitOpen, setPlayitOpen] = useState(false);

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
      {/* Android Mobile Client APK Download Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-blue-950/60 border border-emerald-500/40 p-6 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl shadow-inner">
              🍍
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">Tinapple Mobile Android Client</h3>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  v1.0.0 APK
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Native edge-to-edge Android client with hardware-accelerated rendering, instant Tailscale/LAN server switcher, background sync, and offline retry shell.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <a
              href="/download/apk"
              download="tinapple-client.apk"
              className="flex-1 md:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download APK (34 KB)</span>
            </a>
            <button
              onClick={() => copyToClipboard(window.location.origin + '/download/apk', 'apk')}
              className="px-3.5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-sm font-medium transition-all"
              title="Copy APK Download Link"
            >
              {copiedKey === 'apk' ? '✓ Copied' : '📋 Link'}
            </button>
          </div>
        </div>
      </div>

      {/* Suwayomi Web & Suwayomi-Tsumiru Manga Suite */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900/80 to-purple-950/60 border border-rose-500/30 p-6 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <AppBrandIcon id="suwayomi" size={54} showBadge />
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-white tracking-wide">Suwayomi & Tsumiru Manga Suite</h3>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Web & Client App Supported
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Stream and read manga offline via Keiyoushi extensions. Launch the classic <strong>Suwayomi WebUI</strong>, the modern Flutter <strong>Tsumiru Web</strong>, or pair your native <strong>Suwayomi-Tsumiru</strong> client app with 1-click server syncing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Open Suwayomi WebUI */}
            <a
              href={`http://${currentHost}:4567`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-mono font-bold transition-all shadow-sm"
              title="Launch classic Suwayomi WebUI"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Suwayomi Web (:4567)</span>
            </a>

            {/* Open Tsumiru Web */}
            <a
              href="/tsumiru/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-mono font-bold transition-all shadow-sm"
              title="Launch modern Tsumiru Flutter Web interface"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tsumiru Web</span>
            </a>

            {/* Copy Server URL for Tsumiru App */}
            <button
              onClick={() => copyToClipboard(`http://${currentHost}:4567`, 'tsumiru-url')}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-all"
              title="Copy server URL for Tsumiru client setup"
            >
              {copiedKey === 'tsumiru-url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'tsumiru-url' ? 'URL Copied' : 'Tsumiru URL'}</span>
            </button>

            {/* Download Tsumiru Android APK */}
            <a
              href="/download/tsumiru"
              download="tsumiru-client.apk"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-slate-950 font-bold text-xs font-mono transition-all shadow-md shadow-rose-500/20"
              title="Download Suwayomi-Tsumiru Android APK"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tsumiru APK</span>
            </a>

            {/* GitHub Releases Link */}
            <a
              href="https://github.com/Suwayomi/Suwayomi-Tsumiru/releases"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
              title="Suwayomi-Tsumiru GitHub Releases (Desktop & Mobile)"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Minecraft Appliance & Playit.gg Anycast Tunnel Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-teal-950/60 border border-emerald-500/40 p-6 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <AppBrandIcon id="playit" size={42} showBadge />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">Minecraft Server & Playit.gg Anycast</h3>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Gamepad2 className="w-3 h-3" />
                  PaperMC + Tunnel
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                High-performance PaperMC Minecraft server with 1-click Playit.gg Anycast tunneling. Share your server with friends anywhere in the world without router port forwarding.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setPlayitOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs transition-all shadow-lg shadow-emerald-900/30"
            >
              <Globe className="w-4 h-4" />
              <span>Manage Playit Tunnel</span>
            </button>

            <button
              onClick={() => copyToClipboard(`${currentHost}:25565`, 'mc-local')}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-all"
              title="Copy local LAN Minecraft address"
            >
              {copiedKey === 'mc-local' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'mc-local' ? 'LAN Copied' : 'LAN :25565'}</span>
            </button>
          </div>
        </div>
      </div>

      <PlayitTunnelModal isOpen={playitOpen} onClose={() => setPlayitOpen(false)} />

      {/* Connection Endpoints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {connectionEndpoints.map((conn) => (
          <div
            key={conn.id}
            className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md flex flex-col justify-between hover:border-slate-700 transition-all group"
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
      <div className="rounded-xl bg-slate-900/40 border border-slate-800/60 p-5 backdrop-blur-md">
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
