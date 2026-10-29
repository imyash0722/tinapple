import React, { useState } from 'react';
import {
  X,
  Plus,
  Globe,
  FileText,
  Bookmark,
  Activity,
  LayoutGrid,
  Cpu,
  Clock,
  Download,
  Shield,
  Film,
  HardDrive,
  Terminal,
  Layers,
  Sparkles,
  Server,
  Zap,
} from 'lucide-react';
import { AppBrandIcon } from '../common/AppBrandIcons';
import { CanvasWidget, WidgetCategory, WidgetType } from '../../types/canvas';

interface WidgetCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (newWidget: CanvasWidget) => void;
  currentWidgetCount: number;
  viewportCenter: { x: number; y: number };
}

interface WidgetTemplate {
  type: WidgetType;
  title: string;
  description: string;
  icon: string;
  category: WidgetCategory;
  defaultW: number;
  defaultH: number;
  isCustom?: boolean;
}

interface ApplianceTemplate {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  port: number;
  category: WidgetCategory;
  accentColor: string;
}

const APPLIANCES: ApplianceTemplate[] = [
  { id: 'jellyfin', name: 'Jellyfin Media Server', tagline: 'Hardware Transcoding & 4K Streaming', icon: 'jellyfin', port: 8096, category: 'media', accentColor: '#AA5CC3' },
  { id: 'qbittorrent', name: 'qBittorrent Headless', tagline: 'BitTorrent Engine & WebUI', icon: 'qbittorrent', port: 8080, category: 'storage', accentColor: '#3A75C4' },
  { id: 'suwayomi', name: 'Suwayomi Manga Server', tagline: 'Keiyoushi Extensions & Mihon Sync', icon: 'suwayomi', port: 4567, category: 'media', accentColor: '#F43F5E' },
  { id: 'radarr', name: 'Radarr Movie Automator', tagline: 'Automated 4K/1080p Movie Grabber', icon: 'radarr', port: 7878, category: 'media', accentColor: '#FFC230' },
  { id: 'sonarr', name: 'Sonarr TV Series Automator', tagline: 'Automated TV & Anime PVR', icon: 'sonarr', port: 8989, category: 'media', accentColor: '#00C4FF' },
  { id: 'prowlarr', name: 'Prowlarr Tracker Proxy', tagline: 'Unified Torrent & Usenet Indexer', icon: 'prowlarr', port: 9696, category: 'network', accentColor: '#F59E0B' },
  { id: 'bazarr', name: 'Bazarr Subtitle Manager', tagline: 'Multilingual Subtitle Synchronizer', icon: 'bazarr', port: 6767, category: 'media', accentColor: '#8B5CF6' },
  { id: 'seerr', name: 'Jellyseerr Media Discovery', tagline: '1-Click Requests & Approvals', icon: 'seerr', port: 5055, category: 'media', accentColor: '#6366F1' },
  { id: 'pinchflat', name: 'Pinchflat YouTube Archiver', tagline: 'Automated Channel Downloader', icon: 'youtube', port: 8945, category: 'media', accentColor: '#EF4444' },
  { id: 'navidrome', name: 'Navidrome Music Server', tagline: 'Lossless Subsonic Audio Streaming', icon: 'navidrome', port: 4533, category: 'media', accentColor: '#EA580C' },
  { id: 'syncthing', name: 'Syncthing Continuous Sync', tagline: 'P2P Encrypted File Replication', icon: 'syncthing', port: 8384, category: 'storage', accentColor: '#0284C7' },
  { id: 'filebrowser', name: 'FileBrowser Quantum', tagline: 'Web File Manager & Storage Vault', icon: 'filebrowser', port: 8081, category: 'storage', accentColor: '#10B981' },
  { id: 'adguard', name: 'AdGuard Home DNS', tagline: 'Network-wide DNS & Ad Blocking', icon: 'adguard', port: 3000, category: 'network', accentColor: '#16A34A' },
  { id: 'vaultwarden', name: 'Vaultwarden Password Vault', tagline: 'Bitwarden-Compatible Secure Vault', icon: 'vaultwarden', port: 8000, category: 'system', accentColor: '#2563EB' },
  { id: 'protonvpn', name: 'Proton VPN Client', tagline: 'Swiss WireGuard & NetShield', icon: 'protonvpn', port: 0, category: 'network', accentColor: '#6D4AFF' },
  { id: 'beeper', name: 'Beeper Matrix Bridge', tagline: 'Universal Unified Chat Engine', icon: 'beeper', port: 0, category: 'network', accentColor: '#8B5CF6' },
  { id: 'samba', name: 'Samba SMB File Server', tagline: 'LAN Network Drive Sharing', icon: 'syncthing', port: 445, category: 'storage', accentColor: '#0EA5E9' },
  { id: 'minecraft', name: 'Paper Minecraft Server', tagline: 'Purpur / Paper High-TPS Server', icon: 'minecraft', port: 25565, category: 'system', accentColor: '#84CC16' },
];

const TEMPLATES: WidgetTemplate[] = [
  // Custom interactive widgets
  {
    type: 'custom_iframe',
    title: 'Custom Web Embed (IFrame)',
    description: 'Embed Grafana, Pi-hole, AdGuard, router status, or any external homelab dashboard.',
    icon: '🌐',
    category: 'custom',
    defaultW: 720,
    defaultH: 450,
    isCustom: true,
  },
  {
    type: 'custom_markdown',
    title: 'Markdown Note & Runbook',
    description: 'Sticky notes, terminal commands reference, IP subnet cheat-sheets, and cluster notes.',
    icon: '📝',
    category: 'custom',
    defaultW: 420,
    defaultH: 320,
    isCustom: true,
  },
  {
    type: 'custom_links',
    title: 'Custom Bookmark Group',
    description: 'Curated hub of external URLs and homelab links with customized icons and titles.',
    icon: '🔖',
    category: 'custom',
    defaultW: 380,
    defaultH: 300,
    isCustom: true,
  },
  {
    type: 'custom_monitor',
    title: 'Endpoint & Port Monitor',
    description: 'Live ping latency and uptime detector for local ports (:80, :443, :8088) or remote APIs.',
    icon: '⚡',
    category: 'custom',
    defaultW: 360,
    defaultH: 220,
    isCustom: true,
  },

  // Built-in Appliance Widgets
  {
    type: 'homarr_apps_board',
    title: 'Homarr Appliance Board',
    description: 'Iconic Homarr service launcher with live ping dots, open ports, and direct WebUI launchers.',
    icon: '🚀',
    category: 'system',
    defaultW: 960,
    defaultH: 380,
  },
  {
    type: 'silicon_telemetry',
    title: 'Silicon Resource Monitor',
    description: 'Real-time CPU load, Memory (RAM), Root storage fill bars, core count, and thermals.',
    icon: '⚡',
    category: 'telemetry',
    defaultW: 520,
    defaultH: 340,
  },
  {
    type: 'digital_clock',
    title: 'Digital Clock & Uptime',
    description: 'Real-time digital clock with seconds, date, UTC timezone, and node uptime.',
    icon: '⏱️',
    category: 'system',
    defaultW: 360,
    defaultH: 240,
  },
  {
    type: 'transfers_rate',
    title: 'Active Transfers & Speeds',
    description: 'qBittorrent & Pinchflat download/upload transfer speeds and active torrent tasks count.',
    icon: '📥',
    category: 'storage',
    defaultW: 360,
    defaultH: 240,
  },
  {
    type: 'network_guard',
    title: 'Tailscale Mesh & Privacy Guard',
    description: 'Tailscale VPN MagicDNS status, direct Tor onion exit toggle switch, and AdGuard Home.',
    icon: '🛡️',
    category: 'network',
    defaultW: 520,
    defaultH: 340,
  },
  {
    type: 'port_matrix',
    title: 'Server Port Matrix & Listeners',
    description: 'Live matrix of verified open ports (:8088, :8096, :4567, :8080, :8384, :8081, :3000, :8000).',
    icon: '🔌',
    category: 'network',
    defaultW: 520,
    defaultH: 340,
  },
  {
    type: 'media_server',
    title: 'Jellyfin Media Server',
    description: 'Hardware video transcoding status (VA-API/QSV), 4K DirectPlay streaming, and web player.',
    icon: '🎬',
    category: 'media',
    defaultW: 520,
    defaultH: 340,
  },
  {
    type: 'storage_vault',
    title: 'Syncthing & TrueNAS Bridge',
    description: 'Continuous encrypted P2P folder synchronization and TrueNAS ZFS dataset bridge.',
    icon: '🔄',
    category: 'storage',
    defaultW: 520,
    defaultH: 340,
  },
  {
    type: 'quick_terminal',
    title: 'Interactive Web Terminal',
    description: 'Embedded fast PTY bash shell launcher for quick node troubleshooting.',
    icon: '💻',
    category: 'system',
    defaultW: 420,
    defaultH: 280,
  },
  {
    type: 'hardware_thermals',
    title: 'Hardware Thermals & Battery',
    description: 'Silicon sensor temperatures, cooling fan RPM, battery health and charge limiter.',
    icon: '🌡️',
    category: 'telemetry',
    defaultW: 420,
    defaultH: 280,
  },
  {
    type: 'manga_shelf',
    title: 'Suwayomi Manga Shelf',
    description: 'Self-hosted manga library status and fast offline Tsumiru reader launcher.',
    icon: '📖',
    category: 'media',
    defaultW: 420,
    defaultH: 280,
  },
];

export const WidgetCreatorModal: React.FC<WidgetCreatorModalProps> = ({
  isOpen,
  onClose,
  onAddWidget,
  currentWidgetCount,
  viewportCenter,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'individual' | 'custom' | 'builtin'>('individual');
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate>(TEMPLATES[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const handleCreateAppliance = (app: ApplianceTemplate) => {
    const id = `widget_app_${app.id}_${Date.now()}`;
    const newWidget: CanvasWidget = {
      id,
      type: 'single_appliance',
      title: app.name,
      description: app.tagline,
      icon: app.icon,
      category: app.category,
      x: Math.max(40, Math.round(viewportCenter.x - 380 / 2)),
      y: Math.max(40, Math.round(viewportCenter.y - 280 / 2)),
      w: 380,
      h: 280,
      zIndex: currentWidgetCount + 10,
      visible: true,
      color: app.accentColor,
      customConfig: {
        appId: app.id,
        targetPort: app.port,
      },
    };

    onAddWidget(newWidget);
    onClose();
  };

  const handleCreate = (tmpl: WidgetTemplate) => {
    const id = `widget_${tmpl.type}_${Date.now()}`;
    const newWidget: CanvasWidget = {
      id,
      type: tmpl.type,
      title: customTitle || tmpl.title,
      description: tmpl.description,
      icon: tmpl.icon,
      category: tmpl.category,
      x: Math.max(40, Math.round(viewportCenter.x - tmpl.defaultW / 2)),
      y: Math.max(40, Math.round(viewportCenter.y - tmpl.defaultH / 2)),
      w: tmpl.defaultW,
      h: tmpl.defaultH,
      zIndex: currentWidgetCount + 10,
      visible: true,
      customConfig: tmpl.type === 'custom_iframe' ? { url: customUrl || 'https://news.ycombinator.com' } : {},
    };

    onAddWidget(newWidget);
    onClose();
  };

  const filteredTemplates = TEMPLATES.filter((t) =>
    activeTab === 'custom' ? t.isCustom : !t.isCustom
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-tinapple-gold" />
            <h3 className="font-bold text-white text-sm">Add Canvas Widget</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-3 border-b border-white/5 flex gap-4 bg-slate-950/30 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('individual')}
            className={`pb-2.5 border-b-2 font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'individual'
                ? 'border-tinapple-gold text-tinapple-gold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Dedicated Appliance Widgets ({APPLIANCES.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2.5 border-b-2 font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'custom'
                ? 'border-tinapple-gold text-tinapple-gold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Custom Interactive (Embed, Note, Links, Ping)</span>
          </button>
          <button
            onClick={() => setActiveTab('builtin')}
            className={`pb-2.5 border-b-2 font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'builtin'
                ? 'border-tinapple-gold text-tinapple-gold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>System Dashboards & Telemetry</span>
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {activeTab === 'individual' ? (
            <>
              <p className="text-[11px] text-zinc-400 mb-2">
                Click any individual appliance to spawn a dedicated compact live monitoring & control card:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {APPLIANCES.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => handleCreateAppliance(app)}
                    className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-white/10 hover:border-tinapple-gold/50 cursor-pointer transition-all group flex flex-col justify-between shadow-md relative overflow-hidden"
                  >
                    <div
                      className="absolute -top-10 -right-10 w-20 h-20 rounded-full blur-xl opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity"
                      style={{ backgroundColor: app.accentColor }}
                    />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <AppBrandIcon id={app.icon} size={28} />
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
                          {app.port > 0 ? `:${app.port}` : 'daemon'}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs group-hover:text-tinapple-gold transition-colors">
                        {app.name}
                      </h4>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                        {app.tagline}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                      <span className="capitalize">{app.category}</span>
                      <span className="text-tinapple-gold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Spawn Widget +
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] text-zinc-400 mb-2">
                Click a widget template to spawn it directly into your canvas:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTemplates.map((t) => (
                  <div
                    key={t.type}
                    onClick={() => handleCreate(t)}
                    className="p-4 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-white/10 hover:border-tinapple-gold/50 cursor-pointer transition-all group flex flex-col justify-between shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{t.icon}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
                          {t.defaultW}×{t.defaultH}px
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs group-hover:text-tinapple-gold transition-colors">
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{t.description}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                      <span>Category: {t.category}</span>
                      <span className="text-tinapple-gold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Spawn +
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-950 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-zinc-300 hover:text-white font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
