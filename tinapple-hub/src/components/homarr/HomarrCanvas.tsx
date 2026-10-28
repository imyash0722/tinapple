import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  Plus,
  Wrench,
  Check,
  RotateCcw,
  GripVertical,
  Maximize2,
  Minimize2,
  X,
  Eye,
  EyeOff,
  Bookmark,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomarrResourceWidget,
  HomarrClockWidget,
  HomarrDownloadsWidget,
  HomarrNetworkGuardWidget,
  HomarrMediaWidget,
  HomarrMangaWidget,
  HomarrSyncVaultWidget,
  HomarrHardwareWidget,
  HomarrPortMatrixWidget,
  HomarrTerminalWidget,
  HomarrJournalWidget,
  HomarrBookmarksWidget,
  CustomBookmarkItem,
} from './HomarrWidgets';
import { QuickConnectCard } from '../widgets/QuickConnectCard';
import { TelemetrySnapshot, SystemInfo, ServiceInfo } from '../../types/api';

export interface HomarrWidgetDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'telemetry' | 'network' | 'media' | 'storage' | 'system';
  colSpan: 3 | 4 | 6 | 12;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: HomarrWidgetDef[] = [
  {
    id: 'silicon_telemetry',
    title: 'Silicon Resource Monitor',
    description: 'Real-time CPU load, Memory (RAM), Root storage fill bars, core count, and thermals.',
    icon: '⚡',
    category: 'telemetry',
    colSpan: 6,
    visible: true,
    order: 0,
  },
  {
    id: 'digital_clock',
    title: 'Digital Clock & Uptime',
    description: 'Real-time digital clock with seconds, date, UTC timezone, and node uptime.',
    icon: '⏱️',
    category: 'system',
    colSpan: 3,
    visible: true,
    order: 1,
  },
  {
    id: 'transfers_rate',
    title: 'Active Transfers & Speeds',
    description: 'qBittorrent & Pinchflat download/upload transfer speeds and active torrent tasks count.',
    icon: '📥',
    category: 'storage',
    colSpan: 3,
    visible: true,
    order: 2,
  },
  {
    id: 'network_guard',
    title: 'Tailscale Mesh & Privacy Guard',
    description: 'Tailscale VPN MagicDNS status, direct Tor onion exit toggle switch, and AdGuard Home.',
    icon: '🛡️',
    category: 'network',
    colSpan: 6,
    visible: true,
    order: 3,
  },
  {
    id: 'port_matrix',
    title: 'Server Port Matrix & Listeners',
    description: 'Live matrix of verified open ports (:8088, :8096, :4567, :8080, :8384, :8081, :3000, :8000).',
    icon: '🔌',
    category: 'network',
    colSpan: 6,
    visible: true,
    order: 4,
  },
  {
    id: 'media_server',
    title: 'Jellyfin Media Server',
    description: 'Hardware video transcoding status (VA-API/QSV), 4K DirectPlay streaming, and web player.',
    icon: '🎬',
    category: 'media',
    colSpan: 6,
    visible: true,
    order: 5,
  },
  {
    id: 'storage_vault',
    title: 'Syncthing & TrueNAS Bridge',
    description: 'Continuous encrypted P2P folder synchronization and TrueNAS ZFS dataset bridge.',
    icon: '🔄',
    category: 'storage',
    colSpan: 6,
    visible: true,
    order: 6,
  },
  {
    id: 'quick_terminal',
    title: 'Interactive Web Terminal',
    description: 'Embedded fast PTY bash shell launcher for quick node troubleshooting.',
    icon: '💻',
    category: 'system',
    colSpan: 4,
    visible: true,
    order: 7,
  },
  {
    id: 'hardware_thermals',
    title: 'Hardware Thermals & Battery',
    description: 'Silicon sensor temperatures, cooling fan RPM, battery health and charge limiter.',
    icon: '🌡️',
    category: 'telemetry',
    colSpan: 4,
    visible: true,
    order: 8,
  },
  {
    id: 'manga_shelf',
    title: 'Suwayomi Manga Shelf',
    description: 'Self-hosted manga library status and fast offline Tsumiru reader launcher.',
    icon: '📖',
    category: 'media',
    colSpan: 4,
    visible: true,
    order: 9,
  },
  {
    id: 'system_journal',
    title: 'Kernel & Journal Alert Feed',
    description: 'Real-time alert stream of systemd and kernel error logs (priority ≤ 3).',
    icon: '📋',
    category: 'system',
    colSpan: 6,
    visible: false,
    order: 10,
  },
  {
    id: 'quick_connect',
    title: 'Direct Connection Endpoints',
    description: 'Active session link, Direct Ethernet patch, Tailscale MagicDNS link with copy buttons.',
    icon: '⚡',
    category: 'network',
    colSpan: 12,
    visible: true,
    order: 11,
  },
  {
    id: 'homelab_bookmarks',
    title: 'Homelab Web Bookmarks',
    description: 'Customizable grid of external web links and homelab portals with icon customization.',
    icon: '🔖',
    category: 'system',
    colSpan: 12,
    visible: true,
    order: 12,
  },
];

const STORAGE_KEY = 'tinapple_homarr_canvas_widgets_v4';

export interface HomarrCanvasProps {
  telemetry: TelemetrySnapshot;
  systemInfo: SystemInfo;
  services: ServiceInfo[];
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  isOwner: boolean;
  onOpenAppSettings?: (app: any) => void;
  onOpenTailscale: () => void;
  onOpenTerminal?: () => void;
  onOpenTools?: () => void;
  onOpenGuide: (guideId: string) => void;
}

export const HomarrCanvas: React.FC<HomarrCanvasProps> = ({
  telemetry,
  systemInfo,
  services,
  isEditMode,
  setIsEditMode,
  isOwner,
  onOpenTailscale,
  onOpenTerminal,
  onOpenTools,
  onOpenGuide,
}) => {
  const [widgets, setWidgets] = useState<HomarrWidgetDef[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.widgets) && parsed.widgets.length > 0) {
          // Merge with any new default widgets that might not exist in saved layout
          const existingIds = new Set(parsed.widgets.map((w: any) => w.id));
          const missing = DEFAULT_WIDGETS.filter((w) => !existingIds.has(w.id));
          return [...parsed.widgets, ...missing];
        }
      }
    } catch {}
    return DEFAULT_WIDGETS;
  });

  const [customBookmarks, setCustomBookmarks] = useState<CustomBookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.bookmarks)) return parsed.bookmarks;
      }
      const legacy = localStorage.getItem('tinapple_dashboard_layout_v1');
      if (legacy) {
        const p = JSON.parse(legacy);
        if (Array.isArray(p.bookmarks)) return p.bookmarks;
      }
    } catch {}
    return [];
  });

  const [catalogOpen, setCatalogOpen] = useState<boolean>(false);
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState<boolean>(false);
  const [newBmName, setNewBmName] = useState('');
  const [newBmUrl, setNewBmUrl] = useState('');
  const [newBmIcon, setNewBmIcon] = useState('🌐');

  // Drag and drop state
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          widgets,
          bookmarks: customBookmarks,
        })
      );
    } catch {}
  }, [widgets, customBookmarks]);

  const handleResetBoard = () => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleToggleColSpan = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id === widgetId) {
          let nextSpan: 3 | 4 | 6 | 12 = 6;
          if (w.colSpan === 3) nextSpan = 4;
          else if (w.colSpan === 4) nextSpan = 6;
          else if (w.colSpan === 6) nextSpan = 12;
          else nextSpan = 3;
          return { ...w, colSpan: nextSpan };
        }
        return w;
      })
    );
  };

  const handleToggleWidgetVisibility = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, visible: !w.visible } : w))
    );
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isEditMode) return;
    setDraggedWidgetId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverWidgetId !== id) {
      setDragOverWidgetId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverWidgetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (!isEditMode || !draggedWidgetId || draggedWidgetId === targetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }
    e.preventDefault();

    setWidgets((prev) => {
      const sourceIndex = prev.findIndex((w) => w.id === draggedWidgetId);
      const targetIndex = prev.findIndex((w) => w.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);

      return updated.map((w, index) => ({ ...w, order: index }));
    });

    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
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

  const getColSpanClass = (span: 3 | 4 | 6 | 12) => {
    switch (span) {
      case 12:
        return 'col-span-12';
      case 6:
        return 'col-span-12 lg:col-span-6';
      case 4:
        return 'col-span-12 sm:col-span-6 lg:col-span-4';
      case 3:
      default:
        return 'col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3';
    }
  };

  const visibleWidgets = useMemo(() => {
    return widgets.filter((w) => (isEditMode ? true : w.visible));
  }, [widgets, isEditMode]);

  const renderWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case 'silicon_telemetry':
        return <HomarrResourceWidget telemetry={telemetry} systemInfo={systemInfo} />;
      case 'digital_clock':
        return <HomarrClockWidget systemInfo={systemInfo} />;
      case 'transfers_rate':
        return <HomarrDownloadsWidget />;
      case 'network_guard':
        return <HomarrNetworkGuardWidget onOpenTailscale={onOpenTailscale} />;
      case 'media_server':
        return <HomarrMediaWidget onOpenGuide={onOpenGuide} />;
      case 'manga_shelf':
        return <HomarrMangaWidget />;
      case 'storage_vault':
        return <HomarrSyncVaultWidget />;
      case 'hardware_thermals':
        return <HomarrHardwareWidget telemetry={telemetry} />;
      case 'port_matrix':
        return <HomarrPortMatrixWidget onOpenTools={onOpenTools} />;
      case 'quick_terminal':
        return <HomarrTerminalWidget onOpenTerminal={onOpenTerminal} />;
      case 'system_journal':
        return <HomarrJournalWidget />;
      case 'quick_connect':
        return (
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
        );
      case 'homelab_bookmarks':
        return (
          <HomarrBookmarksWidget
            bookmarks={customBookmarks}
            isEditMode={isEditMode}
            onAddBookmark={() => setBookmarkModalOpen(true)}
            onDeleteBookmark={handleDeleteBookmark}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 relative select-none">
      {/* Homarr Subtle Dotted Canvas Grid Pattern (Matches homarr-labs/homarr) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* 1. Homarr Board Controls Bar */}
      <div className="relative z-10 rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Board Status & Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-purple-500/20 to-sky-500/20 border border-white/10 flex items-center justify-center text-lg shrink-0">
            🧩
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <span>Homarr Widget Canvas</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30">
                12-Col Modular
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
              {isEditMode
                ? 'Drag handles to reorder widgets. Click width button to resize.'
                : `${visibleWidgets.length} active widgets • Zero clutter • Direct service telemetry`}
            </p>
          </div>
        </div>

        {/* Right: Board Controls & Edit Mode Toggle */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto font-mono text-xs">
          {isEditMode ? (
            <>
              <button
                onClick={() => setCatalogOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Widget</span>
              </button>

              <button
                onClick={() => setBookmarkModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition-all shadow-sm"
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
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Done Editing</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditMode(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Wrench className="w-3.5 h-3.5 text-tinapple-gold" />
              <span>Customize Widgets & Layout</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Drag-and-Drop 12-Column Canvas Board Grid */}
      <div className="grid grid-cols-12 gap-3.5 sm:gap-4 relative z-10">
        <AnimatePresence>
          {visibleWidgets.map((widget) => {
            const isBeingDragged = draggedWidgetId === widget.id;
            const isDragOver = dragOverWidgetId === widget.id;

            return (
              <motion.div
                key={widget.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                draggable={isEditMode}
                onDragStart={(e: any) => handleDragStart(e, widget.id)}
                onDragOver={(e: any) => handleDragOver(e, widget.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e: any) => handleDrop(e, widget.id)}
                className={`${getColSpanClass(widget.colSpan)} relative group transition-all duration-150 ${
                  isBeingDragged ? 'opacity-40 scale-[0.98]' : ''
                } ${isDragOver ? 'ring-2 ring-tinapple-gold ring-offset-2 ring-offset-slate-950' : ''}`}
              >
                {/* Edit Mode Customizer Ribbon */}
                {isEditMode && (
                  <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-slate-950/85 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-lg font-mono">
                    {/* Drag Handle */}
                    <div
                      className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors"
                      title="Drag to reposition widget"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    {/* Width Toggle */}
                    <button
                      onClick={() => handleToggleColSpan(widget.id)}
                      className="px-1.5 py-1 rounded-lg text-[10px] text-zinc-400 hover:text-tinapple-gold hover:bg-white/10 font-bold transition-colors flex items-center gap-0.5"
                      title={`Current width: ${widget.colSpan} cols. Click to cycle width.`}
                    >
                      <span>{widget.colSpan}/12</span>
                      <Maximize2 className="w-2.5 h-2.5" />
                    </button>

                    {/* Hide Widget */}
                    <button
                      onClick={() => handleToggleWidgetVisibility(widget.id)}
                      className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                      title="Remove widget from canvas"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Widget Component */}
                <div className={`h-full ${!widget.visible ? 'opacity-50 grayscale' : ''}`}>
                  {renderWidgetContent(widget.id)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 3. Homarr Widget Catalog Drawer Modal ("+ Add Widget") */}
      {catalogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden font-mono text-xs">
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

            <div className="p-5 max-h-[65vh] overflow-y-auto space-y-2.5">
              <p className="text-zinc-400 mb-3 text-[11px]">
                Choose modular homelab widgets to add to or remove from your dashboard canvas:
              </p>
              {widgets.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-2xl shrink-0">{w.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{w.title}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded uppercase bg-white/[0.05] text-zinc-400 border border-white/10">
                          {w.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 truncate block mt-0.5">{w.description}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleWidgetVisibility(w.id)}
                    className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                      w.visible
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-700/50 text-zinc-300 border-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    {w.visible ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>On Board</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Widget</span>
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
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Homarr Add Bookmark Modal */}
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
