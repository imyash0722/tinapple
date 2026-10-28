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
} from 'lucide-react';

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
    custom: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40',
  };

  return (
    <div
      className={`${getColSpanClass()} group relative rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 border border-white/[0.08] hover:border-white/20 backdrop-blur-xl transition-all duration-200 p-4 flex flex-col justify-between shadow-lg shadow-black/20 hover:shadow-black/40`}
    >
      {/* Edit Mode Grip & Controls Overlay */}
      {isEditMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10 bg-slate-950/80 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-md">
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
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* App Icon Tile */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              {typeof icon === 'string' ? <span>{icon}</span> : icon}
            </div>

            {/* App Title & Subtitle */}
            <div className="min-w-0">
              <h4 className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                <span className="truncate">{name}</span>
                {/* Ping Dot */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isOnline
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse'
                      : isFailed
                      ? 'bg-red-500 shadow-sm shadow-red-500/80'
                      : 'bg-zinc-600'
                  }`}
                  title={isOnline ? 'Online & Service Active' : isFailed ? 'Service Alert / Failed' : 'Service Inactive'}
                />
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
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1.5 min-w-0 font-mono text-[11px] text-zinc-400 truncate">
          {port && (
            <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-tinapple-gold font-bold">
              :{port}
            </span>
          )}
          <span className="truncate text-zinc-500">{url.replace(/^https?:\/\//, '')}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
              title={`Configure ${name} Service & Raw Config`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>
          )}

          <a
            href={url}
            target={url.startsWith('/') ? '_self' : '_blank'}
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
