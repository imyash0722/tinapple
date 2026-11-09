import React, { useState, useMemo } from 'react';
import {
  Play,
  Square,
  RotateCw,
  Terminal,
  Search,
  LayoutGrid,
  List,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  Settings,
  Smartphone,
  X,
} from 'lucide-react';
import { SquishSwitch } from '../reactbits/SquishSwitch';
import { SpotlightCard } from '../reactbits/SpotlightCard';
import HoldButton from '../reactbits/HoldButton';
import { ServiceInfo } from '../../types/api';
import { getServiceHost, getServiceUrl } from '../../services/api';
import { AppBrandIcon } from '../common/AppBrandIcons';

interface ServicesManagerProps {
  services: ServiceInfo[];
  accentColor: string;
  isAdmin?: boolean;
  onControlService: (name: string, action: 'start' | 'stop' | 'restart' | 'enable' | 'disable') => Promise<{ ok: boolean; error?: string } | void>;
  onOpenLogs: (name: string) => void;
  onOpenSettings?: (name: string) => void;
  onOpenTailscale?: () => void;
  onOpenGuide?: (guideId: string) => void;
}

export const ServicesManager: React.FC<ServicesManagerProps> = ({
  services,
  accentColor,
  isAdmin = true,
  onControlService,
  onOpenLogs,
  onOpenSettings,
  onOpenTailscale,
  onOpenGuide,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [loadingMap, setLoadingMap] = useState<Record<string, string>>({});
  const [errorNotice, setErrorNotice] = useState<{ name: string; error: string } | null>(null);

  const handleAction = async (name: string, action: 'start' | 'stop' | 'restart') => {
    setLoadingMap((prev) => ({ ...prev, [name]: action }));
    setErrorNotice(null);
    try {
      const res = await onControlService(name, action);
      if (res && !res.ok) {
        setErrorNotice({ name, error: res.error || `Failed to ${action} ${name}` });
        setTimeout(() => setErrorNotice(null), 5000);
      }
    } catch (e: any) {
      setErrorNotice({ name, error: e?.message || `Failed to ${action} ${name}` });
      setTimeout(() => setErrorNotice(null), 5000);
    } finally {
      setTimeout(() => {
        setLoadingMap((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }, 600);
    }
  };

  const filteredServices = services
    .filter((s) => isAdmin || (s.name !== 'suwayomi' && s.name !== 'suwayomi-server' && s.id !== 'suwayomi' && s.id !== 'suwayomi-server'))
    .filter((s) => {
      const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

  const categories = useMemo(() => {
    const cats = new Set<string>(['all']);
    services
      .filter((s) => isAdmin || (s.name !== 'suwayomi' && s.name !== 'suwayomi-server' && s.id !== 'suwayomi' && s.id !== 'suwayomi-server'))
      .forEach((s) => {
        if (s.category) cats.add(s.category);
      });
    return Array.from(cats);
  }, [services, isAdmin]);

  const getServiceAppUrl = (service: ServiceInfo): string | null => {
    const cleanName = service.name.toLowerCase().replace(/\.service$/, '').replace(/@.*$/, '');
    const nonWebServices = [
      'postgresql',
      'redis',
      'minecraft',
      'minecraft-server',
      'docker',
      'tor',
      'wireguard',
      'niri',
      'tinapple-session',
      'snapper',
      'tailscale',
      'tailscaled',
      'proton',
      'proton-vpn',
      'protonvpn',
      'bbctl',
    ];

    if (nonWebServices.includes(cleanName)) {
      return null;
    }

    const url = getServiceUrl(cleanName);
    if (url && url !== '/') return url;
    if (service.port && service.port > 0) return getServiceUrl(service.port);
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col xl:flex-row gap-3.5 items-stretch xl:items-center justify-between p-3.5 rounded-[28px] bg-surface-container-low border border-outline-variant shadow-none">
        <div className="flex-1 min-w-0">
          {/* Category Tabs */}
          <div className="flex items-center p-1 rounded-full bg-surface-container-highest border border-outline-variant overflow-x-auto scrollbar-none gap-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize font-sans tabular-nums transition-all whitespace-nowrap shrink-0 ${
                  filterCategory === c
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between xl:justify-end gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative w-full sm:w-60 md:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Filter daemons or ports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-full bg-surface-container-highest border border-outline-variant text-xs font-sans tabular-nums text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Quick Action HoldButton & View Toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            <HoldButton
              size="sm"
              holdTime={1400}
              backgroundColor="#15181f"
              fillColor={accentColor}
              textColor={accentColor}
              fillTextColor="#060709"
              wave={true}
              glow={true}
              doneLabel="Core Restarted"
              onHold={async () => {
                const coreServices = services.filter((s) => s.category === 'core');
                for (const s of coreServices) {
                  await handleAction(s.name, 'restart');
                }
              }}
              className="font-sans tabular-nums text-xs font-bold whitespace-nowrap px-3 py-1.5 rounded-full"
            >
              Hold to Restart Core
            </HoldButton>

            <div className="flex items-center p-1 rounded-full bg-surface-container-highest border border-outline-variant">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-full transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {errorNotice && (
        <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-sans tabular-nums">
          <div className="flex items-center gap-2">
            <span className="font-bold">Error ({errorNotice.name}):</span>
            <span>{errorNotice.error}</span>
          </div>
          <button
            onClick={() => setErrorNotice(null)}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Services Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => {
            const isLoading = Boolean(loadingMap[service.name]);
            const isActive = service.activeState === 'active' || service.running;
            const isInstalled = service.installed !== false && service.activeState !== 'not_installed';
            const isFailed = service.activeState === 'failed';
            const serviceUrl = getServiceAppUrl(service);

            return (
              <SpotlightCard
                key={service.name}
                className="p-5 flex flex-col justify-between"
                spotlightColor={isActive ? 'rgb(var(--tinapple-secondary-rgb) / 0.12)' : 'rgb(var(--tinapple-accent-rgb) / 0.08)'}
                borderColor={isActive ? 'rgb(var(--tinapple-secondary-rgb) / 0.4)' : 'rgba(255, 255, 255, 0.08)'}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <AppBrandIcon id={service.name} size={48} showBadge className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isActive
                                ? 'bg-tinapple-green shadow-sm shadow-tinapple-green animate-pulse'
                                : isFailed
                                ? 'bg-tinapple-red'
                                : isInstalled
                                ? 'bg-amber-400'
                                : 'bg-slate-500'
                            }`}
                          />
                          {serviceUrl && isActive ? (
                            <a
                              href={serviceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-bold text-on-surface hover:text-emerald-300 font-sans tabular-nums truncate transition-colors flex items-center gap-1.5 group/name"
                              title={`Open ${service.displayName || service.name} Web Dashboard`}
                            >
                              <span className="truncate">{service.displayName || service.name}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-tinapple-muted group-hover/name:text-emerald-300 shrink-0" />
                            </a>
                          ) : (
                            <h4 className="text-sm font-bold text-on-surface font-sans tabular-nums truncate">
                              {service.displayName || service.name}
                            </h4>
                          )}
                        </div>
                        <p className="text-xs text-tinapple-subtext mt-1 line-clamp-2 leading-relaxed">
                          {service.description}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-sans tabular-nums px-2 py-0.5 rounded-full border uppercase whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-tinapple-green/10 text-tinapple-green border-tinapple-green/20 font-bold'
                          : isFailed
                          ? 'bg-tinapple-red/10 text-tinapple-red border-tinapple-red/20 font-bold'
                          : isInstalled
                          ? 'bg-amber-400/10 text-amber-400 border-amber-400/20 font-semibold'
                          : 'bg-tinapple-muted/10 text-tinapple-muted border-tinapple-border'
                      }`}
                    >
                      {isActive ? 'Running' : isFailed ? 'Failed' : isInstalled ? 'Stopped' : 'Not Installed'}
                    </span>
                  </div>

                  {/* Service Metadata: Port & RAM with Clickable Link */}
                  {(() => {
                    const displayPort = service.name.toLowerCase().replace(/\.service$/, '').replace(/@.*$/, '') === 'ombi' ? 5055 : service.port;
                    return (
                      <div className="flex items-center gap-3 my-3 text-[11px] font-sans tabular-nums text-tinapple-muted">
                        {displayPort ? (
                          serviceUrl && isActive ? (
                            <a
                              href={serviceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-tinapple-gold hover:text-emerald-400 font-semibold transition-colors"
                              title={`Open port :${displayPort}`}
                            >
                              <span>Port :{displayPort}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="flex items-center gap-1 text-tinapple-gold font-semibold">
                              Port :{displayPort}
                            </span>
                          )
                        ) : null}
                        {service.memoryBytes ? (
                          <span>RAM: {(service.memoryBytes / (1024 * 1024)).toFixed(2)} MB</span>
                        ) : null}
                        <span className="capitalize text-tinapple-green font-medium">{service.category}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center justify-between gap-1.5 pt-3 border-t border-outline-variant">
                  <div className="flex flex-wrap items-center gap-1.5 font-sans tabular-nums">
                    {/* Direct Web UI Links */}
                    {isActive && serviceUrl && (
                      <a
                        href={serviceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-none active:scale-95"
                        title={`Open ${service.displayName || service.name} Web UI`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </a>
                    )}
                    {(service.name === 'suwayomi' || service.name === 'suwayomi-server') && (
                      <a
                        href="/download/tsumiru"
                        download="tsumiru-client.apk"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-on-surface transition-colors active:scale-95"
                        title="Download Tsumiru Android APK for your phone (Connects via :4567)"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-primary" />
                        <span>Phone APK</span>
                      </a>
                    )}
                    {isActive ? (
                      <>
                        <button
                          disabled={isLoading}
                          onClick={() => handleAction(service.name, 'restart')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-on-surface transition-colors disabled:opacity-50 active:scale-95"
                          title="Restart daemon"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
                          <span>Restart</span>
                        </button>
                        <SquishSwitch checked disabled={isLoading} label={`Run ${service.displayName || service.name}`}
                          onChange={() => handleAction(service.name, 'stop')} />
                      </>
                    ) : isInstalled ? (
                      <SquishSwitch checked={false} disabled={isLoading} label={`Run ${service.displayName || service.name}`}
                        onChange={() => handleAction(service.name, 'start')} />
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-surface-container-highest border border-outline-variant text-on-surface-variant">
                        Not Installed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(service.name === 'tailscale' || service.name === 'tailscaled') && onOpenTailscale && (
                      <button
                        onClick={onOpenTailscale}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-primary transition-colors"
                        title="Tailscale Auth & Mesh Login"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Mesh</span>
                      </button>
                    )}
                    {onOpenGuide && (
                      <button
                        onClick={() => {
                          const guideMap: Record<string, string> = {
                            jellyfin: 'jellyfin',
                            suwayomi: 'syncyomi',
                            'suwayomi-server': 'syncyomi',
                            syncyomi: 'syncyomi',
                            beeper: 'beeper',
                            vaultwarden: 'vaultwarden',
                            syncthing: 'syncthing',
                            couchdb: 'obsidian',
                            tailscale: 'tailscale',
                            tailscaled: 'tailscale',
                            radarr: 'servarr',
                            sonarr: 'servarr',
                            prowlarr: 'servarr',
                            bazarr: 'servarr',
                            qbittorrent: 'qbittorrent',
                            homarr: 'homarr',
                            pinchflat: 'pinchflat',
                            navidrome: 'navidrome',
                            adguardhome: 'adguard',
                            adguard: 'adguard',
                            tor: 'tor',
                            protonvpn: 'protonvpn',
                            playit: 'playit',
                            jdownloader: 'jdownloader',
                            samba: 'samba',
                          };
                          const gId = guideMap[service.name] || service.name;
                          onOpenGuide(gId);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-sans tabular-nums font-medium bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-secondary transition-colors shrink-0 whitespace-nowrap"
                        title={`View ${service.displayName || service.name} Client & Setup Guide`}
                      >
                        <BookOpen className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <span className="hidden sm:inline">Guide</span>
                      </button>
                    )}
                    {onOpenSettings && (
                      <button
                        onClick={() => onOpenSettings(service.name)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-sans tabular-nums font-medium bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-on-surface hover:text-on-surface transition-colors shrink-0 whitespace-nowrap"
                        title={`Configure ${service.displayName || service.name} & Paste Config`}
                      >
                        <Settings className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="hidden sm:inline">Config</span>
                      </button>
                    )}
                    <button
                      onClick={() => onOpenLogs(service.name)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-sans tabular-nums font-medium bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface transition-colors shrink-0 whitespace-nowrap"
                    >
                      <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Logs</span>
                    </button>
                  </div>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      ) : (
        /* Services Table View */
        <div className="overflow-x-auto rounded-[28px] border border-outline-variant bg-surface-container-low shadow-none">
          <table className="w-full text-left text-xs font-sans tabular-nums">
            <thead className="bg-surface-container text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Port</th>
                <th className="px-4 py-3">Memory</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-on-surface">
              {filteredServices.map((service) => {
                const isLoading = Boolean(loadingMap[service.name]);
                const isActive = service.activeState === 'active' || service.running;
                const isInstalled = service.installed !== false && service.activeState !== 'not_installed';
                const isFailed = service.activeState === 'failed';
                const serviceUrl = getServiceAppUrl(service);

                return (
                  <tr key={service.name} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] border ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold'
                            : isFailed
                            ? 'bg-error/10 text-error border-error/20 font-semibold'
                            : isInstalled
                            ? 'bg-amber-400/10 text-amber-400 border-amber-400/20 font-semibold'
                            : 'bg-surface-container-highest text-on-surface-variant border-outline-variant'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? 'bg-emerald-400 animate-pulse' : 'bg-on-surface-variant'
                          }`}
                        />
                        {isActive ? 'Running' : isFailed ? 'Failed' : isInstalled ? 'Stopped' : 'Not Installed'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AppBrandIcon id={service.name} size={32} showBadge />
                        {serviceUrl && isActive ? (
                          <a
                            href={serviceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-on-surface hover:text-primary transition-colors inline-flex items-center gap-1.5 group/tbl"
                            title={`Open ${service.displayName || service.name} Web UI`}
                          >
                            <span>{service.displayName || service.name}</span>
                            <ExternalLink className="w-3 h-3 text-on-surface-variant group-hover/tbl:text-primary" />
                          </a>
                        ) : (
                          <span className="font-bold text-on-surface">{service.displayName || service.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-primary">{service.category}</td>
                    <td className="px-4 py-3 text-primary font-semibold">
                      {(() => {
                        const displayPort = service.name.toLowerCase().replace(/\.service$/, '').replace(/@.*$/, '') === 'ombi' ? 5055 : service.port;
                        return displayPort ? (
                          serviceUrl && isActive ? (
                            <a
                              href={serviceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:text-primary/80 font-semibold inline-flex items-center gap-1 transition-colors"
                              title={`Open port :${displayPort}`}
                            >
                              <span>:{displayPort}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            `:${displayPort}`
                          )
                        ) : (
                          '—'
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {service.memoryBytes
                        ? `${(service.memoryBytes / (1024 * 1024)).toFixed(2)} MB`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isActive && serviceUrl && (
                          <a
                            href={serviceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-full bg-primary text-on-primary text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                            title="Open Web Dashboard"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </a>
                        )}
                        {isActive ? (
                          <button
                            disabled={isLoading}
                            onClick={() => handleAction(service.name, 'stop')}
                            className="px-3 py-1 rounded-full bg-error/15 hover:bg-error/25 border border-error/30 text-[11px] font-medium text-error transition-colors disabled:opacity-50"
                          >
                            Stop
                          </button>
                        ) : isInstalled ? (
                          <button
                            disabled={isLoading}
                            onClick={() => handleAction(service.name, 'start')}
                            className="px-3 py-1 rounded-full bg-primary/15 hover:bg-primary/25 border border-primary/30 text-[11px] font-medium text-primary transition-colors disabled:opacity-50"
                          >
                            Start
                          </button>
                        ) : (
                          <span className="text-[10px] text-on-surface-variant px-2 py-0.5">
                            Not Installed
                          </span>
                        )}
                        {onOpenSettings && (
                          <button
                            onClick={() => onOpenSettings(service.name)}
                            className="px-2.5 py-1 rounded-full bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-[11px] text-on-surface shrink-0 whitespace-nowrap"
                            title="Configure"
                          >
                            <Settings className="w-3 h-3 text-primary inline shrink-0" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenLogs(service.name)}
                          className="px-3 py-1 rounded-full bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant text-[11px] text-primary shrink-0 whitespace-nowrap"
                        >
                          Logs
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default ServicesManager;
