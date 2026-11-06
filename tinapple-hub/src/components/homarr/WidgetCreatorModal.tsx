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
import { serviceRegistry } from '../../services/serviceRegistry';
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
  openUrl?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  media: '#AA5CC3',
  downloads: '#3A75C4',
  storage: '#0284C7',
  network: '#16A34A',
  system: '#2563EB',
  telemetry: '#EAB308',
  custom: '#6366F1',
};

const getRegisteredAppliances = (): ApplianceTemplate[] => {
  return serviceRegistry.getAll().map((s) => ({
    id: s.id,
    name: s.displayName || s.name,
    tagline: s.tagline || `${s.category} appliance service`,
    icon: s.id,
    port: s.port,
    category: (s.category === 'downloads' ? 'storage' : s.category) as WidgetCategory,
    accentColor: CATEGORY_COLORS[s.category] || '#6366F1',
    openUrl: s.getOpenUrl(),
  }));
};

const APPLIANCES: ApplianceTemplate[] = getRegisteredAppliances();

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
    defaultW: 520,
    defaultH: 340,
  },
  {
    type: 'media_requests',
    title: 'Media Requests & Discovery (Ombi)',
    description: 'Track movie & show requests, automated Sonarr/Radarr pipeline, and trending media.',
    icon: '🍿',
    category: 'media',
    defaultW: 520,
    defaultH: 340,
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
        openUrl: app.openUrl || serviceRegistry.get(app.id)?.getOpenUrl(),
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
      <div className="w-full max-w-3xl rounded-2xl bg-surface-container-low border border-outline-variant/50 shadow-none overflow-hidden font-sans tabular-nums text-xs flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-outline-variant/50 flex items-center justify-between bg-surface-container-low shrink-0">
          <div className="flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-tinapple-gold" />
            <h3 className="font-bold text-on-surface text-sm">Add Canvas Widget</h3>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-3 border-b border-outline-variant/50 flex gap-4 bg-surface-container-low shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('individual')}
            className={`pb-2.5 border-b-2 font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'individual'
                ? 'border-tinapple-gold text-tinapple-gold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
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
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
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
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
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
              <p className="text-[11px] text-on-surface-variant mb-2">
                Click any individual appliance to spawn a dedicated compact live monitoring & control card:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {APPLIANCES.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => handleCreateAppliance(app)}
                    className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/50 hover:border-tinapple-gold/50 cursor-pointer transition-all group flex flex-col justify-between shadow-none relative overflow-hidden"
                  >
                    <div
                      className="absolute -top-10 -right-10 w-20 h-20 rounded-full blur-xl opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity"
                      style={{ backgroundColor: app.accentColor }}
                    />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <AppBrandIcon id={app.icon} size={28} />
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/5 text-on-surface-variant border border-outline-variant/50">
                          {app.port > 0 ? `:${app.port}` : 'daemon'}
                        </span>
                      </div>
                      <h4 className="font-bold text-on-surface text-xs group-hover:text-tinapple-gold transition-colors">
                        {app.name}
                      </h4>
                      <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed line-clamp-2">
                        {app.tagline}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-outline-variant/50 flex items-center justify-between text-[10px] text-on-surface-variant font-bold">
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
              <p className="text-[11px] text-on-surface-variant mb-2">
                Click a widget template to spawn it directly into your canvas:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTemplates.map((t) => (
                  <div
                    key={t.type}
                    onClick={() => handleCreate(t)}
                    className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/50 hover:border-tinapple-gold/50 cursor-pointer transition-all group flex flex-col justify-between shadow-none"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{t.icon}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/5 text-on-surface-variant border border-outline-variant/50">
                          {t.defaultW}×{t.defaultH}px
                        </span>
                      </div>
                      <h4 className="font-bold text-on-surface text-xs group-hover:text-tinapple-gold transition-colors">
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">{t.description}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-outline-variant/50 flex items-center justify-between text-[10px] text-on-surface-variant font-bold">
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
        <div className="px-5 py-3 border-t border-outline-variant/50 bg-surface-container-low flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-container text-on-surface hover:text-on-surface font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
