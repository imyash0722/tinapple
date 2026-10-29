import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  LayoutGrid,
  Plus,
  Wrench,
  Check,
  RotateCcw,
  GripVertical,
  Maximize2,
  X,
  Eye,
  Bookmark,
  ZoomIn,
  ZoomOut,
  Target,
  Magnet,
  Layers,
  Sliders,
  Sparkles,
  Columns,
  Move,
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
  HomarrAppsGridWidget,
  CustomBookmarkItem,
} from './HomarrWidgets';
import {
  CustomIframeWidget,
  CustomMarkdownWidget,
  CustomLinksWidget,
  CustomMonitorWidget,
} from './CustomWidgets';
import { WidgetEditorModal } from './WidgetEditorModal';
import { WidgetCreatorModal } from './WidgetCreatorModal';
import { CanvasMinimap } from './CanvasMinimap';
import { QuickConnectCard } from '../widgets/QuickConnectCard';
import { TelemetrySnapshot, SystemInfo, ServiceInfo } from '../../types/api';
import { CanvasWidget, CanvasViewport, CanvasLayoutMode } from '../../types/canvas';
import { AndroidBridge } from '../../services/androidBridge';

const CANVAS_WIDTH = 3200;
const CANVAS_HEIGHT = 2200;
const STORAGE_KEY = 'tinapple_homarr_canvas_widgets_v6';
const GRID_SIZE = 20;

const DEFAULT_WIDGETS: CanvasWidget[] = [
  {
    id: 'homarr_apps_board',
    type: 'homarr_apps_board',
    title: 'Homarr Appliance Board',
    description: 'Iconic Homarr service launcher with live ping dots, open ports, and direct WebUI launchers.',
    icon: '🚀',
    category: 'system',
    x: 60,
    y: 60,
    w: 960,
    h: 360,
    colSpan: 12,
    zIndex: 1,
    visible: true,
  },
  {
    id: 'silicon_telemetry',
    type: 'silicon_telemetry',
    title: 'Silicon Resource Monitor',
    description: 'Real-time CPU load, Memory (RAM), Root storage fill bars, core count, and thermals.',
    icon: '⚡',
    category: 'telemetry',
    x: 60,
    y: 440,
    w: 520,
    h: 320,
    colSpan: 6,
    zIndex: 2,
    visible: true,
  },
  {
    id: 'digital_clock',
    type: 'digital_clock',
    title: 'Digital Clock & Uptime',
    description: 'Real-time digital clock with seconds, date, UTC timezone, and node uptime.',
    icon: '⏱️',
    category: 'system',
    x: 600,
    y: 440,
    w: 420,
    h: 320,
    colSpan: 3,
    zIndex: 3,
    visible: true,
  },
  {
    id: 'transfers_rate',
    type: 'transfers_rate',
    title: 'Active Transfers & Speeds',
    description: 'qBittorrent & Pinchflat download/upload transfer speeds and active torrent tasks count.',
    icon: '📥',
    category: 'storage',
    x: 1040,
    y: 60,
    w: 420,
    h: 360,
    colSpan: 3,
    zIndex: 4,
    visible: true,
  },
  {
    id: 'network_guard',
    type: 'network_guard',
    title: 'Tailscale Mesh & Privacy Guard',
    description: 'Tailscale VPN MagicDNS status, direct Tor onion exit toggle switch, and AdGuard Home.',
    icon: '🛡️',
    category: 'network',
    x: 1040,
    y: 440,
    w: 480,
    h: 320,
    colSpan: 6,
    zIndex: 5,
    visible: true,
  },
  {
    id: 'port_matrix',
    type: 'port_matrix',
    title: 'Server Port Matrix & Listeners',
    description: 'Live matrix of verified open ports (:8088, :8096, :4567, :8080, :8384, :8081, :3000, :8000).',
    icon: '🔌',
    category: 'network',
    x: 60,
    y: 780,
    w: 520,
    h: 320,
    colSpan: 6,
    zIndex: 6,
    visible: true,
  },
  {
    id: 'media_server',
    type: 'media_server',
    title: 'Jellyfin Media Server',
    description: 'Hardware video transcoding status (VA-API/QSV), 4K DirectPlay streaming, and web player.',
    icon: '🎬',
    category: 'media',
    x: 600,
    y: 780,
    w: 460,
    h: 320,
    colSpan: 6,
    zIndex: 7,
    visible: true,
  },
  {
    id: 'storage_vault',
    type: 'storage_vault',
    title: 'Syncthing & TrueNAS Bridge',
    description: 'Continuous encrypted P2P folder synchronization and TrueNAS ZFS dataset bridge.',
    icon: '🔄',
    category: 'storage',
    x: 1080,
    y: 780,
    w: 440,
    h: 320,
    colSpan: 6,
    zIndex: 8,
    visible: true,
  },
  {
    id: 'quick_terminal',
    type: 'quick_terminal',
    title: 'Interactive Web Terminal',
    description: 'Embedded fast PTY bash shell launcher for quick node troubleshooting.',
    icon: '💻',
    category: 'system',
    x: 1480,
    y: 60,
    w: 480,
    h: 360,
    colSpan: 4,
    zIndex: 9,
    visible: true,
  },
  {
    id: 'hardware_thermals',
    type: 'hardware_thermals',
    title: 'Hardware Thermals & Battery',
    description: 'Silicon sensor temperatures, cooling fan RPM, battery health and charge limiter.',
    icon: '🌡️',
    category: 'telemetry',
    x: 1540,
    y: 440,
    w: 420,
    h: 320,
    colSpan: 4,
    zIndex: 10,
    visible: true,
  },
  {
    id: 'manga_shelf',
    type: 'manga_shelf',
    title: 'Suwayomi Manga Shelf',
    description: 'Self-hosted manga library status and fast offline Tsumiru reader launcher.',
    icon: '📖',
    category: 'media',
    x: 1540,
    y: 780,
    w: 420,
    h: 320,
    colSpan: 4,
    zIndex: 11,
    visible: true,
  },
  {
    id: 'quick_connect',
    type: 'quick_connect',
    title: 'Direct Connection Endpoints',
    description: 'Active session link, Direct Ethernet patch, Tailscale MagicDNS link with copy buttons.',
    icon: '⚡',
    category: 'network',
    x: 60,
    y: 1120,
    w: 960,
    h: 280,
    colSpan: 12,
    zIndex: 12,
    visible: true,
  },
  {
    id: 'homelab_bookmarks',
    type: 'homelab_bookmarks',
    title: 'Homelab Web Bookmarks',
    description: 'Customizable grid of external web links and homelab portals with icon customization.',
    icon: '🔖',
    category: 'system',
    x: 1040,
    y: 1120,
    w: 920,
    h: 280,
    colSpan: 12,
    zIndex: 13,
    visible: true,
  },
];

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
  onOpenAppSettings,
  onOpenTailscale,
  onOpenTerminal,
  onOpenTools,
  onOpenGuide,
}) => {
  // 1. Layout Mode & Widgets State
  const [layoutMode, setLayoutMode] = useState<CanvasLayoutMode>('canvas');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  const [widgets, setWidgets] = useState<CanvasWidget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.widgets) && parsed.widgets.length > 0) {
          const existingIds = new Set(parsed.widgets.map((w: any) => w.id));
          const missing = DEFAULT_WIDGETS.filter((w) => !existingIds.has(w.id));
          return [...parsed.widgets, ...missing];
        }
      }
    } catch {}
    return DEFAULT_WIDGETS;
  });

  const [customBookmarks, setCustomBookmarks] = useState<CustomBookmarkItem[]>([]);

  // 2. Viewport & Canvas Navigation State
  const [viewport, setViewport] = useState<CanvasViewport>({
    panX: 0,
    panY: 0,
    zoom: 1.0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({
    w: 1200,
    h: 800,
  });

  // Dragging Canvas (Panning) State
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });

  // Dragging Widget State
  const [activeDragWidgetId, setActiveDragWidgetId] = useState<string | null>(null);
  const dragWidgetRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  } | null>(null);

  // Resizing Widget State
  const [activeResizeWidgetId, setActiveResizeWidgetId] = useState<string | null>(null);
  const resizeWidgetRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    initW: number;
    initH: number;
  } | null>(null);

  // Modals state
  const [editingWidget, setEditingWidget] = useState<CanvasWidget | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          layoutMode,
          snapToGrid,
          widgets,
          viewport,
        })
      );
    } catch {}
  }, [widgets, layoutMode, snapToGrid, viewport]);

  // Center / Reset View
  const handleCenterView = useCallback(() => {
    AndroidBridge.performHaptic('selection');
    setViewport({
      panX: 0,
      panY: 0,
      zoom: 1.0,
    });
  }, []);

  const handleZoom = useCallback((delta: number) => {
    AndroidBridge.performHaptic('light');
    setViewport((prev) => {
      const nextZoom = Math.min(1.8, Math.max(0.5, prev.zoom + delta));
      return { ...prev, zoom: nextZoom };
    });
  }, []);

  // Bring widget to front
  const bringToFront = useCallback((widgetId: string) => {
    setWidgets((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex || 1), 1);
      return prev.map((w) => (w.id === widgetId ? { ...w, zIndex: maxZ + 1 } : w));
    });
  }, []);

  // --- Background Panning Handlers (Mouse & Touch) ---
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    if ((e.target as HTMLElement).closest('[data-canvas-widget]')) return;

    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: viewport.panX,
      panY: viewport.panY,
    };
  };

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    if ((e.target as HTMLElement).closest('[data-canvas-widget]')) return;

    setIsPanning(true);
    panStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      panX: viewport.panX,
      panY: viewport.panY,
    };
  };

  // --- Widget Dragging Handlers ---
  const startWidgetDrag = (e: React.MouseEvent | React.TouchEvent, widget: CanvasWidget) => {
    e.stopPropagation();
    bringToFront(widget.id);
    AndroidBridge.performHaptic('selection');

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setActiveDragWidgetId(widget.id);
    dragWidgetRef.current = {
      id: widget.id,
      startX: clientX,
      startY: clientY,
      initX: widget.x,
      initY: widget.y,
    };
  };

  // --- Widget Resizing Handlers ---
  const startWidgetResize = (e: React.MouseEvent | React.TouchEvent, widget: CanvasWidget) => {
    e.stopPropagation();
    e.preventDefault();
    bringToFront(widget.id);
    AndroidBridge.performHaptic('selection');

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setActiveResizeWidgetId(widget.id);
    resizeWidgetRef.current = {
      id: widget.id,
      startX: clientX,
      startY: clientY,
      initW: widget.w,
      initH: widget.h,
    };
  };

  // Global Pointer Movement & Release Handlers
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      // 1. Panning canvas
      if (isPanning) {
        const dx = clientX - panStartRef.current.x;
        const dy = clientY - panStartRef.current.y;

        const maxPanX = containerSize.w * 0.7;
        const minPanX = -(CANVAS_WIDTH * viewport.zoom - containerSize.w * 0.3);
        const maxPanY = containerSize.h * 0.7;
        const minPanY = -(CANVAS_HEIGHT * viewport.zoom - containerSize.h * 0.3);

        setViewport((prev) => ({
          ...prev,
          panX: Math.max(minPanX, Math.min(maxPanX, panStartRef.current.panX + dx)),
          panY: Math.max(minPanY, Math.min(maxPanY, panStartRef.current.panY + dy)),
        }));
      }

      // 2. Dragging widget
      if (dragWidgetRef.current) {
        const dx = (clientX - dragWidgetRef.current.startX) / viewport.zoom;
        const dy = (clientY - dragWidgetRef.current.startY) / viewport.zoom;

        let newX = dragWidgetRef.current.initX + dx;
        let newY = dragWidgetRef.current.initY + dy;

        if (snapToGrid) {
          newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
          newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        }

        newX = Math.max(20, Math.min(CANVAS_WIDTH - 200, newX));
        newY = Math.max(20, Math.min(CANVAS_HEIGHT - 160, newY));

        setWidgets((prev) =>
          prev.map((w) => (w.id === dragWidgetRef.current?.id ? { ...w, x: newX, y: newY } : w))
        );
      }

      // 3. Resizing widget
      if (resizeWidgetRef.current) {
        const dw = (clientX - resizeWidgetRef.current.startX) / viewport.zoom;
        const dh = (clientY - resizeWidgetRef.current.startY) / viewport.zoom;

        let newW = resizeWidgetRef.current.initW + dw;
        let newH = resizeWidgetRef.current.initH + dh;

        if (snapToGrid) {
          newW = Math.round(newW / GRID_SIZE) * GRID_SIZE;
          newH = Math.round(newH / GRID_SIZE) * GRID_SIZE;
        }

        newW = Math.max(260, Math.min(1600, newW));
        newH = Math.max(180, Math.min(1200, newH));

        setWidgets((prev) =>
          prev.map((w) => (w.id === resizeWidgetRef.current?.id ? { ...w, w: newW, h: newH } : w))
        );
      }
    };

    const handlePointerUp = () => {
      if (isPanning) setIsPanning(false);
      if (dragWidgetRef.current) {
        const id = dragWidgetRef.current.id;
        dragWidgetRef.current = null;
        setActiveDragWidgetId(null);
        AndroidBridge.performHaptic('light');
        const moved = widgets.find((w) => w.id === id);
        if (moved) AndroidBridge.notifyWidgetMoved(id, moved.x, moved.y);
      }
      if (resizeWidgetRef.current) {
        const id = resizeWidgetRef.current.id;
        resizeWidgetRef.current = null;
        setActiveResizeWidgetId(null);
        AndroidBridge.performHaptic('light');
        const resized = widgets.find((w) => w.id === id);
        if (resized) AndroidBridge.notifyWidgetResized(id, resized.w, resized.h);
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isPanning, viewport.zoom, containerSize, snapToGrid, widgets]);

  // Handle canvas wheel zoom / pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = -e.deltaY * 0.0015;
      setViewport((prev) => {
        const nextZoom = Math.min(1.8, Math.max(0.5, prev.zoom + zoomFactor));
        return { ...prev, zoom: nextZoom };
      });
    } else {
      setViewport((prev) => ({
        ...prev,
        panX: prev.panX - e.deltaX,
        panY: prev.panY - e.deltaY,
      }));
    }
  };

  // Add / Save / Duplicate / Delete Widgets
  const handleAddWidget = (newWidget: CanvasWidget) => {
    setWidgets((prev) => [...prev, newWidget]);
    AndroidBridge.performHaptic('medium');
    AndroidBridge.notifyWidgetSaved(newWidget);
  };

  const handleSaveWidget = (updated: CanvasWidget) => {
    setWidgets((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    AndroidBridge.performHaptic('light');
    AndroidBridge.notifyWidgetSaved(updated);
  };

  const handleDeleteWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    AndroidBridge.performHaptic('medium');
  };

  const handleDuplicateWidget = (src: CanvasWidget) => {
    const clone: CanvasWidget = {
      ...src,
      id: `widget_${src.type}_${Date.now()}`,
      title: `${src.title} (Copy)`,
      x: src.x + 40,
      y: src.y + 40,
      zIndex: (src.zIndex || 1) + 1,
    };
    setWidgets((prev) => [...prev, clone]);
    AndroidBridge.performHaptic('selection');
  };

  const handleResetBoard = () => {
    setWidgets(DEFAULT_WIDGETS);
    setViewport({ panX: 0, panY: 0, zoom: 1.0 });
    localStorage.removeItem(STORAGE_KEY);
    AndroidBridge.performHaptic('heavy');
  };

  // Center coordinate of current viewport in canvas space
  const viewportCenterInCanvas = useMemo(() => {
    return {
      x: (-viewport.panX + containerSize.w / 2) / viewport.zoom,
      y: (-viewport.panY + containerSize.h / 2) / viewport.zoom,
    };
  }, [viewport, containerSize]);

  // Widget content renderer
  const renderWidgetContent = (widget: CanvasWidget) => {
    switch (widget.type) {
      case 'homarr_apps_board':
        return (
          <HomarrAppsGridWidget
            services={services}
            isEditMode={isEditMode}
            onOpenSettings={onOpenAppSettings}
            onOpenGuide={onOpenGuide}
          />
        );
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
            onAddBookmark={() => {}}
            onDeleteBookmark={() => {}}
            onOpenTailscale={onOpenTailscale}
            onOpenGuide={onOpenGuide}
          />
        );
      case 'homelab_bookmarks':
        return (
          <HomarrBookmarksWidget
            bookmarks={customBookmarks}
            isEditMode={isEditMode}
            onAddBookmark={() => {}}
            onDeleteBookmark={() => {}}
          />
        );
      // Custom Interactive Widgets
      case 'custom_iframe':
        return <CustomIframeWidget widget={widget} />;
      case 'custom_markdown':
        return <CustomMarkdownWidget widget={widget} />;
      case 'custom_links':
        return <CustomLinksWidget widget={widget} />;
      case 'custom_monitor':
        return <CustomMonitorWidget widget={widget} />;
      default:
        return (
          <div className="p-4 rounded-xl bg-slate-900 border border-white/10 font-mono text-xs text-zinc-400">
            <span>{widget.title}</span>
          </div>
        );
    }
  };

  const visibleWidgets = useMemo(() => {
    return widgets.filter((w) => (isEditMode ? true : w.visible));
  }, [widgets, isEditMode]);

  return (
    <div className="space-y-4 relative select-none">
      {/* 1. Canvas Top HUD Control Bar */}
      <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-3.5 sm:p-4 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Canvas Title & Node Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-purple-500/20 to-sky-500/20 border border-white/10 flex items-center justify-center text-lg shrink-0">
            🗺️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                Interactive Homarr Canvas
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                {layoutMode === 'canvas' ? '2D Infinite Space' : '12-Col Modular'}
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-sky-500/15 text-sky-300 font-mono">
                Kotlin & Android Ready
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
              {layoutMode === 'canvas'
                ? isEditMode
                  ? 'Drag cards to position anywhere. Drag bottom-right corner to resize.'
                  : 'Drag background to explore canvas. Click widgets to launch appliances.'
                : '12-Column clean layout mode.'}
            </p>
          </div>
        </div>

        {/* Right: Floating Control Actions */}
        <div className="flex items-center flex-wrap gap-2 shrink-0 font-mono text-xs">
          {/* Layout Mode Switcher */}
          <div className="flex items-center bg-slate-950/80 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => {
                setLayoutMode('canvas');
                AndroidBridge.performHaptic('selection');
                AndroidBridge.notifyLayoutModeChanged('canvas');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                layoutMode === 'canvas'
                  ? 'bg-tinapple-gold text-slate-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="2D Freeform Pannable Canvas"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Canvas</span>
            </button>
            <button
              onClick={() => {
                setLayoutMode('grid');
                AndroidBridge.performHaptic('selection');
                AndroidBridge.notifyLayoutModeChanged('grid');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                layoutMode === 'grid'
                  ? 'bg-tinapple-gold text-slate-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Standard Column Grid"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>

          {/* Add Widget Button */}
          <button
            onClick={() => {
              setCreatorOpen(true);
              AndroidBridge.performHaptic('light');
            }}
            className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Widget</span>
          </button>

          {/* Edit Mode Toggle */}
          <button
            onClick={() => {
              setIsEditMode(!isEditMode);
              AndroidBridge.performHaptic('medium');
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
              isEditMode
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 hover:bg-emerald-400'
                : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10'
            }`}
          >
            {isEditMode ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Done Editing</span>
              </>
            ) : (
              <>
                <Wrench className="w-3.5 h-3.5 text-tinapple-gold" />
                <span>Edit Canvas</span>
              </>
            )}
          </button>

          {/* Canvas Viewport Zoom & Reset Controls (Canvas Mode Only) */}
          {layoutMode === 'canvas' && (
            <div className="flex items-center gap-1 bg-slate-950/80 rounded-xl p-1 border border-white/10">
              <button
                onClick={() => handleZoom(-0.15)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold text-zinc-300 px-1 w-10 text-center">
                {Math.round(viewport.zoom * 100)}%
              </span>
              <button
                onClick={() => handleZoom(0.15)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCenterView}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-tinapple-gold hover:bg-white/10 transition-colors ml-0.5"
                title="Center / Reset View"
              >
                <Target className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setSnapToGrid(!snapToGrid);
                  AndroidBridge.performHaptic('selection');
                }}
                className={`p-1.5 rounded-lg transition-colors ml-0.5 ${
                  snapToGrid ? 'text-tinapple-gold bg-amber-500/10' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title={`Snap to Grid (${GRID_SIZE}px): ${snapToGrid ? 'ON' : 'OFF'}`}
              >
                <Magnet className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Reset Board */}
          <button
            onClick={handleResetBoard}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-400 hover:text-white transition-colors"
            title="Reset to Factory Layout"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Canvas Viewport vs Grid View */}
      {layoutMode === 'canvas' ? (
        <div
          ref={containerRef}
          onMouseDown={handleCanvasMouseDown}
          onTouchStart={handleCanvasTouchStart}
          onWheel={handleWheel}
          style={{ height: 'calc(100vh - 13.5rem)', minHeight: '620px' }}
          className={`w-full rounded-2xl bg-slate-950/90 border border-white/10 overflow-hidden relative shadow-2xl backdrop-blur-xl ${
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {/* Blueprint Dot Matrix Canvas Pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)',
              backgroundSize: `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
              backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
            }}
          />

          {/* Draggable World Surface */}
          <div
            style={{
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              transform: `translate3d(${viewport.panX}px, ${viewport.panY}px, 0) scale(${viewport.zoom})`,
              transformOrigin: '0 0',
            }}
            className="absolute top-0 left-0 transition-transform duration-75 ease-out"
          >
            {visibleWidgets.map((widget) => {
              const isDraggingThis = activeDragWidgetId === widget.id;
              const isResizingThis = activeResizeWidgetId === widget.id;

              return (
                <div
                  key={widget.id}
                  data-canvas-widget={widget.id}
                  onClick={() => bringToFront(widget.id)}
                  style={{
                    position: 'absolute',
                    left: `${widget.x}px`,
                    top: `${widget.y}px`,
                    width: `${widget.w}px`,
                    height: `${widget.h}px`,
                    zIndex: widget.zIndex || 1,
                  }}
                  className={`group transition-shadow duration-150 ${
                    isDraggingThis
                      ? 'shadow-2xl shadow-purple-500/20 ring-2 ring-tinapple-gold opacity-95'
                      : 'hover:shadow-2xl hover:shadow-black/60'
                  }`}
                >
                  {/* Floating Customizer Toolbar on Widget */}
                  {isEditMode && (
                    <div className="absolute -top-3 right-3 z-30 flex items-center gap-1 bg-slate-950/90 backdrop-blur-md rounded-xl p-1 border border-white/15 shadow-xl font-mono text-xs">
                      {/* Drag Handle */}
                      <div
                        onMouseDown={(e) => startWidgetDrag(e, widget)}
                        onTouchStart={(e) => startWidgetDrag(e, widget)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors"
                        title="Drag to reposition widget"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      {/* Edit Modal Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingWidget(widget);
                        }}
                        className="p-1 rounded-lg text-zinc-400 hover:text-tinapple-gold hover:bg-white/10 transition-colors"
                        title="Customize Widget Settings & Size"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate Widget */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateWidget(widget);
                        }}
                        className="p-1 rounded-lg text-zinc-400 hover:text-sky-300 hover:bg-white/10 transition-colors"
                        title="Duplicate Widget"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Widget */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWidget(widget.id);
                        }}
                        className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                        title="Remove from Canvas"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Widget Card Body */}
                  <div className="w-full h-full relative overflow-hidden rounded-2xl">
                    {renderWidgetContent(widget)}
                  </div>

                  {/* Corner Resize Handle */}
                  {isEditMode && (
                    <div
                      onMouseDown={(e) => startWidgetResize(e, widget)}
                      onTouchStart={(e) => startWidgetResize(e, widget)}
                      className="absolute -bottom-1.5 -right-1.5 z-30 w-5 h-5 bg-tinapple-gold hover:bg-amber-400 rounded-br-lg rounded-tl-md flex items-center justify-center cursor-nwse-resize shadow-md transition-transform hover:scale-110 active:scale-95"
                      title="Drag to resize widget"
                    >
                      <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Minimap Overlay (Bottom-Right) */}
          {showMinimap && (
            <div className="absolute bottom-4 right-4 z-40">
              <CanvasMinimap
                canvasWidth={CANVAS_WIDTH}
                canvasHeight={CANVAS_HEIGHT}
                viewport={viewport}
                containerWidth={containerSize.w}
                containerHeight={containerSize.h}
                widgets={visibleWidgets}
                onPanTo={(nx, ny) => {
                  setViewport((prev) => ({ ...prev, panX: nx, panY: ny }));
                }}
              />
            </div>
          )}

          {/* Canvas Bottom-Left HUD Badge */}
          <div className="absolute bottom-4 left-4 z-40 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 font-mono text-[11px] text-zinc-400 shadow-lg pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Canvas: {CANVAS_WIDTH}×{CANVAS_HEIGHT}px • {visibleWidgets.length} Active Cards
            </span>
          </div>
        </div>
      ) : (
        /* 3. 12-Column Responsive Grid Fallback View */
        <div className="grid grid-cols-12 gap-3.5 sm:gap-4 relative z-10">
          <AnimatePresence>
            {visibleWidgets.map((widget) => {
              const colSpan = widget.colSpan || 6;
              const spanClass =
                colSpan === 12
                  ? 'col-span-12'
                  : colSpan === 6
                  ? 'col-span-12 lg:col-span-6'
                  : colSpan === 4
                  ? 'col-span-12 sm:col-span-6 lg:col-span-4'
                  : 'col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3';

              return (
                <motion.div
                  key={widget.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`${spanClass} relative group transition-all`}
                >
                  {isEditMode && (
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-slate-950/85 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-lg font-mono">
                      <button
                        onClick={() => setEditingWidget(widget)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-tinapple-gold hover:bg-white/10 transition-colors"
                        title="Configure Widget"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWidget(widget.id)}
                        className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="h-full">{renderWidgetContent(widget)}</div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 4. Edit Widget Modal */}
      <WidgetEditorModal
        widget={editingWidget}
        isOpen={Boolean(editingWidget)}
        onClose={() => setEditingWidget(null)}
        onSave={handleSaveWidget}
        onDelete={handleDeleteWidget}
        onDuplicate={handleDuplicateWidget}
      />

      {/* 5. Create Widget Modal */}
      <WidgetCreatorModal
        isOpen={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onAddWidget={handleAddWidget}
        currentWidgetCount={widgets.length}
        viewportCenter={viewportCenterInCanvas}
      />
    </div>
  );
};

export default HomarrCanvas;
