import React from 'react';
import {
  ExternalLink,
  Settings as SettingsIcon,
  GripVertical,
  X,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { serviceRegistry } from '../../services/serviceRegistry';

export interface HomarrAppTileProps {
  id: string;
  name: string;
  tagline?: string;
  category: 'media' | 'downloads' | 'storage' | 'network' | 'system' | 'custom';
  icon: string | React.ReactNode;
  url: string;
  port?: string | number;
  unit?: string;
  activeState?: 'active' | 'inactive' | 'failed' | 'unknown';
  isEditMode: boolean;
  colSpan?: 3 | 4 | 6 | 12;
  onOpenSettings?: () => void;
  onOpenGuide?: () => void;
  onToggleColSpan?: () => void;
  onRemove?: () => void;
}

export const HomarrAppTile: React.FC<HomarrAppTileProps> = ({
  id,
  name,
  tagline,
  category,
  icon,
  url,
  port,
  activeState = 'active',
  isEditMode,
  colSpan = 3,
  onOpenSettings,
  onOpenGuide,
  onToggleColSpan,
  onRemove,
}) => {
  const [mousePos, setMousePos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState<boolean>(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const getColSpanClass = () => {
    switch (colSpan) {
      case 12:
        return 'col-span-12';
      case 6:
        return 'col-span-12 md:col-span-6';
      case 4:
        return 'col-span-12 sm:col-span-6 lg:col-span-4';
      case 3:
      default:
        return 'col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3';
    }
  };

  const isOnline = activeState === 'active';
  const isFailed = activeState === 'failed';

  const categoryBadgeColors: Record<string, string> = {
    media: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    downloads: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    storage: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    network: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    system: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    custom: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40',
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isEditMode) return;
    // Don't trigger if clicked on an interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    window.open(url, url.startsWith('/') && !url.startsWith('/guides/') ? '_self' : '_blank');
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`${getColSpanClass()} group relative rounded-2xl bg-slate-900/70 hover:bg-slate-900/90 border border-white/[0.08] hover:border-white/20 backdrop-blur-xl transition-all duration-300 p-4 flex flex-col justify-between overflow-hidden shadow-lg shadow-black/30 hover:shadow-black/50 ${
        !isEditMode ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
      style={{
        boxShadow: isHovered
          ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 12px 28px -4px rgba(0, 0, 0, 0.5)'
          : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 4px 16px -2px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Dynamic Cursor Spotlight Radial Glow */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 z-0"
          style={{
            background: `radial-gradient(320px circle at ${mousePos.x}px ${mousePos.y}px, var(--tinapple-accent-glow, rgba(56, 189, 248, 0.15)), transparent 70%)`,
          }}
        />
      )}

      {/* Edit Mode Grip & Controls Overlay */}
      {isEditMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-20 bg-slate-950/80 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-md">
          {onToggleColSpan && (
            <button
              onClick={onToggleColSpan}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Toggle Tile Width (Compact / Wide)"
            >
              {colSpan === 3 ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
              title="Hide tile from board"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Top Header Row: Icon, Status Ping Dot, Category */}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* App Icon Tile */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-xl shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-200">
              {typeof icon === 'string' ? <span>{icon}</span> : icon}
            </div>

            {/* App Title & Subtitle */}
            <div className="min-w-0">
              <h4 className="font-bold text-white text-sm truncate flex items-center gap-2">
                <span className="truncate">{name}</span>
                {/* Luminous LED Status Indicator */}
                <span className="relative flex h-2 w-2 shrink-0">
                  {isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  {isFailed && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isOnline
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : isFailed
                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : 'bg-zinc-600'
                    }`}
                    title={isOnline ? 'Online & Active' : isFailed ? 'Alert / Service Failed' : 'Stopped / Inactive'}
                  />
                </span>
              </h4>
              {tagline && <p className="text-[11px] text-zinc-400 truncate mt-0.5">{tagline}</p>}
            </div>
          </div>

          {/* Category Badge (when not in edit mode) */}
          {!isEditMode && (
            <span
              className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border shrink-0 font-bold ${
                categoryBadgeColors[category] || categoryBadgeColors.custom
              }`}
            >
              {category}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Footer Row: Port/Host info & Action buttons */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-2 relative z-10">
        <div className="flex items-center gap-1.5 min-w-0 font-mono text-[11px] text-zinc-400 truncate">
          {port && (
            <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-tinapple-gold font-bold">
              :{port}
            </span>
          )}
          <span className="truncate text-zinc-500">
            {serviceRegistry.get(id)?.getDisplayPath() || (url.startsWith('/') ? url : `/${id}`)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all active:scale-95"
              title={`Configure ${name} Service & Raw Config`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 text-zinc-400 hover:text-cyan-300 transition-all active:scale-95"
              title={`View ${name} Unified Guide & Endpoints`}
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          )}

          <a
            href={url}
            target={url.startsWith('/') && !url.startsWith('/guides/') ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-tinapple-gold hover:text-slate-950 border border-white/10 text-zinc-200 text-xs font-mono font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
          >
            <span>Open</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default HomarrAppTile;
