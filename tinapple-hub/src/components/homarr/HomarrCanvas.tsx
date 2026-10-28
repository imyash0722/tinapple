import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  Search,
  Plus,
  Wrench,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ExternalLink,
  Layers,
  Sparkles,
  Bookmark,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { HomarrAppTile } from './HomarrAppTile';
import {
  HomarrResourceWidget,
  HomarrClockWidget,
  HomarrDownloadsWidget,
  HomarrBookmarksWidget,
  CustomBookmarkItem,
} from './HomarrWidgets';
import { QuickConnectCard } from '../widgets/QuickConnectCard';
import { TelemetrySnapshot, SystemInfo, ServiceInfo } from '../../types/api';

export interface HomarrBoardItem {
  id: string;
  name: string;
  tagline: string;
  category: 'media' | 'downloads' | 'storage' | 'network' | 'system' | 'custom';
  icon: string;
  port?: string | number;
  url?: string;
  unit?: string;
  visible: boolean;
  colSpan?: 3 | 4 | 6 | 12;
  order: number;
}

const DEFAULT_BOARD_ITEMS: HomarrBoardItem[] = [
  {
    id: 'jellyfin',
    name: 'Jellyfin Media',
    tagline: 'Hardware Video & 4K HDR Transcode',
    category: 'media',
    icon: '🎬',
    port: 8096,
    unit: 'jellyfin',
    visible: true,
    colSpan: 3,
    order: 1,
  },
  {
    id: 'suwayomi',
    name: 'Suwayomi Manga',
    tagline: 'Self-Hosted Manga & Webtoon Reader',
    category: 'media',
    icon: '📖',
    port: 4567,
    unit: 'suwayomi-server',
    visible: true,
    colSpan: 3,
    order: 2,
  },
  {
    id: 'qbittorrent',
    name: 'qBittorrent',
    tagline: 'High-Throughput BitTorrent Client',
    category: 'downloads',
    icon: '📥',
    port: 8080,
    unit: 'qbittorrent-nox@root',
    visible: true,
    colSpan: 3,
    order: 3,
  },
  {
    id: 'filebrowser',
    name: 'FileBrowser',
    tagline: 'Web File Manager & Storage Vault',
    category: 'storage',
    icon: '📁',
    port: 8081,
    unit: 'filebrowser',
    visible: true,
    colSpan: 3,
    order: 4,
  },
  {
    id: 'syncthing',
    name: 'Syncthing Sync',
    tagline: 'Continuous P2P Folder Sync',
    category: 'storage',
    icon: '🔄',
    port: 8384,
    unit: 'syncthing@root',
    visible: true,
    colSpan: 3,
    order: 5,
  },
  {
    id: 'navidrome',
    name: 'Navidrome Music',
    tagline: 'Subsonic-Compatible Music Streamer',
    category: 'media',
    icon: '🎵',
    port: 4533,
    unit: 'navidrome',
    visible: true,
    colSpan: 3,
    order: 6,
  },
  {
    id: 'adguard',
    name: 'AdGuard Home',
    tagline: 'Network-Wide DNS Ad-Blocking',
    category: 'network',
    icon: '🛡️',
    port: 3000,
    unit: 'adguard-home',
    visible: true,
    colSpan: 3,
    order: 7,
  },
  {
    id: 'vaultwarden',
    name: 'Vaultwarden',
    tagline: 'Bitwarden Password Vault',
    category: 'storage',
    icon: '🔐',
    port: 8000,
    unit: 'vaultwarden',
    visible: true,
    colSpan: 3,
    order: 8,
  },
  {
    id: 'metube',
    name: 'MeTube Downloader',
    tagline: 'Web GUI for YouTube & Video Downloads',
    category: 'downloads',
    icon: '📹',
    port: 8082,
    unit: 'metube',
    visible: true,
    colSpan: 3,
    order: 9,
  },
  {
    id: 'radarr',
    name: 'Radarr Movies',
    tagline: 'Automated Movie Acquisition',
    category: 'media',
    icon: '🎥',
    port: 7878,
    unit: 'radarr',
    visible: true,
    colSpan: 3,
    order: 10,
  },
  {
    id: 'sonarr',
    name: 'Sonarr TV',
    tagline: 'Automated TV Series Manager',
    category: 'media',
    icon: '📺',
    port: 8989,
    unit: 'sonarr',
    visible: true,
    colSpan: 3,
    order: 11,
  },
  {
    id: 'prowlarr',
    name: 'Prowlarr Indexer',
    tagline: 'Torrent & Usenet Indexer Proxy',
    category: 'downloads',
    icon: '🔍',
    port: 9696,
    unit: 'prowlarr',
    visible: true,
    colSpan: 3,
    order: 12,
  },
  {
    id: 'seerr',
    name: 'Jellyseerr Requests',
    tagline: 'Media Discovery & Request Manager',
    category: 'media',
    icon: '🍿',
    port: 5055,
    unit: 'jellyseerr',
    visible: true,
    colSpan: 3,
    order: 13,
  },
  {
    id: 'cockpit',
    name: 'Cockpit Terminal Admin',
    tagline: 'Linux Server Web Terminal & Metrics',
    category: 'system',
    icon: '⚙️',
    port: 9090,
    unit: 'cockpit.socket',
    visible: true,
    colSpan: 3,
    order: 14,
  },
];

const STORAGE_KEY = 'tinapple_homarr_canvas_layout_v2';

export interface HomarrCanvasProps {
  telemetry: TelemetrySnapshot;
  systemInfo: SystemInfo;
  services: ServiceInfo[];
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  isOwner: boolean;
  onOpenAppSettings: (app: any) => void;
  onOpenTailscale: () => void;
  onOpenGuide: (guideId: string) => void;
}

export const HomarrCanvas: React.FC<HomarrCanvasProps> = ({
  telemetry,
  systemInfo,
  services,
  isEditMode,
  setIsEditMode,
  isOwner,
  onOpenAppSettings,
  onOpenTailscale,
  onOpenGuide,
}) => {
  const [boardItems, setBoardItems] = useState<HomarrBoardItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items)) {
          return parsed.items;
        }
      }
    } catch {}
    return DEFAULT_BOARD_ITEMS;
  });

  const [customBookmarks, setCustomBookmarks] = useState<CustomBookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.bookmarks)) {
          return parsed.bookmarks;
        }
      }
      // Fallback check legacy bookmarks
      const legacy = localStorage.getItem('tinapple_dashboard_layout_v1');
      if (legacy) {
        const p = JSON.parse(legacy);
        if (Array.isArray(p.bookmarks)) return p.bookmarks;
      }
    } catch {}
    return [];
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [catalogOpen, setCatalogOpen] = useState<boolean>(false);
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState<boolean>(false);
  const [newBmName, setNewBmName] = useState('');
  const [newBmUrl, setNewBmUrl] = useState('');
  const [newBmIcon, setNewBmIcon] = useState('🌐');

  // Persist layout to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          items: boardItems,
          bookmarks: customBookmarks,
        })
      );
    } catch {}
  }, [boardItems, customBookmarks]);

  const handleResetBoard = () => {
    setBoardItems(DEFAULT_BOARD_ITEMS);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleToggleColSpan = (itemId: string) => {
    setBoardItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const nextSpan = item.colSpan === 3 ? 6 : 3;
          return { ...item, colSpan: nextSpan };
        }
        return item;
      })
    );
  };

  const handleToggleItemVisibility = (itemId: string) => {
    setBoardItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, visible: !item.visible } : item))
    );
  };

  const handleAddBookmark = () => {
    if (!newBmName || !newBmUrl) return;
    const bm: CustomBookmarkItem = {
      id: 'bm_' + Date.now(),
      name: newBmName,
      url: newBmUrl.startsWith('http') ? newBmUrl : `http://${newBmUrl}`,
      icon: newBmIcon || '🌐',
    };
    setCustomBookmarks((prev) => [...prev, bm]);
    setNewBmName('');
    setNewBmUrl('');
    setNewBmIcon('🌐');
    setBookmarkModalOpen(false);
  };

  const handleDeleteBookmark = (id: string) => {
    setCustomBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const currentHost = window.location.hostname;
  const isHttps = window.location.protocol === 'https:';

  // Categories count calculation
  const categories = useMemo(() => {
    const list = [
      { id: 'all', label: 'All Items' },
      { id: 'media', label: '🎬 Media' },
      { id: 'downloads', label: '📥 Downloads' },
      { id: 'storage', label: '🗄️ Storage & Sync' },
      { id: 'network', label: '🛡️ Network' },
      { id: 'system', label: '⚙️ System' },
    ];
    return list;
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    return boardItems.filter((item) => {
      // Permission check
      if (!isOwner && (item.id === 'suwayomi' || item.id === 'cockpit')) {
        return false;
      }

      if (!item.visible && !isEditMode) return false;

      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.tagline.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [boardItems, activeCategory, searchQuery, isEditMode, isOwner]);

  return (
    <div className="space-y-6 relative">
      {/* Homarr Subtle Dotted Canvas Grid Pattern (Matches homarr-labs/homarr) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* 1. Homarr Board Controls Bar */}
      <div className="relative z-10 rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Search input & Active Board Info */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search apps, web services, or ports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-tinapple-gold transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Counter */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {filteredItems.length} of {boardItems.length} items active
            </span>
          </div>
        </div>

        {/* Right: Board Editing & Customization Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {isEditMode ? (
            <>
              <button
                onClick={() => setCatalogOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Widget</span>
              </button>

              <button
                onClick={() => setBookmarkModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>+ Bookmark</span>
              </button>

              <button
                onClick={handleResetBoard}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-colors"
                title="Reset Board Layout to Default"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsEditMode(false)}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Done Editing</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditMode(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Wrench className="w-3.5 h-3.5 text-tinapple-gold" />
              <span>Customize Board</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Homarr Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-tinapple-gold text-slate-950 font-bold shadow-md shadow-tinapple-gold/20'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 3. Homarr 12-Column Canvas Board Grid */}
      <div className="grid grid-cols-12 gap-3.5 sm:gap-4 relative z-10">
        {/* Top Feature Widgets (shown on "all" category) */}
        {activeCategory === 'all' && !searchQuery && (
          <>
            {/* Real-time Silicon Telemetry Gauge */}
            <HomarrResourceWidget telemetry={telemetry} systemInfo={systemInfo} />

            {/* Digital Clock & Uptime */}
            <HomarrClockWidget systemInfo={systemInfo} />

            {/* Active Downloads & Transfer Speed */}
            <HomarrDownloadsWidget />
          </>
        )}

        {/* Homarr App Tiles */}
        {filteredItems.map((item) => {
          const svc = services.find((s) => s.id === item.id || s.name.toLowerCase().includes(item.id));
          const activeState = svc?.activeState || 'active';

          // Construct target URL
          let url = item.url;
          if (!url) {
            if (item.id === 'suwayomi') {
              url = '/tsumiru/';
            } else if (item.port) {
              const proto = isHttps && item.id === 'vaultwarden' ? 'https' : 'http';
              url = `${proto}://${currentHost}:${item.port}`;
            } else {
              url = '#';
            }
          }

          return (
            <HomarrAppTile
              key={item.id}
              id={item.id}
              name={item.name}
              tagline={item.tagline}
              category={item.category}
              icon={item.icon}
              url={url}
              port={item.port}
              activeState={activeState}
              colSpan={item.colSpan || 3}
              isEditMode={isEditMode}
              onOpenSettings={() =>
                onOpenAppSettings({
                  id: item.id,
                  name: item.name,
                  port: Number(item.port) || 80,
                  unit: item.unit || item.id,
                })
              }
              onToggleColSpan={() => handleToggleColSpan(item.id)}
              onRemove={() => handleToggleItemVisibility(item.id)}
            />
          );
        })}

        {/* Quick Connect & Tailscale Mesh Portals (Permanent homelab endpoints) */}
        {activeCategory === 'all' && !searchQuery && (
          <div className="col-span-12 mt-2">
            <QuickConnectCard
              services={services}
              customBookmarks={customBookmarks}
              isEditMode={isEditMode}
              isAdmin={isOwner}
              onAddBookmark={() => setBookmarkModalOpen(true)}
              onDeleteBookmark={handleDeleteBookmark}
              onOpenTailscale={onOpenTailscale}
              onOpenGuide={onOpenGuide}
            />
          </div>
        )}

        {/* Custom Bookmarks Grid */}
        {(activeCategory === 'all' || activeCategory === 'custom') && !searchQuery && (
          <HomarrBookmarksWidget
            bookmarks={customBookmarks}
            isEditMode={isEditMode}
            onAddBookmark={() => setBookmarkModalOpen(true)}
            onDeleteBookmark={handleDeleteBookmark}
          />
        )}
      </div>

      {/* 4. Homarr Widget Catalog Drawer Modal ("+ Add Widget") */}
      {catalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden font-mono text-xs">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-tinapple-gold" />
                <h3 className="font-bold text-white text-sm">Homarr Widget Catalog</h3>
              </div>
              <button
                onClick={() => setCatalogOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
              <p className="text-zinc-400 mb-3 text-[11px]">
                Toggle tiles and modular widgets to pin or unpin them from your Homarr board:
              </p>
              {boardItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <span className="font-bold text-white block truncate">{item.name}</span>
                      <span className="text-[10px] text-zinc-400 truncate block">{item.tagline}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleItemVisibility(item.id)}
                    className={`px-3 py-1 rounded-lg border font-bold text-xs flex items-center gap-1.5 transition-all ${
                      item.visible
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-700/50 text-zinc-400 border-slate-600 hover:text-white'
                    }`}
                  >
                    {item.visible ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-white/10 bg-slate-950 flex justify-end">
              <button
                onClick={() => setCatalogOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-tinapple-gold text-slate-950 font-bold hover:bg-amber-400 transition-colors"
              >
                Close Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Homarr Add Bookmark Modal */}
      {bookmarkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-tinapple-gold" />
                <h3 className="font-bold text-white text-sm">Add Homelab Bookmark</h3>
              </div>
              <button
                onClick={() => setBookmarkModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-zinc-400 block mb-1">Bookmark Name:</label>
                <input
                  type="text"
                  placeholder="e.g. TrueNAS Console"
                  value={newBmName}
                  onChange={(e) => setNewBmName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-tinapple-gold"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Target URL / IP:</label>
                <input
                  type="text"
                  placeholder="e.g. http://192.168.1.50:80"
                  value={newBmUrl}
                  onChange={(e) => setNewBmUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-tinapple-gold"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Emoji / Icon:</label>
                <input
                  type="text"
                  placeholder="e.g. 🗄️, 🌐, 🚀"
                  value={newBmIcon}
                  onChange={(e) => setNewBmIcon(e.target.value)}
                  className="w-24 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-center focus:outline-none focus:border-tinapple-gold text-base"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setBookmarkModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-zinc-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBookmark}
                disabled={!newBmName || !newBmUrl}
                className="px-4 py-1.5 rounded-xl bg-tinapple-gold text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-50"
              >
                Save Bookmark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomarrCanvas;
