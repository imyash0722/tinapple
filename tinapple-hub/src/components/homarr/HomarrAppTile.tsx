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
import { AppBrandIcon } from '../common/AppBrandIcons';

export interface HomarrAppTileProps {
  id: string;
  name: string;
  tagline?: string;
  category: 'media' | 'downloads' | 'storage' | 'network' | 'system' | 'custom';
  icon: string | React.ReactNode;
  url: string;
  port?: string | number;
  unit?: string;
  activeState?: 'active' | 'inactive' | 'failed' | 'unknown' | 'activating' | 'deactivating' | 'not_installed';
  isEditMode: boolean;
  colSpan?: 3 | 4 | 6 | 12;
  onOpenSettings?: () => void;
  onOpenGuide?: () => void;
  onToggleColSpan?: () => void;
  onRemove?: () => void;
}

export const HomarrAppTile: React.FC<HomarrAppTileProps> = React.memo(({
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
    custom: 'bg-zinc-700/40 text-on-surface border-zinc-600/40',
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
      className={`${getColSpanClass()} group relative rounded-[28px] bg-surface-container-low hover:bg-surface-container border border-outline-variant transition-all duration-200 p-4 flex flex-col justify-between overflow-hidden shadow-none ${
        !isEditMode ? 'cursor-pointer' : ''
      }`}
    >
      {/* Edit Mode Grip & Controls Overlay */}
      {isEditMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-20 bg-surface-container rounded-full p-1 border border-outline-variant shadow-none">
          {onToggleColSpan && (
            <button
              onClick={onToggleColSpan}
              className="p-1 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Toggle Tile Width"
            >
              {colSpan === 3 ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
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
            <div className="w-11 h-11 rounded-2xl bg-surface-container-highest border border-outline-variant flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform duration-200 overflow-hidden p-1.5">
              <AppBrandIcon id={id} size={28} showBadge={false} />
            </div>

            {/* App Title & Subtitle */}
            <div className="min-w-0">
              <h4 className="font-bold text-on-surface text-sm truncate flex items-center gap-2">
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
              {tagline && <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{tagline}</p>}
            </div>
          </div>

          {/* Category Badge (when not in edit mode) */}
          {!isEditMode && (
            <span
              className={`text-[9px] font-sans tabular-nums uppercase px-2 py-0.5 rounded-full border shrink-0 font-bold ${
                categoryBadgeColors[category] || categoryBadgeColors.custom
              }`}
            >
              {category}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Footer Row: Port/Host info & Action buttons */}
      <div className="pt-3 border-t border-outline-variant flex items-center justify-between gap-2 mt-2 relative z-10">
        <div className="flex items-center gap-1.5 min-w-0 font-sans tabular-nums text-[11px] text-on-surface-variant truncate">
          {port && (
            <span className="px-1.5 py-0.5 rounded-full bg-surface-container-highest border border-outline-variant text-primary font-bold">
              :{port}
            </span>
          )}
          <span className="truncate text-on-surface-variant">
            {serviceRegistry.get(id)?.getDisplayPath() || (url.startsWith('/') ? url : `/${id}`)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all active:scale-95 border border-outline-variant"
              title={`Configure ${name} Service & Raw Config`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="p-1.5 rounded-full bg-surface-container hover:bg-cyan-500/20 text-on-surface-variant hover:text-cyan-300 transition-all active:scale-95 border border-outline-variant"
              title={`View ${name} Unified Guide & Endpoints`}
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          )}

          <a
            href={url}
            target={url.startsWith('/') && !url.startsWith('/guides/') ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-full bg-primary/15 hover:bg-primary hover:text-on-primary border border-primary/30 text-primary text-xs font-sans tabular-nums font-bold flex items-center gap-1 transition-all active:scale-95 shadow-none"
          >
            <span>Open</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
});

export default HomarrAppTile;
